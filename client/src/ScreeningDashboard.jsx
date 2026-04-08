import { useState, useEffect, useCallback } from "react";
import api from './apiClient.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const C = { card:"#fff", accent:"var(--t-accent,#4361ee)", text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9ca3af)", border:"var(--t-border,#f0f0f0)", green:"#0ca678", amber:"#f59f00", red:"#e03131", purple:"#7c3aed", blue:"#3b82f6" };
const F = "'DM Sans',-apple-system,sans-serif";

const PATHS = {
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:"M20 6L9 17l-5-5",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  calendar:"M3 9h18M3 15h18M8 3v3M16 3v3M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z",
  robot:"M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||""} />
  </svg>
);

const QuickLink = ({ icon, label, color, onClick, badge }) => (
  <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 15px", borderRadius:10, border:`1.5px solid ${color}30`, background:`${color}08`, cursor:"pointer", fontFamily:F, transition:"all .15s", whiteSpace:"nowrap" }}
    onMouseEnter={e=>{ e.currentTarget.style.background=`${color}18`; e.currentTarget.style.borderColor=`${color}60`; }}
    onMouseLeave={e=>{ e.currentTarget.style.background=`${color}08`; e.currentTarget.style.borderColor=`${color}30`; }}>
    <Ic n={icon} s={14} c={color}/>
    <span style={{ fontSize:13, fontWeight:600, color }}>{label}</span>
    {badge!=null&&badge>0&&<span style={{ fontSize:11, fontWeight:700, background:color, color:"white", borderRadius:99, padding:"1px 6px", marginLeft:2 }}>{badge}</span>}
  </button>
);

const StatCard = ({ icon, value, label, sub, color=C.accent }) => (
  <div style={{ background:C.card, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} s={22} c={color}/></div>
      <div>
        <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value??'—'}</div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginTop:3 }}>{label}</div>
      </div>
    </div>
    {sub&&<div style={{ fontSize:12, color:C.text3 }}>{sub}</div>}
  </div>
);

const Card = ({ children, title, style={} }) => (
  <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", padding:"20px 22px", ...style }}>
    {title&&<div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:16 }}>{title}</div>}
    {children}
  </div>
);

const SOURCE_COLORS = ["#4361ee","#0ca678","#f59f00","#7c3aed","#ec4899","#06b6d4","#84cc16","#9ca3af"];
const AI_COLORS = { approved:C.green, rejected:"#e03131", pending:"#f59f00" };

function fmtDate(iso) {
  if (!iso) return "—";
  const diff = Date.now()-new Date(iso).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return `${Math.floor(diff/86400000)}d ago`;
}

