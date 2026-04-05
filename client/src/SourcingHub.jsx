/**
 * client/src/SourcingHub.jsx — Sourcing Hub frontend
 * Federated candidate search, profile import, talent alerts, source config
 */
import { useState, useEffect, useCallback, useRef } from "react";
import api from "./apiClient";

const F = "var(--t-font,'Plus Jakarta Sans',sans-serif)";
const C = {
  bg:"var(--t-bg,#F5F7FF)", surface:"var(--t-surface,#ffffff)", border:"var(--t-border,#E8EBF4)",
  text1:"var(--t-text1,#0F1729)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#6B7280)",
  accent:"var(--t-accent,#4361EE)", accentL:"var(--t-accentLight,#EEF2FF)",
  green:"#0CAF77", greenL:"#F0FDF4", amber:"#F59F00", amberL:"#FFFBEB",
  red:"#E03131", purple:"#7C3AED", purpleL:"#F5F3FF",
};

const Ic = ({ n, s=16, c="currentColor" }) => {
  const p = {
    search:"M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    linkedin:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    github:"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
    code:"M16 18l6-6-6-6M8 6l-6 6 6 6",
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", check:"M20 6L9 17l-5-5",
    chevron:"M9 18l6-6-6-6",
    download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    external:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
    sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
    arrowRight:"M5 12h14M12 5l7 7-7 7",
    info:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={p[n]||p.info}/></svg>;
};

const SRC = {
  google:     { label:"Web",     color:"#EA4335", icon:"globe"   },
  apollo:     { label:"Apollo",  color:"#6366f1", icon:"users"   },
  github:     { label:"GitHub",  color:"#171515", icon:"github"  },
  hunter:     { label:"Hunter",  color:"#F59F00", icon:"mail"    },
  simulation: { label:"Preview", color:"#9ca3af", icon:"sparkles"},
};
const scoreColor = s => s >= 75 ? C.green : s >= 50 ? C.amber : C.red;

// ── Candidate card ────────────────────────────────────────────────────────────
function CandidateCard({ candidate:c, onImport, done }) {
  const [open, setOpen] = useState(false);
  const src = SRC[c.source] || SRC.simulation;
  const initials = (c.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const avatarBg = ["#4361EE","#7C3AED","#0CA678","#F59F00","#E03131"][(c.name||"").charCodeAt(0)%5];
  return (
    <div style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:open?"0 4px 20px rgba(0,0,0,.08)":"none",transition:"box-shadow .15s"}}>
      <div style={{padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:c.photo_url?"transparent":avatarBg,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          {c.photo_url
            ? <img src={c.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
            : <span style={{fontSize:15,fontWeight:800,color:"white"}}>{initials}</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{c.name||"Unknown"}</span>
            <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${src.color}18`,color:src.color,border:`1px solid ${src.color}30`}}>{src.label}</span>
            {c.simulated && <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#f3f4f6",color:"#9ca3af"}}>Preview</span>}
          </div>
          <div style={{fontSize:12,color:C.text2}}>{[c.title,c.company].filter(Boolean).join(" · ")}</div>
          {c.location && <div style={{fontSize:11,color:C.text3,marginTop:2}}>📍 {c.location}</div>}
          {c.skills?.length>0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
              {c.skills.slice(0,5).map(s=><span key={s} style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:C.accentL,color:C.accent,fontWeight:600}}>{s}</span>)}
              {c.skills.length>5 && <span style={{fontSize:10,color:C.text3}}>+{c.skills.length-5}</span>}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
          {c.match_score!=null && (
            <div style={{width:44,height:44,borderRadius:"50%",border:`3px solid ${scoreColor(c.match_score)}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
              <span style={{fontSize:12,fontWeight:800,color:scoreColor(c.match_score),lineHeight:1}}>{c.match_score}</span>
              <span style={{fontSize:8,color:C.text3}}>%</span>
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            {c.profile_url && c.profile_url!=="#" && (
              <a href={c.profile_url} target="_blank" rel="noreferrer" style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,display:"flex",alignItems:"center"}}>
                <Ic n="external" s={13} c={C.text3}/>
              </a>
            )}
            <button onClick={()=>setOpen(o=>!o)} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer"}}>
              <Ic n="chevron" s={13} c={C.text3}/>
            </button>
            <button onClick={()=>onImport(c)} disabled={done} style={{
              padding:"5px 12px",borderRadius:7,border:"none",
              background:done?"#e5e7eb":C.accent,color:done?C.text3:"white",
              fontSize:11,fontWeight:700,cursor:done?"default":"pointer",fontFamily:F,
              display:"flex",alignItems:"center",gap:5,
            }}>
              {done ? <><Ic n="check" s={12} c={C.green}/> Added</> : <><Ic n="download" s={12} c="white"/> Import</>}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:"#fafbff"}}>
          {c.summary && <p style={{margin:"0 0 10px",fontSize:12,color:C.text2,lineHeight:1.6}}>{c.summary}</p>}
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {c.email && <a href={`mailto:${c.email}`} style={{fontSize:11,color:C.accent,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Ic n="mail" s={11} c={C.accent}/>{c.email}</a>}
            {c.linkedin_url && c.linkedin_url!=="#" && <a href={c.linkedin_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#0077B5",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Ic n="linkedin" s={11} c="#0077B5"/>LinkedIn</a>}
            {c.github_url && <a href={c.github_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.text2,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Ic n="github" s={11} c={C.text2}/>GitHub</a>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ alert:a, onDelete, onRun }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{width:36,height:36,borderRadius:10,background:C.purpleL,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Ic n="bell" s={16} c={C.purple}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{a.name}</div>
        <div style={{fontSize:11,color:C.text3,marginTop:2}}>{a.query} · {a.schedule} · {(a.sources_used||"google,apollo,github").replace(/,/g,", ")}</div>
        {a.last_run && <div style={{fontSize:11,color:C.text3}}>Last run: {new Date(a.last_run).toLocaleDateString("en-GB")} · {a.results_count||0} new</div>}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,
          background:a.status==="active"?C.greenL:"#f3f4f6",color:a.status==="active"?C.green:C.text3,
          border:`1px solid ${a.status==="active"?C.green+"40":C.border}`}}>{a.status}</span>
        <button onClick={()=>onRun(a)} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,color:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
          <Ic n="refresh" s={11} c={C.text2}/> Run now
        </button>
        <button onClick={()=>onDelete(a.id)} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer"}}>
          <Ic n="x" s={12} c={C.red}/>
        </button>
      </div>
    </div>
  );
}

// ── Source config card ────────────────────────────────────────────────────────
function SourceCard({ source:s }) {
  return (
    <div style={{padding:16,borderRadius:14,border:`1.5px solid ${s.configured?C.green+"50":C.border}`,background:s.configured?C.greenL:C.surface}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:32,height:32,borderRadius:8,background:s.configured?C.green:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n={s.icon||"globe"} s={15} c={s.configured?"white":C.text3}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{s.name}</div>
          <div style={{fontSize:10,color:s.configured?C.green:C.text3,fontWeight:600}}>{s.configured?"✓ Configured":"Not configured"}</div>
        </div>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"#f3f4f6",color:C.text3}}>{s.cost}</span>
      </div>
      <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginBottom:8}}>{s.description}</div>
      {!s.configured && (
        <div style={{fontSize:10,color:C.text3}}>
          Railway env vars: {s.env_keys?.join(", ")} · <a href={s.setup_url} target="_blank" rel="noreferrer" style={{color:C.accent}}>Setup guide →</a>
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SourcingHub({ environment }) {
  const [tab, setTab]           = useState("search");
  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults]   = useState(null);
  const [simMode, setSimMode]   = useState(false);
  const [activeSrcs, setActiveSrcs] = useState(["google","apollo","github"]);
  const [imported, setImported] = useState(new Set());
  const [importing, setImporting] = useState({});
  const [alerts, setAlerts]     = useState([]);
  const [sources, setSources]   = useState([]);
  const [jobs, setJobs]         = useState([]);
  const [linkedJob, setLinkedJob] = useState("");
  const [alertForm, setAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ name:"", query:"", schedule:"daily" });
  const [toast, setToast]       = useState(null);
  const inputRef = useRef(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    api.get("/sourcing/sources").then(d=>setSources(Array.isArray(d)?d:[])).catch(()=>{});
    if (!environment?.id) return;
    api.get(`/sourcing/alerts?environment_id=${environment.id}`).then(d=>setAlerts(Array.isArray(d)?d.filter(a=>!a.deleted):[])).catch(()=>{});
    api.get(`/records?object_id=jobs&environment_id=${environment.id}&limit=100`).then(d=>setJobs(Array.isArray(d?.records)?d.records:[])).catch(()=>{});
  }, [environment?.id]);

  const runSearch = useCallback(async (q=queryText) => {
    if (!q.trim()) return;
    setSearching(true); setResults(null);
    try {
      const data = await api.post("/sourcing/search", { query:q, sources:activeSrcs, limit:10, environment_id:environment?.id, job_id:linkedJob||undefined });
      setResults(data); setSimMode(data.simulation_mode||false);
    } catch(e) { showToast("Search failed: "+e.message,"error"); }
    setSearching(false);
  }, [queryText, activeSrcs, environment?.id, linkedJob]);

  const handleImport = async (c) => {
    setImporting(p=>({...p,[c.id]:true}));
    try {
      await api.post("/sourcing/import", { candidate:c, environment_id:environment?.id, job_id:linkedJob||undefined });
      setImported(p=>new Set([...p,c.id])); showToast(`${c.name} imported`);
    } catch(e) { showToast(e.message?.includes("409")?"Already exists":"Import failed","error"); }
    setImporting(p=>({...p,[c.id]:false}));
  };

  const createAlert = async () => {
    if (!newAlert.name||!newAlert.query) return;
    const a = await api.post("/sourcing/alerts", {...newAlert, sources:activeSrcs, environment_id:environment?.id});
    setAlerts(p=>[a,...p]); setAlertForm(false); setNewAlert({name:"",query:"",schedule:"daily"}); showToast("Alert created");
  };
  const deleteAlert = async (id) => { await api.delete(`/sourcing/alerts/${id}`); setAlerts(p=>p.filter(a=>a.id!==id)); };
  const runAlert = (a) => { setQueryText(a.query); setTab("search"); setTimeout(()=>runSearch(a.query),100); };

  const toggleSrc = (s) => setActiveSrcs(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const allCandidates = (results?.results||[]).flatMap(r=>r.candidates||[]).sort((a,b)=>(b.match_score||0)-(a.match_score||0));

  const TABS = [
    {id:"search", label:"Search",       icon:"search"},
    {id:"alerts", label:`Alerts${alerts.length?` (${alerts.length})`:""}`, icon:"bell"},
    {id:"sources",label:"Sources",      icon:"settings"},
  ];
  const QUICK = [
    "Senior React developer, TypeScript, 5+ years, global remote",
    "CFO with IPO experience, fintech or SaaS background",
    "Head of Marketing, New York, B2B SaaS, Series B+",
    "Data scientist, ML and Python, open to remote",
    "Product Manager, marketplace experience, global",
  ];

  return (
    <div style={{fontFamily:F,display:"flex",flexDirection:"column",height:"100%",position:"relative"}}>
      {/* Toast */}
      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"10px 18px",borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,background:toast.type==="error"?C.red:C.green,color:"white",boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>{toast.msg}</div>}

      {/* Header */}
      <div style={{padding:"24px 28px 0",borderBottom:`1.5px solid ${C.border}`,background:C.surface}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#4361EE,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n="sparkles" s={20} c="white"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Sourcing Hub</div>
            <div style={{fontSize:12,color:C.text3}}>Search across the web, Apollo, GitHub and more simultaneously</div>
          </div>
          {simMode && (
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:C.amberL,border:`1px solid ${C.amber}40`}}>
              <Ic n="info" s={13} c={C.amber}/>
              <span style={{fontSize:11,color:C.amber,fontWeight:700}}>Preview mode — add API keys in Sources to go live</span>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 18px",border:"none",background:"transparent",fontFamily:F,fontSize:13,fontWeight:tab===t.id?700:500,cursor:"pointer",color:tab===t.id?C.accent:C.text3,borderBottom:tab===t.id?`2.5px solid ${C.accent}`:"2.5px solid transparent",marginBottom:-1.5,display:"flex",alignItems:"center",gap:6}}>
              <Ic n={t.icon} s={13} c={tab===t.id?C.accent:C.text3}/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>

        {/* ─ SEARCH ─ */}
        {tab==="search" && (
          <div>
            {/* Search bar */}
            <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:20,marginBottom:20,boxShadow:"0 2px 12px rgba(67,97,238,.06)"}}>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.bg}}>
                  <Ic n="sparkles" s={16} c={C.accent}/>
                  <input ref={inputRef} value={queryText} onChange={e=>setQueryText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runSearch()}
                    placeholder='Describe who you are looking for in natural language...'
                    style={{flex:1,border:"none",background:"transparent",fontSize:14,fontFamily:F,color:C.text1,outline:"none"}}/>
                  {queryText && <button onClick={()=>setQueryText("")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Ic n="x" s={14} c={C.text3}/></button>}
                </div>
                <button onClick={()=>runSearch()} disabled={searching||!queryText.trim()} style={{padding:"10px 24px",borderRadius:10,border:"none",background:searching?"#e5e7eb":"linear-gradient(135deg,#4361EE,#7C3AED)",color:searching?C.text3:"white",fontSize:14,fontWeight:700,cursor:searching?"default":"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                  {searching?"Searching…":<><Ic n="search" s={15} c="white"/>Search</>}
                </button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:C.text3,fontWeight:600}}>Sources:</span>
                {["google","apollo","github"].map(s=>{
                  const sm=SRC[s]; const active=activeSrcs.includes(s);
                  return <button key={s} onClick={()=>toggleSrc(s)} style={{padding:"4px 12px",borderRadius:99,fontSize:11,fontWeight:700,border:`1.5px solid ${active?sm.color:C.border}`,background:active?`${sm.color}15`:C.surface,color:active?sm.color:C.text3,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:5}}>
                    <Ic n={sm.icon} s={11} c={active?sm.color:C.text3}/>{sm.label}
                  </button>;
                })}
                <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:C.text3}}>Link to job:</span>
                  <select value={linkedJob} onChange={e=>setLinkedJob(e.target.value)} style={{fontSize:11,padding:"4px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontFamily:F,background:C.surface,color:C.text2}}>
                    <option value="">None</option>
                    {jobs.map(j=><option key={j.id} value={j.id}>{j.data?.job_title||j.data?.name||"Job"}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Quick searches */}
            {!results&&!searching&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Quick searches</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {QUICK.map(s=>(
                    <button key={s} onClick={()=>{setQueryText(s);setTimeout(()=>runSearch(s),0);}} style={{padding:"7px 14px",borderRadius:99,fontSize:12,border:`1px solid ${C.border}`,background:C.surface,color:C.text2,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:6}}>
                      <Ic n="arrowRight" s={11} c={C.text3}/>{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Searching */}
            {searching && <div style={{textAlign:"center",padding:"48px 16px"}}><div style={{fontSize:28,marginBottom:12}}>🔍</div><div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:6}}>Searching across sources…</div><div style={{fontSize:12,color:C.text3}}>Querying {activeSrcs.join(", ")} simultaneously</div></div>}
            {/* Results */}
            {results&&!searching&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{allCandidates.length} candidates found <span style={{fontSize:12,color:C.text3,fontWeight:400}}>for "{results.query}"</span></span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {results.results?.map(r=>{const sm=SRC[r.source];return <span key={r.source} style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:`${sm?.color||"#ccc"}18`,color:sm?.color||C.text3}}>{sm?.label||r.source}: {r.candidates?.length||0}</span>;})}
                    <button onClick={()=>{setAlertForm(true);setNewAlert(n=>({...n,query:results.query}));setTab("alerts");}} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${C.purple}50`,background:C.purpleL,color:C.purple,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:5}}>
                      <Ic n="bell" s={11} c={C.purple}/> Save as alert
                    </button>
                  </div>
                </div>
                {results.parsed?.skills?.length>0&&<div style={{padding:"8px 12px",borderRadius:8,background:C.accentL,marginBottom:14,fontSize:11,color:C.accent}}><strong>AI detected:</strong> {[results.parsed.titles?.length&&`Titles: ${results.parsed.titles.join(", ")}`,results.parsed.skills?.length&&`Skills: ${results.parsed.skills.join(", ")}`].filter(Boolean).join(" · ")}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {allCandidates.map(c=><CandidateCard key={c.id} candidate={c} onImport={handleImport} done={imported.has(c.id)||!!importing[c.id]}/>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─ ALERTS ─ */}
        {tab==="alerts"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div><div style={{fontSize:16,fontWeight:700,color:C.text1}}>Talent Alerts</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>Automated searches that run on a schedule and surface new candidates</div></div>
              <button onClick={()=>setAlertForm(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}><Ic n="plus" s={14} c="white"/>New Alert</button>
            </div>
            {alertForm&&(
              <div style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.accent}40`,padding:20,marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:14}}>Create Talent Alert</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <input value={newAlert.name} onChange={e=>setNewAlert(n=>({...n,name:e.target.value}))} placeholder="Alert name (e.g. Senior Engineers — Global)" style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:13,color:C.text1}}/>
                  <input value={newAlert.query} onChange={e=>setNewAlert(n=>({...n,query:e.target.value}))} placeholder="Search query in natural language" style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:13,color:C.text1}}/>
                  <select value={newAlert.schedule} onChange={e=>setNewAlert(n=>({...n,schedule:e.target.value}))} style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontFamily:F,fontSize:13}}>
                    <option value="daily">Run daily</option><option value="weekly">Run weekly</option><option value="manual">Manual only</option>
                  </select>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <button onClick={()=>setAlertForm(false)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:F,fontSize:12}}>Cancel</button>
                    <button onClick={createAlert} style={{padding:"8px 18px",borderRadius:8,border:"none",background:C.accent,color:"white",fontWeight:700,cursor:"pointer",fontFamily:F,fontSize:12}}>Create Alert</button>
                  </div>
                </div>
              </div>
            )}
            {alerts.length===0&&!alertForm
              ? <div style={{textAlign:"center",padding:"48px 16px",background:C.surface,borderRadius:14,border:`1.5px dashed ${C.border}`}}><Ic n="bell" s={32} c={C.border}/><div style={{fontSize:14,fontWeight:700,color:C.text1,marginTop:12}}>No talent alerts yet</div><div style={{fontSize:12,color:C.text3,marginTop:4}}>Alerts run searches automatically and surface new matching candidates</div></div>
              : <div style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>{alerts.map(a=><AlertRow key={a.id} alert={a} onDelete={deleteAlert} onRun={runAlert}/>)}</div>
            }
          </div>
        )}

        {/* ─ SOURCES ─ */}
        {tab==="sources"&&(
          <div>
            <div style={{marginBottom:16}}><div style={{fontSize:16,fontWeight:700,color:C.text1}}>Configured Sources</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>Add API keys in Railway → Variables to activate each source. GitHub works immediately without a token.</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {sources.map(s=><SourceCard key={s.id} source={s}/>)}
            </div>
            <div style={{marginTop:16,padding:"12px 16px",borderRadius:10,background:C.accentL,fontSize:12,color:C.text2,lineHeight:1.7}}>
              <strong>Roadmap adapters:</strong> Monster, CareerBuilder, Seek (APAC), Naukri (India), StepStone (Europe), LinkedIn (partner programme) — all slot into the existing adapter pattern when commercial agreements are in place.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
