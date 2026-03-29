// client/src/OnboardingDashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const C = { card:"#fff", accent:"var(--t-accent,#4361ee)", text1:"#111827", text2:"#374151", text3:"#9ca3af", border:"#f0f0f0", green:"#0ca678", amber:"#f59f00", red:"#e03131", purple:"#7c3aed", blue:"#3b82f6", teal:"#0d9488" };
const F = "'DM Sans',-apple-system,sans-serif";

const PATHS = {
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
  check:"M20 6L9 17l-5-5",
  file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3",
  calendar:"M3 9h18M3 15h18M8 3v3M16 3v3M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z",
  alert:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  clipboard:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8",
  arrow:"M5 12h14M12 5l7 7-7 7",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||""} />
  </svg>
);

const QuickLink = ({ icon, label, color, onClick, badge, comingSoon }) => (
  <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:10, border:`1.5px solid ${comingSoon?"#e5e7eb":color+"30"}`, background:comingSoon?"#f9fafb":`${color}08`, cursor:"pointer", fontFamily:F, transition:"all .15s", whiteSpace:"nowrap", opacity:comingSoon?0.7:1 }}
    onMouseEnter={e=>{ if (!comingSoon){ e.currentTarget.style.background=`${color}15`; e.currentTarget.style.borderColor=`${color}60`; }}}
    onMouseLeave={e=>{ if (!comingSoon){ e.currentTarget.style.background=`${color}08`; e.currentTarget.style.borderColor=`${color}30`; }}}>
    <Ic n={icon} s={15} c={comingSoon?C.text3:color}/>
    <span style={{ fontSize:13, fontWeight:600, color:comingSoon?C.text3:color }}>{label}</span>
    {comingSoon&&<span style={{ fontSize:10, fontWeight:600, color:C.text3, background:"#f3f4f6", padding:"1px 6px", borderRadius:99, marginLeft:2 }}>Soon</span>}
    {badge!=null&&badge>0&&<span style={{ fontSize:11, fontWeight:700, background:color, color:"white", borderRadius:99, padding:"1px 7px", marginLeft:2 }}>{badge}</span>}
  </button>
);

