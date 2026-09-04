// RecordShared.jsx — shared UI primitives used across Records module
// Import from here in extracted sub-components to avoid duplicating code
import React from 'react';
import { API_ORIGIN, authHeaders, getCsrfToken } from './apiClient.js';

export const F  = "'Plus Jakarta Sans', -apple-system, sans-serif";
export const C  = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb",
  accentLight:"#eef1ff",
};

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
/* ─── CSV helpers ────────────────────────────────────────────────────────────── */
const csvBlobDownload = async (url, filename) => {
  const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
  if (!res.ok) { console.error('CSV download failed:', res.status); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const downloadCSV = (objectId, environmentId, objectSlug) =>
  csvBlobDownload(`${API_ORIGIN}/api/csv/export?object_id=${objectId}&environment_id=${environmentId}`, `${objectSlug}-export.csv`);

export const downloadTemplate = (objectId, objectSlug) =>
  csvBlobDownload(`${API_ORIGIN}/api/csv/template?object_id=${objectId}`, `${objectSlug}-template.csv`);

export const importCSV = async (objectId, environmentId, file, mode='create') => {
  const text = await file.text();
  const csrf = getCsrfToken();
  const res = await fetch(`${API_ORIGIN}/api/csv/import?object_id=${objectId}&environment_id=${environmentId}&mode=${mode}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/csv', ...authHeaders(), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: text,
  });
  return res.json();
};

export const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    kanban:"M3 3h7v18H3zM14 3h7v11h-7zM14 17h7v4h-7z",
    plus:"M12 5v14M5 12h14",
    x:"M18 6L6 18M6 6l12 12",
    search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    chevR:"M9 18l6-6-6-6", chevL:"M15 18l-6-6 6-6", chevD:"M6 9l6 6 6-6", chevU:"M18 15l-6-6-6 6",
    chevronDown:"M6 9l6 6 6-6", chevronUp:"M18 15l-6-6-6 6",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    expand:"M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
    activity:"M22 12h-4l-3 9L9 3l-3 9H2",
    paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
    checkSquare:"M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    messageSquare:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    check:"M20 6L9 17l-5-5",
    barChart:"M12 20V10M18 20V4M6 20v-4",
    file:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
    tag:"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    form:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2M9 12h6M9 16h4",
    arrowLeft:"M19 12H5M12 19l-7-7 7-7",
    mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17zM19 2l.75 2.25L22 5l-2.25.75L19 8l-.75-2.25L16 5l2.25-.75L19 2z",
    gitBranch:"M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    clipboard:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    "file-text":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    image:"M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    calendar:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    listChecks:"M3 7l2 2 4-4M3 12l2 2 4-4M3 17l2 2 4-4M13 8h8M13 13h8M13 18h8",
    clipboardCheck:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM9 12l2 2 4-4",
    shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    message:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.93-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .27.92z",
    phoneCall:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.93-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .27.92zM15 2s3 1 3 4M18 2s3 2 3 4",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};

export const Btn = ({ children, onClick, v="primary", sz="md", icon, disabled, style={} }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:6, fontFamily:F, fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"1px solid transparent", borderRadius:8, transition:"all 0.15s", opacity:disabled?0.5:1, ...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"}) };
  const vs = {
    primary:   { background:C.accent,   color:"#fff",    borderColor:C.accent },
    secondary: { background:C.surface,  color:C.text1,   borderColor:C.border },
    ghost:     { background:"transparent", color:C.text2, border:"none" },
    danger:    { background:"#fef2f2",  color:"#dc2626", borderColor:"#fecaca" },
  };
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

export const Badge = ({ children, color="#6b7280", light }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, background:light?`${color}18`:color, color:light?color:"white", border:`1px solid ${color}28`, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

export const Inp = ({ label, value, onChange, placeholder, type="text", disabled, multiline, rows=3, style={}, autoFocus }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }} data-tour="pipeline-widget">
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    {multiline
      ? <textarea rows={rows} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, resize:"vertical", ...style }}/>
      : <input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} onWheel={type==="number"?e=>e.target.blur():undefined} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, width:"100%", boxSizing:"border-box", ...style }}/>
    }
  </div>
);

export const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    <select value={value ?? ""} onChange={e=>onChange(e.target.value)}
      style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", background:C.surface, color:C.text1 }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

/* ─── field renderer ───────────────────────────────────────────────────────── */
export const STATUS_COLORS = {
  "Active":"#0ca678","Passive":"#f59f00","Not Looking":"#868e96","Placed":"#3b5bdb","Archived":"#adb5bd",
  "Open":"#0ca678","Draft":"#868e96","On Hold":"#f59f00","Filled":"#3b5bdb","Cancelled":"#e03131",
  "High":"#e03131","Critical":"#c92a2a","Medium":"#f59f00","Low":"#0ca678",
  "Remote":"#3b5bdb","Hybrid":"#7048e8","On-site":"#0ca678",
};

// Emit a filter-navigate event so the app shell can navigate to a filtered records list
const emitFilterNav = (fieldKey, fieldLabel, fieldValue) => {
  window.dispatchEvent(new CustomEvent("vercentic:filter-navigate", {
    detail: { fieldKey, fieldLabel, fieldValue }
  }));
};

// Clickable pill — navigates to a filtered list of records with this value
// NOTE: must be defined at module level (not inside FieldValue) to avoid React identity issues