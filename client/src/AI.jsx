import { useState, useEffect, useCallback, useRef } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af",
  accent:"#3b5bdb", accentLight:"#eef1ff",
  ai:"#7c3aed", aiLight:"#f5f3ff",
};

const api = {
  get:  p     => fetch(`/api${p}`).then(r=>r.json()),
  post: (p,b) => fetch(`/api${p}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
};

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
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    plus:"M12 5v14M5 12h14",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    arrowR:"M5 12h14M12 5l7 7-7 7",
    shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    workflow:"M22 12h-4l-3 9L9 3l-3 9H2",
    calendar:"M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
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
const MatchResultsList = ({ matches }) => {
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
            <div key={m.item.id} style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",overflow:"hidden",height:48,transition:"box-shadow .12s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,.07)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>

              {/* Score bar */}
              <div style={{width:3,alignSelf:"stretch",background:scoreCol,flexShrink:0}}/>

              {/* Rank */}
              <div style={{width:24,textAlign:"center",flexShrink:0}}>
                <span style={{fontSize:9,fontWeight:800,color:C.text3}}>#{i+1}</span>
              </div>

              {/* Icon chip */}
              <div style={{width:24,height:24,borderRadius:6,background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginRight:8}}>
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

              {/* Score ring */}
              <div style={{padding:"0 8px",flexShrink:0,borderLeft:`1px solid ${C.border}`,height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ScoreRing score={m.score} size={28}/>
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

export const MatchingEngine = ({ environment, initialObject, initialRecord }) => {
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
          : <MatchResultsList matches={filtered} />
      }
    </div>
  );
};

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
const SYSTEM_PROMPT = `You are TalentOS Copilot, an AI assistant embedded in an enterprise talent acquisition platform.

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
- Always confirm fields with user before outputting the block`;

const QUICK_ACTIONS = [
  { id:"summarise", icon:"fileText",  label:"Summarise profile",    prompt:"Please provide a concise professional summary of this candidate profile, highlighting their key strengths." },
  { id:"email",     icon:"mail",      label:"Draft outreach email", prompt:"Draft a warm, professional outreach email to this candidate. Keep it to 3 paragraphs." },
  { id:"strengths", icon:"star",      label:"Strengths & gaps",     prompt:"Identify this candidate's top 3 strengths and top 2 gaps." },
  { id:"questions", icon:"zap",       label:"Interview questions",  prompt:"Suggest 5 targeted interview questions based on this profile." },
];

const CREATE_ACTIONS = [
  { id:"new-person",   icon:"user",      label:"New Person",      prompt:"I want to add a new person" },
  { id:"new-job",      icon:"briefcase", label:"New Job",         prompt:"I want to create a new job" },
  { id:"new-pool",     icon:"layers",    label:"New Talent Pool", prompt:"I want to create a new talent pool" },
  { id:"new-workflow",   icon:"workflow",  label:"New Workflow",    prompt:"I want to create a new workflow" },
  { id:"new-interview",  icon:"calendar",  label:"Schedule Interview", prompt:"I want to schedule an interview" },
  { id:"new-form",       icon:"form",      label:"Create Form",        prompt:"I want to create a new form" },
  { id:"new-user",     icon:"user",      label:"Invite User",     prompt:"I want to invite a new user" },
  { id:"new-role",     icon:"shield",    label:"New Role",        prompt:"I want to create a new role" },
  { id:"search",       icon:"search",    label:"Search records",  prompt:"Search for " },
];

/* ─── AI Copilot ─────────────────────────────────────────────────────────── */
export const AICopilot = ({ environment, currentRecord, currentObject, onNavigateToRecord }) => {
  const [open,         setOpen]         = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [context,      setContext]      = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [pendingRecord,setPendingRecord]   = useState(null);
  const [pendingWorkflow,setPendingWorkflow]= useState(null);
  const [pendingUser,setPendingUser]       = useState(null);
  const [pendingRole,setPendingRole]       = useState(null);
  const [creating,     setCreating]        = useState(false);
  const [objects,      setObjects]      = useState([]);
  const [fields,       setFields]       = useState({});
  const [searchResults,setSearchResults]= useState({}); // keyed by message index
  const [adminRoles,   setAdminRoles]   = useState([]);
  const [adminUsers,   setAdminUsers]   = useState([]);
  const [interviewTypes, setInterviewTypes] = useState([]);
  const [pendingInterview, setPendingInterview] = useState(null);
  const [pendingForm,      setPendingForm]      = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(()=>{
    if(!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(async objs=>{
      if(!Array.isArray(objs)) return;
      setObjects(objs);
      const fm={};
      await Promise.all(objs.map(async o=>{ const fs=await api.get(`/fields?object_id=${o.id}`); fm[o.id]=Array.isArray(fs)?fs:[]; }));
      setFields(fm);
    });
  },[environment?.id]);

  useEffect(()=>{
    if(!currentRecord||!currentObject){setContext(null);return;}
    setContext(`Current record (${currentObject.name}):\n${JSON.stringify(currentRecord.data,null,2)}`);
  },[currentRecord,currentObject]);

  useEffect(()=>{
    if(open&&messages.length===0){
      setMessages([{role:"assistant",content:context
        ?`Hi! I can see you're viewing a **${currentObject?.name}** record. I can summarise their profile, draft emails, or answer questions. I can also create records, workflows, users and roles — just ask!`
        :`Hi! I'm your TalentOS Copilot. I can:\n\n• **Search** candidates, jobs, and pools\n• **Create records** — people, jobs, talent pools\n• **Build workflows** with stages and automations\n• **Invite users** and **create roles** (admin)\n\nWhat would you like to do?`,
        ts:new Date()}]);
    }
  },[open]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  // Fetch admin data (roles + users) when copilot opens
  useEffect(()=>{
    if(!open) return;
    api.get("/roles").then(r=>{ if(Array.isArray(r)) setAdminRoles(r); }).catch(()=>{});
    api.get("/users").then(u=>{ if(Array.isArray(u)) setAdminUsers(u); }).catch(()=>{});
    if(environment?.id) api.get(`/interview-types?environment_id=${environment.id}`).then(t=>{ if(Array.isArray(t)) setInterviewTypes(t); }).catch(()=>{});
  },[open]);

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

  const parseCreateForm = (text) => {
    const match = text.match(/<CREATE_FORM>([\s\S]*?)<\/CREATE_FORM>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
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
    .replace(/<SEARCH_QUERY>[\s\S]*?<\/SEARCH_QUERY>/g,"")
    .trim();

  const runSearch = async ({ q, slug }) => {
    if (!q || !environment?.id) return [];
    try {
      if (slug) {
        const obj = objects.find(o => o.slug === slug);
        if (obj) {
          const r = await fetch(`/api/records?object_id=${obj.id}&environment_id=${environment.id}&search=${encodeURIComponent(q)}&limit=8`).then(r=>r.json());
          return (r.records||[]).map(rec => ({ ...rec, object_name: obj.name, object_slug: obj.slug, object_color: obj.color }));
        }
      }
      const data = await fetch(`/api/records/search?q=${encodeURIComponent(q)}&environment_id=${environment.id}&limit=8`).then(r=>r.json());
      return Array.isArray(data) ? data : [];
    } catch { return []; }
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
    setPendingRecord(null);
    setPendingWorkflow(null);
    setPendingUser(null);
    setPendingRole(null);
    setPendingInterview(null);
    setPendingForm(null);

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
        `\n\nPLATFORM OBJECTS:\n${objectsInfo}`,
        context?`\n\nCURRENT RECORD:\n${context}`:"",
        adminRoles.length?`\n\nAVAILABLE ROLES:\n${adminRoles.map(r=>`- ${r.name} (slug: ${r.slug}, id: ${r.id})`).join("\n")}`:"",
        adminUsers.length?`\n\nEXISTING USERS (${adminUsers.length} total):\n${adminUsers.map(u=>`- ${u.first_name} ${u.last_name} <${u.email}> role:${adminRoles.find(r=>r.id===u.role_id)?.name||u.role_id} status:${u.status}`).join("\n")}`:"",
        interviewTypes.length?`\n\nAVAILABLE INTERVIEW TYPES:\n${interviewTypes.map(t=>`- ${t.name} (id:${t.id}, duration:${t.duration}min, format:${t.format||t.interview_format||'Video Call'})`).join("\n")}`
          :"\n\nINTERVIEW TYPES: None configured yet — you can still schedule a custom interview.",
      ].join("");

      // First AI call
      const response = await fetch("/api/ai/chat",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system:systemFull,messages:newMessages.map(m=>({role:m.role,content:m.content}))}),
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error);
      let reply = data.content||"Sorry, I couldn't generate a response.";

      // Handle search query
      const searchQ = parseSearchQuery(reply);
      let searchHits = [];
      if (searchQ) {
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
        const r2 = await fetch("/api/ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:systemFull,messages:followUp})});
        const d2 = await r2.json();
        reply = d2.content || reply;
      }

      const createData    = parseCreateRecord(reply);
      const workflowData  = parseCreateWorkflow(reply);
      const userData      = parseCreateUser(reply);
      const roleData      = parseCreateRole(reply);
      const interviewData = parseScheduleInterview(reply);
      const formData2     = parseCreateForm(reply);
      const displayText = stripBlocks(reply);
      const msgIndex = newMessages.length;

      const fallbackMsg = createData ? `I've prepared the ${createData.object_slug} record:`
        : workflowData   ? `I've designed the **${workflowData.name}** workflow:`
        : userData       ? `I've prepared the invite for **${userData.first_name} ${userData.last_name}**:`
        : roleData       ? `I've prepared the **${roleData.name}** role:`
        : interviewData  ? `I've prepared the interview for **${interviewData.candidate_name||'the candidate'}**:`
        : formData2      ? `I've designed the **${formData2.name}** form:`
        : "";

      // Store action data on the message itself so each card is self-contained and immune to state resets
      setMessages(m=>[...m,{role:"assistant",content:displayText||fallbackMsg,ts:new Date(),hasCreate:!!createData,hasWorkflow:!!workflowData,hasUser:!!userData,hasRole:!!roleData,hasInterview:!!interviewData,hasForm:!!formData2,hasSearch:searchHits.length>0,searchIndex:msgIndex,
        interviewData, formData2}]);
      if(createData)    setPendingRecord(createData);
      if(workflowData)  setPendingWorkflow(workflowData);
      if(userData)      setPendingUser(userData);
      if(roleData)      setPendingRole(roleData);
      if(interviewData) setPendingInterview(interviewData);
      if(formData2)     setPendingForm(formData2);

    } catch(err){
      setMessages(m=>[...m,{role:"assistant",content:"I encountered an error. Please check your API key is set on the server.",ts:new Date(),error:true}]);
    }
    setLoading(false);
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
      setMessages(m => [...m, { role:"assistant", content:`✅ Workflow **${wf.name}** created with ${steps.length} stage${steps.length!==1?"s":""}! You can find it in the Workflows section.`, ts:new Date() }]);
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
      setMessages(m=>[...m,{role:"assistant",content:`✅ Role **${result.name}** created! You can now assign users to it in Settings → Security.`,ts:new Date()}]);
      setPendingRole(null);
      api.get("/roles").then(r=>{ if(Array.isArray(r)) setAdminRoles(r); }).catch(()=>{});
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to create role: ${err.message}`,ts:new Date(),error:true}]);
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
      setMessages(m=>[...m,{role:"assistant",content:`✅ Form **${form.name}** created with ${fields.length} field${fields.length!==1?'s':''}! Find it in Settings → Forms to edit or attach it to records.`,ts:new Date()}]);
      setPendingForm(null);
    } catch(err) {
      setMessages(m=>[...m,{role:"assistant",content:`Failed to create form: ${err.message}`,ts:new Date(),error:true}]);
    }
    setCreating(false);
  };

  const copyMessage = (text,id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),2000); };

  const renderMessage = (content) => content
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/^[•\-] (.+)$/gm,'<span style="display:block;padding-left:12px">• $1</span>')
    .replace(/\n/g,"<br/>");

  const getObjForSlug  = (slug)  => objects.find(o=>o.slug===slug);
  const getFieldsForSlug = (slug) => { const o=getObjForSlug(slug); return o?(fields[o.id]||[]):[];  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>

      {/* Floating button */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(124,58,237,.4)",zIndex:800,transition:"transform .15s,box-shadow .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.08)";e.currentTarget.style.boxShadow="0 6px 28px rgba(124,58,237,.5)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 20px rgba(124,58,237,.4)";}}>
        {open?<Ic n="x" s={20} c="white"/>:<Ic n="sparkles" s={20} c="white"/>}
      </button>

      {/* Chat panel */}
      {open&&(
        <div style={{position:"fixed",bottom:88,right:24,width:420,height:600,background:C.surface,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.18)",zIndex:800,display:"flex",flexDirection:"column",overflow:"hidden",border:`1px solid ${C.border}`,animation:"popIn .2s ease"}}>

          {/* Header */}
          <div style={{padding:"16px 18px",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="sparkles" s={16} c="white"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"white"}}>TalentOS Copilot</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{context?`Viewing ${currentObject?.name} record`:"Create records · ask questions · draft emails"}</div>
            </div>
            <button onClick={()=>{setMessages([]);setPendingRecord(null);setOpen(false);}} style={{background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Ic n="x" s={14} c="white"/></button>
          </div>

          {/* Quick actions */}
          {messages.length<=1&&(
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:"#fafbff"}}>
              {context&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                {QUICK_ACTIONS.map(a=>(
                  <button key={a.id} onClick={()=>sendMessage(a.prompt)}
                    style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,color:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ai;e.currentTarget.style.color=C.ai;e.currentTarget.style.background=C.aiLight;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;e.currentTarget.style.background=C.surface;}}>
                    <Ic n={a.icon} s={11}/>{a.label}
                  </button>
                ))}
              </div>}
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {CREATE_ACTIONS.map(a=>(
                  <button key={a.id} onClick={()=>sendMessage(a.prompt)}
                    style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:7,border:`1.5px solid ${C.ai}40`,background:C.aiLight,color:C.ai,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${C.ai}20`}
                    onMouseLeave={e=>e.currentTarget.style.background=C.aiLight}>
                    <Ic n={a.icon} s={11}/>{a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{flex:1,overflow:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>
            {messages.map((msg,i)=>(
              <div key={i}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                  {msg.role==="assistant"&&(
                    <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                      <Ic n="sparkles" s={12} c="white"/>
                    </div>
                  )}
                  <div style={{maxWidth:"82%",position:"relative"}}>
                    {msg.content&&(
                      <div style={{padding:"10px 13px",borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:msg.role==="user"?`linear-gradient(135deg,${C.ai},#3b5bdb)`:msg.error?"#fef2f2":"#f8f9fc",color:msg.role==="user"?"white":msg.error?"#dc2626":C.text1,fontSize:13,lineHeight:1.55}}
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

              </div>
            ))}

            {loading&&(
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.ai},#3b5bdb)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="sparkles" s={12} c="white"/></div>
                <div style={{padding:"12px 14px",borderRadius:"14px 14px 14px 4px",background:"#f8f9fc"}}>
                  <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.ai,animation:`bounce 1.2s ${i*0.2}s ease infinite`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-end",flexShrink:0}}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
              placeholder="Ask anything or say 'create a job'…"
              rows={1} style={{flex:1,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",resize:"none",color:C.text1,lineHeight:1.4,maxHeight:80,overflowY:"auto"}}
              onFocus={e=>e.target.style.borderColor=C.ai}
              onBlur={e=>e.target.style.borderColor=C.border}/>
            <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
              style={{width:36,height:36,borderRadius:10,border:"none",background:input.trim()&&!loading?`linear-gradient(135deg,${C.ai},#3b5bdb)`:"#f0f0f0",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}>
              <Ic n="send" s={14} c={input.trim()&&!loading?"white":"#ccc"}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
