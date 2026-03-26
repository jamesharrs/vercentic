// client/src/superadmin/AIUsageReport.jsx
// AI token usage tracking, per-client breakdown, cost estimation, quotas
import { useState, useEffect, useCallback } from 'react';

const F = "'Geist','DM Sans',-apple-system,sans-serif";
const C = {
  bg:'#0A0E1A', surface:'#111827', surface2:'#1F2937', border:'#374151',
  text1:'#F9FAFB', text2:'#D1D5DB', text3:'#9CA3AF',
  purple:'#A78BFA', purpleLight:'#A78BFA18',
  green:'#34D399', greenLight:'#34D39918',
  amber:'#FBBF24', amberLight:'#FBBF2418',
  red:'#F87171', redLight:'#F8717118',
  blue:'#60A5FA', blueLight:'#60A5FA18',
  cyan:'#22D3EE',
};

const api = {
  get: p => fetch(`/api${p}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
};

const Ic = ({ d, s = 14, c = C.text2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const ICONS = {
  zap:      'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  dollar:   'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  users:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0-8',
  bar:      'M18 20V10M12 20V4M6 20v-6',
  refresh:  'M23 4v6h-6M1 20v-6h6',
  alert:    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  cpu:      'M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9z',
  clock:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
};

const FEATURE_COLORS = {
  copilot: C.purple, cv_parse: C.green, doc_extract: C.blue,
  job_match: C.amber, translation: C.cyan, jd_generate: '#F472B6',
  form_suggest: '#FB923C', interview_schedule: C.green, offer_create: C.amber,
  unknown: C.text3,
};

const FEATURE_LABELS = {
  copilot: 'Copilot', cv_parse: 'CV Parse', doc_extract: 'Doc Extract',
  job_match: 'Matching', translation: 'Translation', jd_generate: 'JD Generation',
  form_suggest: 'Form Builder', interview_schedule: 'Interview', offer_create: 'Offer',
  unknown: 'Other',
};

const fmt = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n);
const fmtCost = (n) => '$' + n.toFixed(2);
const relTime = (iso) => {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
};

// ── KPI Card ──
const Kpi = ({ label, value, sub, icon, color = C.purple }) => (
  <div style={{ padding:'16px', background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Ic d={ICONS[icon]||ICONS.zap} s={16} c={color}/>
      </div>
      <div style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
    </div>
    <div style={{ fontSize:24, fontWeight:800, color:C.text1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color, fontWeight:600, marginTop:4 }}>{sub}</div>}
  </div>
);

// ── Mini bar chart ──
const Bars = ({ data, color = C.purple, height = 60 }) => {
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{ display:'flex', gap:1, alignItems:'flex-end', height }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.v}`}
          style={{ flex:1, background: d.v > 0 ? color : `${color}30`,
            height: `${Math.max((d.v/max)*100, d.v > 0 ? 4 : 1)}%`,
            borderRadius:'2px 2px 0 0', minHeight: d.v > 0 ? 2 : 1 }}/>
      ))}
    </div>
  );
};

