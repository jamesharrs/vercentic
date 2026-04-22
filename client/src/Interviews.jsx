import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import api from './apiClient.js';
import CalendarView from "./CalendarView";
const F = "'Plus Jakarta Sans', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8", border2:"#d1d5db",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444",
};






const INTERVIEW_TYPES = [
  { value:"phone_screen",  label:"Phone Screen",        iconName:"phone",      color:"#0CAF77" },
  { value:"video",         label:"Video Interview",     iconName:"video",      color:"#4361EE" },
  { value:"technical",     label:"Technical",           iconName:"code",       color:"#7C3AED" },
  { value:"panel",         label:"Panel Interview",     iconName:"users",      color:"#F79009" },
  { value:"onsite",        label:"On-site",             iconName:"building",   color:"#EF4444" },
  { value:"culture_fit",   label:"Culture Fit",         iconName:"heart",      color:"#0891b2" },
  { value:"assessment",    label:"Assessment",          iconName:"clipboard",  color:"#6366f1" },
  { value:"campus_event",  label:"Campus Event",        iconName:"graduation", color:"#ec4899" },
  { value:"career_fair",   label:"Career Fair",         iconName:"megaphone",  color:"#f59e0b" },
  { value:"offer_meeting", label:"Offer Meeting",       iconName:"check-circle",color:"#10b981" },
];

