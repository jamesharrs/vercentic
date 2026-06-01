import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import AiBadge, { isAiGenerated } from "./AiBadge.jsx";
import AITextEditor from "./AITextEditor.jsx";
import RichTextEditor, { htmlToText } from "./RichTextEditor.jsx";

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
// ─── Compose Modal (fully rewritten) ─────────────────────────────────────────
// Single modal for email/sms/whatsapp/call, with type-picker, scratch/AI/template modes,
// branding preview, and bulk-recipients support.

const COMPOSE_MODES = [
  { id:"scratch",  label:"Write",     icon:"edit"    },
  { id:"template", label:"Template",  icon:"file"    },
  { id:"ai",       label:"AI Compose", icon:"sparkles" },
];


export function ComposeModal({
  type: initialType,
  record,
  recipients,
  environment,
  onSave,
  onClose,
  defaultRelatedRecordId,
}) {
  const isBulk = Array.isArray(recipients) && recipients.length > 1;
  const d0 = record?.data || {};
  const personName = [d0.first_name, d0.last_name].filter(Boolean).join(" ") || record?.name || "Recipient";

  // ── State ────────────────────────────────────────────────────────────────
  const [type,      setType]      = useState(initialType || "email");
  const [mode,      setMode]      = useState("write");
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [cc,        setCc]        = useState("");
  const [bcc,       setBcc]       = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [to,        setTo]        = useState(() => {
    if (isBulk) return "";
    const d = record?.data || {};
    const t = initialType || "email";
    if (t === "email")    return d.email || d.email_address || "";
    if (t === "sms")      return d.mobile || d.phone || d.phone_number || "";
    if (t === "whatsapp") return d.mobile || d.whatsapp || d.phone || "";
    return "";
  });
  const [direction,  setDir]       = useState((initialType||"email") === "call" ? "logged" : "outbound");
  const [duration,   setDuration]  = useState("");
  const [outcome,    setOutcome]   = useState("");
  const [templates,  setTemplates] = useState([]);
  const [selTpl,     setSelTpl]    = useState(null);
  const [aiLoading,  setAiLoading] = useState(false);
  const [aiPrompt,   setAiPrompt]  = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTone,     setAiTone]    = useState("professional");
  const [aiLength,   setAiLength]  = useState("concise");
  const [saving,     setSaving]    = useState(false);
  const [linkedJobs, setLinkedJobs] = useState([]);
  const [relatedRecordId, setRelated] = useState(defaultRelatedRecordId || "");
  const [providerStatus,  setProviderStatus] = useState(null);
  const [brandColor, setBrandColor] = useState("#4361EE");
  const [brandLogo,  setBrandLogo]  = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleAt,  setScheduleAt] = useState("");
  const [showSchedule,setShowSchedule] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [userSignature,    setUserSignature]    = useState("");   // HTML from preferences
  const [orgSignature,     setOrgSignature]     = useState("");   // fallback from environment
  // Template context picker — shown when template needs job/object data
  const [brandKits,      setBrandKits]      = useState([]);
  const [selectedKitId,  setSelectedKitId]  = useState(null);
  const [showKitPicker,  setShowKitPicker]  = useState(false);
  const [tplCtxPicker,   setTplCtxPicker]   = useState(null);  // { tpl, missingVars, allJobs }
  const [tplCtxSearch, setTplCtxSearch] = useState("");
  const [tplCtxLoading, setTplCtxLoading] = useState(false);
  const [tplCtxAllJobs, setTplCtxAllJobs] = useState([]);

  const meta = TYPE_META[type] || {};
  const bodyText = type === "email" ? htmlToText(body) : body;
  const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
  const charCount = bodyText.length;

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/comms/status').then(s => setProviderStatus(s)).catch(() => {});
  }, []);

  // Load user signature preferences (and org fallback)
  useEffect(() => {
    fetch("/api/users/me/preferences", { credentials: "include" })
      .then(r => r.json())
      .then(prefs => {
        if (prefs?.email_footer) {
          setUserSignature(prefs.email_footer);
        } else if (environment?.default_email_footer) {
          setOrgSignature(environment.default_email_footer);
        } else if (environment?.id) {
          // Fetch org default from environment
          fetch(`/api/environments/${environment.id}`, { credentials: "include" })
            .then(r => r.json())
            .then(env => { if (env?.default_email_footer) setOrgSignature(env.default_email_footer); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [environment?.id]); // eslint-disable-line

  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    tFetch(`/api/records/linked-jobs?person_id=${record.id}&environment_id=${environment.id}`)
      .then(r => r.json()).then(d => setLinkedJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [record?.id, environment?.id]);

  useEffect(() => {
    if (type === "email" && environment?.id) {
      api.get(`/email-templates?environment_id=${environment.id}`)
        .then(r => setTemplates(Array.isArray(r) ? r : []));
      api.get(`/brand-kits?environment_id=${environment.id}`)
        .then(r => {
          const kits = Array.isArray(r) ? r : [];
          setBrandKits(kits);
          // Auto-select default kit if one is marked
          const def = kits.find(k => k.is_default);
          if (def) setSelectedKitId(def.id);
        }).catch(() => {});
    }
  }, [type, environment?.id]);

  // Close kit picker on outside click
  useEffect(() => {
    if (!showKitPicker) return;
    const close = () => setShowKitPicker(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showKitPicker]);

  useEffect(() => {
    if (isBulk) return;
    const d = record?.data || {};
    if (type === "email")    setTo(d.email || d.email_address || "");
    else if (type === "sms") setTo(d.mobile || d.phone || d.phone_number || "");
    else if (type === "whatsapp") setTo(d.mobile || d.whatsapp || d.phone || "");
    else setTo("");
  }, [type]); // eslint-disable-line

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildVars = () => {
    const d = record?.data || {};
    const selectedJob = linkedJobs.find(j => j.id === relatedRecordId) || linkedJobs[0];
    const jd = selectedJob?.data || {};
    return {
      candidate_name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Candidate",
      first_name: d.first_name || "Candidate", last_name: d.last_name || "",
      full_name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Candidate",
      email: d.email || d.email_address || "", phone: d.phone || d.mobile || "",
      current_title: d.current_title || d.job_title || "", location: d.location || "",
      job_title: jd.job_title || jd.title || jd.name || "", job_location: jd.location || "",
      department: jd.department || "", company_name: jd.company || jd.entity || "",
      recruiter_name: "",
    };
  };
  const substitute = (text) =>
    (text || "").replace(/\{\{(\w+)\}\}/g, (m, k) => { const v = buildVars(); return v[k] !== undefined ? v[k] : m; });

  const applyTemplate = async (tpl) => {
    if (!tpl) return;
    // Detect which variable groups the template needs
    const JOB_VARS = ["job_title","job_location","job_department","job_salary_min","job_salary_max","job_work_type","job_name","job_description","interview_date","interview_time","interview_format","interview_location","offer_salary","offer_start_date","offer_expiry_date","offer_url","feedback_url","reschedule_url","interview_link"];
    const templateText = (tpl.subject || "") + " " + (tpl.body || "") + " " +
      (tpl.html_body || "") + " " +
      (tpl.blocks || []).map(b => {
        const ct = typeof b.content === "object" ? (b.content?.text || "") : (b.content || "");
        const pr = b.prompt || b.config?.prompt || "";
        return ct + " " + pr;
      }).join(" ");
    const usedVars = (templateText.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2,-2));
    const needsJob = usedVars.some(v => JOB_VARS.includes(v));

    // If template needs job data and none is selected yet — show picker
    if (needsJob && !relatedRecordId) {
      setTplCtxLoading(true);
      setTplCtxSearch("");
      setTplCtxAllJobs([]);
      setTplCtxPicker({ tpl, missingVars: usedVars.filter(v => JOB_VARS.includes(v)) });
      // Load all jobs in background for the "search all" fallback
      try {
        const allRecs = await api.get(`/records?object_slug=jobs&environment_id=${environment?.id}&limit=100`);
        setTplCtxAllJobs(Array.isArray(allRecs?.records) ? allRecs.records : []);
      } catch (_) {}
      setTplCtxLoading(false);
      return; // wait for picker confirmation
    }

    // Apply immediately if no job vars needed or job already selected
    setSelTpl(tpl);
    setSubject(substitute(tpl.subject || ""));
    setBody(substitute(tpl.body || ""));
    // Auto-select the template's brand kit if it has one
    if (tpl.brand_kit_id) setSelectedKitId(tpl.brand_kit_id);
    setMode("write");
  };

  // Called when user confirms job selection in the context picker
  const confirmTplContext = (jobId) => {
    const tpl = tplCtxPicker?.tpl;
    if (!tpl) return;
    setRelated(jobId || "");
    setTplCtxPicker(null);
    // Re-run applyTemplate with the job now set — use a microtask so state settles
    setTimeout(() => {
      setSelTpl(tpl);
      // Rebuild vars with the newly selected job
      const selectedJob = linkedJobs.find(j => j.id === jobId) || tplCtxAllJobs.find(j => j.id === jobId);
      const d = record?.data || {};
      const jd = selectedJob?.data || {};
      const vars = {
        candidate_name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Candidate",
        first_name: d.first_name || "Candidate", last_name: d.last_name || "",
        full_name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Candidate",
        email: d.email || d.email_address || "", phone: d.phone || d.mobile || "",
        current_title: d.current_title || d.job_title || "", location: d.location || "",
        job_title: jd.job_title || jd.title || jd.name || jd.job_title || "",
        job_location: jd.location || jd.job_location || "",
        department: jd.department || "", company_name: jd.company || jd.entity || "",
        recruiter_name: "",
      };
      const sub = (text) => (text || "").replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
      setSubject(sub(tpl.subject || ""));
      setBody(sub(tpl.body || ""));
      setMode("write");
    }, 0);
  };

  const handleAiCompose = async () => {
    setAiLoading(true);
    const d = record?.data || {};
    const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || "the candidate";

    // Build rich person context — only when composing to a single person
    const personContext = !isBulk ? [
      d.current_title    && `Current role: ${d.current_title}`,
      d.location         && `Location: ${d.location}`,
      d.skills?.length   && `Skills: ${Array.isArray(d.skills) ? d.skills.join(", ") : d.skills}`,
      d.years_experience && `Experience: ${d.years_experience} years`,
      d.source           && `Source: ${d.source}`,
      d.nationality      && `Nationality: ${d.nationality}`,
      d.status           && `Current status: ${d.status}`,
      d.education        && `Education: ${d.education}`,
      d.linkedin_url     && `LinkedIn: ${d.linkedin_url}`,
      d.summary          && `Profile summary: ${d.summary}`,
    ].filter(Boolean).join("\n") : "";

    const lengthInstr = aiLength === "concise"
      ? "Write 2 short paragraphs."
      : aiLength === "detailed"
      ? "Write 3-4 well-structured paragraphs."
      : "Write 2-3 paragraphs.";
    const extraContext = aiPrompt.trim() ? `\nInstructions: ${aiPrompt.trim()}` : "";
    const contextBlock = personContext ? `\n\nCandidate profile:\n${personContext}` : "";

    const prompt = type === "email"
      ? `Write a ${aiTone} recruitment email to ${name}.${contextBlock}${extraContext}\n${lengthInstr} Personalise based on their profile. Use natural paragraph breaks — each paragraph should be a separate <p> tag. Return JSON only — no markdown, no code fences: {"subject":"...","body":"<p>paragraph one</p><p>paragraph two</p>"}`
      : `Write a brief, ${aiTone} ${type} message to ${name}.${extraContext} Under 160 chars for SMS. Return JSON only: {"body":"..."}`;
    try {
      const data = await tFetch("/api/ai/chat", {
        method: "POST",
        body: { messages: [{ role: "user", content: prompt }], max_tokens: 800 },
      });
      const raw = data?.content || "";
      // Strip any code fences the model may have added despite instructions
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.subject) setSubject(parsed.subject);
      if (parsed.body)    setBody(parsed.body);
      setShowAiPanel(false);
    } catch (err) { console.error('[AI Compose]', err); }
    setAiLoading(false);
  };

  const save = async () => {
    setSaving(true);

    // If a brand kit is selected for email, wrap the body in the branded template
    let finalHtml = bodyWithSignature;
    if (type === "email" && selectedKitId) {
      try {
        const wrapped = await api.post("/email-builder/preview", {
          blocks: [{ type: "html", content: bodyWithSignature }],
          brand_kit_id: selectedKitId,
          subject,
        });
        if (wrapped?.html) finalHtml = wrapped.html;
      } catch (_) { /* fall back to plain body */ }
    }

    const targets = isBulk ? recipients : [record];
    await Promise.all(targets.map(rec => {
      const d = rec?.data || rec || {};
      const recTo = isBulk
        ? (type === "email" ? (d.email || d.email_address || "") : (d.mobile || d.phone || ""))
        : to;
      return api.post("/comms", {
        record_id: rec.id, environment_id: environment?.id,
        type, direction, to: recTo || undefined,
        subject: subject || undefined,
        body: type === "email" ? finalHtml : bodyText,
        body_html: type === "email" ? finalHtml : undefined,
        body_text: type === "email" ? htmlToText(bodyWithSignature) : undefined,
        duration_seconds: duration ? Number(duration) : undefined,
        outcome: outcome || undefined,
        from_label: direction === "inbound" ? "External" : "Me",
        related_record_id: relatedRecordId || undefined,
        context: relatedRecordId ? "application" : "general",
        scheduled_at: scheduleAt || undefined,
      });
    }));
    setSaving(false);
    onSave();
  };

  const isSimulated = providerStatus && type !== "call" && direction === "outbound" && providerStatus[type] === "simulation";
  const canSend = type === "call" ? true : !!bodyText.trim();

  // Effective signature — user's own takes priority over org default
  const activeSignature = userSignature || orgSignature;
  // Full email body = composed body + signature separator + signature HTML
  const bodyWithSignature = (type === "email" && includeSignature && activeSignature)
    ? `${body}<br/><br/><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>${activeSignature}`
    : body;

  // ── Colours ───────────────────────────────────────────────────────────────
  const accent = meta.color || C.accent;
  const bg     = "#FFFFFF";
  const sidebarBg = "#F8F9FF";
  const border = "#E8ECF4";

  // ── Sub-renders (called as functions to avoid remount) ────────────────────
  const TypeSelector = () => (
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {["email","sms","whatsapp","call"].map(t => {
        const m = TYPE_META[t] || {};
        const active = type === t;
        return (
          <button key={t} onClick={() => setType(t)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5,
              padding:"10px 6px", borderRadius:10,
              border:`1.5px solid ${active ? m.color || C.accent : border}`,
              background: active ? `${m.color || C.accent}15` : "transparent",
              cursor:"pointer", transition:"all .12s" }}>
            <TypeIcon type={t} size={20} color={active ? m.color : C.text3}/>
            <span style={{ fontSize:10, fontWeight:700, color: active ? m.color || C.accent : C.text3 }}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );

  const SidebarFields = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* To */}
      {type !== "call" && direction === "outbound" && !isBulk && (
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>To</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder={type === "email" ? "email@example.com" : "+1 234 567 8900"}
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", borderRadius:8, border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none", background:bg }}/>
        </div>
      )}

      {/* Bulk summary */}
      {isBulk && (
        <div style={{ padding:"8px 10px", background:`${accent}12`, border:`1.5px solid ${accent}30`, borderRadius:8, fontSize:12, color:accent, fontWeight:600 }}>
          {recipients.length} recipients
        </div>
      )}

      {/* CC / BCC — email only */}
      {type === "email" && (
        <div>
          {!showCcBcc ? (
            <button onClick={() => setShowCcBcc(true)}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:C.text3, padding:0, textDecoration:"underline", fontFamily:"inherit" }}>
              + Add CC / BCC
            </button>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[["CC","cc",cc,setCc],["BCC","bcc",bcc,setBcc]].map(([label,,val,setter]) => (
                <div key={label}>
                  <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:3 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder="email@example.com"
                    style={{ width:"100%", boxSizing:"border-box", padding:"6px 10px", borderRadius:8, border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none", background:bg }}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direction */}
      {type !== "call" && (
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>Direction</label>
          <div style={{ display:"flex", gap:4 }}>
            {["outbound","inbound"].map(d => (
              <button key={d} onClick={() => setDir(d)}
                style={{ flex:1, padding:"5px 8px", borderRadius:7, border:`1.5px solid ${direction === d ? accent : border}`,
                  background: direction === d ? `${accent}12` : "transparent",
                  color: direction === d ? accent : C.text3, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                {DIR_META[d]?.badge} {DIR_META[d]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Related job */}
      {linkedJobs.length > 0 && (
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>Related to</label>
          <select value={relatedRecordId} onChange={e => setRelated(e.target.value)}
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1.5px solid ${relatedRecordId ? accent : border}`,
              fontSize:12, background: relatedRecordId ? `${accent}08` : bg, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
            <option value="">General</option>
            {linkedJobs.map(j => <option key={j.id} value={j.id}>{j.title || j.name}</option>)}
          </select>
        </div>
      )}

      {/* Call fields */}
      {type === "call" && (
        <>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>Duration (seconds)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 300"
              style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", borderRadius:8, border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none", background:bg }}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>Outcome</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value)}
              style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1.5px solid ${border}`, fontSize:12, background:bg, outline:"none", fontFamily:"inherit" }}>
              <option value="">Select outcome…</option>
              {["Connected","Voicemail","No Answer","Busy","Wrong Number"].map(o => <option key={o} value={o.toLowerCase().replace(/ /g,"_")}>{o}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Simulation warning */}
      {isSimulated && (
        <div style={{ padding:"8px 10px", background:"#fffbeb", border:`1.5px solid #fde68a`, borderRadius:8, fontSize:11, color:"#92400e" }}>
          ⚡ <strong>Simulation mode</strong> — email will be saved but not sent.
        </div>
      )}

      {/* Word / char count */}
      {type !== "call" && body && (
        <div style={{ fontSize:10, color:C.text3, textAlign:"right", marginTop:"auto", paddingTop:4 }}>
          {wordCount} words · {charCount} chars
        </div>
      )}
    </div>
  );

  const WriteArea = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:0, flex:1, minHeight:0 }}>
      {/* Subject */}
      {type === "email" && (
        <div style={{ borderBottom:`1.5px solid ${border}`, paddingBottom:0, flexShrink:0 }}>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line…"
            style={{ width:"100%", boxSizing:"border-box", padding:"12px 0", border:"none",
              fontSize:17, fontWeight:700, color:C.text1, fontFamily:"inherit", outline:"none",
              background:"transparent", letterSpacing:"-0.3px" }}/>
        </div>
      )}

      {/* ── Inline AI panel — appears between subject and body ── */}
      {showAiPanel && (
        <div style={{ borderBottom:`1.5px solid ${accent}25`, background:`${accent}06`,
          padding:"12px 14px 14px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:accent }}>✨ AI Compose</span>
            <button onClick={() => setShowAiPanel(false)}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, color:C.text3, lineHeight:1 }}>×</button>
          </div>
          {/* Tone + Length */}
          <div style={{ display:"flex", gap:16, marginBottom:8, flexWrap:"wrap" }}>
            {[
              { label:"Tone", value:aiTone, setter:setAiTone, opts:[["professional","Professional"],["friendly","Friendly"],["formal","Formal"],["casual","Casual"],["persuasive","Persuasive"]] },
              { label:"Length", value:aiLength, setter:setAiLength, opts:[["concise","Concise"],["medium","Medium"],["detailed","Detailed"]] },
            ].map(({ label, value, setter, opts }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{label}</span>
                {opts.map(([val, lbl]) => (
                  <button key={val} onClick={() => setter(val)}
                    style={{ padding:"3px 8px", borderRadius:6,
                      border:`1.5px solid ${value === val ? accent : border}`,
                      background: value === val ? `${accent}15` : "white",
                      color: value === val ? accent : C.text3,
                      fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {/* Prompt textarea */}
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiCompose(); }}
              placeholder="Describe what to say, or leave blank for a general outreach…"
              rows={2}
              style={{ flex:1, padding:"7px 10px", borderRadius:7,
                border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none",
                resize:"none", color:C.text1, background:"white", lineHeight:1.5 }}
            />
            <button onClick={handleAiCompose} disabled={aiLoading}
              style={{ padding:"7px 14px", borderRadius:7, border:"none",
                background:accent, color:"white", fontSize:12, fontWeight:700,
                cursor:aiLoading?"not-allowed":"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:6, opacity:aiLoading?0.7:1, whiteSpace:"nowrap", flexShrink:0 }}>
              {aiLoading ? (
                <>
                  <span style={{ width:11, height:11, border:"2px solid white", borderTopColor:"transparent",
                    borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                  Generating…
                </>
              ) : "✨ Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Body — RichTextEditor for email, plain textarea for SMS/WhatsApp/call */}
      {type === "email" ? (() => {
        const kit = brandKits.find(k => k.id === selectedKitId);
        const primary = kit?.primaryColor || '#4361EE';
        const bg      = kit?.bgColor      || '#ffffff';
        const font    = kit?.fontFamily   || 'inherit';
        const editor  = (
          <RichTextEditor
            value={body}
            onChange={html => setBody(html)}
            placeholder="Write your message…"
            minHeight={220}
          />
        );

        if (!kit) return editor;

        // Render the editor inside a live branded frame
        return (
          <div style={{ margin:"12px 0", borderRadius:12, overflow:"hidden",
            border:`1.5px solid ${primary}30`, boxShadow:`0 2px 12px rgba(0,0,0,0.07)` }}>

            {/* Header */}
            <div style={{ background:primary, padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
              {kit.logo_url
                ? <img src={kit.logo_url} alt={kit.company_name || ''} style={{ maxHeight:32, maxWidth:160, objectFit:"contain" }} onError={e=>e.target.style.display='none'}/>
                : kit.company_name
                  ? <span style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:font }}>{kit.company_name}</span>
                  : null
              }
            </div>

            {/* Body area — white card */}
            <div style={{ background:bg, padding:"20px 24px", fontFamily:font }}>
              {editor}
            </div>

            {/* Footer */}
            {(kit.footer_text || kit.company_name) && (
              <div style={{ background:"#f8f9fa", borderTop:`1px solid #e8ecf0`,
                padding:"12px 24px", textAlign:"center",
                fontSize:11, color:"#888", fontFamily:font, lineHeight:1.5 }}>
                {kit.footer_text || `© ${new Date().getFullYear()} ${kit.company_name}. All rights reserved.`}
              </div>
            )}
          </div>
        );
      })() : type !== "call" ? (
        <AITextEditor context={`${meta.label} message`} onApply={newText => setBody(newText)}>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder={`${meta.label} message…`}
            autoFocus
            style={{ flex:1, width:"100%", boxSizing:"border-box", padding:"14px 0", border:"none",
              fontSize:14, lineHeight:1.75, color:C.text1, fontFamily:"inherit", outline:"none",
              resize:"none", background:"transparent", minHeight:140 }}/>
        </AITextEditor>
      ) : null}

      {/* Signature preview — shown inline below body when signature is active */}
      {type === "email" && includeSignature && activeSignature && (
        <div style={{ borderTop:`1px dashed ${border}`, marginTop:4, paddingTop:12, opacity:0.75 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>
            Signature
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: activeSignature }}
            style={{ fontSize:13, color:C.text2, lineHeight:1.6, pointerEvents:"none" }}
          />
        </div>
      )}

      {/* Schedule send */}
      {type === "email" && showSchedule && (
        <div style={{ borderTop:`1.5px solid ${border}`, paddingTop:10, flexShrink:0,
          display:"flex", alignItems:"center", gap:8 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.text3 }}>Send at</label>
          <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
            style={{ flex:1, padding:"5px 8px", borderRadius:7, border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none" }}/>
          <button onClick={() => { setScheduleAt(""); setShowSchedule(false); }}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.text3 }}>×</button>
        </div>
      )}


    </div>
  );

  const TemplateArea = () => (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
      {/* ── Templates ── */}
      <div style={{ flex:1 }}>
      {templates.length === 0 ? (
        <div style={{ textAlign:"center", color:C.text3, fontSize:13, padding:"40px 0" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📝</div>
          No email templates yet.<br/>
          <span style={{ fontSize:11 }}>Create them in Settings → Email Templates.</span>
        </div>
      ) : (
        <div style={{ display:"grid", gap:8 }}>
          {templates.map(tpl => (
            <button key={tpl.id} onClick={() => applyTemplate(tpl)}
              style={{ textAlign:"left", padding:"12px 14px", borderRadius:10,
                border:`1.5px solid ${selTpl?.id === tpl.id ? accent : border}`,
                background: selTpl?.id === tpl.id ? `${accent}08` : "#f9fafc",
                cursor:"pointer", fontFamily:"inherit", transition:"all .1s" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{tpl.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  {tpl.brand_kit_id && (() => {
                    const kit = brandKits.find(k => k.id === tpl.brand_kit_id);
                    const dot = kit?.primaryColor || kit?.primary_color || "#4361EE";
                    return kit ? (
                      <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10,
                        background:`${dot}15`, color:dot, border:`1px solid ${dot}30`,
                        display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:dot }}/>
                        {kit.name}
                      </span>
                    ) : null;
                  })()}
                  {selTpl?.id === tpl.id && <span style={{ fontSize:10, color:accent, fontWeight:700 }}>Selected ✓</span>}
                </div>
              </div>
              {tpl.subject && <div style={{ fontSize:11, color:C.text3, marginBottom:2 }}>Subject: {tpl.subject}</div>}
              {tpl.body && <div style={{ fontSize:11, color:C.text3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{tpl.body}</div>}
            </button>
          ))}
        </div>
      )}
      </div>{/* end templates inner */}
    </div>
  );

  const AIArea = () => (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ padding:"14px 16px", background:`${accent}08`, border:`1.5px solid ${accent}20`, borderRadius:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:12 }}>✨ AI Compose</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { label:"Tone", value:aiTone, setter:setAiTone, opts:[["professional","Professional"],["friendly","Friendly"],["formal","Formal"],["casual","Casual"],["persuasive","Persuasive"]] },
            { label:"Length", value:aiLength, setter:setAiLength, opts:[["concise","Concise"],["medium","Medium"],["detailed","Detailed"]] },
          ].map(({ label, value, setter, opts }) => (
            <div key={label}>
              <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {opts.map(([val, lbl]) => (
                  <button key={val} onClick={() => setter(val)}
                    style={{ padding:"4px 9px", borderRadius:6, border:`1.5px solid ${value === val ? accent : border}`,
                      background: value === val ? `${accent}15` : "transparent",
                      color: value === val ? accent : C.text3, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <textarea
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder="Describe what you want to say, or leave blank for a general outreach email…"
          rows={3}
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8,
            border:`1.5px solid ${border}`, fontSize:12, fontFamily:"inherit", outline:"none",
            resize:"vertical", color:C.text1, background:"white", lineHeight:1.6, marginBottom:4 }}
        />
        <button onClick={handleAiCompose} disabled={aiLoading}
          style={{ width:"100%", padding:"9px", borderRadius:9, border:"none", background:accent,
            color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7, opacity:aiLoading?0.7:1 }}>
          {aiLoading ? (
            <>
              <span style={{ width:13, height:13, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
              Generating…
            </>
          ) : "✨ Generate Draft"}
        </button>
      </div>
      {body && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Generated draft</div>
          <div style={{ padding:"10px 12px", background:"#f8f9fc", borderRadius:9, border:`1px solid ${border}`, fontSize:12, color:C.text2, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
            {subject && <div style={{ fontWeight:700, color:C.text1, marginBottom:4 }}>{subject}</div>}
            {body}
          </div>
          <button onClick={() => setMode("write")}
            style={{ marginTop:8, padding:"6px 14px", borderRadius:8, border:`1.5px solid ${border}`, background:"white",
              fontSize:12, fontWeight:600, color:C.text2, cursor:"pointer", fontFamily:"inherit" }}>
            Edit draft →
          </button>
        </div>
      )}
    </div>
  );

  const PreviewArea = () => (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.text3 }}>Brand colour</label>
          <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
            style={{ width:28, height:22, border:"none", borderRadius:4, cursor:"pointer", padding:0 }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.text3 }}>Logo URL</label>
          <input value={brandLogo} onChange={e => setBrandLogo(e.target.value)} placeholder="https://…"
            style={{ flex:1, padding:"4px 8px", border:`1px solid ${border}`, borderRadius:6, fontSize:11, outline:"none", fontFamily:"inherit" }}/>
        </div>
      </div>
      <div style={{ border:`1px solid ${border}`, borderRadius:12, overflow:"hidden", fontSize:13, fontFamily:"sans-serif", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ background:brandColor, padding:"20px 28px", textAlign:"center" }}>
          {brandLogo
            ? <img src={brandLogo} alt="" style={{ maxHeight:36, maxWidth:160, objectFit:"contain" }}/>
            : <div style={{ color:"white", fontWeight:800, fontSize:18 }}>Your Company</div>}
        </div>
        <div style={{ padding:"28px 32px", background:"white", color:"#111827", lineHeight:1.8 }}>
          {subject && <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>{subject}</div>}
          {body
            ? <div dangerouslySetInnerHTML={{ __html: body }} style={{ color:"#374151" }}/>
            : <span style={{ color:"#9ca3af" }}>Your message will appear here…</span>}
          {includeSignature && activeSignature && (
            <div style={{ borderTop:"1px solid #e5e7eb", marginTop:20, paddingTop:16 }}>
              <div dangerouslySetInnerHTML={{ __html: activeSignature }} style={{ fontSize:13, lineHeight:1.6 }}/>
            </div>
          )}
        </div>
        <div style={{ background:"#f8f9fc", padding:"12px 28px", textAlign:"center", fontSize:11, color:"#9ca3af", borderTop:`1px solid ${border}` }}>
          Sent via Vercentic · <span style={{ textDecoration:"underline", cursor:"pointer" }}>Unsubscribe</span>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <>
    <div style={{ position:"fixed", inset:0, background:"rgba(10,12,26,0.55)", zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(3px)", padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background:bg, borderRadius:18, width:"100%", maxWidth:860, maxHeight:"90vh",
        display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,0.18)",
        overflow:"hidden" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px",
          borderBottom:`1.5px solid ${border}`, flexShrink:0, background:bg }}>

          {/* Type icon + label */}
          <div style={{ width:38, height:38, borderRadius:10, background:`${accent}15`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <TypeIcon type={type} size={18} color={accent}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text1, lineHeight:1.2 }}>
              {type === "call" ? "Log Call" : `New ${meta.label}`}
            </div>
            <div style={{ fontSize:12, color:C.text3, marginTop:1 }}>{personName}</div>
          </div>

          {/* Mode tabs — right-aligned in header */}
          {type !== "call" && (
            <div style={{ display:"flex", gap:2, background:"#F1F3FA", borderRadius:10, padding:3 }}>
              {[
                { id:"write", label:"Write" },
                { id:"template", label:"Template" },
                ...(type === "email" ? [{ id:"preview", label:"Preview" }] : []),
              ].map(m => (
                <button key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{ padding:"5px 12px", borderRadius:8, border:"none",
                    background: mode === m.id ? "white" : "transparent",
                    boxShadow: mode === m.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    color: mode === m.id ? C.text1 : C.text3,
                    fontSize:12, fontWeight: mode === m.id ? 700 : 500,
                    cursor:"pointer", transition:"all .12s", whiteSpace:"nowrap" }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Preview branding button — email write mode only */}
          {type === "email" && mode === "write" && (
            <button onClick={() => setMode("preview")}
              style={{ padding:"5px 10px", borderRadius:8, border:`1.5px solid ${border}`,
                background:"transparent", color:C.text3, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              Preview ↗
            </button>
          )}

          {/* Brand Kit layout picker — email write mode only */}
          {type === "email" && mode === "write" && brandKits.length > 0 && (
            <div style={{ position:"relative" }}>
              <button
                onClick={() => setShowKitPicker(p => !p)}
                style={{ padding:"5px 10px", borderRadius:8,
                  border: selectedKitId ? `1.5px solid ${brandKits.find(k=>k.id===selectedKitId)?.primaryColor||C.accent}` : `1.5px solid ${border}`,
                  background: selectedKitId ? `${brandKits.find(k=>k.id===selectedKitId)?.primaryColor||C.accent}12` : "transparent",
                  color: selectedKitId ? (brandKits.find(k=>k.id===selectedKitId)?.primaryColor||C.accent) : C.text3,
                  fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                  display:"flex", alignItems:"center", gap:5 }}>
                {selectedKitId ? (
                  <>
                    <span style={{ width:7, height:7, borderRadius:"50%",
                      background: brandKits.find(k=>k.id===selectedKitId)?.primaryColor || C.accent }}/>
                    {brandKits.find(k=>k.id===selectedKitId)?.name}
                  </>
                ) : "🎨 Layout"}
              </button>
              {showKitPicker && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
                  background:"white", borderRadius:12, border:`1.5px solid ${border}`,
                  boxShadow:"0 8px 24px rgba(0,0,0,0.12)", padding:"8px", minWidth:180 }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase",
                    letterSpacing:".06em", padding:"2px 8px 8px" }}>Brand Layout</div>
                  {/* None option */}
                  <button
                    onClick={() => { setSelectedKitId(null); setShowKitPicker(false); }}
                    style={{ width:"100%", textAlign:"left", padding:"7px 10px", borderRadius:8, border:"none",
                      background: !selectedKitId ? `${C.accent}10` : "transparent",
                      color: !selectedKitId ? C.accent : C.text2,
                      fontSize:12, fontWeight: !selectedKitId ? 700 : 500, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${border}`,
                      background:"white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {!selectedKitId && <span style={{ fontSize:9 }}>✓</span>}
                    </span>
                    Plain (no layout)
                  </button>
                  {brandKits.map(kit => {
                    const active = selectedKitId === kit.id;
                    const dot = kit.primaryColor || kit.primary_color || C.accent;
                    return (
                      <button key={kit.id}
                        onClick={() => { setSelectedKitId(kit.id); setShowKitPicker(false); }}
                        style={{ width:"100%", textAlign:"left", padding:"7px 10px", borderRadius:8, border:"none",
                          background: active ? `${dot}10` : "transparent",
                          color: active ? dot : C.text2,
                          fontSize:12, fontWeight: active ? 700 : 500, cursor:"pointer", fontFamily:"inherit",
                          display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:16, height:16, borderRadius:4, background:dot, flexShrink:0,
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {active && <span style={{ fontSize:9, color:"white" }}>✓</span>}
                        </span>
                        <span style={{ flex:1 }}>{kit.name}</span>
                        {kit.is_default && (
                          <span style={{ fontSize:9, background:`${dot}20`, color:dot,
                            padding:"1px 5px", borderRadius:6, fontWeight:700 }}>default</span>
                        )}
                      </button>
                    );
                  })}
                  <div style={{ borderTop:`1px solid ${border}`, margin:"8px 0 4px", padding:"6px 8px 2px" }}>
                    <div style={{ fontSize:10, color:C.text3, lineHeight:1.5 }}>
                      Layout wraps your email in the brand kit's header, footer, and colours when sent.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI toggle — email/sms write mode */}
          {mode === "write" && (
            <button onClick={() => setShowAiPanel(p => !p)}
              style={{ padding:"5px 10px", borderRadius:8, border:`1.5px solid ${showAiPanel ? accent : border}`,
                background: showAiPanel ? `${accent}12` : "transparent",
                color: showAiPanel ? accent : C.text3,
                fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              ✨ AI
            </button>
          )}

          {/* Close */}
          <button onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, border:`1.5px solid ${border}`,
              background:"transparent", cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", color:C.text3, fontSize:18, lineHeight:1, flexShrink:0 }}>×</button>
        </div>

        {/* ── Body: sidebar + main ── */}
        <div style={{ display:"flex", flex:1, minHeight:0, overflow:"hidden" }}>

          {/* LEFT SIDEBAR */}
          <div style={{ width:220, flexShrink:0, background:sidebarBg,
            borderRight:`1.5px solid ${border}`, padding:"16px 14px",
            display:"flex", flexDirection:"column", overflowY:"auto" }}>

            {/* Type selector — only if no initialType */}
            {!initialType && TypeSelector()}

            {SidebarFields()}
          </div>

          {/* MAIN COMPOSE AREA */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, padding:"16px 22px", overflowY:"auto" }}>
            {mode === "write"    && WriteArea()}
            {mode === "template" && TemplateArea()}
                {mode === "preview"  && PreviewArea()}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 20px",
          borderTop:`1.5px solid ${border}`, flexShrink:0, background:bg }}>

          {/* Schedule send */}
          {type === "email" && mode === "write" && !showSchedule && (
            <button onClick={() => setShowSchedule(true)}
              style={{ padding:"6px 12px", borderRadius:8, border:`1.5px solid ${border}`,
                background:"transparent", color:C.text3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              🕐 Schedule
            </button>
          )}

          {/* Signature toggle — email only */}
          {type === "email" && activeSignature && (
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, color:C.text2 }}>
              <input type="checkbox" checked={includeSignature} onChange={e => setIncludeSignature(e.target.checked)}
                style={{ width:14, height:14, accentColor:accent, cursor:"pointer" }}/>
              Include signature
            </label>
          )}

          <div style={{ flex:1 }}/>

          <button onClick={onClose}
            style={{ padding:"8px 20px", border:`1.5px solid ${border}`, borderRadius:10,
              background:"transparent", cursor:"pointer", fontSize:13, fontWeight:600, color:C.text2, fontFamily:"inherit" }}>
            Cancel
          </button>

          <button onClick={save} disabled={!canSend || saving}
            style={{ padding:"8px 22px", border:"none", borderRadius:10,
              background: canSend ? accent : "#D1D5DB",
              color:"white", fontSize:13, fontWeight:700, cursor: canSend ? "pointer" : "default",
              fontFamily:"inherit", display:"flex", alignItems:"center", gap:7,
              boxShadow: canSend ? `0 2px 10px ${accent}40` : "none", transition:"all .15s" }}>
            {saving ? (
              <><span style={{ width:12, height:12, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/> Sending…</>
            ) : type === "call" ? "Log Call" : direction === "inbound" ? `Log ${meta.label}` : scheduleAt ? "Schedule Send" : `Send ${meta.label}`}
          </button>
        </div>
      </div>
    </div>

    {/* ── Template Context Picker overlay ── */}
    {tplCtxPicker && (
      <div style={{ position:"fixed", inset:0, zIndex:9500, background:"rgba(10,12,26,0.65)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        backdropFilter:"blur(4px)" }}
        onClick={e => { if (e.target === e.currentTarget) setTplCtxPicker(null); }}>
        <div style={{ background:"white", borderRadius:18, width:"100%", maxWidth:520,
          boxShadow:"0 24px 80px rgba(0,0,0,0.22)", overflow:"hidden" }}
          onMouseDown={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding:"20px 24px 16px", borderBottom:"1.5px solid #f0f1f5" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#0f1729", marginBottom:4 }}>
              This template needs job details
            </div>
            <div style={{ fontSize:13, color:"#6b7280", lineHeight:1.5 }}>
              <strong>{tplCtxPicker.tpl.name}</strong> uses{" "}
              <code style={{ background:"#f3f4f6", padding:"1px 5px", borderRadius:4, fontSize:11 }}>
                {"{{"}{tplCtxPicker.missingVars.slice(0,3).join("}}, {{")}{tplCtxPicker.missingVars.length>3 ? `}} +${tplCtxPicker.missingVars.length-3} more` : "}}"}
              </code>
              {" "}— select the role this email is about.
            </div>
          </div>

          <div style={{ padding:"16px 24px", maxHeight:380, overflowY:"auto" }}>
            {/* Linked jobs section */}
            {linkedJobs.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase",
                  letterSpacing:".06em", marginBottom:8 }}>Linked roles</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {linkedJobs.map(j => {
                    const jd = j.data || {};
                    const title = jd.job_title || jd.title || jd.name || "Untitled role";
                    const dept  = jd.department || jd.job_department || "";
                    const loc   = jd.location || jd.job_location || "";
                    return (
                      <button key={j.id} onClick={() => confirmTplContext(j.id)}
                        style={{ textAlign:"left", padding:"11px 14px", borderRadius:10,
                          border:`1.5px solid ${accent}30`, background:`${accent}05`,
                          cursor:"pointer", fontFamily:"inherit", transition:"all .1s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = `${accent}10`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.background = `${accent}05`; }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f1729" }}>{title}</div>
                        {(dept || loc) && <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                          {[dept, loc].filter(Boolean).join(" · ")}
                        </div>}
                        <div style={{ fontSize:10, color:accent, fontWeight:600, marginTop:3 }}>✓ Linked</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search all jobs */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase",
                letterSpacing:".06em", marginBottom:8 }}>
                {linkedJobs.length > 0 ? "Or search all roles" : "Select a role"}
              </div>
              <input
                placeholder="Search roles…"
                value={tplCtxSearch}
                onChange={e => setTplCtxSearch(e.target.value)}
                autoFocus={linkedJobs.length === 0}
                style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9,
                  border:"1.5px solid #e5e7eb", fontSize:13, fontFamily:"inherit", outline:"none",
                  marginBottom:8, background:"#fafafa" }}
              />
              {tplCtxLoading ? (
                <div style={{ textAlign:"center", padding:16, color:"#9ca3af", fontSize:12 }}>Loading roles…</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:200, overflowY:"auto" }}>
                  {tplCtxAllJobs
                    .filter(j => {
                      const q = tplCtxSearch.toLowerCase();
                      if (!q) return true;
                      const jd = j.data || {};
                      return [jd.job_title, jd.title, jd.name, jd.department, jd.location]
                        .some(v => v && String(v).toLowerCase().includes(q));
                    })
                    .slice(0, 20)
                    .map(j => {
                      const jd = j.data || {};
                      const title = jd.job_title || jd.title || jd.name || "Untitled role";
                      const dept  = jd.department || "";
                      const loc   = jd.location || "";
                      const alreadyLinked = linkedJobs.some(lj => lj.id === j.id);
                      if (alreadyLinked) return null; // already shown above
                      return (
                        <button key={j.id} onClick={() => confirmTplContext(j.id)}
                          style={{ textAlign:"left", padding:"9px 12px", borderRadius:9,
                            border:"1.5px solid #e5e7eb", background:"white",
                            cursor:"pointer", fontFamily:"inherit", transition:"all .1s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = `${accent}06`; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#0f1729" }}>{title}</div>
                          {(dept || loc) && <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>
                            {[dept, loc].filter(Boolean).join(" · ")}
                          </div>}
                        </button>
                      );
                    })
                  }
                  {tplCtxAllJobs.length === 0 && !tplCtxLoading && (
                    <div style={{ textAlign:"center", padding:12, color:"#9ca3af", fontSize:12 }}>
                      No roles found. You can still use this template without job data.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display:"flex", gap:8, padding:"14px 24px", borderTop:"1.5px solid #f0f1f5",
            background:"#fafafa", justifyContent:"flex-end" }}>
            <button onClick={() => setTplCtxPicker(null)}
              style={{ padding:"8px 18px", borderRadius:9, border:"1.5px solid #e5e7eb",
                background:"transparent", fontSize:13, fontWeight:600, color:"#6b7280",
                cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={() => confirmTplContext("")}
              style={{ padding:"8px 18px", borderRadius:9, border:"none",
                background:"#f3f4f6", fontSize:13, fontWeight:600, color:"#374151",
                cursor:"pointer", fontFamily:"inherit" }}>
              Use without job data
            </button>
          </div>
        </div>
      </div>
    )}
  </>,
    document.body
  );
}


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

        {item.body && item.type === "email" ? (
          <div style={{ borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:20 }}>
            {/* Rendered HTML email */}
            <iframe
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>
                body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6;}
                img{max-width:100%;height:auto;}
                a{color:#4361ee;}
                table{border-collapse:collapse;width:100%;}
                td,th{padding:8px;}
              </style></head><body>${item.body_html || item.body}</body></html>`}
              sandbox="allow-same-origin"
              style={{ width:"100%", minHeight:200, border:"none", display:"block" }}
              onLoad={e => {
                try {
                  const h = e.target.contentDocument?.body?.scrollHeight;
                  if (h) e.target.style.height = (h + 32) + "px";
                } catch {}
              }}
            />
          </div>
        ) : item.body ? (
          <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", fontSize:13, color:C.text1, lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:20 }}>
            {item.body}
          </div>
        ) : null}

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
  const rawPreview = resolveVars(item.body_text || item.body || "");
  const preview = rawPreview.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
