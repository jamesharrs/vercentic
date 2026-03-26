import { useState, useEffect } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af",
  accent:"#3b5bdb", accentLight:"#eef1ff",
  ai:"#7c3aed", aiLight:"#f5f3ff",
};

const api = { get: p => fetch(`/api${p}`).then(r=>r.json()) };

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    trendUp:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    activity:"M22 12h-4l-3 9L9 3l-3 9H2",
    check:"M20 6L9 17l-5-5",
    plus:"M12 5v14M5 12h14",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};

const StatCard = ({ label, value, sub, icon, color="#3b5bdb", trend }) => (
  <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"20px 22px", flex:1, minWidth:160 }}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Ic n={icon} s={18} c={color}/>
      </div>
      {trend !== undefined && (
        <span style={{ fontSize:11, fontWeight:700, color:trend>=0?"#0ca678":"#e03131", background:trend>=0?"#f0fdf4":"#fef2f2", padding:"2px 8px", borderRadius:99 }}>
          {trend>=0?"+":""}{trend}%
        </span>
      )}
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:13, fontWeight:600, color:C.text2, marginTop:4 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{sub}</div>}
  </div>
);

const MiniBar = ({ label, value, max, color }) => (
  <div style={{ marginBottom:10 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:12, color:C.text2, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{value}</span>
    </div>
    <div style={{ height:6, borderRadius:99, background:"#f0f0f0", overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(100,(value/max)*100)}%`, background:color, borderRadius:99, transition:"width .6s ease" }}/>
    </div>
  </div>
);

export default function Dashboard({ environment, onNavigate }) {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!environment?.id) return;
    loadData();
  }, [environment?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const objs = await api.get(`/objects?environment_id=${environment.id}`);
      if (!Array.isArray(objs)) { setLoading(false); return; }

      const counts = {};
      const statusBreakdowns = {};
      const recentItems = [];

      await Promise.all(objs.map(async o => {
        const r = await api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=100`);
        const records = r.records || [];
        counts[o.slug] = r.pagination?.total || records.length;

        // Status breakdown
        const sb = {};
        records.forEach(rec => {
          const s = rec.data?.status || "Unknown";
          sb[s] = (sb[s]||0)+1;
        });
        statusBreakdowns[o.slug] = sb;

        // Collect recent
        records.slice(0,3).forEach(rec => {
          const nameF = ["first_name","job_title","pool_name","name"].find(k => rec.data?.[k]);
          const lastName = rec.data?.last_name ? ` ${rec.data.last_name}` : "";
          recentItems.push({
            id: rec.id,
            name: nameF ? (rec.data[nameF] + lastName) : "Untitled",
            object: o.name,
            objectSlug: o.slug,
            objectColor: o.color || C.accent,
            status: rec.data?.status,
            created: rec.created_at,
          });
        });
      }));

      recentItems.sort((a,b) => new Date(b.created) - new Date(a.created));

      setStats({ counts, statusBreakdowns, objects: objs });
      setRecent(recentItems.slice(0,8));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.text3, fontFamily:F }}>
      Loading dashboard…
    </div>
  );

  if (!stats) return null;

  const peopleCount = stats.counts["people"] || 0;
  const jobsCount   = stats.counts["jobs"]   || 0;
  const poolsCount  = stats.counts["talent-pools"] || 0;

  const jobStatuses  = stats.statusBreakdowns["jobs"]   || {};
  const peopleStatuses = stats.statusBreakdowns["people"] || {};

  const openJobs    = jobStatuses["Open"]    || 0;
  const activePeople = peopleStatuses["Active"] || 0;
  const placedCount = peopleStatuses["Placed"] || 0;

  const maxJobStatus = Math.max(...Object.values(jobStatuses), 1);
  const maxPeopleStatus = Math.max(...Object.values(peopleStatuses), 1);

  const JOB_COLORS = { Open:"#0ca678", Draft:"#868e96", "On Hold":"#f59f00", Filled:"#3b5bdb", Cancelled:"#e03131" };
  const PEOPLE_COLORS = { Active:"#0ca678", Passive:"#f59f00", "Not Looking":"#868e96", Placed:"#3b5bdb", Archived:"#adb5bd" };

  return (
    <div style={{ fontFamily:F }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:"0 0 4px", fontSize:24, fontWeight:800, color:C.text1 }}>Dashboard</h1>
        <p style={{ margin:0, fontSize:13, color:C.text3 }}>{environment.name} · {new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard label="Total Candidates" value={peopleCount} sub={`${activePeople} actively looking`} icon="users" color="#3b5bdb" trend={12}/>
        <StatCard label="Open Jobs" value={openJobs} sub={`${jobsCount} total roles`} icon="briefcase" color="#0ca678" trend={5}/>
        <StatCard label="Talent Pools" value={poolsCount} sub="curated pipelines" icon="layers" color="#7c3aed"/>
        <StatCard label="Placements" value={placedCount} sub="this environment" icon="check" color="#f59f00"/>
      </div>

      {/* Two column section */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

        {/* Jobs by status */}
        <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Jobs Pipeline</div>
              <div style={{ fontSize:11, color:C.text3 }}>{jobsCount} total roles</div>
            </div>
            <button onClick={()=>onNavigate?.("jobs")}
              style={{ fontSize:11, fontWeight:600, color:C.accent, background:C.accentLight, border:"none", padding:"4px 10px", borderRadius:7, cursor:"pointer", fontFamily:F }}>
              View all
            </button>
          </div>
          {Object.keys(JOB_COLORS).map(s => jobStatuses[s] > 0 && (
            <MiniBar key={s} label={s} value={jobStatuses[s]} max={maxJobStatus} color={JOB_COLORS[s]}/>
          ))}
          {Object.keys(jobStatuses).length === 0 && <div style={{ textAlign:"center", padding:"20px 0", color:C.text3, fontSize:12 }}>No jobs yet</div>}
        </div>

        {/* Candidates by status */}
        <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Candidate Pipeline</div>
              <div style={{ fontSize:11, color:C.text3 }}>{peopleCount} total candidates</div>
            </div>
            <button onClick={()=>onNavigate?.("people")}
              style={{ fontSize:11, fontWeight:600, color:C.accent, background:C.accentLight, border:"none", padding:"4px 10px", borderRadius:7, cursor:"pointer", fontFamily:F }}>
              View all
            </button>
          </div>
          {Object.keys(PEOPLE_COLORS).map(s => peopleStatuses[s] > 0 && (
            <MiniBar key={s} label={s} value={peopleStatuses[s]} max={maxPeopleStatus} color={PEOPLE_COLORS[s]}/>
          ))}
          {Object.keys(peopleStatuses).length === 0 && <div style={{ textAlign:"center", padding:"20px 0", color:C.text3, fontSize:12 }}>No candidates yet</div>}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"20px 22px" }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:16 }}>Recently Added</div>
        {recent.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:C.text3 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🚀</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text2 }}>No records yet</div>
            <div style={{ fontSize:12, marginTop:4 }}>Use the Copilot or nav to create your first record</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
            {recent.map(item => (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#f8f9fc", borderRadius:10, border:`1px solid ${C.border}` }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:item.objectColor, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:"white", fontSize:12, fontWeight:700 }}>{item.name?.charAt(0)?.toUpperCase()||"?"}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{item.object}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop:16, display:"flex", gap:10 }}>
        {[
          { label:"Add Candidate",  icon:"users",     slug:"people",       color:"#3b5bdb" },
          { label:"Post a Job",     icon:"briefcase", slug:"jobs",         color:"#0ca678" },
          { label:"Create Pool",    icon:"layers",    slug:"talent-pools", color:"#7c3aed" },
          { label:"AI Matching",    icon:"zap",       slug:"matching",     color:"#f59f00" },
        ].map(a => (
          <button key={a.slug} onClick={()=>onNavigate?.(a.slug)}
            style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:12, border:`1.5px solid ${a.color}20`, background:`${a.color}08`, cursor:"pointer", fontFamily:F, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background=`${a.color}18`;e.currentTarget.style.borderColor=`${a.color}50`;}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${a.color}08`;e.currentTarget.style.borderColor=`${a.color}20`;}}>
            <Ic n={a.icon} s={16} c={a.color}/>
            <span style={{ fontSize:12, fontWeight:700, color:a.color }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
