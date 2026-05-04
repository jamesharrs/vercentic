// client/src/InterviewPlanPanel.jsx
// Interview Plan panel — shown on Job records only.
// Defines ordered interview stages + shows candidate progress against the plan.

import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  surface:"#ffffff", border:"#e5e7eb",
  text1:"#111827", text2:"#374151", text3:"#9ca3af",
  accent:"#4361EE", accentLight:"#eef2ff",
  green:"#0CAF77", greenLight:"#ecfdf5",
  orange:"#f59f00", orangeLight:"#fffbeb",
  red:"#e03131", redLight:"#fef2f2",
};
const SVG = {
  plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
  grip:"M9 5h2M9 12h2M9 19h2M15 5h2M15 12h2M15 19h2",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  check:"M20 6L9 17l-5-5", chevD:"M6 9l6 6 6-6",
  arrowUp:"M12 19V5M5 12l7-7 7 7",
  arrowDown:"M12 5v14M5 12l7 7 7-7",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
};
const Ic = ({n,s=14,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <path d={SVG[n]||SVG.briefcase}/>
  </svg>
);
const Avatar = ({name,size=26,color=C.accent}) => {
  const initials=(name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"20",border:`1.5px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color,flexShrink:0,fontFamily:F}}>{initials}</div>;
};

// Stage status derived from scheduled interviews
const STATUS_META = {
  pending:   {label:"Pending",   color:C.text3,  bg:"#f3f4f6",    dot:"○"},
  scheduled: {label:"Scheduled", color:"#0891b2",bg:"#ecfeff",    dot:"◉"},
  done:      {label:"Completed", color:C.green,  bg:C.greenLight, dot:"✓"},
  cancelled: {label:"Cancelled", color:C.red,    bg:C.redLight,   dot:"✗"},
};

function stageStatusForPerson(stage, personName, interviews) {
  const iv = interviews.find(i =>
    (i.candidate_name||"").toLowerCase()===(personName||"").toLowerCase() &&
    (i.interview_type_id===stage.interview_type_id ||
     i.interview_type_name===stage.name ||
     i.interview_type_name===stage.interview_type_name)
  );
  if (!iv) return "pending";
  if (iv.status==="completed"||iv.status==="done") return "done";
  if (iv.status==="cancelled") return "cancelled";
  return "scheduled";
}

// Stage editor row
function StageRow({stage,index,total,interviewTypes,scorecardForms,onUpdate,onDelete,onMoveUp,onMoveDown}) {
  const [open,setOpen] = useState(false);
  const set = (k,v) => onUpdate({...stage,[k]:v});
  const typeDef = interviewTypes.find(t=>t.id===stage.interview_type_id);
  return (
    <div style={{border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:6,background:C.surface}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#fafbff",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{color:C.text3,cursor:"grab",display:"flex"}}><Ic n="grip" s={13}/></div>
        <div style={{width:22,height:22,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"white",flexShrink:0}}>{index+1}</div>
        <input value={stage.name} onChange={e=>{e.stopPropagation();set("name",e.target.value);}} onClick={e=>e.stopPropagation()}
          placeholder={`Stage ${index+1} name…`}
          style={{flex:1,border:"none",outline:"none",fontSize:13,fontWeight:700,color:C.text1,background:"transparent",fontFamily:F}}/>
        {typeDef && <span style={{fontSize:10,color:C.accent,background:C.accentLight,padding:"2px 7px",borderRadius:99,fontWeight:700,flexShrink:0}}>{typeDef.name}</span>}
        {stage.duration && <span style={{fontSize:10,color:C.text3,flexShrink:0}}>{stage.duration}m</span>}
        <div style={{display:"flex",gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <button disabled={index===0} onClick={onMoveUp} style={{background:"none",border:"none",cursor:"pointer",padding:3,opacity:index===0?.3:1,display:"flex"}}><Ic n="arrowUp" s={11} c={C.text3}/></button>
          <button disabled={index===total-1} onClick={onMoveDown} style={{background:"none",border:"none",cursor:"pointer",padding:3,opacity:index===total-1?.3:1,display:"flex"}}><Ic n="arrowDown" s={11} c={C.text3}/></button>
          <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="trash" s={12} c={C.red}/></button>
        </div>
        <div style={{transform:open?"rotate(180deg)":"none",transition:"transform .15s",display:"flex"}}><Ic n="chevD" s={12} c={C.text3}/></div>
      </div>
      {open && (
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <label>
            <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:4}}>Interview type</div>
            <select value={stage.interview_type_id||""} onChange={e=>{
              const t=interviewTypes.find(x=>x.id===e.target.value);
              onUpdate({...stage,interview_type_id:e.target.value,interview_type_name:t?.name||"",duration:t?.duration||stage.duration,format:t?.format||stage.format});
            }} style={{width:"100%",padding:"7px 9px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:F,outline:"none",background:"white",color:C.text1}}>
              <option value="">— none —</option>
              {interviewTypes.map(t=><option key={t.id} value={t.id}>{t.name} ({t.duration}m)</option>)}
            </select>
          </label>
          <label>
            <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:4}}>Format</div>
            <select value={stage.format||"Video Call"} onChange={e=>set("format",e.target.value)}
              style={{width:"100%",padding:"7px 9px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:F,outline:"none",background:"white"}}>
              {["Video Call","Phone","Onsite","Take-home","Panel","Technical"].map(f=><option key={f}>{f}</option>)}
            </select>
          </label>
          <label>
            <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:4}}>Duration (min)</div>
            <input type="number" value={stage.duration||30} onChange={e=>set("duration",Number(e.target.value))} min={5} max={480}
              style={{width:"100%",boxSizing:"border-box",padding:"7px 9px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:F,outline:"none"}}/>
          </label>
          <label>
            <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:4}}>Pass criteria</div>
            <input value={stage.pass_criteria||""} onChange={e=>set("pass_criteria",e.target.value)} placeholder="e.g. Score ≥ 70%"
              style={{width:"100%",boxSizing:"border-box",padding:"7px 9px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:F,outline:"none"}}/>
          </label>
          {/* Scorecard form picker */}
          <label style={{gridColumn:"1/-1"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:600,color:C.text2}}>Scorecard form</div>
              <span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#fef3c7",color:"#b45309",fontWeight:700}}>Optional</span>
            </div>
            <select value={stage.scorecard_form_id||""} onChange={e=>set("scorecard_form_id",e.target.value||null)}
              style={{width:"100%",padding:"7px 9px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:F,outline:"none",background:"white",color:C.text1}}>
              <option value="">— no scorecard —</option>
              {(scorecardForms||[]).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {stage.scorecard_form_id && (
              <div style={{fontSize:11,color:"#b45309",marginTop:4}}>
                Interviewers will be prompted to complete this scorecard after the interview.
              </div>
            )}
            {!scorecardForms?.length && (
              <div style={{fontSize:11,color:C.text3,marginTop:4}}>
                No scorecard forms yet — create one in Settings → Forms with category "Scorecard".
              </div>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

// Candidate progress row
function CandidateProgressRow({link,stages,interviews,onNavigate}) {
  const d    = link.person_data||{};
  const name = [d.first_name,d.last_name].filter(Boolean).join(" ")||d.email||"Unknown";
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,marginBottom:5}}>
      <div onClick={()=>onNavigate?.(link.person_record_id)}
        style={{display:"flex",alignItems:"center",gap:7,width:150,flexShrink:0,cursor:"pointer"}}>
        <Avatar name={name} size={26}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:C.accent,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
          <div style={{fontSize:10,color:C.text3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.current_title||d.job_title||"Candidate"}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3,flex:1,overflowX:"auto"}}>
        {stages.map((stage,i)=>{
          const status=stageStatusForPerson(stage,name,interviews);
          const m=STATUS_META[status]||STATUS_META.pending;
          return (
            <div key={stage.id} style={{display:"flex",alignItems:"center",gap:3}}>
              {i>0&&<div style={{width:12,height:1.5,background:status==="pending"?C.border:m.color+"40",flexShrink:0}}/>}
              <div title={`${stage.name} — ${m.label}`}
                style={{width:26,height:26,borderRadius:"50%",background:m.bg,border:`1.5px solid ${m.color}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:status==="pending"?9:10,fontWeight:800,color:m.color,lineHeight:1}}>{status==="pending"?i+1:m.dot}</span>
              </div>
            </div>
          );
        })}
        {stages.length===0&&<span style={{fontSize:11,color:C.text3}}>No stages defined</span>}
      </div>
      <div style={{fontSize:10,color:C.text3,flexShrink:0,textAlign:"right",minWidth:70,whiteSpace:"nowrap"}}>{link.stage_name||"Applied"}</div>
    </div>
  );
}

