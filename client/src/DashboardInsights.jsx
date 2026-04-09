import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const V = {
  purple:"#7F77DD", purpleD:"#534AB7", purpleL:"#AFA9EC", purpleFaint:"rgba(127,119,221,0.08)",
  rose:"#D4537E", teal:"#1D9E75", amber:"#EF9F27", gray:"#888780", gray2:"#374151",
  border:"rgba(0,0,0,0.06)", card:"white", red:"#DC2626", redBg:"#FEF2F2",
  amberBg:"#FFFBEB", greenBg:"#ECFDF5", green:"#059669", blue:"#2563EB",
};
const ACCENT = [V.purple, V.rose, V.teal, V.amber, V.purpleL, V.blue];
const F = "'Geist', -apple-system, sans-serif";

const Card = ({ children, style }) => (
  <div style={{ background:V.card, borderRadius:16, border:`0.5px solid ${V.border}`, padding:"18px 20px", ...style }}>{children}</div>
);
const CardTitle = ({ title, sub }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:14, fontWeight:700, color:V.gray2 }}>{title}</div>
    {sub && <div style={{ fontSize:11, color:V.gray, marginTop:2 }}>{sub}</div>}
  </div>
);
const Leg = ({ color, label }) => (
  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:V.gray }}>
    <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>{label}
  </div>
);

