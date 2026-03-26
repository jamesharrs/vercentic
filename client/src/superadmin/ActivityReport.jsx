// client/src/superadmin/ActivityReport.jsx
// Environment activity report for the Super Admin console
import { useState, useEffect, useCallback } from 'react';

const F = "'Geist','DM Sans',-apple-system,sans-serif";
const C = {
  bg:'#0A0E1A', surface:'#111827', surface2:'#1F2937', border:'#374151', border2:'#4B5563',
  text1:'#F9FAFB', text2:'#D1D5DB', text3:'#9CA3AF',
  purple:'#A78BFA', purpleLight:'#A78BFA18',
  green:'#34D399', greenLight:'#34D39918',
  amber:'#FBBF24', amberLight:'#FBBF2418',
  red:'#F87171', redLight:'#F8717118',
  blue:'#60A5FA', blueLight:'#60A5FA18',
};

const api = {
  get: p => fetch(`/api${p}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
};

// Simple SVG icon helper
const Ic = ({ d, s = 14, c = C.text2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const ICONS = {
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  users:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  file:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  mail:     'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  dollar:   'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  globe:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20',
  zap:      'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  check:    'M20 6L9 17l-5-5',
  clock:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
  filter:   'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
};

const relTime = (iso) => {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  if (d < 604800) return Math.floor(d/86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
};

const ACTION_COLORS = { created: C.green, updated: C.blue, deleted: C.red };
const ACTION_LABELS = { created: 'Created', updated: 'Updated', deleted: 'Deleted' };

// ── KPI Card ──
const KpiCard = ({ label, value, icon, color = C.purple, sub }) => (
  <div style={{ padding:'16px 18px', background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', gap:14, alignItems:'center' }}>
    <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Ic d={ICONS[icon]||ICONS.activity} s={18} c={color}/>
    </div>
    <div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text1 }}>{value ?? '—'}</div>
      <div style={{ fontSize:11, color:C.text3, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color, fontWeight:600, marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

// ── Mini bar chart ──
const MiniBar = ({ data, maxVal, color = C.purple, height = 60 }) => {
  const max = maxVal || Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:'flex', gap:1, alignItems:'flex-end', height }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`}
          style={{ flex:1, background: d.value > 0 ? color : `${color}30`,
            height: `${Math.max((d.value/max)*100, d.value > 0 ? 4 : 1)}%`,
            borderRadius:'2px 2px 0 0', transition:'height 0.3s', cursor:'default',
            minHeight: d.value > 0 ? 3 : 1 }}/>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main ActivityReport Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function ActivityReport({ clientId, clientName }) {
  const [data, setData] = useState(null);
  const [globalData, setGlobalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [envFilter, setEnvFilter] = useState('');
  const [feedFilter, setFeedFilter] = useState('');
  const [feedActionFilter, setFeedActionFilter] = useState('');
  const [tab, setTab] = useState(clientId ? 'client' : 'global');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (clientId) {
        const envQ = envFilter ? `&environment_id=${envFilter}` : '';
        const d = await api.get(`/superadmin/clients/${clientId}/activity-report?days=${days}${envQ}`);
        setData(d);
      }
      const g = await api.get(`/superadmin/clients/reports/activity-summary?days=${days}`);
      setGlobalData(g);
    } catch (e) { console.error('Activity report load error:', e); }
    setLoading(false);
  }, [clientId, days, envFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:C.text3, fontFamily:F }}>
      <Ic d={ICONS.refresh} s={18} c={C.text3}/><span style={{ marginLeft:8 }}>Loading activity data...</span>
    </div>
  );

  return (
    <div style={{ fontFamily:F, color:C.text1 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>
            {clientId ? `Activity Report — ${clientName || 'Client'}` : 'Platform Activity Overview'}
          </div>
          <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>Last {days} days</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {/* Period selector */}
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:days===d?700:400, fontFamily:F,
                border:`1.5px solid ${days===d?C.purple:C.border}`,
                background:days===d?C.purpleLight:'transparent', color:days===d?C.purple:C.text3, cursor:'pointer' }}>
              {d}d
            </button>
          ))}
          <button onClick={load} style={{ padding:'5px 8px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', display:'flex' }}>
            <Ic d={ICONS.refresh} s={13} c={C.text3}/>
          </button>
        </div>
      </div>

      {/* Tab switcher (only if clientId provided) */}
      {clientId && (
        <div style={{ display:'flex', gap:4, marginBottom:16 }}>
          {[['client','This Client'],['global','All Clients']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:tab===id?700:400, fontFamily:F,
                border:`1.5px solid ${tab===id?C.purple:C.border}`,
                background:tab===id?C.purpleLight:'transparent', color:tab===id?C.purple:C.text3, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'client' && data ? renderClientReport(data, days, envFilter, setEnvFilter, feedFilter, setFeedFilter, feedActionFilter, setFeedActionFilter) : null}
      {tab === 'global' && globalData ? renderGlobalReport(globalData) : null}
      {!data && !globalData && (
        <div style={{ padding:40, textAlign:'center', color:C.text3 }}>No activity data available.</div>
      )}
    </div>
  );
}

// ── Client Report ──────────────────────────────────────────────────────────────
function renderClientReport(data, days, envFilter, setEnvFilter, feedFilter, setFeedFilter, feedActionFilter, setFeedActionFilter) {
  const s = data.summary;
  return (
    <>
      {/* Environment filter */}
      {data.environments?.length > 1 && (
        <div style={{ marginBottom:16 }}>
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)}
            style={{ padding:'6px 12px', borderRadius:8, background:C.surface, border:`1px solid ${C.border}`,
              color:C.text1, fontSize:12, fontFamily:F }}>
            <option value="">All environments</option>
            {data.environments.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
          </select>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10, marginBottom:20 }}>
        <KpiCard label="Total Records" value={s.total_records} icon="file" color={C.blue}/>
        <KpiCard label={`Created (${days}d)`} value={s.records_created} icon="zap" color={C.green} sub={s.total_records ? `${Math.round((s.records_created/s.total_records)*100)}% growth` : null}/>
        <KpiCard label="Total Activity" value={s.total_activity} icon="activity" color={C.purple}/>
        <KpiCard label="Active Users" value={`${s.active_users} / ${s.total_users}`} icon="users" color={C.amber}/>
        <KpiCard label="Communications" value={s.communications_sent} icon="mail" color={C.blue}/>
        <KpiCard label="Interviews" value={s.interviews_scheduled} icon="calendar" color={C.green}/>
        <KpiCard label="Offers" value={s.offers} icon="dollar" color={C.amber}/>
        <KpiCard label="Feedback" value={s.feedback_received} icon="star" color={C.purple}/>
      </div>

      {/* Daily trend chart */}
      {data.daily_trend?.length > 0 && (
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Daily Activity</div>
          <div style={{ display:'flex', gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.text3, marginBottom:4 }}>Record actions</div>
              <MiniBar data={data.daily_trend.map(d => ({ label: d.date, value: d.activities }))} color={C.purple} height={50}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.text3, marginBottom:4 }}>New records</div>
              <MiniBar data={data.daily_trend.map(d => ({ label: d.date, value: d.records_created }))} color={C.green} height={50}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.text3, marginBottom:4 }}>Communications</div>
              <MiniBar data={data.daily_trend.map(d => ({ label: d.date, value: d.communications }))} color={C.blue} height={50}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:C.text3, marginTop:4 }}>
            <span>{data.daily_trend[0]?.date}</span>
            <span>{data.daily_trend[data.daily_trend.length-1]?.date}</span>
          </div>
        </div>
      )}

      {/* Two-column: Object breakdown + Active users */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {/* Activity by Object */}
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Activity by Object</div>
          {data.by_object?.length > 0 ? data.by_object.map(obj => (
            <div key={obj.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.border}20` }}>
              <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{obj.name}</span>
              <div style={{ display:'flex', gap:6 }}>
                {obj.created > 0 && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:C.greenLight, color:C.green, fontWeight:700 }}>+{obj.created}</span>}
                {obj.updated > 0 && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:C.blueLight, color:C.blue, fontWeight:700 }}>{obj.updated} edits</span>}
                {obj.deleted > 0 && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:C.redLight, color:C.red, fontWeight:700 }}>-{obj.deleted}</span>}
              </div>
            </div>
          )) : <div style={{ color:C.text3, fontSize:12, padding:12, textAlign:'center' }}>No activity in this period</div>}
        </div>

        {/* Active Users */}
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Active Users</div>
          {data.active_users?.length > 0 ? data.active_users.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${C.border}20` }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:C.purpleLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.purple, flexShrink:0 }}>
                {(u.name || u.email || '?').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name || u.email}</div>
                <div style={{ fontSize:10, color:C.text3 }}>{u.role}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:10, color:C.text3 }}>{relTime(u.last_login)}</div>
                <div style={{ fontSize:9, color:C.text3 }}>{u.login_count} logins</div>
              </div>
            </div>
          )) : <div style={{ color:C.text3, fontSize:12, padding:12, textAlign:'center' }}>No active users in this period</div>}
        </div>
      </div>

      {/* Environment breakdown */}
      {data.environments?.length > 1 && (
        <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Environment Breakdown</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
            {data.environments.map(env => (
              <div key={env.id} style={{ padding:12, borderRadius:8, border:`1px solid ${C.border}`, background:C.surface2 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: env.recent_activity > 0 ? C.green : C.text3 }}/>
                  <span style={{ fontSize:13, fontWeight:700 }}>{env.name}</span>
                  <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:C.surface, color:C.text3, marginLeft:'auto' }}>{env.type}</span>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:11, color:C.text3 }}>
                  <span>{env.total_records} records</span>
                  <span>{env.recent_activity} actions</span>
                  <span>{env.active_users} active</span>
                </div>
                {env.last_activity && <div style={{ fontSize:10, color:C.text3, marginTop:4 }}>Last: {relTime(env.last_activity)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Recent Activity</div>
          <div style={{ display:'flex', gap:6 }}>
            <select value={feedActionFilter} onChange={e => setFeedActionFilter(e.target.value)}
              style={{ padding:'4px 8px', borderRadius:6, background:C.surface2, border:`1px solid ${C.border}`, color:C.text2, fontSize:11, fontFamily:F }}>
              <option value="">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </select>
            <input value={feedFilter} onChange={e => setFeedFilter(e.target.value)} placeholder="Search..."
              style={{ padding:'4px 8px', borderRadius:6, background:C.surface2, border:`1px solid ${C.border}`, color:C.text1, fontSize:11, fontFamily:F, outline:'none', width:120 }}/>
          </div>
        </div>
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {(data.recent_feed || [])
            .filter(a => !feedActionFilter || a.action === feedActionFilter)
            .filter(a => !feedFilter || JSON.stringify(a).toLowerCase().includes(feedFilter.toLowerCase()))
            .map(a => (
            <div key={a.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.border}15`, alignItems:'flex-start' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:ACTION_COLORS[a.action]||C.text3, marginTop:6, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12 }}>
                  <span style={{ fontWeight:600, color:ACTION_COLORS[a.action]||C.text1 }}>{ACTION_LABELS[a.action]||a.action}</span>
                  {' '}
                  <span style={{ color:C.text2 }}>{a.record_name}</span>
                  <span style={{ color:C.text3 }}> in </span>
                  <span style={{ color:C.text2 }}>{a.object_name}</span>
                </div>
                {a.changes_summary && <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>Fields: {a.changes_summary}</div>}
              </div>
              <div style={{ fontSize:10, color:C.text3, flexShrink:0, textAlign:'right' }}>
                <div>{relTime(a.created_at)}</div>
                <div style={{ fontSize:9 }}>{a.actor}</div>
              </div>
            </div>
          ))}
          {(!data.recent_feed || data.recent_feed.length === 0) && (
            <div style={{ padding:24, textAlign:'center', color:C.text3, fontSize:12 }}>No activity recorded in this period.</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Global Report ──────────────────────────────────────────────────────────────
function renderGlobalReport(data) {
  return (
    <>
      {/* Global KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:20 }}>
        <KpiCard label="Total Clients" value={data.total_clients} icon="globe" color={C.purple}/>
        <KpiCard label="Total Activity" value={data.total_activity} icon="activity" color={C.green}/>
        <KpiCard label="Total Records" value={data.total_records} icon="file" color={C.blue}/>
        <KpiCard label="Total Users" value={data.total_users} icon="users" color={C.amber}/>
      </div>

      {/* Client table */}
      <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700 }}>Client Activity Ranking</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {['Client', 'Plan', 'Status', 'Records', 'Activity', 'Users', 'Active', 'Last Active'].map(h => (
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.clients || []).map(c => (
              <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}15` }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding:'10px 12px', fontWeight:600 }}>{c.name}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700,
                    background: c.plan==='enterprise' ? C.purpleLight : c.plan==='growth' ? C.greenLight : C.blueLight,
                    color: c.plan==='enterprise' ? C.purple : c.plan==='growth' ? C.green : C.blue,
                    textTransform:'uppercase' }}>{c.plan}</span>
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:c.status==='active'?C.green:c.status==='trial'?C.amber:C.red }}/>
                    <span style={{ fontSize:11, color:C.text2 }}>{c.status}</span>
                  </div>
                </td>
                <td style={{ padding:'10px 12px', color:C.text2 }}>{c.total_records}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontWeight:700, color: c.recent_activity > 0 ? C.green : C.text3 }}>{c.recent_activity}</span>
                </td>
                <td style={{ padding:'10px 12px', color:C.text2 }}>{c.total_users}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontWeight:600, color: c.active_users > 0 ? C.amber : C.text3 }}>{c.active_users}</span>
                </td>
                <td style={{ padding:'10px 12px', fontSize:11, color:C.text3 }}>{relTime(c.last_activity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data.clients || data.clients.length === 0) && (
          <div style={{ padding:24, textAlign:'center', color:C.text3, fontSize:12 }}>No clients provisioned yet.</div>
        )}
      </div>
    </>
  );
}
