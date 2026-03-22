// client/src/settings/QuestionBankSettings.jsx
import { useState, useEffect, useCallback } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = { bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8", text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7", accent:"#4361EE", accentLight:"#EEF2FF", green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444" };
import api from '../apiClient.js';

const Ic = ({ n, s = 16, c = 'currentColor' }) => {
  const paths = {
    plus: "M12 5v14M5 12h14", x: "M18 6L6 18M6 6l12 12",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    chevD: "M6 9l6 6 6-6", chevR: "M9 18l6-6-6-6", chevU: "M18 15l-6-6-6 6",
    check: "M20 6L9 17l-5-5", grip: "M9 5h2M9 12h2M9 19h2M13 5h2M13 12h2M13 19h2",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    copy: "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
    filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
    info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M12 12v4",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
    save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[n] || paths.plus}/>
    </svg>
  );
};









const TYPE_LABELS = {
  multiple_choice: "Multiple Choice",
  single_choice:   "Single Choice",
  text:            "Text / Open",
  rating:          "Rating Scale",
  boolean:         "Yes / No",
  number:          "Number",
  date:            "Date",
  file_upload:     "File Upload",
};

const TYPE_COLORS = {
  multiple_choice: "#4361EE",
  single_choice:   "#7C3AED",
  text:            "#0CAF77",
  rating:          "#F79009",
  boolean:         "#06B6D4",
  number:          "#EC4899",
  date:            "#6366F1",
  file_upload:     "#14B8A6",
};

const Btn = ({children,onClick,v="primary",sz="md",icon,disabled,style={}})=>{
  const base={display:"inline-flex",alignItems:"center",gap:6,fontFamily:F,fontWeight:700,cursor:disabled?"not-allowed":"pointer",borderRadius:9,transition:"all .12s",border:"none",opacity:disabled?0.5:1,...(sz==="sm"?{padding:"5px 10px",fontSize:11}:{padding:"8px 16px",fontSize:13})};
  const vs={primary:{background:C.accent,color:"#fff"},secondary:{background:"#f1f5f9",color:C.text2},ghost:{background:"transparent",color:C.text2,border:`1px solid ${C.border}`},danger:{background:"#fef2f2",color:C.red,border:`1px solid #fecaca`},green:{background:C.green,color:"#fff"}};
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={sz==="sm"?12:14} c={v==="primary"||v==="green"?"#fff":v==="danger"?C.red:C.text2}/>}{children}</button>;
};

// ── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = ({q, onEdit, onDelete, selectable, selected, onToggle}) => {
  const col = TYPE_COLORS[q.type]||"#6b7280";
  return (
    <div onClick={selectable?()=>onToggle(q.id):undefined} style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${selected?col:C.border}`,background:selected?`${col}08`:C.surface,cursor:selectable?"pointer":"default",transition:"all .12s",marginBottom:6}}>
      {selectable&&<div style={{width:18,height:18,borderRadius:4,border:`2px solid ${selected?col:C.border}`,background:selected?col:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,transition:"all .1s"}}>{selected&&<Ic n="check" s={10} c="#fff"/>}</div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:C.text1,lineHeight:1.5,marginBottom:6}}>{q.text}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${col}14`,color:col}}>{TYPE_LABELS[q.type]}</span>
          {q.competency&&<span style={{fontSize:10,color:C.text3}}>{q.competency}</span>}
          <span style={{fontSize:10,color:C.text3}}>{q.weight} pts</span>
          {q.is_system&&<span style={{fontSize:10,fontWeight:700,color:"#64748b",background:"#f1f5f9",padding:"1px 6px",borderRadius:99}}>system</span>}
          {q.is_custom&&<span style={{fontSize:10,fontWeight:700,color:C.purple,background:"#f5f3ff",padding:"1px 6px",borderRadius:99}}>custom</span>}
          {(q.tags||[]).map(t=><span key={t} style={{fontSize:10,color:C.text3,background:"#f1f5f9",padding:"1px 6px",borderRadius:99}}>#{t}</span>)}
        </div>
        {q.options&&<div style={{fontSize:11,color:C.text3,marginTop:4}}>Options: {q.options.join(", ")} {q.pass_value&&`· Pass: ${q.pass_value}`}</div>}
      </div>
      {!selectable&&(
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          {!q.is_system&&<button onClick={()=>onEdit(q)} style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:C.text3}}><Ic n="edit" s={13}/></button>}
          {q.is_custom&&<button onClick={()=>onDelete(q.id)} style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:C.text3}}><Ic n="trash" s={13}/></button>}
        </div>
      )}
    </div>
  );
};

