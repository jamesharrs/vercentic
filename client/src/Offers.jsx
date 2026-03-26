import { useState, useEffect, useRef } from "react";
import api from './apiClient.js';
const F = "'Geist', -apple-system, sans-serif";
const C = {
  accent:"#4361EE", accentDark:"#3A56E8", accentLight:"#EEF2FF",
  green:"#0CAF77",  greenLight:"#ECFDF5",
  amber:"#F79009",  amberLight:"#FFFBEB",
  red:"#EF4444",    redLight:"#FEF2F2",
  purple:"#7C3AED", purpleLight:"#F5F3FF",
  cyan:"#0891B2",   cyanLight:"#ECFEFF",
  text1:"#0F1729",  text2:"#374151", text3:"#9CA3AF",
  border:"#E8ECF8", border2:"#D1D5DB",
  surface:"#FFFFFF", surface2:"#F8F9FC",
  bg:"#F3F4F8",
};

const STATUS_CONFIG = {
  draft:            { label:"Draft",            color:C.text3,   bg:"#F3F4F8",       icon:"M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" },
  pending_approval: { label:"Pending Approval", color:C.amber,   bg:C.amberLight,    icon:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3" },
  approved:         { label:"Approved",         color:C.green,   bg:C.greenLight,    icon:"M20 6L9 17l-5-5" },
  sent:             { label:"Sent",             color:C.accent,  bg:C.accentLight,   icon:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" },
  accepted:         { label:"Accepted",         color:C.green,   bg:C.greenLight,    icon:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  declined:         { label:"Declined",         color:C.red,     bg:C.redLight,      icon:"M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  expired:          { label:"Expired",          color:C.text3,   bg:"#F3F4F8",       icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  withdrawn:        { label:"Withdrawn",        color:C.red,     bg:C.redLight,      icon:"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
};







const Ic = ({ n, s=16, c="currentColor" }) => {
  const paths = {
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", check:"M20 6L9 17l-5-5",
    search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    filter:"M3 4h18M7 9h10M11 14h2", chevronDown:"M6 9l6 6 6-6",
    chevronRight:"M9 18l6-6-6-6", chevronLeft:"M15 18l-6-6 6-6",
    edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
    briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
    clock:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3",
    calendar:"M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M12 12v4",
    arrowRight:"M5 12h14M12 5l7 7-7 7",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(paths[n]||"").split("M").filter(Boolean).map((d,i)=><path key={i} d={"M"+d}/>)}
    </svg>
  );
};

const StatusBadge = ({ status, size=12 }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:99,
      background:cfg.bg,color:cfg.color,fontSize:size,fontWeight:700,whiteSpace:"nowrap"}}>
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={cfg.icon}/>
      </svg>
      {cfg.label}
    </span>
  );
};

const Avatar = ({ name, size=28, color=C.accent }) => {
  const init = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`${color}20`,border:`1.5px solid ${color}40`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,color,flexShrink:0}}>
      {init}
    </div>
  );
};

const fmt = {
  currency: (amt, cur="USD") => amt != null ? new Intl.NumberFormat("en-US",{style:"currency",currency:cur,maximumFractionDigits:0}).format(amt) : "—",
  date:     (d) => d ? new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—",
  dateShort:(d) => d ? new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—",
  ago:      (d) => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; },
};

