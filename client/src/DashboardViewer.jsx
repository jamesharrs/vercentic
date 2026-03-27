import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import apiClient from "./apiClient";

const V = { bg:"var(--t-bg,#f5f5f7)",card:"var(--t-card,#fff)",accent:"var(--t-accent,#4f46e5)",text1:"var(--t-text1,#111827)",text2:"var(--t-text2,#374151)",text3:"var(--t-text3,#9ca3af)",border:"var(--t-border,#e5e7eb)",red:"#ef4444" };
const F = "'DM Sans',-apple-system,sans-serif";
const PALETTES = ["#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#ec4899","#14b8a6","#f59e0b","#6366f1"];
const api = { get:(u)=>apiClient.get(u.replace(/^\/api/,"")).catch(()=>null) };

const PATHS = {
  refresh:"M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  layout:"M12 3H3v7h9V3zm9 0h-7v4h7V3zm0 6h-7v12h7V9zm-9 4H3v8h9v-8z",
  chevD:"M6 9l6 6 6-6",arrowUp:"M12 19V5M5 12l7-7 7 7",arrowDown:"M12 5v14M5 12l7 7 7-7",
};
function Ic({n,s=16,c="currentColor"}){ const d=PATHS[n]||PATHS.layout; return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }

function fmtAgo(d){const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return s+"s ago";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";}
function fmtNum(n){if(typeof n!=="number")return n;if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"k";return n.toLocaleString();}

function Skeleton(){return <div style={{ height:"100%",display:"flex",flexDirection:"column",gap:8,padding:4 }}>
  {[80,60,40,60,30].map((w,i)=><div key={i} style={{ height:12,width:`${w}%`,borderRadius:6,background:`${V.border}` }}/>)}
</div>;}
function ErrorState({msg}){return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:12,color:V.red }}>{msg==="Permission denied"?"🔒 No access":msg}</div>;}

function StatPanel({ panel, data }) {
  if (!data) return <Skeleton/>;
  if (data.error) return <ErrorState msg={data.error}/>;
  const { value, label, trend } = data;
  const tp=trend>0, tn=trend<0;
  const tc=tp?"#059669":tn?V.red:V.text3; const tb=tp?"#f0fdf4":tn?"#fef2f2":`${V.border}40`;
  return <div style={{ height:"100%",display:"flex",flexDirection:"column",justifyContent:"center" }}>
    {panel.title&&<div style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>{panel.title}</div>}
    <div style={{ fontSize:48,fontWeight:900,color:V.accent,letterSpacing:"-0.05em",lineHeight:1 }}>{fmtNum(value)}</div>
    <div style={{ fontSize:13,color:V.text3,marginTop:6 }}>{label}</div>
    {trend!==0&&<div style={{ display:"inline-flex",alignItems:"center",gap:5,marginTop:10,padding:"4px 10px",borderRadius:20,background:tb,width:"fit-content" }}>
      <Ic n={tp?"arrowUp":"arrowDown"} s={12} c={tc}/><span style={{ fontSize:12,fontWeight:700,color:tc }}>{Math.abs(trend)}% vs last period</span>
    </div>}
  </div>;
}

function ChartPanel({ panel, data }) {
  if (!data) return <Skeleton/>;
  if (data.error) return <ErrorState msg={data.error}/>;
  const { chartData=[], chartType="bar" } = data;
  return <div style={{ height:"100%",display:"flex",flexDirection:"column" }}>
    {panel.title&&<div style={{ fontSize:12,fontWeight:700,color:V.text2,marginBottom:10 }}>{panel.title}<span style={{ fontSize:11,color:V.text3,fontWeight:400,marginLeft:6 }}>{data.total} total</span></div>}
    <div style={{ flex:1,minHeight:0 }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType==="pie"?
          <PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={2}>{chartData.map((_,i)=><Cell key={i} fill={PALETTES[i%PALETTES.length]}/>)}</Pie><Tooltip contentStyle={{ fontSize:12,fontFamily:F,borderRadius:8,border:`1px solid ${V.border}` }}/></PieChart>
        :chartType==="line"?
          <AreaChart data={chartData} margin={{ top:4,right:8,bottom:0,left:-20 }}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={V.accent} stopOpacity={0.15}/><stop offset="95%" stopColor={V.accent} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{ fontSize:10,fontFamily:F,fill:V.text3 }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize:10,fontFamily:F,fill:V.text3 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ fontSize:12,fontFamily:F,borderRadius:8,border:`1px solid ${V.border}` }}/><Area type="monotone" dataKey="value" stroke={V.accent} strokeWidth={2} fill="url(#ag)" dot={false}/></AreaChart>
        :
          <BarChart data={chartData} margin={{ top:4,right:8,bottom:0,left:-20 }}><XAxis dataKey="name" tick={{ fontSize:10,fontFamily:F,fill:V.text3 }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize:10,fontFamily:F,fill:V.text3 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ fontSize:12,fontFamily:F,borderRadius:8,border:`1px solid ${V.border}` }}/><Bar dataKey="value" radius={[4,4,0,0]}>{chartData.map((_,i)=><Cell key={i} fill={PALETTES[i%PALETTES.length]}/>)}</Bar></BarChart>}
      </ResponsiveContainer>
    </div>
  </div>;
}

