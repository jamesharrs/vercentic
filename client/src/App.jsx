import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";

// Heavy modules — loaded on demand only when navigated to
const SettingsPage    = lazy(() => import("./Settings.jsx"));
const OrgChart        = lazy(() => import("./OrgChart.jsx"));
const SearchPage      = lazy(() => import("./Search.jsx"));
const Dashboard          = lazy(() => import("./Dashboard.jsx"));
const InterviewDashboard = lazy(() => import("./InterviewDashboard.jsx"));
const OfferDashboard     = lazy(() => import("./OfferDashboard.jsx"));
const ObjectApp       = lazy(() => import("./ObjectApp.jsx"));
const WorkflowsPage   = lazy(() => import("./Workflows.jsx"));
const PortalsPage     = lazy(() => import("./Portals.jsx"));
const ReportsPage     = lazy(() => import("./Reports.jsx"));
const Interviews      = lazy(() => import("./Interviews.jsx"));
const OffersModule    = lazy(() => import("./Offers.jsx"));
const AgentsModule    = lazy(() => import("./Agents.jsx"));
const SuperAdminConsole = lazy(() => import("./SuperAdminConsole.jsx"));

// Records loaded eagerly — used everywhere for record detail navigation
import RecordsView, { RecordDetail } from "./Records.jsx";
import { AICopilot, MatchingEngine } from "./AI.jsx";
import { ThemeProvider, useTheme, SCHEMES, FONTS, DENSITIES } from "./Theme.jsx";
import { useI18n } from "./i18n/I18nContext.jsx";
import LoginPage from "./LoginPage.jsx";
import CalendarModule from "./Calendar.jsx";
import BotInterview from "./BotInterview.jsx";
import { getSession, clearSession } from "./usePermissions.js";

// ─── API Client ───────────────────────────────────────────────────────────────
// Derive tenant slug — session takes priority, then URL param, then subdomain
function getTenantSlug() {
  // 1. Session (set at login, most reliable)
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  } catch {}
  // 2. URL query param ?tenant=slug
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenant')) return params.get('tenant');
  // 3. Subdomain (e.g. acme.talentos.io)
  const host = window.location.hostname;
  const parts = host.split('.');
  const reserved = ['www','app','api','admin','localhost','client','portal'];
  if (parts.length >= 2 && !reserved.includes(parts[0]) && !['vercel','railway','localhost'].some(r => host.includes(r))) {
    return parts[0];
  }
  return null;
}

// TENANT_SLUG is re-evaluated per request so it picks up the session after login
function apiHeaders(extra = {}) {
  const slug = getTenantSlug();
  const h = { 'Content-Type': 'application/json', ...extra };
  if (slug) h['X-Tenant-Slug'] = slug;
  return h;
}

const api = {
  get: (path) => { const slug = getTenantSlug(); return fetch(`/api${path}`, { headers: slug ? { 'X-Tenant-Slug': slug } : {} }).then(r => r.json()); },
  post: (path, body) => fetch(`/api${path}`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
  patch: (path, body) => fetch(`/api${path}`, { method: "PATCH", headers: apiHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
  delete: (path) => { const slug = getTenantSlug(); return fetch(`/api${path}`, { method: "DELETE", headers: slug ? { 'X-Tenant-Slug': slug } : {} }).then(r => r.json()); },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "T", group: "Basic" },
  { value: "textarea", label: "Long Text", icon: "¶", group: "Basic" },
  { value: "number", label: "Number", icon: "#", group: "Basic" },
  { value: "email", label: "Email", icon: "@", group: "Basic" },
  { value: "phone", label: "Phone", icon: "☎", group: "Basic" },
  { value: "url", label: "URL", icon: "🔗", group: "Basic" },
  { value: "date", label: "Date", icon: "📅", group: "Date & Time" },
  { value: "datetime", label: "Date & Time", icon: "🕐", group: "Date & Time" },
  { value: "boolean", label: "Boolean", icon: "◉", group: "Basic" },
  { value: "select", label: "Select", icon: "▾", group: "Choice" },
  { value: "multi_select", label: "Multi Select", icon: "☑", group: "Choice" },
  { value: "lookup", label: "Lookup", icon: "↗", group: "Relationship" },
  { value: "multi_lookup", label: "Multi Lookup", icon: "↗↗", group: "Relationship" },
  { value: "currency", label: "Currency", icon: "$", group: "Basic" },
  { value: "rating", label: "Rating", icon: "★", group: "Basic" },
  { value: "rich_text", label: "Rich Text", icon: "Ω", group: "Basic" },
];

const ICONS = ["users", "briefcase", "layers", "star", "heart", "zap", "globe", "flag", "box", "tag", "award", "target", "compass", "database", "grid", "list", "activity", "settings"];
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const paths = {
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    layers: "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    plus: "M12 5v14M5 12h14",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    chevronRight: "M9 18l6-6-6-6",
    chevronDown: "M6 9l6 6 6-6",
    grip: "M9 5h2M9 12h2M9 19h2M15 5h2M15 12h2M15 19h2",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    database: "M12 2C8.13 2 5 3.34 5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5c0-1.66-3.13-3-7-3zM5 12c0 1.66 3.13 3 7 3s7-1.34 7-3M5 8c0 1.66 3.13 3 7 3s7-1.34 7-3",
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8h.01M12 12v4",
    arrowLeft: "M19 12H5M12 19l-7-7 7-7",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
    circle: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
    box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    award: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
    workflow: "M22 12h-4l-3 9L9 3l-3 9H2",
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "bar-chart-2": "M18 20V10M12 20V4M6 20v-6",
    "git-branch": "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    calendar: "M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    "calendar-days": "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 14h.01M13 14h.01M17 14h.01M9 18h.01M13 18h.01",
    dollar: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z",
    gitBranch: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    "file-text": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    image: "M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] && <path d={paths[name]} />}
    </svg>
  );
};

// ─── Utility Components ───────────────────────────────────────────────────────
const Badge = ({ children, color = "#6366f1", light = false }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
    background: light ? `${color}18` : color,
    color: light ? color : "white",
    border: `1px solid ${color}30`
  }}>
    {children}
  </span>
);

