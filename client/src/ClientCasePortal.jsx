/**
 * ClientCasePortal.jsx — Vercentic client support portal (multi-tenant safe)
 */
import { useState, useEffect, useCallback } from "react";

const F      = "'DM Sans',-apple-system,sans-serif";
const ACCENT = "#8B7EC8";
const BLUE   = "#4361EE";

function getPortalTenantSlug() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tenant")) return params.get("tenant");
  const host = window.location.hostname;
  const parts = host.split(".");
  const reserved = ["www","app","api","admin","localhost","client","portal"];
  if (parts.length >= 3 && !reserved.includes(parts[0]) &&
      !["vercel","railway","up","netlify"].some(r => host.includes(r))) return parts[0];
  return null;
}

function makeApi(tenantSlug) {
  const hdrs = (extra={}) => { const h={"Content-Type":"application/json",...extra}; if(tenantSlug) h["X-Tenant-Slug"]=tenantSlug; return h; };
  return {
    get:  url => fetch(`/api${url}`,{headers:hdrs()}).then(r=>{if(!r.ok)throw new Error(r.statusText||r.status);return r.json();}),
    post: (url,body) => fetch(`/api${url}`,{method:"POST",headers:hdrs(),body:JSON.stringify(body)}).then(r=>{if(!r.ok)return r.json().then(e=>Promise.reject(e));return r.json();}),
  };
}

const SESSION_KEY = "vercentic_portal_session";
const getPortalSession   = () => { try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;} };
const savePortalSession  = s  => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
const clearPortalSession = () => sessionStorage.removeItem(SESSION_KEY);

const timeAgo = iso => {
  if(!iso) return "—";
  const d = (Date.now()-new Date(iso))/1000;
  if(d<60)    return "just now";
  if(d<3600)  return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};
const Badge = ({color,children}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:color+"18",color,border:`1px solid ${color}30`}}>{children}</span>
);

const TYPES=[{id:"bug",label:"Bug",color:"#ef4444"},{id:"feature",label:"Feature Request",color:"#8b5cf6"},{id:"support",label:"Support Query",color:"#3b82f6"},{id:"account",label:"Account Issue",color:"#f59e0b"},{id:"billing",label:"Billing",color:"#10b981"},{id:"other",label:"Other",color:"#6b7280"}];
const PRIORITIES=[{id:"low",label:"Low"},{id:"medium",label:"Medium"},{id:"high",label:"High"},{id:"critical",label:"Critical"}];
const STATUSES=[{id:"open",label:"Open",color:"#3b82f6"},{id:"in_progress",label:"In Progress",color:"#8b5cf6"},{id:"awaiting_client",label:"Awaiting Client",color:"#f59e0b"},{id:"resolved",label:"Resolved",color:"#10b981"},{id:"closed",label:"Closed",color:"#6b7280"}];

