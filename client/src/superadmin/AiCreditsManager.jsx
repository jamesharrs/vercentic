// client/src/superadmin/AiCreditsManager.jsx
import { useState, useEffect, useCallback } from 'react';

const F = "'Geist', 'DM Sans', -apple-system, sans-serif";
const C = { bg:'#0F1729', card:'#1A2540', border:'#243356', accent:'#7C3AED', green:'#10B981', amber:'#F59E0B', red:'#EF4444', text1:'#F1F5F9', text2:'#94A3B8', text3:'#64748B' };

const api = {
  get:   p => fetch(`/api${p}`, { credentials:'include' }).then(r => r.json()),
  post:  (p,b) => fetch(`/api${p}`, { method:'POST',  credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json()),
  patch: (p,b) => fetch(`/api${p}`, { method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json()),
  del:   p => fetch(`/api${p}`, { method:'DELETE', credentials:'include' }).then(r => r.json()),
};

const fmt    = n => n == null ? '—' : Number(n).toLocaleString();
const fmtU   = n => n == null ? '—' : `$${Number(n).toFixed(2)}`;
const fmtPct = n => n == null ? '—' : `${Number(n).toFixed(1)}%`;
const calcClientCost = (ti, to) => ((ti/1_000_000)*15) + ((to/1_000_000)*75);

const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 24px', ...style }}>{children}</div>
);
const Badge = ({ label, color=C.amber }) => (
  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, background:`${color}20`, color, fontFamily:F, letterSpacing:'0.04em' }}>{label}</span>
);
const WarnLevel = ({ status }) => {
  if (!status || status.uncapped) return <Badge label="Uncapped" color={C.text3}/>;
  if (!status.allowed)            return <Badge label="Blocked"  color={C.red}/>;
  const w = status.warn_level;
  if (!w) return <Badge label="Healthy" color={C.green}/>;
  return <Badge label={w.label} color={w.severity==='critical'?C.red:C.amber}/>;
};
const UsageBar = ({ pct }) => {
  const used = Math.min(100, 100-(pct||0));
  const barColor = used>=95?C.red:used>=80?C.amber:C.green;
  return (
    <div style={{ height:6, background:'#1E2D4A', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:6, width:`${used}%`, background:barColor, borderRadius:99, transition:'width 0.4s' }}/>
    </div>
  );
};
const StatCard = ({ label, value, sub, color=C.accent }) => (
  <Card style={{ padding:'16px 20px' }}>
    <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6, fontFamily:F }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:800, color, fontFamily:F }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.text3, fontFamily:F, marginTop:3 }}>{sub}</div>}
  </Card>
);

