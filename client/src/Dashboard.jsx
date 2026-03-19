import { useState, useEffect, useCallback } from "react";
import api from './apiClient.js';import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#EEF2FF", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", amber:"#F79009", purple:"#7C3AED", red:"#EF4444",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];




const _cache = {};


/* ── Icons ── */
const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    check:"M20 6L9 17l-5-5",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    plus:"M12 5v14M5 12h14",
    arrowR:"M5 12h14M12 5l7 7-7 7",
    trendUp:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    trendDown:"M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    barChart:"M18 20V10M12 20V4M6 20v-6",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    building:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    sparkles:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    alert:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    play:"M5 3l14 9-14 9V3z",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    arrowUpRight:"M7 17L17 7M7 7h10v10",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};


/* ── Agent Activity Feed ── */
const STATUS_STYLES = {
  completed:        { dot: "#0CAF77", bg: "#F0FDF4", label: "Completed" },
  pending_approval: { dot: "#F79009", bg: "#FFFBEB", label: "Needs review" },
  failed:           { dot: "#EF4444", bg: "#FEF2F2", label: "Failed" },
  skipped:          { dot: "#9DA8C7", bg: "#F8FAFC", label: "Skipped" },
  running:          { dot: "#4361EE", bg: "#EEF2FF", label: "Running" },
};
const TRIGGER_LABELS = {
  record_created:"Record created", record_updated:"Record updated", stage_changed:"Stage changed",
  form_submitted:"Form submitted", schedule_daily:"Scheduled", schedule_weekly:"Scheduled",
  manual:"Manual run",
};

