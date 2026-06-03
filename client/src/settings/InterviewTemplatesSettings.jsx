// client/src/settings/InterviewTemplatesSettings.jsx
// Unified interview template builder — covers all interview formats:
// Live Video, Phone, In-Person, Panel, Async Video (recorded), AI Bot
// Questions sourced from the Question Library (question_bank_v2)
// Used by Interview Plans (per-job stage sequences) and Video Interview sessions

import { useState, useEffect, useCallback } from "react";
import api from "../apiClient.js";

const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";
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

// ── Icons ─────────────────────────────────────────────────────────────────────
const PATHS = {
  plus:    "M12 5v14M5 12h14",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  x:       "M18 6L6 18M6 6l12 12",
  check:   "M20 6L9 17l-5-5",
  video:   "M15 10l4.553-2.276A1 1 0 0121 8.72v6.56a1 1 0 01-1.447.9L15 14v-4zm-2-4H4a2 2 0 00-2 2v8a2 2 0 002 2h9a2 2 0 002-2V8a2 2 0 00-2-2z",
  phone:   "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  building:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  bot:     "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 013 3v1a2 2 0 012 2v3a2 2 0 01-2 2v1a3 3 0 01-3 3H8a3 3 0 01-3-3v-1a2 2 0 01-2-2v-3a2 2 0 012-2v-1a3 3 0 013-3h3V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM9 14a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z",
  chevD:   "M6 9l6 6 6-6",
  search:  "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  list:    "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  copy:    "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || PATHS.plus}/>
  </svg>
);

const Btn = ({ children, onClick, v="secondary", disabled, icon, style }) => {
  const base = { display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8,
    border:"none", cursor:disabled?"not-allowed":"pointer", fontSize:13, fontWeight:600,
    fontFamily:F, opacity:disabled?0.5:1, whiteSpace:"nowrap", ...style };
  const vs = {
    primary:   { background:C.accent,      color:"#fff" },
    secondary: { background:C.accentLight, color:C.accent, border:`1px solid ${C.border}` },
    ghost:     { background:"transparent", color:C.text2, border:`1px solid ${C.border}` },
    danger:    { background:"#FEF2F2",     color:"#DC2626", border:"1px solid #FECACA" },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{...base,...vs[v]}}>
      {icon && <Ic n={icon} s={14} c={v==="primary"?"#fff":v==="danger"?"#DC2626":C.accent}/>}
      {children}
    </button>
  );
};

// ── Format definitions ─────────────────────────────────────────────────────────
const FORMATS = [
  { id:"video",       label:"Live Video",    icon:"video",    color:"#4361EE", desc:"Video call with interviewers" },
  { id:"phone",       label:"Phone",         icon:"phone",    color:"#0C8599", desc:"Phone screening call" },
  { id:"onsite",      label:"In-Person",     icon:"building", color:"#2F9E44", desc:"Face-to-face interview" },
  { id:"panel",       label:"Panel",         icon:"users",    color:"#7C3AED", desc:"Multiple interviewers" },
  { id:"async_video", label:"Async Video",   icon:"video",    color:"#E67700", desc:"Candidate records responses" },
  { id:"ai_bot",      label:"AI Screening",  icon:"bot",      color:"#C2255C", desc:"Conversational AI interview" },
];

