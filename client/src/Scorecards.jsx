// client/src/Scorecards.jsx
import { useState, useEffect } from "react";

const API = "/api";
const F = "'Geist', -apple-system, sans-serif";
const C = { bg:"#EEF2FF", white:"#fff", accent:"#4361ee", text1:"#111827", text2:"#374151", text3:"#9ca3af", border:"#e5e7eb" };

const REC = {
  strong_yes:    { label:"Strong Yes",       color:"#fff", bg:"#059669" },
  yes:           { label:"Yes",              color:"#fff", bg:"#0284c7" },
  consider:      { label:"Consider",         color:"#111", bg:"#fbbf24" },
  no:            { label:"Not Progressing",  color:"#fff", bg:"#dc2626" },
  knockout_fail: { label:"Disqualified",     color:"#fff", bg:"#7c2d12" },
};
const TYPE = {
  knockout:   { label:"Eligibility", color:"#dc2626", bg:"#fef2f2" },
  competency: { label:"Competency",  color:"#2563eb", bg:"#eff6ff" },
  technical:  { label:"Technical",   color:"#7c3aed", bg:"#f5f3ff" },
  culture:    { label:"Culture Fit", color:"#059669", bg:"#ecfdf5" },
};
const pct = (s, m) => m > 0 ? Math.round((s / m) * 100) : 0;
const scoreColor = p => p >= 70 ? "#059669" : p >= 50 ? "#d97706" : "#dc2626";

const ScoreRing = ({ score, max, size = 72 }) => {
  const p = pct(score, max), r = (size - 10) / 2, circ = 2 * Math.PI * r, dash = (p / 100) * circ, col = scoreColor(p);
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5} strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size===72?18:13, fontWeight:800, color:col, lineHeight:1 }}>{p}</span>
        <span style={{ fontSize:9, color:C.text3, fontWeight:600 }}>%</span>
      </div>
    </div>
  );
};

const AnswerRow = ({ answer }) => {
  const [open, setOpen] = useState(false);
  const m = TYPE[answer.question_type] || TYPE.competency;
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:8 }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer", background:open?"#fafbff":"white" }}>
        <span style={{ padding:"2px 7px", borderRadius:99, fontSize:10, fontWeight:700, background:m.bg, color:m.color, textTransform:"uppercase", flexShrink:0 }}>{m.label}</span>
        <span style={{ flex:1, fontSize:13, color:C.text1, fontWeight:500, lineHeight:1.4 }}>{answer.question_text}</span>
        <ScoreRing score={answer.score} max={answer.max_score} size={36}/>
        {answer.question_type==="knockout" && <span style={{ padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:700, background:answer.passed?"#d1fae5":"#fee2e2", color:answer.passed?"#059669":"#dc2626" }}>{answer.passed?"PASS":"FAIL"}</span>}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2} style={{ flexShrink:0, transform:open?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ padding:"14px 16px", borderTop:`1px solid #f0f0f0`, background:"#fafbff" }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", marginBottom:4 }}>Candidate's Answer</div>
            <div style={{ fontSize:13, color:C.text1, lineHeight:1.7, background:"white", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}` }}>{answer.answer}</div>
          </div>
          {answer.ai_annotation && <div style={{ marginBottom:10, padding:"8px 12px", borderRadius:8, background:"#f0f4ff", border:"1px solid #e0e7ff" }}><span style={{ fontSize:11, fontWeight:700, color:C.accent }}>AI Note: </span><span style={{ fontSize:13, color:C.text2 }}>{answer.ai_annotation}</span></div>}
          {answer.feedback && <p style={{ fontSize:13, color:C.text2, lineHeight:1.6, margin:"0 0 10px" }}>{answer.feedback}</p>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {answer.strengths?.length > 0 && <div>{answer.strengths.map((s,i) => <div key={i} style={{ fontSize:12, color:C.text2, lineHeight:1.6 }}>✓ {s}</div>)}</div>}
            {answer.gaps?.length > 0 && <div>{answer.gaps.map((g,i) => <div key={i} style={{ fontSize:12, color:C.text2, lineHeight:1.6 }}>△ {g}</div>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export function ScorecardView({ scorecard, onClose, onUpdateRecommendation }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(scorecard?.recruiter_notes || "");
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState(scorecard?.recommendation);
  const rec = REC[recommendation] || REC.consider;

  const saveNotes = async () => {
    setSaving(true);
    try { await fetch(`${API}/bot/scorecards/${scorecard.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ recruiter_notes:notes }) }); setEditingNotes(false); }
    finally { setSaving(false); }
  };
  const setRec = async (r) => {
    setRecommendation(r);
    await fetch(`${API}/bot/scorecards/${scorecard.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ recommendation:r }) });
    onUpdateRecommendation?.(r);
  };

  if (!scorecard) return null;
  const grouped = { knockout:(scorecard.answers||[]).filter(a=>a.question_type==="knockout"), competency:(scorecard.answers||[]).filter(a=>a.question_type==="competency"), technical:(scorecard.answers||[]).filter(a=>a.question_type==="technical"), culture:(scorecard.answers||[]).filter(a=>a.question_type==="culture") };

  return (
    <div style={{ fontFamily:F }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:16, padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}`, background:"linear-gradient(135deg,#f0f4ff,#f5f3ff)", borderRadius:"12px 12px 0 0" }}>
        <ScoreRing score={scorecard.total_score} max={scorecard.max_score} size={72}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:12, fontWeight:700, background:rec.bg, color:rec.color }}>{rec.label}</span>
            {!scorecard.knockout_passed && <span style={{ padding:"3px 8px", borderRadius:99, fontSize:11, fontWeight:700, background:"#fee2e2", color:"#dc2626" }}>Knockout Failed</span>}
          </div>
          <h3 style={{ margin:"0 0 4px", fontSize:16, fontWeight:800, color:C.text1 }}>{scorecard.headline || `${scorecard.candidate_name} — Pre-screen`}</h3>
          <p style={{ margin:0, fontSize:13, color:C.text2, lineHeight:1.5 }}>{scorecard.summary_text || "AI summary generating…"}</p>
        </div>
        {onClose && <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3 }}><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
      </div>
      {(scorecard.top_strengths?.length > 0 || scorecard.areas_to_probe?.length > 0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"16px 16px 0" }}>
          {scorecard.top_strengths?.length > 0 && <div style={{ background:"#f0fdf4", borderRadius:10, padding:"12px 14px", border:"1px solid #bbf7d0" }}><div style={{ fontSize:11, fontWeight:700, color:"#059669", textTransform:"uppercase", marginBottom:8 }}>Top Strengths</div>{scorecard.top_strengths.map((s,i)=><div key={i} style={{ fontSize:12, color:C.text2, lineHeight:1.7 }}>✓ {s}</div>)}</div>}
          {scorecard.areas_to_probe?.length > 0 && <div style={{ background:"#fffbeb", borderRadius:10, padding:"12px 14px", border:"1px solid #fde68a" }}><div style={{ fontSize:11, fontWeight:700, color:"#d97706", textTransform:"uppercase", marginBottom:8 }}>Probe in Interview</div>{scorecard.areas_to_probe.map((a,i)=><div key={i} style={{ fontSize:12, color:C.text2, lineHeight:1.7 }}>? {a}</div>)}</div>}
        </div>
      )}
      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", marginBottom:8 }}>Override Recommendation</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {Object.entries(REC).map(([key,m]) => <button key={key} onClick={()=>setRec(key)} style={{ padding:"5px 12px", borderRadius:99, border:`1.5px solid ${recommendation===key?m.bg:C.border}`, background:recommendation===key?m.bg:"white", color:recommendation===key?m.color:C.text2, fontSize:11, fontWeight:700, cursor:"pointer" }}>{m.label}</button>)}
        </div>
      </div>
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", marginBottom:10 }}>Question Breakdown — {scorecard.answers?.length||0} questions</div>
        {Object.entries(grouped).map(([type,answers]) => answers.length>0 ? <div key={type} style={{ marginBottom:14 }}><div style={{ fontSize:11, fontWeight:700, color:TYPE[type]?.color||C.accent, textTransform:"uppercase", marginBottom:6 }}>{TYPE[type]?.label||type} ({answers.length})</div>{answers.map((a,i)=><AnswerRow key={i} answer={a}/>)}</div> : null)}
      </div>
      <div style={{ padding:"14px 16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase" }}>Recruiter Notes</div>
          {!editingNotes && <button onClick={()=>setEditingNotes(true)} style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:12, fontWeight:600 }}>{notes?"Edit":"+ Add notes"}</button>}
        </div>
        {editingNotes ? <div><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${C.accent}`, fontSize:13, resize:"vertical", fontFamily:F, outline:"none", boxSizing:"border-box" }}/><div style={{ display:"flex", gap:8, marginTop:8 }}><button onClick={()=>setEditingNotes(false)} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", fontSize:12, cursor:"pointer" }}>Cancel</button><button onClick={saveNotes} disabled={saving} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:C.accent, color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>{saving?"Saving…":"Save"}</button></div></div>
        : notes ? <div style={{ fontSize:13, color:C.text2, lineHeight:1.6, background:"#fafafa", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}` }}>{notes}</div>
        : <div style={{ fontSize:13, color:C.text3, fontStyle:"italic" }}>No notes yet.</div>}
      </div>
    </div>
  );
}

