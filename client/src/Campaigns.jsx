// client/src/Campaigns.jsx  — Campaign Builder (Phase 1)
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import apiClient from "./apiClient.js";

const CampaignLinksInline = lazy(() => import("./CampaignLinks.jsx"));

const api = { get: u => apiClient.get(u), post: (u,b) => apiClient.post(u,b),
              patch: (u,b) => apiClient.patch(u,b), del: u => apiClient.delete(u) };
const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";
const C = {
  bg:"var(--t-bg,#F0F2FF)", surface:"var(--t-surface,#fff)", s2:"var(--t-surface2,#F8F9FF)",
  border:"var(--t-border,#E8ECF8)", accent:"var(--t-accent,#4361EE)",
  accentL:"var(--t-accent-light,#EEF0FF)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  green:"#0ca678", greenL:"#F0FDF4", amber:"#f59f00", amberL:"#FFFBEB",
  red:"#e03131", redL:"#FFF0F0", purple:"#7048e8", purpleL:"#F3F0FF",
  teal:"#0c8599", tealL:"#E6FCFF",
};
const GOAL_META = {
  applications:    { label:"Drive Applications",  color:"#4361EE", bg:"#EEF0FF" },
  pool_growth:     { label:"Grow Talent Pool",    color:"#7048e8", bg:"#F3F0FF" },
  event:           { label:"Event Promotion",     color:"#0c8599", bg:"#E6FCFF" },
  brand_awareness: { label:"Employer Brand",      color:"#f59f00", bg:"#FFFBEB" },
};
const STATUS_META = {
  draft:   { label:"Draft",   color:"#9CA3AF", bg:"#F3F4F6" },
  active:  { label:"Active",  color:"#0ca678", bg:"#F0FDF4" },
  paused:  { label:"Paused",  color:"#f59f00", bg:"#FFFBEB" },
  ended:   { label:"Ended",   color:"#e03131", bg:"#FFF0F0" },
};
const GOALS = Object.entries(GOAL_META).map(([id,m]) => ({ id, ...m }));
const PATHS = {
  plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  chart:"M18 20V10M12 20V4M6 20v-6", copy:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  arrowL:"M19 12H5M12 5l-7 7 7 7", check:"M20 6L9 17l-5-5", users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  tag:"M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.83zM7 7h.01",
  calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18", info:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 9v4m0-8h.01",
};
const Ic = ({n,s=16,c="#374151",style={}}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={PATHS[n]}/></svg>
);

function Btn({ onClick, children, v="primary", s="sm", icon, disabled, style={} }) {
  const pad = { sm:"7px 14px", md:"9px 18px", lg:"12px 22px" };
  const base = { display:"flex",alignItems:"center",gap:6,borderRadius:8,border:"none",
    cursor:disabled?"not-allowed":"pointer",fontFamily:F,fontSize:s==="lg"?14:13,
    fontWeight:600,padding:pad[s],opacity:disabled?0.5:1,transition:"opacity .15s",...style };
  const vv = {
    primary:   { background:C.accent,  color:"#fff" },
    secondary: { background:C.s2,      color:C.text2, border:`1px solid ${C.border}` },
    ghost:     { background:"none",    color:C.accent },
    danger:    { background:C.redL,    color:C.red,   border:`1px solid ${C.red}22` },
    green:     { background:C.greenL,  color:C.green, border:`1px solid ${C.green}30` },
  };
  return (
    <button onClick={!disabled?onClick:undefined} style={{...base,...vv[v]}}>
      {icon && <Ic n={icon} s={12} c={v==="primary"?"#fff":v==="danger"?C.red:v==="green"?C.green:C.accent}/>}
      {children}
    </button>
  );
}

const Badge = ({ label, color, bg }) => (
  <span style={{ display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:99,
    fontSize:11,fontWeight:700,background:bg||C.accentL,color:color||C.accent }}>
    {label}
  </span>
);

