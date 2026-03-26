import { useState, useEffect, useCallback, useRef } from "react";

const F = "'DM Sans',-apple-system,sans-serif";
const C = { bg:"#F8F9FB", card:"#fff", border:"#E5E7EB", text1:"#111827", text2:"#374151", text3:"#9CA3AF",
  accent:"#4361EE", accentLight:"#EEF2FF", success:"#10B981", danger:"#EF4444", warning:"#F59E0B" };
const api = {
  get:  u => fetch(`/api${u}`).then(r=>r.json()),
  post: (u,b) => fetch(`/api${u}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(u,b) => fetch(`/api${u}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:  u => fetch(`/api${u}`,{method:"DELETE"}).then(r=>r.json()),
};

const ICON_PATHS = {
  webhook:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8", globe:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", inbox:"M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2", check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
  plus:"M12 5v14M5 12h14", search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  "bar-chart":"M12 20V10M18 20V4M6 20v-4", clock:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  play:"M5 3l14 9-14 9V3z", pause:"M6 4h4v16H6zM14 4h4v16h-4z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  copy:"M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  key:"M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

const Ic = ({n,s=16,c="#6B7280"}) => { const d=ICON_PATHS[n]; if(!d) return null; return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; };
const Badge = ({children,color=C.accent,bg}) => <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,color,background:bg||`${color}15`,border:`1px solid ${color}25`,whiteSpace:"nowrap"}}>{children}</span>;
const Pill = ({active,onClick,children,color=C.accent}) => <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${active?color:C.border}`,background:active?`${color}10`:"transparent",color:active?color:C.text3,fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:F,transition:"all .15s"}}>{children}</button>;
const StatusDot = ({status}) => { const colors={active:"#10B981",paused:"#F59E0B",disabled:"#EF4444",error:"#EF4444"}; return <div style={{width:8,height:8,borderRadius:"50%",background:colors[status]||C.text3,flexShrink:0}}/>; };
function timeAgo(ts) { if(!ts) return ""; const s=Math.floor((Date.now()-new Date(ts).getTime())/1000); if(s<60) return `${s}s ago`; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; }

export default function IntegrationHub({ environment }) {
  const [tab, setTab] = useState("marketplace");
  const envId = environment?.id;
  const TABS = [
    { id:"marketplace", label:"Marketplace", icon:"globe" },
    { id:"webhooks", label:"Outbound Webhooks", icon:"send" },
    { id:"inbound", label:"Inbound Webhooks", icon:"inbox" },
    { id:"events", label:"Event Log", icon:"activity" },
    { id:"monitor", label:"Monitoring", icon:"bar-chart" },
  ];
  return (
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text1,margin:0}}>Integration Hub</h1>
        <p style={{fontSize:13,color:C.text3,margin:"4px 0 0"}}>Connect external services, manage webhooks, and monitor platform events</p>
      </div>
      <div style={{display:"flex",gap:4,borderBottom:`2px solid ${C.border}`,marginBottom:24}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",border:"none",borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,background:"none",color:tab===t.id?C.accent:C.text3,fontSize:13,fontWeight:tab===t.id?700:500,cursor:"pointer",fontFamily:F}}><Ic n={t.icon} s={14} c={tab===t.id?C.accent:C.text3}/>{t.label}</button>)}
      </div>
      {tab==="marketplace" && <MarketplaceTab envId={envId}/>}
      {tab==="webhooks" && <OutboundWebhooksTab envId={envId}/>}
      {tab==="inbound" && <InboundWebhooksTab envId={envId}/>}
      {tab==="events" && <EventLogTab envId={envId}/>}
      {tab==="monitor" && <MonitoringTab envId={envId}/>}
    </div>
  );
}

function MarketplaceTab({ envId }) {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ api.get(`/integrations/catalog?environment_id=${envId}`).then(d=>{ setCatalog(Array.isArray(d)?d:Object.values(d)); setLoading(false); }).catch(()=>setLoading(false)); },[envId]);
  const allItems = catalog.flatMap(g=>g.items||[]);
  const categories = [...new Set(catalog.map(g=>g.slug))];
  const filtered = allItems.filter(item=>{ if(catFilter!=="all"&&item.category!==catFilter) return false; if(search&&!item.name.toLowerCase().includes(search.toLowerCase())&&!(item.tags||[]).some(t=>t.includes(search.toLowerCase()))) return false; return true; });
  const connectedCount = filtered.filter(i=>i.connected).length;
  if(loading) return <div style={{textAlign:"center",color:C.text3,padding:40}}>Loading marketplace…</div>;
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:12}}>
          <div style={{padding:"8px 16px",borderRadius:10,background:C.card,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:20,fontWeight:800,color:C.text1}}>{allItems.length}</div><div style={{fontSize:11,color:C.text3}}>Available</div>
          </div>
          <div style={{padding:"8px 16px",borderRadius:10,background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
            <div style={{fontSize:20,fontWeight:800,color:C.success}}>{connectedCount}</div><div style={{fontSize:11,color:C.success}}>Connected</div>
          </div>
        </div>
        <div style={{flex:1}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search integrations…" style={{width:220,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        <Pill active={catFilter==="all"} onClick={()=>setCatFilter("all")}>All</Pill>
        {categories.map(cat=>{ const g=catalog.find(c=>c.slug===cat); return <Pill key={cat} active={catFilter===cat} onClick={()=>setCatFilter(cat)} color={g?.color}>{g?.label||cat}</Pill>; })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {filtered.map(item=>(
          <div key={item.slug} style={{background:C.card,borderRadius:14,border:`1px solid ${item.connected?"#BBF7D0":C.border}`,padding:"18px 20px",transition:"all .15s",cursor:"pointer",position:"relative"}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.06)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}>
            {item.connected && <div style={{position:"absolute",top:12,right:12}}><Badge color={C.success} bg="#ECFDF5">Connected</Badge></div>}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:`${item.color||C.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:item.color||C.accent}}>
                {(item.icon||item.name[0]).slice(0,3)}
              </div>
              <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{item.name}</div><div style={{fontSize:11,color:C.text3}}>{item.category_label}</div></div>
            </div>
            <p style={{fontSize:12,color:C.text2,lineHeight:1.5,margin:"0 0 12px"}}>{item.description}</p>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {(item.tags||[]).slice(0,4).map(t=><span key={t} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#F3F4F6",color:C.text3}}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div style={{textAlign:"center",color:C.text3,padding:40}}>No integrations match your search</div>}
    </div>
  );
}

