import { useState, useEffect, useCallback, useRef } from "react";
import api from "./apiClient.js";

const C = {
  bg: "var(--t-bg, #F4F3FF)", card: "var(--t-card, #fff)",
  border: "var(--t-border, #ece9f8)", accent: "var(--t-accent, #8B7EC8)",
  text1: "var(--t-text1, #1a1a2e)", text2: "var(--t-text2, #4a4a6a)",
  text3: "var(--t-text3, #9090a0)",
};
const F = `"Space Grotesk","DM Sans",-apple-system,sans-serif`;

// ── Icon paths ───────────────────────────────────────────────────────────────
const ICONS = {
  plus:            "M12 5v14M5 12h14",
  edit:            "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  mail:            "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  "message-square":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  phone:           "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  calendar:        "M3 9h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zM8 2v4M16 2v4",
  "file-check":    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
  "file-text":     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  "arrow-right":   "M5 12h14M12 5l7 7-7 7",
  activity:        "M22 12h-4l-3 9L9 3l-3 9H2",
  search:          "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM21 21l-4.35-4.35",
  "x":             "M18 6L6 18M6 6l12 12",
  filter:          "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  clock:           "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  "chevron-down":  "M6 9l6 6 6-6",
  refresh:         "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
};

function Ic({ n, s = 16, c = C.accent }) {
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
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const stripEmoji = s => (s || "").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}🧪]/gu, "").trim();

const SOURCE_TYPES = [
  { id: "all",       label: "All events" },
  { id: "activity",  label: "Record changes" },
  { id: "interview", label: "Interviews" },
  { id: "offer",     label: "Offers" },
  { id: "stage",     label: "Stage moves" },
];

const OBJ_ICONS = {
  people:       "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  jobs:         "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "talent-pools":"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  default:      "M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z",
};