// ── Add/Edit Question Modal ────────────────────────────────────────────────────
const QuestionModal = ({question, onSave, onClose}) => {
  const isEdit = !!question?.id;
  const [form, setForm] = useState({text:question?.text||"",type:question?.type||"competency",competency:question?.competency||"",weight:question?.weight||10,options:question?.options?.join(",")||"",pass_value:question?.pass_value||"",tags:question?.tags?.join(",")||""});
  const [saving, setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handle=async()=>{setSaving(true);await onSave({...form,options:form.type==="knockout"?form.options.split(",").map(s=>s.trim()).filter(Boolean):null,pass_value:form.type==="knockout"?form.pass_value||null:null,tags:form.tags.split(",").map(s=>s.trim()).filter(Boolean)},question?.id);setSaving(false);};
  const inp={width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",boxSizing:"border-box",color:C.text1};
  const lbl={fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4};
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:520,boxShadow:"0 24px 64px rgba(0,0,0,.18)",overflow:"hidden"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit?"Edit":"Add"} Question</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20}}>×</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={lbl}>Question text *</label><textarea value={form.text} onChange={e=>set("text",e.target.value)} rows={3} style={{...inp,resize:"vertical"}} placeholder="Enter the question…"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Type</label><select value={form.type} onChange={e=>set("type",e.target.value)} style={{...inp,background:"white"}}>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div><label style={lbl}>Weight (pts)</label><input type="number" min={1} max={50} value={form.weight} onChange={e=>set("weight",Number(e.target.value))} style={inp}/></div>
          </div>
          <div><label style={lbl}>Competency / Topic</label><input value={form.competency} onChange={e=>set("competency",e.target.value)} style={inp} placeholder="e.g. leadership, problem_solving…"/></div>
          {form.type==="knockout"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={lbl}>Options (comma-separated)</label><input value={form.options} onChange={e=>set("options",e.target.value)} style={inp} placeholder="Yes, No"/></div><div><label style={lbl}>Pass value</label><input value={form.pass_value} onChange={e=>set("pass_value",e.target.value)} style={inp} placeholder="Yes"/></div></div>}
          <div><label style={lbl}>Tags (comma-separated)</label><input value={form.tags} onChange={e=>set("tags",e.target.value)} style={inp} placeholder="leadership, technical…"/></div>
        </div>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" onClick={handle} disabled={saving||!form.text.trim()}>{saving?"Saving…":isEdit?"Save Changes":"Add Question"}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Template Modal ────────────────────────────────────────────────────────────
const TemplateModal = ({template, questions, onSave, onClose}) => {
  const isEdit = !!template?.id;
  const [form, setForm] = useState({name:template?.name||"",description:template?.description||"",category:template?.category||"Custom",question_ids:template?.question_ids||[]});
  const [saving, setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleQ = id => set("question_ids",form.question_ids.includes(id)?form.question_ids.filter(x=>x!==id):[...form.question_ids,id]);
  const handle=async()=>{setSaving(true);await onSave(form,template?.id);setSaving(false);};
  const inp={width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",boxSizing:"border-box",color:C.text1};
  const lbl={fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4};
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:640,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.18)",overflow:"hidden"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit?"Edit":"New"} Template</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Template Name *</label><input value={form.name} onChange={e=>set("name",e.target.value)} style={inp} placeholder="e.g. Senior Engineering"/></div>
            <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>set("category",e.target.value)} style={{...inp,background:"white"}}>{["General","Technology","Management","Culture","Sales","Operations","Custom"].map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label style={lbl}>Description</label><input value={form.description} onChange={e=>set("description",e.target.value)} style={inp} placeholder="What is this template for?"/></div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10}}>Select Questions ({form.question_ids.length} selected)</div>
            {["knockout","competency","technical","culture"].map(type=>{
              const qs = questions.filter(q=>q.type===type);
              if (!qs.length) return null;
              return <div key={type} style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:TYPE_COLORS[type],textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{TYPE_LABELS[type]}</div>
                {qs.map(q=><QuestionCard key={q.id} q={q} selectable selected={form.question_ids.includes(q.id)} onToggle={toggleQ}/>)}
              </div>;
            })}
          </div>
        </div>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" onClick={handle} disabled={saving||!form.name.trim()}>{saving?"Saving…":isEdit?"Save Changes":"Create Template"}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Main QuestionBankSettings ─────────────────────────────────────────────────