const StatCard = ({ icon, value, label, sub, color=C.accent, alert }) => (
  <div style={{ background:C.card, borderRadius:14, padding:"18px 20px", border:`1.5px solid ${alert?C.red+"40":C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", position:"relative" }}>
    {alert&&<div style={{ position:"absolute", top:12, right:12, width:8, height:8, borderRadius:"50%", background:C.red }}/>}
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} s={22} c={color}/></div>
      <div>
        <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value??'—'}</div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginTop:3 }}>{label}</div>
      </div>
    </div>
    {sub&&<div style={{ fontSize:12, color:alert?C.red:C.text3 }}>{sub}</div>}
  </div>
);

const Card = ({ children, title, titleRight, style={} }) => (
  <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", padding:"20px 22px", ...style }}>
    {(title||titleRight)&&(
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        {title&&<div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{title}</div>}
        {titleRight}
      </div>
    )}
    {children}
  </div>
);

// Placeholder tile for upcoming features
const PlaceholderTile = ({ icon, title, description, color, badge }) => (
  <div style={{ background:"#fafafa", borderRadius:12, border:`1.5px dashed ${C.border}`, padding:"20px", textAlign:"center" }}>
    <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
      <Ic n={icon} s={20} c={color}/>
    </div>
    <div style={{ fontSize:13, fontWeight:700, color:C.text2, marginBottom:4 }}>{title}</div>
    <div style={{ fontSize:12, color:C.text3, lineHeight:1.5 }}>{description}</div>
    {badge&&<div style={{ marginTop:8, display:"inline-block", fontSize:10, fontWeight:700, color, background:`${color}15`, padding:"2px 8px", borderRadius:99 }}>{badge}</div>}
  </div>
);

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso)-Date.now())/86400000);
}

export default function OnboardingDashboard({ environment, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("pre"); // pre | post

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const [objRes, recRes, offerRes] = await Promise.all([
        api.get(`/objects?environment_id=${environment.id}`),
        api.get(`/records?environment_id=${environment.id}&limit=500`),
        api.get(`/offers?environment_id=${environment.id}&limit=200`).catch(()=>({ offers:[] })),
      ]);
      const objects = Array.isArray(objRes) ? objRes : (objRes.objects || []);
      const allRecords = Array.isArray(recRes) ? recRes : (recRes.records || []);
      const allOffers = Array.isArray(offerRes) ? offerRes : (offerRes.offers || []);

      const peopleObj = objects.find(o=>o.slug==='people'||o.name?.toLowerCase().includes('people'));
      const people = peopleObj ? allRecords.filter(r=>r.object_id===peopleObj.id) : [];

      // Pre-boarding: accepted offers awaiting start
      const acceptedOffers = allOffers.filter(o=>o.status==='accepted');
      const startingSoon = acceptedOffers.filter(o=>{ const d=daysUntil(o.data?.start_date||o.start_date); return d!=null&&d>=0&&d<=30; });
      const startingThisMonth = acceptedOffers.filter(o=>{ const d=daysUntil(o.data?.start_date||o.start_date); return d!=null&&d>=0&&d<=30; });
      const docsNeeded = acceptedOffers.filter(o=>(o.data?.docs_status||'pending')==='pending');

      // People with hired/onboarding status
      const onboarding = people.filter(p=>{
        const s=(p.data?.status||'').toLowerCase();
        return s.includes('hired')||s.includes('onboard')||s.includes('starting');
      });
      const probationDue = people.filter(p=>{
        const d=daysUntil(p.data?.probation_end||p.data?.probation_review_date);
        return d!=null&&d>=0&&d<=14;
      });

      // Month-by-month starters chart (last 6 months)
      const monthlyMap = {};
      for (let i=5;i>=0;i--) {
        const d=new Date(); d.setMonth(d.getMonth()-i); d.setDate(1);
        const key=d.toLocaleString('default',{month:'short'});
        monthlyMap[key]=0;
      }
      acceptedOffers.forEach(o=>{
        const sd=o.data?.start_date||o.start_date;
        if (sd) {
          const key=new Date(sd).toLocaleString('default',{month:'short'});
          if (monthlyMap[key]!==undefined) monthlyMap[key]++;
        }
      });
      const monthlyStarters = Object.entries(monthlyMap).map(([month,count])=>({month,count}));

      setData({ people, acceptedOffers, startingThisMonth, docsNeeded, onboarding, probationDue, monthlyStarters });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);

  const nav = id=>{ if(onNavigate) onNavigate(id); };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3 }}>Loading onboarding data…</div>;
  if (!data) return null;
  const { acceptedOffers, startingThisMonth, docsNeeded, onboarding, probationDue, monthlyStarters } = data;

  return (
    <div style={{ fontFamily:F, color:C.text1, width:"100%" }}>
      {/* Quick links */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"16px 20px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
        <QuickLink icon="users"     label="All People"            color={C.accent} onClick={()=>nav("people")}/>
        <QuickLink icon="check"     label="Accepted Offers"       color={C.green}  onClick={()=>nav("offers")} badge={acceptedOffers.length}/>
        <QuickLink icon="file"      label="Documents Pending"     color={C.amber}  onClick={()=>nav("people")} badge={docsNeeded.length}/>
        <QuickLink icon="calendar"  label="Starting This Month"   color={C.teal}   onClick={()=>nav("people")} badge={startingThisMonth.length}/>
        <QuickLink icon="clipboard" label="Onboarding Tasks"      color={C.purple} comingSoon/>
        <QuickLink icon="shield"    label="Right to Work"         color={C.blue}   comingSoon/>
        <QuickLink icon="star"      label="Probation Reviews"     color={C.amber}  onClick={()=>nav("people")} badge={probationDue.length||null}/>
        <QuickLink icon="mail"      label="Send Welcome Email"    color={C.green}  comingSoon/>
      </div>

      {/* Phase toggle */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, padding:4, borderRadius:10, border:`1px solid ${C.border}`, width:"fit-content" }}>
        {[{id:"pre",label:"Pre-boarding"},{ id:"post",label:"Post-start"}].map(p=>(
          <button key={p.id} onClick={()=>setPhase(p.id)} style={{ padding:"7px 18px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:phase===p.id?700:500, background:phase===p.id?C.accent:"transparent", color:phase===p.id?"white":C.text3, transition:"all .15s" }}>{p.label}</button>
        ))}
      </div>

      {/* Pre-boarding view */}
      {phase==="pre"&&(
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            <StatCard icon="check"     value={acceptedOffers.length}      label="Accepted Offers"      color={C.green}  sub="awaiting start date"/>
            <StatCard icon="calendar"  value={startingThisMonth.length}   label="Starting This Month"  color={C.teal}   sub="in next 30 days"/>
            <StatCard icon="file"      value={docsNeeded.length}          label="Docs Pending"         color={C.amber}  sub="documents outstanding" alert={docsNeeded.length>0}/>
            <StatCard icon="briefcase" value={onboarding.length}          label="In Onboarding"        color={C.purple} sub="active onboarding"/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:24 }}>
            {/* Starters by month */}
            <Card title="New Starters by Month">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyStarters} barSize={32}>
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:C.text3 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11, fill:C.text3 }} axisLine={false} tickLine={false} width={24} allowDecimals={false}/>
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12, border:`1px solid ${C.border}` }}/>
                  <Bar dataKey="count" fill={C.teal} radius={[6,6,0,0]} name="Starters"/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pre-boarding checklist summary */}
            <Card title="Pre-boarding Checklist">
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Offer accepted",     done: acceptedOffers.length>0, note:`${acceptedOffers.length} offers` },
                  { label:"Start date confirmed",done: startingThisMonth.length>0, note:`${startingThisMonth.length} confirmed` },
                  { label:"Documents collected", done: docsNeeded.length===0, note: docsNeeded.length>0?`${docsNeeded.length} pending`:"All collected" },
                  { label:"Right to Work check", done: false, note:"Coming soon", soon:true },
                  { label:"Equipment requested", done: false, note:"Coming soon", soon:true },
                  { label:"Welcome email sent",  done: false, note:"Coming soon", soon:true },
                ].map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:item.soon?"#f3f4f6":item.done?C.green+"20":C.amber+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {item.soon?<Ic n="clock" s={11} c={C.text3}/>:item.done?<Ic n="check" s={11} c={C.green}/>:<Ic n="clock" s={11} c={C.amber}/>}
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, color:item.soon?C.text3:C.text1, fontWeight:600 }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize:11, color:item.soon?C.text3:item.done?C.green:C.amber }}>{item.note}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Upcoming starters table */}
          <Card title="Upcoming Starters">
            {acceptedOffers.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:C.text3, fontSize:13 }}>No accepted offers yet</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Candidate","Role","Start Date","Days Until","Docs Status"].map(h=>(
                  <th key={h} style={{ textAlign:"left", fontSize:11, fontWeight:700, color:C.text3, padding:"6px 12px", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}</tr></thead>
                <tbody>{acceptedOffers.slice(0,8).map((o,i)=>{
                  const d=daysUntil(o.data?.start_date||o.start_date);
                  const name=o.candidate_name||`Candidate ${i+1}`;
                  const docStatus=o.data?.docs_status||'pending';
                  return (
                    <tr key={o.id} style={{ background:i%2===0?"transparent":"#fafafa" }}>
                      <td style={{ padding:"10px 12px", fontSize:13, fontWeight:600 }}>{name}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:C.text2 }}>{o.job_title||o.data?.job_title||'—'}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:C.text2 }}>{fmtDate(o.data?.start_date||o.start_date)}</td>
                      <td style={{ padding:"10px 12px" }}>
                        {d!=null?<span style={{ fontSize:12, fontWeight:700, color:d<=7?C.red:d<=14?C.amber:C.green }}>{d===0?"Today":d<0?"Started":d+" days"}</span>:<span style={{ color:C.text3 }}>—</span>}
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ fontSize:11, padding:"3px 9px", borderRadius:99, fontWeight:600, background:docStatus==='complete'?C.green+"15":C.amber+"15", color:docStatus==='complete'?C.green:C.amber }}>{docStatus}</span>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {/* Post-start view */}
      {phase==="post"&&(
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            <StatCard icon="users"     value={onboarding.length}    label="In Onboarding"         color={C.purple} sub="active"/>
            <StatCard icon="star"      value={probationDue.length}  label="Probation Reviews Due"  color={C.amber}  sub="within 14 days" alert={probationDue.length>0}/>
            <StatCard icon="clipboard" value="—"                    label="Tasks Overdue"          color={C.red}    sub="coming soon"/>
            <StatCard icon="check"     value="—"                    label="Fully Onboarded"        color={C.green}  sub="coming soon"/>
          </div>

          {/* Placeholder tiles for upcoming features */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:24 }}>
            <PlaceholderTile icon="clipboard" title="Task Management" description="Assign and track onboarding tasks per new starter — induction, training, system access." color={C.purple} badge="Coming Soon"/>
            <PlaceholderTile icon="shield"    title="Right to Work"   description="Track RTW document status, expiry dates, and re-verification reminders." color={C.blue}   badge="Coming Soon"/>
            <PlaceholderTile icon="star"      title="Probation Milestones" description="Set probation review dates, record feedback, and trigger extensions or confirmations." color={C.amber} badge="Coming Soon"/>
            <PlaceholderTile icon="briefcase" title="Equipment & Access" description="Manage laptop, access cards, software licences — requested before day 1." color={C.teal}  badge="Coming Soon"/>
            <PlaceholderTile icon="mail"      title="Welcome Communications" description="Automated welcome emails, day-1 schedule, team intro packs." color={C.green} badge="Coming Soon"/>
            <PlaceholderTile icon="file"      title="Document Vault"   description="Secure storage of contracts, ID docs, certifications, and signed policies." color={C.text2} badge="Coming Soon"/>
          </div>

          {/* People in onboarding */}
          <Card title="Currently Onboarding">
            {onboarding.length===0?(
              <div style={{ textAlign:"center", padding:"32px 0", color:C.text3, fontSize:13 }}>
                No one currently in onboarding status.<br/>
                <span style={{ fontSize:12 }}>People with status "Hired" or "Onboarding" will appear here.</span>
              </div>
            ):(
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Name","Role","Start Date","Status","Probation End"].map(h=>(
                  <th key={h} style={{ textAlign:"left", fontSize:11, fontWeight:700, color:C.text3, padding:"6px 12px", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}</tr></thead>
                <tbody>{onboarding.slice(0,10).map((p,i)=>{
                  const name=[p.data?.first_name,p.data?.last_name].filter(Boolean).join(' ')||p.data?.email||'Unknown';
                  const probDays=daysUntil(p.data?.probation_end||p.data?.probation_review_date);
                  return (
                    <tr key={p.id} style={{ background:i%2===0?"transparent":"#fafafa", cursor:"pointer" }}
                      onClick={()=>window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:p.id,objectId:p.object_id}}))}>
                      <td style={{ padding:"10px 12px", fontSize:13, fontWeight:600, color:C.accent }}>{name}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:C.text2 }}>{p.data?.current_title||p.data?.job_title||'—'}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:C.text2 }}>{fmtDate(p.data?.start_date)}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ fontSize:11, padding:"3px 9px", borderRadius:99, fontWeight:600, background:`${C.purple}15`, color:C.purple }}>{p.data?.status||'Onboarding'}</span>
                      </td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:probDays!=null&&probDays<=14?C.red:C.text2 }}>
                        {p.data?.probation_end||p.data?.probation_review_date ? `${fmtDate(p.data?.probation_end||p.data?.probation_review_date)}${probDays!=null&&probDays<=14?` (${probDays}d)`:""}` : "—"}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
