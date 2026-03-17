import { useState, useEffect, useRef, useCallback } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#F3F4F8", surface:"#FFFFFF", surface2:"#F8F9FC",
  border:"#E8ECF8", border2:"#D1D5DB",
  text1:"#0F1729", text2:"#374151", text3:"#9CA3AF",
  accent:"#4361EE", accentLight:"#EEF2FF", accentDark:"#3A56E8",
  green:"#0CAF77", greenLight:"#ECFDF5",
  red:"#EF4444", redLight:"#FEF2F2",
  amber:"#F79009", amberLight:"#FFFBEB",
};

const PADDING_OPTS = [
  { value:"none", label:"None",    py:"0px" },
  { value:"sm",   label:"Small",   py:"24px" },
  { value:"md",   label:"Medium",  py:"56px" },
  { value:"lg",   label:"Large",   py:"96px" },
  { value:"xl",   label:"X-Large", py:"140px" },
];

const COLUMN_PRESETS = [
  { id:"1",   label:"Full width",  icon:"▬",   cols:1 },
  { id:"2",   label:"Two halves",  icon:"▬▬",  cols:2 },
  { id:"3",   label:"Three cols",  icon:"▬▬▬", cols:3 },
  { id:"1-2", label:"⅓ + ⅔",      icon:"▭▬",  cols:2 },
  { id:"2-1", label:"⅔ + ⅓",      icon:"▬▭",  cols:2 },
];

const WIDGET_TYPES = [
  { type:"hero",     label:"Hero",       icon:"🏔", desc:"Headline, subheading & CTA" },
  { type:"text",     label:"Rich Text",  icon:"¶",  desc:"Copy & content blocks" },
  { type:"image",    label:"Image",      icon:"🖼", desc:"Photo or illustration" },
  { type:"jobs",     label:"Job Board",  icon:"💼", desc:"Live jobs from TalentOS" },
  { type:"form",     label:"Form",       icon:"📋", desc:"Linked to any object" },
  { type:"stats",    label:"Stats",      icon:"📊", desc:"Numbers & social proof" },
  { type:"team",     label:"Team",       icon:"👥", desc:"People from records" },
  { type:"video",    label:"Video",      icon:"▶",  desc:"YouTube or Vimeo embed" },
  { type:"divider",  label:"Divider",    icon:"─",  desc:"Horizontal separator" },
  { type:"spacer",   label:"Spacer",     icon:"⬜", desc:"Blank vertical space" },
];

const FONT_OPTS = [
  { value:"'DM Sans', sans-serif",           label:"DM Sans" },
  { value:"'Inter', sans-serif",             label:"Inter" },
  { value:"'Plus Jakarta Sans', sans-serif", label:"Jakarta Sans" },
  { value:"'Outfit', sans-serif",            label:"Outfit" },
  { value:"'Raleway', sans-serif",           label:"Raleway" },
  { value:"'Sora', sans-serif",              label:"Sora" },
  { value:"'Playfair Display', serif",       label:"Playfair Display" },
  { value:"'Lora', serif",                   label:"Lora" },
  { value:"'Space Grotesk', sans-serif",     label:"Space Grotesk" },
];

const RADIUS_OPTS = [
  { value:"0px",   label:"Sharp" },
  { value:"4px",   label:"Subtle" },
  { value:"8px",   label:"Rounded" },
  { value:"14px",  label:"Soft" },
  { value:"999px", label:"Pill" },
];

const BUTTON_STYLES = [
  { value:"filled",    label:"Filled" },
  { value:"outline",   label:"Outline" },
  { value:"ghost",     label:"Ghost" },
  { value:"underline", label:"Underline" },
];

const PALETTES = [
  { name:"Indigo",   primary:"#4361EE", secondary:"#7C3AED", bg:"#FFFFFF", text:"#0F1729" },
  { name:"Slate",    primary:"#334155", secondary:"#64748B", bg:"#F8FAFC", text:"#0F172A" },
  { name:"Rose",     primary:"#E11D48", secondary:"#F43F5E", bg:"#FFFFFF", text:"#1C1917" },
  { name:"Teal",     primary:"#0D9488", secondary:"#0891B2", bg:"#F0FDFA", text:"#134E4A" },
  { name:"Amber",    primary:"#D97706", secondary:"#B45309", bg:"#FFFBEB", text:"#1C1917" },
  { name:"Violet",   primary:"#7C3AED", secondary:"#4361EE", bg:"#FAF5FF", text:"#1E1B4B" },
  { name:"Midnight", primary:"#6366F1", secondary:"#818CF8", bg:"#0F172A", text:"#F1F5F9" },
  { name:"Forest",   primary:"#16A34A", secondary:"#15803D", bg:"#F0FDF4", text:"#14532D" },
];

