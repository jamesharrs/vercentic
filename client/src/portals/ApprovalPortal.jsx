/**
 * client/src/portals/ApprovalPortal.jsx
 * Public page at /approval/:token — no auth required
 */
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const PATHS = {
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  clock:   "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v-4m0-4h.01",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  arrow:   "M5 12h14M12 5l7 7-7 7",
  info:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v-4m0-4h.01",
  warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01",
};
function Ic({ n, s=18, c="currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]}/></svg>;
}

const STATUS_COLOR = {
  approved: { bg:"#dcfce7", text:"#16a34a", border:"#bbf7d0" },
  declined: { bg:"#fee2e2", text:"#dc2626", border:"#fecaca" },
  pending:  { bg:"#f1f5f9", text:"#64748b", border:"#e2e8f0" },
  withdrawn:{ bg:"#fef9c3", text:"#b45309", border:"#fde68a" },
};
const STATUS_LABEL = { approved:"Approved", declined:"Declined", pending:"Pending", withdrawn:"Withdrawn" };

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.pending;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px",
    borderRadius:99, background:s.bg, color:s.text, border:`1px solid ${s.border}`, fontSize:12, fontWeight:700 }}>
    {STATUS_LABEL[status] || status}
  </span>;
}

function modeLabel(mode, threshold, total) {
  if (mode==="sequential") return "Sequential — each approver in order";
  if (mode==="parallel")   return "Parallel — all approvers simultaneously";
  if (mode==="majority")   return `Majority — ${threshold||Math.ceil(total/2)} of ${total} required`;
  return mode;
}

