import { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import api from "./apiClient.js";

const C = {
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accentLight,#eef2ff)",
  border:"var(--t-border,#e5e7eb)", surface:"var(--t-surface,#fff)",
  surface2:"var(--t-surface2,#f8fafc)", text1:"var(--t-text1,#0f1729)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#6b7280)",
  red:"#ef4444", amber:"#d97706", green:"#059669",
};
const F = "var(--t-font,'DM Sans',sans-serif)";

// Match Records.jsx JobQuestionsPanel tabSt exactly
const tabSt = (active) => ({
  padding:"6px 14px", borderRadius:7, border:"none",
  background:active ? "var(--t-accent,#4361EE)" : "transparent",
  color:active ? "#fff" : "var(--t-text2,#374151)",
  fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F, transition:"all .12s",
});

const RULE_TYPES = [
  { value:"knockout", label:"Knockout",  color:"#ef4444", bg:"#fef2f2", desc:"Auto-reject if answer fails" },
  { value:"required", label:"Required",  color:"#d97706", bg:"#fffbeb", desc:"Must pass — recruiter reviews" },
  { value:"preferred",label:"Preferred", color:"#059669", bg:"#ecfdf5", desc:"Bonus points — doesn't disqualify" },
];
const RULE_TYPE_MAP = Object.fromEntries(RULE_TYPES.map(t=>[t.value,t]));

const Q_COLORS = { knockout:"#ef4444", competency:"#3b82f6", technical:"#8b5cf6", culture:"#10b981" };
const Q_LABELS = { knockout:"Eligibility", competency:"Competency", technical:"Technical", culture:"Culture Fit" };
const Q_TYPES  = ["knockout","competency","technical","culture"];

/* ── AI Generate Preview Modal ──────────────────────────────────────── */
function ScreeningGeneratePreview({ items, onConfirm, onClose }) {
  const [rows, setRows] = useState(() => items.map(q => ({
    question_text:q.text, question_type:q.type, question_options:q.options||[],
    pass_value:q.pass_value||"", rule_type:q.type==="knockout"?"knockout":"required",
    weight:5, display_label:"", _selected:true,
  })));
  const toggle = i => setRows(p=>p.map((r,j)=>j===i?{...r,_selected:!r._selected}:r));
  const sf = (i,k,v) => setRows(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r));
  const sel = rows.filter(r=>r._selected);
  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:700,maxHeight:"88vh",background:C.surface,borderRadius:16,boxShadow:"0 24px 80px rgba(0,0,0,.25)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,background:"linear-gradient(135deg,#1e1b4b,#312e81)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:F,fontWeight:700,fontSize:15,color:"#fff"}}>✦ AI-Generated Screening Questions</div>
              <div style={{fontFamily:F,fontSize:12,color:"rgba(255,255,255,.65)",marginTop:2}}>Configure each question before adding to screening rules</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:18,lineHeight:1,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
          {rows.map((row,i)=>{
            const rt=RULE_TYPE_MAP[row.rule_type]||RULE_TYPES[0];
            const qc=Q_COLORS[row.question_type]||C.accent;
            return (
              <div key={i} style={{borderRadius:12,border:`1.5px solid ${row._selected?rt.color+"66":C.border}`,
                background:row._selected?rt.bg:C.surface2,padding:"12px 14px",marginBottom:8,opacity:row._selected?1:.5}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <input type="checkbox" checked={row._selected} onChange={()=>toggle(i)} style={{marginTop:3,width:15,height:15,accentColor:C.accent,cursor:"pointer",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,background:qc+"22",color:qc,whiteSpace:"nowrap"}}>{Q_LABELS[row.question_type]||row.question_type}</span>
                      <span style={{fontFamily:F,fontSize:13,color:C.text1,fontWeight:500,lineHeight:1.45}}>{row.question_text}</span>
                    </div>
                    {row._selected&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                      <div>
                        <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>RULE TYPE</label>
                        <select value={row.rule_type} onChange={e=>sf(i,"rule_type",e.target.value)}
                          style={{padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                          {RULE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {row.question_options?.length>0&&<div>
                        <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>PASS ANSWER</label>
                        <select value={row.pass_value} onChange={e=>sf(i,"pass_value",e.target.value)}
                          style={{padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                          <option value="">Any answer</option>
                          {row.question_options.map((o,j)=><option key={j} value={o}>{o}</option>)}
                        </select>
                      </div>}
                      {row.rule_type==="preferred"&&<div>
                        <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>WEIGHT (1-10)</label>
                        <input type="number" min={1} max={10} value={row.weight} onChange={e=>sf(i,"weight",Number(e.target.value))}
                          style={{width:60,padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
                      </div>}
                      <div style={{flex:1,minWidth:120}}>
                        <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:2}}>LABEL (optional)</label>
                        <input value={row.display_label} placeholder="e.g. Right to Work" onChange={e=>sf(i,"display_label",e.target.value)}
                          style={{width:"100%",padding:"4px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                    </div>}
                    {row.question_options?.length>0&&<div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {row.question_options.map((o,j)=><span key={j} style={{padding:"2px 8px",borderRadius:6,background:C.surface2,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text2}}>{o}</span>)}
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface2}}>
          <span style={{fontFamily:F,fontSize:12,color:C.text3}}>{sel.length} of {rows.length} selected</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>onConfirm(sel.map(({_selected,...r})=>r))} disabled={!sel.length}
              style={{padding:"7px 16px",borderRadius:8,border:"none",background:sel.length?C.accent:"#ccc",color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:sel.length?"pointer":"not-allowed"}}>
              Add {sel.length} Rule{sel.length!==1?"s":""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Save as Template Modal ─────────────────────────────────────────── */
function SaveTemplateModal({ rules, onSave, onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const doSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), desc.trim());
    setSaving(false);
  };
  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.45)"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:440,background:C.surface,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontFamily:F,fontWeight:700,fontSize:14,color:C.text1}}>Save as Screening Template</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.text3,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"16px 22px"}}>
          <div style={{fontFamily:F,fontSize:12,color:C.text3,marginBottom:14}}>Saves {rules.length} rule{rules.length!==1?"s":""} as a reusable template for other jobs.</div>
          <label style={{fontFamily:F,fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Template name *</label>
          <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Engineering Screening Pack"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${name?C.accent:C.border}`,fontFamily:F,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          <label style={{fontFamily:F,fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Description (optional)</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="What roles is this template good for?"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none"}}/>
        </div>
        <div style={{padding:"12px 22px 18px",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={doSave} disabled={!name.trim()||saving}
            style={{padding:"7px 16px",borderRadius:8,border:"none",background:name.trim()?C.accent:"#ccc",color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:name.trim()?"pointer":"not-allowed"}}>
            {saving?"Saving…":"Save Template"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Rule Card ──────────────────────────────────────────────────────── */
function RuleCard({ rule, onChange, onRemove }) {
  const rt = RULE_TYPE_MAP[rule.rule_type]||RULE_TYPES[0];
  return (
    <div style={{border:`1.5px solid ${rt.color}22`,borderRadius:12,background:rt.bg,padding:"14px 16px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,fontFamily:F,
              background:(Q_COLORS[rule.question_type]||C.accent)+"22",color:Q_COLORS[rule.question_type]||C.accent}}>
              {Q_LABELS[rule.question_type]||rule.question_type}
            </span>
            <span style={{fontFamily:F,fontSize:13,color:C.text1,fontWeight:600,lineHeight:1.4}}>{rule.question_text}</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>RULE TYPE</label>
              <select value={rule.rule_type} onChange={e=>onChange({...rule,rule_type:e.target.value})}
                style={{padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                {RULE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {rule.question_options?.length>0&&<div>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>PASS ANSWER</label>
              <select value={rule.pass_value||""} onChange={e=>onChange({...rule,pass_value:e.target.value})}
                style={{padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,background:C.surface,outline:"none"}}>
                <option value="">Any answer</option>
                {rule.question_options.map((o,i)=><option key={i} value={o}>{o}</option>)}
              </select>
            </div>}
            {rule.rule_type==="preferred"&&<div>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>WEIGHT (1-10)</label>
              <input type="number" min={1} max={10} value={rule.weight||5} onChange={e=>onChange({...rule,weight:Number(e.target.value)})}
                style={{width:60,padding:"5px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:12,outline:"none"}}/>
            </div>}
            <div style={{flex:1,minWidth:120}}>
              <label style={{fontFamily:F,fontSize:10,color:C.text3,fontWeight:600,display:"block",marginBottom:3}}>LABEL (optional)</label>
              <input value={rule.display_label||""} placeholder="e.g. Right to Work" onChange={e=>onChange({...rule,display_label:e.target.value})}
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
          <input type="checkbox" checked={!!autoActions.auto_reject_knockout} onChange={e=>set("auto_reject_knockout",e.target.checked)} style={{width:14,height:14,accentColor:C.red}}/>
          <span style={{fontFamily:F,fontSize:12,color:C.text1}}>Auto-reject candidates who fail a <strong style={{color:C.red}}>knockout</strong> question</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <input type="checkbox" checked={!!autoActions.flag_for_review} onChange={e=>set("flag_for_review",e.target.checked)} style={{width:14,height:14,accentColor:C.amber}}/>
          <span style={{fontFamily:F,fontSize:12,color:C.text1}}>Flag for manual review if any <strong style={{color:C.amber}}>required</strong> question fails</span>
        </label>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <label style={{fontFamily:F,fontSize:12,color:C.text1,whiteSpace:"nowrap"}}>Auto-advance threshold:</label>
          <input type="number" min={0} max={100} value={autoActions.auto_advance_threshold??70} onChange={e=>set("auto_advance_threshold",Number(e.target.value))}
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
  const [view, setView] = useState("assigned"); // "assigned" | "bank" | "templates"
  const [rules, setRules] = useState([]);
  const [bankQs, setBankQs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [autoActions, setAutoActions] = useState({ auto_reject_knockout:true, flag_for_review:true, auto_advance_threshold:70 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [genCount, setGenCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [genPreview, setGenPreview] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [rulesData, bank, tpls] = await Promise.all([
        api.get(`/screening/job/${jobId}`),
        api.get("/question-bank/questions"),
        api.get("/question-bank/templates"),
      ]);
      setRules(Array.isArray(rulesData?.rules) ? rulesData.rules : []);
      if (rulesData?.auto_actions) setAutoActions(rulesData.auto_actions);
      setBankQs(Array.isArray(bank) ? bank : []);
      setTemplates((Array.isArray(tpls) ? tpls : []).filter(t=>t.template_type==="screening"));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const addFromBank = (q) => {
    const alreadyAdded = rules.some(r=>r.question_id===q.id||r.question_text===(q.text||q.question_text));
    if (alreadyAdded) return;
    const text = q.text||q.question_text||'';
    const type = q.type||q.question_type||'competency';
    setRules(prev=>[...prev,{
      question_id:q.id, question_text:text, question_type:type,
      question_options:q.options||[], pass_value:q.pass_value||"",
      rule_type:type==="knockout"?"knockout":"required", weight:5, display_label:"",
    }]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.post(`/question-bank/jobs/${jobId}/generate`, { count: genCount });
      if (data?.preview?.length) setGenPreview(data.preview);
    } catch(e) { console.error(e); }
    setGenerating(false);
  };

  const handleConfirmGenerated = newRules => { setRules(prev=>[...prev,...newRules]); setGenPreview(null); };

  const handleApplyTemplate = templateRules => {
    const existing = new Set(rules.map(r=>r.question_text));
    const fresh = (templateRules||[]).filter(r=>!existing.has(r.question_text));
    setRules(prev=>[...prev,...fresh]);
    setView("assigned");
  };

  const handleSaveTemplate = async (name, description) => {
    await api.post("/question-bank/templates", { name, description, template_type:"screening", rules });
    setShowSaveTemplate(false);
    // Reload templates
    api.get("/question-bank/templates").then(t=>{
      setTemplates((Array.isArray(t)?t:[]).filter(x=>x.template_type==="screening"));
    }).catch(()=>{});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/screening/job/${jobId}`, { rules, auto_actions: autoActions });
      setSaved(true); setTimeout(()=>setSaved(false), 2000);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  // Filtered bank questions
  const existingTexts = new Set(rules.map(r=>r.question_text));
  const filteredBank = bankQs
    .map(q=>({...q, text:q.text||q.question_text, type:q.type||q.question_type}))
    .filter(q => {
      if (!filterType) {
        if (search && !q.text?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }
      if (q.type !== filterType) return false;
      if (search && !q.text?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  const grouped = Q_TYPES.reduce((acc,t)=>({...acc,[t]:filteredBank.filter(q=>q.type===t)}),{});

  if (loading) return <div style={{padding:24,textAlign:"center",color:C.text3,fontFamily:F}}>Loading…</div>;

  return (
    <div style={{fontFamily:F}}>
      {/* Sub-tabs — same style as Interview Questions */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:"#f1f5f9",borderRadius:9,padding:4}}>
        {[["assigned",`Assigned (${rules.length})`],["bank","Question Bank"],["templates","Templates"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={tabSt(view===v)}>{l}</button>
        ))}
      </div>

      {/* ── ASSIGNED TAB ── */}
      {view==="assigned" && (
        <div>
          {/* Info callout */}
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:9,background:"#EFF6FF",border:"1px solid #BFDBFE",marginBottom:14}}>
            <span style={{fontSize:14,flexShrink:0,marginTop:1}}>ℹ</span>
            <span style={{fontFamily:F,fontSize:12,color:"#1E40AF",lineHeight:1.5}}>
              These questions appear on your <strong>candidate portal</strong>.
              Knockout rules auto-reject. Required rules flag for review. Preferred rules add to match score.
            </span>
          </div>

          {/* AI Generate strip */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"linear-gradient(135deg,#1e1b4b,#312e81)",marginBottom:12}}>
            <span style={{fontFamily:F,fontSize:12,color:"rgba(255,255,255,.8)",flex:1}}>✦ AI-generate role-specific screening questions</span>
            <select value={genCount} onChange={e=>setGenCount(Number(e.target.value))}
              style={{padding:"5px 8px",borderRadius:7,border:"none",fontFamily:F,fontSize:12,background:"rgba(255,255,255,.15)",color:"#fff",outline:"none",cursor:"pointer"}}>
              {[3,5,8,10].map(n=><option key={n} value={n} style={{background:"#1e1b4b"}}>{n} questions</option>)}
            </select>
            <button onClick={handleGenerate} disabled={generating}
              style={{padding:"6px 14px",borderRadius:7,border:"none",background:generating?"rgba(255,255,255,.1)":"rgba(255,255,255,.2)",color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:generating?"wait":"pointer",whiteSpace:"nowrap"}}>
              {generating?"Generating…":"✦ Generate"}
            </button>
          </div>

          {/* Header row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{rules.length===0?"No rules yet — generate above or browse the Question Bank":"Screening rules for this job"}</div>
            <div style={{display:"flex",gap:8}}>
              {rules.length>0&&<button onClick={()=>setShowSaveTemplate(true)}
                style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Save as Template
              </button>}
              <button onClick={handleSave} disabled={saving}
                style={{padding:"6px 14px",borderRadius:8,border:"none",background:saved?"#059669":C.accent,color:"#fff",fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer",transition:"background .2s"}}>
                {saving?"Saving…":saved?"✓ Saved":"Save Rules"}
              </button>
            </div>
          </div>

          {/* Rules list */}
          {rules.length===0 ? (
            <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"36px 20px",textAlign:"center"}}>
              <div style={{fontWeight:600,fontSize:13,color:C.text1,marginBottom:4}}>No screening rules yet</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:14}}>Generate with AI, browse the Question Bank, or apply a template</div>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>setView("bank")} style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,color:C.text1}}>Browse Bank</button>
                <button onClick={()=>setView("templates")} style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,color:C.text1}}>Use Template</button>
              </div>
            </div>
          ) : rules.map((rule,i)=>(
            <RuleCard key={i} rule={rule}
              onChange={u=>setRules(prev=>prev.map((r,j)=>j===i?u:r))}
              onRemove={()=>setRules(prev=>prev.filter((_,j)=>j!==i))}/>
          ))}

          <AutoActionsConfig autoActions={autoActions} onChange={setAutoActions}/>
        </div>
      )}

      {/* ── QUESTION BANK TAB ── */}
      {view==="bank" && (
        <div>
          {/* Search + type filter — matches Interview Questions bank tab */}
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-6-6"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions…"
                style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {["","knockout","competency","technical","culture"].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)}
                style={{padding:"5px 10px",borderRadius:7,border:`1.5px solid ${filterType===t?(Q_COLORS[t]||C.accent):C.border}`,
                  background:filterType===t?(Q_COLORS[t]||C.accent):"transparent",
                  color:filterType===t?"#fff":C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                {t||"All"}
              </button>
            ))}
          </div>

          {/* Grouped question list */}
          {Q_TYPES.map(type => {
            const qs = grouped[type]||[];
            if (!qs.length && filterType && filterType!==type) return null;
            if (!qs.length) return null;
            return (
              <div key={type} style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:Q_COLORS[type],textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{Q_LABELS[type]}</div>
                {qs.map(q => {
                  const alreadyAdded = existingTexts.has(q.text);
                  return (
                    <div key={q.id} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:9,
                      border:`1.5px solid ${alreadyAdded?Q_COLORS[q.type]+"44":C.border}`,
                      background:alreadyAdded?Q_COLORS[q.type]+"08":C.surface,marginBottom:5}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:C.text1,lineHeight:1.5}}>{q.text}</div>
                        <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                          {q.options?.length>0&&<span style={{fontSize:10,color:C.text3}}>Options: {q.options.join(", ")}</span>}
                          {q.pass_value&&<span style={{fontSize:10,color:C.green,fontWeight:600}}>Pass: {q.pass_value}</span>}
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span style={{fontSize:11,fontWeight:700,color:Q_COLORS[q.type],alignSelf:"center",whiteSpace:"nowrap",padding:"4px 10px",borderRadius:99,background:Q_COLORS[q.type]+"18"}}>✓ Added</span>
                      ) : (
                        <button onClick={()=>addFromBank(q)}
                          style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap",alignSelf:"center"}}>
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredBank.length===0&&<div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13,fontFamily:F}}>No questions found. Try a different search or filter.</div>}

          {/* Sticky save bar */}
          {rules.length>0&&(
            <div style={{position:"sticky",bottom:0,background:"white",paddingTop:10,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:C.text3,fontFamily:F}}>{rules.length} rule{rules.length!==1?"s":""} in Assigned</span>
              <button onClick={()=>{ handleSave(); setView("assigned"); }} disabled={saving}
                style={{padding:"8px 18px",borderRadius:9,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:saving?0.6:1}}>
                {saving?"Saving…":"Save Rules"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {view==="templates" && (
        <div>
          {templates.length===0 ? (
            <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:10}}>📋</div>
              <div style={{fontWeight:700,fontSize:13,color:C.text1,marginBottom:6,fontFamily:F}}>No screening templates yet</div>
              <div style={{fontSize:12,color:C.text3,maxWidth:320,margin:"0 auto",fontFamily:F,lineHeight:1.5}}>
                Go to <strong>Assigned</strong>, configure your rules, then click <strong>Save as Template</strong> to reuse them across jobs.
              </div>
            </div>
          ) : templates.map(t=>{
            const ruleCount=(t.rules||[]).length;
            const koCount=(t.rules||[]).filter(r=>r.rule_type==="knockout").length;
            const reqCount=(t.rules||[]).filter(r=>r.rule_type==="required").length;
            return (
              <div key={t.id} style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.surface,marginBottom:8,display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4,fontFamily:F}}>{t.name}</div>
                  {t.description&&<div style={{fontSize:12,color:C.text3,marginBottom:6,fontFamily:F}}>{t.description}</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,fontFamily:F,background:C.accentLight,color:C.accent}}>{ruleCount} rule{ruleCount!==1?"s":""}</span>
                    {koCount>0&&<span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,fontFamily:F,background:"#fef2f2",color:C.red}}>{koCount} knockout{koCount!==1?"s":""}</span>}
                    {reqCount>0&&<span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,fontFamily:F,background:"#fffbeb",color:C.amber}}>{reqCount} required</span>}
                  </div>
                  {(t.rules||[]).slice(0,3).map((r,i)=>(
                    <div key={i} style={{marginTop:5,fontSize:11,color:C.text3,display:"flex",alignItems:"center",gap:6,fontFamily:F}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:RULE_TYPE_MAP[r.rule_type]?.color||C.accent,flexShrink:0,display:"inline-block"}}/>
                      {r.question_text}
                    </div>
                  ))}
                  {(t.rules||[]).length>3&&<div style={{fontSize:11,color:C.text3,marginTop:4,paddingLeft:12,fontFamily:F}}>+{(t.rules||[]).length-3} more…</div>}
                </div>
                <button onClick={()=>handleApplyTemplate(t.rules||[])} disabled={!ruleCount}
                  style={{padding:"7px 14px",borderRadius:8,border:"none",background:ruleCount?C.accent:"#e5e7eb",
                    color:ruleCount?"white":"#9ca3af",fontSize:12,fontWeight:700,cursor:ruleCount?"pointer":"not-allowed",fontFamily:F,whiteSpace:"nowrap"}}>
                  Apply
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {genPreview&&<ScreeningGeneratePreview items={genPreview} onConfirm={handleConfirmGenerated} onClose={()=>setGenPreview(null)}/>}
      {showSaveTemplate&&<SaveTemplateModal rules={rules} onSave={handleSaveTemplate} onClose={()=>setShowSaveTemplate(false)}/>}
    </div>
  );
}