function AgentFeedItem({ item, onOpenRecord, onNavigate }) {
  const [exp, setExp] = useState(false);
  const st = STATUS_STYLES[item.status] || STATUS_STYLES.completed;
  const when = (() => {
    const d = Date.now() - new Date(item.created_at).getTime();
    if (d < 60000) return "just now";
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
    return new Date(item.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  })();

  return (
    <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:0}}>
      <div onClick={()=>setExp(!exp)}
        style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",cursor:"pointer",borderRadius:6,transition:"background .1s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

        {/* Status dot + AI badge */}
        <div style={{position:"relative",flexShrink:0,marginTop:2}}>
          <div style={{width:32,height:32,borderRadius:9,background:`${st.bg}`,border:`1.5px solid ${st.dot}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n={item.status==="pending_approval"?"eye":item.status==="failed"?"alert":item.is_ai?"sparkles":"play"} s={14} c={st.dot}/>
          </div>
          {item.is_ai && (
            <div style={{position:"absolute",bottom:-3,right:-3,width:14,height:14,borderRadius:"50%",background:C.purple,border:"1.5px solid white",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z"/></svg>
            </div>
          )}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{item.agent_name}</span>
            {item.record_name && (
              <span onClick={e=>{e.stopPropagation();onOpenRecord?.(item.record_id,item.object_name);}}
                style={{fontSize:11,color:C.accent,background:`${C.accent}10`,padding:"1px 7px",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontWeight:600,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {item.record_name}
                <Ic n="arrowUpRight" s={9} c={C.accent}/>
              </span>
            )}
          </div>
          <div style={{fontSize:11,color:C.text3,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:exp?"normal":"nowrap"}}>
            {item.summary}
          </div>
          {item.status==="pending_approval" && (
            <button onClick={e=>{e.stopPropagation();onNavigate?.("agents");}}
              style={{marginTop:5,padding:"3px 10px",borderRadius:6,border:"none",background:C.amber,color:"white",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:F}}>
              Review →
            </button>
          )}
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
          <span style={{fontSize:10,color:C.text3}}>{when}</span>
          <div style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:5,background:st.bg}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:st.dot}}/>
            <span style={{fontSize:9,fontWeight:700,color:st.dot}}>{st.label}</span>
          </div>
        </div>
      </div>

      {/* Expanded AI output */}
      {exp && item.ai_output && (
        <div style={{margin:"0 0 10px 42px",padding:"9px 12px",borderRadius:8,background:`${C.purple}08`,border:`1px solid ${C.purple}20`,fontSize:11,color:C.text2,lineHeight:1.6,whiteSpace:"pre-wrap",maxHeight:120,overflowY:"auto"}}>
          <div style={{fontSize:9,fontWeight:800,color:C.purple,marginBottom:5,letterSpacing:".06em",textTransform:"uppercase"}}>AI Output</div>
          {item.ai_output}
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ── */
const StatCard = ({ label, value, sub, icon, color, trend, trendLabel, onClick, onReport }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:C.surface,borderRadius:18,border:`1.5px solid ${hov&&onClick?color+"60":C.border}`,
        padding:"22px 24px",flex:1,minWidth:170,cursor:onClick?"pointer":"default",transition:"all .15s",
        boxShadow:hov&&onClick?`0 4px 20px ${color}18`:"0 1px 4px rgba(67,97,238,0.06)"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
        <div style={{width:44,height:44,borderRadius:14,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n={icon} s={20} c={color}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {trend!==undefined&&(
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,
              color:trend>=0?C.green:C.red,background:trend>=0?"#ECFDF5":"#FEF2F2",padding:"4px 9px",borderRadius:99}}>
              <Ic n={trend>=0?"trendUp":"trendDown"} s={10} c={trend>=0?C.green:C.red}/>
              {Math.abs(trend)}%
            </div>
          )}
          {onReport&&<button onClick={e=>{e.stopPropagation();onReport();}}
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",padding:"3px 7px",
              fontSize:10,fontWeight:700,color:C.text3,fontFamily:F,display:"flex",alignItems:"center",gap:3}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
            ↗ Report
          </button>}
        </div>
      </div>
      <div style={{fontSize:32,fontWeight:800,color:C.text1,letterSpacing:"-1px",lineHeight:1}}>{value??0}</div>
      <div style={{fontSize:12,color:C.text3,marginTop:6}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
      {trendLabel&&<div style={{fontSize:10,color:C.text3,marginTop:4,fontStyle:"italic"}}>{trendLabel}</div>}
    </div>
  );
};


/* ── Donut legend row ── */
const LegendItem = ({ color, label, value, total, onClick }) => (
  <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:onClick?"pointer":"default",borderRadius:6,transition:"background .1s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.background="#f8f9fc";}}
    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
    <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
    <div style={{fontSize:12,color:C.text2,flex:1}}>{label}</div>
    <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{value}</div>
    <div style={{fontSize:10,color:C.text3,width:30,textAlign:"right"}}>{total?Math.round(value/total*100):0}%</div>
  </div>
);

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 16px rgba(0,0,0,.1)",fontSize:12,fontFamily:F}}>
      <div style={{fontWeight:700,color:C.text1,marginBottom:4}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,color:C.text2}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:p.fill||p.color}}/>
          {p.name}: <strong style={{color:C.text1}}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Activity row ── */
const ActivityRow = ({ item, objects, onClick }) => {
  const obj = objects?.find(o => o.id === item.object_id);
  const color = obj?.color || C.accent;
  const actionIcon = item.action === "created" ? "plus" : "edit";
  const actionLabel = item.action === "created" ? "Added" : "Updated";
  const recName = item.changes?.first_name
    ? `${item.changes.first_name} ${item.changes.last_name||""}`.trim()
    : item.changes?.job_title || item.changes?.name || item.changes?.pool_name || "Record";
  const when = (() => {
    const d = new Date(item.created_at);
    const diff = Date.now() - d;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  })();
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .1s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{width:34,height:34,borderRadius:10,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={actionIcon} s={15} c={color}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recName}</div>
        <div style={{fontSize:11,color:C.text3}}>{actionLabel} · {obj?.name||"Record"}</div>
      </div>
      <div style={{fontSize:11,color:C.text3,flexShrink:0}}>{when}</div>
    </div>
  );
};


/* ── Main Dashboard ── */
export default function Dashboard({ environment, session, onNavigate, onOpenRecord }) {
  const [stats,   setStats]   = useState(null);
  const [activity,setActivity]= useState([]);
  const [agentFeed,setAgentFeed] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!environment?.id) return;

    if (_cache[environment.id]) {
      setStats(_cache[environment.id].stats);
      setActivity(_cache[environment.id].activity);
      setAgentFeed(_cache[environment.id].agentFeed || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [objs, feed] = await Promise.all([
        api.get(`/objects?environment_id=${environment.id}`),
        api.get(`/records/activity/feed?environment_id=${environment.id}&limit=30`),
      ]);

      if (!Array.isArray(objs)) { setLoading(false); return; }

      // Fetch ALL records (higher limit for monthly chart accuracy)
      const recordSets = await Promise.all(
        objs.map(o => api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=500`))
      );

      // Build counts, status breakdowns, monthly buckets, department breakdown
      const counts={}, statusBreakdowns={}, monthlyBuckets={}, deptBreakdowns={};
      const now = new Date();
      const thisMonth = now.getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

      objs.forEach((o, i) => {
        const res = recordSets[i];
        const records = Array.isArray(res) ? res : (res.records || []);
        counts[o.slug] = res.pagination?.total ?? records.length;

        const sb={}, mb=Array(12).fill(0), dept={};
        records.forEach(rec => {
          const s = rec.data?.status || "Unknown";
          sb[s] = (sb[s]||0) + 1;
          const mo = new Date(rec.created_at).getMonth();
          mb[mo]++;
          const d = rec.data?.department || rec.data?.team || null;
          if (d) dept[d] = (dept[d]||0) + 1;
        });
        statusBreakdowns[o.slug] = sb;
        monthlyBuckets[o.slug]   = mb;
        deptBreakdowns[o.slug]   = dept;
      });

      // Real month-over-month trends
      const trend = (slug) => {
        const mb = monthlyBuckets[slug] || [];
        const cur = mb[thisMonth]||0, prev = mb[lastMonth]||1;
        return prev === 0 ? 0 : Math.round(((cur-prev)/prev)*100);
      };

      const statsData = { counts, statusBreakdowns, monthlyBuckets, deptBreakdowns, objects: objs,
        todayInterviews: 0, pendingOffers: 0, // populated below
        trends: {
          people: trend("people"), jobs: trend("jobs"), pools: trend("talent-pools"),
        }
      };

      // Today's interviews count
      try {
        const interviews = await fetch(`/api/interviews?environment_id=${environment.id}&limit=100`).then(r=>r.json());
        const todayStr = new Date().toISOString().slice(0,10);
        statsData.todayInterviews = (Array.isArray(interviews) ? interviews : interviews.interviews||[])
          .filter(i => i.date === todayStr || (i.date||"").startsWith(todayStr)).length;
      } catch {}

      // Pending offers count
      try {
        const offers = await fetch(`/api/offers?environment_id=${environment.id}&limit=100`).then(r=>r.json());
        statsData.pendingOffers = (Array.isArray(offers) ? offers : offers.offers||[])
          .filter(o => ["pending_approval","approved","sent"].includes(o.status)).length;
      } catch {}

      _cache[environment.id] = { stats: statsData, activity: Array.isArray(feed) ? feed : [], agentFeed: null };
      setStats(statsData);
      setActivity(Array.isArray(feed) ? feed : []);

      // Agent activity feed — non-blocking, loaded after main stats
      try {
        const af = await fetch(`/api/agents/activity-feed?environment_id=${environment.id}&limit=15`).then(r=>r.json());
        if (af && Array.isArray(af.items)) {
          _cache[environment.id].agentFeed = af;
          setAgentFeed(af);
        }
      } catch {}
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { loadData(); }, [loadData]);


  if (loading && !stats) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3,gap:10}}>
      <Ic n="refresh" s={18} c={C.text3}/> Loading dashboard…
    </div>
  );
  if (!stats) return null;

  const objs         = stats.objects || [];
  const peopleCount  = stats.counts["people"]        || 0;
  const jobsCount    = stats.counts["jobs"]           || 0;
  const poolsCount   = stats.counts["talent-pools"]   || 0;
  const jobStatuses  = stats.statusBreakdowns["jobs"] || {};
  const pplStatuses  = stats.statusBreakdowns["people"] || {};
  const openJobs     = jobStatuses["Open"]  || 0;
  const activePeople = pplStatuses["Active"]|| 0;
  const placedCount  = pplStatuses["Placed"]|| 0;

  const JOB_COLORS    = {Open:C.green,Draft:"#94A3B8","On Hold":C.amber,Filled:C.accent,Cancelled:C.red};
  const PEOPLE_COLORS = {Active:C.green,Passive:C.amber,"Not Looking":"#94A3B8",Placed:C.accent,Archived:"#CBD5E1"};

  const jobDonut    = Object.entries(jobStatuses).map(([name,value])=>({name,value,color:JOB_COLORS[name]||"#94A3B8"}));
  const peopleDonut = Object.entries(pplStatuses).map(([name,value])=>({name,value,color:PEOPLE_COLORS[name]||"#94A3B8"}));
  const totalJobs   = jobDonut.reduce((s,d)=>s+d.value,0);
  const totalPeople = peopleDonut.reduce((s,d)=>s+d.value,0);

  // Real monthly bar chart — YTD up to current month
  const nowMonth = new Date().getMonth();
  const barData  = MONTHS.slice(0, nowMonth+1).map((m,i) => ({
    month: m,
    candidates: (stats.monthlyBuckets["people"]||[])[i] || 0,
    jobs:        (stats.monthlyBuckets["jobs"]||[])[i]   || 0,
  }));

  // Open jobs by department
  const deptData = Object.entries(stats.deptBreakdowns["jobs"]||{})
    .map(([dept,count])=>({dept:dept||"Unknown",count}))
    .sort((a,b)=>b.count-a.count)
    .slice(0,8);

  const hr = new Date().getHours();
  const greeting = hr<12 ? "Good morning" : hr<18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const goToFiltered = (objectSlug, fieldKey, fieldLabel, fieldValue) =>
    window.dispatchEvent(new CustomEvent("talentos:filter-navigate", { detail:{fieldKey,fieldLabel,fieldValue,objectSlug} }));

  const openReport = (objectSlug, cfg) =>
    window.dispatchEvent(new CustomEvent("talentos:open-report", { detail:{objectSlug,...cfg} }));


  return (
    <div style={{fontFamily:F,color:C.text1}}>

      {/* Header — compact, no wasted space */}
      <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        {/* Greeting */}
        <div style={{flexShrink:0}}>
          <h1 style={{margin:"0 0 1px",fontSize:20,fontWeight:800,color:C.text1,letterSpacing:"-0.3px"}}>{greeting} 👋</h1>
          <p style={{margin:0,fontSize:11,color:C.text3}}>{today}</p>
        </div>

        {/* Inline quick-stat pills */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",flex:1}}>
          <div onClick={()=>goToFiltered("jobs","status","Status","Open")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:99,background:`${C.green}12`,border:`1px solid ${C.green}28`,cursor:"pointer"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg>
            <span style={{fontSize:12,fontWeight:700,color:C.green}}>{openJobs}</span>
            <span style={{fontSize:11,color:C.text3}}>open roles</span>
          </div>
          <div onClick={()=>onNavigate?.("people")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,cursor:"pointer"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{activePeople}</span>
            <span style={{fontSize:11,color:C.text3}}>active candidates</span>
          </div>
          <div onClick={()=>onNavigate?.("interviews")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:99,background:"#0ca67812",border:"1px solid #0ca67828",cursor:"pointer"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0ca678" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
            <span style={{fontSize:12,fontWeight:700,color:"#0ca678"}}>{stats.todayInterviews||0}</span>
            <span style={{fontSize:11,color:C.text3}}>interviews today</span>
          </div>
          {(stats.pendingOffers||0) > 0 && (
            <div onClick={()=>onNavigate?.("offers")} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:99,background:"#f59e0b12",border:"1px solid #f59e0b28",cursor:"pointer"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              <span style={{fontSize:12,fontWeight:700,color:"#f59e0b"}}>{stats.pendingOffers}</span>
              <span style={{fontSize:11,color:C.text3}}>offers pending</span>
            </div>
          )}
        </div>

        {/* Refresh icon-only */}
        <button onClick={()=>{delete _cache[environment.id];loadData();}} title="Refresh"
          style={{width:30,height:30,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
          <Ic n="refresh" s={13}/>
        </button>
      </div>

      {/* AI at work — live agent stats bar */}
      {agentFeed?.stats && (agentFeed.stats.active_agents > 0 || agentFeed.stats.runs_today > 0) && (
        <div onClick={()=>onNavigate?.("agents")} style={{display:"flex",alignItems:"center",gap:0,marginBottom:16,borderRadius:14,overflow:"hidden",border:`1.5px solid ${C.purple}25`,cursor:"pointer",background:"white",transition:"box-shadow .15s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 20px ${C.purple}15`}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          {/* Label strip */}
          <div style={{padding:"11px 16px",background:`linear-gradient(135deg,${C.purple},#9333ea)`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z"/></svg>
            <span style={{fontSize:11,fontWeight:800,color:"white",letterSpacing:".05em",whiteSpace:"nowrap"}}>AI AGENTS</span>
          </div>
          {/* Stats row */}
          {[
            { value: agentFeed.stats.active_agents,   label: "active",          color: C.green },
            { value: agentFeed.stats.runs_today,       label: "runs today",      color: C.accent },
            { value: agentFeed.stats.ai_actions_today, label: "AI actions",      color: C.purple },
            { value: agentFeed.stats.pending_reviews,  label: "need review",     color: agentFeed.stats.pending_reviews > 0 ? C.amber : C.text3 },
          ].map((s,i) => (
            <div key={i} style={{flex:1,padding:"11px 16px",borderLeft:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,fontWeight:800,color:s.value>0?s.color:C.text3,lineHeight:1}}>{s.value}</span>
              <span style={{fontSize:11,color:C.text3}}>{s.label}</span>
              {s.label==="need review" && s.value>0 && (
                <span style={{marginLeft:"auto",fontSize:10,padding:"2px 8px",borderRadius:5,background:`${C.amber}18`,color:C.amber,fontWeight:700}}>Action needed</span>
              )}
            </div>
          ))}
          <div style={{padding:"0 14px",flexShrink:0}}>
            <Ic n="arrowR" s={14} c={C.text3}/>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <StatCard label="Total Candidates" value={peopleCount} sub={`${activePeople} active`}
          icon="users" color={C.accent} trend={stats.trends.people}
          trendLabel={`vs last month`}
          onClick={()=>onNavigate?.("people")}
          onReport={()=>openReport("people",{groupBy:"status",view:"bar",chartX:"status",chartY:"_count",name:"Candidates by Status"})}/>
        <StatCard label="Open Jobs" value={openJobs} sub={`${jobsCount} total roles`}
          icon="briefcase" color={C.green} trend={stats.trends.jobs}
          trendLabel="vs last month"
          onClick={()=>goToFiltered("jobs","status","Status","Open")}
          onReport={()=>openReport("jobs",{filters:[{field:"status",op:"eq",value:"Open"}],groupBy:"department",view:"bar",chartX:"department",chartY:"_count",name:"Open Jobs by Department"})}/>
        <StatCard label="Talent Pools" value={poolsCount} sub="curated pipelines"
          icon="layers" color={C.purple} trend={stats.trends.pools}
          trendLabel="vs last month"
          onClick={()=>onNavigate?.("talent-pools")}/>
        <StatCard label="Placed" value={placedCount} sub="total placements"
          icon="check" color={C.amber}
          onClick={()=>goToFiltered("people","status","Status","Placed")}
          onReport={()=>openReport("people",{filters:[{field:"status",op:"eq",value:"Placed"}],view:"table",name:"All Placements"})}/>
      </div>


      {/* Charts row — hiring activity + jobs pipeline */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>

        {/* Bar chart — real YTD data */}
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1}}>Hiring Activity</div>
              <div style={{fontSize:11,color:C.text3}}>Records added per month this year</div>
            </div>
            <div style={{display:"flex",gap:14,fontSize:11,color:C.text3}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>Candidates</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:C.green,display:"inline-block"}}/>Jobs</span>
            </div>
          </div>
          {barData.some(d=>d.candidates>0||d.jobs>0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={4} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false} width={28} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.accent}08`}}/>
                <Bar dataKey="candidates" name="Candidates" fill={C.accent} radius={[5,5,0,0]}/>
                <Bar dataKey="jobs"       name="Jobs"       fill={C.green}  radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:12,flexDirection:"column",gap:8}}>
              <div style={{width:44,height:44,borderRadius:13,background:`${C.accent}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              </div>
              No data yet for this year
            </div>
          )}
        </div>

        {/* Jobs pipeline donut */}
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>Jobs Pipeline</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:12}}>{jobsCount} total roles</div>
          {jobDonut.length>0 ? <>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <PieChart width={140} height={140}>
                <Pie data={jobDonut} cx={65} cy={65} innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {jobDonut.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
            </div>
            {jobDonut.map((d,i)=><LegendItem key={i} color={d.color} label={d.name} value={d.value} total={totalJobs}
              onClick={()=>goToFiltered("jobs","status","Status",d.name)}/>)}
          </> : <div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12}}>No jobs yet</div>}
          <button onClick={()=>onNavigate?.("jobs")} style={{marginTop:10,width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",fontSize:12,fontWeight:600,color:C.accent,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            View all jobs <Ic n="arrowR" s={12} c={C.accent}/>
          </button>
        </div>
      </div>


      {/* Bottom row — candidate pipeline + open reqs by dept + activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.4fr",gap:16,marginBottom:16}}>

        {/* Candidate pipeline donut */}
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>Candidate Pipeline</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:12}}>{peopleCount} total</div>
          {peopleDonut.length>0 ? <>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <PieChart width={140} height={140}>
                <Pie data={peopleDonut} cx={65} cy={65} innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {peopleDonut.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
            </div>
            {peopleDonut.map((d,i)=><LegendItem key={i} color={d.color} label={d.name} value={d.value} total={totalPeople}
              onClick={()=>goToFiltered("people","status","Status",d.name)}/>)}
          </> : <div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12}}>No candidates yet</div>}
          <button onClick={()=>onNavigate?.("people")} style={{marginTop:10,width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",fontSize:12,fontWeight:600,color:C.accent,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            View all <Ic n="arrowR" s={12} c={C.accent}/>
          </button>
        </div>

        {/* Open reqs by department */}
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>Open Reqs by Dept</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:16}}>{openJobs} open roles</div>
          {deptData.length>0 ? (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {deptData.map((d,i)=>{
                const pct = openJobs ? Math.round(d.count/openJobs*100) : 0;
                return (
                  <div key={i} onClick={()=>goToFiltered("jobs","department","Department",d.dept)} style={{cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{d.dept}</span>
                      <span style={{color:C.text1,fontWeight:700,flexShrink:0}}>{d.count}</span>
                    </div>
                    <div style={{height:5,borderRadius:99,background:C.border,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:C.green,borderRadius:99,transition:"width .3s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12,flexDirection:"column",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:40,height:40,borderRadius:12,background:`${C.green}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/></svg>
              </div>
              No department data yet
            </div>
          )}
        </div>

        {/* Agent / AI Activity feed */}
        <div style={{background:C.surface,borderRadius:18,border:`1px solid ${C.border}`,padding:"22px 24px",boxShadow:"0 1px 4px rgba(67,97,238,0.06)",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:26,height:26,borderRadius:8,background:`${C.purple}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n="sparkles" s={13} c={C.purple}/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Agent Activity</div>
              </div>
              <div style={{fontSize:11,color:C.text3,marginTop:2,marginLeft:33}}>What your AI agents have been doing</div>
            </div>
            <button onClick={()=>onNavigate?.("agents")}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:8,border:`1.5px solid ${C.purple}30`,background:`${C.purple}08`,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:700,color:C.purple}}>
              All agents <Ic n="arrowR" s={11} c={C.purple}/>
            </button>
          </div>

          {!agentFeed || agentFeed.items.length === 0 ? (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 0",color:C.text3,gap:10}}>
              <div style={{width:48,height:48,borderRadius:14,background:`${C.purple}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic n="sparkles" s={22} c={C.purple}/>
              </div>
              <div style={{fontSize:13,fontWeight:600,color:C.text2,textAlign:"center"}}>No agent runs yet</div>
              <div style={{fontSize:11,color:C.text3,textAlign:"center",maxWidth:180,lineHeight:1.5}}>Create and activate agents to see their activity here</div>
              <button onClick={()=>onNavigate?.("agents")}
                style={{padding:"7px 16px",borderRadius:9,border:"none",background:C.purple,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,marginTop:4}}>
                Go to Agents
              </button>
            </div>
          ) : (
            <div style={{maxHeight:320,overflowY:"auto",flex:1}}>
              {agentFeed.items.map(item => (
                <AgentFeedItem key={item.id} item={item}
                  onOpenRecord={(id, objName) => {
                    // Find the object for this record and dispatch openRecord
                    window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:id,objectName:objName}}));
                  }}
                  onNavigate={onNavigate}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          {label:"Add Candidate", icon:"users",     slug:"people",       color:C.accent},
          {label:"Post a Job",    icon:"briefcase",  slug:"jobs",         color:C.green},
          {label:"Create Pool",   icon:"layers",     slug:"talent-pools", color:C.purple},
          {label:"AI Matching",   icon:"zap",        slug:"matching",     color:C.amber},
        ].map(a=>(
          <button key={a.slug} onClick={()=>onNavigate?.(a.slug)}
            style={{flex:1,minWidth:120,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",borderRadius:14,
              border:`1.5px solid ${a.color}20`,background:`${a.color}08`,cursor:"pointer",fontFamily:F,transition:"all .15s"}}
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
