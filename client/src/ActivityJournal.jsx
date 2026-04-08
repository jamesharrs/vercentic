import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const C = {
  bg: "var(--t-bg, #F4F3FF)", card: "var(--t-card, #fff)",
  border: "var(--t-border, #ece9f8)", accent: "var(--t-accent, #8B7EC8)",
  text1: "var(--t-text1, #1a1a2e)", text2: "var(--t-text2, #4a4a6a)",
  text3: "var(--t-text3, #9090a0)",
};
const F = `"Space Grotesk","DM Sans",-apple-system,sans-serif`;

const ICONS = {
  plus:            "M12 5v14M5 12h14",
  edit:            "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  mail:            "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  "message-square":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  phone:           "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  calendar:        "M3 9h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zM8 2v4M16 2v4",
  "file-check":    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
  "file-text":     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8",
  "arrow-right":   "M5 12h14M12 5l7 7-7 7",
  activity:        "M22 12h-4l-3 9L9 3l-3 9H2",
  search:          "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM21 21l-4.35-4.35",
  "x":             "M18 6L6 18M6 6l12 12",
  refresh:         "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  users:           "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  briefcase:       "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  layers:          "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "bar-chart-2":   "M18 20V10M12 20V4M6 20v-6",
};

function Ic({ n, s = 14, c = C.accent }) {
  const d = ICONS[n] || ICONS.activity;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = ms / 1000;
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
}

function calDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

const stripEmoji = s => (s||"").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}🧪]/gu,"").trim();

const OBJ_ICON = { people:"users", jobs:"briefcase", "talent-pools":"layers" };

const SOURCE_TYPES = [
  { id:"all",       label:"All events",      icon:"activity" },
  { id:"activity",  label:"Record changes",  icon:"edit" },
  { id:"interview", label:"Interviews",      icon:"calendar" },
  { id:"offer",     label:"Offers",          icon:"file-check" },
  { id:"stage",     label:"Stage moves",     icon:"arrow-right" },
];

