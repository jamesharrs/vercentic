import { usePermissions as _usePermCtxAI } from "./PermissionContext.jsx";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { buildHelpContext } from "./helpContent";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af",
  accent:"#3b5bdb", accentLight:"#eef1ff",
  ai:"#7c3aed", aiLight:"#f5f3ff",
};

import api from './apiClient.js';
import { tFetch } from './apiClient.js';


const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    x:"M18 6L6 18M6 6l12 12",
    send:"M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z",
    sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17zM19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75L19 3z",
    user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    check:"M20 6L9 17l-5-5",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    fileText:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    copy:"M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.912 4.895 3 6 3h8c1.105 0 2 .912 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.088 19.105 22 18 22h-8c-1.105 0-2-.912-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    "bar-chart-2":"M18 20V10M12 20V4M6 20v-6",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    plus:"M12 5v14M5 12h14",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    arrowR:"M5 12h14M12 5l7 7-7 7",
    shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    workflow:"M22 12h-4l-3 9L9 3l-3 9H2",
    calendar:"M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    "refresh-cw":"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    "alert-triangle":"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    "arrow-right":"M5 12h14M12 5l7 7-7 7",
    paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
    trash:"M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};

const Avatar = ({ name, color=C.accent, size=28 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    <span style={{ color:"white", fontSize:size*0.35, fontWeight:700 }}>{name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?"}</span>
  </div>
);

const Badge = ({ children, color="#6b7280", light }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, background:light?`${color}15`:color, color:light?color:"white" }}>
    {children}
  </span>
);

/* ─── Score ring ─────────────────────────────────────────────────────────── */
const ScoreRing = ({ score, size=52 }) => {
  const sw = size <= 32 ? 3 : size <= 40 ? 4 : 6;
  const r = (size-sw*2)/2;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  const color = score>=75?"#0ca678":score>=50?"#f59f00":"#e03131";
  const numSize = size <= 32 ? 9 : size <= 40 ? 11 : 12;
  const pctSize = size <= 32 ? 6 : 8;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray .6s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:numSize, fontWeight:800, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:pctSize, color, fontWeight:600, opacity:0.8 }}>%</span>
      </div>
    </div>
  );
};

/* ─── Matching Engine ────────────────────────────────────────────────────── */
export const matchCandidateToJob = (candidate, job) => {
  let score = 0;
  const reasons = [];
  const gaps = [];
  const cData = candidate.data || {};
  const jData = job.data || {};

  const cSkills = (Array.isArray(cData.skills)?cData.skills:String(cData.skills||"").split(",")).map(s=>s.trim().toLowerCase()).filter(Boolean);
  const jSkills = (Array.isArray(jData.required_skills)?jData.required_skills:String(jData.required_skills||"").split(",")).map(s=>s.trim().toLowerCase()).filter(Boolean);
  if (jSkills.length > 0) {
    const matched = cSkills.filter(s=>jSkills.some(j=>j.includes(s)||s.includes(j)));
    score += Math.round((matched.length/jSkills.length)*40);
    if (matched.length>0) reasons.push(`Matches ${matched.length}/${jSkills.length} required skills`);
    const missing = jSkills.filter(j=>!cSkills.some(c=>c.includes(j)||j.includes(c)));
    if (missing.length>0) gaps.push(`Missing: ${missing.slice(0,3).join(", ")}`);
  } else score += 30;

  if (cData.location && jData.location) {
    const cl=String(cData.location).toLowerCase(), jl=String(jData.location).toLowerCase();
    if (cl===jl||cl.includes(jl)||jl.includes(cl)) { score+=20; reasons.push("Location match"); }
    else if (jData.work_type==="Remote") { score+=15; reasons.push("Remote role"); }
    else gaps.push(`Location: ${cData.location} vs ${jData.location}`);
  } else score+=10;

  const exp=Number(cData.years_experience||0);
  if (exp>=5){score+=20;reasons.push(`${exp}y exp`);}
  else if(exp>=2){score+=12;reasons.push(`${exp}y exp`);}
  else if(exp>0){score+=6;gaps.push("Limited experience");}

  if (cData.status==="Active"){score+=10;reasons.push("Actively looking");}
  else if(cData.status==="Passive") score+=5;
  else if(cData.status==="Not Looking") gaps.push("Not actively looking");

  const rating=Number(cData.rating||0);
  if(rating>=4){score+=10;reasons.push(`Rated ${rating}/5`);}
  else if(rating>=3) score+=5;

  return { score:Math.min(100,Math.max(0,score)), reasons, gaps };
};

// ── Matching helpers (module-level so MatchResultsList can use them) ──────────
const getTitle = (r, slug) => {
  const d = r.data || {};
  if (slug==="people") return [d.first_name,d.last_name].filter(Boolean).join(" ")||"Untitled";
  if (slug==="jobs")   return d.job_title||d.name||"Untitled";
  return d.pool_name||d.name||"Untitled";
};
const itemIcon  = (type) => type==="person" ? "user" : type==="job" ? "briefcase" : "layers";
const itemColor = (type) => type==="person" ? "#3b5bdb" : type==="job" ? "#0ca678" : "#7c3aed";

// ── Compact match results list with 5-item limit + expand ─────────────────────
const MatchResultsList = ({ matches, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? matches : matches.slice(0, 5);

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {visible.map((m, i) => {
          const title = getTitle(m.item, m.type==="person"?"people":m.type==="job"?"jobs":"talent-pools");
          const color = itemColor(m.type);
          const d = m.item.data || {};
          const sub = m.type==="person"
            ? [d.current_title, d.location].filter(Boolean).join(" · ")
            : m.type==="job"
            ? [d.department, d.location, d.work_type].filter(Boolean).join(" · ")
            : d.category || "";
          const scoreCol = m.score>=75?"#0ca678":m.score>=50?"#f59f00":"#ef4444";
          const allTags = [...(m.reasons||[]).map(r=>({text:r,ok:true})), ...(m.gaps||[]).map(g=>({text:g,ok:false}))];

          return (
            <div key={m.item.id}
              onClick={() => onNavigate ? onNavigate(m.item) : window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:m.item.id,objectId:m.item.object_id}}))}
              style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",overflow:"hidden",height:48,transition:"box-shadow .12s",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,.07)";e.currentTarget.style.borderColor=C.accent+"44";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>

              {/* Score bar */}
              <div style={{width:3,alignSelf:"stretch",background:scoreCol,flexShrink:0}}/>

              {/* Icon chip */}
              <div style={{width:24,height:24,borderRadius:6,background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,margin:"0 8px 0 10px"}}>
                <Ic n={itemIcon(m.type)} s={11} c="white"/>
              </div>

              {/* Title */}
              <span style={{fontSize:12,fontWeight:700,color:C.text1,flexShrink:0,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:6}}>{title}</span>

              {/* Status badge */}
              {d.status && <span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:99,background:d.status==="Active"||d.status==="Open"?"#f0fdf4":"#f1f5f9",color:d.status==="Active"||d.status==="Open"?"#0ca678":"#6b7280",flexShrink:0,marginRight:6}}>{d.status}</span>}

              {/* Subtitle */}
              {sub && <span style={{fontSize:11,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{sub}</span>}
              {!sub && <div style={{flex:1}}/>}

              {/* Tags inline */}
              <div style={{display:"flex",gap:3,flexShrink:0,marginRight:10}}>
                {allTags.slice(0,2).map((tag,ti)=>(
                  <span key={ti} style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:tag.ok?"#f0fdf4":"#fffbeb",color:tag.ok?"#0ca678":"#d97706",whiteSpace:"nowrap"}}>
                    {tag.ok?"✓ ":""}{tag.text}
                  </span>
                ))}
                {allTags.length>2 && <span style={{fontSize:10,color:C.text3}}>+{allTags.length-2}</span>}
              </div>

              {/* Score pill */}
              <div style={{padding:"0 12px",flexShrink:0,borderLeft:`1px solid ${C.border}`,height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{minWidth:36,padding:"3px 7px",borderRadius:6,border:`1.5px solid ${scoreCol}`,background:`${scoreCol}10`,textAlign:"center"}}>
                  <span style={{fontSize:13,fontWeight:800,color:scoreCol,lineHeight:1}}>{m.score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {matches.length > 5 && (
        <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%",marginTop:8,padding:"8px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text3,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .12s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#f8f9fc";e.currentTarget.style.color=C.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text3;}}>
          {expanded ? `Show less ↑` : `Show ${matches.length-5} more ↓`}
        </button>
      )}
    </div>
  );
};

export const MatchingEngine = memo(({ environment, initialObject, initialRecord, onNavigate }) => {
  const mode = initialObject?.slug === "jobs" ? "job" : "person"; // "job" = rank candidates, "person" = rank jobs
  const [objects,setObjects]   = useState([]);
  const [fields,setFields]     = useState({});
  const [people,setPeople]     = useState([]);
  const [jobs,setJobs]         = useState([]);
  const [pools,setPools]       = useState([]);
  const [matches,setMatches]   = useState([]);
  const [loading,setLoading]   = useState(false);
  const [minScore,setMinScore] = useState(0);
  const [matchTarget,setMatchTarget] = useState("jobs"); // for person mode: "jobs" | "pools"

  // In job mode the "selected job" is always the initialRecord (locked)
  // In person mode we match the initialRecord person against all jobs/pools
  const lockedRecord = initialRecord;

  useEffect(()=>{
    if(!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(async objs=>{
      if(!Array.isArray(objs)) return;
      setObjects(objs);
      const fm={};
      await Promise.all(objs.map(async o=>{ const fs=await api.get(`/fields?object_id=${o.id}`); fm[o.id]=Array.isArray(fs)?fs:[]; }));
      setFields(fm);
      const po=objs.find(o=>o.slug==="people");
      const jo=objs.find(o=>o.slug==="jobs");
      const tpo=objs.find(o=>o.slug==="talent-pools");
      if(po){ const r=await api.get(`/records?object_id=${po.id}&environment_id=${environment.id}&limit=200`); setPeople(r.records||[]); }
      if(jo){ const r=await api.get(`/records?object_id=${jo.id}&environment_id=${environment.id}&limit=200`); setJobs(r.records||[]); }
      if(tpo){ const r=await api.get(`/records?object_id=${tpo.id}&environment_id=${environment.id}&limit=200`); setPools(r.records||[]); }
    });
  },[environment?.id]);

  // Scoring: match a person against a job (returns {score,reasons,gaps})
  const scorePersonForJob = (person, job) => matchCandidateToJob(person, job);

  // Scoring: match a person against a talent pool
  const scorePersonForPool = (person, pool) => {
    let score=0; const reasons=[]; const gaps=[];
    const pd=person.data||{}, ppd=pool.data||{};
    const pSkills=(Array.isArray(pd.skills)?pd.skills:String(pd.skills||"").split(",")).map(s=>s.trim().toLowerCase()).filter(Boolean);
    const poolCat=String(ppd.category||ppd.name||"").toLowerCase();
    if(poolCat && pSkills.some(s=>poolCat.includes(s)||s.includes(poolCat))){ score+=35; reasons.push(`Skills align with ${ppd.category||ppd.name}`); }
    else score+=15;
    if(pd.location && ppd.location){ const pl=String(pd.location).toLowerCase(),pll=String(ppd.location).toLowerCase(); if(pl.includes(pll)||pll.includes(pl)){score+=20;reasons.push("Location match");} }
    else score+=10;
    const exp=Number(pd.years_experience||0);
    if(exp>=5){score+=20;reasons.push(`${exp}y experience`);}
    else if(exp>=2){score+=12;reasons.push(`${exp}y experience`);}
    if(pd.status==="Active"){score+=15;reasons.push("Actively looking");}
    else if(pd.status==="Passive") score+=8;
    else gaps.push("Not actively looking");
    const rating=Number(pd.rating||0);
    if(rating>=4){score+=10;reasons.push(`Rated ${rating}/5`);}
    return {score:Math.min(100,Math.max(0,score)),reasons,gaps};
  };

  useEffect(()=>{
    if(!lockedRecord) return;
    setLoading(true);
    let scored=[];
    if(mode==="job"){
      // Rank all people against this job
      scored=people.map(p=>({item:p,type:"person",...scorePersonForJob(p,lockedRecord)})).sort((a,b)=>b.score-a.score);
    } else {
      // Rank all jobs or pools against this person
      if(matchTarget==="jobs"){
        scored=jobs.map(j=>({item:j,type:"job",...scorePersonForJob(lockedRecord,j)})).sort((a,b)=>b.score-a.score);
      } else {
        scored=pools.map(p=>({item:p,type:"pool",...scorePersonForPool(lockedRecord,p)})).sort((a,b)=>b.score-a.score);
      }
    }
    setTimeout(()=>{setMatches(scored);setLoading(false);},400);
  },[lockedRecord?.id, people, jobs, pools, matchTarget, mode]);

  const filtered = matches.filter(m=>m.score>=minScore);

  const personName = lockedRecord ? getTitle(lockedRecord, mode==="job"?"jobs":"people") : "";
  const jobsObj    = objects.find(o=>o.slug==="jobs");
  const peopleObj  = objects.find(o=>o.slug==="people");
  const poolsObj   = objects.find(o=>o.slug==="talent-pools");

  return (
    <div style={{fontFamily:F, padding:"16px 20px"}}>

      {/* ── Top toolbar: profile chip + filters + toggle ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>

        {/* Profile chip */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px 6px 6px",borderRadius:99,border:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:mode==="job"?(jobsObj?.color||C.ai):(peopleObj?.color||C.accent),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic n={mode==="job"?"briefcase":"user"} s={12} c="white"/>
          </div>
          <div style={{lineHeight:1.2}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{personName}</div>
            <div style={{fontSize:10,color:C.text3}}>{mode==="job"?(lockedRecord?.data?.department||"Job"):(lockedRecord?.data?.current_title||"Candidate")}</div>
          </div>
        </div>

        {/* Attribute pills */}
        {mode==="person" && lockedRecord?.data?.years_experience && (
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:"#f1f5f9",color:C.text2,flexShrink:0}}>
            {lockedRecord.data.years_experience}y exp
          </span>
        )}
        {mode==="person" && lockedRecord?.data?.location && (
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:"#f1f5f9",color:C.text2,flexShrink:0}}>
            📍 {lockedRecord.data.location}
          </span>
        )}
        {mode==="job" && lockedRecord?.data?.location && (
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:"#f1f5f9",color:C.text2,flexShrink:0}}>
            📍 {lockedRecord.data.location}
          </span>
        )}

        {/* Spacer */}
        <div style={{flex:1}}/>

        {/* Min score inline */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:600,color:C.text3,whiteSpace:"nowrap"}}>Min score</span>
          <input type="range" min={0} max={90} step={5} value={minScore} onChange={e=>setMinScore(Number(e.target.value))}
            style={{width:80,accentColor:C.ai}}/>
          <span style={{fontSize:12,fontWeight:700,color:C.ai,minWidth:28,textAlign:"right"}}>{minScore}+</span>
        </div>

        {/* Jobs/Pools toggle (person mode) */}
        {mode==="person" && (
          <div style={{display:"flex",border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden",flexShrink:0}}>
            {[{id:"jobs",icon:"briefcase",label:"Jobs"},{id:"pools",icon:"layers",label:"Pools"}].map(t=>(
              <button key={t.id} onClick={()=>setMatchTarget(t.id)}
                style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",border:"none",cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
                  background:matchTarget===t.id?C.accentLight:"transparent",
                  color:matchTarget===t.id?C.accent:C.text3,transition:"all .12s"}}>
                <Ic n={t.icon} s={11}/>{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Summary bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:8,background:`${C.ai}08`,border:`1px solid ${C.ai}18`,marginBottom:12}}>
        <Ic n="sparkles" s={14} c={C.ai}/>
        <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{filtered.length} match{filtered.length!==1?"es":""}</span>
        <span style={{fontSize:11,color:C.text3}}>scoring {minScore}+ out of {matches.length} total</span>
      </div>

      {/* ── Results: full width ── */}
      {loading
        ? <div style={{textAlign:"center",padding:"40px 0",color:C.text3}}>
            <div style={{animation:"spin 1s linear infinite",display:"inline-flex",marginBottom:8}}><Ic n="loader" s={22} c={C.ai}/></div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{fontSize:12}}>Scoring…</div>
          </div>
        : filtered.length===0
          ? <div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:13}}>No matches above {minScore}</div>
          : <MatchResultsList matches={filtered} onNavigate={onNavigate} />
      }
    </div>
  );
}, (prev, next) =>
  prev.environment?.id === next.environment?.id &&
  prev.initialRecord?.id === next.initialRecord?.id &&
  prev.initialObject?.slug === next.initialObject?.slug &&
  prev.onNavigate === next.onNavigate
);

