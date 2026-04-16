// IntegrationHub.jsx — unified Integrations page
// Tabs: Library | Flows | Monitoring | Event Log
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import FlowBuilder from "./FlowBuilder.jsx";
import { IntegrationMonitor } from "./IntegrationMonitor.jsx";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  bg:"var(--t-bg,#F8F9FB)", card:"var(--t-card,#fff)", border:"var(--t-border,#E5E7EB)",
  text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)",
  green:"#10B981", red:"#EF4444", amber:"#F59E0B",
};
const IP = {
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  globe:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  "bar-chart":"M12 20V10M18 20V4M6 20v-4",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  x:"M18 6L6 18M6 6l12 12",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  check:"M20 6L9 17l-5-5",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  warning:"M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
};
const Ic = ({n,s=16,c="currentColor"}) => {
  const d=IP[n]||IP.info;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
};

const StatusBadge = ({status}) => {
  const m={active:{l:'Connected',bg:'#D1FAE5',c:'#065F46'},error:{l:'Error',bg:'#FEE2E2',c:'#991B1B'},
    pending_test:{l:'Not tested',bg:'#FEF3C7',c:'#92400E'},disabled:{l:'Disabled',bg:'#F3F4F6',c:'#6B7280'}};
  const s=m[status]||m.disabled;
  return <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c}}>{s.l}</span>;
};
const Pill = ({active,onClick,children,color=C.accent}) =>
  <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${active?color:C.border}`,
    background:active?`${color}10`:"transparent",color:active?color:C.text3,fontSize:12,fontWeight:active?700:500,
    cursor:"pointer",fontFamily:F,transition:"all .15s"}}>{children}</button>;

function ProviderIcon({item,size=40}){
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = item.logo_url;
  const bg = (item.color||C.accent)+'18';
  const border = `1.5px solid ${(item.color||C.accent)}28`;
  const style = {width:size,height:size,borderRadius:size*0.22,background:bg,border,
    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'};
  if (logoUrl && !imgFailed) {
    return (
      <div style={style}>
        <img src={logoUrl} alt={item.name}
          style={{width:size*0.65,height:size*0.65,objectFit:'contain'}}
          onError={()=>setImgFailed(true)}/>
      </div>
    );
  }
  return (
    <div style={style}>
      <span style={{fontSize:Math.max(9,size*0.27),fontWeight:800,color:item.color||C.accent,letterSpacing:'-0.5px'}}>{item.icon}</span>
    </div>
  );
}

// ── Setup Modal (from Integrations.jsx) ──────────────────────────────────────
// ── Setup Modal (from Integrations.jsx) ──────────────────────────────────────
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
      const result=existing?.id
        ? await api.patch(`/integrations/${existing.id}`,{config:form,enabled:true})
        : await api.post('/integrations',{environment_id:environmentId,provider_slug:provider.slug,config:form,enabled:true});
      if(result?.error){setError(result.error);setSaving(false);return;}
      onSaved(result);
    }catch(e){setError(e.message);setSaving(false);}
  };

  const handleTest=async()=>{
    if(!existing?.id){setError('Save first before testing');return;}
    setTesting(true);setTestResult(null);
    try{
      const r=await api.post(`/integrations/${existing.id}/test`,{});
      setTestResult(r); setTesting(false);
    }catch(e){setTestResult({ok:false,message:e.message});setTesting(false);}
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',
      alignItems:'center',justifyContent:'center',padding:20}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:20,width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'hidden',
        display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',fontFamily:F}} onMouseDown={e=>e.stopPropagation()}>
        {/* Header */}
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
        </div>
        {/* Fields */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          {(provider.fields||[]).map(field=>(
            <div key={field.key}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>
                {field.label}{field.required&&<span style={{color:C.red,marginLeft:4}}>*</span>}
              </label>
              {field.hint&&<div style={{fontSize:11,color:C.text3,marginBottom:5}}>{field.hint}</div>}
              {field.type==='boolean'?(
                <button onClick={()=>set(field.key,!form[field.key])} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'7px 12px',borderRadius:8,border:`1.5px solid ${form[field.key]?C.accent:C.border}`,
                  background:form[field.key]?C.accentLight:'transparent',cursor:'pointer',fontSize:13,fontFamily:F,color:form[field.key]?C.accent:C.text2,fontWeight:500}}>
                  <div style={{width:32,height:18,borderRadius:9,background:form[field.key]?C.accent:'#D1D5DB',position:'relative',transition:'background .15s'}}>
                    <div style={{position:'absolute',top:2,left:form[field.key]?14:2,width:14,height:14,borderRadius:'50%',background:'white',transition:'left .15s'}}/>
                  </div>{field.label}
                </button>
              ):(
                <div style={{position:'relative'}}>
                  <input
                    type={field.type==='password'&&!showSecrets[field.key]?'password':'text'}
                    value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)}
                    placeholder={field.placeholder||''}
                    style={{width:'100%',padding:'9px 36px 9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
                      fontSize:13,color:C.text1,fontFamily:field.type==='password'?'ui-monospace,monospace':F,
                      outline:'none',boxSizing:'border-box'}}/>
                  {field.type==='password'&&(
                    <button onClick={()=>setShowSecrets(s=>({...s,[field.key]:!s[field.key]}))}
                      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer'}}>
                      <Ic n={showSecrets[field.key]?'eyeOff':'eye'} s={14} c={C.text3}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {error&&<div style={{padding:'10px 14px',borderRadius:8,background:'#FEE2E2',border:'1px solid #FECACA',fontSize:13,color:'#991B1B'}}>{error}</div>}
          {testResult&&(
            <div style={{padding:'10px 14px',borderRadius:8,background:testResult.ok?'#D1FAE5':'#FEE2E2',
              border:`1px solid ${testResult.ok?'#A7F3D0':'#FECACA'}`,fontSize:13,color:testResult.ok?'#065F46':'#991B1B'}}>
              {testResult.ok?'✓ Connection successful':'✗ '+testResult.message}
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'space-between'}}>
          <button onClick={handleTest} disabled={testing||!existing?.id}
            style={{padding:'9px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',
              color:C.text2,fontSize:13,fontWeight:600,cursor:existing?.id?'pointer':'not-allowed',opacity:existing?.id?1:0.5,fontFamily:F}}>
            {testing?'Testing…':'Test connection'}
          </button>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{padding:'9px 20px',borderRadius:10,border:`1.5px solid ${C.border}`,
              background:'transparent',color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'9px 20px',borderRadius:10,border:'none',background:C.accent,color:'white',
                fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,fontFamily:F}}>
              {saving?'Saving…':'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────
function IntegrationCard({item,connection,onConfigure,onToggle,onDelete}){
  const connected=!!connection;
  const status=connection?.status||'disabled';
  return(
    <div style={{background:C.card,borderRadius:14,border:`1.5px solid ${connected?C.accent+'40':C.border}`,
      padding:18,display:'flex',flexDirection:'column',gap:12,transition:'box-shadow .15s'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.07)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <ProviderIcon item={item} size={44}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{item.name}</span>
            {connected&&<StatusBadge status={status}/>}
          </div>
          <div style={{fontSize:12,color:C.text3,lineHeight:1.4}}>{item.description}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        {connected&&(
          <>
            <button onClick={()=>onToggle(connection)} style={{padding:'6px 12px',borderRadius:8,
              border:`1.5px solid ${C.border}`,background:'transparent',fontSize:12,fontWeight:600,
              color:C.text2,cursor:'pointer',fontFamily:F}}>{connection.enabled?'Pause':'Resume'}</button>
            <button onClick={()=>onDelete(connection.id)} style={{padding:'6px 12px',borderRadius:8,
              border:`1.5px solid #FEE2E2`,background:'transparent',fontSize:12,fontWeight:600,
              color:C.red,cursor:'pointer',fontFamily:F}}>Remove</button>
          </>
        )}
        <button onClick={()=>onConfigure(item,connection)}
          style={{padding:'6px 14px',borderRadius:8,border:'none',
            background:connected?C.accentLight:C.accent,
            color:connected?C.accent:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F,
            display:'flex',alignItems:'center',gap:5}}>
          <Ic n="settings" s={12} c={connected?C.accent:'white'}/>
          {connected?'Configure':'Connect'}
        </button>
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────
function LibraryTab({ envId }) {
  const [catalog,setCatalog]=useState([]);
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [activeCategory,setActiveCategory]=useState('all');
  const [configuring,setConfiguring]=useState(null);

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const [cat,conn]=await Promise.all([
      api.get('/integrations/catalog').catch(()=>[]),
      api.get(`/integrations?environment_id=${envId}`).catch(()=>[]),
    ]);
    setCatalog(Array.isArray(cat)?cat:[]);
    setConnections(Array.isArray(conn)?conn:[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  const handleSaved=async(r)=>{ setConfiguring(null); await load(); };
  const handleToggle=async(conn)=>{
    await api.patch(`/integrations/${conn.id}`,{enabled:!conn.enabled});
    load();
  };
  const handleDelete=async(id)=>{
    if(!confirm('Remove this integration?'))return;
    await api.delete(`/integrations/${id}`);
    load();
  };

  const allItems=(catalog||[]).flatMap(g=>g.items||[]);
  const connectedCount=connections.filter(c=>c.enabled).length;
  const filtered=allItems.filter(item=>{
    if(filter==='connected'&&!connections.find(c=>c.provider_slug===item.slug))return false;
    if(filter==='available'&&connections.find(c=>c.provider_slug===item.slug))return false;
    if(activeCategory!=='all'){const g=catalog.find(g=>g.slug===activeCategory);if(!g||(g.items||[]).every(i=>i.slug!==item.slug))return false;}
    if(search&&!item.name.toLowerCase().includes(search.toLowerCase())&&
       !(item.description||'').toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return(
    <div>
      {connectedCount>0&&(
        <div style={{marginBottom:18,padding:'10px 16px',borderRadius:10,background:C.accentLight,
          border:`1.5px solid ${C.accent}30`,fontSize:13,color:C.text2,display:'flex',alignItems:'center',gap:8}}>
          <Ic n="check" s={14} c={C.accent}/>
          <strong style={{color:C.accent}}>{connectedCount}</strong> integration{connectedCount!==1?'s':''} connected
        </div>
      )}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search integrations…"
            style={{width:'100%',padding:'8px 12px 8px 34px',borderRadius:10,border:`1.5px solid ${C.border}`,
              fontSize:13,fontFamily:F,outline:'none',color:C.text1,boxSizing:'border-box'}}/>
          <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
            <Ic n="search" s={14} c={C.text3}/>
          </div>
        </div>
        <Pill active={filter==='all'} onClick={()=>setFilter('all')}>All</Pill>
        <Pill active={filter==='connected'} onClick={()=>setFilter('connected')}>Connected ({connectedCount})</Pill>
        <Pill active={filter==='available'} onClick={()=>setFilter('available')}>Available</Pill>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:18,overflowX:'auto',paddingBottom:4}}>
        <Pill active={activeCategory==='all'} onClick={()=>setActiveCategory('all')}>All categories</Pill>
        {(catalog||[]).map(g=><Pill key={g.slug} active={activeCategory===g.slug} onClick={()=>setActiveCategory(g.slug)}>{g.label}</Pill>)}
      </div>
      {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:
      filtered.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}><Ic n="zap" s={32} c={C.text3}/><div style={{marginTop:12,fontSize:14,fontWeight:600}}>No integrations found</div></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(item=>{
            const conn=connections.find(c=>c.provider_slug===item.slug);
            return <IntegrationCard key={item.slug} item={item} connection={conn}
              onConfigure={(i,c)=>setConfiguring({item:i,connection:c})}
              onToggle={handleToggle} onDelete={handleDelete}/>;
          })}
        </div>
      )}
      {configuring&&<SetupModal provider={configuring.item} existing={configuring.connection}
        environmentId={envId} onClose={()=>setConfiguring(null)} onSaved={handleSaved}/>}
    </div>
  );
}