// ── Single Journal Row ───────────────────────────────────────────────────────
function JournalRow({ item, onOpenRecord, isLast }) {
  const iconBg    = `${item.color || C.accent}14`;
  const objIcon   = OBJ_ICONS[item.object_slug] || OBJ_ICONS.default;
  const label     = stripEmoji(item.label);
  const detail    = item.detail ? (item.type === "field_changed" ? `→ ${item.detail}` : item.detail) : "";

  return (
    <div onClick={() => item.record_id && item.object_id && onOpenRecord?.(item.record_id, item.object_id)}
      style={{ display: "flex", alignItems: "flex-start", gap: 12,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : `0.5px solid ${C.border}`,
        cursor: item.record_id ? "pointer" : "default",
        transition: "background 0.1s", fontFamily: F }}
      onMouseEnter={e => { if (item.record_id) e.currentTarget.style.background = "#faf9ff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>

      {/* Icon */}
      <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg,
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <Ic n={item.icon || "activity"} s={14} c={item.color || C.accent} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {item.record_name && item.record_name !== "Unknown record" ? item.record_name : "Deleted record"}
          </span>
          {item.object_name && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
              background: `${item.object_color || C.accent}15`,
              color: item.object_color || C.accent, flexShrink: 0, whiteSpace: "nowrap" }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                stroke={item.object_color || C.accent} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d={objIcon} />
              </svg>
              {item.object_name}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{label || item.label}</div>
        {detail && (
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontStyle: "italic",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
            {detail}
          </div>
        )}
        {item.actor && item.actor !== "null" && (
          <div style={{ fontSize: 10.5, color: C.text3, marginTop: 2 }}>by {item.actor}</div>
        )}
      </div>

      {/* Time */}
      <div style={{ fontSize: 10.5, color: C.text3, flexShrink: 0, paddingTop: 4,
        whiteSpace: "nowrap", minWidth: 60, textAlign: "right" }}>
        <div>{relTime(item.created_at)}</div>
        <div style={{ fontSize: 9.5, marginTop: 1 }}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : ""}
        </div>
      </div>
    </div>
  );
}

// ── Main Journal Component ───────────────────────────────────────────────────
export default function ActivityJournal({ environment, onOpenRecord }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [objectFilter, setObjectFilter] = useState("all");
  const [objects,  setObjects]  = useState([]);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const LIMIT = 30;

  const load = useCallback(async (reset = false) => {
    if (!environment?.id) return;
    setLoading(true);
    const p = reset ? 1 : page;
    const data = await api.get(
      `/records/activity/feed?environment_id=${environment.id}&limit=${LIMIT * p + 10}`
    );
    const arr = Array.isArray(data) ? data : [];
    setItems(arr);
    setHasMore(arr.length >= LIMIT * p);
    if (reset) setPage(1);
    setLoading(false);
  }, [environment?.id, page]);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`)
      .then(d => setObjects(Array.isArray(d) ? d : []));
  }, [environment?.id]);

  useEffect(() => { load(true); }, [environment?.id]);

  // Client-side filtering
  const filtered = items.filter(a => {
    if (typeFilter !== "all" && a.source !== typeFilter) return false;
    if (objectFilter !== "all" && a.object_id !== objectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inName   = (a.record_name || "").toLowerCase().includes(q);
      const inLabel  = (a.label || "").toLowerCase().includes(q);
      const inDetail = (a.detail || "").toLowerCase().includes(q);
      const inActor  = (a.actor || "").toLowerCase().includes(q);
      if (!inName && !inLabel && !inDetail && !inActor) return false;
    }
    return true;
  });

  const shown = filtered.slice(0, page * LIMIT);

  return (
    <div style={{ padding: "28px 32px", fontFamily: F, maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, letterSpacing: "-0.02em" }}>
          Activity Journal
        </div>
        <div style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>
          Complete history of changes across the platform
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <Ic n="search" s={13} c={C.text3} />
          </div>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by record, action, actor…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, height: 34,
              border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 12,
              outline: "none", background: C.card, color: C.text1, fontFamily: F,
              boxSizing: "border-box" }} />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
              <Ic n="x" s={12} c={C.text3} />
            </button>
          )}
        </div>

        {/* Object filter */}
        <select value={objectFilter} onChange={e => { setObjectFilter(e.target.value); setPage(1); }}
          style={{ height: 34, padding: "0 10px", border: `1.5px solid ${C.border}`,
            borderRadius: 9, fontSize: 12, color: C.text1, fontFamily: F,
            background: C.card, cursor: "pointer", outline: "none" }}>
          <option value="all">All objects</option>
          {objects.map(o => <option key={o.id} value={o.id}>{o.plural_name || o.name}</option>)}
        </select>

        {/* Refresh */}
        <button onClick={() => load(true)}
          style={{ height: 34, padding: "0 12px", border: `1.5px solid ${C.border}`,
            borderRadius: 9, background: C.card, cursor: "pointer", display: "flex",
            alignItems: "center", gap: 5, fontSize: 12, color: C.text2, fontFamily: F }}>
          <Ic n="refresh" s={12} c={C.text3} /> Refresh
        </button>
      </div>

      {/* Type tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {SOURCE_TYPES.map(f => (
          <button key={f.id} onClick={() => { setTypeFilter(f.id); setPage(1); }}
            style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 99,
              border: `1.5px solid ${typeFilter === f.id ? C.accent : C.border}`,
              background: typeFilter === f.id ? `${C.accent}12` : "transparent",
              color: typeFilter === f.id ? C.accent : C.text3,
              cursor: "pointer", fontFamily: F, transition: "all 0.12s" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>
        {loading ? "Loading…" : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}${search || typeFilter !== "all" || objectFilter !== "all" ? " (filtered)" : ""}`}
      </div>

      {/* Journal list */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        {loading && !items.length ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.text3, fontSize: 13 }}>
            Loading…
          </div>
        ) : !shown.length ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.text3, fontSize: 13 }}>
            No activity found
          </div>
        ) : shown.map((item, i) => (
          <JournalRow key={item.id} item={item} onOpenRecord={onOpenRecord}
            isLast={i === shown.length - 1} />
        ))}
      </div>

      {/* Load more */}
      {shown.length < filtered.length && (
        <button onClick={() => setPage(p => p + 1)}
          style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.card,
            color: C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: F, transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.text2; }}>
          Show more ({filtered.length - shown.length} remaining)
        </button>
      )}
    </div>
  );
}