const api = {
  get:    p     => fetch(`/api${p}`).then(r=>r.json()),
  post:   (p,b) => fetch(`/api${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (p,b) => fetch(`/api${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: p     => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const uid = () => Math.random().toString(36).slice(2,10);

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultTheme = () => ({
  primaryColor:"#4361EE", secondaryColor:"#7C3AED",
  bgColor:"#FFFFFF", textColor:"#0F1729", accentColor:"#F79009",
  fontFamily:"'DM Sans', sans-serif", headingFont:"'DM Sans', sans-serif",
  fontSize:"16px", headingWeight:"700",
  borderRadius:"8px", buttonStyle:"filled", buttonRadius:"8px",
  maxWidth:"1200px",
});
const defaultCell = () => ({ id:uid(), widgetType:null, widgetConfig:{} });
const defaultRow  = (preset="1") => ({
  id:uid(), preset,
  bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
  cells: preset==="1" ? [defaultCell()] : [defaultCell(), defaultCell()],
});
const defaultPage = () => ({ id:uid(), name:"Home", slug:"/", rows:[defaultRow("1")] });

// ─── Portal Templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "career_site",
    name: "Career Site",
    desc: "Branded job listings, company story and application experience",
    icon: "🌐",
    accent: "#4361EE",
    tags: ["Public", "Jobs", "Apply"],
    theme: {
      primaryColor:"#4361EE", secondaryColor:"#7C3AED",
      bgColor:"#FFFFFF", textColor:"#0F1729", accentColor:"#F79009",
      fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"10px", buttonStyle:"filled", buttonRadius:"10px", maxWidth:"1200px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Find Your Next Opportunity", subheading:"Join a team building something meaningful. Explore open roles across engineering, product, design and more.", ctaText:"See Open Roles" }}]},
        { id:"r2", preset:"1", bgColor:"#F8F9FF", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"500+",label:"Team Members"},{value:"12",label:"Global Offices"},{value:"40+",label:"Nationalities"},{value:"4.8★",label:"Glassdoor"}]}}]},
        { id:"r3", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"Why work with us?", content:"We believe great work happens when talented people have the freedom to do their best work. We offer flexible hours, competitive pay, and a culture built on trust and transparency." }},
            { id:"c4", widgetType:"image", widgetConfig:{ url:"" }},
          ]},
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c5", widgetType:"jobs", widgetConfig:{}}]},
        { id:"r5", preset:"1", bgColor:"#0F1729", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c6", widgetType:"text", widgetConfig:{ heading:"Ready to apply?", content:"We review every application carefully. If there's a match, our team will be in touch within 5 business days." }}]},
      ]},
      { id:"p2", name:"Apply", slug:"/apply", rows:[
        { id:"r6", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c7", widgetType:"form", widgetConfig:{ title:"Submit Your Application" }}]},
      ]},
    ],
  },

  {
    id: "hm_portal",
    name: "Hiring Manager Portal",
    desc: "Review candidates, leave feedback and manage your open requisitions",
    icon: "💼",
    accent: "#334155",
    tags: ["Internal", "Review", "Feedback"],
    theme: {
      primaryColor:"#334155", secondaryColor:"#475569",
      bgColor:"#F8FAFC", textColor:"#0F172A", accentColor:"#6366F1",
      fontFamily:"'Inter', sans-serif", headingFont:"'Inter', sans-serif",
      fontSize:"15px", headingWeight:"600",
      borderRadius:"8px", buttonStyle:"filled", buttonRadius:"6px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Dashboard", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"#1E293B", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Hiring Manager Portal", subheading:"Your candidates, interviews and open roles — all in one place.", ctaText:"View Open Roles" }}]},
        { id:"r2", preset:"3", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"8",label:"Open Reqs"}]}},
            { id:"c3", widgetType:"stats", widgetConfig:{ stats:[{value:"24",label:"In Pipeline"}]}},
            { id:"c4", widgetType:"stats", widgetConfig:{ stats:[{value:"6",label:"This Week"}]}},
          ]},
        { id:"r3", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c5", widgetType:"jobs", widgetConfig:{}}]},
      ]},
      { id:"p2", name:"Feedback", slug:"/feedback", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c6", widgetType:"form", widgetConfig:{ title:"Interview Scorecard" }}]},
      ]},
    ],
  },

  {
    id: "onboarding",
    name: "Onboarding Portal",
    desc: "Welcome new hires with a guided post-offer journey and document collection",
    icon: "🚀",
    accent: "#0D9488",
    tags: ["New Hire", "Documents", "Welcome"],
    theme: {
      primaryColor:"#0D9488", secondaryColor:"#0891B2",
      bgColor:"#F0FDFA", textColor:"#134E4A", accentColor:"#F59E0B",
      fontFamily:"'Outfit', sans-serif", headingFont:"'Outfit', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"12px", buttonStyle:"filled", buttonRadius:"999px", maxWidth:"960px",
    },
    pages: [
      { id:"p1", name:"Welcome", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Welcome to the team! 👋", subheading:"We're so excited to have you on board. This portal will guide you through everything you need to do before Day 1.", ctaText:"Get Started" }}]},
        { id:"r2", preset:"3", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 1",label:"Upload Documents"}]}},
            { id:"c3", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 2",label:"Complete Profile"}]}},
            { id:"c4", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 3",label:"Meet the Team"}]}},
          ]},
        { id:"r3", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c5", widgetType:"text", widgetConfig:{ heading:"Before Day 1", content:"Complete your onboarding checklist at your own pace. Our People team is available if you have any questions — just reply to your welcome email." }},
            { id:"c6", widgetType:"team", widgetConfig:{}},
          ]},
      ]},
      { id:"p2", name:"Documents", slug:"/documents", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c7", widgetType:"form", widgetConfig:{ title:"Upload Your Documents" }}]},
      ]},
    ],
  },

  {
    id: "agency",
    name: "Agency Portal",
    desc: "Let agencies submit candidates against open roles with full pipeline visibility",
    icon: "🤝",
    accent: "#D97706",
    tags: ["Agency", "Submit", "External"],
    theme: {
      primaryColor:"#D97706", secondaryColor:"#B45309",
      bgColor:"#FFFBEB", textColor:"#1C1917", accentColor:"#0D9488",
      fontFamily:"'Raleway', sans-serif", headingFont:"'Raleway', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"8px", buttonStyle:"outline", buttonRadius:"8px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"#78350F", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Agency Submission Portal", subheading:"Submit candidates for active roles and track your submissions through our hiring pipeline.", ctaText:"View Open Roles" }}]},
        { id:"r2", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"12",label:"Active Roles"},{value:"48h",label:"Avg Response"}]}},
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"How it works", content:"Browse open roles below, then use the submission form to share your candidate's details. We'll review and respond within 48 hours with next steps." }},
          ]},
        { id:"r3", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c4", widgetType:"jobs", widgetConfig:{}}]},
      ]},
      { id:"p2", name:"Submit Candidate", slug:"/submit", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c5", widgetType:"form", widgetConfig:{ title:"Submit a Candidate" }}]},
      ]},
    ],
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s=16, c="currentColor" }) => {
  const p = {
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
    edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    copy:"M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2",
    grip:"M9 5h2M9 12h2M9 19h2M15 5h2M15 12h2M15 19h2",
    chevD:"M6 9l6 6 6-6", chevR:"M9 18l6-6-6-6",
    arrowL:"M19 12H5M12 19l-7-7 7-7",
    palette:"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2c1.1 0 2 .9 2 2 0 .55-.225 1.05-.585 1.415A2 2 0 0015 7h1a5 5 0 015 5c0 4.418-4.03 8-9 8z",
    settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    check:"M20 6L9 17l-5-5", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    globe:"M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {(p[n]||"").split("M").filter(Boolean).map((d,i)=><path key={i} d={"M"+d}/>)}
    </svg>
  );
};

const Btn = ({ children, onClick, v="primary", s="md", icon, disabled, style={} }) => {
  const sz = s==="sm"?{padding:"5px 11px",fontSize:11}:s==="lg"?{padding:"10px 20px",fontSize:14}:{padding:"8px 14px",fontSize:13};
  const vs = {
    primary:   {background:C.accent,   color:"white",  border:"none"},
    secondary: {background:C.surface2, color:C.text1,  border:`1px solid ${C.border}`},
    ghost:     {background:"transparent",color:C.text2, border:"none"},
    danger:    {background:C.redLight, color:C.red,    border:`1px solid ${C.red}40`},
    success:   {background:C.greenLight,color:C.green,  border:`1px solid ${C.green}40`},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"inline-flex",alignItems:"center",gap:6,borderRadius:8,fontFamily:F,fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .12s",...sz,...vs[v],...style}}>
      {icon&&<Ic n={icon} s={parseInt(sz.fontSize)+1} c="currentColor"/>}{children}
    </button>
  );
};

