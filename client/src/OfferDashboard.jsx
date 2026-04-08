import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, FunnelChart, Funnel, LabelList } from "recharts";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    trendUp:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    trendDown:"M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    alertCircle:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01",
    checkCircle:"M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
    fileText:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};

const StatCard = ({ label, value, sub, icon, color, trend }) => (
  <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"16px 18px",flex:1,minWidth:150,
    boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={icon} s={18} c={color}/>
      </div>
      <div style={{fontSize:28,fontWeight:800,color:C.text1,lineHeight:1,letterSpacing:"-0.02em"}}>{value}</div>
      {trend!==undefined&&(
        <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:trend>=0?C.green:C.red,background:trend>=0?"#ECFDF5":"#FEF2F2",padding:"3px 8px",borderRadius:99,flexShrink:0}}>
          {trend>=0?"+":""}{trend}%
        </span>
      )}
    </div>
    <div style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
  </div>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{marginBottom:14}}>
    <div style={{fontSize:15,fontWeight:800,color:C.text1}}>{title}</div>
    {sub&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{sub}</div>}
  </div>
);

const STATUS_COLORS = {
  draft:"#9DA8C7", pending_approval:"#F79009", approved:"#4361EE",
  sent:"#7C3AED", accepted:"#0CAF77", declined:"#EF4444",
  expired:"#F79009", withdrawn:"#9DA8C7",
};
const STATUS_LABELS = {
  draft:"Draft", pending_approval:"Pending Approval", approved:"Approved",
  sent:"Sent", accepted:"Accepted", declined:"Declined",
  expired:"Expired", withdrawn:"Withdrawn",
};

