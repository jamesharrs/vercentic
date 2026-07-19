/**
 * client/src/ApprovalsPanel.jsx
 * Approval requests panel inside RecordDetail
 */
import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import api from "./apiClient.js";

// Delegate to the shared apiClient so every call carries auth + CSRF headers.
// (The old local fetch wrappers sent neither — every POST/DELETE 403'd with
// "CSRF token missing", and reads 403'd after the auth-gate hardening.)
const apiGet    = p     => api.get(p);
const apiPost   = (p,b) => api.post(p, b || {});
const apiDelete = p     => api.delete(p);

const C = {
  accent:"#4361EE", accentLight:"#EEF2FF", green:"#16a34a", greenLight:"#dcfce7",
  red:"#dc2626", redLight:"#fee2e2", amber:"#f59e0b", amberLight:"#fef3c7",
  purple:"#7c3aed", purpleLight:"#f3f0ff", text1:"#0f1729", text2:"#374151",
  text3:"#94a3b8", border:"#e8ecf8", surface:"#f8fafc", surface2:"#f1f5f9",
};
const F = "'Geist','Inter',-apple-system,sans-serif";

const PATHS = {
  plus:"M12 5v14M5 12h14", check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
  clock:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v-4m0-4h.01",
  chevD:"M6 9l6 6 6-6", chevR:"M9 18l6-6-6-6", send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  copy:"M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  search:"M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};
