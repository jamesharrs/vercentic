import { useState, useEffect, useCallback, useRef } from "react";
import api from "./apiClient.js";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
// DashboardInsights moved to its own nav page

// ── Vercentic brand palette ───────────────────────────────────────────────
const V = {
  purple:     "#7F77DD",
  purpleD:    "#534AB7",
  purpleL:    "#AFA9EC",
  purpleFaint:"rgba(127,119,221,0.08)",
  rose:       "#D4537E",
  roseFaint:  "rgba(212,83,126,0.06)",
  teal:       "#1D9E75",
  tealFaint:  "rgba(29,158,117,0.08)",
  amber:      "#EF9F27",
  gray:       "#888780",
  gray2:      "#374151",
  border:     "rgba(0,0,0,0.06)",
  card:       "white",
  bg:         "#F8F7FF",
};

const ACCENT = [V.purple, V.rose, V.teal, V.amber, V.purpleL];

let _cache = null, _cacheEnv = null, _cacheTS = 0;
const CACHE_TTL = 60000; // 1 minute

// ── Greeting ──────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Dark tooltip ──────────────────────────────────────────────────────────
const DarkTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0F0F19", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#fff" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#ccc", marginTop: 2 }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

// ── Stat pill (top greeting row) ──────────────────────────────────────────
function StatPill({ icon, value, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 20,
      border: `0.5px solid ${V.border}`, background: V.card, fontSize: 12, color: V.gray2 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      <span style={{ fontWeight: 700, color: V.gray2 }}>{value}</span>
      <span style={{ color: V.gray }}>{label}</span>
    </div>
  );
}

// ── KPI card with icon + top strip ───────────────────────────────────────
function KpiCard({ label, value, sub, sub2, color, iconPath, tag, tagUp, onClick, onReport, reportHint }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: V.card, borderRadius: 16, border: `0.5px solid ${hov && onClick ? color : V.border}`,
        padding: "18px 20px 16px", cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hov && onClick ? `0 4px 24px ${color}20` : "none" }}>
      {/* coloured top strip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "16px 16px 0 0" }} />
      {/* icon + value row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {iconPath}
          </svg>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "#111827" }}>{value}</div>
      </div>
      {/* label */}
      <div style={{ fontSize: 13, fontWeight: 600, color: V.gray2 }}>{label}</div>
      {/* sub lines */}
      {sub && <div style={{ fontSize: 11, color: V.gray, marginTop: 3 }}>{sub}</div>}
      {sub2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
          {tag !== undefined && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
              background: tagUp ? "#E1F5EE" : tagUp === false ? "#FAECE7" : "#EEEDFE",
              color:      tagUp ? "#0F6E56" : tagUp === false ? "#993C1D" : "#3C3489" }}>
              {tag}
            </span>
          )}
          <span style={{ fontSize: 11, color: V.gray }}>{sub2}</span>
        </div>
      )}
      {/* report link */}
      {onReport && (
        <button onClick={e => { e.stopPropagation(); onReport(reportHint); }}
          style={{ position: "absolute", bottom: 10, right: 12, background: "none", border: "none",
            cursor: "pointer", fontSize: 10, color: V.purple, fontWeight: 700, fontFamily: "inherit",
            opacity: hov ? 1 : 0, transition: "opacity 0.15s" }}>
          ↗ Report
        </button>
      )}
    </div>
  );
}

// ── Activity feed icon paths ──────────────────────────────────────────────
const ACT_ICONS = {
  plus:            "M12 5v14M5 12h14",
  edit:            "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  mail:            "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  "message-square":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  "message-circle":"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  phone:           "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  calendar:        "M3 9h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zM8 2v4M16 2v4",
  "file-check":    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
  "file-text":     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  "arrow-right":   "M5 12h14M12 5l7 7-7 7",
  activity:        "M22 12h-4l-3 9L9 3l-3 9H2",
};

function ActIcon({ name, color, size = 13 }) {
  const d = ACT_ICONS[name] || ACT_ICONS.activity;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SOURCE_FILTERS = [
  { id: "all",       label: "All" },
  { id: "activity",  label: "Records" },
  { id: "interview", label: "Interviews" },
  { id: "offer",     label: "Offers" },
  { id: "stage",     label: "Stages" },
];

// ── Object icon paths (Lucide) ────────────────────────────────────────────
const OBJ_ICONS = {
  people:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  jobs:        "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "talent-pools":"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  default:     "M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z",
};

// Strip emoji characters from a string
const stripEmoji = s => (s||"").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}🧪]/gu, "").trim();

