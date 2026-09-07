// client/src/superadmin/FeatureRequests.jsx
// Review queue for two feeds:
//   Copilot — logged silently when the Copilot hits something it can't do
//   Manual  — submitted directly by a user via Help → Request a Feature
import { useState, useEffect, useCallback } from "react";
import saApi from "./saApi.js";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#0a0e1a", surface:"#111827", surface2:"#1a2235", border:"#1e2d45", border2:"#2d3f5e",
  text1:"#f0f4ff", text2:"#8899bb", text3:"#4a5878",
  accent:"#3b82f6", green:"#10b981", amber:"#f59e0b", red:"#ef4444", purple:"#8b5cf6", cyan:"#06b6d4",
};

const STATUS_META = {
  new:       { label: "New",        color: C.accent },
  reviewing: { label: "Reviewing",  color: C.amber },
  planned:   { label: "Planned",    color: C.cyan },
  shipped:   { label: "Shipped",    color: C.green },
  wont_do:   { label: "Won't do",   color: C.text3 },
};
const SOURCE_META = {
  copilot: { label: "Copilot", color: C.purple },
  manual:  { label: "Manual",  color: C.amber },
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function RequestRow({ item, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(item.admin_notes || "");
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[item.status] || STATUS_META.new;
  const src = SOURCE_META[item.source] || SOURCE_META.copilot;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: src.color, background: `${src.color}18`,
              border: `1px solid ${src.color}44`, borderRadius: 20, padding: "2px 8px" }}>{src.label}</span>
            {item.category && (
              <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3, background: C.surface2, borderRadius: 20, padding: "2px 8px" }}>
                {item.category}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text1, lineHeight: 1.4 }}>"{item.request_text}"</div>
          {item.description && <div style={{ fontSize: 12, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{item.description}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", fontSize: 11.5, color: C.text3 }}>
            <span>{item.requested_by_name}</span>
            {item.requested_by_email && (<><span>·</span><span>{item.requested_by_email}</span></>)}
            <span>·</span><span>{timeAgo(item.created_at)}</span>
            {item.context_label && (<><span>·</span><span>{item.context_label}</span></>)}
          </div>
          {item.reason && <div style={{ fontSize: 11.5, color: C.text2, marginTop: 6, fontStyle: "italic" }}>Copilot: {item.reason}</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value })}
            style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, background: `${meta.color}18`,
              border: `1px solid ${meta.color}44`, borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontFamily: F }}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "none", color: C.text3, fontSize: 11, cursor: "pointer", fontFamily: F }}>
              {expanded ? "Hide notes" : "Add notes"}
            </button>
            <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: F }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Internal notes — scoping thoughts, related requests, etc."
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text1, fontSize: 12, padding: "8px 10px", fontFamily: F, resize: "vertical" }} />
          <button onClick={() => onUpdate(item.id, { admin_notes: notes })}
            style={{ padding: "0 14px", borderRadius: 6, border: "none", background: C.purple, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeatureRequests() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = [];
    if (statusFilter !== "all") params.push(`status=${statusFilter}`);
    if (sourceFilter !== "all") params.push(`source=${sourceFilter}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const [list, s] = await Promise.all([
      saApi.get(`/api/feature-requests${qs}`),
      saApi.get("/api/feature-requests/stats"),
    ]);
    setItems(Array.isArray(list) ? list : []);
    setStats(s);
    setLoading(false);
  }, [statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const onUpdate = async (id, patch) => { await saApi.patch(`/api/feature-requests/${id}`, patch); load(); };
  const onDelete = async (id) => { if (window.confirm("Delete this request?")) { await saApi.del(`/api/feature-requests/${id}`); load(); } };

  const filtered = items.filter(i =>
    !search || i.request_text.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: F, color: C.text1 }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Feature Requests</div>
      <div style={{ fontSize: 12.5, color: C.text3, marginBottom: 20 }}>
        Everything the Copilot couldn't do, plus everything users have asked for directly.
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            ["Total", stats.total, C.text1],
            ["New", stats.by_status.new, C.accent],
            ["This week", stats.this_week, C.amber],
            ["Copilot", stats.by_source?.copilot ?? 0, C.purple],
            ["Manual", stats.by_source?.manual ?? 0, C.amber],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11.5, color: C.text3, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {["all", "manual", "copilot"].map(s => (
            <button key={s} onClick={() => setSourceFilter(s)}
              style={{ padding: "5px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: F,
                background: sourceFilter === s ? C.purple : "transparent", color: sourceFilter === s ? "#fff" : C.text3 }}>
              {s === "all" ? "All sources" : SOURCE_META[s].label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…"
          style={{ flex: 1, minWidth: 160, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text1, fontSize: 12.5, fontFamily: F }} />
      </div>

      <div style={{ display: "flex", gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, marginBottom: 16, width: "fit-content" }}>
        {["all", ...Object.keys(STATUS_META)].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "5px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: F,
              background: statusFilter === s ? C.purple : "transparent", color: statusFilter === s ? "#fff" : C.text3 }}>
            {s === "all" ? "All statuses" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.text3, textAlign: "center", padding: 30 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: C.text3, textAlign: "center", padding: 40, fontSize: 13 }}>Nothing here yet.</div>
      ) : (
        filtered.map(item => <RequestRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />)
      )}
    </div>
  );
}