/* ─── Search Result Cards ────────────────────────────────────────────────── */
const SearchResultCards = ({ results, onNavigate }) => {
  if (!results?.length) return (
    <div style={{ background:"#f8f9fc", borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px", marginTop:4, fontSize:12, color:C.text3 }}>
      No records found.
    </div>
  );
  const OBJ_COLORS = { people:"#3b5bdb", jobs:"#0ca678", "talent-pools":"#7c3aed" };
  return (
    <div style={{ marginTop:4, display:"flex", flexDirection:"column", gap:6 }}>
      {results.map(r => {
        const d = r.data || {};
        const color = r.object_color || OBJ_COLORS[r.object_slug] || "#6366f1";
        const name = (d.first_name ? `${d.first_name} ${d.last_name||""}`.trim() : null) || d.job_title || d.pool_name || d.name || "Untitled";
        const sub  = r.object_slug === "people"
          ? (d.current_title ? `${d.current_title}${d.location ? " · " + d.location : ""}` : d.location || d.email || "")
          : r.object_slug === "jobs"
          ? (d.location ? `${d.location}${d.department ? " · " + d.department : ""}` : d.department || d.work_type || "")
          : (d.category || d.description?.slice(0, 50) || "");
        return (
          <div key={r.id} onClick={() => onNavigate && onNavigate(r)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"white", borderRadius:10, border:`1.5px solid ${color}25`, cursor:"pointer", transition:"all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}60`; e.currentTarget.style.background=`${color}06`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=`${color}25`; e.currentTarget.style.background="white"; }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ color:"white", fontSize:12, fontWeight:700 }}>{name.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
              {sub && <div style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
            </div>
            <span style={{ fontSize:10, fontWeight:700, color, background:`${color}15`, padding:"2px 7px", borderRadius:99, whiteSpace:"nowrap", textTransform:"capitalize", flexShrink:0 }}>{r.object_name||r.object_slug}</span>
            <Ic n="arrowR" s={12} c={C.text3}/>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Record Preview Card ────────────────────────────────────────────────── */
const RecordPreview = ({ data, objectName, objectColor, fields, onConfirm, onEdit, creating }) => {
  const displayFields = fields.filter(f => data[f.api_key] !== undefined && data[f.api_key] !== "" && data[f.api_key] !== null);
  return (
    <div style={{ background:"#f8f9fc", borderRadius:12, border:`2px solid ${C.ai}30`, padding:"14px 16px", marginTop:4 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:objectColor||C.ai, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n={objectName==="Job"?"briefcase":objectName==="Person"?"user":"layers"} s={14} c="white"/>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>New {objectName} Preview</span>
        <span style={{ fontSize:11, color:C.text3, marginLeft:"auto" }}>{displayFields.length} fields</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12, maxHeight:200, overflow:"auto" }}>
        {displayFields.map(f => (
          <div key={f.id} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ fontSize:11, fontWeight:600, color:C.text3, width:100, flexShrink:0, paddingTop:1 }}>{f.name}</span>
            <span style={{ fontSize:12, color:C.text1, flex:1, lineHeight:1.4 }}>
              {Array.isArray(data[f.api_key]) ? data[f.api_key].join(", ") : String(data[f.api_key]).slice(0,200)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={onConfirm} disabled={creating}
          style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:`linear-gradient(135deg,${C.ai},#3b5bdb)`, color:"white", fontSize:12, fontWeight:700, cursor:creating?"not-allowed":"pointer", fontFamily:F, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          {creating ? <><div style={{width:12,height:12,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Creating…</> : <><Ic n="check" s={13}/> Create {objectName}</>}
        </button>
        <button onClick={onEdit} style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:5 }}>
          <Ic n="edit" s={12}/> Edit
        </button>
      </div>
    </div>
  );
};

/* ─── System Prompt ──────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are Vercentic Copilot, an AI assistant embedded in an enterprise talent acquisition platform.

PAGE AWARENESS — CRITICAL:
You are always given the current page and record via "CURRENT PAGE CONTEXT:" in the system context.
- ALWAYS reference the current page/record context when answering questions
- If asked "what can you see?" or "what am I looking at?" — describe the page and record clearly in plain English
- Reference people and jobs by name — never say "the current record" when you know their name
- On a person record: proactively offer to summarise, draft emails, find matching jobs
- On a job record: proactively offer to find matching candidates, summarise requirements
- On a list page: the context includes "LIST:" data — total count, status/dept breakdown,
    first 25 record names. Use this directly to answer "how many people are in this list?",
    "what statuses are shown?", "who is Active?". NEVER say you cannot see the list — the data is always injected.
- On the Reports page: if the user wants to change the CURRENT report (add/remove a filter,
    change grouping, chart type, sort order) emit a <MODIFY_REPORT> block instead of giving
    manual instructions. The user should never have to touch the UI for simple report changes.
    Format:
    <MODIFY_REPORT>
    {
      "addFilter":    { "field": "source", "op": "is not", "value": "Unknown" },
      "removeFilter": { "field": "source" },
      "setGroupBy":   "department",
      "setChartType": "bar",
      "setSortBy":    "count"
    }
    </MODIFY_REPORT>
    Only include the keys that apply. After the block, confirm what changed in one sentence.
- On the dashboard: offer to explain the pipeline, find records, or take actions
- NEVER claim you cannot see what page the user is on — you are always told via context

CRITICAL RULES — ACTIONS AND CONFIRMATION:
1. You NEVER execute any action silently or claim to have done something before the user confirms.
2. For ANY action that creates, updates, deletes, or moves data, you MUST output a tagged block and wait.
3. Always describe EXACTLY what will happen BEFORE the user clicks confirm.
4. Use plain, specific language: "I will create a person record for Ahmed" NOT "I'll handle that."
5. Always give the user a clear way to cancel before confirming.
6. After a user says "yes", "go ahead", "confirm", "do it", or similar — output the action block immediately.
7. If unsure what the user wants, ASK before proposing any action.

For actions not covered by specific blocks (notes, field updates, pipeline moves, bulk ops, logging calls), use:
<PROPOSE_ACTION>
{
  "title": "Short action title",
  "description": "One sentence explaining exactly what will happen",
  "details": ["Detail line 1", "Detail line 2"],
  "confirm_label": "Yes, Do This",
  "cancel_label": "Cancel",
  "severity": "normal",
  "action_type": "add_note",
  "payload": {}
}
</PROPOSE_ACTION>
severity: "normal" (blue), "warning" (amber), "danger" (red, for deletes)

SUPPORTED action_types and their required payload fields:
- "add_note"      → { record_id, content, author? }  — adds a note to a record
- "update_field"  → { record_id, field, value }  — updates any field on a record
- "status_change" → { record_id, field, value }  — alias for update_field (use for status/stage changes)
- "log_comm"      → { record_id, comm_type("call"|"email"|"sms"|"whatsapp"), direction("inbound"|"outbound"), subject?, body?, notes?, duration_seconds?, outcome? }
- "pipeline_move" → { link_id, new_stage }  — moves a person to a new stage in a pipeline
- "assign"        → { record_id, assigned_to }  — assigns a record to a user
- "bulk_op"       → { record_ids[], data{} }  — updates multiple records
- "delete"        → { record_id }  — deletes a record (use severity:"danger")

IMPORTANT: Always use the record_id from CURRENT PAGE CONTEXT when acting on the current record.
For "add_note", always use record_id from context and write the note content as the user described it.

DOCUMENT ANALYSIS — CV & JOB DESCRIPTIONS:
When the user pastes or attaches a CV/resume, extract fields and respond with:
<PARSE_CV>
{"first_name":"","last_name":"","email":"","phone":"","current_title":"","location":"","skills":[],"linkedin":"","years_experience":0,"summary":""}
</PARSE_CV>
Then say: "I found a CV for [name] — want me to create a person record?"

When the user pastes or attaches a job description/template, respond with:
<PARSE_JD>
{"job_title":"","department":"","location":"","work_type":"","employment_type":"","salary_min":0,"salary_max":0,"description":"","requirements":"","skills":[],"status":"Open"}
</PARSE_JD>
Then say: "I found a job description for [title] — shall I create this job?"

You can help with:
1. Searching the database for candidates, jobs, and talent pools
2. Answering questions about recruitment data
3. Drafting professional outreach/email messages
4. Summarising candidate profiles
5. Providing hiring advice
6. Creating records (people, jobs, talent pools) conversationally
7. Creating workflows with stages and automations

WORKFLOW CREATION INSTRUCTIONS:
When a user wants to create a workflow, pipeline, or process:

Step 1: Ask for the workflow name and which object it applies to (People, Jobs, or Talent Pools).

Step 2: Ask for the stages/steps. Each step has a name and optionally an automation. Automations are:
- ai_prompt: runs an AI prompt, needs a "prompt" field (use {{field_name}} for record data)
- stage_change: sets a status, needs "to_stage" field
- send_email: sends email, needs "subject" and "body" fields
- update_field: sets a field value, needs "field" and "value"
- webhook: posts to URL, needs "url"

Step 3: When ready, output EXACTLY this format:
<CREATE_WORKFLOW>
{
  "name": "Application Review",
  "object_slug": "people",
  "description": "Standard hiring process",
  "steps": [
    { "name": "Application Received", "automation_type": null },
    { "name": "Phone Screen", "automation_type": "send_email", "config": { "subject": "Interview invite for {{first_name}}", "body": "Hi {{first_name}}, we'd love to schedule a call..." } },
    { "name": "AI Summary", "automation_type": "ai_prompt", "config": { "prompt": "Write a 3-sentence summary of {{first_name}} {{last_name}}'s background." } },
    { "name": "Offer", "automation_type": null }
  ]
}
</CREATE_WORKFLOW>

WORKFLOW RULES:
- object_slug must be one of: "people", "jobs", "talent-pools"
- Steps with no automation: set automation_type to null
- Be conversational — suggest sensible stages based on the use case
- You can suggest AI prompt automations proactively for screening steps

DATABASE SEARCH INSTRUCTIONS:
When a user asks to find, search, look up, or show records, output a search block:

IMPORTANT MATCHING RULE — CRITICAL:
When the user is viewing a PERSON RECORD and asks about job matches, best roles, suitable positions, or similar:
- The context already contains "REAL JOB MATCH SCORES" — pre-calculated scores from the AI matching engine
- USE THOSE SCORES DIRECTLY — do NOT use <SEARCH_QUERY> for this
- Rank jobs by score (highest first), explain WHY each is a good or poor fit
- Reference specific scores, reasons, and gaps from the injected data
- If no scores are injected, say there are no jobs in the system yet

When a user asks to SEARCH or FIND records (not matching), output a search block:
<SEARCH_QUERY>{"q":"search term","slug":"people"}</SEARCH_QUERY>

The "slug" field MUST be one of: "people", "jobs", "talent-pools".
- Candidate / person / someone / who → slug: "people"
- Job / role / position / vacancy / opening → slug: "jobs"
- Pool / talent pool / pipeline → slug: "talent-pools"
- If ambiguous, default to "people"

Keep "q" short and specific (e.g. "Ahmed", "Software Engineer", "Dubai").
After a search, summarise what was found concisely based on the injected results.

RECORD CREATION INSTRUCTIONS:
When a user wants to create a record:

Step 1: Identify which object (Person, Job, or Talent Pool).

Step 2: Collect mandatory fields. Ask for multiple at once, not one by one:
- Person: first_name, last_name, email (all required)
- Job: job_title (required)
- Talent Pool: pool_name (required)

Step 3: After mandatory fields, proactively suggest and collect optional enhancements.

Step 4: When ready, output EXACTLY this format:
<CREATE_RECORD>
{
  "object_slug": "people",
  "data": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com"
  }
}
</CREATE_RECORD>

RULES:
- Use arrays for skills/required_skills: ["React", "Node.js"]
- Valid Person status: Active, Passive, Not Looking, Placed, Archived
- Valid Job status: Draft, Open, On Hold, Filled, Cancelled (default Open)
- Valid work_type: On-site, Remote, Hybrid
- Valid employment_type: Full-time, Part-time, Contract, Internship, Freelance
- Always include <CREATE_RECORD> when you have at least the mandatory fields- Be conversational and efficient

ADMIN ACTIONS — USER & ROLE MANAGEMENT:
You can also help admins create users and roles. Use the same conversational collect-then-confirm pattern.

CREATE USER:
Collect: first_name, last_name, email (required). Ask for role_name (e.g. "Admin", "Recruiter", "Hiring Manager"). When ready:
<CREATE_USER>
{"first_name":"Jane","last_name":"Smith","email":"jane@example.com","role_name":"Recruiter"}
</CREATE_USER>

CREATE ROLE:
Collect: name (required), description (optional), color (optional hex, default #3b5bdb). When ready:
<CREATE_ROLE>
{"name":"Senior Recruiter","description":"Can manage candidates and jobs","color":"#0ca678"}
</CREATE_ROLE>

ADMIN RULES:
- For CREATE_USER, role_name should be one of the common roles: Admin, Recruiter, Hiring Manager, Viewer — or whatever the user specifies
- Temporary passwords are auto-generated by the system
- Only output the tag when you have all required fields
- Be concise — don't over-explain

INTERVIEW SCHEDULING INSTRUCTIONS:
When a user wants to schedule, book, or arrange an interview:

Step 1: Identify the candidate. If viewing a record, use that person. Otherwise ask who the interview is for.
Step 2: Gather: date, time, format (Video Call / Phone / In Person), duration, and optionally interviewers and notes.
  - If interview types are listed in context, suggest them. Otherwise use a sensible default.
  - Date must be a real future date (YYYY-MM-DD format). If user says "next Tuesday", work it out from today's date.
  - Time in HH:MM 24h format (e.g. 14:00). Default to 10:00 if not specified.
  - Duration in minutes. Default to 45.
  - Format options: "Video Call", "Phone", "In Person". Default to "Video Call".
Step 3: Confirm the details with the user before outputting the block.
Step 4: Output EXACTLY this format (nothing else after it):
<SCHEDULE_INTERVIEW>
{
  "candidate_name": "Full Name",
  "candidate_id": "record-id-if-known-or-null",
  "interview_type_name": "Technical Interview",
  "interview_type_id": "type-id-if-known-or-null",
  "date": "2026-03-20",
  "time": "14:00",
  "duration": 45,
  "format": "Video Call",
  "interviewers": ["Sarah Jones"],
  "notes": "Focus on system design"
}
</SCHEDULE_INTERVIEW>

SCHEDULING RULES:
- candidate_id: use the current record's id if viewing a record, otherwise null (the server will look it up by name)
- interview_type_id: use the id from the available interview types list if matched, otherwise null
- interviewers: array of names (strings), can be empty []
- notes: optional string, can be empty ""
- When the user confirms ("yes", "go ahead", "schedule it", "looks good", "correct") — output the SCHEDULE_INTERVIEW block immediately. Do NOT ask again.
- Be helpful and suggest sensible defaults

FORM CREATION INSTRUCTIONS:
When a user wants to create a form, questionnaire, scorecard, survey, or data capture template:

Step 1: Ask what the form is for (e.g. interview scorecard, screening questionnaire, survey, onboarding checklist).
Step 2: Suggest a sensible set of fields based on the use case. Ask if they want to add, remove or change any.
Step 3: Confirm the form name, category, and which objects it applies to (people, jobs, etc.).
Step 4: Output EXACTLY this format:
<CREATE_FORM>
{
  "name": "Technical Interview Scorecard",
  "description": "Evaluate candidates on technical and behavioural skills",
  "category": "interview",
  "applies_to": ["people"],
  "sharing": "internal",
  "confidential": false,
  "allow_multiple": true,
  "show_in_record": true,
  "searchable": true,
  "fields": [
    { "field_type": "rating",        "label": "Overall Rating",       "api_key": "overall_rating",    "required": true,  "options": [] },
    { "field_type": "select",        "label": "Recommendation",       "api_key": "recommendation",    "required": true,  "options": ["Strong Yes","Yes","Maybe","No"] },
    { "field_type": "textarea",      "label": "Technical Skills",     "api_key": "technical_skills",  "required": false, "options": [] },
    { "field_type": "textarea",      "label": "Behavioural Notes",    "api_key": "behavioural_notes", "required": false, "options": [] },
    { "field_type": "text",          "label": "Interviewer Name",     "api_key": "interviewer_name",  "required": false, "options": [] }
  ]
}
</CREATE_FORM>

FORM RULES:
- category must be one of: general, screening, interview, survey, confidential
- applies_to is an array of object slugs: "people", "jobs", "talent_pools"
- field_type options: text, textarea, number, email, phone, url, date, select, multi_select, rating, boolean, currency
- For select/multi_select fields, always include an "options" array of strings
- api_key must be lowercase with underscores, no spaces (auto-derive from label if not obvious)
- Be proactive — suggest 4-8 sensible fields based on the form's purpose
- rating fields go from 1-5 stars automatically — no options needed
- boolean fields render as Yes/No toggle — no options needed
- Always confirm fields with user before outputting the block

REPORT CREATION INSTRUCTIONS:
When a user asks to "create a report", "show me data", "build me a chart", "how many...", "what's the breakdown of...", "analyse...", or any request that involves summarising or visualising records, help them build a report.

Available objects (use slug): people, jobs, talent-pools, and any custom objects.

Common groupable fields:
- people: status, source, department, location, person_type
- jobs: status, department, location, work_type, employment_type
- talent-pools: category, status

Chart types: bar (comparisons), area (trends over time), pie (proportions)

Output a <CREATE_REPORT> JSON block then a brief confirmation message. The user sees a card before anything opens.

Example:
<CREATE_REPORT>
{
  "title": "Candidates by Status",
  "object": "people",
  "group_by": "status",
  "chart_type": "bar",
  "sort_by": "_count",
  "sort_dir": "desc",
  "filters": [],
  "description": "Breakdown of candidates by pipeline stage"
}
</CREATE_REPORT>

Rules:
- If the user is vague, ask ONE clarifying question (which object?) before outputting the block
- "object" must be a slug (people, jobs, talent-pools)
- "group_by" must be a snake_case field api_key
- Filter values should be lowercase unless a proper noun
- Always suggest a sensible chart_type for the data shape`;


// Record-specific actions shown when viewing a record — keyed by object slug
const RECORD_ACTIONS = {
  people: [
    { id:"summarise", icon:"fileText", label:"Summarise",      prompt:"Give me a concise professional summary of this candidate, highlighting key strengths and experience." },
    { id:"email",     icon:"mail",     label:"Draft email",    prompt:"Draft a warm, professional outreach email to this candidate. Keep it to 3 short paragraphs." },
    { id:"strengths", icon:"star",     label:"Strengths & gaps", prompt:"Identify this candidate's top 3 strengths and top 2 gaps for recruitment purposes." },
    { id:"questions", icon:"zap",      label:"Interview Qs",   prompt:"Suggest 5 targeted interview questions based on this candidate's profile." },
    { id:"note",      icon:"edit",     label:"Add note",       prompt:"I want to add a note to this record." },
    { id:"match",     icon:"layers",   label:"Recommend jobs",  prompt:"Which open jobs would be the best fit for this candidate and why?" },
  ],
  jobs: [
    { id:"summarise", icon:"fileText", label:"Summarise role",  prompt:"Give me a concise summary of this job role and its key requirements." },
    { id:"jd",        icon:"fileText", label:"Write JD",        prompt:"Write a compelling job description for this role suitable for posting on a career site." },
    { id:"match",     icon:"user",     label:"Find candidates", prompt:"Which candidates in the system would be the best fit for this role and why?" },
    { id:"questions", icon:"zap",      label:"Interview Qs",    prompt:"Suggest 5 targeted interview questions for this role." },
    { id:"note",      icon:"edit",     label:"Add note",        prompt:"I want to add a note to this job." },
    { id:"interview", icon:"calendar", label:"Schedule interview", prompt:"I want to schedule an interview for this role." },
  ],
  "talent-pools": [
    { id:"summarise", icon:"fileText", label:"Summarise pool",  prompt:"Give me a summary of this talent pool, its purpose and the candidates in it." },
    { id:"match",     icon:"user",     label:"Find candidates",    prompt:"Which candidates would be a good fit for this talent pool?" },
    { id:"note",      icon:"edit",     label:"Add note",        prompt:"I want to add a note to this talent pool." },
  ],
};
const QUICK_ACTIONS = RECORD_ACTIONS.people; // fallback (unused but kept for safety)

const CREATE_ACTIONS = [
  { id:"new-person",   icon:"user",      label:"New Person",      prompt:"I want to add a new person" },
  { id:"new-job",      icon:"briefcase", label:"New Job",         prompt:"I want to create a new job" },
  { id:"new-pool",     icon:"layers",    label:"New Talent Pool", prompt:"I want to create a new talent pool" },
  { id:"new-workflow",   icon:"workflow",  label:"New Workflow",    prompt:"I want to create a new workflow" },
  { id:"new-interview",  icon:"calendar",  label:"Schedule Interview", prompt:"I want to schedule an interview" },
  { id:"new-form",       icon:"form",      label:"Create Form",        prompt:"I want to create a new form" },
  { id:"new-report",     icon:"bar-chart-2", label:"Build a report",   prompt:"I want to build a report" },
  { id:"new-user",     icon:"user",      label:"Invite User",     prompt:"I want to invite a new user" },
  { id:"new-role",     icon:"shield",    label:"New Role",        prompt:"I want to create a new role" },
  { id:"search",       icon:"search",    label:"Search records",  prompt:"Search for " },
];

const SUGGESTED_ACTIONS = {
  people: [
    { label: "Schedule interview",   prompt: "Schedule an interview for this candidate" },
    { label: "Draft outreach email", prompt: "Draft a warm outreach email to this candidate" },
    { label: "Find matching jobs",   prompt: "Find the best matching jobs for this candidate" },
    { label: "Add a note",           prompt: "Add a note to this candidate's record" },
  ],
  jobs: [
    { label: "Find candidates",       prompt: "Find the best matching candidates for this job" },
    { label: "Write job description", prompt: "Write a compelling job description for this role" },
    { label: "Schedule interview",    prompt: "Schedule an interview for this role" },
  ],
  reports: [
    { label: "Filter by status",   prompt: "Add a filter to show only active records" },
    { label: "Group differently",  prompt: "Change the grouping of this report" },
    { label: "Change chart type",  prompt: "Change this to a pie chart" },
    { label: "Save this report",   prompt: "Save this report with a name" },
  ],
  settings: [
    { label: "Create a field",     prompt: "I want to create a new field" },
    { label: "Invite a user",      prompt: "I want to invite a new user" },
    { label: "Create a workflow",  prompt: "I want to create a new workflow" },
    { label: "Set up integration", prompt: "Help me configure an integration" },
  ],
  default: [
    { label: "Search records",  prompt: "Search for " },
    { label: "Create a report", prompt: "I want to build a report" },
    { label: "New person",      prompt: "I want to add a new person" },
    { label: "New job",         prompt: "I want to create a new job" },
  ],
};

/* ─── AI Copilot ─────────────────────────────────────────────────────────── */
const SuggestedActions = ({ activeNav, currentObject, onSend, isLastMsg }) => {
  if (!isLastMsg) return null;
  const slug = currentObject?.slug;
  const isReports = activeNav === 'reports';
  const isSettings = activeNav === 'settings';
  const actions = isSettings ? SUGGESTED_ACTIONS.settings : isReports ? SUGGESTED_ACTIONS.reports
    : slug && SUGGESTED_ACTIONS[slug] ? SUGGESTED_ACTIONS[slug]
    : SUGGESTED_ACTIONS.default;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8, marginLeft:34 }}>
      {actions.map((a, i) => (
        <button key={i} onClick={() => onSend(a.prompt)}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px",
            borderRadius:99, border:"1.5px solid #ddd6fe", background:"white",
            color:"#6d28d9", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
            transition:"all .12s", whiteSpace:"nowrap" }}
          onMouseEnter={e=>{ e.currentTarget.style.background="#f5f3ff"; e.currentTarget.style.borderColor="#a78bfa"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#ddd6fe"; }}>
          {a.label} →
        </button>
      ))}
    </div>
  );
};

// Auth headers for fetch calls — reads session from localStorage (same as apiClient)
function aiHeaders() {
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    const h = { 'Content-Type': 'application/json' };
    if (sess?.user?.id)     h['X-User-Id']     = sess.user.id;
    if (sess?.tenant_slug)  h['X-Tenant-Slug']  = sess.tenant_slug;
    return h;
  } catch { return { 'Content-Type': 'application/json' }; }
}

export const AICopilot = ({ environment, currentRecord, currentObject, onNavigateToRecord, activeNav, navObjects, pageContext }) => {
  const [open,         setOpen]         = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");

  // Listen for external open requests (e.g. from Help page)
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      if (e.detail?.message) {
        setTimeout(() => setInput(e.detail.message), 120);
      }
    };
    window.addEventListener("talentos:openCopilot", handler);
    return () => window.removeEventListener("talentos:openCopilot", handler);
  }, []);
  const [loading,      setLoading]      = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [nudges,       setNudges]       = useState([]);   // proactive suggestions
  const [context,      setContext]      = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [pendingRecord,setPendingRecord]   = useState(null);
  const [pendingWorkflow,setPendingWorkflow]= useState(null);
  const [pendingUser,setPendingUser]       = useState(null);
  const [pendingRole,setPendingRole]       = useState(null);
  const [creating,     setCreating]        = useState(false);
  const [objects,      setObjects]      = useState([]);
  const [fields,       setFields]       = useState({});
  const [allJobs,      setAllJobs]      = useState([]);
  const [allPools,     setAllPools]     = useState([]);
  const [searchResults,setSearchResults]= useState({}); // keyed by message index
  const [adminRoles,   setAdminRoles]   = useState([]);
  const [adminUsers,   setAdminUsers]   = useState([]);
  const [interviewTypes, setInterviewTypes] = useState([]);
  const _pcAI = _usePermCtxAI();
  const canRecord = (flag) => _pcAI ? _pcAI.canGlobal(flag) : true;
  const [pendingInterview, setPendingInterview] = useState(null);
  const [pendingForm,      setPendingForm]      = useState(null);
  const [pendingReport,    setPendingReport]    = useState(null);
  const [parsedPerson,     setParsedPerson]     = useState(null);
  const [parsedJob,        setParsedJob]        = useState(null);
  const [proposedAction,   setProposedAction]   = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [settingsSection, setSettingsSection] = useState(null);
  const [fileProcessing, setFileProcessing] = useState(false);

  useEffect(()=>{
    if(!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(async objs=>{
      if(!Array.isArray(objs)) return;
      setObjects(objs);
      const fm={};
      await Promise.all(objs.map(async o=>{ const fs=await api.get(`/fields?object_id=${o.id}`); fm[o.id]=Array.isArray(fs)?fs:[]; }));
      setFields(fm);
      // Pre-fetch jobs and pools so copilot can run real match scoring
      const jobsObj  = objs.find(o=>o.slug==='jobs');
      const poolsObj = objs.find(o=>o.slug==='talent-pools');
      if(jobsObj)  api.get(`/records?object_id=${jobsObj.id}&environment_id=${environment.id}&limit=200`).then(r=>setAllJobs(r.records||[])).catch(()=>{});
      if(poolsObj) api.get(`/records?object_id=${poolsObj.id}&environment_id=${environment.id}&limit=200`).then(r=>setAllPools(r.records||[])).catch(()=>{});
    });
  },[environment?.id]);

  // Build rich page context from everything we know
  useEffect(()=>{
    const parts=[];
    if(activeNav){
      const lbl=activeNav==='dashboard'?'Dashboard (pipeline overview, stats, recent activity)'
        :activeNav==='interviews'?'Interviews (upcoming and past interviews)'
        :activeNav==='offers'?'Offers (candidate offers and approvals)'
        :activeNav==='reports'?'Reports (analytics and data)'
        :activeNav==='search'?'Search (searching across all records)'
        :activeNav==='settings'?'Settings'+(settingsSection?' — '+settingsSection+' section':' (platform configuration)')
        :activeNav==='orgchart'?'Org Chart (organisational structure)'
        :activeNav==='workflows'?'Workflows (automation builder)'
        :activeNav?.startsWith('obj_')?(()=>{const o=(navObjects||[]).find(o=>'obj_'+o.id===activeNav);return o?(o.plural_name||o.name)+' list':'Object list';})()
        :activeNav?.startsWith('record_')?'Record detail view'
        :activeNav;
      parts.push('USER IS CURRENTLY ON: '+lbl);
    }
    if(currentRecord&&currentObject){
      const d=currentRecord.data||{};
      const name=(d.first_name?((d.first_name+' '+(d.last_name||'')).trim()):null)||d.job_title||d.pool_name||d.name||'Untitled';
      parts.push('');
      parts.push('VIEWING '+currentObject.name.toUpperCase()+' RECORD: '+name);
      parts.push('Record ID: '+currentRecord.id);
      parts.push('Object type: '+currentObject.name+' (slug: '+currentObject.slug+')');
      parts.push('All field values:');
      Object.entries(d).forEach(([k,v])=>{
        if(v===null||v===undefined||v==='')return;
        const disp=Array.isArray(v)?v.join(', '):String(v);
        if(disp)parts.push('  '+k+': '+disp);
      });
    }
    if(pageContext){parts.push('');parts.push('ADDITIONAL PAGE CONTEXT:');parts.push(pageContext);}

    // Inject real AI match scores when on a person record so copilot uses same engine as AI Match widget
    if(currentRecord && currentObject?.slug==='people' && allJobs.length>0){
      const scored = allJobs
        .map(j=>({ job:j, ...matchCandidateToJob(currentRecord, j) }))
        .sort((a,b)=>b.score-a.score)
        .slice(0,15);
      parts.push('');
      parts.push(`REAL JOB MATCH SCORES — ${allJobs.length} jobs scored by the AI matching engine. USE THESE DIRECTLY — do NOT use <SEARCH_QUERY> for job matching:`);
      scored.forEach((m,i)=>{
        const d=m.job.data||{};
        const title=d.job_title||d.name||'Untitled';
        const dept=d.department?` | Dept: ${d.department}`:'';
        const loc=d.location?` | Location: ${d.location}`:'';
        const status=d.status?` [${d.status}]`:'';
        const why=m.reasons.slice(0,3).join(', ');
        const gaps=m.gaps.slice(0,2).join(', ');
        parts.push(`  #${i+1} ${title}${dept}${loc}${status} — Score: ${m.score}/100${why?' ✓ '+why:''}${gaps?' ✗ '+gaps:''}`);
      });
    }

    // Inject pool matches when on a person record
    if(currentRecord && currentObject?.slug==='people' && allPools.length>0){
      parts.push('');
      parts.push(`TALENT POOLS (${allPools.length} total):`);
      allPools.slice(0,10).forEach(p=>{
        const d=p.data||{};
        parts.push(`  - ${d.pool_name||d.name||'Pool'} [${d.category||''}] ${d.status||''}`);
      });
    }

    setContext(parts.length?parts.join('\n'):null);
  },[currentRecord,currentObject,activeNav,navObjects,pageContext,allJobs,allPools]);

  useEffect(()=>{
    if(!open) return;
    // Update welcome message if only the initial greeting is showing (no real conversation started)
    if(messages.length<=1){
      setMessages([{role:"assistant",content:(()=>{
        if(currentRecord&&currentObject){
          const d=currentRecord.data||{};
          const name=(d.first_name?((d.first_name+' '+(d.last_name||'')).trim()):null)||d.job_title||d.pool_name||'this record';
          if(currentObject.slug==='people') return `Hi! I can see you're viewing **${name}**.\n\nI can:\n• Summarise their profile and background\n• Draft outreach or follow-up emails\n• Suggest suitable jobs for them\n• Answer any questions about this candidate\n\nWhat would you like?`;
          if(currentObject.slug==='jobs') return `Hi! I can see you're viewing the **${name}** role.\n\nI can:\n• Summarise the job requirements\n• Suggest suitable candidates\n• Draft a job description\n• Answer any questions about this role\n\nWhat would you like?`;
          return `Hi! I can see you're viewing **${name}** (${currentObject.name}).\n\nI can summarise this record, answer questions, or help take actions. What would you like?`;
        }
        if(activeNav==='dashboard') return `Hi! I can see you're on the **Dashboard**.\n\nI can help you:\n• Understand your current pipeline\n• Find specific candidates or jobs\n• Create new records\n• Summarise recent activity\n\nWhat would you like to do?`;
        if(activeNav==='interviews') return `Hi! I can see you're in **Interviews**.\n\nI can help you:\n• Schedule a new interview\n• Review upcoming sessions\n• Answer questions about the schedule\n\nWhat would you like to do?`;
        if(activeNav==='settings') {
          const sec = settingsSection;
          if(sec === 'Data Model') return `Hi! You're in **Data Model** settings.\n\nI can help you:\n• Create new objects or fields\n• Explain field types and best practices\n• Suggest field configurations for common use cases\n\nWhat would you like to configure?`;
          if(sec === 'Users') return `Hi! You're in **User Management**.\n\nI can help you:\n• Invite a new user\n• Explain roles and permissions\n• Troubleshoot login issues\n\nWhat would you like to do?`;
          if(sec === 'Roles & Permissions') return `Hi! You're in **Roles & Permissions**.\n\nI can help you:\n• Create a new role\n• Explain how permissions work\n• Suggest role configurations\n\nWhat would you like to configure?`;
          if(sec === 'Workflows') return `Hi! You're in **Workflows**.\n\nI can help you:\n• Create a new workflow\n• Add stages and automation steps\n• Explain workflow types (record pipeline vs linked person)\n\nWhat would you like to build?`;
          if(sec === 'Portals') return `Hi! You're in **Portals**.\n\nI can help you:\n• Set up a new career site or portal\n• Configure branding and themes\n• Add pages and widgets\n\nWhat would you like to do?`;
          if(sec === 'Forms') return `Hi! You're in **Forms**.\n\nI can help you:\n• Create a new form (scorecards, surveys, screening)\n• Explain form field types\n• Suggest form templates for common use cases\n\nWhat would you like to build?`;
          if(sec === 'Org Structure') return `Hi! You're in **Org Structure**.\n\nI can help you:\n• Explain how org units work\n• Set up the company hierarchy\n• Assign users to departments\n\nWhat would you like to do?`;
          if(sec === 'Integrations') return `Hi! You're in **Integrations**.\n\nI can help you:\n• Configure Twilio for SMS/WhatsApp\n• Set up SendGrid for email\n• Explain available integrations\n\nWhat do you need help with?`;
          return `Hi! You're in **Settings**.\n\nI can help you configure any part of the platform — data model, users, workflows, portals, integrations, and more.\n\nWhat would you like to do?`;
        }
        if(activeNav==='offers') return `Hi! I can see you're in **Offers**.\n\nI can help you:\n• Create or review offers\n• Check approval status\n• Answer questions about the offer pipeline\n\nWhat would you like to do?`;
        if(activeNav?.startsWith('obj_')){
          const obj=(navObjects||[]).find(o=>'obj_'+o.id===activeNav);
          const n=obj?.plural_name||obj?.name||'records';
          return `Hi! I can see you're viewing **${n}**.\n\nI can help you:\n• Search and filter this list\n• Create a new ${obj?.name||'record'}\n• Answer questions about any record here\n\nWhat would you like to do?`;
        }
        return `Hi! I'm your Vercentic Copilot. I can:\n• **Search** across all your data\n• **Create** and manage records\n• **Build** workflows and reports\n• **Configure** settings and integrations\n• **Draft** emails and documents\n\nWhat would you like to do?`;
      })(),ts:new Date()}]);
    }
  },[open, currentRecord?.id, currentObject?.id, activeNav]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  // Fetch admin data (roles + users) when copilot opens
  useEffect(()=>{
    if(!open) return;
    api.get("/roles").then(r=>{ if(Array.isArray(r)) setAdminRoles(r); }).catch(()=>{});
    api.get("/users").then(u=>{ if(Array.isArray(u)) setAdminUsers(u); }).catch(()=>{});
    if(environment?.id) api.get(`/interview-types?environment_id=${environment.id}`).then(t=>{ if(Array.isArray(t)) setInterviewTypes(t); }).catch(()=>{});
    // Listen for settings section navigation
    const handleSettingsNav = (e) => setSettingsSection(e.detail?.section || null);
    window.addEventListener('talentos:settings-section', handleSettingsNav);
    return () => window.removeEventListener('talentos:settings-section', handleSettingsNav);
  },[open]);

  // Generate proactive nudges when the copilot opens on a list page
  useEffect(()=>{
    if(!open || !environment?.id || currentRecord) return;
    // Need objects to be loaded — if empty, skip (will re-run when objects loads)
    if(!objects.length) return;

    setNudges([]);
    // Match active nav to an object slug
    const activeObj = navObjects?.find(o => 'obj_'+o.id === activeNav);
    const objSlug = activeObj?.slug;
    // Also allow if we're just on a list page with any known slug
    const knownSlug = objSlug || (activeNav?.startsWith('obj_') ? null : null);
    if(!knownSlug) return;

    const obj = objects.find(o => o.slug === knownSlug);
    if(!obj) return;

    const analyzeData = async () => {
      try {
        const r = await api.get(`/records?object_id=${obj.id}&environment_id=${environment.id}&limit=200`);
        const recs = r.records || [];
        if(!recs.length) return;
        const found = [];
        const now = Date.now();
        const STALE_MS = 1 * 60 * 1000; // TEST: 1 min — change to 7*24*60*60*1000 for production

        if(knownSlug === 'people') {
          const uncontacted = recs.filter(rec => {
            if(rec.data?.status === 'Archived' || rec.data?.status === 'Placed') return false;
            const t = rec.updated_at || rec.created_at;
            return t && (now - new Date(t).getTime()) > STALE_MS;
          });
          if(uncontacted.length > 0)
            found.push({ icon:"mail", color:"#f59f00",
              text:`${uncontacted.length} candidate${uncontacted.length>1?"s haven't":" hasn't"} been updated in 1+ min`,
              action:"Show me candidates not updated recently" });

          const noStatus = recs.filter(rec => !rec.data?.status);
          if(noStatus.length > 0)
            found.push({ icon:"alert-triangle", color:"#e03131",
              text:`${noStatus.length} candidate${noStatus.length>1?"s have":" has"} no status set`,
              action:"Show me candidates with no status" });

          const dormantStars = recs.filter(rec => Number(rec.data?.rating||0) >= 4 && (rec.data?.status === 'Passive' || rec.data?.status === 'Not Looking'));
          if(dormantStars.length > 0)
            found.push({ icon:"star", color:"#7c3aed",
              text:`${dormantStars.length} highly-rated candidate${dormantStars.length>1?"s are":" is"} passive or not looking`,
              action:"Show me high-rated passive candidates" });

        } else if(knownSlug === 'jobs') {
          const stale = recs.filter(rec => rec.data?.status === 'Open' && (now - new Date(rec.created_at).getTime()) > STALE_MS);
          if(stale.length > 0)
            found.push({ icon:"alert-triangle", color:"#e03131",
              text:`${stale.length} open job${stale.length>1?"s have":" has"} been open for 1+ min`,
              action:"Show me jobs that have been open a long time" });

          const noDept = recs.filter(rec => rec.data?.status === 'Open' && !rec.data?.department);
          if(noDept.length > 0)
            found.push({ icon:"edit", color:"#f59f00",
              text:`${noDept.length} open job${noDept.length>1?"s have":" has"} no department set`,
              action:"Show me open jobs with no department" });
        }

        if(found.length) setNudges(found.slice(0,3));
      } catch(e) { console.warn('[nudges] error:', e); }
    };

    // Fire after a short delay
    const t = setTimeout(analyzeData, 800);
    return () => clearTimeout(t);
  },[open, activeNav, environment?.id, objects, navObjects]);

  const parseCreateRecord = (text) => {
    const match = text.match(/<CREATE_RECORD>([\s\S]*?)<\/CREATE_RECORD>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseCreateWorkflow = (text) => {
    const match = text.match(/<CREATE_WORKFLOW>([\s\S]*?)<\/CREATE_WORKFLOW>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseCreateUser = (text) => {
    const match = text.match(/<CREATE_USER>([\s\S]*?)<\/CREATE_USER>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseCreateRole = (text) => {
    const match = text.match(/<CREATE_ROLE>([\s\S]*?)<\/CREATE_ROLE>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseScheduleInterview = (text) => {
    const match = text.match(/<SCHEDULE_INTERVIEW>([\s\S]*?)<\/SCHEDULE_INTERVIEW>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseCreatePortal = (text) => {
    const match = text.match(/<CREATE_PORTAL>([\s\S]*?)<\/CREATE_PORTAL>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseCreateForm = (text) => {
    const match = text.match(/<CREATE_FORM>([\s\S]*?)<\/CREATE_FORM>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const parseModifyReport = (text) => {
    const m = text.match(/<MODIFY_REPORT>([\s\S]*?)<\/MODIFY_REPORT>/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };

  const parseCreateReport = (text) => {
    const match = text.match(/<CREATE_REPORT>([\s\S]*?)<\/CREATE_REPORT>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch {
      const get = (k) => { const m = match[1].match(new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`,"i")); return m?m[1]:null; };
      const getArr = (k) => { const m = match[1].match(new RegExp(`"${k}"\\s*:\\s*\\[([^\\]]*)\\]`,"i")); if(!m)return[]; return m[1].match(/"([^"]*)"/g)?.map(s=>s.replace(/"/g,""))||[]; };
      const getFilters = () => { const m = match[1].match(/"filters"\s*:\s*(\[[\s\S]*?\])/i); if(!m)return[]; try{return JSON.parse(m[1]);}catch{return[];} };
      return { title:get("title")||"Report", object:get("object")||get("object_slug")||"", group_by:get("group_by")||"", chart_type:get("chart_type")||"bar", sort_by:get("sort_by")||"", sort_dir:get("sort_dir")||"desc", filters:getFilters(), formulas:getArr("formulas"), description:get("description")||"" };
    }
  };

  const parseParsedCV = (text) => {
    const m = text.match(/<PARSE_CV>([\s\S]*?)<\/PARSE_CV>/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };

  const parseParsedJD = (text) => {
    const m = text.match(/<PARSE_JD>([\s\S]*?)<\/PARSE_JD>/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };

  const parseProposeAction = (text) => {
    const m = text.match(/<PROPOSE_ACTION>([\s\S]*?)<\/PROPOSE_ACTION>/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };

  const parseSearchQuery = (text) => {
    const match = text.match(/<SEARCH_QUERY>([\s\S]*?)<\/SEARCH_QUERY>/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      return { q: parsed.q || match[1].trim(), slug: parsed.slug || null };
    } catch { return { q: match[1].trim(), slug: null }; }
  };

  const stripBlocks = (text) => text
    .replace(/<CREATE_RECORD>[\s\S]*?<\/CREATE_RECORD>/g,"")
    .replace(/<CREATE_WORKFLOW>[\s\S]*?<\/CREATE_WORKFLOW>/g,"")
    .replace(/<CREATE_USER>[\s\S]*?<\/CREATE_USER>/g,"")
    .replace(/<CREATE_ROLE>[\s\S]*?<\/CREATE_ROLE>/g,"")
    .replace(/<SCHEDULE_INTERVIEW>[\s\S]*?<\/SCHEDULE_INTERVIEW>/g,"")
    .replace(/<CREATE_FORM>[\s\S]*?<\/CREATE_FORM>/g,"")
    .replace(/<CREATE_PORTAL>[\s\S]*?<\/CREATE_PORTAL>/g,"")
    .replace(/<CREATE_REPORT>[\s\S]*?<\/CREATE_REPORT>/g,"")
    .replace(/<PARSE_CV>[\s\S]*?<\/PARSE_CV>/g,"")
    .replace(/<PARSE_JD>[\s\S]*?<\/PARSE_JD>/g,"")
    .replace(/<PROPOSE_ACTION>[\s\S]*?<\/PROPOSE_ACTION>/g,"")
    .replace(/<SEARCH_QUERY>[\s\S]*?<\/SEARCH_QUERY>/g,"")
    .trim();

  const runSearch = async ({ q, slug }) => {
    if (!q || !environment?.id) return [];
    try {
      if (slug) {
        const obj = objects.find(o => o.slug === slug);
        if (obj) {
          const r = await tFetch(`/api/records?object_id=${obj.id}&environment_id=${environment.id}&search=${encodeURIComponent(q)}&limit=8`).then(r=>r.json());
          return (r.records||[]).map(rec => ({ ...rec, object_name: obj.name, object_slug: obj.slug, object_color: obj.color }));
        }
      }
      const data = await tFetch(`/api/records/search?q=${encodeURIComponent(q)}&environment_id=${environment.id}&limit=8`).then(r=>r.json());
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  };

  // ── File drop / attach handler ───────────────────────────────────────────
  const handleFileDrop = async (file) => {
    if (!file) return;
    setFileProcessing(true);

    const ext = file.name.split(".").pop().toLowerCase();
    const isImage = ["jpg","jpeg","png","gif","webp"].includes(ext);
    const isPDF   = ext === "pdf";
    const isDoc   = ["doc","docx"].includes(ext);
    const isTxt   = ["txt","md","csv"].includes(ext);

    // Show file received message
    setMessages(m=>[...m,{role:"user",content:`📎 ${file.name}`,ts:new Date(),isFile:true}]);

    try {
      let base64 = null, textContent = null, mediaType = null;

      if (isImage || isPDF) {
        // Convert to base64 for vision/PDF analysis
        base64 = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result.split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        mediaType = isImage ? file.type || "image/jpeg" : "application/pdf";
      } else if (isDoc || isTxt) {
        // Send to server for text extraction then parse
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/cv-parse", { method:"POST", body:fd });
        if (res.ok) {
          const data = await res.json();
          // Inject the extracted text into the conversation
          textContent = data.text || "";
        }
      } else {
        textContent = await file.text().catch(() => null);
      }

      if (!textContent && !base64) {
        setMessages(m=>[...m,{role:"assistant",content:`I couldn't read **${file.name}**. Supported formats: PDF, DOCX, DOC, TXT, images.`,ts:new Date(),error:true}]);
        setFileProcessing(false);
        return;
      }

      // Determine likely doc type from filename
      const lname = file.name.toLowerCase();
      const looksLikeCV = /cv|resume|curriculum/i.test(lname);
      const looksLikeJD = /jd|job.desc|role.brief|position/i.test(lname);
      const hint = looksLikeCV ? "\n\nThis looks like a CV — please parse it."
                 : looksLikeJD ? "\n\nThis looks like a job description — please parse it."
                 : "\n\nPlease analyse this document and let me know what it contains. If it looks like a CV or job description, parse it automatically.";

      // Build the message to send to the AI
      const apiMessages = [...messages.filter(m=>!m.isFile).map(m=>({role:m.role,content:m.content}))];

      if (base64) {
        // Vision / PDF analysis
        const contentBlocks = [
          mediaType === "application/pdf"
            ? { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } }
            : { type:"image",    source:{ type:"base64", media_type:mediaType, data:base64 } },
          { type:"text", text:`File: ${file.name}${hint}` }
        ];
        apiMessages.push({ role:"user", content: contentBlocks });
      } else {
        apiMessages.push({ role:"user", content:`File: ${file.name}\n\n${textContent.slice(0,8000)}${hint}` });
      }

      setLoading(true);
      const res2 = await fetch("/api/ai/chat", {
        method:"POST",
        headers:aiHeaders(),
        body: JSON.stringify({ messages: apiMessages, system: SYSTEM_PROMPT })
      });
      const d2 = await res2.json();
      const reply = d2.content?.[0]?.text || d2.content || "I couldn't process that file.";

      const cvData   = parseParsedCV(reply);
      const jdData   = parseParsedJD(reply);
      const displayText = stripBlocks(reply);

      setMessages(m=>[...m,{role:"assistant",content:displayText||(cvData?"Found a CV — create the person?":jdData?"Found a job description — create the job?":""),ts:new Date(),hasParsedCV:!!cvData,hasParsedJD:!!jdData}]);
      if (cvData) setParsedPerson(cvData);
      if (jdData) setParsedJob(jdData);

    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to process **${file.name}**: ${err.message}`,ts:new Date(),error:true}]);
    }
    setFileProcessing(false);
    setLoading(false);
    setLoadingLabel("");
  };

  const handleDropEvent = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileDrop(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
    e.target.value = "";
  };

  const sendMessage = async (text) => {
    const userMsg = text||input.trim();
    if (!userMsg||loading) return;

    // "Search for " quick action — focus input instead of sending
    if (userMsg === "Search for ") {
      setInput("Search for ");
      setTimeout(()=>inputRef.current?.focus(),100);
      return;
    }

    setInput("");
    setLoading(true);

    // Smart loading label based on what the user is asking
    const msgLower = userMsg.toLowerCase();
    const label = msgLower.match(/search|find|look|show me|who|which/)       ? "Searching records…"
      : msgLower.match(/match|best.*cand|best.*job|score|rank/)               ? "Matching candidates…"
      : msgLower.match(/summar|profile|background|about/)                     ? "Reading profile…"
      : msgLower.match(/draft|write|email|message|outreach/)                  ? "Drafting message…"
      : msgLower.match(/report|chart|breakdown|analys|data/)                  ? "Building report…"
      : msgLower.match(/schedul|interview|book|calendar/)                     ? "Checking availability…"
      : msgLower.match(/creat|add|new|invite/)                                ? "Preparing record…"
      : msgLower.match(/workflow|pipeline|stage|process/)                     ? "Designing workflow…"
      : "Thinking…";
    setLoadingLabel(label);
    setPendingRecord(null);
    setPendingWorkflow(null);
    setPendingUser(null);
    setPendingRole(null);
    setPendingInterview(null);
    setPendingForm(null);
    setPendingPortal(null);
    setPendingReport(null);
    setParsedPerson(null);
    setParsedJob(null);
    setProposedAction(null);

    const newMessages=[...messages,{role:"user",content:userMsg,ts:new Date()}];
    setMessages(newMessages);

    try {
      const objectsInfo = objects.map(o=>{
        const fs=fields[o.id]||[];
        const req=fs.filter(f=>f.is_required).map(f=>`${f.name}(${f.api_key})`);
        const opt=fs.filter(f=>!f.is_required).map(f=>`${f.name}(${f.api_key},${f.field_type}${f.options?.length?`,[${f.options.join("|")}]`:""})`);
        return `${o.name} slug:${o.slug}\n  Required:${req.join(",")}\n  Optional:${opt.slice(0,12).join(",")}`;
      }).join("\n\n");

      const systemFull = [
        SYSTEM_PROMPT,
        `\n\nHELP DOCUMENTATION (use this to answer "how do I" questions):\n${buildHelpContext()}`,
        `\n\nPLATFORM OBJECTS:\n${objectsInfo}`,
        context?`\n\nCURRENT PAGE CONTEXT:\n${context}`:"",
        adminRoles.length?`\n\nAVAILABLE ROLES:\n${adminRoles.map(r=>`- ${r.name} (slug: ${r.slug}, id: ${r.id})`).join("\n")}`:"",
        adminUsers.length?`\n\nEXISTING USERS (${adminUsers.length} total):\n${adminUsers.map(u=>`- ${u.first_name} ${u.last_name} <${u.email}> role:${adminRoles.find(r=>r.id===u.role_id)?.name||u.role_id} status:${u.status}`).join("\n")}`:"",
        interviewTypes.length?`\n\nAVAILABLE INTERVIEW TYPES:\n${interviewTypes.map(t=>`- ${t.name} (id:${t.id}, duration:${t.duration}min, format:${t.format||t.interview_format||'Video Call'})`).join("\n")}`
          :"\n\nINTERVIEW TYPES: None configured yet — you can still schedule a custom interview.",
      ].join("");

      // First AI call
      const response = await fetch("/api/ai/chat",{
        method:"POST", headers:aiHeaders(),
        body:JSON.stringify({system:systemFull,messages:newMessages.map(m=>({role:m.role,content:m.content}))}),
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error);
      let reply = data.content||"Sorry, I couldn't generate a response.";

      // Handle search query
      const searchQ = parseSearchQuery(reply);
      let searchHits = [];
      if (searchQ) {
        setLoadingLabel("Searching records…");
        searchHits = await runSearch(searchQ);
        const resultsText = searchHits.length
          ? searchHits.map(r => {
              const d = r.data || {};
              const name = (d.first_name ? `${d.first_name} ${d.last_name||""}`.trim() : null) || d.job_title || d.pool_name || "Untitled";
              const detail = d.current_title || d.department || d.category || d.location || d.email || "";
              return `- ${name}${detail ? ` (${detail})` : ""}`;
            }).join("\n")
          : "No results found.";

        // Second AI call with injected results
        const followUp = [...newMessages.map(m=>({role:m.role,content:m.content})),
          {role:"assistant", content:reply},
          {role:"user", content:`[SEARCH_RESULTS for "${searchQ}"]\n${resultsText}\n\nPlease summarise these results concisely.`}
        ];
        const r2 = await fetch("/api/ai/chat",{method:"POST",headers:aiHeaders(),body:JSON.stringify({system:systemFull,messages:followUp})});
        const d2 = await r2.json();
        reply = d2.content || reply;
      }

      const createData    = parseCreateRecord(reply);
      const workflowData  = parseCreateWorkflow(reply);
      const userData      = parseCreateUser(reply);
      const roleData      = parseCreateRole(reply);
      const interviewData = parseScheduleInterview(reply);
      const formData2     = parseCreateForm(reply);
      const modifyReport  = parseModifyReport(reply);
      const reportData    = parseCreateReport(reply);
      const cvData        = parseParsedCV(reply);
      const jdData        = parseParsedJD(reply);
      const propAction    = parseProposeAction(reply);
      const displayText = stripBlocks(reply);
      const msgIndex = newMessages.length;

      const fallbackMsg = createData ? `I've prepared the ${createData.object_slug} record:`
        : workflowData   ? `I've designed the **${workflowData.name}** workflow:`
        : userData       ? `I've prepared the invite for **${userData.first_name} ${userData.last_name}**:`
        : roleData       ? `I've prepared the **${roleData.name}** role:`
        : interviewData  ? `I've prepared the interview for **${interviewData.candidate_name||'the candidate'}**:`
        : formData2      ? `I've designed the **${formData2.name}** form:`
        : reportData     ? `I've built a **${reportData.title}** report — does this look right?`
        : "";

      // Store action data on the message itself so each card is self-contained and immune to state resets
      setMessages(m=>[...m,{role:"assistant",content:displayText||fallbackMsg,ts:new Date(),hasCreate:!!createData,hasWorkflow:!!workflowData,hasUser:!!userData,hasRole:!!roleData,hasInterview:!!interviewData,hasForm:!!formData2,hasReport:!!reportData,hasParsedCV:!!cvData,hasParsedJD:!!jdData,hasProposedAction:!!propAction,hasSearch:searchHits.length>0,searchIndex:msgIndex,
        interviewData, formData2, reportData}]);
      if(createData)    setPendingRecord(createData);
      if(workflowData)  setPendingWorkflow(workflowData);
      if(userData)      setPendingUser(userData);
      if(roleData)      setPendingRole(roleData);
      if(interviewData && canRecord('record_schedule_interview')) setPendingInterview(interviewData);
      if(formData2)     setPendingForm(formData2);
      if(modifyReport)  window.dispatchEvent(new CustomEvent("talentos:modify-report", { detail: modifyReport }));
      if(reportData)    setPendingReport(reportData);
      if(cvData)        setParsedPerson(cvData);
      if(jdData)        setParsedJob(jdData);
      if(propAction)    setProposedAction(propAction);

    } catch(err){
      setMessages(m=>[...m,{role:"assistant",content:"I encountered an error. Please check your API key is set on the server.",ts:new Date(),error:true}]);
    }
    setLoading(false);
    setLoadingLabel("");
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const handleConfirmCreate = async () => {    if(!pendingRecord||!environment?.id) return;
    setCreating(true);
    const obj = objects.find(o=>o.slug===pendingRecord.object_slug);
    if(!obj){setCreating(false);return;}
    try {
      const created = await api.post("/records",{object_id:obj.id,environment_id:environment.id,data:pendingRecord.data,created_by:"Copilot"});
      const d = pendingRecord.data;
      const name = (d.first_name?`${d.first_name} ${d.last_name||""}`.trim():null)||d.job_title||d.pool_name||"Record";
      const msgIndex = messages.length;
      setMessages(m=>[...m,{role:"assistant",content:`✅ **${name}** created successfully!`,ts:new Date(),createdRecord:{id:created.id,name,objectName:obj.name,objectColor:obj.color,objectSlug:obj.slug,sub:d.email||d.department||d.category||""}}]);
      setPendingRecord(null);
    } catch{
      setMessages(m=>[...m,{role:"assistant",content:"Failed to create the record. Please try again.",ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleEditRecord = () => {
    setPendingRecord(null);
    const editMsg = `Please help me edit this record before creating:\n${JSON.stringify(pendingRecord?.data,null,2)}\n\nAsk what they'd like to change.`;
    sendMessage(editMsg);
  };

  const handleConfirmWorkflow = async () => {
    if (!pendingWorkflow || !environment?.id) return;
    setCreating(true);
    try {
      const obj = objects.find(o => o.slug === pendingWorkflow.object_slug);
      if (!obj) throw new Error("Object not found");
      // Create workflow
      const wf = await api.post("/workflows", {
        name: pendingWorkflow.name,
        object_id: obj.id,
        environment_id: environment.id,
        description: pendingWorkflow.description || "",
      });
      // Save steps
      const steps = (pendingWorkflow.steps || []).map((s, i) => ({
        id: `step_${i}`, name: s.name, automation_type: s.automation_type || null, config: s.config || {},
      }));
      await api.put(`/workflows/${wf.id}/steps`, { steps });
      setMessages(m => [...m, { role:"assistant", content:`✅ **${wf.name}** created`, ts:new Date(),
        createdNav:{ label:`${wf.name} workflow`, nav:"workflows", icon:"workflow", color:"#7c3aed", sub:`${steps.length} stage${steps.length!==1?"s":""}` }
      }]);
      setPendingWorkflow(null);
    } catch (err) {
      setMessages(m => [...m, { role:"assistant", content:`Failed to create workflow: ${err.message}`, ts:new Date(), error:true }]);
    }
    setCreating(false);
  };

  const handleConfirmUser = async () => {
    if (!pendingUser) return;
    setCreating(true);
    try {
      // Resolve role_name → role_id
      const role = adminRoles.find(r => r.name.toLowerCase() === pendingUser.role_name?.toLowerCase()) || adminRoles.find(r => r.slug === "recruiter");
      if (!role) throw new Error("Role not found — please specify a valid role name");
      const result = await api.post("/users", {
        first_name: pendingUser.first_name,
        last_name:  pendingUser.last_name,
        email:      pendingUser.email,
        role_id:    role.id,
      });
      setMessages(m=>[...m,{role:"assistant",content:`✅ **${result.first_name} ${result.last_name}** invited as **${role.name}**! Temporary password: \`${result.temp_password}\``,ts:new Date()}]);
      setPendingUser(null);
      // Refresh users list
      api.get("/users").then(u=>{ if(Array.isArray(u)) setAdminUsers(u); }).catch(()=>{});
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to invite user: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmRole = async () => {
    if (!pendingRole) return;
    setCreating(true);
    try {
      const result = await api.post("/roles", {
        name:        pendingRole.name,
        description: pendingRole.description || "",
        color:       pendingRole.color || "#3b5bdb",
        clone_from_role_id: pendingRole.clone_from_role_id || null,
      });
      setMessages(m=>[...m,{role:"assistant",content:`✅ **${result.name}** role created`,ts:new Date(),
        createdNav:{ label:`${result.name} role`, nav:"settings", icon:"users", color:result.color||"#e03131", sub:"Assign users in Settings → Users" }
      }]);
      setPendingRole(null);
      api.get("/roles").then(r=>{ if(Array.isArray(r)) setAdminRoles(r); }).catch(()=>{});
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to create role: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmParsedPerson = async () => {
    if (!parsedPerson || !environment?.id) return;
    setCreating(true);
    try {
      const objs = await tFetch(`/api/objects?environment_id=${environment.id}`).then(r=>r.json());
      const peopleObj = (Array.isArray(objs)?objs:[]).find(o=>o.slug==='people'||o.name?.toLowerCase().includes('person')||o.name?.toLowerCase().includes('people'));
      if (!peopleObj) throw new Error('People object not found');
      const rec = await tFetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({object_id:peopleObj.id,environment_id:environment.id,data:{
          first_name:parsedPerson.first_name||'',last_name:parsedPerson.last_name||'',
          email:parsedPerson.email||'',phone:parsedPerson.phone||'',
          current_title:parsedPerson.current_title||'',location:parsedPerson.location||'',
          skills:parsedPerson.skills||[],linkedin:parsedPerson.linkedin||'',
          years_experience:parsedPerson.years_experience||0,status:'Active',
        },created_by:'Copilot'})}).then(r=>r.json());
      const name = `${parsedPerson.first_name||''} ${parsedPerson.last_name||''}`.trim();
      setMessages(m=>[...m,{role:'assistant',content:`✅ **${name}** created`,ts:new Date(),createdRecord:{id:rec.id,name,objectName:peopleObj.name,objectColor:peopleObj.color||"#3b5bdb",objectSlug:peopleObj.slug,sub:parsedPerson.current_title||parsedPerson.email||""}}]);
      setParsedPerson(null);
    } catch(err) {
      setMessages(m=>[...m,{role:'assistant',content:`Failed: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmParsedJob = async () => {
    if (!parsedJob || !environment?.id) return;
    setCreating(true);
    try {
      const objs = await tFetch(`/api/objects?environment_id=${environment.id}`).then(r=>r.json());
      const jobObj = (Array.isArray(objs)?objs:[]).find(o=>o.slug==='jobs'||o.name?.toLowerCase().includes('job'));
      if (!jobObj) throw new Error('Jobs object not found');
      const rec2 = await tFetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({object_id:jobObj.id,environment_id:environment.id,data:{
          job_title:parsedJob.job_title||'',department:parsedJob.department||'',
          location:parsedJob.location||'',work_type:parsedJob.work_type||'',
          employment_type:parsedJob.employment_type||'',salary_min:parsedJob.salary_min||0,
          salary_max:parsedJob.salary_max||0,description:parsedJob.description||'',
          requirements:parsedJob.requirements||'',skills:parsedJob.skills||[],status:'Open',
        },created_by:'Copilot'})}).then(r=>r.json());
      setMessages(m=>[...m,{role:'assistant',content:`✅ **${parsedJob.job_title}** created`,ts:new Date(),createdRecord:{id:rec2.id,name:parsedJob.job_title,objectName:jobObj.name,objectColor:jobObj.color||"#0ca678",objectSlug:jobObj.slug,sub:parsedJob.department||parsedJob.location||""}}]);
      setParsedJob(null);
    } catch(err) {
      setMessages(m=>[...m,{role:'assistant',content:`Failed: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmProposedAction = async () => {
    if (!proposedAction) return;
    setCreating(true);
    const { action_type, payload, title } = proposedAction;
    try {
      let resultMsg = `✅ Done — ${title}`;

      // ── Add / update a note on a record ────────────────────────────────────
      if (action_type === 'add_note' && payload?.record_id && payload?.content) {
        await tFetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            record_id: payload.record_id,
            content: payload.content,
            author: payload.author || 'Copilot',
          }),
        });
        resultMsg = `✅ Note added to record`;

      // ── Update a single field on a record ───────────────────────────────────
      } else if (action_type === 'update_field' && payload?.record_id && payload?.field) {
        const rec = await tFetch(`/api/records/${payload.record_id}`).then(r => r.json());
        await tFetch(`/api/records/${payload.record_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { ...rec.data, [payload.field]: payload.value } }),
        });
        resultMsg = `✅ **${payload.field}** updated to **${payload.value}**`;

      // ── Legacy: status_change (alias for update_field) ──────────────────────
      } else if (action_type === 'status_change' && payload?.record_id && payload?.field && payload?.value) {
        const rec = await tFetch(`/api/records/${payload.record_id}`).then(r => r.json());
        await tFetch(`/api/records/${payload.record_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { ...rec.data, [payload.field]: payload.value } }),
        });
        resultMsg = `✅ Status updated to **${payload.value}**`;

      // ── Log a communication (call / email / sms) ────────────────────────────
      } else if (action_type === 'log_comm' && payload?.record_id) {
        await tFetch('/api/comms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            record_id: payload.record_id,
            type: payload.comm_type || 'call',
            direction: payload.direction || 'outbound',
            subject: payload.subject || '',
            body: payload.body || payload.notes || '',
            duration_seconds: payload.duration_seconds || null,
            outcome: payload.outcome || null,
            author: payload.author || 'Copilot',
          }),
        });
        resultMsg = `✅ ${payload.comm_type || 'Call'} logged`;

      // ── Move a person through a pipeline stage ──────────────────────────────
      } else if (action_type === 'pipeline_move' && payload?.link_id && payload?.new_stage) {
        await tFetch(`/api/people-links/${payload.link_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_stage: payload.new_stage }),
        });
        resultMsg = `✅ Moved to **${payload.new_stage}**`;

      // ── Assign a record to a user / recruiter ───────────────────────────────
      } else if (action_type === 'assign' && payload?.record_id) {
        const rec = await tFetch(`/api/records/${payload.record_id}`).then(r => r.json());
        await tFetch(`/api/records/${payload.record_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { ...rec.data, assigned_to: payload.assigned_to, recruiter: payload.assigned_to } }),
        });
        resultMsg = `✅ Assigned to **${payload.assigned_to}**`;

      // ── Bulk update multiple records ────────────────────────────────────────
      } else if (action_type === 'bulk_op' && payload?.record_ids?.length) {
        await Promise.all(payload.record_ids.map(id =>
          tFetch(`/api/records/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: payload.data }),
          })
        ));
        resultMsg = `✅ Updated ${payload.record_ids.length} records`;

      // ── Delete a record ─────────────────────────────────────────────────────
      } else if (action_type === 'delete' && payload?.record_id) {
        await tFetch(`/api/records/${payload.record_id}`, { method: 'DELETE' });
        resultMsg = `✅ Record deleted`;

      } else {
        // Unknown action type — log it
        console.warn('[Copilot] Unknown action_type:', action_type, payload);
        resultMsg = `✅ Action recorded`;
      }

      setMessages(m => [...m, { role: 'assistant', content: resultMsg, ts: new Date() }]);
      setProposedAction(null);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `❌ Failed: ${err.message}`, ts: new Date(), error: true }]);
    }
    setCreating(false);
  };

  const handleConfirmInterview = async (interviewSnapshot) => {
    // Use passed-in snapshot to avoid stale-state issues when pendingInterview was reset
    const iv = interviewSnapshot || pendingInterview;
    if (!iv || !environment?.id) return;
    setCreating(true);
    try {
      const candidateId = iv.candidate_id || currentRecord?.id || null;
      const candidateName = iv.candidate_name ||
        (currentRecord?.data ? `${currentRecord.data.first_name||''} ${currentRecord.data.last_name||''}`.trim() : '') || 'Candidate';
      const created = await api.post("/interviews", {
        environment_id:       environment.id,
        candidate_id:         candidateId,
        candidate_name:       candidateName,
        interview_type_id:    iv.interview_type_id   || null,
        interview_type_name:  iv.interview_type_name || 'Interview',
        date:                 iv.date,
        time:                 iv.time  || '10:00',
        duration:             iv.duration || 45,
        format:               iv.format || 'Video Call',
        interviewers:         iv.interviewers || [],
        notes:                iv.notes || '',
        status:               'pending',
      });
      if (created?.error) throw new Error(created.error);
      const dateVal = iv.date;
      const timeVal = iv.time || '10:00';
      let dateStr = 'the scheduled date';
      if (dateVal) {
        try {
          const d = new Date(`${dateVal}T${timeVal}`);
          dateStr = isNaN(d.getTime()) ? dateVal : d.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        } catch { dateStr = dateVal; }
      }
      const fmt = iv.format || 'Video Call';
      const dur = iv.duration || 45;
      setMessages(m=>[...m,{role:"assistant",content:`✅ Interview scheduled for **${candidateName}** on **${dateStr}** (${fmt}, ${dur} min). View it in the Interviews section.`,ts:new Date()}]);
      setPendingInterview(null);
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to schedule interview: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmPortal = async () => {
    if (!pendingPortal || !environment?.id) return;
    setCreating(true);
    try {
      const uid = () => Math.random().toString(36).slice(2, 10);
      
      // Build the full portal object with IDs
      const pages = (pendingPortal.pages || []).map(page => ({
        id: uid(),
        name: page.name || "Home",
        slug: page.slug || "/",
        rows: (page.rows || []).map(row => ({
          id: uid(),
          preset: row.preset || "1",
          bgColor: row.bgColor || "",
          bgImage: row.bgImage || "",
          overlayOpacity: row.overlayOpacity || 0,
          padding: row.padding || "lg",
          cells: (row.cells || []).map(cell => ({
            id: uid(),
            widgetType: cell.widgetType || null,
            widgetConfig: cell.widgetConfig || {},
          })),
        })),
        seo: page.seo || {},
      }));

      const portal = await api.post("/portals", {
        environment_id: environment.id,
        name: pendingPortal.name || "New Portal",
        slug: pendingPortal.slug || "/" + (pendingPortal.name || "portal").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: pendingPortal.description || "",
        type: pendingPortal.type || "career_site",
        status: "draft",
        theme: pendingPortal.theme || {},
        pages,
        nav: pendingPortal.nav || {},
        footer: pendingPortal.footer || {},
        gdpr: pendingPortal.gdpr || {},
      });

      const pageSummary = pages.map(p => p.name).join(", ");
      const widgetCount = pages.reduce((sum, p) => sum + p.rows.reduce((s, r) => s + r.cells.filter(c => c.widgetType).length, 0), 0);

      setMessages(m => [...m, {
        role: "assistant",
        content: `✅ **${portal.name}** portal created as a draft! It has ${pages.length} page${pages.length !== 1 ? "s" : ""} with ${widgetCount} widget${widgetCount !== 1 ? "s" : ""}. Go to Settings → Portals to preview and publish it.`,
        ts: new Date(),
        createdNav: {
          label: portal.name,
          nav: "settings",
          icon: "globe",
          color: pendingPortal.theme?.primaryColor || "#4361EE",
          sub: `${pendingPortal.type?.replace(/_/g, " ")} · ${pageSummary}`,
        },
      }]);
      setPendingPortal(null);
    } catch (err) {
      setMessages(m => [...m, {
        role: "assistant",
        content: `Failed to create portal: ${err.message}`,
        ts: new Date(),
        error: true,
      }]);
    }
    setCreating(false);
  };

  const handleConfirmForm = async () => {
    if (!pendingForm || !environment?.id) return;
    setCreating(true);
    try {
      // Ensure each field has a unique id and api_key
      const fields = (pendingForm.fields || []).map((f, i) => ({
        ...f,
        id: `field_${i}_${Math.random().toString(36).slice(2,6)}`,
        api_key: f.api_key || f.label?.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || `field_${i}`,
        options: f.options || [],
        searchable: f.searchable !== false,
        confidential: !!f.confidential,
        required: !!f.required,
        show_in_list: !!f.show_in_list,
      }));
      const form = await api.post("/forms", {
        environment_id: environment.id,
        name:           pendingForm.name,
        description:    pendingForm.description || '',
        category:       pendingForm.category    || 'general',
        applies_to:     pendingForm.applies_to  || ['people'],
        sharing:        pendingForm.sharing      || 'internal',
        confidential:   pendingForm.confidential || false,
        allow_multiple: pendingForm.allow_multiple !== false,
        show_in_record: pendingForm.show_in_record !== false,
        searchable:     pendingForm.searchable !== false,
        parseable:      pendingForm.parseable   !== false,
        fields,
        created_by:     'Copilot',
      });
      setMessages(m=>[...m,{role:"assistant",content:`✅ **${form.name}** created`,ts:new Date(),
        createdNav:{ label:`${form.name}`, nav:"settings", icon:"form", color:"#0caf77", sub:`${fields.length} field${fields.length!==1?'s':''}` }
      }]);
      setPendingForm(null);
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to create form: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const handleConfirmReport = () => {
    if (!pendingReport) return;
    const cfg = {
      title:      pendingReport.title,
      objectSlug: pendingReport.object,   // App handler requires objectSlug
      object:     pendingReport.object,   // keep for backwards compat
      groupBy:    pendingReport.group_by,
      chartType:  pendingReport.chart_type || "bar",
      sortBy:     pendingReport.sort_by,
      sortDir:    pendingReport.sort_dir || "desc",
      filters:    pendingReport.filters  || [],
      formulas:   pendingReport.formulas || [],
      autoRun:    true,
      _ts:        Date.now(),             // force change even if already on reports
    };
    window.dispatchEvent(new CustomEvent("talentos:open-report", { detail: cfg }));
    setMessages(m=>[...m,{role:"assistant",content:`Opening **${pendingReport.title}** in Reports — it's running now. Adjust filters or save it from there.`,ts:new Date()}]);
    setPendingReport(null);
  };

  const copyMessage = (text,id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),2000); };

  const renderMessage = (content) => content
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/^[•\-] (.+)$/gm,'<span style="display:block;padding-left:10px;margin:2px 0">• $1</span>')
    .replace(/\n\n/g,"<br/>")
    .replace(/\n(?!<span)/g,"<br/>");

  const getObjForSlug  = (slug)  => objects.find(o=>o.slug===slug);
  const getFieldsForSlug = (slug) => { const o=getObjForSlug(slug); return o?(fields[o.id]||[]):[];  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes popIn{from{opacity:0;transform:scale(.97) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} .copilot-action-btn:hover{background:rgba(124,58,237,0.1)!important;border-color:rgba(124,58,237,0.4)!important;color:#7c3aed!important;transform:translateY(-1px);}`}</style>

      {/* Floating button */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(124,58,237,.4)",zIndex:800,transition:"transform .15s,box-shadow .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.08)";e.currentTarget.style.boxShadow="0 6px 28px rgba(124,58,237,.5)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 20px rgba(124,58,237,.4)";}}>
        {open?<Ic n="x" s={20} c="white"/>:<svg width="22" height="22" viewBox="0 0 80 80" fill="none"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.6"/></svg>}
      </button>

      {/* Chat panel */}
      {open&&(
        <div style={{position:"fixed",bottom:88,right:24,width:440,height:620,background:"#fafbff",borderRadius:24,boxShadow:"0 32px 80px rgba(80,40,180,.22),0 4px 16px rgba(0,0,0,.08)",zIndex:800,display:"flex",flexDirection:"column",overflow:"hidden",border:"1px solid rgba(124,58,237,.15)",animation:"popIn .22s cubic-bezier(.175,.885,.32,1.275)"}}>

          {/* Header */}
          <div style={{padding:"18px 20px 16px",background:"linear-gradient(135deg,#5b21b6 0%,#4338ca 60%,#3b5bdb 100%)",display:"flex",alignItems:"center",gap:12,flexShrink:0,position:"relative",overflow:"hidden"}}>
            {/* Decorative background icon */}
            <svg style={{position:"absolute",right:-10,top:-10,opacity:0.06}} width="120" height="120" viewBox="0 0 80 80" fill="none"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/></svg>
            <div style={{width:38,height:38,borderRadius:12,background:"rgba(255,255,255,.18)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid rgba(255,255,255,.25)"}}>
              <svg width="20" height="20" viewBox="0 0 80 80" fill="none"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.6"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:"white",letterSpacing:"-0.2px"}}>Vercentic Copilot</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:1}}>
                {(()=>{
                  if(currentRecord&&currentObject){
                    const d=currentRecord.data||{};
                    const name=(d.first_name?`${d.first_name} ${d.last_name||""}`.trim():null)||d.job_title||d.pool_name||"Record";
                    return `Viewing ${currentObject.name}: ${name}`;
                  }
                  if(activeNav==="dashboard") return "On Dashboard";
                  if(activeNav==="interviews") return "In Interviews";
                  if(activeNav==="offers") return "In Offers";
                  if(activeNav==="reports") return "In Reports";
                  if(activeNav==="settings") return settingsSection ? `Settings · ${settingsSection}` : "In Settings";
                  if(activeNav?.startsWith("obj_")){
                    const obj=(navObjects||[]).find(o=>"obj_"+o.id===activeNav);
                    return obj ? `Viewing ${obj.plural_name||obj.name}` : "Viewing records";
                  }
                  return "Your AI assistant";
                })()}
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",cursor:"pointer",padding:7,borderRadius:10,display:"flex",transition:"background .15s",zIndex:1}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.25)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.15)"}>
              <Ic n="x" s={13} c="white"/>
            </button>
          </div>

          {/* Quick actions */}
          {messages.length<=1&&(
            <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(124,58,237,.1)",flexShrink:0,background:"white"}}>
              {currentRecord&&currentObject ? (
                // On a record — show record-specific actions in the object's colour
                (()=>{
                  const actions = RECORD_ACTIONS[currentObject.slug] || RECORD_ACTIONS.people;
                  const col = currentObject.color || "#7c3aed";
                  const colLight = col + "18";
                  const colBorder = col + "30";
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {actions.map(a=>(
                        <button key={a.id} onClick={()=>sendMessage(a.prompt)}
                          style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:10,border:`1px solid ${colBorder}`,background:colLight,color:col,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .12s",textAlign:"left"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=col+"2e";e.currentTarget.style.transform="translateY(-1px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=colLight;e.currentTarget.style.transform="none";}}>
                          <div style={{width:22,height:22,borderRadius:6,background:col+"28",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <Ic n={a.icon} s={11} c={col}/>
                          </div>
                          <span style={{lineHeight:1.2}}>{a.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()
              ) : (
                // Not on a record — show nudges (if any) then the create actions grid
                <>
                  {nudges.length > 0 && (
                    <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2,paddingLeft:2}}>Suggested actions</div>
                      {nudges.map((n,i) => (
                        <button key={i} onClick={() => sendMessage(n.action)}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,
                            border:`1.5px solid ${n.color}28`,background:`${n.color}08`,
                            cursor:"pointer",fontFamily:F,textAlign:"left",width:"100%",transition:"all .12s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${n.color}14`;}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${n.color}08`;}}>
                          <div style={{width:24,height:24,borderRadius:7,background:`${n.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <Ic n={n.icon} s={12} c={n.color}/>
                          </div>
                          <span style={{fontSize:11,fontWeight:600,color:n.color,flex:1,lineHeight:1.3}}>{n.text}</span>
                          <span style={{fontSize:11,color:n.color,opacity:0.6,flexShrink:0}}>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {CREATE_ACTIONS.map(a=>(
                      <button key={a.id} onClick={()=>sendMessage(a.prompt)} className="copilot-action-btn"
                        style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:10,border:"1px solid rgba(124,58,237,.18)",background:"rgba(124,58,237,.04)",color:"#5b21b6",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .12s",textAlign:"left"}}>
                        <div style={{width:22,height:22,borderRadius:6,background:"rgba(124,58,237,.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Ic n={a.icon} s={11} c="#7c3aed"/>
                        </div>
                        <span style={{lineHeight:1.2}}>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{flex:1,overflow:"auto",padding:"16px 16px",display:"flex",flexDirection:"column",gap:14,background:"linear-gradient(180deg,#f5f3ff 0%,#eef2ff 100%)"}}>
            {messages.map((msg,i)=>(
              <div key={i}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                  {msg.role==="assistant"&&(
                    <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                      <svg width="14" height="14" viewBox="0 0 80 80" fill="none"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/></svg>
                    </div>
                  )}
                  <div style={{maxWidth:"82%",position:"relative"}}>
                    {msg.content&&(
                      <div style={{padding:"11px 14px",borderRadius:msg.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",background:msg.role==="user"?"linear-gradient(135deg,#5b21b6,#4338ca)":msg.error?"#fef2f2":"white",color:msg.role==="user"?"white":msg.error?"#dc2626":C.text1,fontSize:13,lineHeight:1.45,boxShadow:msg.role==="user"?"0 2px 12px rgba(91,33,182,.3)":"0 1px 4px rgba(0,0,0,.06)",borderLeft:msg.role==="assistant"&&!msg.error?"3px solid rgba(124,58,237,.25)":undefined}}
                        dangerouslySetInnerHTML={{__html:renderMessage(msg.content)}}/>
                    )}
                    {msg.role==="assistant"&&!msg.error&&msg.content&&(
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:3}}>
                        <button onClick={()=>copyMessage(msg.content,i)}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:copied===i?"#0ca678":C.text3,display:"flex",alignItems:"center",gap:3,padding:"2px 4px",fontFamily:F}}>
                          <Ic n={copied===i?"check":"copy"} s={10}/>{copied===i?"Copied":"Copy"}
                        </button>
                      </div>
                    )}
                    {msg.role==="assistant"&&!msg.error&&(
                      <SuggestedActions
                        activeNav={activeNav}
                        currentObject={currentObject}
                        onSend={sendMessage}
                        isLastMsg={i===messages.length-1}
                      />
                    )}
                  </div>
                </div>

                {/* Search results */}
                {msg.role==="assistant"&&msg.hasSearch&&searchResults[msg.searchIndex]&&(
                  <div style={{marginTop:8,marginLeft:34}}>
                    <SearchResultCards results={searchResults[msg.searchIndex]} onNavigate={onNavigateToRecord}/>
                  </div>
                )}

                {/* Created record link */}
                {msg.role==="assistant"&&msg.createdRecord&&(
                  <div style={{marginTop:8,marginLeft:34}}>
                    <div onClick={()=>onNavigateToRecord&&onNavigateToRecord(msg.createdRecord)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"white",borderRadius:10,border:`1.5px solid ${msg.createdRecord.objectColor||C.ai}40`,cursor:"pointer",transition:"all .12s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${msg.createdRecord.objectColor||C.ai}08`;e.currentTarget.style.borderColor=`${msg.createdRecord.objectColor||C.ai}70`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor=`${msg.createdRecord.objectColor||C.ai}40`;}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:msg.createdRecord.objectColor||C.ai,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"white",fontSize:12,fontWeight:700}}>{msg.createdRecord.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{msg.createdRecord.name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{msg.createdRecord.objectName}{msg.createdRecord.sub?` · ${msg.createdRecord.sub}`:""}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:msg.createdRecord.objectColor||C.ai,display:"flex",alignItems:"center",gap:3}}>View <Ic n="arrowR" s={11} c={msg.createdRecord.objectColor||C.ai}/></span>
                    </div>
                  </div>
                )}

                {/* Created nav link (for workflows, forms, roles) */}
                {msg.role==="assistant"&&msg.createdNav&&(
                  <div style={{marginTop:8,marginLeft:34}}>
                    <div onClick={()=>window.dispatchEvent(new CustomEvent("talentos:navigate",{detail:msg.createdNav.nav}))}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"white",borderRadius:10,border:`1.5px solid ${msg.createdNav.color||C.ai}40`,cursor:"pointer",transition:"all .12s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${msg.createdNav.color||C.ai}08`;e.currentTarget.style.borderColor=`${msg.createdNav.color||C.ai}70`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor=`${msg.createdNav.color||C.ai}40`;}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:msg.createdNav.color||C.ai,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ic n={msg.createdNav.icon||"check"} s={14} c="white"/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{msg.createdNav.label}</div>
                        {msg.createdNav.sub&&<div style={{fontSize:11,color:C.text3}}>{msg.createdNav.sub}</div>}
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:msg.createdNav.color||C.ai,display:"flex",alignItems:"center",gap:3}}>Go <Ic n="arrowR" s={11} c={msg.createdNav.color||C.ai}/></span>
                    </div>
                  </div>
                )}

                {/* Record preview */}
                {msg.role==="assistant"&&msg.hasCreate&&pendingRecord&&i===messages.length-1&&(
                  <div style={{marginTop:8,marginLeft:34}}>
                    <RecordPreview
                      data={pendingRecord.data}
                      objectName={getObjForSlug(pendingRecord.object_slug)?.name||pendingRecord.object_slug}
                      objectColor={getObjForSlug(pendingRecord.object_slug)?.color}
                      fields={getFieldsForSlug(pendingRecord.object_slug)}
                      onConfirm={handleConfirmCreate}
                      onEdit={handleEditRecord}
                      creating={creating}
                    />
                  </div>
                )}

                {/* Workflow preview */}
                {msg.role==="assistant"&&msg.hasWorkflow&&pendingWorkflow&&i===messages.length-1&&(
                  <div style={{marginTop:8,marginLeft:34,background:"#f8f9fc",borderRadius:12,border:`2px solid ${C.ai}30`,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.accent},${C.ai})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="workflow" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{pendingWorkflow.name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{pendingWorkflow.object_slug} · {(pendingWorkflow.steps||[]).length} stages</div>
                      </div>
                    </div>
                    {/* Stage list */}
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                      {(pendingWorkflow.steps||[]).map((s,si)=>{
                        const aColor = s.automation_type==="ai_prompt"?"#7c3aed":s.automation_type==="send_email"?"#f59f00":s.automation_type==="stage_change"?"#3b5bdb":s.automation_type==="webhook"?"#e03131":"#0ca678";
                        const aIcon  = s.automation_type==="ai_prompt"?"cpu":s.automation_type==="send_email"?"mail":s.automation_type==="stage_change"?"tag":s.automation_type==="webhook"?"webhook":s.automation_type==="update_field"?"edit":null;
                        return (
                          <div key={si} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"white",borderRadius:8,border:`1px solid ${C.border}`}}>
                            <div style={{width:20,height:20,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <span style={{fontSize:10,fontWeight:800,color:C.accent}}>{si+1}</span>
                            </div>
                            <span style={{fontSize:12,fontWeight:600,color:C.text1,flex:1}}>{s.name||`Stage ${si+1}`}</span>
                            {aIcon&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:600,color:aColor,background:`${aColor}12`,padding:"2px 7px",borderRadius:99}}>
                              <Ic n={aIcon} s={9}/>{s.automation_type.replace("_"," ")}
                            </span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPendingWorkflow(null)}
                        style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                        Discard
                      </button>
                      <button onClick={handleConfirmWorkflow} disabled={creating}
                        style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.ai})`,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="check" s={12}/> Create Workflow</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── User invite preview card ── */}
                {msg.role==="assistant"&&msg.hasUser&&pendingUser&&i===messages.length-1&&(
                  <div style={{marginTop:10,padding:14,background:"#f8f9fc",borderRadius:12,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#0ca678,#3b5bdb)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="user" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{pendingUser.first_name} {pendingUser.last_name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{pendingUser.email} · {pendingUser.role_name}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPendingUser(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                      <button onClick={handleConfirmUser} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#0ca678,#3b5bdb)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Inviting…</>:<><Ic n="mail" s={12}/> Send Invite</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Role preview card ── */}
                {msg.role==="assistant"&&msg.hasRole&&pendingRole&&i===messages.length-1&&(
                  <div style={{marginTop:10,padding:14,background:"#f8f9fc",borderRadius:12,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:8,background:pendingRole.color||C.accent,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="shield" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{pendingRole.name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{pendingRole.description||"Custom role"}</div>
                      </div>
                      {pendingRole.color&&<div style={{width:16,height:16,borderRadius:4,background:pendingRole.color,border:`1px solid ${C.border}`}}/>}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPendingRole(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                      <button onClick={handleConfirmRole} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:pendingRole.color||C.accent,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="check" s={12}/> Create Role</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Proposed Action Card ── */}
                {msg.role==="assistant"&&msg.hasProposedAction&&proposedAction&&i===messages.length-1&&(()=>{
                  const sev = proposedAction.severity||'normal';
                  const col = sev==='danger'?{border:"#ef4444",bg:"#fff1f2",btn:"linear-gradient(135deg,#dc2626,#ef4444)",shadow:"rgba(239,68,68,.3)",badge:"#fee2e2",badgeTxt:"#b91c1c"}
                    : sev==='warning'?{border:"#f59e0b",bg:"#fffbeb",btn:"linear-gradient(135deg,#d97706,#f59e0b)",shadow:"rgba(245,158,11,.3)",badge:"#fef3c7",badgeTxt:"#b45309"}
                    : {border:"#6366f1",bg:"#eef2ff",btn:"linear-gradient(135deg,#4f46e5,#6366f1)",shadow:"rgba(99,102,241,.3)",badge:"#e0e7ff",badgeTxt:"#4338ca"};
                  return (
                    <div style={{margin:"8px 0",borderRadius:14,border:`2px solid ${col.border}`,background:col.bg,overflow:"hidden",animation:"fadeIn .2s ease"}}>
                      <div style={{padding:"9px 14px",background:col.btn,display:"flex",alignItems:"center",gap:8}}>
                        <Ic n="zap" s={13} c="white"/>
                        <span style={{fontSize:11,fontWeight:700,color:"white",letterSpacing:"0.02em"}}>PENDING ACTION — CONFIRM TO PROCEED</span>
                      </div>
                      <div style={{padding:"12px 14px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:3}}>{proposedAction.title}</div>
                        <div style={{fontSize:12,color:"#374151",marginBottom:10,lineHeight:1.5}}>{proposedAction.description}</div>
                        {proposedAction.details?.length>0&&(
                          <div style={{background:"white",borderRadius:8,padding:"9px 12px",marginBottom:10,border:`1px solid ${col.border}44`}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>This will:</div>
                            {proposedAction.details.map((d,di)=>(
                              <div key={di} style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:12,color:"#374151",marginBottom:3}}>
                                <span style={{color:col.border,fontWeight:700,flexShrink:0}}>→</span><span>{d}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {sev==="danger"&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:8,background:"#fee2e2",marginBottom:10,fontSize:11,color:"#991b1b",fontWeight:600}}><Ic n="alert-triangle" s={13} c="#b91c1c"/> This action cannot be undone</div>}
                        {sev==="warning"&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:8,background:"#fef3c7",marginBottom:10,fontSize:11,color:"#92400e",fontWeight:600}}><Ic n="alert-triangle" s={13} c="#b45309"/> Please review carefully before confirming</div>}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setProposedAction(null)} style={{flex:1,padding:"9px",borderRadius:9,border:"1px solid #e5e7eb",background:"white",color:"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                            {proposedAction.cancel_label||"Cancel"}
                          </button>
                          <button onClick={handleConfirmProposedAction} disabled={creating}
                            style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:col.btn,color:"white",fontSize:12,fontWeight:700,cursor:creating?"default":"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:`0 2px 10px ${col.shadow}`,opacity:creating?.7:1}}>
                            {creating?<><Ic n="loader" s={12} c="white"/> Working…</>:<><Ic n="check" s={12} c="white"/> {proposedAction.confirm_label||"Confirm"}</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── CV Parse Card ── */}
                {msg.role==="assistant"&&msg.hasParsedCV&&parsedPerson&&i===messages.length-1&&(
                  <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:"1.5px solid #0ea5e9",background:"#f0f9ff",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#0284c7,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="user" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#0c4a6e"}}>{parsedPerson.first_name} {parsedPerson.last_name}</div>
                        <div style={{fontSize:11,color:"#0284c7",fontWeight:600}}>{parsedPerson.current_title||'CV detected'}</div>
                      </div>
                      <span style={{fontSize:10,background:"#e0f2fe",color:"#0284c7",fontWeight:700,padding:"3px 8px",borderRadius:99}}>CV</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:10}}>
                      {[parsedPerson.email&&["✉️","Email",parsedPerson.email],parsedPerson.phone&&["📞","Phone",parsedPerson.phone],parsedPerson.location&&["📍","Location",parsedPerson.location],parsedPerson.years_experience&&["⏱","Experience",`${parsedPerson.years_experience} yrs`]].filter(Boolean).map(([icon,label,val])=>(
                        <div key={label} style={{background:"white",borderRadius:7,padding:"6px 9px",border:"1px solid #bae6fd",fontSize:11}}>
                          <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>{icon} {label}</div>
                          <div style={{color:"#0c4a6e",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {parsedPerson.skills?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{parsedPerson.skills.slice(0,6).map(s=><span key={s} style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"#e0f2fe",color:"#0369a1",fontWeight:600}}>{s}</span>)}{parsedPerson.skills.length>6&&<span style={{fontSize:10,color:"#94a3b8"}}>+{parsedPerson.skills.length-6} more</span>}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setParsedPerson(null)} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #e2e8f0",background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Dismiss</button>
                      <button onClick={handleConfirmParsedPerson} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#0284c7,#0ea5e9)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="user" s={12} c="white"/> Create Person</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── JD Parse Card ── */}
                {msg.role==="assistant"&&msg.hasParsedJD&&parsedJob&&i===messages.length-1&&(
                  <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:"1.5px solid #f59e0b",background:"#fffbeb",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#d97706,#f59e0b)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="briefcase" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#78350f"}}>{parsedJob.job_title||'Job Role'}</div>
                        <div style={{fontSize:11,color:"#d97706",fontWeight:600}}>{parsedJob.department||''}{parsedJob.location?` · ${parsedJob.location}`:''}</div>
                      </div>
                      <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",fontWeight:700,padding:"3px 8px",borderRadius:99}}>JD</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:10}}>
                      {[parsedJob.employment_type&&["💼","Type",parsedJob.employment_type],parsedJob.work_type&&["🏢","Work",parsedJob.work_type],(parsedJob.salary_min||parsedJob.salary_max)&&["💰","Salary",parsedJob.salary_min&&parsedJob.salary_max?`${parsedJob.salary_min.toLocaleString()}–${parsedJob.salary_max.toLocaleString()}`:`${(parsedJob.salary_min||parsedJob.salary_max).toLocaleString()}+`],parsedJob.location&&["📍","Location",parsedJob.location]].filter(Boolean).map(([icon,label,val])=>(
                        <div key={label} style={{background:"white",borderRadius:7,padding:"6px 9px",border:"1px solid #fde68a",fontSize:11}}>
                          <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>{icon} {label}</div>
                          <div style={{color:"#78350f",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {parsedJob.skills?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{parsedJob.skills.slice(0,6).map(s=><span key={s} style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"#fef3c7",color:"#92400e",fontWeight:600}}>{s}</span>)}{parsedJob.skills.length>6&&<span style={{fontSize:10,color:"#94a3b8"}}>+{parsedJob.skills.length-6} more</span>}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setParsedJob(null)} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #e2e8f0",background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Dismiss</button>
                      <button onClick={handleConfirmParsedJob} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#d97706,#f59e0b)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="briefcase" s={12} c="white"/> Create Job</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Interview Scheduling Card ── */}
                {msg.role==="assistant"&&msg.hasInterview&&msg.interviewData&&!msg.confirmed&&(()=>{
                  const iv = msg.interviewData;
                  return (
                  <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:`1.5px solid #7C3AED`,background:"#FAF5FF"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="calendar" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{iv.interview_type_name||'Interview'}</div>
                        <div style={{fontSize:11,color:"#7C3AED",fontWeight:600}}>{iv.candidate_name}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                      {[
                        ["📅 Date", iv.date],
                        ["⏰ Time", iv.time||"10:00"],
                        ["⏱ Duration", `${iv.duration||45} min`],
                        ["📍 Format", iv.format||"Video Call"],
                        iv.interviewers?.length ? ["👥 Interviewers", (Array.isArray(iv.interviewers)?iv.interviewers:[iv.interviewers]).join(", ")] : null,
                        iv.notes ? ["📝 Notes", iv.notes] : null,
                      ].filter(Boolean).map(([label,val])=>(
                        <div key={label} style={{background:"white",borderRadius:8,padding:"7px 10px",border:`1px solid #E9D5FF`}}>
                          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:2}}>{label}</div>
                          <div style={{fontSize:12,fontWeight:600,color:C.text1}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setMessages(m=>m.map((x,j)=>j===i?{...x,confirmed:true}:x))} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                      <button onClick={()=>{setMessages(m=>m.map((x,j)=>j===i?{...x,confirmed:true}:x));handleConfirmInterview(iv);}} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"#7C3AED",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Scheduling…</>:<><Ic n="check" s={12}/> Confirm Interview</>}
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {/* ── Portal Creation Card ── */}
{pendingPortal&&(
  <div style={{margin:"8px 0",padding:"16px",borderRadius:14,border:"1.5px solid #4361EE",background:"linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)"}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:36,height:36,borderRadius:10,background:pendingPortal.theme?.primaryColor||"#4361EE",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(67,97,238,.3)"}}>
        <Ic n="globe" s={18} c="white"/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:15,fontWeight:800,color:"#0F1729"}}>{pendingPortal.name||"New Portal"}</div>
        <div style={{fontSize:11,color:"#6B7280",fontWeight:600}}>{(pendingPortal.type||"career_site").replace(/_/g," ")} · {(pendingPortal.pages||[]).length} page{(pendingPortal.pages||[]).length!==1?"s":""}</div>
      </div>
    </div>

    {/* Theme preview */}
    {pendingPortal.theme&&(
      <div style={{marginBottom:12,padding:"10px 12px",borderRadius:10,background:"white",border:"1px solid #E8ECF8"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Theme</div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {[pendingPortal.theme.primaryColor,pendingPortal.theme.secondaryColor,pendingPortal.theme.bgColor,pendingPortal.theme.textColor].filter(Boolean).map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:16,height:16,borderRadius:4,background:c,border:"1px solid #E8ECF8",flexShrink:0}}/>
              <span style={{fontSize:10,color:"#6B7280",fontFamily:"monospace"}}>{c}</span>
            </div>
          ))}
        </div>
        {pendingPortal.theme.fontFamily&&(
          <div style={{marginTop:6,fontSize:11,color:"#374151"}}>
            Font: <strong>{pendingPortal.theme.fontFamily.replace(/'/g,"").split(",")[0]}</strong>
            {pendingPortal.theme.buttonStyle&&<> · Button: <strong>{pendingPortal.theme.buttonStyle}</strong></>}
          </div>
        )}
      </div>
    )}

    {/* Pages & widgets summary */}
    <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:4}}>
      {(pendingPortal.pages||[]).map((page,pi)=>(
        <div key={pi} style={{padding:"8px 10px",background:"white",borderRadius:8,border:"1px solid #E8ECF8"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <Ic n="fileText" s={11} c="#4361EE"/>
            <span style={{fontSize:12,fontWeight:700,color:"#0F1729"}}>{page.name||"Page "+(pi+1)}</span>
            <span style={{fontSize:10,color:"#9CA3AF",marginLeft:"auto"}}>{page.slug}</span>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {(page.rows||[]).flatMap(r=>(r.cells||[])).filter(c=>c.widgetType).map((c,ci)=>(
              <span key={ci} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"#EEF2FF",color:"#4361EE",fontWeight:600}}>{c.widgetType.replace(/_/g," ")}</span>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Nav preview */}
    {pendingPortal.nav&&(
      <div style={{marginBottom:12,padding:"6px 10px",borderRadius:8,background:pendingPortal.nav.bg||"#0F1729",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,fontWeight:700,color:pendingPortal.nav.color||"white"}}>{pendingPortal.nav.logo_text||pendingPortal.name}</span>
        {(pendingPortal.nav.links||[]).map((l,i)=>(
          <span key={i} style={{fontSize:10,color:(pendingPortal.nav.color||"white")+"99"}}>{l.label}</span>
        ))}
      </div>
    )}

    <div style={{display:"flex",gap:8}}>
      <button onClick={()=>setPendingPortal(null)} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #E5E7EB",background:"transparent",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
      <button onClick={handleConfirmPortal} disabled={creating} style={{flex:2,padding:"9px",borderRadius:8,border:"none",background:pendingPortal.theme?.primaryColor||"#4361EE",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 2px 8px rgba(67,97,238,.25)"}}>
        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="globe" s={12}/> Create Portal</>}
      </button>
    </div>
  </div>
)}
{/* ── Form Creation Card ── */}
                {msg.role==="assistant"&&msg.hasForm&&pendingForm&&i===messages.length-1&&(
                  <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:"1.5px solid #0CAF77",background:"#F0FDF4"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"#0CAF77",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n="form" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{pendingForm.name}</div>
                        <div style={{fontSize:11,color:"#0CAF77",fontWeight:600,textTransform:"capitalize"}}>
                          {pendingForm.category} · {(pendingForm.applies_to||[]).join(', ')}
                          {pendingForm.confidential&&" · 🔒 Confidential"}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#0CAF77",fontWeight:700,background:"#DCFCE7",padding:"3px 8px",borderRadius:99,flexShrink:0}}>
                        {(pendingForm.fields||[]).filter(f=>f.field_type!=='section').length} fields
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:12,maxHeight:160,overflowY:"auto"}}>
                      {(pendingForm.fields||[]).map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:"white",borderRadius:6,border:"1px solid #D1FAE5",fontSize:12}}>
                          <span style={{color:"#059669",fontWeight:700,width:90,flexShrink:0,fontSize:10,textTransform:"uppercase"}}>{f.field_type}</span>
                          <span style={{color:"#111827",flex:1}}>{f.label}</span>
                          {f.required&&<span style={{fontSize:9,color:"#EF4444",fontWeight:700,flexShrink:0}}>REQ</span>}
                          {f.options?.length>0&&<span style={{fontSize:9,color:"#6B7280",flexShrink:0}}>{f.options.length} opts</span>}
                        </div>
                      ))}
                    </div>
                    {pendingForm.description&&(
                      <div style={{fontSize:11,color:"#6B7280",marginBottom:10,fontStyle:"italic"}}>{pendingForm.description}</div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPendingForm(null)} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #E5E7EB",background:"transparent",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                      <button onClick={handleConfirmForm} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"#0CAF77",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        {creating?<><Ic n="loader" s={12}/> Creating…</>:<><Ic n="check" s={12}/> Create Form</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Report card ── */}
                {msg.role==="assistant"&&msg.hasReport&&pendingReport&&i===messages.length-1&&(
                  <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:"1.5px solid #7F77DD",background:"rgba(127,119,221,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"#7F77DD",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ic n="bar-chart-2" s={14} c="white"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{pendingReport.title}</div>
                        <div style={{fontSize:11,color:"#7F77DD",fontWeight:600,textTransform:"capitalize"}}>
                          {pendingReport.object} · {pendingReport.chart_type||"bar"} chart
                          {pendingReport.group_by?` · grouped by ${pendingReport.group_by}`:""}
                        </div>
                      </div>
                    </div>
                    {(pendingReport.filters||[]).length>0&&(
                      <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                        {pendingReport.filters.map((f,fi)=>(
                          <div key={fi} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:"white",borderRadius:6,border:"1px solid rgba(127,119,221,0.2)",fontSize:12}}>
                            <span style={{color:"#7F77DD",fontWeight:700,width:48,flexShrink:0}}>Filter</span>
                            <span style={{color:C.text1}}>{f.field} {f.op} {f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingReport.description&&(
                      <div style={{fontSize:11,color:C.text3,marginBottom:10,fontStyle:"italic"}}>{pendingReport.description}</div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPendingReport(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                      <button onClick={handleConfirmReport} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"#7F77DD",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        <Ic n="bar-chart-2" s={12} c="white"/> Open in Reports
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}

            {loading&&(
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 80 80" fill="none"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" opacity="0.6"/></svg></div>
                <div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:"#f8f9fc",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.ai,animation:`bounce 1.2s ${i*0.2}s ease infinite`}}/>)}</div>
                  {loadingLabel&&<span style={{fontSize:11,color:C.text3,fontStyle:"italic",animation:"fadeIn .3s ease"}}>{loadingLabel}</span>}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div
            style={{padding:"12px 14px",borderTop:`1.5px solid ${dragOver?"rgba(124,58,237,.5)":"rgba(124,58,237,.1)"}`,display:"flex",gap:8,alignItems:"flex-end",flexShrink:0,background:dragOver?"rgba(124,58,237,.04)":"white",transition:"all .15s"}}
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={handleDropEvent}
          >
            {/* Hidden file input */}
            <input ref={fileRef} type="file" style={{display:"none"}}
              accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.csv"
              onChange={handleFileInput}/>
            {/* Attach button */}
            <button onClick={()=>fileRef.current?.click()} disabled={fileProcessing||loading}
              title="Attach a file (CV, JD, PDF, image…)"
              style={{width:34,height:34,borderRadius:10,border:"1.5px solid #e5e7eb",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s",color:"#9ca3af"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(124,58,237,.4)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
              {fileProcessing ? <Ic n="loader" s={14} c="rgba(124,58,237,.7)"/> : <Ic n="paperclip" s={14} c="#9ca3af"/>}
            </button>
            {dragOver && (
              <div style={{position:"absolute",bottom:70,left:14,right:14,padding:"10px 14px",borderRadius:10,background:"rgba(124,58,237,.08)",border:"1.5px dashed rgba(124,58,237,.4)",fontSize:12,color:"rgba(124,58,237,.8)",fontWeight:600,textAlign:"center",pointerEvents:"none"}}>
                Drop file to analyse →
              </div>
            )}
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
              placeholder={dragOver?"Drop to analyse…":"Ask anything or say 'create a job'…"}
              rows={1} style={{flex:1,padding:"10px 14px",borderRadius:12,border:"1.5px solid #e5e7eb",fontSize:13,fontFamily:F,outline:"none",resize:"none",color:C.text1,lineHeight:1.4,maxHeight:80,overflowY:"auto",background:"#fafbff",transition:"border-color .15s"}}
              onFocus={e=>e.target.style.borderColor="rgba(124,58,237,.5)"}
              onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
            <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
              style={{width:38,height:38,borderRadius:12,border:"none",background:input.trim()&&!loading?"linear-gradient(135deg,#5b21b6,#4338ca)":"#f0f0f0",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s",boxShadow:input.trim()&&!loading?"0 2px 10px rgba(91,33,182,.35)":"none"}}>
              <Ic n="send" s={14} c={input.trim()&&!loading?"white":"#ccc"}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
