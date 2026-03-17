import { useState, useEffect, useCallback, useRef } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8", border2:"#d1d5db",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444",
};
const api = {
  get:    p      => fetch(`/api${p}`).then(r=>r.json()),
  post:   (p,b)  => fetch(`/api${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (p,b)  => fetch(`/api${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:    p      => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
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


// ── Type Form Modal ───────────────────────────────────────────────────────────
const TypeFormModal = ({ type, envId, onSave, onClose }) => {
  const isEdit = !!type?.id;
  const [form, setForm] = useState({
    name: type?.name||"", interview_format: type?.interview_format||"video",
    duration: type?.duration||30, format: type?.format||"Video Call",
    description: type?.description||"", location: type?.location||"",
    buffer_before: type?.buffer_before||0, buffer_after: type?.buffer_after||0,
    max_bookings_per_day: type?.max_bookings_per_day||0,
    interviewers: type?.interviewers||[],
    availability: type?.availability||{},
    color: type?.color||"#4361EE",
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form, type?.id);
    setSaving(false);
  };

  const inpSt = { width:"100%", padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", boxSizing:"border-box", color:C.text1 };
  const labelSt = { fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 };
  const TAB_ST = (active) => ({ padding:"7px 14px", borderRadius:8, border:"none", background: active?"#fff":"transparent", color:active?C.accent:C.text3, fontWeight:active?700:600, cursor:"pointer", fontFamily:F, fontSize:12, boxShadow:active?"0 1px 4px rgba(0,0,0,.08)":undefined });

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:620,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"20px 24px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:800,color:C.text1}}>{isEdit?"Edit":"New"} Interview Type</div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1}}>×</button>
          </div>
          <div style={{display:"flex",gap:4,background:"#f1f5f9",borderRadius:10,padding:4}}>
            {[["details","Details"],["interviewers","Interviewers"],["availability","Availability"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={TAB_ST(tab===id)}>{label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
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
                  <select value={form.duration} onChange={e=>set("duration",Number(e.target.value))} style={{...inpSt,background:"white"}}>
                    {DURATIONS.map(d=><option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Format</label>
                  <select value={form.format} onChange={e=>set("format",e.target.value)} style={{...inpSt,background:"white"}}>
                    {FORMATS.map(f=><option key={f} value={f}>{f}</option>)}
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
            </div>
          )}
          {tab==="interviewers" && (
            <div>
              <div style={{fontSize:13,color:C.text3,marginBottom:14}}>Select the people who conduct this interview. When scheduling, these will be pre-filled as the interview panel.</div>
              <SimplePeoplePicker value={form.interviewers} onChange={v=>set("interviewers",v)} envId={envId} placeholder="Add interviewers…"/>
            </div>
          )}
          {tab==="availability" && (
            <div>
              <div style={{fontSize:13,color:C.text3,marginBottom:14}}>Set the general availability window for this interview type. Specific scheduling will respect these slots.</div>
              <AvailabilityGrid value={form.availability} onChange={v=>set("availability",v)}/>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" onClick={handle} disabled={saving||!form.name.trim()}>{saving?"Saving…":isEdit?"Save changes":"Create interview type"}</Btn>
        </div>
      </div>
    </div>
  );
};


// ── Schedule Interview Modal ──────────────────────────────────────────────────
const ScheduleModal = ({ interviewType, envId, onSave, onClose, initialValues }) => {
  const isEdit = !!initialValues?.id;
  const [form, setForm] = useState({
    candidate_id: initialValues?.candidate_id || null,
    candidate_name: initialValues?.candidate_name || "",
    job_id: initialValues?.job_id || null,
    job_name: initialValues?.job_name || "",
    date: initialValues?.date || "",
    time: initialValues?.time || "",
    notes: initialValues?.notes || "",
    interviewers: initialValues?.interviewers || interviewType?.interviewers || [],
  });
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobInterviewers, setJobInterviewers] = useState([]); // from job record
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
  }, [envId]);

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
    await onSave({ ...form, interview_type_id: interviewType?.id, interview_type_name: interviewType?.name, duration: interviewType?.duration, format: interviewType?.format });
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
              <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit ? "Edit Interview" : `Schedule: ${interviewType?.name}`}</div>
              <div style={{fontSize:12,color:C.text3}}>{interviewType?.duration} min · {interviewType?.format}</div>
            </div>
            <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20}}>×</button>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={labelSt}>Candidate *</label>
              <select value={form.candidate_id||""} onChange={e=>{ const c=candidates.find(c=>c.id===e.target.value); set("candidate_id",c?.id||null); set("candidate_name",c?.name||""); }} style={inpSt}>
                <option value="">Select candidate…</option>
                {candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSt}>Job (optional)</label>
              <select value={form.job_id||""} onChange={e=>{ const j=jobs.find(j=>j.id===e.target.value); set("job_id",j?.id||null); set("job_name",j?.name||""); }} style={inpSt}>
                <option value="">Select job…</option>
                {jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={labelSt}>Date *</label>
                <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inpSt} min={new Date().toISOString().slice(0,10)}/>
              </div>
              <div>
                <label style={labelSt}>Time *</label>
                <input type="time" value={form.time} onChange={e=>set("time",e.target.value)} style={inpSt}/>
              </div>
            </div>
            <div>
              <label style={labelSt}>Interviewers</label>
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
                      <div key={iv.id} onClick={toggle} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",cursor:"pointer",borderBottom:`1px solid ${C.border}`,lastChild:{borderBottom:"none"}}}>
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
            <div>
              <label style={labelSt}>Notes</label>
              <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Any prep notes for the interviewer…" style={{...inpSt,resize:"vertical"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" onClick={handle} disabled={saving||!form.candidate_id||!form.date||!form.time} icon="calendar">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Schedule Interview"}
            </Btn>
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
    // Bot runs on portal renderer (5173 in dev, same origin in prod)
    const base = window.location.hostname === 'localhost'
      ? `http://localhost:5173`
      : window.location.origin;
    const url = `${base}/bot/${botToken}`;
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
        <div style={{fontSize:16,fontWeight:800,color:"#111827",marginBottom:20}}>Add Question</div>
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
                <div style={{fontSize:13,color:"#111827",lineHeight:1.5,marginBottom:4}}>{q.text}</div>
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

  const handleSaveType = async (form, id) => {
    if (id) await api.patch(`/interview-types/${id}`, { ...form, environment_id: envId });
    else     await api.post(`/interview-types`, { ...form, environment_id: envId });
    setShowForm(false); setEditType(null); load();
  };

  const handleDeleteType = async (id) => {
    if (!confirm("Delete this interview type?")) return;
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
    if (!confirm("Cancel this interview?")) return;
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
            {[["types","Types","list"],["scheduled","Scheduled","calendar"],["questions","Question Bank","help-circle"]].map(([v,l,icon])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"7px 14px",border:"none",background:view===v?C.accent:"transparent",color:view===v?"#fff":C.text2,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"all .12s",display:"flex",alignItems:"center",gap:5}}>
                <Ic n={icon} s={12} c={view===v?"#fff":C.text2}/>{l}
              </button>
            ))}
          </div>
          {view==="types" && <Btn v="primary" icon="plus" onClick={()=>{setEditType(null);setShowForm(true);}}>New interview type</Btn>}
          {view==="scheduled" && <Btn v="primary" icon="calendar" onClick={()=>setScheduleFor(types[0]||null)} disabled={types.length===0}>Schedule interview</Btn>}
          {view==="questions" && <Btn v="primary" icon="plus" onClick={()=>setShowAddQuestion(true)}>Add question</Btn>}
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
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {scheduledSorted.length===0
            ? <div style={{padding:"60px 40px",textAlign:"center",color:C.text3}}>
                <div style={{width:52,height:52,borderRadius:16,background:`${C.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                  <Ic n="calendar" s={22} c={C.accent}/>
                </div>
                <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:4}}>No interviews scheduled</div>
                <div style={{fontSize:12}}>Create an interview type first, then schedule candidates.</div>
              </div>
            : <>
                {upcoming.length>0 && <>
                  <div style={{padding:"12px 18px",background:"#f8f9fc",borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Upcoming ({upcoming.length})</div>
                  {upcoming.map(s=><InterviewRow key={s.id} interview={s} envId={envId} onEdit={()=>setEditScheduled(s)} onDelete={()=>handleDeleteScheduled(s.id)}/>)}
                </>}
                {past.length>0 && <>
                  <div style={{padding:"12px 18px",background:"#f8f9fc",borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Past ({past.length})</div>
                  {past.map(s=><InterviewRow key={s.id} interview={s} envId={envId} onEdit={()=>setEditScheduled(s)} onDelete={()=>handleDeleteScheduled(s.id)}/>)}
                </>}
              </>
          }
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

      {/* Question Bank View */}
      {!loading && view==="questions" && (
        <QuestionBankView questions={questions} onAdd={()=>setShowAddQuestion(true)} onDelete={async (id)=>{ await api.del(`/bot/questions/${id}`); load(); }} showAdd={showAddQuestion} onSaveAdd={async (form)=>{ await api.post(`/bot/questions`,form); setShowAddQuestion(false); load(); }} onCloseAdd={()=>setShowAddQuestion(false)}/>
      )}
    </div>
  );
}
