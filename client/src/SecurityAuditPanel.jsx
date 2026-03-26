// SecurityAuditPanel.jsx — Security audit viewer for Settings
import { useState, useEffect, useCallback } from 'react';

const F = "'Inter',-apple-system,sans-serif";
const C = { text1:'#111827', text2:'#374151', text3:'#9ca3af', accent:'#4361EE', border:'#e5e7eb', red:'#ef4444', amber:'#f59f00', green:'#0ca678' };
const SEV_C = { info:'#6b7280', warn:'#f59f00', critical:'#ef4444' };
const LABELS = {
  access_denied:'Access Denied', permissions_changed:'Permissions Changed',
  field_visibility_changed:'Field Visibility Changed', role_created:'Role Created',
  role_deleted:'Role Deleted', login_success:'Login Success', login_failed:'Login Failed',
  user_created:'User Created', user_role_changed:'User Role Changed',
  copilot_action:'Copilot Action', copilot_denied:'Copilot Denied', bulk_export:'Bulk Export',
};

function fmtT(ts) { if(!ts) return ''; const d=new Date(ts),n=new Date(),s=(n-d)/1000; if(s<60) return 'just now'; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
const api = { get: async (url) => { const r = await fetch(`/api${url}`, { headers:{ 'x-user-id': JSON.parse(localStorage.getItem('talentos_session')||'{}')?.user?.id||'' }}); return r.json(); } };

export default function SecurityAuditPanel({ environment }) {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ severity:'', event:'', search:'' });
  const [expanded, setExpanded] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit:30 });
    if (filters.severity) p.set('severity', filters.severity);
    if (filters.event) p.set('event', filters.event);
    if (filters.search) p.set('search', filters.search);
    if (environment?.id) p.set('environment_id', environment.id);
    const data = await api.get(`/security-audit?${p}`);
    setEvents(data.items||[]); setTotal(data.total||0); setLoading(false);
  }, [page, filters, environment?.id]);

  const loadStats = useCallback(async () => {
    const p = new URLSearchParams();
    if (environment?.id) p.set('environment_id', environment.id);
    setStats(await api.get(`/security-audit/stats?${p}`));
  }, [environment?.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { if (tab==='stats') loadStats(); }, [tab, loadStats]);

  const handleExport = () => {
    const p = new URLSearchParams();
    if (filters.severity) p.set('severity', filters.severity);
    if (filters.event) p.set('event', filters.event);
    if (environment?.id) p.set('environment_id', environment.id);
    window.open(`/api/security-audit/export?${p}`, '_blank');
  };

  return (
    <div style={{ fontFamily:F }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text1 }}>Security Audit Trail</h3>
          <p style={{ margin:'4px 0 0', fontSize:12, color:C.text3 }}>{total} events · Permission changes, access denials, role modifications</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={handleExport} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', fontSize:12, fontWeight:600, cursor:'pointer', color:C.text2 }}>Export CSV</button>
          <button onClick={loadEvents} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', fontSize:12, fontWeight:600, cursor:'pointer', color:C.text2 }}>Refresh</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:4, marginBottom:14 }}>
        {[{id:'events',label:'Events'},{id:'stats',label:'Summary'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:tab===t.id?700:500, border:'none', background:tab===t.id?C.accent:'transparent', color:tab===t.id?'white':C.text3, cursor:'pointer' }}>{t.label}</button>
        ))}
      </div>

      {tab==='stats'&&stats&&(
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {['info','warn','critical'].map(s=>(
              <div key={s} style={{ padding:14, borderRadius:10, border:`1.5px solid ${SEV_C[s]}30`, background:`${SEV_C[s]}08` }}>
                <div style={{ fontSize:20, fontWeight:800, color:SEV_C[s] }}>{stats.by_severity[s]||0}</div>
                <div style={{ fontSize:11, fontWeight:600, color:C.text3, textTransform:'uppercase' }}>{s}</div>
              </div>
            ))}
          </div>
          {stats.top_denied_actions?.length>0&&(
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:8 }}>Most denied actions</div>
              {stats.top_denied_actions.map(d=>(
                <div key={d.action} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ flex:1, fontSize:12, color:C.text2 }}>{d.action}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.red }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
          {stats.recent_critical?.length>0&&(
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:8 }}>Recent critical events</div>
              {stats.recent_critical.map(e=>(
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', marginBottom:4, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.red }}>{LABELS[e.event]||e.event}</span>
                  <span style={{ fontSize:11, color:C.text3 }}>{e.user_email}</span>
                  <span style={{ fontSize:11, color:C.text3, marginLeft:'auto' }}>{fmtT(e.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='events'&&(<>
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <select value={filters.severity} onChange={e=>{setFilters(f=>({...f,severity:e.target.value}));setPage(1);}}
            style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, color:C.text2, background:'white' }}>
            <option value="">All severities</option>
            <option value="info">Info</option><option value="warn">Warning</option><option value="critical">Critical</option>
          </select>
          <select value={filters.event} onChange={e=>{setFilters(f=>({...f,event:e.target.value}));setPage(1);}}
            style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, color:C.text2, background:'white' }}>
            <option value="">All event types</option>
            {Object.entries(LABELS).map(([k,v])=>(<option key={k} value={k}>{v}</option>))}
          </select>
          <input type="text" placeholder="Search events…" value={filters.search}
            onChange={e=>{setFilters(f=>({...f,search:e.target.value}));setPage(1);}}
            style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, flex:1, minWidth:150 }}/>
        </div>
        {loading ? <div style={{ padding:20, textAlign:'center', color:C.text3, fontSize:13 }}>Loading…</div>
        : events.length===0 ? <div style={{ padding:30, textAlign:'center', color:C.text3, fontSize:13 }}>No security events found.</div>
        : <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {events.map(e=>(
              <div key={e.id} onClick={()=>setExpanded(expanded===e.id?null:e.id)}
                style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${expanded===e.id?C.accent:C.border}`,
                  background:expanded===e.id?`${C.accent}05`:'white', cursor:'pointer', transition:'all .1s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:SEV_C[e.severity]||'#6b7280', flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:SEV_C[e.severity]||C.text1, minWidth:140 }}>{LABELS[e.event]||e.event}</span>
                  <span style={{ fontSize:12, color:C.text2 }}>{e.user_email||'system'}</span>
                  {e.action&&<span style={{ fontSize:11, padding:'1px 6px', borderRadius:4, background:'#f3f4f6', color:C.text3 }}>{e.action}</span>}
                  {e.object_slug&&e.object_slug!=='__global__'&&(
                    <span style={{ fontSize:11, padding:'1px 6px', borderRadius:4, background:`${C.accent}12`, color:C.accent }}>{e.object_slug}</span>
                  )}
                  <span style={{ fontSize:11, color:C.text3, marginLeft:'auto' }}>{fmtT(e.timestamp)}</span>
                </div>
                {expanded===e.id&&(
                  <div style={{ marginTop:10, padding:'10px 12px', background:'#f8f9fc', borderRadius:8, fontSize:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'6px 12px' }}>
                      <span style={{ fontWeight:600, color:C.text3 }}>Event ID</span>
                      <span style={{ color:C.text2, fontFamily:'monospace', fontSize:11 }}>{e.id}</span>
                      <span style={{ fontWeight:600, color:C.text3 }}>Timestamp</span>
                      <span style={{ color:C.text2 }}>{new Date(e.timestamp).toISOString()}</span>
                      <span style={{ fontWeight:600, color:C.text3 }}>User</span>
                      <span style={{ color:C.text2 }}>{e.user_email||'—'} ({e.role_slug||'—'})</span>
                      <span style={{ fontWeight:600, color:C.text3 }}>IP Address</span>
                      <span style={{ color:C.text2 }}>{e.ip||'—'}</span>
                      <span style={{ fontWeight:600, color:C.text3 }}>Target</span>
                      <span style={{ color:C.text2 }}>{e.target_type||'—'}: {e.target_id||'—'}</span>
                      {e.details&&<><span style={{ fontWeight:600, color:C.text3 }}>Details</span>
                        <pre style={{ margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all', fontSize:11, color:C.text2, background:'white', padding:8, borderRadius:6, border:`1px solid ${C.border}` }}>{JSON.stringify(e.details,null,2)}</pre></>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>}
        {total>30&&(
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:14, alignItems:'center' }}>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'white', fontSize:12, cursor:page<=1?'not-allowed':'pointer', color:page<=1?C.text3:C.text2 }}>← Prev</button>
            <span style={{ fontSize:12, color:C.text3 }}>Page {page} of {Math.ceil(total/30)}</span>
            <button disabled={page>=Math.ceil(total/30)} onClick={()=>setPage(p=>p+1)}
              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'white', fontSize:12, cursor:page>=Math.ceil(total/30)?'not-allowed':'pointer', color:page>=Math.ceil(total/30)?C.text3:C.text2 }}>Next →</button>
          </div>
        )}
      </>)}
    </div>
  );
}