const Button = ({ children, onClick, variant = "primary", size = "md", icon, disabled, style = {} }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "inherit", fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 8, transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1,
    ...(size === "sm" ? { fontSize: 12, padding: "5px 10px" } : { fontSize: 13, padding: "8px 14px" }),
  };
  const variants = {
    primary: { background: "#1a1a2e", color: "white" },
    secondary: { background: "#f5f5f7", color: "#1a1a2e", border: "1px solid #e5e5ea" },
    ghost: { background: "transparent", color: "#6b7280" },
    danger: { background: "#fee2e2", color: "#ef4444" },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", required, help, style = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.02em" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>}
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea",
        fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%",
        background: "white", color: "#1a1a2e", boxSizing: "border-box",
        ...style
      }}
    />
    {help && <span style={{ fontSize: 11, color: "#9ca3af" }}>{help}</span>}
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.02em" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea",
      fontSize: 13, fontFamily: "inherit", outline: "none", background: "white",
      color: "#1a1a2e", cursor: "pointer"
    }}>
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <div onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 99, position: "relative",
      background: checked ? "#1a1a2e" : "#d1d5db", transition: "background 0.2s",
      flexShrink: 0
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "white",
        position: "absolute", top: 2, left: checked ? 18 : 2,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
    {label && <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>}
  </label>
);

const Modal = ({ title, children, onClose, width = 520 }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: "white", borderRadius: 16, width: "100%", maxWidth: width,
      boxShadow: "0 25px 50px rgba(0,0,0,0.15)", maxHeight: "90vh", overflow: "auto"
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid #f0f0f0"
      }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#9ca3af" }}>
          <Icon name="x" size={18} />
        </button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

// ─── Field Type Pill ──────────────────────────────────────────────────────────
const FieldTypePill = ({ type }) => {
  const ft = FIELD_TYPES.find(f => f.value === type) || { icon: "?", label: type };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
      background: "#f5f5f7", borderRadius: 6, fontSize: 11, fontWeight: 600,
      color: "#6b7280", fontFamily: "ui-monospace, monospace"
    }}>
      <span style={{ fontSize: 10 }}>{ft.icon}</span> {ft.label}
    </span>
  );
};

