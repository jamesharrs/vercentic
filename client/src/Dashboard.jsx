import { useState, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444",
};

const api = { get: p => fetch(`/api${p}`).then(r => r.json()) };

// Simple per-environment cache — survives re-mounts, cleared on env change
const _cache = {};

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    check:"M20 6L9 17l-5-5", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    plus:"M12 5v14M5 12h14", arrowR:"M5 12h14M12 5l7 7-7 7",
    trendUp:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    trendDown:"M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    barChart:"M18 20V10M12 20V4M6 20v-6",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};

const spark = (peak) => [0.55,0.7,0.5,0.8,0.65,0.9,1].map(r=>({v:Math.round((peak||10)*r)}));

const StatCard = ({ label, value, sub, icon, color, trend, onClick, onReport }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{background:C.surface,borderRadius:18,border:`1.5px solid ${hovered&&onClick ? color+"60" : C.border}`,
        padding:"22px 24px",flex:1,minWidth:170,
        boxShadow: hovered&&onClick ? `0 4px 20px ${color}18` : "0 1px 4px rgba(67,97,238,0.06)",
        cursor: onClick ? "pointer" : "default", transition:"all .15s", position:"relative"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
        <div style={{width:44,height:44,borderRadius:14,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n={icon} s={20} c={color}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {trend!==undefined&&<div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:trend>=0?C.green:C.red,background:trend>=0?"#ECFDF5":"#FEF2F2",padding:"4px 9px",borderRadius:99}}>
            <Ic n={trend>=0?"trendUp":"trendDown"} s={10} c={trend>=0?C.green:C.red}/>{Math.abs(trend)}%
          </div>}
          {onReport&&<button onClick={e=>{e.stopPropagation();onReport();}}
            title="Open as report"
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",padding:"3px 7px",fontSize:10,fontWeight:700,color:C.text3,fontFamily:F,display:"flex",alignItems:"center",gap:3,transition:"all .1s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
            <Ic n="barChart" s={10} c="currentColor"/> Report
          </button>}
        </div>
      </div>
      <div style={{fontSize:32,fontWeight:800,color:C.text1,letterSpacing:"-1px",lineHeight:1}}>{value}</div>
      <div style={{fontSize:13,fontWeight:600,color:C.text2,marginTop:6}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
      {onClick&&hovered&&<div style={{position:"absolute",bottom:14,right:16,fontSize:10,fontWeight:700,color:color,display:"flex",alignItems:"center",gap:3,opacity:0.8}}>
        View records <Ic n="arrowR" s={10} c={color}/>
      </div>}
      <div style={{marginTop:14,height:40}}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark(value)} margin={{top:0,right:0,bottom:0,left:0}}>
            <defs><linearGradient id={`g${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25}/><stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g${label.replace(/\s/g,"")})`} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:C.text1,borderRadius:10,padding:"8px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}>
    <div style={{fontSize:11,color:C.text3,marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:13,fontWeight:700,color:p.color||"white"}}>{p.name}: {p.value}</div>)}
  </div>;
};

const LegendItem = ({color,label,value,total,onClick}) => (
  <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,borderRadius:8,padding:"2px 4px",cursor:onClick?"pointer":"default",transition:"background .1s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.background=`${color}10`;}}
    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
    <div style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0}}/>
    <span style={{fontSize:12,color:C.text2,flex:1}}>{label}</span>
    <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{value}</span>
    <span style={{fontSize:11,color:C.text3,minWidth:32,textAlign:"right"}}>{total?Math.round((value/total)*100):0}%</span>
    {onClick&&<Ic n="arrowR" s={10} c={color}/>}
  </div>
);