function Ic({ n, s=16, c="currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]||""}/></svg>;
}

/**
 * SearchSelect — custom searchable dropdown.
 * options: [{ value, label, sublabel?, icon? }]. List renders via a portal to
 * document.body so it escapes the modal's overflow:hidden; positioned under the
 * trigger and reflowed on scroll/resize.
 */
function SearchSelect({ value, options, placeholder="Select…", searchPlaceholder="Search…", emptyText="No matches", onChange, minWidth=200 }) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState("");
  const [rect, setRect]     = useState(null);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);
  const filtered = q.trim()
    ? options.filter(o => (o.label + " " + (o.sublabel||"")).toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  const reposition = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, minWidth) });
  }, [minWidth]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, reposition]);

  const inp = {padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:"white",color:C.text1};

  return (
    <div ref={ref} style={{flex:1,minWidth,position:"relative"}}>
      <button type="button" onClick={()=>{setOpen(o=>!o);setQ("");}} style={{...inp,width:"100%",boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,cursor:"pointer",textAlign:"left"}}>
        <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:selected?C.text1:C.text3}}>
          {selected ? selected.label : placeholder}
        </span>
        <Ic n="chevD" s={14} c={C.text3}/>
      </button>
      {open && rect && ReactDOM.createPortal(
        <>
          <div onMouseDown={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:3000}}/>
          <div style={{position:"fixed",left:rect.left,top:rect.top,width:rect.width,zIndex:3001,background:"white",borderRadius:10,border:`1.5px solid ${C.border}`,boxShadow:"0 12px 32px rgba(15,23,41,.16)",overflow:"hidden"}}>
            <div style={{padding:8,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:7}}>
              <Ic n="search" s={13} c={C.text3}/>
              <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder={searchPlaceholder} style={{border:"none",outline:"none",fontSize:12,fontFamily:F,flex:1,color:C.text1,background:"transparent"}}/>
            </div>
            <div style={{maxHeight:220,overflowY:"auto",padding:4}}>
              {filtered.length===0 && <div style={{padding:"12px",fontSize:12,color:C.text3,textAlign:"center"}}>{emptyText}</div>}
              {filtered.map(o=>{
                const active = o.value===value;
                return (
                  <button key={o.value} type="button" onMouseDown={e=>{e.preventDefault();onChange(o.value);setOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:7,border:"none",cursor:"pointer",background:active?C.accentLight:"transparent",textAlign:"left",fontFamily:F}}
                    onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.surface;}}
                    onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                    {o.icon && <Ic n={o.icon} s={14} c={active?C.accent:C.text3}/>}
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{display:"block",fontSize:12,fontWeight:active?700:500,color:active?C.accent:C.text1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.label}</span>
                      {o.sublabel && <span style={{display:"block",fontSize:11,color:C.text3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.sublabel}</span>}
                    </span>
                    {active && <Ic n="check" s={13} c={C.accent}/>}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

const SCOLOR = {
  pending:  { bg:C.amberLight, text:C.amber,  border:"#fde68a" },
  approved: { bg:C.greenLight, text:C.green,  border:"#bbf7d0" },
  declined: { bg:C.redLight,   text:C.red,    border:"#fecaca" },
  withdrawn:{ bg:C.surface2,   text:C.text3,  border:C.border  },
};
const SLABEL = { pending:"Pending", approved:"Approved", declined:"Declined", withdrawn:"Withdrawn" };

function StatusBadge({ status }) {
  const s = SCOLOR[status]||SCOLOR.pending;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:99,background:s.bg,color:s.text,border:`1px solid ${s.border}`,fontSize:11,fontWeight:700}}>{SLABEL[status]||status}</span>;
}

// ApproverRow — one row in the approver config list
function ApproverRow({ cfg, index, users, fields, groups, onChange, onRemove, onMove, total }) {
  const inp = {padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:"white",color:C.text1};
  const TYPE_OPTS = [
    { value:"named", label:"Named person",     icon:"plus"   },
    { value:"user",  label:"Platform user",    icon:"shield" },
    { value:"group", label:"From a group",     icon:"users"  },
    { value:"field", label:"From record field",icon:"copy"   },
  ];
  const userOpts = users.map(u=>({
    value:u.id,
    label:[u.first_name,u.last_name].filter(Boolean).join(" ")||u.email,
    sublabel:u.email,
  }));
  const groupOpts = (groups||[]).map(g=>({
    value:g.id,
    label:g.name,
    sublabel:`${g.member_count ?? (g.member_ids||[]).length} member${(g.member_count ?? (g.member_ids||[]).length)!==1?"s":""}`,
    icon:"users",
  }));
  const fieldOpts = fields.filter(f=>["people","lookup","multi_lookup"].includes(f.field_type))
    .map(f=>({ value:f.api_key, label:f.name, sublabel:f.field_type }));

  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,marginBottom:6}}>
      <div style={{width:22,height:22,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.accent,flexShrink:0,marginTop:2}}>{index+1}</div>
      <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:8}}>
        <SearchSelect
          value={cfg.type}
          options={TYPE_OPTS}
          minWidth={150}
          searchPlaceholder="Search type…"
          onChange={v=>onChange({...cfg,type:v,name:"",email:"",user_id:"",field_key:"",group_id:"",label:""})}
        />
        {cfg.type==="named"&&<>
          <input placeholder="Name" value={cfg.name||""} onChange={e=>onChange({...cfg,name:e.target.value})} style={{...inp,flex:1,minWidth:100}}/>
          <input placeholder="Email" type="email" value={cfg.email||""} onChange={e=>onChange({...cfg,email:e.target.value})} style={{...inp,flex:1,minWidth:140}}/>
        </>}
        {cfg.type==="user"&&(
          <SearchSelect
            value={cfg.user_id||""}
            options={userOpts}
            placeholder="Select user…"
            searchPlaceholder="Search users…"
            emptyText="No users found"
            minWidth={200}
            onChange={v=>onChange({...cfg,user_id:v})}
          />
        )}
        {cfg.type==="group"&&(
          groupOpts.length===0
            ? <div style={{flex:1,minWidth:200,fontSize:12,color:C.text3,padding:"7px 10px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"white"}}>No saved groups yet — create one in Settings → Groups</div>
            : <SearchSelect
                value={cfg.group_id||""}
                options={groupOpts}
                placeholder="Select group…"
                searchPlaceholder="Search groups…"
                emptyText="No groups found"
                minWidth={200}
                onChange={v=>{const g=groups.find(g2=>g2.id===v);onChange({...cfg,group_id:v,label:g?.name||""});}}
              />
        )}
        {cfg.type==="field"&&(
          <SearchSelect
            value={cfg.field_key||""}
            options={fieldOpts}
            placeholder="Select field…"
            searchPlaceholder="Search fields…"
            emptyText="No people/lookup fields"
            minWidth={200}
            onChange={v=>{const f=fields.find(f2=>f2.api_key===v);onChange({...cfg,field_key:v,label:f?.name||v});}}
          />
        )}
      </div>
      <div style={{display:"flex",gap:3,flexShrink:0}}>
        <button onClick={()=>onMove(index,-1)} disabled={index===0} style={{background:"none",border:"none",cursor:index===0?"not-allowed":"pointer",color:C.text3,padding:3,opacity:index===0?0.3:1}}>↑</button>
        <button onClick={()=>onMove(index,1)} disabled={index===total-1} style={{background:"none",border:"none",cursor:index===total-1?"not-allowed":"pointer",color:C.text3,padding:3,opacity:index===total-1?0.3:1}}>↓</button>
        <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:3}}><Ic n="x" s={13}/></button>
      </div>
    </div>
  );
}

