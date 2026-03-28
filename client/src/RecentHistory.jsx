// client/src/RecentHistory.jsx
import { useState } from "react";

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function EntryRow({ entry, onNavigate, onPin, isPinned, showTime = false }) {
  const [hovered, setHovered] = useState(false);
  const color = entry.objectColor || "var(--t-accent, #4361EE)";
  const initials = (entry.label || "?").replace(/^…$/, "?").slice(0, 1).toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(entry)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 9, cursor: "pointer",
        background: hovered ? `${color}10` : "transparent",
        transition: "background 0.12s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${color}1e`, border: `1.5px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color,
      }}>
        {initials}
      </div>

      {/* Label + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--t-text1)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3,
        }}>{entry.label}</div>
        <div style={{
          fontSize: 11, color: "var(--t-text3)", lineHeight: 1.2, marginTop: 1,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {entry.objectName}
          {entry.subtitle ? ` · ${entry.subtitle}` : ""}
          {showTime ? ` · ${timeAgo(entry.ts)}` : ""}
        </div>
      </div>

      {/* Pin button — visible on hover */}
      {hovered && onPin && (
        <button
          onClick={e => { e.stopPropagation(); onPin(entry); }}
          title={isPinned ? "Unpin" : "Pin"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "2px 4px", borderRadius: 4, lineHeight: 1, flexShrink: 0,
            color: isPinned ? color : "var(--t-text3)", fontSize: 14,
          }}
        >{isPinned ? "★" : "☆"}</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryDropdown — clock button in top bar + right-side slide-out drawer
// ─────────────────────────────────────────────────────────────────────────────
export function HistoryDropdown({
  history, pinned, onNavigate, onPin, isPinned, onClear, isOpen, onToggle,
}) {
  const [tab, setTab] = useState("recent");
  const items = tab === "pinned" ? pinned : history;

  return (
    <>
      {/* ── History button — shows last visited item name as a pill ── */}
      <button
        onClick={onToggle}
        title={isOpen ? "Close history" : "Recent pages"}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", gap: 5,
          height: 34, borderRadius: 8, border: "1px solid var(--t-border)",
          padding: "0 10px 0 8px",
          background: isOpen ? "var(--t-accent-light, #eef1ff)" : "var(--t-surface2)",
          color: isOpen ? "var(--t-accent, #4361EE)" : "var(--t-text2)",
          cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
          fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden",
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = "var(--t-accent-light, #eef1ff)"; e.currentTarget.style.color = "var(--t-accent, #4361EE)"; e.currentTarget.style.borderColor = "var(--t-accent, #4361EE)"; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = "var(--t-surface2)"; e.currentTarget.style.color = "var(--t-text2)"; e.currentTarget.style.borderColor = "var(--t-border)"; } }}
      >
        {/* Clock icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {/* Last visited label — truncated */}
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {history.length > 0 ? history[0].label : "History"}
        </span>
      </button>

      {/* ── Right-side slide-out drawer ── */}
      <div style={{
        position: "fixed",
        top: 0,
        right: isOpen ? 0 : -320,
        width: 300,
        height: "100vh",
        background: "var(--t-surface, white)",
        borderLeft: "1px solid var(--t-border)",
        boxShadow: isOpen ? "-4px 0 24px rgba(0,0,0,0.10)" : "none",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        transition: "right 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 14px 10px",
          borderBottom: "1px solid var(--t-border)",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          {/* Tab pills */}
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {["recent", "pinned"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "4px 12px", borderRadius: 20, border: "none",
                background: tab === t ? "var(--t-accent, #4361EE)" : "var(--t-surface2)",
                color: tab === t ? "white" : "var(--t-text3)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", textTransform: "capitalize",
                transition: "all 0.12s",
              }}>{t}</button>
            ))}
          </div>

          {/* Clear + close */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {tab === "recent" && history.length > 0 && (
              <button onClick={onClear} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 10, color: "var(--t-text3)", fontFamily: "inherit",
                padding: "3px 6px", borderRadius: 5,
              }}>Clear</button>
            )}
            <button onClick={onToggle} title="Close" style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px", borderRadius: 6, color: "var(--t-text3)",
              display: "flex", alignItems: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 4px" }}>
          {items.length === 0 ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              fontSize: 13, color: "var(--t-text3)", lineHeight: 1.6,
            }}>
              {tab === "pinned"
                ? "Star ☆ items to pin them here"
                : "Nothing viewed yet.\nPages and records you visit will appear here."}
            </div>
          ) : items.map((e, i) => (
            <EntryRow key={i} entry={e}
              onNavigate={onNavigate}
              onPin={onPin}
              isPinned={isPinned(e)}
              showTime={tab === "recent"} />
          ))}
        </div>

        {/* Footer count */}
        {items.length > 0 && (
          <div style={{
            padding: "8px 14px", borderTop: "1px solid var(--t-border)",
            fontSize: 11, color: "var(--t-text3)", flexShrink: 0,
          }}>
            {items.length} {tab === "pinned" ? "pinned" : "recent"} item{items.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </>
  );
}
