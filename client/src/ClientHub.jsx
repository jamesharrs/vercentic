/**
 * ClientHub.jsx — RPO Client Performance Hub
 * Shows when the environment has a client_companies object (RPO template).
 */

import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:      "#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:   "#111827",  text2:"#4b5563",  text3:"#9ca3af",
  accent:  "#3b5bdb",  green:"#0ca678",  amber:"#f59f00",
  red:     "#e03131",  teal:"#0891b2",   purple:"#7048e8",
};

function getSlaRag(job) {
  const slaTarget  = Number(job.data?.sla_target_days) || null;
  const dateOpened = job.data?.date_opened;
  if (!dateOpened) return null;
  const daysOpen = Math.floor((Date.now() - new Date(dateOpened)) / 86400000);
  if (!slaTarget) return { days:daysOpen, color:C.text3, label:`${daysOpen}d open`, status:"none" };
  const pct = daysOpen / slaTarget;
  if (pct < 0.6) return { days:daysOpen, sla:slaTarget, pct, color:C.green,  label:`${daysOpen}/${slaTarget}d`, status:"green" };
  if (pct < 0.9) return { days:daysOpen, sla:slaTarget, pct, color:C.amber,  label:`${daysOpen}/${slaTarget}d`, status:"amber" };
  return            { days:daysOpen, sla:slaTarget, pct, color:C.red,   label:`${daysOpen}/${slaTarget}d`, status:"red" };
}

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    building:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    users:     "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    check:     "M20 6L9 17l-5-5",
    clock:     "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
    alert:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    trending:  "M23 6l-9.5 9.5-5-5L1 17M17 6h6v6",
    dollar:    "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    chevR:     "M9 18l6-6-6-6",
    refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};


const KpiCard = ({ label, value, sub, color=C.accent, icon }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
    padding:"18px 20px", display:"flex", flexDirection:"column", gap:4 }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
      {icon && <div style={{ width:28, height:28, borderRadius:8, background:`${color}15`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Ic n={icon} s={14} c={color}/>
      </div>}
    </div>
    <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{sub}</div>}
  </div>
);

const RagBadge = ({ rag }) => {
  if (!rag) return <span style={{ fontSize:11, color:C.text3 }}>—</span>;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px",
      borderRadius:99, fontSize:11, fontWeight:700,
      background:`${rag.color}15`, color:rag.color, border:`1px solid ${rag.color}30` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:rag.color, flexShrink:0 }}/>
      {rag.label}
    </span>
  );
};

const ClientCard = ({ client, selected, onClick }) => {
  const name = client.data?.company_name || client.data?.name || "Unnamed Client";
  const industry = client.data?.industry || "";
  const status = client.data?.account_status || "Active";
  const statusColor = status==="Active" ? C.green : status==="Prospect" ? C.amber : C.text3;
  return (
    <div onClick={onClick}
      style={{ background:C.surface, border:`2px solid ${selected?C.accent:C.border}`,
        borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"all .15s",
        boxShadow: selected ? `0 0 0 3px ${C.accent}20` : "none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${C.accent}15`,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ic n="building" s={18} c={C.accent}/>
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text1, whiteSpace:"nowrap",
            overflow:"hidden", textOverflow:"ellipsis" }}>{name}</div>
          {industry && <div style={{ fontSize:11, color:C.text3 }}>{industry}</div>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:statusColor, flexShrink:0 }}/>
        <span style={{ fontSize:11, color:statusColor, fontWeight:600 }}>{status}</span>
      </div>
    </div>
  );
};