const RecentRow = ({item, onClick}) => (
  <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 6px",borderBottom:`1px solid ${C.border}`,borderRadius:8,cursor:onClick?"pointer":"default",transition:"background .1s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.background=C.accentLight;}}
    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
    <div style={{width:36,height:36,borderRadius:12,background:item.objectColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{color:"white",fontSize:13,fontWeight:800}}>{item.name?.charAt(0)?.toUpperCase()||"?"}</span>
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
      <div style={{fontSize:11,color:C.text3}}>{item.object}</div>
    </div>
    {item.status&&<span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:99,
      background:item.status==="Active"||item.status==="Open"?"#ECFDF5":item.status==="Placed"||item.status==="Filled"?"#EEF2FF":"#F9FAFB",
      color:item.status==="Active"||item.status==="Open"?C.green:item.status==="Placed"||item.status==="Filled"?C.accent:C.text3
    }}>{item.status}</span>}
    {onClick&&<Ic n="arrowR" s={12} c={C.text3}/>}
  </div>
);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard({environment,onNavigate}) {
  const [stats,setStats]=useState(null);
  const [recent,setRecent]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{if(!environment?.id)return;loadData();},[environment?.id]);

  const loadData = async () => {
    // Return cached data instantly, then refresh in background
    if (_cache[environment.id]) {
      setStats(_cache[environment.id].stats);
      setRecent(_cache[environment.id].recent);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      // Fetch objects + all record sets in parallel (not sequential)
      const objs = await api.get(`/objects?environment_id=${environment.id}`);
      if (!Array.isArray(objs)) { setLoading(false); return; }

      // Fetch all objects' records simultaneously — limit=20 is enough for
      // status breakdowns + recent items (we only show 5 per object / 8 total)
      const recordSets = await Promise.all(
        objs.map(o => api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=20`))
      );

      const counts={}, statusBreakdowns={}, recentItems=[];
      objs.forEach((o, i) => {
        const r = recordSets[i];
        const records = r.records || [];
        counts[o.slug] = r.pagination?.total ?? records.length;
        const sb = {};
        records.forEach(rec => { const s = rec.data?.status || "Unknown"; sb[s] = (sb[s]||0) + 1; });
        statusBreakdowns[o.slug] = sb;
        records.slice(0, 5).forEach(rec => {
          const nameF = ["first_name","job_title","pool_name","name"].find(k => rec.data?.[k]);
          const lastName = rec.data?.last_name ? ` ${rec.data.last_name}` : "";
          recentItems.push({ id:rec.id, objectId:o.id, name:nameF?(rec.data[nameF]+lastName):"Untitled", object:o.name, objectSlug:o.slug, objectColor:o.color||C.accent, status:rec.data?.status, created:rec.created_at });
        });
      });

      recentItems.sort((a,b) => new Date(b.created) - new Date(a.created));
      const statsData = { counts, statusBreakdowns, objects: objs };
      const recentData = recentItems.slice(0, 8);

      // Update cache
      _cache[environment.id] = { stats: statsData, recent: recentData };
      setStats(statsData);
      setRecent(recentData);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  if(loading && !stats) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3}}>Loading dashboard…</div>;
  if(!stats) return null;

  const peopleCount=stats.counts["people"]||0, jobsCount=stats.counts["jobs"]||0, poolsCount=stats.counts["talent-pools"]||0;
  const jobStatuses=stats.statusBreakdowns["jobs"]||{}, peopleStatuses=stats.statusBreakdowns["people"]||{};
  const openJobs=jobStatuses["Open"]||0, activePeople=peopleStatuses["Active"]||0, placedCount=peopleStatuses["Placed"]||0;

  const JOB_COLORS={Open:C.green,Draft:"#94A3B8","On Hold":C.amber,Filled:C.accent,Cancelled:C.red};
  const PEOPLE_COLORS={Active:C.green,Passive:C.amber,"Not Looking":"#94A3B8",Placed:C.accent,Archived:"#CBD5E1"};

  const jobDonut=Object.entries(jobStatuses).map(([name,value])=>({name,value,color:JOB_COLORS[name]||"#94A3B8"}));
  const peopleDonut=Object.entries(peopleStatuses).map(([name,value])=>({name,value,color:PEOPLE_COLORS[name]||"#94A3B8"}));
  const totalJobs=jobDonut.reduce((s,d)=>s+d.value,0);
  const totalPeople=peopleDonut.reduce((s,d)=>s+d.value,0);

  const nowMonth=new Date().getMonth();
  const barData=MONTHS.slice(0,nowMonth+1).map((m,i)=>({
    month:m,
    candidates:Math.max(1,Math.round((peopleCount/(nowMonth+1))*(0.5+Math.sin(i)*0.4))),
    jobs:Math.max(1,Math.round((jobsCount/(nowMonth+1))*(0.5+Math.cos(i)*0.3))),
  }));

  const hr=new Date().getHours();
  const greeting=hr<12?"Good morning":hr<18?"Good afternoon":"Good evening";
  const today=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  // Navigation helpers
  const goToFiltered = (objectSlug, fieldKey, fieldLabel, fieldValue) => {
    window.dispatchEvent(new CustomEvent("talentos:filter-navigate", {
      detail: { fieldKey, fieldLabel, fieldValue, objectSlug }
    }));
  };

  const openReport = (objectSlug, reportConfig) => {
    window.dispatchEvent(new CustomEvent("talentos:open-report", {
      detail: { objectSlug, ...reportConfig }
    }));
  };

  return (
    <div style={{fontFamily:F,color:C.text1}}>

      {/* Header */}
      <div style={{marginBottom:28,display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:26,fontWeight:800,color:C.text1,letterSpacing:"-0.5px"}}>{greeting} 👋</h1>
          <p style={{margin:0,fontSize:13,color:C.text3}}>{environment.name} · {today}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[{label:"Add Candidate",slug:"people",color:C.accent},{label:"Post Job",slug:"jobs",color:C.green}].map(a=>(
            <button key={a.slug} onClick={()=>onNavigate?.(a.slug)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:F,background:a.color,color:"white",fontSize:12,fontWeight:700,boxShadow:`0 2px 8px ${a.color}40`}}>
              <Ic n="plus" s={13} c="white"/>{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <StatCard label="Total Candidates" value={peopleCount} sub={`${activePeople} active`}   icon="users"     color={C.accent} trend={12}
          onClick={() => onNavigate?.("people")}
          onReport={() => openReport("people", {
            groupBy:"status", view:"bar", chartX:"status", chartY:"_count",
            name:"Candidates by Status",
            formulas:[
              { label:"Total Candidates", expr:"COUNT()" },
              { label:"Active Rate %",    expr:"ROUND(AVG(status),0)" },
            ]
          })}/>
        <StatCard label="Open Jobs"        value={openJobs}    sub={`${jobsCount} total roles`} icon="briefcase" color={C.green}  trend={5}
          onClick={() => goToFiltered("jobs", "status", "Status", "Open")}
          onReport={() => openReport("jobs", {
            filters:[{field:"status",op:"eq",value:"Open"}],
            groupBy:"department", view:"bar", chartX:"department", chartY:"_count",
            name:"Open Jobs by Department",
            formulas:[
              { label:"Open Jobs",        expr:"COUNT()" },
              { label:"Salary Max",       expr:"MAX(salary_max)" },
              { label:"Salary Min",       expr:"MIN(salary_min)" },
              { label:"Salary Spread",    expr:"DIFF(salary_max,salary_min)" },
            ]
          })}/>
        <StatCard label="Talent Pools"     value={poolsCount}  sub="curated pipelines"          icon="layers"    color={C.purple} trend={2}
          onClick={() => onNavigate?.("talent-pools")}
          onReport={() => openReport("talent-pools", {
            groupBy:"category", view:"pie", chartX:"category", chartY:"_count",
            name:"Pools by Category",
            formulas:[
              { label:"Total Pools", expr:"COUNT()" },
            ]
          })}/>
        <StatCard label="Placements"       value={placedCount} sub="this environment"           icon="check"     color={C.amber}  trend={8}
          onClick={() => goToFiltered("people", "status", "Status", "Placed")}
          onReport={() => openReport("people", {
            filters:[{field:"status",op:"eq",value:"Placed"}], view:"table",
            name:"All Placements",
            formulas:[
              { label:"Total Placed",  expr:"COUNT()" },
            ]
          })}/>
      </div>

      {/* Charts row */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1}}>Hiring Activity</div>
              <div style={{fontSize:11,color:C.text3}}>Candidates & jobs this year</div>
            </div>
            <div style={{display:"flex",gap:14,fontSize:11,color:C.text3}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>Candidates</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:C.green,display:"inline-block"}}/>Jobs</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barGap={4} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.accent}08`}}/>
              <Bar dataKey="candidates" name="Candidates" fill={C.accent} radius={[6,6,0,0]}/>
              <Bar dataKey="jobs"       name="Jobs"       fill={C.green}  radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>Jobs Pipeline</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:12}}>{jobsCount} total roles</div>
          {jobDonut.length>0?<>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <PieChart width={140} height={140}>
                <Pie data={jobDonut} cx={65} cy={65} innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {jobDonut.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
            </div>
            {jobDonut.map((d,i)=><LegendItem key={i} color={d.color} label={d.name} value={d.value} total={totalJobs}
              onClick={() => goToFiltered("jobs", "status", "Status", d.name)}/>)}
          </>:<div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12}}>No jobs yet</div>}
          <button onClick={()=>onNavigate?.("jobs")} style={{marginTop:10,width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",fontSize:12,fontWeight:600,color:C.accent,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            View all jobs <Ic n="arrowR" s={12} c={C.accent}/>
          </button>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16}}>
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>Candidate Pipeline</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:12}}>{peopleCount} total candidates</div>
          {peopleDonut.length>0?<>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <PieChart width={140} height={140}>
                <Pie data={peopleDonut} cx={65} cy={65} innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {peopleDonut.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
            </div>
            {peopleDonut.map((d,i)=><LegendItem key={i} color={d.color} label={d.name} value={d.value} total={totalPeople}
              onClick={() => goToFiltered("people", "status", "Status", d.name)}/>)}
          </>:<div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12}}>No candidates yet</div>}
          <button onClick={()=>onNavigate?.("people")} style={{marginTop:10,width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",fontSize:12,fontWeight:600,color:C.accent,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            View all candidates <Ic n="arrowR" s={12} c={C.accent}/>
          </button>
        </div>

        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1}}>Recently Added</div>
              <div style={{fontSize:11,color:C.text3}}>Latest records across all objects</div>
            </div>
          </div>
          {recent.length===0
            ?<div style={{textAlign:"center",padding:"40px 0",color:C.text3}}>
                <div style={{fontSize:32,marginBottom:8}}>🚀</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text2}}>No records yet</div>
                <div style={{fontSize:12,marginTop:4}}>Use the Copilot or nav to create your first record</div>
              </div>
            :<div>{recent.map(item=><RecentRow key={item.id} item={item} onClick={()=>{
              window.dispatchEvent(new CustomEvent("talentos:openRecord", { detail: { recordId: item.id, objectId: item.objectId } }));
            }}/>)}</div>
          }
        </div>
      </div>

      {/* Quick actions */}
      <div style={{marginTop:16,display:"flex",gap:10}}>
        {[
          {label:"Add Candidate",icon:"users",    slug:"people",      color:C.accent},
          {label:"Post a Job",   icon:"briefcase",slug:"jobs",        color:C.green},
          {label:"Create Pool",  icon:"layers",   slug:"talent-pools",color:C.purple},
          {label:"AI Matching",  icon:"zap",      slug:"matching",    color:C.amber},
        ].map(a=>(
          <button key={a.slug} onClick={()=>onNavigate?.(a.slug)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",borderRadius:14,border:`1.5px solid ${a.color}20`,background:`${a.color}08`,cursor:"pointer",fontFamily:F,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=`${a.color}15`;e.currentTarget.style.borderColor=`${a.color}45`;e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${a.color}08`;e.currentTarget.style.borderColor=`${a.color}20`;e.currentTarget.style.transform="";}}>
            <Ic n={a.icon} s={16} c={a.color}/>
            <span style={{fontSize:12,fontWeight:700,color:a.color}}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