// ── Dense single row ─────────────────────────────────────────────────────────
function FeedRow({ item, onOpenRecord, isLast }) {
  const [hov, setHov] = useState(false);
  const label  = stripEmoji(item.label || "");
  const detail = item.detail ? (item.type === "field_changed" ? `→ ${item.detail}` : item.detail) : "";
  const iconBg = `${item.color || C.accent}14`;
  const objIconName = OBJ_ICON[item.object_slug] || "activity";

  return (
    <div
      onClick={() => item.record_id && item.object_id && onOpenRecord?.(item.record_id, item.object_id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:11,
        padding:"9px 16px",
        background: hov && item.record_id ? "#f9f8ff" : "transparent",
        borderBottom: isLast ? "none" : `0.5px solid ${C.border}`,
        cursor: item.record_id ? "pointer" : "default",
        transition:"background 0.1s", fontFamily:F }}>

      {/* Action icon */}
      <div style={{ width:28, height:28, borderRadius:8, background:iconBg, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Ic n={item.icon || "activity"} s={12} c={item.color || C.accent} />
      </div>

      {/* Main content — name + badge + label on one line */}
      <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:12.5, fontWeight:700, color:C.text1, whiteSpace:"nowrap",
          overflow:"hidden", textOverflow:"ellipsis", maxWidth:160 }}>
          {item.record_name && item.record_name !== "Unknown record" ? item.record_name : "Deleted"}
        </span>

        {item.object_name && (
          <span style={{ display:"inline-flex", alignItems:"center", gap:2,
            fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99,
            background:`${item.object_color||C.accent}14`,
            color:item.object_color||C.accent, flexShrink:0, whiteSpace:"nowrap" }}>
            <Ic n={objIconName} s={7} c={item.object_color||C.accent}/>
            {item.object_name}
          </span>
        )}

        {/* Separator dot + action */}
        <span style={{ fontSize:11, color:C.text2, fontWeight:500, flexShrink:0 }}>
          {label || item.label}
        </span>

        {/* Detail inline */}
        {detail && (
          <span style={{ fontSize:10.5, color:C.text3, fontStyle:"italic",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>
            {detail}
          </span>
        )}
      </div>

      {/* Actor + time — right-aligned */}
      <div style={{ flexShrink:0, textAlign:"right", minWidth:80 }}>
        {item.actor && item.actor !== "null" && (
          <div style={{ fontSize:10, color:C.text3, whiteSpace:"nowrap" }}>{item.actor}</div>
        )}
        <div style={{ fontSize:10, color:C.text3, whiteSpace:"nowrap" }}>{relTime(item.created_at)}</div>
      </div>
    </div>
  );
}

// ── Sidebar filter button ────────────────────────────────────────────────────
function SideBtn({ active, label, icon, count, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:8, width:"100%",
      padding:"7px 10px", borderRadius:8, border:"none",
      background: active ? `${color||C.accent}12` : "transparent",
      color: active ? (color||C.accent) : C.text2,
      cursor:"pointer", fontFamily:F, fontSize:12, fontWeight: active?700:500,
      textAlign:"left", transition:"all 0.1s" }}
      onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="#f5f3ff"; }}
      onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
      <Ic n={icon} s={13} c={active?(color||C.accent):C.text3}/>
      <span style={{ flex:1 }}>{label}</span>
      {count != null && (
        <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:99,
          background: active ? `${color||C.accent}20` : `${C.border}`,
          color: active ? (color||C.accent) : C.text3 }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main Journal ─────────────────────────────────────────────────────────────
export default function ActivityJournal({ environment, onOpenRecord }) {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [objectFilter, setObjectFilter] = useState("all");
  const [objects,      setObjects]      = useState([]);
  const [page,         setPage]         = useState(1);
  const LIMIT = 40;

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(
      `/records/activity/feed?environment_id=${environment.id}&limit=200`
    );
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`)
      .then(d => setObjects(Array.isArray(d) ? d : []));
    load();
  }, [environment?.id]);

  // Derived counts for sidebar
  const countBySource = {};
  SOURCE_TYPES.forEach(t => {
    countBySource[t.id] = t.id === "all" ? items.length
      : items.filter(a => a.source === t.id).length;
  });
  const countByObject = {};
  objects.forEach(o => {
    countByObject[o.id] = items.filter(a => a.object_id === o.id).length;
  });

  // Filtering
  const filtered = items.filter(a => {
    if (typeFilter !== "all" && a.source !== typeFilter) return false;
    if (objectFilter !== "all" && a.object_id !== objectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (a.record_name||"").toLowerCase().includes(q)
        || (a.label||"").toLowerCase().includes(q)
        || (a.detail||"").toLowerCase().includes(q)
        || (a.actor||"").toLowerCase().includes(q);
    }
    return true;
  });

  const shown = filtered.slice(0, page * LIMIT);

  return (
    <div style={{ display:"flex", height:"100%", minHeight:0, fontFamily:F, overflow:"hidden" }}>

      {/* ── Left sidebar ── */}
      <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${C.border}`,
        background:C.card, display:"flex", flexDirection:"column",
        padding:"20px 10px", gap:0, overflowY:"auto" }}>

        {/* Title */}
        <div style={{ padding:"0 6px 16px" }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.text1, letterSpacing:"-0.02em" }}>
            Activity
          </div>
          <div style={{ fontSize:10.5, color:C.text3, marginTop:3 }}>
            Full platform history
          </div>
        </div>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:14, padding:"0 2px" }}>
          <div style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)" }}>
            <Ic n="search" s={12} c={C.text3}/>
          </div>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search…"
            style={{ width:"100%", paddingLeft:27, paddingRight:search?26:8, height:30,
              border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:11.5,
              outline:"none", background:"#f8f7ff", color:C.text1, fontFamily:F,
              boxSizing:"border-box" }}/>
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", padding:0, lineHeight:1 }}>
              <Ic n="x" s={11} c={C.text3}/>
            </button>
          )}
        </div>

        {/* Event type filter */}
        <div style={{ fontSize:9.5, fontWeight:700, color:C.text3, letterSpacing:"0.06em",
          textTransform:"uppercase", padding:"0 10px", marginBottom:4 }}>Event type</div>
        {SOURCE_TYPES.map(f => (
          <SideBtn key={f.id} active={typeFilter===f.id} label={f.label}
            icon={f.icon} count={countBySource[f.id]}
            onClick={() => { setTypeFilter(f.id); setPage(1); }}/>
        ))}

        {/* Object filter */}
        {objects.length > 0 && (
          <>
            <div style={{ fontSize:9.5, fontWeight:700, color:C.text3, letterSpacing:"0.06em",
              textTransform:"uppercase", padding:"14px 10px 4px" }}>Object</div>
            <SideBtn active={objectFilter==="all"} label="All objects" icon="activity"
              count={items.length} onClick={() => { setObjectFilter("all"); setPage(1); }}/>
            {objects.filter(o => countByObject[o.id] > 0).map(o => (
              <SideBtn key={o.id} active={objectFilter===o.id}
                label={o.plural_name||o.name} icon={OBJ_ICON[o.slug]||"activity"}
                count={countByObject[o.id]} color={o.color}
                onClick={() => { setObjectFilter(o.id); setPage(1); }}/>
            ))}
          </>
        )}

        {/* Refresh */}
        <div style={{ marginTop:"auto", paddingTop:16 }}>
          <button onClick={load}
            style={{ display:"flex", alignItems:"center", gap:6, width:"100%",
              padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:C.text3, fontSize:11, fontWeight:500,
              cursor:"pointer", fontFamily:F, transition:"all 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.color=C.accent}
            onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
            <Ic n="refresh" s={12} c={C.text3}/> Refresh
          </button>
        </div>
      </div>

      {/* ── Right feed ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>

        {/* Top bar */}
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", gap:10, background:C.card, flexShrink:0 }}>
          <div style={{ flex:1, fontSize:12, color:C.text3, fontWeight:500 }}>
            {loading ? "Loading…" : (
              <span>
                <strong style={{ color:C.text1 }}>{filtered.length}</strong>
                {" "}event{filtered.length!==1?"s":""}
                {(search||typeFilter!=="all"||objectFilter!=="all") && " (filtered)"}
              </span>
            )}
          </div>
          {/* Today / date headers legend */}
          <div style={{ fontSize:10, color:C.text3 }}>
            {shown.length > 0 && calDate(shown[0]?.created_at)}
          </div>
        </div>

        {/* Feed list */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading && !items.length ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              height:200, color:C.text3, fontSize:12 }}>Loading…</div>
          ) : !shown.length ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              height:200, color:C.text3, fontSize:12 }}>No activity found</div>
          ) : (
            <div style={{ background:C.card, margin:"0" }}>
              {shown.map((item, i) => (
                <FeedRow key={item.id} item={item} onOpenRecord={onOpenRecord}
                  isLast={i === shown.length - 1}/>
              ))}
              {shown.length < filtered.length && (
                <div style={{ padding:"12px 16px" }}>
                  <button onClick={() => setPage(p => p+1)}
                    style={{ width:"100%", padding:"8px 0", borderRadius:8,
                      border:`1px solid ${C.border}`, background:"transparent",
                      color:C.text2, fontSize:11, fontWeight:600, cursor:"pointer",
                      fontFamily:F, transition:"all 0.12s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="#f5f3ff"; e.currentTarget.style.color=C.accent; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.text2; }}>
                    Show more ({filtered.length - shown.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