// ── Question type colours ──────────────────────────────────────────────────────
const Q_TYPE_COLOR = {
  knockout:   "#DC2626",
  competency: "#2563EB",
  technical:  "#7C3AED",
  culture:    "#059669",
  general:    "#6B7280",
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function InterviewTemplatesSettings({ environment }) {
  const envId = environment?.id;
  const [templates, setTemplates] = useState([]);
  const [questions, setQuestions] = useState([]);  // from question_bank_v2
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);  // null | template object | "new"
  const [search, setSearch]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [tpls, qs] = await Promise.all([
      api.get(`/interview-types?environment_id=${envId}`),
      api.get(`/question-bank/questions`).catch(() => []),
    ]);
    setTemplates(Array.isArray(tpls) ? tpls : []);
    setQuestions(Array.isArray(qs) ? qs : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { if (envId) load(); }, [load, envId]);

  const handleSave = async (data) => {
    if (data.id) {
      await api.patch(`/interview-types/${data.id}`, data);
    } else {
      await api.post("/interview-types", { ...data, environment_id: envId });
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await api.delete(`/interview-types/${id}`);
    load();
  };

  const filtered = templates.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatMeta = (id) => FORMATS.find(f => f.id === id) || FORMATS[0];

  return (
    <div style={{ padding:"24px 28px", fontFamily:F, maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text1 }}>Interview Templates</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.text3 }}>
            Define reusable interview templates for every stage of your hiring process.
            Templates are used in Interview Plans and triggered from candidate records.
          </p>
        </div>
        <Btn v="primary" icon="plus" onClick={() => setEditing("new")}>New template</Btn>
      </div>

      {/* Format guide */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:24 }}>
        {FORMATS.map(f => (
          <div key={f.id} style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`,
            background:C.surface, display:"flex", flexDirection:"column", alignItems:"center", gap:6, textAlign:"center" }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`${f.color}15`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n={f.icon} s={15} c={f.color}/>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text1 }}>{f.label}</div>
            <div style={{ fontSize:10, color:C.text3, lineHeight:1.3 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:16 }}>
        <Ic n="search" s={14} c={C.text3} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search templates…"
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 32px",
            border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F,
            outline:"none", color:C.text1, background:C.surface }}/>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:C.text3 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:C.text3 }}>
          <Ic n="list" s={40} c={C.text3} style={{ display:"block", margin:"0 auto 12px" }}/>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>
            {search ? "No templates match your search" : "No interview templates yet"}
          </div>
          {!search && (
            <div style={{ fontSize:13, marginBottom:20 }}>
              Create templates for each type of interview in your hiring process
            </div>
          )}
          {!search && <Btn v="primary" icon="plus" onClick={() => setEditing("new")}>Create first template</Btn>}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
          {filtered.map(t => {
            const fmt = formatMeta(t.interview_format || t.format);
            const qCount = (t.question_ids || []).length;
            return (
              <div key={t.id} style={{ background:C.surface, borderRadius:14,
                border:`1px solid ${C.border}`, overflow:"hidden",
                boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
                <div style={{ height:3, background:fmt.color }}/>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${fmt.color}15`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ic n={fmt.icon} s={15} c={fmt.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text1,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.name}</div>
                      <div style={{ fontSize:11, color:fmt.color, fontWeight:600 }}>{fmt.label}</div>
                    </div>
                    <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
                      background: t.is_active !== false ? "#D1FAE5" : "#F3F4F6",
                      color: t.is_active !== false ? "#065F46" : "#6B7280" }}>
                      {t.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {t.description && (
                    <div style={{ fontSize:12, color:C.text2, lineHeight:1.5, marginBottom:10 }}>
                      {t.description.slice(0,100)}{t.description.length>100?"…":""}
                    </div>
                  )}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    <span style={{ fontSize:11, color:C.text3 }}>⏱ {t.duration || 30} min</span>
                    {qCount > 0 && <span style={{ fontSize:11, color:C.text3 }}>❓ {qCount} question{qCount!==1?"s":""}</span>}
                    {t.retakes_allowed > 0 && <span style={{ fontSize:11, color:C.text3 }}>🔄 {t.retakes_allowed} retake{t.retakes_allowed!==1?"s":""}</span>}
                    {t.interviewers?.length > 0 && <span style={{ fontSize:11, color:C.text3 }}>👤 {t.interviewers.length} interviewer{t.interviewers.length!==1?"s":""}</span>}
                  </div>
                </div>
                <div style={{ padding:"0 16px 14px", display:"flex", gap:6 }}>
                  <Btn v="secondary" onClick={() => setEditing(t)} icon="edit" style={{ flex:1, justifyContent:"center" }}>Edit</Btn>
                  <Btn v="ghost" onClick={() => {
                    const copy = { ...t, id:undefined, name:`${t.name} (copy)`, created_at:undefined, updated_at:undefined };
                    setEditing(copy);
                  }} icon="copy"/>
                  <Btn v="danger" onClick={() => handleDelete(t.id)} icon="trash"/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          questions={questions}
          envId={envId}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Template editor modal ──────────────────────────────────────────────────────
function TemplateEditor({ template, questions, envId, onSave, onClose }) {
  const isEdit = !!template?.id;

  const [form, setForm] = useState({
    name:                template?.name                || "",
    description:         template?.description         || "",
    interview_format:    template?.interview_format    || "video",
    duration:            template?.duration            || 45,
    color:               template?.color               || "#4361EE",
    is_active:           template?.is_active           !== false,
    // Question library selection
    question_ids:        template?.question_ids        || [],
    // Async video settings (only used when format=async_video)
    time_limit_per_question: template?.time_limit_per_question || 120,
    retakes_allowed:     template?.retakes_allowed     ?? 1,
    deadline_hours:      template?.deadline_hours      || 72,
    welcome_message:     template?.welcome_message     || "Thank you for taking the time to complete this interview.",
    completion_message:  template?.completion_message  || "Thank you for completing the interview. We'll be in touch shortly.",
    // Scorecard / rubric
    scorecard_enabled:   template?.scorecard_enabled   ?? true,
    pass_criteria:       template?.pass_criteria       || "",
    // Interviewers
    interviewers:        template?.interviewers        || [],
    // Availability
    availability:        template?.availability        || {},
  });

  const [tab, setTab]       = useState("basics");
  const [saving, setSaving] = useState(false);
  const [qSearch, setQSearch] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fmt = FORMATS.find(f => f.id === form.interview_format) || FORMATS[0];
  const isAsync = form.interview_format === "async_video";
  const isBot   = form.interview_format === "ai_bot";

  // Filter questions from bank
  const filteredQs = questions.filter(q => {
    if (!qSearch) return true;
    return q.text?.toLowerCase().includes(qSearch.toLowerCase()) ||
           q.competency?.toLowerCase().includes(qSearch.toLowerCase());
  });

  const toggleQuestion = (id) => {
    set("question_ids", form.question_ids.includes(id)
      ? form.question_ids.filter(x => x !== id)
      : [...form.question_ids, id]
    );
  };

  const selectedQuestions = questions.filter(q => form.question_ids.includes(q.id));

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form, id: template?.id });
    setSaving(false);
  };

  const inp = { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1px solid ${C.border}`,
    borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface };
  const lbl = { fontSize:12, fontWeight:700, color:C.text2, marginBottom:4, display:"block" };

  const TABS = [
    { id:"basics",    label:"Basics" },
    { id:"questions", label:`Questions (${form.question_ids.length})` },
    ...(isAsync ? [{ id:"video",    label:"Video Settings" }] : []),
    ...(isBot   ? [{ id:"bot",      label:"AI Settings" }]    : []),
    { id:"scorecard", label:"Scorecard" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:800, maxHeight:"92vh", display:"flex",
        flexDirection:"column", background:C.surface, borderRadius:16, overflow:"hidden",
        boxShadow:"0 24px 64px rgba(0,0,0,.18)" }}>

        {/* Header */}
        <div style={{ padding:"18px 24px 14px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:`${fmt.color}15`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n={fmt.icon} s={17} c={fmt.color}/>
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>
                {isEdit ? "Edit template" : "New interview template"}
              </div>
              <div style={{ fontSize:11, color:C.text3 }}>{fmt.label}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}>
            <Ic n="x" s={18} c={C.text3}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, padding:"10px 24px 0", borderBottom:`1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"7px 14px", borderRadius:"8px 8px 0 0", border:"none",
                cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:600,
                background: tab===t.id ? C.accentLight : "transparent",
                color: tab===t.id ? C.accent : C.text3,
                borderBottom: tab===t.id ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {tab === "basics" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Template name *</label>
                  <input value={form.name} onChange={e=>set("name",e.target.value)}
                    placeholder="e.g. Technical Screen, Final Panel" style={inp} autoFocus/>
                </div>
                <div>
                  <label style={lbl}>Duration (minutes)</label>
                  <select value={form.duration} onChange={e=>set("duration",Number(e.target.value))} style={{...inp,background:"white"}}>
                    {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>

              {/* Format picker */}
              <div>
                <label style={lbl}>Interview format</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => set("interview_format", f.id)}
                      style={{ padding:"12px 10px", borderRadius:10,
                        border:`2px solid ${form.interview_format===f.id ? f.color : C.border}`,
                        background: form.interview_format===f.id ? `${f.color}10` : "transparent",
                        cursor:"pointer", textAlign:"left", fontFamily:F, display:"flex", gap:8,
                        alignItems:"flex-start", transition:"all .12s" }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:`${f.color}20`,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Ic n={f.icon} s={13} c={f.color}/>
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700,
                          color: form.interview_format===f.id ? f.color : C.text1 }}>{f.label}</div>
                        <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>{f.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Description (internal)</label>
                <textarea value={form.description} onChange={e=>set("description",e.target.value)}
                  rows={2} style={{...inp,resize:"vertical"}}
                  placeholder="When to use this template, what it assesses…"/>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div onClick={() => set("is_active", !form.is_active)}
                  style={{ width:38, height:22, borderRadius:99,
                    background: form.is_active ? C.accent : "#D1D5DB",
                    position:"relative", cursor:"pointer", transition:"background .2s" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"white",
                    position:"absolute", top:2, transition:"left .2s",
                    left: form.is_active ? 18 : 2, boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
                </div>
                <label style={{ fontSize:13, color:C.text1, cursor:"pointer" }}
                  onClick={() => set("is_active", !form.is_active)}>
                  Active — available for scheduling
                </label>
              </div>
            </div>
          )}

          {tab === "questions" && (
            <div>
              {questions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.text3 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No questions in the library yet</div>
                  <div style={{ fontSize:12 }}>Go to Settings → Question library to add questions, then come back to attach them here.</div>
                </div>
              ) : (
                <>
                  {/* Selected summary */}
                  {selectedQuestions.length > 0 && (
                    <div style={{ padding:"10px 12px", borderRadius:10, background:C.accentLight,
                      border:`1px solid ${C.border}`, marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:8,
                        textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Selected ({selectedQuestions.length})
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {selectedQuestions.map(q => (
                          <div key={q.id} style={{ display:"flex", alignItems:"center", gap:5,
                            padding:"4px 8px", borderRadius:99, fontSize:11, fontWeight:600,
                            background:"white", border:`1px solid ${C.border}`, color:C.text1 }}>
                            {q.text?.slice(0,40)}{q.text?.length>40?"…":""}
                            <button onClick={() => toggleQuestion(q.id)}
                              style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}>
                              <Ic n="x" s={10} c={C.text3}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <div style={{ position:"relative", marginBottom:12 }}>
                    <Ic n="search" s={13} c={C.text3} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)" }}/>
                    <input value={qSearch} onChange={e=>setQSearch(e.target.value)}
                      placeholder="Search question library…"
                      style={{...inp, paddingLeft:28}}/>
                  </div>

                  {/* Question list grouped by type */}
                  {["knockout","competency","technical","culture","general"].map(type => {
                    const qs = filteredQs.filter(q => q.type === type || q.question_type === type);
                    if (!qs.length) return null;
                    const typeLabel = { knockout:"Knockout", competency:"Competency", technical:"Technical", culture:"Culture Fit", general:"General" }[type];
                    const col = Q_TYPE_COLOR[type] || "#6B7280";
                    return (
                      <div key={type} style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:col, textTransform:"uppercase",
                          letterSpacing:"0.06em", marginBottom:8 }}>{typeLabel}</div>
                        {qs.map(q => {
                          const selected = form.question_ids.includes(q.id);
                          return (
                            <div key={q.id} onClick={() => toggleQuestion(q.id)}
                              style={{ padding:"10px 12px", borderRadius:9,
                                border:`1.5px solid ${selected ? col : C.border}`,
                                background: selected ? `${col}08` : C.surface,
                                cursor:"pointer", marginBottom:6, display:"flex",
                                alignItems:"flex-start", gap:10, transition:"all .12s" }}>
                              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selected?col:C.border}`,
                                background: selected ? col : "transparent", flexShrink:0, marginTop:1,
                                display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {selected && <Ic n="check" s={10} c="white"/>}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, color:C.text1, lineHeight:1.4 }}>{q.text}</div>
                                {q.competency && (
                                  <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>
                                    {q.competency}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab === "video" && isAsync && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ padding:"10px 14px", borderRadius:10, background:"#FFF7ED",
                border:"1px solid #FED7AA", fontSize:13, color:"#92400E" }}>
                <strong>Async Video</strong> — candidates record their responses in their own time.
                A unique link is sent to each candidate. AI analyses transcripts and scores each answer.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Time per answer (seconds)</label>
                  <select value={form.time_limit_per_question} onChange={e=>set("time_limit_per_question",Number(e.target.value))} style={{...inp,background:"white"}}>
                    {[30,60,90,120,180,240,300].map(s=><option key={s} value={s}>{s}s ({Math.round(s/60*10)/10}min)</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Retakes per question</label>
                  <select value={form.retakes_allowed} onChange={e=>set("retakes_allowed",Number(e.target.value))} style={{...inp,background:"white"}}>
                    {[0,1,2,3].map(n=><option key={n} value={n}>{n===0?"No retakes":`${n} retake${n>1?"s":""}`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Deadline (hours)</label>
                  <select value={form.deadline_hours} onChange={e=>set("deadline_hours",Number(e.target.value))} style={{...inp,background:"white"}}>
                    {[24,48,72,96,120,168].map(h=><option key={h} value={h}>{h}h ({h/24} day{h/24>1?"s":""})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Welcome message</label>
                <textarea value={form.welcome_message} onChange={e=>set("welcome_message",e.target.value)}
                  rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
              <div>
                <label style={lbl}>Completion message</label>
                <textarea value={form.completion_message} onChange={e=>set("completion_message",e.target.value)}
                  rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
            </div>
          )}

          {tab === "bot" && isBot && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ padding:"10px 14px", borderRadius:10, background:"#FDF4FF",
                border:"1px solid #E9D5FF", fontSize:13, color:"#6B21A8" }}>
                <strong>AI Screening Bot</strong> — a conversational AI conducts the interview via voice or text.
                Configured further in Settings → AI → Agents.
              </div>
              <div>
                <label style={lbl}>AI persona name</label>
                <input value={form.persona_name || "Alex"} onChange={e=>set("persona_name",e.target.value)} style={inp} placeholder="Alex"/>
              </div>
              <div>
                <label style={lbl}>Opening message</label>
                <textarea value={form.persona_intro || ""} onChange={e=>set("persona_intro",e.target.value)}
                  rows={3} style={{...inp,resize:"vertical"}}
                  placeholder="Hi! I'm Alex, and I'll be conducting your initial screening today…"/>
              </div>
            </div>
          )}

          {tab === "scorecard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div onClick={() => set("scorecard_enabled", !form.scorecard_enabled)}
                  style={{ width:38, height:22, borderRadius:99,
                    background: form.scorecard_enabled ? C.accent : "#D1D5DB",
                    position:"relative", cursor:"pointer", transition:"background .2s" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"white",
                    position:"absolute", top:2, transition:"left .2s",
                    left: form.scorecard_enabled ? 18 : 2, boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
                </div>
                <label style={{ fontSize:13, color:C.text1, cursor:"pointer" }}
                  onClick={() => set("scorecard_enabled", !form.scorecard_enabled)}>
                  Enable structured scorecard for interviewers
                </label>
              </div>
              {form.scorecard_enabled && (
                <>
                  <div style={{ padding:"10px 14px", borderRadius:10, background:C.accentLight,
                    border:`1px solid ${C.border}`, fontSize:12, color:C.text2 }}>
                    Interviewers will be prompted to score each selected question (1–5) and provide
                    an overall recommendation after the interview. Responses are kept hidden from
                    other interviewers until they submit.
                  </div>
                  <div>
                    <label style={lbl}>Pass criteria / scoring guidance</label>
                    <textarea value={form.pass_criteria} onChange={e=>set("pass_criteria",e.target.value)}
                      rows={3} style={{...inp,resize:"vertical"}}
                      placeholder="e.g. Score ≥3 on all competency questions. Must pass all knockout criteria."/>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" onClick={handle} disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
