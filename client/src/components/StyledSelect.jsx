// StyledSelect — drop-in replacement for <select> that matches Vercentic UI
// Usage: <StyledSelect value={v} onChange={v => set(v)} options={[{value:'a',label:'A',color:'#hex'}]} placeholder="All" />
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const F = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function StyledSelect({
  value,
  onChange,
  options = [],        // [{ value, label, color?, icon?, badge?, badgeColor?, disabled? }]
  placeholder = "Select…",
  size = "md",         // "sm" | "md" | "lg"
  variant = "default", // "default" | "ghost" | "pill"
  width,
  style = {},
  dropdownWidth,
  maxHeight = 280,
  disabled = false,
  allowClear = false,
  searchable = false,  // show search input inside dropdown
}) {
  const [open, setOpen]     = useState(false);
  const [pos,  setPos]      = useState({ top: 0, left: 0, width: 0 });
  const [q,    setQ]        = useState('');
  const ref                 = useRef(null);
  const dropRef             = useRef(null);  // ref for the portal dropdown

  const sel = options.find(o => String(o.value) === String(value));
  const visibleOptions = (searchable && q)
    ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  // Position the dropdown portal
  const openDropdown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) { setQ(''); return; }
    const h = e => {
      // Exclude both the trigger and the portal dropdown from outside-click
      if (ref.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Size tokens
  const sz = {
    sm: { fontSize: 13, padding: "7px 10px",          borderRadius: 8,  gap: 6,  iconSize: 13 },
    md: { fontSize: 13, padding: "7px 10px",            borderRadius: 9,  gap: 7,  iconSize: 14 },
    lg: { fontSize: 14, padding: "9px 12px 9px 12px", borderRadius: 10, gap: 8,  iconSize: 16 },
  }[size] || {};

  // Variant styles for trigger button
  const variantStyle = {
    default: { background: "var(--t-surface, white)", border: "1.5px solid var(--t-border, #e5e7eb)", color: "var(--t-text1, #111827)" },
    ghost:   { background: "transparent", border: "1.5px solid transparent", color: "var(--t-text2, #374151)" },
    pill:    { background: "var(--t-surface, white)", border: "1.5px solid var(--t-border, #e5e7eb)", borderRadius: 99, color: "var(--t-text1, #111827)" },
  }[variant] || {};

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width, ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: sz.gap,
          width: "100%", padding: sz.padding, borderRadius: sz.borderRadius,
          fontSize: sz.fontSize, fontFamily: F, fontWeight: 500,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          whiteSpace: "nowrap", overflow: "hidden",
          transition: "border-color .12s, background .12s",
          outline: "none",
          ...variantStyle,
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = "var(--t-accent, #4361EE)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = variantStyle.border?.split(" ")[2] || "var(--t-border, #e5e7eb)"; }}>

        {/* Colour dot */}
        {sel?.color && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: sel.color, flexShrink: 0, display: "inline-block" }}/>
        )}

        {/* Label */}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", textAlign: "left",
          color: sel ? "var(--t-text1, #111827)" : "var(--t-text3, #9ca3af)" }}>
          {sel ? sel.label : placeholder}
        </span>

        {/* Chevron */}
        <svg width={10} height={10} viewBox="0 0 10 10" style={{ flexShrink: 0, opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown portal */}
      {open && createPortal(
        <div ref={dropRef} style={{
          position: "fixed", top: pos.top, left: pos.left,
          width: dropdownWidth || Math.max(pos.width, 220),
          maxHeight, overflowY: "auto",
          background: "white", border: "1.5px solid #e5e7eb",
          borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,.13)",
          zIndex: 9900, fontFamily: F, padding: "4px 0",
        }}>
          {/* Clear option */}
          {allowClear && value && (
            <>
              <button onClick={() => { onChange(""); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
                  border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af",
                  textAlign: "left", fontFamily: F }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Clear
              </button>
              <div style={{ height: 1, background: "#f3f4f6", margin: "2px 0" }}/>
            </>
          )}

          {searchable && (
            <div style={{ padding: "8px 10px 4px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ position: "relative" }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search…"
                  onClick={e => e.stopPropagation()}
                  style={{ width:"100%", boxSizing:"border-box", paddingLeft:26, paddingRight:8, paddingTop:5, paddingBottom:5, borderRadius:6, border:"1.5px solid #e5e7eb", fontSize:12, fontFamily:F, outline:"none", color:"#111827" }}
                />
              </div>
            </div>
          )}

          {visibleOptions.map((opt, i) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button key={opt.value ?? i}
                onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                disabled={opt.disabled}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 12px", border: "none", textAlign: "left",
                  fontFamily: F, fontSize: 13, cursor: opt.disabled ? "default" : "pointer",
                  background: isSelected ? `${opt.color || "#4361EE"}10` : "none",
                  color: isSelected ? (opt.color || "#4361EE") : (opt.disabled ? "#9ca3af" : "#111827"),
                  fontWeight: isSelected ? 700 : 400,
                  opacity: opt.disabled ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!opt.disabled && !isSelected) e.currentTarget.style.background = "#f8f9fc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? `${opt.color || "#4361EE"}10` : "none"; }}>

                {/* Colour dot */}
                {opt.color && <span style={{ width: 9, height: 9, borderRadius: "50%", background: opt.color, flexShrink: 0, display: "inline-block" }}/>}

                {/* Label + badge */}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {opt.badge && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: opt.badgeColor ? opt.badgeColor + "18" : "#f3f4f6", color: opt.badgeColor || "#6b7280", fontWeight: 600 }}>{opt.badge}</span>}

                {/* Checkmark */}
                {isSelected && (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
