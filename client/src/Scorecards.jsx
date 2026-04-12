import { useState, useEffect, useCallback } from "react";
import api from "./apiClient";

const F = "var(--t-font,'Plus Jakarta Sans',sans-serif)";
const C = {
  accent:"var(--t-accent,#3b5bdb)", accentLight:"var(--t-accentLight,#eef2ff)",
  border:"var(--t-border,#e5e7eb)", surface:"var(--t-surface,#fff)",
  surface2:"var(--t-surface2,#f8fafc)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9ca3af)",
  green:"#059669", red:"#ef4444", amber:"#d97706",
};
const REC_OPTIONS = [
  {value:"strong_yes",label:"Strong Yes",color:"#059669",bg:"#ecfdf5"},
  {value:"yes",       label:"Yes",        color:"#3b82f6",bg:"#eff6ff"},
  {value:"no",        label:"No",         color:"#d97706",bg:"#fffbeb"},
  {value:"strong_no", label:"Strong No",  color:"#ef4444",bg:"#fef2f2"},
];
const NAMED_LABELS={5:"Exceptional",4:"Strong",3:"Meets",2:"Below",1:"Poor"};
const NAMED_COLORS={5:"#059669",4:"#3b82f6",3:"#6b7280",2:"#d97706",1:"#ef4444"};

function RatingInput({value,onChange,scale}){
  const max=scale==="ten_point"?10:5;
  if(scale==="named"){return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[5,4,3,2,1].map(n=>(
        <button key={n} onClick={()=>onChange(n)} style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${value===n?NAMED_COLORS[n]:C.border}`,background:value===n?NAMED_COLORS[n]+"18":"transparent",color:value===n?NAMED_COLORS[n]:C.text3,fontFamily:F,fontSize:11,fontWeight:value===n?700:400,cursor:"pointer"}}>
          {NAMED_LABELS[n]}
        </button>
      ))}
    </div>
  );}
  return(
    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
      {Array.from({length:max},(_,i)=>i+1).map(n=>{
        const active=value!==null&&n<=value;
        const col=value>=max*0.8?"#059669":value>=max*0.5?"#3b82f6":value?"#ef4444":"#9ca3af";
        return(<button key={n} onClick={()=>onChange(n===value?null:n)} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${active?col:C.border}`,background:active?col+"18":"transparent",color:active?col:C.text3,fontFamily:F,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</button>);
      })}
      {value&&<button onClick={()=>onChange(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.text3}}>clear</button>}
    </div>
  );
}

