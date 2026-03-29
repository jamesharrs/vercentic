// client/src/FlowBuilder.jsx — Vercentic Flow Builder
import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  accent:"#4361EE", success:"#10B981", danger:"#EF4444",
  warning:"#F59E0B", text1:"#111827", text2:"#374151",
  text3:"#9CA3AF", border:"#E5E7EB", surface:"#ffffff",
};
const api = {
  get:    (u)   => fetch(u).then(r=>r.json()),
  post:   (u,b) => fetch(u,{method:'POST',  headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (u,b) => fetch(u,{method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: (u)   => fetch(u,{method:'DELETE'}).then(r=>r.json()),
};

const PATHS = {
  play:"M5 3l14 9-14 9V3z", clock:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4l3 3",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z", globe:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0c-2.5 0-4.5 5-4.5 10s2 10 4.5 10 4.5-5 4.5-10S14.5 2 12 2zM2 12h20",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z", edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", x:"M18 6L6 18M6 6l12 12", plus:"M12 5v14M5 12h14",
  check:"M20 6L9 17l-5-5", refresh:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2", copy:"M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
  "git-branch":"M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zm-6 12a3 3 0 100-6 3 3 0 000 6zm0 0V9m-6 6a3 3 0 100 0",
  code:"M16 18l6-6-6-6M8 6l-6 6 6 6", shuffle:"M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  "plus-circle":"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v-4m-2 2h4",
  "alert-circle":"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-7v-4m0 5h.01",
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||PATHS.code}/>
  </svg>
);

const STEP_TYPES = {
  http_request: {label:"HTTP Request",icon:"globe",color:"#3B82F6"},
  transform:    {label:"Transform",   icon:"shuffle",color:"#8B5CF6"},
  find_record:  {label:"Find Record", icon:"search",color:"#0EA5E9"},
  create_record:{label:"Create Record",icon:"plus-circle",color:"#10B981"},
  update_record:{label:"Update Record",icon:"edit",color:"#F59E0B"},
  notify:       {label:"Send Notification",icon:"bell",color:"#4A154B"},
  ai_prompt:    {label:"AI Prompt",   icon:"sparkles",color:"#7C3AED"},
  condition:    {label:"Condition",   icon:"git-branch",color:"#F97316"},
  delay:        {label:"Delay",       icon:"clock",color:"#6B7280"},
  set_variable: {label:"Set Variable",icon:"code",color:"#64748B"},
};
const TRIGGER_TYPES = {
  manual:   {label:"Manual",         icon:"play", color:"#6B7280"},
  schedule: {label:"Schedule",       icon:"clock",color:"#3B82F6"},
  webhook:  {label:"Webhook",        icon:"link", color:"#10B981"},
  event:    {label:"Vercentic Event",icon:"zap",  color:"#F59E0B"},
};
const EVENTS = ["new_application","interview_scheduled","offer_accepted","offer_declined","stage_change","record_created","record_updated","new_hire"];

// ── UI helpers ────────────────────────────────────────────────────────────────
const Btn = ({onClick,disabled,variant="default",children,style={}}) => {
  const bg = variant==="primary"?C.accent:variant==="danger"?C.danger:"#F3F4F6";
  const fg = (variant==="primary"||variant==="danger")?"#fff":C.text2;
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"none",cursor:disabled?"not-allowed":"pointer",background:disabled?"#E5E7EB":bg,color:disabled?C.text3:fg,fontSize:13,fontWeight:600,fontFamily:F,...style}}>{children}</button>;
};
const Inp = ({label,value,onChange,placeholder,type="text",hint,required}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>{label}{required&&<span style={{color:C.danger}}> *</span>}</div>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1}}
      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
    {hint&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{hint}</div>}
  </div>
);
const Sel = ({label,value,onChange,options,hint}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>{label}</div>}
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:"white"}}>
      <option value="">— Select —</option>
      {(options||[]).map(o=><option key={typeof o==="string"?o:o.value} value={typeof o==="string"?o:o.value}>{typeof o==="string"?o:o.label}</option>)}
    </select>
    {hint&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{hint}</div>}
  </div>
);
const Txa = ({label,value,onChange,placeholder,rows=3,hint}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>{label}</div>}
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,resize:"vertical"}}
      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
    {hint&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{hint}</div>}
  </div>
);

