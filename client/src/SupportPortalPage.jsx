import { useState, useEffect, useCallback, useRef } from "react";

// ─── Brand ────────────────────────────────────────────────────────────────────
const F   = "'DM Sans', -apple-system, sans-serif";
const FH  = "'Space Grotesk', 'DM Sans', sans-serif";
const ACC = "#4361EE";
const PUR = "#7c3aed";
const GRN = "#0CAF77";
const RED = "#ef4444";
const AMB = "#f59e0b";
const INK = "#0F1729";
const LS_KEY = "vrc_support_v2_identity";

// ─── Load fonts once ──────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("vrc-sp-fonts")) {
  const l = document.createElement("link");
  l.id = "vrc-sp-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700;800&display=swap";
  document.head.appendChild(l);
}

// ─── Vercentic crystal-stack icon ─────────────────────────────────────────────
const VIcon = ({ size = 28, color = INK }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path d="M8 52 L40 36 L72 52 L40 68 Z"  stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M8 52 L8 62 L40 78 L40 68 Z"   stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M72 52 L72 62 L40 78 L40 68 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" opacity="0.35"/>
    <path d="M20 34 L40 24 L60 34 L40 44 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M20 34 L20 42 L40 52 L40 44 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M60 34 L60 42 L40 52 L40 44 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" opacity="0.35"/>
    <path d="M28 18 L40 12 L52 18 L40 24 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M28 18 L28 24 L40 30 L40 24 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M52 18 L52 24 L40 30 L40 24 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" opacity="0.35"/>
  </svg>
);
const VIconWhite = ({ size = 28 }) => <VIcon size={size} color="white" />;

// ─── Aura background ──────────────────────────────────────────────────────────
function AuraBg() {
  return (
    <div aria-hidden="true" style={{
      position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden",
      background:"#f5f6ff",
    }}>
      <div style={{ position:"absolute", top:"-15%", left:"-8%", width:"55%", height:"55%",
        borderRadius:"50%", background:"radial-gradient(ellipse, rgba(99,102,241,0.22) 0%, transparent 65%)" }}/>
      <div style={{ position:"absolute", top:"-5%", right:"-5%", width:"48%", height:"50%",
        borderRadius:"50%", background:"radial-gradient(ellipse, rgba(167,139,250,0.16) 0%, transparent 60%)" }}/>
      <div style={{ position:"absolute", bottom:"-8%", left:"5%", width:"50%", height:"50%",
        borderRadius:"50%", background:"radial-gradient(ellipse, rgba(67,97,238,0.14) 0%, transparent 62%)" }}/>
      <div style={{ position:"absolute", bottom:"-5%", right:"-3%", width:"44%", height:"45%",
        borderRadius:"50%", background:"radial-gradient(ellipse, rgba(124,58,237,0.13) 0%, transparent 58%)" }}/>
      <div style={{ position:"absolute", top:"38%", left:"40%", width:"40%", height:"40%",
        borderRadius:"50%", background:"radial-gradient(ellipse, rgba(196,181,253,0.09) 0%, transparent 55%)" }}/>
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:"radial-gradient(rgba(67,97,238,0.1) 1px, transparent 1px)",
        backgroundSize:"28px 28px", opacity:0.4,
      }}/>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const CARD = {
  background:"rgba(255,255,255,0.80)",
  backdropFilter:"blur(22px) saturate(1.5)",
  WebkitBackdropFilter:"blur(22px) saturate(1.5)",
  borderRadius:16,
  border:"1px solid rgba(255,255,255,0.92)",
  boxShadow:"0 4px 24px rgba(67,97,238,0.08), 0 1px 4px rgba(0,0,0,0.04)",
};

const mkInp = focused => ({
  width:"100%", padding:"10px 13px", borderRadius:10, fontFamily:F,
  border:`1.5px solid ${focused ? ACC : "rgba(67,97,238,0.18)"}`,
  fontSize:14, outline:"none", boxSizing:"border-box",
  background:"rgba(255,255,255,0.88)", color:INK, transition:"border-color 0.15s",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const api = {
  get:  url     => fetch(url).then(r => r.json()),
  post: (url,b) => fetch(url,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r=>r.json()),
};

const timeAgo = iso => {
  if (!iso) return "—";
  const d = (Date.now()-new Date(iso))/1000;
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

const domainFromEmail = email => {
  if (!email?.includes("@")) return "Unknown";
  const domain = email.split("@")[1];
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const Badge = ({ color, children, sm }) => (
  <span style={{
    display:"inline-flex", alignItems:"center",
    padding:sm?"2px 7px":"3px 10px",
    borderRadius:99, fontSize:sm?10:11, fontWeight:700,
    background:color+"18", color, border:`1px solid ${color}28`,
    whiteSpace:"nowrap", fontFamily:F,
  }}>{children}</span>
);

const Svg = ({ d, size=16, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

// ─── Gradient button ──────────────────────────────────────────────────────────
function Btn({ onClick, disabled, children, variant="primary", sm, style={} }) {
  const [hov, setHov] = useState(false);
  const base = {
    padding: sm ? "7px 16px" : "10px 22px",
    borderRadius:10, border:"none", fontFamily:FH, fontWeight:700,
    cursor:disabled?"not-allowed":"pointer",
    transition:"all 0.15s", letterSpacing:"-0.1px",
    display:"inline-flex", alignItems:"center", gap:7,
    fontSize: sm ? 12 : 13, opacity:disabled?0.55:1,
  };
  if (variant === "primary") return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ ...base,
        background: disabled?"#94a3b8":`linear-gradient(135deg, ${ACC}, ${PUR})`,
        color:"white",
        boxShadow: disabled?"none": hov?`0 6px 22px ${ACC}50`:`0 3px 14px ${ACC}38`,
        transform: hov&&!disabled?"translateY(-1px)":"none",
        ...style,
      }}>
      {children}
    </button>
  );
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base,
        background:"rgba(255,255,255,0.85)",
        color:"#374151", border:"1.5px solid rgba(67,97,238,0.18)",
        ...style,
      }}>
      {children}
    </button>
  );
}

