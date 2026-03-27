import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import apiClient from "./apiClient";

const V = { bg:"var(--t-bg,#f5f5f7)", card:"var(--t-card,#fff)", accent:"var(--t-accent,#4f46e5)", text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9ca3af)", border:"var(--t-border,#e5e7eb)", red:"#ef4444" };
const F = "'DM Sans',-apple-system,sans-serif";
const CHART_PALETTES = ["#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#ec4899","#14b8a6"];

const PATHS = {
  layout:"M12 3H3v7h9V3zm9 0h-7v4h7V3zm0 6h-7v12h7V9zm-9 4H3v8h9v-8z",plus:"M12 5v14M5 12h14",x:"M18 6L6 18M6 6l12 12",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",save:"M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 110 6 3 3 0 010-6z",copy:"M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  bar2:"M18 20V10M12 20V4M6 20v-6",pie2:"M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z",list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",text2:"M17 6H3M21 12H3M21 18H3",ai:"M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
  report:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  check:"M20 6L9 17l-5-5",chevD:"M6 9l6 6 6-6",
};
function Ic({ n, s=16, c="currentColor" }) {
  const d = PATHS[n] || PATHS.layout;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

const PANEL_TYPES = [
  { type:"stat",        label:"KPI Stat",     icon:"bar2",     desc:"Single number with trend",   color:"#4f46e5" },
  { type:"chart",       label:"Chart",         icon:"pie2",     desc:"Bar, line or pie chart",     color:"#0891b2" },
  { type:"list",        label:"Record List",   icon:"list",     desc:"Filtered table of records",  color:"#059669" },
  { type:"activity",    label:"Activity Feed", icon:"activity", desc:"Recent activity log",        color:"#d97706" },
  { type:"saved_report",label:"Saved Report",  icon:"report",   desc:"Embed a saved report",       color:"#7c3aed" },
  { type:"text",        label:"Text / Note",   icon:"text2",    desc:"Announcement or text block", color:"#374151" },
];

const api = {
  get:    (u)   => apiClient.get(u.replace(/^\/api/,"")),
  post:   (u,b) => apiClient.post(u.replace(/^\/api/,""),b),
  patch:  (u,b) => apiClient.patch(u.replace(/^\/api/,""),b),
  delete: (u)   => apiClient.delete(u.replace(/^\/api/,"")),
};

function Inp({ val, onChange, placeholder, type="text", style={} }) {
  return <input value={val??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{ width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${V.border}`,fontSize:13,fontFamily:F,color:V.text1,background:V.card,outline:"none",...style }}/>;
}
function Sel({ val, onChange, opts, placeholder="" }) {
  return <select value={val??""} onChange={e=>onChange(e.target.value)} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${V.border}`,fontSize:13,fontFamily:F,color:V.text1,background:V.card,outline:"none" }}>
    {placeholder&&<option value="">{placeholder}</option>}
    {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}
function Pill({ label, active, onClick, color }) {
  const c = color || V.accent;
  return <button onClick={onClick} style={{ padding:"5px 14px",borderRadius:20,border:`1.5px solid ${active?c:V.border}`,background:active?c:"transparent",color:active?"#fff":V.text3,fontSize:12,fontWeight:600,fontFamily:F,cursor:"pointer",transition:"all 0.12s" }}>{label}</button>;
}

function PanelPreview({ panel, liveData }) {
  const { type, title, config } = panel;
  const wrap = { background:V.card,borderRadius:12,border:`1.5px solid ${V.border}`,padding:"14px 16px",height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",boxSizing:"border-box" };
  const titleEl = title && <div style={{ fontSize:12,fontWeight:700,color:V.text2,marginBottom:10 }}>{title}</div>;
  if (!liveData) return <div style={wrap}>{titleEl}<div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:V.text3 }}>Loading…</div></div>;
  if (liveData.error) return <div style={wrap}>{titleEl}<div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:V.red }}>{liveData.error}</div></div>;
  if (type==="stat") {
    const trend = liveData.trend||0; const tc = trend>0?"#059669":trend<0?V.red:V.text3;
    return <div style={wrap}>{titleEl}<div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center" }}>
      <div style={{ fontSize:40,fontWeight:800,color:V.accent,letterSpacing:"-0.04em",lineHeight:1 }}>{typeof liveData.value==="number"?liveData.value.toLocaleString():liveData.value}</div>
      <div style={{ fontSize:12,color:V.text3,marginTop:4 }}>{liveData.label}</div>
      {trend!==0&&<div style={{ fontSize:11,color:tc,marginTop:6,fontWeight:600 }}>{trend>0?"↑":"↓"} {Math.abs(trend)}% vs prev period</div>}
    </div></div>;
  }
  if (type==="chart") {
    const { chartData=[], chartType="bar" } = liveData;
    return <div style={wrap}>{titleEl}<div style={{ flex:1,minHeight:0 }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType==="pie"?<PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%">{chartData.map((_,i)=><Cell key={i} fill={CHART_PALETTES[i%CHART_PALETTES.length]}/>)}</Pie><Tooltip contentStyle={{ fontSize:11,fontFamily:F }}/></PieChart>
        :<BarChart data={chartData} margin={{ top:4,right:4,bottom:0,left:-20 }}><XAxis dataKey="name" tick={{ fontSize:10,fontFamily:F }}/><YAxis tick={{ fontSize:10,fontFamily:F }}/><Tooltip contentStyle={{ fontSize:11,fontFamily:F }}/><Bar dataKey="value" fill={V.accent} radius={[4,4,0,0]}/></BarChart>}
      </ResponsiveContainer>
    </div></div>;
  }
  if (type==="list") {
    const { records=[], columns=[], object, total } = liveData;
    return <div style={wrap}>{titleEl}<div style={{ fontSize:11,color:V.text3,marginBottom:6 }}>{object?.plural_name} · {total} total</div>
      <div style={{ flex:1,overflow:"hidden" }}>
        {records.slice(0,6).map(r=><div key={r.id} style={{ display:"grid",gridTemplateColumns:`repeat(${Math.min(columns.length,3)},1fr)`,gap:"0 8px",padding:"4px 0",borderBottom:`0.5px solid rgba(0,0,0,0.04)` }}>
          {columns.slice(0,3).map(c=><div key={c.id} style={{ fontSize:11,color:V.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.data?.[c.api_key]!=null?String(r.data[c.api_key]):"—"}</div>)}
        </div>)}
      </div>
    </div>;
  }
  if (type==="activity") {
    const fmtAgo=d=>{const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return s+"s ago";if(s<3600)return Math.floor(s/60)+"m ago";return Math.floor(s/3600)+"h ago";};
    return <div style={wrap}>{titleEl}<div style={{ flex:1,overflow:"hidden" }}>
      {(liveData.items||[]).map((item,i)=><div key={i} style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"5px 0",borderBottom:`0.5px solid rgba(0,0,0,0.04)` }}>
        <div style={{ width:6,height:6,borderRadius:"50%",background:V.accent,flexShrink:0,marginTop:5 }}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:11,color:V.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.action} {item.record_name||"record"}</div>
          <div style={{ fontSize:10,color:V.text3 }}>{fmtAgo(item.created_at)}</div>
        </div>
      </div>)}
    </div></div>;
  }
  if (type==="text") return <div style={{ ...wrap,background:liveData.bg_color||V.card }}>{titleEl}<div style={{ flex:1,fontSize:13,color:V.text2,lineHeight:1.6,whiteSpace:"pre-wrap",overflow:"auto" }}>{liveData.content||"Add content in panel settings."}</div></div>;
  return <div style={wrap}>{titleEl}<div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:V.text3 }}>Preview unavailable</div></div>;
}