// ── Magic Link Login ───────────────────────────────────────────────────────────
function MagicLinkLogin({ tenantSlug, onLogin }) {
  const api = makeApi(tenantSlug);
  const [email,   setEmail]   = useState("");
  const [step,    setStep]    = useState("enter");
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("magic_token");
    if (!token) return;
    const cleanUrl = window.location.pathname + (tenantSlug ? ("?tenant=" + tenantSlug) : "");
    window.history.replaceState({}, "", cleanUrl);
    verifyToken({ token });
  }, []); // eslint-disable-line

  const verifyToken = async (payload) => {
    setLoading(true); setError("");
    try {
      const data = await api.post("/cases/magic-verify", { ...payload, tenant_slug: tenantSlug });
      savePortalSession(data);
      onLogin(data);
    } catch(e) {
      setError(e?.error || "Invalid or expired link. Please request a new one.");
    } finally { setLoading(false); }
  };

  const sendLink = async () => {
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      await api.post("/cases/magic-send", { email: email.trim().toLowerCase(), tenant_slug: tenantSlug });
      setStep("sent");
    } catch(e) {
      setError(e?.error || "Could not send magic link. Please try again.");
    } finally { setLoading(false); }
  };

  const inp = { width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10, padding:"11px 14px",
                fontSize:15, fontFamily:F, outline:"none", boxSizing:"border-box", background:"white", color:"#111827" };

  return (
    <div style={{ minHeight:"100vh", background:"#F0EEFF", display:"flex", alignItems:"center",
                  justifyContent:"center", fontFamily:F, padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#8B7EC8,#4361EE)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        margin:"0 auto 14px", boxShadow:"0 8px 24px #8B7EC840" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:"#0F1729" }}>
            Vercentic
            <span style={{ marginLeft:8, fontSize:11, fontWeight:700, background:"#E8E4FF", color:ACCENT,
                           borderRadius:6, padding:"3px 8px", verticalAlign:"middle", letterSpacing:".06em" }}>
              CLIENT PORTAL
            </span>
          </div>
          <div style={{ fontSize:14, color:"#6B7280", marginTop:6 }}>
            Access support cases, training resources and more
          </div>
        </div>

        <div style={{ background:"white", borderRadius:18, boxShadow:"0 4px 32px rgba(0,0,0,0.08)", padding:"32px 28px" }}>
          {step === "enter" && <>
            <div style={{ fontSize:17, fontWeight:700, color:"#111827", marginBottom:6 }}>Sign in with a magic link</div>
            <div style={{ fontSize:13, color:"#6B7280", marginBottom:24, lineHeight:1.5 }}>
              Enter your work email and we'll send you a one-click sign-in link. No password needed.
            </div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", letterSpacing:".05em",
                            textTransform:"uppercase", display:"block", marginBottom:6 }}>YOUR EMAIL</label>
            <input value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                   onKeyDown={e=>e.key==="Enter"&&sendLink()} placeholder="you@yourcompany.com"
                   type="email" autoFocus style={{...inp, marginBottom:error?8:16}}/>
            {error && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>{error}</div>}
            <button onClick={sendLink} disabled={loading||!email.trim()}
                    style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
                             background:loading||!email.trim()?"#E8E4FF":"linear-gradient(135deg,#8B7EC8,#4361EE)",
                             color:loading||!email.trim()?ACCENT:"white", fontSize:14, fontWeight:700,
                             fontFamily:F, cursor:loading||!email.trim()?"not-allowed":"pointer" }}>
              {loading ? "Sending…" : "Send magic link →"}
            </button>
            <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#9CA3AF" }}>
              We'll also include a 6-digit code as a backup.
            </div>
          </>}

          {step === "sent" && <>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"#F0EEFF",
                            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:"#111827", marginBottom:6 }}>Check your inbox</div>
              <div style={{ fontSize:13, color:"#6B7280", lineHeight:1.5 }}>
                We sent a magic link and 6-digit code to <strong>{email}</strong>.<br/>
                Click the link or enter the code below.
              </div>
            </div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", letterSpacing:".05em",
                            textTransform:"uppercase", display:"block", marginBottom:6 }}>6-DIGIT CODE</label>
            <input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,6));setError("");}}
                   onKeyDown={e=>e.key==="Enter"&&code.length===6&&verifyToken({email:email.trim().toLowerCase(),code:code.trim()})}
                   placeholder="123456" maxLength={6} autoFocus
                   style={{...inp, marginBottom:error?8:16, letterSpacing:"0.3em", fontSize:22, textAlign:"center", fontWeight:700}}/>
            {error && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>{error}</div>}
            <button onClick={()=>verifyToken({email:email.trim().toLowerCase(),code:code.trim()})}
                    disabled={loading||code.length!==6}
                    style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
                             background:loading||code.length!==6?"#E8E4FF":"linear-gradient(135deg,#8B7EC8,#4361EE)",
                             color:loading||code.length!==6?ACCENT:"white", fontSize:14, fontWeight:700,
                             fontFamily:F, cursor:loading||code.length!==6?"not-allowed":"pointer" }}>
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <button onClick={()=>{setStep("enter");setCode("");setError("");}}
                    style={{ display:"block", margin:"14px auto 0", background:"none", border:"none",
                             color:BLUE, fontSize:13, cursor:"pointer", fontFamily:F }}>
              ← Use a different email
            </button>
          </>}
        </div>
        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#9CA3AF" }}>Cases are private to your account.</div>
      </div>
    </div>
  );
}