// ─── Section icons & nav ──────────────────────────────────────────────────────
const ICONS = {
  cases:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2",
  kb:       "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  training: "M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  docs:     "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  news:     "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  status:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  downloads:"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  account:  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

const NAV = [
  { id:"cases",     label:"Support Cases",  icon:"cases"     },
  { id:"kb",        label:"Knowledge Base", icon:"kb"        },
  { id:"training",  label:"Training",       icon:"training"  },
  { id:"docs",      label:"Documents",      icon:"docs"      },
  { id:"news",      label:"What's New",     icon:"news"      },
  { id:"status",    label:"System Status",  icon:"status"    },
  { id:"downloads", label:"Downloads",      icon:"downloads" },
  { id:"account",   label:"Account",        icon:"account"   },
];

// ─── Data constants ───────────────────────────────────────────────────────────
const TYPES = [
  { id:"bug",     label:"Bug Report",      color:RED,       icon:"M12 8v4m0 4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z" },
  { id:"feature", label:"Feature Request", color:PUR,       icon:"M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.3 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" },
  { id:"support", label:"Support Query",   color:ACC,       icon:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { id:"account", label:"Account Issue",   color:AMB,       icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { id:"billing", label:"Billing",         color:GRN,       icon:"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { id:"other",   label:"Other",           color:"#6b7280", icon:"M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
];
const PRIORITIES = [
  { id:"low",      label:"Low",      color:"#6b7280" },
  { id:"medium",   label:"Medium",   color:AMB },
  { id:"high",     label:"High",     color:"#f97316" },
  { id:"critical", label:"Critical", color:RED },
];
const STATUSES = [
  { id:"open",            label:"Open",         color:ACC },
  { id:"in_progress",     label:"In Progress",  color:PUR },
  { id:"awaiting_client", label:"Awaiting You", color:AMB },
  { id:"resolved",        label:"Resolved",     color:GRN },
  { id:"closed",          label:"Closed",       color:"#6b7280" },
];

// ─── Identity Gate ────────────────────────────────────────────────────────────
function IdentityGate({ onIdentified }) {
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [company,setCompany]= useState("");
  const [error,  setError]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [foc,    setFoc]    = useState({});

  useEffect(() => {
    if (email.includes("@") && !company) setCompany(domainFromEmail(email));
  }, [email]);

  const submit = e => {
    e?.preventDefault();
    if (!name.trim())  { setError("Please enter your name."); return; }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError("Please enter a valid email address."); return; }
    setBusy(true);
    const id = { name:name.trim(), email:email.trim().toLowerCase(),
      company:company.trim()||domainFromEmail(email), domain:email.split("@")[1] };
    localStorage.setItem(LS_KEY, JSON.stringify(id));
    setTimeout(() => { setBusy(false); onIdentified(id); }, 360);
  };

  const f = k => ({ onFocus:()=>setFoc(v=>({...v,[k]:1})), onBlur:()=>setFoc(v=>({...v,[k]:0})) });

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:24, position:"relative", fontFamily:F }}>
      <AuraBg/>
      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:68, height:68, borderRadius:20,
            background:`linear-gradient(135deg, ${ACC}, ${PUR})`,
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 10px 36px ${ACC}48`, marginBottom:20 }}>
            <VIconWhite size={40}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontFamily:FH, fontSize:24, fontWeight:800, color:INK, letterSpacing:"-0.5px" }}>
              Vercentic
            </span>
            <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase",
              color:ACC, background:`${ACC}14`, border:`1px solid ${ACC}22`, padding:"3px 8px", borderRadius:6 }}>
              Client Portal
            </span>
          </div>
          <p style={{ margin:0, fontSize:14, color:"#6b7280", lineHeight:1.65 }}>
            Access support cases, training resources, documents and more.
          </p>
        </div>

        <div style={{ ...CARD, padding:"32px 36px" }}>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[["Your Name","text",name,setName,"n","Jane Smith"],
              ["Work Email","email",email,setEmail,"e","jane@yourcompany.com"],
              ["Company Name","text",company,setCompany,"c","Your Company Ltd"]
            ].map(([label,type,val,set,k,ph])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b7280",
                  marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</label>
                <input type={type} value={val}
                  onChange={e=>{set(e.target.value);setError("");}}
                  placeholder={ph} style={mkInp(foc[k])} {...f(k)}/>
              </div>
            ))}
            <p style={{ margin:0, fontSize:11, color:"#9ca3af", fontFamily:F }}>
              All cases from your company domain will be visible to you.
            </p>
            {error && (
              <div style={{ fontSize:12, color:RED, fontWeight:600,
                display:"flex", alignItems:"center", gap:6 }}>
                <Svg d="M12 8v4m0 4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z" size={13} color={RED}/>
                {error}
              </div>
            )}
            <Btn onClick={submit} disabled={busy} style={{ marginTop:4, justifyContent:"center", width:"100%" }}>
              {busy ? "Opening portal…" : "Enter Portal →"}
            </Btn>
          </form>
        </div>
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", marginTop:18, fontFamily:F }}>
          Cases are shared by company email domain. Password login coming soon.
        </p>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function SectionGroup({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:10, fontWeight:800, color:"#9ca3af", letterSpacing:"0.07em",
        textTransform:"uppercase", marginBottom:10, fontFamily:F }}>{title}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{children}</div>
    </div>
  );
}

function LoadSpinner() {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:"#9ca3af", fontFamily:F }}>
      <div style={{ width:28, height:28, border:`3px solid rgba(67,97,238,0.14)`,
        borderTopColor:ACC, borderRadius:"50%", margin:"0 auto 12px",
        animation:"vrc_sp 0.9s linear infinite" }}/>
      Loading…
      <style>{`@keyframes vrc_sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Case Card ────────────────────────────────────────────────────────────────
function CaseCard({ caseData, onClick, identity }) {
  const [hov,setHov] = useState(false);
  const status   = STATUSES.find(s=>s.id===caseData.status)     || STATUSES[0];
  const type     = TYPES.find(t=>t.id===caseData.type)          || TYPES[2];
  const priority = PRIORITIES.find(p=>p.id===caseData.priority) || PRIORITIES[1];
  const msgs = (caseData.threads||[]).filter(t=>t.visibility==="client");
  const isMe = caseData.reporter_email === identity?.email;

  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        ...CARD, padding:"16px 20px", cursor:"pointer",
        transform:hov?"translateY(-1px)":"none",
        boxShadow:hov?`0 8px 28px ${ACC}18, 0 2px 8px rgba(0,0,0,0.05)`:CARD.boxShadow,
        transition:"all 0.15s", display:"flex", alignItems:"flex-start", gap:14,
      }}>
      <div style={{ width:40, height:40, borderRadius:11, background:type.color+"13", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${type.color}20` }}>
        <Svg d={type.icon} size={17} color={type.color}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:5 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.05em", fontFamily:F }}>
            {caseData.case_number}
          </span>
          <Badge color={status.color} sm>{status.label}</Badge>
          <Badge color={priority.color} sm>{priority.label}</Badge>
          {!isMe && caseData.reporter_name && (
            <span style={{ fontSize:10, color:"#9ca3af", fontFamily:F }}>· {caseData.reporter_name}</span>
          )}
        </div>
        <div style={{ fontFamily:FH, fontSize:14, fontWeight:700, color:INK,
          marginBottom:3, lineHeight:1.3, letterSpacing:"-0.2px" }}>{caseData.subject}</div>
        <div style={{ fontSize:12, color:"#9ca3af", fontFamily:F }}>
          {timeAgo(caseData.created_at)}
          {msgs.length>0 && ` · ${msgs.length} message${msgs.length!==1?"s":""}`}
        </div>
      </div>
      <div style={{ color:"rgba(67,97,238,0.28)", fontSize:18, flexShrink:0, marginTop:3,
        transform:hov?"translateX(2px)":"none", transition:"transform 0.15s" }}>›</div>
    </div>
  );
}

// ─── New Case Form ────────────────────────────────────────────────────────────
function NewCaseForm({ identity, onSubmit, onCancel }) {
  const [form,  setForm]   = useState({ subject:"", type:"support", priority:"medium", description:"" });
  const [saving,setSaving] = useState(false);
  const [error, setError]  = useState("");
  const [foc,   setFoc]    = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const f = k => ({ onFocus:()=>setFoc(v=>({...v,[k]:1})), onBlur:()=>setFoc(v=>({...v,[k]:0})) });

  const submit = async () => {
    if (!form.subject.trim())     { setError("Please add a subject."); return; }
    if (!form.description.trim()) { setError("Please describe your issue."); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/cases", {
        ...form, reporter_name:identity.name, reporter_email:identity.email,
        client_name:identity.company, client_domain:identity.domain,
      });
      res.error ? setError(res.error) : onSubmit(res);
    } catch { setError("Failed to submit. Please try again."); }
    finally   { setSaving(false); }
  };

  return (
    <div>
      <button onClick={onCancel} style={{ background:"none", border:"none", color:"#6b7280",
        cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", gap:5, padding:0, marginBottom:20 }}>
        <Svg d="M19 12H5M12 5l-7 7 7 7" size={14}/> Back
      </button>
      <h2 style={{ margin:"0 0 20px", fontFamily:FH, fontSize:20, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>
        New Support Request
      </h2>
      <div style={{ ...CARD, padding:"28px 30px", display:"flex", flexDirection:"column", gap:20 }}>
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b7280",
            marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>
            Subject <span style={{color:RED}}>*</span>
          </label>
          <input value={form.subject} onChange={e=>{set("subject",e.target.value);setError("");}}
            placeholder="Brief description of your issue" style={mkInp(foc.s)} {...f("s")}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b7280",
              marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Request Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {TYPES.map(t=>(
                <button key={t.id} onClick={()=>set("type",t.id)} style={{
                  padding:"8px 6px", borderRadius:9,
                  border:`2px solid ${form.type===t.id?t.color:"rgba(67,97,238,0.13)"}`,
                  background:form.type===t.id?t.color+"11":"rgba(255,255,255,0.65)",
                  cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:5,
                  fontSize:11, fontWeight:600, color:form.type===t.id?t.color:"#374151", transition:"all 0.13s",
                }}>
                  <Svg d={t.icon} size={11} color={form.type===t.id?t.color:"#9ca3af"}/> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b7280",
              marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Priority</label>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {PRIORITIES.map(p=>(
                <button key={p.id} onClick={()=>set("priority",p.id)} style={{
                  padding:"8px 12px", borderRadius:9, textAlign:"left",
                  border:`2px solid ${form.priority===p.id?p.color:"rgba(67,97,238,0.13)"}`,
                  background:form.priority===p.id?p.color+"11":"rgba(255,255,255,0.65)",
                  cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:600,
                  color:form.priority===p.id?p.color:"#374151",
                  display:"flex", alignItems:"center", gap:7, transition:"all 0.13s",
                }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background:form.priority===p.id?p.color:"#d1d5db" }}/> {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b7280",
            marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>
            Description <span style={{color:RED}}>*</span>
          </label>
          <textarea value={form.description} onChange={e=>{set("description",e.target.value);setError("");}}
            rows={5} placeholder="Describe your issue in detail…"
            style={{ ...mkInp(foc.d), resize:"vertical", lineHeight:1.65 }} {...f("d")}/>
        </div>

        {error && (
          <div style={{ padding:"9px 13px", borderRadius:9, background:RED+"10",
            border:`1px solid ${RED}26`, fontSize:12, color:RED, fontWeight:600 }}>{error}</div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onCancel} variant="ghost" sm>Cancel</Btn>
          <Btn onClick={submit} disabled={saving} sm>{saving?"Submitting…":"Submit Request"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Case Thread ──────────────────────────────────────────────────────────────
function CaseThread({ caseData, identity, onBack, onUpdate }) {
  const [reply,  setReply]  = useState("");
  const [sending,setSending]= useState(false);
  const [foc,    setFoc]    = useState(false);
  const bottomRef = useRef(null);

  const status   = STATUSES.find(s=>s.id===caseData.status)     || STATUSES[0];
  const type     = TYPES.find(t=>t.id===caseData.type)          || TYPES[2];
  const priority = PRIORITIES.find(p=>p.id===caseData.priority) || PRIORITIES[1];
  const visible  = (caseData.threads||[]).filter(t=>t.visibility==="client"||t.type==="status_change");

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [visible.length]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const t = await api.post(`/api/cases/${caseData.id}/thread`,{
        body:reply, visibility:"client", type:"comment",
        author_name:identity.name, author_email:identity.email,
      });
      onUpdate({...caseData, threads:[...(caseData.threads||[]),t]});
      setReply("");
    } finally { setSending(false); }
  };

  const closed = ["resolved","closed"].includes(caseData.status);

  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#6b7280",
        cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", gap:5, padding:0, marginBottom:20 }}>
        <Svg d="M19 12H5M12 5l-7 7 7 7" size={14}/> Back to cases
      </button>
      <div style={{ ...CARD, padding:"20px 24px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:7 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.05em" }}>
            {caseData.case_number}
          </span>
          <Badge color={type.color}>{type.label}</Badge>
          <Badge color={priority.color}>{priority.label}</Badge>
          <Badge color={status.color}>{status.label}</Badge>
        </div>
        <div style={{ fontFamily:FH, fontSize:18, fontWeight:700, color:INK, lineHeight:1.3, letterSpacing:"-0.3px" }}>
          {caseData.subject}
        </div>
        <div style={{ fontSize:12, color:"#9ca3af", marginTop:5, fontFamily:F }}>
          Opened by {caseData.reporter_name||caseData.reporter_email} · {timeAgo(caseData.created_at)}
          {caseData.assignee_name && ` · Assigned to ${caseData.assignee_name}`}
        </div>
      </div>
      <div style={{ ...CARD, overflow:"hidden" }}>
        <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(67,97,238,0.08)" }}>
          <span style={{ fontFamily:FH, fontSize:13, fontWeight:600, color:INK }}>Conversation</span>
          <span style={{ marginLeft:8, fontSize:11, color:"#9ca3af", fontFamily:F }}>
            {visible.length} message{visible.length!==1?"s":""}
          </span>
        </div>
        <div style={{ padding:"20px 24px", minHeight:160, maxHeight:440, overflowY:"auto" }}>
          {visible.length===0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"#9ca3af", fontFamily:F }}>
              <Svg d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={28} color="#d1d5db"/>
              <div style={{ fontSize:13, marginTop:10, color:"#6b7280" }}>No messages yet — our team will respond shortly.</div>
            </div>
          ) : visible.map((t,i) => {
            if (t.type==="status_change") return (
              <div key={t.id||i} style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0",
                fontSize:11, color:"#9ca3af", fontFamily:F }}>
                <div style={{ flex:1, height:1, background:"rgba(67,97,238,0.07)" }}/>{t.body}
                <div style={{ flex:1, height:1, background:"rgba(67,97,238,0.07)" }}/>
              </div>
            );
            const isMe = t.author_email===identity.email;
            return (
              <div key={t.id||i} style={{ marginBottom:16, display:"flex",
                flexDirection:"column", alignItems:isMe?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"75%", padding:"10px 14px",
                  borderRadius:isMe?"14px 3px 14px 14px":"3px 14px 14px 14px",
                  background:isMe?`${ACC}11`:"rgba(248,249,255,0.9)",
                  border:`1px solid ${isMe?ACC+"26":"rgba(67,97,238,0.09)"}`,
                }}>
                  <div style={{ fontSize:10, fontWeight:700, color:isMe?ACC:"#6b7280", marginBottom:4, fontFamily:F }}>
                    {isMe?"You":(t.author_name||"Vercentic Support")}
                  </div>
                  <div style={{ fontSize:13, color:INK, lineHeight:1.65, whiteSpace:"pre-wrap", fontFamily:F }}>
                    {t.body}
                  </div>
                </div>
                <div style={{ fontSize:10, color:"#9ca3af", marginTop:3, fontFamily:F }}>{timeAgo(t.created_at)}</div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        {closed ? (
          <div style={{ padding:"12px 24px", background:"rgba(12,175,119,0.07)",
            borderTop:"1px solid rgba(12,175,119,0.18)",
            textAlign:"center", fontSize:13, color:GRN, fontWeight:600, fontFamily:F }}>
            ✓ This case has been {caseData.status}.&nbsp;
            <button onClick={onBack} style={{ background:"none", border:"none", color:GRN,
              fontWeight:700, cursor:"pointer", fontFamily:F, fontSize:13 }}>
              Open a new case →
            </button>
          </div>
        ) : (
          <div style={{ padding:"14px 24px", borderTop:"1px solid rgba(67,97,238,0.08)",
            background:"rgba(248,249,255,0.7)" }}>
            <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3}
              onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
              placeholder="Add a reply…"
              onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) send(); }}
              style={{ ...mkInp(foc), resize:"none", lineHeight:1.65 }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <span style={{ fontSize:11, color:"#9ca3af", fontFamily:F }}>⌘↵ to send</span>
              <Btn onClick={send} disabled={!reply.trim()||sending} sm>
                {sending?"Sending…":"Send Reply"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cases Section ────────────────────────────────────────────────────────────
function CasesSection({ identity }) {
  const [view,    setView]    = useState("list");
  const [cases,   setCases]   = useState([]);
  const [selected,setSelected]= useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/cases?limit=200&client_domain=${encodeURIComponent(identity.domain)}`);
      const all = Array.isArray(res.cases) ? res.cases : [];
      const full = await Promise.all(
        all.map(async c => { try { const f = await api.get(`/api/cases/${c.id}`); return f&&!f.error?f:c; } catch { return c; } })
      );
      setCases(full);
    } finally { setLoading(false); }
  }, [identity.domain]);

  useEffect(() => { load(); }, [load]);

  const submitNew = async c => {
    setSuccess(true); await load();
    try { const f = await api.get(`/api/cases/${c.id}`); if(f&&!f.error){setSelected(f);setView("thread");} else setView("list"); }
    catch { setView("list"); }
    setTimeout(()=>setSuccess(false), 4000);
  };

  if (view==="new")    return <NewCaseForm identity={identity} onSubmit={submitNew} onCancel={()=>setView("list")}/>;
  if (view==="thread") return (
    <CaseThread caseData={selected} identity={identity}
      onBack={()=>{setView("list");setSelected(null);}}
      onUpdate={u=>{setCases(cs=>cs.map(c=>c.id===u.id?u:c));setSelected(u);}}/>
  );

  const open   = cases.filter(c=>!["resolved","closed"].includes(c.status));
  const closed = cases.filter(c=> ["resolved","closed"].includes(c.status));

  return (
    <div>
      {success && (
        <div style={{ marginBottom:16, padding:"11px 16px", borderRadius:10,
          background:"rgba(12,175,119,0.09)", border:"1px solid rgba(12,175,119,0.22)",
          fontSize:13, color:GRN, fontWeight:600, fontFamily:F }}>
          ✓ Case submitted — our team will be in touch shortly!
        </div>
      )}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, gap:16 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>
            Support Cases
          </h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#6b7280", fontFamily:F }}>
            All cases for <strong style={{color:INK}}>{identity.company}</strong> ({identity.domain})
          </p>
        </div>
        <Btn onClick={()=>setView("new")} sm>
          <Svg d="M12 5v14M5 12h14" size={13} color="white"/> New Case
        </Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[
          ["Total", cases.length, ACC,     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2"],
          ["Open",  open.length,  "#3b82f6","M12 8v4m0 4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z"],
          ["Resolved",closed.length, GRN,  "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"],
        ].map(([label,val,color,icon])=>(
          <div key={label} style={{ ...CARD, padding:"16px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:color+"14",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Svg d={icon} size={17} color={color}/>
            </div>
            <div>
              <div style={{ fontFamily:FH, fontSize:24, fontWeight:800, color, letterSpacing:"-0.5px", lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2, fontWeight:600, fontFamily:F }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
      {loading ? <LoadSpinner/> : cases.length===0 ? (
        <div style={{ ...CARD, padding:"48px 40px", textAlign:"center" }}>
          <div style={{ width:68, height:68, borderRadius:20, background:`${ACC}13`, border:`1px solid ${ACC}18`,
            margin:"0 auto 18px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <VIcon size={38} color={ACC}/>
          </div>
          <div style={{ fontFamily:FH, fontSize:17, fontWeight:800, color:INK, marginBottom:6, letterSpacing:"-0.3px" }}>
            No support cases yet
          </div>
          <div style={{ fontSize:14, color:"#6b7280", marginBottom:22, fontFamily:F, lineHeight:1.6, maxWidth:320, margin:"0 auto 22px" }}>
            Submit a request and our team will get back to you quickly.
          </div>
          <Btn onClick={()=>setView("new")} sm>
            <Svg d="M12 5v14M5 12h14" size={13} color="white"/> Submit Request
          </Btn>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <SectionGroup title={`Active (${open.length})`}>
              {open.map(c=><CaseCard key={c.id} caseData={c} onClick={()=>{setSelected(c);setView("thread");}} identity={identity}/>)}
            </SectionGroup>
          )}
          {closed.length > 0 && (
            <div style={{ opacity:0.7 }}>
              <SectionGroup title={`Resolved & Closed (${closed.length})`}>
                {closed.map(c=><CaseCard key={c.id} caseData={c} onClick={()=>{setSelected(c);setView("thread");}} identity={identity}/>)}
              </SectionGroup>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────
const KB_ARTICLES = [
  { id:1, cat:"Getting Started", title:"Setting up your first job posting",       views:124, mins:4 },
  { id:2, cat:"Getting Started", title:"Inviting your team and assigning roles",  views:98,  mins:3 },
  { id:3, cat:"Candidates",      title:"How to import candidates via CSV",         views:87,  mins:5 },
  { id:4, cat:"Candidates",      title:"Using AI matching to find the best fit",   views:203, mins:6 },
  { id:5, cat:"Workflows",       title:"Building a hiring pipeline workflow",      views:76,  mins:7 },
  { id:6, cat:"Workflows",       title:"Setting up automated email triggers",      views:61,  mins:5 },
  { id:7, cat:"Reporting",       title:"Creating your first custom report",        views:55,  mins:4 },
  { id:8, cat:"Integrations",    title:"Connecting your email provider",           views:142, mins:3 },
];

function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [foc,    setFoc]    = useState(false);
  const cats = [...new Set(KB_ARTICLES.map(a=>a.cat))];
  const filtered = KB_ARTICLES.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.cat.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Knowledge Base</h2>
      <p style={{ margin:"0 0 16px", fontSize:13, color:"#6b7280", fontFamily:F }}>Self-service answers — find what you need without raising a case.</p>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        placeholder="Search articles…" style={{ ...mkInp(foc), maxWidth:400, marginBottom:20 }}/>
      {search ? (
        <SectionGroup title={`${filtered.length} result${filtered.length!==1?"s":""} for "${search}"`}>
          {filtered.map(a=><ArticleCard key={a.id} article={a}/>)}
        </SectionGroup>
      ) : cats.map(cat=>(
        <SectionGroup key={cat} title={cat}>
          {KB_ARTICLES.filter(a=>a.cat===cat).map(a=><ArticleCard key={a.id} article={a}/>)}
        </SectionGroup>
      ))}
    </div>
  );
}

function ArticleCard({ article }) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      ...CARD, padding:"14px 18px", cursor:"pointer",
      transform:hov?"translateY(-1px)":"none",
      boxShadow:hov?`0 6px 20px ${ACC}14`:CARD.boxShadow, transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${ACC}12`,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Svg d={ICONS.kb} size={16} color={ACC}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:FH, fontSize:14, fontWeight:600, color:INK, letterSpacing:"-0.1px" }}>{article.title}</div>
        <div style={{ fontSize:11, color:"#9ca3af", marginTop:2, fontFamily:F }}>{article.mins} min read · {article.views} views</div>
      </div>
      <div style={{ color:"rgba(67,97,238,0.3)", fontSize:16, flexShrink:0 }}>›</div>
    </div>
  );
}

// ─── Training ─────────────────────────────────────────────────────────────────
const COURSES = [
  { id:1, title:"Getting Started with Vercentic",  duration:"45 min", lessons:8,  progress:100, tag:"Complete",    tagC:GRN },
  { id:2, title:"Candidate Management Essentials", duration:"60 min", lessons:10, progress:60,  tag:"In Progress", tagC:ACC },
  { id:3, title:"Building Hiring Workflows",       duration:"30 min", lessons:6,  progress:0,   tag:"Not Started", tagC:"#9ca3af" },
  { id:4, title:"Using AI Matching & Copilot",     duration:"40 min", lessons:7,  progress:0,   tag:"Not Started", tagC:"#9ca3af" },
  { id:5, title:"Reporting & Analytics",           duration:"35 min", lessons:5,  progress:0,   tag:"Not Started", tagC:"#9ca3af" },
  { id:6, title:"Admin & Configuration",           duration:"55 min", lessons:9,  progress:0,   tag:"Not Started", tagC:"#9ca3af" },
];

function Training() {
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Training</h2>
      <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7280", fontFamily:F }}>Get the most out of Vercentic with guided courses and tutorials.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {COURSES.map(c=>(
          <div key={c.id} style={{ ...CARD, padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${PUR}14`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Svg d={ICONS.training} size={18} color={PUR}/>
              </div>
              <Badge color={c.tagC} sm>{c.tag}</Badge>
            </div>
            <div style={{ fontFamily:FH, fontSize:14, fontWeight:700, color:INK, marginBottom:4, letterSpacing:"-0.2px", lineHeight:1.3 }}>{c.title}</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:12, fontFamily:F }}>{c.duration} · {c.lessons} lessons</div>
            <div style={{ height:4, borderRadius:9, background:"rgba(67,97,238,0.1)", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:9, width:`${c.progress}%`,
                background:c.progress===100?GRN:`linear-gradient(90deg, ${ACC}, ${PUR})` }}/>
            </div>
            <div style={{ fontSize:10, color:"#9ca3af", marginTop:4, fontFamily:F }}>{c.progress}% complete</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
const DOCS = [
  { id:1, name:"Master Service Agreement",    type:"Contract",    size:"2.4 MB", updated:"2025-11-01", color:GRN  },
  { id:2, name:"Statement of Work — 2025",    type:"SOW",         size:"1.1 MB", updated:"2025-11-15", color:ACC  },
  { id:3, name:"Invoice INV-2025-11",         type:"Invoice",     size:"312 KB", updated:"2025-11-30", color:AMB  },
  { id:4, name:"Invoice INV-2025-10",         type:"Invoice",     size:"308 KB", updated:"2025-10-31", color:AMB  },
  { id:5, name:"Platform User Guide v3.2",    type:"Guide",       size:"5.8 MB", updated:"2025-12-01", color:PUR  },
  { id:6, name:"API Documentation",           type:"Guide",       size:"3.2 MB", updated:"2025-12-10", color:PUR  },
  { id:7, name:"Data Processing Agreement",   type:"Legal",       size:"890 KB", updated:"2025-06-01", color:"#6b7280" },
];

function Documents() {
  const [search, setSearch] = useState("");
  const [foc,    setFoc]    = useState(false);
  const filtered = DOCS.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.type.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:16 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Documents</h2>
          <p style={{ margin:0, fontSize:13, color:"#6b7280", fontFamily:F }}>Your contracts, invoices, and product documentation.</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          placeholder="Search documents…" style={{ ...mkInp(foc), width:220 }}/>
      </div>
      <div style={{ ...CARD, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(67,97,238,0.08)" }}>
              {["Document","Type","Size","Updated",""].map(h=>(
                <th key={h} style={{ padding:"10px 16px", fontSize:10, fontWeight:700,
                  color:"#9ca3af", textAlign:"left", textTransform:"uppercase",
                  letterSpacing:"0.06em", fontFamily:F }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d,i)=>(
              <tr key={d.id} style={{ borderBottom:i<filtered.length-1?"1px solid rgba(67,97,238,0.06)":"none" }}>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:d.color+"14",
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Svg d={ICONS.docs} size={14} color={d.color}/>
                    </div>
                    <span style={{ fontFamily:F, fontSize:13, fontWeight:600, color:INK }}>{d.name}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px" }}><Badge color={d.color} sm>{d.type}</Badge></td>
                <td style={{ padding:"12px 16px", fontSize:12, color:"#6b7280", fontFamily:F }}>{d.size}</td>
                <td style={{ padding:"12px 16px", fontSize:12, color:"#6b7280", fontFamily:F }}>{d.updated}</td>
                <td style={{ padding:"12px 16px" }}>
                  <button style={{ padding:"5px 12px", borderRadius:7,
                    border:`1.5px solid rgba(67,97,238,0.18)`,
                    background:"rgba(255,255,255,0.8)", fontFamily:F, fontSize:11, fontWeight:600,
                    color:ACC, cursor:"pointer" }}>Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── What's New ───────────────────────────────────────────────────────────────
function WhatsNew() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const SAMPLE = [
    { id:"s1", version:"3.2.0", title:"AI Matching improvements & bulk actions", date:"2026-03-15",
      summary:"Improved AI matching accuracy by 40%, added bulk edit/delete on list views, new People field type for linking records." },
    { id:"s2", version:"3.1.0", title:"Forms builder & document intelligence", date:"2026-03-01",
      summary:"New Forms module for structured data collection. CV parsing now supports DOCX. Document intelligence extracts fields from uploaded IDs, contracts, and right-to-work docs." },
    { id:"s3", version:"3.0.0", title:"Offer management & interview scheduling", date:"2026-02-15",
      summary:"Full offer lifecycle management with multi-approver chains. Calendly-style interview scheduling. Copilot can now schedule interviews and create offers conversationally." },
  ];
  useEffect(()=>{
    api.get("/api/release-notes?limit=10")
      .then(d=>{ setNotes(Array.isArray(d)?d:Array.isArray(d?.notes)?d.notes:[]); })
      .catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  const display = notes.length > 0 ? notes : SAMPLE;
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>What's New</h2>
      <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7280", fontFamily:F }}>Platform release notes and feature announcements.</p>
      {loading ? <LoadSpinner/> : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {display.map((n,i)=>(
            <div key={n.id||i} style={{ ...CARD, padding:"20px 24px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <Badge color={i===0?GRN:ACC} sm>{n.version}</Badge>
                {i===0 && <Badge color={GRN} sm>Latest</Badge>}
                <span style={{ fontSize:11, color:"#9ca3af", fontFamily:F }}>{n.date||n.created_at?.slice(0,10)}</span>
              </div>
              <div style={{ fontFamily:FH, fontSize:15, fontWeight:700, color:INK, marginBottom:6, letterSpacing:"-0.2px" }}>{n.title}</div>
              <div style={{ fontSize:13, color:"#6b7280", lineHeight:1.65, fontFamily:F }}>{n.summary||n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── System Status ────────────────────────────────────────────────────────────
const SERVICES = [
  { name:"Web Application", status:"operational", latency:"82ms" },
  { name:"API",             status:"operational", latency:"34ms" },
  { name:"AI / Copilot",   status:"operational", latency:"1.2s" },
  { name:"Email Delivery",  status:"operational", latency:"—"    },
  { name:"File Storage",    status:"operational", latency:"—"    },
  { name:"Database",        status:"operational", latency:"12ms" },
];

function SystemStatus() {
  const allOk = SERVICES.every(s=>s.status==="operational");
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>System Status</h2>
      <p style={{ margin:"0 0 20px", fontSize:13, color:"#6b7280", fontFamily:F }}>Real-time status of Vercentic platform services.</p>
      <div style={{ ...CARD, padding:"20px 24px", marginBottom:20,
        background:allOk?"rgba(12,175,119,0.08)":"rgba(239,68,68,0.08)",
        border:`1px solid ${allOk?"rgba(12,175,119,0.2)":"rgba(239,68,68,0.2)"}`,
        display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:14, height:14, borderRadius:"50%", background:allOk?GRN:RED, flexShrink:0,
          boxShadow:`0 0 0 4px ${(allOk?GRN:RED)}25` }}/>
        <div>
          <div style={{ fontFamily:FH, fontSize:16, fontWeight:700, color:allOk?GRN:RED, letterSpacing:"-0.2px" }}>
            {allOk?"All Systems Operational":"Service Disruption"}
          </div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:1, fontFamily:F }}>Last checked just now</div>
        </div>
      </div>
      <div style={{ ...CARD, overflow:"hidden" }}>
        {SERVICES.map((s,i)=>(
          <div key={s.name} style={{ padding:"14px 20px",
            borderBottom:i<SERVICES.length-1?"1px solid rgba(67,97,238,0.07)":"none",
            display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.status==="operational"?GRN:RED, flexShrink:0 }}/>
            <div style={{ flex:1, fontSize:13, fontWeight:600, color:INK, fontFamily:F }}>{s.name}</div>
            {s.latency!=="—" && <div style={{ fontSize:11, color:"#9ca3af", fontFamily:F, marginRight:16 }}>Latency: {s.latency}</div>}
            <Badge color={s.status==="operational"?GRN:RED} sm>{s.status==="operational"?"Operational":"Degraded"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Downloads ────────────────────────────────────────────────────────────────
const DOWNLOADS = [
  { id:1, name:"Candidate Import Template",    type:"CSV Template",  size:"4 KB",   color:GRN  },
  { id:2, name:"Job Posting Template",         type:"DOCX Template", size:"22 KB",  color:ACC  },
  { id:3, name:"Offer Letter Template",        type:"DOCX Template", size:"18 KB",  color:PUR  },
  { id:4, name:"Interview Scorecard Template", type:"XLSX Template", size:"31 KB",  color:AMB  },
  { id:5, name:"Data Export Schema",           type:"JSON Schema",   size:"8 KB",   color:"#6b7280" },
  { id:6, name:"Vercentic Logo Pack",          type:"ZIP",           size:"2.1 MB", color:RED  },
];

function Downloads() {
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Downloads</h2>
      <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7280", fontFamily:F }}>Templates, schemas, and assets to help you work with Vercentic.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
        {DOWNLOADS.map(d=>(
          <div key={d.id} style={{ ...CARD, padding:"18px 20px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:d.color+"13",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Svg d={ICONS.downloads} size={18} color={d.color}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:FH, fontSize:13, fontWeight:700, color:INK, letterSpacing:"-0.1px", marginBottom:2 }}>{d.name}</div>
              <div style={{ fontSize:11, color:"#9ca3af", fontFamily:F }}>{d.type} · {d.size}</div>
            </div>
            <button style={{ padding:"6px 12px", borderRadius:7, border:`1.5px solid ${d.color}30`,
              background:d.color+"0e", fontFamily:F, fontSize:11, fontWeight:700,
              color:d.color, cursor:"pointer", flexShrink:0 }}>↓</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────
function Account({ identity }) {
  const features = ["Unlimited candidates","AI matching","Workflows","Portals","Priority support"];
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Account</h2>
      <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7280", fontFamily:F }}>Your company subscription and contact details.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ ...CARD, padding:"24px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.06em",
            textTransform:"uppercase", marginBottom:14, fontFamily:F }}>Company</div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:`linear-gradient(135deg, ${ACC}, ${PUR})`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <VIconWhite size={26}/>
            </div>
            <div>
              <div style={{ fontFamily:FH, fontSize:16, fontWeight:800, color:INK, letterSpacing:"-0.3px" }}>{identity.company}</div>
              <div style={{ fontSize:12, color:"#9ca3af", fontFamily:F }}>{identity.domain}</div>
            </div>
          </div>
          {[["Contact",identity.name],["Email",identity.email],["Domain",identity.domain]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 0", borderBottom:"1px solid rgba(67,97,238,0.07)" }}>
              <span style={{ fontSize:12, color:"#9ca3af", fontFamily:F }}>{k}</span>
              <span style={{ fontSize:13, color:INK, fontWeight:600, fontFamily:F }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ ...CARD, padding:"24px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.06em",
            textTransform:"uppercase", marginBottom:14, fontFamily:F }}>Subscription</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ fontFamily:FH, fontSize:22, fontWeight:800, color:INK, letterSpacing:"-0.4px" }}>Growth</div>
            <Badge color={ACC}>Active</Badge>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
            {features.map(feat=>(
              <div key={feat} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#374151", fontFamily:F }}>
                <Svg d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={14} color={GRN}/>{feat}
              </div>
            ))}
          </div>
          <button style={{ padding:"8px 16px", borderRadius:9, border:`1.5px solid rgba(67,97,238,0.18)`,
            background:"rgba(255,255,255,0.8)", fontFamily:F, fontSize:12, fontWeight:600,
            color:"#374151", cursor:"pointer" }}>Contact sales for upgrade</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main portal shell ────────────────────────────────────────────────────────
export default function SupportPortalPage() {
  const getSaved = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||"null"); } catch { return null; } };
  const [identity, setIdentity] = useState(getSaved);
  const [section,  setSection]  = useState("cases");

  if (!identity) return <IdentityGate onIdentified={setIdentity}/>;

  const signOut = () => { localStorage.removeItem(LS_KEY); setIdentity(null); };

  const SECTION_COMPONENTS = {
    cases:     <CasesSection identity={identity}/>,
    kb:        <KnowledgeBase/>,
    training:  <Training/>,
    docs:      <Documents/>,
    news:      <WhatsNew/>,
    status:    <SystemStatus/>,
    downloads: <Downloads/>,
    account:   <Account identity={identity}/>,
  };

  return (
    <div style={{ minHeight:"100vh", fontFamily:F, position:"relative", display:"flex", flexDirection:"column" }}>
      <AuraBg/>

      {/* Top nav */}
      <div style={{
        position:"sticky", top:0, zIndex:100,
        background:"rgba(245,246,255,0.86)",
        backdropFilter:"blur(18px) saturate(1.5)",
        WebkitBackdropFilter:"blur(18px) saturate(1.5)",
        borderBottom:"1px solid rgba(67,97,238,0.11)",
        boxShadow:"0 1px 12px rgba(67,97,238,0.06)",
        flexShrink:0,
      }}>
        <div style={{ maxWidth:1080, margin:"0 auto", padding:"0 24px",
          height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10,
              background:`linear-gradient(135deg, ${ACC}, ${PUR})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 3px 12px ${ACC}38` }}>
              <VIconWhite size={20}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontFamily:FH, fontSize:15, fontWeight:800, color:INK, letterSpacing:"-0.3px" }}>Vercentic</span>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase",
                color:ACC, background:`${ACC}13`, border:`1px solid ${ACC}20`, padding:"2px 7px", borderRadius:5 }}>
                Client Portal
              </span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:INK, fontFamily:F }}>{identity.name}</div>
              <div style={{ fontSize:11, color:"#9ca3af", fontFamily:F }}>{identity.company}</div>
            </div>
            <div style={{ width:34, height:34, borderRadius:10,
              background:`linear-gradient(135deg, ${ACC}22, ${PUR}18)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              border:`1px solid ${ACC}20`, flexShrink:0 }}>
              <VIcon size={20} color={ACC}/>
            </div>
            <button onClick={signOut} style={{ padding:"6px 13px", borderRadius:8,
              border:"1.5px solid rgba(67,97,238,0.18)",
              background:"rgba(255,255,255,0.8)", fontFamily:F, fontSize:12, fontWeight:600,
              color:"#6b7280", cursor:"pointer" }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ flex:1, display:"flex", maxWidth:1080, margin:"0 auto", width:"100%",
        padding:"28px 24px", gap:24, position:"relative", zIndex:1 }}>

        {/* Sidebar */}
        <div style={{ width:220, flexShrink:0 }}>
          <div style={{ ...CARD, padding:"10px 8px", position:"sticky", top:88 }}>
            {/* Company pill */}
            <div style={{ padding:"10px 12px", marginBottom:6,
              background:`linear-gradient(135deg, ${ACC}10, ${PUR}08)`,
              borderRadius:10, border:`1px solid ${ACC}18` }}>
              <div style={{ fontSize:10, fontWeight:700, color:ACC, letterSpacing:"0.06em",
                textTransform:"uppercase", fontFamily:F, marginBottom:2 }}>Company</div>
              <div style={{ fontFamily:FH, fontSize:13, fontWeight:700, color:INK, letterSpacing:"-0.1px" }}>
                {identity.company}
              </div>
              <div style={{ fontSize:11, color:"#9ca3af", fontFamily:F }}>{identity.domain}</div>
            </div>

            {/* Nav items */}
            {NAV.map(item=>{
              const active = section===item.id;
              return (
                <button key={item.id} onClick={()=>setSection(item.id)} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:9,
                  padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer",
                  textAlign:"left", fontFamily:F,
                  background: active?`linear-gradient(135deg, ${ACC}14, ${PUR}10)`:"transparent",
                  color: active?ACC:"#374151",
                  fontSize:13, fontWeight:active?700:500, marginBottom:1,
                  transition:"all 0.12s",
                  boxShadow: active?`0 1px 8px ${ACC}14`:"none",
                  outline: active?`1px solid ${ACC}18`:"1px solid transparent",
                }}>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                    background: active?`${ACC}16`:"rgba(67,97,238,0.06)",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Svg d={ICONS[item.icon]} size={14} color={active?ACC:"#9ca3af"}/>
                  </div>
                  <span style={{ flex:1 }}>{item.label}</span>
                </button>
              );
            })}

            {/* Quick help */}
            <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(67,97,238,0.08)" }}>
              <div style={{ padding:"8px 12px", borderRadius:9, background:"rgba(67,97,238,0.04)" }}>
                <div style={{ fontSize:11, fontWeight:700, color:ACC, marginBottom:3, fontFamily:F }}>Need urgent help?</div>
                <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.5, fontFamily:F }}>
                  Email us at{" "}
                  <a href="mailto:support@vercentic.com" style={{ color:ACC, textDecoration:"none", fontWeight:600 }}>
                    support@vercentic.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex:1, minWidth:0 }}>
          {SECTION_COMPONENTS[section]}
        </div>
      </div>
    </div>
  );
}