function OfferCard({ offer, onClick, selected }) {
  const daysToExpiry = offer.expiry_date ? Math.ceil((new Date(offer.expiry_date) - Date.now()) / 86400000) : null;
  const urgentExpiry = daysToExpiry !== null && daysToExpiry <= 3 && daysToExpiry >= 0;
  return (
    <div onClick={onClick} style={{
      padding:"14px 18px", borderRadius:10, cursor:"pointer", transition:"all .12s",
      background: selected ? C.accentLight : C.surface,
      border:`1.5px solid ${selected ? C.accent : C.border}`,
      boxShadow: selected ? `0 0 0 3px ${C.accent}18` : "0 1px 3px rgba(0,0,0,.05)",
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,color:C.text1,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {offer.candidate_name || "Unknown Candidate"}
          </div>
          <div style={{fontSize:12,color:C.text3,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {offer.job_name || "No position"}{offer.job_department ? ` · ${offer.job_department}` : ""}
          </div>
        </div>
        <StatusBadge status={offer.status}/>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:15,fontWeight:800,color:C.text1}}>{fmt.currency(offer.base_salary, offer.currency)}</span>
        {urgentExpiry && (
          <span style={{fontSize:11,fontWeight:700,color:C.red,background:C.redLight,padding:"2px 8px",borderRadius:99}}>
            Expires {daysToExpiry === 0 ? "today" : `in ${daysToExpiry}d`}
          </span>
        )}
        {!urgentExpiry && offer.expiry_date && (
          <span style={{fontSize:11,color:C.text3}}>Exp {fmt.dateShort(offer.expiry_date)}</span>
        )}
      </div>
      {offer.approval_chain?.length > 0 && offer.status === "pending_approval" && (
        <div style={{marginTop:10,display:"flex",gap:4,alignItems:"center"}}>
          {offer.approval_chain.map((a, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
              <div title={a.name} style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid",
                borderColor: a.status==="approved"?C.green : a.status==="rejected"?C.red : i===offer.current_approver_index?C.amber:C.border,
                background:  a.status==="approved"?C.greenLight : a.status==="rejected"?C.redLight : i===offer.current_approver_index?C.amberLight:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,
                color: a.status==="approved"?C.green : a.status==="rejected"?C.red : i===offer.current_approver_index?C.amber:C.text3,
              }}>
                {a.status==="approved"?"✓": a.status==="rejected"?"✗": i+1}
              </div>
              {i < offer.approval_chain.length-1 && (
                <div style={{width:12,height:1,background:a.status==="approved"?C.green:C.border}}/>
              )}
            </div>
          ))}
          <span style={{fontSize:10,color:C.text3,marginLeft:4}}>
            {(offer.approval_chain||[]).filter(a=>a.status==="approved").length}/{offer.approval_chain.length} approved
          </span>
        </div>
      )}
    </div>
  );
}