// ─── Color Picker ─────────────────────────────────────────────────────────────
const ColorPicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h = e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[]);
  const swatches = ["#4361EE","#7C3AED","#E11D48","#0D9488","#D97706","#0F172A","#FFFFFF","#F8FAFC",
    "#EEF2FF","#FAF5FF","#FEF2F2","#F0FDFA","#FFFBEB","#F0FDF4","#6366F1","#EC4899"];
  return (
    <div ref={ref} style={{position:"relative"}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{label}</div>}
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer"}}>
        <div style={{width:18,height:18,borderRadius:4,background:value||"#ccc",border:`1px solid ${C.border2}`,flexShrink:0}}/>
        <span style={{fontSize:12,color:C.text1,fontFamily:"monospace",flex:1}}>{value||"—"}</span>
        <Ic n="chevD" s={11} c={C.text3}/>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:700,background:C.surface,
          border:`1px solid ${C.border}`,borderRadius:10,padding:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",width:210}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4,marginBottom:8}}>
            {swatches.map(s=>(
              <div key={s} onClick={()=>{onChange(s);setOpen(false);}}
                style={{width:20,height:20,borderRadius:4,background:s,cursor:"pointer",
                  border:`2px solid ${value===s?C.accent:C.border}`,boxSizing:"border-box"}}/>
            ))}
          </div>
          <input type="color" value={value||"#000000"} onChange={e=>onChange(e.target.value)}
            style={{width:"100%",height:30,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/>
          <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder="#hex or rgba…"
            style={{width:"100%",marginTop:6,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,
              fontSize:11,fontFamily:"monospace",boxSizing:"border-box",outline:"none"}}/>
        </div>
      )}
    </div>
  );
};