// Format detail value nicely
const fmtDetail = (detail, type) => {
  if (!detail) return "";
  const s = Array.isArray(detail) ? detail.join(", ") : String(detail);
  if (type === "field_changed") return `→ ${s.slice(0, 50)}`;
  return s.slice(0, 60);
};

// Group events for the same record within a 2h window into a single entry
const groupActivity = (events) => {
  const WINDOW = 7200000; // 2 hours
  const groups = [];
  const keyToIdx = {}; // `${record_id}:${dayBucket}` → group index

  events.forEach(e => {
    const rid = e.record_id;
    if (!rid) { groups.push({ ...e, count: 1, changes: [e] }); return; }

    // Bucket by record_id + calendar date so different days aren't merged
    const day = e.created_at ? e.created_at.slice(0, 10) : "unknown";
    const key = `${rid}:${day}`;
    const idx = keyToIdx[key];

    if (idx !== undefined) {
      const grp = groups[idx];
      const diff = Math.abs(new Date(grp.created_at) - new Date(e.created_at));
      if (diff <= WINDOW) {
        grp.count++;
        grp.changes = grp.changes || [];
        grp.changes.push(e);
        // Prefer non-field_changed label (created/interview etc. is more informative)
        if (e.type !== "field_changed" && grp.type === "field_changed") {
          grp.label  = e.label;
          grp.icon   = e.icon;
          grp.color  = e.color;
          grp.type   = e.type;
          grp.detail = e.detail;
        }
        // Always use the most recent timestamp shown
        if (new Date(e.created_at) > new Date(grp.created_at)) grp.created_at = e.created_at;
        return;
      }
    }
    // New group
    keyToIdx[key] = groups.length;
    groups.push({ ...e, count: 1, changes: [e] });
  });

  return groups;
};

