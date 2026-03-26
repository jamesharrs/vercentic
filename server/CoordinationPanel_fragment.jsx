// ─── Interview Coordination Panel ────────────────────────────────────────────
const STATUS_LABELS = {
  collecting_availability: { label:"Collecting availability", color:"#f59e0b", bg:"#fef3c7" },
  confirmed:   { label:"Interview confirmed", color:"#0ca678", bg:"#d1fae5" },
  no_overlap:  { label:"No overlap — action needed", color:"#ef4444", bg:"#fee2e2" },
  cancelled:   { label:"Cancelled", color:"#6b7280", bg:"#f3f4f6" },
};

const CoordinationPanel = ({ record, environment }) => {
  const [runs,    setRuns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const appUrl = (typeof window !== "undefined" && window.location.origin) || "https://client-lovat-nu-33.vercel.app";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/interview-coordinator/runs?candidate_id=${record.id}`).then(r => r.json());
      setRuns(Array.isArray(r) ? r : []);
    } catch(e) {}
    setLoading(false);
  }, [record.id]);

  useEffect(() => { load(); }, [load]);

  const startNew = async () => {
    setStarting(true);
    try {
      const r = await fetch("/api/interview-coordinator/run", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ candidate_id: record.id, environment_id: environment?.id }),
      }).then(r => r.json());
      if (r.ok) await load();
      else alert(r.error || "Failed to start coordination");
    } catch(e) { alert(e.message); }
    setStarting(false);
  };

  const deleteRun = async (id) => {
    await fetch(`/api/interview-coordinator/runs/${id}`, { method:"DELETE" });
    setRuns(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div style={{padding:"20px 0", textAlign:"center", color:C.text3, fontSize:13}}>Loading…</div>;

  return (
    <div>
      {/* Start new */}
      <div style={{marginBottom:16, display:"flex", justifyContent:"flex-end"}}>
        <button onClick={startNew} disabled={starting}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,
            border:`1.5px solid ${C.accent}`,background:C.accentLight,color:C.accent,
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:starting?.6:1}}>
          <Ic n="plus" s={13}/>{starting?"Starting…":"Start Coordination"}
        </button>
      </div>

      {!runs.length && (
        <div style={{textAlign:"center",padding:"32px 16px",color:C.text3}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.accentLight,
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <Ic n="calendar" s={22} c={C.accent}/>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:4}}>No coordination runs yet</div>
          <div style={{fontSize:12,lineHeight:1.5}}>Start one to collect availability from the hiring manager and candidate automatically.</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {runs.map(run => {
          const st = STATUS_LABELS[run.status] || STATUS_LABELS.collecting_availability;
          const hmR  = run.hm_request;
          const cR   = run.cand_request;
          return (
            <div key={run.id} style={{background:"#f9fafb",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e5e7eb",background:"white"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{run.job_title}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:1}}>with {run.hiring_manager_name||"Hiring Manager"} · {run.duration_minutes||45} min</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                  background:st.bg,color:st.color,whiteSpace:"nowrap"}}>{st.label}</span>
                <button onClick={()=>deleteRun(run.id)}
                  style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.text3,display:"flex"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
                  onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
                  <Ic n="trash" s={14}/>
                </button>
              </div>

              {/* Availability status */}
              <div style={{padding:"10px 14px",display:"flex",gap:12}}>
                {[
                  {label:"Hiring Manager", req:hmR, token:hmR?.token},
                  {label:"Candidate",      req:cR,  token:cR?.token},
                ].map(({label,req:r,token:tok}) => (
                  <div key={label} style={{flex:1,background:"white",borderRadius:8,border:"1px solid #e5e7eb",padding:"8px 10px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>
                    {!r ? (
                      <span style={{fontSize:11,color:C.text3}}>—</span>
                    ) : r.status === "responded" ? (
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:"#0ca678",flexShrink:0}}/>
                        <span style={{fontSize:11,fontWeight:600,color:"#0ca678"}}>Responded ({(r.selected_slots||[]).length} slots)</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                          <span style={{width:7,height:7,borderRadius:"50%",background:"#f59e0b",flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#92400e",fontWeight:600}}>Awaiting response</span>
                        </div>
                        {tok && (
                          <button onClick={()=>navigator.clipboard.writeText(`${appUrl}/availability/${tok}`).then(()=>alert("Link copied!"))}
                            style={{fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:F,textDecoration:"underline"}}>
                            Copy link
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Confirmed slot */}
              {run.confirmed_slot && (
                <div style={{padding:"8px 14px",background:"#d1fae5",borderTop:"1px solid #a7f3d0",
                  fontSize:12,fontWeight:700,color:"#065f46",display:"flex",alignItems:"center",gap:8}}>
                  <Ic n="check" s={13} c="#0ca678"/>
                  Confirmed: {new Date(run.confirmed_slot).toLocaleString("en-GB",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