function ApprovalChainBuilder({ chain, onChange }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [role,  setRole]  = useState("");
  const add = () => {
    if (!name.trim()) return;
    onChange([...chain, { name: name.trim(), email: email.trim(), role: role.trim(), status:"pending" }]);
    setName(""); setEmail(""); setRole("");
  };
  const remove = (i) => onChange(chain.filter((_, idx) => idx !== i));
  const move   = (i, dir) => {
    const c = [...chain]; const j = i + dir;
    if (j < 0 || j >= c.length) return;
    [c[i], c[j]] = [c[j], c[i]]; onChange(c);
  };
  const inp = { padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13,
    fontFamily:F, outline:"none", background:C.surface, color:C.text1, width:"100%" };
  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Approval Chain</div>
      {chain.length === 0 && (
        <div style={{padding:"12px",borderRadius:8,background:C.surface2,border:`1px dashed ${C.border}`,
          fontSize:12,color:C.text3,textAlign:"center",marginBottom:10}}>
          No approvers — offer goes straight to Draft → Send
        </div>
      )}
      {chain.map((a, i) => (
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,
          padding:"8px 12px",borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:C.accentLight,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.accent,flexShrink:0}}>{i+1}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{a.name}</div>
            <div style={{fontSize:11,color:C.text3}}>{[a.role,a.email].filter(Boolean).join(" · ")}</div>
          </div>
          <button onClick={()=>move(i,-1)} disabled={i===0} style={{background:"none",border:"none",cursor:i===0?"not-allowed":"pointer",color:C.text3,padding:2}}>↑</button>
          <button onClick={()=>move(i,1)} disabled={i===chain.length-1} style={{background:"none",border:"none",cursor:i===chain.length-1?"not-allowed":"pointer",color:C.text3,padding:2}}>↓</button>
          <button onClick={()=>remove(i)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2}}><Ic n="x" s={14}/></button>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:6,marginTop:8}}>
        <input placeholder="Name *" value={name}  onChange={e=>setName(e.target.value)}  style={inp}/>
        <input placeholder="Role"   value={role}  onChange={e=>setRole(e.target.value)}  style={inp}/>
        <input placeholder="Email"  value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
        <button onClick={add} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.accent}`,
          background:C.accentLight,color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>
          + Add
        </button>
      </div>
    </div>
  );
}

function NewOfferModal({ environment, onClose, onCreated, prefillCandidate, prefillJob }) {
  const STEPS = ["Details","Compensation","Approval","Review"];
  const [step, setStep]  = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [jobs,       setJobs]       = useState([]);
  const [candSearch, setCandSearch] = useState(prefillCandidate?.name||"");
  const [jobSearch,  setJobSearch]  = useState(prefillJob?.name||"");

  const [form, setForm] = useState({
    candidate_id:   prefillCandidate?.id   || "",
    candidate_name: prefillCandidate?.name || "",
    job_id:         prefillJob?.id         || "",
    job_name:       prefillJob?.name       || "",
    job_department: prefillJob?.department || "",
    base_salary: "", currency: "USD", bonus: "", bonus_type: "fixed",
    start_date: "", expiry_date: "", notes: "", terms: "", approval_chain: [],
  });

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); };

  useEffect(() => {
    if (!candSearch.trim() || !environment?.id) { setCandidates([]); return; }
    const t = setTimeout(() => {
      fetch(`/objects?environment_id=${environment.id}`)
        .then(r=>r.json()).then(objs=>{
          const ppl = (objs||[]).find(o=>o.slug==="people");
          if (!ppl) return;
          fetch(`/records?object_id=${ppl.id}&environment_id=${environment.id}&search=${encodeURIComponent(candSearch)}&limit=8`)
            .then(r=>r.json()).then(d=>setCandidates(d.records||[]));
        }).catch(()=>{});
    }, 300);
    return () => clearTimeout(t);
  }, [candSearch, environment?.id]);

  useEffect(() => {
    if (!jobSearch.trim() || !environment?.id) { setJobs([]); return; }
    const t = setTimeout(() => {
      fetch(`/objects?environment_id=${environment.id}`)
        .then(r=>r.json()).then(objs=>{
          const jobObj = (objs||[]).find(o=>o.slug==="jobs");
          if (!jobObj) return;
          fetch(`/records?object_id=${jobObj.id}&environment_id=${environment.id}&search=${encodeURIComponent(jobSearch)}&limit=8`)
            .then(r=>r.json()).then(d=>setJobs(d.records||[]));
        });
    }, 300);
    return () => clearTimeout(t);
  }, [jobSearch, environment?.id]);

  const validate = () => {
    const e = {};
    if (step===0 && !form.candidate_id) e.candidate_id = "Select a candidate";
    if (step===1 && !form.base_salary)  e.base_salary  = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setSaving(true);
    try {
      const rec = await api.post("/api/offers", {
        environment_id:  environment.id,
        candidate_id:    form.candidate_id,
        candidate_name:  form.candidate_name,
        job_id:          form.job_id   || null,
        job_name:        form.job_name || "",
        job_department:  form.job_department || "",
        base_salary:     parseFloat(form.base_salary) || null,
        currency:        form.currency,
        bonus:           form.bonus ? parseFloat(form.bonus) : null,
        bonus_type:      form.bonus_type,
        start_date:      form.start_date  || null,
        expiry_date:     form.expiry_date || null,
        notes:           form.notes,
        terms:           form.terms,
        approval_chain:  form.approval_chain,
        created_by:      "Admin",
      });
      if (rec.error) { setErrors({submit: rec.error}); }
      else           { onCreated(rec); onClose(); }
    } catch(e) { setErrors({submit: e.message}); }
    setSaving(false);
  };

  const inp = (k) => ({
    padding:"9px 12px", borderRadius:8, border:`1px solid ${errors[k]?C.red:C.border}`,
    fontSize:13, fontFamily:F, outline:"none", background:C.surface, color:C.text1, width:"100%", boxSizing:"border-box",
  });
  const label = (txt) => <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{txt}</div>;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",
        overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.18)"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>New Offer</div>
            <div style={{display:"flex",gap:0,marginTop:10}}>
              {STEPS.map((s,i) => (
                <div key={s} style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,
                    background:i===step?C.accent:i<step?C.greenLight:"transparent",cursor:i<step?"pointer":"default"}}
                    onClick={()=>i<step&&setStep(i)}>
                    <div style={{width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:10,fontWeight:800,background:i===step?"rgba(255,255,255,.3)":i<step?C.green:C.border,
                      color:i===step?"white":i<step?"white":C.text3}}>
                      {i<step ? "✓" : i+1}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:i===step?"white":i<step?C.green:C.text3}}>{s}</span>
                  </div>
                  {i<STEPS.length-1 && <div style={{width:16,height:1,background:i<step?C.green:C.border}}/>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:4}}><Ic n="x" s={18}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
          {errors.submit && <div style={{padding:"10px 14px",borderRadius:8,background:C.redLight,border:`1px solid ${C.red}30`,color:C.red,fontSize:13,marginBottom:16}}>{errors.submit}</div>}

          {step===0 && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                {label("Candidate *")}
                <input value={candSearch} onChange={e=>{ setCandSearch(e.target.value); set("candidate_id",""); set("candidate_name",""); }}
                  placeholder="Search candidates…" style={inp("candidate_id")}/>
                {errors.candidate_id && <div style={{fontSize:11,color:C.red,marginTop:4}}>{errors.candidate_id}</div>}
                {form.candidate_id && !candidates.length && (
                  <div style={{marginTop:6,padding:"8px 12px",borderRadius:8,background:C.greenLight,border:`1px solid ${C.green}30`,fontSize:12,color:C.green,fontWeight:600}}>✓ {form.candidate_name}</div>
                )}
                {candidates.length > 0 && (
                  <div style={{marginTop:4,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden",maxHeight:200,overflowY:"auto"}}>
                    {candidates.map(c => {
                      const d = c.data||{}; const name = `${d.first_name||""} ${d.last_name||""}`.trim() || "Unknown";
                      return (
                        <div key={c.id} onClick={()=>{ set("candidate_id",c.id); set("candidate_name",name); setCandidates([]); setCandSearch(name); }}
                          style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:form.candidate_id===c.id?C.accentLight:C.surface}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                          onMouseLeave={e=>e.currentTarget.style.background=form.candidate_id===c.id?C.accentLight:C.surface}>
                          <Avatar name={name} size={28}/>
                          <div><div style={{fontSize:13,fontWeight:600,color:C.text1}}>{name}</div><div style={{fontSize:11,color:C.text3}}>{d.current_title||d.email||""}</div></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                {label("Job (optional)")}
                <input value={jobSearch} onChange={e=>{ setJobSearch(e.target.value); set("job_id",""); set("job_name",""); }} placeholder="Search jobs…" style={inp("job_id")}/>
                {form.job_id && !jobs.length && (
                  <div style={{marginTop:6,padding:"8px 12px",borderRadius:8,background:C.accentLight,border:`1px solid ${C.accent}30`,fontSize:12,color:C.accent,fontWeight:600}}>✓ {form.job_name}</div>
                )}
                {jobs.length > 0 && (
                  <div style={{marginTop:4,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden",maxHeight:160,overflowY:"auto"}}>
                    {jobs.map(j => {
                      const d = j.data||{};
                      return (
                        <div key={j.id} onClick={()=>{ set("job_id",j.id); set("job_name",d.job_title||""); set("job_department",d.department||""); setJobs([]); setJobSearch(d.job_title||""); }}
                          style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,background:form.job_id===j.id?C.accentLight:C.surface}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                          onMouseLeave={e=>e.currentTarget.style.background=form.job_id===j.id?C.accentLight:C.surface}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{d.job_title||"Untitled Job"}</div>
                          <div style={{fontSize:11,color:C.text3}}>{[d.department,d.location].filter(Boolean).join(" · ")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>{label("Start Date")}<input type="date" value={form.start_date} onChange={e=>set("start_date",e.target.value)} style={inp("start_date")}/></div>
              <div>{label("Offer Expiry Date")}<input type="date" value={form.expiry_date} onChange={e=>set("expiry_date",e.target.value)} style={inp("expiry_date")}/></div>
            </div>
          )}

          {step===1 && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                <div>
                  {label("Base Salary *")}
                  <input type="number" value={form.base_salary} onChange={e=>set("base_salary",e.target.value)} placeholder="e.g. 120000" style={inp("base_salary")}/>
                  {errors.base_salary && <div style={{fontSize:11,color:C.red,marginTop:4}}>{errors.base_salary}</div>}
                </div>
                <div>{label("Currency")}<select value={form.currency} onChange={e=>set("currency",e.target.value)} style={{...inp("currency"),background:C.surface}}>{["USD","GBP","EUR","AED","SAR","QAR","SGD","AUD","CAD"].map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                <div>{label("Bonus (optional)")}<input type="number" value={form.bonus} onChange={e=>set("bonus",e.target.value)} placeholder="e.g. 10000 or 10" style={inp("bonus")}/></div>
                <div>{label("Bonus Type")}<select value={form.bonus_type} onChange={e=>set("bonus_type",e.target.value)} style={{...inp("bonus_type"),background:C.surface}}><option value="fixed">Fixed</option><option value="percentage">% of Salary</option></select></div>
              </div>
              {form.base_salary && (
                <div style={{padding:"14px 16px",borderRadius:10,background:C.accentLight,border:`1px solid ${C.accent}30`,display:"flex",gap:16}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Base</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.text1}}>{fmt.currency(parseFloat(form.base_salary)||0,form.currency)}</div>
                  </div>
                  {form.bonus && (<>
                    <div style={{width:1,background:C.border}}/>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Bonus</div>
                      <div style={{fontSize:18,fontWeight:800,color:C.text1}}>
                        {form.bonus_type==="percentage" ? `${form.bonus}% (${fmt.currency((parseFloat(form.base_salary)||0)*(parseFloat(form.bonus)||0)/100,form.currency)})` : fmt.currency(parseFloat(form.bonus)||0,form.currency)}
                      </div>
                    </div>
                    <div style={{width:1,background:C.border}}/>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Package</div>
                      <div style={{fontSize:18,fontWeight:800,color:C.accent}}>
                        {fmt.currency((parseFloat(form.base_salary)||0)+(form.bonus_type==="percentage"?(parseFloat(form.base_salary)||0)*(parseFloat(form.bonus)||0)/100:parseFloat(form.bonus)||0),form.currency)}
                      </div>
                    </div>
                  </>)}
                </div>
              )}
              <div>{label("Notes")}<textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Internal notes…" style={{...inp("notes"),resize:"vertical"}}/></div>
              <div>{label("Terms & Conditions")}<textarea value={form.terms} onChange={e=>set("terms",e.target.value)} rows={4} placeholder="Offer terms, conditions, benefits overview…" style={{...inp("terms"),resize:"vertical"}}/></div>
            </div>
          )}

          {step===2 && (
            <div>
              <p style={{fontSize:13,color:C.text2,marginBottom:16,lineHeight:1.5}}>
                Add approvers in the order they should approve. The offer will move through each person sequentially before being sent to the candidate.
              </p>
              <ApprovalChainBuilder chain={form.approval_chain} onChange={v=>set("approval_chain",v)}/>
            </div>
          )}

          {step===3 && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"14px 18px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Offer Summary</div>
                {[
                  ["Candidate",    form.candidate_name || "—"],
                  ["Position",     form.job_name || "—"],
                  ["Base Salary",  fmt.currency(parseFloat(form.base_salary)||0, form.currency)],
                  ["Bonus",        form.bonus ? (form.bonus_type==="percentage" ? `${form.bonus}%` : fmt.currency(parseFloat(form.bonus), form.currency)) : "—"],
                  ["Start Date",   fmt.date(form.start_date)],
                  ["Expiry Date",  fmt.date(form.expiry_date)],
                ].map(([k,v]) => (
                  <div key={k} style={{display:"flex",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span style={{color:C.text3,width:130,flexShrink:0}}>{k}</span>
                    <span style={{color:C.text1,fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
              {form.approval_chain.length > 0 && (
                <div style={{padding:"14px 18px",borderRadius:10,background:C.amberLight,border:`1px solid ${C.amber}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
                    Approval Chain ({form.approval_chain.length} approver{form.approval_chain.length!==1?"s":""})
                  </div>
                  {form.approval_chain.map((a,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<form.approval_chain.length-1?6:0}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:C.amber,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"white"}}>{i+1}</div>
                      <span style={{fontSize:13,fontWeight:600,color:C.text1}}>{a.name}</span>
                      {a.role && <span style={{fontSize:11,color:C.text3}}>· {a.role}</span>}
                    </div>
                  ))}
                </div>
              )}
              {form.approval_chain.length === 0 && (
                <div style={{padding:"12px 16px",borderRadius:10,background:C.accentLight,border:`1px solid ${C.accent}20`,fontSize:12,color:C.accent}}>
                  ℹ No approvers — offer will be created as Draft and can be sent immediately.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",gap:8}}>
          <button onClick={()=>step===0?onClose():setStep(s=>s-1)}
            style={{padding:"9px 20px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>
            {step===0?"Cancel":"← Back"}
          </button>
          {step < STEPS.length-1
            ? <button onClick={()=>validate()&&setStep(s=>s+1)}
                style={{padding:"9px 24px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>Next →</button>
            : <button onClick={submit} disabled={saving}
                style={{padding:"9px 24px",borderRadius:8,border:"none",background:saving?C.border:C.green,color:"white",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:8}}>
                {saving ? <><Ic n="loader" s={14}/> Creating…</> : <>⚡ Create Offer</>}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

function OfferDetail({ offer: initialOffer, onClose, onUpdated, onDeleted }) {
  const [offer,    setOffer]   = useState(initialOffer);
  const [actTab,   setActTab]  = useState("timeline");
  const [approveModal, setApproveModal] = useState(null);
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => { setOffer(initialOffer); }, [initialOffer]);

  const doStatus = async (status, reason) => {
    setWorking(true);
    const updated = await api.patch(`/offers/${offer.id}/status`, { status, reason, user:"Admin" });
    setOffer(updated); onUpdated(updated);
    setWorking(false);
  };

  const doApprove = async (decision) => {
    setWorking(true);
    const updated = await api.patch(`/offers/${offer.id}/approve`, { decision, comment, user:"Admin" });
    setOffer(updated); onUpdated(updated);
    setApproveModal(null); setComment("");
    setWorking(false);
  };

  const doDelete = async () => {
    if (!confirm("Delete this offer? This cannot be undone.")) return;
    await api.del(`/offers/${offer.id}`);
    onDeleted(offer.id);
  };

  const total = (offer.base_salary||0) + (offer.bonus
    ? (offer.bonus_type==="percentage" ? (offer.base_salary||0)*(offer.bonus/100) : offer.bonus) : 0);

  const btns = {
    draft:    [{ label:"Submit for Approval", action:()=>doStatus("pending_approval"), color:C.amber,  show:(offer.approval_chain||[]).length>0 },
               { label:"Send to Candidate",   action:()=>doStatus("sent"),             color:C.accent, show:(offer.approval_chain||[]).length===0 }],
    approved: [{ label:"Send to Candidate",   action:()=>doStatus("sent"),   color:C.accent, show:true }],
    sent:     [{ label:"Mark Accepted",        action:()=>doStatus("accepted"),              color:C.green, show:true },
               { label:"Mark Declined",        action:()=>doStatus("declined","Candidate declined"), color:C.red, show:true }],
    pending_approval:[], accepted:[], declined:[], expired:[], withdrawn:[],
  };
  const actionBtns = (btns[offer.status]||[]).filter(b=>b.show);
  const canWithdraw = !["accepted","withdrawn","expired"].includes(offer.status);
  const canApprove  = offer.status === "pending_approval";

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.surface}}>
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:18,fontWeight:800,color:C.text1,marginBottom:4}}>{offer.candidate_name}</div>
            <div style={{fontSize:13,color:C.text3}}>{offer.job_name || "No position linked"}{offer.job_department ? ` · ${offer.job_department}` : ""}</div>
            <div style={{marginTop:10}}><StatusBadge status={offer.status} size={13}/></div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {canApprove && (<>
              <button onClick={()=>setApproveModal("approved")}
                style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.green}`,background:C.greenLight,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                ✓ Approve
              </button>
              <button onClick={()=>setApproveModal("rejected")}
                style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.red}`,background:C.redLight,color:C.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                ✗ Reject
              </button>
            </>)}
            {actionBtns.map(b => (
              <button key={b.label} onClick={b.action} disabled={working}
                style={{padding:"7px 14px",borderRadius:8,border:"none",background:b.color,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                {b.label}
              </button>
            ))}
            {canWithdraw && (
              <button onClick={()=>doStatus("withdrawn")}
                style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text3,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                Withdraw
              </button>
            )}
            <button onClick={doDelete} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.red,cursor:"pointer"}}>
              <Ic n="trash" s={14} c={C.red}/>
            </button>
          </div>
        </div>
        <div style={{marginTop:16,display:"flex",gap:20,padding:"12px 16px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`}}>
          {[
            ["Base Salary", fmt.currency(offer.base_salary, offer.currency), C.text1],
            offer.bonus ? ["Bonus", offer.bonus_type==="percentage" ? `${offer.bonus}%` : fmt.currency(offer.bonus, offer.currency), C.text2] : null,
            ["Total Package", fmt.currency(total, offer.currency), C.accent],
            ["Start Date", fmt.date(offer.start_date), C.text2],
            ["Expires", fmt.date(offer.expiry_date), C.text2],
          ].filter(Boolean).map(([k,v,c]) => (
            <div key={k} style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{k}</div>
              <div style={{fontSize:14,fontWeight:700,color:c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:4,padding:"12px 24px 0",borderBottom:`1px solid ${C.border}`}}>
        {[["timeline","Timeline"],["chain","Approval Chain"],["details","Details"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActTab(id)}
            style={{padding:"7px 16px",borderRadius:"8px 8px 0 0",border:"none",fontFamily:F,fontSize:13,fontWeight:600,cursor:"pointer",
              background:actTab===id?C.surface:"transparent",color:actTab===id?C.accent:C.text3,
              borderBottom:actTab===id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {actTab==="timeline" && (
          <div>
            {(offer.activity_log||[]).slice().reverse().map((entry, i) => (
              <div key={entry.id||i} style={{display:"flex",gap:12,marginBottom:16}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                    background:entry.type==="approved"?C.greenLight:entry.type==="rejected"?C.redLight:C.accentLight,
                    border:`1.5px solid ${entry.type==="approved"?C.green:entry.type==="rejected"?C.red:C.accent}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                      stroke={entry.type==="approved"?C.green:entry.type==="rejected"?C.red:C.accent}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={entry.type==="approved"?"M20 6L9 17l-5-5":entry.type==="rejected"?"M18 6L6 18M6 6l12 12":"M12 5v14M5 12h14"}/>
                    </svg>
                  </div>
                  {i < (offer.activity_log||[]).length-1 && <div style={{width:1,flex:1,background:C.border,marginTop:4}}/>}
                </div>
                <div style={{flex:1,paddingTop:4}}>
                  <div style={{fontSize:13,color:C.text1,fontWeight:500,lineHeight:1.4}}>{entry.message}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:3}}>{entry.user} · {fmt.ago(entry.timestamp)}</div>
                </div>
              </div>
            ))}
            {(offer.activity_log||[]).length===0 && <div style={{textAlign:"center",padding:"40px 0",color:C.text3,fontSize:13}}>No activity yet</div>}
          </div>
        )}

        {actTab==="chain" && (
          <div>
            {(offer.approval_chain||[]).length===0 ? (
              <div style={{textAlign:"center",padding:"40px 0",color:C.text3,fontSize:13}}>No approval chain configured</div>
            ) : (
              <div style={{position:"relative"}}>
                {offer.approval_chain.map((a, i) => {
                  const isCurrent = offer.status==="pending_approval" && i===offer.current_approver_index;
                  const statusColor = a.status==="approved"?C.green : a.status==="rejected"?C.red : isCurrent?C.amber : C.text3;
                  const statusBg    = a.status==="approved"?C.greenLight : a.status==="rejected"?C.redLight : isCurrent?C.amberLight : C.surface2;
                  return (
                    <div key={i}>
                      <div style={{display:"flex",gap:16,padding:"16px",borderRadius:10,marginBottom:4,
                        border:`1.5px solid ${isCurrent?C.amber:a.status==="approved"?C.green:a.status==="rejected"?C.red:C.border}`,
                        background:statusBg}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:statusColor+"20",border:`2px solid ${statusColor}`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:statusColor,flexShrink:0}}>
                          {a.status==="approved"?"✓":a.status==="rejected"?"✗":i+1}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                            <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{a.name}</span>
                            {a.role && <span style={{fontSize:11,color:C.text3,background:C.surface2,padding:"2px 8px",borderRadius:99}}>{a.role}</span>}
                            {isCurrent && <span style={{fontSize:11,color:C.amber,fontWeight:700,background:C.amberLight,padding:"2px 8px",borderRadius:99}}>Awaiting decision</span>}
                          </div>
                          {a.email && <div style={{fontSize:12,color:C.text3}}>{a.email}</div>}
                          {a.comment && <div style={{marginTop:6,fontSize:12,color:C.text2,fontStyle:"italic",background:C.surface,padding:"6px 10px",borderRadius:6,border:`1px solid ${C.border}`}}>"{a.comment}"</div>}
                          {a.decided_at && <div style={{fontSize:11,color:C.text3,marginTop:4}}>{a.status==="approved"?"Approved":"Rejected"} {fmt.ago(a.decided_at)}</div>}
                        </div>
                      </div>
                      {i < offer.approval_chain.length-1 && <div style={{display:"flex",alignItems:"center",paddingLeft:18,marginBottom:4}}><div style={{width:1,height:16,background:a.status==="approved"?C.green:C.border}}/></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {actTab==="details" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {offer.notes && (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Notes</div>
                <div style={{padding:"12px 14px",borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`,fontSize:13,color:C.text2,lineHeight:1.6}}>{offer.notes}</div>
              </div>
            )}
            {offer.terms && (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Terms & Conditions</div>
                <div style={{padding:"12px 14px",borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`,fontSize:13,color:C.text2,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{offer.terms}</div>
              </div>
            )}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Metadata</div>
              {[
                ["Offer ID",    offer.id],
                ["Created",     fmt.date(offer.created_at)],
                ["Created by",  offer.created_by],
                ["Sent at",     fmt.date(offer.sent_at)],
                ["Accepted at", fmt.date(offer.accepted_at)],
                ["Declined at", fmt.date(offer.declined_at)],
                offer.decline_reason ? ["Decline reason", offer.decline_reason] : null,
              ].filter(Boolean).map(([k,v])=>(
                <div key={k} style={{display:"flex",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                  <span style={{color:C.text3,width:130,flexShrink:0}}>{k}</span>
                  <span style={{color:C.text1,fontFamily:k==="Offer ID"?"monospace":"inherit",fontSize:k==="Offer ID"?11:12}}>{v||"—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {approveModal && (
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,41,.4)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.surface,borderRadius:12,padding:24,width:400,boxShadow:"0 12px 40px rgba(0,0,0,.2)"}}>
            <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>
              {approveModal==="approved" ? "Approve Offer" : "Reject Offer"}
            </div>
            <div style={{fontSize:12,color:C.text3,marginBottom:16}}>
              {approveModal==="approved" ? "Add a comment (optional)" : "Add a reason for rejection (optional)"}
            </div>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3}
              placeholder={approveModal==="approved" ? "Looks good, approved." : "Needs revision before sending…"}
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
              <button onClick={()=>{setApproveModal(null);setComment("");}}
                style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
              <button onClick={()=>doApprove(approveModal)} disabled={working}
                style={{padding:"8px 18px",borderRadius:8,border:"none",background:approveModal==="approved"?C.green:C.red,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                {approveModal==="approved" ? "✓ Approve" : "✗ Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OffersModule({ environment }) {
  const [offers,       setOffers]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(`/offers?environment_id=${environment.id}`);
    setOffers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [environment?.id]);

  const filtered = offers.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || [o.candidate_name, o.job_name, o.job_department].some(v => (v||"").toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:    offers.length,
    pending:  offers.filter(o=>o.status==="pending_approval").length,
    sent:     offers.filter(o=>o.status==="sent").length,
    accepted: offers.filter(o=>o.status==="accepted").length,
  };

  const selectedOffer = selected ? offers.find(o => o.id === selected) : null;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",fontFamily:F}}>
      <div style={{padding:"20px 24px 0",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Offers</h1>
            <p style={{margin:"4px 0 0",fontSize:13,color:C.text3}}>Manage and track candidate offers</p>
          </div>
          <button onClick={()=>setShowNew(true)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>
            <Ic n="plus" s={14} c="white"/> New Offer
          </button>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          {[["Total Offers",stats.total,C.accent],["Pending Approval",stats.pending,C.amber],["Sent",stats.sent,C.cyan],["Accepted",stats.accepted,C.green]].map(([label,val,color]) => (
            <div key={label} style={{flex:1,padding:"12px 16px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`,textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color}}>{val}</div>
              <div style={{fontSize:11,color:C.text3,fontWeight:600,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,paddingBottom:16}}>
          <div style={{flex:1,position:"relative"}}>
            <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex"}}>
              <Ic n="search" s={14} c={C.text3}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search candidates, jobs…"
              style={{width:"100%",padding:"8px 12px 8px 34px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,boxSizing:"border-box"}}/>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:C.surface,cursor:"pointer"}}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:selectedOffer?360:undefined,flex:selectedOffer?undefined:1,overflowY:"auto",padding:"16px",
          borderRight:selectedOffer?`1px solid ${C.border}`:undefined,background:C.bg}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"60px 0",color:C.text3,fontSize:13}}>Loading offers…</div>
          ) : filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"60px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>📋</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>{search||statusFilter!=="all"?"No offers match":"No offers yet"}</div>
              <div style={{fontSize:13,color:C.text3,marginBottom:20}}>{search||statusFilter!=="all"?"Try adjusting your filters":"Create your first offer to get started"}</div>
              {!search && statusFilter==="all" && (
                <button onClick={()=>setShowNew(true)} style={{padding:"9px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                  + New Offer
                </button>
              )}
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filtered.map(o => (
                <OfferCard key={o.id} offer={o} selected={selected===o.id} onClick={()=>setSelected(selected===o.id?null:o.id)}/>
              ))}
            </div>
          )}
        </div>
        {selectedOffer && (
          <div style={{flex:1,overflow:"hidden",position:"relative"}}>
            <OfferDetail
              offer={selectedOffer}
              onClose={()=>setSelected(null)}
              onUpdated={updated=>{ setOffers(os=>os.map(o=>o.id===updated.id?updated:o)); setSelected(updated.id); }}
              onDeleted={id=>{ setOffers(os=>os.filter(o=>o.id!==id)); setSelected(null); }}
            />
          </div>
        )}
      </div>

      {showNew && (
        <NewOfferModal
          environment={environment}
          onClose={()=>setShowNew(false)}
          onCreated={rec=>{ setOffers(os=>[rec,...os]); setSelected(rec.id); }}
        />
      )}
    </div>
  );
}
