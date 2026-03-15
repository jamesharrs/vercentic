import { useState, useEffect } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", red:"#EF4444", purple:"#7C3AED",
};

const api = {
  get: p => fetch(`/api${p}`).then(r => r.json()),
  post: (p, b) => fetch(`/api${p}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json()),
  put: (p, b) => fetch(`/api${p}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json()),
  del: p => fetch(`/api${p}`, { method:"DELETE" }).then(r => r.json()),
};

const PORTAL_TYPES = [
  { id:"career_site",    label:"Career Site",          icon:"globe",     color:C.accent,  desc:"Public job listings & branded application experience" },
  { id:"hm_portal",      label:"Hiring Manager Portal",icon:"briefcase", color:C.purple,  desc:"Req review, interview feedback & candidate scorecards" },
  { id:"agency_portal",  label:"Agency Portal",        icon:"users",     color:C.amber,   desc:"Vendor submission portal with pipeline visibility" },
  { id:"onboarding",     label:"Onboarding Portal",    icon:"rocket",    color:C.green,   desc:"Post-offer candidate journey & document collection" },
];

const Ic = ({ n, s=16, c="currentColor" }) => {
  const paths = {
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    copy:"M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
    check:"M20 6L9 17l-5-5", globe:"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    arrowL:"M19 12H5M12 19l-7-7 7-7",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={paths[n]||""}/></svg>;
};

const Btn = ({ children, onClick, v="primary", icon, disabled, style={} }) => {
  const base = { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"none", cursor:disabled?"not-allowed":"pointer", fontSize:13, fontWeight:700, fontFamily:F, transition:"all .15s", opacity:disabled?0.5:1, ...style };
  const variants = {
    primary:   { background:C.accent, color:"white" },
    secondary: { background:"transparent", color:C.text2, border:`1.5px solid ${C.border}` },
    danger:    { background:"#FEF2F2", color:C.red, border:`1.5px solid #FECACA` },
    ghost:     { background:"transparent", color:C.text2 },
    success:   { background:"#ECFDF5", color:C.green, border:`1.5px solid #A7F3D0` },
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...variants[v]}}>{icon&&<Ic n={icon} s={13} c={variants[v].color}/>}{children}</button>;
};

const Input = ({ label, value, onChange, placeholder, type="text", help }) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}</label>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,outline:"none",background:C.surface,width:"100%",boxSizing:"border-box"}}
      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
    {help&&<span style={{fontSize:11,color:C.text3}}>{help}</span>}
  </div>
);

const Modal = ({ title, onClose, children, width=560 }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(3px)"}}>
    <div style={{background:C.surface,borderRadius:18,width,maxWidth:"95vw",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:800,color:C.text1}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",padding:4}}><Ic n="x" s={16}/></button>
      </div>
      <div style={{padding:"24px"}}>{children}</div>
    </div>
  </div>
);

const Badge = ({ children, color=C.accent }) => (
  <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,background:`${color}18`,color}}>{children}</span>
);

const StatusDot = ({ status }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:600,
    color:status==="published"?C.green:C.amber}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:status==="published"?C.green:C.amber,display:"inline-block"}}/>
    {status==="published"?"Live":"Draft"}
  </span>
);