// ── New Case Form ──────────────────────────────────────────────────────────────
function NewCaseForm({ session, api, onSubmit, onCancel }) {
  const [form,   setForm]   = useState({ subject:"", type:"support", priority:"medium", description:"" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const priColors = { low:"#10b981", medium:"#f59e0b", high:"#ef4444", critical:"#7c3aed" };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) { setError("Subject and description are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await api.post("/cases", { ...form,
        reporter_name:  session?.name  || "",
        reporter_email: session?.email || "",
        client_domain:  session?.domain || "",
        tenant_slug:    session?.tenant_slug || null,
      });
      onSubmit(res);
    } catch(e) { setError(e?.error || "Failed to submit."); }
    finally { setSaving(false); }
  };

  const inp = { width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10, padding:"10px 12px",
                fontSize:14, fontFamily:F, outline:"none", boxSizing:"border-box", background:"white" };
  const lbl = { fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase",
                letterSpacing:".05em", display:"block", marginBottom:6 };
  return (
    <div style={{ background:"white", borderRadius:16, border:"1px solid #f0f0f0",
                  padding:28, boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>New Support Request</div>
        <button onClick={onCancel} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:20, padding:0 }}>←</button>
      </div>
      <label style={lbl}>SUBJECT *</label>
      <input value={form.subject} onChange={e=>set("subject",e.target.value)}
             placeholder="Brief description of your issue" style={{...inp, marginBottom:16}}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:16 }}>
        <div>
          <label style={lbl}>REQUEST TYPE</label>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={()=>set("type",t.id)}
                      style={{ padding:"8px 12px", borderRadius:8, cursor:"pointer", textAlign:"left",
                               border:`1.5px solid ${form.type===t.id?t.color:"#e5e7eb"}`,
                               background:form.type===t.id?t.color+"12":"white",
                               color:form.type===t.id?t.color:"#374151",
                               fontSize:13, fontWeight:form.type===t.id?700:400, fontFamily:F,
                               display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:t.color, flexShrink:0 }}/>{t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>PRIORITY</label>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {PRIORITIES.map(p => { const c = priColors[p.id]||"#6B7280"; return (
              <button key={p.id} onClick={()=>set("priority",p.id)}
                      style={{ padding:"8px 12px", borderRadius:8, cursor:"pointer", textAlign:"left",
                               border:`1.5px solid ${form.priority===p.id?c:"#e5e7eb"}`,
                               background:form.priority===p.id?c+"12":"white",
                               color:form.priority===p.id?c:"#374151",
                               fontSize:13, fontWeight:form.priority===p.id?700:400, fontFamily:F,
                               display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }}/>{p.label}
              </button>
            ); })}
          </div>
        </div>
      </div>
      <label style={lbl}>DESCRIPTION *</label>
      <textarea value={form.description} onChange={e=>set("description",e.target.value)}
                placeholder="Describe your issue in detail…" rows={5}
                style={{...inp, resize:"vertical", marginBottom:error?8:20}}/>
      {error && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>{error}</div>}
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:10, border:"1.5px solid #e5e7eb",
                                            background:"white", color:"#374151", fontFamily:F, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
                style={{ flex:2, padding:"10px", borderRadius:10, border:"none",
                         background:saving?"#E8E4FF":"linear-gradient(135deg,#8B7EC8,#4361EE)",
                         color:saving?ACCENT:"white", fontFamily:F, fontSize:14, fontWeight:700,
                         cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

// ── Case Thread View ───────────────────────────────────────────────────────────
function CaseThreadView({ caseData, session, api, onBack, onUpdate }) {
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);
  const status  = STATUSES.find(s => s.id === caseData.status) || STATUSES[0];
  const type    = TYPES.find(t => t.id === caseData.type) || TYPES[5];
  const visible = (caseData.threads||[]).filter(t => t.visibility==="client" || t.type==="status_change");

  const send = async () => {
    if (!reply.trim()) return; setSending(true);
    try {
      const t = await api.post(`/cases/${caseData.id}/thread`, {
        body: reply, visibility:"client",
        author_name:  session?.name  || "Client",
        author_email: session?.email || "",
        type: "comment",
      });
      onUpdate({ ...caseData, threads:[...(caseData.threads||[]), t] });
      setReply("");
    } finally { setSending(false); }
  };

  return (
    <div style={{ background:"white", borderRadius:16, border:"1px solid #f0f0f0",
                  overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"20px 24px", borderBottom:"1px solid #f3f4f6" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:BLUE,
                                          fontFamily:F, fontSize:13, fontWeight:700,
                                          cursor:"pointer", marginBottom:12, padding:0 }}>← Back to cases</button>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#9CA3AF" }}>{caseData.case_number}</span>
          <Badge color={type.color}>{type.label}</Badge>
          <Badge color={status.color}>{status.label}</Badge>
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:"#111827", lineHeight:1.3 }}>{caseData.subject}</div>
        <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>Opened {timeAgo(caseData.created_at)}</div>
      </div>
      <div style={{ padding:"20px 24px", minHeight:200, maxHeight:440, overflow:"auto" }}>
        {visible.length===0 && (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#9CA3AF" }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No messages yet</div>
            <div style={{ fontSize:13 }}>Our team will respond shortly.</div>
          </div>
        )}
        {visible.map((t, i) => {
          const mine   = t.author_email === session?.email;
          const system = t.type === "status_change";
          if (system) return (
            <div key={t.id||i} style={{ textAlign:"center", margin:"10px 0" }}>
              <span style={{ fontSize:11, color:"#9CA3AF", background:"#F9FAFB",
                             border:"1px solid #e5e7eb", padding:"3px 10px", borderRadius:20 }}>{t.body}</span>
            </div>
          );
          return (
            <div key={t.id||i} style={{ marginBottom:16, display:"flex", flexDirection:"column",
                                         alignItems:mine?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"78%", padding:"12px 16px",
                            borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",
                            background:mine?"linear-gradient(135deg,#8B7EC8,#4361EE)":"#F9FAFB",
                            border:mine?"none":"1px solid #e5e7eb",
                            color:mine?"white":"#111827", fontSize:14, lineHeight:1.6 }}>{t.body}</div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4, padding:"0 4px" }}>
                {t.author_name} · {timeAgo(t.created_at)}
              </div>
            </div>
          );
        })}
      </div>
      {!["resolved","closed"].includes(caseData.status) && (
        <div style={{ padding:"16px 24px", borderTop:"1px solid #f3f4f6" }}>
          <textarea value={reply} onChange={e=>setReply(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                    placeholder="Type a reply… (Enter to send)" rows={3}
                    style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10,
                             padding:"10px 12px", fontSize:14, fontFamily:F, resize:"none",
                             outline:"none", boxSizing:"border-box", background:"white", marginBottom:10 }}/>
          <button onClick={send} disabled={sending||!reply.trim()}
                  style={{ padding:"9px 20px", borderRadius:10, border:"none",
                           background:sending||!reply.trim()?"#e5e7eb":"linear-gradient(135deg,#8B7EC8,#4361EE)",
                           color:sending||!reply.trim()?"#9CA3AF":"white",
                           fontFamily:F, fontSize:13, fontWeight:700,
                           cursor:sending||!reply.trim()?"not-allowed":"pointer" }}>
            {sending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      )}
      {["resolved","closed"].includes(caseData.status) && (
        <div style={{ padding:"12px 24px", background:"#f0fdf4", borderTop:"1px solid #bbf7d0",
                      textAlign:"center", fontSize:13, color:"#15803d", fontWeight:600 }}>
          ✓ This case has been {caseData.status}. Need more help? Open a new case.
        </div>
      )}
    </div>
  );
}