function ActivityFeedCard({ activity, onOpenRecord, onViewAll }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? activity : activity.filter(a => a.source === filter);
  const grouped  = groupActivity(filtered);
  const shown    = grouped.slice(0, 5);
  const extra    = grouped.length - shown.length;

  return (
    <div style={{ background: V.card, border: `0.5px solid ${V.border}`, borderRadius: 16,
      padding: "20px 22px", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Recent Activity</div>
          <div style={{ fontSize: 11, color: V.gray, marginTop: 1 }}>Live changes across the platform</div>
        </div>
        <button onClick={onViewAll}
          style={{ fontSize: 11, fontWeight: 600, color: V.purple, background: "none",
            border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
          View all →
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {SOURCE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
              border: `1.5px solid ${filter === f.id ? V.purple : V.border}`,
              background: filter === f.id ? `${V.purple}12` : "transparent",
              color: filter === f.id ? V.purple : V.gray,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed — 5 grouped entries */}
      {!shown.length ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: V.gray, fontSize: 12 }}>
          No activity yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {shown.map((a, i) => {
            const isLast    = i === shown.length - 1;
            const iconBg    = `${a.color || V.purple}14`;
            const objIcon   = OBJ_ICONS[a.object_slug] || OBJ_ICONS.default;
            const cleanLabel = stripEmoji(a.label);
            const detail    = fmtDetail(a.detail, a.type);
            const isMulti   = a.count > 1;

            return (
              <div key={a.id}
                onClick={() => a.record_id && a.object_id && onOpenRecord?.(a.record_id, a.object_id)}
                style={{ display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 6px",
                  borderBottom: isLast ? "none" : `0.5px solid ${V.border}`,
                  cursor: a.record_id ? "pointer" : "default",
                  borderRadius: 8, transition: "background 0.1s" }}
                onMouseEnter={e => { if (a.record_id) e.currentTarget.style.background = "#f5f6fa"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>

                {/* Action icon — stacked if multiple */}
                <div style={{ position: "relative", flexShrink: 0, marginTop: 1 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ActIcon name={a.icon || "activity"} color={a.color || V.purple} size={13} />
                  </div>
                  {isMulti && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14,
                      borderRadius: "50%", background: a.color || V.purple,
                      color: "white", fontSize: 8, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1.5px solid white" }}>
                      {a.count > 9 ? "9+" : a.count}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                      {a.record_name && a.record_name !== "Unknown record" ? a.record_name : "Deleted record"}
                    </span>
                    {a.object_name && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3,
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                        background: `${a.object_color || V.purple}15`,
                        color: a.object_color || V.purple, flexShrink: 0, whiteSpace: "nowrap" }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                          stroke={a.object_color || V.purple} strokeWidth="2.5"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d={objIcon} />
                        </svg>
                        {a.object_name}
                      </span>
                    )}
                  </div>

                  {/* Action label — summarise if grouped */}
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 500, lineHeight: 1.3 }}>
                    {isMulti ? `${a.count} changes · ${cleanLabel || a.label}` : (cleanLabel || a.label)}
                  </div>

                  {/* Detail */}
                  {!isMulti && detail && (
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2, fontStyle: "italic",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                      {detail}
                    </div>
                  )}

                  {/* Actor */}
                  {a.actor && a.actor !== "null" && (
                    <div style={{ fontSize: 10, color: V.gray, marginTop: 2 }}>by {a.actor}</div>
                  )}
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: 10, color: V.gray, flexShrink: 0, paddingTop: 3,
                  whiteSpace: "nowrap", minWidth: 40, textAlign: "right" }}>
                  {relTime(a.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* More link */}
      {extra > 0 && (
        <button onClick={onViewAll}
          style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 9,
            border: `1px solid ${V.border}`, background: "transparent",
            color: V.gray2, fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f6fa"; e.currentTarget.style.color = V.purple; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = V.gray2; }}>
          +{extra} more · View full activity →
        </button>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: V.card, border: `0.5px solid ${V.border}`, borderRadius: 16, padding: "20px 22px", ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ title, sub, action }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</div>
        {action}
      </div>
      {sub && <div style={{ fontSize: 11, color: V.gray, marginTop: 2, marginBottom: 14 }}>{sub}</div>}
    </div>
  );
}

// ── Legend pill ───────────────────────────────────────────────────────────
function Leg({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: V.gray }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />{label}
    </div>
  );
}

// ── Bottom action button ──────────────────────────────────────────────────
function ActionBtn({ label, color, iconPath, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "12px 16px", borderRadius: 12,
        border: `0.5px solid ${hov ? color : V.border}`,
        background: hov ? `${color}08` : V.card,
        color: hov ? color : V.gray2, cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={hov ? color : V.gray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {iconPath}
      </svg>
      {label}
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard({ environment, session, onNavigate, onOpenRecord, onReport, onViewAll }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const load = useCallback(async (force = false) => {
    if (!environment?.id) return;
    if (!force && _cache && _cacheEnv === environment.id && Date.now() - _cacheTS < CACHE_TTL) { setData(_cache); setLoading(false); return; }
    setLoading(true);
    try {
      const [objRes, actRes] = await Promise.all([
        api.get(`/objects?environment_id=${environment.id}`),
        api.get(`/records/activity/feed?environment_id=${environment.id}&limit=25`),
      ]);
      const objects  = Array.isArray(objRes) ? objRes : [];
      const activity = Array.isArray(actRes) ? actRes : [];

      const recordFetches  = objects.map(o => api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&page=1&limit=200`));
      const recordResults  = await Promise.all(recordFetches);
      const objectData     = objects.map((o, i) => {
        const res = recordResults[i];
        const records = Array.isArray(res?.records) ? res.records : [];
        return { ...o, records, total: res?.pagination?.total ?? records.length };
      });

      const now    = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { label: d.toLocaleDateString("en", { month: "short" }), month: d.getMonth(), year: d.getFullYear() };
      });

      const peopleObj = objectData.find(o => o.slug === "people"       || o.name?.toLowerCase().includes("people"));
      const jobsObj   = objectData.find(o => o.slug === "jobs"         || o.name?.toLowerCase().includes("job"));
      const poolsObj  = objectData.find(o => o.slug === "talent-pools" || o.name?.toLowerCase().includes("pool"));

      const byMonth = (obj) => months.map(m => ({
        ...m, count: (obj?.records || []).filter(r => {
          const d = new Date(r.created_at || 0);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        }).length,
      }));

      const statusMap = (obj) => {
        const c = {};
        (obj?.records || []).forEach(r => { const s = r.data?.status || "Unknown"; c[s] = (c[s] || 0) + 1; });
        return Object.entries(c).map(([name, value]) => ({ name, value }));
      };

      const deptMap = (obj) => {
        const c = {};
        (obj?.records || []).filter(r => !r.deleted_at).forEach(r => {
          const d = r.data?.department || "Other";
          if (!c[d]) c[d] = { open: 0, filled: 0 };
          const s = (r.data?.status || "").toLowerCase();
          if (s === "filled" || s === "closed") c[d].filled++; else c[d].open++;
        });
        return Object.entries(c).map(([dept, v]) => ({ dept, ...v })).sort((a, b) => (b.open + b.filled) - (a.open + a.filled)).slice(0, 6);
      };

      const mom = (obj) => {
        const bm = byMonth(obj);
        const cur = bm.at(-1)?.count || 0, prev = bm.at(-2)?.count || 0;
        return prev ? Math.round(((cur - prev) / prev) * 100) : null;
      };

      // Hiring activity — combine people + jobs monthly for dual series
      const hiringActivity = months.map((m, i) => ({
        label: m.label,
        candidates: byMonth(peopleObj)[i]?.count || 0,
        jobs:       byMonth(jobsObj)[i]?.count || 0,
      }));

      const result = { people: peopleObj, jobs: jobsObj, pools: poolsObj, allObjects: objectData, activity,
        hiringActivity, jobStatus: statusMap(jobsObj), peopleStatus: statusMap(peopleObj),
        deptBreakdown: deptMap(jobsObj), momPeople: mom(peopleObj), momJobs: mom(jobsObj) };

      _cache = result; _cacheEnv = environment.id; _cacheTS = Date.now();
      if (isMounted.current) { setData(result); setLoading(false); }
    } catch(e) { console.error('[Dashboard] load error:', e); if (isMounted.current) setLoading(false); }
  }, [environment?.id]);

  useEffect(() => { isMounted.current = true; load(); return () => { isMounted.current = false; }; }, [load]);

  // ── Pinned report widgets ─────────────────────────────────────────────────
  const [pinnedReports, setPinnedReports] = useState([]);
  const [pinnedData,    setPinnedData]    = useState({});

  useEffect(() => {
    if (!environment?.id) return;
    fetch(`/api/saved-views/pinned?environment_id=${environment.id}`)
      .then(r => r.json())
      .then(pins => {
        if (!Array.isArray(pins)) return;
        setPinnedReports(pins);
        pins.forEach(async pin => {
          if (!pin.object_id) return;
          try {
            const res = await fetch(`/api/records?object_id=${pin.object_id}&environment_id=${environment.id}&limit=500`);
            const d   = await res.json();
            const raw = Array.isArray(d?.records) ? d.records : [];
            setPinnedData(prev => ({ ...prev, [pin.id]: raw.map(r => ({...r.data, _id:r.id})) }));
          } catch {}
        });
      }).catch(() => {});
  }, [environment?.id]);

  const goTo = (slug, key, val) => window.dispatchEvent(new CustomEvent("talentos:filter-navigate", { detail: { objectSlug: slug, fieldKey: key, fieldValue: val } }));
  const openRpt = (cfg) => { if (onReport) onReport(cfg); else window.dispatchEvent(new CustomEvent("talentos:open-report", { detail: cfg })); };

  const activeCandidates = data?.people?.records.filter(r => !r.deleted_at && !["hired","rejected","withdrawn","placed"].includes((r.data?.status || "").toLowerCase())).length ?? 0;
  const totalCandidates  = data?.people?.total ?? 0;
  const openRoles        = data?.jobs?.records.filter(r => !r.deleted_at && !["filled","closed","cancelled"].includes((r.data?.status || "").toLowerCase())).length ?? 0;
  const totalJobs        = data?.jobs?.total ?? 0;
  const poolCount        = data?.pools?.total ?? 0;
  const totalPlacements  = data?.people?.records.filter(r => (r.data?.status || "").toLowerCase() === "hired").length ?? 0;

  // Interviews today (from any interview data on records)
  const interviewsToday  = 0; // placeholder — wire to interviews API when available

  const momP = data?.momPeople, momJ = data?.momJobs;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${V.border}`, borderTopColor: V.purple, animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13, color: V.gray }}>Loading…</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: V.bg, minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>

      {/* ── Greeting header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0F0F19", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {greeting()} {session?.first_name || ""}
          </div>
          <div style={{ fontSize: 12, color: V.gray, marginTop: 4 }}>
            {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div data-tour="dashboard-stats" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Stat pills */}
          <StatPill color={V.rose} value={openRoles}
            label="open roles"
            icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>} />
          <StatPill color={V.purple} value={activeCandidates}
            label="active candidates"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
          <StatPill color={V.teal} value={interviewsToday}
            label="interviews today"
            icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
          <button onClick={() => { _cache = null; load(true); }}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 20, border: `0.5px solid ${V.border}`,
              background: V.card, color: V.gray, cursor: "pointer", fontFamily: "inherit" }}>
            ↻
          </button>
        </div>
      </div>

      {/* ── 4 KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard
          label="Total candidates" value={totalCandidates.toLocaleString()}
          sub={`${activeCandidates} active`} sub2="vs last month"
          tag={momP !== null ? (momP >= 0 ? `+${momP}%` : `${momP}%`) : null} tagUp={momP >= 0}
          color={V.purple}
          iconPath={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          onClick={() => goTo("people", "status", "Active")}
          onReport={openRpt} reportHint={{ object: "people", title: "Candidates by status", groupBy: "status", chartType: "bar" }}
        />
        <KpiCard
          label="Open jobs" value={openRoles.toLocaleString()}
          sub={`${totalJobs} total roles`} sub2="vs last month"
          tag={momJ !== null ? (momJ >= 0 ? `+${momJ}%` : `${momJ}%`) : null} tagUp={momJ >= 0}
          color={V.rose}
          iconPath={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>}
          onClick={() => goTo("jobs", "status", "Open")}
          onReport={openRpt} reportHint={{ object: "jobs", title: "Jobs by department", groupBy: "department", chartType: "bar" }}
        />
        <KpiCard
          label="Talent pools" value={poolCount.toLocaleString()}
          sub="curated pipelines" sub2="vs last month"
          color={V.teal}
          iconPath={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}
          onClick={() => goTo("talent-pools", "", "")}
          onReport={openRpt} reportHint={{ object: "talent-pools", title: "Pools by category", groupBy: "category", chartType: "pie" }}
        />
        <KpiCard
          label="Placed" value={totalPlacements.toLocaleString()}
          sub="total placements" sub2="vs last month"
          color={V.amber}
          iconPath={<><polyline points="20 6 9 17 4 12"/></>}
        />
      </div>

      {/* ── Mid row: Hiring Activity + Jobs Pipeline ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12, marginBottom: 16 }}>

        {/* Hiring Activity */}
        <Card>
          <CardTitle title="Hiring Activity" sub="Records added per month this year"
            action={
              <div style={{ display: "flex", gap: 12 }}>
                <Leg color={V.purple} label="Candidates" />
                <Leg color={V.teal}   label="Jobs" />
              </div>
            }
          />
          {data?.hiringActivity?.some(m => m.candidates > 0 || m.jobs > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.hiringActivity} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={V.purple} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={V.purple} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={V.teal} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={V.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: V.gray }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: V.gray }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTip />} />
                <Area type="monotone" dataKey="candidates" name="Candidates" stroke={V.purple} strokeWidth={2} fill="url(#gP)" dot={false} />
                <Area type="monotone" dataKey="jobs"       name="Jobs"       stroke={V.teal}   strokeWidth={2} fill="url(#gT)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: V.gray }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={V.purpleL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <div style={{ fontSize: 12 }}>No data yet for this year</div>
            </div>
          )}
        </Card>

        {/* Jobs Pipeline */}
        <Card>
          <CardTitle title="Jobs Pipeline"
            sub={`${openRoles} total roles`}
            action={
              <button onClick={() => goTo("jobs", "status", "Open")}
                style={{ fontSize: 11, color: V.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                View all jobs →
              </button>
            }
          />
          {data?.jobStatus?.length ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.jobStatus} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" dataKey="value" paddingAngle={3}>
                    {data.jobStatus.map((_, i) => <Cell key={i} fill={ACCENT[i % ACCENT.length]} />)}
                  </Pie>
                  <Tooltip content={<DarkTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
                {data.jobStatus.map((s, i) => <Leg key={i} color={ACCENT[i % ACCENT.length]} label={`${s.name} (${s.value})`} />)}
              </div>
            </>
          ) : (
            <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: V.gray }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={V.purpleL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              <div style={{ fontSize: 12 }}>No jobs yet</div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Pinned Reports ── */}
      {pinnedReports.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Pinned Reports</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
            {pinnedReports.map(pin => {
              const rows   = pinnedData[pin.id] || [];
              const grpKey = pin.group_by;
              const yKey   = pin.chart_y || "_count";
              const xKey   = pin.chart_x || grpKey || "_group";
              const ct     = pin.chart_type || "bar";
              const PCOLS  = ["#7F77DD","#D4537E","#1D9E75","#EF9F27","#AFA9EC","#E87FAA"];
              let chartData = [];
              if (rows.length && grpKey) {
                const counts = {};
                rows.forEach(r => { const v = String(r[grpKey] || "Unknown"); counts[v] = (counts[v]||0)+1; });
                chartData = Object.entries(counts).map(([name,value])=>({name,value,[xKey]:name,[yKey]:value})).sort((a,b)=>b.value-a.value).slice(0,8);
              }
              return (
                <Card key={pin.id}>
                  <CardTitle title={pin.name} sub={`${rows.length} records`}
                    action={<button onClick={()=>openRpt({object:pin.object_id,groupBy:pin.group_by,chartType:ct})} style={{ fontSize:11,color:V.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit" }}>Open →</button>}/>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      {ct==="pie" ? (
                        <PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                          {chartData.map((_,i)=><Cell key={i} fill={PCOLS[i%PCOLS.length]}/>)}
                        </Pie><Tooltip formatter={v=>[v,"Count"]}/></PieChart>
                      ) : (
                        <BarChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                          <XAxis dataKey="name" tick={{fontSize:9}} interval={0}/>
                          <YAxis tick={{fontSize:9}}/><Tooltip/>
                          <Bar dataKey="value" radius={[3,3,0,0]}>{chartData.map((_,i)=><Cell key={i} fill={PCOLS[i%PCOLS.length]}/>)}</Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height:100,display:"flex",alignItems:"center",justifyContent:"center",color:V.gray,fontSize:12 }}>
                      {rows.length ? "No group-by configured" : "No data yet"}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom row: Candidate Pipeline + Open Reqs by Dept + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 16 }}>

        {/* Candidate Pipeline */}
        <Card>
          <CardTitle title="Candidate Pipeline"
            sub={`${activeCandidates} total`}
            action={
              <button onClick={() => goTo("people", "", "")}
                style={{ fontSize: 11, color: V.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                View all →
              </button>
            }
          />
          {data?.peopleStatus?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.peopleStatus.slice(0, 6).map((s, i) => {
                const total = data.peopleStatus.reduce((a, b) => a + b.value, 0) || 1;
                const pct   = Math.round((s.value / total) * 100);
                const col   = ACCENT[i % ACCENT.length];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, color: V.gray, width: 72, textAlign: "right", flexShrink: 0 }}>{s.name}</div>
                    <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.05)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 99, transition: "width 0.7s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", width: 28, flexShrink: 0 }}>{s.value}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: V.gray }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V.purpleL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              <div style={{ fontSize: 12 }}>No candidates yet</div>
            </div>
          )}
        </Card>

        {/* Open Reqs by Dept */}
        <Card>
          <CardTitle title="Open Reqs by Dept" sub={`${openRoles} open roles`} />
          {data?.deptBreakdown?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.deptBreakdown.slice(0, 6).map((d, i) => {
                const max = Math.max(...data.deptBreakdown.map(x => x.open + x.filled)) || 1;
                const pct = Math.round((d.open / max) * 100);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, color: V.gray, width: 72, textAlign: "right", flexShrink: 0 }}>{d.dept}</div>
                    <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.05)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: V.rose, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", width: 28, flexShrink: 0 }}>{d.open}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: V.gray }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V.purpleL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <div style={{ fontSize: 12 }}>No department data yet</div>
            </div>
          )}
        </Card>

        {/* Recent Activity — rich feed */}
        <ActivityFeedCard activity={data?.activity || []} onOpenRecord={onOpenRecord} onViewAll={onViewAll} />
      </div>

      {/* ── Bottom action bar ── */}
      <div style={{ display: "flex", gap: 10 }}>
        <ActionBtn label="Add Candidate" color={V.purple}
          iconPath={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>}
          onClick={() => window.dispatchEvent(new CustomEvent("talentos:create-record", { detail: { objectName: "People" } }))} />
        <ActionBtn label="Post a Job" color={V.rose}
          iconPath={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></>}
          onClick={() => window.dispatchEvent(new CustomEvent("talentos:create-record", { detail: { objectName: "Jobs" } }))} />
        <ActionBtn label="Create Pool" color={V.teal}
          iconPath={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}
          onClick={() => window.dispatchEvent(new CustomEvent("talentos:create-record", { detail: { objectName: "Talent Pools" } }))} />
        <ActionBtn label="Recommendations" color={V.amber}
          iconPath={<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>}
          onClick={() => {}} />
      </div>

    </div>
  );
}
