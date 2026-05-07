import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import AiBadge, { isAiGenerated } from "./AiBadge.jsx";

// ─── Shared helpers (inline to avoid circular imports) ───────────────────────
import api from './apiClient.js';
import { tFetch } from './apiClient.js';







// Theme colours — match CSS variables used in Records.jsx
const C = {
  bg: "var(--t-bg)",
  surface: "var(--t-surface)",
  border: "var(--t-border)",
  accent: "var(--t-accent)",
  accentLight: "var(--t-accent-light)",
  text1: "var(--t-text1)",
  text2: "var(--t-text2)",
  text3: "var(--t-text3)",
  danger: "#ef4444",
  success: "#16a34a",
};

// Type config
const TYPE_META = {
  email:    { label:"Email",    color:"#6366f1", bg:"#eef2ff" },
  sms:      { label:"SMS",      color:"#0891b2", bg:"#ecfeff" },
  whatsapp: { label:"WhatsApp", color:"#16a34a", bg:"#f0fdf4" },
  call:     { label:"Call",     color:"#d97706", bg:"#fffbeb" },
  note:     { label:"Note",     color:"#7c3aed", bg:"#f5f3ff" },
};

const ICON_PATHS = {
  email:    ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  sms:      ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  whatsapp: ["M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z","M12 18h.01"],
  call:     ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"],
  note:     ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
};

function TypeIcon({ type, size=16, color }) {
  const paths = ICON_PATHS[type] || ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"];
  const col = color || TYPE_META[type]?.color || "#64748b";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      {paths.map((p, i) => <path key={i} d={p}/>)}
    </svg>
  );
}

