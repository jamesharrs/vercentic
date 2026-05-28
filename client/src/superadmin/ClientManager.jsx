import { useState, useEffect, useCallback } from "react";
import AIDiagnosisPanel from './AIDiagnosisPanel.jsx';

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#0a0e1a", surface:"#111827", surface2:"#1a2235", border:"#1e2d45", border2:"#2d3f5e",
  text1:"#f0f4ff", text2:"#8899bb", text3:"#4a5878",
  accent:"#3b82f6", green:"#10b981", amber:"#f59e0b", red:"#ef4444", purple:"#8b5cf6", cyan:"#06b6d4",
};

const saFetch = (url, opts = {}) => {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  // Add CSRF token for mutations
  if (opts.method && opts.method !== 'GET') {
    const csrf = document.cookie.match(/vercentic_csrf=([^;]+)/);
    if (csrf) h['X-CSRF-Token'] = decodeURIComponent(csrf[1]);
  }
  return fetch(url, { credentials: 'include', ...opts, headers: h });
};
const sa = {
  get:        p     => saFetch(`/api/superadmin/clients${p}`).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
  post:       (p,b) => saFetch(`/api/superadmin/clients${p}`,{method:'POST',  body:JSON.stringify(b)}).then(r=>r.json()),
  patch:      (p,b) => saFetch(`/api/superadmin/clients${p}`,{method:'PATCH', body:JSON.stringify(b)}).then(r=>r.json()),
  del:        p     => saFetch(`/api/superadmin/clients${p}`,{method:'DELETE'}).then(r=>r.json()),
  delConfirm: p     => saFetch(`/api/superadmin/clients${p}?confirm=yes`,{method:'DELETE'}).then(r=>{ if(!r.ok) return r.json().then(d=>{throw new Error(d.error||r.status);}); return r.json(); }),
};