function ListPanel({ panel, data, onOpenRecord }) {
  if (!data) return <Skeleton/>;
  if (data.error) return <ErrorState msg={data.error}/>;
  const { records=[], columns=[], object, total } = data;
  return <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
    {panel.title&&<div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexShrink:0 }}>
      <span style={{ fontSize:12,fontWeight:700,color:V.text2 }}>{panel.title}</span><span style={{ fontSize:11,color:V.text3 }}>{total} total</span>
    </div>}
    {columns.length>0&&<div style={{ display:"grid",gridTemplateColumns:`repeat(${Math.min(columns.length,4)},1fr)`,gap:"0 8px",paddingBottom:5,marginBottom:4,borderBottom:`1px solid ${V.border}`,flexShrink:0 }}>
      {columns.slice(0,4).map(c=><div key={c.id} style={{ fontSize:10,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>{c.name}</div>)}
    </div>}
    <div style={{ flex:1,overflowY:"auto" }}>
      {records.map(r=><div key={r.id} onClick={()=>onOpenRecord?.(r.id,r.object_id)} style={{ display:"grid",gridTemplateColumns:`repeat(${Math.min(columns.length,4)},1fr)`,gap:"0 8px",padding:"5px 0",borderBottom:`0.5px solid ${V.border}40`,cursor:"pointer",transition:"background 0.1s" }} onMouseEnter={e=>e.currentTarget.style.background=`${V.accent}05`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        {columns.slice(0,4).map(c=><div key={c.id} style={{ fontSize:12,color:V.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{r.data?.[c.api_key]!=null?String(r.data[c.api_key]):"—"}</div>)}
      </div>)}
      {records.length===0&&<div style={{ fontSize:12,color:V.text3,padding:"16px 0" }}>No records found</div>}
    </div>
  </div>;
}

function ActivityPanel({ panel, data }) {
  if (!data) return <Skeleton/>;
  if (data.error) return <ErrorState msg={data.error}/>;
  const { items=[] } = data;
  const aC={ create:"#059669",edit:V.accent,delete:V.red };
  return <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
    {panel.title&&<div style={{ fontSize:12,fontWeight:700,color:V.text2,marginBottom:10,flexShrink:0 }}>{panel.title}</div>}
    <div style={{ flex:1,overflowY:"auto" }}>
      {items.map((item,i)=><div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderBottom:i<items.length-1?`0.5px solid ${V.border}40`:"none" }}>
        <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,background:`${aC[item.action]||V.accent}15`,display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ width:6,height:6,borderRadius:"50%",background:aC[item.action]||V.accent }}/></div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:12,color:V.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}><strong style={{ fontWeight:600 }}>{item.user_name||"Someone"}</strong> {item.action==="create"?"created":item.action==="edit"?"updated":item.action} <span style={{ color:V.text3 }}>{item.record_name||"a record"}</span></div>
          <div style={{ fontSize:10,color:V.text3,marginTop:2 }}>{item.object_type||""} · {fmtAgo(item.created_at)}</div>
        </div>
      </div>)}
      {items.length===0&&<div style={{ fontSize:12,color:V.text3 }}>No recent activity</div>}
    </div>
  </div>;
}

function TextPanel({ panel, data }) {
  if (!data) return <Skeleton/>;
  return <div style={{ height:"100%",overflow:"auto",background:data.bg_color }}>
    {panel.title&&<div style={{ fontSize:13,fontWeight:700,color:V.text1,marginBottom:8 }}>{panel.title}</div>}
    <div style={{ fontSize:13,color:V.text2,lineHeight:1.6,whiteSpace:"pre-wrap" }}>{data.content||""}</div>
  </div>;
}

