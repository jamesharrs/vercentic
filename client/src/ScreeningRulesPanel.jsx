import { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import api, { tFetch } from "./apiClient.js";

const C = {
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accentLight,#eef2ff)",
  border:"var(--t-border,#e5e7eb)", surface:"var(--t-surface,#fff)",
  surface2:"var(--t-surface2,#f8fafc)", text1:"var(--t-text1,#0f1729)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#6b7280)",
  red:"#ef4444", redLight:"#fef2f2", green:"#059669", greenLight:"#ecfdf5",
  amber:"#d97706", amberLight:"#fffbeb",
};
const F = "var(--t-font,'DM Sans',sans-serif)";

// Uses shared api client from apiClient.js (auto-prepends /api)

const RULE_TYPES = [
  { value:"knockout", label:"Knockout",  color:"#ef4444", bg:"#fef2f2", desc:"Auto-reject if answer fails" },
  { value:"required", label:"Required",  color:"#d97706", bg:"#fffbeb", desc:"Must pass — recruiter reviews" },
  { value:"preferred",label:"Preferred", color:"#059669", bg:"#ecfdf5", desc:"Bonus points — doesn't disqualify" },
];
const RULE_TYPE_MAP = Object.fromEntries(RULE_TYPES.map(t=>[t.value,t]));
const Q_TYPE_COLORS = {knockout:"#ef4444",competency:"#3b82f6",technical:"#8b5cf6",culture:"#10b981"};
const Q_TYPE_LABELS = {knockout:"Eligibility",competency:"Competency",technical:"Technical",culture:"Culture Fit"};

/* ── Question Picker Modal ───────────────────────────────────────────── */
function QuestionPickerModal({ onPick, onClose, alreadyAdded=[] }) {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/question-bank/questions").then(d => {
      setQuestions(Array.isArray(d) ? d : (d.questions||[]));
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const filtered = questions.filter(q => {
    if (alreadyAdded.includes(q.id)) return false;
    if (typeFilter !== "all" && q.question_type !== typeFilter) return false;
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const types = ["all","knockout","competency","technical","culture"];

  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.45)"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:640,maxHeight:"80vh",background:C.surface,borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"20px 24px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontFamily:F,fontWeight:700,fontSize:15,color:C.text1}}>Add from Question Library</span>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.text3,lineHeight:1}}>×</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions…"
            style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontFamily:F,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{display:"flex",gap:6}}>
            {types.map(t=>(
              <button key={t} onClick={()=>setTypeFilter(t)}
                style={{padding:"4px 10px",borderRadius:99,border:`1.5px solid ${typeFilter===t?(Q_TYPE_COLORS[t]||C.accent):C.border}`,
                  background:typeFilter===t?(Q_TYPE_COLORS[t]||C.accent):"transparent",
                  color:typeFilter===t?"#fff":(Q_TYPE_COLORS[t]||C.text2),
                  fontFamily:F,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                {t==="all"?"All Types":Q_TYPE_LABELS[t]||t}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
          {loading ? <div style={{padding:32,textAlign:"center",color:C.text3,fontFamily:F}}>Loading…</div>
          : filtered.length===0 ? <div style={{padding:32,textAlign:"center",color:C.text3,fontFamily:F}}>No questions found</div>
          : filtered.map(q=>(
            <div key={q.id} onClick={()=>onPick(q)}
              style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,marginBottom:6,cursor:"pointer",transition:"all .12s",background:C.surface}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,
                  background:Q_TYPE_COLORS[q.question_type]+"22",color:Q_TYPE_COLORS[q.question_type],whiteSpace:"nowrap",marginTop:1}}>
                  {Q_TYPE_LABELS[q.question_type]||q.question_type}
                </span>
                <span style={{fontFamily:F,fontSize:13,color:C.text1,lineHeight:1.5}}>{q.question_text}</span>
              </div>
              {q.options?.length>0&&(
                <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap",paddingLeft:60}}>
                  {q.options.map((o,i)=>(
                    <span key={i} style={{padding:"2px 8px",borderRadius:6,background:C.surface2,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text2}}>{o}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Rule Card ──────────────────────────────────────────────────────── */
function RuleCard({ rule, index, fields, onChange, onRemove }) {
  const rt = RULE_TYPE_MAP[rule.rule_type] || RULE_TYPES[0];
  const hasOptions = rule.question_options?.length > 0;

  return (
    <div style={{border:`1.5px solid ${rt.color}22`,borderRadius:12,background:rt.bg,padding:"14px 16px",marginBottom:8,position:"relative"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,
              background:Q_TYPE_COLORS[rule.question_type]+"22",color:Q_TYPE_COLORS[rule.question_type]}}>
              {Q_TYPE_LABELS[rule.question_type]||rule.question_type}
            </span>
            <span style={{fontFamily:F,fontSize:13,color:C.text1,fontWeight:600,lineHeight:1.4}}>{rule.question_text}</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {/* Rule Type */}
            <div>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>RULE TYPE</label>
              <select value={rule.rule_type} onChange={e=>onChange({...rule,rule_type:e.target.value})}
                style={{padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,color:C.text1,outline:"none"}}>
                {RULE_TYPES.map(rt=><option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </div>
            {/* Pass Value */}
            {hasOptions && (
              <div>
                <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>PASS ANSWER</label>
                <select value={rule.pass_value||""} onChange={e=>onChange({...rule,pass_value:e.target.value})}
                  style={{padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,color:C.text1,outline:"none"}}>
                  <option value="">Any answer</option>
                  {rule.question_options.map((o,i)=><option key={i} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            {/* Weight */}
            {rule.rule_type==="preferred"&&(
              <div>
                <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>WEIGHT (1-10)</label>
                <input type="number" min={1} max={10} value={rule.weight||5}
                  onChange={e=>onChange({...rule,weight:Number(e.target.value)})}
                  style={{width:60,padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
              </div>
            )}
            {/* Display Label */}
            <div style={{flex:1,minWidth:120}}>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>LABEL (optional)</label>
              <input value={rule.display_label||""} placeholder="e.g. Right to Work"
                onChange={e=>onChange({...rule,display_label:e.target.value})}
                style={{width:"100%",padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
        </div>
        <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:16,padding:2,lineHeight:1}}>×</button>
      </div>
      <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
        <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,background:rt.color+"22",color:rt.color}}>{rt.label}</span>
        <span style={{fontFamily:F,fontSize:11,color:C.text3}}>{rt.desc}</span>
      </div>
    </div>
  );
}

/* ── Auto-Actions Config ─────────────────────────────────────────────── */
function AutoActionsConfig({ autoActions, onChange }) {
  const set = (k,v) => onChange({...autoActions,[k]:v});
  return (
    <div style={{background:C.surface2,borderRadius:10,border:`1px solid ${C.border}`,padding:"14px 16px",marginTop:12}}>
      <div style={{fontFamily:F,fontWeight:700,fontSize:12,color:C.text2,marginBottom:10}}>Automated Actions</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <input type="checkbox" checked={!!autoActions.auto_reject_knockout}
            onChange={e=>set("auto_reject_knockout",e.target.checked)}
            style={{width:14,height:14,accentColor:C.red}}/>
          <span style={{fontFamily:F,fontSize:12,color:C.text1}}>Auto-reject candidates who fail a <strong style={{color:C.red}}>knockout</strong> question</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <input type="checkbox" checked={!!autoActions.flag_for_review}
            onChange={e=>set("flag_for_review",e.target.checked)}
            style={{width:14,height:14,accentColor:C.amber}}/>
          <span style={{fontFamily:F,fontSize:12,color:C.text1}}>Flag for manual review if any <strong style={{color:C.amber}}>required</strong> question fails</span>
        </label>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <label style={{fontFamily:F,fontSize:12,color:C.text1,whiteSpace:"nowrap"}}>Auto-advance threshold:</label>
          <input type="number" min={0} max={100} value={autoActions.auto_advance_threshold??70}
            onChange={e=>set("auto_advance_threshold",Number(e.target.value))}
            style={{width:60,padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
          <span style={{fontFamily:F,fontSize:12,color:C.text3}}>% score → move to next stage</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────────────────── */
export default function ScreeningRulesPanel({ record, environment, jobId: jobIdProp }) {
  const jobId = jobIdProp || record?.id;
  const [rules, setRules] = useState([]);
  const [autoActions, setAutoActions] = useState({ auto_reject_knockout:true, flag_for_review:true, auto_advance_threshold:70 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [fields, setFields] = useState([]);

  const load = useCallback(async () => {
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get(`/screening/job/${jobId}`);
      setRules(Array.isArray(data?.rules) ? data.rules : []);
      if (data?.auto_actions) setAutoActions(data.auto_actions);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const handlePickQuestion = q => {
    const newRule = {
      question_id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      question_options: q.options || [],
      rule_type: q.question_type === "knockout" ? "knockout" : "required",
      weight: 5,
      pass_value: "",
      display_label: "",
    };
    setRules(prev => [...prev, newRule]);
    setShowPicker(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/screening/job/${jobId}`, { rules, auto_actions: autoActions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const alreadyAdded = rules.map(r => r.question_id).filter(Boolean);

  if (loading) return <div style={{padding:32,textAlign:"center",color:C.text3,fontFamily:F}}>Loading…</div>;

  return (
    <div style={{fontFamily:F}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:C.text1}}>Screening Rules</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>
            {rules.length} rule{rules.length!==1?"s":""} · pulled from Question Library
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowPicker(true)}
            style={{padding:"7px 14px",borderRadius:8,border:`1.5px solid ${C.accent}`,background:C.accentLight,
              color:C.accent,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            + Add from Library
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:"7px 14px",borderRadius:8,border:"none",background:saved?"#059669":C.accent,
              color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer",transition:"background .2s"}}>
            {saving?"Saving…":saved?"✓ Saved":"Save Rules"}
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"36px 20px",textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:8}}>📋</div>
          <div style={{fontWeight:600,fontSize:13,color:C.text1,marginBottom:4}}>No screening rules yet</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:14}}>Add questions from the library to screen candidates automatically</div>
          <button onClick={()=>setShowPicker(true)}
            style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${C.accent}`,background:C.accentLight,
              color:C.accent,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            + Add from Question Library
          </button>
        </div>
      ) : (
        <div>
          {rules.map((rule, i) => (
            <RuleCard key={i} rule={rule} index={i} fields={fields}
              onChange={updated => setRules(prev => prev.map((r,j)=>j===i?updated:r))}
              onRemove={() => setRules(prev => prev.filter((_,j)=>j!==i))}/>
          ))}
        </div>
      )}

      <AutoActionsConfig autoActions={autoActions} onChange={setAutoActions}/>

      {showPicker && (
        <QuestionPickerModal alreadyAdded={alreadyAdded} onPick={handlePickQuestion} onClose={()=>setShowPicker(false)}/>
      )}
    </div>
  );
}