export default function DashboardInsights({ environment, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!environment?.id) { console.log('[DashboardInsights] no environment id'); return; }
    console.log('[DashboardInsights] loading for env:', environment.id);
    setLoading(true);
    try { const d = await api.get(`/analytics/global?environment_id=${environment.id}`); console.log('[DashboardInsights] data:', d?.empty, Object.keys(d||{})); if (!d.empty) setData(d); }
    catch (e) { console.error('[DashboardInsights] error:', e); }
    finally { setLoading(false); }
  }, [environment?.id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding:"24px 0", textAlign:"center", color:V.gray, fontSize:13 }}>Loading insights…</div>;
  if (!data) return null;

  const riskData = [
    { name:"High risk", value:data.candidate_risk?.high||0, color:V.red },
    { name:"Medium", value:data.candidate_risk?.medium||0, color:V.amber },
    { name:"Engaged", value:data.candidate_risk?.low||0, color:V.green },
  ].filter(d => d.value > 0);
  const funnelMax = Math.max(...(data.process_funnel||[]).map(s=>s.count), 1);

  return (
    <div style={{ fontFamily:F, padding:"28px 32px", boxSizing:"border-box", maxWidth:1100, margin:"0 auto" }}>
      {/* Section header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, marginTop:8 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:V.purpleFaint, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V.purple} strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg>
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:V.gray2 }}>Hiring Insights</div>
          <div style={{ fontSize:11, color:V.gray, marginTop:1 }}>Based on {data.time_to_fill?.sample_size||0} completed roles</div>
        </div>
      </div>

      {/* AI Summary */}
      {data.summary?.length > 0 && (
        <Card style={{ background:V.purpleFaint, border:`1px solid ${V.purpleL}40`, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, fontSize:11, fontWeight:700, color:V.purpleD, textTransform:"uppercase", letterSpacing:"0.04em" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={V.purpleD} strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg>
            AI Summary
          </div>
          {data.summary.map((s,i) => <div key={i} style={{ fontSize:13, color:V.gray2, lineHeight:1.6, marginBottom:4 }}>{s}</div>)}
        </Card>
      )}

      {/* Row 1: TTF + Funnel */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1.5fr)", gap:12, marginBottom:16 }}>
        <Card>
          <CardTitle title="Time to Fill" sub={data.time_to_fill?.sample_size>0?`${data.time_to_fill.sample_size} roles completed`:"Not enough data"}/>
          {data.time_to_fill?.avg ? <div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:42, fontWeight:800, color:V.gray2, lineHeight:1 }}>{data.time_to_fill.avg}</span>
              <span style={{ fontSize:14, color:V.gray }}>days avg</span>
            </div>
            <div style={{ fontSize:12, color:V.gray, marginBottom:12 }}>Median: <strong style={{ color:V.gray2 }}>{data.time_to_fill.median}d</strong></div>
            {data.time_to_fill.by_department?.length>0 && <div>
              <div style={{ fontSize:11, fontWeight:700, color:V.gray, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>By Department</div>
              {data.time_to_fill.by_department.slice(0,5).map((d,i) => (
                <div key={d.department} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:V.gray2, width:90, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.department}</span>
                  <div style={{ flex:1, height:6, borderRadius:99, background:"#f3f4f6", overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:99, background:ACCENT[i%ACCENT.length], width:`${Math.min(100,(d.avg_days/(data.time_to_fill.avg*2))*100)}%` }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:V.gray2, minWidth:30, textAlign:"right" }}>{d.avg_days}d</span>
                </div>
              ))}
            </div>}
          </div> : <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", color:V.gray, fontSize:12 }}>Complete more roles to see TTF data</div>}
        </Card>

        <Card>
          <CardTitle title="Hiring Funnel" sub={`${data.total_in_process||0} candidates across all roles`}/>
          {data.process_funnel?.length>0 ? <div>
            {data.process_funnel.map((stage,i) => {
              const pct = funnelMax>0?(stage.count/funnelMax)*100:0;
              const color = ACCENT[i%ACCENT.length];
              const isBneck = data.bottlenecks?.some(b=>b.stage===stage.name);
              return (
                <div key={stage.name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:V.gray2, width:85, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:isBneck?700:400 }}>{stage.name}</span>
                  <div style={{ flex:1, height:24, borderRadius:6, background:"#f3f4f6", overflow:"hidden", position:"relative" }}>
                    <div style={{ height:"100%", borderRadius:6, width:`${Math.max(pct,3)}%`, background:isBneck?`repeating-linear-gradient(45deg,${V.amber},${V.amber} 4px,${V.amber}80 4px,${V.amber}80 8px)`:color }}/>
                    <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:11, fontWeight:700, color:pct>15?"white":V.gray2 }}>{stage.count}</span>
                  </div>
                  {stage.avg_days!=null && <span style={{ fontSize:10, color:isBneck?V.amber:V.gray, minWidth:35, textAlign:"right", fontWeight:isBneck?700:400 }}>{stage.avg_days}d avg</span>}
                </div>
              );
            })}
          </div> : <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", color:V.gray, fontSize:12 }}>No process data yet</div>}
        </Card>
      </div>

      {/* Row 2: Risk + Sources + Offers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12, marginBottom:16 }}>
        <Card>
          <CardTitle title="Candidate Engagement" sub={`${data.candidate_risk?.total||0} in active processes`}/>
          {riskData.length>0 ? <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <ResponsiveContainer width={100} height={100}>
              <PieChart><Pie data={riskData} cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" dataKey="value" paddingAngle={3}>
                {riskData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {riskData.map(d=><Leg key={d.name} color={d.color} label={`${d.value} ${d.name}`}/>)}
            </div>
          </div> : <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", color:V.gray, fontSize:12 }}>No linked candidates</div>}
        </Card>

        <Card>
          <CardTitle title="Source Effectiveness" sub="Top candidate sources"/>
          {data.sources?.length>0 ? <div>
            {data.sources.slice(0,5).map((s,i)=>(
              <div key={s.source} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:ACCENT[i%ACCENT.length], flexShrink:0 }}/>
                <span style={{ fontSize:12, color:V.gray2, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.source}</span>
                <span style={{ fontSize:11, fontWeight:700, color:V.gray2, minWidth:20, textAlign:"right" }}>{s.total}</span>
                {s.hire_rate>0 && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:99, background:V.greenBg, color:V.green, fontWeight:600 }}>{s.hire_rate}%</span>}
              </div>
            ))}
          </div> : <div style={{ height:80, display:"flex", alignItems:"center", justifyContent:"center", color:V.gray, fontSize:12 }}>Add source data to candidates</div>}
        </Card>

        <Card>
          <CardTitle title="Offers & Alerts"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:data.bottlenecks?.length>0?12:0 }}>
            <div style={{ padding:"8px 10px", borderRadius:8, background:V.greenBg }}>
              <div style={{ fontSize:18, fontWeight:800, color:V.green }}>{data.offers?.accepted||0}</div>
              <div style={{ fontSize:10, color:V.green }}>accepted</div>
            </div>
            <div style={{ padding:"8px 10px", borderRadius:8, background:V.amberBg }}>
              <div style={{ fontSize:18, fontWeight:800, color:V.amber }}>{data.offers?.pending||0}</div>
              <div style={{ fontSize:10, color:V.amber }}>pending</div>
            </div>
            {data.offers?.acceptance_rate!=null && <div style={{ gridColumn:"span 2", fontSize:11, color:V.gray, textAlign:"center" }}>
              Acceptance rate: <strong style={{ color:data.offers.acceptance_rate>=70?V.green:V.amber }}>{data.offers.acceptance_rate}%</strong>
            </div>}
          </div>
          {data.bottlenecks?.length>0 && <div style={{ borderTop:`1px solid ${V.border}`, paddingTop:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:V.amber, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Bottlenecks</div>
            {data.bottlenecks.slice(0,3).map((b,i) => <div key={i} style={{ fontSize:11, color:V.gray2, marginBottom:4, padding:"4px 8px", borderRadius:6, background:V.amberBg }}>{b.message}</div>)}
          </div>}
        </Card>
      </div>

      {/* Row 3: Overdue Roles */}
      {data.jobs_at_risk?.length>0 && <Card style={{ marginBottom:16 }}>
        <CardTitle title="Overdue Roles" sub={`${data.jobs_at_risk.length} role${data.jobs_at_risk.length>1?'s':''} past estimated fill date`}/>
        <div style={{ display:"grid", gap:6 }}>
          {data.jobs_at_risk.slice(0,6).map(j => (
            <div key={j.id} onClick={()=>onNavigate?.(j.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", borderRadius:8, background:V.redBg, border:"1px solid #fca5a540", cursor:onNavigate?"pointer":"default" }}>
              <div style={{ width:36, height:36, borderRadius:8, background:V.red, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"white", fontSize:13, fontWeight:800 }}>{j.days_open}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:V.gray2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.title}</div>
                <div style={{ fontSize:11, color:V.gray }}>{j.department} · {j.candidates} candidate{j.candidates!==1?'s':''}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:V.red }}>{j.days_open}d open</span>
            </div>
          ))}
        </div>
      </Card>}
    </div>
  );
}
