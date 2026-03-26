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
  const r = (size-8)/2;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  const color = score>=75?"#0ca678":score>=50?"#f59f00":"#e03131";
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray .6s ease" }}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={800} fill={color} style={{ transform:`rotate(90deg) translate(0,${-size}px)`, transformOrigin:`${size/2}px ${size/2}px` }}>{score}</text>
    </svg>
  );
};

/* ─── Matching Engine ────────────────────────────────────────────────────── */
const matchCandidateToJob = (candidate, job) => {
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

export const MatchingEngine = ({ environment }) => {
  const [objects,setObjects]=useState([]);
  const [fields,setFields]=useState({});
  const [people,setPeople]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [selectedJob,setSelectedJob]=useState(null);
  const [matches,setMatches]=useState([]);
  const [loading,setLoading]=useState(false);
  const [minScore,setMinScore]=useState(0);

  useEffect(()=>{
    if(!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(async objs=>{
      if(!Array.isArray(objs)) return;
      setObjects(objs);
      const fm={};
      await Promise.all(objs.map(async o=>{ const fs=await api.get(`/fields?object_id=${o.id}`); fm[o.id]=Array.isArray(fs)?fs:[]; }));
      setFields(fm);
      const po=objs.find(o=>o.slug==="people"), jo=objs.find(o=>o.slug==="jobs");
      if(po){const r=await api.get(`/records?object_id=${po.id}&environment_id=${environment.id}&limit=200`);setPeople(r.records||[]);}
      if(jo){const r=await api.get(`/records?object_id=${jo.id}&environment_id=${environment.id}&limit=200`);setJobs(r.records||[]);if(r.records?.length)setSelectedJob(r.records[0]);}
    });
  },[environment?.id]);

  useEffect(()=>{
    if(!selectedJob||!people.length) return;
    setLoading(true);
    const scored=people.map(p=>({candidate:p,...matchCandidateToJob(p,selectedJob)})).sort((a,b)=>b.score-a.score);
    setTimeout(()=>{setMatches(scored);setLoading(false);},400);
  },[selectedJob,people]);

  const filtered=matches.filter(m=>m.score>=minScore);
  const peopleObj=objects.find(o=>o.slug==="people");
  const getTitle=(r,slug)=>{
    const fs=fields[objects.find(o=>o.slug===slug)?.id]||[];
    const parts=[fs.find(f=>["first_name","name","job_title","pool_name"].includes(f.api_key)),fs.find(f=>f.api_key==="last_name")].filter(Boolean).map(f=>r.data?.[f.api_key]).filter(Boolean);
    return parts.join(" ")||r.id?.slice(0,8)||"Untitled";
  };

  return (
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:24}}><h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800,color:C.text1}}>AI Matching</h1><p style={{margin:0,fontSize:13,color:C.text3}}>Score and rank candidates against open roles</p></div>
      <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
        <div style={{width:260,flexShrink:0}}>
          <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><Ic n="briefcase" s={14} c={C.ai}/><span style={{fontSize:12,fontWeight:700,color:C.text2}}>Select Job</span></div>
            <div style={{maxHeight:400,overflow:"auto"}}>
              {jobs.length===0?<div style={{padding:24,textAlign:"center",color:C.text3,fontSize:12}}>No jobs found.</div>:jobs.map(job=>{
                const title=getTitle(job,"jobs"),isSelected=selectedJob?.id===job.id;
                return <button key={job.id} onClick={()=>setSelectedJob(job)} style={{width:"100%",display:"flex",alignItems:"flex-start",gap:10,padding:"12px 16px",border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isSelected?C.aiLight:"transparent",textAlign:"left",fontFamily:F}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:job.data?.status==="Open"?"#0ca678":"#868e96",flexShrink:0,marginTop:4}}/>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:isSelected?700:500,color:isSelected?C.ai:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>{job.data?.department&&<div style={{fontSize:11,color:C.text3}}>{job.data.department}</div>}</div>
                  {isSelected&&<Ic n="check" s={14} c={C.ai}/>}
                </button>;
              })}
            </div>
          </div>
          <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px",marginTop:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10}}>Min. Score</div>
            <input type="range" min={0} max={90} step={5} value={minScore} onChange={e=>setMinScore(Number(e.target.value))} style={{width:"100%",accentColor:C.ai}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.text3,marginTop:4}}><span>0</span><span style={{fontWeight:700,color:C.ai}}>{minScore}+</span><span>90</span></div>
          </div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          {selectedJob&&<div style={{background:`linear-gradient(135deg,${C.ai}10,${C.accentLight})`,borderRadius:12,border:`1px solid ${C.ai}20`,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.ai,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="briefcase" s={16} c="white"/></div>
            <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{getTitle(selectedJob,"jobs")}</div><div style={{fontSize:12,color:C.text3}}>{[selectedJob.data?.department,selectedJob.data?.location,selectedJob.data?.work_type].filter(Boolean).join(" · ")}</div></div>
            <div style={{marginLeft:"auto",textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:C.ai}}>{filtered.length}</div><div style={{fontSize:11,color:C.text3}}>candidates</div></div>
          </div>}
          {loading?<div style={{textAlign:"center",padding:"60px 0",color:C.text3}}><div style={{animation:"spin 1s linear infinite",display:"inline-flex",marginBottom:8}}><Ic n="loader" s={24} c={C.ai}/></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{fontSize:13}}>Scoring…</div></div>
          :filtered.length===0?<div style={{textAlign:"center",padding:"60px 0",color:C.text3}}><div style={{fontSize:32,marginBottom:8}}>🎯</div><div style={{fontSize:14,fontWeight:600,color:C.text2}}>No matches above {minScore}</div></div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map((m,i)=>{
              const title=getTitle(m.candidate,"people");
              return <div key={m.candidate.id} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.text3,width:20,textAlign:"center",paddingTop:16,flexShrink:0}}>#{i+1}</div>
                <Avatar name={title} color={peopleObj?.color||C.accent} size={40}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:700,color:C.text1}}>{title}</span>{m.candidate.data?.status&&<Badge color={m.candidate.data.status==="Active"?"#0ca678":"#868e96"} light>{m.candidate.data.status}</Badge>}</div>
                  {[m.candidate.data?.current_title,m.candidate.data?.current_company].filter(Boolean).join(" · ")&&<div style={{fontSize:12,color:C.text3,marginBottom:8}}>{[m.candidate.data?.current_title,m.candidate.data?.current_company].filter(Boolean).join(" · ")}</div>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>{m.reasons.map((r,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#0ca678",background:"#f0fdf4",padding:"2px 8px",borderRadius:99}}><Ic n="check" s={10} c="#0ca678"/>{r}</span>)}</div>
                  {m.gaps.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{m.gaps.map((g,i)=><span key={i} style={{fontSize:11,color:"#f59f00",background:"#fffbeb",padding:"2px 8px",borderRadius:99}}>{g}</span>)}</div>}
                </div>
                <ScoreRing score={m.score}/>
              </div>;
            })}
          </div>}
        </div>
      </div>
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

