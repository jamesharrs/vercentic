import { tFetch } from "./apiClient.js";
import { IntegrationMonitor } from "./IntegrationMonitor.jsx";
// client/src/Integrations.jsx
import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "var(--t-bg,#EEF2FF)", card: "var(--t-card,#ffffff)",
  accent: "var(--t-accent,#4361EE)", accentLight: "var(--t-accent-light,#EEF2FF)",
  text1: "var(--t-text1,#111827)", text2: "var(--t-text2,#374151)",
  text3: "var(--t-text3,#9CA3AF)", border: "var(--t-border,#E5E7EB)",
};
const F = "'DM Sans',-apple-system,sans-serif";

const api = {
  get:    (u)    => fetch(u).then(r=>r.json()),
  post:   (u,b)  => fetch(u,{method:'POST',  headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (u,b)  => fetch(u,{method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: (u)    => fetch(u,{method:'DELETE'}).then(r=>r.json()),
};

function Ic({n,s=16,c="currentColor"}){
  const paths={
    check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
    settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    search:"M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    eye:"M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
    eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    warning:"M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    toggle:"M15 8a7 7 0 010 8M2 12h13",
    grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01",
  };
  return(
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[n]||paths.info}/>
    </svg>
  );
}

function StatusBadge({status}){
  const m={active:{label:'Connected',bg:'#D1FAE5',color:'#065F46'},error:{label:'Error',bg:'#FEE2E2',color:'#991B1B'},
    pending_test:{label:'Not tested',bg:'#FEF3C7',color:'#92400E'},disabled:{label:'Disabled',bg:'#F3F4F6',color:'#6B7280'}};
  const s=m[status]||m.disabled;
  return <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>;
}

function ProviderIcon({item,size=40}){
  return(
    <div style={{width:size,height:size,borderRadius:size*0.25,background:item.color+'18',
      border:`1.5px solid ${item.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <span style={{fontSize:Math.max(9,size*0.27),fontWeight:800,color:item.color,letterSpacing:'-0.5px'}}>{item.icon}</span>
    </div>
  );
}

function SetupModal({provider,existing,environmentId,onClose,onSaved}){
  const [form,setForm]=useState(()=>{
    const init={};
    (provider.fields||[]).forEach(f=>{ init[f.key]=existing?.config?.[f.key]||(f.type==='boolean'?false:''); });
    return init;
  });
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(existing?.test_result||null);
  const [showSecrets,setShowSecrets]=useState({});
  const [error,setError]=useState('');
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    setSaving(true); setError('');
    try{
      const result=await api.post('/integrations',{environment_id:environmentId,provider_slug:provider.slug,config:form,enabled:true});
      if(result.error){setError(result.error);setSaving(false);return;}
      onSaved(result);
    }catch(e){setError(e.message);setSaving(false);}
  };

  const handleTest=async()=>{
    if(!existing?.id){setError('Save first before testing');return;}
    setTesting(true);setTestResult(null);
    try{
      const r=await tFetch(`/integrations/${existing.id}/test`,{method:'POST'}).then(x=>x.json());
      setTestResult(r); setTesting(false);
    }catch(e){setTestResult({ok:false,message:e.message});setTesting(false);}
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',
      justifyContent:'center',padding:20}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:20,width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'hidden',
        display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',fontFamily:F}} onMouseDown={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:14}}>
          <ProviderIcon item={provider} size={44}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{provider.name}</div>
            <div style={{fontSize:12,color:C.text3}}>{provider.category_label}</div>
          </div>
          {existing?.status&&<StatusBadge status={existing.status}/>}
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{padding:'10px 24px',background:C.bg,borderBottom:`1px solid ${C.border}`,fontSize:13,color:C.text2,lineHeight:1.5}}>
          {provider.description}
          {provider.docs_url&&<a href={provider.docs_url} target="_blank" rel="noreferrer"
            style={{marginLeft:8,color:C.accent,fontSize:12,fontWeight:600,textDecoration:'none'}}>View docs →</a>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          {(provider.fields||[]).map(field=>(
            <div key={field.key}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>
                {field.label}{field.required&&<span style={{color:'#EF4444',marginLeft:4}}>*</span>}
              </label>
              {field.hint&&<div style={{fontSize:11,color:C.text3,marginBottom:5,lineHeight:1.4}}>{field.hint}</div>}
              {field.type==='boolean'?(
                <button onClick={()=>set(field.key,!form[field.key])} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'7px 12px',borderRadius:8,border:`1.5px solid ${form[field.key]?C.accent:C.border}`,
                  background:form[field.key]?C.accentLight:'transparent',cursor:'pointer',fontSize:13,fontFamily:F,
                  color:form[field.key]?C.accent:C.text2,fontWeight:500}}>
                  <div style={{width:32,height:18,borderRadius:9,background:form[field.key]?C.accent:'#D1D5DB',position:'relative',transition:'background .15s'}}>
                    <div style={{position:'absolute',top:2,left:form[field.key]?14:2,width:14,height:14,borderRadius:'50%',
                      background:'white',transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                  </div>{field.label}
                </button>
              ):field.type==='select'?(
                <select value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)}
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
                    fontSize:13,color:C.text1,fontFamily:F,background:C.card,outline:'none'}}>
                  <option value="">Select…</option>
                  {(field.options||[]).map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                </select>
              ):field.type==='textarea'?(
                <textarea value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)}
                  placeholder={field.placeholder||''} rows={3}
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
                    fontSize:12,color:C.text1,fontFamily:'ui-monospace,monospace',resize:'vertical',
                    outline:'none',boxSizing:'border-box'}}/>
              ):(
                <div style={{position:'relative'}}>
                  <input type={field.type==='password'&&!showSecrets[field.key]?'password':'text'}
                    value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)}
                    placeholder={field.placeholder||(field.secret?'••••••••':'')}
                    style={{width:'100%',padding:'9px 40px 9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
                      fontSize:13,color:C.text1,fontFamily:field.type==='password'?'ui-monospace,monospace':F,
                      outline:'none',boxSizing:'border-box'}}/>
                  {field.type==='password'&&(
                    <button onClick={()=>setShowSecrets(p=>({...p,[field.key]:!p[field.key]}))}
                      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                        background:'none',border:'none',cursor:'pointer',padding:0}}>
                      <Ic n={showSecrets[field.key]?'eyeOff':'eye'} s={15} c={C.text3}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {testResult&&(
          <div style={{margin:'0 24px 12px',padding:'10px 14px',borderRadius:10,
            background:testResult.ok?'#D1FAE5':'#FEE2E2',display:'flex',alignItems:'center',gap:8,fontSize:13}}>
            <Ic n={testResult.ok?'check':'warning'} s={16} c={testResult.ok?'#065F46':'#991B1B'}/>
            <span style={{color:testResult.ok?'#065F46':'#991B1B',fontWeight:600}}>{testResult.message}</span>
          </div>
        )}
        {error&&<div style={{margin:'0 24px 12px',padding:'10px 14px',borderRadius:10,background:'#FEE2E2',fontSize:13,color:'#991B1B',fontWeight:600}}>{error}</div>}
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8}}>
          {existing?.id&&(
            <button onClick={handleTest} disabled={testing}
              style={{padding:'9px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',
                fontSize:13,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6}}>
              {testing?<><Ic n="loader" s={14} c={C.text3}/>Testing…</>:<><Ic n="zap" s={14} c={C.text3}/>Test</>}
            </button>
          )}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,
            background:'transparent',fontSize:13,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:F}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:'9px 20px',borderRadius:10,border:'none',background:C.accent,color:'white',
              fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6}}>
            {saving?<><Ic n="loader" s={14} c="white"/>Saving…</>:<><Ic n="check" s={14} c="white"/>Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({item,connection,onConfigure,onToggle,onDelete}){
  const [confirming,setConfirming]=useState(false);
  const isConnected=connection?.status==='active';
  const hasError=connection?.status==='error';
  return(
    <div style={{background:C.card,borderRadius:16,border:`1.5px solid ${isConnected?item.color+'30':C.border}`,
      padding:'16px 18px',display:'flex',flexDirection:'column',gap:10,transition:'box-shadow .15s',cursor:'default'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <ProviderIcon item={item} size={38}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{item.name}</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:4}}>{item.category_label}</div>
          {connection&&<StatusBadge status={connection.status}/>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {connection&&(
            <button onClick={()=>onToggle(connection)} title={connection.enabled?'Disable':'Enable'}
              style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ic n="toggle" s={13} c={connection.enabled?C.accent:C.text3}/>
            </button>
          )}
          <button onClick={()=>onConfigure(item,connection)} title="Configure"
            style={{width:28,height:28,borderRadius:7,border:`1px solid ${connection?C.accent+'40':C.border}`,
              background:connection?C.accentLight:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Ic n="settings" s={13} c={connection?C.accent:C.text3}/>
          </button>
        </div>
      </div>
      <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>{item.description}</div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {(item.tags||[]).map(t=>(
          <span key={t} style={{padding:'2px 7px',borderRadius:99,background:C.bg,color:C.text3,fontSize:10,fontWeight:500}}>{t}</span>
        ))}
      </div>
      {hasError&&connection?.test_result?.message&&(
        <div style={{padding:'7px 10px',borderRadius:8,background:'#FEE2E2',fontSize:12,color:'#991B1B',display:'flex',gap:6}}>
          <Ic n="warning" s={13} c="#991B1B"/>{connection.test_result.message}
        </div>
      )}
      {connection?.last_tested_at&&(
        <div style={{fontSize:11,color:C.text3}}>Tested {new Date(connection.last_tested_at).toLocaleDateString()}</div>
      )}
      <div style={{display:'flex',gap:7,paddingTop:4,borderTop:`1px solid ${C.border}`}}>
        {!connection?(
          <button onClick={()=>onConfigure(item,null)}
            style={{flex:1,padding:'8px',borderRadius:10,border:'none',background:C.accent,color:'white',
              fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>+ Connect</button>
        ):(
          <>
            <button onClick={()=>onConfigure(item,connection)}
              style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',
                color:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Edit</button>
            {confirming?(
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>onDelete(connection)}
                  style={{padding:'8px 10px',borderRadius:8,border:'none',background:'#EF4444',color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>Remove</button>
                <button onClick={()=>setConfirming(false)}
                  style={{padding:'8px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',fontSize:12,cursor:'pointer',fontFamily:F}}>Cancel</button>
              </div>
            ):(
              <button onClick={()=>setConfirming(true)}
                style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Ic n="trash" s={13} c="#EF4444"/>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage({environment}){
  const [catalog,setCatalog]=useState([]);
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeCategory,setActiveCategory]=useState('all');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [configuring,setConfiguring]=useState(null);
  const [activeTab,setActiveTab]=useState("library");
  const envId=environment?.id;

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const [cat,conn]=await Promise.all([
      api.get(`/integrations/catalog?environment_id=${envId}`),
      api.get(`/integrations?environment_id=${envId}`),
    ]);
    setCatalog(Array.isArray(cat)?cat:[]);
    setConnections(Array.isArray(conn)?conn:[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  const allItems=catalog.flatMap(g=>(g.items||[]).map(i=>({...i,category_label:g.label,category_slug:g.slug})));
  const filtered=allItems.filter(item=>{
    const conn=connections.find(c=>c.provider_slug===item.slug);
    if(filter==='connected'&&!conn)return false;
    if(filter==='available'&&conn)return false;
    if(activeCategory!=='all'&&item.category_slug!==activeCategory)return false;
    if(search){const q=search.toLowerCase();return item.name.toLowerCase().includes(q)||item.description?.toLowerCase().includes(q)||(item.tags||[]).some(t=>t.includes(q));}
    return true;
  });

  const connectedCount=connections.filter(c=>c.status==='active').length;
  const errorCount=connections.filter(c=>c.status==='error').length;

  const handleSaved=(saved)=>{
    setConnections(prev=>{
      const idx=prev.findIndex(c=>c.id===saved.id||c.provider_slug===saved.provider_slug);
      if(idx>=0){const n=[...prev];n[idx]=saved;return n;}
      return [...prev,saved];
    });
    setConfiguring(null);
  };
  const handleToggle=async(conn)=>{
    const u=await api.patch(`/integrations/${conn.id}`,{enabled:!conn.enabled});
    if(!u.error)setConnections(prev=>prev.map(c=>c.id===conn.id?u:c));
  };
  const handleRetest=async(id)=>{
    try {
      const result = await tFetch(`/integrations/${id}/test`,{method:'POST'}).then(r=>r.json());
      await load();
      return result;
    } catch(e) { console.warn('retest failed',e); }
  };
  const handleDelete=async(conn)=>{
    await api.delete(`/integrations/${conn.id}`);
    setConnections(prev=>prev.filter(c=>c.id!==conn.id));
  };

  const pill=(label,active,onClick)=>(
    <button onClick={onClick} style={{padding:'6px 14px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',
      fontFamily:F,border:active?'none':`1.5px solid ${C.border}`,background:active?C.text1:C.card,color:active?'white':C.text2,whiteSpace:'nowrap'}}>
      {label}
    </button>
  );

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:C.text3,fontFamily:F,gap:10}}>
      <Ic n="loader" s={18} c={C.text3}/>Loading integrations…
    </div>
  );

  return(
    <div style={{fontFamily:F,maxWidth:1100,padding:'4px 0 40px'}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20,marginBottom:14}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.text1}}>Integrations</h2>
            <p style={{margin:'4px 0 0',fontSize:13,color:C.text3}}>Connect Vercentic to your tools. Credentials are encrypted and environment-specific.</p>
          </div>
          <button onClick={load} style={{padding:'8px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',
            fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6}}>
            <Ic n="refresh" s={13} c={C.text3}/>Refresh
          </button>
        </div>
        {/* Tab strip */}
        <div style={{display:'flex',gap:0,borderBottom:`2px solid ${C.border}`}}>
          {[{id:'library',label:'Library',icon:'grid'},{id:'monitor',label:'Monitor',icon:'zap',badge:errorCount>0?errorCount:null}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:'9px 20px',fontSize:13,
              fontWeight:activeTab===tab.id?700:500,fontFamily:F,cursor:'pointer',background:'transparent',border:'none',
              color:activeTab===tab.id?C.accent:C.text2,
              borderBottom:activeTab===tab.id?`2px solid ${C.accent}`:'2px solid transparent',
              marginBottom:-2,display:'flex',alignItems:'center',gap:6,transition:'color .15s'}}>
              <Ic n={tab.icon} s={14} c={activeTab===tab.id?C.accent:C.text3}/>
              {tab.label}
              {tab.badge&&<span style={{padding:'1px 6px',borderRadius:99,fontSize:10,fontWeight:700,background:'#FEE2E2',color:'#991B1B'}}>{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>
      {/* Monitor tab */}
      {activeTab==='monitor'&&<IntegrationMonitor environment={environment} connections={connections} onRetest={handleRetest}/>}
      {/* Library tab */}
      {activeTab==='library'&&<div>
        <div style={{display:'flex',gap:10,marginTop:14}}>
          {[{label:'Available',value:allItems.length,color:C.accent},
            {label:'Connected',value:connectedCount,color:'#0CA678'},
            {label:'Errors',value:errorCount,color:errorCount>0?'#EF4444':C.text3},
            {label:'Pending',value:connections.filter(c=>c.status==='pending_test').length,color:'#F59F00'},
          ].map(s=>(
            <div key={s.label} style={{padding:'8px 16px',background:C.card,borderRadius:12,border:`1px solid ${C.border}`,textAlign:'center',minWidth:80}}>
              <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,color:C.text3}}>{s.label}</div>
            </div>
          ))}
        </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200,maxWidth:280}}>
          <Ic n="search" s={14} c={C.text3}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{width:'100%',padding:'8px 12px 8px 34px',borderRadius:10,border:`1.5px solid ${C.border}`,
              fontSize:13,fontFamily:F,outline:'none',color:C.text1,boxSizing:'border-box'}}/>
          <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
            <Ic n="search" s={14} c={C.text3}/>
          </div>
        </div>
        {pill('All',filter==='all',()=>setFilter('all'))}
        {pill(`Connected (${connectedCount})`,filter==='connected',()=>setFilter('connected'))}
        {pill('Available',filter==='available',()=>setFilter('available'))}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:20,overflowX:'auto',paddingBottom:4}}>
        {pill('All categories',activeCategory==='all',()=>setActiveCategory('all'))}
        {catalog.map(g=>pill(`${g.label} (${(g.items||[]).length})`,activeCategory===g.slug,()=>setActiveCategory(g.slug)))}
      </div>

      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}>
          <Ic n="grid" s={32} c={C.text3}/>
          <div style={{marginTop:12,fontSize:14,fontWeight:600}}>No integrations found</div>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(item=>{
            const connection=connections.find(c=>c.provider_slug===item.slug);
            return <IntegrationCard key={item.slug} item={item} connection={connection}
              onConfigure={(i,c)=>setConfiguring({item:i,connection:c})}
              onToggle={handleToggle} onDelete={handleDelete}/>;
          })}
        </div>
      )}

      {configuring&&(
        <SetupModal provider={configuring.item} existing={configuring.connection}
          environmentId={envId} onClose={()=>setConfiguring(null)} onSaved={handleSaved}/>
      )}
      </div>}
    </div>
  );
}