export default function ScreeningDashboard({ environment, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const objRes = await api.get(`/objects?environment_id=${environment.id}`);
      const objects = Array.isArray(objRes) ? objRes : (objRes?.objects || objRes?.data || []);
      const peopleObj = objects.find(o=>o.slug==='people'||o.name?.toLowerCase().includes('people')||o.name?.toLowerCase().includes('candidate'));
      if (!peopleObj) { setData({ people:[], awaitingReview:[], aiApproved:[], aiRejected:[], aiPending:[], reviewed:[], bySource:[], funnel:[], recent:[], peopleObj:null }); return; }
      const recRes = await api.get(`/records?object_id=${peopleObj.id}&environment_id=${environment.id}&limit=200`);
      const allRecords = Array.isArray(recRes) ? recRes : (recRes?.records || recRes?.data || []);
      const people = allRecords;

      const awaitingReview = people.filter(p=>{ const s=(p.data?.status||'').toLowerCase(); return ['applied','new','received','pending','screening','pending review'].includes(s); });
      const aiApproved = people.filter(p=>p.data?.ai_screening_result==='approved'||p.data?.ai_status==='approved');
      const aiRejected = people.filter(p=>p.data?.ai_screening_result==='rejected'||p.data?.ai_status==='rejected');
      const aiPending  = people.filter(p=>p.data?.ai_screening_result==='pending' ||p.data?.ai_status==='pending');
      const reviewed   = people.filter(p=>{ const s=(p.data?.status||'').toLowerCase(); return ['reviewed','shortlisted','interview','offer','hired'].includes(s); });

      const sourceMap = {};
      people.forEach(p=>{ const src=p.data?.source||p.data?.application_source||'Direct'; sourceMap[src]=(sourceMap[src]||0)+1; });
      const bySource = Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([source,count],i)=>({ source, count, color:SOURCE_COLORS[i] }));

      const stageOrder=['Applied','Screening','Shortlisted','Interview','Offer','Hired'];
      const stageCounts={}; stageOrder.forEach(s=>{stageCounts[s]=0;});
      people.forEach(p=>{ const s=(p.data?.status||'').toLowerCase();
        if(s.includes('applied')||s.includes('new')||s.includes('received')) stageCounts['Applied']++;
        else if(s.includes('screen')) stageCounts['Screening']++;
        else if(s.includes('short')) stageCounts['Shortlisted']++;
        else if(s.includes('interview')) stageCounts['Interview']++;
        else if(s.includes('offer')) stageCounts['Offer']++;
        else if(s.includes('hired')) stageCounts['Hired']++;
      });
      const funnel = stageOrder.map(s=>({ stage:s, count:stageCounts[s] }));
      const recent = [...people].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,10).map(p=>({
        id:p.id, object_id:p.object_id,
        name:[p.data?.first_name,p.data?.last_name].filter(Boolean).join(' ')||p.data?.email||'Unknown',
        role:p.data?.current_title||p.data?.job_title||'—',
        source:p.data?.source||'—', status:p.data?.status||'New',
        ai_result:p.data?.ai_screening_result||p.data?.ai_status||null, applied:p.created_at,
      }));
      setData({ people, awaitingReview, aiApproved, aiRejected, aiPending, reviewed, bySource, funnel, recent, peopleObj });
    } catch(e){ console.error('[Screening]', e); setError(e.message); } finally { setLoading(false); }
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);
  const nav = id=>{ if(onNavigate) onNavigate(id); };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3 }}>Loading screening data…</div>;
  if (error) return <div style={{ padding:32,fontFamily:F,background:"#fef2f2",borderRadius:12,color:"#e03131",fontSize:13 }}>Error loading screening data: {error}</div>;
  if (!data) return <div style={{ padding:32,fontFamily:F,color:C.text3,textAlign:"center",fontSize:13 }}>No data available — make sure the server is running and People records exist.</div>;
  const { awaitingReview, aiApproved, aiRejected, aiPending, reviewed, bySource, funnel, recent, people } = data;
  const aiTotal = aiApproved.length+aiRejected.length+aiPending.length;
  const aiPieData = [{name:"Approved",value:aiApproved.length,color:C.green},{name:"Rejected",value:aiRejected.length,color:"#e03131"},{name:"Pending",value:aiPending.length,color:C.amber}].filter(d=>d.value>0);

  return (
    <div style={{ fontFamily:F, color:C.text1, width:"100%" }}>
      {/* Dashboard nav pills */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Overview",    nav:"overview",    color:"#6B7280" },
          { label:"Screening",   nav:"screening",   color:"#7F77DD", current:true },
          { label:"Interviews",  nav:"interviews",  color:"#1D9E75" },
          { label:"Offers",      nav:"offers",      color:"#D4537E" },
          { label:"Onboarding",  nav:"onboarding",  color:"#EF9F27" },
        ].map(({ label, nav:n, color, current }) => (
          <button key={n} onClick={() => nav(n)}
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
      {/* Quick Links */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
        <QuickLink icon="users"    label="All Candidates"     color={C.accent}  onClick={()=>nav("people")} badge={people.length}/>
        <QuickLink icon="eye"      label="Awaiting Review"   color={C.amber}   onClick={()=>nav("people")} badge={awaitingReview.length}/>
        <QuickLink icon="search"   label="Search"            color={C.purple}  onClick={()=>nav("search")}/>
        <QuickLink icon="calendar" label="Schedule Interview" color={C.green}  onClick={()=>nav("interviews")}/>
        <QuickLink icon="briefcase" label="Open Jobs"        color={C.blue}    onClick={()=>nav("jobs")}/>
        <QuickLink icon="robot"    label="AI Screening"      color="#7c3aed"   onClick={()=>nav("people")} badge={aiPending.length||null}/>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        <StatCard icon="eye"   value={awaitingReview.length} label="Awaiting Review"    color={C.amber}  sub="need manual review"/>
        <StatCard icon="zap"   value={aiTotal}               label="AI Screened"        color={C.purple} sub={`${aiApproved.length} approved · ${aiRejected.length} rejected`}/>
        <StatCard icon="check" value={reviewed.length}       label="Reviewed"           color={C.green}  sub="moved to next stage"/>
        <StatCard icon="users" value={people.length}         label="Total in Pipeline"  color={C.accent} sub="active candidates"/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:24 }}>
        {/* Funnel */}
        <Card title="Pipeline Funnel">
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {funnel.map((f,i)=>{ const max=Math.max(...funnel.map(x=>x.count),1); const pct=Math.round((f.count/max)*100); const col=["#4361ee","#3b82f6","#7c3aed","#0ca678","#f59f00","#0d9488"][i]; return (
              <div key={f.stage}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:12, fontWeight:600 }}>{f.stage}</span><span style={{ fontSize:12, color:C.text3 }}>{f.count}</span></div>
                <div style={{ height:7, background:"#f3f4f6", borderRadius:99 }}><div style={{ height:7, width:`${pct}%`, background:col, borderRadius:99, transition:"width .4s" }}/></div>
              </div>
            );})}
          </div>
        </Card>

        {/* AI Screening */}
        <Card title="AI Screening Results">
          {aiTotal===0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:C.text3, fontSize:13 }}>No AI screening data yet.<br/><span style={{ fontSize:12 }}>Screening results from Vercentic AI will appear here.</span></div>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
                <PieChart width={150} height={150}><Pie data={aiPieData} cx={75} cy={75} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>{aiPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={(v,n)=>[v,n]} contentStyle={{ borderRadius:8, fontSize:12 }}/></PieChart>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[{label:"AI Approved",count:aiApproved.length,color:C.green},{label:"AI Rejected",count:aiRejected.length,color:"#e03131"},{label:"Pending Review",count:aiPending.length,color:C.amber}].map(item=>(
                  <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:10, height:10, borderRadius:"50%", background:item.color }}/><span style={{ fontSize:12, color:C.text2 }}>{item.label}</span></div>
                    <span style={{ fontSize:13, fontWeight:700 }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Source */}
        <Card title="Candidates by Source">
          {bySource.length===0 ? <div style={{ color:C.text3, fontSize:13, textAlign:"center", padding:"32px 0" }}>No source data</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {bySource.map(s=>{ const pct=people.length>0?Math.round((s.count/people.length)*100):0; return (
                <div key={s.source}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:12, fontWeight:600 }}>{s.source}</span><span style={{ fontSize:12, color:C.text3 }}>{s.count} · {pct}%</span></div>
                  <div style={{ height:6, background:"#f3f4f6", borderRadius:99 }}><div style={{ height:6, width:`${pct}%`, background:s.color, borderRadius:99 }}/></div>
                </div>
              );})}
            </div>
          )}
        </Card>
      </div>

      {/* Recent applications */}
      <Card title="Recent Applications">
        {recent.length===0 ? <div style={{ textAlign:"center", padding:"24px 0", color:C.text3, fontSize:13 }}>No candidates yet</div> : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Candidate","Current Role","Source","Status","AI Result","Applied"].map(h=><th key={h} style={{ textAlign:"left", fontSize:11, fontWeight:700, color:C.text3, padding:"6px 12px", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>{recent.map((r,i)=>(
              <tr key={r.id} style={{ background:i%2===0?"transparent":"#fafafa", cursor:"pointer" }} onClick={()=>window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:r.id,objectId:r.object_id}}))}>
                <td style={{ padding:"10px 12px", fontSize:13, fontWeight:600, color:C.accent }}>{r.name}</td>
                <td style={{ padding:"10px 12px", fontSize:12, color:C.text2 }}>{r.role}</td>
                <td style={{ padding:"10px 12px", fontSize:12, color:C.text3 }}>{r.source}</td>
                <td style={{ padding:"10px 12px" }}><span style={{ fontSize:11, padding:"3px 9px", borderRadius:99, fontWeight:600, background:`${C.amber}15`, color:C.amber }}>{r.status}</span></td>
                <td style={{ padding:"10px 12px" }}>{r.ai_result?<span style={{ fontSize:11, padding:"3px 9px", borderRadius:99, fontWeight:600, background:`${AI_COLORS[r.ai_result]||C.text3}15`, color:AI_COLORS[r.ai_result]||C.text3 }}>{r.ai_result}</span>:<span style={{ color:C.text3, fontSize:12 }}>—</span>}</td>
                <td style={{ padding:"10px 12px", fontSize:12, color:C.text3 }}>{fmtDate(r.applied)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
