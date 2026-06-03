// client/src/VideoInterviews.jsx
// Admin UI — Video Interview template builder and review dashboard
// Vercentic brand, Lucide SVG icons via Ic component pattern

import { useState, useEffect, useCallback, useRef } from "react";

const api = {
  get:    p     => fetch(`/api${p}`, { credentials:"include" }).then(r => r.json()),
  post:   (p,b) => fetch(`/api${p}`, { method:"POST",   headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(b) }).then(r => r.json()),
  patch:  (p,b) => fetch(`/api${p}`, { method:"PATCH",  headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(b) }).then(r => r.json()),
  delete: (p)   => fetch(`/api${p}`, { method:"DELETE", credentials:"include" }).then(r => r.json()),
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "var(--t-bg,#F0F2FF)",
  surface:     "var(--t-surface,#fff)",
  border:      "var(--t-border,#E8EAFF)",
  accent:      "var(--t-accent,#4361EE)",
  accentLight: "var(--t-accent-light,#EEF2FF)",
  text1:       "var(--t-text1,#0F1729)",
  text2:       "var(--t-text2,#374151)",
  text3:       "var(--t-text3,#9DA8C7)",
};
const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";

// ── Icons ─────────────────────────────────────────────────────────────────────
const PATHS = {
  video:       "M15 10l4.553-2.276A1 1 0 0121 8.72v6.56a1 1 0 01-1.447.9L15 14v-4zm-2-4H4a2 2 0 00-2 2v8a2 2 0 002 2h9a2 2 0 002-2V8a2 2 0 00-2-2z",
  plus:        "M12 5v14M5 12h14",
  trash:       "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:        "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  copy:        "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
  check:       "M20 6L9 17l-5-5",
  send:        "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  eye:         "M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  clock:       "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2",
  star:        "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  user:        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  briefcase:   "M20 7H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  chevD:       "M6 9l6 6 6-6",
  chevR:       "M9 18l6-6-6-6",
  x:           "M18 6L6 18M6 6l12 12",
  grip:        "M9 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 11a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM9 17a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z",
  list:        "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  info:        "M12 16v-4M12 8h.01M22 12A10 10 0 1112 2a10 10 0 0110 10z",
  share:       "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  refresh:     "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  thumbUp:     "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zm-7 11H4.72A2.3 2.3 0 012.4 18l-1-6.3A2 2 0 013.4 9H7v11z",
  thumbDown:   "M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zm7-13h2.67A2.3 2.3 0 0122 3.7l1 6.3a2 2 0 01-2 2H17V2z",
  filter:      "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  play:        "M5 3l14 9-14 9V3z",
};
const Ic = ({ n, s = 16, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={PATHS[n]}/>
  </svg>
);

const Btn = ({ children, onClick, v="secondary", disabled, style, icon }) => {
  const base = { display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8,
    border:"none", cursor:disabled?"not-allowed":"pointer", fontSize:13, fontWeight:600,
    fontFamily:F, transition:"all .15s", opacity:disabled?0.5:1, whiteSpace:"nowrap", ...style };
  const variants = {
    primary:   { background:C.accent,       color:"#fff" },
    secondary: { background:C.accentLight,  color:C.accent, border:`1px solid ${C.border}` },
    ghost:     { background:"transparent",  color:C.text2,  border:`1px solid ${C.border}` },
    danger:    { background:"#FEF2F2",       color:"#DC2626", border:"1px solid #FECACA" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[v] }}>
    {icon && <Ic n={icon} s={14} c={v==="primary"?"#fff":v==="danger"?"#DC2626":C.accent}/>}
    {children}
  </button>;
};

// ── Recommendation badge ───────────────────────────────────────────────────────
const REC_META = {
  strong_yes: { label:"Strong Yes", bg:"#D1FAE5", c:"#065F46" },
  yes:        { label:"Yes",        bg:"#DBEAFE", c:"#1E40AF" },
  consider:   { label:"Consider",   bg:"#FEF3C7", c:"#92400E" },
  no:         { label:"No",         bg:"#FEE2E2", c:"#991B1B" },
};
const RecBadge = ({ r }) => {
  const m = REC_META[r] || { label: r || "Pending", bg:"#F3F4F6", c:"#6B7280" };
  return <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
    background:m.bg, color:m.c, display:"inline-block" }}>{m.label}</span>;
};

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:     { label:"Sent",        bg:"#EFF6FF", c:"#1D4ED8" },
  in_progress: { label:"In Progress", bg:"#FEF3C7", c:"#B45309" },
  completed:   { label:"Completed",   bg:"#D1FAE5", c:"#065F46" },
  expired:     { label:"Expired",     bg:"#F3F4F6", c:"#6B7280" },
};
const StatusBadge = ({ s }) => {
  const m = STATUS_META[s] || STATUS_META.pending;
  return <span style={{ padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700,
    background:m.bg, color:m.c }}>{m.label}</span>;
};

