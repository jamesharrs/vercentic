import { useState, useEffect, useCallback } from "react";
import api from './apiClient.js';

const C = { accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)", text1:"#111827", text2:"#4B5563", text3:"#9CA3AF", border:"#E5E7EB", bg:"#F9FAFB", green:"#059669", greenBg:"#ECFDF5", amber:"#D97706", amberBg:"#FFFBEB", red:"#DC2626", redBg:"#FEF2F2", blue:"#2563EB", blueBg:"#EFF6FF", purple:"#7C3AED", purpleBg:"#F5F3FF" };
const F = "'Geist', -apple-system, sans-serif";
const PATHS = { clock:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z", alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01", users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", check:"M20 6L9 17l-5-5", zap:"M13 2L3 14h9l-1 10 10-12h-9l1-10z", barChart:"M12 20V10M18 20V4M6 20v-4", target:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15", info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01", dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" };
const Ic = ({ n, s=16, c="currentColor" }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]||PATHS.info}/></svg>;

const StatCard = ({ icon, iconColor, iconBg, label, value, sub }) => (
  <div style={{ background:"white", borderRadius:12, border:`1px solid ${C.border}`, padding:"10px 12px", display:"flex", alignItems:"center", gap:12, flex:1 }}>
    <div style={{ width:32, height:32, borderRadius:10, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} s={14} c={iconColor}/></div>
    <div><div style={{ fontSize:16, fontWeight:800, color:C.text1, lineHeight:1.1 }}>{value}</div><div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{label}</div>{sub&&<div style={{ fontSize:10, color:C.text3, marginTop:2 }}>{sub}</div>}</div>
  </div>
);
const RiskBadge = ({ level }) => { const cfg={high:{bg:C.redBg,color:C.red},medium:{bg:C.amberBg,color:C.amber},low:{bg:C.greenBg,color:C.green}}; const cl=cfg[level]||cfg.low; return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:cl.bg, color:cl.color, textTransform:"uppercase" }}>{level}</span>; };
const HealthDot = ({ health }) => { const colors={fast:C.green,normal:C.blue,slow:C.amber,bottleneck:C.red}; return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:colors[health]||C.text3 }} title={health}/>; };
const ProgressBar = ({ value, max, color, height=6 }) => <div style={{ height, borderRadius:height, background:"#F3F4F6", width:"100%", overflow:"hidden" }}><div style={{ height:"100%", borderRadius:height, background:color, width:`${max>0?Math.min(100,(value/max)*100):0}%`, transition:"width 0.4s" }}/></div>;
const OnTrackBadge = ({ status }) => { const cfg={ahead:{bg:C.greenBg,color:C.green,label:"Ahead of schedule"},on_track:{bg:C.blueBg,color:C.blue,label:"On track"},at_risk:{bg:C.amberBg,color:C.amber,label:"At risk"},overdue:{bg:C.redBg,color:C.red,label:"Overdue"}}; const cl=cfg[status]||{bg:C.bg,color:C.text3,label:"No data"}; return <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:8, background:cl.bg, fontSize:12, fontWeight:700, color:cl.color }}><Ic n={status==="ahead"||status==="on_track"?"check":"alert"} s={13} c={cl.color}/>{cl.label}</div>; };

