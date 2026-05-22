/**
 * AppSelect — shared styled dropdown component for the entire Vercentic platform.
 *
 * Rules (per memory #17):
 * 1. Never use native <select> — always this component
 * 2. Search input appears automatically when options.length > 5
 * 3. Dropdown renders via ReactDOM.createPortal to escape overflow:hidden parents
 *
 * Usage:
 *   <AppSelect
 *     value={val}
 *     onChange={v => set(v)}
 *     options={[{ value: "x", label: "X" }, ...]}
 *     placeholder="Choose..."   // shown when nothing selected
 *     disabled={false}
 *     searchThreshold={5}       // show search if options > N (default 5)
 *     accentColor="#4361EE"     // override accent colour
 *   />
 */
import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

const DEFAULT_ACCENT = "var(--t-accent, #4361EE)";
const DEFAULT_BORDER = "var(--t-border, #e5e7eb)";
const DEFAULT_BG     = "var(--t-card, #ffffff)";
const DEFAULT_TEXT1  = "var(--t-text1, #111827)";
const DEFAULT_TEXT3  = "var(--t-text3, #9ca3af)";
const DEFAULT_FONT   = "'DM Sans', -apple-system, sans-serif";

export default function AppSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  searchThreshold = 5,
  accentColor = DEFAULT_ACCENT,
  style = {},
}) {
  const [open, setOpen]   = useState(false);
  const [rect, setRect]   = useState(null);
  const [q,    setQ]      = useState("");
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = q
    ? options.filter(o => o.label?.toLowerCase().includes(q.toLowerCase()))
    : options;
  const showSearch = options.length > searchThreshold;

  const handleOpen = () => {
    if (disabled) return;
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Reset search on close
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const dropdown = open && rect && ReactDOM.createPortal(
    <div ref={dropRef} style={{
      position: "fixed",
      top:   rect.bottom + 4,
      left:  rect.left,
      width: rect.width,
      zIndex: 99999,
      background: DEFAULT_BG,
      borderRadius: 10,
      border: `1.5px solid ${DEFAULT_BORDER}`,
      boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
      maxHeight: 260,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {showSearch && (
        <div style={{ padding: "8px 8px 4px", borderBottom: `1px solid ${DEFAULT_BORDER}` }}>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type to search…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "6px 10px", borderRadius: 6,
              border: `1.5px solid ${DEFAULT_BORDER}`,
              fontSize: 12, fontFamily: DEFAULT_FONT,
              outline: "none", background: "#f9fafb", color: DEFAULT_TEXT1,
            }}
          />
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1, padding: "4px" }}>
        {/* Empty/placeholder option */}
        {placeholder && (
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer",
              fontFamily: DEFAULT_FONT, fontSize: 13, textAlign: "left",
              background: !value ? `${accentColor}12` : "transparent",
              color: !value ? accentColor : DEFAULT_TEXT3,
              fontWeight: !value ? 600 : 400,
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = "#f5f5f7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = !value ? `${accentColor}12` : "transparent"; }}
          >
            <span style={{ width: 14 }}>{!value && (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}</span>
            {placeholder}
          </button>
        )}
        {filtered.length === 0 && (
          <div style={{ padding: "10px 12px", fontSize: 12, color: DEFAULT_TEXT3 }}>No results</div>
        )}
        {filtered.map(o => {
          const active = String(o.value) === String(value);
          return (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: DEFAULT_FONT, fontSize: 13, textAlign: "left",
                background: active ? `${accentColor}12` : "transparent",
                color: active ? accentColor : DEFAULT_TEXT1,
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f5f5f7"; }}
              onMouseLeave={e => { e.currentTarget.style.background = active ? `${accentColor}12` : "transparent"; }}
            >
              <span style={{ width: 14, flexShrink: 0 }}>{active && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={disabled}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 10px", borderRadius: 8,
          border: `1.5px solid ${open ? accentColor : DEFAULT_BORDER}`,
          background: disabled ? "#f9fafb" : DEFAULT_BG,
          fontSize: 13, fontFamily: DEFAULT_FONT,
          color: selected ? DEFAULT_TEXT1 : DEFAULT_TEXT3,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left", outline: "none", boxSizing: "border-box",
          transition: "border-color 0.12s",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ flexShrink: 0, marginLeft: 4, opacity: 0.45,
            transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