// ── Event Log Tab ─────────────────────────────────────────────────────────────
function EventLogTab({ envId }) {
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('all');

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const data=await api.get(`/integrations/monitor/events?environment_id=${envId}&limit=100`).catch(()=>({events:[]}));
    setEvents(Array.isArray(data)?data:data?.events||[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  function timeAgo(ts){
    if(!ts)return'';const s=Math.floor((Date.now()-new Date(ts).getTime())/1000);
    if(s<60)return`${s}s ago`;if(s<3600)return`${Math.floor(s/60)}m ago`;
    if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;
  }

  const filtered=filter==='all'?events:events.filter(e=>filter==='errors'?!e.ok:e.ok);
  return(
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <Pill active={filter==='all'} onClick={()=>setFilter('all')}>All</Pill>
        <Pill active={filter==='success'} onClick={()=>setFilter('success')} color={C.green}>Success</Pill>
        <Pill active={filter==='errors'} onClick={()=>setFilter('errors')} color={C.red}>Errors</Pill>
        <button onClick={load} style={{marginLeft:'auto',padding:'5px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
          background:'transparent',fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:5}}>
          <Ic n="refresh" s={12} c={C.text3}/>Refresh
        </button>
      </div>
      {loading?<div style={{textAlign:'center',padding:40,color:C.text3}}>Loading…</div>:
      filtered.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}><Ic n="activity" s={32} c={C.text3}/><div style={{marginTop:12,fontSize:14,fontWeight:600}}>No events yet</div></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {filtered.map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,
              background:C.card,border:`1px solid ${C.border}`,fontSize:13}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:e.ok?C.green:C.red,flexShrink:0}}/>
              <span style={{fontWeight:600,color:C.text1,minWidth:120}}>{e.provider||'—'}</span>
              <span style={{color:C.text2,flex:1}}>{e.action||'—'}</span>
              {!e.ok&&e.detail&&<span style={{fontSize:11,color:C.red,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.detail}</span>}
              <span style={{fontSize:11,color:C.text3,whiteSpace:'nowrap'}}>{timeAgo(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Monitoring Tab — wraps IntegrationMonitor ─────────────────────────────────
function MonitoringTab({ environment }) {
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    if(!environment?.id)return;
    setLoading(true);
    const data=await api.get(`/integrations?environment_id=${environment.id}`).catch(()=>[]);
    setConnections(Array.isArray(data)?data:[]);
    setLoading(false);
  },[environment?.id]);

  useEffect(()=>{load();},[load]);

  if(loading)return<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>;
  return <IntegrationMonitor environment={environment} connections={connections} onRetest={load}/>;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function IntegrationHub({ environment }) {
  const [tab, setTab] = useState("library");
  const envId = environment?.id;

  const TABS = [
    { id:"library",    label:"Library",    icon:"zap"       },
    { id:"flows",      label:"Flows",      icon:"link"      },
    { id:"monitor",    label:"Monitoring", icon:"bar-chart" },
    { id:"events",     label:"Event Log",  icon:"activity"  },
  ];

  return (
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text1,margin:0}}>Integrations</h1>
        <p style={{fontSize:13,color:C.text3,margin:"4px 0 0"}}>Connect external services, automate flows, and monitor platform events</p>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:2,borderBottom:`2px solid ${C.border}`,marginBottom:24}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",border:"none",
              borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,
              background:"none",color:tab===t.id?C.accent:C.text3,fontSize:13,
              fontWeight:tab===t.id?700:500,cursor:"pointer",fontFamily:F,transition:"color .15s"}}>
            <Ic n={t.icon} s={14} c={tab===t.id?C.accent:C.text3}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab==="library"  && <LibraryTab envId={envId}/>}
      {tab==="flows"    && <FlowBuilder environment={environment}/>}
      {tab==="monitor"  && <MonitoringTab environment={environment}/>}
      {tab==="events"   && <EventLogTab envId={envId}/>}
    </div>
  );
}