const DURATIONS = [15,20,30,45,60,90,120];
const FORMATS   = ["Video Call","Phone","In Person","Panel","Async"];
const DAYS      = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS     = Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`);


const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
    calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    check:"M20 6L9 17l-5-5", chevronR:"M9 18l6-6-6-6", chevronL:"M15 18l-6-6 6-6",
    copy:"M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M8 4h8l4 4v8a2 2 0 0 0-2 2h-2M8 4a2 2 0 0 1 2-2h4",
    link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    video:"M23 7l-7 5 7 5V7zM1 5h15v14H1z",
    phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
    code:"M16 18l6-6-6-6M8 6l-6 6 6 6",
    building:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    heart:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    clipboard:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    graduation:"M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
    megaphone:"M3 11l19-9-9 19-2-8-8-2z",
    "check-circle":"M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
    "help-circle":"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
    list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    bot:"M12 8V4H8M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 0-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM12 12h.01M8 12h.01M16 12h.01",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};

const Btn = ({children,onClick,v="primary",sz="md",disabled,icon,style={}}) => {
  const base = { display:"flex",alignItems:"center",gap:6,borderRadius:9,fontFamily:F,fontWeight:700,cursor:disabled?"not-allowed":"pointer",transition:"all .12s",border:"none",opacity:disabled?0.5:1 };
  const sizes = { sm:{padding:"5px 10px",fontSize:11}, md:{padding:"8px 16px",fontSize:13}, lg:{padding:"11px 22px",fontSize:14} };
  const vars = {
    primary:{background:C.accent,color:"#fff",boxShadow:`0 2px 8px ${C.accent}30`},
    secondary:{background:C.surface,color:C.text2,border:`1px solid ${C.border}`},
    ghost:{background:"transparent",color:C.text2,border:`1px solid ${C.border}`},
    danger:{background:C.red,color:"#fff"},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{...base,...sizes[sz],...vars[v],...style}}>
      {icon && <Ic n={icon} s={sz==="sm"?12:14} c={v==="primary"||v==="danger"?"#fff":C.text2}/>}
      {children}
    </button>
  );
};


// ── Interview Type Card (Calendly-style) ─────────────────────────────────────
const TypeCard = ({ type, onEdit, onDelete, onSchedule }) => {
  const meta = INTERVIEW_TYPES.find(t=>t.value===type.interview_format) || INTERVIEW_TYPES[1];
  const [copied, setCopied] = useState(false);
  const bookingLink = `${window.location.origin}/book/${type.id}`;
  const copyLink = () => { navigator.clipboard.writeText(bookingLink); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const interviewers = Array.isArray(type.interviewers) ? type.interviewers : [];

  return (
    <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,overflow:"hidden",transition:"box-shadow .15s",boxShadow:"0 2px 8px rgba(67,97,238,0.06)"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 20px ${meta.color}18`}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(67,97,238,0.06)"}>
      {/* Colour bar */}
      <div style={{height:4,background:meta.color}}/>
      <div style={{padding:"18px 20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:12,background:`${meta.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n={meta.iconName} s={20} c={meta.color}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.text1}}>{type.name}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:1}}>{meta.label}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={onEdit} style={{background:"none",border:"none",cursor:"pointer",padding:5,borderRadius:7,color:C.text3}} title="Edit"
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <Ic n="edit" s={14}/>
            </button>
            <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",padding:5,borderRadius:7,color:C.text3}} title="Delete"
              onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.color=C.red;}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.text3;}}>
              <Ic n="trash" s={14}/>
            </button>
          </div>
        </div>

        <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.text2}}>
            <Ic n="clock" s={12} c={C.text3}/> {type.duration} min
          </span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.text2}}>
            {type.format==="Video Call"?<Ic n="video" s={12} c={C.text3}/>:type.format==="Phone"?<Ic n="phone" s={12} c={C.text3}/>:<Ic n="users" s={12} c={C.text3}/>}
            {type.format||"Video Call"}
          </span>
          {type.buffer_before > 0 && (
            <span style={{fontSize:12,color:C.text3}}>{type.buffer_before}min buffer</span>
          )}
        </div>

        {type.description && <div style={{fontSize:12,color:C.text3,marginBottom:12,lineHeight:1.5}}>{type.description}</div>}

        {interviewers.length > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
            {interviewers.slice(0,3).map((iv,i) => {
              const name = typeof iv==="object" ? iv.name : iv;
              const init = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
              return <span key={i} style={{width:26,height:26,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:i>0?-6:0,border:"2px solid #fff",zIndex:3-i}} title={name}>{init}</span>;
            })}
            {interviewers.length > 3 && <span style={{fontSize:11,color:C.text3,marginLeft:6}}>+{interviewers.length-3} more</span>}
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <Btn v="primary" sz="sm" icon="calendar" onClick={onSchedule} style={{flex:1,justifyContent:"center"}}>Schedule</Btn>
          <button onClick={copyLink} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,color:copied?C.green:C.text2,borderColor:copied?C.green:C.border,transition:"all .2s"}}>
            <Ic n={copied?"check":"link"} s={11} c={copied?C.green:C.text2}/> {copied?"Copied!":"Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── Availability Grid ─────────────────────────────────────────────────────────
const AvailabilityGrid = ({ value, onChange }) => {
  const grid = value || {};
  const toggle = (day, hour) => {
    const key = `${day}_${hour}`;
    onChange({ ...grid, [key]: !grid[key] });
  };
  const toggleDay = (day) => {
    const daySlots = HOURS.reduce((a,h)=>({...a,[`${day}_${h}`]:true}),{});
    const allOn = HOURS.every(h=>grid[`${day}_${h}`]);
    if (allOn) { const n={...grid}; HOURS.forEach(h=>delete n[`${day}_${h}`]); onChange(n); }
    else onChange({...grid,...daySlots});
  };
  const businessHours = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
  const setBusinessHours = () => {
    const n = {};
    DAYS.slice(0,5).forEach(d => businessHours.forEach(h => { n[`${d}_${h}`]=true; }));
    onChange(n);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text2}}>Available slots</div>
        <button onClick={setBusinessHours} style={{fontSize:11,color:C.accent,background:"none",border:`1px solid ${C.accent}30`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:F,fontWeight:600}}>
          Set business hours
        </button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",fontSize:10,fontFamily:F}}>
          <thead>
            <tr>
              <th style={{width:36,padding:"4px 2px"}}/>
              {DAYS.map(d => (
                <th key={d} style={{padding:"4px 2px",textAlign:"center",cursor:"pointer",color:C.text2,fontWeight:700}} onClick={()=>toggleDay(d)}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(h => (
              <tr key={h}>
                <td style={{padding:"1px 4px 1px 0",color:C.text3,textAlign:"right",fontSize:9,whiteSpace:"nowrap"}}>{h}</td>
                {DAYS.map(d => {
                  const on = !!grid[`${d}_${h}`];
                  return (
                    <td key={d} style={{padding:1}}>
                      <div onClick={()=>toggle(d,h)} style={{width:28,height:14,borderRadius:3,background:on?C.accent:`${C.border}`,cursor:"pointer",transition:"background .1s",border:`1px solid ${on?C.accent:C.border}`}}/>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:6,fontSize:11,color:C.text3}}>
        {Object.values(grid).filter(Boolean).length} slots selected
      </div>
    </div>
  );
};


// ── People picker (lightweight, uses /api/records) ────────────────────────────
const SimplePeoplePicker = ({ value, onChange, envId, multi=true, placeholder="Search people…" }) => {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = Array.isArray(value) ? value : (value?[value]:[]);

  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!open || !envId) return;
    api.get(`/objects?environment_id=${envId}`).then(objs => {
      const ppl = (Array.isArray(objs) ? objs : []).find(o => o.slug === "people");
      if (!ppl) return;
      api.get(`/records?object_id=${ppl.id}&environment_id=${envId}&limit=200`).then(res => {
        const recs = Array.isArray(res) ? res : (res.records||[]);
        setOpts(recs.map(r => ({ id:r.id, name:`${r.data?.first_name||""} ${r.data?.last_name||""}`.trim()||r.id })));
      });
    }).catch(()=>{});
  }, [open, envId]);

  const filtered = opts.filter(o=>o.name.toLowerCase().includes(q.toLowerCase()));
  const isSel = id => selected.some(s=>(typeof s==="object"?s.id:s)===id);
  const toggle = opt => {
    if (multi) { onChange(isSel(opt.id)?selected.filter(s=>(typeof s==="object"?s.id:s)!==opt.id):[...selected,{id:opt.id,name:opt.name}]); }
    else { onChange(isSel(opt.id)?[]:[{id:opt.id,name:opt.name}]); setOpen(false); }
  };
  const remove = id => onChange(selected.filter(s=>(typeof s==="object"?s.id:s)!==id));
  const init = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",flexWrap:"wrap",gap:4,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${open?C.accent:C.border}`,background:C.surface,cursor:"pointer",minHeight:38,alignItems:"center"}}>
        {selected.map((s,i) => {
          const name = typeof s==="object"?s.name:s;
          const id   = typeof s==="object"?s.id:s;
          return (
            <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px 2px 4px",borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,fontSize:12,fontWeight:600,color:C.accent}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{init(name||"?")}</span>
              {name}
              <button onClick={e=>{e.stopPropagation();remove(id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,padding:0,fontSize:14,lineHeight:1,opacity:0.6}}>×</button>
            </span>
          );
        })}
        {selected.length===0&&<span style={{color:C.text3,fontSize:13}}>{placeholder}</span>}
      </div>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:500,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 6px 20px rgba(0,0,0,.12)",maxHeight:200,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"6px 10px",borderBottom:`1px solid ${C.border}`}}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{width:"100%",border:"none",outline:"none",fontSize:13,fontFamily:F,background:"transparent"}}/>
          </div>
          <div style={{overflowY:"auto"}}>
            {filtered.length===0&&<div style={{padding:"12px",fontSize:12,color:C.text3,textAlign:"center"}}>{opts.length===0?"Loading…":"No matches"}</div>}
            {filtered.map(opt=>(
              <div key={opt.id} onClick={()=>toggle(opt)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isSel(opt.id)?`${C.accent}08`:"transparent"}}
                onMouseEnter={e=>e.currentTarget.style.background=isSel(opt.id)?`${C.accent}12`:"#f8f9fc"}
                onMouseLeave={e=>e.currentTarget.style.background=isSel(opt.id)?`${C.accent}08`:"transparent"}>
                <span style={{width:24,height:24,borderRadius:"50%",background:isSel(opt.id)?C.accent:`${C.accent}20`,color:isSel(opt.id)?"#fff":C.accent,fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{init(opt.name)}</span>
                <span style={{fontSize:13,fontWeight:isSel(opt.id)?700:500,color:isSel(opt.id)?C.accent:C.text1}}>{opt.name}</span>
                {isSel(opt.id)&&<span style={{marginLeft:"auto",color:C.accent}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ── Video platform options ─────────────────────────────────────────────────────
const VIDEO_PLATFORMS = [
  { value:"zoom",       label:"Zoom",              icon:"video" },
  { value:"teams",      label:"Microsoft Teams",   icon:"users" },
  { value:"meet",       label:"Google Meet",       icon:"video" },
  { value:"webex",      label:"Webex",             icon:"phone" },
  { value:"custom",     label:"Custom Link",       icon:"link" },
  { value:"in_person",  label:"In Person",         icon:"building" },
];

// ── AI Agent selector (interview-capable agents only) ─────────────────────────
const AIAgentSelector = ({ value, onChange, envId }) => {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    if (!envId) return;
    api.get(`/agents?environment_id=${envId}`)
      .then(d => setAgents((Array.isArray(d)?d:[]).filter(a =>
        (a.actions||[]).some(ac => ac.type === "ai_interview" || ac.action_type === "ai_interview") ||
        a.agent_type === "ai_interview" || a.type === "interview" || a.can_interview
      )))
      .catch(()=>{});
  }, [envId]);
  return (
    <div>
      {agents.length === 0 ? (
        <div style={{padding:"12px 16px",borderRadius:10,border:`1.5px dashed ${C.border}`,background:"#fafafa",fontSize:12,color:C.text3,textAlign:"center"}}>
          No AI interview agents configured yet.
          <br/><a href="/agents" style={{color:C.accent,fontWeight:600}} target="_blank" rel="noreferrer">Create an AI Interview Agent →</a>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {agents.map(a => (
            <label key={a.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,
              border:`1.5px solid ${value===a.id?C.accent:C.border}`,background:value===a.id?"#EEF2FF":"white",cursor:"pointer"}}>
              <input type="radio" name="ai_agent" checked={value===a.id} onChange={()=>onChange(a.id)}
                style={{marginTop:2,accentColor:C.accent}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{a.name}</div>
                {a.description && <div style={{fontSize:11,color:C.text3,marginTop:2}}>{a.description}</div>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Question builder for the type modal ───────────────────────────────────────
const QuestionBuilder = ({ value, onChange, envId, jobPeopleFields }) => {
  const questions = Array.isArray(value) ? value : [];
  const [newQ, setNewQ] = useState("");
  const [newType, setNewType] = useState("open");
  const QTYPES = [
    { v:"open",       l:"Open-ended" },
    { v:"rating",     l:"Rating (1–5)" },
    { v:"yes_no",     l:"Yes / No" },
    { v:"competency", l:"Competency" },
  ];
  const add = () => {
    if (!newQ.trim()) return;
    onChange([...questions,{id:Date.now().toString(),text:newQ.trim(),type:newType}]);
    setNewQ(""); setNewType("open");
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {questions.map((q,i) => (
        <div key={q.id||i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fafbff"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:C.text1,lineHeight:1.4}}>{q.text}</div>
            <div style={{fontSize:10,color:C.text3,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>
              {QTYPES.find(t=>t.v===q.type)?.l||q.type}
            </div>
          </div>
          <button onClick={()=>onChange(questions.filter((_,j)=>j!==i))}
            style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2,flexShrink:0}}>
            <Ic n="x" s={14} c={C.red}/>
          </button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <textarea value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder="Type a question…" rows={2}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();add();}}}
            style={{width:"100%",padding:"8px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <select value={newType} onChange={e=>setNewType(e.target.value)}
            style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,background:"white"}}>
            {QTYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <button onClick={add} disabled={!newQ.trim()}
            style={{padding:"7px 12px",borderRadius:8,background:C.accent,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:newQ.trim()?1:0.4}}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Interviewer "from job" variable picker ────────────────────────────────────
const JobInterviewerVars = ({ value, onChange, envId }) => {
  const [jobFields, setJobFields] = useState([]);
  useEffect(() => {
    if (!envId) return;
    // Load Job object fields of type "people" — these can be used as interviewer variables
    api.get(`/objects?environment_id=${envId}`)
      .then(objs => {
        const job = (Array.isArray(objs)?objs:[]).find(o => (o.slug||o.name||"").toLowerCase().includes("job"));
        if (!job) return;
        return api.get(`/fields?object_id=${job.id}`);
      })
      .then(fields => {
        if (!fields) return;
        setJobFields((Array.isArray(fields)?fields:[]).filter(f => f.field_type === "people"));
      })
      .catch(()=>{});
  }, [envId]);

  const varList = Array.isArray(value) ? value : [];
  const toggle = (field) => {
    const varKey = `{{job.${field.api_key}}}`;
    const exists = varList.some(v => v.var_key === varKey);
    if (exists) onChange(varList.filter(v => v.var_key !== varKey));
    else onChange([...varList, { var_key: varKey, label: field.name, field_id: field.id }]);
  };

  if (jobFields.length === 0) return (
    <div style={{padding:"10px 14px",borderRadius:10,border:`1px dashed ${C.border}`,fontSize:12,color:C.text3,textAlign:"center"}}>
      No People-type fields found on Job records.<br/>
      <span style={{fontSize:11}}>Add a People field to Jobs in Settings → Data Model to use them here.</span>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:11,color:C.text3,marginBottom:4}}>
        These fields are sourced from the linked Job record when scheduling. They'll be resolved to real people at runtime.
      </div>
      {jobFields.map(f => {
        const varKey = `{{job.${f.api_key}}}`;
        const checked = varList.some(v => v.var_key === varKey);
        return (
          <label key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:10,
            border:`1.5px solid ${checked?C.accent:C.border}`,background:checked?"#EEF2FF":"white",cursor:"pointer"}}>
            <input type="checkbox" checked={checked} onChange={()=>toggle(f)} style={{accentColor:C.accent}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{f.name}</div>
              <div style={{fontSize:11,color:C.text3,marginTop:1,fontFamily:"monospace"}}>{varKey}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
};

// ── Type Form Modal ───────────────────────────────────────────────────────────
const TypeFormModal = ({ type, envId, onSave, onClose }) => {
  const isEdit = !!type?.id;
  const [form, setForm] = useState({
    name:                   type?.name||"",
    interview_format:       type?.interview_format||"video",
    duration:               type?.duration||30,
    format:                 type?.format||"Video Call",
    description:            type?.description||"",
    location:               type?.location||"",
    buffer_before:          type?.buffer_before||0,
    buffer_after:           type?.buffer_after||0,
    max_bookings_per_day:   type?.max_bookings_per_day||0,
    color:                  type?.color||"#4361EE",
    video_platform:         type?.video_platform||"meet",
    interviewers:           type?.interviewers||[],
    interviewer_vars:       type?.interviewer_vars||[],  // from-job variables
    interviewer_assignment: type?.interviewer_assignment||"fixed", // "fixed"|"round_robin"
    availability:           type?.availability||{},
    // AI Agent
    use_ai_agent:           type?.use_ai_agent||false,
    ai_agent_id:            type?.ai_agent_id||"",
    question_source:        type?.question_source||"manual", // "manual"|"job"|"both"
    questions:              type?.questions||[],
    // Automation
    collect_availability:   type?.collect_availability||false,
    availability_trigger:   type?.availability_trigger||"stage_changed",
    auto_send_invite:       type?.auto_send_invite||true,
    send_confirmation_email:type?.send_confirmation_email||true,
    reminder_24h:           type?.reminder_24h||true,
    reminder_1h:            type?.reminder_1h||false,
    require_candidate_prep: type?.require_candidate_prep||false,
    candidate_prep_text:    type?.candidate_prep_text||"",
    scorecard_form_id:      type?.scorecard_form_id||"",
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const [forms, setForms] = useState([]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    api.get(`/forms?environment_id=${envId}`).then(d => setForms(Array.isArray(d)?d:[])).catch(()=>{});
  }, [envId]);

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form, type?.id);
    setSaving(false);
  };

  const inpSt = { width:"100%", padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", boxSizing:"border-box", color:C.text1, background:"white" };
  const labelSt = { fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 };
  const TAB_ST = (active) => ({ padding:"7px 13px", borderRadius:8, border:"none", background:active?"#fff":"transparent", color:active?C.accent:C.text3, fontWeight:active?700:600, cursor:"pointer", fontFamily:F, fontSize:12, boxShadow:active?"0 1px 4px rgba(0,0,0,.08)":undefined, whiteSpace:"nowrap" });
  const Toggle = ({ val, onToggle, label, sub }) => (
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{label}</div>
        {sub && <div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
      </div>
      <button onClick={onToggle} style={{flexShrink:0,width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",
        background:val?C.accent:"#cbd5e1",transition:"background .15s",position:"relative",padding:0}}>
        <div style={{width:16,height:16,borderRadius:8,background:"white",position:"absolute",top:3,
          left:val?20:4,transition:"left .15s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
      </button>
    </div>
  );

  const TABS = [
    ["details","Details"],
    ["ai_agent","AI Agent"],
    ["interviewers","Interviewers"],
    ["questions","Questions"],
    ["automation","Automation"],
  ];

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:660,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"20px 24px 0",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:800,color:C.text1}}>{isEdit?"Edit":"New"} Interview Type</div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1}}>×</button>
          </div>
          <div style={{display:"flex",gap:2,background:"#f1f5f9",borderRadius:10,padding:3,overflowX:"auto"}}>
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={TAB_ST(tab===id)}>
                {id==="ai_agent"&&form.use_ai_agent ? <span style={{color:C.purple,display:"inline-flex",alignItems:"center",marginRight:3}}><Ic n="zap" s={11} c={C.purple}/></span>:null}
                {label}
                {id==="questions"&&form.questions.length>0 ? <span style={{marginLeft:4,background:C.accent,color:"white",borderRadius:10,fontSize:9,padding:"1px 5px"}}>{form.questions.length}</span>:null}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

          {/* ── DETAILS TAB ── */}
          {tab==="details" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelSt}>Name *</label>
                <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. 30 Minute Intro Call" style={inpSt} autoFocus/>
              </div>
              <div>
                <label style={labelSt}>Interview Type</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                  {INTERVIEW_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>set("interview_format",t.value)}
                      style={{padding:"8px 4px",borderRadius:10,border:`2px solid ${form.interview_format===t.value?t.color:C.border}`,background:form.interview_format===t.value?`${t.color}12`:"transparent",cursor:"pointer",textAlign:"center",fontFamily:F,transition:"all .12s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{width:28,height:28,borderRadius:8,background:form.interview_format===t.value?`${t.color}20`:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ic n={t.iconName} s={14} c={form.interview_format===t.value?t.color:"#94a3b8"}/>
                      </div>
                      <div style={{fontSize:9,fontWeight:700,color:form.interview_format===t.value?t.color:C.text3,lineHeight:1.2}}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={labelSt}>Duration</label>
                  <select value={form.duration} onChange={e=>set("duration",Number(e.target.value))} style={inpSt}>
                    {DURATIONS.map(d=><option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Video / Meeting Platform</label>
                  <select value={form.video_platform} onChange={e=>set("video_platform",e.target.value)} style={inpSt}>
                    {VIDEO_PLATFORMS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelSt}>Description</label>
                <textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What should the candidate expect?" rows={3} style={{...inpSt,resize:"vertical"}}/>
              </div>
              <div>
                <label style={labelSt}>Location / Video Link</label>
                <input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Google Meet link, office address, etc." style={inpSt}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div>
                  <label style={labelSt}>Buffer Before (min)</label>
                  <input type="number" value={form.buffer_before} onChange={e=>set("buffer_before",Number(e.target.value))} min={0} max={60} style={inpSt}/>
                </div>
                <div>
                  <label style={labelSt}>Buffer After (min)</label>
                  <input type="number" value={form.buffer_after} onChange={e=>set("buffer_after",Number(e.target.value))} min={0} max={60} style={inpSt}/>
                </div>
                <div>
                  <label style={labelSt}>Max/day (0=unlimited)</label>
                  <input type="number" value={form.max_bookings_per_day} onChange={e=>set("max_bookings_per_day",Number(e.target.value))} min={0} style={inpSt}/>
                </div>
              </div>
              {/* Scorecard form */}
              <div>
                <label style={labelSt}>Scorecard Form</label>
                <select value={form.scorecard_form_id} onChange={e=>set("scorecard_form_id",e.target.value)} style={inpSt}>
                  <option value="">None — no scorecard</option>
                  {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <div style={{fontSize:11,color:C.text3,marginTop:4}}>The selected form will be sent to interviewers to complete after the interview.</div>
              </div>
            </div>
          )}

          {/* ── AI AGENT TAB ── */}
          {tab==="ai_agent" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <Toggle
                val={form.use_ai_agent}
                onToggle={()=>set("use_ai_agent",!form.use_ai_agent)}
                label="Use AI Interview Agent"
                sub="Replace or supplement human interviewers with an AI agent that conducts the interview autonomously."
              />
              {form.use_ai_agent && (
                <>
                  <div>
                    <label style={labelSt}>Select AI Agent</label>
                    <div style={{fontSize:11,color:C.text3,marginBottom:8}}>Only agents with AI Interview capability are shown below.</div>
                    <AIAgentSelector value={form.ai_agent_id} onChange={v=>set("ai_agent_id",v)} envId={envId}/>
                  </div>
                  <div>
                    <label style={labelSt}>Question Source</label>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[
                        ["job","Pull questions from the linked Job record's scorecard/criteria"],
                        ["manual","Use the questions defined in the Questions tab"],
                        ["both","Use job questions first, then add manual questions"],
                      ].map(([v,desc])=>(
                        <label key={v} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,
                          border:`1.5px solid ${form.question_source===v?C.accent:C.border}`,background:form.question_source===v?"#EEF2FF":"white",cursor:"pointer"}}>
                          <input type="radio" name="qsource" checked={form.question_source===v} onChange={()=>set("question_source",v)} style={{marginTop:2,accentColor:C.accent}}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:C.text1,textTransform:"capitalize"}}>{v==="both"?"Job + Manual":v.charAt(0).toUpperCase()+v.slice(1)}</div>
                            <div style={{fontSize:11,color:C.text3,marginTop:2}}>{desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {(form.question_source==="manual"||form.question_source==="both") && (
                    <div>
                      <label style={labelSt}>Manual Questions</label>
                      <div style={{fontSize:11,color:C.text3,marginBottom:8}}>These questions are passed to the AI agent. Add them in the Questions tab too for human review.</div>
                      <button onClick={()=>setTab("questions")} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.accent}`,background:"#EEF2FF",color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                        <Ic n="list" s={12} c={C.accent}/> Edit Questions ({form.questions.length})
                      </button>
                    </div>
                  )}
                </>
              )}
              {!form.use_ai_agent && (
                <div style={{padding:"20px",textAlign:"center",borderRadius:14,border:`1.5px dashed ${C.border}`,background:"#fafbff"}}>
                  <div style={{fontSize:32,marginBottom:8,display:"flex",justifyContent:"center"}}><Ic n="bot" s={36} c="#9ca3af"/></div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text2,marginBottom:4}}>Enable AI Agent mode</div>
                  <div style={{fontSize:12,color:C.text3}}>Toggle on above to let an AI agent conduct this interview autonomously using your configured questions and criteria.</div>
                </div>
              )}
            </div>
          )}

          {/* ── INTERVIEWERS TAB ── */}
          {tab==="interviewers" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Assignment mode */}
              <div>
                <label style={labelSt}>Assignment Mode</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    ["fixed","Fixed Panel","The selected interviewers always conduct this interview.","users"],
                    ["round_robin","Round-Robin","Each interview is assigned to the next available interviewer in rotation.","refresh"],
                  ].map(([v,label,desc,icon])=>(
                    <button key={v} onClick={()=>set("interviewer_assignment",v)}
                      style={{padding:"12px 14px",borderRadius:12,border:`2px solid ${form.interviewer_assignment===v?C.accent:C.border}`,
                        background:form.interviewer_assignment===v?"#EEF2FF":"white",cursor:"pointer",textAlign:"left",fontFamily:F,transition:"all .12s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <Ic n={icon} s={13} c={form.interviewer_assignment===v?C.accent:C.text3}/>
                        <div style={{fontSize:12,fontWeight:700,color:form.interviewer_assignment===v?C.accent:C.text1}}>{label}</div>
                      </div>
                      <div style={{fontSize:11,color:C.text3,lineHeight:1.3}}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* From Job section */}
              <div>
                <label style={{...labelSt,display:"flex",alignItems:"center",gap:6}}>
                  From Job Record
                  <span style={{background:"#EEF2FF",color:C.accent,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,textTransform:"none",letterSpacing:0}}>Variables</span>
                </label>
                <div style={{fontSize:12,color:C.text3,marginBottom:10}}>Select People-type fields from the Job record to use as interviewers dynamically. These resolve to real people when an interview is scheduled against a specific job.</div>
                <JobInterviewerVars value={form.interviewer_vars} onChange={v=>set("interviewer_vars",v)} envId={envId}/>
              </div>

              {/* Manual interviewers */}
              <div>
                <label style={labelSt}>Manual Interviewers</label>
                <div style={{fontSize:12,color:C.text3,marginBottom:10}}>Add specific people who always conduct this interview type, regardless of the job.</div>
                <SimplePeoplePicker value={form.interviewers} onChange={v=>set("interviewers",v)} envId={envId} placeholder="Search and add interviewers…"/>
              </div>

              {/* Summary */}
              {(form.interviewer_vars.length > 0 || form.interviewers.length > 0) && (
                <div style={{padding:"10px 14px",borderRadius:10,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:6}}>INTERVIEW PANEL SUMMARY</div>
                  {form.interviewer_vars.map(v=>(
                    <div key={v.var_key} style={{fontSize:12,color:C.text2,display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:9,background:"#dcfce7",color:C.green,fontWeight:700,padding:"1px 5px",borderRadius:4}}>VAR</span>
                      {v.label} <span style={{color:C.text3,fontFamily:"monospace",fontSize:10}}>{v.var_key}</span>
                    </div>
                  ))}
                  {form.interviewers.map((iv,i)=>(
                    <div key={i} style={{fontSize:12,color:C.text2,display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:9,background:"#dbeafe",color:C.accent,fontWeight:700,padding:"1px 5px",borderRadius:4}}>FIXED</span>
                      {typeof iv==="object"?(iv.name||iv.label||iv.id):iv}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QUESTIONS TAB ── */}
          {tab==="questions" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{padding:"12px 16px",borderRadius:10,background:"#EEF2FF",border:`1px solid ${C.accent}20`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:4}}>Structured Interview Questions</div>
                <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>
                  These questions appear on the interviewer's scorecard and can be sent to an AI agent. They ensure consistency across all interviews of this type.
                </div>
              </div>
              <QuestionBuilder value={form.questions} onChange={v=>set("questions",v)} envId={envId}/>
              {form.questions.length > 0 && (
                <div style={{fontSize:12,color:C.text3,textAlign:"center"}}>
                  {form.questions.length} question{form.questions.length!==1?"s":""} defined · {form.questions.filter(q=>q.type==="rating").length} rated · {form.questions.filter(q=>q.type==="competency").length} competency
                </div>
              )}
            </div>
          )}

          {/* ── AUTOMATION TAB ── */}
          {tab==="automation" && (
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Availability Collection</div>
              <Toggle
                val={form.collect_availability}
                onToggle={()=>set("collect_availability",!form.collect_availability)}
                label="Collect Availability Automatically"
                sub="When triggered, send availability collection links to the candidate and interviewers, then auto-schedule when a mutual slot is found."
              />
              {form.collect_availability && (
                <div style={{margin:"8px 0 12px",padding:"12px 14px",borderRadius:10,background:"#f8faff",border:`1px solid ${C.border}`}}>
                  <label style={labelSt}>Trigger</label>
                  <select value={form.availability_trigger} onChange={e=>set("availability_trigger",e.target.value)}
                    style={{width:"100%",padding:"8px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:"white"}}>
                    <option value="stage_changed">When candidate reaches a pipeline stage</option>
                    <option value="manual">Manual (recruiter triggers it)</option>
                    <option value="form_submitted">After a form is submitted</option>
                    <option value="record_created">When candidate record is created</option>
                  </select>
                  <div style={{fontSize:11,color:C.text3,marginTop:8}}>
                    Uses the Interview Coordinator agent to send a scheduling link to the candidate and resolve availability with interviewers automatically.
                  </div>
                </div>
              )}

              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:12,marginBottom:8}}>Notifications</div>
              <Toggle val={form.auto_send_invite} onToggle={()=>set("auto_send_invite",!form.auto_send_invite)}
                label="Auto-send Calendar Invite" sub="Automatically send a calendar invite to all participants when an interview is scheduled."/>
              <Toggle val={form.send_confirmation_email} onToggle={()=>set("send_confirmation_email",!form.send_confirmation_email)}
                label="Send Confirmation Email" sub="Email the candidate and interviewers a confirmation when the interview is booked."/>
              <Toggle val={form.reminder_24h} onToggle={()=>set("reminder_24h",!form.reminder_24h)}
                label="24-hour Reminder" sub="Send a reminder email 24 hours before the interview to all participants."/>
              <Toggle val={form.reminder_1h} onToggle={()=>set("reminder_1h",!form.reminder_1h)}
                label="1-hour Reminder" sub="Send a final reminder 1 hour before the interview starts."/>

              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:12,marginBottom:8}}>Candidate Preparation</div>
              <Toggle val={form.require_candidate_prep} onToggle={()=>set("require_candidate_prep",!form.require_candidate_prep)}
                label="Include Preparation Instructions" sub="Send candidate-specific prep notes with the confirmation email."/>
              {form.require_candidate_prep && (
                <div style={{margin:"8px 0",padding:"12px 14px",borderRadius:10,background:"#f8faff",border:`1px solid ${C.border}`}}>
                  <label style={labelSt}>Preparation Instructions</label>
                  <textarea value={form.candidate_prep_text} onChange={e=>set("candidate_prep_text",e.target.value)}
                    placeholder="e.g. Please prepare a 5-minute walk-through of a recent project. Have your portfolio ready…"
                    rows={4} style={{width:"100%",padding:"8px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,resize:"vertical",boxSizing:"border-box",color:C.text1,background:"white"}}/>
                </div>
              )}

              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:12,marginBottom:8}}>Availability Window</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:10}}>Define the default slots available for this interview type when auto-scheduling.</div>
              <AvailabilityGrid value={form.availability} onChange={v=>set("availability",v)}/>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:11,color:C.text3}}>
            {form.use_ai_agent && <span style={{color:C.purple,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Ic n="zap" s={13} c={C.purple}/>AI Agent active</span>}
            {form.collect_availability && <span style={{color:C.green,fontWeight:600,marginLeft:form.use_ai_agent?8:0,display:"flex",alignItems:"center",gap:4}}><Ic n="zap" s={13} c={C.green}/>Auto-scheduling on</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" onClick={handle} disabled={saving||!form.name.trim()}>{saving?"Saving…":isEdit?"Save changes":"Create interview type"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};


// ── Schedule Interview Modal ──────────────────────────────────────────────────
export const ScheduleModal = ({ interviewType, envId, onSave, onClose, initialValues, linkedJobIds }) => {
  const isEdit = !!initialValues?.id;
  const bulkCandidates = interviewType?._bulkCandidates || null;
  const [form, setForm] = useState({
    candidate_id: initialValues?.candidate_id || (bulkCandidates?.length === 1 ? bulkCandidates[0].id : null),
    candidate_name: initialValues?.candidate_name || (bulkCandidates?.length === 1 ? bulkCandidates[0].name : ""),
    job_id: initialValues?.job_id || null,
    job_name: initialValues?.job_name || "",
    date: initialValues?.date || "",
    time: initialValues?.time || "",
    notes: initialValues?.notes || "",
    interviewers: initialValues?.interviewers || interviewType?.interviewers || [],
    // AI agent fields
    interviewer_mode: initialValues?.interviewer_mode || "employee",
    ai_agent_id:      initialValues?.ai_agent_id || "",
    ai_agent_name:    initialValues?.ai_agent_name || "",
    ai_trigger:       initialValues?.ai_trigger || "now",
    ai_trigger_at:    initialValues?.ai_trigger_at || "",
  });
  const [bulkIdx, setBulkIdx] = useState(0); // which bulk candidate we're scheduling
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [candidateLinkedJobIds, setCandidateLinkedJobIds] = useState(null); // null = no filter, [] = no links
  const [jobDropOpen, setJobDropOpen] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const jobTriggerRef = useRef(null);
  const [jobInterviewers, setJobInterviewers] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!envId) return;
    api.get(`/objects?environment_id=${envId}`).then(objs => {
      const arr = Array.isArray(objs) ? objs : [];
      const peopleObj = arr.find(o=>o.slug==="people");
      const jobsObj   = arr.find(o=>o.slug==="jobs");
      const reqs = [];
      if (peopleObj) reqs.push(api.get(`/records?object_id=${peopleObj.id}&environment_id=${envId}&limit=200`));
      else reqs.push(Promise.resolve([]));
      if (jobsObj) reqs.push(api.get(`/records?object_id=${jobsObj.id}&environment_id=${envId}&limit=200`));
      else reqs.push(Promise.resolve([]));
      Promise.all(reqs).then(([p,j]) => {
        const pr = Array.isArray(p)?p:(p.records||[]);
        const jr = Array.isArray(j)?j:(j.records||[]);
        setCandidates(pr.map(r=>({id:r.id,name:`${r.data?.first_name||""} ${r.data?.last_name||""}`.trim()||r.id})));
        setJobs(jr.map(r=>({id:r.id,name:r.data?.job_title||r.data?.name||r.id, interviewers:r.data?.interviewers||[]})));
      });
    });
    // Load AI-interview-capable agents
    api.get(`/agents?environment_id=${envId}`).then(d => {
      const list = Array.isArray(d) ? d : (d.agents || []);
      const filtered = list.filter(a => !a.deleted_at && (
        (a.steps||[]).some(s => s.type === 'ai_interview') ||
        a.type === 'interview' || a.type === 'ai_interview'
      ));
      setAvailableAgents(filtered);
    }).catch(() => {});
  }, [envId]);

  // When candidate changes, fetch their linked jobs to filter the dropdown
  useEffect(() => {
    if (!form.candidate_id || !envId) { setCandidateLinkedJobIds(null); return; }
    // If linkedJobIds was passed as a prop, use that directly
    if (linkedJobIds?.length) { setCandidateLinkedJobIds(linkedJobIds); return; }
    // Otherwise fetch pipeline links for this person
    api.get(`/records/people-links?person_id=${form.candidate_id}&environment_id=${envId}`)
      .then(d => {
        const links = Array.isArray(d) ? d : (d.links || []);
        const jobIds = [...new Set(links.map(l => l.record_id).filter(Boolean))];
        setCandidateLinkedJobIds(jobIds.length ? jobIds : null); // null = show all if no links found
      })
      .catch(() => setCandidateLinkedJobIds(null));
  }, [form.candidate_id, envId, linkedJobIds]);

  // When job changes, load its interviewers and pre-check them
  useEffect(() => {
    if (!form.job_id) { setJobInterviewers([]); return; }
    const job = jobs.find(j=>j.id===form.job_id);
    if (!job) return;
    const jivs = (job.interviewers||[]).map(iv =>
      typeof iv === "object" ? iv : { id: iv, name: iv }
    );
    setJobInterviewers(jivs);
    // merge into form interviewers (add any not already there)
    setForm(f => {
      const existing = new Set((f.interviewers||[]).map(x=>typeof x==="object"?x.id:x));
      const toAdd = jivs.filter(iv=>!existing.has(iv.id));
      return toAdd.length ? {...f, interviewers:[...f.interviewers,...toAdd]} : f;
    });
  }, [form.job_id, jobs]);

  const handle = async () => {
    setSaving(true);
    const isAi = form.interviewer_mode === "ai_agent";
    await onSave({
      ...form,
      interview_type_id:   interviewType?.id,
      interview_type_name: interviewType?.name,
      duration:            interviewType?.duration,
      format:              interviewType?.format,
      // only send AI fields when in AI mode
      interviewer_mode: isAi ? "ai_agent" : "employee",
      ai_agent_id:      isAi ? form.ai_agent_id : null,
      ai_agent_name:    isAi ? (availableAgents.find(a=>a.id===form.ai_agent_id)?.name || "") : null,
      ai_trigger:       isAi ? form.ai_trigger : null,
      ai_trigger_at:    isAi && form.ai_trigger === "scheduled" ? form.ai_trigger_at : null,
    });
    setSaving(false);
  };

  const inpSt = { width:"100%", padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", boxSizing:"border-box", color:C.text1, background:"white" };
  const labelSt = { fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 };
  const meta = INTERVIEW_TYPES.find(t=>t.value===interviewType?.interview_format)||INTERVIEW_TYPES[1];

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:500,boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{height:4,background:meta.color}}/>
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${meta.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic n={meta.iconName} s={22} c={meta.color}/>
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit ? "Edit Interview" : `Schedule Interview${interviewType?.name ? `: ${interviewType.name}` : ""}`}</div>
              <div style={{fontSize:12,color:C.text3}}>{interviewType?.duration ? `${interviewType.duration} min · ${interviewType.format}` : "Schedule a new interview"}</div>
            </div>
            <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20}}>×</button>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Bulk candidate indicator */}
            {bulkCandidates?.length > 1 && (
              <div style={{ padding:"10px 14px", background:"#eff6ff", borderRadius:8,
                border:"1px solid #bfdbfe", fontSize:12, color:"#1e40af" }}>
                <strong>Scheduling for {bulkCandidates.length} candidates.</strong> Each will get a separate interview.
                <div style={{ marginTop:6, fontWeight:600 }}>
                  Now scheduling: {bulkCandidates[bulkIdx]?.name}
                  {bulkIdx < bulkCandidates.length - 1 && ` (${bulkIdx + 1} of ${bulkCandidates.length})`}
                </div>
              </div>
            )}
            <div>
              <label style={labelSt}>Candidate *</label>
              {bulkCandidates?.length > 1
                ? <div style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                    fontSize:13, fontWeight:600, color:C.text1, background:"#f8fafc" }}>
                    {bulkCandidates[bulkIdx]?.name}
                  </div>
                : <select value={form.candidate_id||""} onChange={e=>{ const c=candidates.find(c=>c.id===e.target.value); set("candidate_id",c?.id||null); set("candidate_name",c?.name||""); }} style={inpSt}>
                    <option value="">Select candidate…</option>
                    {candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              }
            </div>
            <div style={{position:"relative"}}>
              <label style={labelSt}>Job (optional)</label>
              {(() => {
                // Filter jobs: prefer candidate's linked jobs, fall back to prop, then all
                const activeFilter = candidateLinkedJobIds ?? (linkedJobIds?.length ? linkedJobIds : null);
                const visibleJobs  = activeFilter ? jobs.filter(j => activeFilter.includes(j.id)) : jobs;
                const filteredJobs = jobSearch
                  ? visibleJobs.filter(j => j.name.toLowerCase().includes(jobSearch.toLowerCase()))
                  : visibleJobs;
                const selectedJob  = jobs.find(j => j.id === form.job_id);
                return (
                  <div style={{position:"relative"}}>
                    {/* Trigger button */}
                    <button type="button"
                      ref={jobTriggerRef}
                      onClick={() => { setJobDropOpen(v => !v); setJobSearch(""); }}
                      style={{
                        ...inpSt, display:"flex", alignItems:"center", justifyContent:"space-between",
                        cursor:"pointer", textAlign:"left", padding:"8px 12px",
                      }}>
                      <span style={{color: selectedJob ? C.text1 : C.text3, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {selectedJob ? selectedJob.name : "Select job…"}
                      </span>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        style={{flexShrink:0, transform: jobDropOpen ? "rotate(180deg)":"none", transition:"transform .15s"}}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    {/* Dropdown panel */}
                    {jobDropOpen && ReactDOM.createPortal(
                      <div onMouseDown={e=>e.stopPropagation()}>
                        {/* Backdrop */}
                        <div style={{position:"fixed",inset:0,zIndex:3999}} onClick={()=>setJobDropOpen(false)}/>
                        {/* Panel — positioned below trigger button */}
                        <div style={{
                          position:"fixed",
                          zIndex:4000,
                          top: (jobTriggerRef.current?.getBoundingClientRect().bottom ?? 200) + 4,
                          left: jobTriggerRef.current?.getBoundingClientRect().left ?? 100,
                          width: jobTriggerRef.current?.getBoundingClientRect().width ?? 360,
                          background:"white", borderRadius:12,
                          border:`1.5px solid ${C.border}`,
                          boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
                          overflow:"hidden",
                          maxHeight:280, display:"flex", flexDirection:"column",
                        }}>
                          {/* Search */}
                          <div style={{padding:"8px 10px", borderBottom:`1px solid ${C.border}`, flexShrink:0}}>
                            <input autoFocus
                              value={jobSearch} onChange={e=>setJobSearch(e.target.value)}
                              placeholder="Search jobs…"
                              style={{...inpSt, padding:"6px 10px", fontSize:12, border:`1.5px solid ${C.border}`}}/>
                          </div>
                          {/* Options */}
                          <div style={{overflowY:"auto", flex:1}}>
                            {/* Clear option */}
                            <div onClick={()=>{ set("job_id",null); set("job_name",""); setJobDropOpen(false); setJobSearch(""); }}
                              style={{padding:"9px 14px", fontSize:13, color:C.text3, cursor:"pointer", display:"flex",alignItems:"center",gap:8,
                                background: !form.job_id ? C.accentLight:"transparent"}}
                              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                              onMouseLeave={e=>e.currentTarget.style.background=!form.job_id?C.accentLight:"transparent"}>
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2}><path d="M20 6L9 17l-5-5"/></svg>
                              <span>No job selected</span>
                            </div>
                            {filteredJobs.length === 0
                              ? <div style={{padding:"16px 14px",color:C.text3,fontSize:12,textAlign:"center"}}>
                                  {activeFilter ? "No linked jobs found for this candidate" : "No jobs available"}
                                </div>
                              : filteredJobs.map(j => {
                                  const sel = form.job_id === j.id;
                                  return (
                                    <div key={j.id}
                                      onClick={()=>{ set("job_id",j.id); set("job_name",j.name); setJobDropOpen(false); setJobSearch(""); }}
                                      style={{padding:"9px 14px",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                                        background:sel?C.accentLight:"transparent",color:sel?C.accent:C.text1,fontWeight:sel?600:400}}
                                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=C.surface2; }}
                                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background="transparent"; }}>
                                      {sel && <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
                                      <span style={{flex:1}}>{j.name}</span>
                                    </div>
                                  );
                                })
                            }
                          </div>
                          {/* Footer badge when filtered */}
                          {activeFilter && (
                            <div style={{padding:"6px 12px",fontSize:10,color:C.accent,fontWeight:600,borderTop:`1px solid ${C.border}`,background:C.accentLight,flexShrink:0}}>
                              Showing {filteredJobs.length} job{filteredJobs.length!==1?"s":""} linked to this candidate
                            </div>
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                );
              })()}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={labelSt}>Date {form.interviewer_mode!=="ai_agent"&&"*"}</label>
                <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={{...inpSt, opacity: form.interviewer_mode==="ai_agent"?0.4:1}} min={new Date().toISOString().slice(0,10)} disabled={form.interviewer_mode==="ai_agent"}/>
              </div>
              <div>
                <label style={labelSt}>Time {form.interviewer_mode!=="ai_agent"&&"*"}</label>
                <input type="time" value={form.time} onChange={e=>set("time",e.target.value)} style={{...inpSt, opacity: form.interviewer_mode==="ai_agent"?0.4:1}} disabled={form.interviewer_mode==="ai_agent"}/>
              </div>
            </div>
            <div>
              {/* ── Employee / AI Agent toggle ─────────────────────────────── */}
              <label style={labelSt}>Interviewers</label>
              <div style={{display:"flex",gap:0,borderRadius:9,border:`1.5px solid ${C.border}`,overflow:"hidden",marginBottom:12}}>
                {[["employee",<><Ic n="user" s={13} c="currentColor"/>&nbsp;Employee</>],["ai_agent",<><Ic n="zap" s={13} c="currentColor"/>&nbsp;AI Agent</>]].map(([val,lbl])=>(
                  <button key={val} onClick={()=>set("interviewer_mode",val)} style={{
                    flex:1, padding:"8px 0", fontSize:12, fontWeight:600, cursor:"pointer",
                    border:"none", fontFamily:F,
                    background: form.interviewer_mode===val ? (val==="ai_agent"?"#6d28d9":"#4361EE") : "#f8fafc",
                    color: form.interviewer_mode===val ? "white" : C.text2,
                    transition:"all .15s",
                  }}>{lbl}</button>
                ))}
              </div>

              {form.interviewer_mode==="ai_agent" ? (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div>
                    <label style={labelSt}>Select AI Agent</label>
                    {availableAgents.length === 0
                      ? <div style={{padding:"10px 12px",borderRadius:9,border:`1px dashed ${C.border}`,fontSize:12,color:C.text3}}>
                          No AI interview agents configured. Create one in Settings → Agents.
                        </div>
                      : <select value={form.ai_agent_id} onChange={e=>set("ai_agent_id",e.target.value)} style={inpSt}>
                          <option value="">Choose an agent…</option>
                          {availableAgents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    }
                  </div>
                  <div>
                    <label style={labelSt}>Send trigger</label>
                    <div style={{display:"flex",gap:0,borderRadius:9,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                      {[["now","Send Now"],["scheduled","Schedule"]].map(([val,lbl])=>(
                        <button key={val} onClick={()=>set("ai_trigger",val)} style={{
                          flex:1, padding:"7px 0", fontSize:12, fontWeight:600, cursor:"pointer",
                          border:"none", fontFamily:F,
                          background: form.ai_trigger===val ? "#6d28d9" : "#f8fafc",
                          color: form.ai_trigger===val ? "white" : C.text2,
                          transition:"all .15s",
                        }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  {form.ai_trigger==="scheduled" && (
                    <div>
                      <label style={labelSt}>Send at</label>
                      <input type="datetime-local" value={form.ai_trigger_at} onChange={e=>set("ai_trigger_at",e.target.value)} style={inpSt}/>
                    </div>
                  )}
                  <div style={{padding:"8px 12px",borderRadius:8,background:"#f5f3ff",border:"1px solid #ddd6fe",fontSize:12,color:"#6d28d9"}}>
                    <Ic n="zap" s={12} c="#6d28d9"/> The AI agent will conduct this interview autonomously.
                    {form.ai_trigger==="now" ? " Triggered immediately on save." : " Triggered at the scheduled time."}
                  </div>
                </div>
              ) : (
                <div>
                  {jobInterviewers.length > 0 && (
                    <div style={{marginBottom:10,padding:"10px 12px",borderRadius:9,border:`1px solid ${C.border}`,background:"#f8f9fc"}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>From Job</div>
                      {jobInterviewers.map(iv => {
                        const isChecked = (form.interviewers||[]).some(x=>(typeof x==="object"?x.id:x)===iv.id);
                        const toggle = () => setForm(f => ({
                          ...f,
                          interviewers: isChecked
                            ? (f.interviewers||[]).filter(x=>(typeof x==="object"?x.id:x)!==iv.id)
                            : [...(f.interviewers||[]), iv]
                        }));
                        const init = (iv.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
                        return (
                          <div key={iv.id} onClick={toggle} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                            <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isChecked?C.accent:C.border}`,background:isChecked?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .1s"}}>
                              {isChecked && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                            </div>
                            <div style={{width:26,height:26,borderRadius:"50%",background:`${C.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.accent,flexShrink:0}}>{init}</div>
                            <span style={{fontSize:13,color:C.text1,fontWeight:500}}>{iv.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <SimplePeoplePicker value={form.interviewers} onChange={v=>set("interviewers",v)} envId={envId} placeholder="Add more interviewers…"/>
                </div>
              )}
            </div>
            <div>
              <label style={labelSt}>Notes</label>
              <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Any prep notes for the interviewer…" style={{...inpSt,resize:"vertical"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            {bulkCandidates?.length > 1 && bulkIdx < bulkCandidates.length - 1 ? (
              <Btn v="primary" onClick={async () => {
                // Save current and advance to next candidate
                setSaving(true);
                const cur = bulkCandidates[bulkIdx];
                await onSave({ ...form, candidate_id: cur.id, candidate_name: cur.name });
                setSaving(false);
                const next = bulkCandidates[bulkIdx + 1];
                setBulkIdx(i => i + 1);
                set("candidate_id", next.id);
                set("candidate_name", next.name);
              }} disabled={saving||!form.date||!form.time} icon="calendar">
                {saving ? "Saving…" : `Save & next (${bulkIdx + 2} of ${bulkCandidates.length})`}
              </Btn>
            ) : (
              <Btn v="primary" onClick={async () => {
                setSaving(true);
                if (bulkCandidates?.length > 1) {
                  const cur = bulkCandidates[bulkIdx];
                  await onSave({ ...form, candidate_id: cur.id, candidate_name: cur.name });
                } else {
                  await handle();
                }
                setSaving(false);
              }} disabled={saving||(bulkCandidates?.length > 1 ? (!form.date||!form.time) : (!form.candidate_id||!form.date||!form.time))} icon="calendar">
                {saving ? "Saving…" : isEdit ? "Save Changes" : bulkCandidates?.length > 1 ? `Schedule Last (${bulkCandidates.length} of ${bulkCandidates.length})` : "Schedule Interview"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ── Scheduled Interview Row ───────────────────────────────────────────────────
const InterviewRow = ({ interview, onEdit, onDelete, envId }) => {
  const meta = INTERVIEW_TYPES.find(t=>t.value===interview.interview_format)||INTERVIEW_TYPES[1];
  const dt = interview.date ? new Date(`${interview.date}T${interview.time||"09:00"}`) : null;
  const isPast = dt && dt < new Date();
  const statusColor = isPast ? C.text3 : interview.status==="confirmed" ? C.green : C.amber;
  const statusLabel = isPast ? "Completed" : interview.status==="confirmed" ? "Confirmed" : "Pending";
  const [botToken, setBotToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/bot/sessions/by-interview/${interview.id}`)
      .then(s => s?.token && setBotToken(s.token))
      .catch(() => {});
  }, [interview.id]);

  const copyBotLink = () => {
    const url = `${window.location.origin}/bot/${botToken}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:`1px solid ${C.border}`,transition:"background .1s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{width:38,height:38,borderRadius:11,background:`${meta.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={meta.iconName} s={18} c={meta.color}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{interview.candidate_name||"Unknown candidate"}</div>
        <div style={{fontSize:11,color:C.text3,marginTop:1}}>{interview.interview_type_name} · {interview.job_name||"No job"}</div>
      </div>
      <div style={{textAlign:"center",minWidth:80}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{dt?dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"-"}</div>
        <div style={{fontSize:11,color:C.text3}}>{interview.time||"-"}</div>
      </div>
      <div style={{minWidth:60}}>
        <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,background:`${statusColor}14`,color:statusColor}}>{statusLabel}</span>
      </div>
      <div style={{display:"flex",gap:4,flexShrink:0}}>
        {botToken && (
          <button onClick={copyBotLink} title="Copy pre-screen link" style={{background:copied?"#d1fae5":"none",border:`1px solid ${copied?"#6ee7b7":"#e5e7eb"}`,cursor:"pointer",padding:"4px 8px",borderRadius:7,color:copied?"#059669":C.text3,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4,transition:"all .15s"}}>
            <Ic n={copied?"check":"link"} s={11}/>{copied?"Copied!":"Pre-screen"}
          </button>
        )}
        <button onClick={onEdit} style={{background:"none",border:"none",cursor:"pointer",padding:5,borderRadius:7,color:C.text3}}><Ic n="edit" s={13}/></button>
        <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",padding:5,borderRadius:7,color:C.text3}}><Ic n="trash" s={13}/></button>
      </div>
    </div>
  );
};

// ── Main Interviews Module ────────────────────────────────────────────────────
// ── Question Bank View ────────────────────────────────────────────────────────
const TYPE_COLORS = { knockout:"#dc2626", competency:"#2563eb", technical:"#7c3aed", culture:"#059669" };
const TYPE_LABELS = { knockout:"Eligibility / Knockout", competency:"Competency / Behavioural", technical:"Technical", culture:"Culture Fit" };

const AddQuestionModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ text:"", type:"competency", competency:"", weight:10, options:"", pass_value:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div style={{background:"white",borderRadius:16,padding:28,width:520,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:800,color:"var(--t-text1)",marginBottom:20}}>Add Question</div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5}}>Question text</label>
          <textarea value={form.text} onChange={e=>set("text",e.target.value)} rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:13,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} placeholder="Enter the question…"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5}}>Type</label>
            <select value={form.type} onChange={e=>set("type",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none"}}>
              {Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5}}>Weight (pts)</label>
            <input type="number" min={1} max={50} value={form.weight} onChange={e=>set("weight",Number(e.target.value))} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        {form.type==="knockout" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><label style={{fontSize:12,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5}}>Options (comma-separated)</label><input value={form.options} onChange={e=>set("options",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="Yes, No"/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:"#6b7280",display:"block",marginBottom:5}}>Pass value</label><input value={form.pass_value} onChange={e=>set("pass_value",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="Yes"/></div>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #e5e7eb",background:"white",fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave({...form,options:form.options?form.options.split(",").map(s=>s.trim()):null,pass_value:form.pass_value||null})} disabled={!form.text.trim()} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:"#4361ee",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Add Question</button>
        </div>
      </div>
    </div>
  );
};

const QuestionBankView = ({ questions, onDelete, showAdd, onSaveAdd, onCloseAdd }) => {
  const grouped = ["knockout","competency","technical","culture"].reduce((acc,t)=>({...acc,[t]:questions.filter(q=>q.type===t)}),[]);
  return (
    <div>
      {Object.entries(grouped).map(([type, qs]) => (
        <div key={type} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:11,fontWeight:700,color:TYPE_COLORS[type],textTransform:"uppercase",letterSpacing:"0.06em"}}>{TYPE_LABELS[type]}</span>
            <span style={{fontSize:11,color:"#9ca3af"}}>({qs.length})</span>
          </div>
          {qs.length===0 ? <div style={{padding:"12px 16px",borderRadius:10,border:"1px dashed #e5e7eb",fontSize:13,color:"#9ca3af",textAlign:"center"}}>No {TYPE_LABELS[type].toLowerCase()} questions yet</div>
          : qs.map(q=>(
            <div key={q.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderRadius:10,border:"1px solid #e5e7eb",marginBottom:6,background:"white"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:"var(--t-text1)",lineHeight:1.5,marginBottom:4}}>{q.text}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:99,background:`${TYPE_COLORS[type]}14`,color:TYPE_COLORS[type]}}>{TYPE_LABELS[type]}</span>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{q.weight} pts</span>
                  {q.options && <span style={{fontSize:11,color:"#9ca3af"}}>Options: {q.options.join(", ")}</span>}
                  {q.is_custom && <span style={{fontSize:11,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",padding:"2px 6px",borderRadius:99}}>Custom</span>}
                </div>
              </div>
              {q.is_custom && <button onClick={()=>onDelete(q.id)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:"#9ca3af",flexShrink:0,borderRadius:6}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>}
            </div>
          ))}
        </div>
      ))}
      {showAdd && <AddQuestionModal onSave={onSaveAdd} onClose={onCloseAdd}/>}
    </div>
  );
};

export default function Interviews({ environment }) {
  const envId = environment?.id;
  const [view, setView]             = useState("types"); // "types" | "scheduled" | "questions"
  const [types, setTypes]           = useState([]);
  const [scheduled, setScheduled]   = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editType, setEditType]     = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [editScheduled, setEditScheduled] = useState(null);

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    try {
      const [t, s, q] = await Promise.all([
        api.get(`/interview-types?environment_id=${envId}`),
        api.get(`/interviews?environment_id=${envId}`),
        api.get(`/bot/questions`),
      ]);
      setTypes(Array.isArray(t)?t:[]);
      setScheduled(Array.isArray(s)?s:[]);
      setQuestions(Array.isArray(q)?q:[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  // Pick up bulk interview candidates stored by bulk action bar
  useEffect(() => {
    const stored = sessionStorage.getItem("talentos_bulk_interview_candidates");
    if (!stored) return;
    sessionStorage.removeItem("talentos_bulk_interview_candidates");
    try {
      const candidates = JSON.parse(stored);
      if (candidates?.length) {
        // Switch to scheduled view and open scheduler with first available type
        setView("scheduled");
        // Wait for types to load, then open scheduler
        const tryOpen = (attempts = 0) => {
          setTypes(prev => {
            if (prev.length > 0) {
              setScheduleFor({ ...prev[0], _bulkCandidates: candidates });
            } else if (attempts < 10) {
              setTimeout(() => tryOpen(attempts + 1), 200);
            }
            return prev;
          });
        };
        setTimeout(() => tryOpen(), 300);
      }
    } catch {}
  }, []);

  const handleSaveType = async (form, id) => {
    if (id) await api.patch(`/interview-types/${id}`, { ...form, environment_id: envId });
    else     await api.post(`/interview-types`, { ...form, environment_id: envId });
    setShowForm(false); setEditType(null); load();
  };

  const handleDeleteType = async (id) => {
    if (!(await window.__confirm({ title:'Delete this interview type?', danger:true }))) return;
    await api.del(`/interview-types/${id}`); load();
  };

  const handleSchedule = async (form) => {
    const newInterview = await api.post(`/interviews`, { ...form, environment_id: envId, status: "pending" });
    // Auto-create a bot pre-screen session for this interview
    if (newInterview?.id) {
      api.post(`/bot/sessions`, {
        interview_id: newInterview.id,
        candidate_id: form.candidate_id,
        job_id: form.job_id,
        environment_id: envId,
      }).catch(() => {}); // non-blocking
    }
    setScheduleFor(null); load();
  };

  const handleDeleteScheduled = async (id) => {
    if (!(await window.__confirm({ title:'Cancel this interview?' }))) return;
    await api.del(`/interviews/${id}`); load();
  };

  const handleUpdateScheduled = async (form) => {
    await api.patch(`/interviews/${editScheduled.id}`, {
      date: form.date, time: form.time, notes: form.notes,
      interviewers: form.interviewers, candidate_id: form.candidate_id,
      candidate_name: form.candidate_name, job_id: form.job_id, job_name: form.job_name,
    });
    setEditScheduled(null); load();
  };

  const scheduledSorted = [...scheduled].sort((a,b) => {
    const da = new Date(`${a.date}T${a.time||"00:00"}`);
    const db = new Date(`${b.date}T${b.time||"00:00"}`);
    return da - db;
  });
  const upcoming = scheduledSorted.filter(s => new Date(`${s.date}T${s.time||"00:00"}`) >= new Date());
  const past     = scheduledSorted.filter(s => new Date(`${s.date}T${s.time||"00:00"}`) <  new Date());

  return (
    <div style={{fontFamily:F,color:C.text1,height:"100%",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:800,color:C.text1,letterSpacing:"-0.5px"}}>Interviews</h1>
          <p style={{margin:0,fontSize:13,color:C.text3}}>{types.length} interview type{types.length!==1?"s":""} · {upcoming.length} upcoming</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* View toggle */}
          <div style={{display:"flex",borderRadius:9,border:`1px solid ${C.border}`,overflow:"hidden",background:C.surface}}>
            {[["types","Types","list"],["scheduled","Scheduled","calendar"]].map(([v,l,icon])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"7px 14px",border:"none",background:view===v?C.accent:"transparent",color:view===v?"#fff":C.text2,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"all .12s",display:"flex",alignItems:"center",gap:5}}>
                <Ic n={icon} s={12} c={view===v?"#fff":C.text2}/>{l}
              </button>
            ))}
          </div>
          {view==="types" && <Btn v="primary" icon="plus" onClick={()=>{setEditType(null);setShowForm(true);}}>New interview type</Btn>}
          {view==="scheduled" && <Btn v="primary" icon="calendar" onClick={()=>setScheduleFor(types[0]||null)} disabled={types.length===0}>Schedule interview</Btn>}
        </div>
      </div>

      {loading && <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3}}>Loading…</div>}

      {!loading && view==="types" && (
        types.length===0
          ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{textAlign:"center",padding:"60px 40px",background:C.surface,borderRadius:20,border:`2px dashed ${C.border}`,maxWidth:420}}>
                <div style={{width:64,height:64,borderRadius:20,background:`${C.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                  <Ic n="calendar" s={28} c={C.accent}/>
                </div>
                <div style={{fontSize:17,fontWeight:700,color:C.text2,marginBottom:8}}>No interview types yet</div>
                <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Create your first interview type — like a Calendly event type — to start scheduling with candidates.</div>
                <Btn v="primary" icon="plus" onClick={()=>setShowForm(true)}>Create interview type</Btn>
              </div>
            </div>
          : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
              {types.map(t=>(
                <TypeCard key={t.id} type={t}
                  onEdit={()=>{setEditType(t);setShowForm(true);}}
                  onDelete={()=>handleDeleteType(t.id)}
                  onSchedule={()=>setScheduleFor(t)}/>
              ))}
            </div>
      )}

      {!loading && view==="scheduled" && (
  <div style={{flex:1, margin:"-32px -20px -20px", overflow:"hidden"}}>
    <CalendarView
      interviews={scheduled}
      interviewTypes={types}
      onEdit={(iv) => setEditScheduled(iv)}
      onDelete={(id) => handleDeleteScheduled(id)}
      onSchedule={() => setScheduleFor(types[0] || null)}
    />
  </div>
)}

      {showForm && <TypeFormModal type={editType} envId={envId} onSave={handleSaveType} onClose={()=>{setShowForm(false);setEditType(null);}}/>}
      {scheduleFor && <ScheduleModal interviewType={scheduleFor} envId={envId} onSave={handleSchedule} onClose={()=>setScheduleFor(null)}/>}
      {editScheduled && <ScheduleModal
        interviewType={{ id: editScheduled.interview_type_id, name: editScheduled.interview_type_name, duration: editScheduled.duration, format: editScheduled.format, interview_format: editScheduled.interview_format, interviewers: editScheduled.interviewers }}
        envId={envId}
        initialValues={editScheduled}
        onSave={handleUpdateScheduled}
        onClose={()=>setEditScheduled(null)}
      />}
    </div>
  );
}