export default function OfferDashboard({ environment, session, onNavigate }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(`/offers?environment_id=${environment.id}`);
    setOffers(Array.isArray(data) ? data : []);
    setRefreshed(new Date());
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──
  const total         = offers.length;
  const accepted      = offers.filter(o=>o.status==="accepted");
  const declined      = offers.filter(o=>o.status==="declined");
  const sent          = offers.filter(o=>o.status==="sent");
  const pending       = offers.filter(o=>o.status==="pending_approval");
  const expired       = offers.filter(o=>o.status==="expired");

  const acceptanceRate = (accepted.length+declined.length)>0
    ? Math.round((accepted.length/(accepted.length+declined.length))*100) : 0;

  // Avg salary from accepted offers
  const salaries = accepted.filter(o=>o.base_salary).map(o=>parseFloat(o.base_salary)||0).filter(v=>v>0);
  const avgSalary = salaries.length>0 ? Math.round(salaries.reduce((a,b)=>a+b,0)/salaries.length) : 0;

  // Avg time from sent to accepted (days)
  const timings = accepted.filter(o=>o.sent_at&&o.updated_at).map(o=>{
    const diff = (new Date(o.updated_at)-new Date(o.sent_at))/86400000;
    return diff>0?Math.round(diff):null;
  }).filter(Boolean);
  const avgDays = timings.length>0 ? Math.round(timings.reduce((a,b)=>a+b,0)/timings.length) : null;

  // Status breakdown
  const statusData = Object.keys(STATUS_LABELS).map(s=>({
    name:STATUS_LABELS[s], value:offers.filter(o=>o.status===s).length, color:STATUS_COLORS[s]
  })).filter(d=>d.value>0);

  // Monthly offer trend (last 6 months)
  const monthlyData = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-(5-i));
    const m=d.getMonth(); const y=d.getFullYear();
    const created = offers.filter(o=>{ const od=new Date(o.created_at); return od.getMonth()===m&&od.getFullYear()===y; }).length;
    const acceptedM = offers.filter(o=>{ const od=new Date(o.updated_at); return o.status==="accepted"&&od.getMonth()===m&&od.getFullYear()===y; }).length;
    return { month:MONTHS[m], created, accepted:acceptedM };
  });

  // Expiring soon (sent, expiry within 7 days)
  const soon = offers.filter(o=>{
    if(o.status!=="sent"||!o.expiry_date) return false;
    const diff=(new Date(o.expiry_date)-new Date())/86400000;
    return diff>=0&&diff<=7;
  }).sort((a,b)=>new Date(a.expiry_date)-new Date(b.expiry_date));

  // Pipeline funnel
  const funnelData = [
    {name:"Total Offers",  value:total,           fill:C.accent},
    {name:"Sent",          value:sent.length,      fill:C.purple},
    {name:"Accepted",      value:accepted.length,  fill:C.green},
  ].filter(d=>d.value>0);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:C.text3,fontFamily:F}}>

        {/* Quick Links */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"offers"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0ca67830", background:"#0ca67808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0ca678", fontFamily:"inherit", whiteSpace:"nowrap" }}>All Offers</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:openCopilot",{detail:{message:"create a new offer"}}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #4361ee30", background:"#4361ee08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#4361ee", fontFamily:"inherit", whiteSpace:"nowrap" }}>New Offer</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"people"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #7c3aed30", background:"#7c3aed08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#7c3aed", fontFamily:"inherit", whiteSpace:"nowrap" }}>Candidates</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"screening"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #f59f0030", background:"#f59f0008", cursor:"pointer", fontSize:13, fontWeight:600, color:"#f59f00", fontFamily:"inherit", whiteSpace:"nowrap" }}>Screening</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"onboarding"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0d948830", background:"#0d948808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0d9488", fontFamily:"inherit", whiteSpace:"nowrap" }}>Onboarding</button>
        </div>
      Loading offer data…
    </div>
  );

  return (
    <div style={{padding:"28px 32px",fontFamily:F,background:C.bg,minHeight:"100vh"}}>
      {/* Dashboard nav pills */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Overview",    nav:"overview",    color:"#6B7280" },
          { label:"Screening",   nav:"screening",   color:"#7F77DD" },
          { label:"Interviews",  nav:"interviews",  color:"#1D9E75" },
          { label:"Offers",      nav:"offers",      color:"#D4537E", current:true },
          { label:"Onboarding",  nav:"onboarding",  color:"#EF9F27" },
        ].map(({ label, nav:n, color, current }) => (
          <button key={n} onClick={() => onNavigate?.(n)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", borderRadius:20,
              border: current ? `1.5px solid ${color}` : `1.5px solid ${color}40`,
              background: current ? `${color}18` : `${color}10`, color,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background=`${color}22`; e.currentTarget.style.borderColor=color; }}
            onMouseLeave={e => { e.currentTarget.style.background=current?`${color}18`:`${color}10`; e.currentTarget.style.borderColor=current?color:`${color}40`; }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>
            {label}
          </button>
        ))}
      </div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Offer Dashboard</h1>
          <div style={{fontSize:12,color:C.text3,marginTop:3}}>
            {refreshed?`Updated ${refreshed.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:""} · {total} total offers
          </div>
        </div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,
          border:`1.5px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:600,color:C.text2}}>
          <Ic n="refresh" s={13} c={C.text3}/> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
        <StatCard label="Acceptance Rate" value={`${acceptanceRate}%`} sub={`${accepted.length} accepted · ${declined.length} declined`} icon="checkCircle" color={C.green}/>
        <StatCard label="Pending Approval" value={pending.length} sub="awaiting sign-off" icon="clock" color={C.amber}/>
        <StatCard label="Sent to Candidates" value={sent.length} sub={`${expired.length} expired`} icon="fileText" color={C.accent}/>
        <StatCard label="Avg Base Salary" value={avgSalary>0?`$${avgSalary.toLocaleString()}`:"—"} sub={avgDays?`avg ${avgDays} days to accept`:undefined} icon="dollar" color={C.purple}/>
      </div>

      {/* Charts row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        {/* Monthly trend */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px",gridColumn:"1/3"}}>
          <SectionHeader title="Offer Activity" sub="Offers created vs accepted per month"/>
          {monthlyData.every(d=>d.created===0&&d.accepted===0) ? (
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:12}}>No offer data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12}}/>
                <Bar dataKey="created" name="Created" fill={`${C.accent}80`} radius={[4,4,0,0]}/>
                <Bar dataKey="accepted" name="Accepted" fill={C.green} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Status breakdown */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
          <SectionHeader title="By Status"/>
          {statusData.length===0 ? (
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:12}}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value" paddingAngle={3}>
                    {statusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {statusData.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                    <span style={{color:C.text2,flex:1}}>{d.name}</span>
                    <span style={{fontWeight:700,color:C.text1}}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Expiring soon */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
          <SectionHeader title="Expiring Soon" sub="Sent offers expiring within 7 days"/>
          {soon.length===0 ? (
            <div style={{padding:"24px 0",textAlign:"center",color:C.text3,fontSize:12}}>No offers expiring soon</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {soon.map((o,i)=>{
                const daysLeft = Math.ceil((new Date(o.expiry_date)-new Date())/86400000);
                const urgent = daysLeft<=2;
                return (
                  <div key={o.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,
                    background:urgent?"#FEF2F2":"#FFFBEB",border:`1px solid ${urgent?C.red+"40":C.amber+"40"}`}}>
                    <div style={{width:34,height:34,borderRadius:9,background:urgent?`${C.red}14`:`${C.amber}14`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Ic n="alertCircle" s={15} c={urgent?C.red:C.amber}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {o.candidate_name||o.job_title||"Offer"}
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>{o.job_title||""}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:800,color:urgent?C.red:C.amber}}>
                        {daysLeft}d left
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>
                        {o.base_salary?`$${parseFloat(o.base_salary).toLocaleString()}`:""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending approvals */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
          <SectionHeader title="Pending Approval" sub="Offers waiting for sign-off"/>
          {pending.length===0 ? (
            <div style={{padding:"24px 0",textAlign:"center",color:C.text3,fontSize:12}}>
              <div style={{fontSize:22,marginBottom:6}}>✓</div>
              All caught up — no offers pending
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pending.slice(0,6).map((o,i)=>{
                const age = Math.floor((new Date()-new Date(o.created_at))/86400000);
                return (
                  <div key={o.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,
                    background:`${C.amber}08`,border:`1px solid ${C.amber}30`}}>
                    <div style={{width:34,height:34,borderRadius:9,background:`${C.amber}14`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Ic n="clock" s={15} c={C.amber}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {o.candidate_name||"Candidate"}
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>{o.job_title||"Offer"}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11,color:C.amber,fontWeight:700}}>{age}d ago</div>
                      <div style={{fontSize:10,color:C.text3}}>{o.base_salary?`$${parseFloat(o.base_salary).toLocaleString()}`:"—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
