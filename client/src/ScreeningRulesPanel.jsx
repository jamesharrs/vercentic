import { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import api from "./apiClient.js";

const C = {
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accentLight,#eef2ff)",
  border:"var(--t-border,#e5e7eb)", surface:"var(--t-surface,#fff)",
  surface2:"var(--t-surface2,#f8fafc)", text1:"var(--t-text1,#0f1729)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#6b7280)",
  red:"#ef4444", redLight:"#fef2f2", green:"#059669", greenLight:"#ecfdf5",
  amber:"#d97706", amberLight:"#fffbeb",
  purple:"#7c3aed", purpleLight:"#f5f3ff",
};
const F = "var(--t-font,'DM Sans',sans-serif)";

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
      const raw = Array.isArray(d) ? d : (d.questions||[]);
      const normalized = raw.map(q => ({
        ...q,
        question_text: q.question_text || q.text || '',
        question_type: q.question_type || q.type || '',
      }));
      setQuestions(normalized);
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

/* ── AI Generate Preview Modal ──────────────────────────────────────── */
function ScreeningGeneratePreview({ items, onConfirm, onClose }) {
  const [rows, setRows] = useState(() =>
    items.map(q => ({
      question_text: q.text,
      question_type: q.type,
      question_options: q.options || [],
      pass_value: q.pass_value || "",
      rule_type: q.type === "knockout" ? "knockout" : "required",
      weight: 5,
      display_label: "",
      _selected: true,
    }))
  );

  const toggle = i => setRows(prev => prev.map((r,j) => j===i ? {...r, _selected:!r._selected} : r));
  const setField = (i, k, v) => setRows(prev => prev.map((r,j) => j===i ? {...r, [k]:v} : r));

  const selected = rows.filter(r => r._selected);

  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:700,maxHeight:"88vh",background:C.surface,borderRadius:16,boxShadow:"0 24px 80px rgba(0,0,0,.25)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:F,fontWeight:700,fontSize:15,color:"#fff"}}>✦ AI-Generated Screening Questions</div>
              <div style={{fontFamily:F,fontSize:12,color:"rgba(255,255,255,.65)",marginTop:2}}>
                Review and configure each question before adding to screening rules
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:18,lineHeight:1,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>

        {/* Question list */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
          {rows.map((row, i) => {
            const rt = RULE_TYPE_MAP[row.rule_type] || RULE_TYPES[0];
            const qc = Q_TYPE_COLORS[row.question_type] || C.accent;
            return (
              <div key={i} style={{borderRadius:12,border:`1.5px solid ${row._selected ? rt.color+"66" : C.border}`,
                background:row._selected ? rt.bg : C.surface2, padding:"12px 14px", marginBottom:8,
                opacity:row._selected?1:0.5, transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <input type="checkbox" checked={row._selected} onChange={()=>toggle(i)}
                    style={{marginTop:3,width:15,height:15,accentColor:C.accent,cursor:"pointer",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,
                        background:qc+"22",color:qc,whiteSpace:"nowrap"}}>
                        {Q_TYPE_LABELS[row.question_type]||row.question_type}
                      </span>
                      <span style={{fontFamily:F,fontSize:13,color:C.text1,fontWeight:500,lineHeight:1.45}}>{row.question_text}</span>
                    </div>
                    {row._selected && (
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                        {/* Rule type */}
                        <div>
                          <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>RULE TYPE</label>
                          <select value={row.rule_type} onChange={e=>setField(i,"rule_type",e.target.value)}
                            style={{padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                            {RULE_TYPES.map(rt=><option key={rt.value} value={rt.value}>{rt.label}</option>)}
                          </select>
                        </div>
                        {/* Pass answer (if options) */}
                        {row.question_options?.length>0 && (
                          <div>
                            <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>PASS ANSWER</label>
                            <select value={row.pass_value} onChange={e=>setField(i,"pass_value",e.target.value)}
                              style={{padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                              <option value="">Any answer</option>
                              {row.question_options.map((o,j)=><option key={j} value={o}>{o}</option>)}
                            </select>
                          </div>
                        )}
                        {/* Weight (preferred only) */}
                        {row.rule_type==="preferred" && (
                          <div>
                            <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>WEIGHT (1-10)</label>
                            <input type="number" min={1} max={10} value={row.weight}
                              onChange={e=>setField(i,"weight",Number(e.target.value))}
                              style={{width:60,padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
                          </div>
                        )}
                        {/* Label */}
                        <div style={{flex:1,minWidth:120}}>
                          <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>LABEL (optional)</label>
                          <input value={row.display_label} placeholder="e.g. Right to Work"
                            onChange={e=>setField(i,"display_label",e.target.value)}
                            style={{width:"100%",padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>
                    )}
                    {/* Options chips */}
                    {row.question_options?.length>0 && (
                      <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                        {row.question_options.map((o,j)=>(
                          <span key={j} style={{padding:"2px 8px",borderRadius:6,background:C.surface2,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text2}}>{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface2}}>
          <span style={{fontFamily:F,fontSize:12,color:C.text3}}>{selected.length} of {rows.length} selected</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>onConfirm(selected.map(({_selected,...r})=>r))} disabled={selected.length===0}
              style={{padding:"7px 16px",borderRadius:8,border:"none",background:selected.length?C.accent:"#ccc",
                color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:selected.length?"pointer":"not-allowed"}}>
              Add {selected.length} Rule{selected.length!==1?"s":""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Rule Card ──────────────────────────────────────────────────────── */
function RuleCard({ rule, onChange, onRemove }) {
  const rt = RULE_TYPE_MAP[rule.rule_type] || RULE_TYPES[0];
  const hasOptions = rule.question_options?.length > 0;
  return (
    <div style={{border:`1.5px solid ${rt.color}22`,borderRadius:12,background:rt.bg,padding:"14px 16px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,
              background:(Q_TYPE_COLORS[rule.question_type]||C.accent)+"22",color:Q_TYPE_COLORS[rule.question_type]||C.accent}}>
              {Q_TYPE_LABELS[rule.question_type]||rule.question_type}
            </span>
            <span style={{fontFamily:F,fontSize:13,color:C.text1,fontWeight:600,lineHeight:1.4}}>{rule.question_text}</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>RULE TYPE</label>
              <select value={rule.rule_type} onChange={e=>onChange({...rule,rule_type:e.target.value})}
                style={{padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,color:C.text1,outline:"none"}}>
                {RULE_TYPES.map(rt=><option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </div>
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
            {rule.rule_type==="preferred" && (
              <div>
                <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>WEIGHT (1-10)</label>
                <input type="number" min={1} max={10} value={rule.weight||5}
                  onChange={e=>onChange({...rule,weight:Number(e.target.value)})}
                  style={{width:60,padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
              </div>
            )}
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
  // AI generate state
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genPreview, setGenPreview] = useState(null);

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
    setRules(prev => [...prev, {
      question_id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      question_options: q.options || [],
      rule_type: q.question_type === "knockout" ? "knockout" : "required",
      weight: 5,
      pass_value: "",
      display_label: "",
    }]);
    setShowPicker(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.post(`/question-bank/jobs/${jobId}/generate`, { count: genCount });
      if (data?.preview?.length) setGenPreview(data.preview);
    } catch(e) { console.error(e); }
    setGenerating(false);
  };

  const handleConfirmGenerated = newRules => {
    setRules(prev => [...prev, ...newRules]);
    setGenPreview(null);
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

      {/* Context callout */}
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:9,
        background:"#EFF6FF",border:"1px solid #BFDBFE",marginBottom:14}}>
        <span style={{fontSize:14,flexShrink:0,marginTop:1}}>ℹ</span>
        <span style={{fontFamily:F,fontSize:12,color:"#1E40AF",lineHeight:1.5}}>
          These questions appear on your <strong>candidate portal</strong> during applications.
          Knockout rules auto-reject candidates who don't pass. Required rules flag for review. Preferred rules add to the match score.
        </span>
      </div>

      {/* Header row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:C.text1}}>Screening Rules</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>
            {rules.length} rule{rules.length!==1?"s":""}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{padding:"7px 14px",borderRadius:8,border:"none",background:saved?"#059669":C.accent,
            color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer",transition:"background .2s"}}>
          {saving?"Saving…":saved?"✓ Saved":"Save Rules"}
        </button>
      </div>

      {/* AI Generate strip */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,
        background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)",marginBottom:12}}>
        <span style={{fontFamily:F,fontSize:12,color:"rgba(255,255,255,.8)",flex:1}}>✦ Generate screening questions with AI</span>
        <select value={genCount} onChange={e=>setGenCount(Number(e.target.value))}
          style={{padding:"5px 8px",borderRadius:7,border:"none",fontFamily:F,fontSize:12,
            background:"rgba(255,255,255,.15)",color:"#fff",outline:"none",cursor:"pointer"}}>
          {[3,5,8,10].map(n=><option key={n} value={n} style={{background:"#1e1b4b"}}>{n} questions</option>)}
        </select>
        <button onClick={handleGenerate} disabled={generating}
          style={{padding:"6px 14px",borderRadius:7,border:"none",
            background:generating?"rgba(255,255,255,.1)":"rgba(255,255,255,.2)",
            color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:generating?"wait":"pointer",whiteSpace:"nowrap"}}>
          {generating?"Generating…":"✦ Generate"}
        </button>
      </div>

      {/* Library button */}
      <div style={{marginBottom:16}}>
        <button onClick={()=>setShowPicker(true)}
          style={{padding:"7px 14px",borderRadius:8,border:`1.5px solid ${C.accent}`,background:C.accentLight,
            color:C.accent,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          + Add from Library
        </button>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"36px 20px",textAlign:"center"}}>
          <div style={{fontWeight:600,fontSize:13,color:C.text1,marginBottom:4}}>No screening rules yet</div>
          <div style={{fontSize:12,color:C.text3}}>Generate with AI or add from the Question Library above</div>
        </div>
      ) : (
        rules.map((rule, i) => (
          <RuleCard key={i} rule={rule}
            onChange={updated => setRules(prev => prev.map((r,j)=>j===i?updated:r))}
            onRemove={() => setRules(prev => prev.filter((_,j)=>j!==i))}/>
        ))
      )}

      <AutoActionsConfig autoActions={autoActions} onChange={setAutoActions}/>

      {showPicker && (
        <QuestionPickerModal alreadyAdded={alreadyAdded} onPick={handlePickQuestion} onClose={()=>setShowPicker(false)}/>
      )}

      {genPreview && (
        <ScreeningGeneratePreview items={genPreview} onConfirm={handleConfirmGenerated} onClose={()=>setGenPreview(null)}/>
      )}
    </div>
  );
}