const DIR_META = {
  outbound: { label:"Sent",     badge:"→", color:"#2563eb" },
  inbound:  { label:"Received", badge:"←", color:"#16a34a" },
  logged:   { label:"Logged",   badge:"•", color:"#64748b" },
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString(undefined,{weekday:"short",hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}

function fmtDuration(secs) {
  if (!secs) return "";
  const m = Math.floor(secs/60), s = secs%60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ─── AI Compose Modal ────────────────────────────────────────────────────────
function AIComposeModal({ type, record, objectName, template, onUse, onClose }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody]       = useState(template?.body || "");

  const personName = record?.data?.full_name || record?.data?.name || objectName;

  const compose = async () => {
    setLoading(true);
    try {
      const systemPrompt = `You are composing a ${type} message for a talent acquisition platform. 
The recipient is ${personName}. Keep it professional, warm and concise.
${type==="email" ? "Return JSON: {\"subject\":\"...\",\"body\":\"...\"}." : "Return JSON: {\"body\":\"...\"}." }
No markdown, no preamble, just the JSON object.`;
      const r = await tFetch(`/api/ai/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ messages:[{role:"user", content: prompt || `Write a follow-up ${type} to ${personName}`}], system: systemPrompt })
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.reply || "";
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
        if (parsed.subject) setSubject(parsed.subject);
        setBody(parsed.body || text);
        setResult("done");
      } catch { setBody(text); setResult("done"); }
    } catch(e) { setResult("error"); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ background:C.surface, borderRadius:18, width:560, maxHeight:"80vh", overflow:"auto", padding:28, boxShadow:"0 24px 60px rgba(0,0,0,.22)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>AI Compose — {TYPE_META[type]?.label}</div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:20, color:C.text3 }}>×</button>
        </div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={`Describe what you want to say to ${personName}... (or leave blank for a default follow-up)`}
          style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, resize:"vertical", minHeight:72, boxSizing:"border-box", outline:"none" }}/>
        <button onClick={compose} disabled={loading}
          style={{ marginTop:10, padding:"9px 20px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, opacity:loading?0.6:1 }}>
          {loading ? "Generating…" : "✨ Generate"}
        </button>
        {result && <>
          {type==="email" && <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject"
            style={{ width:"100%", marginTop:16, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:"border-box", outline:"none" }}/>}
          <textarea value={body} onChange={e=>setBody(e.target.value)}
            style={{ width:"100%", marginTop:8, padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, resize:"vertical", minHeight:160, boxSizing:"border-box", outline:"none" }}/>
          <div style={{ display:"flex", gap:10, marginTop:14, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 18px", border:`1.5px solid ${C.border}`, borderRadius:10, background:"none", cursor:"pointer", fontSize:13 }}>Cancel</button>
            <button onClick={()=>onUse({subject, body})} style={{ padding:"8px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13 }}>Use This</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── Compose Modal (Email / SMS / WhatsApp / Call log) ──────────────────────
function ComposeModal({ type, record, environment, onSave, onClose, defaultRelatedRecordId }) {
  const [subject, setSubject]   = useState("");
  const [body, setBody]         = useState("");
  const [to, setTo]             = useState(() => {
    const d = record?.data || {};
    if (type === "email")     return d.email || d.email_address || "";
    if (type === "sms")       return d.mobile || d.phone || d.phone_number || "";
    if (type === "whatsapp")  return d.mobile || d.whatsapp || d.phone || "";
    return "";
  });
  const [direction, setDir]     = useState(type==="call" ? "logged" : "outbound");
  const [duration, setDuration] = useState("");
  const [outcome, setOutcome]   = useState("");
  const [templates, setTemplates] = useState([]);
  const [showAI, setShowAI]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  // Related job — pre-selected from job context bar, or chosen manually
  const [linkedJobs, setLinkedJobs] = useState([]);
  const [relatedRecordId, setRelatedRecordId] = useState(defaultRelatedRecordId || "");
  const meta = TYPE_META[type] || {};

  useEffect(() => {
    api.get('/comms/status').then(s => setProviderStatus(s)).catch(() => {});
  }, []);

  // Load jobs this person is linked to (pipeline links)
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    // Fetch people_links for this person, then get job record names
    tFetch(`/api/records/linked-jobs?person_id=${record.id}&environment_id=${environment.id}`)
      .then(r => r.json())
      .then(d => setLinkedJobs(Array.isArray(d) ? d : []))
      .catch(() => setLinkedJobs([]));
  }, [record?.id, environment?.id]);

  useEffect(() => {
    if (type==="email" && environment?.id) {
      api.get(`/email-templates?environment_id=${environment.id}`).then(r => setTemplates(Array.isArray(r)?r:[]));
    }
  }, [type, environment?.id]);

  const applyTemplate = (t) => {
    const d = record?.data || {};
    const selectedJob = linkedJobs.find(j => j.id === relatedRecordId) || linkedJobs[0];
    const jd = selectedJob?.data || {};

    // Build substitution map from all common variable names
    const vars = {
      // Candidate / person
      candidate_name:    [d.first_name, d.last_name].filter(Boolean).join(" ") || d.name || "Candidate",
      first_name:        d.first_name || d.name?.split(" ")[0] || "Candidate",
      last_name:         d.last_name || "",
      full_name:         [d.first_name, d.last_name].filter(Boolean).join(" ") || d.name || "Candidate",
      email:             d.email || d.email_address || "",
      phone:             d.phone || d.mobile || "",
      current_title:     d.current_title || d.job_title || "",
      location:          d.location || d.city || "",
      // Job
      job_title:         jd.job_title || jd.title || jd.name || "",
      job_location:      jd.location || jd.city || "",
      department:        jd.department || "",
      // Company (from job or branding)
      company_name:      jd.company || jd.entity || d.company || "",
      // Recruiter (logged-in user — not easily available here, leave as hint)
      recruiter_name:    "",
    };

    const substitute = (text) =>
      (text || "").replace(/\{\{(\w+)\}\}/g, (match, key) =>
        vars[key] !== undefined ? vars[key] : match
      );

    setSubject(substitute(t.subject || ""));
    setBody(substitute(t.body || ""));
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      record_id: record.id,
      environment_id: environment?.id,
      type,
      direction,
      to: to || undefined,
      subject: subject || undefined,
      body,
      duration_seconds: duration ? Number(duration) : undefined,
      outcome: outcome || undefined,
      from_label: direction==="inbound" ? "External" : "Me",
      related_record_id: relatedRecordId || undefined,
      context: relatedRecordId ? 'application' : 'general',
    };
    await api.post("/comms", payload);
    setSaving(false);
    onSave();
  };

  const isSimulated = providerStatus && type !== "call" && direction === "outbound" && providerStatus[type] === "simulation";

  return ReactDOM.createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:9000, pointerEvents:"none" }}>
      {/* Backdrop — only dims slightly, doesn't block the record panel */}
      <div style={{ position:"absolute", inset:0, background:"rgba(15,23,41,.25)", pointerEvents:"auto" }} onClick={onClose}/>

      {/* Floating popout window — bottom-right, above the panel */}
      <div style={{
        position:"absolute", bottom:24, right:24,
        width:520, maxHeight:"80vh",
        background:C.surface, borderRadius:16,
        boxShadow:"0 20px 60px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.06)",
        display:"flex", flexDirection:"column",
        pointerEvents:"auto", overflow:"hidden",
      }}>
        {showAI && <AIComposeModal type={type} record={record} objectName="Person" onUse={({subject:s,body:b})=>{if(s)setSubject(s);setBody(b);setShowAI(false); applyTemplate({subject:s,body:b});}} onClose={()=>setShowAI(false)}/>}

        {/* Popout title bar */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderBottom:`1px solid ${C.border}`, background:"#f8f9fc", flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:meta.color||C.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <TypeIcon type={type} size={15} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.text1 }}>{type==="call" ? "Log Call" : `New ${meta.label}`}</div>
            {record?.data && <div style={{ fontSize:11, color:C.text3, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {[record.data.first_name, record.data.last_name].filter(Boolean).join(" ") || record.data.job_title || ""}
            </div>}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.text3, fontSize:18, lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>


        {/* Simulation mode badge */}
        {isSimulated && (
          <div style={{ marginBottom:16, padding:"8px 12px", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
            <span>⚡</span>
            <span><strong>Simulation mode</strong> — message will be saved but not sent. Add Twilio credentials in Settings to enable live sending.</span>
          </div>
        )}

        {/* Related to — job context */}
        {linkedJobs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Related to</label>
            <select value={relatedRecordId} onChange={e => setRelatedRecordId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${relatedRecordId ? C.accent : C.border}`, borderRadius: 10, fontSize: 13, color: C.text1, background: relatedRecordId ? C.accentLight : C.bg, outline: 'none', cursor: 'pointer' }}>
              <option value="">General (not job-specific)</option>
              {linkedJobs.map(j => <option key={j.id} value={j.id}>{j.title || j.name}</option>)}
            </select>
          </div>
        )}

        {/* To field (outbound SMS / WhatsApp / Email) */}
        {type !== "call" && direction === "outbound" && (
          <input value={to} onChange={e=>setTo(e.target.value)}
            placeholder={type==="email" ? "Recipient email address" : "Recipient phone e.g. +971501234567"}
            style={{ width:"100%", marginBottom:12, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:"border-box", outline:"none", background:C.bg }}/>
        )}
        {type !== "call" && (
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {["outbound","inbound"].map(d=>(
              <button key={d} onClick={()=>setDir(d)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${direction===d?C.accent:C.border}`, background:direction===d?C.accentLight:"none", color:direction===d?C.accent:C.text2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {DIR_META[d].badge} {DIR_META[d].label}
              </button>
            ))}
          </div>
        )}

        {/* Template picker (email only) */}
        {type==="email" && templates.length>0 && (
          <div style={{ marginBottom:14 }}>
            <select onChange={e=>{ const t=templates.find(x=>x.id===e.target.value); if(t)applyTemplate(t); }}
              defaultValue=""
              style={{ width:"100%", padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, color:C.text2, background:C.bg, cursor:"pointer", outline:"none" }}>
              <option value="" disabled>📋 Apply template…</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* AI button (email / sms / whatsapp) */}
        {type !== "call" && (
          <button onClick={()=>setShowAI(true)}
            style={{ marginBottom:14, padding:"7px 16px", border:`1.5px solid ${C.accent}`, borderRadius:10, background:C.accentLight, color:C.accent, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            ✨ AI Compose
          </button>
        )}

        {/* Subject (email) */}
        {type==="email" && (
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject"
            style={{ width:"100%", marginBottom:10, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:"border-box", outline:"none", background:C.bg }}/>
        )}

        {/* Body */}
        {type !== "call" && (
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={`${meta.label} message…`}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, resize:"vertical", minHeight:140, boxSizing:"border-box", outline:"none", background:C.bg }}/>
        )}

        {/* Call fields */}
        {type==="call" && (
          <>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, color:C.text3, fontWeight:600 }}>Duration (seconds)</label>
                <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="e.g. 300"
                  style={{ width:"100%", marginTop:4, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:"border-box", outline:"none", background:C.bg }}/>
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, color:C.text3, fontWeight:600 }}>Outcome</label>
                <select value={outcome} onChange={e=>setOutcome(e.target.value)}
                  style={{ width:"100%", marginTop:4, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, background:C.bg, outline:"none", cursor:"pointer" }}>
                  <option value="">Select…</option>
                  <option value="connected">Connected</option>
                  <option value="voicemail">Left Voicemail</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="wrong_number">Wrong Number</option>
                </select>
              </div>
            </div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Call notes…"
              style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, resize:"vertical", minHeight:100, boxSizing:"border-box", outline:"none", background:C.bg }}/>
          </>
        )}

        </div>{/* end scrollable body */}

        {/* Sticky footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, background:"#f8f9fc", display:"flex", gap:8, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"8px 18px", border:`1.5px solid ${C.border}`, borderRadius:9, background:"transparent", cursor:"pointer", fontSize:13, fontWeight:600, color:C.text2 }}>Cancel</button>
          <button onClick={save} disabled={saving || (!body && type!=="call")}
            style={{ padding:"8px 20px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:13, opacity:(saving||(!body&&type!=="call"))?0.5:1 }}>
            {saving ? "Saving…" : type==="call" ? "Log Call" : direction==="outbound" ? (isSimulated ? `Save (Simulated)` : `Send ${meta.label}`) : "Save"}
          </button>
        </div>
      </div>{/* end popout window */}
    </div>,
    document.body
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function CommDetail({ item, onClose, onDelete }) {
  const meta = TYPE_META[item.type] || {};
  const dir  = DIR_META[item.direction] || {};
  return ReactDOM.createPortal(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:1900, display:"flex", justifyContent:"flex-end" }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ width:480, background:C.surface, height:"100%", overflowY:"auto", padding:28, boxShadow:"-8px 0 40px rgba(0,0,0,.12)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <TypeIcon type={item.type} size={20}/>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{meta.label}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:dir.color, fontWeight:600 }}>
                {dir.badge} {dir.label} · {fmtDate(item.created_at)}
                {isAiGenerated(item) && <AiBadge label="AI generated" tooltip="This message was generated by an AI agent"/>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:22, color:C.text3 }}>×</button>
        </div>

        {item.subject && <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color:C.text1 }}>{item.subject}</div>}

        {item.type==="call" && (
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {item.duration_seconds && <span style={{ fontSize:12, background:"#f1f5f9", padding:"4px 10px", borderRadius:20, color:C.text2 }}>⏱ {fmtDuration(item.duration_seconds)}</span>}
            {item.outcome && <span style={{ fontSize:12, background:"#f1f5f9", padding:"4px 10px", borderRadius:20, color:C.text2 }}>📋 {item.outcome.replace("_"," ")}</span>}
          </div>
        )}

        {item.body && (
          <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", fontSize:13, color:C.text1, lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:20 }}>
            {item.body}
          </div>
        )}

        <div style={{ fontSize:12, color:C.text3, marginBottom:20 }}>
          {item.from_label && <div>From: <strong>{item.from_label}</strong></div>}
          {item.status && <div>Status: <strong style={{ color: item.status==="sent"?"#2563eb":item.status==="received"?"#16a34a":C.text2 }}>{item.status}</strong></div>}
        </div>

        <button onClick={()=>{onDelete(item.id);onClose();}}
          style={{ padding:"8px 18px", border:`1.5px solid #fecaca`, borderRadius:10, background:"#fff5f5", color:C.danger, fontSize:12, fontWeight:600, cursor:"pointer" }}>
          🗑 Delete
        </button>
      </div>
    </div>
  , document.body);
}

// ─── Timeline Item ────────────────────────────────────────────────
function CommItem({ item, onClick }) {
  const meta = TYPE_META[item.type] || {};
  const dir  = DIR_META[item.direction] || {};
  const borderColor = meta.color || C.accent;

  const resolveVars = (text) => {
    if (!text) return text;
    return text
      .replace(/\{\{candidate_name\}\}/g, item._personName || "")
      .replace(/\{\{job_title\}\}/g, item._jobTitle || "")
      .replace(/\{\{company\}\}/g, item._company || "")
      .replace(/\{\{\w+\}\}/g, "");
  };

  const subject = resolveVars(
    item.subject || (item.type === "call"
      ? `Call${item.outcome ? ` — ${item.outcome.replace("_", " ")}` : ""}`
      : `${meta.label}`)
  );
  const preview = resolveVars(item.body);

  return (
    <div onClick={() => onClick(item)}
      style={{
        display: "flex", padding: "10px 0", cursor: "pointer",
        borderBottom: `1px solid ${C.border}`, transition: "background .1s",
        borderLeft: `3px solid ${borderColor}`, paddingLeft: 12, marginLeft: -1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <TypeIcon type={item.type} size={13} color={meta.color}/>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subject}
            </span>
          </div>
          <span style={{ fontSize: 11, color: C.text3, whiteSpace: "nowrap", flexShrink: 0 }}>
            {fmtDate(item.created_at)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: dir.color, fontWeight: 600, flexShrink: 0 }}>
            {dir.badge} {dir.label}
          </span>
          {isAiGenerated(item) && <AiBadge label="AI" tooltip="Generated or sent by an AI agent"/>}
          {item.related_record_id && (
            <span style={{ fontSize: 9, background: "#EFF6FF", color: "#1D4ED8",
              border: "1px solid #BFDBFE", borderRadius: 6,
              padding: "0px 5px", fontWeight: 700, lineHeight: "16px" }}>
              Application
            </span>
          )}
          {item.type === "call" && item.duration_seconds && (
            <span style={{ fontSize: 11, color: C.text3 }}>· {fmtDuration(item.duration_seconds)}</span>
          )}
          {preview && (
            <span style={{ fontSize: 12, color: C.text3, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
              · {preview.slice(0, 60)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Unified Filter Strip ──────────────────────────────────────────
function FilterBar({ activeType, setActiveType, search, setSearch, total, counts }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const types = ["all", "email", "sms", "whatsapp", "call"];

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
      <div style={{ display:"flex", gap:2, flex:1 }}>
        {types.map(t => {
          const count = t === "all" ? total : (counts[t] || 0);
          const meta = TYPE_META[t] || {};
          const active = activeType === t;
          return (
            <button key={t} onClick={() => setActiveType(t)}
              title={`${t === "all" ? "All" : meta.label}${count ? ` (${count})` : ""}`}
              style={{
                display:"flex", alignItems:"center", gap:4,
                padding: active ? "4px 10px" : "4px 8px",
                borderRadius: 8, border:"none",
                background: active ? (meta.bg || "#eef1ff") : "transparent",
                color: active ? (meta.color || C.accent) : C.text3,
                fontSize: 11, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap",
              }}>
              <TypeIcon type={t === "all" ? "email" : t} size={13}
                color={active ? (meta.color || C.accent) : C.text3}/>
              {t === "all" ? "All" : ""}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: "center",
                  borderRadius: 99, padding: "0 4px", lineHeight: "16px",
                  background: active ? (meta.color || C.accent) : "transparent",
                  color: active ? "#fff" : C.text3,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display:"flex", alignItems:"center", position:"relative" }}>
        {searchOpen ? (
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#f8f9fc",
            border:`1.5px solid ${C.border}`, borderRadius:8, padding:"3px 8px", minWidth:180 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input ref={searchRef} value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => { if (!search) setSearchOpen(false); }}
              onKeyDown={e => { if (e.key === "Escape") { setSearch(""); setSearchOpen(false); } }}
              placeholder="Search…"
              style={{ border:"none", outline:"none", fontSize:12, background:"transparent",
                color:C.text1, width:140, fontFamily:"inherit" }}/>
            {search && (
              <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:0, display:"flex" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} title="Search communications"
            style={{ display:"flex", alignItems:"center", justifyContent:"center",
              width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`,
              background:"transparent", cursor:"pointer", color:C.text3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}


// ─── Main CommunicationsPanel export ─────────────────────────────────────────
export default function CommunicationsPanel({ record, environment, externalCompose, onExternalComposeDone, initialJobContext }) {
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [activeContext, setActiveContext] = useState(initialJobContext || "all"); // all | general | <job record id>
  const [linkedJobs, setLinkedJobs] = useState([]);
  const [search, setSearch]     = useState("");
  const [compose, setCompose]   = useState(null);
  const [detail, setDetail]     = useState(null);
  const [page, setPage]         = useState(1);
  const PAGE = 20;

  // Open compose modal when parent bar triggers it
  useEffect(() => {
    if (externalCompose) { setCompose(externalCompose); }
  }, [externalCompose]);

  // Sync context when parent job context bar changes
  useEffect(() => {
    setActiveContext(initialJobContext || "all");
    setPage(1);
  }, [initialJobContext]);

  // Load linked jobs for context filter tabs
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    tFetch(`/api/records/linked-jobs?person_id=${record.id}&environment_id=${environment.id}`)
      .then(r => r.json())
      .then(d => setLinkedJobs(Array.isArray(d) ? d : []))
      .catch(() => setLinkedJobs([]));
  }, [record?.id, environment?.id]);

  // Debounced search
  const searchRef = useRef(null);
  const debouncedSearch = useCallback((val) => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); }, 400);
  }, []);
  useEffect(() => { debouncedSearch(search); }, [search]);

  const load = useCallback(async () => {
    if (!record?.id) return;
    setLoading(true);
    const params = new URLSearchParams({ record_id: record.id, limit: PAGE, offset: (page-1)*PAGE });
    if (activeType !== "all") params.append("type", activeType);
    if (activeContext === "general") params.append("context", "general");
    else if (activeContext !== "all") params.append("related_record_id", activeContext);
    if (search) params.append("search", search);
    const d = await api.get(`/comms?${params}`);
    setItems(d.items || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [record?.id, activeType, activeContext, search, page]);

  useEffect(() => { load(); }, [load]);

  // Per-type counts (separate light query without pagination)
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (!record?.id) return;
    api.get(`/comms?record_id=${record.id}&limit=1000`).then(d => {
      const c = {};
      (d.items||[]).forEach(x => { c[x.type] = (c[x.type]||0)+1; });
      setCounts(c);
    });
  }, [record?.id, total]); // re-run when total changes (new item added)

  const handleDelete = async (id) => {
    await api.del(`/comms/${id}`);
    load();
  };

  return (
    <div>
      {/* Compose modal */}
      {compose && (
        <ComposeModal type={compose} record={record} environment={environment}
          defaultRelatedRecordId={initialJobContext || ""}
          onSave={()=>{ setCompose(null); onExternalComposeDone?.(); setPage(1); load(); }}
          onClose={()=>{ setCompose(null); onExternalComposeDone?.(); }}/>
      )}

      {/* Detail drawer */}
      {detail && <CommDetail item={detail} onClose={()=>setDetail(null)} onDelete={id=>{ handleDelete(id); setDetail(null); }}/>}

      {/* Single merged filter row: context pills (if any) + type icon strip + search */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {/* Context pills — only when linked jobs exist */}
        {linkedJobs.length > 0 && (
          <div style={{ display:'flex', gap:3, flexShrink:0 }}>
            {[{ id:'all', label:'All' }, { id:'general', label:'General' }, ...linkedJobs.map(j=>({ id:j.id, label:j.title }))].map(tab => (
              <button key={tab.id} onClick={()=>{ setActiveContext(tab.id); setPage(1); }}
                style={{
                  padding:'3px 9px', borderRadius:20, border:`1.5px solid ${activeContext===tab.id?C.accent:C.border}`,
                  background:activeContext===tab.id?C.accentLight:'transparent',
                  color:activeContext===tab.id?C.accent:C.text3,
                  fontSize:10, fontWeight:activeContext===tab.id?700:500,
                  cursor:'pointer', whiteSpace:'nowrap', transition:'all .12s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {/* Slim separator */}
        {linkedJobs.length > 0 && <div style={{ width:1, height:16, background:C.border, flexShrink:0 }}/>}
        {/* Type icon strip — icons only, count badge when active */}
        <div style={{ display:'flex', gap:1, flex:1 }}>
          {["all","email","sms","whatsapp","call"].map(t => {
            const count = t==="all" ? total : (counts[t]||0);
            const meta = TYPE_META[t]||{};
            const active = activeType===t;
            return (
              <button key={t} onClick={()=>{ setActiveType(t); setPage(1); }}
                title={t==="all"?"All types":meta.label}
                style={{
                  display:"flex", alignItems:"center", gap:3,
                  padding:"4px 8px", borderRadius:7, border:"none",
                  background:active?(meta.bg||"#eef1ff"):"transparent",
                  color:active?(meta.color||C.accent):C.text3,
                  fontSize:11, fontWeight:active?700:500,
                  cursor:"pointer", transition:"all .12s",
                }}>
                <TypeIcon type={t==="all"?"email":t} size={13} color={active?(meta.color||C.accent):C.text3}/>
                {t==="all" && <span style={{fontSize:10}}>All</span>}
                {count>0 && (
                  <span style={{
                    fontSize:10, fontWeight:700, minWidth:14, textAlign:"center",
                    borderRadius:99, padding:"0 3px", lineHeight:"14px",
                    background:active?(meta.color||C.accent):"transparent",
                    color:active?"#fff":C.text3,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Search icon */}
        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", position:"relative" }}>
          {search ? (
            <div style={{ display:"flex", alignItems:"center", gap:4, background:"#f8f9fc",
              border:`1.5px solid ${C.border}`, borderRadius:8, padding:"3px 8px", minWidth:160 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus
                onKeyDown={e=>{ if(e.key==="Escape") setSearch(""); }}
                placeholder="Search…"
                style={{ border:"none", outline:"none", fontSize:12, background:"transparent",
                  color:C.text1, width:120, fontFamily:"inherit" }}/>
              <button onClick={()=>setSearch("")}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:0, display:"flex" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ) : (
            <button onClick={()=>setSearch(" ")} title="Search communications"
              style={{ display:"flex", alignItems:"center", justifyContent:"center",
                width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`,
                background:"transparent", cursor:"pointer", color:C.text3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {loading && items.length===0
        ? <div style={{ textAlign:"center", padding:"28px 0", color:C.text3, fontSize:13 }}>Loading…</div>
        : items.length===0
          ? <div style={{ textAlign:"center", padding:"32px 16px" }}>
              {search || activeType!=="all"
                ? <div style={{ color:C.text3, fontSize:13 }}>No matching communications.</div>
                : <>
                    <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:14 }}>
                      {["email","sms","whatsapp","call"].map(t=>(
                        <div key={t} style={{ width:36, height:36, borderRadius:12, background:TYPE_META[t].bg, display:"flex", alignItems:"center", justifyContent:"center" }}><TypeIcon type={t} size={20} color={TYPE_META[t].color}/></div>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color:C.text1, marginBottom:6 }}>No communications yet</div>
                    <div style={{ fontSize:12, color:C.text3, lineHeight:1.6 }}>Use the <strong>Communicate</strong> button<br/>to send an email, SMS, WhatsApp or log a call.</div>
                  </>
              }
            </div>
          : <>
              {items.map(item => <CommItem key={item.id} item={item} onClick={setDetail}/>)}
              {/* Pagination */}
              {total > PAGE && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12, color:C.text3 }}>{total} total · page {page} of {Math.ceil(total/PAGE)}</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                      style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, background:"none", cursor:"pointer", fontSize:12, opacity:page===1?0.4:1 }}>←</button>
                    <button onClick={()=>setPage(p=>p+1)} disabled={page*PAGE>=total}
                      style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, background:"none", cursor:"pointer", fontSize:12, opacity:page*PAGE>=total?0.4:1 }}>→</button>
                  </div>
                </div>
              )}
            </>
      }
    </div>
  );
}
