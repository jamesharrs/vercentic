import { useState, useEffect } from "react";
import api from "./apiClient.js";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:"#111827", text2:"#374151", text3:"#9ca3af",
  accent:"#4361EE", accentLight:"#eef1ff",
};

const ACTION_COLORS = {
  ai_analyse:"#7048E8", ai_draft_email:"#7048E8", ai_summarise:"#7048E8", ai_score:"#7048E8",
  send_email:"#4361EE", update_field:"#F08C00", add_note:"#0CA678", add_to_pool:"#0CA678",
  create_task:"#F08C00", notify_user:"#E03131", webhook:"#374151", human_review:"#E67700",
  ai_interview:"#7048E8", interview_coordinator:"#0891b2",
};
const ACTION_LABELS = {
  ai_analyse:"AI Analyse", ai_draft_email:"AI Draft Email", ai_summarise:"AI Summarise",
  ai_score:"AI Score", send_email:"Send Email", update_field:"Update Field",
  add_note:"Add Note", add_to_pool:"Add to Pool", create_task:"Create Task",
  notify_user:"Notify User", webhook:"Webhook", human_review:"Request Approval",
  ai_interview:"AI Interview", interview_coordinator:"Interview Coordinator",
};

const CATEGORY_ORDER = ["screening","outreach","interview","nurture","operations"];
const CATEGORY_META = {
  screening:  { label:"Screening & Assessment",   color:"#7c3aed", icon:"filter",   desc:"Automatically evaluate and triage incoming candidates" },
  outreach:   { label:"Outreach & Engagement",    color:"#0891b2", icon:"mail",     desc:"Personalised communications at every stage" },
  interview:  { label:"Interview Management",     color:"#0ca678", icon:"calendar", desc:"Coordinate, prep and follow up on interviews" },
  nurture:    { label:"Talent Pooling & Nurture", color:"#e67700", icon:"users",    desc:"Keep your pipeline warm and activated" },
  operations: { label:"Internal & Operations",    color:"#e03131", icon:"settings", desc:"Streamline internal handoffs and admin" },
};

const TRIGGER_LABELS = {
  record_created:"On new record", stage_changed:"On stage change",
  schedule_weekly:"Weekly schedule", manual:"Manual / on demand",
};

function Ic({ n, s=16, c="currentColor" }) {
  const P = {
    filter:    "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
    mail:      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    calendar:  "M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    users:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    settings:  "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    sparkles:  "M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z",
    check:     "M20 6L9 17l-5-5",
    x:         "M18 6L6 18M6 6l12 12",
    search:    "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    arrowRight:"M5 12h14M12 5l7 7-7 7",
    clock:     "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2",
    zap:       "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    cpu:       "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
    briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[n] || P.zap}/>
    </svg>
  );
}

function ActionPill({ type }) {
  const color = ACTION_COLORS[type] || "#6b7280";
  const label = ACTION_LABELS[type] || type;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
      background:`${color}15`, color, border:`1px solid ${color}25`,
      whiteSpace:"nowrap", fontFamily:F }}>
      {label}
    </span>
  );
}