// ── Step config editor ────────────────────────────────────────────────────────
function StepConfig({step, onChange}) {
  const cfg = step.config||{};
  const set = (k,v) => onChange({...cfg,[k]:v});
  if (step.type==="http_request") return <div>
    <Sel label="Method" value={cfg.method||"GET"} onChange={v=>set("method",v)} options={["GET","POST","PUT","PATCH","DELETE"]}/>
    <Inp label="URL" value={cfg.url} onChange={v=>set("url",v)} required placeholder="https://api.example.com/endpoint" hint="Supports {{variable}} templates"/>
    <Txa label="Headers (JSON)" value={cfg.headers?JSON.stringify(cfg.headers,null,2):""} onChange={v=>{try{set("headers",JSON.parse(v))}catch{}}} placeholder={'{"Authorization":"Bearer {{vars.token}}"}'} rows={2}/>
    <Txa label="Body (JSON)" value={cfg.body?JSON.stringify(cfg.body,null,2):""} onChange={v=>{try{set("body",JSON.parse(v))}catch{}}} placeholder={'{"email":"{{trigger.email}}"}'} rows={3}/>
    <Inp label="Integration credential slug (optional)" value={cfg.auth_slug} onChange={v=>set("auth_slug",v)} placeholder="slack, bamboohr..." hint="Auto-injects stored API credentials"/>
    <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Sel label="On error" value={cfg.on_error||"stop"} onChange={v=>set("on_error",v)} options={["stop","continue"]}/></div><div style={{flex:1}}><Inp label="Retries" value={cfg.retry_count||1} type="number" onChange={v=>set("retry_count",Number(v))}/></div></div>
  </div>;
  if (step.type==="notify") return <div>
    <Sel label="Provider" value={cfg.provider} onChange={v=>set("provider",v)} options={["slack","microsoft_teams"]}/>
    <Txa label="Message" value={cfg.message} onChange={v=>set("message",v)} required rows={3} placeholder="New application from {{trigger.name}}"/>
    <Inp label="Channel (optional)" value={cfg.channel} onChange={v=>set("channel",v)} placeholder="#recruiting-alerts"/>
  </div>;
  if (step.type==="ai_prompt") return <div>
    <Txa label="System prompt (optional)" value={cfg.system} onChange={v=>set("system",v)} rows={2}/>
    <Txa label="Prompt" value={cfg.prompt} onChange={v=>set("prompt",v)} required rows={4} placeholder="Summarise this candidate: {{trigger.data.summary}}"/>
    <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Inp label="Max tokens" value={cfg.max_tokens||500} type="number" onChange={v=>set("max_tokens",Number(v))}/></div><div style={{flex:1}}><Inp label="Store result as" value={cfg.store_as||"ai_output"} onChange={v=>set("store_as",v)}/></div></div>
  </div>;
  if (step.type==="find_record") return <div>
    <Inp label="Object slug" value={cfg.object_slug} onChange={v=>set("object_slug",v)} required placeholder="people, jobs..."/>
    <Inp label="Field API key" value={cfg.field} onChange={v=>set("field",v)} required placeholder="email, job_title..."/>
    <Sel label="Operator" value={cfg.operator||"eq"} onChange={v=>set("operator",v)} options={["eq","neq","contains","gt","lt","is_empty","is_not_empty"]}/>
    <Inp label="Value" value={cfg.value} onChange={v=>set("value",v)} required placeholder="{{trigger.email}}" hint="Supports {{}} templates"/>
    <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.multiple} onChange={e=>set("multiple",e.target.checked)}/> Return all matches</label>
  </div>;
  if (step.type==="create_record"||step.type==="update_record") return <div>
    {step.type==="create_record"&&<Inp label="Object slug" value={cfg.object_slug} onChange={v=>set("object_slug",v)} required placeholder="people, jobs..."/>}
    {step.type==="update_record"&&<Inp label="Record ID path" value={cfg.record_id_path} onChange={v=>set("record_id_path",v)} required placeholder="steps.find_step.record.id"/>}
    <Txa label="Field data (JSON)" rows={5} value={cfg.data?JSON.stringify(cfg.data,null,2):""} onChange={v=>{try{set("data",JSON.parse(v))}catch{}}} placeholder={'{"first_name":"{{trigger.first}}"}'} hint="Supports {{}} templates"/>
  </div>;
  if (step.type==="condition") return <div>
    <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:6}}>Conditions</div>
    {(cfg.conditions||[]).map((c,i)=>(
      <div key={i} style={{display:"flex",gap:6,alignItems:"flex-end",marginBottom:8,padding:8,background:"#F9FAFB",borderRadius:8}}>
        <div style={{flex:2}}><Inp label="Field path" value={c.field} onChange={v=>{const a=[...(cfg.conditions||[])];a[i]={...a[i],field:v};set("conditions",a);}} placeholder="trigger.status"/></div>
        <div style={{flex:1}}><Sel label="Op" value={c.operator||"eq"} onChange={v=>{const a=[...(cfg.conditions||[])];a[i]={...a[i],operator:v};set("conditions",a);}} options={["eq","neq","contains","gt","lt","is_empty","is_not_empty"]}/></div>
        <div style={{flex:2}}><Inp label="Value" value={c.value} onChange={v=>{const a=[...(cfg.conditions||[])];a[i]={...a[i],value:v};set("conditions",a);}} placeholder="Active"/></div>
        <button onClick={()=>set("conditions",(cfg.conditions||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,paddingBottom:16}}><Ic n="x" s={14}/></button>
      </div>
    ))}
    <Btn onClick={()=>set("conditions",[...(cfg.conditions||[]),{field:"",operator:"eq",value:""}])}><Ic n="plus" s={12}/>Add condition</Btn>
    <div style={{height:10}}/>
    <Sel label="Logic" value={cfg.logic||"and"} onChange={v=>set("logic",v)} options={["and","or"]}/>
    <Inp label="If true → step ID" value={cfg.next_true} onChange={v=>set("next_true",v)} placeholder="step_3"/>
    <Inp label="If false → step ID" value={cfg.next_false} onChange={v=>set("next_false",v)} placeholder="step_5"/>
  </div>;
  if (step.type==="delay") return <Inp label="Wait (seconds)" value={cfg.seconds||5} type="number" onChange={v=>set("seconds",Number(v))} hint="Max 60 seconds"/>;
  if (step.type==="set_variable") return <Txa label="Variables (JSON)" rows={4} value={cfg.variables?JSON.stringify(cfg.variables,null,2):""} onChange={v=>{try{set("variables",JSON.parse(v))}catch{}}} placeholder={'{"full_name":"{{trigger.first}} {{trigger.last}}"}'} hint="Reference as {{vars.full_name}}"/>;
  if (step.type==="transform") return <div>
    {(cfg.mappings||[]).map((m,i)=>(
      <div key={i} style={{display:"flex",gap:6,alignItems:"flex-end",marginBottom:6}}>
        <div style={{flex:2}}><Inp label="From" value={m.from} onChange={v=>{const a=[...(cfg.mappings||[])];a[i]={...a[i],from:v};set("mappings",a);}} placeholder="trigger.email"/></div>
        <div style={{flex:1}}><Sel label="Fn" value={m.transform||""} onChange={v=>{const a=[...(cfg.mappings||[])];a[i]={...a[i],transform:v};set("mappings",a);}} options={["","uppercase","lowercase","trim","to_number","iso_date"]}/></div>
        <div style={{flex:2}}><Inp label="To" value={m.to} onChange={v=>{const a=[...(cfg.mappings||[])];a[i]={...a[i],to:v};set("mappings",a);}} placeholder="mapped.email"/></div>
        <button onClick={()=>set("mappings",(cfg.mappings||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,paddingBottom:16}}><Ic n="x" s={14}/></button>
      </div>
    ))}
    <Btn onClick={()=>set("mappings",[...(cfg.mappings||[]),{from:"",to:"",transform:""}])}><Ic n="plus" s={12}/>Add mapping</Btn>
  </div>;
  return <div style={{color:C.text3,fontSize:13}}>No configuration needed.</div>;
}

// ── Trigger editor ────────────────────────────────────────────────────────────
function TriggerEditor({trigger,onChange}) {
  const t = trigger||{type:"manual"};
  const set = (k,v) => onChange({...t,[k]:v});
  return <div>
    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
      {Object.entries(TRIGGER_TYPES).map(([type,meta])=>(
        <button key={type} onClick={()=>onChange({type})} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:`2px solid ${t.type===type?meta.color:C.border}`,background:t.type===type?`${meta.color}12`:"white",color:t.type===type?meta.color:C.text2,fontWeight:t.type===type?700:500,fontSize:13,cursor:"pointer",fontFamily:F}}>
          <Ic n={meta.icon} s={13} c={t.type===type?meta.color:C.text3}/>{meta.label}
        </button>
      ))}
    </div>
    {t.type==="schedule"&&<div>
      <Inp label="Cron expression" value={t.cron} onChange={v=>set("cron",v)} required placeholder="0 9 * * 1-5" hint="e.g. every weekday at 9am"/>
      <Sel label="Timezone" value={t.timezone||"UTC"} onChange={v=>set("timezone",v)} options={["UTC","Asia/Dubai","Europe/London","America/New_York","Asia/Singapore"]}/>
    </div>}
    {t.type==="webhook"&&<div style={{padding:"10px 14px",background:"#EFF6FF",borderRadius:8,border:"1px solid #BFDBFE",fontSize:12,color:"#1E40AF",marginBottom:10}}>
      <div style={{fontWeight:700,marginBottom:4}}>Webhook URL (after saving)</div>
      <code style={{background:"#DBEAFE",padding:"2px 6px",borderRadius:4}}>/api/flows/webhook/&#123;flow_id&#125;</code>
    </div>}
    {t.type==="event"&&<Sel label="Vercentic Event" value={t.event_type} onChange={v=>set("event_type",v)} options={EVENTS} hint="Fires when this event occurs in Vercentic"/>}
  </div>;
}