// ── Donut chart ──
const Donut = ({ segments, size = 100 }) => {
  const total = segments.reduce((s,d) => s + d.value, 0) || 1;
  const r = size/2 - 4;
  const cx = size/2, cy = size/2;
  let cumAngle = -Math.PI/2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const angle = (seg.value / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(cumAngle);
        const y1 = cy + r * Math.sin(cumAngle);
        cumAngle += angle;
        const x2 = cx + r * Math.cos(cumAngle);
        const y2 = cy + r * Math.sin(cumAngle);
        const large = angle > Math.PI ? 1 : 0;
        return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={seg.color} opacity={0.85}/>;
      })}
      <circle cx={cx} cy={cy} r={r*0.55} fill={C.surface}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill={C.text1} fontSize={14} fontWeight={800} fontFamily={F}>{fmt(total)}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill={C.text3} fontSize={9} fontFamily={F}>calls</text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function AIUsageReport() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | logs | clients
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [featureFilter, setFeatureFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, logData] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get(`/admin/ai-usage?page=${logPage}&limit=50${featureFilter ? '&feature='+featureFilter : ''}`),
      ]);
      setData(dash);
      setLogs(logData.logs || []);
      setLogTotal(logData.total || 0);
    } catch (e) { console.error('AI usage load:', e); }
    setLoading(false);
  }, [logPage, featureFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:C.text3, fontFamily:F }}>
      Loading AI usage data...
    </div>
  );

  if (!data) return (
    <div style={{ padding:40, textAlign:'center', color:C.text3, fontFamily:F }}>No data available</div>
  );

  const ai = data.ai || {};
  const totals = ai.totals || {};
  const byFeature = ai.by_feature || [];
  const byUser = ai.by_user || [];
  const trend = ai.daily_trend || [];

  return (
    <div style={{ fontFamily:F, color:C.text1 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>AI Usage & Costs</div>
          <div style={{ fontSize:12, color:C.text3 }}>Current billing period · All environments</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['overview','Overview'],['logs','Usage Log'],['clients','By User']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:tab===id?700:400, fontFamily:F,
                border:`1.5px solid ${tab===id?C.purple:C.border}`,
                background:tab===id?C.purpleLight:'transparent', color:tab===id?C.purple:C.text3, cursor:'pointer' }}>
              {label}
            </button>
          ))}
          <button onClick={load} style={{ padding:'6px 8px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', display:'flex' }}>
            <Ic d={ICONS.refresh} s={13} c={C.text3}/>
          </button>
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <>
          {/* KPI Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:20 }}>
            <Kpi label="AI Calls This Month" value={totals.this_month || 0} icon="zap" color={C.purple}
              sub={totals.trend_pct !== null ? `${totals.trend_pct > 0 ? '+' : ''}${totals.trend_pct}% vs last month` : null}/>
            <Kpi label="Tokens Used" value={fmt((totals.tokens_in||0) + (totals.tokens_out||0))} icon="cpu" color={C.blue}
              sub={`${fmt(totals.tokens_in||0)} in · ${fmt(totals.tokens_out||0)} out`}/>
            <Kpi label="Estimated Cost" value={fmtCost(totals.estimated_cost || 0)} icon="dollar" color={C.green}
              sub="Based on Anthropic pricing"/>
            <Kpi label="Last Month" value={totals.last_month || 0} icon="clock" color={C.text3}
              sub={totals.last_month > 0 ? `${fmtCost(((totals.estimated_cost||0) / Math.max(totals.this_month,1)) * totals.last_month)} est.` : null}/>
          </div>

          {/* Charts row */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:16 }}>
            {/* Daily trend */}
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Daily AI Calls (30d)</div>
              <Bars data={trend.map(d => ({ label: d.date, v: d.count }))} color={C.purple} height={70}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:C.text3, marginTop:4 }}>
                <span>{trend[0]?.date}</span>
                <span>{trend[trend.length-1]?.date}</span>
              </div>
            </div>

            {/* Feature breakdown donut */}
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>By Feature</div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <Donut segments={byFeature.map(f => ({ value: f.count, color: FEATURE_COLORS[f.feature] || C.text3 }))} size={90}/>
                <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1 }}>
                  {byFeature.slice(0,6).map(f => (
                    <div key={f.feature} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:FEATURE_COLORS[f.feature]||C.text3, flexShrink:0 }}/>
                      <span style={{ flex:1, color:C.text2 }}>{FEATURE_LABELS[f.feature]||f.feature}</span>
                      <span style={{ fontWeight:700, color:C.text1 }}>{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Token breakdown by feature */}
          <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Token Consumption by Feature</div>
            {byFeature.length === 0 ? (
              <div style={{ padding:20, textAlign:'center', color:C.text3, fontSize:12 }}>No AI usage recorded this month</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {['Feature', 'Calls', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Est. Cost', 'Avg/Call'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byFeature.map(f => {
                    const total = (f.tokens_in||0) + (f.tokens_out||0);
                    const cost = ((f.tokens_in||0)/1e6)*3 + ((f.tokens_out||0)/1e6)*15;
                    const avgPerCall = f.count > 0 ? Math.round(total / f.count) : 0;
                    return (
                      <tr key={f.feature} style={{ borderBottom:`1px solid ${C.border}15` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'10px', display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:FEATURE_COLORS[f.feature]||C.text3 }}/>
                          <span style={{ fontWeight:600 }}>{FEATURE_LABELS[f.feature]||f.feature}</span>
                        </td>
                        <td style={{ padding:'10px', fontWeight:700 }}>{f.count}</td>
                        <td style={{ padding:'10px', color:C.text2 }}>{fmt(f.tokens_in||0)}</td>
                        <td style={{ padding:'10px', color:C.text2 }}>{fmt(f.tokens_out||0)}</td>
                        <td style={{ padding:'10px', fontWeight:600 }}>{fmt(total)}</td>
                        <td style={{ padding:'10px', color:C.green, fontWeight:600 }}>{fmtCost(cost)}</td>
                        <td style={{ padding:'10px', color:C.text3 }}>{fmt(avgPerCall)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Cost alert if high */}
          {(totals.estimated_cost || 0) > 50 && (
            <div style={{ padding:'14px 18px', borderRadius:10, border:`1px solid ${C.amber}40`, background:C.amberLight, display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <Ic d={ICONS.alert} s={18} c={C.amber}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>High usage alert</div>
                <div style={{ fontSize:12, color:C.text2, marginTop:2 }}>AI costs have exceeded $50 this month. Consider setting per-client quotas.</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Usage Log Tab ── */}
      {tab === 'logs' && (
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700, flex:1 }}>Usage Log ({logTotal} entries)</div>
            <select value={featureFilter} onChange={e => { setFeatureFilter(e.target.value); setLogPage(1); }}
              style={{ padding:'5px 10px', borderRadius:7, background:C.surface2, border:`1px solid ${C.border}`, color:C.text2, fontSize:11, fontFamily:F }}>
              <option value="">All features</option>
              {Object.entries(FEATURE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:C.surface }}>
                  {['Time', 'Feature', 'User', 'Tokens In', 'Tokens Out', 'Cost'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const cost = ((log.tokens_in||0)/1e6)*3 + ((log.tokens_out||0)/1e6)*15;
                  return (
                    <tr key={log.id||i} style={{ borderBottom:`1px solid ${C.border}10` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding:'8px 12px', color:C.text3, whiteSpace:'nowrap' }}>{relTime(log.created_at)}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700,
                          background:`${FEATURE_COLORS[log.feature]||C.text3}18`,
                          color:FEATURE_COLORS[log.feature]||C.text3 }}>
                          {FEATURE_LABELS[log.feature]||log.feature}
                        </span>
                      </td>
                      <td style={{ padding:'8px 12px', color:C.text2, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {log.user_name || log.user_email || 'System'}
                      </td>
                      <td style={{ padding:'8px 12px', color:C.text2 }}>{fmt(log.tokens_in||0)}</td>
                      <td style={{ padding:'8px 12px', color:C.text2 }}>{fmt(log.tokens_out||0)}</td>
                      <td style={{ padding:'8px 12px', color:C.green, fontWeight:600 }}>{fmtCost(cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logs.length === 0 && <div style={{ padding:40, textAlign:'center', color:C.text3 }}>No usage logs found</div>}
          </div>
          {logTotal > 50 && (
            <div style={{ padding:'10px 18px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:C.text3 }}>Page {logPage} · {logTotal} total</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setLogPage(p => Math.max(1, p-1))} disabled={logPage === 1}
                  style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>Prev</button>
                <button onClick={() => setLogPage(p => p+1)} disabled={logs.length < 50}
                  style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── By User Tab ── */}
      {tab === 'clients' && (
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700 }}>
            AI Usage by User (This Month)
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {['User', 'Calls', 'Input Tokens', 'Output Tokens', 'Total', 'Est. Cost', '% of Total'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byUser.map(u => {
                const total = (u.tokens_in||0) + (u.tokens_out||0);
                const grandTotal = byUser.reduce((s,x) => s + (x.tokens_in||0) + (x.tokens_out||0), 0) || 1;
                const pct = Math.round((total / grandTotal) * 100);
                return (
                  <tr key={u.user_id} style={{ borderBottom:`1px solid ${C.border}10` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:C.purpleLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.purple }}>
                          {(u.user_name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600 }}>{u.user_name || 'Unknown'}</div>
                          <div style={{ fontSize:10, color:C.text3 }}>{u.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', fontWeight:700 }}>{u.count}</td>
                    <td style={{ padding:'10px 12px', color:C.text2 }}>{fmt(u.tokens_in||0)}</td>
                    <td style={{ padding:'10px 12px', color:C.text2 }}>{fmt(u.tokens_out||0)}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{fmt(total)}</td>
                    <td style={{ padding:'10px 12px', color:C.green, fontWeight:600 }}>{fmtCost(u.estimated_cost||0)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:6, borderRadius:3, background:C.surface2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:C.purple, borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:11, color:C.text3, minWidth:30, textAlign:'right' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {byUser.length === 0 && <div style={{ padding:40, textAlign:'center', color:C.text3 }}>No AI usage this month</div>}
        </div>
      )}
    </div>
  );
}
