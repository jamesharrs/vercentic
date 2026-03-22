import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const C = { bg:"var(--t-bg,#f0f2ff)", card:"#fff", accent:"var(--t-accent,#4361ee)", text1:"#111827", text2:"#374151", text3:"#9ca3af", border:"#f0f0f0", green:"#0ca678", amber:"#f59f00", red:"#e03131", purple:"#7c3aed" };
const F = "'DM Sans',-apple-system,sans-serif";

const api = { get: async url => { const r = await fetch(url); if (!r.ok) throw new Error(await r.text()); return r.json(); } };

const PATHS = {
  cpu:"M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  calendar:"M3 9h18M3 15h18M8 3v3M16 3v3M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z",
  dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  database:"M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8",
  phone:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-8.384-8.616 19.79 19.79 0 01-3.07-8.67A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  check:"M20 6L9 17l-5-5",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3",
  arrow:"M5 12h14M12 5l7 7-7 7",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||""} />
  </svg>
);

const StatCard = ({ label, value, sub, trend, icon, color=C.accent, onClick }) => (
  <div onClick={onClick} style={{ background:C.card, borderRadius:14, padding:"20px 22px", border:`1px solid ${C.border}`, cursor:onClick?"pointer":"default", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow .15s" }}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)")}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)")}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ width:34, height:34, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n={icon} s={16} c={color}/></div>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value??'—'}</div>
    <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
      {trend!=null&&<span style={{ fontSize:11, fontWeight:700, color:trend>=0?C.green:C.red, background:trend>=0?"#f0fdf4":"#fef2f2", padding:"2px 7px", borderRadius:99 }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}%</span>}
      {sub&&<span style={{ fontSize:12, color:C.text3 }}>{sub}</span>}
    </div>
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", padding:"20px 22px", ...style }}>{children}</div>
);

const FEATURE_COLORS = { "Copilot Chat":"#4361ee","CV Parsing":"#0ca678","Recommendations":"#f59f00","Translation":"#7c3aed","Document Extract":"#e03131","Form Builder":"#3b82f6","Interview Schedule":"#ec4899","JD Generation":"#06b6d4","Offer Creation":"#84cc16","Other":"#9ca3af" };
const COMMS_COLORS = { email:"#4361ee", sms:"#0ca678", whatsapp:"#25d366", call:"#f59f00" };

function fmtDate(iso) {
  if (!iso) return "Never";
  const d = new Date(iso), diff = Date.now()-d.getTime();
  if (diff<3600000) return `${Math.round(diff/60000)}m ago`;
  if (diff<86400000) return `${Math.round(diff/3600000)}h ago`;
  if (diff<604800000) return `${Math.round(diff/86400000)}d ago`;
  return d.toLocaleDateString();
}
function fmtNum(n) { if (n>=1e6) return (n/1e6).toFixed(1)+"M"; if (n>=1000) return (n/1000).toFixed(1)+"K"; return String(n||0); }
function fmtCost(n) { if (!n) return "$0.00"; return "$"+n.toFixed(4); }
function fmtUptime(s) { if (s<60) return s+"s"; if (s<3600) return Math.floor(s/60)+"m"; if (s<86400) return Math.floor(s/3600)+"h "+Math.floor((s%3600)/60)+"m"; return Math.floor(s/86400)+"d "+Math.floor((s%86400)/3600)+"h"; }