const PipelineFunnel = ({ links, workflows }) => {
  if (!links.length) return (
    <div style={{ textAlign:"center", padding:32, color:C.text3, fontSize:13 }}>
      No pipeline data for this client's roles
    </div>
  );
  const stageCounts = {};
  for (const l of links) {
    const s = l.current_stage_name || "Unknown";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  }
  let stageOrder = [];
  if (workflows.length) {
    const steps = (workflows[0].steps || []).sort((a,b) => a.step_order - b.step_order);
    stageOrder = steps.map(s => s.name);
  }
  const allStages = [
    ...stageOrder.filter(s => stageCounts[s]),
    ...Object.keys(stageCounts).filter(s => !stageOrder.includes(s)),
  ];
  const maxCount = Math.max(...allStages.map(s => stageCounts[s] || 0), 1);
  const stageColors = [C.accent, C.purple, C.teal, C.green, C.amber];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {allStages.map((stage, i) => {
        const count = stageCounts[stage] || 0;
        const w = (count / maxCount) * 100;
        const col = stageColors[i % stageColors.length];
        return (
          <div key={stage} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:130, fontSize:12, color:C.text2, fontWeight:500,
              textAlign:"right", flexShrink:0, whiteSpace:"nowrap",
              overflow:"hidden", textOverflow:"ellipsis" }}>{stage}</div>
            <div style={{ flex:1, height:22, borderRadius:6, background:"#f0f2f5", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${w}%`, borderRadius:6, background:col,
                display:"flex", alignItems:"center", paddingLeft:8 }}>
                {w > 15 && <span style={{ fontSize:11, fontWeight:700, color:"white" }}>{count}</span>}
              </div>
            </div>
            {w <= 15 && <span style={{ fontSize:11, fontWeight:700, color:col, minWidth:20 }}>{count}</span>}
          </div>
        );
      })}
    </div>
  );
};


export default function ClientHub({ environment, onNavigate }) {
  const [clients,     setClients]     = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [jobs,        setJobs]        = useState([]);
  const [placements,  setPlacements]  = useState([]);
  const [links,       setLinks]       = useState([]);
  const [workflows,   setWorkflows]   = useState([]);
  const [objects,     setObjects]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [statusFilter,setStatusFilter]= useState("open");

  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true); setError(null);
    try {
      const allObjects = await api.get(`/objects?environment_id=${envId}`);
      const objMap = {};
      for (const o of (Array.isArray(allObjects) ? allObjects : [])) objMap[o.slug] = o;
      setObjects(objMap);

      if (objMap.client_companies) {
        const cr = await api.get(`/records?object_id=${objMap.client_companies.id}&environment_id=${envId}&limit=100`);
        const cRecs = cr.records || cr || [];
        setClients(cRecs);
        if (cRecs.length && !selectedId) setSelectedId(cRecs[0].id);
      }
      if (objMap.jobs) {
        const jr = await api.get(`/records?object_id=${objMap.jobs.id}&environment_id=${envId}&limit=200`);
        setJobs(jr.records || jr || []);
      }
      if (objMap.placements) {
        const pr = await api.get(`/records?object_id=${objMap.placements.id}&environment_id=${envId}&limit=200`);
        setPlacements(pr.records || pr || []);
      }
      const lnk = await api.get(`/records/people-links?environment_id=${envId}`).catch(() => []);
      setLinks(Array.isArray(lnk) ? lnk : (lnk?.links || []));

      const wfs = await api.get(`/workflows?environment_id=${envId}`).catch(() => []);
      const wfArr = Array.isArray(wfs) ? wfs : [];
      const wfsWithSteps = await Promise.all(wfArr.map(async wf => {
        const steps = await api.get(`/workflows/${wf.id}/steps`).catch(() => []);
        return { ...wf, steps: Array.isArray(steps) ? steps : [] };
      }));
      setWorkflows(wfsWithSteps);
    } catch(e) { setError(e.message || "Failed to load"); }
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  const selectedClient = clients.find(c => c.id === selectedId);
  const clientName = selectedClient?.data?.company_name || selectedClient?.data?.name || "";

  const clientJobs = jobs.filter(j => {
    if (!selectedId) return true;
    const jc = j.data?.client_company;
    if (!jc) return false;
    return jc === clientName || (clientName && jc.toLowerCase().includes(clientName.toLowerCase().slice(0,5)));
  });

  const activeJobs = statusFilter==="open"
    ? clientJobs.filter(j => !["Filled","Cancelled","On Hold"].includes(j.data?.status))
    : clientJobs;

  const clientPlacements = placements.filter(p => {
    if (!selectedId) return true;
    const pc = p.data?.client_company;
    return pc && clientName && pc.toLowerCase().includes(clientName.toLowerCase().slice(0,5));
  });

  const clientLinks = links.filter(l => activeJobs.some(j => j.id === l.record_id));
  const openJobs    = clientJobs.filter(j => ["Open","Sourcing","Shortlisted","Interviewing","Offer Stage","Brief Received","Approved"].includes(j.data?.status));
  const atRisk      = openJobs.filter(j => getSlaRag(j)?.status === "red");
  const breaching   = openJobs.filter(j => getSlaRag(j)?.status === "amber");
  const slaCompliant= openJobs.filter(j => ["green","none",null].includes(getSlaRag(j)?.status));
  const slaRate     = openJobs.length ? Math.round((slaCompliant.length/openJobs.length)*100) : 100;
  const openJobsWithDays = openJobs.filter(j => j.data?.date_opened);
  const avgDays = openJobsWithDays.length
    ? Math.round(openJobsWithDays.reduce((s,j) => s+Math.floor((Date.now()-new Date(j.data.date_opened))/86400000),0)/openJobsWithDays.length) : 0;
  const totalFees = clientPlacements.reduce((s,p) => s+(Number(p.data?.placement_fee)||0), 0);
  const clientWorkflows = workflows.filter(w => clientLinks.some(l => l.workflow_id===w.id));

  if (!envId) return <div style={{padding:40,textAlign:"center",color:C.text3,fontFamily:F}}>No environment selected.</div>;

  if (loading) return (
    <div style={{padding:40,textAlign:"center",color:C.text3,fontFamily:F,fontSize:14}}>
      <div style={{marginBottom:8}}>Loading client data…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,margin:"0 auto",borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:C.accent,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  if (!objects.client_companies) return (
    <div style={{padding:48,textAlign:"center",fontFamily:F}}>
      <div style={{width:56,height:56,borderRadius:16,background:`${C.amber}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Ic n="building" s={28} c={C.amber}/>
      </div>
      <div style={{fontSize:18,fontWeight:700,color:C.text1,marginBottom:8}}>Client Hub not available</div>
      <div style={{fontSize:14,color:C.text2,maxWidth:360,margin:"0 auto",lineHeight:1.6}}>
        Requires the <strong>RPO Provider</strong> template. Provision a new environment with that template to enable client management, SLA tracking and placement reporting.
      </div>
    </div>
  );

  if (error) return <div style={{padding:32,fontFamily:F}}><div style={{padding:16,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,color:C.red,fontSize:13}}>{error}</div></div>;


  return (
    <div style={{fontFamily:F,minHeight:"100vh",background:C.bg}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 32px",
        display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Client Performance Hub</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>{clients.length} client{clients.length!==1?"s":""} · {environment?.name}</div>
        </div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",
          borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,
          fontSize:12,fontWeight:600,cursor:"pointer",color:C.text2,fontFamily:F}}>
          <Ic n="refresh" s={12} c={C.text2}/> Refresh
        </button>
      </div>

      <div style={{padding:32}}>
        {clients.length>0 && (
          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Client</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
              {clients.map(c => <ClientCard key={c.id} client={c} selected={c.id===selectedId} onClick={()=>setSelectedId(c.id)}/>)}
            </div>
          </div>
        )}
        {clients.length===0 && (
          <div style={{padding:24,background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,marginBottom:28,display:"flex",alignItems:"center",gap:12}}>
            <Ic n="alert" s={18} c={C.amber}/>
            <div style={{fontSize:13,color:C.text2}}>No client companies found. Add records to the <strong>Client Companies</strong> object to see per-client analytics.</div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:28}}>
          <KpiCard label="Open Roles"     value={openJobs.length}  icon="briefcase" color={C.accent}/>
          <KpiCard label="Avg Days Open"  value={avgDays?`${avgDays}d`:"—"} sub={openJobs.length?`across ${openJobs.length} live roles`:"no open roles"} icon="clock" color={avgDays>60?C.red:avgDays>30?C.amber:C.teal}/>
          <KpiCard label="SLA Compliance" value={openJobs.length?`${slaRate}%`:"—"} sub={atRisk.length?`${atRisk.length} roles breaching`:"all on track"} icon="trending" color={slaRate>80?C.green:slaRate>60?C.amber:C.red}/>
          <KpiCard label="Placements"     value={clientPlacements.length} sub="confirmed hires" icon="check" color={C.green}/>
          <KpiCard label="Total Fees"     value={totalFees>0?`$${(totalFees/1000).toFixed(0)}k`:"—"} sub="placement revenue" icon="dollar" color={C.purple}/>
        </div>

        {(atRisk.length>0||breaching.length>0) && (
          <div style={{marginBottom:28,padding:"12px 16px",borderRadius:12,
            background:atRisk.length>0?"#fef2f2":"#fffbeb",
            border:`1px solid ${atRisk.length>0?"#fecaca":"#fde68a"}`,
            display:"flex",alignItems:"center",gap:10}}>
            <Ic n="alert" s={16} c={atRisk.length>0?C.red:C.amber}/>
            <div style={{fontSize:13,color:C.text1}}>
              {atRisk.length>0 && <><strong style={{color:C.red}}>{atRisk.length} role{atRisk.length!==1?"s":""} breaching SLA</strong>{breaching.length>0?" · ":""}</>}
              {breaching.length>0 && <strong style={{color:C.amber}}>{breaching.length} approaching SLA limit</strong>}
            </div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:20}}>
          <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Live Roles <span style={{fontSize:11,fontWeight:600,color:C.text3}}>({activeJobs.length})</span></div>
              <div style={{display:"flex",gap:6}}>
                {["open","all"].map(f=>(
                  <button key={f} onClick={()=>setStatusFilter(f)}
                    style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                      background:statusFilter===f?C.accent:C.surface,color:statusFilter===f?"white":C.text2,
                      fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                    {f==="open"?"Active":"All"}
                  </button>
                ))}
              </div>
            </div>
            {activeJobs.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:C.text3,fontSize:13}}>No active roles for this client.</div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8f9fc"}}>
                    {["Role","Department","Location","Status","SLA","Pipeline"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,
                        color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeJobs.map((job,i) => {
                    const rag = getSlaRag(job);
                    const pipelineCount = links.filter(l=>l.record_id===job.id).length;
                    const isExpanded = expandedJob===job.id;
                    const stagePeople = links.filter(l=>l.record_id===job.id);
                    return (
                      <>
                        <tr key={job.id} style={{borderBottom:`1px solid ${C.border}`,background:isExpanded?"#f0f4ff":i%2===0?C.surface:"#fafbfc",cursor:"pointer"}}
                          onClick={()=>setExpandedJob(isExpanded?null:job.id)}>
                          <td style={{padding:"11px 16px",fontWeight:600,color:C.text1}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <Ic n="chevR" s={12} c={isExpanded?C.accent:C.text3}/>
                              {job.data?.job_title||"Untitled"}
                            </div>
                          </td>
                          <td style={{padding:"11px 16px",color:C.text2}}>{job.data?.department||"—"}</td>
                          <td style={{padding:"11px 16px",color:C.text2}}>{job.data?.location||"—"}</td>
                          <td style={{padding:"11px 16px"}}>
                            <span style={{display:"inline-block",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,
                              background:job.data?.status==="Open"?`${C.green}15`:`${C.amber}15`,
                              color:job.data?.status==="Open"?C.green:C.amber}}>
                              {job.data?.status||"Open"}
                            </span>
                          </td>
                          <td style={{padding:"11px 16px"}}><RagBadge rag={rag}/></td>
                          <td style={{padding:"11px 16px",color:C.text2}}>
                            {pipelineCount>0
                              ? <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,color:C.accent}}>
                                  <Ic n="users" s={12} c={C.accent}/> {pipelineCount}
                                </span>
                              : <span style={{color:C.text3,fontSize:12}}>—</span>}
                          </td>
                        </tr>
                        {isExpanded && stagePeople.length>0 && (
                          <tr key={`${job.id}-exp`}>
                            <td colSpan={6} style={{padding:"0 0 0 48px",borderBottom:`1px solid ${C.border}`,background:"#f0f4ff"}}>
                              <div style={{padding:"12px 16px 12px 0"}}>
                                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Pipeline ({stagePeople.length})</div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                  {stagePeople.map((l,li)=>{
                                    const n=`${l.person_data?.first_name||""} ${l.person_data?.last_name||""}`.trim();
                                    return (
                                      <span key={li} onClick={e=>{e.stopPropagation();if(l.person_id)window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:l.person_id}}));}}
                                        style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,fontSize:12,fontWeight:600,
                                          background:C.surface,border:`1px solid ${C.border}`,color:C.text1,cursor:"pointer"}}>
                                        <span style={{width:18,height:18,borderRadius:"50%",background:C.accent,color:"white",fontSize:9,fontWeight:800,
                                          display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{(n[0]||"?").toUpperCase()}</span>
                                        {n||"Unknown"} <span style={{fontSize:10,color:C.text3}}>· {l.current_stage_name}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:16}}>Pipeline by Stage</div>
              <PipelineFunnel links={clientLinks} workflows={clientWorkflows}/>
            </div>
            <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:14}}>Recent Placements</div>
              {clientPlacements.length===0 ? (
                <div style={{fontSize:12,color:C.text3,textAlign:"center",padding:"16px 0"}}>No placements yet</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {clientPlacements.slice(0,8).map((p,i)=>{
                    const fee = Number(p.data?.placement_fee);
                    return (
                      <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,paddingBottom:10,
                        borderBottom:i<Math.min(clientPlacements.length-1,7)?`1px solid ${C.border}`:"none"}}>
                        <div style={{width:28,height:28,borderRadius:8,flexShrink:0,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Ic n="check" s={13} c={C.green}/>
                        </div>
                        <div style={{minWidth:0,flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.text1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.data?.candidate_name||"Unknown"}</div>
                          <div style={{fontSize:11,color:C.text3}}>{p.data?.job_title||p.data?.role||"—"}</div>
                        </div>
                        {fee>0 && <div style={{fontSize:11,fontWeight:700,color:C.green,flexShrink:0}}>${(fee/1000).toFixed(0)}k</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