// ── Question type pill ─────────────────────────────────────────────────────────
const Q_TYPES = [
  { value:"behavioral",  label:"Behavioural",   color:"#7C3AED" },
  { value:"technical",   label:"Technical",     color:"#0C8599" },
  { value:"motivational",label:"Motivation",    color:"#2F9E44" },
  { value:"situational", label:"Situational",   color:"#E67700" },
  { value:"culture",     label:"Culture",       color:"#C2255C" },
  { value:"general",     label:"General",       color:"#364FC7" },
];
const QTypeBadge = ({ type }) => {
  const m = Q_TYPES.find(t => t.value === type) || Q_TYPES[5];
  return <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
    background:`${m.color}15`, color:m.color, textTransform:"uppercase", letterSpacing:"0.04em" }}>{m.label}</span>;
};


// ── Template Builder ──────────────────────────────────────────────────────────
const DEFAULT_Q = { id: "", text: "", type: "behavioral", rubric: "", max_score: 10,
  think_time: 30, max_duration: 120, retakes: 1 };

function TemplateModal({ template, envId, onSave, onClose }) {
  const isEdit = !!template?.id;
  const [form, setForm] = useState({
    name:                   template?.name                   || "",
    description:            template?.description            || "",
    job_title:              template?.job_title              || "",
    welcome_message:        template?.welcome_message        || "Thank you for taking the time to complete this video interview. Please answer each question as fully as you can.",
    completion_message:     template?.completion_message     || "Thank you for completing the interview. We will review your responses and be in touch shortly.",
    time_limit_per_question: template?.time_limit_per_question || 120,
    retakes_allowed:        template?.retakes_allowed        ?? 1,
    deadline_hours:         template?.deadline_hours         || 72,
    questions:              template?.questions              || [],
    is_active:              template?.is_active              !== false,
  });
  const [tab, setTab]         = useState("questions");
  const [saving, setSaving]   = useState(false);
  const [editQ, setEditQ]     = useState(null);   // null | index | "new"
  const [draftQ, setDraftQ]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNewQ = () => {
    setDraftQ({ ...DEFAULT_Q, id: `q_${Date.now()}` });
    setEditQ("new");
  };
  const openEditQ = (i) => { setDraftQ({ ...form.questions[i] }); setEditQ(i); };
  const saveQ = () => {
    if (!draftQ?.text.trim()) return;
    const qs = [...form.questions];
    if (editQ === "new") qs.push(draftQ);
    else qs[editQ] = draftQ;
    set("questions", qs);
    setEditQ(null); setDraftQ(null);
  };
  const removeQ = (i) => set("questions", form.questions.filter((_, idx) => idx !== i));
  const moveQ   = (i, dir) => {
    const qs = [...form.questions];
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    set("questions", qs);
  };

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, environment_id: envId };
    const res = isEdit
      ? await api.patch(`/video-interviews/templates/${template.id}`, payload)
      : await api.post("/video-interviews/templates", payload);
    setSaving(false);
    if (!res.error) onSave(res);
  };

  const inp = { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1px solid ${C.border}`,
    borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface };
  const label = { fontSize:12, fontWeight:700, color:C.text2, marginBottom:4, display:"block" };

  const TABS = ["questions","settings","messages"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:760, maxHeight:"92vh", display:"flex",
        flexDirection:"column", background:C.surface, borderRadius:16, overflow:"hidden",
        boxShadow:"0 24px 64px rgba(0,0,0,.18)" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:C.text1 }}>
              {isEdit ? "Edit Template" : "New Video Interview Template"}
            </div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>
              Build a set of recorded questions candidates answer in their own time
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
            <Ic n="x" s={18} c={C.text3}/>
          </button>
        </div>

        {/* Name row */}
        <div style={{ padding:"14px 24px 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label style={label}>Template name *</label>
            <input value={form.name} onChange={e=>set("name",e.target.value)}
              placeholder="e.g. Senior Engineer Screen" style={inp} autoFocus/>
          </div>
          <div>
            <label style={label}>Job title (context for AI scoring)</label>
            <input value={form.job_title} onChange={e=>set("job_title",e.target.value)}
              placeholder="e.g. Senior Software Engineer" style={inp}/>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:4, padding:"12px 24px 0", borderBottom:`1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 14px",
              borderRadius:"8px 8px 0 0", border:"none", cursor:"pointer", fontFamily:F,
              fontSize:13, fontWeight:600, background:tab===t ? C.accentLight : "transparent",
              color:tab===t ? C.accent : C.text3, borderBottom:tab===t?`2px solid ${C.accent}`:"2px solid transparent" }}>
              {t === "questions" ? `Questions (${form.questions.length})` : t === "settings" ? "Settings" : "Messages"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 24px" }}>

          {/* ── Questions tab ── */}
          {tab === "questions" && (
            <div>
              {form.questions.length === 0 && (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.text3 }}>
                  <Ic n="video" s={32} c={C.text3} style={{ marginBottom:10, display:"block", margin:"0 auto 10px" }}/>
                  <div style={{ fontSize:14, fontWeight:600 }}>No questions yet</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Add your first recorded question below</div>
                </div>
              )}
              {form.questions.map((q, i) => (
                <div key={q.id || i} style={{ padding:"12px 14px", marginBottom:8, borderRadius:10,
                  border:`1px solid ${C.border}`, background:"#FAFBFF", display:"flex",
                  alignItems:"flex-start", gap:10 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:2, padding:"2px 0" }}>
                    <button onClick={() => moveQ(i,-1)} disabled={i===0}
                      style={{ background:"none", border:"none", cursor:i===0?"default":"pointer", padding:2, opacity:i===0?0.3:1 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2}><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button onClick={() => moveQ(i,1)} disabled={i===form.questions.length-1}
                      style={{ background:"none", border:"none", cursor:i===form.questions.length-1?"default":"pointer", padding:2, opacity:i===form.questions.length-1?0.3:1 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                  <div style={{ width:24, height:24, borderRadius:6, background:C.accentLight,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:11, fontWeight:800, color:C.accent, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text1, lineHeight:1.4, marginBottom:4 }}>{q.text}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      <QTypeBadge type={q.type}/>
                      <span style={{ fontSize:11, color:C.text3 }}>{q.max_duration}s max</span>
                      <span style={{ fontSize:11, color:C.text3 }}>{q.retakes ?? 1} retake{q.retakes !== 1 ? "s" : ""}</span>
                      <span style={{ fontSize:11, color:C.text3 }}>Score: {q.max_score || 10}</span>
                    </div>
                    {q.rubric && <div style={{ fontSize:11, color:C.text3, marginTop:4, fontStyle:"italic" }}>Rubric: {q.rubric}</div>}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => openEditQ(i)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                      <Ic n="edit" s={14} c={C.text3}/>
                    </button>
                    <button onClick={() => removeQ(i)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                      <Ic n="trash" s={14} c="#EF4444"/>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={openNewQ} style={{ width:"100%", padding:"10px", borderRadius:10,
                border:`2px dashed ${C.border}`, background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                color:C.accent, fontSize:13, fontWeight:600, fontFamily:F, marginTop:4 }}>
                <Ic n="plus" s={15} c={C.accent}/> Add question
              </button>
            </div>
          )}

          {/* ── Settings tab ── */}
          {tab === "settings" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={label}>Time per question (seconds)</label>
                <input type="number" min={30} max={300} step={10}
                  value={form.time_limit_per_question}
                  onChange={e => set("time_limit_per_question", Number(e.target.value))} style={inp}/>
              </div>
              <div>
                <label style={label}>Retakes allowed per question</label>
                <select value={form.retakes_allowed} onChange={e => set("retakes_allowed", Number(e.target.value))} style={{ ...inp, background:"white" }}>
                  {[0,1,2,3].map(n => <option key={n} value={n}>{n === 0 ? "No retakes" : `${n} retake${n>1?"s":""}`}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Deadline (hours after sending)</label>
                <select value={form.deadline_hours} onChange={e => set("deadline_hours", Number(e.target.value))} style={{ ...inp, background:"white" }}>
                  {[24,48,72,96,120,168].map(h => <option key={h} value={h}>{h}h ({h/24} day{h/24>1?"s":""})</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Status</label>
                <select value={form.is_active ? "active" : "inactive"} onChange={e => set("is_active", e.target.value === "active")} style={{ ...inp, background:"white" }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={label}>Description (internal)</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={2} style={{ ...inp, resize:"vertical" }} placeholder="When to use this template, what it assesses…"/>
              </div>
            </div>
          )}

          {/* ── Messages tab ── */}
          {tab === "messages" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={label}>Welcome message (shown before candidate starts)</label>
                <textarea value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)}
                  rows={4} style={{ ...inp, resize:"vertical" }}/>
              </div>
              <div>
                <label style={label}>Completion message (shown after last question)</label>
                <textarea value={form.completion_message} onChange={e => set("completion_message", e.target.value)}
                  rows={4} style={{ ...inp, resize:"vertical" }}/>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" onClick={handle} disabled={saving || !form.name.trim()} icon="video">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </Btn>
        </div>
      </div>

      {/* Question editor sub-modal */}
      {editQ !== null && draftQ && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:910,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"100%", maxWidth:560, background:C.surface, borderRadius:14,
            padding:24, boxShadow:"0 16px 48px rgba(0,0,0,.18)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text1, marginBottom:16 }}>
              {editQ === "new" ? "Add question" : "Edit question"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={label}>Question text *</label>
                <textarea value={draftQ.text} onChange={e => setDraftQ(d => ({ ...d, text: e.target.value }))}
                  rows={3} style={{ ...inp, resize:"vertical" }} placeholder="Tell me about a time you had to…"/>
              </div>
              <div>
                <label style={label}>Question type</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {Q_TYPES.map(t => (
                    <button key={t.value} onClick={() => setDraftQ(d => ({ ...d, type: t.value }))}
                      style={{ padding:"5px 12px", borderRadius:99, border:`2px solid ${draftQ.type===t.value?t.color:C.border}`,
                        background:draftQ.type===t.value?`${t.color}12`:"transparent",
                        color:draftQ.type===t.value?t.color:C.text2,
                        fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Rubric / scoring guidance (for AI evaluator)</label>
                <textarea value={draftQ.rubric} onChange={e => setDraftQ(d => ({ ...d, rubric: e.target.value }))}
                  rows={2} style={{ ...inp, resize:"vertical" }}
                  placeholder="e.g. Good answer demonstrates STAR method, specific metrics, leadership…"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
                <div>
                  <label style={label}>Max score</label>
                  <input type="number" min={1} max={100} value={draftQ.max_score || 10}
                    onChange={e => setDraftQ(d => ({ ...d, max_score: Number(e.target.value) }))} style={inp}/>
                </div>
                <div>
                  <label style={label}>Think time (s)</label>
                  <input type="number" min={0} max={120} step={10} value={draftQ.think_time || 30}
                    onChange={e => setDraftQ(d => ({ ...d, think_time: Number(e.target.value) }))} style={inp}/>
                </div>
                <div>
                  <label style={label}>Max length (s)</label>
                  <input type="number" min={30} max={300} step={10} value={draftQ.max_duration || 120}
                    onChange={e => setDraftQ(d => ({ ...d, max_duration: Number(e.target.value) }))} style={inp}/>
                </div>
                <div>
                  <label style={label}>Retakes</label>
                  <select value={draftQ.retakes ?? 1} onChange={e => setDraftQ(d => ({ ...d, retakes: Number(e.target.value) }))}
                    style={{ ...inp, background:"white" }}>
                    {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:18 }}>
              <Btn v="ghost" onClick={() => { setEditQ(null); setDraftQ(null); }}>Cancel</Btn>
              <Btn v="primary" onClick={saveQ} disabled={!draftQ.text.trim()}>Save question</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Send Interview Modal ───────────────────────────────────────────────────────
function SendModal({ template, envId, onSent, onClose, preCandidate }) {
  const [form, setForm] = useState({
    candidate_name:  preCandidate?.name  || "",
    candidate_email: preCandidate?.email || "",
    candidate_id:    preCandidate?.id    || null,
    job_name:        "",
    job_id:          null,
  });
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { width:"100%", boxSizing:"border-box", padding:"9px 12px",
    border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F,
    outline:"none", color:C.text1, background:C.surface };

  const handle = async () => {
    if (!form.candidate_name.trim()) return;
    setSending(true);
    const res = await api.post("/video-interviews/sessions", {
      template_id:     template.id,
      environment_id:  envId,
      candidate_id:    form.candidate_id,
      candidate_name:  form.candidate_name,
      candidate_email: form.candidate_email,
      job_id:          form.job_id,
      job_name:        form.job_name,
    });
    setSending(false);
    if (!res.error) { setSent(res); onSent?.(res); }
  };

  const appUrl = window.location.origin;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:480, background:C.surface, borderRadius:14,
        padding:24, boxShadow:"0 16px 48px rgba(0,0,0,.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>Send interview</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{template.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}>
            <Ic n="x" s={18} c={C.text3}/>
          </button>
        </div>

        {!sent ? (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.text2, marginBottom:4, display:"block" }}>
                  Candidate name *
                </label>
                <input value={form.candidate_name} onChange={e => set("candidate_name", e.target.value)}
                  placeholder="Full name" style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.text2, marginBottom:4, display:"block" }}>
                  Candidate email (for the invitation link)
                </label>
                <input type="email" value={form.candidate_email} onChange={e => set("candidate_email", e.target.value)}
                  placeholder="candidate@email.com" style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.text2, marginBottom:4, display:"block" }}>
                  Role / job (optional context)
                </label>
                <input value={form.job_name} onChange={e => set("job_name", e.target.value)}
                  placeholder="e.g. Senior Engineer" style={inp}/>
              </div>
              <div style={{ padding:"10px 12px", borderRadius:8, background:C.accentLight,
                border:`1px solid ${C.border}`, fontSize:12, color:C.text2, lineHeight:1.6 }}>
                <strong>Deadline:</strong> {template.deadline_hours}h · <strong>Questions:</strong> {template.questions?.length || 0} · <strong>Retakes:</strong> {template.retakes_allowed} per question
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:18 }}>
              <Btn v="ghost" onClick={onClose}>Cancel</Btn>
              <Btn v="primary" onClick={handle} disabled={sending || !form.candidate_name.trim()} icon="send">
                {sending ? "Creating…" : "Create interview link"}
              </Btn>
            </div>
          </>
        ) : (
          <div>
            <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"#D1FAE5",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <Ic n="check" s={22} c="#065F46"/>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:C.text1 }}>Interview link created</div>
              <div style={{ fontSize:13, color:C.text3, marginTop:4 }}>Share this link with the candidate</div>
            </div>
            <div style={{ background:"#F8FAFF", borderRadius:10, padding:"12px 14px",
              border:`1px solid ${C.border}`, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Interview URL</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, fontSize:12, color:C.accent, wordBreak:"break-all", fontFamily:"monospace" }}>
                  {appUrl}/video-interview/{sent.token}
                </div>
                <button onClick={() => navigator.clipboard.writeText(`${appUrl}/video-interview/${sent.token}`)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0 }}>
                  <Ic n="copy" s={16} c={C.accent}/>
                </button>
              </div>
            </div>
            <Btn v="primary" onClick={onClose} style={{ width:"100%", justifyContent:"center" }}>Done</Btn>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Review Panel — full session view with video player ────────────────────────
function ReviewPanel({ sessionId, onClose }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeQ, setActiveQ] = useState(0);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await api.get(`/video-interviews/sessions/${sessionId}`);
    setSession(s);
    setDecision(s.reviewer_decision || "");
    setNotes(s.reviewer_notes || "");
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const saveReview = async () => {
    setSaving(true);
    await api.patch(`/video-interviews/sessions/${sessionId}`, { reviewer_decision: decision, reviewer_notes: notes });
    setSaving(false);
  };

  // Load video blob into video element
  const loadVideo = useCallback((qi) => {
    if (!videoRef.current || !session) return;
    const resp = session.responses?.find(r => r.question_index === qi);
    if (resp?.video_blob) {
      const bytes = Uint8Array.from(atob(resp.video_blob), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: "video/webm" });
      videoRef.current.src = URL.createObjectURL(blob);
    } else {
      videoRef.current.src = "";
    }
  }, [session]);

  useEffect(() => { if (session) loadVideo(activeQ); }, [activeQ, session, loadVideo]);

  if (loading) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#fff", fontSize:14 }}>Loading responses…</div>
    </div>
  );
  if (!session) return null;

  const template = session.template_snapshot || {};
  const questions = template.questions || [];
  const responses = session.responses   || [];
  const qResp = (qi) => responses.find(r => r.question_index === qi);
  const totalScore   = responses.reduce((s, r) => s + (r.score || 0), 0);
  const totalPossible = questions.reduce((s, q) => s + (q.max_score || 10), 0);
  const pct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;

  const scoreColor = pct === null ? C.text3 : pct >= 70 ? "#065F46" : pct >= 50 ? "#92400E" : "#991B1B";
  const scoreBg    = pct === null ? "#F3F4F6" : pct >= 70 ? "#D1FAE5"  : pct >= 50 ? "#FEF3C7"  : "#FEE2E2";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:900,
      display:"flex", alignItems:"stretch" }}>
      <div style={{ width:"100%", maxWidth:1100, margin:"0 auto", display:"flex",
        background:C.surface, overflow:"hidden" }}>

        {/* Left — question list */}
        <div style={{ width:280, flexShrink:0, borderRight:`1px solid ${C.border}`,
          display:"flex", flexDirection:"column", background:"#FAFBFF" }}>
          <div style={{ padding:"18px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text1 }}>{session.candidate_name}</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{session.job_name || template.job_title || "No role"}</div>
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              <StatusBadge s={session.status}/>
              {session.ai_recommendation && <RecBadge r={session.ai_recommendation}/>}
            </div>
            {pct !== null && (
              <div style={{ marginTop:10, padding:"6px 10px", borderRadius:8, background:scoreBg,
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, fontWeight:700, color:scoreColor }}>AI Score</span>
                <span style={{ fontSize:18, fontWeight:800, color:scoreColor }}>{pct}%</span>
              </div>
            )}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:8 }}>
            {questions.map((q, i) => {
              const resp = qResp(i);
              const hasVideo = !!resp?.video_blob;
              const score    = resp?.score;
              return (
                <button key={i} onClick={() => setActiveQ(i)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"none",
                    cursor:"pointer", fontFamily:F, textAlign:"left", marginBottom:4,
                    background: activeQ===i ? C.accentLight : "transparent",
                    borderLeft: activeQ===i ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:activeQ===i?C.accent:C.text3 }}>Q{i+1}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      {hasVideo && <Ic n="video" s={11} c="#0C8599"/>}
                      {score !== null && score !== undefined && (
                        <span style={{ fontSize:10, fontWeight:700, color:score >= (q.max_score||10)*0.7 ? "#065F46" : "#B45309" }}>
                          {score}/{q.max_score||10}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:activeQ===i?C.text1:C.text2,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {q.text}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Reviewer decision */}
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:6 }}>Your decision</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 }}>
              {["strong_yes","yes","consider","no"].map(d => {
                const m = REC_META[d];
                return (
                  <button key={d} onClick={() => setDecision(d === decision ? "" : d)}
                    style={{ padding:"5px 4px", borderRadius:6, border:`2px solid ${decision===d?m.c:C.border}`,
                      background:decision===d?m.bg:"transparent",
                      color:decision===d?m.c:C.text3, fontSize:10, fontWeight:700,
                      cursor:"pointer", fontFamily:F }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Add notes…"
              style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px",
                border:`1px solid ${C.border}`, borderRadius:8, fontSize:12,
                fontFamily:F, resize:"none", outline:"none", color:C.text1, marginBottom:6 }}/>
            <Btn v="primary" onClick={saveReview} disabled={saving} style={{ width:"100%", justifyContent:"center" }}>
              {saving ? "Saving…" : "Save decision"}
            </Btn>
          </div>
        </div>

        {/* Right — video + AI analysis */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Top bar */}
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>
              Q{activeQ+1} of {questions.length} — {questions[activeQ]?.text?.slice(0,60)}{questions[activeQ]?.text?.length > 60 ? "…" : ""}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <Ic n="x" s={18} c={C.text3}/>
            </button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:16 }}>
            {/* Video player */}
            <div style={{ background:"#0F1729", borderRadius:12, overflow:"hidden",
              aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {qResp(activeQ)?.video_blob ? (
                <video ref={videoRef} controls style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
              ) : (
                <div style={{ textAlign:"center", color:"rgba(255,255,255,.4)" }}>
                  <Ic n="video" s={32} c="rgba(255,255,255,.3)" style={{ display:"block", margin:"0 auto 8px" }}/>
                  <div style={{ fontSize:13 }}>No recording for this question</div>
                </div>
              )}
            </div>

            {/* Question details */}
            <div style={{ padding:"12px 14px", borderRadius:10, background:"#F8FAFF", border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <QTypeBadge type={questions[activeQ]?.type}/>
                {questions[activeQ]?.rubric && (
                  <span style={{ fontSize:11, color:C.text3 }}>Rubric provided</span>
                )}
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:C.text1, lineHeight:1.5 }}>
                {questions[activeQ]?.text}
              </div>
              {questions[activeQ]?.rubric && (
                <div style={{ fontSize:12, color:C.text3, marginTop:8, fontStyle:"italic", paddingTop:8,
                  borderTop:`1px solid ${C.border}` }}>
                  Scoring guidance: {questions[activeQ].rubric}
                </div>
              )}
            </div>

            {/* AI scoring for this question */}
            {qResp(activeQ) && (
              <div>
                {qResp(activeQ).transcript && (
                  <div style={{ padding:"12px 14px", borderRadius:10, background:"#F8FAFF",
                    border:`1px solid ${C.border}`, marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:6,
                      textTransform:"uppercase", letterSpacing:"0.05em" }}>Transcript</div>
                    <div style={{ fontSize:13, color:C.text1, lineHeight:1.6 }}>
                      "{qResp(activeQ).transcript}"
                    </div>
                  </div>
                )}
                {qResp(activeQ).score !== null && qResp(activeQ).score !== undefined && (
                  <div style={{ padding:"12px 14px", borderRadius:10,
                    background: qResp(activeQ).score >= (questions[activeQ]?.max_score||10)*0.7 ? "#F0FDF4" : "#FFF7ED",
                    border: `1px solid ${qResp(activeQ).score >= (questions[activeQ]?.max_score||10)*0.7 ? "#BBF7D0" : "#FED7AA"}` }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.text2 }}>AI Score</span>
                      <span style={{ fontSize:18, fontWeight:800,
                        color: qResp(activeQ).score >= (questions[activeQ]?.max_score||10)*0.7 ? "#065F46" : "#92400E" }}>
                        {qResp(activeQ).score} / {questions[activeQ]?.max_score || 10}
                      </span>
                    </div>
                    {qResp(activeQ).feedback && (
                      <div style={{ fontSize:13, color:C.text1, lineHeight:1.5, marginBottom:8 }}>
                        {qResp(activeQ).feedback}
                      </div>
                    )}
                    {qResp(activeQ).strengths?.length > 0 && (
                      <div style={{ marginTop:6 }}>
                        {qResp(activeQ).strengths.map((s,i) => (
                          <div key={i} style={{ fontSize:12, color:"#065F46", display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
                            <Ic n="check" s={11} c="#065F46"/> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {qResp(activeQ).improvements?.length > 0 && (
                      <div style={{ marginTop:4 }}>
                        {qResp(activeQ).improvements.map((s,i) => (
                          <div key={i} style={{ fontSize:12, color:"#92400E", display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
                            <Ic n="info" s={11} c="#92400E"/> {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI overall summary (shown on last question) */}
            {session.ai_summary && activeQ === questions.length - 1 && (
              <div style={{ padding:"14px 16px", borderRadius:10, background:"#EEF2FF",
                border:`1px solid #C7D2FE` }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:8,
                  textTransform:"uppercase", letterSpacing:"0.05em" }}>Overall AI Summary</div>
                {session.ai_headline && (
                  <div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:6 }}>{session.ai_headline}</div>
                )}
                <div style={{ fontSize:13, color:C.text1, lineHeight:1.6, marginBottom:10 }}>{session.ai_summary}</div>
                {session.ai_top_strengths?.length > 0 && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:4 }}>Top strengths</div>
                    {session.ai_top_strengths.map((s,i) => (
                      <div key={i} style={{ fontSize:12, color:"#065F46", display:"flex", gap:6, marginBottom:2 }}>
                        <Ic n="check" s={11} c="#065F46"/> {s}
                      </div>
                    ))}
                  </div>
                )}
                {session.ai_areas_to_probe?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:4 }}>Areas to probe in next interview</div>
                    {session.ai_areas_to_probe.map((s,i) => (
                      <div key={i} style={{ fontSize:12, color:C.text2, display:"flex", gap:6, marginBottom:2 }}>
                        <Ic n="chevR" s={11} c={C.text3}/> {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div style={{ padding:"10px 20px", borderTop:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between" }}>
            <Btn v="ghost" onClick={() => setActiveQ(i => Math.max(0,i-1))} disabled={activeQ===0}>
              ← Previous
            </Btn>
            <span style={{ fontSize:12, color:C.text3, alignSelf:"center" }}>
              {activeQ+1} / {questions.length}
            </span>
            <Btn v="ghost" onClick={() => setActiveQ(i => Math.min(questions.length-1,i+1))} disabled={activeQ===questions.length-1}>
              Next →
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main VideoInterviews page ─────────────────────────────────────────────────
export default function VideoInterviews({ environment }) {
  const envId = environment?.id;
  const [view, setView]         = useState("sessions");   // "sessions" | "templates"
  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showTpl, setShowTpl]     = useState(false);      // new/edit template modal
  const [editTpl, setEditTpl]     = useState(null);       // template being edited
  const [sendTpl, setSendTpl]     = useState(null);       // template to send
  const [reviewId, setReviewId]   = useState(null);       // session to review
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    const [tpls, sess] = await Promise.all([
      api.get(`/video-interviews/templates?environment_id=${envId}`),
      api.get(`/video-interviews/sessions?environment_id=${envId}`),
    ]);
    setTemplates(Array.isArray(tpls) ? tpls : []);
    setSessions(Array.isArray(sess) ? sess : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total    = sessions.length;
  const pending  = sessions.filter(s => s.status === "pending").length;
  const completed = sessions.filter(s => s.status === "completed").length;
  const avgScore = (() => {
    const scored = sessions.filter(s => s.ai_total_score !== undefined && s.ai_max_score > 0);
    if (!scored.length) return null;
    const avg = scored.reduce((sum,s) => sum + Math.round((s.ai_total_score/s.ai_max_score)*100),0) / scored.length;
    return Math.round(avg);
  })();

  const filteredSessions = sessions.filter(s => {
    const matchSearch = !search || s.candidate_name?.toLowerCase().includes(search.toLowerCase())
      || s.job_name?.toLowerCase().includes(search.toLowerCase())
      || (s.template_snapshot?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:F }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"18px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text1, display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="video" s={20} c={C.accent}/> Video Interviews
          </div>
          <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>
            Async on-demand video screening — candidates record responses in their own time
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn v="ghost" onClick={load} icon="refresh">Refresh</Btn>
          <Btn v="secondary" onClick={() => { setEditTpl(null); setShowTpl(true); }} icon="plus">
            New template
          </Btn>
          {templates.length > 0 && (
            <Btn v="primary" onClick={() => setSendTpl(templates[0])} icon="send">
              Send interview
            </Btn>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, padding:"20px 28px 0" }}>
        {[
          { label:"Total sent",  value:total,     icon:"send",     color:C.accent },
          { label:"Awaiting",    value:pending,   icon:"clock",    color:"#D97706" },
          { label:"Completed",   value:completed, icon:"check",    color:"#059669" },
          { label:"Avg AI score",value:avgScore !== null ? `${avgScore}%` : "—", icon:"star", color:"#7C3AED" },
        ].map(s => (
          <div key={s.label} style={{ background:C.surface, borderRadius:12, padding:"14px 16px",
            border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
              <div style={{ width:28, height:28, borderRadius:8, background:`${s.color}15`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ic n={s.icon} s={14} c={s.color}/>
              </div>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar + filters */}
      <div style={{ padding:"16px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:4 }}>
          {[["sessions","Responses"],["templates","Templates"]].map(([id,label]) => (
            <button key={id} onClick={() => setView(id)}
              style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer",
                fontFamily:F, fontSize:13, fontWeight:600,
                background: view===id ? C.accentLight : "transparent",
                color: view===id ? C.accent : C.text3 }}>
              {label}
            </button>
          ))}
        </div>
        {view === "sessions" && (
          <div style={{ display:"flex", gap:8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate, role…"
              style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8,
                fontSize:13, fontFamily:F, outline:"none", width:220, color:C.text1 }}/>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8,
                fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface }}>
              <option value="all">All statuses</option>
              <option value="pending">Sent</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:"16px 28px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:C.text3 }}>Loading…</div>
        ) : view === "templates" ? (
          /* ── Templates grid ── */
          <div>
            {templates.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:C.text3 }}>
                <Ic n="video" s={40} c={C.text3} style={{ display:"block", margin:"0 auto 12px" }}/>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No templates yet</div>
                <div style={{ fontSize:13, marginBottom:20 }}>Create a template to define your questions and scoring rubric</div>
                <Btn v="primary" onClick={() => { setEditTpl(null); setShowTpl(true); }} icon="plus">
                  Create first template
                </Btn>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
                {templates.map(t => {
                  const sentCount = sessions.filter(s => s.template_id === t.id).length;
                  return (
                    <div key={t.id} style={{ background:C.surface, borderRadius:14,
                      border:`1px solid ${C.border}`, overflow:"hidden",
                      boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
                      <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{t.name}</div>
                          <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
                            background: t.is_active ? "#D1FAE5" : "#F3F4F6",
                            color: t.is_active ? "#065F46" : "#6B7280" }}>
                            {t.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {t.job_title && <div style={{ fontSize:11, color:C.text3 }}>{t.job_title}</div>}
                        {t.description && (
                          <div style={{ fontSize:12, color:C.text2, marginTop:6, lineHeight:1.5 }}>
                            {t.description.slice(0,100)}{t.description.length>100?"…":""}
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"10px 16px", display:"flex", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:11, color:C.text3 }}>{t.questions?.length || 0} questions</span>
                        <span style={{ fontSize:11, color:C.text3 }}>{t.deadline_hours}h deadline</span>
                        <span style={{ fontSize:11, color:C.text3 }}>{t.retakes_allowed} retake{t.retakes_allowed!==1?"s":""}</span>
                        <span style={{ fontSize:11, color:C.text3 }}>{sentCount} sent</span>
                      </div>
                      <div style={{ padding:"0 16px 14px", display:"flex", gap:6 }}>
                        <Btn v="primary" onClick={() => setSendTpl(t)} icon="send" style={{ flex:1, justifyContent:"center" }}>
                          Send
                        </Btn>
                        <Btn v="ghost" onClick={() => { setEditTpl(t); setShowTpl(true); }} icon="edit">Edit</Btn>
                        <Btn v="danger" onClick={async () => {
                          if (!confirm("Delete this template?")) return;
                          await api.delete(`/video-interviews/templates/${t.id}`);
                          load();
                        }} icon="trash"/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Sessions table ── */
          <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            {filteredSessions.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.text3 }}>
                {sessions.length === 0 ? (
                  <>
                    <Ic n="send" s={36} c={C.text3} style={{ display:"block", margin:"0 auto 10px" }}/>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No interviews sent yet</div>
                    <div style={{ fontSize:13 }}>Create a template, then send it to candidates</div>
                  </>
                ) : (
                  <div style={{ fontSize:14 }}>No results match your search</div>
                )}
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, background:"#FAFBFF" }}>
                    {["Candidate","Template / Role","Sent","Deadline","Status","AI Score","Decision",""].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                        fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.05em",
                        whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(s => {
                    const pct = s.ai_max_score > 0 ? Math.round((s.ai_total_score/s.ai_max_score)*100) : null;
                    const expired = s.deadline && new Date() > new Date(s.deadline) && s.status !== "completed";
                    return (
                      <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background="#F8FAFF"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"11px 14px" }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{s.candidate_name}</div>
                          {s.candidate_email && <div style={{ fontSize:11, color:C.text3 }}>{s.candidate_email}</div>}
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          <div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>
                            {s.template_snapshot?.name || "—"}
                          </div>
                          {s.job_name && <div style={{ fontSize:11, color:C.text3 }}>{s.job_name}</div>}
                        </td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:C.text2, whiteSpace:"nowrap" }}>
                          {formatDate(s.sent_at)}
                        </td>
                        <td style={{ padding:"11px 14px", fontSize:12, whiteSpace:"nowrap",
                          color: expired ? "#DC2626" : C.text2 }}>
                          {formatDate(s.deadline)}
                          {expired && <div style={{ fontSize:10, color:"#DC2626", fontWeight:700 }}>Expired</div>}
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          <StatusBadge s={expired && s.status !== "completed" ? "expired" : s.status}/>
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          {pct !== null ? (
                            <span style={{ fontSize:13, fontWeight:800,
                              color: pct>=70?"#065F46":pct>=50?"#92400E":"#991B1B" }}>
                              {pct}%
                            </span>
                          ) : <span style={{ fontSize:12, color:C.text3 }}>—</span>}
                          {s.ai_recommendation && <div style={{ marginTop:3 }}><RecBadge r={s.ai_recommendation}/></div>}
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          {s.reviewer_decision
                            ? <RecBadge r={s.reviewer_decision}/>
                            : <span style={{ fontSize:12, color:C.text3 }}>Pending review</span>}
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          {s.status === "completed" && (
                            <Btn v="primary" onClick={() => setReviewId(s.id)} icon="eye">Review</Btn>
                          )}
                          {(s.status === "pending" || s.status === "in_progress") && (
                            <div style={{ display:"flex", gap:4 }}>
                              <button title="Copy interview link"
                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/video-interview/${s.token}`)}
                                style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                                <Ic n="copy" s={15} c={C.text3}/>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTpl && (
        <TemplateModal template={editTpl} envId={envId}
          onSave={() => { setShowTpl(false); load(); }}
          onClose={() => setShowTpl(false)}/>
      )}
      {sendTpl && (
        <SendModal template={sendTpl} envId={envId}
          onSent={() => load()}
          onClose={() => setSendTpl(null)}/>
      )}
      {reviewId && (
        <ReviewPanel sessionId={reviewId}
          onClose={() => { setReviewId(null); load(); }}/>
      )}
    </div>
  );
}