// ── Create Portal wizard ──────────────────────────────────────────────────────
const CreatePortalModal = ({ environment, onCreated, onClose }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    type:"career_site", name:"", branding:{ primary_color:"#4361EE", bg_color:"#F8FAFF", company_name:"", tagline:"", font:"DM Sans" },
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const setBranding = (k, v) => setForm(f => ({...f, branding:{...f.branding, [k]:v}}));

  const handleCreate = async () => {
    setSaving(true);
    const portal = await api.post("/portals", { ...form, environment_id: environment.id });
    setSaving(false);
    onCreated(portal);
  };

  const chosen = PORTAL_TYPES.find(t => t.id === form.type);

  return (
    <Modal title="Create New Portal" onClose={onClose} width={600}>
      {/* Steps */}
      <div style={{display:"flex",gap:0,marginBottom:24,background:"#F5F7FF",borderRadius:12,padding:4}}>
        {["Portal Type","Name & Branding"].map((s,i)=>(
          <div key={i} onClick={()=>i<step-1&&setStep(i+1)} style={{flex:1,textAlign:"center",padding:"8px 0",borderRadius:9,cursor:i<step-1?"pointer":"default",
            background:step===i+1?C.surface:"transparent",boxShadow:step===i+1?"0 1px 4px rgba(0,0,0,0.08)":"none",
            fontSize:12,fontWeight:step===i+1?700:500,color:step===i+1?C.text1:C.text3,transition:"all .15s"}}>
            <span style={{marginRight:6,color:step>i+1?C.green:step===i+1?C.accent:C.text3}}>{step>i+1?"✓":i+1}</span>{s}
          </div>
        ))}
      </div>

      {step===1 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {PORTAL_TYPES.map(pt => (
            <div key={pt.id} onClick={()=>set("type",pt.id)} style={{padding:"18px 16px",borderRadius:14,border:`2px solid ${form.type===pt.id?pt.color:C.border}`,cursor:"pointer",background:form.type===pt.id?`${pt.color}08`:C.surface,transition:"all .15s"}}>
              <div style={{fontSize:28,marginBottom:10}}>{pt.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:4}}>{pt.label}</div>
              <div style={{fontSize:12,color:C.text3,lineHeight:1.5}}>{pt.desc}</div>
            </div>
          ))}
          <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"flex-end",marginTop:8}}>
            <Btn onClick={()=>setStep(2)}>Continue →</Btn>
          </div>
        </div>
      )}

      {step===2 && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:"12px 16px",borderRadius:12,background:`${chosen.color}0D`,border:`1px solid ${chosen.color}30`,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{chosen.icon}</span>
            <div><div style={{fontSize:13,fontWeight:700,color:C.text1}}>{chosen.label}</div><div style={{fontSize:11,color:C.text3}}>{chosen.desc}</div></div>
          </div>
          <Input label="Portal Name *" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Global Careers Site"/>
          <Input label="Company Name" value={form.branding.company_name} onChange={v=>setBranding("company_name",v)} placeholder="e.g. Acme Corp"/>
          <Input label="Tagline" value={form.branding.tagline} onChange={v=>setBranding("tagline",v)} placeholder="e.g. Find your next opportunity"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Primary Colour</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="color" value={form.branding.primary_color} onChange={e=>setBranding("primary_color",e.target.value)} style={{width:36,height:36,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
                <span style={{fontSize:12,color:C.text2,fontFamily:"monospace"}}>{form.branding.primary_color}</span>
              </div>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Background Colour</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="color" value={form.branding.bg_color} onChange={e=>setBranding("bg_color",e.target.value)} style={{width:36,height:36,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
                <span style={{fontSize:12,color:C.text2,fontFamily:"monospace"}}>{form.branding.bg_color}</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:8}}>
            <Btn v="secondary" onClick={()=>setStep(1)}>← Back</Btn>
            <Btn onClick={handleCreate} disabled={!form.name||saving}>{saving?"Creating…":"Create Portal"}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Portal Editor (branding + config + preview) ───────────────────────────────
const PortalEditor = ({ portal, objects, onSave, onClose }) => {
  const [tab, setTab] = useState("branding");
  const [form, setForm] = useState({ ...portal });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const setBr = (k, v) => setForm(f => ({...f, branding:{...f.branding,[k]:v}}));
  const setCfg = (k, v) => setForm(f => ({...f, config:{...f.config,[k]:v}}));

  const pt = PORTAL_TYPES.find(t => t.id === portal.type);

  const embedSnippet = `<script src="http://localhost:3001/portal.js" data-portal="${portal.access_token}"></script>`;
  const portalUrl = `http://localhost:5173/?portal=${portal.access_token}`;

  const handleSave = async () => {
    setSaving(true);
    const updated = await api.put(`/portals/${portal.id}`, form);
    setSaving(false);
    onSave(updated);
  };

  const handlePublish = async () => {
    const updated = await api.post(`/portals/${portal.id}/publish`, {});
    onSave(updated);
    setForm(updated);
  };

  const copyText = text => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false), 2000); };

  const TABS = ["branding","config","access","preview"];

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",fontFamily:F}}>
      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,flexShrink:0}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.text3,fontSize:13,fontWeight:600,padding:0}}>
          <Ic n="arrowL" s={15}/> Portals
        </button>
        <div style={{width:1,height:24,background:C.border}}/>
        <span style={{fontSize:22}}>{pt?.icon}</span>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text1}}>{form.name}</div>
          <div style={{fontSize:11,color:C.text3}}>{pt?.label}</div>
        </div>
        <StatusDot status={form.status}/>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <Btn v="secondary" onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save Changes"}</Btn>
          <Btn v={form.status==="published"?"danger":"success"} onClick={handlePublish}>
            {form.status==="published"?"Unpublish":"Publish Portal"}
          </Btn>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",gap:0}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"12px 18px",border:"none",borderBottom:`2px solid ${tab===t?C.accent:"transparent"}`,background:"transparent",cursor:"pointer",fontSize:13,fontWeight:tab===t?700:500,color:tab===t?C.accent:C.text3,fontFamily:F,textTransform:"capitalize",transition:"all .15s"}}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflow:"auto",padding:"28px 32px",maxWidth:760,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>

        {tab==="branding" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:C.text1}}>Branding & Identity</h3>
            <Input label="Portal Name" value={form.name} onChange={v=>set("name",v)}/>
            <Input label="Company Name" value={form.branding?.company_name} onChange={v=>setBr("company_name",v)} placeholder="Shown in portal header"/>
            <Input label="Tagline" value={form.branding?.tagline} onChange={v=>setBr("tagline",v)} placeholder="e.g. Build your career with us"/>
            <Input label="Logo URL" value={form.branding?.logo_url} onChange={v=>setBr("logo_url",v)} placeholder="https://..."/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[["primary_color","Primary Colour"],["bg_color","Background Colour"],["text_color","Text Colour"],["button_color","Button Colour"]].map(([k,lbl])=>(
                <div key={k}>
                  <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>{lbl}</label>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,background:C.surface}}>
                    <input type="color" value={form.branding?.[k]||"#4361EE"} onChange={e=>setBr(k,e.target.value)} style={{width:28,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:0,flexShrink:0}}/>
                    <span style={{fontSize:12,fontFamily:"monospace",color:C.text2}}>{form.branding?.[k]||"#4361EE"}</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Font</label>
              <select value={form.branding?.font||"DM Sans"} onChange={e=>setBr("font",e.target.value)}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:C.surface}}>
                {["DM Sans","Inter","Plus Jakarta Sans","Roboto","Open Sans"].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        )}

        {tab==="config" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:C.text1}}>Portal Configuration</h3>
            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {[
                {k:"show_apply_button",  label:"Show Apply Button",    desc:"Display apply CTA on job listings"},
                {k:"require_auth",       label:"Require Login",        desc:"Candidates must create an account to apply"},
                {k:"show_salary",        label:"Show Salary Range",    desc:"Display compensation fields on job cards"},
                {k:"allow_cv_upload",    label:"Allow CV Upload",      desc:"Let candidates attach their resume"},
                {k:"show_team_info",     label:"Show Team Section",    desc:"Display team or department information"},
              ].map((item,i,arr)=>(
                <div key={item.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{item.label}</div>
                    <div style={{fontSize:11,color:C.text3}}>{item.desc}</div>
                  </div>
                  <button onClick={()=>setCfg(item.k,!form.config?.[item.k])} style={{width:44,height:24,borderRadius:99,border:"none",cursor:"pointer",background:form.config?.[item.k]?C.accent:C.border,position:"relative",transition:"background .2s",flexShrink:0}}>
                    <span style={{position:"absolute",top:2,left:form.config?.[item.k]?22:2,width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:8}}>Exposed Objects</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {objects.map(o=>{
                  const allowed = form.config?.allowed_objects||[];
                  const on = allowed.includes(o.slug);
                  return (
                    <div key={o.id} onClick={()=>setCfg("allowed_objects",on?allowed.filter(s=>s!==o.slug):[...allowed,o.slug])}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentLight:C.surface,cursor:"pointer",transition:"all .15s"}}>
                      <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?C.accent:C.border}`,background:on?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {on&&<Ic n="check" s={11} c="white"/>}
                      </div>
                      <div style={{width:10,height:10,borderRadius:"50%",background:o.color||C.accent,flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.text1}}>{o.plural_name||o.name}</span>
                      <span style={{fontSize:11,color:C.text3,marginLeft:"auto"}}>{o.slug}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab==="access" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:C.text1}}>Access & Embed</h3>

            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4}}>Portal URL</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:12}}>Share this URL to give access to the portal</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1,padding:"9px 12px",borderRadius:9,background:"#F5F7FF",border:`1px solid ${C.border}`,fontSize:12,fontFamily:"monospace",color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {portalUrl}
                </div>
                <Btn v="secondary" icon="copy" onClick={()=>copyText(portalUrl)}>{copied?"Copied!":"Copy"}</Btn>
              </div>
            </div>

            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4}}>Embed Snippet</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:12}}>Drop this into any webpage to embed the portal inline</div>
              <div style={{padding:"12px",borderRadius:9,background:"#0F1729",marginBottom:12}}>
                <code style={{fontSize:11,color:"#a5f3fc",fontFamily:"monospace",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{embedSnippet}</code>
              </div>
              <Btn v="secondary" icon="copy" onClick={()=>copyText(embedSnippet)}>Copy Snippet</Btn>
            </div>

            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4}}>Access Token</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:12}}>Used to authenticate API requests from the portal renderer</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1,padding:"9px 12px",borderRadius:9,background:"#F5F7FF",border:`1px solid ${C.border}`,fontSize:11,fontFamily:"monospace",color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {portal.access_token}
                </div>
                <Btn v="secondary" icon="copy" onClick={()=>copyText(portal.access_token)}>Copy</Btn>
              </div>
              <button onClick={async()=>{const u=await api.post(`/portals/${portal.id}/regenerate-token`,{});onSave(u);}}
                style={{marginTop:12,background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.red,fontFamily:F,fontWeight:600,padding:0}}>
                ↻ Regenerate Token
              </button>
            </div>
          </div>
        )}

        {tab==="preview" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:C.text1}}>Portal Preview</h3>
            <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 4px 20px rgba(67,97,238,0.1)"}}>
              <div style={{background:"#1E1E2E",padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:5}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
                <div style={{flex:1,background:"#2D2D3F",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#888",fontFamily:"monospace",textAlign:"center"}}>{portalUrl}</div>
              </div>
              <PortalPreview portal={form}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── In-app portal preview renderer ───────────────────────────────────────────
const PortalPreview = ({ portal }) => {
  const br = portal.branding || {};
  const pc = br.primary_color || "#4361EE";
  const bg = br.bg_color || "#F8FAFF";
  const font = br.font || "DM Sans";
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    api.get(`/records?environment_id=${portal.environment_id}&limit=6`).then(d => {
      setJobs((d.records||[]).slice(0,4));
    }).catch(()=>{});
  }, [portal.environment_id]);

  if (portal.type === "career_site") return (
    <div style={{background:bg,fontFamily:`'${font}', sans-serif`,minHeight:480}}>
      <div style={{background:pc,padding:"28px 32px",color:"white"}}>
        {br.logo_url&&<img src={br.logo_url} alt="logo" style={{height:36,marginBottom:12,objectFit:"contain"}}/>}
        <h1 style={{margin:"0 0 6px",fontSize:24,fontWeight:800}}>{br.company_name||"Company Name"}</h1>
        <p style={{margin:0,opacity:0.85,fontSize:14}}>{br.tagline||"Find your next opportunity"}</p>
      </div>
      <div style={{padding:"24px 32px"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#4B5675",marginBottom:16}}>Open Positions</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {jobs.length===0&&[1,2,3].map(i=>(
            <div key={i} style={{background:"white",borderRadius:12,padding:"16px",border:"1px solid #E8ECF8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{width:140+i*30,height:12,background:"#E8ECF8",borderRadius:4,marginBottom:6}}/><div style={{width:80,height:10,background:"#F0F2FA",borderRadius:4}}/></div>
              <div style={{width:60,height:28,borderRadius:8,background:pc,opacity:0.15}}/>
            </div>
          ))}
          {jobs.map(j=>(
            <div key={j.id} style={{background:"white",borderRadius:12,padding:"16px",border:"1px solid #E8ECF8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#0F1729",marginBottom:3}}>{j.data?.job_title||j.data?.name||"Open Role"}</div>
                <div style={{fontSize:11,color:"#9DA8C7"}}>{j.data?.department||"Department"} · {j.data?.work_type||"Full-time"}</div>
              </div>
              <div style={{padding:"6px 14px",borderRadius:8,background:pc,color:"white",fontSize:12,fontWeight:700}}>Apply</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (portal.type === "hm_portal") return (
    <div style={{background:bg,fontFamily:`'${font}', sans-serif`,minHeight:480}}>
      <div style={{background:"#1E2235",padding:"20px 28px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:pc,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:16}}>H</div>
        <div style={{color:"white",fontSize:14,fontWeight:700}}>Hiring Manager Portal{br.company_name?` · ${br.company_name}`:""}</div>
      </div>
      <div style={{padding:"24px 28px"}}>
        {[{label:"Pending Reviews",v:3,c:"#F79009"},{label:"Interviews Today",v:2,c:pc},{label:"Offers Out",v:1,c:"#0CAF77"}].map(s=>(
          <div key={s.label} style={{display:"inline-flex",flexDirection:"column",padding:"14px 20px",borderRadius:12,background:"white",border:"1px solid #E8ECF8",marginRight:10,marginBottom:10}}>
            <span style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</span>
            <span style={{fontSize:11,color:"#9DA8C7"}}>{s.label}</span>
          </div>
        ))}
        <div style={{marginTop:8,fontSize:13,fontWeight:700,color:"#4B5675",marginBottom:10}}>My Open Requisitions</div>
        {[1,2].map(i=>(
          <div key={i} style={{background:"white",borderRadius:10,padding:"12px 16px",border:"1px solid #E8ECF8",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
            <div style={{width:160,height:11,background:"#E8ECF8",borderRadius:4}}/>
            <div style={{width:50,height:11,background:`${pc}30`,borderRadius:4}}/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{background:bg,fontFamily:`'${font}', sans-serif`,minHeight:480,padding:"32px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>{PORTAL_TYPES.find(t=>t.id===portal.type)?.icon}</div>
        <div style={{fontSize:16,fontWeight:700,color:"#0F1729",marginBottom:4}}>{PORTAL_TYPES.find(t=>t.id===portal.type)?.label}</div>
        <div style={{fontSize:13,color:"#9DA8C7"}}>{br.company_name||"Your Company"}</div>
      </div>
    </div>
  );
};

// ── Main Portals list view ────────────────────────────────────────────────────
export default function Portals({ environment }) {
  const [portals, setPortals] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (environment?.id) load(); }, [environment?.id]);

  const load = async () => {
    setLoading(true);
    const [p, o] = await Promise.all([
      api.get(`/portals?environment_id=${environment.id}`),
      api.get(`/objects?environment_id=${environment.id}`),
    ]);
    setPortals(Array.isArray(p) ? p : []);
    setObjects(Array.isArray(o) ? o : []);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this portal?")) return;
    await api.del(`/portals/${id}`);
    setPortals(ps => ps.filter(p => p.id !== id));
  };

  const handlePublish = async (portal) => {
    const updated = await api.post(`/portals/${portal.id}/publish`, {});
    setPortals(ps => ps.map(p => p.id === updated.id ? updated : p));
  };

  if (editing) return (
    <PortalEditor
      portal={editing}
      objects={objects}
      onSave={updated => { setPortals(ps => ps.map(p => p.id === updated.id ? updated : p)); setEditing(updated); }}
      onClose={() => setEditing(null)}
    />
  );

  return (
    <div style={{fontFamily:F,color:C.text1}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>Portal Builder</h1>
          <p style={{margin:0,fontSize:13,color:C.text3}}>Create branded external experiences for candidates, managers & agencies</p>
        </div>
        <Btn icon="plus" onClick={()=>setShowCreate(true)}>New Portal</Btn>
      </div>

      {/* Portal type explainer strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
        {PORTAL_TYPES.map(pt=>(
          <div key={pt.id} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px",boxShadow:"0 1px 4px rgba(67,97,238,0.05)"}}>
            <div style={{fontSize:22,marginBottom:8}}>{pt.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:3}}>{pt.label}</div>
            <div style={{fontSize:11,color:C.text3,lineHeight:1.5}}>{pt.desc}</div>
          </div>
        ))}
      </div>

      {/* Portal cards */}
      {loading ? (
        <div style={{textAlign:"center",padding:60,color:C.text3}}>Loading portals…</div>
      ) : portals.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 40px",background:C.surface,borderRadius:18,border:`2px dashed ${C.border}`}}>
          <div style={{fontSize:48,marginBottom:16}}>🌐</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:6}}>No portals yet</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Create your first portal to start building external experiences</div>
          <Btn icon="plus" onClick={()=>setShowCreate(true)}>Create First Portal</Btn>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
          {portals.map(portal => {
            const pt = PORTAL_TYPES.find(t => t.id === portal.type);
            return (
              <div key={portal.id} style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(67,97,238,0.06)",transition:"box-shadow .2s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(67,97,238,0.12)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(67,97,238,0.06)"}>
                {/* Colour band */}
                <div style={{height:6,background:portal.branding?.primary_color||pt?.color||C.accent}}/>
                <div style={{padding:"20px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:`${pt?.color||C.accent}14`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{pt?.icon}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:C.text1}}>{portal.name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{pt?.label}</div>
                      </div>
                    </div>
                    <StatusDot status={portal.status}/>
                  </div>
                  {portal.branding?.company_name&&<div style={{fontSize:12,color:C.text2,marginBottom:4}}>🏢 {portal.branding.company_name}</div>}
                  {portal.branding?.tagline&&<div style={{fontSize:11,color:C.text3,marginBottom:12,fontStyle:"italic"}}>"{portal.branding.tagline}"</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                    {(portal.config?.allowed_objects||[]).map(slug=>(
                      <Badge key={slug} color={C.accent}>{slug}</Badge>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                    <Btn v="primary" onClick={()=>setEditing(portal)}>Edit Portal</Btn>
                    <div style={{display:"flex",gap:6}}>
                      <Btn v={portal.status==="published"?"danger":"success"} onClick={()=>handlePublish(portal)}>
                        {portal.status==="published"?"Unpublish":"Publish"}
                      </Btn>
                      <Btn v="ghost" icon="trash" onClick={()=>handleDelete(portal.id)}/>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreatePortalModal
          environment={environment}
          onCreated={portal => { setPortals(ps=>[...ps,portal]); setShowCreate(false); setEditing(portal); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