export default function QuestionBankSettings() {
  const [tab, setTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAddQ, setShowAddQ] = useState(false);
  const [editQ, setEditQ] = useState(null);
  const [showAddT, setShowAddT] = useState(false);
  const [editT, setEditT] = useState(null);

  const load = useCallback(async () => {
    const [qs, ts] = await Promise.all([api.get("/question-bank/questions"), api.get("/question-bank/templates")]);
    setQuestions(Array.isArray(qs)?qs:[]);
    setTemplates(Array.isArray(ts)?ts:[]);
    setLoading(false);
  }, []);
  useEffect(()=>{load();},[load]);

  const handleSaveQ = async (form, id) => {
    if (id) await api.patch(`/question-bank/questions/${id}`, form);
    else    await api.post("/question-bank/questions", form);
    setShowAddQ(false); setEditQ(null); load();
  };
  const handleDeleteQ = async (id) => { if (!confirm("Delete this question?")) return; await api.del(`/question-bank/questions/${id}`); load(); };
  const handleSaveT = async (form, id) => {
    if (id) await api.patch(`/question-bank/templates/${id}`, form);
    else    await api.post("/question-bank/templates", form);
    setShowAddT(false); setEditT(null); load();
  };
  const handleDeleteT = async (id) => { if (!confirm("Delete this template?")) return; await api.del(`/question-bank/templates/${id}`); load(); };

  const filtered = questions.filter(q => {
    if (filterType && q.type !== filterType) return false;
    if (search) { const s=search.toLowerCase(); return q.text.toLowerCase().includes(s)||(q.competency||"").includes(s)||(q.tags||[]).some(t=>t.includes(s)); }
    return true;
  });
  const grouped = ["knockout","competency","technical","culture"].reduce((a,t)=>({...a,[t]:filtered.filter(q=>q.type===t)}),{});

  const headerSt = {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12};
  const tabSt = (active) => ({padding:"7px 16px",borderRadius:8,border:"none",background:active?C.accent:"transparent",color:active?"#fff":C.text2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"all .12s"});

  return (
    <div style={{fontFamily:F}}>
      <div style={headerSt}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text1}}>Question Bank</div>
          <div style={{fontSize:13,color:C.text3,marginTop:2}}>{questions.length} questions · {templates.length} templates</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{display:"flex",borderRadius:9,border:`1px solid ${C.border}`,overflow:"hidden",background:C.surface}}>
            {[["questions","Questions","list"],["templates","Templates","copy"]].map(([v,l,icon])=>(
              <button key={v} onClick={()=>setTab(v)} style={tabSt(tab===v)}><Ic n={icon} s={12} c={tab===v?"#fff":C.text2}/>{l}</button>
            ))}
          </div>
          {tab==="questions"&&<Btn v="primary" icon="plus" onClick={()=>setShowAddQ(true)}>Add Question</Btn>}
          {tab==="templates"&&<Btn v="primary" icon="plus" onClick={()=>setShowAddT(true)}>New Template</Btn>}
        </div>
      </div>

      {loading&&<div style={{padding:60,textAlign:"center",color:C.text3}}>Loading…</div>}

      {!loading && tab==="questions" && (
        <div>
          {/* Filters */}
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1,maxWidth:280}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex"}}>
                <Ic n="search" s={13} c={C.text3}/>
              </span>              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions…" style={{width:"100%",padding:"8px 10px 8px 32px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {["","knockout","competency","technical","culture"].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${filterType===t?(TYPE_COLORS[t]||C.accent):C.border}`,background:filterType===t?(TYPE_COLORS[t]||C.accent):"transparent",color:filterType===t?"#fff":C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                {t?TYPE_LABELS[t]:"All types"}
              </button>
            ))}
          </div>
          {/* Table view */}
          <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 130px 140px 60px 80px",gap:0,padding:"9px 16px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc"}}>
              {["Question","Type","Competency","Pts",""].map((h,i)=>(
                <div key={i} style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {filtered.length===0
              ? <div style={{padding:40,textAlign:"center",color:C.text3,fontSize:13}}>No questions match your filter.</div>
              : filtered.map((q,i)=>{
                  const col=TYPE_COLORS[q.type]||"#6b7280";
                  return (
                    <div key={q.id} style={{display:"grid",gridTemplateColumns:"1fr 130px 140px 60px 80px",gap:0,padding:"11px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",alignItems:"center",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {/* Question text */}
                      <div style={{fontSize:13,color:C.text1,lineHeight:1.45,paddingRight:12}}>
                        <span>{q.text}</span>
                        {(q.tags||[]).length>0&&<span style={{marginLeft:8}}>{(q.tags||[]).map(t=><span key={t} style={{fontSize:10,color:C.text3,background:"#f1f5f9",padding:"1px 5px",borderRadius:99,marginLeft:3}}>#{t}</span>)}</span>}
                        {q.is_system&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"#64748b",background:"#f1f5f9",padding:"1px 5px",borderRadius:99}}>system</span>}
                      </div>
                      {/* Type badge */}
                      <div><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,background:`${col}14`,color:col}}>{TYPE_LABELS[q.type]||q.type}</span></div>
                      {/* Competency */}
                      <div style={{fontSize:12,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.competency||"—"}</div>
                      {/* Weight */}
                      <div style={{fontSize:12,color:C.text2,fontWeight:600}}>{q.weight||10}</div>
                      {/* Actions */}
                      <div style={{display:"flex",gap:2,justifyContent:"flex-end"}}>
                        {!q.is_system&&<button onClick={()=>setEditQ(q)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,color:C.text3}} title="Edit"><Ic n="edit" s={13}/></button>}
                        {q.is_custom&&<button onClick={()=>handleDeleteQ(q.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,color:C.text3}} title="Delete"><Ic n="trash" s={13}/></button>}
                      </div>
                    </div>
                  );
              })
            }
          </div>
        </div>
      )}

      {!loading && tab==="templates" && (
        <div>
          {templates.length===0
            ? <div style={{padding:60,textAlign:"center",color:C.text3}}>
                <div style={{width:52,height:52,borderRadius:16,background:`${C.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ic n="copy" s={22} c={C.accent}/></div>
                <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:4}}>No templates yet</div>
                <div style={{fontSize:12,marginBottom:20}}>Create reusable question sets for different role types.</div>
                <Btn v="primary" icon="plus" onClick={()=>setShowAddT(true)}>Create First Template</Btn>
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {templates.map(t=>{
                  const catColor = CATEGORY_COLORS[t.category]||"#6b7280";
                  return (
                    <div key={t.id} style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(67,97,238,0.05)"}}>
                      <div style={{height:3,background:catColor}}/>
                      <div style={{padding:"16px 18px"}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{t.name}</div>
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${catColor}14`,color:catColor}}>{t.category}</span>
                          </div>
                          <div style={{display:"flex",gap:2}}>
                            {!t.is_system&&<button onClick={()=>setEditT(t)} style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:C.text3}}><Ic n="edit" s={13}/></button>}
                            {!t.is_system&&<button onClick={()=>handleDeleteT(t.id)} style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:C.text3}}><Ic n="trash" s={13}/></button>}
                          </div>
                        </div>
                        {t.description&&<div style={{fontSize:12,color:C.text3,lineHeight:1.4,marginBottom:10}}>{t.description}</div>}
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(t.question_ids||[]).length>0&&<span style={{fontSize:11,color:C.text3}}>{(t.question_ids||[]).length} questions</span>}
                          {t.is_system&&<span style={{fontSize:10,fontWeight:700,color:"#64748b",background:"#f1f5f9",padding:"1px 6px",borderRadius:99}}>system</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {(showAddQ||editQ)&&<QuestionModal question={editQ} onSave={handleSaveQ} onClose={()=>{setShowAddQ(false);setEditQ(null);}}/>}
      {(showAddT||editT)&&<TemplateModal template={editT} questions={questions} onSave={handleSaveT} onClose={()=>{setShowAddT(false);setEditT(null);}}/>}
    </div>
  );
}