// ─── Add/Edit Field Modal ─────────────────────────────────────────────────────
const FieldModal = ({ field, objectId, environmentId, objects, onSave, onClose }) => {
  const isEdit = !!field?.id;
  const [form, setForm] = useState({
    name: field?.name || "",
    api_key: field?.api_key || "",
    field_type: field?.field_type || "text",
    is_required: field?.is_required || false,
    is_unique: field?.is_unique || false,
    show_in_list: field?.show_in_list !== undefined ? !!field.show_in_list : true,
    show_in_form: field?.show_in_form !== undefined ? !!field.show_in_form : true,
    placeholder: field?.placeholder || "",
    help_text: field?.help_text || "",
    default_value: field?.default_value || "",
    options: field?.options ? (Array.isArray(field.options) ? field.options.join(", ") : field.options) : "",
    lookup_object_id: field?.lookup_object_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [autoKey, setAutoKey] = useState(!isEdit);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNameChange = (v) => {
    set("name", v);
    if (autoKey) {
      set("api_key", v.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/g, ""));
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.api_key) return;
    setSaving(true);
    const payload = {
      ...form,
      object_id: objectId,
      environment_id: environmentId,
      options: ["select", "multi_select"].includes(form.field_type)
        ? form.options.split(",").map(s => s.trim()).filter(Boolean)
        : undefined,
    };
    await onSave(payload, field?.id);
    setSaving(false);
  };

  const needsOptions = ["select", "multi_select"].includes(form.field_type);
  const needsLookup = ["lookup", "multi_lookup"].includes(form.field_type);

  return (
    <Modal title={isEdit ? `Edit Field: ${field.name}` : "Add New Field"} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Field Type *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {FIELD_TYPES.map(ft => (
              <button key={ft.value} onClick={() => set("field_type", ft.value)} style={{
                padding: "8px 6px", borderRadius: 8, border: "2px solid",
                borderColor: form.field_type === ft.value ? "#1a1a2e" : "#e5e5ea",
                background: form.field_type === ft.value ? "#1a1a2e" : "white",
                color: form.field_type === ft.value ? "white" : "#6b7280",
                cursor: "pointer", fontSize: 11, fontWeight: 600, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2
              }}>
                <span style={{ fontSize: 14 }}>{ft.icon}</span>
                <span>{ft.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Field Name" value={form.name} onChange={handleNameChange} placeholder="e.g. Current Title" required />
          <Input label="API Key" value={form.api_key} onChange={v => { set("api_key", v); setAutoKey(false); }}
            placeholder="e.g. current_title" help="Used in API and data exports" disabled={isEdit && field?.is_system} />
        </div>

        {needsOptions && (
          <Input label="Options (comma-separated)" value={form.options}
            onChange={v => set("options", v)} placeholder="Option A, Option B, Option C" />
        )}

        {needsLookup && (
          <Select label="Link to Object" value={form.lookup_object_id}
            onChange={v => set("lookup_object_id", v)}
            options={[{ value: "", label: "Select object..." }, ...objects.map(o => ({ value: o.id, label: o.name }))]} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Placeholder" value={form.placeholder} onChange={v => set("placeholder", v)} placeholder="Hint text" />
          <Input label="Help Text" value={form.help_text} onChange={v => set("help_text", v)} placeholder="Description for users" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, background: "#f9f9fb", borderRadius: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 2 }}>Field Settings</span>
          <Toggle checked={form.is_required} onChange={v => set("is_required", v)} label="Required field" />
          <Toggle checked={form.is_unique} onChange={v => set("is_unique", v)} label="Unique values only" />
          <Toggle checked={form.show_in_list} onChange={v => set("show_in_list", v)} label="Show in list view" />
          <Toggle checked={form.show_in_form} onChange={v => set("show_in_form", v)} label="Show in form" />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.api_key}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Field"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Create Object Modal ──────────────────────────────────────────────────────
const CreateObjectModal = ({ environmentId, onSave, onClose }) => {
  const [form, setForm] = useState({ name: "", plural_name: "", slug: "", icon: "circle", color: "#6366f1", description: "" });
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [autoPlural, setAutoPlural] = useState(true);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNameChange = (v) => {
    set("name", v);
    if (autoSlug) set("slug", v.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, ""));
    if (autoPlural) set("plural_name", v + "s");
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    await onSave({ ...form, environment_id: environmentId });
    setSaving(false);
  };

  return (
    <Modal title="Create New Object" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Object Name" value={form.name} onChange={handleNameChange} placeholder="e.g. Application" required />
          <Input label="Plural Name" value={form.plural_name} onChange={v => { set("plural_name", v); setAutoPlural(false); }} placeholder="e.g. Applications" />
        </div>
        <Input label="Slug (URL key)" value={form.slug} onChange={v => { set("slug", v); setAutoSlug(false); }}
          placeholder="e.g. applications" help="Used in API and URLs" />
        <Input label="Description" value={form.description} onChange={v => set("description", v)} placeholder="What is this object used for?" />

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Color</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => set("color", c)} style={{
                width: 28, height: 28, borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: 2
              }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.slug} style={{ background: form.color }}>
            {saving ? "Creating..." : "Create Object"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Field Row ────────────────────────────────────────────────────────────────
const FieldRow = ({ field, onEdit, onDelete }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "white", borderRadius: 10, border: "1px solid #f0f0f0",
    transition: "border-color 0.15s",
  }} onMouseEnter={e => e.currentTarget.style.borderColor = "#d1d5db"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "#f0f0f0"}>
    <div style={{ color: "#d1d5db", cursor: "grab", flexShrink: 0 }}>
      <Icon name="grip" size={14} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{field.name}</span>
        {field.is_system ? <Badge color="#6b7280" light>system</Badge> : null}
        {field.is_required ? <Badge color="#ef4444" light>required</Badge> : null}
        {field.is_unique ? <Badge color="#f59e0b" light>unique</Badge> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
        <code style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace, monospace" }}>{field.api_key}</code>
        {field.help_text && <span style={{ fontSize: 11, color: "#9ca3af" }}>· {field.help_text}</span>}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <FieldTypePill type={field.field_type} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span title={field.show_in_list ? "Visible in list" : "Hidden from list"} style={{ color: field.show_in_list ? "#10b981" : "#d1d5db" }}>
          <Icon name={field.show_in_list ? "eye" : "eyeOff"} size={13} />
        </span>
      </div>
      <button onClick={() => onEdit(field)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, borderRadius: 6, color: "#9ca3af" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f7"; e.currentTarget.style.color = "#374151"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}>
        <Icon name="edit" size={13} />
      </button>
      {!field.is_system && (
        <button onClick={() => onDelete(field)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, borderRadius: 6, color: "#9ca3af" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}>
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  </div>
);

// ─── Object Schema View ───────────────────────────────────────────────────────
const ObjectSchemaView = ({ object, allObjects, environmentId, onBack }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [search, setSearch] = useState("");

  const loadFields = useCallback(async () => {
    const data = await api.get(`/fields?object_id=${object.id}`);
    setFields(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [object.id]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleSaveField = async (payload, fieldId) => {
    if (fieldId) await api.patch(`/fields/${fieldId}`, payload);
    else await api.post("/fields", payload);
    await loadFields();
    setShowAddField(false);
    setEditingField(null);
  };

  const handleDeleteField = async (field) => {
    if (!confirm(`Delete field "${field.name}"? This will remove data for all records.`)) return;
    await api.delete(`/fields/${field.id}`);
    loadFields();
  };

  const filtered = fields.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.api_key.includes(search.toLowerCase()));
  const systemFields = filtered.filter(f => f.is_system);
  const customFields = filtered.filter(f => !f.is_system);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#6b7280", display: "flex" }}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: object.color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={object.icon || "circle"} size={16} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{object.name} Schema</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{fields.length} fields · {object.is_system ? "System object" : "Custom object"}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fields…"
              style={{ padding: "7px 10px 7px 32px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", outline: "none", width: 200 }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
              <Icon name="search" size={13} />
            </span>
          </div>
          <Button icon="plus" onClick={() => setShowAddField(true)}>Add Field</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading fields…</div>
      ) : (
        <div>
          {systemFields.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>System Fields</span>
                <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
                <Badge color="#6b7280" light>{systemFields.length}</Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {systemFields.map(f => <FieldRow key={f.id} field={f} onEdit={setEditingField} onDelete={handleDeleteField} />)}
              </div>
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>Custom Fields</span>
              <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
              <Badge color="#6366f1" light>{customFields.length}</Badge>
            </div>
            {customFields.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", border: "2px dashed #e5e5ea", borderRadius: 12, color: "#9ca3af" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>＋</div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No custom fields yet</p>
                <p style={{ margin: "4px 0 16px", fontSize: 12 }}>Add fields to capture additional data for {object.name}</p>
                <Button icon="plus" onClick={() => setShowAddField(true)}>Add Your First Field</Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {customFields.map(f => <FieldRow key={f.id} field={f} onEdit={setEditingField} onDelete={handleDeleteField} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {(showAddField || editingField) && (
        <FieldModal field={editingField} objectId={object.id} environmentId={environmentId} objects={allObjects}
          onSave={handleSaveField} onClose={() => { setShowAddField(false); setEditingField(null); }} />
      )}
    </div>
  );
};

// ─── Objects List View ────────────────────────────────────────────────────────
const ObjectsListView = ({ environment, onSelectObject, mode = "schema" }) => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadObjects = useCallback(async () => {
    const data = await api.get(`/objects?environment_id=${environment.id}`);
    setObjects(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [environment.id]);

  useEffect(() => { loadObjects(); }, [loadObjects]);

  const handleCreate = async (payload) => {
    await api.post("/objects", payload);
    await loadObjects();
    setShowCreate(false);
  };

  const systemObjects = objects.filter(o => o.is_system);
  const customObjects = objects.filter(o => !o.is_system);

  const ObjectCard = ({ obj }) => (
    <div onClick={() => onSelectObject(obj, objects)} style={{
      padding: "18px 20px", background: "white", borderRadius: 14,
      border: "1px solid #f0f0f0", cursor: "pointer", transition: "all 0.15s",
      display: "flex", alignItems: "center", gap: 14
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: obj.color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={obj.icon || "circle"} size={20} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{obj.plural_name || obj.name}</span>
          {obj.is_system && <Badge color="#6b7280" light>system</Badge>}
        </div>
        {obj.description && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{obj.description}</p>}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}><strong>{obj.field_count || 0}</strong> fields</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}><strong>{obj.record_count || 0}</strong> records</span>
        </div>
      </div>
      <Icon name="chevronRight" size={16} color="#d1d5db" />
    </div>
  );

  const title = mode === "app" ? "Choose an Object" : "Data Model";
  const subtitle = mode === "app"
    ? `Select an object to view and manage records in ${environment.name}`
    : `Configure objects and their fields for ${environment.name}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>{subtitle}</p>
        </div>
        {mode === "schema" && <Button icon="plus" onClick={() => setShowCreate(true)}>New Object</Button>}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[{ label: "Core Objects", items: systemObjects }, { label: "Custom Objects", items: customObjects }].map(group => (
            <div key={group.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>{group.label}</span>
                <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
              </div>
              {group.items.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center", border: "2px dashed #e5e5ea", borderRadius: 14, color: "#9ca3af" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>No custom objects yet</p>
                  {mode === "schema" && <Button icon="plus" onClick={() => setShowCreate(true)}>Create Custom Object</Button>}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {group.items.map(o => <ObjectCard key={o.id} obj={o} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateObjectModal environmentId={environment.id} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
};

// ─── Environment Badge ────────────────────────────────────────────────────────
const EnvironmentBadge = ({ env, selected, onClick }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 7, padding: "6px 12px",
    borderRadius: 8, border: "2px solid", cursor: "pointer",
    borderColor: selected ? env.color || "#6366f1" : "transparent",
    background: selected ? `${env.color || "#6366f1"}10` : "transparent",
    color: selected ? env.color || "#6366f1" : "#6b7280",
    fontSize: 13, fontWeight: selected ? 700 : 500, fontFamily: "inherit",
    transition: "all 0.15s", width: "100%", textAlign: "left"
  }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: env.color || "#6366f1", flexShrink: 0 }} />
    {env.name}
  </button>
);

// ─── Global Search Bar ────────────────────────────────────────────────────────
const GlobalSearch = ({ selectedEnv, navObjects, onNavigateToSearch, onNavigateToRecord, onCreateRecord }) => {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const ref       = useRef(null);
  const createRef = useRef(null);
  const timer     = useRef(null);

  useEffect(() => {
    const h = (e) => { if (createRef.current && !createRef.current.contains(e.target)) setShowCreate(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (q) => {
    if (!q.trim() || !selectedEnv) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await fetch(`/api/records/search?q=${encodeURIComponent(q)}&environment_id=${selectedEnv.id}&limit=6`).then(r => r.json());
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(() => search(q), 220);
  };

  const handleAdvanced = () => {
    setOpen(false);
    onNavigateToSearch(query);
  };

  const OBJECT_COLORS = { people: "#3b5bdb", jobs: "#0ca678", "talent-pools": "#7c3aed" };

  return (
    <div ref={ref} style={{ position: "sticky", top: 0, zIndex: 600, background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)", padding: "10px 32px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
        {/* Input */}
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder="Search candidates, jobs, talent pools…"
          style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 10, border: `1.5px solid ${open ? "var(--t-accent)" : "var(--t-border)"}`, fontSize: 13, fontFamily: "var(--t-font, 'DM Sans', sans-serif)", outline: "none", background: "var(--t-surface2)", color: "var(--t-text1)", boxSizing: "border-box", transition: "border-color .15s" }}
        />
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: open ? "var(--t-accent)" : "var(--t-text3)", display: "flex", pointerEvents: "none", transition: "color .15s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
        </span>

        {/* Dropdown */}
        {open && query && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--t-surface)", borderRadius: 12, border: "1px solid var(--t-border)", boxShadow: "0 8px 32px rgba(0,0,0,.15)", zIndex: 300, overflow: "hidden" }}>
            {loading && (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--t-text3)" }}>Searching…</div>
            )}
            {!loading && results.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--t-text3)" }}>No results for "{query}"</div>
            )}
            {!loading && results.map((r) => {
              const color = r.object_color || OBJECT_COLORS[r.object_slug] || "#6366f1";
              const d = r.data || {};
              const name = r.display_name
                || (d.first_name ? `${d.first_name} ${d.last_name||""}`.trim() : null)
                || d.job_title
                || d.pool_name
                || d.name
                || "Untitled";
              const sub = d.current_title || d.department || d.category || d.description?.slice(0,60) || d.email || "";
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--t-border2)", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--t-surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--t-surface)"}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onNavigateToRecord?.(r.id, r.object_id);                  }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{(name||"?").charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                    {sub && <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: color, background: `${color}15`, padding: "2px 7px", borderRadius: 99, whiteSpace: "nowrap", textTransform: "capitalize" }}>{r.object_name || r.object_slug}</span>
                </div>
              );
            })}
            {/* Advanced search footer */}
            <div onClick={handleAdvanced} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", background: "var(--t-surface2)", borderTop: "1px solid var(--t-border)", transition: "background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-accent-light)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--t-surface2)"}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-accent)" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3"/></svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t-accent)" }}>Advanced search for "{query}"</span>
              <svg style={{ marginLeft: "auto" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t-text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        )}
      </div>
      {/* Create dropdown */}
      <div ref={createRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            border: "none", background: showCreate ? "var(--t-accent-dark, #3451d1)" : "var(--t-accent)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--t-font, 'DM Sans', sans-serif)",
            boxShadow: "0 2px 8px rgba(67,97,238,.3)", transition: "background .12s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Create
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.7 }}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showCreate && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
            background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 12,
            boxShadow: "0 8px 28px rgba(0,0,0,.14)", minWidth: 200, overflow: "hidden" }}>
            <div style={{ padding: "8px 12px 6px", fontSize: 10, fontWeight: 700, color: "var(--t-text3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              New record
            </div>
            {(navObjects || []).map(obj => (
              <div key={obj.id}
                onClick={() => { setShowCreate(false); onCreateRecord?.(obj); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                  cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--t-surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `${obj.color || "var(--t-accent)"}18`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={obj.icon || "layers"} size={13} color={obj.color || "var(--t-accent)"} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text1)" }}>{obj.singular_name || obj.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Theme Panel ──────────────────────────────────────────────────────────────
function ThemePanel({ onClose }) {
  const { prefs, update } = useTheme();

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:200,backdropFilter:"blur(2px)" }} />
      {/* Panel */}
      <div style={{ position:"fixed",bottom:24,left:228,zIndex:201,width:280,background:"var(--t-surface)",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",border:"1px solid var(--t-border)",overflow:"hidden",fontFamily:"var(--t-font)" }}>
        {/* Header */}
        <div style={{ padding:"16px 18px 12px",borderBottom:"1px solid var(--t-border)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--t-text1)" }}>Appearance</div>
            <div style={{ fontSize:11,color:"var(--t-text3)" }}>Personalise your workspace</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:"var(--t-text3)",display:"flex" }}>
            <Icon name="x" size={16} color="var(--t-text3)" />
          </button>
        </div>

        <div style={{ padding:"14px 18px",display:"flex",flexDirection:"column",gap:18 }}>

          {/* Dark mode */}
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--t-text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Mode</div>
            <div style={{ display:"flex",gap:6 }}>
              {[{id:false,label:"☀️ Light"},{id:true,label:"🌙 Dark"}].map(({id,label}) => (
                <button key={String(id)} onClick={() => update("dark", id)} style={{
                  flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid ${prefs.dark===id?"var(--t-accent)":"var(--t-border)"}`,
                  background:prefs.dark===id?"var(--t-accent-light)":"var(--t-surface2)",
                  color:prefs.dark===id?"var(--t-accent)":"var(--t-text2)",
                  fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Colour scheme */}
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--t-text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Colour</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6 }}>
              {Object.entries(SCHEMES).map(([id, s]) => (
                <button key={id} onClick={() => update("scheme", id)} title={s.label} style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",
                  borderRadius:8,border:`1.5px solid ${prefs.scheme===id?"var(--t-accent)":"var(--t-border)"}`,
                  background:prefs.scheme===id?"var(--t-accent-light)":"var(--t-surface2)",
                  cursor:"pointer",fontFamily:"inherit"
                }}>
                  <div style={{ display:"flex",gap:2 }}>
                    <span style={{ width:10,height:10,borderRadius:"50%",background:s.accentDark,display:"inline-block" }}/>
                    <span style={{ width:10,height:10,borderRadius:"50%",background:s.accent,display:"inline-block" }}/>
                  </div>
                  <span style={{ fontSize:9,fontWeight:600,color:prefs.scheme===id?"var(--t-accent)":"var(--t-text3)" }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--t-text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Font</div>
            <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
              {Object.entries(FONTS).map(([id, f]) => (
                <button key={id} onClick={() => update("font", id)} style={{
                  padding:"8px 12px",borderRadius:8,border:`1.5px solid ${prefs.font===id?"var(--t-accent)":"var(--t-border)"}`,
                  background:prefs.font===id?"var(--t-accent-light)":"var(--t-surface2)",
                  color:prefs.font===id?"var(--t-accent)":"var(--t-text2)",
                  fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:f.value,textAlign:"left",
                  display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.15s"
                }}>
                  <span>{f.label}</span>
                  <span style={{ fontSize:10,opacity:0.6 }}>Aa</span>
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--t-text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Density</div>
            <div style={{ display:"flex",gap:6 }}>
              {Object.entries(DENSITIES).map(([id, d]) => (
                <button key={id} onClick={() => update("density", id)} style={{
                  flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid ${prefs.density===id?"var(--t-accent)":"var(--t-border)"}`,
                  background:prefs.density===id?"var(--t-accent-light)":"var(--t-surface2)",
                  color:prefs.density===id?"var(--t-accent)":"var(--t-text2)",
                  fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"
                }}>{d.label}</button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Record Page ─────────────────────────────────────────────────────────────
// Standalone page — no overlay, no z-index, just a regular routed view
function RecordPage({ recordId, objectId, environment, allObjects, onBack, onNavigate }) {
  const [state, setState] = useState(null); // { record, fields, object }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recordId || !objectId) return;
    setLoading(true);
    const load = async () => {
      let obj = allObjects?.find(o => o.id === objectId);
      if (!obj) {
        const objs = await api.get(`/objects?environment_id=${environment?.id}`);
        obj = Array.isArray(objs) ? objs.find(o => o.id === objectId) : null;
      }
      if (!obj) { setLoading(false); return; }
      const [recResp, fields] = await Promise.all([
        api.get(`/records/${recordId}`),
        api.get(`/fields?object_id=${objectId}`),
      ]);
      const record = recResp?.id ? recResp : null;
      if (!record) { setLoading(false); return; }
      setState({ record, fields: Array.isArray(fields) ? fields : [], object: obj });
      setLoading(false);
    };
    load();
  }, [recordId, objectId, environment?.id]);

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af" }}>Loading…</div>;
  if (!state) return <div style={{ padding:40, color:"#9ca3af" }}>Record not found.</div>;

  const { record, fields, object } = state;

  return (
    <RecordDetail
      record={record}
      fields={fields}
      environment={environment}
      objectName={object.name}
      objectColor={object.color || "#4361EE"}
      fullPage={true}
      onClose={onBack}
      onToggleFullPage={() => {}}
      onUpdate={(updated) => setState(s => s ? { ...s, record: updated } : s)}
      onDelete={async (id) => { await api.delete(`/records/${id}`); onBack(); }}
      onNavigate={onNavigate}
    />
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  // Super Admin route — completely separate from main app
  if (window.location.pathname === '/superadmin') {
    return <SuperAdminConsole />;
  }

  // Bot interview route — public, no login required
  const botToken = window.location.pathname.match(/^\/bot\/(.+)$/)?.[1];
  if (botToken) {
    return <BotInterview token={botToken} />;
  }

  const { prefs, update } = useTheme();
  const { t, isRTL } = useI18n();
  const [session, setSession]   = useState(() => getSession()); // { user, role, permissions }
  const [environments, setEnvironments] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [allObjects, setAllObjects] = useState([]);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [dashFlyout, setDashFlyout] = useState(false);
  const [navObjects, setNavObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);
  const [showTheme, setShowTheme] = useState(false);
  const [filterPreset, setFilterPreset] = useState(null);
  const [reportPreset, setReportPreset] = useState(null);
  const [createTarget, setCreateTarget] = useState(null); // obj to auto-open new record modal

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    if (apiOnline !== true) return;
    api.get("/environments").then(data => {
      const envs = Array.isArray(data) ? data : [];
      setEnvironments(envs);
      // If the logged-in user belongs to a specific environment, use that.
      // Otherwise fall back to the default or first environment.
      const userEnvId = session?.user?.environment_id;
      const def = (userEnvId && envs.find(e => e.id === userEnvId))
               || envs.find(e => e.is_default)
               || envs[0];
      if (def) setSelectedEnv(def);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiOnline]);

  useEffect(() => {
    if (!selectedEnv?.id) return;
    api.get(`/objects?environment_id=${selectedEnv.id}`).then(d => setNavObjects(Array.isArray(d) ? d : []));
  }, [selectedEnv?.id]);

  const OBJECT_ICONS = { people: "users", jobs: "briefcase", "talent-pools": "layers" };

  const navSections = [
    {
      label: t("nav.overview"),
      items: [
        { id: "dashboard", icon: "home", label: t("nav.dashboard") },
      ]
    },
    {
      label: t("nav.recruit"),
      items: navObjects.map(o => ({ id: `obj_${o.id}`, icon: OBJECT_ICONS[o.slug] || "database", label: o.plural_name, object: o }))
    },
    {
      label: t("nav.tools"),
      items: [
        { id: "orgchart",   icon: "git-branch",  label: t("nav.orgChart") },
        { id: "interviews", icon: "calendar",     label: t("nav.interviews") },
        { id: "calendar",   icon: "calendar-days", label: t("nav.calendar") || "Calendar" },
        { id: "offers",     icon: "dollar",       label: "Offers" },
        { id: "agents",     icon: "zap",          label: "Agents" },
        { id: "matching",   icon: "zap",          label: t("nav.aiMatching") },
        { id: "reports",    icon: "bar-chart-2",  label: t("nav.reports") },
        { id: "search",     icon: "search",       label: t("nav.search") },
      ]
    },
    {
      label: t("nav.configure"),
      items: [
        { id: "settings", icon: "settings", label: t("nav.settings") },
      ]
    }
  ];

  // When on a record page, extract the parent object id for nav highlighting
  const activeObjectId = activeNav.startsWith("record_") ? activeNav.split("_")[2] : null;

  const switchNav = (id) => {
    if (!id.startsWith("obj_") || id !== activeNav) setFilterPreset(null);
    if (id !== "reports") setReportPreset(null);
    // Close dashboard flyout when navigating away from dashboard section
    if (!id.startsWith("dashboard")) setDashFlyout(false);
    // Open flyout when navigating to any dashboard sub-page
    if (id.startsWith("dashboard")) setDashFlyout(true);
    // If clicking an obj_ nav item while already on that object's record page,
    // force a re-mount by briefly resetting first
    if (id.startsWith("obj_") && (activeNav === id || activeNav.startsWith("record_"))) {
      setActiveNav("__reset__");
      setTimeout(() => { setActiveNav(id); setSelectedObject(null); }, 0);
    } else {
      setActiveNav(id);
      setSelectedObject(null);
    }
  };

  const openRecord = (recordId, objectId) => {
    setActiveNav(`record_${recordId}_${objectId}`);
  };

  // Global event listener — anything can fire talentos:openRecord to navigate to a record page
  useEffect(() => {
    const handler = (e) => {
      const { recordId, objectId } = e.detail || {};
      if (recordId && objectId) openRecord(recordId, objectId);
    };
    window.addEventListener("talentos:openRecord", handler);
    return () => window.removeEventListener("talentos:openRecord", handler);
  }, []);

  // Global event listener — dashboard fires talentos:open-report to open Reports with a preset
  useEffect(() => {
    const handler = (e) => {
      const { objectSlug, ...config } = e.detail || {};
      if (!objectSlug) return;
      const obj = navObjects.find(o => o.slug === objectSlug);
      setReportPreset({ objectId: obj?.id, objectSlug, ...config });
      setActiveNav("reports");
    };
    window.addEventListener("talentos:open-report", handler);
    return () => window.removeEventListener("talentos:open-report", handler);
  }, [navObjects]);

  // talentos:navigate — generic nav event (e.g. "← Dashboard" back button)
  useEffect(() => {
    const handler = (e) => { if (e.detail) switchNav(e.detail); };
    window.addEventListener("talentos:navigate", handler);
    return () => window.removeEventListener("talentos:navigate", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      const { fieldKey, fieldLabel, fieldValue, objectSlug } = e.detail || {};
      if (!fieldKey || fieldValue === undefined) return;
      setFilterPreset({ fieldKey, fieldLabel, fieldValue });
      // If objectSlug provided (e.g. from dashboard), navigate to that object
      if (objectSlug) {
        const obj = navObjects.find(o => o.slug === objectSlug);
        if (obj) { setActiveNav(`obj_${obj.id}`); return; }
      }
      // If on a record page, navigate back to its parent object list
      if (activeNav.startsWith("record_")) {
        const objectId = activeNav.split("_")[2];
        setActiveNav(`obj_${objectId}`);
      }
    };
    window.addEventListener("talentos:filter-navigate", handler);
    return () => window.removeEventListener("talentos:filter-navigate", handler);
  }, [activeNav, navObjects]);

  // Show login page if no session
  if (!session) {
    return <LoginPage onLogin={(s) => setSession(s)} />;
  }

  if (apiOnline === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>API Server Not Running</h2>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>Start the backend server to use TalentOS.</p>
          <div style={{ background: "#1a1a2e", color: "#a5f3fc", padding: "14px 20px", borderRadius: 10, fontFamily: "ui-monospace, monospace", fontSize: 13, marginTop: 20, textAlign: "left" }}>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}># In the server directory:</div>
            <div>node index.js</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--t-bg)", fontFamily: "var(--t-font)", display: "flex" }}>
      {/* Theme Panel */}
      {showTheme && <ThemePanel onClose={() => setShowTheme(false)} />}
      {/* Sidebar */}
      <div style={{ width: 220, background: "var(--t-nav-bg)", borderRight: "1px solid var(--t-border2)", display: "flex", flexDirection: "column", padding: "0 0 16px", position: "fixed", height: "100vh", top: 0, left: 0, zIndex: 100, overflowY: "hidden" }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--t-border2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(var(--t-gradient))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 14, fontWeight: 900 }}>T</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-text1)", lineHeight: 1 }}>TalentOS</div>
              <div style={{ fontSize: 10, color: "var(--t-text3)", letterSpacing: "0.05em" }}>PLATFORM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "8px 12px", flex: 1, overflowY: "auto", minHeight: 0 }}>
          {navSections.map(section => (
            <div key={section.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>{section.label}</div>
              {section.items.map(item => {
                const isDashboard = item.id === "dashboard";
                const dashActive = activeNav === "dashboard" || activeNav === "dashboard_interviews" || activeNav === "dashboard_offers";
                const isActive = isDashboard ? dashActive : (activeNav === item.id || (activeObjectId && item.id === `obj_${activeObjectId}`));
                return (
                  <div key={item.id} style={{ position: "relative" }}>
                    <button
                      onClick={() => isDashboard ? (setDashFlyout(o => !o), switchNav("dashboard")) : switchNav(item.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: isActive ? "var(--t-nav-active)" : "transparent",
                        color: isActive ? "var(--t-nav-active-c)" : "var(--t-nav-text)",
                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                        fontFamily: "inherit", textAlign: "left", transition: "all 0.15s", marginBottom: 2
                      }}>
                      <Icon name={item.icon} size={15} color={isActive ? "var(--t-nav-active-c)" : "var(--t-text3)"} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {isDashboard && (
                        <span style={{ fontSize: 9, color: isActive ? "var(--t-nav-active-c)" : "var(--t-text3)", opacity: 0.6, transform: dashFlyout ? "rotate(180deg)" : "none", transition: "transform .2s", display: "inline-block" }}>▼</span>
                      )}
                    </button>
                    {/* Dashboard flyout sub-items */}
                    {isDashboard && dashFlyout && (
                      <div style={{ marginLeft: 14, marginBottom: 4, borderLeft: "2px solid var(--t-border)", paddingLeft: 10 }}>
                        {[
                          { id: "dashboard",             icon: "home",     label: "Overview" },
                          { id: "dashboard_interviews",  icon: "calendar", label: "Interviews" },
                          { id: "dashboard_offers",      icon: "dollar",   label: "Offers" },
                        ].map(sub => (
                          <button key={sub.id} onClick={() => switchNav(sub.id)} style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 8px", borderRadius: 7, border: "none", cursor: "pointer",
                            background: activeNav === sub.id ? "var(--t-nav-active)" : "transparent",
                            color: activeNav === sub.id ? "var(--t-nav-active-c)" : "var(--t-nav-text)",
                            fontSize: 12, fontWeight: activeNav === sub.id ? 700 : 500,
                            fontFamily: "inherit", textAlign: "left", transition: "all 0.12s", marginBottom: 1
                          }}>
                            <Icon name={sub.icon} size={13} color={activeNav === sub.id ? "var(--t-nav-active-c)" : "var(--t-text3)"} />
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ padding: "10px 12px", background: "var(--t-surface2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--t-text2)" }}>API Connected</span>
          </div>

          {/* Logged-in user + logout */}
          {session?.user && (
            <div style={{ padding:"8px 10px", borderRadius:10, background:"var(--t-surface2)", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:session.role?.color||"#4f46e5",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"white", fontSize:11, fontWeight:700 }}>
                  {(session.user.first_name?.[0]||"")+(session.user.last_name?.[0]||"")}
                </span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--t-text1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:"1.4", paddingBottom:1 }}>
                  {session.user.first_name} {session.user.last_name}
                </div>
                <div style={{ fontSize:10, color:"var(--t-text3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:"1.4" }}>
                  {session.role?.name || ""}
                </div>
              </div>
              <button onClick={() => { clearSession(); setSession(null); }}
                title="Sign out"
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6,
                  color:"var(--t-text3)", display:"flex", alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.color="#e03131"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--t-text3)"}>
                <Icon name="log-out" size={13} color="currentColor"/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--t-bg)" }}>
        {/* Top bar */}
        <GlobalSearch selectedEnv={selectedEnv} navObjects={navObjects} onNavigateToSearch={(q) => {
          setActiveNav("search");
          if (q) {
            sessionStorage.setItem("talentos_search_query", q);
            sessionStorage.setItem("talentos_autosearch", "1");
          }
        }} onNavigateToRecord={(recordId, objectId) => openRecord(recordId, objectId)}
           onCreateRecord={(obj) => {
             // Navigate to the object list and trigger new record modal
             setActiveNav(`obj_${obj.id}`);
             setCreateTarget(obj);
           }} />
        {/* Page content */}
        <div style={{ flex: 1, padding: activeNav.startsWith("record_") ? 0 : "28px 32px", overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>Loading…</div>
        ) : !selectedEnv ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>No environments found.</div>
        ) : (
        <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
        { activeNav === "dashboard" ? (
          <Dashboard environment={selectedEnv} session={session} onOpenRecord={openRecord} onNavigate={(slug) => {
            if (slug === "matching") { setActiveNav("matching"); return; }
            if (slug === "search")   { setActiveNav("search");   return; }
            const obj = navObjects.find(o => o.slug === slug || o.plural_name.toLowerCase() === slug);
            if (obj) setActiveNav(`obj_${obj.id}`);
          }}/>
        ) : activeNav === "dashboard_interviews" ? (
          <InterviewDashboard environment={selectedEnv} session={session} onNavigate={(id) => setActiveNav(id)}/>
        ) : activeNav === "dashboard_offers" ? (
          <OfferDashboard environment={selectedEnv} session={session} onNavigate={(id) => setActiveNav(id)}/>
        ) : activeNav === "matching" ? (
          <MatchingEngine environment={selectedEnv} />
        ) : activeNav.startsWith("obj_") ? (
          <RecordsView
            object={navObjects.find(o => `obj_${o.id}` === activeNav)}
            environment={selectedEnv}
            onOpenRecord={openRecord}
            initialFilter={filterPreset}
            autoCreate={createTarget?.id === navObjects.find(o => `obj_${o.id}` === activeNav)?.id ? createTarget : null}
            onAutoCreateConsumed={() => setCreateTarget(null)}
            session={session}
          />
        ) : activeNav.startsWith("record_") ? (() => {
          const parts = activeNav.split("_"); const recordId = parts[1]; const objectId = parts[2];
          const obj = navObjects.find(o => o.id === objectId);
          return <RecordPage recordId={recordId} objectId={objectId} environment={selectedEnv} allObjects={navObjects} onBack={() => setActiveNav(obj ? `obj_${obj.id}` : "dashboard")} onNavigate={openRecord}/>;
        })() : activeNav === "search" ? (
          <SearchPage environment={selectedEnv} onNavigateToRecord={(record) => {
            openRecord(record.id, record.object_id);
          }}/>
        ) : activeNav === "reports" ? (
          <ReportsPage envId={selectedEnv?.id} initialReport={reportPreset} />
        ) : activeNav === "settings" ? (
          <SettingsPage environment={selectedEnv} />
        ) : activeNav === "orgchart" ? (
          <div style={{ padding:"28px 32px", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column" }}>
            <OrgChart environment={selectedEnv} />
          </div>
        ) : activeNav === "interviews" ? (
          <div style={{ padding:"28px 32px", flex:1, overflow:"auto" }}>
            <Interviews environment={selectedEnv} />
          </div>
        ) : activeNav === "calendar" ? (
          <CalendarModule environment={selectedEnv} />
        ) : activeNav === "offers" ? (
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <OffersModule environment={selectedEnv} />
          </div>
        ) : activeNav === "agents" ? (
          <div style={{ flex:1, overflow:"auto", padding:"0 32px" }}>
            <AgentsModule environment={selectedEnv} />
          </div>
        ) : activeNav === "schema" ? (
          selectedObject
            ? <ObjectSchemaView object={selectedObject} allObjects={allObjects} environmentId={selectedEnv.id} onBack={() => setSelectedObject(null)} />
            : <ObjectsListView environment={selectedEnv} onSelectObject={(obj, objs) => { setSelectedObject(obj); setAllObjects(objs); }} mode="schema" />
        ) : activeNav === "app" ? (
          selectedObject
            ? <RecordsView object={selectedObject} environment={selectedEnv} />
            : <ObjectsListView environment={selectedEnv} onSelectObject={(obj, objs) => { setSelectedObject(obj); setAllObjects(objs); }} mode="app" />
        ) : null}
        </Suspense>
        )}
        </div>
      </div>
      <AICopilot environment={selectedEnv} onNavigateToRecord={(record) => {
        const obj = navObjects.find(o => o.slug === record.object_slug || o.id === record.object_id);
        if (!obj) return;
        openRecord(record.id, obj.id);
      }} />
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
import { Component } from "react";
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:"monospace",color:"red"}}>
        <h2>Runtime Error</h2>
        <pre style={{whiteSpace:"pre-wrap"}}>{this.state.error?.toString()}</pre>
        <pre style={{whiteSpace:"pre-wrap",fontSize:11,color:"#555"}}>{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}

// ─── Root export wrapped in ThemeProvider ─────────────────────────────────────
export default function AppRoot() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
