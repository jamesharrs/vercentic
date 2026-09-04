import { useState, useEffect, useCallback } from "react";
import api from './apiClient.js';
import { buildCategoryStepSets } from './utils/stageUtils.js';
import { DashFilterBtn } from './Dashboard.jsx';

const C = {
  card:"#fff", accent:"var(--t-accent,#4361ee)", accentLight:"var(--t-accent-light,#EEF2FF)",
  text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9ca3af)",
  border:"var(--t-border,#f0f0f0)", green:"#0ca678", amber:"#f59f00", red:"#e03131",
  purple:"#7c3aed", blue:"#3b82f6",
};
const F = "'DM Sans',-apple-system,sans-serif";
const PATHS = {
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:"M20 6L9 17l-5-5",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
  arrow:"M5 12h14M12 5l7 7-7 7",
  x:"M18 6L6 18M6 6l12 12",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||""} />
  </svg>
);

const StatCard = ({ icon, value, label, sub, color=C.accent, onClick, badge }) => (
  <div onClick={onClick} style={{ background:C.card, borderRadius:14, padding:"18px 20px",
    border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
    cursor:onClick?"pointer":"default", transition:"box-shadow .15s",
  }}
    onMouseEnter={e=>{ if(onClick) e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"; }}>
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
      <div style={{ width:46,height:46,borderRadius:12,background:`${color}15`,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <Ic n={icon} s={22} c={color}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:28,fontWeight:800,color:C.text1,lineHeight:1 }}>{value??'—'}</div>
        <div style={{ fontSize:12,fontWeight:600,color:C.text2,marginTop:3 }}>{label}</div>
      </div>
      {badge!=null&&<div style={{ fontSize:12,fontWeight:700,color:color,background:`${color}15`,padding:"3px 9px",borderRadius:99 }}>{badge}</div>}
    </div>
    {sub&&<div style={{ fontSize:12,color:C.text3 }}>{sub}</div>}
  </div>
);

const Card = ({ children, title, sub, style={}, action }) => (
  <div style={{ background:C.card,borderRadius:14,border:`1px solid ${C.border}`,
    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:"20px 22px",...style }}>
    {(title||action)&&(
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,gap:8 }}>
        <div>
          {title&&<div style={{ fontSize:14,fontWeight:700,color:C.text1 }}>{title}</div>}
          {sub&&<div style={{ fontSize:11,color:C.text3,marginTop:2 }}>{sub}</div>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

function fmtDate(iso) {
  if (!iso) return "—";
  const diff = Date.now()-new Date(iso).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return `${Math.floor(diff/86400000)}d ago`;
}

function monthStart(offset=0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth()+offset, 1).toISOString();
}

// ─── Candidate List Modal ─────────────────────────────────────────────────────
function CandidateListModal({ title, candidates, jobs, onClose, _session }) {
  const [search, setSearch] = useState('');
  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.name, c.role, c.company, c.status, c.jobName].some(v=>(v||'').toLowerCase().includes(q));
  });
  // Compute AI match score for each candidate against their linked job
  const scored = filtered.map(c => {
    const job = jobs.find(j => j.id === c.jobId);
    let score = null;
    if (job && (c.skills||[]).length) {
      const jobSkills = (job.data?.skills || job.data?.required_skills || []);
      if (jobSkills.length) {
        const matched = (c.skills||[]).filter(s => jobSkills.some(js=>(js||'').toLowerCase()===(s||'').toLowerCase()));
        score = Math.round((matched.length / jobSkills.length)*100);
      }
    }
    return { ...c, score };
  }).sort((a,b) => (b.score??-1)-(a.score??-1));

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"white",borderRadius:20,width:"min(92vw,900px)",maxHeight:"80vh",
        display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:C.text1 }}>{title}</div>
            <div style={{ fontSize:12,color:C.text3,marginTop:2 }}>{filtered.length} candidates</div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{ padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
                fontSize:13,fontFamily:F,outline:"none",width:200 }}/>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
              <Ic n="x" s={18} c={C.text3}/>
            </button>
          </div>
        </div>
        <div style={{ overflowY:"auto",flex:1 }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead style={{ position:"sticky",top:0,background:"white",zIndex:1 }}>
              <tr>{["AI Match","Name","Title","Company","Linked Job","Status","Applied"].map(h=>(
                <th key={h} style={{ textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,
                  padding:"10px 16px",textTransform:"uppercase",letterSpacing:"0.05em",
                  borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {scored.map((c,i)=>(
                <tr key={c.id} style={{ background:i%2===0?"transparent":"#fafafa",cursor:"pointer" }}
                  onClick={()=>{
                    window.dispatchEvent(new CustomEvent("vercentic:openRecord",{detail:{recordId:c.id,objectId:c.object_id}}));
                    onClose();
                  }}>
                  <td style={{ padding:"10px 16px" }}>
                    {c.score!=null
                      ? <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <div style={{ width:36,height:36,borderRadius:"50%",
                            background:c.score>=70?"#0ca67820":c.score>=40?"#f59f0020":"#e0313120",
                            display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <span style={{ fontSize:11,fontWeight:800,
                              color:c.score>=70?C.green:c.score>=40?C.amber:C.red }}>{c.score}%</span>
                          </div>
                        </div>
                      : <span style={{ color:C.text3,fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ padding:"10px 16px",fontSize:13,fontWeight:600,color:C.accent }}>{c.name}</td>
                  <td style={{ padding:"10px 16px",fontSize:12,color:C.text2 }}>{c.role||'—'}</td>
                  <td style={{ padding:"10px 16px",fontSize:12,color:C.text3 }}>{c.company||'—'}</td>
                  <td style={{ padding:"10px 16px",fontSize:12,color:C.text2 }}>{c.jobName||'—'}</td>
                  <td style={{ padding:"10px 16px" }}>
                    <span style={{ fontSize:11,padding:"3px 9px",borderRadius:99,fontWeight:600,
                      background:`${C.amber}15`,color:C.amber }}>{c.status}</span>
                  </td>
                  <td style={{ padding:"10px 16px",fontSize:12,color:C.text3 }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
              {scored.length===0&&(
                <tr><td colSpan={7} style={{ textAlign:"center",padding:"32px",color:C.text3,fontSize:13 }}>No candidates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ScreeningDashboard({ environment, onNavigate, session }) {
  const [data, setData]     = useState(null);
    const [dashFilter, setDashFilter] = useState({ type: 'all' });
  const [jobRecords, setJobRecords]   = useState([]);
  const [jobFields,  setJobFields]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [modal, setModal]   = useState(null); // { title, candidates }

  const load = useCallback(async () => {
    if (!environment?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      // 1. Objects
      const objRes = await api.get(`/objects?environment_id=${environment.id}`);
      const objects = Array.isArray(objRes) ? objRes : (objRes?.objects||[]);
      const peopleObj = objects.find(o=>o.slug==='people'||o.name?.toLowerCase().includes('people'));
      const jobsObj   = objects.find(o=>o.slug==='jobs'  ||o.name?.toLowerCase().includes('job'));

      // 2. People records
      const recRes = await api.get(`/records?object_id=${peopleObj?.id}&environment_id=${environment.id}&limit=500`);
      const allPeople = Array.isArray(recRes)?recRes:(recRes?.records||[]);

      // 3. Jobs records (for pipeline funnel + linked job names)
      let allJobs = [];
      if (jobsObj) {
        const jRes = await api.get(`/records?object_id=${jobsObj.id}&environment_id=${environment.id}&limit=200`);
        allJobs = Array.isArray(jRes)?jRes:(jRes?.records||[]);
      }

      // 4. People links (to know which candidates are linked to which job)
      let links = [];
      try { links = await api.get(`/people-links?environment_id=${environment.id}`).then(r=>Array.isArray(r)?r:(r?.links||[])); } catch(_){}

      // Build a map: personId → [{jobId, jobName, stage}]
      const personJobMap = {};
      links.forEach(lk => {
        // Handle both field name formats (demo: person_id, live: person_record_id)
        const personId = lk.person_record_id || lk.person_id;
        const stageName = lk.current_stage_name || lk.stage_name || lk.stage || '';
        const jobId = lk.job_id || lk.target_record_id || lk.record_id;
        if (!personId) return;
        if (!personJobMap[personId]) personJobMap[personId] = [];
        const job = allJobs.find(j => j.id === jobId);
        personJobMap[personId].push({ jobId, jobName: job?.data?.job_title||job?.data?.title||'Unknown Job', stage: stageName });
      });

      // 5. Resolve stage → category using keyword matching.
      // We don't need workflow steps from the API — people_links already stores the
      // stage name as current_stage_name. We build dynamic stage sets by running
      // keyword matching on all unique stage names present in the link data.
      // Also fetch stage categories so any explicit mappings get picked up.
      let stageCategoryMap = {};
      try {
        const cats = await api.get(`/stage-categories?environment_id=${environment.id}`);
        const catsArr = Array.isArray(cats) ? cats : (cats?.categories||[]);
        // Build virtual "steps" from the unique stage names in people_links
        const uniqueStageNames = [...new Set(links.map(lk =>
          lk.current_stage_name || lk.stage_name || lk.stage || '').filter(Boolean))];
        const virtualSteps = uniqueStageNames.map(name => ({ name }));
        stageCategoryMap = buildCategoryStepSets(catsArr, virtualSteps);
      } catch(e) {
        stageCategoryMap = buildCategoryStepSets([], []);
      }
      const screeningStages = stageCategoryMap['Screening'] || new Set(['screening']);

      // 6. Helper: build a candidate object from a record
      const toCandidate = (p) => {
        const links = personJobMap[p.id]||[];
        const primaryLink = links[0];
        return {
          id: p.id, object_id: p.object_id || peopleObj?.id, created_at: p.created_at,
          name: [p.data?.first_name, p.data?.last_name].filter(Boolean).join(' ')||p.data?.email||'Unknown',
          role: p.data?.current_title||p.data?.job_title||'—',
          company: p.data?.current_company||p.data?.company||'—',
          status: p.data?.status||'New',
          skills: Array.isArray(p.data?.skills)?p.data.skills:(typeof p.data?.skills==='string'?p.data.skills.split(',').map(s=>s.trim()):[]),
          jobId: primaryLink?.jobId||null,
          jobName: primaryLink?.jobName||null,
          stage: primaryLink?.stage||null,
          ai_screening_result: p.data?.ai_screening_result||p.data?.ai_status||null,
          auto_progressed: !!(p.data?.auto_progressed||p.data?.ai_auto_progressed),
          auto_declined:   !!(p.data?.auto_declined  ||p.data?.ai_auto_declined),
        };
      };

      // 7. In-screening: anyone whose status or stage is a screening stage
      const inScreening = allPeople.filter(p => {
        const status = (p.data?.status||'').toLowerCase();
        if (screeningStages.has(status)) return true;
        const links = personJobMap[p.id]||[];
        return links.some(lk => screeningStages.has(((lk.current_stage_name||lk.stage_name||lk.stage)||'').toLowerCase()));
      });

      // 8. Auto Screened this month (candidates with AI screening result set this month)
      const thisMonth = monthStart(0);
      const lastMonth = monthStart(-1);
      const autoScreenedThisMonth = allPeople.filter(p =>
        (p.data?.ai_screening_result||p.data?.ai_status) && (p.updated_at||p.created_at) >= thisMonth
      );
      const autoScreenedLastMonth = allPeople.filter(p =>
        (p.data?.ai_screening_result||p.data?.ai_status) &&
        (p.updated_at||p.created_at) >= lastMonth && (p.updated_at||p.created_at) < thisMonth
      );

      // 9. Reviewed this month (moved past screening)
      const reviewedStatuses = new Set(['shortlisted','interview','offer','hired','rejected','withdrawn']);
      const reviewedThisMonth = allPeople.filter(p =>
        reviewedStatuses.has((p.data?.status||'').toLowerCase()) && (p.updated_at||p.created_at) >= thisMonth
      );
      const reviewedLastMonth = allPeople.filter(p =>
        reviewedStatuses.has((p.data?.status||'').toLowerCase()) &&
        (p.updated_at||p.created_at) >= lastMonth && (p.updated_at||p.created_at) < thisMonth
      );

      // 10. My jobs pipeline funnel (jobs where logged-in user is the recruiter)
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      const myJobs = allJobs.filter(j => {
        const recruiter = j.data?.recruiter||j.data?.recruiter_id||j.data?.assigned_to||'';
        return recruiter === userId || recruiter === userEmail || (typeof recruiter==='object'&&recruiter?.id===userId);
      });
      const myJobsFunnel = myJobs.map(job => {
        const jobLinks = links.filter(lk=>(lk.job_id||lk.target_record_id||lk.record_id)===job.id);
        const inScreen = jobLinks.filter(lk=>screeningStages.has(((lk.current_stage_name||lk.stage_name||lk.stage)||'').toLowerCase())).length;
        return {
          id: job.id, name: job.data?.job_title||job.data?.title||'Unknown', count: inScreen,
          total: jobLinks.length, object_id: jobsObj?.id
        };
      }).filter(j=>j.total>0).sort((a,b)=>b.count-a.count);

      // 11. Auto Screening Results: candidates auto-progressed OR auto-declined
      const autoResults = allPeople.filter(p=>p.data?.auto_progressed||p.data?.ai_auto_progressed||p.data?.auto_declined||p.data?.ai_auto_declined);

      // 12. Recent applications (last 20, with job column)
      const recentApps = [...allPeople].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,20);

      setData({
        peopleObj, jobsObj, allJobs,
        inScreening: inScreening.map(toCandidate),
        autoScreenedThisMonth: autoScreenedThisMonth.map(toCandidate),
        autoScreenedLastMonth: autoScreenedLastMonth.length,
        reviewedThisMonth: reviewedThisMonth.map(toCandidate),
        reviewedLastMonth: reviewedLastMonth.length,
        myJobsFunnel,
        autoResults: autoResults.map(toCandidate),
        recentApps: recentApps.map(p => toCandidate(p)),
      });
    } catch(e){ console.error('[ScreeningDashboard]',e); setError(e.message); }
    finally { setLoading(false); }
  }, [environment?.id, session?.user?.id]);

  useEffect(()=>{ load(); },[load]);
  const nav = id=>{ if(onNavigate) onNavigate(id); };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,fontFamily:F,color:C.text3 }}>Loading…</div>;
  if (error)   return <div style={{ padding:32,fontFamily:F,background:"#fef2f2",borderRadius:12,color:C.red,fontSize:13 }}>Error: {error}</div>;
  if (!data)   return <div style={{ padding:32,fontFamily:F,color:C.text3,textAlign:"center",fontSize:13 }}>No data</div>;

  const { inScreening, autoScreenedThisMonth, autoScreenedLastMonth, reviewedThisMonth, reviewedLastMonth,
          myJobsFunnel, autoResults, recentApps, allJobs, jobsObj } = data;

  const autoMonthDelta = autoScreenedThisMonth.length - autoScreenedLastMonth;
  const reviewedDelta  = reviewedThisMonth.length - reviewedLastMonth;

  return (
    <div style={{ fontFamily:F,color:C.text1,padding:"28px 32px 80px",background:"var(--t-bg,#F8F7FF)",minHeight:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22,fontWeight:800,color:C.text1,letterSpacing:"-0.02em" }}>Screening Dashboard</div>
          <div style={{ fontSize:12,color:C.text3,marginTop:3 }}>CV review, AI screening &amp; shortlisting</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
          {[{label:"Overview",nav:"overview",color:"#6B7280"},{label:"Screening",nav:"screening",color:"#7F77DD",current:true},{label:"Interviews",nav:"interviews",color:"#1D9E75"},{label:"Offers",nav:"offers",color:"#D4537E"},{label:"Onboarding",nav:"onboarding",color:"#EF9F27"}]
            .map(({label,nav:n,color,current})=>(
            <button key={n} onClick={()=>nav(n)} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 13px",borderRadius:20,
              border:current?`1.5px solid ${color}`:`1.5px solid ${color}40`,background:current?`${color}18`:`${color}10`,
              color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:color,flexShrink:0 }}/>{label}
            </button>
          ))}
          <DashFilterBtn jobs={jobRecords} jobFields={jobFields} session={session} value={dashFilter} onChange={setDashFilter}/>
          <button onClick={load} style={{ fontSize:11,padding:"6px 12px",borderRadius:20,border:`0.5px solid rgba(0,0,0,0.06)`,background:"white",color:"#888780",cursor:"pointer",fontFamily:F }}>↻</button>
        </div>
      </div>

      {/* Stat cards — row 1 */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20 }}>
        {/* Item 1: In screening — clicking opens full list with AI match */}
        <StatCard icon="eye" value={inScreening.length} label="In Screening" color={C.purple}
          sub="aggregate — all screening stages"
          onClick={()=>setModal({ title:"Candidates In Screening", candidates:inScreening })}/>

        {/* Item 2: Auto Screened this month with delta */}
        <StatCard icon="sparkles" value={autoScreenedThisMonth.length} label="Auto Screened"
          color={C.accent}
          sub={`vs last month`}
          badge={autoMonthDelta===0?null:(autoMonthDelta>0?`+${autoMonthDelta}`:String(autoMonthDelta))}
          onClick={()=>setModal({ title:"Auto Screened This Month", candidates:autoScreenedThisMonth })}/>

        {/* Item 3: Reviewed this month with delta */}
        <StatCard icon="check" value={reviewedThisMonth.length} label="Reviewed"
          color={C.green}
          sub={`this month`}
          badge={reviewedDelta===0?null:(reviewedDelta>0?`+${reviewedDelta}`:String(reviewedDelta))}
          onClick={()=>setModal({ title:"Reviewed This Month", candidates:reviewedThisMonth })}/>

        <StatCard icon="users" value={inScreening.length > 0 ? Math.round((reviewedThisMonth.length/Math.max(inScreening.length,1))*100)+'%' : '—'}
          label="Conversion Rate" color={C.amber}
          sub="screening → reviewed"/>
      </div>

      {/* Middle row: My Jobs Funnel + Auto Screening Results */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
        {/* Item 4: My Jobs pipeline funnel */}
        <Card title="My Jobs" sub="candidates in screening stages — live count">
          {myJobsFunnel.length===0
            ? <div style={{ textAlign:"center",padding:"32px 0",color:C.text3,fontSize:13 }}>
                No jobs assigned to you with candidates in screening.<br/>
                <span style={{ fontSize:12 }}>Set yourself as recruiter on a job to see it here.</span>
              </div>
            : <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {myJobsFunnel.map(j=>(
                  <div key={j.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"8px 10px",
                    borderRadius:10,background:"#fafafa",cursor:"pointer",border:`1px solid ${C.border}` }}
                    onClick={()=>window.dispatchEvent(new CustomEvent("vercentic:openRecord",{detail:{recordId:j.id,objectId:j.object_id}}))}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{j.name}</div>
                      <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>{j.total} linked · {j.count} in screening</div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ height:6,width:80,background:"#f3f4f6",borderRadius:99,overflow:"hidden" }}>
                        <div style={{ height:6,width:`${j.total>0?Math.round((j.count/j.total)*100):0}%`,background:C.purple,borderRadius:99 }}/>
                      </div>
                      <span style={{ fontSize:13,fontWeight:800,color:C.purple,minWidth:28,textAlign:"right" }}>{j.count}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Item 5: Auto Screening Results */}
        <Card title="Auto Screening Results"
          sub="candidates auto-progressed or declined from screening question answers">
          {autoResults.length===0
            ? <div style={{ textAlign:"center",padding:"32px 0",color:C.text3,fontSize:13 }}>
                No auto-screening results yet.<br/>
                <span style={{ fontSize:12 }}>Configure AI screening on a workflow stage to see results here.</span>
              </div>
            : <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto" }}>
                {autoResults.slice(0,10).map(c=>(
                  <div key={c.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,
                    background:"#fafafa",border:`1px solid ${C.border}`,cursor:"pointer" }}
                    onClick={()=>{ window.dispatchEvent(new CustomEvent("vercentic:openRecord",{detail:{recordId:c.id,objectId:c.object_id}})); }}>
                    <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                      background:c.auto_progressed?`${C.green}15`:`${C.red}15` }}>
                      <Ic n={c.auto_progressed?"check":"x"} s={14} c={c.auto_progressed?C.green:C.red}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</div>
                      <div style={{ fontSize:11,color:C.text3 }}>{c.jobName||c.role}</div>
                    </div>
                    <span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                      background:c.auto_progressed?`${C.green}15`:`${C.red}15`,
                      color:c.auto_progressed?C.green:C.red }}>
                      {c.auto_progressed?'Progressed':'Declined'}
                    </span>
                  </div>
                ))}
                {autoResults.length>10&&(
                  <button onClick={()=>setModal({title:"Auto Screening Results",candidates:autoResults})}
                    style={{ fontSize:12,color:C.accent,background:"none",border:`1px dashed ${C.accent}50`,
                      borderRadius:8,padding:"6px",cursor:"pointer",fontFamily:F,fontWeight:600 }}>
                    View all {autoResults.length} results →
                  </button>
                )}
              </div>
          }
        </Card>
      </div>

      {/* Item 6: Recent Applications with Job column */}
      <Card title="Recent Applications" sub="latest candidates — click to open record">
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr>
            {["Candidate","Title","Company","Job Applied For","Status","Applied"].map(h=>(
              <th key={h} style={{ textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,
                padding:"6px 12px",textTransform:"uppercase",letterSpacing:"0.05em",
                borderBottom:`1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {recentApps.map((c,i)=>(
              <tr key={c.id} style={{ background:i%2===0?"transparent":"#fafafa",cursor:"pointer" }}
                onClick={()=>{ window.dispatchEvent(new CustomEvent("vercentic:openRecord",{detail:{recordId:c.id,objectId:c.object_id}})); }}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#fafafa"}>
                <td style={{ padding:"10px 12px",fontSize:13,fontWeight:600,color:C.accent }}>{c.name}</td>
                <td style={{ padding:"10px 12px",fontSize:12,color:C.text2 }}>{c.role||'—'}</td>
                <td style={{ padding:"10px 12px",fontSize:12,color:C.text3 }}>{c.company||'—'}</td>
                <td style={{ padding:"10px 12px" }}>
                  {c.jobName
                    ? <button onClick={e=>{ e.stopPropagation(); window.dispatchEvent(new CustomEvent("vercentic:openRecord",{detail:{recordId:c.jobId,objectId:jobsObj?.id}})); }}
                        style={{ fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:F,fontWeight:600,textDecoration:"underline" }}>
                        {c.jobName}
                      </button>
                    : <span style={{ color:C.text3,fontSize:12 }}>—</span>}
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <span style={{ fontSize:11,padding:"3px 9px",borderRadius:99,fontWeight:600,
                    background:`${C.amber}15`,color:C.amber }}>{c.status}</span>
                </td>
                <td style={{ padding:"10px 12px",fontSize:12,color:C.text3 }}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}
            {recentApps.length===0&&(
              <tr><td colSpan={6} style={{ textAlign:"center",padding:"32px",color:C.text3,fontSize:13 }}>No candidates yet</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Candidate list modal */}
      {modal&&(
        <CandidateListModal
          title={modal.title}
          candidates={modal.candidates}
          jobs={allJobs}
          onClose={()=>setModal(null)}
          session={session}
        />
      )}
    </div>
  );
}