function TemplateCard({ tpl, onUse, onPreview }) {
  const [hov, setHov] = useState(false);
  const cat = CATEGORY_META[tpl.category] || {};
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"white", borderRadius:14,
        border:`1.5px solid ${hov ? cat.color||C.accent : C.border}`,
        padding:"18px 20px", cursor:"pointer", transition:"all .15s",
        boxShadow: hov ? `0 4px 18px ${cat.color||C.accent}18` : "0 1px 4px rgba(0,0,0,.04)",
        display:"flex", flexDirection:"column", gap:12 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:11,
          background:`${cat.color||C.accent}15`, display:"flex",
          alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ic n={cat.icon || "zap"} s={20} c={cat.color||C.accent}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text1, marginBottom:3 }}>{tpl.name}</div>
          <div style={{ fontSize:11, color:C.text3, lineHeight:1.45 }}>{tpl.description}</div>
        </div>
      </div>

      {/* Use case */}
      <div style={{ background:`${cat.color||C.accent}08`, borderRadius:8, padding:"7px 10px",
        fontSize:11, color:cat.color||C.accent, fontWeight:600, lineHeight:1.4,
        borderLeft:`2px solid ${cat.color||C.accent}` }}>
        {tpl.use_case}
      </div>

      {/* Action pills */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
        {tpl.actions.map((a,i) => <ActionPill key={i} type={a.type}/>)}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.text3 }}>
          <Ic n="clock" s={12} c={C.text3}/>
          {TRIGGER_LABELS[tpl.recommended_trigger] || tpl.recommended_trigger}
          {tpl.recommended_stage && (
            <span style={{ background:"#f3f4f6", borderRadius:99, padding:"1px 6px", fontWeight:600 }}>
              {tpl.recommended_stage}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={e=>{e.stopPropagation();onPreview(tpl);}}
            style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${C.border}`,
              background:"transparent", color:C.text2, fontSize:11, fontWeight:600,
              cursor:"pointer", fontFamily:F }}>Preview</button>
          <button onClick={e=>{e.stopPropagation();onUse(tpl);}}
            style={{ padding:"5px 12px", borderRadius:7, border:"none",
              background:cat.color||C.accent, color:"white", fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:5 }}>
            Use <Ic n="arrowRight" s={11} c="white"/>
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ tpl, onClose, onUse }) {
  if (!tpl) return null;
  const cat = CATEGORY_META[tpl.category] || {};
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:3000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:"white", borderRadius:18, maxWidth:560, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,.18)", overflow:"hidden",
        maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`,
          background:`${cat.color||C.accent}06` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:`${cat.color||C.accent}18`, display:"flex",
              alignItems:"center", justifyContent:"center" }}>
              <Ic n={cat.icon||"zap"} s={22} c={cat.color||C.accent}/>
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>{tpl.name}</div>
              <div style={{ fontSize:12, color:cat.color||C.accent, fontWeight:600, marginTop:2 }}>
                {CATEGORY_META[tpl.category]?.label}
              </div>
            </div>
            <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none",
              cursor:"pointer", color:C.text3, display:"flex" }}>
              <Ic n="x" s={18}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px", overflowY:"auto", flex:1 }}>
          <p style={{ margin:"0 0 16px", fontSize:13, color:C.text2, lineHeight:1.6 }}>
            {tpl.description}
          </p>

          {/* Use case */}
          <div style={{ background:`${cat.color||C.accent}08`, borderRadius:10, padding:"10px 14px",
            marginBottom:20, borderLeft:`3px solid ${cat.color||C.accent}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:cat.color||C.accent, marginBottom:3,
              textTransform:"uppercase", letterSpacing:".06em" }}>Use case</div>
            <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{tpl.use_case}</div>
          </div>

          {/* Trigger */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
              letterSpacing:".06em", marginBottom:8 }}>Trigger</div>
            <div style={{ display:"flex", alignItems:"center", gap:8,
              background:"#f9fafb", borderRadius:8, padding:"8px 12px" }}>
              <Ic n="clock" s={14} c={C.text3}/>
              <span style={{ fontSize:13, color:C.text2, fontWeight:600 }}>
                {TRIGGER_LABELS[tpl.recommended_trigger]}
                {tpl.recommended_stage && ` — ${tpl.recommended_stage} stage`}
              </span>
            </div>
          </div>

          {/* Action sequence */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
              letterSpacing:".06em", marginBottom:10 }}>
              Action sequence ({tpl.actions.length} steps)
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              {tpl.actions.map((a, i) => {
                const color = ACTION_COLORS[a.type] || "#6b7280";
                const label = ACTION_LABELS[a.type] || a.type;
                const desc = a.prompt || a.email_purpose || a.note_template || a.subject || a.message || a.task_title || "";
                return (
                  <div key={i} style={{ display:"flex", gap:12, position:"relative" }}>
                    {i < tpl.actions.length-1 && (
                      <div style={{ position:"absolute", left:15, top:32, width:2,
                        height:"calc(100% - 8px)", background:`${color}30`, zIndex:0 }}/>
                    )}
                    <div style={{ width:30, height:30, borderRadius:"50%",
                      background:`${color}15`, border:`2px solid ${color}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, zIndex:1, marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:800, color }}>{i+1}</span>
                    </div>
                    <div style={{ flex:1, paddingBottom:12 }}>
                      <div style={{ fontSize:13, fontWeight:700, color, marginBottom:2 }}>{label}</div>
                      {desc && <div style={{ fontSize:11, color:C.text3, lineHeight:1.4,
                        overflow:"hidden", textOverflow:"ellipsis",
                        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                        {desc}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${C.border}`,
              background:"white", color:C.text2, fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:F }}>Close</button>
          <button onClick={()=>{onClose();onUse(tpl);}}
            style={{ flex:2, padding:"10px", borderRadius:9, border:"none",
              background:cat.color||C.accent, color:"white", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center",
              justifyContent:"center", gap:7 }}>
            Use this template <Ic n="arrowRight" s={14} c="white"/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentLibrary({ onUseTemplate, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [preview,   setPreview]   = useState(null);

  useEffect(() => {
    api.get("/api/agents/templates")
      .then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = templates.filter(t => {
    const matchCat = activeCat === "all" || t.category === activeCat;
    const q = search.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) || t.use_case.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const grouped = {};
  CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
  filtered.forEach(t => { if (grouped[t.category]) grouped[t.category].push(t); });
  const cats = CATEGORY_ORDER.filter(k => grouped[k].length > 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:F }}>

      {/* Page header */}
      <div style={{ padding:"0 0 20px", display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", gap:16 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800, color:C.text1 }}>
            Agent Library
          </h2>
          <p style={{ margin:0, fontSize:13, color:C.text3 }}>
            Pre-built agents for every stage of recruitment — use as-is or customise.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background:"none", border:"none",
            cursor:"pointer", color:C.text3, padding:4, display:"flex" }}>
            <Ic n="x" s={20}/>
          </button>
        )}
      </div>

      {/* Search + category filter */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            color:C.text3, display:"flex" }}>
            <Ic n="search" s={14}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{ width:"100%", padding:"9px 12px 9px 34px", borderRadius:10,
              border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F,
              background:"white", outline:"none", boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={() => setActiveCat("all")}
            style={{ padding:"7px 13px", borderRadius:99, fontSize:12, fontWeight:600,
              border:`1.5px solid ${activeCat==="all" ? C.accent : C.border}`,
              background:activeCat==="all" ? C.accentLight : "white",
              color:activeCat==="all" ? C.accent : C.text2,
              cursor:"pointer", fontFamily:F }}>
            All ({templates.length})
          </button>
          {CATEGORY_ORDER.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = templates.filter(t => t.category === cat).length;
            return (
              <button key={cat} onClick={() => setActiveCat(cat)}
                style={{ padding:"7px 13px", borderRadius:99, fontSize:12, fontWeight:600,
                  border:`1.5px solid ${activeCat===cat ? meta.color : C.border}`,
                  background:activeCat===cat ? `${meta.color}15` : "white",
                  color:activeCat===cat ? meta.color : C.text2,
                  cursor:"pointer", fontFamily:F }}>
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:C.text3, fontSize:13 }}>
            Loading templates…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`${C.accent}12`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 12px" }}>
              <Ic n="search" s={22} c={C.accent}/>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text2, marginBottom:4 }}>
              No templates found
            </div>
            <div style={{ fontSize:12, color:C.text3 }}>Try a different search or category</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          activeCat === "all" ? (
            /* Grouped by category */
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {cats.map(cat => {
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <div style={{ width:28, height:28, borderRadius:8,
                        background:`${meta.color}15`, display:"flex",
                        alignItems:"center", justifyContent:"center" }}>
                        <Ic n={meta.icon} s={14} c={meta.color}/>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text1 }}>{meta.label}</div>
                        <div style={{ fontSize:11, color:C.text3 }}>{meta.desc}</div>
                      </div>
                    </div>
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
                      {grouped[cat].map(tpl => (
                        <TemplateCard key={tpl.id} tpl={tpl}
                          onUse={onUseTemplate} onPreview={setPreview}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat filtered grid */
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
              {filtered.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl}
                  onUse={onUseTemplate} onPreview={setPreview}/>
              ))}
            </div>
          )
        )}
      </div>

      <PreviewModal tpl={preview} onClose={()=>setPreview(null)} onUse={onUseTemplate}/>
    </div>
  );
}
