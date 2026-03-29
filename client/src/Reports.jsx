import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const B = {
  purple:"#7F77DD", purpleLight:"#AFA9EC", rose:"#D4537E", teal:"#1D9E75",
  amber:"#EF9F27", gray:"#888780", gray2:"#374151", bg:"#F8F7FF", card:"white",
};
const PALETTE = [B.purple,B.rose,B.teal,B.amber,B.purpleLight,"#E87FAA","#5DCAA5","#F0803C","#60A5FA","#34D399"];
const F = "'DM Sans',-apple-system,sans-serif";

const api = {
  get:    p    => fetch(p).then(r=>r.json()).catch(()=>null),
  post:   (p,b)=> fetch(p,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null),
  patch:  (p,b)=> fetch(p,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null),
  delete: p    => fetch(p,{method:"DELETE"}).then(r=>r.json()).catch(()=>null),
};

function evalFormula(expr, row) {
  try {
    const e = (expr||"").toUpperCase().trim();
    const nv = k => { const v=row[k?.toLowerCase()]; return typeof v==="number"?v:parseFloat(v)||0; };
    if (/^COUNT\(\)$/i.test(e)) return 1;
    if (/^SUM\(([^)]+)\)$/i.test(e))  { const m=e.match(/SUM\(([^)]+)\)/i);  return nv(m[1]); }
    if (/^AVG\(([^)]+)\)$/i.test(e))  { const m=e.match(/AVG\(([^)]+)\)/i);  return nv(m[1]); }
    if (/^UPPER\(([^)]+)\)$/i.test(e)){ const m=expr.match(/UPPER\(([^)]+)\)/i); return String(row[m[1].toLowerCase()]||"").toUpperCase(); }
    if (/^LOWER\(([^)]+)\)$/i.test(e)){ const m=expr.match(/LOWER\(([^)]+)\)/i); return String(row[m[1].toLowerCase()]||"").toLowerCase(); }
    if (/^LEN\(([^)]+)\)$/i.test(e))  { const m=expr.match(/LEN\(([^)]+)\)/i);   return String(row[m[1].toLowerCase()]||"").length; }
    if (/^ROUND\(([^,)]+),([^)]+)\)$/i.test(e)){const m=expr.match(/ROUND\(([^,)]+),([^)]+)\)/i);return +nv(m[1].trim()).toFixed(+m[2].trim());}
    if (/^DIFF\(([^,)]+),([^)]+)\)$/i.test(e)) {const m=e.match(/DIFF\(([^,)]+),([^)]+)\)/);    return nv(m[1].trim())-nv(m[2].trim());}
    if (/^CONCAT\(([^)]+)\)$/i.test(e)){const m=expr.match(/CONCAT\(([^)]+)\)/i);return m[1].split(",").map(p=>{const t=p.trim();return t.startsWith("{")&&t.endsWith("}")?row[t.slice(1,-1).toLowerCase()]||"":t.replace(/^['"]|['"]$/g,"");}).join("");}
    if (/^IF\(/i.test(e)){const m=expr.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);if(m){const lhs=String(row[m[1].trim().toLowerCase()]||""),rhs=m[1].includes("=")?m[1].split("=")[1].trim().replace(/^['"]|['"]$/g,""):"";return lhs===rhs?m[2].trim().replace(/^['"]|['"]$/g,""):m[3].trim().replace(/^['"]|['"]$/g,"");}}
    return null;
  } catch { return null; }
}

function validateExpr(expr, fields) {
  if (!expr) return { valid: true };
  const refs    = [...expr.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  const keys    = fields.map(f => f.api_key);
  const unknown = refs.filter(r => !keys.includes(r));
  return unknown.length ? { valid:false, error:`Unknown field${unknown.length>1?"s":""}: ${unknown.join(", ")}` } : { valid:true };
}

function Inp({ val, onChange, placeholder, mono, style={} }) {
  return <input value={val??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ width:"100%",padding:"7px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",
      fontSize:12,fontFamily:mono?"ui-monospace,monospace":F,background:"white",color:"#111827",
      boxSizing:"border-box",...style }}/>;
}
function Sel({ val, onChange, opts }) {
  return <select value={val??""} onChange={e=>onChange(e.target.value)}
    style={{ width:"100%",padding:"7px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",
      fontSize:12,fontFamily:F,background:"white",color:"#111827",boxSizing:"border-box" }}>
    <option value="">— select —</option>
    {opts.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o.value??o}</option>)}
  </select>;
}
function Pill({ label, active, onClick, badge }) {
  return <button onClick={onClick}
    style={{ padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:F,
      fontSize:11,fontWeight:active?700:500,
      background:active?B.purple:"#F3F4F6",color:active?"white":B.gray }}>
    {label}{badge?<span style={{ marginLeft:5,background:"white",color:B.purple,borderRadius:10,padding:"0 5px",fontSize:10,fontWeight:800 }}>{badge}</span>:null}
  </button>;
}
function SideLabel({ children }) {
  return <div style={{ fontSize:10,fontWeight:700,color:B.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5 }}>{children}</div>;
}

const OPS = {
  text:     ["contains","is","is not","starts with","is empty","is not empty"],
  select:   ["is","is not","is empty","is not empty"],
  boolean:  ["is true","is false"],
  number:   ["=","≠","<",">","≤","≥","is empty","is not empty"],
  currency: ["=","≠","<",">","≤","≥","is empty","is not empty"],
  date:     ["is","before","after","is empty","is not empty"],
  default:  ["contains","is","is not","is empty","is not empty"],
};