const inputSt = { width:'100%',padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border2}`,background:C.surface2,color:C.text1,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box' };
const labelSt = { fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5 };
const cardSt  = { background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden' };

const Btn = ({children,onClick,v='primary',sz='md',disabled,style={}}) => {
  const sizes = { sm:{padding:'5px 10px',fontSize:11}, md:{padding:'8px 16px',fontSize:13} };
  const vars  = {
    primary:{background:C.accent,color:'#fff',border:'none'},
    secondary:{background:C.surface2,color:C.text2,border:`1px solid ${C.border2}`},
    danger:{background:`${C.red}20`,color:C.red,border:`1px solid ${C.red}40`},
    ghost:{background:'transparent',color:C.text2,border:`1px solid ${C.border2}`},
    success:{background:`${C.green}20`,color:C.green,border:`1px solid ${C.green}40`},
  };
  return <button onClick={onClick} disabled={disabled}
    style={{display:'flex',alignItems:'center',gap:6,borderRadius:8,fontFamily:F,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all .12s',...sizes[sz],...vars[v],...style}}>{children}</button>;
};

const StatusBadge = ({status}) => {
  const m={active:[C.green,'#ecfdf5'],trial:[C.amber,'#fffbeb'],suspended:[C.red,'#fef2f2'],churned:[C.text3,C.surface2],production:['#06b6d4','#ecfeff'],staging:[C.amber,'#fffbeb'],uat:[C.purple,'#f5f3ff']};
  const [color,bg]=m[status?.toLowerCase()]||[C.text3,C.surface2];
  return <span style={{padding:'3px 8px',borderRadius:99,fontSize:11,fontWeight:700,background:bg,color,border:`1px solid ${color}25`}}>{status}</span>;
};

const PlanBadge = ({plan}) => {
  const m={enterprise:[C.purple,'#f5f3ff'],growth:[C.accent,'#eff6ff'],starter:[C.text2,C.surface2],trial:[C.amber,'#fffbeb']};
  const [color,bg]=m[plan?.toLowerCase()]||[C.text2,C.surface2];
  return <span style={{padding:'3px 8px',borderRadius:99,fontSize:10,fontWeight:800,background:bg,color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{plan}</span>;
};

export function ClientList({ onProvision, onSelectClient }) {
  const [clients,setClients]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null); // client obj awaiting delete confirm
  const [deleteTyped,   setDeleteTyped]   = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const [sortField,setSortField]=useState('created_at'); const [sortDir,setSortDir]=useState('desc');

  const [error, setError] = useState(null);
  const load = useCallback(async()=>{ 
    setLoading(true); setError(null);
    try {
      const d = await sa.get(''); 
      setClients(Array.isArray(d) ? d : []);
    } catch(e) { 
      setError(e.message); 
    }
    setLoading(false); 
  },[]);
  useEffect(()=>{ load(); },[load]);

  const sortVal = c => {
    if (sortField==='name') return c.name?.toLowerCase()||'';
    if (sortField==='plan') return c.plan||'';
    if (sortField==='status') return c.status||'';
    if (sortField==='records') return c.record_count||0;
    if (sortField==='created_at') return c.created_at||'';
    if (sortField==='contact') return c.primary_contact_name?.toLowerCase()||c.primary_email?.toLowerCase()||'';
    return '';
  };
  const filtered = clients
    .filter(c=>{
      const ms=!search||c.name.toLowerCase().includes(search.toLowerCase())||c.primary_contact_email?.toLowerCase().includes(search.toLowerCase());
      return ms && (filter==='all'||c.status===filter);
    })
    .sort((a,b)=>{
      const av=sortVal(a), bv=sortVal(b);
      const cmp = typeof av==='number' ? av-bv : av.localeCompare?.(bv)||0;
      return sortDir==='asc' ? cmp : -cmp;
    });

  const handleDeleteClient = async () => {
    if (!confirmDelete || deleteTyped !== confirmDelete.name) return;
    setDeleting(true);
    try {
      await sa.del(`/${confirmDelete.id}`);
      setConfirmDelete(null); setDeleteTyped('');
      load();
    } catch(e) { alert('Delete failed: ' + e.message); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:16,padding:32,width:440,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:18,fontWeight:800,color:C.red,marginBottom:8}}>Delete Client</div>
            <p style={{fontSize:13,color:C.text2,marginBottom:16,lineHeight:1.6}}>
              This will permanently delete <strong>{confirmDelete.name}</strong> and all associated data —
              environments, users, records, and configuration. <strong>This cannot be undone.</strong>
            </p>
            <div style={{fontSize:12,color:C.text2,marginBottom:8}}>Type <strong>{confirmDelete.name}</strong> to confirm:</div>
            <input
              autoFocus
              value={deleteTyped}
              onChange={e=>setDeleteTyped(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && deleteTyped===confirmDelete.name) handleDeleteClient(); if(e.key==='Escape') { setConfirmDelete(null); setDeleteTyped(''); } }}
              placeholder={confirmDelete.name}
              style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`2px solid ${deleteTyped===confirmDelete.name?C.red:'#e5e7eb'}`,fontSize:13,outline:'none',boxSizing:'border-box',marginBottom:16}}
            />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>{ setConfirmDelete(null); setDeleteTyped(''); }} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={handleDeleteClient} disabled={deleteTyped!==confirmDelete.name||deleting}
                style={{padding:'8px 20px',borderRadius:8,border:'none',background:deleteTyped===confirmDelete.name?C.red:'#fca5a5',color:'white',fontSize:13,fontWeight:700,cursor:deleteTyped===confirmDelete.name?'pointer':'not-allowed'}}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" style={{...inputSt,width:220}}/>
          <div style={{display:'flex',borderRadius:8,border:`1px solid ${C.border2}`,overflow:'hidden'}}>
            {['all','active','trial','suspended'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 12px',border:'none',background:filter===f?C.accent:C.surface2,color:filter===f?'#fff':C.text2,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F,textTransform:'capitalize'}}>{f}</button>
            ))}
          </div>
        </div>
        <Btn onClick={onProvision}>⚡ Provision new client</Btn>
      </div>
      {loading && <div style={{color:C.text3,padding:40,textAlign:'center'}}>Loading…</div>}
      {!loading && error && (
        <div style={{padding:'16px 20px',borderRadius:10,background:'#2d1b1b',border:'1px solid #ef444440',color:'#fca5a5',fontSize:13,marginBottom:16}}>
          Failed to load clients: {error} — <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={load}>retry</span>
        </div>
      )}
      {!loading && filtered.length===0 && (
        <div style={{...cardSt,padding:'60px 40px',textAlign:'center'}}>
          <div style={{width:52,height:52,borderRadius:16,background:`${C.accent}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/></svg>
            </div>
          <div style={{fontSize:16,fontWeight:700,color:C.text2,marginBottom:8}}>No clients yet</div>
          <Btn onClick={onProvision}>⚡ Provision first client</Btn>
        </div>
      )}
      {!loading && filtered.length>0 && (
        <div style={cardSt}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
                {[
                  {label:'Client',field:'name'},{label:'Plan',field:'plan'},{label:'Status',field:'status'},
                  {label:'Environment',field:null},{label:'Records',field:'records'},
                  {label:'Created',field:'created_at'},{label:'Contact',field:'contact'},{label:'Actions',field:null}
                ].map(({label,field})=>(
                  <th key={label} onClick={field?()=>{if(sortField===field){setSortDir(d=>d==='asc'?'desc':'asc');}else{setSortField(field);setSortDir('asc');}}:undefined}
                    style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:field?C.accent:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap',cursor:field?'pointer':'default',userSelect:'none'}}>
                    {label}{field&&<span style={{marginLeft:4,opacity:.6}}>{sortField===field?(sortDir==='asc'?'↑':'↓'):'↕'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{fontWeight:700,color:C.text1,cursor:'pointer'}} onClick={()=>onSelectClient(c)}>{c.name}</div>
                      {c.source==='self_serve' && (
                        <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:99,background:'#dbeafe',color:'#1d4ed8',textTransform:'uppercase',letterSpacing:'0.05em',flexShrink:0}}>
                          Self-serve
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                      {c.primary_email||c.industry||'—'}
                      {c.trial_ends_at && new Date(c.trial_ends_at) > new Date() && (
                        <span style={{marginLeft:6,color:'#f59e0b',fontWeight:600}}>
                          · Trial: {Math.ceil((new Date(c.trial_ends_at)-new Date())/86400000)}d left
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{padding:'12px 14px'}}><PlanBadge plan={c.plan}/></td>
                  <td style={{padding:'12px 14px'}}><StatusBadge status={c.status}/></td>
                  <td style={{padding:'12px 14px'}}>
                    {c.env_count > 0 ? (
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        <a href={c.tenant_slug ? `https://${c.tenant_slug}.vercentic.com` : 'https://www.vercentic.com'}
                           target="_blank" rel="noreferrer"
                           style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#60a5fa',textDecoration:'none',padding:'4px 9px',borderRadius:6,background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.25)',width:'fit-content'}}
                           onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.2)'}
                           onMouseLeave={e=>e.currentTarget.style.background='rgba(96,165,250,0.12)'}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                          {c.tenant_slug ? `${c.tenant_slug}.vercentic.com` : 'Open app ↗'}
                        </a>
                        <span style={{fontSize:10,color:C.text3}}>{c.env_count} env{c.env_count!==1?'s':''}</span>
                      </div>
                    ) : (
                      <span style={{fontSize:12,color:C.text3}}>Not provisioned</span>
                    )}
                  </td>
                  <td style={{padding:'12px 14px',color:C.text2,fontSize:13}}>{c.record_count||0}</td>
                  <td style={{padding:'12px 14px',color:C.text3,fontSize:12,whiteSpace:'nowrap'}}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:12,color:C.text2}}>{c.primary_contact_name||'—'}</div>
                    <div style={{fontSize:11,color:C.text3}}>{c.primary_contact_email||''}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <Btn sz='sm' v='secondary' onClick={()=>onSelectClient(c)}>View</Btn>
                      {c.tenant_slug && (
                        <Btn sz='sm' v='primary' onClick={async()=>{
                          try {
                            const d = await sa.post(`/${c.id}/impersonate`, {});
                            if (d.login_url) window.open(d.login_url, '_blank');
                            else alert(d.error || 'Impersonation failed');
                          } catch(e) { alert('Error: ' + e.message); }
                        }}>Login as →</Btn>
                      )}
                      {c.status==='active'
                        ? <Btn sz='sm' v='danger' onClick={async()=>{ await sa.patch(`/${c.id}/status`,{status:'suspended'}); load(); }}>Suspend</Btn>
                        : <Btn sz='sm' v='success' onClick={async()=>{ await sa.patch(`/${c.id}/status`,{status:'active'}); load(); }}>Activate</Btn>}
                      <Btn sz='sm' v='danger' onClick={()=>{ setConfirmDelete(c); setDeleteTyped(''); }}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Demo Data Tab ─────────────────────────────────────────────────────────────
function DemoDataTab({ client, stats }) {
  const [seeding,        setSeeding]        = useState(false);
  const [clearing,       setClearing]       = useState(false);
  const [clearingAll,    setClearingAll]     = useState(false);
  const [clearingEnv,    setClearingEnv]     = useState(null); // envId being cleared
  const [confirmAll,     setConfirmAll]      = useState(false);
  const [confirmEnv,     setConfirmEnv]      = useState(null); // envId awaiting confirm
  const [log,       setLog]       = useState([]);
  const [progress,  setProgress]  = useState(0);
  const [results,   setResults]   = useState(null);
  const [error,     setError]     = useState(null);

  const envId = stats?.environments?.[0]?.id || client?.environments?.[0]?.id;

  const runSeed = async (clearFirst=false) => {
    if (!envId) { setError('No environment found for this client'); return; }
    setSeeding(true); setLog([]); setProgress(0); setResults(null); setError(null);
    try {
      const resp = await saFetch('/api/superadmin/demo/seed', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ environment_id: envId, clear_first: clearFirst })
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l=>l.startsWith('data:'));
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.pct != null) setProgress(d.pct);
            if (d.message) setLog(prev=>[...prev, d.message]);
            if (d.step === 'complete') setResults(d.results);
            if (d.step === 'error') setError(d.message);
          } catch{}
        }
      }
    } catch(e) { setError(e.message); }
    finally { setSeeding(false); }
  };

  const clearDemo = async () => {
    if (!envId) return;
    setClearing(true);
    try {
      const r = await saFetch('/api/superadmin/demo/clear', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({environment_id:envId}) });
      const d = await r.json();
      setLog([`Cleared ${d.removed} demo records`]); setResults(null);
    } catch(e) { setError(e.message); }
    finally { setClearing(false); }
  };

  const R = C;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Action buttons */}
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <button onClick={()=>runSeed(false)} disabled={seeding||clearing||!envId} style={{padding:'10px 20px',borderRadius:9,border:'none',background:R.accent,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:seeding||clearing?0.6:1}}>
          {seeding ? `Seeding… ${progress}%` : '🌱 Seed Demo Data'}
        </button>
        <button onClick={()=>runSeed(true)} disabled={seeding||clearing||!envId} style={{padding:'10px 20px',borderRadius:9,border:`1.5px solid ${R.accent}`,background:'transparent',color:R.accent,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:seeding||clearing?0.6:1}}>
          🔄 Clear & Re-seed
        </button>
        <button onClick={clearDemo} disabled={seeding||clearing||!envId} style={{padding:'10px 20px',borderRadius:9,border:'1.5px solid #e03131',background:'transparent',color:'#e03131',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:seeding||clearing?0.6:1}}>
          {clearing ? 'Clearing…' : '🗑 Clear Demo Data'}
        </button>
        {!envId && <span style={{fontSize:12,color:R.text3}}>No environment found — provision this client first</span>}
      </div>

      {/* Progress bar */}
      {seeding && (
        <div style={{background:'#f3f4f6',borderRadius:99,height:8,overflow:'hidden'}}>
          <div style={{height:8,width:`${progress}%`,background:R.accent,borderRadius:99,transition:'width .3s'}}/>
        </div>
      )}

      {/* Error */}
      {error && <div style={{padding:'12px 16px',borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',color:'#e03131',fontSize:13}}>{error}</div>}

      {/* Results */}
      {results && (
        <div style={{padding:'16px 20px',borderRadius:12,background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#064e3b',marginBottom:12}}>✅ Demo data seeded successfully</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[['Jobs',results.jobs,'#4361ee'],['Candidates',results.candidates,'#0ca678'],['Interviews',results.interviews,'#7c3aed'],['Offers',results.offers,'#f59f00'],['Comms',results.communications,'#3b82f6'],['Notes',results.notes,'#9ca3af'],['Workflows',results.workflows,'#0d9488']].map(([label,val,col])=>(
              <div key={label} style={{background:'white',borderRadius:8,padding:'10px 14px',borderLeft:`3px solid ${col}`}}>
                <div style={{fontSize:20,fontWeight:800,color:'#111827'}}>{val||0}</div>
                <div style={{fontSize:11,color:'#6b7280',fontWeight:600,textTransform:'uppercase'}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{background:'#1a1a2e',borderRadius:10,padding:'14px 16px',fontFamily:'ui-monospace,monospace',fontSize:12}}>
          {log.map((l,i)=><div key={i} style={{color:i===log.length-1?'#a5f3fc':'#64748b',marginBottom:3}}>▸ {l}</div>)}
        </div>
      )}

      {/* ── Clear All Records section ──────────────────────────── */}
      <div style={{background:'#fff5f5',borderRadius:12,border:'1px solid #fecaca',padding:'16px 20px'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#991b1b',marginBottom:4}}>Danger Zone — Clear Records</div>
        <div style={{fontSize:12,color:'#7f1d1d',marginBottom:14}}>
          Permanently deletes all records from this environment. Keeps objects, fields, workflows and users intact.
          This cannot be undone.
        </div>

        {/* Per-environment clear */}
        {(stats?.environments||[]).map(env => (
          <div key={env.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'10px 14px',background:'#fff',borderRadius:8,border:'1px solid #fecaca'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:'#111827'}}>{env.name||'Environment'}</div>
              <div style={{fontSize:11,color:'#6b7280',fontFamily:'monospace'}}>{env.id}</div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:'#374151',minWidth:80,textAlign:'right'}}>
              {env.record_count||0} records
            </div>
            {confirmEnv === env.id ? (
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:11,color:'#e03131',fontWeight:700}}>Sure?</span>
                <button
                  disabled={clearingEnv===env.id}
                  onClick={async()=>{
                    setClearingEnv(env.id); setConfirmEnv(null);
                    try {
                      const d = await sa.delConfirm(`/${client.id}/environments/${env.id}/records`);
                      setLog(prev=>[...prev,`✓ Cleared ${d.total_removed} records from ${env.name}`]);
                    } catch(e){setError(e.message);}
                    setClearingEnv(null);
                  }}
                  style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#e03131',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  {clearingEnv===env.id?'Clearing…':'Yes, delete'}
                </button>
                <button onClick={()=>setConfirmEnv(null)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #d1d5db',background:'transparent',fontSize:11,cursor:'pointer',color:'#374151'}}>Cancel</button>
              </div>
            ) : (
              <button
                disabled={clearingEnv===env.id}
                onClick={()=>setConfirmEnv(env.id)}
                style={{padding:'5px 12px',borderRadius:6,border:'1px solid #e03131',background:'transparent',color:'#e03131',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                Clear records
              </button>
            )}
          </div>
        ))}

        {/* Clear ALL environments */}
        <div style={{borderTop:'1px solid #fecaca',marginTop:10,paddingTop:10,display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,fontSize:12,color:'#7f1d1d',fontWeight:600}}>Clear records from ALL environments</div>
          {confirmAll ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:11,color:'#e03131',fontWeight:700}}>Permanently delete everything?</span>
              <button
                disabled={clearingAll}
                onClick={async()=>{
                  setClearingAll(true); setConfirmAll(false);
                  try {
                    const d = await sa.delConfirm(`/${client.id}/records`);
                    setLog(prev=>[...prev,`✓ Cleared all ${d.total_removed} records across all environments`]);
                  } catch(e){setError(e.message);}
                  setClearingAll(false);
                }}
                style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#e03131',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                {clearingAll?'Clearing…':'Yes, delete all'}
              </button>
              <button onClick={()=>setConfirmAll(false)} style={{padding:'5px 12px',borderRadius:6,border:'1px solid #d1d5db',background:'transparent',fontSize:11,cursor:'pointer',color:'#374151'}}>Cancel</button>
            </div>
          ) : (
            <button onClick={()=>setConfirmAll(true)} style={{padding:'6px 14px',borderRadius:6,border:'1px solid #e03131',background:'transparent',color:'#e03131',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              🗑 Clear all records
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Client Error Logs Tab ─────────────────────────────────────────────────────
function ClientErrorLogsTab({ clientId }) {
  const [logs, setLogs] = useState([]); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState(''); const [page, setPage] = useState(1);
  const LIMIT = 30;

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: LIMIT, ...(search&&{search}), ...(severity&&{severity}) });
    saFetch(`/api/superadmin/clients/${clientId}/error-logs?${q}`)
      .then(r=>r.json()).then(d=>{ setLogs(d.logs||[]); setTotal(d.total||0); setLoading(false); })
      .catch(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[clientId,page,severity]);
  useEffect(()=>{ setPage(1); },[search,severity]);
  const SEV_COLOR = { error:'#ef4444', warning:'#F59E0B', info:C.accent };

  return (
    <div style={cardSt}>
      <div style={{display:'flex',gap:8,padding:'12px 18px',borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Search errors…"
          style={{flex:1,padding:'7px 11px',borderRadius:7,border:`1px solid ${C.border}`,background:'#1e2433',color:C.text1,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
        <select value={severity} onChange={e=>setSeverity(e.target.value)}
          style={{padding:'7px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:'#1e2433',color:C.text2,fontSize:12,fontFamily:'inherit'}}>
          <option value="">All severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <span style={{fontSize:11,color:C.text3,whiteSpace:'nowrap'}}>{total} total</span>
      </div>
      {loading ? <div style={{padding:40,textAlign:'center',color:C.text3}}>Loading…</div>
      : !logs.length ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No error logs found.</div>
      : logs.map(l=>(
        <div key={l.id} style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${SEV_COLOR[l.severity]||C.accent}20`,color:SEV_COLOR[l.severity]||C.accent,border:`1px solid ${SEV_COLOR[l.severity]||C.accent}40`,flexShrink:0,marginTop:1}}>{l.severity||'error'}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:l.resolved?C.text3:C.text1,fontWeight:600,marginBottom:2,textDecoration:l.resolved?'line-through':undefined}}>{l.message}</div>
              <div style={{fontSize:10,color:C.text3,display:'flex',gap:12,flexWrap:'wrap'}}>
                {l.code&&<span style={{fontFamily:'monospace'}}>{l.code}</span>}
                {l.user_email&&<span>👤 {l.user_email}</span>}
                {l.url&&<span style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🔗 {l.url}</span>}
                <span>{new Date(l.created_at).toLocaleString()}</span>
              </div>
              {l.component&&<div style={{fontSize:10,color:C.text3,marginTop:2,fontFamily:'monospace',opacity:.7}}>{l.component}</div>}
            </div>
            {l.resolved&&<span style={{fontSize:10,color:'#0CAF77',fontWeight:700,flexShrink:0}}>✓ Resolved</span>}
          </div>
        </div>
      ))}
      {total>LIMIT&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px'}}>
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:12,cursor:page>1?'pointer':'default',fontFamily:'inherit'}}>← Prev</button>
          <span style={{fontSize:11,color:C.text3}}>Page {page} of {Math.ceil(total/LIMIT)}</span>
          <button disabled={page>=Math.ceil(total/LIMIT)} onClick={()=>setPage(p=>p+1)} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:12,cursor:page<Math.ceil(total/LIMIT)?'pointer':'default',fontFamily:'inherit'}}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Client Activity Tab ───────────────────────────────────────────────────────
function ClientActivityTab({ clientId }) {
  const [items, setItems] = useState([]); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 40;
  const ACTION_COLORS = { create:'#0CAF77', update:C.accent, delete:'#ef4444', login:'#F59E0B', logout:C.text3, promote:'#7c3aed', export:C.cyan };
  function actionColor(a){ return ACTION_COLORS[a?.toLowerCase()] || C.text3; }
  function timeAgo(ts){ const d=Date.now()-new Date(ts); if(d<60000)return'just now'; if(d<3600000)return`${Math.floor(d/60000)}m ago`; if(d<86400000)return`${Math.floor(d/3600000)}h ago`; return new Date(ts).toLocaleDateString(); }

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: LIMIT, ...(search&&{search}) });
    saFetch(`/api/superadmin/clients/${clientId}/activity?${q}`)
      .then(r=>r.json()).then(d=>{ setItems(d.items||[]); setTotal(d.total||0); setLoading(false); })
      .catch(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[clientId,page]);
  useEffect(()=>{ setPage(1); },[search]);

  return (
    <div style={cardSt}>
      <div style={{display:'flex',gap:8,padding:'12px 18px',borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Search activity…"
          style={{flex:1,padding:'7px 11px',borderRadius:7,border:`1px solid ${C.border}`,background:'#1e2433',color:C.text1,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
        <span style={{fontSize:11,color:C.text3,whiteSpace:'nowrap'}}>{total} events</span>
      </div>
      {loading ? <div style={{padding:40,textAlign:'center',color:C.text3}}>Loading…</div>
      : !items.length ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No activity recorded yet.</div>
      : items.map((l,i)=>{
        const action = l.action||l.type||'event';
        const col = actionColor(action);
        return (
          <div key={l.id||i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 18px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:`${col}20`,border:`1.5px solid ${col}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                <span style={{fontSize:11,fontWeight:700,color:col,textTransform:'uppercase',letterSpacing:'0.04em'}}>{action}</span>
                {l.record_name&&<span style={{fontSize:12,color:C.text1,fontWeight:600}}>{l.record_name}</span>}
                {l.entity_type&&<span style={{fontSize:11,color:C.text3}}>{l.entity_type}</span>}
              </div>
              <div style={{fontSize:10,color:C.text3,display:'flex',gap:10}}>
                {l.user_email&&<span>👤 {l.user_email}</span>}
                {l.environment_name&&<span>🌐 {l.environment_name}</span>}
                <span>{timeAgo(l.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
      {total>LIMIT&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px'}}>
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:12,cursor:page>1?'pointer':'default',fontFamily:'inherit'}}>← Prev</button>
          <span style={{fontSize:11,color:C.text3}}>Page {page} of {Math.ceil(total/LIMIT)}</span>
          <button disabled={page>=Math.ceil(total/LIMIT)} onClick={()=>setPage(p=>p+1)} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:12,cursor:page<Math.ceil(total/LIMIT)?'pointer':'default',fontFamily:'inherit'}}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Create Client User Modal ──────────────────────────────────────────────────
function CreateClientUserModal({ client, onClose, onCreated }) {
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', role_id:'', environment_id:'', password:'' });
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const inp = {padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:'inherit',outline:'none',color:C.text1,background:'#1e2433',width:'100%',boxSizing:'border-box'};
  const label = {fontSize:11,fontWeight:700,color:C.text3,marginBottom:4,display:'block',letterSpacing:'0.04em',textTransform:'uppercase'};

  const environments = client?.environments || [];

  useEffect(()=>{
    // Load roles from the first available environment
    const envId = environments[0]?.id;
    if (!envId) return;
    saFetch(`/api/roles`,{headers:{'Content-Type':'application/json','X-User-Id':localStorage.getItem('sa_uid')||''}})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setRoles(d); }).catch(()=>{});
    setForm(f=>({...f, environment_id: envId}));
  },[]);

  const handleSave = async () => {
    if (!form.first_name||!form.last_name||!form.email||!form.role_id||!form.environment_id) {
      setError('All fields are required'); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await saFetch(`/api/superadmin/clients/${client.id}/users`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      setCreated(data);
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,padding:28,width:440,boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        {!created ? <>
          <div style={{fontSize:16,fontWeight:800,color:C.text1,marginBottom:4}}>Add User</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:20}}>Create a new user for {client.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={label}>First Name</label><input style={inp} value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} placeholder="First name"/></div>
            <div><label style={label}>Last Name</label><input style={inp} value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))} placeholder="Last name"/></div>
          </div>
          <div style={{marginBottom:12}}><label style={label}>Email</label><input style={inp} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="user@example.com"/></div>
          <div style={{marginBottom:12}}><label style={label}>Environment</label>
            <select style={inp} value={form.environment_id} onChange={e=>setForm(f=>({...f,environment_id:e.target.value}))}>
              {environments.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}><label style={label}>Role</label>
            <select style={inp} value={form.role_id} onChange={e=>setForm(f=>({...f,role_id:e.target.value}))}>
              <option value="">Select role…</option>
              {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{marginBottom:20}}><label style={label}>Password (leave blank to auto-generate)</label><input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Auto-generate if empty"/></div>
          {error && <div style={{padding:'8px 12px',borderRadius:8,background:'#450a0a',color:'#fca5a5',fontSize:12,marginBottom:12}}>{error}</div>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={onClose} style={{padding:'8px 18px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{padding:'8px 18px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.6:1}}>
              {saving?'Creating…':'Create User'}
            </button>
          </div>
        </> : <>
          <div style={{textAlign:'center',padding:'8px 0 20px'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'#0CAF7720',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0CAF77" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1,marginBottom:4}}>User Created</div>
            <div style={{fontSize:12,color:C.text3,marginBottom:20}}>Share these credentials with the user</div>
            {[['Email',created.email],['Temp Password',created.temp_password],['Role',roles.find(r=>r.id===created.role_id)?.name||created.role_id]].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderRadius:8,background:'#ffffff08',marginBottom:6}}>
                <span style={{fontSize:12,color:C.text3}}>{k}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.text1,fontFamily:'monospace'}}>{v}</span>
              </div>
            ))}
            <div style={{fontSize:11,color:'#F59E0B',marginTop:12,marginBottom:20}}>⚠ The user will be prompted to change their password on first login</div>
          </div>
          <button onClick={()=>onCreated(created)} style={{width:'100%',padding:'10px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Done</button>
        </>}
      </div>
    </div>
  );
}

// ── Add Environment Modal (env details only — client already exists) ──────────
function AddEnvironmentModal({ client, onClose, onDone }) {
  const [form, setForm] = useState({ name:'', type:'staging', locale:'en', timezone:'Asia/Dubai', template:'' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    saFetch('/api/superadmin/clients/provision/templates').then(r=>r.json()).then(setTemplates).catch(()=>{});
  }, []);
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); };
  const handleSave = async () => {
    if (!form.name.trim()) { setErrors({name:'Environment name required'}); return; }
    setSaving(true);
    try {
      const r = await saFetch(`/api/superadmin/clients/${client.id}/add-environment`, {
        method:'POST', body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) { onDone(d); }
      else setErrors({ name: d.error || 'Failed to create environment' });
    } catch(e) { setErrors({ name: e.message }); }
    setSaving(false);
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:28,width:460,fontFamily:F}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>Add Environment</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>Adding to: <span style={{color:C.accent}}>{client.name}</span></div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:20,lineHeight:1}}>×</button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelSt}>Environment Name *</label>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Staging, UAT, APAC Production"
            style={{...inputSt,borderColor:errors.name?C.red:C.border2}} autoFocus/>
          {errors.name && <div style={{fontSize:11,color:C.red,marginTop:3}}>{errors.name}</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={labelSt}>Type</label>
            <select value={form.type} onChange={e=>set('type',e.target.value)} style={{...inputSt,background:C.surface2}}>
              {['production','staging','uat','development','demo'].map(t=>(
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSt}>Locale</label>
            <select value={form.locale} onChange={e=>set('locale',e.target.value)} style={{...inputSt,background:C.surface2}}>
              {[['en','English'],['ar','Arabic'],['fr','French'],['de','German'],['es','Spanish']].map(([v,l])=>(
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelSt}>Timezone</label>
          <select value={form.timezone} onChange={e=>set('timezone',e.target.value)} style={{...inputSt,background:C.surface2}}>
            {['Asia/Dubai','UTC','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','Asia/Singapore','Asia/Tokyo'].map(tz=>(
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        {templates.length > 0 && (
          <div style={{marginBottom:14}}>
            <label style={labelSt}>Seed Template (optional)</label>
            <select value={form.template} onChange={e=>set('template',e.target.value)} style={{...inputSt,background:C.surface2}}>
              <option value="">— Blank environment —</option>
              {templates.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        )}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <Btn v='secondary' onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Environment'}</Btn>
        </div>
      </div>
    </div>
  );
}

export function ClientDetail({ clientId, onBack, onProvisionEnv }) {
  const [client,setClient]=useState(null); const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true); const [tab,setTab]=useState('overview');
  const [loadingTD,setLoadingTD]=useState(false); const [tdResults,setTdResults]=useState({});
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showCreateUser,setShowCreateUser]=useState(false);
  const [deletingEnv,   setDeletingEnv]   = useState(null);  // envId currently being deleted
  const [confirmEnvDel, setConfirmEnvDel] = useState(null);  // envId awaiting confirmation
  const [envDelTyped,   setEnvDelTyped]   = useState('');    // typed confirmation text

  // ── Portal users (for /support login) ───────────────────────────────────────
  const [portalUsers,   setPortalUsers]   = useState([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showPortalModal,setShowPortalModal] = useState(false);
  const [editPortalUser, setEditPortalUser]  = useState(null);
  const [portalForm,    setPortalForm]    = useState({ name:'', email:'', password:'', role:'member' });
  const [portalError,   setPortalError]   = useState('');
  const [savingPortal,  setSavingPortal]  = useState(false);

  const loadPortalUsers = async () => {
    if (!clientId) return;
    setLoadingPortal(true);
    const res = await saFetch(`/api/portal-auth/users?client_id=${clientId}`).then(r=>r.json()).catch(()=>[]);
    setPortalUsers(Array.isArray(res) ? res : []);
    setLoadingPortal(false);
  };

  const openNewPortalUser  = () => { setEditPortalUser(null); setPortalForm({ name:'', email:'', password:'', role:'member' }); setPortalError(''); setShowPortalModal(true); };
  const openEditPortalUser = u  => { setEditPortalUser(u); setPortalForm({ name:u.name, email:u.email, password:'', role:u.role||'member' }); setPortalError(''); setShowPortalModal(true); };

  const savePortalUser = async () => {
    if (!portalForm.name || !portalForm.email) { setPortalError('Name and email are required.'); return; }
    if (!editPortalUser && !portalForm.password) { setPortalError('Password is required for new users.'); return; }
    setSavingPortal(true); setPortalError('');
    try {
      const body = { ...portalForm, client_id: clientId, client_name: client?.name || '' };
      if (!body.password) delete body.password;
      const url    = editPortalUser ? `/api/portal-auth/users/${editPortalUser.id}` : '/api/portal-auth/users';
      const method = editPortalUser ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r=>r.json());
      if (res.error) { setPortalError(res.error); return; }
      setShowPortalModal(false);
      loadPortalUsers();
    } finally { setSavingPortal(false); }
  };

  const revokePortalUser = async (uid) => {
    if (!(await window.__confirm({ title:'Deactivate this portal user? They will no longer be able to log in to /support.' }))) return;
    await fetch(`/api/portal-auth/users/${uid}`, {credentials:'include',  method:'DELETE' });
    loadPortalUsers();
  };

  const onRefresh = () => {
    saFetch(`/api/superadmin/clients/${clientId}`,{headers:{'Content-Type':'application/json'}})
      .then(r=>r.json()).then(d=>{ if(!d.error) setClient(d); }).catch(()=>{});
    saFetch(`/api/superadmin/clients/${clientId}/stats`,{headers:{'Content-Type':'application/json'}})
      .then(r=>r.json()).then(d=>{ if(!d.error) setStats(d); }).catch(()=>{});
  };

  const handleLoadTestData = async (envId) => {
    if (!(await window.__confirm({ title:'Load standard test data? This adds 15 people, 8 jobs and 3 talent pools.' }))) return;
    setLoadingTD(true);
    try {
      const slug = client?.tenant_slug;
      // Fetch the correct environment ID from the tenant store (not master)
      let tenantEnvId = envId;
      if (slug) {
        const envs = await saFetch(`/api/environments?tenant=${slug}`).then(r=>r.json()).catch(()=>[]);
        if (Array.isArray(envs) && envs.length > 0) tenantEnvId = envs[0].id;
      }
      const r = await saFetch('/api/superadmin/clients/load-test-data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id: tenantEnvId, tenant_slug: slug }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setTdResults(prev => ({ ...prev, [envId]: d }));
    } catch(e) { window.__toast?.alert('Error loading test data: ' + e.message); }
    setLoadingTD(false);
  };

  const handleDeleteEnv = async (envId, envName) => {
    // Open the typed-confirmation modal
    setConfirmEnvDel(envId);
    setEnvDelTyped('');
  };

  const handleDeleteEnvConfirm = async () => {
    if (!confirmEnvDel) return;
    setDeletingEnv(confirmEnvDel);
    setConfirmEnvDel(null);
    try {
      const r = await saFetch(`/api/superadmin/clients/${clientId}/environments/${confirmEnvDel}?confirm=yes`, { method:'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Delete failed');
      // Refresh client data
      const [c, s] = await Promise.all([sa.get(`/${clientId}`), sa.get(`/${clientId}/stats`)]);
      setClient(c); setStats(s);
    } catch(e) { alert('Error deleting environment: ' + e.message); }
    setDeletingEnv(null);
  };

  useEffect(()=>{
    Promise.all([sa.get(`/${clientId}`),sa.get(`/${clientId}/stats`)])
      .then(([c,s])=>{ setClient(c); setStats(s); setLoading(false); loadPortalUsers(); });
  },[clientId]);

  if (loading) return <div style={{color:C.text3,padding:40}}>Loading…</div>;
  if (!client) return <div style={{color:C.red,padding:40}}>Client not found.</div>;

  const TAB = id => ({ padding:'8px 14px',borderRadius:8,border:'none',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',background:tab===id?C.accent:'transparent',color:tab===id?'#fff':C.text2 });

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:18}}>←</button>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20,fontWeight:800,color:C.text1}}>{client.name}</span>
            <PlanBadge plan={client.plan}/><StatusBadge status={client.status}/>
          </div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>{client.industry} · {client.region} · Since {client.created_at?.slice(0,10)}</div>
        </div>
        {client.tenant_slug && (
          <Btn v='secondary' onClick={async()=>{
            try {
              const d = await sa.post(`/${client.id}/impersonate`, {});
              if (d.login_url) window.open(d.login_url, '_blank');
              else alert(d.error || 'Impersonation failed');
            } catch(e) { alert('Error: ' + e.message); }
          }}>Login as client →</Btn>
        )}
        <Btn onClick={()=>setShowAddEnvModal(true)}>+ Add Environment</Btn>
      </div>

      {stats && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[['Environments',stats.environment_count,C.accent],['Records',stats.record_count,C.cyan],
            ['Users',stats.user_count,C.green],['Objects',stats.object_count,C.purple],
            ['Provisions',stats.provision_log?.length||0,C.amber]].map(([l,v,c])=>(
            <div key={l} style={{...cardSt,padding:'14px 18px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:4,marginBottom:16,background:C.surface2,borderRadius:10,padding:4,width:'fit-content'}}>
        {[['overview','Overview'],['environments','Environments'],['users','Users'],['demo','Demo Data'],['errors','Error Logs'],['activity','Activity'],['log','Provision Log'],['diagnose','✦ AI Diagnose']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={TAB(id)}>{label}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={cardSt}>
            <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Details</div>
            {[['Industry',client.industry],['Region',client.region],['Size',client.size],['Plan',client.plan_label||client.plan],['Source',client.source==='self_serve'?'Self-serve signup':'Manually provisioned'],['Primary Email',client.primary_email],['Trial Ends',client.trial_ends_at?new Date(client.trial_ends_at).toLocaleDateString():null],['Stripe Customer',client.stripe_customer_id],['Created',client.created_at?.slice(0,10)]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{display:'flex',padding:'9px 18px',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.text3,width:120,flexShrink:0}}>{k}</span>
                <span style={{color:C.text1}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={cardSt}>
            <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Primary Contact</div>
            {[['Name',client.primary_contact_name],['Email',client.primary_contact_email],['Phone',client.primary_contact_phone]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{display:'flex',padding:'9px 18px',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.text3,width:120,flexShrink:0}}>{k}</span>
                <span style={{color:C.text1}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Login URL card */}
          <div style={{...cardSt,gridColumn:'1/-1'}}>
            <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Client Login</div>
            <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              {(() => {
                const slug = client.tenant_slug;
                const tenantUrl = slug ? `https://${slug}.vercentic.com` : 'https://www.vercentic.com';
                const latest = (client.provision_log||[]).slice(-1)[0];
                const copyTxt = `Vercentic Login\nURL: ${tenantUrl}\nEmail: ${latest?.admin_email||'(see provision log)'}\nPassword: Admin1234! (or as set during provisioning)`;
                return (<>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.text3,marginBottom:4}}>Login URL</div>
                    <a href={tenantUrl} target="_blank" rel="noreferrer"
                      style={{fontFamily:'monospace',fontSize:13,color:C.accent,textDecoration:'none',fontWeight:600}}>
                      {tenantUrl}
                    </a>
                  </div>
                  <button onClick={()=>navigator.clipboard.writeText(copyTxt)}
                    style={{background:C.accentLight,border:`1px solid ${C.accent}30`,borderRadius:8,cursor:'pointer',padding:'8px 14px',fontSize:12,fontWeight:700,color:C.accent,flexShrink:0}}>
                    Copy login info
                  </button>
                  <a href={tenantUrl} target="_blank" rel="noreferrer"
                    style={{background:C.accent,border:'none',borderRadius:8,cursor:'pointer',padding:'8px 14px',fontSize:12,fontWeight:700,color:'#fff',textDecoration:'none',flexShrink:0}}>
                    Open →
                  </a>
                </>);
              })()}
            </div>
            {(client.provision_log||[]).length > 0 && (
              <div style={{padding:'0 18px 14px',fontSize:11,color:C.text3}}>
                Last admin: <span style={{color:C.text1,fontFamily:'monospace'}}>{(client.provision_log||[]).slice(-1)[0]?.admin_email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='environments' && (
        <div style={cardSt}>
          {!(client.environments||[]).length
            ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No environments. <span style={{color:C.accent,cursor:'pointer'}} onClick={()=>setShowAddEnvModal(true)}>Add one →</span></div>
            : (client.environments||[]).map(e=>{
              // Find sandboxes belonging to this environment
              const envSandboxes = (stats.sandboxes||[]).filter(sb=>sb.production_env_id===e.id);
              return (
                <div key={e.id}>
                  {/* Production environment row */}
                  <div style={{display:'flex',alignItems:'center',padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:C.text1,display:'flex',alignItems:'center',gap:8}}>
                        {e.name}
                        {envSandboxes.length>0 && (
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#F59E0B20',color:'#92400E',border:'1px solid #F59E0B40'}}>
                            {envSandboxes.length} sandbox{envSandboxes.length!==1?'es':''}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{e.id} · {e.locale?.toUpperCase()} · {e.timezone}</div>
                      {tdResults[e.id] && (
                        <div style={{fontSize:11,color:'#065f46',marginTop:4}}>
                          ✓ Test data: {tdResults[e.id].people} people · {tdResults[e.id].jobs} jobs · {tdResults[e.id].pools} pools
                        </div>
                      )}
                    </div>
                    <StatusBadge status={e.type||'production'}/>
                    <div style={{marginLeft:12}}><StatusBadge status={e.status||'active'}/></div>
                    <button onClick={()=>handleLoadTestData(e.id)} disabled={loadingTD||!!tdResults[e.id]}
                      title={tdResults[e.id]?'Test data already loaded':'Load standard test data'}
                      style={{marginLeft:12,padding:'5px 10px',borderRadius:6,border:`1.5px dashed ${tdResults[e.id]?C.border:'#6366f1'}`,background:'transparent',color:tdResults[e.id]?C.text3:'#6366f1',fontSize:11,fontWeight:600,cursor:tdResults[e.id]?'default':'pointer',whiteSpace:'nowrap'}}>
                      {tdResults[e.id]?'✓ Loaded':'⚡ Test Data'}
                    </button>
                    <button
                      onClick={()=>handleDeleteEnv(e.id, e.name)}
                      disabled={deletingEnv===e.id}
                      title="Delete this environment and all its data"
                      style={{marginLeft:8,padding:'5px 10px',borderRadius:6,border:`1.5px solid ${C.red}50`,background:`${C.red}12`,color:C.red,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',opacity:deletingEnv===e.id?0.5:1}}>
                      {deletingEnv===e.id?'Deleting…':'🗑 Delete'}
                    </button>
                  </div>

                  {/* Sandbox rows — indented under parent env */}
                  {envSandboxes.map(sb=>(
                    <div key={sb.id} style={{display:'flex',alignItems:'center',padding:'10px 18px 10px 36px',borderBottom:`1px solid ${C.border}`,background:'#F59E0B08'}}>
                      {/* Tree connector */}
                      <div style={{width:16,height:16,borderLeft:`2px solid #F59E0B60`,borderBottom:`2px solid #F59E0B60`,borderRadius:'0 0 0 4px',marginRight:10,flexShrink:0,alignSelf:'flex-start',marginTop:2}}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,color:C.text1,fontSize:13,display:'flex',alignItems:'center',gap:7}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"><path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9"/></svg>
                          {sb.name}
                        </div>
                        <div style={{fontSize:10,color:C.text3,marginTop:1}}>
                          {sb.sandbox_env_id?.slice(0,16)}… · Created {new Date(sb.created_at).toLocaleDateString()}
                          {sb.promoted_at && ` · Promoted ${new Date(sb.promoted_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,
                        background: sb.status==='promoted'?'#0CAF7720':sb.status==='active'?'#F59E0B20':'#6b728020',
                        color: sb.status==='promoted'?'#065f46':sb.status==='active'?'#92400E':'#374151',
                        border:`1px solid ${sb.status==='promoted'?'#0CAF7740':sb.status==='active'?'#F59E0B40':'#6b728040'}`}}>
                        {sb.status}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          }
        </div>
      )}

      {/* ── Delete Environment Confirmation Modal ─────────────────────────────── */}
      {confirmEnvDel && (() => {
        const envBeingDeleted = (client.environments||[]).find(e => e.id === confirmEnvDel);
        const envName = envBeingDeleted?.name || 'this environment';
        const CONFIRM_WORD = envName;
        const isMatch = envDelTyped === CONFIRM_WORD;
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F}} onClick={()=>setConfirmEnvDel(null)}>
            <div style={{background:'#1a2235',border:`1.5px solid ${C.red}`,borderRadius:16,padding:'32px 28px',maxWidth:460,width:'100%',boxShadow:'0 24px 60px rgba(0,0,0,0.5)'}} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${C.red}20`,border:`1px solid ${C.red}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:C.text1}}>Delete Environment</div>
                  <div style={{fontSize:12,color:C.text3,marginTop:2}}>This action cannot be undone</div>
                </div>
              </div>

              {/* Warning details */}
              <div style={{background:`${C.red}10`,border:`1px solid ${C.red}30`,borderRadius:10,padding:'12px 16px',marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:6}}>⚠ You are about to permanently delete:</div>
                <div style={{fontSize:13,color:C.text2,lineHeight:1.7}}>
                  <div>Environment: <strong style={{color:C.text1}}>{envName}</strong></div>
                  <div>All records, people links, workflows, notes, and communications in this environment will be permanently erased.</div>
                </div>
              </div>

              {/* Typed confirmation */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:C.text3,marginBottom:8}}>
                  Type <strong style={{color:C.text1,fontFamily:'monospace'}}>{CONFIRM_WORD}</strong> to confirm:
                </div>
                <input
                  autoFocus
                  value={envDelTyped}
                  onChange={e=>setEnvDelTyped(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&isMatch) handleDeleteEnvConfirm(); if(e.key==='Escape') setConfirmEnvDel(null); }}
                  placeholder={`Type "${CONFIRM_WORD}" to confirm`}
                  style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1.5px solid ${isMatch?C.red:C.border}`,background:'#0a0e1a',color:C.text1,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'border-color .15s'}}
                />
              </div>

              {/* Actions */}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setConfirmEnvDel(null)}
                  style={{flex:1,padding:'10px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F}}>
                  Cancel
                </button>
                <button onClick={handleDeleteEnvConfirm} disabled={!isMatch}
                  style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:isMatch?C.red:'#3a1a1a',color:isMatch?'#fff':C.red,fontSize:13,fontWeight:700,cursor:isMatch?'pointer':'not-allowed',fontFamily:F,opacity:isMatch?1:0.6,transition:'all .15s'}}>
                  Delete Environment
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {tab==='users' && (
        <div style={cardSt}>
          {/* Header with Create User button */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.text1}}>{(client.users||[]).length} user{(client.users||[]).length!==1?'s':''}</span>
            <button onClick={()=>setShowCreateUser(true)}
              style={{padding:'6px 14px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
              + Add User
            </button>
          </div>
          {!(client.users||[]).length
            ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No users yet. Add the first user above.</div>
            : (client.users||[]).map(u=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',padding:'12px 18px',borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:C.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginRight:12}}>
                  {(u.first_name||'?')[0]}{(u.last_name||'')[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,color:C.text1}}>{u.first_name} {u.last_name}</div>
                  <div style={{fontSize:11,color:C.text3}}>{u.email} · {u.role_name}</div>
                </div>
                <StatusBadge status={u.status||'active'}/>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Portal Users tab — people who log into /support ───────────────────── */}
      {tab==='users' && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:13,color:C.text2}}>
              {loadingPortal ? 'Loading…' : `${portalUsers.filter(u=>u.status==='active').length} portal user${portalUsers.filter(u=>u.status==='active').length!==1?'s':''}`}
            </div>
            <button onClick={openNewPortalUser}
              style={{padding:'6px 14px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              + Add User
            </button>
          </div>

          <div style={cardSt}>
            {!portalUsers.length ? (
              <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:13}}>
                No portal users yet. Add the first user above.
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${C.border}`}}>
                    {['Name','Email','Role','Status','Last Login',''].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portalUsers.map(u=>(
                    <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:30,height:30,borderRadius:'50%',background:C.accent+'33',color:C.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                            {(u.name||'?')[0].toUpperCase()}
                          </div>
                          <span style={{fontWeight:600,color:C.text1,fontSize:13}}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 14px',color:C.text2,fontSize:13}}>{u.email}</td>
                      <td style={{padding:'12px 14px'}}>
                        <span style={{padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,
                          background:u.role==='admin'?C.purple+'22':C.accent+'22',
                          color:u.role==='admin'?C.purple:C.accent}}>
                          {u.role||'member'}
                        </span>
                      </td>
                      <td style={{padding:'12px 14px'}}><StatusBadge status={u.status||'active'}/></td>
                      <td style={{padding:'12px 14px',color:C.text3,fontSize:12}}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>openEditPortalUser(u)}
                            style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                          {u.status==='active' && (
                            <button onClick={()=>revokePortalUser(u.id)}
                              style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${C.red}40`,background:'transparent',color:C.red,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Revoke</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:C.accent+'11',border:`1px solid ${C.accent}33`,fontSize:12,color:C.text2}}>
            💡 Portal users log in at <strong style={{color:C.accent}}>{window.location.origin}/support</strong> with their email and password.
          </div>

          {/* Add / Edit Portal User Modal */}
          {showPortalModal && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
              onClick={e=>e.target===e.currentTarget&&setShowPortalModal(false)}>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,width:440,padding:28}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{editPortalUser?'Edit Portal User':'New Portal User'}</div>
                  <button onClick={()=>setShowPortalModal(false)} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:22,lineHeight:1}}>×</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[['Full Name','text','name'],['Email Address','email','email']].map(([label,type,key])=>(
                    <div key={key}>
                      <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>
                      <input type={type} value={portalForm[key]} onChange={e=>setPortalForm(f=>({...f,[key]:e.target.value}))}
                        style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text1,padding:'9px 12px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                    </div>
                  ))}
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      Password {editPortalUser && <span style={{fontWeight:400}}>(leave blank to keep current)</span>}
                    </label>
                    <input type='password' value={portalForm.password} onChange={e=>setPortalForm(f=>({...f,password:e.target.value}))}
                      placeholder={editPortalUser?'Leave blank to keep current':'Set a secure password'}
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text1,padding:'9px 12px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Role</label>
                    <select value={portalForm.role} onChange={e=>setPortalForm(f=>({...f,role:e.target.value}))}
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:8,color:C.text1,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                      <option value='member'>Member — can view and create cases</option>
                      <option value='admin'>Admin — full portal access</option>
                    </select>
                  </div>
                  {portalError && <div style={{padding:'8px 12px',borderRadius:8,background:'#ef444422',color:'#ef4444',fontSize:12,fontWeight:600}}>{portalError}</div>}
                </div>
                <div style={{display:'flex',gap:10,marginTop:20}}>
                  <button onClick={()=>setShowPortalModal(false)}
                    style={{flex:1,padding:'10px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
                  <button onClick={savePortalUser} disabled={savingPortal}
                    style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:13,fontWeight:700,cursor:savingPortal?'not-allowed':'pointer',opacity:savingPortal?.6:1,fontFamily:'inherit'}}>
                    {savingPortal?'Saving…':editPortalUser?'Save Changes':'Create User'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create App User Modal (kept for backward compatibility) */}
      {showCreateUser && (
        <CreateClientUserModal
          client={client}
          onClose={()=>setShowCreateUser(false)}
          onCreated={(newUser)=>{
            setShowCreateUser(false);
            if(onRefresh) onRefresh();
          }}
        />
      )}

      {tab==='demo' && (
        <DemoDataTab client={client} stats={stats} />
      )}

      {tab==='errors' && <ClientErrorLogsTab clientId={clientId}/>}
      {tab==='activity' && <ClientActivityTab clientId={clientId}/>}

      {tab==='log' && (
        <div style={cardSt}>
          {!(stats?.provision_log||[]).length
            ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No provision events yet.</div>
            : [...(stats?.provision_log||[])].reverse().map((l,i)=>(
              <div key={i} style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{color:C.green,fontWeight:700}}>✓ Provisioned</span>
                  <span style={{color:C.text3,fontSize:11}}>{l.provisioned_at?.slice(0,16).replace('T',' ')}</span>
                </div>
                <div style={{color:C.text2,fontSize:12}}>
                  Template: <span style={{color:C.accent}}>{l.template}</span> · {l.objects_seeded} objects · {l.roles_seeded} roles · Admin: {l.admin_email}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab==='diagnose' && (
        <AIDiagnosisPanel
          environmentId={(client?.environments||[])[0]?.id || client?.id}
          clientName={client?.name}
        />
      )}

      {/* Add Environment modal */}
      {showAddEnvModal && client && (
        <AddEnvironmentModal
          client={client}
          onClose={()=>setShowAddEnvModal(false)}
          onDone={()=>{
            setShowAddEnvModal(false);
            Promise.all([sa.get(`/${clientId}`),sa.get(`/${clientId}/stats`)])
              .then(([c,s])=>{ setClient(c); setStats(s); });
          }}
        />
      )}
    </div>
  );
}

const STEPS=[{id:'client',label:'Client'},{id:'env',label:'Environment'},{id:'admin',label:'Admin User'},{id:'template',label:'Template'},{id:'review',label:'Review'}];
const INDUSTRIES=['Technology','Finance','Healthcare','Professional Services','Manufacturing','Retail','Construction','Education','Other'];
const REGIONS=['Middle East','EMEA','North America','APAC','Latin America','Global'];
const PLANS=['trial','starter','growth','enterprise'];
const TIMEZONES=['UTC','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','Asia/Dubai','Asia/Singapore','Asia/Tokyo'];

export function ProvisionWizard({ onDone, onCancel }) {
  const [step,setStep]=useState(0); const [templates,setTemplates]=useState([]);
  const [submitting,setSubmitting]=useState(false); const [result,setResult]=useState(null);
  const [errors,setErrors]=useState({});
  const [loadingTD,setLoadingTD]=useState(false); const [tdResult,setTdResult]=useState(null);
  const [form,setForm]=useState({
    client_name:'',industry:'',region:'Middle East',plan:'starter',size:'',
    contact_name:'',contact_email:'',contact_phone:'',website:'',notes:'',
    env_name:'',env_type:'production',locale:'en',timezone:'Asia/Dubai',
    admin_first:'',admin_last:'',admin_email:'',admin_password:'Admin1234!',
    template:'core_recruitment',
  });

  useEffect(()=>{ saFetch('/api/superadmin/clients/provision/templates').then(r=>r.json()).then(setTemplates).catch(()=>{}); },[]);

  const set=(k,v)=>{ setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); };

  const validate=()=>{
    const e={};
    if(step===0){ if(!form.client_name.trim()) e.client_name='Required'; if(!form.industry) e.industry='Required'; if(!form.contact_email.includes('@')) e.contact_email='Valid email required'; }
    if(step===2){ if(!form.admin_first.trim()) e.admin_first='Required'; if(!form.admin_last.trim()) e.admin_last='Required'; if(!form.admin_email.includes('@')) e.admin_email='Valid email required'; if(form.admin_password.length<8) e.admin_password='Min 8 characters'; }
    setErrors(e); return Object.keys(e).length===0;
  };

  const submit=async()=>{
    setSubmitting(true);
    try {
      const r=await saFetch('/api/superadmin/clients/provision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        client:{name:form.client_name,industry:form.industry,region:form.region,plan:form.plan,size:form.size,contact_name:form.contact_name,contact_email:form.contact_email,contact_phone:form.contact_phone,website:form.website,notes:form.notes},
        environment:{name:form.env_name||`${form.client_name} Production`,type:form.env_type,locale:form.locale,timezone:form.timezone},
        admin_user:{first_name:form.admin_first,last_name:form.admin_last,email:form.admin_email,password:form.admin_password},
        template:form.template,
        snapshot:form.snapshot||undefined,
      })});
      const d=await r.json();
      if(r.ok){ setResult(d); setStep(5); }
      else setErrors({submit:d.error||'Provisioning failed'});
    } catch(e){ setErrors({submit:e.message}); }
    setSubmitting(false);
  };

  const handleLoadTestData = async (envId) => {
    if (!(await window.__confirm({ title:'Load standard test data? This adds 15 people, 8 jobs and 3 talent pools.' }))) return;
    setLoadingTD(true); setTdResult(null);
    try {
      const r = await saFetch('/api/superadmin/clients/load-test-data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id: envId, tenant_slug: null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setTdResult(d);
    } catch(e) { window.__toast?.alert('Error: ' + e.message); }
    setLoadingTD(false);
  };

  const inp=(k,ph,type='text')=>(
    <div style={{marginBottom:14}}>
      <label style={labelSt}>{ph}</label>
      <input type={type} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph}
        style={{...inputSt,borderColor:errors[k]?C.red:C.border2}}/>
      {errors[k]&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{errors[k]}</div>}
    </div>
  );
  const sel=(k,label,opts)=>(
    <div style={{marginBottom:14}}>
      <label style={labelSt}>{label}</label>
      <select value={form[k]} onChange={e=>set(k,e.target.value)} style={{...inputSt,background:C.surface2}}>
        {opts.map(o=><option key={typeof o==='object'?o.value:o} value={typeof o==='object'?o.value:o}>{typeof o==='object'?o.label:o}</option>)}
      </select>
    </div>
  );

  if(step===5&&result) return (
    <div style={{maxWidth:500,margin:'0 auto',textAlign:'center',padding:40}}>
      <div style={{width:60,height:60,borderRadius:18,background:`${C.green}15`,border:`1px solid ${C.green}30`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
      <div style={{fontSize:20,fontWeight:800,color:C.text1,marginBottom:6}}>Client Provisioned!</div>
      <div style={{fontSize:13,color:C.text3,marginBottom:24}}>{result.client?.name} is ready to use.</div>

      {/* Login URL — includes ?tenant= param */}
      {(() => {
        const slug = result.tenant_slug || result.credentials?.tenant_slug;
        const tenantUrl = slug
          ? `https://${slug}.vercentic.com`
          : 'https://www.vercentic.com';
        return (
          <div style={{background:'#EFF6FF',borderRadius:12,border:'1px solid #BFDBFE',padding:14,marginBottom:16,textAlign:'left'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1D4ED8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Login URL</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <a href={tenantUrl} target="_blank" rel="noreferrer"
                style={{flex:1,fontFamily:'monospace',fontSize:12,color:'#1D4ED8',wordBreak:'break-all',textDecoration:'none'}}>
                {tenantUrl}
              </a>
              <button onClick={()=>navigator.clipboard.writeText(tenantUrl)}
                title="Copy URL"
                style={{background:'#DBEAFE',border:'1px solid #93C5FD',borderRadius:6,cursor:'pointer',padding:'4px 10px',fontSize:11,fontWeight:700,color:'#1D4ED8',flexShrink:0}}>
                Copy
              </button>
            </div>
            {slug && <div style={{fontSize:11,color:'#3B82F6',marginTop:6}}>Tenant key: <code style={{background:'#DBEAFE',padding:'1px 5px',borderRadius:4}}>{slug}</code></div>}
          </div>
        );
      })()}

      {/* Credentials */}
      <div style={{background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`,padding:18,textAlign:'left',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Credentials</div>
          <button onClick={()=>{
            const slug = result.tenant_slug || result.credentials?.tenant_slug;
            const tenantUrl = slug ? `https://${slug}.vercentic.com` : 'https://www.vercentic.com';
            const txt = `Vercentic Login\nURL: ${tenantUrl}\nEmail: ${result.credentials?.email}\nPassword: ${result.credentials?.password}`;
            navigator.clipboard.writeText(txt);
          }} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,cursor:'pointer',padding:'3px 8px',fontSize:10,fontWeight:700,color:C.text2}}>
            Copy all
          </button>
        </div>
        {[
          ['Email',    result.credentials?.email],
          ['Password', result.credentials?.password],
          ['Tenant',   result.tenant_slug || result.credentials?.tenant_slug || '(default)'],
          ['Environment', result.environment?.name],
        ].map(([k,v])=>(
          <div key={k} style={{display:'flex',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
            <span style={{color:C.text3,width:100,flexShrink:0}}>{k}</span>
            <span style={{flex:1,color:k==='Password'?C.amber:C.text1,fontFamily:'monospace'}}>{v}</span>
            {(k==='Email'||k==='Password')&&(
              <button onClick={()=>navigator.clipboard.writeText(v)}
                style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:10,padding:'0 4px'}}>⧉</button>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`,padding:16,textAlign:'left',marginBottom:20,display:'flex',gap:24}}>
        {[['Objects',(result.objects||[]).length],['Roles',(result.roles||[]).length]].map(([k,v])=>(
          <div key={k} style={{textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:C.green}}>{v}</div>
            <div style={{fontSize:11,color:C.text3}}>{k} seeded</div>
          </div>
        ))}
      </div>
      {tdResult ? (
        <div style={{padding:'10px 14px',borderRadius:10,background:'#d1fae5',border:'1px solid #6ee7b7',marginBottom:12,fontSize:13,color:'#065f46',textAlign:'left'}}>
          ✓ Test data loaded — {tdResult.people} people, {tdResult.jobs} jobs, {tdResult.pools} talent pools
          {tdResult.errors?.length>0 && <div style={{marginTop:4,color:'#92400e',fontSize:11}}>{tdResult.errors[0]}</div>}
        </div>
      ) : (
        <button onClick={()=>handleLoadTestData(result.environment?.id)} disabled={loadingTD}
          style={{width:'100%',padding:'10px',marginBottom:10,borderRadius:8,border:'1.5px dashed #6366f1',background:'transparent',color:'#6366f1',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {loadingTD ? '⟳ Loading test data…' : '⚡ Load Standard Test Data (15 people · 8 jobs · 3 pools)'}
        </button>
      )}
      <Btn onClick={onDone} style={{width:'100%',justifyContent:'center'}}>View all clients →</Btn>
    </div>
  );

  return (
    <div style={{maxWidth:600,margin:'0 auto'}}>
      <div style={{display:'flex',gap:0,marginBottom:24,background:C.surface2,borderRadius:10,padding:4}}>
        {STEPS.map((s,i)=>(
          <div key={s.id} onClick={()=>i<step&&setStep(i)} style={{flex:1,padding:'8px 4px',borderRadius:8,textAlign:'center',background:i===step?C.accent:i<step?`${C.green}18`:'transparent',cursor:i<step?'pointer':'default'}}>
            <div style={{fontSize:11,fontWeight:700,color:i===step?'#fff':i<step?C.green:C.text3}}>{i<step?'✓':i+1}. {s.label}</div>
          </div>
        ))}
      </div>

      <div style={{...cardSt,padding:'24px 28px',marginBottom:14}}>
        {errors.submit&&<div style={{padding:'10px 14px',borderRadius:8,background:`${C.red}15`,border:`1px solid ${C.red}30`,color:C.red,fontSize:13,marginBottom:16}}>{errors.submit}</div>}

        {step===0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{gridColumn:'1/-1'}}>{inp('client_name','Company Name *')}</div>
          {sel('industry','Industry *',[{value:'',label:'Select…'},...INDUSTRIES.map(o=>({value:o,label:o}))])}
          {sel('region','Region',REGIONS)}
          {sel('plan','Plan',PLANS.map(p=>({value:p,label:p.charAt(0).toUpperCase()+p.slice(1)})))}
          {inp('contact_name','Contact Name')}
          {inp('contact_email','Contact Email *','email')}
          <div style={{gridColumn:'1/-1'}}>{inp('website','Website (optional)')}</div>
        </div>}

        {step===1&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{gridColumn:'1/-1'}}>{inp('env_name',`Environment Name (default: ${form.client_name||'Client'} Production)`)}</div>
          {sel('env_type','Type',['production','staging','uat','sandbox'].map(o=>({value:o,label:o.charAt(0).toUpperCase()+o.slice(1)})))}
          {sel('locale','Locale',['en','ar','fr','de','es','pt'].map(o=>({value:o,label:o.toUpperCase()})))}
          <div style={{gridColumn:'1/-1'}}>{sel('timezone','Timezone',TIMEZONES)}</div>
        </div>}

        {step===2&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {inp('admin_first','First Name *')}
          {inp('admin_last','Last Name *')}
          <div style={{gridColumn:'1/-1'}}>{inp('admin_email','Admin Email *','email')}</div>
          <div style={{gridColumn:'1/-1'}}>
            {inp('admin_password','Password *')}
            <div style={{fontSize:11,color:C.amber,marginTop:-8}}>⚠ Share securely — shown once only.</div>
          </div>
        </div>}

        {step===3&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
          {(templates.length?templates:[
            {key:'core_recruitment',label:'Core Recruitment',description:'People, Jobs and Talent Pools',object_count:3},
            {key:'agency',label:'Recruitment Agency',description:'Adds Client Companies and Placements',object_count:5},
            {key:'hr_platform',label:'HR Platform',description:'Adds Employees and Leave Requests',object_count:5},
          ]).map(t=>(
            <div key={t.key} onClick={()=>{set('template',t.key);set('snapshot',t.snapshot||null);}}
              style={{padding:'14px 18px',borderRadius:10,border:`2px solid ${form.template===t.key?(t.is_local?'#8B7EC8':C.accent):C.border2}`,background:form.template===t.key?`${t.is_local?'#8B7EC8':C.accent}10`:C.surface2,cursor:'pointer',position:'relative'}}>
              {t.is_local&&<div style={{position:'absolute',top:10,right:10,padding:'2px 8px',borderRadius:99,background:'#8B7EC8',color:'#fff',fontSize:10,fontWeight:700,letterSpacing:'.05em'}}>CURRENT CONFIG</div>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontWeight:700,color:form.template===t.key?(t.is_local?'#8B7EC8':C.accent):C.text1,paddingRight:t.is_local?80:0}}>{t.label}</div>
                <span style={{fontSize:11,color:C.text3,paddingRight:t.is_local?80:0}}>{t.object_count} objects</span>
              </div>
              <div style={{fontSize:12,color:C.text3,marginTop:4}}>{t.description}</div>
            </div>
          ))}
        </div>}

        {step===4&&[['Company',form.client_name],['Industry',form.industry],['Region',form.region],['Plan',form.plan],
          ['Environment',form.env_name||`${form.client_name} Production`],['Env Type',form.env_type],
          ['Locale',form.locale?.toUpperCase()],['Admin Email',form.admin_email],
          ['Admin Name',`${form.admin_first} ${form.admin_last}`],['Template',form.template]].map(([k,v])=>(
          <div key={k} style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
            <span style={{color:C.text3,width:140,flexShrink:0}}>{k}</span>
            <span style={{color:C.text1,fontWeight:600}}>{v||'—'}</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'space-between'}}>
        <Btn v='ghost' onClick={step===0?onCancel:()=>setStep(s=>s-1)}>{step===0?'Cancel':'← Back'}</Btn>
        {step<STEPS.length-1
          ? <Btn onClick={()=>{ if(validate()) setStep(s=>s+1); }}>Next →</Btn>
          : <Btn onClick={submit} disabled={submitting} style={{background:C.green}}>{submitting?'Provisioning…':'⚡ Provision Client'}</Btn>}
      </div>
    </div>
  );
}

export function Performance() {
  const [stats,setStats]   = useState(null);
  const [rt,setRt]         = useState(null);
  const [ai,setAi]         = useState(null);
  const [loading,setLoading] = useState(true);
  const [tab,setTab]       = useState('overview'); // overview | latency | ai
  const [r,setR]           = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      saFetch('/api/superadmin/clients/stats/platform').then(x=>x.json()).catch(()=>null),
      saFetch('/api/superadmin/perf/response-times').then(x=>x.json()).catch(()=>null),
      saFetch('/api/superadmin/perf/ai-usage').then(x=>x.json()).catch(()=>null),
    ]).then(([s,r,a]) => { setStats(s); setRt(r); setAi(a); setLoading(false); });
  }, [r]);

  if (loading) return <div style={{color:C.text3,padding:40,textAlign:'center'}}>Loading…</div>;

  const BarRow = ({label,value,max,color,suffix=''}) => (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
        <span style={{color:C.text2}}>{label}</span>
        <span style={{color:C.text1,fontWeight:600}}>{value}{suffix}</span>
      </div>
      <div style={{height:6,borderRadius:99,background:C.surface2,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:99,background:color||C.accent,width:`${Math.min(100,max?value/max*100:0)}%`,transition:'width .4s'}}/>
      </div>
    </div>
  );

  const StatCard = ({label,value,color,sub}) => (
    <div style={{...cardSt,padding:'16px 18px'}}>
      <div style={{fontSize:22,fontWeight:800,color:color||C.accent}}>{value}</div>
      <div style={{fontSize:11,color:C.text2,marginTop:4,fontWeight:700}}>{label}</div>
      {sub && <div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
    </div>
  );

  const SectionHeader = ({title}) => (
    <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{title}</div>
  );

  // Mini sparkline bar chart
  const MiniBar = ({data,valueKey,color,height=32}) => {
    const max = Math.max(...data.map(d=>d[valueKey]),1);
    return (
      <div style={{display:'flex',alignItems:'flex-end',gap:2,height}}>
        {data.map((d,i) => (
          <div key={i} title={`${d[valueKey]}`} style={{flex:1,background:color||C.accent,borderRadius:'2px 2px 0 0',
            height:`${Math.max(4,Math.round((d[valueKey]/max)*height))}px`,opacity:0.7+0.3*(d[valueKey]/max)}}/>
        ))}
      </div>
    );
  };

  const tabs = [{id:'overview',label:'Overview'},{id:'latency',label:'Response Times'},{id:'ai',label:'AI Usage'}];

  const fmtCost = v => v < 0.01 ? '<$0.01' : `$${v.toFixed(2)}`;
  const fmtMs   = v => v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${v}ms`;

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',gap:4}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
              background:tab===t.id?C.accent:'transparent',color:tab===t.id?'#fff':C.text2,transition:'all .15s'}}>
              {t.label}
            </button>
          ))}
        </div>
        <Btn sz='sm' v='secondary' onClick={()=>setR(x=>x+1)}>↻ Refresh</Btn>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab==='overview' && stats && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
            <StatCard label='Clients'      value={stats.totals?.clients}      color={C.accent}/>
            <StatCard label='Environments' value={stats.totals?.environments}  color={C.cyan}/>
            <StatCard label='Records'      value={stats.totals?.records}       color={C.green}/>
            <StatCard label='Users'        value={stats.totals?.users}         color={C.purple}/>
            <StatCard label='Data Store'   value={`${stats.store_size_kb}KB`}  color={C.amber}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
            <div style={cardSt}>
              <SectionHeader title='By Status'/>
              <div style={{padding:'16px 18px'}}>
                {Object.entries(stats.status_breakdown||{}).map(([s,c])=>(
                  <BarRow key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} value={c} max={stats.totals?.clients||1}
                    color={s==='active'?C.green:s==='trial'?C.amber:s==='suspended'?C.red:C.text3}/>
                ))}
              </div>
            </div>
            <div style={cardSt}>
              <SectionHeader title='By Plan'/>
              <div style={{padding:'16px 18px'}}>
                {Object.entries(stats.plan_breakdown||{}).map(([p,c])=>(
                  <BarRow key={p} label={p.charAt(0).toUpperCase()+p.slice(1)} value={c} max={stats.totals?.clients||1}
                    color={p==='enterprise'?C.purple:p==='growth'?C.accent:C.cyan}/>
                ))}
              </div>
            </div>
            <div style={cardSt}>
              <SectionHeader title='Top Environments'/>
              <div style={{padding:'16px 18px'}}>
                {!(stats.top_environments||[]).length
                  ? <div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No data yet</div>
                  : stats.top_environments.map(e=><BarRow key={e.id} label={e.name} value={e.record_count}
                      max={Math.max(...stats.top_environments.map(x=>x.record_count),1)} color={C.green}/>)
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESPONSE TIMES TAB ── */}
      {tab==='latency' && (
        <div>
          {!rt?.summary ? (
            <div style={{...cardSt,padding:40,textAlign:'center',color:C.text3}}>
              No request data yet — metrics accumulate as the server handles traffic.
            </div>
          ) : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[
                  ['Avg Response',  fmtMs(rt.summary.avg_ms), C.cyan],
                  ['p95 Response',  fmtMs(rt.summary.p95_ms), C.amber],
                  ['p99 Response',  fmtMs(rt.summary.p99_ms), rt.summary.p99_ms>2000?C.red:C.purple],
                  ['Error Rate',    `${rt.summary.error_rate}%`, rt.summary.error_rate>5?C.red:C.green],
                ].map(([l,v,c])=>(
                  <StatCard key={l} label={l} value={v} color={c} sub={l==='Error Rate'?`${rt.summary.total_requests} req / 24h`:null}/>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={cardSt}>
                  <SectionHeader title='Requests per hour (last 12h)'/>
                  <div style={{padding:'16px 18px'}}>
                    <MiniBar data={rt.by_hour} valueKey='count' color={C.accent} height={48}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:C.text3}}>
                      <span>{rt.by_hour[0]?.hour}</span><span>{rt.by_hour[rt.by_hour.length-1]?.hour}</span>
                    </div>
                  </div>
                </div>
                <div style={cardSt}>
                  <SectionHeader title='Avg latency per hour (ms)'/>
                  <div style={{padding:'16px 18px'}}>
                    <MiniBar data={rt.by_hour} valueKey='avg_ms' color={C.cyan} height={48}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:C.text3}}>
                      <span>{rt.by_hour[0]?.hour}</span><span>{rt.by_hour[rt.by_hour.length-1]?.hour}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{...cardSt,marginTop:16}}>
                <SectionHeader title='Slowest endpoints (24h avg)'/>
                <div style={{padding:'16px 18px'}}>
                  {rt.slowest.map((e,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:12,alignItems:'center',
                      padding:'8px 0',borderBottom:i<rt.slowest.length-1?`1px solid ${C.border}`:'none',fontSize:12}}>
                      <span style={{color:C.text2,fontFamily:'monospace',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.path}</span>
                      <span style={{color:C.text3}}>{e.calls} calls</span>
                      <span style={{color:C.amber,fontWeight:700}}>p95 {fmtMs(e.p95_ms)}</span>
                      <span style={{color:e.avg_ms>1000?C.red:e.avg_ms>500?C.amber:C.green,fontWeight:700}}>{fmtMs(e.avg_ms)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI USAGE TAB ── */}
      {tab==='ai' && ai && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[
              ['Calls this month',  ai.this_month?.calls,                            C.purple],
              ['Tokens this month', (ai.this_month?.tokens_in+ai.this_month?.tokens_out||0).toLocaleString(), C.cyan],
              ['Cost this month',   fmtCost(ai.this_month?.cost||0),                 C.amber],
              ['Calls last 7d',     ai.last_7d?.calls,                               C.green],
            ].map(([l,v,c])=><StatCard key={l} label={l} value={v} color={c}/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
            <div style={cardSt}>
              <SectionHeader title='Daily AI calls (last 30 days)'/>
              <div style={{padding:'16px 18px'}}>
                <MiniBar data={ai.daily} valueKey='calls' color={C.purple} height={56}/>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:C.text3}}>
                  <span>{ai.daily[0]?.date?.slice(5)}</span><span>{ai.daily[ai.daily.length-1]?.date?.slice(5)}</span>
                </div>
              </div>
            </div>
            <div style={cardSt}>
              <SectionHeader title='Usage by feature (30d)'/>
              <div style={{padding:'16px 18px'}}>
                {!ai.by_feature?.length
                  ? <div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No AI usage yet</div>
                  : ai.by_feature.slice(0,6).map(f=>(
                    <BarRow key={f.feature} label={f.label} value={f.calls}
                      max={ai.by_feature[0].calls} color={C.purple}/>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientManager() {
  const [view,setView]=useState('list');
  const [clientId,setClientId]=useState(null);
  return (
    <div>
      {view==='list'      && <ClientList onProvision={()=>setView('provision')} onSelectClient={c=>{ setClientId(c.id); setView('detail'); }}/>}
      {view==='detail'    && <ClientDetail clientId={clientId} onBack={()=>setView('list')} onProvisionEnv={()=>setView('provision')}/>}
      {view==='provision' && <ProvisionWizard onDone={()=>setView('list')} onCancel={()=>setView('list')}/>}
      {view==='perf'      && <Performance/>}
    </div>
  );
}
