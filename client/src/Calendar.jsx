import { useState, useEffect, useCallback, useRef } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg: "var(--color-background-tertiary, #f7f8fa)",
  card: "var(--color-background-primary, white)",
  border: "var(--color-border-tertiary, #f0f0f0)",
  text1: "var(--color-text-primary, #111827)",
  text2: "var(--color-text-secondary, #374151)",
  text3: "var(--color-text-tertiary, #9ca3af)",
  accent: "#3b5bdb",
  accentLight: "#eef1ff",
};

const PRIORITY = {
  urgent: { label: "Urgent", color: "#ef4444", bg: "#fef2f2" },
  high:   { label: "High",   color: "#f97316", bg: "#fff7ed" },
  medium: { label: "Medium", color: "#eab308", bg: "#fefce8" },
  low:    { label: "Low",    color: "#22c55e", bg: "#f0fdf4" },
};

const STATUS = {
  todo:        { label: "To Do",       color: "#6b7280", bg: "#f3f4f6" },
  in_progress: { label: "In Progress", color: "#3b5bdb", bg: "#eef1ff" },
  blocked:     { label: "Blocked",     color: "#ef4444", bg: "#fef2f2" },
  done:        { label: "Done",        color: "#22c55e", bg: "#f0fdf4" },
};

const EVENT_TYPES = {
  general:   { label: "General",   color: "#6366f1" },
  meeting:   { label: "Meeting",   color: "#0ea5e9" },
  deadline:  { label: "Deadline",  color: "#ef4444" },
  interview: { label: "Interview", color: "#8b5cf6" },
  campus:    { label: "Campus",    color: "#f59e0b" },
};