// ─── Theme Drawer ─────────────────────────────────────────────────────────────
const ThemeDrawer = ({ theme, onChange, onClose }) => {
  const [tab, setTab] = useState("colours");
  const set = (k,v) => onChange({...theme,[k]:v});
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",top:0,right:0,width:320,height:"100vh",background:C.surface,
      borderLeft:`1px solid ${C.border}`,zIndex:500,display:"flex",flexDirection:"column",
      boxShadow:"-8px 0 40px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Ic n="palette" s={16} c={C.accent}/>
          <span style={{fontSize:15,fontWeight:800,color:C.text1}}>Design Tokens</span>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {[["colours","Colours"],["type","Typography"],["shape","Shape"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 0",border:"none",background:"transparent",
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,
            color:tab===id?C.accent:C.text3,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {tab==="colours"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Quick Palettes</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {PALETTES.map(p=>(
                  <div key={p.name} onClick={()=>onChange({...theme,primaryColor:p.primary,secondaryColor:p.secondary,bgColor:p.bg,textColor:p.text})}
                    style={{padding:"8px 10px",borderRadius:8,border:`1.5px solid ${theme.primaryColor===p.primary?C.accent:C.border}`,
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:theme.primaryColor===p.primary?C.accentLight:"transparent"}}>
                    <div style={{display:"flex",gap:2}}>
                      {[p.primary,p.secondary,p.bg].map((col,i)=>(
                        <div key={i} style={{width:11,height:11,borderRadius:"50%",background:col,border:`1px solid ${C.border}`}}/>
                      ))}
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:theme.primaryColor===p.primary?C.accent:C.text1}}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <ColorPicker label="Primary" value={theme.primaryColor} onChange={v=>set("primaryColor",v)}/>
            <ColorPicker label="Secondary" value={theme.secondaryColor} onChange={v=>set("secondaryColor",v)}/>
            <ColorPicker label="Accent" value={theme.accentColor} onChange={v=>set("accentColor",v)}/>
            <ColorPicker label="Background" value={theme.bgColor} onChange={v=>set("bgColor",v)}/>
            <ColorPicker label="Text" value={theme.textColor} onChange={v=>set("textColor",v)}/>
          </div>
        )}
        {tab==="type"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Heading Font</div>
              {FONT_OPTS.map(f=>(
                <div key={f.value} onClick={()=>set("headingFont",f.value)}
                  style={{padding:"7px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",
                    border:`1.5px solid ${theme.headingFont===f.value?C.accent:C.border}`,
                    background:theme.headingFont===f.value?C.accentLight:"transparent",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontFamily:f.value,fontWeight:600,color:theme.headingFont===f.value?C.accent:C.text1}}>{f.label}</span>
                  <span style={{fontSize:16,fontFamily:f.value,color:C.text3}}>Aa</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Body Font</div>
              {FONT_OPTS.map(f=>(
                <div key={f.value} onClick={()=>set("fontFamily",f.value)}
                  style={{padding:"7px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",
                    border:`1.5px solid ${theme.fontFamily===f.value?C.accent:C.border}`,
                    background:theme.fontFamily===f.value?C.accentLight:"transparent",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontFamily:f.value,color:theme.fontFamily===f.value?C.accent:C.text1}}>{f.label}</span>
                  <span style={{fontSize:16,fontFamily:f.value,color:C.text3}}>Aa</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Base Size</div>
              <select value={theme.fontSize} onChange={e=>set("fontSize",e.target.value)} style={inp}>
                {["14px","15px","16px","17px","18px"].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Heading Weight</div>
              <select value={theme.headingWeight} onChange={e=>set("headingWeight",e.target.value)} style={inp}>
                {[["400","Regular"],["500","Medium"],["600","Semi-bold"],["700","Bold"],["800","Extra-bold"],["900","Black"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
        {tab==="shape"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Border Radius</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RADIUS_OPTS.map(r=>(
                  <div key={r.value} onClick={()=>set("borderRadius",r.value)}
                    style={{padding:"6px 12px",borderRadius:r.value==="999px"?"999px":"8px",cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.borderRadius===r.value?C.accent:C.border}`,
                      background:theme.borderRadius===r.value?C.accentLight:"transparent",
                      color:theme.borderRadius===r.value?C.accent:C.text2}}>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Button Style</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {BUTTON_STYLES.map(b=>(
                  <div key={b.value} onClick={()=>set("buttonStyle",b.value)}
                    style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.buttonStyle===b.value?C.accent:C.border}`,
                      background:theme.buttonStyle===b.value?C.accentLight:"transparent",
                      color:theme.buttonStyle===b.value?C.accent:C.text2}}>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Button Radius</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RADIUS_OPTS.map(r=>(
                  <div key={r.value} onClick={()=>set("buttonRadius",r.value)}
                    style={{padding:"6px 12px",borderRadius:r.value==="999px"?"999px":"8px",cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.buttonRadius===r.value?C.accent:C.border}`,
                      background:theme.buttonRadius===r.value?C.accentLight:"transparent",
                      color:theme.buttonRadius===r.value?C.accent:C.text2}}>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Content Max Width</div>
              <select value={theme.maxWidth} onChange={e=>set("maxWidth",e.target.value)} style={inp}>
                {[["720px","Narrow (720)"],["960px","Medium (960)"],["1200px","Wide (1200)"],["1440px","Full (1440)"],["100%","Edge-to-edge"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Live preview strip */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`}}>
        <div style={{padding:"12px 16px",borderRadius:10,background:theme.bgColor||"#fff",border:`1px solid ${C.border}`,fontFamily:theme.fontFamily}}>
          <div style={{fontSize:15,fontWeight:parseInt(theme.headingWeight)||700,color:theme.textColor,fontFamily:theme.headingFont,marginBottom:3}}>Preview heading</div>
          <div style={{fontSize:12,color:theme.textColor,opacity:0.6,marginBottom:10}}>Body text in your chosen font.</div>
          <span style={{padding:"7px 16px",borderRadius:theme.buttonRadius||"8px",fontSize:12,fontWeight:600,fontFamily:theme.fontFamily,
            background:theme.buttonStyle==="filled"?theme.primaryColor:"transparent",
            color:theme.buttonStyle==="filled"?"white":theme.primaryColor,
            border:theme.buttonStyle==="outline"?`2px solid ${theme.primaryColor}`:"none",
            borderBottom:theme.buttonStyle==="underline"?`2px solid ${theme.primaryColor}`:"none",
            display:"inline-block"}}>
            Call to action
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Widget Picker Modal ───────────────────────────────────────────────────────
const WidgetPicker = ({ onSelect, onClose }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.35)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,width:420,boxShadow:"0 20px 64px rgba(0,0,0,.18)",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:15,fontWeight:800,color:C.text1}}>Add Widget</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
      </div>
      <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:380,overflowY:"auto"}}>
        {WIDGET_TYPES.map(w=>(
          <div key={w.type} onClick={()=>onSelect(w.type)}
            style={{padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,cursor:"pointer",
              display:"flex",alignItems:"center",gap:10,transition:"all .1s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="transparent";}}>
            <span style={{fontSize:22}}>{w.icon}</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{w.label}</div>
              <div style={{fontSize:10,color:C.text3}}>{w.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Widget Preview ────────────────────────────────────────────────────────────
const WidgetPreview = ({ cell, theme }) => {
  const t = theme;
  const cfg = cell.widgetConfig||{};
  const btnStyle = {
    padding:`7px 18px`, borderRadius:t.buttonRadius||"8px", fontSize:12, fontWeight:600, fontFamily:t.fontFamily||F,
    background:t.buttonStyle==="filled"?t.primaryColor:"transparent",
    color:t.buttonStyle==="filled"?"white":t.primaryColor,
    border:t.buttonStyle==="outline"?`2px solid ${t.primaryColor}`:"none",
    borderBottom:t.buttonStyle==="underline"?`2px solid ${t.primaryColor}`:"none",
    display:"inline-block",cursor:"default",
  };

  if (cell.widgetType==="hero") return (
    <div style={{padding:"32px 24px",textAlign:"center",background:`linear-gradient(135deg,${t.primaryColor}18,${t.secondaryColor}0a)`}}>
      <div style={{fontSize:22,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:6}}>
        {cfg.headline||"Your Compelling Headline"}
      </div>
      <div style={{fontSize:13,color:t.textColor,opacity:0.65,marginBottom:16,fontFamily:t.fontFamily}}>
        {cfg.subheading||"A short description that tells visitors what to expect here."}
      </div>
      <span style={btnStyle}>{cfg.ctaText||"Get Started"}</span>
    </div>
  );

  if (cell.widgetType==="text") return (
    <div style={{padding:"16px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:16,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:6}}>
        {cfg.heading||"Content Heading"}
      </div>
      <div style={{fontSize:13,color:t.textColor,opacity:0.65,lineHeight:1.7}}>
        {cfg.content||"Your content will appear here. Add copy, instructions, or descriptions to engage your visitors."}
      </div>
    </div>
  );

  if (cell.widgetType==="image") return (
    <div style={{background:C.surface2,minHeight:100,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,overflow:"hidden"}}>
      {cfg.url?<img src={cfg.url} alt="" style={{width:"100%",display:"block"}}/>:(
        <div style={{textAlign:"center",color:C.text3,padding:24}}>
          <div style={{fontSize:28}}>🖼</div><div style={{fontSize:11,marginTop:4}}>Add image URL in settings</div>
        </div>
      )}
    </div>
  );

  if (cell.widgetType==="jobs") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>Open Positions</div>
      {["Senior Engineer","Product Designer","Head of Sales"].map((j,i)=>(
        <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:t.textColor}}>{j}</div>
            <div style={{fontSize:10,color:C.text3}}>Engineering · Remote</div>
          </div>
          <span style={{fontSize:11,color:t.primaryColor,fontWeight:600}}>Apply →</span>
        </div>
      ))}
    </div>
  );

  if (cell.widgetType==="form") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>
        {cfg.title||"Apply Now"}
      </div>
      {["Name","Email","Role"].map(f=>(
        <div key={f} style={{marginBottom:8}}>
          <div style={{fontSize:10,fontWeight:600,color:C.text3,marginBottom:2}}>{f}</div>
          <div style={{height:28,borderRadius:t.borderRadius||"8px",border:`1px solid ${C.border}`,background:C.surface2}}/>
        </div>
      ))}
      <div style={{...btnStyle,marginTop:10,textAlign:"center",display:"block"}}>Submit Application</div>
    </div>
  );

  if (cell.widgetType==="stats") return (
    <div style={{padding:"20px",display:"flex",gap:20,justifyContent:"center",fontFamily:t.fontFamily}}>
      {(cfg.stats||[{value:"500+",label:"Employees"},{value:"12",label:"Offices"},{value:"20+",label:"Countries"}]).map((s,i)=>(
        <div key={i} style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:800,color:t.primaryColor,fontFamily:t.headingFont}}>{s.value}</div>
          <div style={{fontSize:11,color:C.text3}}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  if (cell.widgetType==="team") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>Meet the Team</div>
      <div style={{display:"flex",gap:14}}>
        {[["SJ","#4361EE"],["ML","#7C3AED"],["AR","#0D9488"],["PK","#E11D48"]].map(([init,col])=>(
          <div key={init} style={{textAlign:"center"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:`${col}18`,border:`2px solid ${col}40`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:col}}>{init}</div>
            <div style={{fontSize:9,color:C.text3,marginTop:4}}>Team Member</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (cell.widgetType==="video") return (
    <div style={{background:"#000",minHeight:90,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8}}>
      <div style={{textAlign:"center",color:"rgba(255,255,255,.5)"}}>
        <div style={{fontSize:32}}>▶</div>
        <div style={{fontSize:11,marginTop:4}}>{cfg.url?cfg.url.slice(0,40)+"…":"Add video URL"}</div>
      </div>
    </div>
  );

  if (cell.widgetType==="divider") return (
    <div style={{padding:"20px",display:"flex",alignItems:"center"}}>
      <div style={{flex:1,height:1,background:C.border}}/>
    </div>
  );

  if (cell.widgetType==="spacer") return (
    <div style={{height:cfg.height||"48px",background:"repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(0,0,0,.025) 8px,rgba(0,0,0,.025) 16px)",
      display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>
      <span style={{fontSize:10,color:C.text3}}>Spacer · {cfg.height||"48px"}</span>
    </div>
  );

  const wt = WIDGET_TYPES.find(w=>w.type===cell.widgetType);
  return (
    <div style={{padding:"16px 20px",display:"flex",gap:10,alignItems:"center"}}>
      <span style={{fontSize:22}}>{wt?.icon}</span>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{wt?.label}</div>
        <div style={{fontSize:11,color:C.text3}}>Click to configure</div>
      </div>
    </div>
  );
};

// ─── Widget Cell ──────────────────────────────────────────────────────────────
const WidgetCell = ({ cell, flex, onUpdate, onRemove, theme, isEditing }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={{flex, minWidth:0, position:"relative"}}>
      {!cell.widgetType ? (
        <div onClick={()=>isEditing&&setShowPicker(true)}
          style={{minHeight:120,borderRadius:10,border:`2px dashed ${C.border}`,background:C.surface2,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
            cursor:isEditing?"pointer":"default",transition:"all .15s",padding:16}}
          onMouseEnter={e=>{if(isEditing){e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface2;}}>
          {isEditing&&<>
            <div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n="plus" s={14} c={C.accent}/>
            </div>
            <span style={{fontSize:11,color:C.accent,fontWeight:600}}>Add widget</span>
          </>}
          {!isEditing&&<span style={{fontSize:11,color:C.text3}}>Empty</span>}
        </div>
      ) : (
        <div style={{position:"relative",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,overflow:"hidden",minHeight:80}}
          onMouseEnter={e=>{if(isEditing){const a=e.currentTarget.querySelector(".wa");if(a)a.style.opacity="1";}}}
          onMouseLeave={e=>{if(isEditing){const a=e.currentTarget.querySelector(".wa");if(a)a.style.opacity="0";}}}>
          <WidgetPreview cell={cell} theme={theme}/>
          {isEditing&&(
            <div className="wa" style={{position:"absolute",top:6,right:6,display:"flex",gap:4,opacity:0,transition:"opacity .15s"}}>
              <button onClick={()=>setShowPicker(true)}
                style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${C.border}`,background:"rgba(255,255,255,.95)",
                  color:C.text2,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
                <Ic n="edit" s={10}/> Change
              </button>
              <button onClick={onRemove}
                style={{padding:"4px 7px",borderRadius:6,border:`1px solid ${C.red}30`,background:"rgba(255,255,255,.95)",color:C.red,fontSize:10,cursor:"pointer"}}>
                <Ic n="trash" s={10}/>
              </button>
            </div>
          )}
        </div>
      )}
      {showPicker&&<WidgetPicker onSelect={type=>{onUpdate({...cell,widgetType:type,widgetConfig:{}});setShowPicker(false);}} onClose={()=>setShowPicker(false)}/>}
    </div>
  );
};

// ─── Row Settings Popover ─────────────────────────────────────────────────────
const RowSettings = ({ row, onChange, onClose }) => {
  const set = (k,v) => onChange({...row,[k]:v});
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};

  const changePreset = (preset) => {
    const numCols = preset==="1"?1:2;
    const cells = Array.from({length:numCols},(_,i)=>row.cells[i]||defaultCell());
    onChange({...row,preset,cells});
  };

  return (
    <div style={{position:"absolute",top:0,right:-268,width:248,background:C.surface,border:`1px solid ${C.border}`,
      borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,fontWeight:700,color:C.text1}}>Row settings</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={13}/></button>
      </div>
      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Layout</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {COLUMN_PRESETS.map(p=>(
              <div key={p.id} onClick={()=>changePreset(p.id)}
                style={{padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700,
                  border:`1.5px solid ${row.preset===p.id?C.accent:C.border}`,
                  background:row.preset===p.id?C.accentLight:"transparent",
                  color:row.preset===p.id?C.accent:C.text2}}
                title={p.label}>
                {p.icon}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Vertical Padding</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {PADDING_OPTS.map(p=>(
              <div key={p.value} onClick={()=>set("padding",p.value)}
                style={{padding:"4px 9px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,
                  border:`1.5px solid ${row.padding===p.value?C.accent:C.border}`,
                  background:row.padding===p.value?C.accentLight:"transparent",
                  color:row.padding===p.value?C.accent:C.text2}}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
        <ColorPicker label="Background Colour" value={row.bgColor} onChange={v=>set("bgColor",v)}/>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Background Image</div>
          <input value={row.bgImage||""} onChange={e=>set("bgImage",e.target.value)} placeholder="https://…" style={inp}/>
        </div>
        {row.bgImage&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>
              Image Overlay · {row.overlayOpacity||0}%
            </div>
            <input type="range" min="0" max="85" value={row.overlayOpacity||0}
              onChange={e=>set("overlayOpacity",parseInt(e.target.value))} style={{width:"100%"}}/>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Canvas Row ───────────────────────────────────────────────────────────────
const CanvasRow = ({ row, index, total, onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate, theme, isEditing, dragTarget, onDragStart, onDragOver, onDrop }) => {
  const [showSettings, setShowSettings] = useState(false);
  const padMap = {none:"0px",sm:"24px",md:"56px",lg:"96px",xl:"140px"};
  const padding = padMap[row.padding]||"56px";

  const updateCell = (ci, updated) => onUpdate({...row, cells:row.cells.map((c,i)=>i===ci?updated:c)});
  const removeWidget = (ci) => onUpdate({...row, cells:row.cells.map((c,i)=>i===ci?defaultCell():c)});

  // Column flex values per preset
  const cellFlex = (ci) => {
    if (row.preset==="1")   return "1 1 100%";
    if (row.preset==="1-2") return ci===0?"0 0 33%":"0 0 67%";
    if (row.preset==="2-1") return ci===0?"0 0 67%":"0 0 33%";
    return "1 1 0"; // 2 or 3 cols equal
  };

  return (
    <div draggable={isEditing} onDragStart={()=>onDragStart(index)} onDragOver={e=>{e.preventDefault();onDragOver(index);}} onDrop={()=>onDrop(index)}
      style={{position:"relative",border:isEditing?`1.5px solid ${dragTarget?C.accent:C.border}`:"none",
        borderRadius:isEditing?10:0,marginBottom:isEditing?6:0,
        background:row.bgImage?`url(${row.bgImage}) center/cover no-repeat`:(row.bgColor||"transparent"),
        cursor:isEditing?"grab":"default"}}>
      {/* Overlay */}
      {row.bgImage&&(row.overlayOpacity||0)>0&&(
        <div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(row.overlayOpacity||0)/100})`,borderRadius:isEditing?10:0,pointerEvents:"none"}}/>
      )}
      {/* Content */}
      <div style={{position:"relative",padding:`${padding} ${isEditing?"16px":"0"}`,maxWidth:theme.maxWidth||"1200px",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",gap:16,alignItems:"stretch",flexWrap:"wrap"}}>
          {row.cells.map((cell,ci)=>(
            <WidgetCell key={cell.id} cell={cell} flex={cellFlex(ci)}
              onUpdate={u=>updateCell(ci,u)} onRemove={()=>removeWidget(ci)}
              theme={theme} isEditing={isEditing}/>
          ))}
        </div>
      </div>
      {/* Row toolbar — appears on hover */}
      {isEditing&&(
        <div className="row-tb" style={{position:"absolute",top:4,left:4,display:"flex",gap:2,
          background:"rgba(255,255,255,.95)",border:`1px solid ${C.border}`,borderRadius:7,padding:"2px 4px",
          opacity:0,transition:"opacity .15s",zIndex:50}}
          onMouseEnter={e=>e.currentTarget.style.opacity="1"}
          onMouseLeave={e=>e.currentTarget.style.opacity="0"}>
          <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={index===0}
            style={{background:"none",border:"none",cursor:index===0?"default":"pointer",padding:3,opacity:index===0?.3:1}}>
            <Ic n="chevD" s={11} c={C.text3} style={{transform:"rotate(180deg)"}}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={index===total-1}
            style={{background:"none",border:"none",cursor:index===total-1?"default":"pointer",padding:3,opacity:index===total-1?.3:1}}>
            <Ic n="chevD" s={11} c={C.text3}/>
          </button>
          <button onClick={e=>{e.stopPropagation();setShowSettings(s=>!s);}}
            style={{background:"none",border:"none",cursor:"pointer",padding:3,color:showSettings?C.accent:C.text3}}>
            <Ic n="settings" s={11} c={showSettings?C.accent:C.text3}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onDuplicate();}}
            style={{background:"none",border:"none",cursor:"pointer",padding:3}}>
            <Ic n="copy" s={11} c={C.text3}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete();}}
            style={{background:"none",border:"none",cursor:"pointer",padding:3}}>
            <Ic n="trash" s={11} c={C.red}/>
          </button>
        </div>
      )}
      {/* Hover target for row toolbar */}
      {isEditing&&(
        <div style={{position:"absolute",inset:0,borderRadius:10,pointerEvents:"none"}}
          onMouseEnter={e=>{const tb=e.currentTarget.previousSibling;if(tb&&tb.classList.contains("row-tb"))tb.style.opacity="1";}}
          onMouseLeave={e=>{const tb=e.currentTarget.previousSibling;if(tb&&tb.classList.contains("row-tb"))tb.style.opacity="0";}}/>
      )}
      {/* Settings popover */}
      {isEditing&&showSettings&&<RowSettings row={row} onChange={onUpdate} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
};

// ─── Add Row Bar ──────────────────────────────────────────────────────────────
const AddRowBar = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{margin:"4px 0",display:"flex",justifyContent:"center"}}>
      {!open?(
        <button onClick={()=>setOpen(true)}
          style={{display:"flex",alignItems:"center",gap:5,padding:"3px 14px",borderRadius:99,
            border:`1.5px dashed ${C.border}`,background:"transparent",color:C.text3,
            fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .12s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
          <Ic n="plus" s={10}/> Add row
        </button>
      ):(
        <div style={{display:"flex",gap:5,padding:"6px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,.08)"}}>
          {COLUMN_PRESETS.map(p=>(
            <button key={p.id} onClick={()=>{onAdd(p.id);setOpen(false);}}
              style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface2,
                cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,color:C.text2,transition:"all .1s"}}
              title={p.label}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=C.accentLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;e.currentTarget.style.background=C.surface2;}}>
              {p.icon} {p.label}
            </button>
          ))}
          <button onClick={()=>setOpen(false)} style={{padding:"5px 7px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",color:C.text3}}>
            <Ic n="x" s={11}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Canvas ───────────────────────────────────────────────────────────────────
const PortalCanvas = ({ page, onUpdate, theme, isEditing }) => {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  const updateRow = (i, updated) => onUpdate({...page, rows:page.rows.map((r,j)=>j===i?updated:r)});
  const deleteRow = (i) => onUpdate({...page, rows:page.rows.filter((_,j)=>j!==i)});
  const addRow = (preset, afterIdx) => {
    const rows = [...page.rows];
    rows.splice(afterIdx+1, 0, defaultRow(preset));
    onUpdate({...page, rows});
  };
  const moveRow = (i, dir) => {
    const rows = [...page.rows]; const j = i+dir;
    if(j<0||j>=rows.length) return;
    [rows[i],rows[j]]=[rows[j],rows[i]];
    onUpdate({...page, rows});
  };
  const duplicateRow = (i) => {
    const rows = [...page.rows];
    const copy = JSON.parse(JSON.stringify(rows[i]));
    copy.id = uid(); copy.cells = copy.cells.map(c=>({...c,id:uid()}));
    rows.splice(i+1,0,copy);
    onUpdate({...page, rows});
  };
  const handleDrop = (toIdx) => {
    if(dragFrom===null||dragFrom===toIdx) return;
    const rows=[...page.rows];
    const [moved]=rows.splice(dragFrom,1);
    rows.splice(toIdx,0,moved);
    onUpdate({...page,rows});
    setDragFrom(null); setDragTarget(null);
  };

  return (
    <div style={{background:isEditing?C.bg:(theme.bgColor||"#fff"),minHeight:400,padding:isEditing?"12px":"0"}}>
      {page.rows.map((row,i)=>(
        <div key={row.id}>
          {isEditing&&<AddRowBar onAdd={preset=>addRow(preset,i-1)}/>}
          <CanvasRow row={row} index={i} total={page.rows.length}
            onUpdate={u=>updateRow(i,u)} onDelete={()=>deleteRow(i)}
            onMoveUp={()=>moveRow(i,-1)} onMoveDown={()=>moveRow(i,1)}
            onDuplicate={()=>duplicateRow(i)}
            theme={theme} isEditing={isEditing}
            dragTarget={dragTarget===i}
            onDragStart={setDragFrom} onDragOver={setDragTarget} onDrop={handleDrop}/>
        </div>
      ))}
      {isEditing&&<AddRowBar onAdd={preset=>addRow(preset,page.rows.length-1)}/>}
    </div>
  );
};

// ─── Portal Builder (full-screen editor) ──────────────────────────────────────
const PortalBuilder = ({ portal:init, onSave, onClose }) => {
  const [portal, setPortal] = useState({
    ...init,
    theme: init.theme||defaultTheme(),
    pages: init.pages?.length?init.pages:[defaultPage()],
  });
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [showTheme, setShowTheme] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [saving, setSaving] = useState(false);

  const page = portal.pages[activePageIdx]||portal.pages[0];

  const updatePage = (updated) => setPortal(p=>({...p,pages:p.pages.map((pg,i)=>i===activePageIdx?updated:pg)}));
  const addPage = () => {
    const np = {...defaultPage(),id:uid(),name:`Page ${portal.pages.length+1}`,slug:`/page-${portal.pages.length+1}`};
    setPortal(p=>({...p,pages:[...p.pages,np]}));
    setActivePageIdx(portal.pages.length);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(portal);
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:F,background:C.bg}}>
      {/* Top bar */}
      <div style={{height:52,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:0,flexShrink:0,padding:"0 16px"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:6,fontFamily:F,fontSize:13}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text1} onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <Ic n="arrowL" s={14}/> Portals
        </button>
        <div style={{width:1,height:24,background:C.border,margin:"0 12px"}}/>
        <input value={portal.name} onChange={e=>setPortal(p=>({...p,name:e.target.value}))}
          style={{border:"none",outline:"none",fontSize:14,fontWeight:700,color:C.text1,background:"transparent",fontFamily:F,minWidth:160}}/>
        <div style={{flex:1}}/>
        {/* Page tabs */}
        <div style={{display:"flex",gap:2,background:C.surface2,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
          {portal.pages.map((pg,i)=>(
            <button key={pg.id} onClick={()=>setActivePageIdx(i)}
              style={{padding:"4px 12px",borderRadius:6,border:"none",fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer",
                background:activePageIdx===i?C.surface:"transparent",color:activePageIdx===i?C.text1:C.text3,
                boxShadow:activePageIdx===i?"0 1px 3px rgba(0,0,0,.06)":"none"}}>
              {pg.name}
            </button>
          ))}
          <button onClick={addPage} style={{padding:"4px 7px",borderRadius:6,border:"none",background:"transparent",color:C.text3,cursor:"pointer"}}><Ic n="plus" s={11}/></button>
        </div>
        <div style={{width:1,height:24,background:C.border,margin:"0 12px"}}/>
        {/* Actions */}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setIsEditing(e=>!e)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:isEditing?C.accentLight:"transparent",color:isEditing?C.accent:C.text2}}>
            <Ic n="eye" s={12} c={isEditing?C.accent:C.text2}/>{isEditing?"Editing":"Preview"}
          </button>
          <button onClick={()=>setShowTheme(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:showTheme?C.accentLight:"transparent",color:showTheme?C.accent:C.text2}}>
            <Ic n="palette" s={12} c={showTheme?C.accent:C.text2}/>Theme
          </button>
          <Btn v="primary" s="sm" onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save"}</Btn>
          <Btn v={portal.status==="published"?"success":"secondary"} s="sm"
            onClick={()=>setPortal(p=>({...p,status:p.status==="published"?"draft":"published"}))}>
            {portal.status==="published"?"✓ Published":"Publish"}
          </Btn>
          {portal.status==="published" && portal.slug && (
            <button onClick={()=>{
              const base = window.location.hostname==='localhost'?`http://localhost:5173`:`https://portal-renderer.vercel.app`;
              window.open(`${base}?portal=${portal.slug}`,'_blank');
            }} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.green}`,background:C.greenLight,color:C.green}}>
              <Ic n="eye" s={11} c={C.green}/>View Live
            </button>
          )}
        </div>
      </div>

      {/* Edit hint bar */}
      {isEditing&&(
        <div style={{padding:"5px 16px",background:C.accentLight,borderBottom:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",gap:6}}>
          <Ic n="edit" s={11} c={C.accent}/>
          <span style={{fontSize:11,color:C.accent,fontWeight:600}}>Editing — click cells to add widgets · drag rows to reorder · hover rows for settings</span>
        </div>
      )}

      {/* Canvas */}
      <div style={{flex:1,overflow:"auto",marginRight:showTheme?320:0,transition:"margin-right .2s"}}>
        <PortalCanvas page={page} onUpdate={updatePage} theme={portal.theme} isEditing={isEditing}/>
      </div>

      {showTheme&&<ThemeDrawer theme={portal.theme} onChange={t=>setPortal(p=>({...p,theme:t}))} onClose={()=>setShowTheme(false)}/>}
    </div>
  );
};

// ─── Portal Card ──────────────────────────────────────────────────────────────
const PortalCard = ({ portal, onEdit, onDelete, onDuplicate }) => {
  const t = portal.theme||defaultTheme();
  const pageCount = (portal.pages||[]).length||1;
  const widgetCount = (portal.pages||[]).reduce((a,pg)=>(pg.rows||[]).reduce((b,r)=>b+(r.cells||[]).filter(c=>c.widgetType).length,a),0);

  return (
    <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",transition:"all .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)";e.currentTarget.style.borderColor=C.border2;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      {/* Preview strip */}
      <div onClick={onEdit} style={{height:96,background:`linear-gradient(135deg,${t.primaryColor}22,${t.secondaryColor}12)`,
        position:"relative",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:t.primaryColor,fontFamily:t.headingFont||F}}>{portal.name}</div>
          <div style={{fontSize:10,color:C.text3,marginTop:2}}>{pageCount} page{pageCount!==1?"s":""} · {widgetCount} widget{widgetCount!==1?"s":""}</div>
        </div>
        <div style={{position:"absolute",bottom:8,left:10,display:"flex",gap:3}}>
          {[t.primaryColor,t.secondaryColor,t.accentColor].map((col,i)=>(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:col||C.text3}}/>
          ))}
        </div>
        <div style={{position:"absolute",top:8,right:8}}>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,
            background:portal.status==="published"?C.greenLight:C.amberLight,
            color:portal.status==="published"?C.green:C.amber}}>
            {portal.status==="published"?"LIVE":"DRAFT"}
          </span>
        </div>
      </div>
      {/* Footer */}
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{portal.name}</div>
          <div style={{fontSize:11,color:C.text3}}>{portal.slug||"/"}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {portal.status==="published" && (
            <button onClick={()=>{
              // In dev portal renderer is on :5173; in prod it's the same origin
              const base = window.location.hostname === 'localhost'
                ? window.location.origin.replace(':3000', ':5173')
                : window.location.origin;
              const portalUrl = `${base}?portal=${portal.slug}`;
              navigator.clipboard.writeText(portalUrl).catch(()=>{});
              alert(`Copied: ${portalUrl}`);
            }} title="Copy portal link"
              style={{background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:6,cursor:"pointer",padding:"4px 8px",color:C.green,fontSize:10,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
              <Ic n="link" s={11} c={C.green}/>Link
            </button>
          )}
          <button onClick={onDuplicate} title="Duplicate"
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:"4px 7px",color:C.text3}}>
            <Ic n="copy" s={12}/>
          </button>
          <button onClick={onEdit}
            style={{background:C.accent,border:"none",borderRadius:6,cursor:"pointer",padding:"5px 12px",color:"white",fontSize:11,fontWeight:600,fontFamily:F}}>
            Edit
          </button>
          <button onClick={onDelete}
            style={{background:C.redLight,border:`1px solid ${C.red}20`,borderRadius:6,cursor:"pointer",padding:"4px 7px",color:C.red}}>
            <Ic n="trash" s={12}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PortalsPage({ environment }) {
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null); // null = blank

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(`/portals?environment_id=${environment.id}`);
    setPortals(Array.isArray(data)?data:[]);
    setLoading(false);
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);

  if (editing) {
    return (
      <PortalBuilder
        portal={editing}
        onClose={()=>{ setEditing(null); load(); }}
        onSave={async (updated) => {
          if (updated.id&&!String(updated.id).startsWith("new_")) {
            await api.patch(`/portals/${updated.id}`, updated);
          } else {
            const created = await api.post("/portals",{...updated,environment_id:environment.id});
            setEditing(created);
          }
          load();
        }}
      />
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tmpl = TEMPLATES.find(t=>t.id===selectedTemplate);
    // Deep-clone template pages and give fresh IDs
    const pages = tmpl
      ? JSON.parse(JSON.stringify(tmpl.pages)).map(pg=>({
          ...pg, id:uid(),
          rows:pg.rows.map(r=>({...r,id:uid(),cells:r.cells.map(c=>({...c,id:uid()}))}))
        }))
      : [defaultPage()];
    const p = {
      name: newName.trim(),
      slug: `/${newName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      environment_id: environment.id,
      status: "draft",
      theme: tmpl ? {...tmpl.theme} : defaultTheme(),
      pages,
    };
    const created = await api.post("/portals", p);
    setNewName(""); setCreating(false); setSelectedTemplate(null);
    setEditing(created);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this portal?")) return;
    await api.delete(`/portals/${id}`);
    load();
  };

  const handleDuplicate = async (portal) => {
    const copy = {...portal,id:undefined,name:`${portal.name} (copy)`,slug:`${portal.slug}-copy`,status:"draft"};
    await api.post("/portals",{...copy,environment_id:environment.id});
    load();
  };

  return (
    <div style={{padding:"28px 32px",fontFamily:F}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Portals</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.text3}}>Build candidate-facing portals with a drag-and-drop canvas and design token system</p>
        </div>
        <Btn icon="plus" onClick={()=>setCreating(true)}>New Portal</Btn>
      </div>

      {creating&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={e=>e.target===e.currentTarget&&(setCreating(false),setSelectedTemplate(null),setNewName(""))}>
          <div style={{background:C.surface,borderRadius:16,width:680,maxWidth:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
            {/* Modal header */}
            <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:17,fontWeight:800,color:C.text1,marginBottom:2}}>New Portal</div>
              <div style={{fontSize:12,color:C.text3}}>Choose a template or start from a blank canvas</div>
            </div>
            {/* Template grid */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {/* Blank option */}
                <div onClick={()=>setSelectedTemplate(null)}
                  style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${selectedTemplate===null?C.accent:C.border}`,
                    cursor:"pointer",background:selectedTemplate===null?C.accentLight:"transparent",transition:"all .12s",
                    display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:C.surface2,border:`2px dashed ${C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>+</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:selectedTemplate===null?C.accent:C.text1}}>Blank canvas</div>
                    <div style={{fontSize:11,color:C.text3}}>Start from scratch</div>
                  </div>
                  {selectedTemplate===null&&<div style={{marginLeft:"auto",color:C.accent}}><Ic n="check" s={14} c={C.accent}/></div>}
                </div>
                {/* Template options */}
                {TEMPLATES.map(t=>(
                  <div key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                    style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${selectedTemplate===t.id?t.accent:C.border}`,
                      cursor:"pointer",background:selectedTemplate===t.id?`${t.accent}10`:"transparent",transition:"all .12s",
                      display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${t.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>
                      {t.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:selectedTemplate===t.id?t.accent:C.text1}}>{t.name}</div>
                      <div style={{fontSize:10,color:C.text3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                        {t.tags.map(tag=>(
                          <span key={tag} style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99,
                            background:selectedTemplate===t.id?`${t.accent}18`:C.surface2,
                            color:selectedTemplate===t.id?t.accent:C.text3,border:`1px solid ${selectedTemplate===t.id?t.accent+"30":C.border}`}}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedTemplate===t.id&&<Ic n="check" s={14} c={t.accent}/>}
                  </div>
                ))}
              </div>
              {/* Template preview strip */}
              {selectedTemplate&&(()=>{
                const tmpl = TEMPLATES.find(t=>t.id===selectedTemplate);
                return (
                  <div style={{borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:4}}>
                    <div style={{padding:"8px 14px",background:C.surface2,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Template preview</div>
                      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                        {[tmpl.theme.primaryColor,tmpl.theme.secondaryColor,tmpl.theme.bgColor].map((col,i)=>(
                          <div key={i} style={{width:10,height:10,borderRadius:"50%",background:col,border:`1px solid ${C.border}`}}/>
                        ))}
                        <span style={{fontSize:10,color:C.text3,marginLeft:6}}>{tmpl.theme.fontFamily?.split("'")[1]||"Default"}</span>
                      </div>
                    </div>
                    <div style={{padding:12,display:"flex",gap:6}}>
                      {tmpl.pages.map(pg=>(
                        <div key={pg.id} style={{flex:1,background:tmpl.theme.bgColor||"#fff",borderRadius:6,border:`1px solid ${C.border}`,overflow:"hidden",minWidth:0}}>
                          <div style={{padding:"4px 8px",background:`${tmpl.accent}18`,fontSize:9,fontWeight:700,color:tmpl.accent}}>{pg.name}</div>
                          <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
                            {pg.rows.map(row=>(
                              <div key={row.id} style={{display:"flex",gap:3}}>
                                {row.cells.map(cell=>(
                                  <div key={cell.id} style={{flex:1,height:12,borderRadius:3,
                                    background:cell.widgetType==="hero"?`${tmpl.accent}40`:cell.widgetType==="jobs"?`${tmpl.accent}20`:cell.widgetType==="form"?`${tmpl.accent}30`:`${C.border}`,
                                    fontSize:7,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                                    {cell.widgetType?WIDGET_TYPES.find(w=>w.type===cell.widgetType)?.label?.slice(0,3):""}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Name + actions */}
            <div style={{padding:"14px 24px 20px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Portal Name</div>
              <div style={{display:"flex",gap:8}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleCreate()}
                  placeholder={selectedTemplate?TEMPLATES.find(t=>t.id===selectedTemplate)?.name||"My Portal":"My Portal"}
                  autoFocus
                  style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.accent}`,
                    fontSize:13,fontFamily:F,outline:"none",color:C.text1,boxSizing:"border-box"}}/>
                <Btn v="secondary" onClick={()=>{setCreating(false);setSelectedTemplate(null);setNewName("");}}>Cancel</Btn>
                <Btn onClick={handleCreate} disabled={!newName.trim()}>
                  {selectedTemplate?"Use Template":"Create blank"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:"60px 0",color:C.text3}}>Loading portals…</div>
      ):portals.length===0?(
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{fontSize:40,marginBottom:16}}>🌐</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text1,marginBottom:6}}>No portals yet</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:24}}>Build your first candidate-facing portal with the drag-and-drop canvas</div>
          <Btn icon="plus" onClick={()=>setCreating(true)}>Create your first portal</Btn>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {portals.map(p=>(
            <PortalCard key={p.id} portal={p}
              onEdit={()=>setEditing(p)}
              onDelete={()=>handleDelete(p.id)}
              onDuplicate={()=>handleDuplicate(p)}/>
          ))}
        </div>
      )}
    </div>
  );
}