// Main export
export function InterviewPlanPanel({record, environment, onNavigate}) {
  const [plan,   setPlan]   = useState(null);
  const [stages, setStages] = useState([]);
  const [types,  setTypes]  = useState([]);
  const [links,  setLinks]  = useState([]);
  const [ivs,    setIvs]    = useState([]);
  const [scorecardForms, setScorecardForms] = useState([]);
  const [loading,setLoading]= useState(true);
  const [saving, setSaving] = useState(false);
  const [view,   setView]   = useState("plan");

  const load = useCallback(async () => {
    if (!record?.id||!environment?.id) return;
    setLoading(true);
    try {
      const [plans,iTypes,peopleLinks,interviews,scForms] = await Promise.all([
        api.get(`/interview-plans?job_id=${record.id}&environment_id=${environment.id}`),
        api.get(`/interview-types?environment_id=${environment.id}`),
        api.get(`/workflows/people-links?target_record_id=${record.id}&environment_id=${environment.id}`),
        api.get(`/interviews?environment_id=${environment.id}`),
        api.get(`/forms?environment_id=${environment.id}&category=scorecard`),
      ]);
      const p=Array.isArray(plans)?plans[0]:null;
      setPlan(p||null); setStages(p?.stages||[]);
      setTypes(Array.isArray(iTypes)?iTypes:[]);
      setLinks(Array.isArray(peopleLinks)?peopleLinks:[]);
      setIvs(Array.isArray(interviews)?interviews:[]);
      setScorecardForms(Array.isArray(scForms)?scForms:[]);
    } catch(e){console.error("InterviewPlanPanel:",e);}
    setLoading(false);
  },[record?.id,environment?.id]);

  useEffect(()=>{load();},[load]);

  const ensurePlan = async () => {
    if (plan) return plan;
    const p = await api.post("/interview-plans",{job_id:record.id,environment_id:environment.id});
    setPlan(p); return p;
  };

  const saveStages = async () => {
    setSaving(true);
    try {
      const p = await ensurePlan();
      const saved = await api.put(`/interview-plans/${p.id}/stages`,{stages});
      setStages(saved);
    } catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
  };

  const addStage  = () => setStages(s=>[...s,{id:`new_${Date.now()}`,name:"",duration:30,format:"Video Call",interviewers:[],pass_criteria:""}]);
  const updateStage=(i,u)=>setStages(s=>s.map((st,idx)=>idx===i?u:st));
  const deleteStage=(i)=>setStages(s=>s.filter((_,idx)=>idx!==i));
  const moveStage=(i,dir)=>setStages(s=>{
    const a=[...s];const j=i+dir;
    if(j<0||j>=a.length)return a;
    [a[i],a[j]]=[a[j],a[i]];return a;
  });

  if (loading) return <div style={{padding:"20px 0",textAlign:"center",color:C.text3,fontSize:13}}>Loading…</div>;

  const jobTitle=record?.data?.job_title||record?.data?.title||"this role";
  const isDirty=JSON.stringify(stages)!==JSON.stringify(plan?.stages||[]);

  return (
    <div style={{fontFamily:F}}>
      {/* Tab bar */}
      <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${C.border}`,paddingBottom:10}}>
        {[["plan","Interview Plan","briefcase"],["progress",`Candidates (${links.length})`,"user"]].map(([id,label,icon])=>(
          <button key={id} onClick={()=>setView(id)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,border:"none",background:view===id?C.accent:"transparent",color:view===id?"white":C.text3,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
            <Ic n={icon} s={11} c={view===id?"white":C.text3}/>{label}
          </button>
        ))}
      </div>

      {/* Plan tab */}
      {view==="plan" && (
        <div>
          {stages.length===0?(
            <div style={{textAlign:"center",padding:"24px 16px",border:`2px dashed ${C.border}`,borderRadius:12,color:C.text3}}>
              <Ic n="briefcase" s={28} c={C.border}/>
              <div style={{fontSize:13,fontWeight:600,marginTop:10,marginBottom:4}}>No interview plan yet</div>
              <div style={{fontSize:12,marginBottom:14}}>Define the stages for <strong>{jobTitle}</strong> so every candidate follows the same structured process.</div>
              <button onClick={addStage}
                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                <Ic n="plus" s={13} c="white"/> Build interview plan
              </button>
            </div>
          ):(
            <>
              <div style={{marginBottom:8}}>
                {stages.map((st,i)=>(
                  <StageRow key={st.id} stage={st} index={i} total={stages.length}
                    interviewTypes={types} scorecardForms={scorecardForms}
                    onUpdate={u=>updateStage(i,u)} onDelete={()=>deleteStage(i)}
                    onMoveUp={()=>moveStage(i,-1)} onMoveDown={()=>moveStage(i,1)}/>
                ))}
              </div>
              <button onClick={addStage}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.text3,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,width:"100%",justifyContent:"center",marginBottom:12}}>
                <Ic n="plus" s={12}/> Add stage
              </button>
              {isDirty&&(
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setStages(plan?.stages||[])} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                  <button onClick={saveStages} disabled={saving}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"7px 18px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:saving?.6:1}}>
                    <Ic n="check" s={12} c="white"/>{saving?"Saving…":"Save plan"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Progress tab */}
      {view==="progress" && (
        <div>
          {links.length===0?(
            <div style={{textAlign:"center",padding:"20px",color:C.text3,fontSize:12}}>
              No candidates linked to this job yet.<br/>
              <span style={{fontSize:11}}>Link candidates via the pipeline widget at the top of this page.</span>
            </div>
          ):stages.length===0?(
            <div style={{padding:"10px 14px",borderRadius:10,background:C.orangeLight,border:`1px solid ${C.orange}30`,fontSize:12,color:"#92400e"}}>
              Build an interview plan first (Plan tab) to track candidate progress through stages.
            </div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 10px 6px"}}>
                <div style={{width:150,flexShrink:0}}/>
                <div style={{display:"flex",gap:3,flex:1}}>
                  {stages.map((st,i)=>(
                    <div key={st.id} style={{display:"flex",alignItems:"center",gap:3}}>
                      {i>0&&<div style={{width:12}}/>}
                      <div style={{width:26,textAlign:"center",fontSize:9,fontWeight:700,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",maxWidth:60,whiteSpace:"nowrap"}} title={st.name}>{st.name||`S${i+1}`}</div>
                    </div>
                  ))}
                </div>
              </div>
              {links.map(link=>(
                <CandidateProgressRow key={link.id} link={link} stages={stages} interviews={ivs} onNavigate={onNavigate}/>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
