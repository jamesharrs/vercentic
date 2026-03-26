import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
    calendar:"M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    video:"M23 7l-7 5 7 5V7zM1 5h15v14H1z",
    phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
    building:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    trendUp:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    arrowR:"M5 12h14M12 5l7 7-7 7", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
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
  scheduled:"#4361EE", completed:"#0CAF77", cancelled:"#EF4444",
  "no-show":"#F79009", pending:"#9DA8C7",
};

const FORMAT_ICONS = { video:"video", phone:"phone", onsite:"building", panel:"users" };
const FORMAT_LABELS = { video:"Video", phone:"Phone", onsite:"On-site", panel:"Panel" };

export default function InterviewDashboard({ environment, session, onNavigate }) {
  const [interviews, setInterviews] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const [ivs, tps] = await Promise.all([
      api.get(`/interviews?environment_id=${environment.id}`),
      api.get(`/interview-types?environment_id=${environment.id}`),
    ]);
    setInterviews(Array.isArray(ivs) ? ivs : []);
    setTypes(Array.isArray(tps) ? tps : []);
    setRefreshed(new Date());
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──
  const now = new Date();
  const upcoming = interviews.filter(i => i.status === "scheduled" && new Date(i.date) >= now);
  const today    = upcoming.filter(i => new Date(i.date).toDateString() === now.toDateString());
  const thisWeek = upcoming.filter(i => {
    const d = new Date(i.date); const diff = (d - now) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const completed   = interviews.filter(i => i.status === "completed");
  const cancelled   = interviews.filter(i => i.status === "cancelled");
  const noShow      = interviews.filter(i => i.status === "no-show");

  // Status breakdown for pie
  const statusData = ["scheduled","completed","cancelled","no-show","pending"]
    .map(s => ({ name: s.charAt(0).toUpperCase()+s.slice(1), value: interviews.filter(i=>i.status===s).length, color: STATUS_COLORS[s] }))
    .filter(d => d.value > 0);

  // Format breakdown
  const formatData = Object.keys(FORMAT_LABELS).map(f => ({
    name: FORMAT_LABELS[f], value: interviews.filter(i=>i.format===f||i.interview_type===f).length
  })).filter(d => d.value > 0);

  // Monthly trend (last 6 months)
  const monthlyData = Array.from({length:6}, (_,i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5-i));
    const m = d.getMonth(); const y = d.getFullYear();
    const count = interviews.filter(iv => {
      const id = new Date(iv.date||iv.created_at);
      return id.getMonth()===m && id.getFullYear()===y;
    }).length;
    return { month: MONTHS[m], count };
  });

  // Upcoming list sorted by date
  const upcomingSorted = [...upcoming].sort((a,b) => new Date(a.date)-new Date(b.date)).slice(0,8);

  // Interview type breakdown
  const typeBreakdown = types.map(t => ({
    name: t.name, count: interviews.filter(i=>i.interview_type_id===t.id).length, duration: t.duration_minutes,
  })).filter(t => t.count > 0);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:C.text3,fontFamily:F}}>

        {/* Quick Links */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"interviews"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #4361ee30", background:"#4361ee08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#4361ee", fontFamily:"inherit", whiteSpace:"nowrap" }}>All Interviews</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:openCopilot",{detail:{message:"schedule an interview"}}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0ca67830", background:"#0ca67808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0ca678", fontFamily:"inherit", whiteSpace:"nowrap" }}>Schedule Interview</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"people"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #7c3aed30", background:"#7c3aed08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#7c3aed", fontFamily:"inherit", whiteSpace:"nowrap" }}>Candidates</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"jobs"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #3b82f630", background:"#3b82f608", cursor:"pointer", fontSize:13, fontWeight:600, color:"#3b82f6", fontFamily:"inherit", whiteSpace:"nowrap" }}>Open Jobs</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"screening"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #f59f0030", background:"#f59f0008", cursor:"pointer", fontSize:13, fontWeight:600, color:"#f59f00", fontFamily:"inherit", whiteSpace:"nowrap" }}>Screening</button>
        </div>
      Loading interview data…
    </div>
  );

  const ACCENT_PIE = ["#4361EE","#0CAF77","#EF4444","#F79009","#9DA8C7","#7C3AED"];

  return (
    <div style={{padding:"28px 32px",fontFamily:F,background:C.bg,minHeight:"100vh"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Interview Dashboard</h1>
          <div style={{fontSize:12,color:C.text3,marginTop:3}}>
            {refreshed ? `Updated ${refreshed.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}` : ""}
          </div>
        </div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,
          border:`1.5px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:600,color:C.text2}}>
          <Ic n="refresh" s={13} c={C.text3}/> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
        <StatCard label="Today" value={today.length} sub="interviews scheduled" icon="calendar" color={C.accent} trend={undefined}/>
        <StatCard label="This Week" value={thisWeek.length} sub="upcoming interviews" icon="clock" color={C.purple}/>
        <StatCard label="Total Scheduled" value={upcoming.length} sub="in pipeline" icon="zap" color={C.amber}/>
        <StatCard label="Completed" value={completed.length} sub={`${cancelled.length} cancelled · ${noShow.length} no-show`} icon="check" color={C.green}/>
      </div>

      {/* Charts row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        {/* Monthly trend */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px",gridColumn:"1/3"}}>
          <SectionHeader title="Interview Volume" sub="Scheduled interviews per month"/>
          {monthlyData.every(d=>d.count===0) ? (
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:12}}>
              No interview data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12}} cursor={{fill:C.accentLight}}/>
                <Bar dataKey="count" name="Interviews" fill={C.accent} radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Status pie */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
          <SectionHeader title="By Status"/>
          {statusData.length===0 ? (
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:12}}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3}>
                    {statusData.map((e,i) => <Cell key={i} fill={e.color}/>)}
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
        {/* Upcoming interviews */}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
          <SectionHeader title="Upcoming Interviews" sub={`Next ${upcomingSorted.length} scheduled`}/>
          {upcomingSorted.length===0 ? (
            <div style={{padding:"24px 0",textAlign:"center",color:C.text3,fontSize:12}}>No upcoming interviews</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {upcomingSorted.map((iv,i) => {
                const d = new Date(iv.date);
                const isToday = d.toDateString()===now.toDateString();
                const fmt = FORMAT_LABELS[iv.format]||iv.format||"Interview";
                return (
                  <div key={iv.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,
                    background:isToday?C.accentLight:"#F8F9FC",border:`1px solid ${isToday?C.accent+"30":C.border}`}}>
                    <div style={{width:36,height:36,borderRadius:10,background:isToday?C.accent:"#E8ECF8",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Ic n={FORMAT_ICONS[iv.format]||"calendar"} s={15} c={isToday?"white":C.text3}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {iv.candidate_name||iv.notes||"Interview"}
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>{fmt} · {iv.duration_minutes||45}min</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:isToday?C.accent:C.text2}}>
                        {isToday?"Today":d.toLocaleDateString([],{month:"short",day:"numeric"})}
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>{d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interview types breakdown */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
            <SectionHeader title="By Format"/>
            {formatData.length===0 ? (
              <div style={{color:C.text3,fontSize:12,paddingTop:8}}>No format data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={formatData} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{fontSize:10,fill:C.text3}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:C.text2}} axisLine={false} tickLine={false} width={56}/>
                  <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12}}/>
                  <Bar dataKey="value" name="Count" fill={C.purple} radius={[0,6,6,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {typeBreakdown.length>0&&(
            <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px 20px"}}>
              <SectionHeader title="Interview Types Used"/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {typeBreakdown.slice(0,5).map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,fontSize:12,color:C.text1,fontWeight:600}}>{t.name}</div>
                    <div style={{fontSize:11,color:C.text3}}>{t.duration}min</div>
                    <div style={{fontSize:12,fontWeight:800,color:C.accent,minWidth:24,textAlign:"right"}}>{t.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