// ── Flow editor modal ─────────────────────────────────────────────────────────
function FlowEditor({flow,environment,onSave,onClose}) {
  const isNew = !flow?.id;
  const [name,setName]       = useState(flow?.name||"");
  const [desc,setDesc]       = useState(flow?.description||"");
  const [trigger,setTrigger] = useState(flow?.trigger||{type:"manual"});
  const [steps,setSteps]     = useState(flow?.steps||[]);
  const [enabled,setEnabled] = useState(flow?.enabled||false);
  const [tab,setTab]         = useState("trigger");
  const [activeStep,setActive] = useState(null);
  const [saving,setSaving]   = useState(false);
  const [error,setError]     = useState(null);

  const addStep = type => {
    const id = `step_${Date.now()}`;
    setSteps(s=>[...s,{id,type,name:STEP_TYPES[type]?.label||type,config:{},enabled:true,on_error:"stop"}]);
    setActive(id); setTab("steps");
  };
  const updStep = (id,u) => setSteps(s=>s.map(st=>st.id===id?{...st,...u}:st));
  const delStep = id => { setSteps(s=>s.filter(st=>st.id!==id)); setActive(null); };
  const moveStep = (id,dir) => {
    const a=[...steps], i=a.findIndex(s=>s.id===id), j=i+dir;
    if(j<0||j>=a.length) return;
    [a[i],a[j]]=[a[j],a[i]]; setSteps(a);
  };

  async function save() {
    if(!name.trim()){setError("Flow name is required");return;}
    setSaving(true); setError(null);
    const payload={name,description:desc,trigger,steps,enabled,environment_id:environment?.id};
    const r = isNew ? await api.post("/flows",payload) : await api.patch(`/flows/${flow.id}`,payload);
    setSaving(false);
    if(r.error){setError(r.errors?r.errors.join(", "):r.error);return;}
    onSave(r);
  }

  const active = steps.find(s=>s.id===activeStep);
  return (
    <div style={{position:"fixed",inset:0,zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.45)"}}>
      <div style={{background:"#fff",borderRadius:18,width:"min(940px,95vw)",height:"min(700px,92vh)",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,.3)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 20px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{flex:1}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Flow name…" style={{fontSize:17,fontWeight:700,border:"none",outline:"none",fontFamily:F,color:C.text1,width:"100%",background:"transparent"}}/>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" style={{fontSize:12,border:"none",outline:"none",fontFamily:F,color:C.text3,width:"100%",background:"transparent",marginTop:1}}/>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.text2,cursor:"pointer"}}>
            <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enabled
          </label>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving?"Saving…":isNew?"Create Flow":"Save Changes"}</Btn>
        </div>
        {error&&<div style={{padding:"8px 20px",background:"#FEF2F2",borderBottom:`1px solid #FECACA`,fontSize:13,color:C.danger}}>{error}</div>}
        {/* Tabs */}
        <div style={{display:"flex",padding:"0 20px",borderBottom:`1px solid ${C.border}`}}>
          {[["trigger","Trigger"],["steps",`Steps (${steps.length})`]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"9px 16px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.text3,fontFamily:F,borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`,marginBottom:-1}}>{label}</button>
          ))}
        </div>
        {/* Body */}
        <div style={{flex:1,overflow:"hidden",display:"flex"}}>
          {tab==="trigger"&&<div style={{flex:1,overflowY:"auto",padding:20}}><TriggerEditor trigger={trigger} onChange={setTrigger}/></div>}
          {tab==="steps"&&<div style={{display:"flex",flex:1,overflow:"hidden"}}>
            {/* Step list */}
            <div style={{width:250,borderRight:`1px solid ${C.border}`,overflowY:"auto",padding:"10px 0"}}>
              <div style={{padding:"0 10px 6px",fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase"}}>Add Step</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"0 10px 10px"}}>
                {Object.entries(STEP_TYPES).map(([type,meta])=>(
                  <button key={type} onClick={()=>addStep(type)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:6,border:`1px solid ${meta.color}28`,background:`${meta.color}10`,color:meta.color,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                    <Ic n={meta.icon} s={11} c={meta.color}/>{meta.label}
                  </button>
                ))}
              </div>
              {steps.length>0&&<div style={{padding:"0 10px 6px",fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase"}}>Steps</div>}
              {steps.map((s,i)=>{
                const m=STEP_TYPES[s.type]||{};
                return <div key={s.id} onClick={()=>setActive(s.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",cursor:"pointer",background:s.id===activeStep?`${m.color}12`:"transparent",borderLeft:`3px solid ${s.id===activeStep?m.color:"transparent"}`}}>
                  <div style={{width:22,height:22,borderRadius:6,background:`${m.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:m.color}}>{i+1}</span></div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div><div style={{fontSize:11,color:m.color}}>{m.label}</div></div>
                  <div style={{display:"flex",gap:1}}>
                    {i>0&&<button onClick={e=>{e.stopPropagation();moveStep(s.id,-1);}} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:1}}>▲</button>}
                    {i<steps.length-1&&<button onClick={e=>{e.stopPropagation();moveStep(s.id,1);}} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:1}}>▼</button>}
                    <button onClick={e=>{e.stopPropagation();delStep(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,padding:1}}><Ic n="x" s={12}/></button>
                  </div>
                </div>;
              })}
            </div>
            {/* Step config */}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {active?<div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{width:30,height:30,borderRadius:8,background:`${(STEP_TYPES[active.type]||{}).color||C.accent}20`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ic n={(STEP_TYPES[active.type]||{}).icon||"code"} s={15} c={(STEP_TYPES[active.type]||{}).color||C.accent}/>
                  </div>
                  <div>
                    <input value={active.name} onChange={e=>updStep(active.id,{name:e.target.value})} style={{fontSize:14,fontWeight:700,border:"none",outline:"none",fontFamily:F,color:C.text1,background:"transparent"}}/>
                    <div style={{fontSize:10,color:C.text3}}>Reference as <code>{"{{steps."+active.id+".*}}"}</code></div>
                  </div>
                </div>
                <StepConfig step={active} onChange={cfg=>updStep(active.id,{config:cfg})}/>
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                  <Sel label="On error" value={active.on_error||"stop"} onChange={v=>updStep(active.id,{on_error:v})} options={[{value:"stop",label:"Stop and fail"},{value:"continue",label:"Log and continue"}]}/>
                </div>
              </div>:<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.text3}}><Ic n="activity" s={36} c={C.border}/><div style={{marginTop:10,fontSize:13}}>Select a step to configure it</div></div>}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ── Run log panel ─────────────────────────────────────────────────────────────
function RunLog({flowId,onClose}) {
  const [runs,setRuns]   = useState([]);
  const [sel,setSel]     = useState(null);
  const [loading,setLoading] = useState(true);
  const load = useCallback(async()=>{setLoading(true);const d=await api.get(`/flows/${flowId}/runs?limit=30`);setRuns(d.runs||[]);setLoading(false);},[flowId]);
  useEffect(()=>{load();},[load]);
  const rel = dt=>{const d=Date.now()-new Date(dt).getTime();return d<60000?`${Math.round(d/1000)}s ago`:d<3600000?`${Math.round(d/60000)}m ago`:new Date(dt).toLocaleTimeString();};
  return (
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",background:"rgba(0,0,0,.25)",paddingTop:56}}>
      <div style={{width:500,height:"calc(100vh - 56px)",background:"#fff",borderRadius:"14px 0 0 0",boxShadow:"-6px 0 30px rgba(0,0,0,.12)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text1}}>Run History</div><div style={{fontSize:11,color:C.text3}}>{runs.length} recent runs</div></div>
          <button onClick={load} style={{background:"none",border:"none",cursor:"pointer",marginRight:6,color:C.text3}}><Ic n="refresh" s={15}/></button>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={17}/></button>
        </div>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{width:200,borderRight:`1px solid ${C.border}`,overflowY:"auto"}}>
            {loading&&<div style={{padding:16,color:C.text3,fontSize:12}}>Loading…</div>}
            {runs.map(r=>(
              <div key={r.id} onClick={()=>setSel(r)} style={{padding:"9px 12px",cursor:"pointer",borderLeft:`3px solid ${r.ok?C.success:C.danger}`,background:sel?.id===r.id?"#F9FAFB":"transparent",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:r.ok?C.success:C.danger}}/><span style={{fontSize:12,fontWeight:600,color:C.text1}}>{r.ok?"Success":"Failed"}</span><span style={{marginLeft:"auto",fontSize:10,background:"#F3F4F6",padding:"1px 5px",borderRadius:4,color:C.text3}}>{r.trigger_type}</span></div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{rel(r.started_at)} · {r.duration_ms}ms</div>
                {r.error&&<div style={{fontSize:10,color:C.danger,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.error}</div>}
              </div>
            ))}
            {!loading&&runs.length===0&&<div style={{padding:20,color:C.text3,fontSize:12,textAlign:"center"}}>No runs yet</div>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:14}}>
            {sel?<div>
              <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,background:sel.ok?"#D1FAE5":"#FEE2E2",color:sel.ok?C.success:C.danger}}>{sel.ok?"✓ Success":"✗ Failed"}</span>
                <span style={{fontSize:11,color:C.text3}}>{sel.duration_ms}ms · {sel.trigger_type}</span>
              </div>
              {sel.error&&<div style={{padding:"7px 10px",background:"#FEF2F2",borderRadius:7,fontSize:12,color:C.danger,marginBottom:10}}>{sel.error}</div>}
              {(sel.steps||[]).map((s,i)=>(
                <div key={i} style={{marginBottom:7,padding:"7px 9px",borderRadius:7,border:`1px solid ${s.ok?C.border:"#FECACA"}`,background:s.ok?"#F9FAFB":"#FEF2F2"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:s.ok?C.success:C.danger}}/><span style={{fontSize:11,fontWeight:600,color:C.text1}}>{s.step_name}</span><span style={{fontSize:10,color:C.text3,marginLeft:"auto"}}>{s.duration_ms}ms</span></div>
                  {s.error&&<div style={{fontSize:11,color:C.danger,marginTop:3}}>{s.error}</div>}
                  {s.output&&!s.error&&<pre style={{fontSize:10,color:C.text2,marginTop:3,overflow:"auto",maxHeight:60,background:"#F3F4F6",padding:5,borderRadius:4}}>{JSON.stringify(s.output,null,2)}</pre>}
                </div>
              ))}
            </div>:<div style={{color:C.text3,fontSize:12,textAlign:"center",paddingTop:40}}>Select a run to see details</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FlowBuilder({environment}) {
  const [flows,setFlows]   = useState([]);
  const [stats,setStats]   = useState(null);
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState(null);
  const [runLog,setRunLog]   = useState(null);
  const [search,setSearch]   = useState("");
  const [running,setRunning] = useState({});
  const envId = environment?.id;

  const load = useCallback(async()=>{
    if(!envId)return; setLoading(true);
    const [fd,sd]=await Promise.all([api.get(`/flows?environment_id=${envId}`),api.get(`/flows/stats/overview?environment_id=${envId}`)]);
    setFlows(Array.isArray(fd)?fd:[]); setStats(sd); setLoading(false);
  },[envId]);
  useEffect(()=>{load();},[load]);

  const toggle = async f=>{await api.post(`/flows/${f.id}/enable`,{enabled:!f.enabled});setFlows(fs=>fs.map(x=>x.id===f.id?{...x,enabled:!f.enabled}:x));};
  const del    = async f=>{if(!window.confirm(`Delete "${f.name}"?`))return;await api.delete(`/flows/${f.id}`);setFlows(fs=>fs.filter(x=>x.id!==f.id));};
  const run    = async f=>{setRunning(r=>({...r,[f.id]:true}));await api.post(`/flows/${f.id}/run`,{payload:{_test:true}});setRunning(r=>({...r,[f.id]:false}));load();};
  const copy   = f=>{const u=`${window.location.origin}/api/flows/webhook/${f.id}`;navigator.clipboard?.writeText(u);};

  const rel = dt=>{if(!dt)return"Never";const d=Date.now()-new Date(dt).getTime();return d<60000?`${Math.round(d/1000)}s ago`:d<3600000?`${Math.round(d/60000)}m ago`:d<86400000?`${Math.round(d/3600000)}h ago`:new Date(dt).toLocaleDateString();};
  const filtered = flows.filter(f=>!search||f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{fontFamily:F,color:C.text1}}>
      {/* Stats */}
      {stats&&<div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {[{l:"Total",v:stats.total_flows,c:C.accent},{l:"Enabled",v:stats.enabled_flows,c:C.success},{l:"Scheduled",v:stats.scheduled_flows,c:"#3B82F6"},{l:"Webhooks",v:stats.webhook_flows,c:"#10B981"},{l:"Runs (24h)",v:stats.runs_last_24h,c:C.text2},{l:"Success %",v:stats.success_rate_24h!=null?`${stats.success_rate_24h}%`:"–",c:stats.success_rate_24h>=90?C.success:C.warning},{l:"Errors (24h)",v:stats.errors_last_24h,c:stats.errors_last_24h>0?C.danger:C.text3}].map(s=>(
          <div key={s.l} style={{background:C.surface,borderRadius:10,padding:"10px 16px",minWidth:90,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.v??"-"}</div>
            <div style={{fontSize:10,color:C.text3,fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>}
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search flows…" style={{flex:1,maxWidth:280,padding:"7px 10px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none"}}/>
        <button onClick={load} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="refresh" s={15}/></button>
        <Btn variant="primary" onClick={()=>setEditing("new")}><Ic n="plus" s={13}/>New Flow</Btn>
      </div>
      {/* Flow list */}
      {loading?<div style={{textAlign:"center",padding:40,color:C.text3}}>Loading…</div>
       :filtered.length===0?<div style={{textAlign:"center",padding:50}}>
          <Ic n="activity" s={44} c={C.border}/>
          <div style={{marginTop:12,fontSize:15,fontWeight:700,color:C.text1}}>No flows yet</div>
          <div style={{color:C.text3,marginBottom:16,fontSize:13,marginTop:6}}>Automate syncs, notifications, and AI tasks between Vercentic and external systems</div>
          <Btn variant="primary" onClick={()=>setEditing("new")}><Ic n="plus" s={13}/>Create your first flow</Btn>
        </div>
       :<div style={{display:"flex",flexDirection:"column",gap:9}}>
          {filtered.map(f=>{
            const tm=TRIGGER_TYPES[f.trigger?.type]||TRIGGER_TYPES.manual;
            return <div key={f.id} style={{background:C.surface,borderRadius:12,padding:"14px 18px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:38,height:38,borderRadius:9,background:`${tm.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n={tm.icon} s={17} c={tm.color}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{f.name}</span>
                  <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:600,background:`${tm.color}15`,color:tm.color}}>{tm.label}</span>
                  {f.trigger?.cron&&<span style={{padding:"2px 7px",borderRadius:99,fontSize:10,background:"#F3F4F6",color:C.text3,fontFamily:"monospace"}}>{f.trigger.cron}</span>}
                  {!f.enabled&&<span style={{padding:"2px 7px",borderRadius:99,fontSize:10,background:"#F3F4F6",color:C.text3}}>Disabled</span>}
                  {f.last_run_ok===false&&<span style={{padding:"2px 7px",borderRadius:99,fontSize:10,background:"#FEE2E2",color:C.danger}}>Last run failed</span>}
                </div>
                {f.description&&<div style={{fontSize:12,color:C.text3,marginTop:1}}>{f.description}</div>}
                <div style={{fontSize:11,color:C.text3,marginTop:3,display:"flex",gap:10}}>
                  <span>{f.step_count||0} steps</span><span>{f.run_count||0} runs</span><span>Last: {rel(f.last_run_at)}</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <button onClick={()=>toggle(f)} style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${C.border}`,background:f.enabled?C.success:"#F3F4F6",color:f.enabled?"white":C.text3,cursor:"pointer",fontSize:11,fontWeight:600}}>{f.enabled?"ON":"OFF"}</button>
                <Btn onClick={()=>run(f)} disabled={running[f.id]} style={{padding:"5px 10px",fontSize:12}}>{running[f.id]?"…":"▶ Run"}</Btn>
                {f.trigger?.type==="webhook"&&<button onClick={()=>copy(f)} title="Copy webhook URL" style={{padding:"5px 7px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer",color:C.text3}}><Ic n="copy" s={13}/></button>}
                <button onClick={()=>setRunLog(f.id)} title="Run history" style={{padding:"5px 7px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer",color:C.text3}}><Ic n="activity" s={13}/></button>
                <button onClick={()=>setEditing(f)} style={{padding:"5px 7px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer",color:C.text3}}><Ic n="edit" s={13}/></button>
                <button onClick={()=>del(f)} style={{padding:"5px 7px",borderRadius:7,border:"none",background:"none",cursor:"pointer",color:C.danger}}><Ic n="trash" s={13}/></button>
              </div>
            </div>;
          })}
        </div>}
      {editing&&<FlowEditor flow={editing==="new"?null:editing} environment={environment} onSave={()=>{setEditing(null);load();}} onClose={()=>setEditing(null)}/>}
      {runLog&&<RunLog flowId={runLog} onClose={()=>setRunLog(null)}/>}
    </div>
  );
}