export function ScorecardForm({interviewId,candidateRecordId,jobRecordId,interviewerId,interviewerName,templateId,environment,session,onSubmitted,onClose}){
  const[template,setTemplate]=useState(null);
  const[responses,setResponses]=useState({});
  const[recommendation,setRecommendation]=useState(null);
  const[overall,setOverall]=useState("");
  const[highlights,setHighlights]=useState("");
  const[redFlags,setRedFlags]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[submitted,setSubmitted]=useState(false);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const all=await api.get(`/scorecards/templates?environment_id=${environment?.id}`).catch(()=>[]);
        const tmpl=(Array.isArray(all)?all:[]).find(t=>t.id===templateId)||(Array.isArray(all)?all:[])[0]||null;
        setTemplate(tmpl);
        if(interviewId&&interviewerId){
          const subs=await api.get(`/scorecards/submissions?interview_id=${interviewId}`).catch(()=>[]);
          const mine=(Array.isArray(subs)?subs:[]).find(s=>s.interviewer_id===interviewerId);
          if(mine){
            const rm={};(mine.responses||[]).forEach(r=>{rm[r.competency_id]={rating:r.rating,notes:r.notes||""};});
            setResponses(rm);setRecommendation(mine.recommendation||null);setOverall(mine.overall_comments||"");setHighlights(mine.highlights||"");setRedFlags(mine.red_flags||"");
            if(mine.status==="submitted")setSubmitted(true);
          }
        }
      }finally{setLoading(false);}
    })();
  },[templateId,interviewId,interviewerId,environment?.id]);

  const setResp=(cid,field,val)=>setResponses(p=>({...p,[cid]:{...p[cid],[field]:val}}));
  const completeness=template?(()=>{const req=(template.competencies||[]).filter(c=>c.required);const done=req.filter(c=>responses[c.id]?.rating!=null).length;return req.length?Math.round(done/req.length*100):100;})():0;

  const save=async(status="draft")=>{
    if(!template)return; setSaving(true);
    try{
      const payload={interview_id:interviewId,candidate_record_id:candidateRecordId,job_record_id:jobRecordId,template_id:template.id,
        interviewer_id:interviewerId||session?.user?.id,interviewer_name:interviewerName||[session?.user?.first_name,session?.user?.last_name].filter(Boolean).join(" ")||"Interviewer",
        recommendation,overall_comments:overall,highlights,red_flags:redFlags,status,
        responses:(template.competencies||[]).map(c=>({competency_id:c.id,rating:responses[c.id]?.rating??null,notes:responses[c.id]?.notes||""}))};
      const res=await api.post("/scorecards/submissions",payload);
      if(status==="submitted"){setSubmitted(true);onSubmitted?.(res);}
    }finally{setSaving(false);}
  };

  if(loading)return<div style={{padding:32,textAlign:"center",color:C.text3,fontFamily:F}}>Loading…</div>;
  if(!template)return<div style={{padding:32,textAlign:"center",color:C.text3,fontFamily:F}}>No scorecard template found. Create one in Settings → Scorecards.</div>;
  if(submitted)return(
    <div style={{padding:40,textAlign:"center",fontFamily:F}}>
      <div style={{fontSize:40,marginBottom:12}}>✅</div>
      <div style={{fontWeight:800,fontSize:18,color:C.text1,marginBottom:6}}>Scorecard submitted</div>
      <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Your feedback has been recorded.</div>
      {onClose&&<button onClick={onClose} style={{padding:"9px 20px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,fontFamily:F,fontSize:13,cursor:"pointer"}}>Close</button>}
    </div>
  );

  return(
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontWeight:800,fontSize:16,color:C.text1}}>{template.name}</div>
          <div style={{fontSize:12,color:completeness===100?C.green:C.text3,fontWeight:600}}>{completeness}% complete</div>
        </div>
        <div style={{height:4,background:C.border,borderRadius:99}}>
          <div style={{height:"100%",background:completeness===100?C.green:C.accent,borderRadius:99,width:`${completeness}%`,transition:"width .3s"}}/>
        </div>
      </div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:F,fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Competencies</div>
        {(template.competencies||[]).map(comp=>{
          const resp=responses[comp.id]||{rating:null,notes:""};
          const hasRating=resp.rating!==null&&resp.rating!==undefined;
          return(
            <div key={comp.id} style={{background:hasRating?C.accentLight:C.surface2,border:`1.5px solid ${hasRating?C.accent+"40":C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontWeight:700,fontSize:13,color:C.text1}}>{comp.name}</span>
                {comp.required&&<span style={{fontSize:10,color:C.accent,fontWeight:700,background:C.accentLight,padding:"1px 5px",borderRadius:99}}>required</span>}
                {comp.weight>1&&<span style={{fontSize:10,color:C.text3}}>×{comp.weight}</span>}
              </div>
              {comp.description&&<div style={{fontSize:12,color:C.text3,marginBottom:10}}>{comp.description}</div>}
              <RatingInput value={resp.rating} onChange={v=>setResp(comp.id,"rating",v)} scale={template.rating_scale}/>
              <textarea value={resp.notes} onChange={e=>setResp(comp.id,"notes",e.target.value)} placeholder="Notes on this competency (optional)…" rows={2}
                style={{width:"100%",marginTop:10,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box",color:C.text2}}/>
            </div>
          );
        })}
      </div>
      <div style={{background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"16px 18px",marginBottom:20}}>
        <div style={{fontFamily:F,fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Overall Assessment</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:8}}>Recommendation *</div>
          <div style={{display:"flex",gap:8}}>
            {REC_OPTIONS.map(r=><button key={r.value} onClick={()=>setRecommendation(r.value)} style={{flex:1,padding:"8px 0",borderRadius:9,border:`2px solid ${recommendation===r.value?r.color:C.border}`,background:recommendation===r.value?r.bg:"transparent",color:recommendation===r.value?r.color:C.text3,fontFamily:F,fontSize:12,fontWeight:recommendation===r.value?700:500,cursor:"pointer"}}>{r.label}</button>)}
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Overall Comments</label>
          <textarea value={overall} onChange={e=>setOverall(e.target.value)} rows={3} placeholder="Summarise your overall impression…"
            style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border}`,fontFamily:F,fontSize:13,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.green,display:"block",marginBottom:6}}>✓ Highlights</label>
            <textarea value={highlights} onChange={e=>setHighlights(e.target.value)} rows={2} placeholder="What stood out positively…"
              style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.red,display:"block",marginBottom:6}}>⚠ Red Flags</label>
            <textarea value={redFlags} onChange={e=>setRedFlags(e.target.value)} rows={2} placeholder="Any concerns…"
              style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        {onClose&&<button onClick={onClose} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,fontFamily:F,fontSize:13,cursor:"pointer"}}>Cancel</button>}
        <button onClick={()=>save("draft")} disabled={saving} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,fontFamily:F,fontSize:13,cursor:"pointer",color:C.text2}}>Save Draft</button>
        <button onClick={()=>save("submitted")} disabled={saving||!recommendation} title={!recommendation?"Select a recommendation first":""} style={{padding:"9px 20px",borderRadius:9,border:"none",background:recommendation?C.accent:"#e5e7eb",color:recommendation?"white":C.text3,fontFamily:F,fontSize:13,fontWeight:700,cursor:recommendation?"pointer":"not-allowed"}}>
          {saving?"Submitting…":"Submit Scorecard"}
        </button>
      </div>
    </div>
  );
}