// ── AI Expression Builder ─────────────────────────────────────────────────────
function AIExpressionBuilder({ fields, onInsert, onClose }) {
  const [prompt,  setPrompt]  = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const textRef = useRef(null);
  useEffect(() => { textRef.current?.focus(); }, []);

  const numFields = fields.filter(f => ["number","currency","rating"].includes(f.field_type));
  const SYNTAX = "SUM({f}) AVG({f}) COUNT() DIFF({a},{b}) ROUND({f},N) IF({f}=v,a,b) CONCAT({a},{b}) UPPER({f}) LOWER({f}) LEN({f})";
  const fieldDocs = fields.map(f => `  {${f.api_key}} — "${f.name}" (${f.field_type})`).join("\n");

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[{role:"user",content:prompt}],
          system:`You are a formula assistant for a recruitment reporting tool.
Return ONLY the formula expression on a single line — no explanation, no code fences.

Available fields:\n${fieldDocs}\n\nFunctions: ${SYNTAX}

Rules: use {api_key} curly-brace syntax. Return one expression only.`,
          max_tokens:200,
        }),
      });
      const data = await res.json();
      const raw  = (data?.content?.[0]?.text || data?.response || "").trim();
      const expr = raw.replace(/^```[\w]*\n?/,"").replace(/\n?```$/,"").trim();
      const v    = validateExpr(expr, fields);
      setResult({ expression:expr, ...v });
    } catch { setResult({ expression:"", valid:false, error:"Could not reach AI service." }); }
    finally   { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"white",borderRadius:18,padding:24,width:520,maxWidth:"90vw",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",fontFamily:F }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:B.purple,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{ fontSize:15,fontWeight:800,color:"#0F0F19" }}>AI Expression Builder</div>
            <div style={{ fontSize:11,color:B.gray }}>Describe your calculation in plain English</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:B.gray,fontSize:18 }}>✕</button>
        </div>
        {numFields.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10,fontWeight:700,color:B.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6 }}>Numeric fields — click to insert</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
              {numFields.map(f=>(
                <span key={f.id} onClick={()=>setPrompt(p=>p+` {${f.api_key}}`)}
                  style={{ padding:"3px 8px",borderRadius:6,background:"#F5F3FF",color:B.purple,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${B.purple}30` }}>
                  {"{"+f.api_key+"}"}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:B.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6 }}>Describe your calculation</div>
          <textarea ref={textRef} value={prompt} onChange={e=>setPrompt(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) generate(); if(e.key==="Escape") onClose(); }}
            placeholder="e.g. difference between max and min salary, or count of active candidates…"
            rows={3}
            style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${B.purple}40`,fontSize:13,fontFamily:F,resize:"vertical",background:"white",boxSizing:"border-box",outline:"none",lineHeight:1.5 }}/>
          <div style={{ fontSize:10,color:B.gray,marginTop:4 }}>Cmd/Ctrl + Enter to generate</div>
        </div>
        {result && (
          <div style={{ marginBottom:16,padding:"10px 12px",borderRadius:10,background:result.valid?"#F0FDF4":"#FFF5F5",border:`1.5px solid ${result.valid?"#1D9E75":"#D4537E"}40` }}>
            <div style={{ fontSize:10,fontWeight:700,color:result.valid?B.teal:B.rose,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6 }}>
              {result.valid?"✓ Expression ready":"⚠ Issues found"}
            </div>
            <div style={{ fontFamily:"ui-monospace,monospace",fontSize:13,color:"#111827",wordBreak:"break-all" }}>{result.expression}</div>
            {result.error && <div style={{ fontSize:11,color:B.rose,marginTop:5 }}>{result.error}</div>}
          </div>
        )}
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:"9px",borderRadius:9,border:"1.5px solid #E5E7EB",background:"white",color:B.gray,fontFamily:F,fontWeight:600,fontSize:12,cursor:"pointer" }}>Cancel</button>
          <button onClick={generate} disabled={loading||!prompt.trim()}
            style={{ flex:2,padding:"9px",borderRadius:9,border:"none",background:B.purple,color:"white",fontFamily:F,fontWeight:700,fontSize:12,cursor:loading||!prompt.trim()?"not-allowed":"pointer",opacity:loading||!prompt.trim()?0.6:1 }}>
            {loading?"Generating…":"✨ Generate"}
          </button>
          {result?.valid && (
            <button onClick={()=>{ onInsert(result.expression); onClose(); }}
              style={{ flex:2,padding:"9px",borderRadius:9,border:"none",background:B.teal,color:"white",fontFamily:F,fontWeight:700,fontSize:12,cursor:"pointer" }}>
              Insert →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FormulaInput — expression input with field picker + AI button ─────────────
function FormulaInput({ value, onChange, fields, placeholder }) {
  const [showPicker, setShowPicker] = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [search,     setSearch]     = useState("");
  const inputRef = useRef(null);
  const validation = useMemo(() => validateExpr(value, fields), [value, fields]);

  const insertField = key => {
    const el = inputRef.current;
    if (!el) { onChange((value||"")+"{"+key+"}"); setShowPicker(false); return; }
    const s=el.selectionStart, e2=el.selectionEnd, cur=value||"";
    onChange(cur.slice(0,s)+"{"+key+"}"+cur.slice(e2));
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+key.length+2,s+key.length+2); },0);
    setShowPicker(false);
  };

  const filtered = fields.filter(f=>!search||f.name.toLowerCase().includes(search.toLowerCase())||f.api_key.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex",gap:4,alignItems:"center" }}>
        <input ref={inputRef} value={value??""} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder||"e.g. DIFF({salary_max},{salary_min})"}
          style={{ flex:1,padding:"7px 9px",borderRadius:8,
            border:validation.valid===false?`1.5px solid ${B.rose}`:"1.5px solid #E5E7EB",
            fontSize:12,fontFamily:"ui-monospace,monospace",background:"white",color:"#111827" }}/>
        <button onClick={()=>{setShowPicker(p=>!p);setShowAI(false);setSearch("");}}
          title="Insert field" onMouseDown={e=>e.preventDefault()}
          style={{ padding:"6px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",background:showPicker?"#F5F3FF":"white",color:B.purple,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F }}>
          {"{…}"}
        </button>
        <button onClick={()=>setShowAI(true)} title="AI Expression Builder"
          style={{ padding:"6px 9px",borderRadius:8,border:"none",background:B.purple,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap" }}>
          ✨ AI
        </button>
      </div>
      {value && !validation.valid && <div style={{ fontSize:10,color:B.rose,marginTop:3 }}>{validation.error}</div>}
      {showPicker && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:400,background:"white",border:"1.5px solid #E5E7EB",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",padding:10,width:260,maxHeight:240,display:"flex",flexDirection:"column" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fields…" autoFocus
            style={{ padding:"6px 9px",borderRadius:7,border:"1px solid #E5E7EB",fontSize:11,fontFamily:F,marginBottom:8 }}/>
          <div style={{ overflowY:"auto" }}>
            {filtered.map(f=>(
              <div key={f.id} onClick={()=>insertField(f.api_key)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F3FF"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ fontFamily:"ui-monospace,monospace",fontSize:11,color:B.purple,background:"#F5F3FF",padding:"2px 6px",borderRadius:4 }}>{f.api_key}</span>
                <span style={{ fontSize:11,color:B.gray }}>{f.name}</span>
              </div>
            ))}
            {!filtered.length && <div style={{ fontSize:11,color:B.gray,padding:8,textAlign:"center" }}>No fields</div>}
          </div>
        </div>
      )}
      {showAI && <AIExpressionBuilder fields={fields} onInsert={onChange} onClose={()=>setShowAI(false)}/>}
    </div>
  );
}

// ── Schedule modal ────────────────────────────────────────────────────────────
function ScheduleModal({ savedView, environment, onClose }) {
  const [freq,   setFreq]   = useState("weekly");
  const [day,    setDay]    = useState(1);
  const [hour,   setHour]   = useState(9);
  const [emails, setEmails] = useState("");
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const save = async () => {
    const recipients = emails.split(/[,\n]+/).map(e=>e.trim()).filter(Boolean);
    if (!recipients.length) return;
    setSaving(true);
    await api.post("/scheduled-reports", {
      saved_view_id:savedView.id, name:savedView.name,
      environment_id:environment.id, frequency:freq, day_of_week:day, hour, recipients,
    });
    setSaving(false); setDone(true);
  };

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const HOURS = Array.from({length:24},(_,i)=>({ value:i, label:i===0?"12 AM":i<12?`${i} AM`:i===12?"12 PM":`${i-12} PM` }));

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"white",borderRadius:18,padding:24,width:440,fontFamily:F,boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ fontSize:15,fontWeight:800,color:"#0F0F19" }}>Schedule Report</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:B.gray,fontSize:18 }}>✕</button>
        </div>
        {done ? (
          <div style={{ textAlign:"center",padding:"20px 0" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14,fontWeight:700,color:"#0F0F19" }}>Schedule saved</div>
            <div style={{ fontSize:12,color:B.gray,marginTop:4 }}>{savedView.name} will be emailed {freq}</div>
            <button onClick={onClose} style={{ marginTop:16,padding:"8px 20px",borderRadius:9,border:"none",background:B.purple,color:"white",fontFamily:F,fontWeight:700,cursor:"pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:12 }}><SideLabel>Report</SideLabel>
              <div style={{ fontSize:13,fontWeight:600,color:"#0F0F19" }}>{savedView.name}</div></div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
              <div><SideLabel>Frequency</SideLabel>
                <Sel val={freq} onChange={setFreq} opts={["daily","weekly","monthly"].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))}/></div>
              {freq==="weekly"&&<div><SideLabel>Day</SideLabel><Sel val={day} onChange={v=>setDay(+v)} opts={DAYS.map((d,i)=>({value:i,label:d}))}/></div>}
              <div><SideLabel>Send at</SideLabel><Sel val={hour} onChange={v=>setHour(+v)} opts={HOURS.map(h=>({value:h.value,label:h.label}))}/></div>
            </div>
            <div style={{ marginBottom:16 }}>
              <SideLabel>Recipients (one per line or comma-separated)</SideLabel>
              <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={3}
                placeholder="recruiter@company.com, manager@company.com"
                style={{ width:"100%",padding:"8px 10px",borderRadius:9,border:"1.5px solid #E5E7EB",fontSize:12,fontFamily:F,resize:"vertical",boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={onClose} style={{ flex:1,padding:"9px",borderRadius:9,border:"1.5px solid #E5E7EB",background:"white",color:B.gray,fontFamily:F,fontWeight:600,cursor:"pointer" }}>Cancel</button>
              <button onClick={save} disabled={saving||!emails.trim()}
                style={{ flex:2,padding:"9px",borderRadius:9,border:"none",background:B.purple,color:"white",fontFamily:F,fontWeight:700,cursor:saving||!emails.trim()?"not-allowed":"pointer",opacity:saving||!emails.trim()?0.6:1 }}>
                {saving?"Saving…":"Save Schedule"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultRow({ row, cols, groupBy, chartX, onFilter }) {
  const [hov,setHov]=useState(false);
  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderBottom:"1px solid #F3F4F6",background:hov?"#FAFAFF":"white",transition:"background 0.1s" }}>
      {cols.map(k=>(
        <td key={k} style={{ padding:"9px 10px",color:k==="_count"?B.purple:B.gray2,fontWeight:k==="_count"?700:400,cursor:groupBy&&k==="_group"?"pointer":"default",fontSize:12 }}
          onClick={()=>{ if(groupBy&&k==="_group"&&row[k]) onFilter(groupBy,row[k]); }}>
          {k==="_count"?<span style={{ color:B.purple,fontWeight:700 }}>{row[k]}</span>:String(row[k]??"—").slice(0,60)}
          {groupBy&&k==="_group"&&hov&&<span style={{ fontSize:10,color:B.purple,marginLeft:6 }}>↗</span>}
        </td>
      ))}
    </tr>
  );
}

// ── Main Reports component ────────────────────────────────────────────────────
export default function Reports({ environment, initialReport }) {
  const [objects,       setObjects]       = useState([]);
  const [fields,        setFields]        = useState([]);
  const [selObject,     setSelObject]     = useState("");
  const [selCols,       setSelCols]       = useState([]);
  const [filters,       setFilters]       = useState([]);
  const [groupBy,       setGroupBy]       = useState("");
  const [sortBy,        setSortBy]        = useState("");
  const [sortDir,       setSortDir]       = useState("desc");
  const [formulas,      setFormulas]      = useState([]);
  const [chartType,     setChartType]     = useState("bar");
  const [chartX,        setChartX]        = useState("");
  const [chartY,        setChartY]        = useState("");
  const [results,       setResults]       = useState(null);
  const [running,       setRunning]       = useState(false);
  const [panel,         setPanel]         = useState("build");
  const [savedReports,  setSavedReports]  = useState([]);
  const [reportName,    setReportName]    = useState("");
  const [reportShared,  setReportShared]  = useState(false);
  const [savingReport,  setSavingReport]  = useState(false);
  const [showSaveDialog,setShowSaveDialog]= useState(false);
  const [activeFilter,  setActiveFilter]  = useState(null);
  const [scheduleView,  setScheduleView]  = useState(null);
  const [forms,         setForms]         = useState([]);
  const [dataMode,      setDataMode]      = useState("records");
  const [selForm,       setSelForm]       = useState("");
  const [joinObject,    setJoinObject]    = useState("");
  const skipReset   = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(d=>setObjects(Array.isArray(d)?d:[]));
    api.get(`/forms?environment_id=${environment.id}`).then(d=>setForms(Array.isArray(d)?d:[]));
  }, [environment?.id]);

  useEffect(() => {
    if (!selObject) return;
    api.get(`/fields?object_id=${selObject}`).then(d => {
      const f = Array.isArray(d)?d:[];
      setFields(f);
      if (!skipReset.current) {
        setSelCols(f.filter(x=>x.show_in_list).map(x=>x.id));
        setGroupBy(""); setSortBy(""); setFilters([]);
        setFormulas([]); setChartX(""); setChartY(""); setResults(null); setActiveFilter(null); setJoinObject("");
      }
      skipReset.current = false;
    });
  }, [selObject]);

  useEffect(() => {
    if (!initialReport||!objects.length) return;
    const obj = objects.find(o=>o.slug===initialReport.object||o.name?.toLowerCase().includes(initialReport.object));
    if (obj) {
      skipReset.current = true;
      setSelObject(obj.id);
      if (initialReport.groupBy)   setGroupBy(initialReport.groupBy);
      if (initialReport.chartType) setChartType(initialReport.chartType);
      if (initialReport.formulas)  setFormulas(initialReport.formulas);
      if (initialReport.filters)   setFilters(initialReport.filters);
      setPanel(initialReport.formulas?.length?"formulas":"build");
      setTimeout(()=>runReport(obj.id,initialReport.groupBy),400);
    }
  }, [initialReport, objects]);

  // Auto-run on config change
  useEffect(() => {
    if (!selObject && !(dataMode==="forms"&&selForm)) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(()=>runReport(),600);
    return ()=>clearTimeout(debounceRef.current);
  }, [filters, selCols, groupBy, sortBy, sortDir, joinObject]);

  function applyFilter(row, f) {
    const v=String(row[f.field]??"").toLowerCase(), fv=String(f.value??"").toLowerCase();
    switch(f.op) {
      case "contains": return v.includes(fv);
      case "is": return v===fv;
      case "is not": return v!==fv;
      case "starts with": return v.startsWith(fv);
      case "is empty": return !row[f.field];
      case "is not empty": return !!row[f.field];
      case "is true":  return row[f.field]===true||row[f.field]==="true";
      case "is false": return row[f.field]===false||row[f.field]==="false";
      case "=":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n===nv; }
      case "≠":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n!==nv; }
      case "<":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n<nv; }
      case ">":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n>nv; }
      case "≤":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n<=nv; }
      case "≥":  { const n=parseFloat(row[f.field]),nv=parseFloat(f.value); return !isNaN(n)&&n>=nv; }
      case "before": { const d=new Date(row[f.field]),dv=new Date(f.value); return !isNaN(d)&&d<dv; }
      case "after":  { const d=new Date(row[f.field]),dv=new Date(f.value); return !isNaN(d)&&d>dv; }
      default: return true;
    }
  }

  const runReport = useCallback(async (objectId, grpBy) => {
    const oid = objectId||selObject;
    const grp = grpBy??groupBy;
    if (!environment?.id) return;
    if (dataMode==="forms") {
      if (!selForm) return;
      setRunning(true);
      try {
        const res = await api.get(`/forms/${selForm}/responses`);
        let rows  = (Array.isArray(res)?res:[]).map(r=>({_id:r.id,_createdAt:r.submitted_at,...r.data}));
        const af  = filters.filter(f=>f.field&&f.op);
        if (af.length) rows = rows.filter(row=>af.every(f=>applyFilter(row,f)));
        if (grp) {
          const counts={};
          rows.forEach(row=>{const v=String(row[grp]??"Unknown");counts[v]=(counts[v]||0)+1;});
          rows=Object.entries(counts).map(([k,v])=>({_group:k,[grp]:k,_count:v})).sort((a,b)=>b._count-a._count);
        }
        setResults(rows); setActiveFilter(null);
      } finally { setRunning(false); }
      return;
    }
    if (!oid) return;
    setRunning(true);
    try {
      const res = await api.get(`/records?object_id=${oid}&environment_id=${environment.id}&limit=500`);
      let rows  = (Array.isArray(res?.records)?res.records:[]).map(r=>({_id:r.id,_createdAt:r.created_at,...r.data}));
      // Cross-object join
      if (joinObject) {
        const jObj = objects.find(o=>o.id===joinObject);
        if (jObj) {
          const jRes = await api.get(`/records?object_id=${joinObject}&environment_id=${environment.id}&limit=500`);
          const jMap = (Array.isArray(jRes?.records)?jRes.records:[]).reduce((acc,r)=>{acc[r.id]=r.data;return acc;},{});
          const lRes = await api.get(`/people-links?object_id=${oid}&environment_id=${environment.id}`);
          const links= Array.isArray(lRes)?lRes:[];
          rows = rows.map(row=>{
            const link = links.find(l=>l.record_id===row._id||l.person_id===row._id);
            const joined = link?(jMap[link.record_id]||jMap[link.person_id]||{}):{};
            const prefixed={};
            Object.entries(joined).forEach(([k,v])=>{prefixed[`${jObj.slug||"join"}.${k}`]=v;});
            return {...row,...prefixed};
          });
        }
      }
      const af = filters.filter(f=>f.field&&f.op);
      if (af.length) rows=rows.filter(row=>af.every(f=>applyFilter(row,f)));
      if (formulas.length) rows=rows.map(row=>{
        const extra={};
        formulas.forEach(f=>{if(f.name&&f.expression) extra[f.name]=evalFormula(f.expression,row);});
        return {...row,...extra};
      });
      if (sortBy) rows.sort((a,b)=>sortDir==="asc"?String(a[sortBy]??"").localeCompare(String(b[sortBy]??"")):String(b[sortBy]??"").localeCompare(String(a[sortBy]??"")));
      if (grp) {
        const counts={};
        rows.forEach(row=>{const val=String(row[grp]??"Unknown");counts[val]=(counts[val]||0)+1;});
        rows=Object.entries(counts).map(([k,v])=>({_group:k,[grp]:k,_count:v})).sort((a,b)=>b._count-a._count);
      }
      setResults(rows); setActiveFilter(null);
      if (!chartX&&rows.length) setChartX(grp||Object.keys(rows[0]).find(k=>!k.startsWith("_"))||"_group");
      if (!chartY&&rows.length&&grp) setChartY("_count");
    } finally { setRunning(false); }
  }, [selObject,environment,filters,groupBy,sortBy,sortDir,formulas,joinObject,dataMode,selForm,objects,chartX,chartY]);

  const saveReport = async () => {
    if (!reportName.trim()) return;
    setSavingReport(true);
    const d = await api.post("/saved-views", {
      name:reportName.trim(), object_id:selObject,
      environment_id:environment.id, is_shared:reportShared,
      filters, columns:selCols, group_by:groupBy, sort_by:sortBy, sort_dir:sortDir,
      formulas, chart_type:chartType, chart_x:chartX, chart_y:chartY,
    });
    if (d?.id) { setSavedReports(p=>[...p,d]); setReportName(""); setShowSaveDialog(false); }
    setSavingReport(false);
  };

  const loadReport = sv => {
    skipReset.current = true;
    if (sv.object_id) setSelObject(sv.object_id);
    if (sv.filters)    setFilters(sv.filters);
    if (sv.group_by)   setGroupBy(sv.group_by);
    if (sv.sort_by)    setSortBy(sv.sort_by);
    if (sv.sort_dir)   setSortDir(sv.sort_dir);
    if (sv.formulas)   setFormulas(sv.formulas);
    if (sv.chart_type) setChartType(sv.chart_type);
    if (sv.chart_x)    setChartX(sv.chart_x);
    if (sv.chart_y)    setChartY(sv.chart_y);
    if (sv.columns)    setSelCols(sv.columns);
    setTimeout(()=>runReport(sv.object_id,sv.group_by),300);
  };

  const pinReport = async sv => {
    const next = !sv.pinned;
    await api.patch(`/saved-views/${sv.id}`,{pinned:next});
    setSavedReports(prev=>prev.map(r=>r.id===sv.id?{...r,pinned:next}:r));
  };

  const deleteReport = async id => {
    await api.delete(`/saved-views/${id}`);
    setSavedReports(p=>p.filter(s=>s.id!==id));
  };

  const addFilter  = () => setFilters(p=>[...p,{id:Date.now(),field:fields[0]?.api_key||"",op:"contains",value:""}]);
  const addFormula = () => setFormulas(p=>[...p,{id:Date.now(),name:"",expression:""}]);

  const exportCSV = () => {
    if (!displayedResults?.length) return;
    const cols  = groupBy?[]:fields.filter(f=>selCols.includes(f.id));
    const heads = groupBy?["Group","Count"]:cols.map(f=>f.name);
    const rows  = displayedResults.map(r=>groupBy?[r._group,r._count]:cols.map(f=>JSON.stringify(r[f.api_key]??"")));
    const csv   = [heads,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=`report-${Date.now()}.csv`; a.click();
  };

  const handleChartClick = data => {
    const val=data?.activePayload?.[0]?.payload?.[chartX]??data?.activePayload?.[0]?.payload?._group;
    if (val) setActiveFilter(prev=>prev===String(val)?null:String(val));
  };
  const handlePieClick = entry => {
    const val=entry?.name||entry?.[chartX];
    if (val) setActiveFilter(prev=>prev===String(val)?null:String(val));
  };

  const displayedResults = useMemo(()=>{
    if (!results) return null;
    if (!activeFilter) return results;
    return results.filter(r=>String(r[chartX]||r._group||"")===activeFilter);
  },[results,activeFilter,chartX]);

  const resultCols = useMemo(()=>{
    if (!results?.length) return [];
    return Object.keys(results[0]).filter(k=>!k.startsWith("_")||k==="_count"||k==="_group");
  },[results]);

  const chartData = results?.slice(0,30)||[];

  const goToFiltered = (filterKey,filterValue) => {
    const obj=objects.find(o=>o.id===selObject);
    if (!obj) return;
    window.dispatchEvent(new CustomEvent("talentos:filter-navigate",{detail:{objectSlug:obj.slug,fieldKey:filterKey,fieldValue:filterValue}}));
  };

  const renderChart = () => {
    if (!chartData.length) return null;
    const tip = {contentStyle:{fontSize:12,fontFamily:F,borderRadius:8}};
    const xKey = chartX||"_group";
    const yKey = chartY||"_count";

    if (chartType==="bar") return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{top:4,right:8,left:-20,bottom:0}} onClick={handleChartClick}>
          <XAxis dataKey={xKey} tick={{fontSize:10}} interval={0}/>
          <YAxis tick={{fontSize:10}}/><Tooltip {...tip}/>
          <Bar dataKey={yKey} radius={[4,4,0,0]}>{chartData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    );
    if (chartType==="stacked") {
      const yVals=chartY?[...new Set(chartData.map(r=>String(r[chartY]||"")))]:[yKey];
      const xVals=[...new Set(chartData.map(r=>String(r[xKey]||"")))];
      const sd=xVals.map(xv=>{
        const row={[xKey]:xv};
        yVals.forEach(yv=>{row[yv]=chartData.filter(r=>String(r[xKey]||"")===xv&&String(r[chartY]||"")===yv).reduce((s,r)=>s+(r._count||1),0);});
        return row;
      });
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sd} margin={{top:4,right:8,left:-20,bottom:0}}>
            <XAxis dataKey={xKey} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
            <Tooltip {...tip}/><Legend wrapperStyle={{fontSize:11}}/>
            {yVals.slice(0,8).map((yv,i)=><Bar key={yv} dataKey={yv} stackId="a" fill={PALETTE[i%PALETTE.length]} radius={i===yVals.length-1?[4,4,0,0]:[0,0,0,0]}/>)}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartType==="line") return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{top:4,right:8,left:-20,bottom:0}} onClick={handleChartClick}>
          <XAxis dataKey={xKey} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip {...tip}/>
          <Line type="monotone" dataKey={yKey} stroke={B.purple} strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    );
    if (chartType==="area") return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{top:4,right:8,left:-20,bottom:0}} onClick={handleChartClick}>
          <XAxis dataKey={xKey} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip {...tip}/>
          <Area type="monotone" dataKey={yKey} stroke={B.purple} fill={B.purple+"22"} strokeWidth={2}/>
        </AreaChart>
      </ResponsiveContainer>
    );
    if (chartType==="pie") return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={90}
            onClick={(_,i)=>handlePieClick(chartData[i])}>
            {chartData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
          </Pie>
          <Tooltip {...tip} formatter={v=>[v,"Count"]}/><Legend wrapperStyle={{fontSize:11}}/>
        </PieChart>
      </ResponsiveContainer>
    );
    if (chartType==="funnel") {
      const fd=chartData.map((r,i)=>({value:+(r[yKey]||0),name:String(r[xKey]||i),fill:PALETTE[i%PALETTE.length]}));
      return (
        <ResponsiveContainer width="100%" height={220}>
          <FunnelChart><Tooltip {...tip}/>
            <Funnel data={fd} dataKey="value" isAnimationActive>
              <LabelList position="inside" fill="#fff" style={{fontSize:11,fontWeight:700}}/>
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    }
    if (chartType==="scatter") {
      const sd=chartData.map(r=>({x:parseFloat(r[xKey])||0,y:parseFloat(r[yKey])||0,z:1,name:String(r[xKey]||"")}));
      return (
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{top:4,right:8,left:-20,bottom:0}}>
            <XAxis dataKey="x" type="number" name={xKey} tick={{fontSize:10}}/>
            <YAxis dataKey="y" type="number" name={yKey} tick={{fontSize:10}}/>
            <ZAxis dataKey="z" range={[40,40]}/><Tooltip cursor={{strokeDasharray:"3 3"}} {...tip}/>
            <Scatter data={sd} fill={B.purple}/>
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    return null;
  };

  const CHART_TYPES = [
    {value:"table",label:"Table"},{value:"bar",label:"Bar"},{value:"stacked",label:"Stacked"},
    {value:"line",label:"Line"},{value:"area",label:"Area"},{value:"pie",label:"Pie"},
    {value:"funnel",label:"Funnel"},{value:"scatter",label:"Scatter"},
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:B.bg,minHeight:"100vh",padding:"28px 32px",fontFamily:F }}>
      {scheduleView && <ScheduleModal savedView={scheduleView} environment={environment} onClose={()=>setScheduleView(null)}/>}

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:24 }}>
        <div>
          <div style={{ fontSize:24,fontWeight:800,color:"#0F0F19",letterSpacing:"-0.03em" }}>Reports</div>
          <div style={{ fontSize:13,color:B.gray,marginTop:4 }}>Build, save and schedule reports from any data</div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={exportCSV} style={{ fontSize:11,padding:"7px 14px",borderRadius:20,border:"1.5px solid #E5E7EB",background:B.card,color:B.gray,cursor:"pointer",fontFamily:F }}>Export CSV</button>
          <button onClick={()=>setShowSaveDialog(true)} style={{ fontSize:11,padding:"7px 14px",borderRadius:20,border:"1.5px solid #E5E7EB",background:B.card,color:B.gray,cursor:"pointer",fontFamily:F }}>Save report</button>
          <button onClick={()=>runReport()} style={{ fontSize:11,padding:"7px 14px",borderRadius:20,border:"none",background:B.purple,color:"#fff",cursor:"pointer",fontFamily:F,fontWeight:700 }}>
            {running?"Running…":"▶ Run"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"280px minmax(0,1fr)",gap:16 }}>

        {/* ── Left sidebar ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
            <Pill label="Build"    active={panel==="build"}    onClick={()=>setPanel("build")}/>
            <Pill label="∑ Formulas" active={panel==="formulas"} onClick={()=>setPanel("formulas")} badge={formulas.filter(f=>f.expression).length||null}/>
            <Pill label="Saved"    active={panel==="saved"}    onClick={()=>setPanel("saved")} badge={savedReports.length||null}/>
          </div>

          {/* Build panel */}
          {panel==="build" && (
            <div style={{ background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <SideLabel>Data source</SideLabel>
                <div style={{ display:"flex",gap:4,marginBottom:8 }}>
                  {["records","forms"].map(m=>(
                    <button key={m} onClick={()=>setDataMode(m)}
                      style={{ flex:1,padding:"5px",borderRadius:7,border:`1.5px solid ${dataMode===m?B.purple:"#E5E7EB"}`,background:dataMode===m?"#F5F3FF":"white",color:dataMode===m?B.purple:B.gray,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F }}>
                      {m.charAt(0).toUpperCase()+m.slice(1)}
                    </button>
                  ))}
                </div>
                {dataMode==="records"
                  ? <Sel val={selObject} onChange={v=>{setSelObject(v);setJoinObject("");}} opts={objects.map(o=>({value:o.id,label:o.plural_name||o.name}))}/>
                  : <Sel val={selForm} onChange={setSelForm} opts={forms.map(f=>({value:f.id,label:f.name}))}/>}
              </div>
              {dataMode==="records"&&selObject&&(
                <div>
                  <SideLabel>Join with (optional)</SideLabel>
                  <Sel val={joinObject} onChange={setJoinObject}
                    opts={[{value:"",label:"None"},...objects.filter(o=>o.id!==selObject).map(o=>({value:o.id,label:o.plural_name||o.name}))]}/>
                  {joinObject&&<div style={{ fontSize:10,color:B.teal,marginTop:4 }}>✓ Merged via pipeline links</div>}
                </div>
              )}
              {fields.length>0&&(
                <div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5 }}>
                    <SideLabel>Columns</SideLabel>
                    <button onClick={()=>setSelCols(fields.map(f=>f.id))} style={{ fontSize:10,color:B.purple,background:"none",border:"none",cursor:"pointer",fontFamily:F }}>All</button>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                    {fields.map(f=>(
                      <label key={f.id} style={{ display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:12,color:B.gray2 }}>
                        <input type="checkbox" checked={selCols.includes(f.id)}
                          onChange={e=>setSelCols(p=>e.target.checked?[...p,f.id]:p.filter(x=>x!==f.id))}
                          style={{ accentColor:B.purple }}/>{f.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5 }}>
                  <SideLabel>Filters</SideLabel>
                  <button onClick={addFilter} style={{ fontSize:10,color:B.purple,background:"none",border:"none",cursor:"pointer",fontFamily:F }}>+ Add</button>
                </div>
                {filters.map((f,i)=>(
                  <div key={f.id} style={{ background:"#F9F9FB",borderRadius:9,padding:8,marginBottom:6 }}>
                    <div style={{ display:"flex",gap:4,marginBottom:4 }}>
                      <div style={{ flex:1 }}><Sel val={f.field} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,field:v}:x))} opts={fields.map(fi=>({value:fi.api_key,label:fi.name}))}/></div>
                      <button onClick={()=>setFilters(p=>p.filter((_,j)=>j!==i))} style={{ fontSize:12,color:B.rose,background:"none",border:"none",cursor:"pointer",padding:"0 4px" }}>×</button>
                    </div>
                    <div style={{ display:"flex",gap:4 }}>
                      <div style={{ flex:1 }}><Sel val={f.op} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,op:v}:x))} opts={(OPS[fields.find(fi=>fi.api_key===f.field)?.field_type]||OPS.default).map(o=>({value:o,label:o}))}/></div>
                      {!["is empty","is not empty","is true","is false"].includes(f.op)&&(
                        <div style={{ flex:1 }}><Inp val={f.value} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,value:v}:x))} placeholder="value…"/></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {fields.length>0&&(
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <div><SideLabel>Group by</SideLabel>
                    <Sel val={groupBy} onChange={setGroupBy} opts={[{value:"",label:"None"},...fields.map(f=>({value:f.api_key,label:f.name}))]}/></div>
                  <div><SideLabel>Sort by</SideLabel>
                    <Sel val={sortBy} onChange={setSortBy} opts={[{value:"",label:"None"},...fields.map(f=>({value:f.api_key,label:f.name}))]}/></div>
                </div>
              )}
            </div>
          )}

          {/* Formulas panel */}
          {panel==="formulas"&&(
            <div style={{ background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#111827" }}>Calculated columns</div>
                <button onClick={addFormula} style={{ fontSize:11,color:B.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:F }}>+ Add</button>
              </div>
              {formulas.length===0&&<div style={{ fontSize:12,color:B.gray,textAlign:"center",padding:"16px 0" }}>No formulas yet</div>}
              {formulas.map((f,i)=>(
                <div key={f.id} style={{ marginBottom:12,background:"#F8F7FF",borderRadius:10,padding:10 }}>
                  <div style={{ display:"flex",gap:4,marginBottom:6 }}>
                    <div style={{ flex:1 }}><Inp val={f.name} onChange={v=>setFormulas(p=>p.map((x,j)=>j===i?{...x,name:v}:x))} placeholder="Column name…"/></div>
                    <button onClick={()=>setFormulas(p=>p.filter((_,j)=>j!==i))} style={{ fontSize:12,color:B.rose,background:"none",border:"none",cursor:"pointer" }}>×</button>
                  </div>
                  <FormulaInput value={f.expression} onChange={v=>setFormulas(p=>p.map((x,j)=>j===i?{...x,expression:v}:x))} fields={fields} placeholder="DIFF({salary_max},{salary_min})"/>
                </div>
              ))}
              <div style={{ marginTop:12,padding:"10px 12px",background:`${B.purple}08`,borderRadius:10,fontSize:11,color:B.gray,lineHeight:1.6 }}>
                <strong style={{ color:B.purple }}>Functions:</strong>{" "}SUM · AVG · COUNT() · DIFF(a,b) · ROUND(f,N) · IF(x=y,a,b) · CONCAT(a,b) · UPPER · LOWER · LEN
              </div>
            </div>
          )}

          {/* Saved reports panel */}
          {panel==="saved"&&(
            <div style={{ background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#111827",marginBottom:12 }}>Saved reports</div>
              {showSaveDialog&&(
                <div style={{ background:"#F8F7FF",borderRadius:10,padding:12,marginBottom:12 }}>
                  <input key="save-input" defaultValue={reportName} onChange={e=>setReportName(e.target.value)}
                    placeholder="Report name…"
                    style={{ width:"100%",padding:"7px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",fontSize:12,fontFamily:F,marginBottom:8,boxSizing:"border-box" }}/>
                  <label style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:B.gray,cursor:"pointer",marginBottom:10 }}>
                    <input type="checkbox" checked={reportShared} onChange={e=>setReportShared(e.target.checked)} style={{ accentColor:B.purple }}/>Share with all users
                  </label>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>{setShowSaveDialog(false);setReportName("");}} style={{ flex:1,fontSize:11,padding:"6px",borderRadius:8,border:"none",background:"#E5E7EB",color:B.gray,cursor:"pointer",fontFamily:F }}>Cancel</button>
                    <button onClick={saveReport} disabled={!reportName||savingReport} style={{ flex:1,fontSize:11,padding:"6px",borderRadius:8,border:"none",background:B.purple,color:"#fff",cursor:"pointer",fontFamily:F,fontWeight:700 }}>{savingReport?"Saving…":"Save"}</button>
                  </div>
                </div>
              )}
              {!showSaveDialog&&<button onClick={()=>setShowSaveDialog(true)} style={{ width:"100%",padding:"8px",borderRadius:9,border:"1.5px dashed #D1D5DB",background:"transparent",color:B.gray,cursor:"pointer",fontFamily:F,fontSize:12,marginBottom:10 }}>+ Save current report</button>}
              {savedReports.length===0&&<div style={{ fontSize:12,color:B.gray,textAlign:"center",padding:"8px 0" }}>No saved reports</div>}
              {savedReports.map(sv=>(
                <div key={sv.id} style={{ background:"#F8F7FF",borderRadius:10,padding:10,marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                    <span style={{ flex:1,fontSize:12,fontWeight:600,color:"#111827" }}>{sv.name}</span>
                    {sv.is_shared&&<span style={{ fontSize:10,color:B.teal,background:"#F0FDF4",padding:"2px 7px",borderRadius:10,fontWeight:700 }}>shared</span>}
                  </div>
                  <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                    <button onClick={()=>loadReport(sv)} style={{ fontSize:10,padding:"4px 9px",borderRadius:7,border:"none",background:B.purple,color:"white",cursor:"pointer",fontFamily:F,fontWeight:700 }}>Load</button>
                    <button onClick={()=>pinReport(sv)} title={sv.pinned?"Unpin from dashboard":"Pin to dashboard"}
                      style={{ fontSize:10,padding:"4px 9px",borderRadius:7,border:`1.5px solid ${sv.pinned?B.amber:"#E5E7EB"}`,background:sv.pinned?"#FFFBEB":"white",color:sv.pinned?B.amber:B.gray,cursor:"pointer",fontFamily:F,fontWeight:700 }}>
                      {sv.pinned?"📌 Pinned":"Pin"}
                    </button>
                    <button onClick={()=>setScheduleView(sv)} style={{ fontSize:10,padding:"4px 9px",borderRadius:7,border:"1.5px solid #E5E7EB",background:"white",color:B.gray,cursor:"pointer",fontFamily:F }}>Schedule</button>
                    <button onClick={()=>deleteReport(sv.id)} style={{ fontSize:10,padding:"4px 9px",borderRadius:7,border:"none",background:"#FFF5F5",color:B.rose,cursor:"pointer",fontFamily:F }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: results ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {results&&results.length>0&&(
            <div style={{ background:B.card,borderRadius:14,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                {CHART_TYPES.map(ct=>(
                  <button key={ct.value} onClick={()=>setChartType(ct.value)}
                    style={{ padding:"5px 11px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:chartType===ct.value?700:500,background:chartType===ct.value?B.purple:"#F3F4F6",color:chartType===ct.value?"white":B.gray }}>
                    {ct.label}
                  </button>
                ))}
              </div>
              {chartType!=="table"&&(
                <>
                  <select value={chartX} onChange={e=>setChartX(e.target.value)} style={{ padding:"5px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",fontSize:11,fontFamily:F,color:B.gray2,background:"white" }}>
                    <option value="">X axis</option>
                    {resultCols.map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                  {!["pie","funnel"].includes(chartType)&&(
                    <select value={chartY} onChange={e=>setChartY(e.target.value)} style={{ padding:"5px 9px",borderRadius:8,border:"1.5px solid #E5E7EB",fontSize:11,fontFamily:F,color:B.gray2,background:"white" }}>
                      <option value="">Y axis</option>
                      {resultCols.map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  )}
                  {activeFilter&&<button onClick={()=>setActiveFilter(null)} style={{ fontSize:11,padding:"4px 10px",borderRadius:14,border:`1.5px solid ${B.purple}`,background:"#F5F3FF",color:B.purple,cursor:"pointer",fontFamily:F }}>{activeFilter} ×</button>}
                </>
              )}
            </div>
          )}
          {results&&results.length>0&&chartType!=="table"&&(
            <div style={{ background:B.card,borderRadius:14,padding:"16px 16px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>{renderChart()}</div>
          )}
          <div style={{ background:B.card,borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",overflow:"hidden" }}>
            {running ? (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:180,color:B.gray,gap:10 }}>
                <svg style={{ animation:"spin 1s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.purple} strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Running…<style>{"@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>
              </div>
            ) : !results ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:220,color:B.gray }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={B.purpleLight} strokeWidth="1.5" style={{ marginBottom:12 }}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                <div style={{ fontSize:14,fontWeight:600,color:"#374151",marginBottom:4 }}>Configure and run your report</div>
                <div style={{ fontSize:12,color:B.gray }}>Pick a data source, choose columns and click Run</div>
              </div>
            ) : displayedResults?.length===0 ? (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:120,color:B.gray,fontSize:13 }}>No records match current filters</div>
            ) : (
              <>
                <div style={{ padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"#111827" }}>
                    {displayedResults.length.toLocaleString()} row{displayedResults.length!==1?"s":""}
                    {results.length!==displayedResults.length&&<span style={{ color:B.gray,fontWeight:400 }}> of {results.length}</span>}
                  </div>
                  {groupBy&&<div style={{ fontSize:11,color:B.gray }}>Click group to filter</div>}
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"2px solid #F3F4F6" }}>
                        {resultCols.map(k=>(
                          <th key={k} onClick={()=>{ if(sortBy===k) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortBy(k);setSortDir("desc"); }}}
                            style={{ padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:B.gray,textTransform:"uppercase",letterSpacing:"0.05em",cursor:"pointer",whiteSpace:"nowrap" }}>
                            {k==="$_count"?"Count":k==="$_group"?groupBy:k}{sortBy===k&&<span style={{ marginLeft:4 }}>{sortDir==="asc"?"↑":"↓"}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(displayedResults||[]).slice(0,200).map((row,i)=>(
                        <ResultRow key={i} row={row} cols={resultCols} groupBy={groupBy} chartX={chartX} onFilter={goToFiltered}/>
                      ))}
                    </tbody>
                  </table>
                  {displayedResults?.length>200&&<div style={{ padding:"10px 16px",fontSize:11,color:B.gray,textAlign:"center" }}>Showing first 200 rows. Export CSV for full data.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