const StatBox = ({ label, val, color=C.accent }) => (
  <div style={{ textAlign:"center", minWidth:60 }}>
    <div style={{ fontSize:18,fontWeight:800,color,lineHeight:1 }}>{val}</div>
    <div style={{ fontSize:10,color:C.text3,marginTop:2 }}>{label}</div>
  </div>
);

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick, onDelete }) {
  const goal   = GOAL_META[campaign.goal]   || GOAL_META.applications;
  const status = STATUS_META[campaign.status] || STATUS_META.draft;
  return (
    <div onClick={onClick} style={{ background:C.surface, borderRadius:14, border:`1.5px solid ${C.border}`,
      overflow:"hidden", cursor:"pointer", transition:"box-shadow .15s, border-color .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)";e.currentTarget.style.borderColor=C.accent;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      <div style={{ height:4, background:goal.color }}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginBottom:4, lineHeight:1.3 }}>{campaign.name}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <Badge label={goal.label}   color={goal.color}   bg={goal.bg}/>
              <Badge label={status.label} color={status.color} bg={status.bg}/>
            </div>
          </div>
          <button onClick={e=>{e.stopPropagation();onDelete(campaign.id);}}
            style={{ background:"none",border:"none",cursor:"pointer",padding:"2px",flexShrink:0,marginLeft:8 }}>
            <Ic n="trash" s={14} c={C.text3}/>
          </button>
        </div>
        {campaign.brief && (
          <div style={{ fontSize:12, color:C.text3, marginBottom:12, lineHeight:1.5,
            overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {campaign.brief}
          </div>
        )}
        <div style={{ display:"flex", gap:0, padding:"10px 0", borderTop:`1px solid ${C.border}`, marginBottom:8 }}>
          <StatBox label="Links"      val={campaign.link_count||0}  color={C.text2}/>
          <div style={{width:1,background:C.border,margin:"0 10px"}}/>
          <StatBox label="30d clicks" val={campaign.clicks_30d||0}  color={C.accent}/>
          <div style={{width:1,background:C.border,margin:"0 10px"}}/>
          <StatBox label="30d joins"  val={campaign.joins_30d||0}   color={C.green}/>
        </div>
        {campaign.audience_tags?.length > 0 && (
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {campaign.audience_tags.slice(0,4).map(t=>(
              <span key={t} style={{ padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:600,background:C.s2,color:C.text3 }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Campaign Modal ────────────────────────────────────────────────────────
function NewCampaignModal({ environment, onSave, onClose }) {
  const [step, setStep]   = useState(1); // 1=name+goal, 2=audience+brief
  const [form, setForm]   = useState({ name:"", goal:"applications", audience_tags:"", brief:"", start_date:"", end_date:"", budget:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const tags = form.audience_tags.split(',').map(t=>t.trim()).filter(Boolean);
      const result = await api.post('/campaigns', {
        ...form, environment_id: environment.id,
        audience_tags: tags, status:'draft',
        budget: form.budget ? Number(form.budget) : null,
      });
      onSave(result);
    } finally { setSaving(false); }
  };

  const inp = { width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
    fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,boxSizing:"border-box" };
  const lbl = { fontSize:12,fontWeight:600,color:C.text2,marginBottom:4,display:"block" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:560,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1}}>New Campaign</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{padding:"22px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:16}}>
          {step===1 ? (<>
            <div><label style={lbl}>Campaign name *</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Dubai Engineering Hiring Push Q2" style={inp}/></div>
            <div>
              <label style={lbl}>Goal</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {GOALS.map(g=>(
                  <button key={g.id} onClick={()=>set("goal",g.id)} style={{
                    padding:"12px 14px",borderRadius:10,border:`2px solid ${form.goal===g.id?g.color:C.border}`,
                    background:form.goal===g.id?g.bg:"transparent",cursor:"pointer",textAlign:"left",fontFamily:F
                  }}>
                    <div style={{fontSize:12,fontWeight:700,color:form.goal===g.id?g.color:C.text2}}>{g.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={lbl}>Start date</label><input type="date" value={form.start_date} onChange={e=>set("start_date",e.target.value)} style={inp}/></div>
              <div><label style={lbl}>End date</label><input type="date" value={form.end_date} onChange={e=>set("end_date",e.target.value)} style={inp}/></div>
            </div>
            <div><label style={lbl}>Budget (optional)</label>
              <input type="number" value={form.budget} onChange={e=>set("budget",e.target.value)} placeholder="e.g. 5000" style={inp}/></div>
          </>) : (<>
            <div><label style={lbl}>Target audience</label>
              <input value={form.audience_tags} onChange={e=>set("audience_tags",e.target.value)} placeholder="e.g. Senior Engineer, Dubai, Python, 5+ years (comma separated)" style={inp}/>
              <div style={{fontSize:11,color:C.text3,marginTop:4}}>These tags help the AI generate relevant content</div></div>
            <div><label style={lbl}>Campaign brief</label>
              <textarea value={form.brief} onChange={e=>set("brief",e.target.value)} rows={4}
                placeholder="Describe what you're hiring for, why this is a great opportunity, and what makes your company different..."
                style={{...inp,resize:"vertical"}}/>
              <div style={{fontSize:11,color:C.text3,marginTop:4}}>The AI uses this to generate LinkedIn posts, email subjects, and portal copy</div></div>
          </>)}
        </div>
        <div style={{padding:"14px 22px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:6}}>
            {[1,2].map(s=><div key={s} style={{width:8,height:8,borderRadius:"50%",background:s===step?C.accent:C.border}}/>)}
          </div>
          <div style={{display:"flex",gap:8}}>
            {step===2 && <Btn v="secondary" onClick={()=>setStep(1)}>Back</Btn>}
            <Btn v="secondary" onClick={onClose}>Cancel</Btn>
            {step===1
              ? <Btn onClick={()=>setStep(2)} disabled={!form.name}>Next →</Btn>
              : <Btn onClick={handleSave} disabled={saving||!form.name}>{saving?"Creating…":"Create campaign"}</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Content Panel ──────────────────────────────────────────────────────────
function ContentPanel({ campaign, onGenerated }) {
  const [gen, setGen]         = useState(campaign.generated_content || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/campaigns/${campaign.id}/generate`, {});
      setGen(result);
      onGenerated(result);
    } finally { setLoading(false); }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const Block = ({ label, color=C.accent, children }) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11,fontWeight:700,color,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8 }}>{label}</div>
      {children}
    </div>
  );

  if (!gen && !loading) return (
    <div style={{ padding:"40px 0", textAlign:"center" }}>
      <div style={{ width:52,height:52,borderRadius:"50%",background:C.accentL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
        <Ic n="zap" s={22} c={C.accent}/>
      </div>
      <div style={{ fontSize:14,fontWeight:700,color:C.text1,marginBottom:6 }}>Generate campaign content</div>
      <div style={{ fontSize:13,color:C.text3,marginBottom:20,maxWidth:360,margin:"0 auto 20px" }}>
        Vercentic will create LinkedIn posts, email subjects, portal copy and more based on your brief.
      </div>
      <Btn onClick={generate} icon="zap">Generate content</Btn>
    </div>
  );

  if (loading) return (
    <div style={{ padding:"40px 0", textAlign:"center", color:C.text3 }}>
      <Ic n="loader" s={28} c={C.accent} style={{ animation:"spin 1s linear infinite" }}/>
      <div style={{ marginTop:12, fontSize:13 }}>Vercentic is generating your content…</div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ fontSize:13,color:C.text3 }}>Content generated successfully</div>
        <Btn v="secondary" onClick={generate} icon="zap" s="sm">Regenerate</Btn>
      </div>

      {gen.linkedin_posts && (
        <Block label="LinkedIn posts" color="#0077b5">
          {gen.linkedin_posts.map((p,i) => (
            <div key={i} style={{ background:C.s2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${C.border}`, position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <span style={{ fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase" }}>Variant {p.variant} · {p.tone}</span>
                <button onClick={()=>copy(p.text, `li-${i}`)} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
                  <Ic n={copied===`li-${i}`?"check":"copy"} s={13} c={copied===`li-${i}`?C.green:C.text3}/>
                </button>
              </div>
              <div style={{ fontSize:12, color:C.text2, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{p.text}</div>
            </div>
          ))}
        </Block>
      )}

      {gen.email_subjects && (
        <Block label="Email subject lines" color={C.green}>
          {gen.email_subjects.map((s,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:C.s2, borderRadius:8, marginBottom:6, border:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13,color:C.text1 }}>{s}</span>
              <button onClick={()=>copy(s, `em-${i}`)} style={{ background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0,marginLeft:8 }}>
                <Ic n={copied===`em-${i}`?"check":"copy"} s={13} c={copied===`em-${i}`?C.green:C.text3}/>
              </button>
            </div>
          ))}
        </Block>
      )}

      {gen.portal_hero && (
        <Block label="Portal hero copy" color={C.purple}>
          <div style={{ background:C.purpleL, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.purple}22` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <span style={{ fontSize:10,fontWeight:700,color:C.purple,textTransform:"uppercase" }}>Headline</span>
              <button onClick={()=>copy(gen.portal_hero.headline+"\n"+gen.portal_hero.subheading,"hero")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                <Ic n={copied==="hero"?"check":"copy"} s={13} c={copied==="hero"?C.green:C.text3}/>
              </button>
            </div>
            <div style={{ fontSize:16,fontWeight:700,color:C.text1,marginBottom:4 }}>{gen.portal_hero.headline}</div>
            <div style={{ fontSize:13,color:C.text2 }}>{gen.portal_hero.subheading}</div>
          </div>
        </Block>
      )}

      {gen.whatsapp_message && (
        <Block label="WhatsApp message" color={C.green}>
          <div style={{ background:"#DCFCE7", borderRadius:10, padding:"12px 14px", border:`1px solid ${C.green}22`, position:"relative" }}>
            <button onClick={()=>copy(gen.whatsapp_message,"wa")} style={{ position:"absolute",top:10,right:12,background:"none",border:"none",cursor:"pointer",padding:0 }}>
              <Ic n={copied==="wa"?"check":"copy"} s={13} c={copied==="wa"?C.green:C.text3}/>
            </button>
            <div style={{ fontSize:12,color:"#166534",lineHeight:1.6,paddingRight:20 }}>{gen.whatsapp_message}</div>
          </div>
        </Block>
      )}

      {gen.key_messages && (
        <Block label="Key messages" color={C.teal}>
          {gen.key_messages.map((m,i) => (
            <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:8,marginBottom:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:5 }}/>
              <span style={{ fontSize:13,color:C.text2 }}>{m}</span>
            </div>
          ))}
        </Block>
      )}
    </div>
  );
}

// ── Campaign Detail ───────────────────────────────────────────────────────────
function CampaignDetail({ campaign: initCampaign, environment, onBack, onUpdated }) {
  const [campaign, setCampaign] = useState(initCampaign);
  // Fetch full campaign on mount to pick up generated_content if stale in parent
  useEffect(() => {
    api.get(`/campaigns/${initCampaign.id}`).then(d => {
      if (d && d.id) setCampaign(c => ({ ...c, ...d }));
    }).catch(() => {});
  }, [initCampaign.id]);
  const [tab, setTab]           = useState("brief");
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ ...initCampaign });
  const [saving, setSaving]     = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    setSaving(true);
    const tags = typeof form.audience_tags === "string"
      ? form.audience_tags.split(",").map(t=>t.trim()).filter(Boolean)
      : form.audience_tags;
    const updated = await api.patch(`/campaigns/${campaign.id}`, { ...form, audience_tags: tags });
    setCampaign(c=>({...c,...updated}));
    onUpdated({ ...campaign, ...updated });
    setSaving(false);
    setEditing(false);
  };

  const changeStatus = async (status) => {
    const updated = await api.patch(`/campaigns/${campaign.id}`, { status });
    setCampaign(c=>({...c,status}));
    onUpdated({ ...campaign, status });
  };

  const goal   = GOAL_META[campaign.goal]   || GOAL_META.applications;
  const status = STATUS_META[campaign.status] || STATUS_META.draft;
  const inp = { width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
    fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,boxSizing:"border-box" };
  const lbl = { fontSize:12,fontWeight:600,color:C.text2,marginBottom:4,display:"block" };

  const tabs = [
    { id:"brief",     label:"Brief" },
    { id:"content",   label:"AI Content" },
    { id:"links",     label:"Links" },
    { id:"analytics", label:"Analytics" },
  ];

  const STATUS_ACTIONS = {
    draft:  ["active"],
    active: ["paused","ended"],
    paused: ["active","ended"],
    ended:  [],
  };
  const nextStatuses = STATUS_ACTIONS[campaign.status] || [];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0 }}>
          <Ic n="arrowL" s={18} c={C.text3}/>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16,fontWeight:700,color:C.text1 }}>{campaign.name}</div>
          <div style={{ display:"flex",gap:6,marginTop:3 }}>
            <Badge label={goal.label}   color={goal.color}   bg={goal.bg}/>
            <Badge label={status.label} color={status.color} bg={status.bg}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {nextStatuses.map(s=>(
            <Btn key={s} v="secondary" s="sm" onClick={()=>changeStatus(s)}>
              → {STATUS_META[s]?.label}
            </Btn>
          ))}
          <Btn v={editing?"green":"secondary"} s="sm" icon={editing?"check":"edit"}
            onClick={editing?save:()=>setEditing(true)}>
            {editing?(saving?"Saving…":"Save"):"Edit"}
          </Btn>
          {editing && <Btn v="secondary" s="sm" onClick={()=>{setEditing(false);setForm({...campaign});}}>Cancel</Btn>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, padding:"0 24px" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 14px", border:"none", background:"none", cursor:"pointer",
            fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?C.accent:C.text3,
            borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, fontFamily:F,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        {tab === "brief" && (
          <div style={{ maxWidth:620 }}>
            {editing ? (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={lbl}>Campaign name</label><input value={form.name} onChange={e=>set("name",e.target.value)} style={inp}/></div>
                <div>
                  <label style={lbl}>Goal</label>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    {GOALS.map(g=>(
                      <button key={g.id} onClick={()=>set("goal",g.id)} style={{
                        padding:"10px 12px",borderRadius:10,border:`2px solid ${form.goal===g.id?g.color:C.border}`,
                        background:form.goal===g.id?g.bg:"transparent",cursor:"pointer",textAlign:"left",fontFamily:F
                      }}><div style={{ fontSize:12,fontWeight:700,color:form.goal===g.id?g.color:C.text2 }}>{g.label}</div></button>
                    ))}
                  </div>
                </div>
                <div><label style={lbl}>Brief</label><textarea value={form.brief||""} onChange={e=>set("brief",e.target.value)} rows={4} style={{...inp,resize:"vertical"}}/></div>
                <div><label style={lbl}>Audience tags (comma separated)</label>
                  <input value={Array.isArray(form.audience_tags)?form.audience_tags.join(", "):form.audience_tags||""} onChange={e=>set("audience_tags",e.target.value)} style={inp}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div><label style={lbl}>Start date</label><input type="date" value={form.start_date||""} onChange={e=>set("start_date",e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>End date</label><input type="date" value={form.end_date||""} onChange={e=>set("end_date",e.target.value)} style={inp}/></div>
                </div>
                <div><label style={lbl}>Budget</label><input type="number" value={form.budget||""} onChange={e=>set("budget",e.target.value)} placeholder="Optional" style={inp}/></div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                {campaign.brief && (
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6 }}>Brief</div>
                    <div style={{ fontSize:14,color:C.text1,lineHeight:1.7 }}>{campaign.brief}</div>
                  </div>
                )}
                {campaign.audience_tags?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6 }}>Target audience</div>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                      {campaign.audience_tags.map(t=>(
                        <span key={t} style={{ padding:"4px 10px",borderRadius:8,fontSize:12,fontWeight:600,background:C.s2,color:C.text2,border:`1px solid ${C.border}` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex",gap:20 }}>
                  {campaign.start_date && <div><div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>Starts</div><div style={{ fontSize:13,color:C.text1 }}>{new Date(campaign.start_date).toLocaleDateString()}</div></div>}
                  {campaign.end_date   && <div><div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>Ends</div><div style={{ fontSize:13,color:C.text1 }}>{new Date(campaign.end_date).toLocaleDateString()}</div></div>}
                  {campaign.budget     && <div><div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>Budget</div><div style={{ fontSize:13,color:C.text1 }}>${Number(campaign.budget).toLocaleString()}</div></div>}
                </div>
                {!campaign.brief && !campaign.audience_tags?.length && (
                  <div style={{ padding:"30px 0",textAlign:"center",color:C.text3 }}>
                    <Ic n="edit" s={24} c={C.border} style={{ marginBottom:8 }}/>
                    <div style={{ fontSize:13 }}>Click Edit to add a brief and audience details</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "content" && (
          <div style={{ maxWidth:640 }}>
            <ContentPanel campaign={campaign} onGenerated={c=>{
              const updated = {...campaign, generated_content: c};
              setCampaign(updated);
              onUpdated(updated);
            }}/>
          </div>
        )}

        {tab === "links" && (
          <div>
            <Suspense fallback={<div style={{color:C.text3,fontSize:13,padding:20}}>Loading…</div>}>
              <CampaignLinksInline environment={environment} campaignId={campaign.id}/>
            </Suspense>
          </div>
        )}

        {tab === "analytics" && (
          <AnalyticsPanel campaign={campaign}/>
        )}
      </div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ campaign }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get(`/campaigns/${campaign.id}`).then(d => setStats(d.stats));
  }, [campaign.id]);

  if (!stats) return <div style={{ color:C.text3,fontSize:13,padding:20 }}>Loading…</div>;

  const funnel = [
    { label:"Clicks (30d)",    val:stats.clicks_30d,  color:C.accent },
    { label:"Joins (30d)",     val:stats.joins_30d,   color:C.green  },
  ];
  const maxVal = Math.max(...funnel.map(f=>f.val), 1);

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24 }}>
        <div style={{ background:C.surface,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:22,fontWeight:800,color:C.accent }}>{stats.total_clicks}</div>
          <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>Total clicks</div>
        </div>
        <div style={{ background:C.surface,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:22,fontWeight:800,color:C.green }}>{stats.joins_30d}</div>
          <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>Joins (30d)</div>
        </div>
        <div style={{ background:C.surface,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:22,fontWeight:800,color:C.purple }}>{stats.join_rate}%</div>
          <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>Join rate</div>
        </div>
      </div>

      <div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>Funnel (last 30 days)</div>
      {funnel.map(f=>(
        <div key={f.label} style={{ marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.text2,marginBottom:4 }}>
            <span>{f.label}</span><span style={{ fontWeight:700,color:f.color }}>{f.val}</span>
          </div>
          <div style={{ height:8,borderRadius:99,background:C.border }}>
            <div style={{ height:"100%",borderRadius:99,background:f.color,width:`${(f.val/maxVal)*100}%`,transition:"width .4s" }}/>
          </div>
        </div>
      ))}

      {stats.by_channel?.length > 0 && (
        <>
          <div style={{ fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",margin:"20px 0 10px" }}>By channel</div>
          {stats.by_channel.map(ch=>(
            <div key={ch.channel} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <span style={{ fontSize:12,color:C.text2,width:100,flexShrink:0,textTransform:"capitalize" }}>{ch.channel}</span>
              <div style={{ flex:1,height:6,borderRadius:99,background:C.border }}>
                <div style={{ height:"100%",borderRadius:99,background:C.accent,width:`${(ch.clicks/stats.clicks_30d)*100}%` }}/>
              </div>
              <span style={{ fontSize:12,fontWeight:700,color:C.accent,width:30,textAlign:"right" }}>{ch.clicks}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Campaigns({ environment }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("all"); // all|draft|active|paused|ended

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/campaigns?environment_id=${environment.id}`);
      setCampaigns(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    await api.del(`/campaigns/${id}`);
    setCampaigns(cs => cs.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);
  const counts   = { all: campaigns.length, ...campaigns.reduce((a,c) => ({...a,[c.status]:(a[c.status]||0)+1}), {}) };

  if (selected) return (
    <CampaignDetail
      campaign={selected}
      environment={environment}
      onBack={() => setSelected(null)}
      onUpdated={updated => {
        setCampaigns(cs => cs.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        setSelected(s => ({ ...s, ...updated }));
      }}
    />
  );

  return (
    <div style={{ padding:"28px 32px", fontFamily:F, minHeight:"100vh", background:C.bg }}>
      {/* Page header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:C.text1 }}>Campaigns</h1>
          <div style={{ fontSize:13,color:C.text3,marginTop:2 }}>Manage your recruitment marketing campaigns</div>
        </div>
        <Btn icon="plus" onClick={() => setCreating(true)}>New campaign</Btn>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {["all","draft","active","paused","ended"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filter===f?C.accent:C.border}`,
            background:filter===f?C.accentL:"transparent",color:filter===f?C.accent:C.text3,
            fontSize:12,fontWeight:filter===f?700:500,cursor:"pointer",fontFamily:F,
          }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
            {counts[f] > 0 && <span style={{ marginLeft:6,fontWeight:700 }}>{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:C.text3, fontSize:13 }}>Loading campaigns…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 0" }}>
          <div style={{ width:56,height:56,borderRadius:"50%",background:C.accentL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <Ic n="zap" s={24} c={C.accent}/>
          </div>
          <div style={{ fontSize:16,fontWeight:700,color:C.text1,marginBottom:6 }}>
            {filter === "all" ? "No campaigns yet" : `No ${filter} campaigns`}
          </div>
          <div style={{ fontSize:13,color:C.text3,marginBottom:20 }}>
            {filter === "all" ? "Create your first campaign to start tracking and generating content." : `No campaigns with status "${filter}".`}
          </div>
          {filter === "all" && <Btn icon="plus" onClick={()=>setCreating(true)}>Create first campaign</Btn>}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {filtered.map(c => (
            <CampaignCard key={c.id} campaign={c} onClick={()=>setSelected(c)} onDelete={handleDelete}/>
          ))}
        </div>
      )}

      {creating && (
        <NewCampaignModal
          environment={environment}
          onClose={() => setCreating(false)}
          onSave={c => { setCampaigns(cs=>[c,...cs]); setCreating(false); setSelected(c); }}
        />
      )}
    </div>
  );
}