// ApprovalCard — one approval in the panel list
function ApprovalCard({ approval, onWithdraw, onRemind, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [sending,  setSending]  = useState(false);
  const chain = approval.approvers||[];
  const approvedCount = chain.filter(a=>a.status==="approved").length;
  const progress = chain.length?Math.round((approvedCount/chain.length)*100):0;
  const isPending = approval.status==="pending";

  const handleRemind = async()=>{
    setSending(true);
    await apiPost(`/approvals/${approval.id}/remind`).catch(()=>{});
    setSending(false); onRemind?.();
  };
  const handleWithdraw = async()=>{
    if(!confirm("Withdraw this approval request?"))return;
    await apiPost(`/approvals/${approval.id}/withdraw`).catch(()=>{});
    onWithdraw?.();
  };
  const copyLink = token=>{
    navigator.clipboard.writeText(`${window.location.origin}/approval/${token}`);
  };

  return (
    <div style={{borderRadius:12,border:`1.5px solid ${C.border}`,overflow:"hidden",marginBottom:10}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isPending?`${C.amber}08`:"white"}} onClick={()=>setExpanded(e=>!e)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.text1}}>{approval.title}</span>
            <StatusBadge status={approval.status}/>
          </div>
          <div style={{fontSize:11,color:C.text3,marginTop:3}}>
            {approval.mode?.charAt(0).toUpperCase()+approval.mode?.slice(1)} · {chain.length} approver{chain.length!==1?"s":""} · {new Date(approval.created_at).toLocaleDateString()}
            {approval.expires_at&&` · Expires ${new Date(approval.expires_at).toLocaleDateString()}`}
          </div>
        </div>
        {chain.length>0&&(
          <div style={{flexShrink:0,textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:3}}>{approvedCount}/{chain.length}</div>
            <div style={{width:56,height:4,borderRadius:99,background:C.surface2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${progress}%`,background:approval.status==="declined"?C.red:C.green,transition:"width 0.3s"}}/>
            </div>
          </div>
        )}
        <Ic n={expanded?"chevD":"chevR"} s={14} c={C.text3}/>
      </div>

      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:`1px solid ${C.border}`,background:"white"}}>
          <div style={{marginTop:14}}>
            {chain.map((a,i)=>{
              const sc=SCOLOR[a.status]||SCOLOR.pending;
              return <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.bg,border:`2px solid ${sc.border}`,fontSize:10,fontWeight:800,color:sc.text}}>
                  {a.status==="approved"?<Ic n="check" s={12} c={sc.text}/>:a.status==="declined"?<Ic n="x" s={12} c={sc.text}/>:i+1}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{a.name}</span>
                    {a.source_label&&<span style={{fontSize:10,color:C.text3}}>{a.source_label}</span>}
                    <StatusBadge status={a.status}/>
                    <button onClick={()=>copyLink(a.token)} title="Copy approval link" style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.text3}}><Ic n="copy" s={11}/></button>
                  </div>
                  {a.responded_at&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{SLABEL[a.status]} · {new Date(a.responded_at).toLocaleString()}</div>}
                  {a.note&&<div style={{marginTop:6,padding:"6px 10px",borderRadius:6,background:C.surface,border:`1px solid ${C.border}`,fontSize:12,color:C.text2,fontStyle:"italic",lineHeight:1.5}}>"{a.note}"</div>}
                </div>
              </div>;
            })}
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
            {isPending&&<button onClick={handleRemind} disabled={sending} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.amber}40`,background:C.amberLight,color:C.amber,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="bell" s={12} c={C.amber}/>{sending?"Sending…":"Send Reminder"}</button>}
            {isPending&&<button onClick={handleWithdraw} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"white",color:C.text3,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Withdraw</button>}
            <button onClick={onDelete} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.red}30`,background:C.redLight,color:C.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="trash" s={12} c={C.red}/>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// NewApprovalModal
function NewApprovalModal({ record, object, environment, users, fields, groups, onClose, onCreated }) {
  const [step,      setStep]      = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [title,     setTitle]     = useState("");
  const [summary,   setSummary]   = useState("");
  const [mode,      setMode]      = useState("sequential");
  const [majority,  setMajority]  = useState(null);
  const [approvers, setApprovers] = useState([]);
  const [expiresH,  setExpiresH]  = useState("");
  const [reminderH, setReminderH] = useState("");
  const [onApproved,setOnApproved]= useState("none");
  const [onDeclined,setOnDeclined]= useState("none");
  const [sendNow,   setSendNow]   = useState(true);
  const [templates, setTemplates] = useState([]);

  useEffect(()=>{
    apiGet(`/approvals/templates/list?environment_id=${environment?.id||""}`).then(d=>{if(Array.isArray(d))setTemplates(d);}).catch(()=>{});
  },[environment?.id]);

  const addApprover = ()=>setApprovers(p=>[...p,{type:"named",name:"",email:""}]);
  const removeApprover = i=>setApprovers(p=>p.filter((_,idx)=>idx!==i));
  const updateApprover = (i,cfg)=>setApprovers(p=>{const a=[...p];a[i]=cfg;return a;});
  const moveApprover = (i,dir)=>setApprovers(p=>{const a=[...p];const j=i+dir;if(j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a;});

  const loadTemplate = t=>{
    setMode(t.mode||"sequential");setMajority(t.majority_threshold||null);
    setExpiresH(t.expires_hours?String(t.expires_hours):"");setReminderH(t.reminder_hours?String(t.reminder_hours):"");
    setOnApproved(t.on_approved?.action||"none");setOnDeclined(t.on_declined?.action||"none");
    setApprovers(t.approver_configs||[]);
  };

  const approverValid = a =>
    a.type==="named" ? !!(a.email||"").trim()
    : a.type==="user"  ? !!a.user_id
    : a.type==="group" ? !!a.group_id
    : a.type==="field" ? !!a.field_key
    : false;
  const canProceed=[title.trim().length>0, approvers.length>0&&approvers.every(approverValid), true, true][step];
  const steps=["Details","Approvers","Options","Review"];

  const handleCreate=async()=>{
    setSaving(true);
    try {
      const result=await apiPost("/approvals",{
        environment_id:environment?.id,record_id:record?.id,object_id:object?.id,
        title,summary,approver_configs:approvers,mode,
        majority_threshold:mode==="majority"?(majority||Math.ceil(approvers.length/2)):null,
        on_approved:{action:onApproved},on_declined:{action:onDeclined},
        expires_hours:expiresH?parseInt(expiresH):null,
        reminder_hours:reminderH?parseInt(reminderH):null,
        send_immediately:sendNow,
      });
      if(result.error)throw new Error(result.error);
      onCreated(result);
    }catch(e){alert(e.message);}
    finally{setSaving(false);}
  };

  const inp={padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,width:"100%",boxSizing:"border-box"};

  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(15,23,41,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:600,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>New Approval Request</div>
            {record&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>On: {record.data?.first_name||record.data?.job_title||record.data?.name||"Record"}</div>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{display:"flex",padding:"16px 24px 0",gap:4}}>
          {steps.map((s,i)=>(
            <button key={s} onClick={()=>i<step&&setStep(i)} style={{padding:"5px 12px",borderRadius:99,border:"none",cursor:i<step?"pointer":"default",background:i===step?C.accent:i<step?C.accentLight:C.surface2,color:i===step?"white":i<step?C.accent:C.text3,fontSize:12,fontWeight:700,fontFamily:F}}>{s}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {step===0&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {templates.length>0&&<div style={{padding:"12px 14px",borderRadius:10,background:C.accentLight,border:`1px solid ${C.accent}20`}}>
                <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:8}}>Load from template</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {templates.map(t=><button key={t.id} onClick={()=>loadTemplate(t)} style={{padding:"4px 10px",borderRadius:99,border:`1px solid ${C.accent}40`,background:"white",color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{t.name}</button>)}
                </div>
              </div>}
              <label><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:6}}>Title *</div><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Approve Job Posting" style={inp}/></label>
              <label><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:6}}>Description</div><textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summarise what the approver needs to review…" rows={4} style={{...inp,resize:"vertical",lineHeight:1.5}}/></label>
            </div>
          )}
          {step===1&&(
            <div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>Approval Mode</div>
                <div style={{display:"flex",gap:8}}>
                  {[{value:"sequential",label:"Sequential",desc:"One at a time, in order"},{value:"parallel",label:"Parallel",desc:"All at once, all must approve"},{value:"majority",label:"Majority",desc:"Configurable majority required"}].map(m=>(
                    <button key={m.value} onClick={()=>setMode(m.value)} style={{flex:1,padding:"10px 8px",borderRadius:10,border:"none",cursor:"pointer",background:mode===m.value?C.accent:C.surface2,color:mode===m.value?"white":C.text2,fontSize:11,fontWeight:700,fontFamily:F,textAlign:"left"}}>
                      <div>{m.label}</div><div style={{fontWeight:400,fontSize:10,opacity:0.75,marginTop:2}}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {mode==="majority"&&<div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:C.text2,fontWeight:600}}>Required:</span>
                <input type="number" min={1} value={majority||Math.ceil(approvers.length/2)||1} onChange={e=>setMajority(parseInt(e.target.value))} style={{...inp,width:64}}/>
                <span style={{fontSize:12,color:C.text3}}>of {approvers.length||"?"}</span>
              </div>}
              {approvers.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.text3,borderRadius:10,border:`1.5px dashed ${C.border}`,marginBottom:12}}>No approvers yet — add at least one</div>}
              {approvers.map((cfg,i)=><ApproverRow key={i} cfg={cfg} index={i} total={approvers.length} users={users} fields={fields} groups={groups} onChange={c=>updateApprover(i,c)} onRemove={()=>removeApprover(i)} onMove={(_,dir)=>moveApprover(i,dir)}/>)}
              <button onClick={addApprover} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:9,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.text3,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="plus" s={12}/>Add approver</button>
            </div>
          )}
          {step===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",gap:12}}>
                <label style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:6}}>Expires after (hours)</div><input type="number" min={1} placeholder="e.g. 48" value={expiresH} onChange={e=>setExpiresH(e.target.value)} style={inp}/><div style={{fontSize:11,color:C.text3,marginTop:4}}>Leave blank for no expiry</div></label>
                <label style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:6}}>Reminder after (hours)</div><input type="number" min={1} placeholder="e.g. 24" value={reminderH} onChange={e=>setReminderH(e.target.value)} style={inp}/><div style={{fontSize:11,color:C.text3,marginTop:4}}>Hours before sending reminder</div></label>
              </div>
              <div><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>On Approval</div>
                <select value={onApproved} onChange={e=>setOnApproved(e.target.value)} style={inp}>
                  <option value="none">No automatic action</option>
                  <option value="notify_requester">Notify requester</option>
                  <option value="next_workflow_step">Move to next workflow step</option>
                  <option value="update_status_approved">Update record status → Approved</option>
                </select>
              </div>
              <div><div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>On Decline</div>
                <select value={onDeclined} onChange={e=>setOnDeclined(e.target.value)} style={inp}>
                  <option value="none">No automatic action</option>
                  <option value="notify_requester">Notify requester</option>
                  <option value="back_to_draft">Move record back to Draft</option>
                  <option value="update_status_declined">Update record status → Declined</option>
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                <input type="checkbox" checked={sendNow} onChange={e=>setSendNow(e.target.checked)} style={{width:16,height:16,accentColor:C.accent}}/>
                <span style={{fontSize:13,fontWeight:600,color:C.text2}}>Send approval emails immediately on creation</span>
              </label>
            </div>
          )}
          {step===3&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[["Title",title],["Mode",mode+(mode==="majority"?` (${majority||Math.ceil(approvers.length/2)} of ${approvers.length})`:"")+(" · "+approvers.length+" approver"+(approvers.length!==1?"s":""))],["Expires",expiresH?`${expiresH} hours`:"No expiry"],["Reminder",reminderH?`After ${reminderH} hours`:"None"],["On approval",onApproved.replace(/_/g," ")],["On decline",onDeclined.replace(/_/g," ")],["Send emails",sendNow?"Yes — immediately":"No — save as draft"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                  <span style={{color:C.text3,width:130,flexShrink:0,fontWeight:600}}>{k}</span>
                  <span style={{color:C.text1}}>{v}</span>
                </div>
              ))}
              {summary&&<div style={{padding:"12px 14px",borderRadius:10,background:C.surface,fontSize:13,color:C.text2,lineHeight:1.6}}>{summary}</div>}
            </div>
          )}
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
          <button onClick={()=>step>0?setStep(s=>s-1):onClose()} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>{step===0?"Cancel":"Back"}</button>
          {step<3?(
            <button onClick={()=>setStep(s=>s+1)} disabled={!canProceed} style={{padding:"9px 20px",borderRadius:9,border:"none",background:canProceed?C.accent:C.surface2,color:canProceed?"white":C.text3,fontSize:13,fontWeight:700,cursor:canProceed?"pointer":"not-allowed",fontFamily:F}}>Next →</button>
          ):(
            <button onClick={handleCreate} disabled={saving} style={{padding:"9px 22px",borderRadius:9,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:7,opacity:saving?0.7:1}}>
              <Ic n="send" s={13} c="white"/>{saving?"Creating…":sendNow?"Create & Send":"Create"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Main panel
export default function ApprovalsPanel({ record, object, environment }) {
  const [approvals, setApprovals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [users,     setUsers]     = useState([]);
  const [fields,    setFields]    = useState([]);
  const [groups,    setGroups]    = useState([]);

  const load = useCallback(async()=>{
    if(!record?.id){setLoading(false);return;}
    setLoading(true);
    const [list,u,f,g]=await Promise.all([
      apiGet(`/approvals?record_id=${record.id}`),
      apiGet("/users"),
      object?.id?apiGet(`/fields?object_id=${object.id}`):Promise.resolve([]),
      apiGet(`/groups?environment_id=${environment?.id||""}`).catch(()=>[]),
    ]);
    setApprovals(Array.isArray(list)?list:[]);
    setUsers(Array.isArray(u)?u:[]);
    setFields(Array.isArray(f)?f:[]);
    setGroups(Array.isArray(g)?g:[]);
    setLoading(false);
  },[record?.id,object?.id,environment?.id]);

  useEffect(()=>{load();},[load]);

  const handleDelete=async id=>{
    if(!confirm("Delete this approval request?"))return;
    await apiDelete(`/approvals/${id}`).catch(()=>{});
    load();
  };

  const pending  = approvals.filter(a=>a.status==="pending");
  const resolved = approvals.filter(a=>a.status!=="pending");

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Ic n="shield" s={14} c={C.purple}/>
          <span style={{fontSize:13,fontWeight:700,color:C.text1}}>Approvals</span>
          {pending.length>0&&<span style={{fontSize:11,fontWeight:800,padding:"1px 7px",borderRadius:99,background:C.amberLight,color:C.amber}}>{pending.length} pending</span>}
        </div>
        <button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:`1.5px solid ${C.purple}40`,background:C.purpleLight,color:C.purple,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>
          <Ic n="plus" s={12} c={C.purple}/>New Approval
        </button>
      </div>

      {loading&&<div style={{textAlign:"center",padding:"24px 0",color:C.text3,fontSize:13}}>Loading…</div>}

      {!loading&&approvals.length===0&&(
        <div style={{textAlign:"center",padding:"28px 0",borderRadius:12,border:`1.5px dashed ${C.border}`,color:C.text3}}>
          <Ic n="shield" s={28} c={C.border}/>
          <div style={{fontSize:13,fontWeight:600,marginTop:10}}>No approval requests</div>
          <div style={{fontSize:12,marginTop:4}}>Request approvals for this record — jobs, offers, changes, anything.</div>
        </div>
      )}

      {!loading&&pending.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Pending</div>
          {pending.map(a=><ApprovalCard key={a.id} approval={a} onRemind={load} onWithdraw={load} onDelete={()=>handleDelete(a.id)}/>)}
        </div>
      )}

      {!loading&&resolved.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Resolved</div>
          {resolved.map(a=><ApprovalCard key={a.id} approval={a} onRemind={load} onWithdraw={load} onDelete={()=>handleDelete(a.id)}/>)}
        </div>
      )}

      {showNew&&<NewApprovalModal record={record} object={object} environment={environment} users={users} fields={fields} groups={groups} onClose={()=>setShowNew(false)} onCreated={()=>{setShowNew(false);load();}}/>}
    </div>
  );
}
