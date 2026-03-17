import { useState, useEffect, useCallback, useRef } from "react";
import AiBadge, { isAiGenerated } from "./AiBadge.jsx";

// ─── Shared helpers (inline to avoid circular imports) ───────────────────────
const api = {
  base: "/api",
  get: (p) => fetch(`/api${p}`).then(r => r.json()),
  post: (p, b) => fetch(`/api${p}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json()),
  patch: (p, b) => fetch(`/api${p}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json()),
  del: (p) => fetch(`/api${p}`, { method:"DELETE" }).then(r => r.json()),
};

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
  email:     { label:"Email",     color:"#6366f1", bg:"#eef2ff", icon:"✉️" },
  sms:       { label:"SMS",       color:"#0891b2", bg:"#ecfeff", icon:"💬" },
  whatsapp:  { label:"WhatsApp",  color:"#16a34a", bg:"#f0fdf4", icon:"📱" },
  call:      { label:"Call",      color:"#d97706", bg:"#fffbeb", icon:"📞" },
  note:      { label:"Note",      color:"#7c3aed", bg:"#f5f3ff", icon:"📝" },
};

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
      const r = await fetch(`/api/ai/chat`, {
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
function ComposeModal({ type, record, environment, onSave, onClose }) {
  const [subject, setSubject]   = useState("");
  const [body, setBody]         = useState("");
  const [to, setTo]             = useState(() => {
    // Pre-fill from record data if available
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
  const meta = TYPE_META[type] || {};

  useEffect(() => {
    api.get('/comms/status').then(s => setProviderStatus(s)).catch(() => {});
  }, []);

  useEffect(() => {
    if (type==="email" && environment?.id) {
      api.get(`/email-templates?environment_id=${environment.id}`).then(r => setTemplates(Array.isArray(r)?r:[]));
    }
  }, [type, environment?.id]);

  const applyTemplate = (t) => { setSubject(t.subject||""); setBody(t.body||""); };

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
    };
    await api.post("/comms", payload);
    setSaving(false);
    onSave();
  };

  const isSimulated = providerStatus && type !== "call" && direction === "outbound" && providerStatus[type] === "simulation";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1800, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ background:C.surface, borderRadius:18, width:540, maxHeight:"85vh", overflow:"auto", padding:28, boxShadow:"0 24px 60px rgba(0,0,0,.22)" }}>
        {showAI && <AIComposeModal type={type} record={record} objectName="Person" onUse={({subject:s,body:b})=>{if(s)setSubject(s);setBody(b);setShowAI(false)}} onClose={()=>setShowAI(false)}/>}

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:isSimulated?8:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>{meta.icon}</span>
            <span style={{ fontWeight:700, fontSize:16 }}>{type==="call" ? "Log Call" : `New ${meta.label}`}</span>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:20, color:C.text3 }}>×</button>
        </div>

        {/* Simulation mode badge */}
        {isSimulated && (
          <div style={{ marginBottom:16, padding:"8px 12px", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
            <span>⚡</span>
            <span><strong>Simulation mode</strong> — message will be saved but not sent. Add Twilio credentials in Settings to enable live sending.</span>
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

        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px", border:`1.5px solid ${C.border}`, borderRadius:10, background:"none", cursor:"pointer", fontSize:13 }}>Cancel</button>
          <button onClick={save} disabled={saving || (!body && type!=="call")}
            style={{ padding:"9px 20px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, opacity:(saving||(!body&&type!=="call"))?0.5:1 }}>
            {saving ? "Saving…" : type==="call" ? "Log Call" : direction==="outbound" ? (isSimulated ? `Save (Simulated)` : `Send ${meta.label}`) : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function CommDetail({ item, onClose, onDelete }) {
  const meta = TYPE_META[item.type] || {};
  const dir  = DIR_META[item.direction] || {};
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:1900, display:"flex", justifyContent:"flex-end" }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ width:480, background:C.surface, height:"100%", overflowY:"auto", padding:28, boxShadow:"-8px 0 40px rgba(0,0,0,.12)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>{meta.icon}</span>
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
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────
function CommItem({ item, onClick }) {
  const meta = TYPE_META[item.type] || {};
  const dir  = DIR_META[item.direction] || {};
  return (
    <div onClick={()=>onClick(item)} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background .1s" }}
      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      {/* Type badge */}
      <div style={{ width:36, height:36, borderRadius:10, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16 }}>
        {meta.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ fontWeight:600, fontSize:13, color:C.text1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {item.subject || (item.type==="call" ? `Call${item.outcome?` — ${item.outcome.replace("_"," ")}`:""}`:`${meta.label} ${dir.badge}`)}
          </div>
          <div style={{ fontSize:11, color:C.text3, whiteSpace:"nowrap", flexShrink:0 }}>{fmtDate(item.created_at)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
          <span style={{ fontSize:11, color:dir.color, fontWeight:600 }}>{dir.badge} {dir.label}</span>
          {item.simulated && <span style={{ fontSize:10, background:"#fffbeb", color:"#92400e", border:"1px solid #fde68a", borderRadius:8, padding:"1px 6px", fontWeight:600 }}>simulated</span>}
          {isAiGenerated(item) && <AiBadge label="AI" tooltip="Generated or sent by an AI agent"/>}
          {item.type==="call" && item.duration_seconds && (
            <span style={{ fontSize:11, color:C.text3 }}>· {fmtDuration(item.duration_seconds)}</span>
          )}
          {item.body && (
            <span style={{ fontSize:12, color:C.text3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1 }}>
              · {item.body.slice(0,80)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Search + Filter Bar ──────────────────────────────────────────────────────
function FilterBar({ activeType, setActiveType, search, setSearch, total, counts }) {
  const types = ["all", "email", "sms", "whatsapp", "call"];
  return (
    <div style={{ marginBottom:12 }}>
      {/* Type tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
        {types.map(t=>{
          const count = t==="all" ? total : (counts[t]||0);
          const meta = TYPE_META[t];
          return (
            <button key={t} onClick={()=>setActiveType(t)}
              style={{ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${activeType===t?(meta?.color||C.accent):C.border}`,
                background:activeType===t?(meta?.bg||C.accentLight):"none",
                color:activeType===t?(meta?.color||C.accent):C.text2,
                fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              {meta?.icon && <span>{meta.icon}</span>}
              {t==="all" ? "All" : meta?.label}
              {count>0 && <span style={{ background:activeType===t?(meta?.color||C.accent):"#e2e8f0", color:activeType===t?"#fff":C.text2, borderRadius:10, padding:"1px 6px", fontSize:10 }}>{count}</span>}
            </button>
          );
        })}
      </div>
      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search communications…"
        style={{ width:"100%", padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:"border-box", outline:"none", background:C.bg }}/>
    </div>
  );
}

// ─── Main CommunicationsPanel export ─────────────────────────────────────────
export default function CommunicationsPanel({ record, environment, externalCompose, onExternalComposeDone }) {
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [search, setSearch]     = useState("");
  const [compose, setCompose]   = useState(null);
  const [detail, setDetail]     = useState(null);
  const [page, setPage]         = useState(1);
  const PAGE = 20;

  // Open compose modal when parent bar triggers it
  useEffect(() => {
    if (externalCompose) { setCompose(externalCompose); }
  }, [externalCompose]);

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
    if (search) params.append("search", search);
    const d = await api.get(`/comms?${params}`);
    setItems(d.items || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [record?.id, activeType, search, page]);

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
          onSave={()=>{ setCompose(null); onExternalComposeDone?.(); setPage(1); load(); }}
          onClose={()=>{ setCompose(null); onExternalComposeDone?.(); }}/>
      )}

      {/* Detail drawer */}
      {detail && <CommDetail item={detail} onClose={()=>setDetail(null)} onDelete={id=>{ handleDelete(id); setDetail(null); }}/>}

      {/* Filter + search */}
      <FilterBar activeType={activeType} setActiveType={t=>{setActiveType(t);setPage(1);}}
        search={search} setSearch={setSearch} total={total} counts={counts}/>

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
                        <div key={t} style={{ width:44, height:44, borderRadius:12, background:TYPE_META[t].bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{TYPE_META[t].icon}</div>
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