// ── Allocation Modal ──────────────────────────────────────────────────────────
const AllocationModal = ({ env, existing, onSave, onClose }) => {
  const [form, setForm] = useState({ monthly_budget_usd: existing?.monthly_budget_usd||100, hard_cap: existing?.hard_cap!==false, rollover: existing?.rollover||false, alert_threshold_pct: existing?.alert_threshold_pct||20, notes: existing?.notes||'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'#0F1729', color:C.text1, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box' };
  const roughReqs = Math.floor((form.monthly_budget_usd / ((15+75)/2/1_000_000))/1000);
  const handle = async () => { setSaving(true); await api.post('/ai-credits/allocations', { environment_id:env.environment_id, ...form }); setSaving(false); onSave(); };
  const Toggle = ({ k, label, desc }) => (
    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
      <div onClick={()=>set(k,!form[k])} style={{ width:36, height:20, borderRadius:99, background:form[k]?C.accent:C.border, position:'relative', transition:'background 0.2s', flexShrink:0, cursor:'pointer' }}>
        <div style={{ position:'absolute', top:2, left:form[k]?18:2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
      </div>
      <div><div style={{ fontSize:13, fontWeight:600, color:C.text1, fontFamily:F }}>{label}</div><div style={{ fontSize:11, color:C.text3, fontFamily:F }}>{desc}</div></div>
    </label>
  );
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, width:480, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.text1, fontFamily:F }}>{existing?'Edit Allocation':'Set Allocation'}</div>
          <div style={{ fontSize:12, color:C.text3, fontFamily:F, marginTop:3 }}>{env.environment_name}</div>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:F }}>Monthly Budget (client USD)</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C.text2, fontSize:16 }}>$</span>
              <input type="number" value={form.monthly_budget_usd} min={0} step={10} onChange={e=>set('monthly_budget_usd',parseFloat(e.target.value)||0)} style={{...inp,width:120}}/>
              <span style={{ fontSize:12, color:C.text3, fontFamily:F }}>/ month</span>
            </div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:F, marginTop:6 }}>≈ {fmt(roughReqs)}K copilot requests · Vercentic cost: {fmtU(form.monthly_budget_usd/5)}</div>
          </div>
          <Toggle k="hard_cap" label="Hard cap" desc="Block AI requests when budget is exhausted"/>
          <Toggle k="rollover" label="Rollover unused credits" desc="Carry unspent budget forward to next month"/>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:F }}>Warning threshold (% remaining)</div>
            <input type="number" value={form.alert_threshold_pct} min={5} max={50} step={5} onChange={e=>set('alert_threshold_pct',parseInt(e.target.value)||20)} style={{...inp,width:80}}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:F }}>Notes</div>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} style={{...inp,resize:'vertical'}}/>
          </div>
        </div>
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:C.accent, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, opacity:saving?0.7:1 }}>{saving?'Saving…':existing?'Update':'Set Allocation'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Top-up Modal ──────────────────────────────────────────────────────────────
const TopupModal = ({ env, onSave, onClose }) => {
  const [amount, setAmount] = useState(50);
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'#0F1729', color:C.text1, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box' };
  const handle = async () => { setSaving(true); await api.post('/ai-credits/topup', { environment_id:env.environment_id, amount_usd:amount, note }); setSaving(false); onSave(); };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, width:400, boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.text1, fontFamily:F }}>Top Up Credits</div>
          <div style={{ fontSize:12, color:C.text3, fontFamily:F, marginTop:3 }}>{env.environment_name}</div>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontFamily:F }}>Amount to add (USD)</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {[25,50,100,250,500].map(p=>(
                <button key={p} onClick={()=>setAmount(p)} style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${amount===p?C.accent:C.border}`, background:amount===p?`${C.accent}20`:'transparent', color:amount===p?C.accent:C.text2, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F }}>${p}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C.text2, fontSize:16 }}>$</span>
              <input type="number" value={amount} min={1} step={10} onChange={e=>setAmount(parseFloat(e.target.value)||0)} style={{...inp,width:120}}/>
            </div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:F, marginTop:6 }}>Vercentic cost: {fmtU(amount/5)} · Client charge: {fmtU(amount)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:F }}>Note</div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Reason for top-up…" style={inp}/>
          </div>
        </div>
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:C.green, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, opacity:saving?0.7:1 }}>{saving?'Processing…':`Add $${amount}`}</button>
        </div>
      </div>
    </div>
  );
};

// ── Usage Detail Modal ──────────────────────────────────────────────────────
// Per-environment feature breakdown — pulls the same GET /ai-credits/usage/:id
// endpoint the (now-fixed) client-facing AiGovernance dashboard uses. This is
// real, already-computed data (this_month.by_feature, monthly[]) that was
// previously only visible if you opened that one environment's own settings —
// surfacing it here means an operator debugging a budget spike doesn't have to
// leave the credits table to see which feature is driving it.
const UsageDetailModal = ({ env, onClose, onNavigate }) => {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.get(`/ai-credits/usage/${env.environment_id}?months=6`)
      .then(d => { if (live) setDetail(d); })
      .catch(() => { if (live) setDetail(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [env.environment_id]);

  const thisMonth = detail?.this_month || {};
  const byFeature = thisMonth.by_feature || [];
  const monthly   = detail?.monthly || [];
  const maxTok    = byFeature.reduce((m, f) => Math.max(m, (f.tokens_in || 0) + (f.tokens_out || 0)), 0) || 1;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, width:560, maxHeight:'85vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text1, fontFamily:F }}>Usage Detail</div>
            <div style={{ fontSize:12, color:C.text3, fontFamily:F, marginTop:3 }}>{env.environment_name}</div>
          </div>
          {onNavigate && (
            <button onClick={() => onNavigate('ai_usage')} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>Global usage log →</button>
          )}
        </div>
        <div style={{ padding:'20px 24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:C.text3, fontFamily:F }}>Loading…</div>
          ) : byFeature.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:C.text3, fontFamily:F, fontSize:13 }}>No AI usage recorded this month for this environment</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                <StatCard label="Requests" value={fmt(thisMonth.requests)} color={C.text1}/>
                <StatCard label="Tokens" value={fmt((thisMonth.tokens_in||0)+(thisMonth.tokens_out||0))} color={C.accent}/>
                <StatCard label="Client cost" value={fmtU(thisMonth.cost_client)} sub={`Anthropic cost: ${fmtU(thisMonth.cost_anthropic)}`} color={C.green}/>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, fontFamily:F }}>By feature — this month</div>
              {byFeature.map(f => {
                const total = (f.tokens_in||0) + (f.tokens_out||0);
                const pct   = Math.round((total/maxTok)*100);
                return (
                  <div key={f.feature} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12, fontFamily:F }}>
                      <span style={{ color:C.text1, fontWeight:600 }}>{f.feature}</span>
                      <span style={{ color:C.text3 }}>{f.requests} req · {fmt(total)} tok</span>
                    </div>
                    <div style={{ height:6, borderRadius:99, background:'#0F1729', overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:C.accent }}/>
                    </div>
                  </div>
                );
              })}
              {monthly.length > 1 && (
                <div style={{ marginTop:22 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, fontFamily:F }}>Monthly trend</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
                    <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Month','Requests','Tokens','Client cost'].map(h=><th key={h} style={{ textAlign:'left', padding:'6px 0', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {monthly.map(m => (
                        <tr key={m.month} style={{ borderBottom:`1px solid ${C.border}30` }}>
                          <td style={{ padding:'6px 0', fontSize:12, color:C.text2 }}>{m.month}</td>
                          <td style={{ padding:'6px 0', fontSize:12, color:C.text2 }}>{fmt(m.requests)}</td>
                          <td style={{ padding:'6px 0', fontSize:12, color:C.text2 }}>{fmt((m.tokens_in||0)+(m.tokens_out||0))}</td>
                          <td style={{ padding:'6px 0', fontSize:12, color:C.green }}>{fmtU(m.cost_client)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function AiCreditsManager({ onNavigate }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [allocModal, setAllocModal] = useState(null);
  const [topupModal, setTopupModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('environments');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api.get('/ai-credits/master'); setData(d); } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const envs     = (data?.environments || []).filter(e => !search || e.environment_name.toLowerCase().includes(search.toLowerCase()));
  const warnings = envs.filter(e => e.status?.warn_level);
  const stats    = data?.stats || {};

  const handleModalClose = () => { setAllocModal(null); setTopupModal(null); setSelected(null); load(); };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:C.text3, fontFamily:F }}>Loading…</div>;

  return (
    <div style={{ padding:'0 0 40px' }}>
      {/* Modals */}
      {allocModal && <AllocationModal env={allocModal} existing={allocModal.allocation} onSave={handleModalClose} onClose={()=>setAllocModal(null)}/>}
      {topupModal && <TopupModal      env={topupModal} onSave={handleModalClose} onClose={()=>setTopupModal(null)}/>}
      {detailModal && <UsageDetailModal env={detailModal} onClose={()=>setDetailModal(null)} onNavigate={onNavigate}/>}

      {/* Header */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text1, fontFamily:F, marginBottom:4 }}>AI Credit Management</div>
          <div style={{ fontSize:13, color:C.text3, fontFamily:F }}>Vercentic master pool · {stats.total_environments} environments · 5× margin applied</div>
        </div>
        {onNavigate && (
          <button onClick={() => onNavigate('ai_usage')} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap', flexShrink:0 }}>View global usage &amp; logs →</button>
        )}
      </div>

      {/* Warning strip */}
      {warnings.length > 0 && (
        <div style={{ marginBottom:20, padding:'12px 16px', background:`${C.amber}15`, border:`1.5px solid ${C.amber}40`, borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:18 }}>⚠</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.amber, fontFamily:F }}>{warnings.length} environment{warnings.length>1?'s':''} with low or exhausted credits</div>
            <div style={{ fontSize:12, color:C.text3, fontFamily:F }}>{warnings.map(e=>e.environment_name).join(', ')}</div>
          </div>
          <button onClick={()=>setTab('warnings')} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.amber}`, background:'transparent', color:C.amber, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>View</button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Client revenue this month" value={fmtU(stats.client_revenue_usd)} sub="at 5× markup" color={C.green}/>
        <StatCard label="Vercentic AI cost" value={fmtU(stats.used_usd_anthropic)} sub="actual Anthropic cost" color={C.text3}/>
        <StatCard label="Gross margin" value={fmtU(stats.margin_usd)} sub={`${stats.used_usd_anthropic>0?Math.round((1-stats.used_usd_anthropic/(stats.client_revenue_usd||1))*100):80}% margin`} color={C.accent}/>
        <StatCard label="Platform requests" value={fmt(stats.total_requests)} sub="this month" color={C.text1}/>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {[{id:'environments',label:`Environments (${data?.environments?.length||0})`},{id:'warnings',label:warnings.length>0?`Warnings (${warnings.length})`:'Warnings'},{id:'pricing',label:'Pricing'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'10px 0', marginRight:24, border:'none', background:'transparent', fontFamily:F, fontSize:13, fontWeight:600, cursor:'pointer', color:tab===t.id?C.accent:C.text3, borderBottom:tab===t.id?`2px solid ${C.accent}`:'2px solid transparent' }}>{t.label}</button>
        ))}
      </div>

      {/* Environments table */}
      {tab==='environments' && (
        <>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search environments…"
              style={{ flex:1, padding:'9px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'#0F1729', color:C.text1, fontSize:13, fontFamily:F, outline:'none' }}/>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}`, background:'#0F1729' }}>
                  {['Environment','Status','Budget / month','Used','Remaining','Requests','Actions'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envs.map((env,i)=>(
                  <tr key={env.environment_id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?'transparent':'#0F172908' }}>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{env.environment_name}</div>
                      {env.is_default && <div style={{ fontSize:10, color:C.accent, marginTop:2 }}>default</div>}
                    </td>
                    <td style={{ padding:'14px 16px' }}><WarnLevel status={env.status}/></td>
                    <td style={{ padding:'14px 16px', fontSize:13, color:C.text1 }}>{env.allocation?fmtU(env.allocation.monthly_budget_usd):<span style={{color:C.text3}}>Uncapped</span>}</td>
                    <td style={{ padding:'14px 16px', fontSize:13, color:C.text1 }}>{env.status?.uncapped?<span style={{color:C.text3}}>—</span>:fmtU(env.status?.used_usd)}</td>
                    <td style={{ padding:'14px 16px' }}>
                      {env.status?.uncapped?<span style={{fontSize:13,color:C.text3}}>—</span>:(
                        <div>
                          <div style={{ fontSize:13, color:env.status?.pct_remaining<5?C.red:env.status?.pct_remaining<20?C.amber:C.green }}>{fmtU(env.status?.remaining_usd)} ({env.status?.pct_remaining}%)</div>
                          <UsageBar pct={env.status?.pct_remaining}/>
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'14px 16px', fontSize:13, color:C.text2 }}>{fmt(env.usage?.requests)}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>setDetailModal(env)} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>Details</button>
                        <button onClick={()=>setTopupModal(env)} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:C.green, color:'white', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F }}>+ Top Up</button>
                        <button onClick={()=>setAllocModal(env)} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>Allocate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Warnings */}
      {tab==='warnings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {warnings.length===0?(
            <Card style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:32, marginBottom:12, color:C.green }}>✓</div>
              <div style={{ fontSize:15, fontWeight:700, color:C.text1, fontFamily:F }}>All environments healthy</div>
            </Card>
          ):warnings.map(env=>(
            <Card key={env.environment_id} style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text1, fontFamily:F }}>{env.environment_name}</div>
                  <WarnLevel status={env.status}/>
                </div>
                <div style={{ fontSize:13, color:C.text3, fontFamily:F, marginBottom:8 }}>{fmtU(env.status?.remaining_usd)} remaining of {fmtU(env.status?.budget_usd)} · {env.status?.pct_remaining}%</div>
                <UsageBar pct={env.status?.pct_remaining}/>
              </div>
              <button onClick={()=>setTopupModal(env)} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:C.green, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F }}>Top Up</button>
            </Card>
          ))}
        </div>
      )}

      {/* Pricing */}
      {tab==='pricing' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <div style={{ fontSize:14, fontWeight:700, color:C.text1, fontFamily:F, marginBottom:16 }}>Pricing Model</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Token Type','Anthropic Cost','Client Price (5×)','Margin'].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 0', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {[{type:'Input tokens',cost:'$3.00',client:'$15.00',margin:'$12.00'},{type:'Output tokens',cost:'$15.00',client:'$75.00',margin:'$60.00'}].map(row=>(
                  <tr key={row.type} style={{ borderBottom:`1px solid ${C.border}30` }}>
                    <td style={{ padding:'12px 0', fontSize:13, color:C.text1 }}>{row.type}</td>
                    <td style={{ padding:'12px 0', fontSize:13, color:C.text3 }}>{row.cost}/M tokens</td>
                    <td style={{ padding:'12px 0', fontSize:13, color:C.green, fontWeight:700 }}>{row.client}/M tokens</td>
                    <td style={{ padding:'12px 0', fontSize:13, color:C.accent }}>{row.margin}/M tokens</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card style={{ background:'#0F1729' }}>
            <div style={{ fontSize:13, color:C.text2, fontFamily:F, lineHeight:1.8 }}>
              <strong style={{color:C.text1}}>How it works:</strong> Vercentic pays Anthropic at list price (input $3/M, output $15/M). Clients are charged 5× that rate. Monthly budgets are set per environment — when exhausted, AI features are blocked (hard cap) or trigger a warning (soft cap).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