export default function ApprovalPortal() {
  const token = window.location.pathname.split("/").filter(Boolean)[1];
  const urlParams = new URLSearchParams(window.location.search);
  const initAction = urlParams.get("action");

  const [loading,    setLoading]    = useState(true);
  const [data,       setData]       = useState(null);
  const [error,      setError]      = useState(null);
  const [action,     setAction]     = useState(initAction || null);
  const [note,       setNote]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [outcome,    setOutcome]    = useState(null);

  useEffect(() => {
    if (!token) { setError("Invalid approval link."); setLoading(false); return; }
    fetch(`${API_BASE}/api/approvals/token/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        if (d.already_responded) { setDone(true); setOutcome(d.approver.status); }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!action) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/api/approvals/token/${token}/respond`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setDone(true); setOutcome(action==="approve"?"approved":"declined");
      const refreshed = await fetch(`${API_BASE}/api/approvals/token/${token}`).then(r2=>r2.json());
      if (!refreshed.error) setData(refreshed);
    } catch(e) { alert(e.message||"Something went wrong."); }
    finally { setSubmitting(false); }
  };

  const page = { minHeight:"100vh", background:"linear-gradient(135deg,#f0eaf8 0%,#eef2ff 50%,#f0f9ff 100%)", fontFamily:"'Geist','Inter',-apple-system,sans-serif" };
  const card = { background:"white", borderRadius:16, border:"1px solid #e8ecf8", padding:"24px 28px", marginBottom:16, boxShadow:"0 2px 12px rgba(67,97,238,.04)" };

  if (loading) return <div style={page}><div style={{textAlign:"center",padding:"80px 0",color:"#94a3b8",fontSize:14,fontWeight:600}}>Loading…</div></div>;

  if (error) return (
    <div style={page}>
      <div style={{...card, maxWidth:480, margin:"60px auto"}}>
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic n="warning" s={26} c="#dc2626"/></div>
          <div style={{fontSize:18,fontWeight:700,color:"#0f1729",marginBottom:8}}>Approval Not Found</div>
          <div style={{fontSize:14,color:"#64748b",lineHeight:1.6}}>{error==="Approval not found"||error==="Approver not found"?"This approval link is invalid or has expired.":error}</div>
        </div>
      </div>
    </div>
  );

  const { approval, approver, chain } = data;
  const approvedCount = chain.filter(a=>a.status==="approved").length;
  const declinedCount = chain.filter(a=>a.status==="declined").length;
  const progress = Math.round((approvedCount/chain.length)*100);

  return (
    <div style={page}>
      {/* Header */}
      <div style={{background:"white",borderBottom:"1px solid #e8ecf8",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#0f1729",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"white"}}>V</div>
          <span style={{fontSize:16,fontWeight:800,color:"#0f1729",letterSpacing:"-0.3px"}}>Vercentic</span>
        </div>
        <div style={{fontSize:13,color:"#94a3b8"}}>Approval Portal</div>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"32px 20px 64px"}}>
        {/* Summary card */}
        <div style={card}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Approval Request</div>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0f1729",letterSpacing:"-0.5px"}}>{approval.title}</h1>
              {approval.summary && <p style={{margin:"10px 0 0",fontSize:14,color:"#475569",lineHeight:1.65}}>{approval.summary}</p>}
            </div>
            <StatusBadge status={approval.status}/>
          </div>
          <div style={{marginTop:18,display:"flex",flexWrap:"wrap",gap:12}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,background:"#f1f5f9",border:"1px solid #e2e8f0",fontSize:12,color:"#64748b"}}>
              <Ic n="shield" s={12} c="#64748b"/>{modeLabel(approval.mode,approval.majority_threshold,chain.length)}
            </span>
            {approval.expires_at && <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,background:"#f1f5f9",border:"1px solid #e2e8f0",fontSize:12,color:"#64748b"}}>
              <Ic n="clock" s={12} c="#64748b"/>Expires {new Date(approval.expires_at).toLocaleDateString()}
            </span>}
          </div>
          <div style={{marginTop:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>{approvedCount} of {chain.length} approved{declinedCount>0?` · ${declinedCount} declined`:""}</span>
              <span style={{fontSize:12,color:"#64748b",fontWeight:700}}>{progress}%</span>
            </div>
            <div style={{height:6,borderRadius:99,background:"#e8ecf8",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:declinedCount>0?"#dc2626":"#16a34a",width:`${progress}%`,transition:"width 0.5s"}}/>
            </div>
          </div>
        </div>

        {/* Chain */}
        <div style={card}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Approval Chain</div>
          {chain.map((a,i) => {
            const sc = STATUS_COLOR[a.status]||STATUS_COLOR.pending;
            const isThis = a.is_this;
            return <div key={a.id}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 16px",borderRadius:12,background:isThis?"#f8f7ff":"transparent",border:isThis?"1.5px solid #c4b5fd":"1px solid transparent",marginBottom:4}}>
                <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.bg,border:`2px solid ${sc.border}`,fontSize:12,fontWeight:800,color:sc.text}}>
                  {a.status==="approved"?<Ic n="check" s={14} c={sc.text}/>:a.status==="declined"?<Ic n="x" s={14} c={sc.text}/>:i+1}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:isThis?700:500,color:"#0f1729"}}>{a.name}</span>
                    {a.source_label&&<span style={{fontSize:11,color:"#94a3b8"}}>{a.source_label}</span>}
                    {isThis&&<span style={{fontSize:11,fontWeight:700,color:"#7c3aed",background:"#f3f0ff",padding:"2px 8px",borderRadius:99}}>You</span>}
                    <StatusBadge status={a.status}/>
                  </div>
                  {a.responded_at&&<div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{STATUS_LABEL[a.status]} · {new Date(a.responded_at).toLocaleString()}</div>}
                  {a.note&&<div style={{marginTop:8,padding:"8px 12px",borderRadius:8,background:"#f8fafc",border:"1px solid #e8ecf8",fontSize:13,color:"#374151",fontStyle:"italic",lineHeight:1.5}}>"{a.note}"</div>}
                </div>
              </div>
              {i<chain.length-1&&<div style={{display:"flex",justifyContent:"flex-start",paddingLeft:30,marginBottom:4}}><Ic n="arrow" s={14} c="#cbd5e1"/></div>}
            </div>;
          })}
        </div>

        {/* Action / Done */}
        {done ? (
          <div style={card}>
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{width:64,height:64,borderRadius:"50%",margin:"0 auto 18px",display:"flex",alignItems:"center",justifyContent:"center",background:outcome==="approved"?"#dcfce7":"#fee2e2"}}>
                <Ic n={outcome==="approved"?"check":"x"} s={28} c={outcome==="approved"?"#16a34a":"#dc2626"}/>
              </div>
              <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:"#0f1729"}}>{outcome==="approved"?"Approved!":"Declined"}</h2>
              <p style={{margin:0,fontSize:14,color:"#64748b",lineHeight:1.6}}>{outcome==="approved"?"Your approval has been recorded. Thank you.":"Your response has been recorded. The requester has been notified."}</p>
              {approval.status!=="pending"&&<div style={{marginTop:20,padding:"12px 16px",borderRadius:10,background:(STATUS_COLOR[approval.status]||STATUS_COLOR.pending).bg,border:`1px solid ${(STATUS_COLOR[approval.status]||STATUS_COLOR.pending).border}`,fontSize:13,color:(STATUS_COLOR[approval.status]||STATUS_COLOR.pending).text,fontWeight:700}}>Overall result: {STATUS_LABEL[approval.status]||approval.status}</div>}
            </div>
          </div>
        ) : approver.status==="pending" && approval.status==="pending" ? (
          <div style={card}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Your Response</div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              {["approve","decline"].map(act => (
                <button key={act} onClick={()=>setAction(act)} style={{flex:1,padding:"12px 16px",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s",
                  background:action===act?(act==="approve"?"#16a34a":"#dc2626"):"transparent",
                  color:action===act?"white":(act==="approve"?"#16a34a":"#dc2626"),
                  border:`2px solid ${act==="approve"?"#16a34a":"#dc2626"}`,
                  transform:action===act?"translateY(-1px)":"none",
                  boxShadow:action===act?`0 4px 12px ${act==="approve"?"rgba(22,163,74,.25)":"rgba(220,38,38,.25)"}`:"none"}}>
                  <Ic n={act==="approve"?"check":"x"} s={16} c={action===act?"white":(act==="approve"?"#16a34a":"#dc2626")}/>
                  {act==="approve"?"Approve":"Decline"}
                </button>
              ))}
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}>
                Note{action==="decline"?" (required for declines)":" (optional)"}
              </label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4}
                placeholder={action==="decline"?"Please explain why you are declining…":"Add a comment or condition (optional)…"}
                style={{width:"100%",boxSizing:"border-box",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",resize:"vertical",lineHeight:1.6,color:"#0f1729"}}/>
            </div>
            <button onClick={handleSubmit} disabled={!action||submitting||(action==="decline"&&!note.trim())}
              style={{width:"100%",padding:"14px 20px",borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",
                background:!action?"#e2e8f0":action==="approve"?"#16a34a":"#dc2626",
                color:!action?"#94a3b8":"white",opacity:submitting?0.7:1,transition:"all 0.15s",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {submitting?"Submitting…":!action?"Select Approve or Decline above":action==="approve"?"Confirm Approval":"Confirm Decline"}
            </button>
            {action==="decline"&&!note.trim()&&<p style={{margin:"8px 0 0",fontSize:12,color:"#dc2626",textAlign:"center"}}>A note is required when declining.</p>}
          </div>
        ) : (
          <div style={card}>
            <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8"}}>
              <p style={{margin:"12px 0 0",fontSize:14}}>{approval.status!=="pending"?`This approval has been ${approval.status}.`:"Your response has already been recorded."}</p>
            </div>
          </div>
        )}

        <div style={{textAlign:"center",padding:"16px 0",fontSize:12,color:"#94a3b8"}}>
          Powered by Vercentic · This link is unique to you and should not be shared.
        </div>
      </div>
    </div>
  );
}
