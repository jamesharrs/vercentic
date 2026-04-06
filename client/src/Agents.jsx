// client/src/Agents.jsx
import AgentLibrary from "./AgentLibrary.jsx";
import SharePicker from "./SharePicker.jsx";
import { useState, useEffect, useCallback } from "react";
import AiBadge from "./AiBadge.jsx";
import api from "./apiClient.js";

// ── Agent avatar presets ──────────────────────────────────────────────────────
const AGENT_AVATARS = [
  { id: "robot",     label: "Robot",      path: "M12 2a2 2 0 012 2v1h3a2 2 0 012 2v3a2 2 0 01-2 2h-1v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4H5a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2zM9 12a1 1 0 100-2 1 1 0 000 2zM15 12a1 1 0 100-2 1 1 0 000 2z" },
  { id: "brain",     label: "Brain",      path: "M12 2C8.5 2 6 4.5 6 7c0 1.5.5 2.8 1.4 3.8A6 6 0 006 15c0 3.3 2.7 6 6 6s6-2.7 6-6a6 6 0 00-1.4-4.2C17.5 9.8 18 8.5 18 7c0-2.5-2.5-5-6-5z" },
  { id: "sparkles",  label: "Magic",      path: "M12 2l1.582 6.135a2 2 0 001.437 1.437L21.154 11.154a.5.5 0 010 .964L15.019 13.7a2 2 0 00-1.437 1.437L12 21.271a.5.5 0 01-.963 0L9.455 15.136a2 2 0 00-1.437-1.437L1.883 12.118a.5.5 0 010-.964L8.018 9.572A2 2 0 009.455 8.135L12 2z" },
  { id: "target",    label: "Target",     path: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z" },
  { id: "shield",    label: "Shield",     path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { id: "zap",       label: "Lightning",  path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { id: "search",    label: "Search",     path: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" },
  { id: "mail",      label: "Mail",       path: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" },
  { id: "calendar",  label: "Calendar",   path: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" },
  { id: "bar-chart", label: "Analytics",  path: "M18 20V10M12 20V4M6 20v-6" },
  { id: "users",     label: "People",     path: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { id: "clipboard", label: "Clipboard",  path: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" },
  { id: "code",      label: "Code",       path: "M16 18l6-6-6-6M8 6l-6 6 6 6" },
  { id: "globe",     label: "Global",     path: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" },
  { id: "mic",       label: "Voice",      path: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" },
  { id: "eye",       label: "Monitor",    path: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" },
];
const AGENT_COLORS = ["#4361EE","#7c3aed","#0891b2","#059669","#10b981","#e11d48","#f59e0b","#d97706","#6366f1","#0d9488","#dc2626","#2563eb"];

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg: "var(--t-bg, #EEF2FF)", card: "white", accent: "var(--t-accent, #4361EE)",
  accentLight: "var(--t-accent-light, #EEF2FF)", text1: "#111827", text2: "#374151",
  text3: "#6B7280", border: "#E5E7EB", green: "#0CA678", amber: "#F08C00",
  red: "#E03131", purple: "#7048E8",
};

const Ic = ({ n, s = 16, c = C.text3 }) => {
  const paths = {
    plus: "M12 5v14M5 12h14", x: "M18 6 6 18M6 6l12 12",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    play: "M5 3l14 9-14 9V3z",
    check: "M20 6 9 17l-5-5",
    zap: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
    clock: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2",
    alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15",
    chevD: "M6 9l6 6 6-6", chevR: "M9 18l6-6-6-6",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    sparkles: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    thumbUp: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
    thumbDown: "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17",
    calendar: "M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[n] || paths.zap} />
    </svg>
  );
};

const TRIGGER_ICONS = { record_created:"plus", record_updated:"edit", stage_changed:"chevR", form_submitted:"check", schedule_daily:"clock", schedule_weekly:"calendar", manual:"play" };
const TRIGGER_COLORS = { record_created:"#4361EE", record_updated:"#F08C00", stage_changed:"#7048E8", form_submitted:"#0CA678", schedule_daily:"#E03131", schedule_weekly:"#E03131", manual:"#374151" };
// Whether a trigger fires automatically (vs manually)
const AUTO_TRIGGERS = new Set(["record_created","record_updated","stage_changed","form_submitted","schedule_daily","schedule_weekly"]);
const ACTION_ICONS  = { ai_analyse:"sparkles", ai_draft_email:"sparkles", ai_summarise:"sparkles", ai_score:"sparkles", send_email:"mail", update_field:"edit", add_note:"edit", add_to_pool:"users", create_task:"check", notify_user:"alert", webhook:"zap", human_review:"eye", ai_interview:"users", interview_coordinator:"calendar" };
const ACTION_COLORS = { ai_analyse:"#7048E8", ai_draft_email:"#7048E8", ai_summarise:"#7048E8", ai_score:"#7048E8", send_email:"#4361EE", update_field:"#F08C00", add_note:"#0CA678", add_to_pool:"#0CA678", create_task:"#F08C00", notify_user:"#E03131", webhook:"#374151", human_review:"#E67700", ai_interview:"#7048E8", interview_coordinator:"#0891b2" };

const VOICES = [
  {id:'en-US',label:'English (US)'},{id:'en-GB',label:'English (UK)'},
  {id:'en-AU',label:'English (AU)'},{id:'ar-SA',label:'Arabic (Gulf)'},
  {id:'fr-FR',label:'French'},{id:'de-DE',label:'German'},
];
const AVATAR_COLORS_LIST = ['#6366f1','#0891b2','#059669','#d97706','#e03131','#7c3aed','#db2777','#0284c7'];
const Q_TYPE_COLORS = { knockout:'#dc2626', competency:'#2563eb', technical:'#7c3aed', culture:'#059669' };

function statusColor(s) { return {active:C.green,inactive:C.text3,running:C.amber,failed:C.red,completed:C.green,pending_approval:"#E67700",skipped:C.text3}[s]||C.text3; }
function relTime(ts) { if(!ts) return 'Never'; const diff=Date.now()-new Date(ts).getTime(),m=Math.floor(diff/60000); if(m<1) return 'Just now'; if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }

// ── AGENT FEED ROW (used in Dashboard activity timeline) ─────────────────────
const FEED_STATUS = {
  completed:        {dot:"#0CA678", bg:"#F0FDF4", label:"Done"},
  pending_approval: {dot:"#F08C00", bg:"#FFFBEB", label:"Review"},
  failed:           {dot:"#E03131", bg:"#FFF5F5", label:"Failed"},
  skipped:          {dot:"#9CA3AF", bg:"#F9FAFB", label:"Skipped"},
  running:          {dot:"#4361EE", bg:"#EEF2FF", label:"Running"},
};
function AgentFeedRow({ item }) {
  const [exp, setExp] = useState(false);
  const st = FEED_STATUS[item.status] || FEED_STATUS.completed;
  const when = (() => {
    const d = Date.now() - new Date(item.created_at).getTime();
    if (d < 60000) return "just now";
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
    return new Date(item.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  })();
  return (
    <div style={{borderBottom:`1px solid ${C.border}`}}>
      <div onClick={()=>setExp(!exp)}
        style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 16px",cursor:"pointer",transition:"background .1s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <div style={{position:"relative",flexShrink:0,marginTop:1}}>
          <div style={{width:30,height:30,borderRadius:8,background:st.bg,border:`1.5px solid ${st.dot}25`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n={item.status==="pending_approval"?"eye":item.status==="failed"?"alert":item.is_ai?"sparkles":"play"} s={13} c={st.dot}/>
          </div>
          {item.is_ai&&<div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:C.purple,border:"1.5px solid white",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="6" height="6" viewBox="0 0 24 24" fill="white"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5z"/></svg>
          </div>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{item.agent_name}</span>
            {item.record_name&&<span style={{fontSize:10,color:C.accent,background:`${C.accent}10`,padding:"1px 6px",borderRadius:4,fontWeight:600,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
              onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:item.record_id,objectName:item.object_name}}));}}>
              {item.record_name}
            </span>}
          </div>
          <div style={{fontSize:11,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:exp?"normal":"nowrap",lineHeight:1.4}}>
            {item.summary}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <span style={{fontSize:10,color:C.text3}}>{when}</span>
          <span style={{fontSize:9,fontWeight:700,color:st.dot,background:st.bg,padding:"1px 6px",borderRadius:4}}>{st.label}</span>
        </div>
      </div>
      {exp&&item.ai_output&&(
        <div style={{margin:"0 16px 10px 56px",padding:"8px 10px",borderRadius:7,background:`${C.purple}08`,border:`1px solid ${C.purple}18`,fontSize:11,color:C.text2,lineHeight:1.5,whiteSpace:"pre-wrap",maxHeight:100,overflowY:"auto"}}>
          <div style={{fontSize:9,fontWeight:800,color:C.purple,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>AI Output</div>
          {item.ai_output}
        </div>
      )}
    </div>
  );
}

// ── AGENT CARD ────────────────────────────────────────────────────────────────

// ── Agent Avatar component ────────────────────────────────────────────────────
function AgentAvatar({ agent, size = 40 }) {
  const color = agent.avatar_color || TRIGGER_COLORS[agent.trigger_type] || C.accent;
  const avatarDef = AGENT_AVATARS.find(a => a.id === agent.avatar_icon);
  const initials = (agent.name || "A").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `${color}15`, border: `2px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      transition: "all .15s"
    }}>
      {avatarDef ? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={avatarDef.path}/>
        </svg>
      ) : (
        <span style={{ fontSize: size * 0.32, fontWeight: 800, color, fontFamily: F, letterSpacing: "-0.02em" }}>{initials}</span>
      )}
    </div>
  );
}

// ── Run Agent Modal ────────────────────────────────────────────────────────────
function RunAgentModal({ agent, environment, onClose, onRun }) {
  const [step, setStep]           = useState('config'); // config | running | done
  const [objects, setObjects]     = useState([]);
  const [selectedObj, setSelectedObj] = useState(null);
  const [records, setRecords]     = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [search, setSearch]       = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [triggerMode, setTriggerMode] = useState('now'); // now | schedule
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00');
  const [results, setResults]     = useState([]);
  const [saving, setSaving]       = useState(false);

  // Load objects on open
  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`)
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setObjects(arr);
        // Auto-select based on agent object_id
        const match = arr.find(o => o.id === agent.object_id);
        if (match) setSelectedObj(match);
        else if (arr.length > 0) setSelectedObj(arr[0]);
      }).catch(() => {});
  }, [environment?.id]);

  // Load records when object selected
  useEffect(() => {
    if (!selectedObj || !environment?.id) return;
    setLoadingRec(true); setRecords([]); setSelectedIds([]);
    api.get(`/records?object_id=${selectedObj.id}&environment_id=${environment.id}&limit=200`)
      .then(d => {
        const recs = Array.isArray(d) ? d : (d?.records || []);
        setRecords(recs);
      })
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, [selectedObj?.id, environment?.id]);

  // Derive action summary
  const actionSummary = (() => {
    const acts = agent.actions || [];
    if (acts.length === 0) return 'No actions configured.';
    const labels = acts.map(a => {
      switch(a.type) {
        case 'ai_interview': return '🎙 Conduct AI Interview';
        case 'ai_summarise': return '✨ AI Summarise record';
        case 'send_email':   return `📧 Send email${a.email_subject?' "'+a.email_subject+'"':''}`;
        case 'add_note':     return '📝 Add note to record';
        case 'update_field': return `✏️ Update field${a.field_key?' "'+a.field_key+'"':''}`;
        case 'webhook':      return '🔗 Send webhook';
        case 'run_agent':    return `▶ Run agent${a.agent_name?' "'+a.agent_name+'"':''}`;
        default: return (a.type||'').replace(/_/g,' ');
      }
    });
    return labels;
  })();

  const filteredRecords = records.filter(r => {
    if (!search) return true;
    const d = r.data || {};
    const name = [d.first_name, d.last_name, d.full_name, d.name, d.title, d.job_title]
      .filter(Boolean).join(' ').toLowerCase();
    return name.includes(search.toLowerCase()) || (d.email||'').toLowerCase().includes(search.toLowerCase());
  });

  const toggleId = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const toggleAll = () => setSelectedIds(s => s.length === filteredRecords.length ? [] : filteredRecords.map(r=>r.id));

  const getRecordName = (r) => {
    const d = r.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(' ')
      || d.full_name || d.name || d.title || d.job_title || d.email || r.id.slice(0,8);
  };
  const getRecordSub = (r) => {
    const d = r.data || {};
    return d.email || d.job_title || d.current_title || d.department || '';
  };

  const handleRun = async () => {
    setSaving(true); setStep('running');
    try {
      const res = await api.post(`/agents/${agent.id}/run`, {
        environment_id: environment?.id,
        record_ids: selectedIds.length > 0 ? selectedIds : undefined,
        object_id: selectedObj?.id,
        trigger_mode: triggerMode,
        scheduled_at: triggerMode === 'schedule' ? `${schedDate}T${schedTime}` : undefined,
      });
      setResults(Array.isArray(res?.results) ? res.results : []);
      setStep('done');
      onRun && onRun();
    } catch(e) {
      setStep('done');
    }
    setSaving(false);
  };

  const INP = { width:'100%', padding:'8px 12px', borderRadius:9, border:`1.5px solid ${C.border}`,
    fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', background:'white' };
  const LBL = { display:'block', fontSize:11, fontWeight:700, color:C.text3,
    marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
        style={{background:'white',borderRadius:20,width:'100%',maxWidth:560,maxHeight:'90vh',
          overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',fontFamily:F}}>

        {/* Header */}
        <div style={{padding:'20px 24px 0',display:'flex',alignItems:'center',gap:12}}>
          <AgentAvatar agent={agent} size={40}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{agent.name}</div>
            {agent.description&&<div style={{fontSize:12,color:C.text3}}>{agent.description}</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.text3}}>×</button>
        </div>

        {/* Content */}
        <div style={{padding:'20px 24px'}}>

          {step === 'config' && (<>
            {/* Object + Record picker */}
            <div style={{marginBottom:16}}>
              <label style={LBL}>Run on object</label>
              <select value={selectedObj?.id||''} onChange={e=>setSelectedObj(objects.find(o=>o.id===e.target.value)||null)}
                style={{...INP,background:'white'}}>
                {objects.map(o=><option key={o.id} value={o.id}>{o.plural_name||o.name}</option>)}
              </select>
            </div>

            {selectedObj && (<>
              <div style={{marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <label style={{...LBL,margin:0}}>Select records ({selectedIds.length} selected)</label>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={toggleAll} style={{fontSize:11,color:C.accent,fontWeight:600,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:F}}>
                    {selectedIds.length===filteredRecords.length?'Deselect all':'Select all'}
                  </button>
                </div>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${selectedObj.plural_name||selectedObj.name}…`} style={{...INP,marginBottom:8}}/>
              <div style={{border:`1.5px solid ${C.border}`,borderRadius:10,maxHeight:200,overflowY:'auto',marginBottom:16}}>
                {loadingRec ? (
                  <div style={{padding:'24px',textAlign:'center',color:C.text3,fontSize:12}}>Loading…</div>
                ) : filteredRecords.length === 0 ? (
                  <div style={{padding:'24px',textAlign:'center',color:C.text3,fontSize:12}}>No records found</div>
                ) : filteredRecords.map(r => {
                  const name = getRecordName(r);
                  const sub  = getRecordSub(r);
                  const checked = selectedIds.includes(r.id);
                  return (
                    <div key={r.id} onClick={()=>toggleId(r.id)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',
                        borderBottom:`1px solid ${C.border}`,cursor:'pointer',
                        background:checked?`${C.accent}08`:'white',transition:'background .1s'}}
                      onMouseEnter={e=>{if(!checked)e.currentTarget.style.background='#fafafa';}}
                      onMouseLeave={e=>{if(!checked)e.currentTarget.style.background='white';}}>
                      <input type="checkbox" checked={checked} onChange={()=>toggleId(r.id)}
                        style={{accentColor:C.accent,width:14,height:14,flexShrink:0}}/>
                      <div style={{width:28,height:28,borderRadius:8,background:`${C.accent}15`,
                        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{fontSize:11,fontWeight:800,color:C.accent}}>
                          {(name[0]||'?').toUpperCase()}
                        </span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{name}</div>
                        {sub&&<div style={{fontSize:11,color:C.text3}}>{sub}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}

            {/* Trigger timing */}
            <div style={{marginBottom:16}}>
              <label style={LBL}>When to run</label>
              <div style={{display:'flex',gap:8}}>
                {[{v:'now',label:'Run now'},
                  {v:'schedule',label:'Schedule for later'}].map(({v,label})=>(
                  <button key={v} onClick={()=>setTriggerMode(v)}
                    style={{flex:1,padding:'9px 12px',borderRadius:9,border:`1.5px solid ${triggerMode===v?C.accent:C.border}`,
                      background:triggerMode===v?`${C.accent}08`:'white',color:triggerMode===v?C.accent:C.text2,
                      fontSize:12,fontWeight:triggerMode===v?700:500,cursor:'pointer',fontFamily:F,transition:'all .12s'}}>
                    {label}
                  </button>
                ))}
              </div>
              {triggerMode==='schedule' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>
                  <div>
                    <label style={LBL}>Date</label>
                    <input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} style={INP}/>
                  </div>
                  <div>
                    <label style={LBL}>Time</label>
                    <input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} style={INP}/>
                  </div>
                </div>
              )}
            </div>

            {/* What happens next summary */}
            <div style={{background:`${C.accent}06`,border:`1.5px solid ${C.accent}20`,borderRadius:12,padding:'14px 16px',marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>What happens next</div>
              {Array.isArray(actionSummary) ? (
                <ol style={{margin:0,padding:'0 0 0 18px'}}>
                  {actionSummary.map((s,i)=>(
                    <li key={i} style={{fontSize:12,color:C.text2,marginBottom:4,lineHeight:1.4}}>{s}</li>
                  ))}
                </ol>
              ) : (
                <div style={{fontSize:12,color:C.text3}}>{actionSummary}</div>
              )}
              {selectedIds.length > 0 && (
                <div style={{fontSize:12,color:C.text3,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.accent}20`}}>
                  Applied to <strong style={{color:C.text1}}>{selectedIds.length}</strong> record{selectedIds.length!==1?'s':''}.
                  {triggerMode==='schedule'&&schedDate ? ` Scheduled for ${schedDate} at ${schedTime}.` : ' Starting immediately.'}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{display:'flex',gap:10}}>
              <button onClick={onClose}
                style={{flex:1,padding:'11px',borderRadius:10,border:`1.5px solid ${C.border}`,
                  background:'transparent',color:C.text2,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F}}>
                Cancel
              </button>
              <button onClick={handleRun}
                disabled={saving||(selectedIds.length===0&&records.length>0)||(triggerMode==='schedule'&&!schedDate)}
                style={{flex:2,padding:'11px',borderRadius:10,border:'none',
                  background:saving||selectedIds.length===0&&records.length>0?'#9ca3af':C.accent,
                  color:'white',fontSize:13,fontWeight:700,
                  cursor:saving||selectedIds.length===0&&records.length>0?'not-allowed':'pointer',fontFamily:F,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <Ic n="play" s={13} c="white"/>
                {triggerMode==='schedule'?'Schedule Run':`Run on ${selectedIds.length||'all'} record${selectedIds.length!==1?'s':''}`}
              </button>
            </div>
          </>)}

          {step === 'running' && (
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <div style={{width:48,height:48,borderRadius:16,background:`${C.accent}15`,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                <Ic n="loader" s={24} c={C.accent}/>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:6}}>Running agent…</div>
              <div style={{fontSize:13,color:C.text3}}>Executing actions on {selectedIds.length} record{selectedIds.length!==1?'s':''}.</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{width:48,height:48,borderRadius:16,background:`${C.green}15`,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                <Ic n="check" s={24} c={C.green}/>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:6}}>
                {triggerMode==='schedule'?'Scheduled successfully':'Run complete'}
              </div>
              <div style={{fontSize:13,color:C.text3,marginBottom:20}}>
                {triggerMode==='schedule'
                  ? `Agent will run on ${schedDate} at ${schedTime}.`
                  : `Agent executed on ${selectedIds.length} record${selectedIds.length!==1?'s':''}.`}
              </div>
              <button onClick={onClose}
                style={{padding:'10px 28px',borderRadius:10,border:'none',background:C.accent,
                  color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F}}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function AgentCard({ agent, onEdit, onDelete, onRun, onRunWithOptions, environment, onSelect, selected }) {
  const [running, setRunning]     = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const handleRun = (e) => { e.stopPropagation(); setShowRunModal(true); };
  const handleRunDone = async () => { setShowRunModal(false); await onRun(agent.id); };
  const trigColor = TRIGGER_COLORS[agent.trigger_type] || C.accent;
  return (
    <>
    <div onClick={() => onSelect(agent)} style={{ background:"white", borderRadius:14, border:`1.5px solid ${selected?C.accent:C.border}`, padding:0, cursor:"pointer", transition:"all .15s", overflow:"hidden", boxShadow:selected?`0 0 0 3px ${C.accentLight}`:"0 1px 4px rgba(0,0,0,.04)" }}
      onMouseEnter={e=>{if(!selected)e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";}}
      onMouseLeave={e=>{if(!selected)e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)";}}>
      <div style={{height:3,background:trigColor}}/>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <AgentAvatar agent={agent} size={36}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:2}}>{agent.name}</div>
            {agent.description&&<div style={{fontSize:12,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{agent.description}</div>}
          </div>
          {/* Auto/Manual badge */}
          {AUTO_TRIGGERS.has(agent.trigger_type) ? (
            <div style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:`${C.green}15`,color:C.green,fontWeight:700,flexShrink:0}}>AUTO</div>
          ) : (
            <div style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:"#F3F4F6",color:C.text3,fontWeight:700,flexShrink:0}}>MANUAL</div>
          )}
          <div onClick={async e=>{e.stopPropagation();await api.patch(`/agents/${agent.id}`,{is_active:agent.is_active?0:1});onEdit(agent);}}
            style={{width:34,height:20,borderRadius:10,background:agent.is_active?C.green:"#D1D5DB",cursor:"pointer",position:"relative",flexShrink:0,transition:"background .2s"}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:2,left:agent.is_active?16:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
          {(agent.actions||[]).slice(0,4).map((a,i)=>{const ac=ACTION_COLORS[a.type]||C.text3;return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:6,background:`${ac}10`,border:`1px solid ${ac}20`}}>
              <Ic n={ACTION_ICONS[a.type]||"zap"} s={10} c={ac}/>
              <span style={{fontSize:10,color:ac,fontWeight:600,textTransform:"capitalize"}}>{(a.type||'').replace(/_/g,' ')}</span>
            </div>
          );})}
          {(agent.actions||[]).length>4&&<div style={{fontSize:10,color:C.text3,padding:"2px 6px"}}>+{agent.actions.length-4} more</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {agent.pending_approvals>0&&(
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:"#FFF3CD",border:"1px solid #F08C00"}}>
              <Ic n="eye" s={11} c="#F08C00"/><span style={{fontSize:11,color:"#F08C00",fontWeight:700}}>{agent.pending_approvals} pending</span>
            </div>
          )}
          <div style={{flex:1}}/>
          <span style={{fontSize:11,color:C.text3}}>{relTime(agent.last_run_at)}</span>
          <span style={{fontSize:11,color:statusColor(agent.is_active?'active':'inactive'),fontWeight:600}}>{agent.is_active?'Active':'Inactive'}</span>
          <button onClick={handleRun} disabled={running} style={{padding:"4px 10px",borderRadius:7,border:"none",background:C.accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
            {running?<Ic n="loader" s={11} c="white"/>:<Ic n="play" s={11} c="white"/>}{running?'Running…':'Run'}
          </button>
          <button onClick={e=>{e.stopPropagation();onEdit(agent);}} style={{padding:"4px 6px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer"}}><Ic n="edit" s={13} c={C.text3}/></button>
          <button onClick={e=>{e.stopPropagation();onDelete(agent.id);}} style={{padding:"4px 6px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer"}}><Ic n="trash" s={13} c={C.red}/></button>
        </div>
      </div>
    </div>
    {showRunModal && (
      <RunAgentModal agent={agent} environment={environment} onClose={()=>setShowRunModal(false)} onRun={handleRunDone}/>
    )}
    </>
  );
}

// ── AGENT BUILDER MODAL ────────────────────────────────────────────────────────
function AgentBuilderModal({ agent, environment, objects, onClose, onSave }) {
  const isEdit = !!agent?.id;
  const [tab, setTab] = useState('trigger');
  const [meta, setMeta] = useState({ trigger_types: {}, action_types: {} });
  const [fields, setFields] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: agent?.name||'', description: agent?.description||'', trigger_type: agent?.trigger_type||'manual',
    trigger_config: agent?.trigger_config||{}, target_object_id: agent?.target_object_id||'',
    conditions: agent?.conditions||[], actions: agent?.actions||[],
    is_active: agent?.is_active!==undefined?agent.is_active:1, schedule_time: agent?.schedule_time||'09:00',
    sharing: agent?.sharing || { visibility: 'private', user_ids: [], group_ids: [] },
    avatar_icon: agent?.avatar_icon || '', avatar_color: agent?.avatar_color || '',
  });

  useEffect(()=>{ api.get('/agents/meta').then(setMeta).catch(()=>{}); },[]);
  useEffect(()=>{ api.get('/question-bank').then(d=>setQuestions(Array.isArray(d)?d:[])).catch(()=>{}); },[]);
  useEffect(()=>{ if(form.target_object_id) api.get(`/fields?object_id=${form.target_object_id}`).then(d=>setFields(Array.isArray(d)?d:[])).catch(()=>{}); },[form.target_object_id]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const addCondition = () => set('conditions',[...form.conditions,{field:'',operator:'equals',value:''}]);
  const updateCondition = (i,k,v) => { const c=[...form.conditions]; c[i]={...c[i],[k]:v}; set('conditions',c); };
  const removeCondition = (i) => set('conditions',form.conditions.filter((_,idx)=>idx!==i));
  const addAction = (type) => set('actions',[...form.actions,{type,prompt:'',field_key:'',field_value:'',note_template:'',email_subject:'',email_body:'',webhook_url:'',criteria:'',email_purpose:'',tone:'professional'}]);
  const updateAction = (i,k,v) => { const a=[...form.actions]; a[i]={...a[i],[k]:v}; set('actions',a); };
  const removeAction = (i) => set('actions',form.actions.filter((_,idx)=>idx!==i));
  const moveAction = (i,dir) => { const a=[...form.actions]; const j=i+dir; if(j<0||j>=a.length) return; [a[i],a[j]]=[a[j],a[i]]; set('actions',a); };
  const isAiAction = (type) => ['ai_analyse','ai_draft_email','ai_summarise','ai_score'].includes(type);

  const handleSave = async () => {
    if(!form.name||!form.trigger_type) return;
    setSaving(true);
    try {
      const payload={...form,environment_id:environment?.id};
      if(isEdit) await api.patch(`/agents/${agent.id}`,payload);
      else await api.post('/agents',payload);
      onSave();
    } finally { setSaving(false); }
  };

  const TABS=['trigger','conditions','actions','settings'];
  const TAB_LABELS={trigger:'Trigger',conditions:'Conditions',actions:'Actions',settings:'Settings'};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
      onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:18,width:680,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}
        onMouseDown={e=>e.stopPropagation()}>
        <div style={{padding:"20px 24px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:40,height:40,borderRadius:12,background:`${form.avatar_color||C.purple}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {form.avatar_icon ? (
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={form.avatar_color||C.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={(AGENT_AVATARS.find(a=>a.id===form.avatar_icon)||{}).path||"M13 2L3 14h9l-1 8 10-12h-9l1-8z"}/>
                </svg>
              ) : (
                <Ic n="zap" s={20} c={form.avatar_color||C.purple}/>
              )}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit?'Edit Agent':'New Agent'}</div>
              <div style={{fontSize:12,color:C.text3}}>Configure trigger, conditions, and actions</div>
            </div>
            <button onClick={onClose} style={{padding:6,border:"none",background:"transparent",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
          </div>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Agent name…"
            style={{width:"100%",border:"none",fontSize:18,fontWeight:700,color:C.text1,outline:"none",marginBottom:12,fontFamily:F,background:"transparent"}}/>
          <div style={{display:"flex",gap:0}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:tab===t?700:500,color:tab===t?C.accent:C.text3,borderBottom:`2px solid ${tab===t?C.accent:"transparent"}`,marginBottom:-1}}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

          {/* TRIGGER TAB */}
          {tab==='trigger'&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>What starts this agent?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {Object.entries(meta.trigger_types||{}).map(([key,def])=>(
                  <div key={key} onClick={()=>set('trigger_type',key)} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${form.trigger_type===key?C.accent:C.border}`,background:form.trigger_type===key?C.accentLight:"white",cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"flex-start",gap:10}}>
                    <Ic n={TRIGGER_ICONS[key]||"zap"} s={16} c={form.trigger_type===key?C.accent:C.text3}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:form.trigger_type===key?C.accent:C.text1}}>{def.label}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2,lineHeight:1.4}}>{def.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              {['record_created','record_updated','stage_changed'].includes(form.trigger_type)&&(
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Target Object</label>
                  <select value={form.target_object_id} onChange={e=>set('target_object_id',e.target.value)}
                    style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,background:"white",color:C.text1}}>
                    <option value="">All objects</option>
                    {objects.map(o=><option key={o.id} value={o.id}>{o.plural_name||o.name}</option>)}
                  </select>
                </div>
              )}
              {['schedule_daily','schedule_weekly'].includes(form.trigger_type)&&(
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Time</label>
                    <input type="time" value={form.schedule_time} onChange={e=>set('schedule_time',e.target.value)}
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F}}/>
                  </div>
                  {form.trigger_type==='schedule_weekly'&&(
                    <div style={{flex:1}}>
                      <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Day</label>
                      <select value={form.trigger_config?.day_of_week||'monday'} onChange={e=>set('trigger_config',{...form.trigger_config,day_of_week:e.target.value})}
                        style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,background:"white"}}>
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d} value={d.toLowerCase()}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div style={{marginTop:16}}>
                <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Description (optional)</label>
                <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} placeholder="What does this agent do?"
                  style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,resize:"vertical"}}/>
              </div>
            </div>
          )}

          {/* CONDITIONS TAB */}
          {tab==='conditions'&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Run only when…</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:16}}>All conditions must be true. Leave empty to always run.</div>
              {form.conditions.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <select value={c.field} onChange={e=>updateCondition(i,'field',e.target.value)}
                    style={{flex:2,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                    <option value="">Pick field…</option>
                    {fields.map(f=><option key={f.id} value={f.api_key}>{f.name}</option>)}
                  </select>
                  <select value={c.operator} onChange={e=>updateCondition(i,'operator',e.target.value)}
                    style={{flex:1.5,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                    {['equals','not_equals','contains','greater_than','less_than','is_empty','is_not_empty','includes'].map(op=><option key={op} value={op}>{op.replace(/_/g,' ')}</option>)}
                  </select>
                  {!['is_empty','is_not_empty'].includes(c.operator)&&(
                    <input value={c.value} onChange={e=>updateCondition(i,'value',e.target.value)} placeholder="Value…"
                      style={{flex:2,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
                  )}
                  <button onClick={()=>removeCondition(i)} style={{padding:"6px",border:"none",background:"transparent",cursor:"pointer"}}><Ic n="x" s={14} c={C.red}/></button>
                </div>
              ))}
              <button onClick={addCondition} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",color:C.text3,fontSize:13,fontFamily:F}}>
                <Ic n="plus" s={14} c={C.text3}/> Add condition
              </button>
            </div>
          )}

          {/* ACTIONS TAB */}
          {tab==='actions'&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Then do…</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:16}}>Actions run in sequence. AI actions run first and their output is available to later actions.</div>
              {form.actions.map((a,i)=>{
                const ac=ACTION_COLORS[a.type]||C.text3;
                return(
                  <div key={i} style={{marginBottom:10,border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${ac}08`}}>
                      <div style={{display:"flex",gap:2}}>
                        <button onClick={()=>moveAction(i,-1)} style={{padding:2,border:"none",background:"transparent",cursor:"pointer"}}>▲</button>
                        <button onClick={()=>moveAction(i,1)} style={{padding:2,border:"none",background:"transparent",cursor:"pointer"}}>▼</button>
                      </div>
                      <div style={{width:28,height:28,borderRadius:8,background:`${ac}20`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={ACTION_ICONS[a.type]||"zap"} s={14} c={ac}/></div>
                      <span style={{flex:1,fontSize:13,fontWeight:700,color:C.text1,textTransform:"capitalize"}}>{(a.type||'').replace(/_/g,' ')}</span>
                      {isAiAction(a.type)&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.purple}15`,color:C.purple,fontWeight:700}}>AI</span>}
                      <button onClick={()=>removeAction(i)} style={{padding:4,border:"none",background:"transparent",cursor:"pointer"}}><Ic n="x" s={13} c={C.red}/></button>
                    </div>
                    <div style={{padding:"10px 12px"}}>
                      {isAiAction(a.type)&&a.type!=='ai_draft_email'&&(
                        <textarea value={a.prompt} onChange={e=>updateAction(i,'prompt',e.target.value)}
                          placeholder={a.type==='ai_score'?"Scoring criteria…":"Custom prompt (leave empty for default)…"}
                          rows={2} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical"}}/>
                      )}
                      {a.type==='ai_draft_email'&&(
                        <div style={{display:"flex",gap:8}}>
                          <input value={a.email_purpose} onChange={e=>updateAction(i,'email_purpose',e.target.value)} placeholder="Email purpose…" style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
                          <select value={a.tone} onChange={e=>updateAction(i,'tone',e.target.value)} style={{width:130,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                            {['professional','warm','formal','friendly','concise'].map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                      {a.type==='update_field'&&(
                        <div style={{display:"flex",gap:8}}>
                          <select value={a.field_key} onChange={e=>updateAction(i,'field_key',e.target.value)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                            <option value="">Select field…</option>
                            {fields.map(f=><option key={f.id} value={f.api_key}>{f.name}</option>)}
                          </select>
                          <input value={a.field_value} onChange={e=>updateAction(i,'field_value',e.target.value)} placeholder="Value (or empty for AI output)…" style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
                        </div>
                      )}
                      {a.type==='add_note'&&(<textarea value={a.note_template} onChange={e=>updateAction(i,'note_template',e.target.value)} placeholder="Note text. Use {{ai_output}} to include AI result…" rows={2} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical"}}/>)}
                      {a.type==='webhook'&&(<input value={a.webhook_url} onChange={e=>updateAction(i,'webhook_url',e.target.value)} placeholder="https://your-endpoint.com/webhook" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>)}
                      {a.type==='human_review'&&(<div style={{padding:"8px 10px",borderRadius:8,background:"#FFF3CD",border:"1px solid #F08C00",fontSize:12,color:"#664D03"}}>⏸ Agent will pause here and wait for a human to approve before continuing.</div>)}
                      {a.type==='interview_coordinator'&&(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{padding:"8px 12px",borderRadius:8,background:"#e0f7fa",border:"1px solid #0891b2",fontSize:12,color:"#0e4f5c",lineHeight:1.5}}>
                            📅 Automatically emails the hiring manager and candidate to collect availability, finds the first mutual slot and sends confirmations to both.
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:4}}>Duration (minutes)</div>
                              <input type="number" value={a.duration_minutes||45} min={15} max={240} step={15}
                                onChange={e=>updateAction(i,'duration_minutes',parseInt(e.target.value)||45)}
                                style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:4}}>Send availability requests</div>
                              <select value={a.parallel_availability===false?"sequential":"parallel"}
                                onChange={e=>updateAction(i,'parallel_availability',e.target.value==="parallel")}
                                style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                                <option value="parallel">In parallel (faster)</option>
                                <option value="sequential">HM first, then candidate</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:4}}>HM availability message (optional)</div>
                            <textarea value={a.hm_message||''} onChange={e=>updateAction(i,'hm_message',e.target.value)}
                              placeholder="Leave blank to use the default message…" rows={2}
                              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical"}}/>
                          </div>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:4}}>Candidate message (optional)</div>
                            <textarea value={a.candidate_message||''} onChange={e=>updateAction(i,'candidate_message',e.target.value)}
                              placeholder="Leave blank to use the default message…" rows={2}
                              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical"}}/>
                          </div>
                        </div>
                      )}
                      {a.type==='ai_interview'&&(
                        <div>
                          {/* Persona row */}
                          <div style={{display:"flex",gap:8,marginBottom:8}}>
                            <input value={a.persona_name||''} onChange={e=>updateAction(i,'persona_name',e.target.value)} placeholder="Interviewer name (e.g. Alex)…" style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
                            <select value={a.voice||'en-US'} onChange={e=>updateAction(i,'voice',e.target.value)} style={{width:150,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,background:"white"}}>
                              {VOICES.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
                            </select>
                          </div>
                          <textarea value={a.persona_description||''} onChange={e=>updateAction(i,'persona_description',e.target.value)} placeholder="Interviewer style / description (optional)…" rows={2} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical",marginBottom:8}}/>
                          <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:6}}>Avatar colour</div>
                          <div style={{display:"flex",gap:6,marginBottom:12}}>
                            {AVATAR_COLORS_LIST.map(col=>(
                              <div key={col} onClick={()=>updateAction(i,'avatar_color',col)} style={{width:22,height:22,borderRadius:"50%",background:col,cursor:"pointer",border:`2.5px solid ${(a.avatar_color||'#6366f1')===col?"white":"transparent"}`,boxShadow:(a.avatar_color||'#6366f1')===col?`0 0 0 2px ${col}`:"none"}}/>
                            ))}
                          </div>

                          {/* Question source: two-mode toggle */}
                          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Question source</div>
                          <div style={{display:"flex",gap:6,marginBottom:10}}>
                            {[
                              {val:"job",   label:"From linked job", desc:"Pulled at runtime from the candidate's linked job"},
                              {val:"manual",label:"Select manually",  desc:"Pick questions now from the question bank"},
                            ].map(opt=>{
                              const active=(a.question_source||"job")===opt.val;
                              return(
                                <div key={opt.val} onClick={()=>updateAction(i,'question_source',opt.val)}
                                  style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${active?C.purple:C.border}`,background:active?`${C.purple}08`:"white",cursor:"pointer",transition:"all .12s"}}>
                                  <div style={{fontSize:12,fontWeight:700,color:active?C.purple:C.text1,marginBottom:2}}>{opt.label}</div>
                                  <div style={{fontSize:10,color:C.text3,lineHeight:1.4}}>{opt.desc}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Linked-job mode info box */}
                          {(a.question_source||"job")==="job"&&(
                            <div style={{padding:"9px 12px",borderRadius:8,background:`${C.purple}08`,border:`1px solid ${C.purple}25`,fontSize:11,color:C.text2,lineHeight:1.5}}>
                              Questions are pulled from the job the candidate is linked to when the agent runs.
                              If the linked job has no questions assigned, the agent will <strong>log a warning and skip</strong> the interview.
                              Assign questions to jobs via <strong>Settings → Question Bank</strong>.
                            </div>
                          )}

                          {/* Manual mode: question checklist */}
                          {a.question_source==="manual"&&(
                            <>
                              <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:6}}>{(a.question_ids||[]).length} question{(a.question_ids||[]).length!==1?"s":""} selected</div>
                              <div style={{maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8,padding:8}}>
                                {questions.length===0
                                  ?<div style={{color:C.text3,fontSize:12,padding:4}}>No questions yet — add them in Settings → Question Bank.</div>
                                  :questions.map(q=>{
                                    const sel=(a.question_ids||[]).includes(q.id);
                                    return(
                                      <div key={q.id} onClick={()=>{const ids=a.question_ids||[];updateAction(i,'question_ids',sel?ids.filter(x=>x!==q.id):[...ids,q.id]);}}
                                        style={{display:"flex",alignItems:"center",gap:8,padding:"5px 6px",borderRadius:6,cursor:"pointer",background:sel?`${C.purple}08`:"transparent",marginBottom:2}}>
                                        <div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${sel?C.purple:C.border}`,background:sel?C.purple:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                          {sel&&<Ic n="check" s={9} c="white"/>}
                                        </div>
                                        <span style={{flex:1,fontSize:11,color:C.text1}}>{q.text}</span>
                                        <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:`${Q_TYPE_COLORS[q.type]||C.text3}18`,color:Q_TYPE_COLORS[q.type]||C.text3,fontWeight:700}}>{q.type}</span>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text3,marginBottom:8}}>Add action</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {Object.entries(meta.action_types||{}).map(([key,def])=>{const ac=ACTION_COLORS[key]||C.text3;return(
                    <button key={key} onClick={()=>addAction(key)} style={{padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:7,textAlign:"left",fontFamily:F,transition:"all .1s"}}
                      onMouseEnter={e=>{e.currentTarget.style.border=`1.5px solid ${ac}`;e.currentTarget.style.background=`${ac}08`;}}
                      onMouseLeave={e=>{e.currentTarget.style.border=`1.5px solid ${C.border}`;e.currentTarget.style.background="white";}}>
                      <Ic n={ACTION_ICONS[key]||"zap"} s={13} c={ac}/><span style={{fontSize:11,fontWeight:600,color:C.text2}}>{def.label}</span>
                    </button>
                  );})}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab==='settings'&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:13,fontWeight:600,color:C.text1}}>Active</div><div style={{fontSize:11,color:C.text3}}>Enable or disable this agent</div></div>
                <div onClick={()=>set('is_active',form.is_active?0:1)} style={{width:40,height:24,borderRadius:12,background:form.is_active?C.green:"#D1D5DB",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:form.is_active?19:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
              </div>
              <div style={{paddingTop:4,borderBottom:`1px solid ${C.border}`,paddingBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1,marginBottom:3}}>Avatar</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:10}}>Choose an icon and colour for this agent</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {AGENT_AVATARS.map(av=>(
                    <div key={av.id} onClick={()=>set('avatar_icon',av.id)} title={av.label}
                      style={{
                        width:38,height:38,borderRadius:10,cursor:"pointer",
                        background:form.avatar_icon===av.id?`${form.avatar_color||C.accent}18`:C.bg,
                        border:`2px solid ${form.avatar_icon===av.id?form.avatar_color||C.accent:"transparent"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"
                      }}>
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="none"
                        stroke={form.avatar_icon===av.id?form.avatar_color||C.accent:C.text3}
                        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d={av.path}/>
                      </svg>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:5}}>
                  {AGENT_COLORS.map(col=>(
                    <div key={col} onClick={()=>set('avatar_color',col)}
                      style={{
                        width:24,height:24,borderRadius:"50%",background:col,cursor:"pointer",
                        border:`2.5px solid ${(form.avatar_color||C.accent)===col?C.text1:"transparent"}`,
                        transition:"border .12s"
                      }}/>
                  ))}
                </div>
              </div>
              <div style={{paddingTop:4}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1,marginBottom:3}}>Sharing</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:10}}>Choose who can see and use this agent</div>
                <SharePicker value={form.sharing} onChange={v=>set('sharing',v)} environmentId={environment?.id}/>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 20px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:F}}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!form.name} style={{padding:"9px 24px",borderRadius:10,border:"none",background:C.accent,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:8,opacity:saving||!form.name?.6:1}}>
            {saving&&<Ic n="loader" s={13} c="white"/>}{isEdit?'Save Changes':'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APPROVAL INBOX ────────────────────────────────────────────────────────────
function ApprovalInbox({ environmentId, onRefresh }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [processing, setProcessing] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.get(`/agents/approvals/pending?environment_id=${environmentId}`);
    setApprovals(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [environmentId]);

  useEffect(()=>{load();},[load]);

  const handle = async (runId, actionIndex, approved) => {
    setProcessing(p=>({...p,[`${runId}-${actionIndex}`]:true}));
    await api.post(`/agents/runs/${runId}/approve`,{action_index:actionIndex,approved,modifier_note:notes[`${runId}-${actionIndex}`]||''});
    load(); onRefresh();
    setProcessing(p=>({...p,[`${runId}-${actionIndex}`]:false}));
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:C.text3}}>Loading…</div>;
  if(approvals.length===0) return (
    <div style={{padding:60,textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ic n="check" s={24} c={C.green}/></div>
      <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4}}>All clear</div>
      <div style={{fontSize:13,color:C.text3}}>No pending approvals</div>
    </div>
  );

  return (
    <div>
      {approvals.map(run=>(
        <div key={run.id} style={{background:"white",borderRadius:12,border:`1.5px solid ${C.amber}40`,padding:"16px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${C.amber}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="eye" s={15} c={C.amber}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{run.agent_name}</div>
              <div style={{fontSize:11,color:C.text3}}>{relTime(run.created_at)} · Record: {run.record_id?.slice(0,8)||'N/A'}</div>
            </div>
          </div>
          {run.ai_output&&(
            <div style={{padding:"10px 12px",borderRadius:8,background:`${C.purple}08`,border:`1px solid ${C.purple}20`,fontSize:12,color:C.text2,marginBottom:12,lineHeight:1.6,whiteSpace:"pre-wrap",maxHeight:120,overflowY:"auto"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
                <AiBadge variant="dot"/>AI OUTPUT
              </div>{run.ai_output}
            </div>
          )}
          {(run.pending_actions||[]).filter(a=>a.approved===undefined).map((pa,idx)=>{
            const key=`${run.id}-${pa.action_index}`;
            return(
              <div key={idx} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8,textTransform:"capitalize"}}>Action: {(pa.action?.type||'').replace(/_/g,' ')}</div>
                <textarea value={notes[key]||''} onChange={e=>setNotes(n=>({...n,[key]:e.target.value}))} placeholder="Add a note before approving (optional)…" rows={2}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,resize:"vertical",marginBottom:8}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>handle(run.id,pa.action_index,false)} style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${C.red}`,background:"transparent",color:C.red,fontWeight:700,cursor:"pointer",fontFamily:F,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Ic n="thumbDown" s={13} c={C.red}/> Reject
                  </button>
                  <button onClick={()=>handle(run.id,pa.action_index,true)} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:C.green,color:"white",fontWeight:700,cursor:"pointer",fontFamily:F,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Ic n="thumbUp" s={13} c="white"/> Approve & Execute
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── AGENT DETAIL PANEL ────────────────────────────────────────────────────────
function AgentDetail({ agent, onEdit, onClose }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(()=>{
    if(!agent) return;
    api.get(`/agents/${agent.id}/runs`).then(d=>{setRuns(Array.isArray(d)?d:[]);setLoading(false);});
  },[agent?.id]);

  if(!agent) return null;
  const trigColor=TRIGGER_COLORS[agent.trigger_type]||C.accent;

  return (
    <div style={{background:"white",borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",height:"100%"}}>
      <div style={{height:3,background:trigColor}}/>
      <div style={{padding:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <AgentAvatar agent={agent} size={40}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:C.text1}}>{agent.name}</div>
            <div style={{fontSize:12,color:C.text3}}>{agent.description||'No description'}</div>
          </div>
          <button onClick={()=>{onEdit(agent);}} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:F}}>Edit</button>
          <button onClick={onClose} style={{padding:6,border:"none",background:"transparent",cursor:"pointer"}}><Ic n="x" s={16} c={C.text3}/></button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{label:"Runs",value:agent.run_count||0},{label:"Pending",value:agent.pending_approvals||0,color:agent.pending_approvals>0?C.amber:C.text3},{label:"Status",value:agent.is_active?"Active":"Inactive",color:agent.is_active?C.green:C.text3}].map(s=>(
            <div key={s.label} style={{flex:1,padding:"10px 12px",borderRadius:10,background:C.bg,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:s.color||C.text1}}>{s.value}</div>
              <div style={{fontSize:11,color:C.text3,fontWeight:500}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Run history</div>
        {loading?<div style={{color:C.text3,fontSize:13}}>Loading…</div>:runs.length===0?(
          <div style={{textAlign:"center",padding:"20px 0",color:C.text3,fontSize:13}}>No runs yet</div>
        ):(
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {runs.map(r=>(
              <div key={r.id} style={{marginBottom:6,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                <div onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",background:"white"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:statusColor(r.status),flexShrink:0}}/>
                  <span style={{flex:1,fontSize:12,color:C.text2,fontWeight:600,textTransform:"capitalize"}}>{r.status.replace(/_/g,' ')}</span>
                  {r.trigger && r.trigger !== 'manual' && (
                    <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${C.green}15`,color:C.green,fontWeight:700}}>{r.trigger.replace(/_/g,' ')}</span>
                  )}
                  <span style={{fontSize:11,color:C.text3}}>{relTime(r.created_at)}</span>
                  <Ic n={expanded===r.id?"chevD":"chevR"} s={12} c={C.text3}/>
                </div>
                {expanded===r.id&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"8px 10px",background:"#FAFAFA"}}>
                    {r.skip_reason&&<div style={{fontSize:11,color:C.amber,marginBottom:4}}>⚠ {r.skip_reason}</div>}
                    {r.error&&<div style={{fontSize:11,color:C.red,marginBottom:4}}>✗ {r.error}</div>}
                    {r.ai_output&&<div style={{fontSize:11,color:C.text2,marginBottom:6,padding:"6px 8px",background:`${C.purple}08`,borderRadius:6,lineHeight:1.5,maxHeight:80,overflowY:"auto",whiteSpace:"pre-wrap"}}><strong style={{color:C.purple,display:"inline-flex",alignItems:"center",gap:4}}><AiBadge variant="dot"/> AI: </strong>{r.ai_output}</div>}
                    {(r.steps||[]).map((s,si)=><div key={si} style={{fontSize:11,color:C.text3,display:"flex",gap:6,marginBottom:2}}><span>→</span><span>{s.step}</span></div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN AGENTS PAGE ──────────────────────────────────────────────────────────
export default function AgentsModule({ environment }) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [agents, setAgents] = useState([]);
  const [dash, setDash] = useState(null);
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState([]);
  const [view, setView] = useState('agents');
  const [pendingCount, setPendingCount] = useState(0);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [search, setSearch] = useState('');
  const [expandRun, setExpandRun] = useState(null);

  const load = useCallback(async () => {
    if(!environment?.id) return;
    setLoading(true);
    const [agentsData, objectsData, dashData, feedData] = await Promise.all([
      api.get(`/agents?environment_id=${environment.id}`),
      api.get(`/objects?environment_id=${environment.id}`),
      api.get(`/agents/dashboard?environment_id=${environment.id}`),
      api.get(`/agents/activity-feed?environment_id=${environment.id}&limit=20`),
    ]);
    const aList = Array.isArray(agentsData) ? agentsData : [];
    setAgents(aList);
    setObjects(Array.isArray(objectsData) ? objectsData : []);
    setDash(dashData && !dashData.error ? dashData : null);
    setFeed(feedData && !feedData.error ? feedData : null);
    setPendingCount(aList.reduce((s,a) => s+(a.pending_approvals||0), 0));
    setLoading(false);
  }, [environment?.id]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{ const t=setInterval(load,30000); return ()=>clearInterval(t); },[load]);

  const handleUseTemplate = (tpl) => {
    setShowLibrary(false);
    // Build a skeleton agent from the template and open the builder pre-populated
    setEditAgent({
      name: tpl.name,
      description: tpl.description,
      trigger_type: tpl.recommended_trigger || 'manual',
      trigger_config: {},
      conditions: [],
      actions: tpl.actions.map(a => ({ ...a })),
      is_active: 1,
      schedule_time: '09:00',
    });
    setShowBuilder(true);
  };

  const handleDelete = async (id) => {
    if (!(await window.__confirm({ title:'Delete this agent?', danger:true }))) return;
    await api.del(`/agents/${id}`);
    load();
  };
  const handleRun = async (id) => {
    await api.post(`/agents/${id}/run`,{environment_id:environment?.id});
    setTimeout(load, 1500);
  };
  const handleEdit = (agent) => { setEditAgent(agent); setShowBuilder(true); };

  const filtered = agents.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.description||'').toLowerCase().includes(search.toLowerCase()));

  // ── Sparkline bar helper
  const Spark = ({ data }) => {
    const max = Math.max(...data.map(d=>d.runs), 1);
    return (
      <div style={{display:"flex",alignItems:"flex-end",gap:2,height:28}}>
        {data.map((d,i)=>(
          <div key={i} title={`${d.date}: ${d.runs} runs`} style={{flex:1,borderRadius:2,background:d.runs>0?C.accent:`${C.accent}20`,height:`${Math.max(3,(d.runs/max)*28)}px`,transition:"height .2s"}}/>
        ))}
      </div>
    );
  };

  return (
    <div style={{fontFamily:F,minHeight:"100vh",padding:"0 0 40px"}}>

      {/* ── Page header ── */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"24px 0 18px"}}>
        <div style={{width:44,height:44,borderRadius:14,background:`${C.purple}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n="zap" s={22} c={C.purple}/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Agents</h1>
          <p style={{margin:0,fontSize:13,color:C.text3}}>Automate tasks, trigger actions, and coordinate AI workflows</p>
        </div>
        <div style={{flex:1}}/>
        <button onClick={load} style={{padding:"8px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer"}}><Ic n="refresh" s={15} c={C.text3}/></button>
        <button onClick={()=>setShowLibrary(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:10,border:`1.5px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:F}}>
          Browse Library
        </button>
        <button onClick={()=>{setEditAgent(null);setShowBuilder(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,border:"none",background:C.accent,color:"white",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:F}}>
          <Ic n="plus" s={15} c="white"/> New Agent
        </button>
      </div>

      {/* ── View tabs ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{display:"flex",background:"white",borderRadius:10,border:`1.5px solid ${C.border}`,padding:3}}>
          {[{id:'agents',label:'All Agents'},{id:'approvals',label:`Approvals${pendingCount>0?` (${pendingCount})`:''}`}].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:view===v.id?700:500,background:view===v.id?C.accent:"transparent",color:view===v.id?"white":C.text3}}>
              {v.label}
            </button>
          ))}
        </div>
        {view==='agents'&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agents…" style={{flex:1,maxWidth:300,padding:"8px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F}}/>}
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {false && view==='__removed_dashboard__' && (
        <div>
          {dash && (
            <div style={{marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:10}}>
                {[
                  {label:"Total",value:dash.agents.total,sub:"agents",icon:"zap",color:C.accent},
                  {label:"Active",value:dash.agents.active,sub:"running",icon:"play",color:C.green},
                  {label:"Ran today",value:dash.runs.today,sub:"executions",icon:"clock",color:C.purple},
                  {label:"This week",value:dash.runs.this_week,sub:"total runs",icon:"calendar",color:"#0891b2"},
                  {label:"Need review",value:dash.runs.pending_approval,sub:"approvals",icon:"eye",color:dash.runs.pending_approval>0?C.amber:C.text3},
                  {label:"Failed",value:dash.runs.failed,sub:"runs",icon:"alert",color:dash.runs.failed>0?C.red:C.text3},
                ].map(s=>(
                  <div key={s.label} style={{background:"white",borderRadius:12,padding:"12px 14px",border:`1.5px solid ${s.value>0&&(s.label==="Need review"||s.label==="Failed")?s.color+"50":C.border}`,display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".05em"}}>{s.label}</span>
                      <div style={{width:24,height:24,borderRadius:7,background:`${s.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={s.icon} s={11} c={s.color}/></div>
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color:s.value>0&&(s.label==="Need review"||s.label==="Failed")?s.color:C.text1,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:11,color:C.text3}}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 200px 1fr",gap:10,marginBottom:10}}>
                <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:`1.5px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text1}}>Runs — last 7 days</span>
                    <span style={{fontSize:11,color:C.text3}}>{dash.runs.this_week} total</span>
                  </div>
                  {dash.daily && <Spark data={dash.daily}/>}
                </div>
                <div style={{background:`${C.purple}08`,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.purple}25`,display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.purple,display:"flex",alignItems:"center",gap:6}}><Ic n="users" s={13} c={C.purple}/> AI Interviews</div>
                  {[{label:"Generated",value:dash.interviews.total,color:C.purple},{label:"Completed",value:dash.interviews.completed,color:C.green},{label:"Pending",value:dash.interviews.pending,color:C.amber}].map(r=>(
                    <div key={r.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:C.text2}}>{r.label}</span>
                      <span style={{fontSize:15,fontWeight:800,color:r.value>0?r.color:C.text3}}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:`1.5px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>Recent runs</div>
                  {(!dash.recent_runs||dash.recent_runs.length===0)?<div style={{color:C.text3,fontSize:12}}>No runs yet</div>:
                    <div style={{maxHeight:120,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                      {dash.recent_runs.slice(0,8).map(r=>(
                        <div key={r.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 6px",borderRadius:6}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:statusColor(r.status),flexShrink:0}}/>
                          <span style={{flex:1,fontSize:11,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.agent_name}</span>
                          <span style={{fontSize:10,color:C.text3,flexShrink:0}}>{relTime(r.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </div>
              {dash.agent_summary && dash.agent_summary.length > 0 && (
                <div style={{background:"white",borderRadius:12,border:`1.5px solid ${C.border}`,overflow:"hidden",marginBottom:10}}>
                  <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,fontSize:12,fontWeight:700,color:C.text1}}>Agent performance</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:C.bg}}>{["Agent","Trigger","Status","Runs","Today","Failed","Pending","Last run"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:600,color:C.text3,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                    <tbody>{dash.agent_summary.map(a=>(
                      <tr key={a.id} style={{borderTop:`1px solid ${C.border}`}}>
                        <td style={{padding:"7px 12px",fontWeight:600,color:C.text1}}>{a.name}</td>
                        <td style={{padding:"7px 12px",color:C.text3,textTransform:"capitalize"}}>{(a.trigger_type||'').replace(/_/g,' ')}</td>
                        <td style={{padding:"7px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:a.is_active?`${C.green}15`:"#F3F4F6",color:a.is_active?C.green:C.text3,fontWeight:700}}>{a.is_active?"Active":"Inactive"}</span></td>
                        <td style={{padding:"7px 12px",color:C.text2,fontWeight:600}}>{a.total_runs}</td>
                        <td style={{padding:"7px 12px",color:a.runs_today>0?C.purple:C.text3,fontWeight:a.runs_today>0?700:400}}>{a.runs_today}</td>
                        <td style={{padding:"7px 12px",color:a.failed>0?C.red:C.text3,fontWeight:a.failed>0?700:400}}>{a.failed}</td>
                        <td style={{padding:"7px 12px",color:a.pending_approval>0?C.amber:C.text3,fontWeight:a.pending_approval>0?700:400}}>{a.pending_approval}</td>
                        <td style={{padding:"7px 12px",color:C.text3}}>{relTime(a.last_run)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16}}>
            <div style={{background:"white",borderRadius:16,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
              <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Activity Feed</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:1}}>Every agent run, in real time</div>
                </div>
                <button onClick={load} style={{padding:"5px",border:"none",background:"transparent",cursor:"pointer"}}><Ic n="refresh" s={14} c={C.text3}/></button>
              </div>
              {loading ? (
                <div style={{padding:"48px 0",textAlign:"center",color:C.text3,fontSize:12}}>Loading…</div>
              ) : !feed || feed.items.length === 0 ? (
                <div style={{padding:"48px 24px",textAlign:"center"}}>
                  <div style={{width:48,height:48,borderRadius:14,background:`${C.purple}10`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ic n="zap" s={22} c={C.purple}/></div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:6}}>No agent runs yet</div>
                  <div style={{fontSize:11,color:C.text3,lineHeight:1.5,marginBottom:16}}>Activate an agent or run one manually to see activity here</div>
                  <button onClick={()=>{setEditAgent(null);setShowBuilder(true);}} style={{padding:"8px 18px",borderRadius:9,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Create Agent</button>
                </div>
              ) : (
                <div style={{maxHeight:520,overflowY:"auto"}}>
                  {feed.items.map(item=><AgentFeedRow key={item.id} item={item}/>)}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {label:"New Agent",icon:"plus",color:C.accent,fn:()=>{setEditAgent(null);setShowBuilder(true);}},
                  {label:"Browse Library",icon:"zap",color:"#0891b2",fn:()=>setShowLibrary(true)},
                  {label:"Approvals",icon:"eye",color:pendingCount>0?C.amber:C.text3,fn:()=>setView('approvals'),badge:pendingCount>0?pendingCount:null},
                  {label:"All Agents",icon:"layers",color:C.purple,fn:()=>setView('agents')},
                ].map(a=>(
                  <button key={a.label} onClick={a.fn} style={{position:"relative",display:"flex",alignItems:"center",gap:8,padding:"11px 14px",borderRadius:12,border:`1.5px solid ${a.color}25`,background:`${a.color}08`,cursor:"pointer",fontFamily:F,textAlign:"left",transition:"all .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${a.color}15`}
                    onMouseLeave={e=>e.currentTarget.style.background=`${a.color}08`}>
                    <div style={{width:30,height:30,borderRadius:9,background:`${a.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n={a.icon} s={14} c={a.color}/></div>
                    <span style={{fontSize:12,fontWeight:700,color:a.color}}>{a.label}</span>
                    {a.badge&&<span style={{position:"absolute",top:8,right:8,minWidth:18,height:18,borderRadius:9,background:C.amber,color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{a.badge}</span>}
                  </button>
                ))}
              </div>
              <div style={{background:"white",borderRadius:16,border:`1.5px solid ${C.border}`,overflow:"hidden",flex:1}}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.text1}}>
                  Your Agents <span style={{fontWeight:500,color:C.text3,fontSize:11,marginLeft:6}}>{agents.length} total</span>
                </div>
                {agents.length===0 ? (
                  <div style={{padding:"32px 0",textAlign:"center",color:C.text3,fontSize:12}}>No agents yet</div>
                ) : (
                  <div style={{maxHeight:380,overflowY:"auto"}}>
                    {agents.map(a=>(
                      <div key={a.id} onClick={()=>{setView('agents');setSelectedAgent(a);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:a.is_active?C.green:"#D1D5DB",flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                          <div style={{fontSize:10,color:C.text3,textTransform:"capitalize"}}>{(a.trigger_type||'').replace(/_/g,' ')}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          {a.pending_approvals>0&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${C.amber}18`,color:C.amber,fontWeight:700}}>{a.pending_approvals}</span>}
                          <span style={{fontSize:10,color:C.text3}}>{relTime(a.last_run_at)}</span>
                          <button onClick={e=>{e.stopPropagation();handleRun(a.id);}} style={{padding:"3px 9px",borderRadius:6,border:"none",background:C.accent,color:"white",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:F}}>Run</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVALS VIEW ── */}
      {view==='approvals' && <ApprovalInbox environmentId={environment?.id} onRefresh={load}/>}

      {/* ── AGENTS VIEW ── */}
      {view==='agents' && (
        <div style={{display:"grid",gridTemplateColumns:selectedAgent?"1fr 380px":"1fr",gap:16}}>
          <div>
            {loading ? (
              <div style={{padding:60,textAlign:"center",color:C.text3}}>Loading…</div>
            ) : filtered.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <div style={{width:60,height:60,borderRadius:"50%",background:`${C.purple}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ic n="zap" s={26} c={C.purple}/></div>
                <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:6}}>{search?'No agents match':'No agents yet'}</div>
                <div style={{fontSize:13,color:C.text3,marginBottom:20}}>{search?'Try a different search.':'Create your first agent to automate tasks with AI.'}</div>
                {!search&&<button onClick={()=>{setEditAgent(null);setShowBuilder(true);}} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.accent,color:"white",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:F}}>Create Agent</button>}
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:selectedAgent?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:10}}>
                {filtered.map(a=>(
                  <AgentCard key={a.id} agent={a} onEdit={handleEdit} onDelete={handleDelete} onRun={handleRun} environment={environment} onSelect={setSelectedAgent} selected={selectedAgent?.id===a.id}/>
                ))}
              </div>
            )}
          </div>
          {selectedAgent&&<AgentDetail agent={selectedAgent} onEdit={handleEdit} onClose={()=>setSelectedAgent(null)}/>}
        </div>
      )}

      {showBuilder&&(
        <AgentBuilderModal agent={editAgent} environment={environment} objects={objects}
          onClose={()=>{setShowBuilder(false);setEditAgent(null);}}
          onSave={()=>{setShowBuilder(false);setEditAgent(null);load();}}/>
      )}

      {showLibrary&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:1500,display:"flex",alignItems:"stretch",justifyContent:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowLibrary(false);}}>
          <div style={{width:"min(900px,95vw)",background:"#f4f5f8",display:"flex",flexDirection:"column",padding:"32px 32px 24px",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.15)"}}>
            <AgentLibrary onUseTemplate={handleUseTemplate} onClose={()=>setShowLibrary(false)}/>
          </div>
        </div>
      )}
    </div>
  );
}