function PanelConfigEditor({ panel, objects, savedReports, onChange }) {
  const { type, title, config={}, position={} } = panel;
  const [fields, setFields] = useState([]);
  useEffect(()=>{ if(config.object_id) api.get(`/api/fields?object_id=${config.object_id}`).then(f=>setFields(Array.isArray(f)?f:[])); },[config.object_id]);
  const set = (k,v) => onChange({ ...panel, config:{ ...config,[k]:v }});
  const sizeOpts = { w:[1,2,3,4,6,8,12].map(n=>({value:n,label:`${n} cols`})), h:[2,3,4,5,6,8].map(n=>({value:n,label:`${n} rows`})) };
  return <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
    <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Size</label>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6 }}>
        <Sel val={position.w||6} onChange={v=>onChange({...panel,position:{...position,w:Number(v)}})} opts={sizeOpts.w}/>
        <Sel val={position.h||4} onChange={v=>onChange({...panel,position:{...position,h:Number(v)}})} opts={sizeOpts.h}/>
      </div>
    </div>
    <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Title</label><Inp val={title} onChange={v=>onChange({...panel,title:v})} placeholder="Optional…" style={{ marginTop:6 }}/></div>
    {(type==="stat"||type==="chart"||type==="list")&&<div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Object</label><Sel val={config.object_id||""} onChange={v=>set("object_id",v)} placeholder="Select object…" opts={objects.map(o=>({value:o.id,label:o.plural_name||o.name}))} style={{ marginTop:6 }}/></div>}
    {type==="stat"&&fields.length>0&&<>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Filter field</label><Sel val={config.filter_field||""} onChange={v=>set("filter_field",v)} placeholder="No filter" opts={fields.map(f=>({value:f.api_key,label:f.name}))} style={{ marginTop:6 }}/></div>
      {config.filter_field&&<div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Filter value</label><Inp val={config.filter_value||""} onChange={v=>set("filter_value",v)} placeholder="e.g. Open" style={{ marginTop:6 }}/></div>}
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Label</label><Inp val={config.label||""} onChange={v=>set("label",v)} placeholder="Records" style={{ marginTop:6 }}/></div>
    </>}
    {type==="chart"&&fields.length>0&&<>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Group by</label><Sel val={config.group_by_field||""} onChange={v=>set("group_by_field",v)} placeholder="Select field…" opts={fields.map(f=>({value:f.api_key,label:f.name}))} style={{ marginTop:6 }}/></div>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Chart type</label><div style={{ display:"flex",gap:6,marginTop:6 }}>{["bar","line","pie"].map(ct=><Pill key={ct} label={ct.charAt(0).toUpperCase()+ct.slice(1)} active={config.chart_type===ct} onClick={()=>set("chart_type",ct)}/>)}</div></div>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Filter field</label><Sel val={config.filter_field||""} onChange={v=>set("filter_field",v)} placeholder="No filter" opts={fields.map(f=>({value:f.api_key,label:f.name}))} style={{ marginTop:6 }}/></div>
      {config.filter_field&&<div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Filter value</label><Inp val={config.filter_value||""} onChange={v=>set("filter_value",v)} placeholder="e.g. Active" style={{ marginTop:6 }}/></div>}
    </>}
    {type==="list"&&fields.length>0&&<>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Columns</label>
        <div style={{ marginTop:6,display:"flex",flexDirection:"column",gap:4 }}>{fields.slice(0,12).map(f=><label key={f.id} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.text2,cursor:"pointer" }}><input type="checkbox" checked={(config.column_field_ids||[]).includes(f.id)} onChange={e=>{ const cur=config.column_field_ids||[]; set("column_field_ids",e.target.checked?[...cur,f.id]:cur.filter(id=>id!==f.id)); }} style={{ accentColor:V.accent }}/>{f.name}</label>)}</div>
      </div>
      <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Max rows</label><Inp val={config.limit||10} onChange={v=>set("limit",Number(v))} type="number" style={{ marginTop:6 }}/></div>
    </>}
    {type==="text"&&<div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Content</label>
      <textarea value={config.content||""} onChange={e=>set("content",e.target.value)} placeholder="Enter text…" style={{ width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${V.border}`,fontSize:13,fontFamily:F,color:V.text1,background:V.card,outline:"none",minHeight:100,resize:"vertical",marginTop:6 }}/>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:8 }}><label style={{ fontSize:11,color:V.text3 }}>Background:</label><input type="color" value={config.bg_color||"#ffffff"} onChange={e=>set("bg_color",e.target.value)} style={{ width:36,height:28,border:"none",borderRadius:6,cursor:"pointer",background:"none",padding:0 }}/></div>
    </div>}
    {type==="saved_report"&&<div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Report</label><Sel val={config.report_id||""} onChange={v=>set("report_id",v)} placeholder="Select report…" opts={(savedReports||[]).map(r=>({value:r.id,label:r.name}))} style={{ marginTop:6 }}/></div>}
  </div>;
}

function AccessEditor({ access={}, roles, users, onChange }) {
  const a = access||{};
  const { type="everyone", role_ids=[], user_ids=[], editor_role_ids=[] } = a;
  return <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
    <div>
      <label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Who can view</label>
      <div style={{ display:"flex",gap:6,marginTop:8,flexWrap:"wrap" }}>
        {["everyone","roles","users"].map(t=><Pill key={t} label={t==="everyone"?"Everyone":t==="roles"?"By role":"Specific users"} active={type===t} onClick={()=>onChange({...a,type:t})}/>)}
      </div>
    </div>
    {type==="roles"&&<div><label style={{ fontSize:11,fontWeight:600,color:V.text3 }}>Viewer roles</label>
      <div style={{ display:"flex",flexDirection:"column",gap:4,marginTop:6 }}>{roles.map(r=><label key={r.id} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.text2,cursor:"pointer" }}><input type="checkbox" checked={role_ids.includes(r.id)} onChange={()=>onChange({...a,role_ids:role_ids.includes(r.id)?role_ids.filter(x=>x!==r.id):[...role_ids,r.id]})} style={{ accentColor:V.accent }}/><span style={{ width:8,height:8,borderRadius:"50%",background:r.color||V.accent,display:"inline-block" }}/>{r.name}</label>)}</div>
    </div>}
    {type==="users"&&<div><label style={{ fontSize:11,fontWeight:600,color:V.text3 }}>Viewer users</label>
      <div style={{ display:"flex",flexDirection:"column",gap:4,marginTop:6 }}>{users.map(u=><label key={u.id} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.text2,cursor:"pointer" }}><input type="checkbox" checked={user_ids.includes(u.id)} onChange={()=>onChange({...a,user_ids:user_ids.includes(u.id)?user_ids.filter(x=>x!==u.id):[...user_ids,u.id]})} style={{ accentColor:V.accent }}/>{u.first_name} {u.last_name} <span style={{ color:V.text3,fontSize:11 }}>({u.email})</span></label>)}</div>
    </div>}
    <div style={{ height:1,background:V.border }}/>
    <div><label style={{ fontSize:11,fontWeight:700,color:V.text3,textTransform:"uppercase",letterSpacing:"0.05em" }}>Who can edit</label>
      <div style={{ display:"flex",flexDirection:"column",gap:4,marginTop:8 }}>{roles.map(r=><label key={r.id} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.text2,cursor:"pointer" }}><input type="checkbox" checked={editor_role_ids.includes(r.id)} onChange={()=>onChange({...a,editor_role_ids:editor_role_ids.includes(r.id)?editor_role_ids.filter(x=>x!==r.id):[...editor_role_ids,r.id]})} style={{ accentColor:V.accent }}/><span style={{ width:8,height:8,borderRadius:"50%",background:r.color||V.accent,display:"inline-block" }}/>{r.name} <span style={{ fontSize:10,color:V.text3 }}>(edit)</span></label>)}</div>
    </div>
    <div style={{ background:`${V.accent}08`,border:`1px solid ${V.accent}20`,borderRadius:10,padding:12 }}>
      <div style={{ fontSize:11,color:V.text2,lineHeight:1.5 }}><strong>Note:</strong> Data access (RBAC) is always enforced regardless of dashboard access. Users only see data their role permits.</div>
    </div>
  </div>;
}

function MsgBar({ msg }) {
  if (!msg) return null;
  return <div style={{ marginBottom:12,padding:"10px 16px",borderRadius:10,background:msg.err?"#fef2f2":"#f0fdf4",border:`1px solid ${msg.err?"#fecaca":"#bbf7d0"}`,fontSize:13,color:msg.err?V.red:"#059669" }}>{msg.text}</div>;
}

async function aiGenerateDashboard(prompt, objects) {
  const systemCtx = `You are building a dashboard for a recruitment/HR platform called Vercentic.
Available objects: ${objects.map(o=>o.plural_name||o.name).join(", ")}.
Panel types: stat, chart, list, activity, text.
For stat: include object_id, filter_field, filter_value, label.
For chart: include object_id, group_by_field (api_key of the field), chart_type (bar/line/pie).
For list: include object_id, limit.
Grid is 12 columns. w should be 3,4,6 or 12. h should be 3,4 or 5.
Object IDs: ${objects.map(o=>`"${o.plural_name||o.name}":"${o.id}"`).join(", ")}.
Respond ONLY with valid JSON: { name, description, panels:[{type,title,position:{x,y,w,h},config:{...}}] }`;
  const resp = await fetch("/api/ai/chat",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ messages:[{role:"user",content:prompt}],system:systemCtx,max_tokens:2000 })});
  const data = await resp.json();
  const text = (data.content||[]).find(b=>b.type==="text")?.text||"";
  const clean = text.replace(/```json|```/g,"").trim();
  return JSON.parse(clean);
}

export default function DashboardBuilder({ environment, session, onBack }) {
  const [dashboards, setDashboards] = useState([]);
  const [editing,    setEditing]    = useState(null);
  const [selPanel,   setSelPanel]   = useState(null);
  const [liveData,   setLiveData]   = useState({});
  const [objects,    setObjects]    = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [users,      setUsers]      = useState([]);
  const [savedRpts,  setSavedRpts]  = useState([]);
  const [view,       setView]       = useState("list");
  const [saving,     setSaving]     = useState(false);
  const [aiPrompt,   setAiPrompt]   = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [createModal,setCreateModal]= useState(false);
  const [newDash,    setNewDash]    = useState({ name:"",description:"",color:"#4f46e5",icon:"layout" });
  const [msg,        setMsg]        = useState(null);
  const envId = environment?.id;
  const flash = (m,isErr=false) => { setMsg({text:m,err:isErr}); setTimeout(()=>setMsg(null),3000); };

  useEffect(()=>{
    if(!envId) return;
    Promise.all([api.get(`/api/dashboards?environment_id=${envId}`),api.get(`/api/objects?environment_id=${envId}`),api.get("/api/roles"),api.get("/api/users"),api.get(`/api/saved-views?environment_id=${envId}`)]).then(([dbs,objs,rls,usrs,rpts])=>{
      setDashboards(Array.isArray(dbs)?dbs:[]);
      setObjects(Array.isArray(objs)?objs:[]);
      setRoles(Array.isArray(rls)?rls:[]);
      setUsers(Array.isArray(usrs)?usrs:[]);
      setSavedRpts(Array.isArray(rpts)?rpts:[]);
    });
  },[envId]);

  useEffect(()=>{
    if(!editing) return;
    (editing.panels||[]).forEach(p=>{
      api.get(`/api/dashboards/${editing.id}/panels/${p.id}/data?environment_id=${envId}`).then(d=>setLiveData(prev=>({...prev,[p.id]:d})));
    });
  },[editing?.id, editing?.panels?.length, envId]);

  const handleCreate = async () => {
    if (!newDash.name) return;
    setSaving(true);
    const d = await api.post("/api/dashboards",{...newDash,environment_id:envId});
    setSaving(false);
    if (d.id) { setDashboards(prev=>[d,...prev]); setCreateModal(false); setNewDash({name:"",description:"",color:"#4f46e5",icon:"layout"}); handleEdit({...d,panels:[]}); }
  };
  const handleDelete = async id => { if(!window.confirm("Delete this dashboard?"))return; await api.delete(`/api/dashboards/${id}`); setDashboards(prev=>prev.filter(d=>d.id!==id)); };
  const handleDuplicate = async dash => { const d=await api.post(`/api/dashboards/${dash.id}/duplicate`,{}); if(d.id){setDashboards(prev=>[d,...prev]);flash("Duplicated");} };
  const handleSetDefault = async dash => { await api.patch(`/api/dashboards/${dash.id}`,{is_default:true}); setDashboards(prev=>prev.map(d=>({...d,is_default:d.id===dash.id}))); flash("Set as default"); };
  const handleEdit = async dash => { const full=await api.get(`/api/dashboards/${dash.id}`); setEditing(full.id?full:{...dash,panels:[]}); setView("builder"); setSelPanel(null); };
  const handleSaveDashboard = async () => {
    if(!editing)return; setSaving(true);
    await api.patch(`/api/dashboards/${editing.id}`,{name:editing.name,description:editing.description,icon:editing.icon,color:editing.color,is_default:editing.is_default});
    setSaving(false); flash("Saved"); setDashboards(prev=>prev.map(d=>d.id===editing.id?{...d,...editing}:d));
  };
  const handleAddPanel = async type => {
    const def=PANEL_TYPES.find(p=>p.type===type);
    const panel=await api.post(`/api/dashboards/${editing.id}/panels`,{type,title:def?.label||type,position:{x:0,y:(editing.panels||[]).length*4,w:6,h:4},config:{}});
    if(panel.id){setEditing(prev=>({...prev,panels:[...(prev.panels||[]),panel]}));setSelPanel(panel.id);}
  };
  const handleUpdatePanel = async updated => {
    setEditing(prev=>({...prev,panels:(prev.panels||[]).map(p=>p.id===updated.id?updated:p)}));
    await api.patch(`/api/dashboards/${editing.id}/panels/${updated.id}`,updated);
    api.get(`/api/dashboards/${editing.id}/panels/${updated.id}/data?environment_id=${envId}`).then(d=>setLiveData(prev=>({...prev,[updated.id]:d})));
  };
  const handleDeletePanel = async panelId => {
    await api.delete(`/api/dashboards/${editing.id}/panels/${panelId}`);
    setEditing(prev=>({...prev,panels:(prev.panels||[]).filter(p=>p.id!==panelId)}));
    if(selPanel===panelId) setSelPanel(null);
  };
  const handleSaveAccess = async access => { await api.patch(`/api/dashboards/${editing.id}`,{access}); setEditing(prev=>({...prev,access})); flash("Access saved"); };
  const handleAIGenerate = async () => {
    if(!aiPrompt)return; setAiLoading(true);
    try {
      const gen=await aiGenerateDashboard(aiPrompt,objects);
      if(gen.panels&&editing){
        for(const p of gen.panels){const panel=await api.post(`/api/dashboards/${editing.id}/panels`,p);if(panel.id)setEditing(prev=>({...prev,panels:[...(prev.panels||[]),panel]}));}
        if(gen.name&&!editing.name){await api.patch(`/api/dashboards/${editing.id}`,{name:gen.name,description:gen.description});setEditing(prev=>({...prev,name:gen.name||prev.name,description:gen.description||prev.description}));}
        flash(`Added ${gen.panels.length} panels`);
      }
      setShowAI(false); setAiPrompt("");
    } catch(e){flash("AI failed: "+e.message,true);}
    finally{setAiLoading(false);}
  };

  // MsgBar is a module-level component — see below

  // ── List view ──────────────────────────────────────────────────────────────
  if (view==="list") return (
    <div style={{ fontFamily:F,color:V.text1,padding:"28px 32px",maxWidth:1100 }}>
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:28 }}>
        <div><h1 style={{ margin:0,fontSize:24,fontWeight:800,letterSpacing:"-0.03em" }}>Dashboards</h1>
          <p style={{ margin:"4px 0 0",fontSize:13,color:V.text3 }}>Create and manage dashboards. Access is controlled per dashboard.</p></div>
        <button onClick={()=>setCreateModal(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:10,border:"none",background:V.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F }}>
          <Ic n="plus" s={14} c="#fff"/> New Dashboard
        </button>
      </div>
      <MsgBar msg={msg}/>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
        {dashboards.map(d=>(
          <div key={d.id} style={{ background:V.card,borderRadius:14,border:`1.5px solid ${V.border}`,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{ height:4,background:d.color||V.accent }}/>
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:10 }}>
                <div style={{ width:34,height:34,borderRadius:10,background:`${d.color||V.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n={d.icon||"layout"} s={17} c={d.color||V.accent}/></div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:V.text1,display:"flex",alignItems:"center",gap:6 }}>{d.name}{d.is_default&&<span style={{ fontSize:10,background:`${V.accent}15`,color:V.accent,padding:"2px 7px",borderRadius:20,fontWeight:700 }}>DEFAULT</span>}</div>
                  {d.description&&<div style={{ fontSize:12,color:V.text3,marginTop:2 }}>{d.description}</div>}
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12,fontSize:12,color:V.text3 }}>
                <span>{d.panel_count||0} panels</span>
                <span>{d.access?.type==="everyone"?"🌐 Everyone":d.access?.type==="roles"?`🔒 ${(d.access?.role_ids||[]).length} roles`:`👤 ${(d.access?.user_ids||[]).length} users`}</span>
              </div>
              <div style={{ display:"flex",gap:6 }}>
                {d.can_edit!==false&&<button onClick={()=>handleEdit(d)} style={{ flex:1,padding:"7px",borderRadius:8,border:`1.5px solid ${V.accent}`,background:"transparent",color:V.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F }}>Edit</button>}
                {!d.is_default&&d.can_edit!==false&&<button onClick={()=>handleSetDefault(d)} style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",color:V.text3,fontSize:11,cursor:"pointer",fontFamily:F }}>Default</button>}
                {d.can_edit!==false&&<button onClick={()=>handleDuplicate(d)} style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",color:V.text3,fontSize:11,cursor:"pointer",fontFamily:F }}><Ic n="copy" s={13} c={V.text3}/></button>}
                {d.can_edit!==false&&<button onClick={()=>handleDelete(d.id)} style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",color:V.red,fontSize:11,cursor:"pointer",fontFamily:F }}><Ic n="trash" s={13} c={V.red}/></button>}
              </div>
            </div>
          </div>
        ))}
        {dashboards.length===0&&<div style={{ gridColumn:"1/-1",textAlign:"center",padding:"60px 0" }}>
          <div style={{ width:48,height:48,borderRadius:14,background:`${V.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}><Ic n="layout" s={22} c={V.accent}/></div>
          <div style={{ fontWeight:700,color:V.text2,marginBottom:4 }}>No dashboards yet</div>
          <div style={{ fontSize:13,color:V.text3,marginBottom:16 }}>Create your first dashboard</div>
          <button onClick={()=>setCreateModal(true)} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:V.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F }}>Create Dashboard</button>
        </div>}
      </div>
      {createModal&&<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }} onClick={e=>e.target===e.currentTarget&&setCreateModal(false)}>
        <div style={{ background:V.card,borderRadius:16,padding:28,width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
          <h2 style={{ margin:"0 0 20px",fontSize:18,fontWeight:800 }}>New Dashboard</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <Inp val={newDash.name} onChange={v=>setNewDash(p=>({...p,name:v}))} placeholder="Dashboard name"/>
            <Inp val={newDash.description} onChange={v=>setNewDash(p=>({...p,description:v}))} placeholder="Description (optional)"/>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}><label style={{ fontSize:12,color:V.text3 }}>Colour:</label><input type="color" value={newDash.color} onChange={e=>setNewDash(p=>({...p,color:e.target.value}))} style={{ width:36,height:28,border:"none",borderRadius:6,cursor:"pointer",background:"none",padding:0 }}/><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:V.text2,cursor:"pointer",marginLeft:10 }}><input type="checkbox" checked={newDash.is_default||false} onChange={e=>setNewDash(p=>({...p,is_default:e.target.checked}))} style={{ accentColor:V.accent }}/>Set as default</label></div>
          </div>
          <div style={{ display:"flex",gap:8,marginTop:20 }}>
            <button onClick={()=>setCreateModal(false)} style={{ flex:1,padding:"10px",borderRadius:10,border:`1px solid ${V.border}`,background:"transparent",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F }}>Cancel</button>
            <button onClick={handleCreate} disabled={!newDash.name||saving} style={{ flex:2,padding:"10px",borderRadius:10,border:"none",background:V.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:!newDash.name?0.5:1 }}>{saving?"Creating…":"Create & Edit"}</button>
          </div>
        </div>
      </div>}
    </div>
  );

  // ── Builder view ────────────────────────────────────────────────────────────
  if (view==="builder"&&editing) {
    const panels=editing.panels||[];
    const selectedPanel=panels.find(p=>p.id===selPanel);
    const IC = { stat:"#4f46e5",chart:"#0891b2",list:"#059669",activity:"#d97706",text:"#374151",saved_report:"#7c3aed" };
    return (
      <div style={{ fontFamily:F,color:V.text1,display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 20px",background:V.card,borderBottom:`1px solid ${V.border}`,flexShrink:0,zIndex:10 }}>
          <button onClick={()=>setView("list")} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",fontSize:13,color:V.text2,cursor:"pointer",fontFamily:F }}>← Dashboards</button>
          <div style={{ width:10,height:10,borderRadius:"50%",background:editing.color||V.accent }}/>
          <input value={editing.name||""} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} style={{ fontSize:15,fontWeight:700,color:V.text1,border:"none",outline:"none",background:"transparent",fontFamily:F,flex:1,minWidth:180 }} placeholder="Dashboard name"/>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setView("access")} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",fontSize:12,color:V.text2,cursor:"pointer",fontFamily:F }}><Ic n="lock" s={13} c={V.text3}/> Access</button>
            <button onClick={()=>setShowAI(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${V.accent}`,background:`${V.accent}10`,fontSize:12,color:V.accent,cursor:"pointer",fontFamily:F,fontWeight:700 }}><Ic n="ai" s={13} c={V.accent}/> AI Suggest</button>
            <button onClick={handleSaveDashboard} disabled={saving} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,border:"none",background:V.accent,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F }}><Ic n="save" s={13} c="#fff"/> {saving?"Saving…":"Save"}</button>
          </div>
        </div>
        {msg&&<div style={{ padding:"8px 20px",background:msg.err?"#fef2f2":"#f0fdf4",borderBottom:`1px solid ${msg.err?"#fecaca":"#bbf7d0"}`,fontSize:12,color:msg.err?V.red:"#059669" }}>{msg.text}</div>}
        <div style={{ display:"flex",flex:1,minHeight:0 }}>
          {/* Panel library */}
          <div style={{ width:196,borderRight:`1px solid ${V.border}`,background:V.bg,padding:"16px 10px",flexShrink:0,overflowY:"auto" }}>
            <div style={{ fontSize:10,fontWeight:700,color:V.text3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10 }}>Add Panel</div>
            {PANEL_TYPES.map(pt=>(
              <button key={pt.type} onClick={()=>handleAddPanel(pt.type)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",borderRadius:10,border:"1px solid transparent",background:"transparent",cursor:"pointer",fontFamily:F,textAlign:"left",marginBottom:3,transition:"all 0.12s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=V.card;e.currentTarget.style.borderColor=V.border;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                <div style={{ width:28,height:28,borderRadius:8,background:`${pt.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n={pt.icon} s={14} c={pt.color}/></div>
                <div><div style={{ fontSize:12,fontWeight:600,color:V.text1 }}>{pt.label}</div><div style={{ fontSize:10,color:V.text3 }}>{pt.desc}</div></div>
              </button>
            ))}
          </div>
          {/* Canvas */}
          <div style={{ flex:1,overflowY:"auto",padding:20,background:V.bg }}>
            {panels.length===0?<div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",textAlign:"center",color:V.text3 }}>
              <div style={{ width:52,height:52,borderRadius:16,background:`${V.accent}10`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}><Ic n="plus" s={22} c={V.accent}/></div>
              <div style={{ fontWeight:700,color:V.text2,marginBottom:4 }}>Add your first panel</div>
              <div style={{ fontSize:13 }}>Choose from the left or use AI Suggest</div>
            </div>:(
              <div style={{ display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:12 }}>
                {panels.map(p=>{ const pos=p.position||{}; const cs=Math.min(pos.w||6,12); const isSel=selPanel===p.id;
                  return <div key={p.id} onClick={()=>setSelPanel(p.id)} style={{ gridColumn:`span ${cs}`,minHeight:`${(pos.h||4)*60}px`,position:"relative",borderRadius:14,cursor:"pointer",outline:isSel?`2px solid ${V.accent}`:"2px solid transparent",transition:"outline 0.15s" }}>
                    <PanelPreview panel={p} liveData={liveData[p.id]}/>
                    <div style={{ position:"absolute",top:8,right:8 }}><span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:`${IC[p.type]||V.accent}20`,color:IC[p.type]||V.accent,fontWeight:700 }}>{PANEL_TYPES.find(pt=>pt.type===p.type)?.label||p.type}</span></div>
                  </div>;
                })}
              </div>
            )}
          </div>
          {/* Config panel */}
          <div style={{ width:256,borderLeft:`1px solid ${V.border}`,background:V.card,flexShrink:0,display:"flex",flexDirection:"column",overflowY:"auto" }}>
            {selectedPanel?<>
              <div style={{ padding:"12px 14px",borderBottom:`1px solid ${V.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ fontSize:13,fontWeight:700,color:V.text1 }}>Panel Settings</div>
                <button onClick={()=>handleDeletePanel(selectedPanel.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><Ic n="trash" s={14} c={V.red}/></button>
              </div>
              <div style={{ padding:14,flex:1 }}><PanelConfigEditor panel={selectedPanel} objects={objects} savedReports={savedRpts} onChange={handleUpdatePanel}/></div>
            </>:<div style={{ padding:20,textAlign:"center",color:V.text3,marginTop:40 }}><Ic n="settings" s={24} c={V.text3}/><div style={{ fontSize:12,marginTop:8 }}>Select a panel to configure</div></div>}
          </div>
        </div>
        {showAI&&<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100 }} onClick={e=>e.target===e.currentTarget&&setShowAI(false)}>
          <div style={{ background:V.card,borderRadius:16,padding:28,width:460,boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}><div style={{ width:32,height:32,borderRadius:10,background:`${V.accent}15`,display:"flex",alignItems:"center",justifyContent:"center" }}><Ic n="ai" s={16} c={V.accent}/></div><h2 style={{ margin:0,fontSize:16,fontWeight:800 }}>AI Dashboard Builder</h2></div>
            <p style={{ margin:"0 0 12px",fontSize:13,color:V.text3 }}>Describe what you want to see — AI will add configured panels automatically.</p>
            <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="e.g. Show me open jobs by department, candidate pipeline by status, and recent activity" style={{ width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${V.border}`,fontSize:13,fontFamily:F,color:V.text1,background:V.bg,outline:"none",minHeight:90,resize:"vertical",marginBottom:14 }}/>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>setShowAI(false)} style={{ flex:1,padding:"10px",borderRadius:10,border:`1px solid ${V.border}`,background:"transparent",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F }}>Cancel</button>
              <button onClick={handleAIGenerate} disabled={!aiPrompt||aiLoading} style={{ flex:2,padding:"10px",borderRadius:10,border:"none",background:V.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:!aiPrompt||aiLoading?0.6:1 }}>{aiLoading?"Generating…":"Generate Panels"}</button>
            </div>
          </div>
        </div>}
      </div>
    );
  }

  // ── Access view ─────────────────────────────────────────────────────────────
  if (view==="access"&&editing) return (
    <div style={{ fontFamily:F,color:V.text1,display:"flex",flexDirection:"column",height:"100vh" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 20px",background:V.card,borderBottom:`1px solid ${V.border}` }}>
        <button onClick={()=>setView("builder")} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${V.border}`,background:"transparent",fontSize:13,color:V.text2,cursor:"pointer",fontFamily:F }}>← Builder</button>
        <div style={{ flex:1,fontSize:15,fontWeight:700 }}>Access Settings — {editing.name}</div>
        <MsgBar msg={msg}/>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:32,maxWidth:560 }}>
        <AccessEditor access={editing.access} roles={roles} users={users} onChange={access=>handleSaveAccess(access)}/>
      </div>
    </div>
  );
  return null;
}
