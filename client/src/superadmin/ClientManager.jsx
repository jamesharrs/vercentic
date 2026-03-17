import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#0a0e1a", surface:"#111827", surface2:"#1a2235", border:"#1e2d45", border2:"#2d3f5e",
  text1:"#f0f4ff", text2:"#8899bb", text3:"#4a5878",
  accent:"#3b82f6", green:"#10b981", amber:"#f59e0b", red:"#ef4444", purple:"#8b5cf6", cyan:"#06b6d4",
};

const sa = {
  get:   p     => fetch(`/api/superadmin/clients${p}`).then(r=>r.json()),
  post:  (p,b) => fetch(`/api/superadmin/clients${p}`,{method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b) => fetch(`/api/superadmin/clients${p}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  del:   p     => fetch(`/api/superadmin/clients${p}`,{method:'DELETE'}).then(r=>r.json()),
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

  const load = useCallback(async()=>{ setLoading(true); const d=await sa.get('/'); setClients(Array.isArray(d)?d:[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);

  const filtered = clients.filter(c=>{
    const ms=!search||c.name.toLowerCase().includes(search.toLowerCase())||c.primary_contact_email?.toLowerCase().includes(search.toLowerCase());
    return ms && (filter==='all'||c.status===filter);
  });

  return (
    <div>
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
                {['Client','Plan','Status','Envs','Records','Contact','Actions'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontWeight:700,color:C.text1,cursor:'pointer'}} onClick={()=>onSelectClient(c)}>{c.name}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>{c.industry||'—'} · {c.region||'—'}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}><PlanBadge plan={c.plan}/></td>
                  <td style={{padding:'12px 14px'}}><StatusBadge status={c.status}/></td>
                  <td style={{padding:'12px 14px',color:C.text2,fontSize:13}}>{c.env_count||0}</td>
                  <td style={{padding:'12px 14px',color:C.text2,fontSize:13}}>{c.record_count||0}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:12,color:C.text2}}>{c.primary_contact_name||'—'}</div>
                    <div style={{fontSize:11,color:C.text3}}>{c.primary_contact_email||''}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <Btn sz='sm' v='secondary' onClick={()=>onSelectClient(c)}>View</Btn>
                      {c.status==='active'
                        ? <Btn sz='sm' v='danger' onClick={async()=>{ await sa.patch(`/${c.id}/status`,{status:'suspended'}); load(); }}>Suspend</Btn>
                        : <Btn sz='sm' v='success' onClick={async()=>{ await sa.patch(`/${c.id}/status`,{status:'active'}); load(); }}>Activate</Btn>}
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

export function ClientDetail({ clientId, onBack, onProvisionEnv }) {
  const [client,setClient]=useState(null); const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true); const [tab,setTab]=useState('overview');
  const [loadingTD,setLoadingTD]=useState(false); const [tdResults,setTdResults]=useState({});

  const handleLoadTestData = async (envId) => {
    if (!confirm('Load standard test data? This adds 15 people, 8 jobs and 3 talent pools.')) return;
    setLoadingTD(true);
    try {
      const r = await fetch('/api/superadmin/clients/load-test-data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id: envId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setTdResults(prev => ({ ...prev, [envId]: d }));
    } catch(e) { alert('Error loading test data: ' + e.message); }
    setLoadingTD(false);
  };

  useEffect(()=>{
    Promise.all([sa.get(`/${clientId}`),sa.get(`/${clientId}/stats`)])
      .then(([c,s])=>{ setClient(c); setStats(s); setLoading(false); });
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
        <Btn onClick={onProvisionEnv}>+ Add Environment</Btn>
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
        {[['overview','Overview'],['environments','Environments'],['users','Users'],['log','Provision Log']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={TAB(id)}>{label}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={cardSt}>
            <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Details</div>
            {[['Industry',client.industry],['Region',client.region],['Size',client.size],['Plan',client.plan],['Website',client.website],['Created',client.created_at?.slice(0,10)]].filter(([,v])=>v).map(([k,v])=>(
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
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.text3,marginBottom:4}}>Production URL</div>
                <a href={window.location.origin} target="_blank" rel="noreferrer"
                  style={{fontFamily:'monospace',fontSize:13,color:C.accent,textDecoration:'none',fontWeight:600}}>
                  {window.location.origin}
                </a>
              </div>
              <button onClick={()=>{
                const latest = (client.provision_log||[]).slice(-1)[0];
                const txt = `TalentOS Login\nURL: ${window.location.origin}\nEmail: ${latest?.admin_email||'(see provision log)'}\nPassword: Admin1234! (or as set during provisioning)`;
                navigator.clipboard.writeText(txt);
              }} style={{background:C.accentLight,border:`1px solid ${C.accent}30`,borderRadius:8,cursor:'pointer',padding:'8px 14px',fontSize:12,fontWeight:700,color:C.accent,flexShrink:0}}>
                Copy login info
              </button>
              <a href={window.location.origin} target="_blank" rel="noreferrer"
                style={{background:C.accent,border:'none',borderRadius:8,cursor:'pointer',padding:'8px 14px',fontSize:12,fontWeight:700,color:'#fff',textDecoration:'none',flexShrink:0}}>
                Open →
              </a>
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
            ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No environments. <span style={{color:C.accent,cursor:'pointer'}} onClick={onProvisionEnv}>Add one →</span></div>
            : (client.environments||[]).map(e=>(
              <div key={e.id} style={{display:'flex',alignItems:'center',padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:C.text1}}>{e.name}</div>
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
              </div>
            ))
          }
        </div>
      )}

      {tab==='users' && (
        <div style={cardSt}>
          {!(client.users||[]).length
            ? <div style={{padding:40,textAlign:'center',color:C.text3}}>No users yet.</div>
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

  useEffect(()=>{ fetch('/api/superadmin/clients/provision/templates').then(r=>r.json()).then(setTemplates).catch(()=>{}); },[]);

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
      const r=await fetch('/api/superadmin/clients/provision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        client:{name:form.client_name,industry:form.industry,region:form.region,plan:form.plan,size:form.size,contact_name:form.contact_name,contact_email:form.contact_email,contact_phone:form.contact_phone,website:form.website,notes:form.notes},
        environment:{name:form.env_name||`${form.client_name} Production`,type:form.env_type,locale:form.locale,timezone:form.timezone},
        admin_user:{first_name:form.admin_first,last_name:form.admin_last,email:form.admin_email,password:form.admin_password},
        template:form.template,
      })});
      const d=await r.json();
      if(r.ok){ setResult(d); setStep(5); }
      else setErrors({submit:d.error||'Provisioning failed'});
    } catch(e){ setErrors({submit:e.message}); }
    setSubmitting(false);
  };

  const handleLoadTestData = async (envId) => {
    if (!confirm('Load standard test data? This adds 15 people, 8 jobs and 3 talent pools.')) return;
    setLoadingTD(true); setTdResult(null);
    try {
      const r = await fetch('/api/superadmin/clients/load-test-data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id: envId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setTdResult(d);
    } catch(e) { alert('Error: ' + e.message); }
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

      {/* Login URL */}
      <div style={{background:'#EFF6FF',borderRadius:12,border:'1px solid #BFDBFE',padding:14,marginBottom:16,textAlign:'left'}}>
        <div style={{fontSize:10,fontWeight:700,color:'#1D4ED8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Login URL</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <a href={window.location.origin} target="_blank" rel="noreferrer"
            style={{flex:1,fontFamily:'monospace',fontSize:12,color:'#1D4ED8',wordBreak:'break-all',textDecoration:'none'}}>
            {window.location.origin}
          </a>
          <button onClick={()=>{navigator.clipboard.writeText(window.location.origin);}}
            title="Copy URL"
            style={{background:'#DBEAFE',border:'1px solid #93C5FD',borderRadius:6,cursor:'pointer',padding:'4px 10px',fontSize:11,fontWeight:700,color:'#1D4ED8',flexShrink:0}}>
            Copy
          </button>
        </div>
      </div>

      {/* Credentials */}
      <div style={{background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`,padding:18,textAlign:'left',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Credentials</div>
          <button onClick={()=>{
            const txt = `TalentOS Login\nURL: ${window.location.origin}\nEmail: ${result.credentials?.email}\nPassword: ${result.credentials?.password}`;
            navigator.clipboard.writeText(txt);
          }} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,cursor:'pointer',padding:'3px 8px',fontSize:10,fontWeight:700,color:C.text2}}>
            Copy all
          </button>
        </div>
        {[['Email',result.credentials?.email],['Password',result.credentials?.password],['Environment',result.environment?.name],['Env ID',result.environment?.id?.slice(0,8)+'…']].map(([k,v])=>(
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
            <div key={t.key} onClick={()=>set('template',t.key)}
              style={{padding:'14px 18px',borderRadius:10,border:`2px solid ${form.template===t.key?C.accent:C.border2}`,background:form.template===t.key?`${C.accent}10`:C.surface2,cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontWeight:700,color:form.template===t.key?C.accent:C.text1}}>{t.label}</div>
                <span style={{fontSize:11,color:C.text3}}>{t.object_count} objects</span>
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
  const [stats,setStats]=useState(null); const [loading,setLoading]=useState(true); const [r,setR]=useState(0);
  useEffect(()=>{ setLoading(true); fetch('/api/superadmin/clients/stats/platform').then(x=>x.json()).then(d=>{ setStats(d); setLoading(false); }); },[r]);

  if(loading) return <div style={{color:C.text3,padding:40,textAlign:'center'}}>Loading…</div>;
  if(!stats)  return <div style={{color:C.red,padding:40}}>Failed to load stats.</div>;

  const BarRow=({label,value,max,color})=>(
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
        <span style={{color:C.text2}}>{label}</span><span style={{color:C.text1,fontWeight:600}}>{value}</span>
      </div>
      <div style={{height:6,borderRadius:99,background:C.surface2,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:99,background:color||C.accent,width:`${Math.min(100,max?value/max*100:0)}%`,transition:'width .4s'}}/>
      </div>
    </div>
  );
  const topMax=Math.max(...(stats.top_environments||[]).map(e=>e.record_count),1);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:11,color:C.text3}}>As of {stats.generated_at?.slice(0,16).replace('T',' ')} UTC</div>
        <Btn sz='sm' v='secondary' onClick={()=>setR(x=>x+1)}>↻ Refresh</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
        {[['Clients',stats.totals?.clients,C.accent],['Environments',stats.totals?.environments,C.cyan],
          ['Records',stats.totals?.records,C.green],['Users',stats.totals?.users,C.purple],
          ['Data Store',`${stats.store_size_kb}KB`,C.amber]].map(([l,v,c])=>(
          <div key={l} style={{...cardSt,padding:'16px 18px'}}>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:4,fontWeight:700}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <div style={cardSt}>
          <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>By Status</div>
          <div style={{padding:'16px 18px'}}>
            {Object.entries(stats.status_breakdown||{}).map(([s,c])=>(
              <BarRow key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} value={c} max={stats.totals?.clients||1}
                color={s==='active'?C.green:s==='trial'?C.amber:s==='suspended'?C.red:C.text3}/>
            ))}
          </div>
        </div>
        <div style={cardSt}>
          <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>By Plan</div>
          <div style={{padding:'16px 18px'}}>
            {Object.entries(stats.plan_breakdown||{}).map(([p,c])=>(
              <BarRow key={p} label={p.charAt(0).toUpperCase()+p.slice(1)} value={c} max={stats.totals?.clients||1}
                color={p==='enterprise'?C.purple:p==='growth'?C.accent:C.cyan}/>
            ))}
          </div>
        </div>
        <div style={cardSt}>
          <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Top Environments</div>
          <div style={{padding:'16px 18px'}}>
            {!(stats.top_environments||[]).length
              ? <div style={{color:C.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No data yet</div>
              : (stats.top_environments||[]).map(e=><BarRow key={e.id} label={e.name} value={e.record_count} max={topMax} color={C.green}/>)
            }
          </div>
        </div>
      </div>
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