function OutboundWebhooksTab({ envId }) {
  const [webhooks, setWebhooks] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deliveryView, setDeliveryView] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const load = useCallback(async ()=>{ setLoading(true); const [wh,et]=await Promise.all([api.get(`/webhooks?environment_id=${envId}`),api.get("/webhooks/event-types")]); setWebhooks(Array.isArray(wh)?wh:[]); setEventTypes(Array.isArray(et)?et:[]); setLoading(false); },[envId]);
  useEffect(()=>{load();},[load]);
  const loadDeliveries = async whId=>{ setDeliveryView(whId); const d=await api.get(`/webhooks/${whId}/deliveries?limit=50`); setDeliveries(d.deliveries||[]); };
  const handleSave = async form=>{ if(modal?.webhook) await api.patch(`/webhooks/${modal.webhook.id}`,form); else await api.post("/webhooks",{...form,environment_id:envId}); setModal(null); load(); };
  const handleToggle = async wh=>{ await api.post(`/webhooks/${wh.id}/toggle`); load(); };
  const handleDelete = async wh=>{ if(!confirm(`Delete "${wh.name}"?`)) return; await api.del(`/webhooks/${wh.id}`); load(); };
  const handleTest = async wh=>{ const r=await api.post(`/webhooks/${wh.id}/test`); alert(r.status==="success"?"Test delivered!":"Failed: "+(r.error||"Unknown")); loadDeliveries(wh.id); };
  const handleRetry = async (whId,dId)=>{ await api.post(`/webhooks/${whId}/deliveries/${dId}/retry`); loadDeliveries(whId); };
  if(loading) return <div style={{textAlign:"center",color:C.text3,padding:40}}>Loading webhooks…</div>;
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontSize:13,color:C.text3}}>{webhooks.length} webhook{webhooks.length!==1?"s":""}</div>
        <button onClick={()=>setModal({})} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="plus" s={14} c="white"/> New Webhook</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {webhooks.map(wh=>(
          <div key={wh.id} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <StatusDot status={wh.status}/>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{wh.name}</div><div style={{fontSize:11,color:C.text3,fontFamily:"monospace",marginTop:2}}>{wh.url}</div></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {wh.stats?.success_rate!==null && <Badge color={wh.stats.success_rate>=90?C.success:wh.stats.success_rate>=50?C.warning:C.danger}>{wh.stats.success_rate}% success</Badge>}
                <Badge color={C.text3}>{wh.stats?.total_deliveries||0} deliveries</Badge>
              </div>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:10}}>
              {(wh.event_types||[]).map(et=><span key={et} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:C.accentLight,color:C.accent,fontWeight:600}}>{et}</span>)}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <button onClick={()=>handleTest(wh)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}><Ic n="play" s={11} c={C.text2}/>Test</button>
              <button onClick={()=>loadDeliveries(wh.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}><Ic n="activity" s={11} c={C.text2}/>Deliveries</button>
              <button onClick={()=>handleToggle(wh)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:wh.status==="active"?C.warning:C.success,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{wh.status==="active"?"Pause":"Resume"}</button>
              <button onClick={()=>setModal({webhook:wh})} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>Edit</button>
              <div style={{flex:1}}/><button onClick={()=>handleDelete(wh)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #FEE2E2",background:"none",color:C.danger,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>Delete</button>
            </div>
            {deliveryView===wh.id && (
              <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text2}}>Recent Deliveries</div>
                  <button onClick={()=>setDeliveryView(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:18}}>×</button>
                </div>
                {deliveries.length===0 ? <div style={{fontSize:12,color:C.text3,padding:8}}>No deliveries yet</div>
                : deliveries.slice(0,20).map(d=>(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:d.status==="success"?C.success:d.status==="pending"?C.warning:C.danger,flexShrink:0}}/>
                    <span style={{color:C.text2,fontWeight:600,width:120,flexShrink:0}}>{d.event_type}</span>
                    <span style={{color:d.response_status&&d.response_status<300?C.success:C.danger,fontFamily:"monospace",width:40}}>{d.response_status||"—"}</span>
                    <span style={{flex:1,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.error||"OK"}</span>
                    <span style={{color:C.text3,flexShrink:0}}>{timeAgo(d.created_at)}</span>
                    {d.status==="failed" && <button onClick={()=>handleRetry(wh.id,d.id)} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"none",color:C.accent,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F}}>Retry</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {webhooks.length===0 && (
        <div style={{textAlign:"center",padding:60,color:C.text3}}>
          <Ic n="send" s={32} c={C.text3}/><div style={{fontSize:15,fontWeight:700,color:C.text1,marginTop:12}}>No outbound webhooks</div>
          <div style={{fontSize:13,marginTop:4}}>Create a webhook to send real-time event notifications to external systems</div>
          <button onClick={()=>setModal({})} style={{marginTop:16,padding:"10px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>Create First Webhook</button>
        </div>
      )}
      {modal && <WebhookModal eventTypes={eventTypes} webhook={modal.webhook} onSave={handleSave} onClose={()=>setModal(null)}/>}
    </div>
  );
}

function WebhookModal({ eventTypes, webhook, onSave, onClose }) {
  const [form, setForm] = useState({ name:webhook?.name||"", url:webhook?.url||"", description:webhook?.description||"", event_types:webhook?.event_types||[], max_retries:webhook?.max_retries||5, timeout_ms:webhook?.timeout_ms||10000 });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleEvent = type => set("event_types", form.event_types.includes(type) ? form.event_types.filter(t=>t!==type) : [...form.event_types, type]);
  const handleSubmit = async () => { if(!form.name||!form.url) return alert("Name and URL required"); if(!form.event_types.length) return alert("Select at least one event"); setSaving(true); await onSave(form); setSaving(false); };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:16,width:640,maxHeight:"85vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <h2 style={{fontSize:18,fontWeight:800,color:C.text1,margin:0}}>{webhook?"Edit Webhook":"New Outbound Webhook"}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>NAME</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="My Webhook" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>ENDPOINT URL</label><input value={form.url} onChange={e=>set("url",e.target.value)} placeholder="https://example.com/webhook" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
        </div>
        <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>DESCRIPTION</label><input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Optional" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:8}}>EVENT TYPES ({form.event_types.length} selected)</label>
          <div style={{maxHeight:240,overflow:"auto",border:`1px solid ${C.border}`,borderRadius:10,padding:8}}>
            {eventTypes.map(group=>(
              <div key={group.slug} style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:group.color||C.text3,letterSpacing:"0.05em",marginBottom:4,padding:"0 4px"}}>{group.label?.toUpperCase()}</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {(group.events||[]).map(ev=>(
                    <label key={ev.type} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",borderRadius:6,cursor:"pointer",background:form.event_types.includes(ev.type)?`${group.color||C.accent}08`:"transparent"}}>
                      <input type="checkbox" checked={form.event_types.includes(ev.type)} onChange={()=>toggleEvent(ev.type)} style={{accentColor:group.color||C.accent}}/>
                      <span style={{fontSize:12,color:C.text1,fontWeight:form.event_types.includes(ev.type)?600:400}}>{ev.label}</span>
                      <span style={{fontSize:10,color:C.text3,marginLeft:"auto",fontFamily:"monospace"}}>{ev.type}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>MAX RETRIES</label><input type="number" value={form.max_retries} onChange={e=>set("max_retries",Number(e.target.value))} min={0} max={10} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>TIMEOUT (MS)</label><input type="number" value={form.timeout_ms} onChange={e=>set("timeout_ms",Number(e.target.value))} step={1000} min={1000} max={30000} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{padding:"10px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:saving?0.6:1}}>{saving?"Saving…":webhook?"Save Changes":"Create Webhook"}</button>
        </div>
      </div>
    </div>
  );
}

function InboundWebhooksTab({ envId }) {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(null);
  const load = useCallback(async ()=>{ setLoading(true); const d=await api.get(`/webhooks/inbound?environment_id=${envId}`); setEndpoints(Array.isArray(d)?d:[]); setLoading(false); },[envId]);
  useEffect(()=>{load();},[load]);
  const handleSave = async form=>{ await api.post("/webhooks/inbound",{...form,environment_id:envId}); setModal(null); load(); };
  const handleDelete = async ep=>{ if(!confirm(`Delete "${ep.name}"?`)) return; await api.del(`/webhooks/inbound/${ep.id}`); load(); };
  const copyUrl = ep=>{ const baseUrl=window.location.origin.replace(":3000",":3001"); navigator.clipboard.writeText(`${baseUrl}/api/webhooks/inbound/receive/${ep.token}`); setCopied(ep.id); setTimeout(()=>setCopied(null),2000); };
  if(loading) return <div style={{textAlign:"center",color:C.text3,padding:40}}>Loading…</div>;
  const ACTION_LABELS = { create_record:"Create Record", trigger_workflow:"Trigger Workflow", emit_event:"Emit Event", custom:"Custom" };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontSize:13,color:C.text3}}>{endpoints.length} inbound endpoint{endpoints.length!==1?"s":""}</div>
        <button onClick={()=>setModal({})} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="plus" s={14} c="white"/> New Endpoint</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {endpoints.map(ep=>{
          const baseUrl=window.location.origin.replace(":3000",":3001");
          const url=`${baseUrl}/api/webhooks/inbound/receive/${ep.token}`;
          return (
            <div key={ep.id} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="inbox" s={18} c={C.accent}/></div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{ep.name}</div><div style={{fontSize:11,color:C.text3}}>{ACTION_LABELS[ep.action]||ep.action} · {ep.call_count||0} calls · Last: {ep.last_called_at?timeAgo(ep.last_called_at):"never"}</div></div>
                <StatusDot status={ep.status}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,padding:"8px 12px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                <code style={{flex:1,fontSize:11,color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</code>
                <button onClick={()=>copyUrl(ep)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:copied===ep.id?C.success:C.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{copied===ep.id?"Copied!":"Copy"}</button>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>handleDelete(ep)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #FEE2E2",background:"none",color:C.danger,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {endpoints.length===0 && (
        <div style={{textAlign:"center",padding:60,color:C.text3}}>
          <Ic n="inbox" s={32} c={C.text3}/><div style={{fontSize:15,fontWeight:700,color:C.text1,marginTop:12}}>No inbound endpoints</div>
          <div style={{fontSize:13,marginTop:4}}>Create an endpoint to receive data from external systems</div>
          <button onClick={()=>setModal({})} style={{marginTop:16,padding:"10px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>Create Endpoint</button>
        </div>
      )}
      {modal && <InboundModal onSave={handleSave} onClose={()=>setModal(null)}/>}
    </div>
  );
}

function InboundModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:"", description:"", action:"create_record", action_config:{} });
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:16,width:500,padding:24}}>
        <h2 style={{fontSize:18,fontWeight:800,color:C.text1,margin:"0 0 20px"}}>New Inbound Endpoint</h2>
        <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>NAME</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. LinkedIn Applications" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>DESCRIPTION</label><input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Optional" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}/></div>
        <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4}}>ACTION</label><select value={form.action} onChange={e=>set("action",e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F}}><option value="create_record">Create Record</option><option value="trigger_workflow">Trigger Workflow</option><option value="emit_event">Emit Event</option><option value="custom">Custom (log only)</option></select></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
          <button onClick={()=>onSave(form)} disabled={!form.name} style={{padding:"10px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>Create Endpoint</button>
        </div>
      </div>
    </div>
  );
}

const CATS = {records:"#3B82F6",pipeline:"#8B5CF6",interviews:"#F59E0B",offers:"#10B981",applications:"#EC4899",comms:"#06B6D4",forms:"#6366F1",system:"#6B7280",portal:"#14B8A6"};

function EventLogTab({ envId }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(0);
  const LIMIT = 50;
  const load = useCallback(async ()=>{ setLoading(true); const params=[`environment_id=${envId}`,`limit=${LIMIT}`,`offset=${page*LIMIT}`]; if(catFilter) params.push(`category=${catFilter}`); const d=await api.get(`/webhooks/events?${params.join("&")}`); setEvents(d.events||[]); setTotal(d.total||0); setLoading(false); },[envId,catFilter,page]);
  useEffect(()=>{load();},[load]);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:C.text3}}>{total} event{total!==1?"s":""}</div><div style={{flex:1}}/>
        <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPage(0);}} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F}}>
          <option value="">All categories</option>{Object.keys(CATS).map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}><Ic n="refresh" s={12} c={C.text2}/>Refresh</button>
      </div>
      {loading ? <div style={{textAlign:"center",color:C.text3,padding:40}}>Loading events…</div> : (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {events.length===0 ? <div style={{textAlign:"center",color:C.text3,padding:40}}>No events recorded yet</div>
          : events.map((ev,i)=>(
            <div key={ev.id||i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderBottom:i<events.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:CATS[ev.category]||C.text3,flexShrink:0,marginTop:4}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:C.text1,fontWeight:500,lineHeight:1.4}}>{ev.summary}</div>
                <div style={{display:"flex",gap:8,marginTop:4,alignItems:"center"}}>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${CATS[ev.category]||C.text3}12`,color:CATS[ev.category]||C.text3,fontWeight:600}}>{ev.category}</span>
                  <span style={{fontSize:10,color:C.text3,fontFamily:"monospace"}}>{ev.type}</span>
                </div>
              </div>
              <span style={{fontSize:11,color:C.text3,flexShrink:0}}>{timeAgo(ev.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
      {total>LIMIT && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:16}}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:page===0?C.text3:C.text2,fontSize:12,fontWeight:600,cursor:page===0?"not-allowed":"pointer",fontFamily:F}}>Previous</button>
          <span style={{fontSize:12,color:C.text3}}>Page {page+1} of {Math.ceil(total/LIMIT)}</span>
          <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*LIMIT>=total} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Next</button>
        </div>
      )}
    </div>
  );
}

function MonitoringTab({ envId }) {
  const [stats, setStats] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const load = useCallback(async ()=>{ setLoading(true); const [s,w,sub]=await Promise.all([api.get(`/webhooks/events/stats?environment_id=${envId}&hours=${hours}`),api.get(`/webhooks?environment_id=${envId}`),api.get("/webhooks/subscribers")]); setStats(s); setWebhooks(Array.isArray(w)?w:[]); setSubscribers(Array.isArray(sub)?sub:[]); setLoading(false); },[envId,hours]);
  useEffect(()=>{load();},[load]);
  if(loading) return <div style={{textAlign:"center",color:C.text3,padding:40}}>Loading monitoring data…</div>;
  if(!stats) return null;
  const catEntries = Object.entries(stats.byCategory||{}).sort((a,b)=>b[1]-a[1]);
  const typeEntries = Object.entries(stats.byType||{}).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxCat = catEntries[0]?.[1] || 1;
  const maxType = typeEntries[0]?.[1] || 1;
  const hourEntries = Object.entries(stats.byHour||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  const maxHour = Math.max(...hourEntries.map(e=>e[1]),1);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",gap:6}}>
          {[1,6,24,72,168].map(h=><Pill key={h} active={hours===h} onClick={()=>setHours(h)}>{h<24?`${h}h`:h===24?"24h":h===72?"3d":"7d"}</Pill>)}
        </div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}><Ic n="refresh" s={12} c={C.text2}/>Refresh</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}><div style={{fontSize:24,fontWeight:800,color:C.text1}}>{stats.total}</div><div style={{fontSize:12,color:C.text3}}>Total Events</div></div>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}><div style={{fontSize:24,fontWeight:800,color:C.accent}}>{catEntries.length}</div><div style={{fontSize:12,color:C.text3}}>Active Categories</div></div>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}><div style={{fontSize:24,fontWeight:800,color:C.success}}>{webhooks.filter(w=>w.status==="active").length}</div><div style={{fontSize:12,color:C.text3}}>Active Webhooks</div></div>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}><div style={{fontSize:24,fontWeight:800,color:"#8B5CF6"}}>{subscribers.length}</div><div style={{fontSize:12,color:C.text3}}>Subscribers</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text1,margin:"0 0 14px"}}>Events by Category</h3>
          {catEntries.length===0 ? <div style={{fontSize:12,color:C.text3}}>No events in this period</div>
          : catEntries.map(([cat,count])=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:CATS[cat]||C.text3,flexShrink:0}}/>
              <span style={{fontSize:12,color:C.text2,width:90,flexShrink:0}}>{cat}</span>
              <div style={{flex:1,height:8,borderRadius:4,background:"#F3F4F6",overflow:"hidden"}}><div style={{width:`${count/maxCat*100}%`,height:"100%",borderRadius:4,background:CATS[cat]||C.text3}}/></div>
              <span style={{fontSize:12,fontWeight:700,color:C.text1,width:40,textAlign:"right"}}>{count}</span>
            </div>
          ))}
        </div>
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text1,margin:"0 0 14px"}}>Top Event Types</h3>
          {typeEntries.length===0 ? <div style={{fontSize:12,color:C.text3}}>No events in this period</div>
          : typeEntries.map(([type,count])=>(
            <div key={type} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:11,color:C.text2,width:140,flexShrink:0,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{type}</span>
              <div style={{flex:1,height:8,borderRadius:4,background:"#F3F4F6",overflow:"hidden"}}><div style={{width:`${count/maxType*100}%`,height:"100%",borderRadius:4,background:C.accent}}/></div>
              <span style={{fontSize:12,fontWeight:700,color:C.text1,width:40,textAlign:"right"}}>{count}</span>
            </div>
          ))}
        </div>
      </div>
      {hourEntries.length>0 && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px",marginBottom:24}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text1,margin:"0 0 14px"}}>Activity Timeline</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:2,height:60}}>
            {hourEntries.map(([hour,count])=><div key={hour} title={`${hour}: ${count}`} style={{flex:1,height:`${count/maxHour*100}%`,minHeight:2,borderRadius:2,background:C.accent,opacity:0.7}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:10,color:C.text3}}>{hourEntries[0]?.[0]?.slice(11)+":00"||""}</span>
            <span style={{fontSize:10,color:C.text3}}>{hourEntries[hourEntries.length-1]?.[0]?.slice(11)+":00"||""}</span>
          </div>
        </div>
      )}
      {webhooks.length>0 && (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text1,margin:"0 0 14px"}}>Webhook Health</h3>
          {webhooks.map(wh=>(
            <div key={wh.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <StatusDot status={wh.status}/>
              <span style={{fontSize:13,fontWeight:600,color:C.text1,flex:1}}>{wh.name}</span>
              <Badge color={wh.stats?.success_rate>=90?C.success:wh.stats?.success_rate>=50?C.warning:C.danger}>{wh.stats?.success_rate??0}%</Badge>
              <span style={{fontSize:11,color:C.text3}}>{wh.stats?.total_deliveries||0} deliveries</span>
              <span style={{fontSize:11,color:C.text3}}>{wh.stats?.last_delivery?timeAgo(wh.stats.last_delivery.created_at):"never"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