// ── Case Card ─────────────────────────────────────────────────────────────────
function CaseCard({ caseData, onClick }) {
  const status = STATUSES.find(s => s.id === caseData.status) || STATUSES[0];
  const type   = TYPES.find(t => t.id === caseData.type) || TYPES[5];
  const msgs   = (caseData.threads||[]).filter(t => t.visibility==="client").length;
  return (
    <div onClick={onClick}
         style={{ background:"white", border:"1px solid #f0f0f0", borderRadius:14,
                  padding:"16px 20px", cursor:"pointer", transition:"all .15s",
                  display:"flex", alignItems:"flex-start", gap:14 }}
         onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor="#d1d5db"; }}
         onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="#f0f0f0"; }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9CA3AF" }}>{caseData.case_number}</span>
          <Badge color={type.color}>{type.label}</Badge>
          <Badge color={status.color}>{status.label}</Badge>
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:"#111827", marginBottom:4, lineHeight:1.3 }}>{caseData.subject}</div>
        <div style={{ fontSize:12, color:"#9CA3AF" }}>
          {timeAgo(caseData.created_at)} · {msgs} message{msgs!==1?"s":""}
        </div>
      </div>
      <div style={{ color:"#d1d5db", fontSize:18, flexShrink:0, marginTop:4 }}>›</div>
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function ClientCasePortal({ session: propSession }) {
  const tenantSlug = getPortalTenantSlug();
  const api        = makeApi(tenantSlug);

  const [portalSession, setPS] = useState(() => {
    if (propSession) return propSession;
    const saved = getPortalSession();
    if (saved && (saved.tenant_slug === tenantSlug || (!saved.tenant_slug && !tenantSlug))) return saved;
    return null;
  });
  const [cases,    setCases]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState("list");
  const [selected, setSelected] = useState(null);
  const session = portalSession;

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const email = session?.email || session?.user?.email;
      if (!email) return;
      const res = await api.get(`/cases?reporter_email=${encodeURIComponent(email)}&limit=200`);
      const all = Array.isArray(res.cases) ? res.cases : (Array.isArray(res) ? res : []);
      const withThreads = await Promise.all(all.map(async c => {
        try { const full = await api.get(`/cases/${c.id}`); return full && !full.error ? full : c; }
        catch { return c; }
      }));
      setCases(withThreads);
    } finally { setLoading(false); }
  }, [session?.email, tenantSlug]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const handleLogin   = data => { savePortalSession(data); setPS(data); };
  const handleSignOut = ()   => { clearPortalSession(); setPS(null); setCases([]); };
  const handleNewCase = async c => {
    await load();
    try { const full = await api.get(`/cases/${c.id}`); if (full && !full.error) { setSelected(full); setView("thread"); } }
    catch { setView("list"); }
  };

  if (!session) return <MagicLinkLogin tenantSlug={tenantSlug} onLogin={handleLogin}/>;

  const name         = session?.name || session?.user?.first_name || session?.user?.email || "there";
  const domain       = session?.domain || session?.user?.email?.split("@")[1] || "";
  const openCount    = cases.filter(c => !["closed","resolved"].includes(c.status)).length;
  const resolvedCount = cases.filter(c =>  ["closed","resolved"].includes(c.status)).length;

  return (
    <div style={{ minHeight:"100vh", background:"#F7F8FF", fontFamily:F }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecf8", padding:"0 32px",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    height:58, position:"sticky", top:0, zIndex:100,
                    boxShadow:"0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#8B7EC8,#4361EE)",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontWeight:800, fontSize:15, color:"#0F1729" }}>Vercentic</span>
          <span style={{ fontSize:10, fontWeight:700, background:"#E8E4FF", color:ACCENT,
                         borderRadius:5, padding:"2px 6px", letterSpacing:".05em" }}>CLIENT PORTAL</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{name}{domain ? ` · ${domain}` : ""}</span>
          <button onClick={handleSignOut}
                  style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #e5e7eb",
                           background:"white", color:"#374151", fontFamily:F, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <div style={{ fontSize:24, fontWeight:800, color:"#111827" }}>Support</div>
            <div style={{ fontSize:14, color:"#6B7280", marginTop:2 }}>
              Track your support requests and communicate with our team
            </div>
          </div>
          {view === "list" && (
            <button onClick={() => setView("new")}
                    style={{ padding:"10px 20px", borderRadius:10, border:"none",
                             background:"linear-gradient(135deg,#8B7EC8,#4361EE)",
                             color:"white", fontFamily:F, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              + New Request
            </button>
          )}
        </div>

        {view === "list" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:28 }}>
            {[["Total Cases", cases.length, ACCENT],["Open", openCount,"#3b82f6"],["Resolved", resolvedCount,"#10b981"]].map(([label, val, color]) => (
              <div key={label} style={{ background:"white", border:"1px solid #f0f0f0", borderRadius:14,
                                        padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:22, fontWeight:800, color }}>{val}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2, fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {view === "new"    && <NewCaseForm    session={session} api={api} onSubmit={handleNewCase} onCancel={() => setView("list")}/>}
        {view === "thread" && selected && (
          <CaseThreadView caseData={selected} session={session} api={api}
                          onBack={() => { setView("list"); setSelected(null); }}
                          onUpdate={updated => { setCases(cs => cs.map(c => c.id===updated.id ? updated : c)); setSelected(updated); }}/>
        )}

        {view === "list" && (
          loading ? (
            <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>Loading your cases…</div>
          ) : cases.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, color:"#9CA3AF", background:"white",
                          borderRadius:16, border:"1px solid #f0f0f0" }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#374151", marginBottom:8 }}>No support cases yet</div>
              <div style={{ fontSize:14, marginBottom:20 }}>Need help? Submit your first support request.</div>
              <button onClick={() => setView("new")}
                      style={{ padding:"10px 20px", borderRadius:10, border:"none",
                               background:"linear-gradient(135deg,#8B7EC8,#4361EE)",
                               color:"white", fontFamily:F, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                + New Request
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {cases.filter(c => !["closed","resolved"].includes(c.status)).length > 0 && <>
                <div style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", letterSpacing:".06em",
                              textTransform:"uppercase", marginBottom:4 }}>Active Cases</div>
                {cases.filter(c => !["closed","resolved"].includes(c.status)).map(c =>
                  <CaseCard key={c.id} caseData={c} onClick={() => { setSelected(c); setView("thread"); }}/>
                )}
              </>}
              {cases.filter(c => ["closed","resolved"].includes(c.status)).length > 0 && <>
                <div style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", letterSpacing:".06em",
                              textTransform:"uppercase", marginTop:12, marginBottom:4 }}>Resolved</div>
                {cases.filter(c => ["closed","resolved"].includes(c.status)).map(c =>
                  <CaseCard key={c.id} caseData={c} onClick={() => { setSelected(c); setView("thread"); }}/>
                )}
              </>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