export function ScorecardPanel({record,environment,session,jobRecordId}){
  const[summary,setSummary]=useState(null);
  const[templates,setTemplates]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showForm,setShowForm]=useState(false);
  const[expanded,setExpanded]=useState(null);

  const load=useCallback(async()=>{
    if(!record?.id||!environment?.id)return; setLoading(true);
    const jobParam = jobRecordId ? `&job_record_id=${jobRecordId}` : "";
    const[sum,tmpl]=await Promise.all([
      api.get(`/scorecards/summary?candidate_record_id=${record.id}${jobParam}`).catch(()=>null),
      api.get(`/scorecards/templates?environment_id=${environment.id}`).catch(()=>[]),
    ]);
    setSummary(sum); setTemplates(Array.isArray(tmpl)?tmpl:[]); setLoading(false);
  },[record?.id,environment?.id]);
  useEffect(()=>{load();},[load]);

  if(loading)return<div style={{padding:24,textAlign:"center",color:C.text3,fontFamily:F}}>Loading…</div>;
  const recOpt=v=>REC_OPTIONS.find(r=>r.value===v);
  const maxR=summary?.competency_averages?.[0]?.avg>5?10:5;
  const recTotal=summary?Object.values(summary.recommendation_breakdown||{}).reduce((a,b)=>a+b,0):0;

  return(
    <div style={{fontFamily:F}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,color:C.text1}}>
          Scorecards
          {summary?.total_submissions>0&&<span style={{fontWeight:400,color:C.text3,marginLeft:6}}>({summary.total_submissions} submitted)</span>}
        </div>
        {templates.length>0&&<button onClick={()=>setShowForm(true)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontFamily:F,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Scorecard</button>}
      </div>

      {(!summary||summary.total_submissions===0)?(
        <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"28px 20px",textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:8}}>📋</div>
          <div style={{fontSize:13,fontWeight:600,color:C.text1,marginBottom:4}}>No scorecards submitted yet</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:16}}>Interviewers can submit feedback after each interview</div>
          {templates.length>0?<button onClick={()=>setShowForm(true)} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontFamily:F,fontSize:12,fontWeight:600,cursor:"pointer"}}>Add Scorecard</button>
            :<div style={{fontSize:12,color:C.text3}}>Create a template in Settings → Scorecards first</div>}
        </div>
      ):(
        <>
          {summary.ai_summary&&(
            <div style={{background:"linear-gradient(135deg,#f5f3ff,#eff6ff)",border:`1px solid #c4b5fd`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>✦ AI Summary</div>
              <div style={{fontSize:13,color:C.text1,lineHeight:1.6}}>{summary.ai_summary}</div>
            </div>
          )}
          <div style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Recommendation Breakdown</div>
            <div style={{display:"flex",gap:8}}>
              {REC_OPTIONS.map(r=>{const count=summary.recommendation_breakdown?.[r.value]||0;if(!count)return null;return(
                <div key={r.value} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:8,background:r.bg,border:`1px solid ${r.color}30`}}>
                  <div style={{fontSize:22,fontWeight:800,color:r.color}}>{count}</div>
                  <div style={{fontSize:11,fontWeight:600,color:r.color}}>{r.label}</div>
                </div>
              );}).filter(Boolean)}
            </div>
          </div>
          {summary.competency_averages?.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Competency Averages</div>
              {summary.competency_averages.map(c=>{
                const pct=c.avg!==null?(c.avg/maxR)*100:0;
                const col=pct>=80?C.green:pct>=60?C.accent:pct>=40?C.amber:C.red;
                return(<div key={c.competency_id} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:12,color:C.text2}}>{c.name}</span>
                    <span style={{fontSize:12,fontWeight:700,color:col}}>{c.avg!==null?`${c.avg}/${maxR}`:"—"}</span>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:99}}><div style={{height:"100%",background:col,borderRadius:99,width:`${pct}%`,transition:"width .4s"}}/></div>
                </div>);
              })}
              {summary.overall_average!==null&&<div style={{marginTop:8,padding:"8px 12px",background:C.surface2,borderRadius:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:600,color:C.text2}}>Overall Weighted Average</span><span style={{fontSize:13,fontWeight:800,color:C.accent}}>{summary.overall_average}/{maxR}</span></div>}
            </div>
          )}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Individual Scorecards</div>
            {summary.submissions.map(sub=>{
              const rec=recOpt(sub.recommendation);const isOpen=expanded===sub.id;
              return(<div key={sub.id} style={{border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6,overflow:"hidden"}}>
                <div onClick={()=>setExpanded(isOpen?null:sub.id)} style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isOpen?C.accentLight:C.surface}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:11,fontWeight:700,flexShrink:0}}>{(sub.interviewer_name||"?").charAt(0).toUpperCase()}</div>
                  <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13,color:C.text1}}>{sub.interviewer_name}</span><span style={{fontSize:11,color:C.text3,marginLeft:8}}>{sub.submitted_at?new Date(sub.submitted_at).toLocaleDateString():"—"}</span></div>
                  {rec&&<span style={{fontSize:11,fontWeight:700,color:rec.color,background:rec.bg,padding:"2px 8px",borderRadius:99}}>{rec.label}</span>}
                  <span style={{fontSize:14,color:C.text3}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(<div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,background:"#fafbfc"}}>
                  {sub.overall_comments&&<p style={{fontSize:13,color:C.text2,margin:"0 0 10px",lineHeight:1.6}}>{sub.overall_comments}</p>}
                  {sub.highlights&&<div style={{marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:C.green}}>✓ Highlights: </span><span style={{fontSize:12,color:C.text2}}>{sub.highlights}</span></div>}
                  {sub.red_flags&&<div><span style={{fontSize:11,fontWeight:700,color:C.red}}>⚠ Red flags: </span><span style={{fontSize:12,color:C.text2}}>{sub.red_flags}</span></div>}
                </div>)}
              </div>);
            })}
          </div>
        </>
      )}

      {showForm&&templates[0]&&(
        <div style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false);}}>
          <div style={{width:640,maxHeight:"88vh",background:C.surface,borderRadius:16,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontFamily:F,fontWeight:800,fontSize:15,color:C.text1}}>Submit Scorecard</span>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.text3}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              <ScorecardForm candidateRecordId={record.id} environment={environment} session={session} templateId={templates[0].id}
                interviewerId={session?.user?.id} interviewerName={[session?.user?.first_name,session?.user?.last_name].filter(Boolean).join(" ")||"Interviewer"}
                onSubmitted={()=>{setShowForm(false);load();}} onClose={()=>setShowForm(false)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