const VIEWS = ["month", "week", "day", "agenda"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const api = {
  get: url => fetch(url).then(r => r.json()),
  post: (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  patch: (url, body) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  del: url => fetch(url, { method: "DELETE" }).then(r => r.json()),
};

function fmt(d) { return d.toISOString().slice(0, 10); }
function today() { return fmt(new Date()); }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }

function getDaysInView(viewDate, view) {
  if (view === "month") {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const days = [];
    for (let i = start.getDay(); i > 0; i--) days.unshift(addDays(start, -i));
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    while (days.length % 7 !== 0) days.push(addDays(days[days.length - 1], 1));
    return days;
  }
  if (view === "week") {
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  return [viewDate];
}

function Ic({ n, s = 16, c = "currentColor" }) {
  const paths = {
    plus: "M12 5v14M5 12h14", x: "M18 6L6 18M6 6l12 12",
    check: "M5 13l4 4L19 7", "check-circle": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    chevD: "M19 9l-7 7-7-7", chevR: "M9 5l7 7-7 7", chevL: "M15 19l-7-7 7-7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    "external-link": "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={paths[n] || ""} />
    </svg>
  );
}

function Btn({ children, onClick, variant = "default", size = "sm", disabled, style: sx }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: "none", borderRadius: 8, transition: "all .12s", opacity: disabled ? 0.5 : 1, ...sx };
  const pads = { sm: "6px 12px", md: "8px 16px", lg: "10px 20px" };
  const variants = {
    default: { background: C.card, color: C.text2, border: `1px solid ${C.border}`, fontSize: 12 },
    primary: { background: C.accent, color: "white", fontSize: 12 },
    ghost:   { background: "transparent", color: C.text2, fontSize: 12 },
    danger:  { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", fontSize: 12 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, padding: pads[size], ...variants[variant] }}>{children}</button>;
}

function Badge({ children, color = C.accent, bg }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg || `${color}18`, whiteSpace: "nowrap" }}>{children}</span>;
}

// ── TaskModal ─────────────────────────────────────────────────────────────────
function TaskModal({ task, onSave, onDelete, onClose, defaultDate }) {
  const [form, setForm] = useState(() => task ? {
    title: task.title || "", description: task.description || "",
    due_date: task.due_date || defaultDate || "", due_time: task.due_time || "",
    priority: task.priority || "medium", status: task.status || "todo",
    assignee_id: task.assignee_id || "",
    tags: Array.isArray(task.tags) ? task.tags : (task.tags ? JSON.parse(task.tags) : []),
    checklist: Array.isArray(task.checklist) ? task.checklist : (task.checklist ? JSON.parse(task.checklist) : []),
    estimated_minutes: task.estimated_minutes || "",
  } : {
    title: "", description: "", due_date: defaultDate || "", due_time: "",
    priority: "medium", status: "todo", assignee_id: "",
    tags: [], checklist: [], estimated_minutes: "",
  });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const addTag = () => { if (!newTag.trim()) return; set("tags", [...form.tags, newTag.trim()]); setNewTag(""); };
  const addCheck = () => { if (!newCheckItem.trim()) return; set("checklist", [...form.checklist, { id: Date.now(), text: newCheckItem.trim(), done: false }]); setNewCheckItem(""); };
  const toggleCheck = id => set("checklist", form.checklist.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const completedCount = form.checklist.filter(i => i.done).length;

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const modal = { background: C.card, borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" };

  return (
    <div style={overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div style={modal} onMouseDown={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: F }}>{task ? "Edit Task" : "New Task"}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3 }}><Ic n="x" s={18} /></button>
          </div>
          <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
            {["details","checklist","notes"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: activeTab===tab?700:500, color: activeTab===tab?C.accent:C.text3, background:"none", border:"none", borderBottom: activeTab===tab?`2px solid ${C.accent}`:"2px solid transparent", cursor:"pointer", fontFamily:F, textTransform:"capitalize" }}>{tab}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {activeTab === "details" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Task title *" autoFocus
                style={{ width:"100%", padding:"10px 12px", fontSize:15, fontWeight:600, border:`1.5px solid ${C.border}`, borderRadius:10, outline:"none", fontFamily:F, boxSizing:"border-box" }} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>DUE DATE</label>
                  <input type="date" value={form.due_date} onChange={e=>set("due_date",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>TIME</label>
                  <input type="time" value={form.due_time} onChange={e=>set("due_time",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }} /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>PRIORITY</label>
                  <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}>
                    {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>STATUS</label>
                  <select value={form.status} onChange={e=>set("status",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}>
                    {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:6 }}>TAGS</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
                  {form.tags.map(tag=>(
                    <span key={tag} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, background:"#f3f4f6", fontSize:11, fontWeight:600, color:C.text2 }}>
                      {tag}<button onClick={()=>set("tags",form.tags.filter(t=>t!==tag))} style={{ background:"none",border:"none",cursor:"pointer",padding:0,color:C.text3,display:"flex" }}><Ic n="x" s={10}/></button></span>
                  ))}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="Add tag…" style={{ flex:1, padding:"6px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F }} />
                  <Btn onClick={addTag}>Add</Btn>
                </div>
              </div>
            </div>
          )}
          {activeTab === "checklist" && (
            <div>
              {form.checklist.length>0 && <div style={{ height:4, background:C.border, borderRadius:2, marginBottom:12, overflow:"hidden" }}><div style={{ height:"100%", background:"#22c55e", width:`${form.checklist.length?(completedCount/form.checklist.length)*100:0}%`, transition:"width .3s", borderRadius:2 }}/></div>}
              {form.checklist.length>0 && <div style={{ fontSize:12, color:C.text3, marginBottom:8 }}>{completedCount}/{form.checklist.length} done</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                {form.checklist.map(item=>(
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:item.done?"#f0fdf4":C.bg, borderRadius:8 }}>
                    <input type="checkbox" checked={item.done} onChange={()=>toggleCheck(item.id)} style={{ cursor:"pointer", accentColor:"#22c55e", width:16, height:16 }}/>
                    <span style={{ flex:1, fontSize:13, color:item.done?C.text3:C.text1, textDecoration:item.done?"line-through":"none" }}>{item.text}</span>
                    <button onClick={()=>set("checklist",form.checklist.filter(i=>i.id!==item.id))} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3 }}><Ic n="x" s={13}/></button>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <input value={newCheckItem} onChange={e=>setNewCheckItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheck()} placeholder="Add checklist item…" autoFocus style={{ flex:1, padding:"8px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F }}/>
                <Btn onClick={addCheck} variant="primary">Add</Btn>
              </div>
            </div>
          )}
          {activeTab === "notes" && (
            <textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Add notes, context, links…" rows={10}
              style={{ width:"100%", padding:12, fontSize:13, border:`1px solid ${C.border}`, borderRadius:10, fontFamily:F, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
          )}
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", gap:8 }}>
          <div>{task&&<Btn onClick={()=>onDelete(task.id)} variant="danger"><Ic n="trash" s={13}/>Delete</Btn>}</div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!form.title.trim()||saving}>{saving?"Saving…":<><Ic n="check" s={13}/>{task?"Save":"Create Task"}</>}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EventModal ────────────────────────────────────────────────────────────────
function EventModal({ event, onSave, onDelete, onClose, defaultDate }) {
  const [form, setForm] = useState(() => event ? {
    title: event.title||"", description: event.description||"",
    start_date: event.start_date||defaultDate||"", start_time: event.start_time||"",
    end_date: event.end_date||defaultDate||"", end_time: event.end_time||"",
    type: event.type||"general", location: event.location||"", all_day: event.all_day?true:false,
  } : { title:"", description:"", start_date:defaultDate||"", start_time:"", end_date:defaultDate||"", end_time:"", type:"general", location:"", all_day:false });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = async () => { if (!form.title.trim()||!form.start_date) return; setSaving(true); await onSave(form); setSaving(false); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, borderRadius:20, width:"100%", maxWidth:480, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.18)" }} onMouseDown={e=>e.stopPropagation()}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text1, fontFamily:F }}>{event?"Edit Event":"New Event"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3 }}><Ic n="x" s={18}/></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Event title *" autoFocus
            style={{ width:"100%", padding:"10px 12px", fontSize:15, fontWeight:600, border:`1.5px solid ${C.border}`, borderRadius:10, fontFamily:F, boxSizing:"border-box", outline:"none" }}/>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:6 }}>TYPE</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(EVENT_TYPES).map(([k,v])=>(
                <button key={k} onClick={()=>set("type",k)} style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${form.type===k?v.color:C.border}`, background:form.type===k?`${v.color}18`:C.card, color:form.type===k?v.color:C.text3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>{v.label}</button>
              ))}
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <input type="checkbox" checked={form.all_day} onChange={e=>set("all_day",e.target.checked)} style={{ accentColor:C.accent }}/>
            <span style={{ fontSize:13, color:C.text2, fontFamily:F }}>All day</span>
          </label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>START DATE</label>
              <input type="date" value={form.start_date} onChange={e=>{set("start_date",e.target.value);if(!form.end_date||form.end_date<e.target.value)set("end_date",e.target.value);}} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}/></div>
            {!form.all_day&&<div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>START TIME</label>
              <input type="time" value={form.start_time} onChange={e=>set("start_time",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}/></div>}
            <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>END DATE</label>
              <input type="date" value={form.end_date} onChange={e=>set("end_date",e.target.value)} min={form.start_date} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}/></div>
            {!form.all_day&&<div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>END TIME</label>
              <input type="time" value={form.end_time} onChange={e=>set("end_time",e.target.value)} style={{ width:"100%", padding:"8px 10px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}/></div>}
          </div>
          <div><label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>LOCATION</label>
            <input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Location or video link" style={{ width:"100%", padding:"8px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, fontFamily:F, boxSizing:"border-box" }}/></div>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Notes…" rows={3} style={{ width:"100%", padding:"10px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:10, fontFamily:F, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
          <div>{event&&<Btn onClick={()=>onDelete(event.id)} variant="danger"><Ic n="trash" s={13}/>Delete</Btn>}</div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!form.title.trim()||!form.start_date||saving}>{saving?"Saving…":event?"Save":"Create Event"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CalendarGrid ──────────────────────────────────────────────────────────────
function CalendarGrid({ view, viewDate, items, onDayClick, onItemClick, todayStr }) {
  const days = getDaysInView(viewDate, view);
  const currentMonth = viewDate.getMonth();

  const getItemsForDate = ds => items.filter(item => {
    if (item._kind==="task") return item.due_date===ds;
    if (item._kind==="interview") return item.date===ds;
    if (item._kind==="event") return item.start_date<=ds && (item.end_date||item.start_date)>=ds;
    return false;
  });

  const itemColor = item => {
    if (item._kind==="task") return PRIORITY[item.priority]?.color||C.accent;
    if (item._kind==="interview") return "#8b5cf6";
    return EVENT_TYPES[item.type]?.color||C.accent;
  };

  const itemLabel = item => item.title || (item._kind==="interview" ? (item.candidate_name||"Interview") : "Untitled");

  if (view==="month") {
    const weeks=[];
    for(let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7));
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}` }}>
          {DAYS.map(d=><div key={d} style={{ padding:"8px 0", textAlign:"center", fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.05em" }}>{d}</div>)}
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:wi<weeks.length-1?`1px solid ${C.border}`:"none" }}>
              {week.map((day,di)=>{
                const ds=fmt(day), isToday=ds===todayStr, isCurM=day.getMonth()===currentMonth, dayItems=getItemsForDate(ds);
                return (
                  <div key={di} onClick={()=>onDayClick(ds)} style={{ borderRight:di<6?`1px solid ${C.border}`:"none", padding:"6px 8px", minHeight:90, cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ marginBottom:4 }}>
                      <span style={{ width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", fontSize:12, fontWeight:isToday?700:400, color:isToday?"white":isCurM?C.text1:C.text3, background:isToday?C.accent:"transparent" }}>{day.getDate()}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {dayItems.slice(0,3).map((item,i)=>(
                        <div key={i} onClick={e=>{e.stopPropagation();onItemClick(item);}} style={{ padding:"2px 5px", borderRadius:4, background:`${itemColor(item)}18`, borderLeft:`2.5px solid ${itemColor(item)}`, fontSize:10, fontWeight:600, color:itemColor(item), whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"pointer" }}>
                          {item._kind==="task"&&item.status==="done"?"✓ ":""}{itemLabel(item)}
                        </div>
                      ))}
                      {dayItems.length>3&&<div style={{ fontSize:10, color:C.text3, paddingLeft:5 }}>+{dayItems.length-3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Agenda / week / day — unified list view
  const agendaDays = view==="week" ? days : view==="day" ? [viewDate] : Array.from({length:60},(_,i)=>addDays(viewDate,i));
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"0 24px" }}>
      {agendaDays.map((day,i)=>{
        const ds=fmt(day), dayItems=getItemsForDate(ds), isToday=ds===todayStr;
        if(!dayItems.length&&!isToday&&view==="agenda") return null;
        return (
          <div key={i} style={{ display:"flex", gap:16, padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:72, flexShrink:0, textAlign:"right" }}>
              <div style={{ fontSize:11, fontWeight:700, color:isToday?C.accent:C.text3 }}>{DAYS[day.getDay()]}</div>
              <div style={{ fontSize:isToday?20:15, fontWeight:isToday?700:400, color:isToday?C.accent:C.text1, lineHeight:1.2 }}>{day.getDate()}</div>
              <div style={{ fontSize:10, color:C.text3 }}>{MONTHS[day.getMonth()].slice(0,3)}</div>
            </div>
            <div style={{ flex:1 }}>
              {dayItems.length===0&&isToday&&<div style={{ color:C.text3, fontSize:13, padding:"6px 0" }}>No events today</div>}
              {dayItems.map((item,j)=>(
                <div key={j} onClick={()=>onItemClick(item)} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px", background:C.card, borderRadius:10, marginBottom:4, cursor:"pointer", border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, minHeight:28, borderRadius:2, background:itemColor(item), flexShrink:0, marginTop:2 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:item._kind==="task"&&item.status==="done"?C.text3:C.text1, textDecoration:item._kind==="task"&&item.status==="done"?"line-through":"none" }}>{itemLabel(item)}</div>
                    <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                      {item._kind==="task"&&<Badge color={PRIORITY[item.priority]?.color} bg={PRIORITY[item.priority]?.bg}>{PRIORITY[item.priority]?.label}</Badge>}
                      {item._kind==="task"&&<Badge color={STATUS[item.status]?.color} bg={STATUS[item.status]?.bg}>{STATUS[item.status]?.label}</Badge>}
                      {(item.due_time||item.start_time)&&<span style={{ fontSize:11, color:C.text3 }}>🕐 {item.due_time||item.start_time}</span>}
                      {item.location&&<span style={{ fontSize:11, color:C.text3 }}>📍 {item.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main CalendarModule ───────────────────────────────────────────────────────
export default function CalendarModule({ environment }) {
  const [view, setView] = useState("month");
  const [viewDate, setViewDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null);
  const [eventModal, setEventModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const todayStr = today();
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    try {
      const start = fmt(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1));
      const end   = fmt(new Date(viewDate.getFullYear(), viewDate.getMonth()+2, 0));
      const feed = await api.get(`/calendar/feed?environment_id=${envId}&start=${start}&end=${end}`);
      setTasks(feed.tasks||[]); setEvents(feed.events||[]); setInterviews(feed.interviews||[]);
    } finally { setLoading(false); }
  }, [envId, viewDate.getFullYear(), viewDate.getMonth()]);

  useEffect(()=>{ load(); }, [load]);

  const allItems = [
    ...tasks.map(t=>({...t,_kind:"task"})),
    ...events.map(e=>({...e,_kind:"event"})),
    ...interviews.map(i=>({...i,_kind:"interview"})),
  ].filter(item => {
    if(filterType!=="all"&&item._kind!==filterType) return false;
    if(searchQ){ const q=searchQ.toLowerCase(); if(!(item.title||item.candidate_name||"").toLowerCase().includes(q)) return false; }
    return true;
  });

  const navigate = dir => {
    const d = new Date(viewDate);
    if(view==="month") d.setMonth(d.getMonth()+dir);
    else if(view==="week") d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setViewDate(d);
  };

  const handleSaveTask = async form => {
    if(taskModal?.task) await api.patch(`/calendar/tasks/${taskModal.task.id}`, {...form, environment_id:envId});
    else await api.post("/api/calendar/tasks", {...form, environment_id:envId});
    setTaskModal(null); setSelectedItem(null); load();
  };
  const handleDeleteTask = async id => { await api.del(`/calendar/tasks/${id}`); setTaskModal(null); setSelectedItem(null); load(); };
  const handleSaveEvent = async form => {
    if(eventModal?.event) await api.patch(`/calendar/events/${eventModal.event.id}`, {...form, environment_id:envId});
    else await api.post("/api/calendar/events", {...form, environment_id:envId});
    setEventModal(null); load();
  };
  const handleDeleteEvent = async id => { await api.del(`/calendar/events/${id}`); setEventModal(null); setSelectedItem(null); load(); };
  const handleToggleTask = async task => {
    await api.patch(`/calendar/tasks/${task.id}`, { status: task.status==="done"?"todo":"done" });
    setSelectedItem(null); load();
  };

  const headerLabel = () => {
    if(view==="month") return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    if(view==="week"){
      const d=getDaysInView(viewDate,"week");
      return `${MONTHS[d[0].getMonth()].slice(0,3)} ${d[0].getDate()} – ${MONTHS[d[6].getMonth()].slice(0,3)} ${d[6].getDate()}, ${viewDate.getFullYear()}`;
    }
    if(view==="agenda") return `Upcoming from ${MONTHS[viewDate.getMonth()]} ${viewDate.getDate()}`;
    return `${DAYS[viewDate.getDay()]}, ${MONTHS[viewDate.getMonth()]} ${viewDate.getDate()}, ${viewDate.getFullYear()}`;
  };

  const pendingTasks = tasks.filter(t=>t.status!=="done"&&t.due_date&&t.due_date<=todayStr);
  const upcomingTasks = tasks.filter(t=>t.status!=="done"&&(!t.due_date||t.due_date>todayStr)).slice(0,5);

  return (
    <div style={{ display:"flex", height:"calc(100vh - 57px)", fontFamily:F, overflow:"hidden" }}>
      {/* Sidebar */}
      {showSidebar&&(
        <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflowY:"auto", background:C.card }}>
          <div style={{ padding:"16px 16px 8px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{MONTHS[viewDate.getMonth()].slice(0,3)} {viewDate.getFullYear()}</span>
              <div style={{ display:"flex", gap:2 }}>
                <button onClick={()=>navigate(-1)} style={{ background:"none",border:"none",cursor:"pointer",padding:4,color:C.text3,display:"flex" }}><Ic n="chevL" s={14}/></button>
                <button onClick={()=>navigate(1)} style={{ background:"none",border:"none",cursor:"pointer",padding:4,color:C.text3,display:"flex" }}><Ic n="chevR" s={14}/></button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
              {DAYS.map(d=><div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:C.text3, padding:"2px 0" }}>{d[0]}</div>)}
              {getDaysInView(viewDate,"month").map((day,i)=>{
                const ds=fmt(day), isT=ds===todayStr, isCurM=day.getMonth()===viewDate.getMonth();
                const hasDot=allItems.some(item=>(item.due_date||item.start_date||item.date)===ds);
                return (
                  <button key={i} onClick={()=>{setViewDate(day);setView("day");}} style={{ textAlign:"center", fontSize:10, padding:"3px 0", borderRadius:4, border:"none", cursor:"pointer", background:isT?C.accent:"transparent", color:isT?"white":isCurM?C.text1:C.text3, fontFamily:F }}>
                    {day.getDate()}
                    {hasDot&&!isT&&<div style={{ width:3,height:3,borderRadius:"50%",background:C.accent,margin:"0 auto",marginTop:-2 }}/>}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ padding:"8px 16px" }}>
            <Btn onClick={()=>setViewDate(new Date())} style={{ width:"100%", justifyContent:"center" }}>Today</Btn>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.05em", marginBottom:8 }}>QUICK ADD</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button onClick={()=>setTaskModal({defaultDate:todayStr})} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:600,color:C.text2 }}>
                <Ic n="list" s={14} c={C.accent}/> New Task</button>
              <button onClick={()=>setEventModal({defaultDate:todayStr})} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:600,color:C.text2 }}>
                <Ic n="calendar" s={14} c="#6366f1"/> New Event</button>
            </div>
          </div>
          {pendingTasks.length>0&&(
            <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", letterSpacing:"0.05em", marginBottom:8 }}>OVERDUE / DUE TODAY ({pendingTasks.length})</div>
              {pendingTasks.slice(0,5).map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}` }}>
                  <input type="checkbox" onChange={()=>handleToggleTask(t)} style={{ cursor:"pointer",accentColor:"#22c55e" }}/>
                  <span style={{ flex:1,fontSize:11,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.title}</span>
                  <Badge color={PRIORITY[t.priority]?.color} bg={PRIORITY[t.priority]?.bg}>{(t.priority||"M")[0].toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
          {upcomingTasks.length>0&&(
            <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.05em", marginBottom:8 }}>UPCOMING</div>
              {upcomingTasks.map(t=>(
                <div key={t.id} onClick={()=>setTaskModal({task:t})} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:PRIORITY[t.priority]?.color||C.accent,flexShrink:0 }}/>
                  <span style={{ flex:1,fontSize:11,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.title}</span>
                  {t.due_date&&<span style={{ fontSize:10,color:C.text3 }}>{t.due_date.slice(5)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, background:C.card, flexShrink:0 }}>
          <button onClick={()=>setShowSidebar(s=>!s)} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex" }}><Ic n="grid" s={16}/></button>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>navigate(-1)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:"4px 8px",display:"flex",alignItems:"center",color:C.text2 }}><Ic n="chevL" s={14}/></button>
            <button onClick={()=>setViewDate(new Date())} style={{ padding:"4px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,color:C.text2,fontFamily:F }}>Today</button>
            <button onClick={()=>navigate(1)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:"4px 8px",display:"flex",alignItems:"center",color:C.text2 }}><Ic n="chevR" s={14}/></button>
          </div>
          <span style={{ fontSize:16,fontWeight:700,color:C.text1,flex:1 }}>{headerLabel()}</span>
          <div style={{ position:"relative" }}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search…" style={{ paddingLeft:28,paddingRight:10,paddingTop:6,paddingBottom:6,fontSize:12,border:`1px solid ${C.border}`,borderRadius:8,fontFamily:F,width:150 }}/>
            <div style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}><Ic n="search" s={13} c={C.text3}/></div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {["all","task","event","interview"].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{ padding:"4px 10px",borderRadius:6,border:"none",background:filterType===t?C.accentLight:"transparent",color:filterType===t?C.accent:C.text3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,textTransform:"capitalize" }}>{t}</button>
            ))}
          </div>
          <div style={{ display:"flex", background:C.bg, borderRadius:8, padding:2 }}>
            {VIEWS.map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"4px 10px",borderRadius:6,border:"none",background:view===v?C.card:"transparent",color:view===v?C.text1:C.text3,fontSize:11,fontWeight:view===v?700:500,cursor:"pointer",fontFamily:F,textTransform:"capitalize",boxShadow:view===v?"0 1px 3px rgba(0,0,0,0.08)":"none" }}>{v}</button>
            ))}
          </div>
          <Btn onClick={()=>setTaskModal({defaultDate:todayStr})} variant="primary"><Ic n="plus" s={13}/>Add</Btn>
        </div>

        {loading
          ? <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3 }}>Loading…</div>
          : <CalendarGrid view={view} viewDate={viewDate} items={allItems} onDayClick={ds=>setTaskModal({defaultDate:ds})} onItemClick={setSelectedItem} todayStr={todayStr}/>
        }
      </div>

      {/* Detail sidebar */}
      {selectedItem&&(
        <div style={{ width:280,flexShrink:0,borderLeft:`1px solid ${C.border}`,background:C.card,display:"flex",flexDirection:"column",overflowY:"auto" }}>
          <div style={{ padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <span style={{ fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>{selectedItem._kind}</span>
            <div style={{ display:"flex",gap:4 }}>
              {selectedItem._kind==="task"&&<button onClick={()=>{setTaskModal({task:selectedItem});setSelectedItem(null);}} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex" }}><Ic n="edit" s={15}/></button>}
              {selectedItem._kind==="event"&&<button onClick={()=>{setEventModal({event:selectedItem});setSelectedItem(null);}} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex" }}><Ic n="edit" s={15}/></button>}
              <button onClick={()=>setSelectedItem(null)} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex" }}><Ic n="x" s={15}/></button>
            </div>
          </div>
          <div style={{ padding:"16px 20px",flex:1 }}>
            <h3 style={{ margin:"0 0 12px",fontSize:15,fontWeight:700,color:C.text1,fontFamily:F }}>{selectedItem.title||selectedItem.candidate_name}</h3>
            {selectedItem._kind==="task"&&(
              <>
                <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                  <Badge color={PRIORITY[selectedItem.priority]?.color} bg={PRIORITY[selectedItem.priority]?.bg}>{PRIORITY[selectedItem.priority]?.label}</Badge>
                  <Badge color={STATUS[selectedItem.status]?.color} bg={STATUS[selectedItem.status]?.bg}>{STATUS[selectedItem.status]?.label}</Badge>
                </div>
                {selectedItem.due_date&&<div style={{ fontSize:12,color:C.text2,marginBottom:6 }}>📅 Due {selectedItem.due_date}{selectedItem.due_time?` at ${selectedItem.due_time}`:""}</div>}
                {selectedItem.description&&<div style={{ fontSize:13,color:C.text2,marginBottom:12,lineHeight:1.5 }}>{selectedItem.description}</div>}
                <Btn onClick={()=>handleToggleTask(selectedItem)} variant={selectedItem.status==="done"?"default":"primary"} style={{ width:"100%",justifyContent:"center" }}>
                  {selectedItem.status==="done"?"Mark Incomplete":"✓ Mark Complete"}
                </Btn>
              </>
            )}
            {selectedItem._kind==="event"&&(
              <>
                <Badge color={EVENT_TYPES[selectedItem.type]?.color}>{EVENT_TYPES[selectedItem.type]?.label}</Badge>
                <div style={{ marginTop:10,display:"flex",flexDirection:"column",gap:6 }}>
                  <div style={{ fontSize:12,color:C.text2 }}>📅 {selectedItem.start_date}{selectedItem.end_date!==selectedItem.start_date?` → ${selectedItem.end_date}`:""}</div>
                  {selectedItem.start_time&&<div style={{ fontSize:12,color:C.text2 }}>🕐 {selectedItem.start_time}{selectedItem.end_time?` – ${selectedItem.end_time}`:""}</div>}
                  {selectedItem.location&&<div style={{ fontSize:12,color:C.text2 }}>📍 {selectedItem.location}</div>}
                  {selectedItem.description&&<div style={{ fontSize:13,color:C.text2,marginTop:8,lineHeight:1.5 }}>{selectedItem.description}</div>}
                </div>
              </>
            )}
            {selectedItem._kind==="interview"&&(
              <>
                <Badge color="#8b5cf6" bg="#f5f3ff">Interview</Badge>
                <div style={{ marginTop:10,display:"flex",flexDirection:"column",gap:6 }}>
                  <div style={{ fontSize:12,color:C.text2 }}>📅 {selectedItem.date} at {selectedItem.time||"TBD"}</div>
                  <div style={{ fontSize:12,color:C.text2 }}>⏱ {selectedItem.duration_minutes||45} min · {selectedItem.format||"Video"}</div>
                  {selectedItem.notes&&<div style={{ fontSize:13,color:C.text2,marginTop:8 }}>{selectedItem.notes}</div>}
                  <Btn onClick={()=>window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:selectedItem.candidate_id,objectId:selectedItem.object_id}}))} style={{ marginTop:4 }}>
                    <Ic n="external-link" s={12}/>Open Record
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {taskModal&&<TaskModal task={taskModal.task} defaultDate={taskModal.defaultDate} onSave={handleSaveTask} onDelete={handleDeleteTask} onClose={()=>setTaskModal(null)}/>}
      {eventModal&&<EventModal event={eventModal.event} defaultDate={eventModal.defaultDate} onSave={handleSaveEvent} onDelete={handleDeleteEvent} onClose={()=>setEventModal(null)}/>}
    </div>
  );
}