export function ScorecardPanel({ record, environment }) {
  const [scorecards, setScorecards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    fetch(`${API}/bot/scorecards?candidate_id=${record.id}&environment_id=${environment.id}`)
      .then(r => r.json())
      .then(data => { setScorecards(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [record?.id, environment?.id]);

  if (loading) return <div style={{ padding:20, color:C.text3, fontSize:13 }}>Loading scorecards…</div>;

  if (selected) return (
    <div style={{ borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <ScorecardView scorecard={selected} onClose={()=>setSelected(null)}
        onUpdateRecommendation={r => { setScorecards(sc=>sc.map(s=>s.id===selected.id?{...s,recommendation:r}:s)); setSelected(s=>({...s,recommendation:r})); }}/>
    </div>
  );

  if (scorecards.length === 0) return (
    <div style={{ padding:"24px 20px", textAlign:"center" }}>
      <div style={{ width:48, height:48, borderRadius:12, background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
      </div>
      <p style={{ fontSize:13, color:C.text3, margin:0, lineHeight:1.6 }}>No scorecards yet. They're auto-generated when a candidate completes the AI pre-screen.</p>
    </div>
  );

  return (
    <div style={{ padding:"4px 0" }}>
      {scorecards.map(sc => {
        const rec = REC[sc.recommendation] || REC.consider;
        return (
          <div key={sc.id} onClick={()=>setSelected(sc)}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, cursor:"pointer", border:`1px solid ${C.border}`, marginBottom:8, background:"white", transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#f8faff";e.currentTarget.style.borderColor="#c7d2fe";}}
            onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor=C.border;}}>
            <ScoreRing score={sc.total_score} max={sc.max_score} size={44}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:3 }}>Pre-screen Scorecard</div>
              <div style={{ fontSize:11, color:C.text3 }}>{new Date(sc.created_at).toLocaleDateString()} · {sc.answers?.length||0} questions</div>
            </div>
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:rec.bg, color:rec.color, flexShrink:0 }}>{rec.label}</span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        );
      })}
    </div>
  );
}

export default ScorecardPanel;