You can help with:
1. Answering questions about recruitment data
2. Drafting professional outreach/email messages
3. Summarising candidate profiles
4. Providing hiring advice
5. Creating records (people, jobs, talent pools) conversationally

RECORD CREATION INSTRUCTIONS:
When a user wants to create a record:

Step 1: Identify which object (Person, Job, or Talent Pool).

Step 2: Collect mandatory fields. Ask for multiple at once, not one by one:
- Person: first_name, last_name, email (all required)
- Job: job_title (required)
- Talent Pool: pool_name (required)

Step 3: After mandatory fields, proactively suggest and collect optional enhancements:
- Job: offer to suggest department, location, work_type (On-site/Remote/Hybrid), employment_type, status (default: Open), required_skills, a full job description, salary range, hiring_manager
- Talent Pool: suggest category, description, tags
- Person: suggest current_title, current_company, location, status, skills

Step 4: When ready, output a JSON block in EXACTLY this format:
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
- Always include <CREATE_RECORD> when you have at least the mandatory fields
- When asked to write a JD, write a proper professional one with responsibilities and requirements sections
- Be conversational and efficient`;

const QUICK_ACTIONS = [
  { id:"summarise", icon:"fileText",  label:"Summarise profile",    prompt:"Please provide a concise professional summary of this candidate profile, highlighting their key strengths." },
  { id:"email",     icon:"mail",      label:"Draft outreach email", prompt:"Draft a warm, professional outreach email to this candidate. Keep it to 3 paragraphs." },
  { id:"strengths", icon:"star",      label:"Strengths & gaps",     prompt:"Identify this candidate's top 3 strengths and top 2 gaps." },
  { id:"questions", icon:"zap",       label:"Interview questions",  prompt:"Suggest 5 targeted interview questions based on this profile." },
];

const CREATE_ACTIONS = [
  { id:"new-person",  icon:"user",      label:"New Person",      prompt:"I want to add a new person" },
  { id:"new-job",     icon:"briefcase", label:"New Job",         prompt:"I want to create a new job" },
  { id:"new-pool",    icon:"layers",    label:"New Talent Pool", prompt:"I want to create a new talent pool" },
];

/* ─── AI Copilot ─────────────────────────────────────────────────────────── */
export const AICopilot = ({ environment, currentRecord, currentObject }) => {
  const [open,         setOpen]         = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [context,      setContext]      = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [pendingRecord,setPendingRecord]= useState(null);
  const [creating,     setCreating]     = useState(false);
  const [objects,      setObjects]      = useState([]);
  const [fields,       setFields]       = useState({});
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
        ?`Hi! I can see you're viewing a **${currentObject?.name}** record. I can summarise their profile, draft emails, or answer questions. I can also create new records — just ask!`
        :`Hi! I'm your Vercentic Copilot. I can:\n\n• **Answer questions** about your data\n• **Create records** — people, jobs, talent pools\n• **Draft emails** and summarise profiles\n\nWhat would you like to do?`,
        ts:new Date()}]);
    }
  },[open]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const parseCreateRecord = (text) => {
    const match = text.match(/<CREATE_RECORD>([\s\S]*?)<\/CREATE_RECORD>/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };

  const stripCreateBlock = (text) => text.replace(/<CREATE_RECORD>[\s\S]*?<\/CREATE_RECORD>/g,"").trim();

  const sendMessage = async (text) => {
    const userMsg = text||input.trim();
    if (!userMsg||loading) return;
    setInput("");
    setLoading(true);
    setPendingRecord(null);

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
      ].join("");

      const response = await fetch("/api/ai/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system:systemFull,messages:newMessages.map(m=>({role:m.role,content:m.content}))}),
      });

      const data = await response.json();
      if(data.error) throw new Error(data.error);
      const reply = data.content||"Sorry, I couldn't generate a response.";
      const createData = parseCreateRecord(reply);
      const displayText = stripCreateBlock(reply);

      setMessages(m=>[...m,{role:"assistant",content:displayText||(createData?`I've prepared the ${createData.object_slug} record for your review:`:""),ts:new Date(),hasCreate:!!createData}]);
      if(createData) setPendingRecord(createData);

    } catch(err){
      setMessages(m=>[...m,{role:"assistant",content:"I encountered an error. Please check your API key is set on the server.",ts:new Date(),error:true}]);
    }
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const handleConfirmCreate = async () => {
    if(!pendingRecord||!environment?.id) return;
    setCreating(true);
    const obj = objects.find(o=>o.slug===pendingRecord.object_slug);
    if(!obj){setCreating(false);return;}
    try {
      await api.post("/records",{object_id:obj.id,environment_id:environment.id,data:pendingRecord.data,created_by:"Copilot"});
      setMessages(m=>[...m,{role:"assistant",content:`✅ **${obj.name} created successfully!** You can find it in the ${obj.plural_name} section. Would you like to create another record or is there anything else I can help with?`,ts:new Date()}]);
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
              <div style={{fontSize:14,fontWeight:700,color:"white"}}>Vercentic Copilot</div>
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
                      <button onClick={()=>copyMessage(msg.content,i)}
                        style={{position:"absolute",bottom:-18,right:0,background:"none",border:"none",cursor:"pointer",fontSize:10,color:copied===i?"#0ca678":C.text3,display:"flex",alignItems:"center",gap:3,padding:"2px 4px",fontFamily:F}}>
                        <Ic n={copied===i?"check":"copy"} s={10}/>{copied===i?"Copied":"Copy"}
                      </button>
                    )}
                  </div>
                </div>

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