export default function AdminDashboard({ environment, session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshing=false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    setError(null);
    try { const d = await api.get(`/admin/dashboard${environment?.id?`?environment_id=${environment.id}`:""}`); setData(d); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const TABS = [{ id:"overview",label:"Overview" },{ id:"ai",label:"AI Usage" },{ id:"users",label:"Users" },{ id:"records",label:"Data" },{ id:"activity",label:"Communications" }];

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3 }}>Loading dashboard…</div>;
  if (error) return (
    <div style={{ padding:32, fontFamily:F }}>
      <div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:20,color:C.red }}>
        <strong>Could not load dashboard</strong><br/>
        <span style={{ fontSize:13 }}>{error}</span><br/>
        <span style={{ fontSize:12,color:C.text3 }}>Make sure the server route is deployed and restart the server.</span>
      </div>
    </div>
  );

  const { ai, users, records, workflows, interviews, offers, forms, files, communications, system } = data;

  return (
    <div style={{ fontFamily:F, color:C.text1, width:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontWeight:800 }}>Admin Dashboard</h1>
          <div style={{ fontSize:12,color:C.text3,marginTop:3 }}>{environment?.name||"All environments"} · Updated {fmtDate(data.generated_at)}</div>
        </div>
        <button onClick={()=>load(true)} disabled={refreshing} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",color:C.text2,fontFamily:F }}>
          <Ic n="refresh" s={14} c={refreshing?C.text3:C.accent}/>{refreshing?"Refreshing…":"Refresh"}
        </button>
      </div>
      {/* Tabs */}
      <div style={{ display:"flex",gap:4,marginBottom:28,borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.text3,borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-1,fontFamily:F,transition:"all .15s" }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==="overview"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24 }}>
            <StatCard label="AI Actions This Month" value={fmtNum(ai.totals.this_month)} trend={ai.totals.trend_pct} sub="vs last month" icon="zap" color={C.accent} onClick={()=>setTab("ai")}/>
            <StatCard label="Active Users" value={users.active_this_month} sub={`of ${users.total} total`} icon="users" color={C.green} onClick={()=>setTab("users")}/>
            <StatCard label="Records Created" value={fmtNum(records.this_month)} trend={records.trend_pct} sub="this month" icon="database" color={C.purple} onClick={()=>setTab("records")}/>
            <StatCard label="Est. AI Cost" value={fmtCost(ai.totals.estimated_cost)} sub="this month" icon="dollar" color={C.amber}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
            <StatCard label="Interviews This Month" value={interviews.this_month} sub={`${interviews.upcoming} upcoming`} icon="calendar" color="#ec4899"/>
            <StatCard label="Offers This Month" value={offers.this_month} sub={`${offers.accepted} accepted`} icon="check" color={C.green}/>
            <StatCard label="Workflows Active" value={workflows.active} sub={`${workflows.runs_this_month} runs this month`} icon="activity" color={C.accent}/>
            <StatCard label="Files Uploaded" value={files.this_month} sub={`${files.total} total`} icon="file" color="#06b6d4"/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>AI Actions — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ai.daily_trend}>
                  <defs><linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.2}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip formatter={v=>[v,"Actions"]} contentStyle={{ borderRadius:8,fontSize:12,border:`1px solid ${C.border}` }}/>
                  <Area type="monotone" dataKey="count" stroke={C.accent} strokeWidth={2} fill="url(#aiGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Records Created — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={records.daily_trend}>
                  <defs><linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={0.2}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip formatter={v=>[v,"Records"]} contentStyle={{ borderRadius:8,fontSize:12,border:`1px solid ${C.border}` }}/>
                  <Area type="monotone" dataKey="count" stroke={C.purple} strokeWidth={2} fill="url(#recGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>System Health</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12 }}>
              {[{label:"Uptime",value:fmtUptime(system.uptime_seconds)},{label:"Node",value:system.node_version},{label:"Heap Used",value:`${system.heap_used_mb} MB`},{label:"Heap Total",value:`${system.heap_total_mb} MB`},{label:"Store",value:`${system.store_size_kb} KB`},{label:"Environments",value:system.environments}].map(item=>(
                <div key={item.label} style={{ background:"#f9fafb",borderRadius:10,padding:"12px 14px" }}>
                  <div style={{ fontSize:10,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em" }}>{item.label}</div>
                  <div style={{ fontSize:16,fontWeight:800,color:C.text1,marginTop:4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── AI USAGE ── */}
      {tab==="ai"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24 }}>
            <StatCard label="Total Actions" value={fmtNum(ai.totals.this_month)} trend={ai.totals.trend_pct} sub="vs last month" icon="zap" color={C.accent}/>
            <StatCard label="Tokens In" value={fmtNum(ai.totals.tokens_in)} sub="this month" icon="arrow" color={C.green}/>
            <StatCard label="Tokens Out" value={fmtNum(ai.totals.tokens_out)} sub="this month" icon="arrow" color={C.purple}/>
            <StatCard label="Estimated Cost" value={fmtCost(ai.totals.estimated_cost)} sub="at list pricing" icon="dollar" color={C.amber}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Usage by Feature</div>
              {ai.by_feature.length===0?(
                <div style={{ textAlign:"center",padding:"32px 0",color:C.text3,fontSize:13 }}>No AI actions recorded yet.<br/><span style={{ fontSize:12 }}>Usage appears once tracking middleware is deployed.</span></div>
              ):(
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {ai.by_feature.map(f=>{ const pct=ai.totals.this_month>0?Math.round((f.count/ai.totals.this_month)*100):0; const col=FEATURE_COLORS[f.label]||C.accent; return (
                    <div key={f.feature}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,fontWeight:600 }}>{f.label}</span><span style={{ fontSize:12,color:C.text3 }}>{fmtNum(f.count)} · {pct}%</span></div>
                      <div style={{ height:6,background:"#f3f4f6",borderRadius:99 }}><div style={{ height:6,width:`${pct}%`,background:col,borderRadius:99 }}/></div>
                    </div>
                  );})}
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Daily AI Actions — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ai.daily_trend} barSize={8}>
                  <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip contentStyle={{ borderRadius:8,fontSize:12,border:`1px solid ${C.border}` }}/>
                  <Bar dataKey="count" fill={C.accent} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
              <div style={{ fontSize:13,fontWeight:700 }}>AI Usage by User — This Month</div>
              <div style={{ fontSize:12,color:C.text3 }}>{ai.by_user.length} users</div>
            </div>
            {ai.by_user.length===0?<div style={{ textAlign:"center",padding:"24px 0",color:C.text3,fontSize:13 }}>No usage data yet</div>:(
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>{["User","Email","Actions","Tokens In","Tokens Out","Est. Cost","Share"].map(h=><th key={h} style={{ textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,padding:"6px 12px",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                <tbody>{ai.by_user.map((u,i)=>{
                  const pct=ai.totals.this_month>0?Math.round((u.count/ai.totals.this_month)*100):0;
                  return <tr key={u.user_id} style={{ background:i%2===0?"transparent":"#fafafa" }}>
                    <td style={{ padding:"10px 12px",fontSize:13,fontWeight:600 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:28,height:28,borderRadius:"50%",background:`${C.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.accent }}>{(u.user_name||"?").charAt(0)}</div>{u.user_name||"Unknown"}</div></td>
                    <td style={{ padding:"10px 12px",fontSize:12,color:C.text3 }}>{u.user_email||"—"}</td>
                    <td style={{ padding:"10px 12px",fontSize:13,fontWeight:700 }}>{fmtNum(u.count)}</td>
                    <td style={{ padding:"10px 12px",fontSize:12,color:C.text2 }}>{fmtNum(u.tokens_in)}</td>
                    <td style={{ padding:"10px 12px",fontSize:12,color:C.text2 }}>{fmtNum(u.tokens_out)}</td>
                    <td style={{ padding:"10px 12px",fontSize:12,fontWeight:600,color:u.estimated_cost>1?C.amber:C.text2 }}>{fmtCost(u.estimated_cost)}</td>
                    <td style={{ padding:"10px 12px" }}><div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ flex:1,height:5,background:"#f3f4f6",borderRadius:99,minWidth:60 }}><div style={{ height:5,width:`${pct}%`,background:C.accent,borderRadius:99 }}/></div><span style={{ fontSize:11,color:C.text3,width:30,textAlign:"right" }}>{pct}%</span></div></td>
                  </tr>;
                })}</tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── USERS ── */}
      {tab==="users"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24 }}>
            <StatCard label="Total Users" value={users.total} icon="users" color={C.accent}/>
            <StatCard label="Active This Month" value={users.active_this_month} sub="logged in" icon="activity" color={C.green}/>
            <StatCard label="New This Month" value={users.new_this_month} icon="users" color={C.purple}/>
            <StatCard label="Roles" value={users.by_role.length} icon="check" color={C.amber}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:20 }}>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Users by Role</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {users.by_role.map(r=>{ const pct=users.total>0?Math.round((r.count/users.total)*100):0; return (
                  <div key={r.role}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,fontWeight:600 }}>{r.role}</span><span style={{ fontSize:12,color:C.text3 }}>{r.count}</span></div>
                    <div style={{ height:5,background:"#f3f4f6",borderRadius:99 }}><div style={{ height:5,width:`${pct}%`,background:C.accent,borderRadius:99 }}/></div>
                  </div>
                );})}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Recent Logins</div>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>{["User","Role","Last Login","Logins"].map(h=><th key={h} style={{ textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,padding:"4px 10px",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                <tbody>{users.recent_logins.map((u,i)=>(
                  <tr key={u.id} style={{ background:i%2===0?"transparent":"#fafafa" }}>
                    <td style={{ padding:"9px 10px" }}><div style={{ fontSize:13,fontWeight:600 }}>{u.name||u.email}</div><div style={{ fontSize:11,color:C.text3 }}>{u.email}</div></td>
                    <td style={{ padding:"9px 10px" }}><span style={{ fontSize:11,padding:"2px 8px",borderRadius:99,background:`${C.accent}15`,color:C.accent,fontWeight:600 }}>{u.role}</span></td>
                    <td style={{ padding:"9px 10px",fontSize:12,color:C.text2 }}>{fmtDate(u.last_login)}</td>
                    <td style={{ padding:"9px 10px",fontSize:13,fontWeight:700 }}>{u.login_count}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {tab==="records"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24 }}>
            <StatCard label="Total Records" value={fmtNum(records.total)} icon="database" color={C.accent}/>
            <StatCard label="Created This Month" value={fmtNum(records.this_month)} trend={records.trend_pct} icon="activity" color={C.green}/>
            <StatCard label="Workflow Runs" value={workflows.runs_this_month} sub="this month" icon="zap" color={C.purple}/>
            <StatCard label="Form Responses" value={forms.responses_this_month} sub="this month" icon="file" color={C.amber}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Records by Object</div>
              {records.by_object.length===0?<div style={{ color:C.text3,fontSize:13,textAlign:"center",padding:"24px 0" }}>No records yet</div>:(
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {records.by_object.map(o=>{ const pct=records.total>0?Math.round((o.count/records.total)*100):0; return (
                    <div key={o.name}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,fontWeight:600 }}>{o.name}</span><span style={{ fontSize:12,color:C.text3 }}>{fmtNum(o.count)} · <span style={{ color:C.green }}>+{o.this_month} this month</span></span></div>
                      <div style={{ height:6,background:"#f3f4f6",borderRadius:99 }}><div style={{ height:6,width:`${pct}%`,background:C.accent,borderRadius:99 }}/></div>
                    </div>
                  );})}
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Record Creation — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={records.daily_trend} barSize={8}>
                  <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:10,fill:C.text3 }} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip contentStyle={{ borderRadius:8,fontSize:12,border:`1px solid ${C.border}` }}/>
                  <Bar dataKey="count" fill={C.purple} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* ── COMMUNICATIONS ── */}
      {tab==="activity"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24 }}>
            <StatCard label="Total Comms" value={fmtNum(communications.total)} sub="all time" icon="mail" color={C.accent}/>
            <StatCard label="This Month" value={fmtNum(communications.this_month)} icon="mail" color={C.green}/>
            <StatCard label="Interviews Scheduled" value={interviews.total} sub={`${interviews.upcoming} upcoming`} icon="calendar" color={C.purple}/>
            <StatCard label="Offers Sent" value={offers.total} sub={`${offers.accepted} accepted`} icon="check" color={C.amber}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Comms by Type — This Month</div>
              {communications.by_type.every(t=>t.count===0)?<div style={{ color:C.text3,fontSize:13,textAlign:"center",padding:"32px 0" }}>No communications this month</div>:(
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {communications.by_type.map(t=>{ const total=communications.this_month||1; const pct=Math.round((t.count/total)*100); const col=COMMS_COLORS[t.type]||C.accent; return (
                    <div key={t.type} style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ width:32,height:32,borderRadius:8,background:`${col}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n={t.type==="email"?"mail":"phone"} s={14} c={col}/></div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:13,fontWeight:600,textTransform:"capitalize" }}>{t.type}</span><span style={{ fontSize:12,color:C.text3 }}>{t.count}</span></div>
                        <div style={{ height:5,background:"#f3f4f6",borderRadius:99 }}><div style={{ height:5,width:`${pct}%`,background:col,borderRadius:99 }}/></div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:16 }}>Hiring Activity</div>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {[{label:"Interviews this month",value:interviews.this_month,color:C.purple,icon:"calendar"},{label:"Upcoming interviews",value:interviews.upcoming,color:"#ec4899",icon:"clock"},{label:"Offers created",value:offers.this_month,color:C.green,icon:"file"},{label:"Offers pending",value:offers.pending,color:C.amber,icon:"clock"},{label:"Offers accepted (month)",value:offers.accepted_this_month,color:C.green,icon:"check"},{label:"Workflow runs (month)",value:workflows.runs_this_month,color:C.accent,icon:"zap"}].map(item=>(
                  <div key={item.label} style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:32,height:32,borderRadius:8,background:`${item.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n={item.icon} s={14} c={item.color}/></div>
                    <div style={{ flex:1,fontSize:13,color:C.text2 }}>{item.label}</div>
                    <span style={{ fontSize:16,fontWeight:800,color:C.text1 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