export default function InsightsPanel({ record, environment }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const load = useCallback(async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true); setError(null);
    try { const r = await api.get(`/analytics/job-insights?job_id=${record.id}&environment_id=${environment.id}`); setData(r); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [record?.id, environment?.id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding:24, textAlign:"center", color:C.text3, fontSize:13 }}>Loading insights…</div>;
  if (error) return <div style={{ padding:24, textAlign:"center" }}><div style={{ color:C.red, fontSize:13, marginBottom:8 }}>Failed to load</div><button onClick={load} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", fontFamily:F }}>Retry</button></div>;
  if (!data) return null;

  const tabs = [{ id:"overview", label:"Overview" }, { id:"process", label:"Process" }, { id:"risk", label:`Risk (${data.candidate_risk?.filter(c=>c.risk_level!=="low").length||0})` }, { id:"sources", label:"Sources" }];

  return (
    <div style={{ fontFamily:F }}>
      <div style={{ display:"flex", gap:2, marginBottom:16, background:"#F3F4F6", borderRadius:8, padding:3 }}>
        {tabs.map(t => <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer", background:activeTab===t.id?"white":"transparent", color:activeTab===t.id?C.text1:C.text3, fontSize:12, fontWeight:activeTab===t.id?700:500, fontFamily:F, boxShadow:activeTab===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none" }}>{t.label}</button>)}
      </div>

      {activeTab==="overview" && <div>
        {data.summary?.length>0 && <div style={{ background:C.purpleBg, border:"1px solid #DDD6FE", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:13, color:C.purple, lineHeight:1.6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, fontWeight:700, fontSize:11 }}><Ic n="zap" s={12} c={C.purple}/> AI INSIGHT</div>
          {data.summary.map((s,i) => <div key={i} style={{ marginBottom:4 }}>{s}</div>)}
        </div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          <StatCard icon="clock" iconColor={C.blue} iconBg={C.blueBg} label="Est. time to fill" value={data.time_to_fill?.estimated_days?`${data.time_to_fill.estimated_days}d`:"—"} sub={data.time_to_fill?.confidence!=="insufficient"?`${data.time_to_fill.sample_size} ${data.time_to_fill.basis==="similar_roles"?"similar ":""}roles`:"Not enough data"}/>
          <StatCard icon="users" iconColor={C.purple} iconBg={C.purpleBg} label="In process" value={data.process?.total_candidates??0} sub={data.process?.bottlenecks?.length>0?`${data.process.bottlenecks.length} bottleneck${data.process.bottlenecks.length>1?"s":""}`:"No bottlenecks"}/>
          <StatCard icon="target" iconColor={data.time_to_fill?.on_track==="overdue"?C.red:C.green} iconBg={data.time_to_fill?.on_track==="overdue"?C.redBg:C.greenBg} label="Days open" value={data.time_to_fill?.days_open??"—"}/>
          <StatCard icon="dollar" iconColor={C.amber} iconBg={C.amberBg} label="Offers" value={data.offers?.total??0} sub={data.offers?.acceptance_rate!=null?`${data.offers.acceptance_rate}% accepted`:"No offers yet"}/>
        </div>
        {data.time_to_fill?.on_track && <div style={{ marginBottom:14 }}>
          <OnTrackBadge status={data.time_to_fill.on_track}/>
          {data.time_to_fill.p25&&data.time_to_fill.p75&&<div style={{ fontSize:11, color:C.text3, marginTop:6 }}>Typical range: {data.time_to_fill.p25}–{data.time_to_fill.p75} days</div>}
          {data.time_to_fill.estimated_days&&<div style={{ marginTop:8 }}>
            <ProgressBar value={data.time_to_fill.days_open} max={data.time_to_fill.p75||data.time_to_fill.estimated_days*1.5} color={data.time_to_fill.on_track==="overdue"?C.red:data.time_to_fill.on_track==="at_risk"?C.amber:C.green}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.text3, marginTop:3 }}><span>Day {data.time_to_fill.days_open}</span><span>Est. {data.time_to_fill.estimated_days}d</span></div>
          </div>}
        </div>}
        {data.candidate_risk?.length>0 && <div style={{ background:"white", borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.text1, marginBottom:8 }}>Candidate engagement</div>
          <div style={{ display:"flex", gap:12 }}>
            {["high","medium","low"].map(lv => { const ct=data.candidate_risk.filter(c=>c.risk_level===lv).length; const cls={high:C.red,medium:C.amber,low:C.green};
              return <div key={lv} style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:10, height:10, borderRadius:"50%", background:cls[lv] }}/><span style={{ fontSize:12, color:C.text2 }}>{ct} {lv}</span></div>; })}
          </div>
        </div>}
      </div>}

      {activeTab==="process" && <div>
        {data.process?.stages?.length>0 ? <>
          {data.process?.workflow_name && <div style={{ fontSize:11, fontWeight:600, color:C.purple, marginBottom:10, padding:"4px 10px", background:C.purpleBg, borderRadius:6, display:"inline-block" }}>{data.process.workflow_name}</div>}
          {data.process.stages.map((stage,i) => <div key={stage.name} style={{ marginBottom:2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, background:stage.health==="bottleneck"?C.redBg:stage.health==="slow"?C.amberBg:stage.health==="fast"?C.greenBg:"white", border:`1px solid ${stage.health==="bottleneck"?"#FCA5A5":stage.health==="slow"?"#FCD34D":C.border}` }}>
              <HealthDot health={stage.health}/>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{stage.name}</div><div style={{ fontSize:11, color:C.text3 }}>{stage.count} candidate{stage.count!==1?"s":""}{stage.avg_days!=null&&` · avg ${stage.avg_days}d`}{stage.env_avg_days!=null&&` (norm: ${stage.env_avg_days}d)`}</div></div>
              <div style={{ fontSize:18, fontWeight:800, color:C.text1, width:30, textAlign:"center" }}>{stage.count}</div>
            </div>
            {i<data.process.stages.length-1&&data.process.conversion_rates[i]&&<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2px 0", color:C.text3, fontSize:10 }}>↓ {data.process.conversion_rates[i].rate!=null?`${data.process.conversion_rates[i].rate}%`:"—"}</div>}
          </div>)}
          {data.process.bottlenecks?.length>0&&<div style={{ background:C.amberBg, border:"1px solid #FCD34D", borderRadius:10, padding:"12px 14px", marginTop:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.amber, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}><Ic n="alert" s={13} c={C.amber}/> Bottlenecks detected</div>
            {data.process.bottlenecks.map((b,i)=><div key={i} style={{ fontSize:12, color:C.text2, marginBottom:4 }}>{b.message}</div>)}
          </div>}
        </> : <div style={{ textAlign:"center", padding:32, color:C.text3, fontSize:13 }}>No Linked Person workflow assigned yet. Assign one to see process analytics.</div>}
      </div>}

      {activeTab==="risk" && <div>
        {data.candidate_risk?.length>0 ? data.candidate_risk.map((c,i)=><div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", marginBottom:6, borderRadius:8, background:c.risk_level==="high"?C.redBg:c.risk_level==="medium"?C.amberBg:"white", border:`1px solid ${c.risk_level==="high"?"#FCA5A5":c.risk_level==="medium"?"#FCD34D":C.border}` }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:c.risk_level==="high"?C.red:c.risk_level==="medium"?C.amber:C.green, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:12, fontWeight:800, flexShrink:0 }}>{c.risk_score}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}><span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{c.name}</span><RiskBadge level={c.risk_level}/></div>
            <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>Stage: {c.stage}{c.days_in_stage!=null&&` · ${c.days_in_stage}d`}{c.days_since_contact!=null&&` · Last contact ${c.days_since_contact}d ago`}</div>
            {c.factors.length>0&&<div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{c.factors.map((f,fi)=><span key={fi} style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:c.risk_level==="high"?"#FEE2E2":"#FEF3C7", color:c.risk_level==="high"?C.red:C.amber }}>{f}</span>)}</div>}
          </div>
        </div>) : <div style={{ textAlign:"center", padding:32, color:C.text3, fontSize:13 }}>No candidates linked to this role.</div>}
      </div>}

      {activeTab==="sources" && <div>
        {data.source_effectiveness?.length>0 ? data.source_effectiveness.map((s,i)=><div key={i} style={{ padding:"10px 12px", marginBottom:6, borderRadius:8, background:"white", border:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{s.source}</span><span style={{ fontSize:12, color:C.text3 }}>{s.total} candidates</span></div>
          <div style={{ display:"flex", gap:12, fontSize:11 }}>
            <div><span style={{ color:C.text3 }}>Applied: </span><span style={{ fontWeight:700, color:C.blue }}>{s.link_rate}%</span></div>
            <div><span style={{ color:C.text3 }}>Interviewed: </span><span style={{ fontWeight:700, color:C.purple }}>{s.interviewed}</span></div>
            <div><span style={{ color:C.text3 }}>Hired: </span><span style={{ fontWeight:700, color:C.green }}>{s.hired}</span></div>
            <div><span style={{ color:C.text3 }}>Hire rate: </span><span style={{ fontWeight:700, color:s.hire_rate>=20?C.green:s.hire_rate>=10?C.amber:C.red }}>{s.hire_rate}%</span></div>
          </div>
          <div style={{ marginTop:6 }}><ProgressBar value={s.hire_rate} max={100} color={s.hire_rate>=20?C.green:s.hire_rate>=10?C.amber:C.red}/></div>
        </div>) : <div style={{ textAlign:"center", padding:32, color:C.text3, fontSize:13 }}>No source data available.</div>}
      </div>}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, color:C.text3 }}>{data.time_to_fill?.confidence==="high"?"High confidence":data.time_to_fill?.confidence==="medium"?"Medium confidence":data.time_to_fill?.confidence==="low"?"Low confidence":"Building confidence"}{data.time_to_fill?.sample_size>0&&` · ${data.time_to_fill.sample_size} data points`}</div>
        <button onClick={load} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:10, fontFamily:F, display:"flex", alignItems:"center", gap:4 }}><Ic n="refresh" s={10} c={C.text3}/> Refresh</button>
      </div>
    </div>
  );
}