function DashboardSwitcher({ dashboards, current, onChange }) {
  const [open,setOpen]=useState(false); const ref=useRef(null);
  useEffect(()=>{ const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  // No early return after hooks — use conditional render in JSX
  if(dashboards.length<=1)return <span/>; 
  return <div ref={ref} style={{ position:"relative" }}>
    <button onClick={()=>setOpen(p=>!p)} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1.5px solid ${V.border}`,background:V.card,fontSize:12,color:V.text2,cursor:"pointer",fontFamily:F,fontWeight:600 }}>
      <div style={{ width:8,height:8,borderRadius:"50%",background:current?.color||V.accent }}/>{current?.name||"Select dashboard"}<Ic n="chevD" s={12} c={V.text3}/>
    </button>
    {open&&<div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:V.card,borderRadius:10,border:`1px solid ${V.border}`,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",minWidth:220,overflow:"hidden" }}>
      {dashboards.map(d=><button key={d.id} onClick={()=>{onChange(d);setOpen(false);}} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"none",background:d.id===current?.id?`${V.accent}08`:"transparent",cursor:"pointer",fontFamily:F,textAlign:"left",fontSize:13,color:d.id===current?.id?V.accent:V.text2,fontWeight:d.id===current?.id?700:500 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:d.color||V.accent,flexShrink:0 }}/><span style={{ flex:1 }}>{d.name}</span>{d.is_default&&<span style={{ fontSize:10,color:V.text3 }}>default</span>}
      </button>)}
    </div>}
  </div>;
}

export default function DashboardViewer({ environment, session, onNavigate, onOpenRecord, onManage }) {
  const [dashboards,setDashboards]=useState([]);
  const [current,setCurrent]=useState(null);
  const [panelData,setPanelData]=useState({});
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const envId=environment?.id;

  const loadAllPanelData=useCallback(async(dash)=>{
    if(!dash?.panels?.length)return;
    const fetches=dash.panels.map(p=>api.get(`/api/dashboards/${dash.id}/panels/${p.id}/data?environment_id=${envId}`).then(d=>({id:p.id,data:d})));
    const results=await Promise.all(fetches);
    const map={}; results.forEach(r=>{if(r)map[r.id]=r.data;}); setPanelData(map);
  },[envId]);

  const loadDashboard=useCallback(async id=>{
    const dash=await api.get(`/api/dashboards/${id}`);
    if(dash?.id){setCurrent(dash);loadAllPanelData(dash);}
  },[loadAllPanelData]);

  useEffect(()=>{
    if(!envId)return;
    setLoading(true);
    api.get(`/api/dashboards?environment_id=${envId}`).then(async dbs=>{
      const list=Array.isArray(dbs)?dbs:[];
      setDashboards(list);
      if(!list.length){setLoading(false);return;}
      const def=list.find(d=>d.is_default)||list[0];
      const full=await api.get(`/api/dashboards/${def.id}`);
      if(full?.id){setCurrent(full);loadAllPanelData(full);}
      setLoading(false);
    });
  },[envId,loadAllPanelData]);

  const handleRefresh=async()=>{
    if(!current||refreshing)return;
    setRefreshing(true); setPanelData({});
    await loadAllPanelData(current); setRefreshing(false);
  };

  const handleSwitch=dash=>{setCurrent({...dash,panels:[]});setPanelData({});loadDashboard(dash.id);};

  const renderPanel=panel=>{
    const data=panelData[panel.id];
    const props={panel,data,onNavigate,onOpenRecord};
    switch(panel.type){
      case "stat":         return <StatPanel {...props}/>;
      case "chart":        return <ChartPanel {...props}/>;
      case "list":         return <ListPanel {...props}/>;
      case "activity":     return <ActivityPanel {...props}/>;
      case "text":         return <TextPanel {...props}/>;
      case "saved_report": return <div style={{ fontSize:12,color:V.text3,display:"flex",height:"100%",alignItems:"center",justifyContent:"center" }}>Report panel</div>;
      default:             return <div style={{ fontSize:12,color:V.text3 }}>Unknown type</div>;
    }
  };

  if(loading)return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:V.text3 }}>Loading dashboard…</div>;
  if(!dashboards.length)return (
    <div style={{ padding:"60px 32px",fontFamily:F,textAlign:"center",color:V.text3 }}>
      <div style={{ width:56,height:56,borderRadius:16,background:`${V.accent}10`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}><Ic n="layout" s={24} c={V.accent}/></div>
      <div style={{ fontWeight:700,color:V.text2,fontSize:15,marginBottom:6 }}>No dashboards yet</div>
      <div style={{ fontSize:13,marginBottom:16 }}>Create your first dashboard in the admin panel</div>
      {onManage&&<button onClick={onManage} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:V.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F }}>Create Dashboard</button>}
    </div>
  );

  const panels=current?.panels||[];
  const canEdit=current?.can_edit;
  return (
    <div style={{ fontFamily:F,color:V.text1,padding:"20px 24px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <DashboardSwitcher dashboards={dashboards} current={current} onChange={handleSwitch}/>
        <div style={{ flex:1 }}/>
        {canEdit&&onManage&&<button onClick={onManage} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1.5px solid ${V.border}`,background:"transparent",fontSize:12,color:V.text2,cursor:"pointer",fontFamily:F }}><Ic n="settings" s={13} c={V.text3}/> Manage</button>}
        <button onClick={handleRefresh} disabled={refreshing} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1.5px solid ${V.border}`,background:"transparent",fontSize:12,color:V.text2,cursor:"pointer",fontFamily:F }}>
          <Ic n="refresh" s={13} c={refreshing?V.text3:V.text2}/>{refreshing?"Refreshing…":"Refresh"}
        </button>
      </div>
      {panels.length>0?(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:14,alignItems:"start" }}>
          {panels.map(panel=>{ const pos=panel.position||{}; const cs=Math.max(1,Math.min(pos.w||6,12)); const mh=`${(pos.h||4)*60}px`;
            return <div key={panel.id} style={{ gridColumn:`span ${cs}`,minHeight:mh,background:V.card,borderRadius:14,border:`1.5px solid ${V.border}`,padding:"16px 18px",boxSizing:"border-box",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>{renderPanel(panel)}</div>;
          })}
        </div>
      ):<div style={{ textAlign:"center",padding:"60px 0",color:V.text3,fontSize:13 }}>This dashboard has no panels yet.{canEdit&&" Add panels in the editor."}</div>}
    </div>
  );
}
