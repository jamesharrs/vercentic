import React, { useState, useEffect, useCallback, useRef, useMemo, memo, lazy, Suspense } from "react";
import { usePermissions as usePermCtx } from "./PermissionContext.jsx";
import ReactDOM from "react-dom";
import RichTextEditor from "./RichTextEditor.jsx";
import { MatchingEngine } from "./AI.jsx";
import CommunicationsPanel from "./Communications.jsx";
import SharePicker from "./SharePicker.jsx";
import { RecordPipelinePanel, PeoplePipelineWidget, LinkedRecordsPanel } from "./Workflows.jsx";
import { RecordFormPanel } from "./Forms.jsx";
import { evaluateFormula, formatFormulaResult } from "./utils/formula.js";
import { COUNTRIES, COUNTRY_MAP, PHONE_CODES, formatPhone,
         validatePhone, autoFormatPhoneNumber, countryCodeFromDial,
         getPhoneRule, stripPhoneDigits } from "./utils/countries.js";
import { TasksEventsPanel } from "./TasksEventsPanel.jsx";
import { ScorecardPanel } from "./Scorecards.jsx";
import AiBadge, { isAiGenerated } from "./AiBadge.jsx";
import InsightsPanel from "./InsightsPanel.jsx";

import api from './apiClient.js';
import { authHeaders } from './apiClient.js';
import TalentCardModal from './TalentCard.jsx';
import ScreeningRulesPanel from './ScreeningRulesPanel.jsx';
import LinkedInFinderButton from './LinkedInFinder.jsx';
const InterviewPlanPanelLazy = lazy(() => import('./InterviewPlanPanel.jsx').then(m => ({ default: m.InterviewPlanPanel })));

// Bare fetch wrapper that always includes X-Tenant-Slug + X-User-Id headers.
// Use this instead of raw fetch() anywhere in this file.
const tFetch = (url, opts = {}) => {
  const h = { ...authHeaders(), ...(opts.headers || {}) };
  return fetch(url, { ...opts, headers: h });
};

const F  = "'Plus Jakarta Sans', -apple-system, sans-serif";
const C  = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb",
  accentLight:"#eef1ff",
};

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
/* ─── CSV helpers ────────────────────────────────────────────────────────────── */
const downloadCSV = async (objectId, environmentId, objectSlug) => {
  const url = `/csv/export?object_id=${objectId}&environment_id=${environmentId}`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${objectSlug}-export.csv`;
  a.click();
};

const downloadTemplate = async (objectId, objectSlug) => {
  const url = `/csv/template?object_id=${objectId}`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${objectSlug}-template.csv`;
  a.click();
};

const importCSV = async (objectId, environmentId, file, mode='create') => {
  const text = await file.text();
  const res = await fetch(`/csv/import?object_id=${objectId}&environment_id=${environmentId}&mode=${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: text,
  });
  return res.json();
};

const Ic = ({ n, s=16, c="currentColor" }) => {
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
    user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
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
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};

const Btn = ({ children, onClick, v="primary", sz="md", icon, disabled, style={} }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:6, fontFamily:F, fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"1px solid transparent", borderRadius:8, transition:"all 0.15s", opacity:disabled?0.5:1, ...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"}) };
  const vs = {
    primary:   { background:C.accent,   color:"#fff",    borderColor:C.accent },
    secondary: { background:C.surface,  color:C.text1,   borderColor:C.border },
    ghost:     { background:"transparent", color:C.text2, border:"none" },
    danger:    { background:"#fef2f2",  color:"#dc2626", borderColor:"#fecaca" },
  };
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

const Badge = ({ children, color="#6b7280", light }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, background:light?`${color}18`:color, color:light?color:"white", border:`1px solid ${color}28`, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const Inp = ({ label, value, onChange, placeholder, type="text", disabled, multiline, rows=3, style={}, autoFocus }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }} data-tour="pipeline-widget">
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    {multiline
      ? <textarea rows={rows} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, resize:"vertical", ...style }}/>
      : <input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, width:"100%", boxSizing:"border-box", ...style }}/>
    }
  </div>
);

const Sel = ({ label, value, onChange, options }) => (
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
const STATUS_COLORS = {
  "Active":"#0ca678","Passive":"#f59f00","Not Looking":"#868e96","Placed":"#3b5bdb","Archived":"#adb5bd",
  "Open":"#0ca678","Draft":"#868e96","On Hold":"#f59f00","Filled":"#3b5bdb","Cancelled":"#e03131",
  "High":"#e03131","Critical":"#c92a2a","Medium":"#f59f00","Low":"#0ca678",
  "Remote":"#3b5bdb","Hybrid":"#7048e8","On-site":"#0ca678",
};

// Emit a filter-navigate event so the app shell can navigate to a filtered records list
const emitFilterNav = (fieldKey, fieldLabel, fieldValue) => {
  window.dispatchEvent(new CustomEvent("talentos:filter-navigate", {
    detail: { fieldKey, fieldLabel, fieldValue }
  }));
};

// Clickable pill — navigates to a filtered list of records with this value
// NOTE: must be defined at module level (not inside FieldValue) to avoid React identity issues
const FilterPill = ({ label, color, fieldKey, fieldName }) => (
  <span
    onClick={e => { e.stopPropagation(); emitFilterNav(fieldKey, fieldName, label); }}
    title={`Browse all records where ${fieldName} = "${label}"`}
    style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99,
      fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}28`,
      whiteSpace:"nowrap", cursor:"pointer", userSelect:"none", transition:"filter .1s" }}
    onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.88)"}
    onMouseLeave={e=>e.currentTarget.style.filter="none"}
  >
    {label}
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{opacity:0.6}}>
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </span>
);

const FieldValue = ({ field, value, allFieldValues = {} }) => {
  if (value===null||value===undefined||value==="") return <span style={{color:C.text3,fontSize:12}}>—</span>;

  switch(field.field_type) {
    case "select": {
      const col = STATUS_COLORS[value] || C.accent;
      return <FilterPill label={value} color={col} fieldKey={field.api_key} fieldName={field.name}/>;
    }
    case "multi_select": {
      const arr = Array.isArray(value) ? value : (typeof value==="string"?value.split(","):[]);
      return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{arr.map(v=><FilterPill key={v} label={v} color={STATUS_COLORS[v]||C.accent} fieldKey={field.api_key} fieldName={field.name}/>)}</div>;
    }
    case "boolean": return <FilterPill label={value?"Yes":"No"} color={value?"#0ca678":"#868e96"} fieldKey={field.api_key} fieldName={field.name}/>;
    case "url":     return <a href={value} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:13,textDecoration:"none"}}>{value}</a>;
    case "email":   return <a href={`mailto:${value}`} style={{color:C.accent,fontSize:13,textDecoration:"none"}}>{value}</a>;
    case "rating":  return (
      <div style={{display:"flex",gap:2}}>
        {[1,2,3,4,5].map(i=><Ic key={i} n="star" s={14} c={i<=value?"#f59f00":"#e5e7eb"}/>)}
      </div>
    );
    case "people":
    case "lookup":
    case "multi_lookup": {
      const people = Array.isArray(value) ? value : (value ? [value] : []);
      if (!people.length) return <span style={{color:C.text3,fontSize:12}}>—</span>;
      return (
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {people.map((p,i) => {
            const name = typeof p === "object" ? (p.name || p.label || p.id) : String(p);
            const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
            return (
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px 2px 4px",borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,fontSize:12,fontWeight:600,color:C.accent}}>
                <span style={{width:18,height:18,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{initials}</span>
                {name}
              </span>
            );
          })}
        </div>
      );
    }
    case "currency": return <span style={{fontSize:13,color:C.text1,fontWeight:600}}>${Number(value).toLocaleString()}</span>;
    // ── New field types ──────────────────────────────────────────────────────
    case "formula": {
      const result = evaluateFormula(field.formula_expression, allFieldValues||{});
      const fmt = formatFormulaResult(result, field.formula_output_type);
      return <span style={{fontSize:13,fontWeight:600,color:fmt==='#ERROR'?"#ef4444":"#1a1a2e",fontFamily:fmt==='#ERROR'?"inherit":"ui-monospace,monospace"}}>{fmt}</span>;
    }
    case "progress": {
      const pct = Math.max(0,Math.min(100,Number(value)));
      const col = pct>=75?"#0ca678":pct>=40?"#f59f00":"#ef4444";
      return <div style={{display:"flex",alignItems:"center",gap:8,minWidth:120}}>
        <div style={{flex:1,height:6,borderRadius:99,background:"#f0f0f0",overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",borderRadius:99,background:col}}/>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:col,minWidth:30}}>{pct}%</span>
      </div>;
    }
    case "percent": return <span style={{fontSize:13,fontWeight:600}}>{Number(value).toLocaleString()}%</span>;
    case "datetime": {
      try { const d=new Date(value); return <span style={{fontSize:13}}>{d.toLocaleDateString()} {d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>; }
      catch { return <span style={{fontSize:13}}>{String(value)}</span>; }
    }
    case "duration": return <span style={{fontSize:13}}>{String(value)} {field.duration_unit||"days"}</span>;
    case "date_range": {
      const dr = (() => { try { return typeof value==="object"&&value ? value : JSON.parse(value); } catch { return {}; } })();
      const e = dr.end?new Date(dr.end).toLocaleDateString():null;
      if(!s&&!e) return <span style={{color:C.text3,fontSize:12}}>—</span>;
      return <span style={{fontSize:13}}><span style={{color:"#6b7280",fontSize:11,marginRight:2}}>{field.date_range_start_label||"Start"}</span>{s||"—"}<span style={{margin:"0 6px",color:"#d1d5db"}}>→</span><span style={{color:"#6b7280",fontSize:11,marginRight:2}}>{field.date_range_end_label||"End"}</span>{e||"—"}</span>;
    }
    case "rich_text": {
      const html = String(value);
      return (
        <div style={{ fontSize:13, lineHeight:1.65, color:"#111827" }}
          dangerouslySetInnerHTML={{ __html: html }}/>
      );
    }
    case "auto_number":
    case "unique_id": return <span style={{fontSize:11,fontWeight:700,fontFamily:"ui-monospace,monospace",padding:"2px 6px",borderRadius:4,background:"#f0f4ff",color:"#3b5bdb",letterSpacing:"0.05em"}}>{String(value)}</span>;
    case "country": {
      const c = COUNTRY_MAP[value];
      return <FilterPill label={c?`${c.flag} ${c.name}`:value} color={C.accent} fieldKey={field.api_key} fieldName={field.name}/>;
    }
    case "address": {
      const addr = (() => { try { return typeof value==="object"&&value ? value : JSON.parse(value); } catch { return {street:value}; } })();
      const parts=[addr.street,addr.city,addr.state,addr.country,addr.postal_code].filter(Boolean);
      return <span style={{fontSize:13,lineHeight:1.5}}>{parts.join(", ")||"—"}</span>;
    }
    case "phone_intl": return <a href={`tel:${formatPhone(value).replace(/\s/g,"")}`} style={{color:C.accent,fontSize:13,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>{formatPhone(value)}</a>;
    case "social": {
      const SCFG = {linkedin:{color:"#0A66C2",icon:"in"},github:{color:"#24292f",icon:"gh"},twitter:{color:"#000",icon:"𝕏"},instagram:{color:"#E1306C",icon:"ig"},facebook:{color:"#1877F2",icon:"fb"},youtube:{color:"#FF0000",icon:"yt"},other:{color:"#6366f1",icon:"🔗"}};
      const cfg = SCFG[field.social_platform||"linkedin"]||SCFG.other;
      const href = String(value).startsWith("http")?value:`https://${value}`;
      return <a href={href} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:cfg.color,textDecoration:"none",padding:"2px 8px",borderRadius:99,background:`${cfg.color}12`}} onClick={e=>e.stopPropagation()}><span style={{fontSize:10,fontWeight:800}}>{cfg.icon}</span>{(field.social_platform||"link")}</a>;
    }
    case "status": {
      const col = STATUS_COLORS[String(value).toLowerCase()] || C.accent;
      return <FilterPill label={value} color={col} fieldKey={field.api_key} fieldName={field.name}/>;
    }
    case "date":    return <span style={{fontSize:13}}>{new Date(value).toLocaleDateString()}</span>;
    case "dataset": {
      // Dataset values stored as string or array of strings
      const arr = Array.isArray(value) ? value : (value ? [value] : []);
      if (!arr.length) return <span style={{color:C.text3,fontSize:12}}>—</span>;
      return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {arr.map(v=><FilterPill key={v} label={v} color={C.accent} fieldKey={field.api_key} fieldName={field.name}/>)}
      </div>;
    }
    case "skills": {
      const arr = Array.isArray(value) ? value : (value ? [value] : []);
      if (!arr.length) return <span style={{color:C.text3,fontSize:12}}>—</span>;
      return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {arr.map(v=><span key={v} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:99,background:"#F59F0018",border:"1px solid #F59F0028",fontSize:11,fontWeight:600,color:"#F59F00"}}>⚡ {v}</span>)}
      </div>;
    }
    default:        return <span style={{fontSize:13,color:C.text1,lineHeight:1.5}}>{String(value)}</span>;
  }
};

// ── PhoneInput — plain phone with basic validation ────────────────────────────
const PhoneInput = ({ value, onChange, autoFocus }) => {
  const [err, setErr] = useState(null);
  const check = (v) => { if(!v)return setErr(null); const r=validatePhone(v,"phone"); setErr(r.valid?null:r); };
  return <div>
    <input type="tel" value={value||""} onChange={e=>{onChange(e.target.value);check(e.target.value);}} onBlur={()=>check(value)} autoFocus={autoFocus} placeholder="+971 50 123 4567"
      style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1.5px solid ${err?"#ef4444":"#e5e7eb"}`,fontSize:13,color:C.text1,boxSizing:"border-box"}}/>
    {err&&<div style={{marginTop:4,fontSize:11,color:"#ef4444"}}>{err.error}{err.example&&<span style={{color:"#9ca3af",marginLeft:6}}>{err.example}</span>}</div>}
  </div>;
};

// ── PhoneIntlInput — dial-code selector + number with live validation ─────────
const PhoneIntlInput = ({ field, value, onChange, autoFocus }) => {
  const ph = typeof value==="object"&&value?value:{dial:"+971",number:value||""};
  const [err, setErr] = useState(null);
  const [display, setDisplay] = useState(ph.number||"");
  const cc = countryCodeFromDial(ph.dial);
  const rule = getPhoneRule(cc);
  const digits = stripPhoneDigits(ph.number||"");
  const [focused, setFocused] = useState(false);
  const counterOk = digits.length>=rule.min && digits.length<=rule.max;
  const check = (d,n) => { if(!n?.trim())return setErr(null); const r=validatePhone({dial:d,number:n},"phone_intl"); setErr(r.valid?null:r); };
  const handleNum = (e) => {
    const raw = e.target.value.replace(/[^\d\s\-()+]/g,"");
    setDisplay(autoFormatPhoneNumber(raw,cc));
    const newPh = {...ph, number:raw.replace(/\D/g,"")};
    onChange(newPh); check(ph.dial,newPh.number);
  };
  const handleDial = (e) => { const d=e.target.value; onChange({...ph,dial:d}); setDisplay(""); check(d,ph.number); };
  return <div>
    <div style={{display:"flex",gap:6}}>
      <select value={ph.dial||"+971"} onChange={handleDial} style={{width:88,padding:"6px 6px",borderRadius:8,border:`1.5px solid ${err?"#ef4444":"#e5e7eb"}`,fontSize:12,color:C.text1,background:"white",flexShrink:0}}>
        {PHONE_CODES.map(p=><option key={`${p.code}-${p.dial}`} value={p.dial}>{p.flag} {p.dial}</option>)}
      </select>
      <div style={{flex:1,position:"relative"}}>
        <input type="tel" value={display} onChange={handleNum} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);check(ph.dial,ph.number);}} autoFocus={autoFocus}
          placeholder={rule?.example||"50 123 4567"}
          style={{width:"100%",padding:"7px 30px 7px 10px",borderRadius:8,border:`1.5px solid ${err?"#ef4444":focused&&counterOk?"#0ca678":"#e5e7eb"}`,fontSize:13,color:C.text1,boxSizing:"border-box"}}/>
        {ph.number&&<div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)"}}>
          {err?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              :counterOk?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ca678" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:null}
        </div>}
      </div>
    </div>
    {focused&&ph.number&&<div style={{marginTop:3,display:"flex",alignItems:"center",gap:6,fontSize:11}}>
      <div style={{flex:1,height:3,borderRadius:99,background:"#f0f0f0",overflow:"hidden"}}><div style={{height:"100%",borderRadius:99,background:counterOk?"#0ca678":"#f59f00",width:rule?`${Math.min(100,(digits.length/rule.max)*100)}%`:"0%",transition:"width .2s"}}/></div>
      <span style={{color:counterOk?"#0ca678":"#9ca3af",minWidth:60,textAlign:"right"}}>{digits.length}/{rule?.max} digits</span>
    </div>}
    {err&&<div style={{marginTop:4,fontSize:11,color:"#ef4444"}}>{err.error}{err.hint&&<span style={{color:"#6b7280",display:"block",marginTop:1}}>{err.hint}</span>}{err.example&&<span style={{color:"#9ca3af",display:"block"}}>{err.example}</span>}</div>}
    {!err&&focused&&cc&&!ph.number&&<div style={{marginTop:3,fontSize:11,color:"#9ca3af"}}>{COUNTRY_MAP[cc]?.name} — {rule.hint}{rule.example&&` (e.g. ${ph.dial} ${rule.example})`}</div>}
  </div>;
};

// ── CountryPicker ─────────────────────────────────────────────────────────────
const CountryPicker = ({ value, onChange, autoFocus }) => {
  const [search, setSearch] = useState("");
  const filtered = search ? COUNTRIES.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.code.toLowerCase().includes(search.toLowerCase())) : COUNTRIES;
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:4}}>
      {value&&COUNTRY_MAP[value]&&<span style={{padding:"4px 10px",borderRadius:8,background:"#f0f4ff",color:C.accent,fontSize:12,fontWeight:600,flexShrink:0}}>{COUNTRY_MAP[value].flag} {COUNTRY_MAP[value].name}</span>}
      <input placeholder="Search countries…" value={search} onChange={e=>setSearch(e.target.value)} autoFocus={autoFocus} style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:12,color:C.text1}}/>
    </div>
    <div style={{maxHeight:180,overflowY:"auto",border:"1.5px solid #e5e7eb",borderRadius:8,background:"white"}}>
      {value&&<div onClick={()=>{onChange("");setSearch("");}} style={{padding:"6px 10px",fontSize:12,color:C.text3,cursor:"pointer",borderBottom:"1px solid #f0f0f0"}}>✕ Clear</div>}
      {filtered.map(c=><div key={c.code} onClick={()=>{onChange(c.code);setSearch("");}} style={{padding:"5px 10px",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:value===c.code?"#f0f4ff":"transparent",color:value===c.code?C.accent:C.text1}} onMouseEnter={e=>{if(value!==c.code)e.currentTarget.style.background="#f9fafb";}} onMouseLeave={e=>{if(value!==c.code)e.currentTarget.style.background="transparent";}}>
        <span>{c.flag}</span><span>{c.name}</span><span style={{marginLeft:"auto",fontSize:10,color:C.text3}}>{c.code}</span>
      </div>)}
      {!filtered.length&&<div style={{padding:10,fontSize:12,color:C.text3,textAlign:"center"}}>No countries found</div>}
    </div>
  </div>;
};

// ── AddressInput ──────────────────────────────────────────────────────────────
const AddressInput = ({ field, value, onChange }) => {
  let addr = {};
  if (typeof value === "object" && value) addr = value;
  else { try { addr = JSON.parse(value); } catch { addr = { street: value || "" }; } }
  const show = field.address_fields||["street","city","country","postal_code"];
  const LABELS = {street:"Street",city:"City",state:"State / Region",country:"Country",postal_code:"Postal Code"};
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {["street","city","state","country","postal_code"].filter(k=>show.includes(k)).map(k=>(
      <div key={k}><label style={{display:"block",fontSize:10,fontWeight:600,color:C.text3,marginBottom:2}}>{LABELS[k]}</label>
        {k==="country"
          ?<select value={addr.country||""} onChange={e=>onChange({...addr,country:e.target.value})} style={{width:"100%",padding:"6px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:12,color:C.text1,boxSizing:"border-box"}}><option value="">Select…</option>{COUNTRIES.map(c=><option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}</select>
          :<input value={addr[k]||""} onChange={e=>onChange({...addr,[k]:e.target.value})} placeholder={LABELS[k]} style={{width:"100%",padding:"6px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:12,color:C.text1,boxSizing:"border-box"}}/>}
      </div>
    ))}
  </div>;
};

const FieldEditor = ({ field, value, onChange, autoFocus, environment }) => {
  switch(field.field_type) {
    case "textarea":
      return <Inp multiline value={value} onChange={onChange} placeholder={field.placeholder||field.name} autoFocus={autoFocus}/>;
    case "rich_text":
      return <RichTextEditor value={value||""} onChange={onChange} placeholder={field.placeholder||field.name} autoFocus={autoFocus} minHeight={140}/>;
    case "select":
      return <Sel value={value} onChange={onChange} options={(field.options||[]).map(o=>({value:o,label:o}))}/>;
    case "multi_select": {
      const selected = Array.isArray(value)?value:(value?value.split(","):[]);
      return (
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {(field.options||[]).map(opt => {
            const on = selected.includes(opt);
            return (
              <button key={opt} onClick={()=>onChange(on?selected.filter(s=>s!==opt):[...selected,opt])}
                style={{padding:"4px 10px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentLight:"transparent",color:on?C.accent:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "boolean":
      return (
        <div style={{display:"flex",gap:8}}>
          {[{v:true,l:"Yes"},{v:false,l:"No"}].map(({v,l})=>(
            <button key={l} onClick={()=>onChange(v)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${value===v?C.accent:C.border}`,background:value===v?C.accentLight:"transparent",color:value===v?C.accent:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>{l}</button>
          ))}
        </div>
      );
    case "rating":
      return (
        <div style={{display:"flex",gap:4}}>
          {[1,2,3,4,5].map(i=>(
            <button key={i} onClick={()=>onChange(i)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
              <Ic n="star" s={22} c={i<=(value||0)?"#f59f00":"#e5e7eb"}/>
            </button>
          ))}
        </div>
      );
    case "number":
    case "currency":
      return <Inp type="number" value={value} onChange={v=>onChange(v===''?'':Number(v))} placeholder={field.placeholder||field.name} autoFocus={autoFocus}/>;
    case "date":
      return <Inp type="date" value={value} onChange={onChange} autoFocus={autoFocus}/>;
    case "email":
      return <Inp type="email" value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`} autoFocus={autoFocus}/>;
    case "people": {
      return <PeoplePicker field={field} value={value} onChange={onChange}/>;
    }
    case "multi_lookup": {
      return <PeoplePicker field={field} value={value} onChange={onChange}/>;
    }
    case "dataset":
      return <DatasetPicker field={field} value={value} onChange={onChange}/>;
    case "skills":
      return <SkillsPicker field={field} value={value} onChange={onChange} environment={environment}/>;
      return <Inp type="url" value={value} onChange={onChange} placeholder="https://…" autoFocus={autoFocus}/>;
    case "phone":
      return <PhoneInput value={value} onChange={onChange} autoFocus={autoFocus}/>;
    case "phone_intl":
      return <PhoneIntlInput field={field} value={value} onChange={onChange} autoFocus={autoFocus}/>;
    case "formula":
    case "auto_number":
    case "unique_id":
    case "lookup":
    case "rollup":
      return <div style={{padding:"6px 10px",background:"#f9fafb",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:12,color:"#6b7280",display:"flex",alignItems:"center",gap:6}}>
        <Ic n="lock" s={11} c="#9ca3af"/>
        <span style={{fontFamily:"ui-monospace,monospace"}}>{value!==null&&value!==undefined&&value!==''?String(value):"Auto-generated"}</span>
      </div>;
    case "progress": {
      const pct = Number(value)||0;
      const col = pct>=75?"#0ca678":pct>=40?"#f59f00":"#ef4444";
      return <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{flex:1,height:8,borderRadius:99,background:"#f0f0f0",overflow:"hidden",cursor:"pointer"}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onChange(Math.max(0,Math.min(100,Math.round((e.clientX-r.left)/r.width*100))));}}>
            <div style={{width:`${pct}%`,height:"100%",borderRadius:99,background:col}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:col,minWidth:34,textAlign:"right"}}>{pct}%</span>
        </div>
        <input type="range" min={0} max={100} value={pct} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",accentColor:col}}/>
      </div>;
    }
    case "percent":
      return <div style={{position:"relative"}}><input type="number" min={0} max={100} step={0.1} value={value??""} placeholder="0" onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))} autoFocus={autoFocus} style={{width:"100%",padding:"7px 32px 7px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,color:C.text1,boxSizing:"border-box"}}/><span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:C.text3}}>%</span></div>;
    case "datetime":
      return <input type="datetime-local" value={value?String(value).slice(0,16):""} onChange={e=>onChange(e.target.value)} autoFocus={autoFocus} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,color:C.text1,boxSizing:"border-box"}}/>;
    case "duration":
      return <div style={{display:"flex",gap:8}}><Inp type="number" value={value} onChange={v=>onChange(Number(v))} placeholder="0" autoFocus={autoFocus}/><div style={{padding:"7px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:12,color:C.text3,background:"#f9fafb"}}>{field.duration_unit||"days"}</div></div>;
    case "date_range": {
      const dr = (() => { try { return typeof value==="object"&&value ? value : JSON.parse(value); } catch { return {}; } })();
      return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["start",field.date_range_start_label||"Start"],["end",field.date_range_end_label||"End"]].map(([k,lbl])=>(
          <div key={k}><label style={{display:"block",fontSize:10,fontWeight:600,color:C.text3,marginBottom:2}}>{lbl}</label>
            <input type="date" value={dr[k]||""} onChange={e=>onChange({...dr,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,boxSizing:"border-box"}}/></div>
        ))}
      </div>;
    }
    case "country":
      return <CountryPicker value={value} onChange={onChange} autoFocus={autoFocus}/>;
    case "address":
      return <AddressInput field={field} value={value} onChange={onChange}/>;
    case "social":
      return <Inp type="url" value={value} onChange={onChange} placeholder={field.social_platform==="github"?"username or full URL":field.social_platform==="twitter"?"@handle or full URL":"https://…"} autoFocus={autoFocus}/>;
    case "status": {
      const opts = (field.options||[]);
      return <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{opts.map(opt=>{const col=STATUS_COLORS[String(opt).toLowerCase()]||C.accent;const isSel=value===opt;return <button key={opt} onClick={()=>onChange(opt)} style={{padding:"5px 12px",borderRadius:99,border:`2px solid ${isSel?col:"#e5e7eb"}`,background:isSel?`${col}18`:"white",color:isSel?col:C.text2,fontSize:12,fontWeight:600,cursor:"pointer"}}>{opt}</button>;})}</div>;
    }
    default:
      return <Inp value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`} autoFocus={autoFocus}/>;
  }
};

/* ─── People Picker ─────────────────────────────────────────────────────────── */
// Module-level environment ref — set by RecordsView on mount
let _currentEnvId = null;

// Module-level cache so PeoplePicker doesn't re-fetch on every open
const _pickerCache = {};
// Module-level cache for dataset options and skills
const _datasetCache = {};
const _skillsCache = {};

const PeoplePicker = ({ field, value, onChange }) => {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const isMulti = field.field_type === "multi_lookup" || field.field_type === "people" || field.people_multi !== false;
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const [pickerCreating, setPickerCreating] = useState(false);
  const [pickerFirst,    setPickerFirst]    = useState("");
  const [pickerLast,     setPickerLast]     = useState("");
  const [pickerEmail,    setPickerEmail]    = useState("");
  const [pickerSaving,   setPickerSaving]   = useState(false);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const checkDropDirection = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropUp(window.innerHeight - rect.bottom < 220);
  };

  // Load options once — use module-level cache keyed by objectId+envId
  useEffect(() => {
    if (!open || !_currentEnvId) return;
    const filterSuffix = field.people_selection_mode === "specific"
      ? `_specific_${(field.people_allowed_ids||[]).length}`
      : field.people_selection_mode === "saved_list"
      ? `_list_${field.people_saved_list_id||''}`
      : field.people_filter_field ? `_${field.people_filter_field}_${field.people_filter_value}` : '';
    const cacheKey = `${field.lookup_object_id||field.related_object_slug||'people'}_${_currentEnvId}${filterSuffix}`;
    if (_pickerCache[cacheKey]) { setOptions(_pickerCache[cacheKey]); setLoaded(true); return; }
    if (loaded) return;

    const fetchRecords = (objectId) =>
      api.get(`/records?object_id=${objectId}&environment_id=${_currentEnvId}&limit=200`)
        .then(async (res) => {
          const recs = Array.isArray(res) ? res : (res.records || []);
          // Apply people selection mode filters
          let filteredRecs = recs;
          if (field.people_selection_mode === "specific" && Array.isArray(field.people_allowed_ids) && field.people_allowed_ids.length > 0) {
            const allowedSet = new Set(field.people_allowed_ids);
            filteredRecs = recs.filter(r => allowedSet.has(r.id));
          } else if (field.people_selection_mode === "saved_list" && field.people_saved_list_id) {
            // Fetch the saved list's filters and apply them
            try {
              const listData = await api.get(`/saved-views/${field.people_saved_list_id}`);
              if (listData && Array.isArray(listData.filters) && listData.filters.length > 0) {
                const flds = await api.get(`/fields?object_id=${objectId}`);
                const fieldsList = Array.isArray(flds) ? flds : [];
                filteredRecs = recs.filter(r => {
                  return listData.filters.every(f => {
                    const fld = fieldsList.find(fl => fl.id === (f.fieldId || f.field_id));
                    if (!fld) return true;
                    const val = r.data?.[fld.api_key];
                    const sv = String(val || "").toLowerCase();
                    const fv = String(f.value || "").toLowerCase();
                    switch (f.op || f.operator) {
                      case "is": return sv === fv;
                      case "is not": return sv !== fv;
                      case "contains": return sv.includes(fv);
                      case "starts with": return sv.startsWith(fv);
                      case "includes": return Array.isArray(val) && val.some(v => String(v).toLowerCase() === fv);
                      case "is empty": return !val || val === "";
                      case "is not empty": return val && val !== "";
                      default: return sv === fv;
                    }
                  });
                });
              }
            } catch(e) { /* saved list not found — show all */ }
          } else if (field.people_filter_field && field.people_filter_value) {
            const fk = field.people_filter_field;
            const fv = field.people_filter_value.toLowerCase();
            filteredRecs = recs.filter(r => {
              const val = r.data?.[fk];
              if (Array.isArray(val)) return val.some(v => String(v).toLowerCase() === fv);
              return String(val || "").toLowerCase() === fv;
            });
          }
          const opts = filteredRecs.map(r => ({
            id: r.id,
            name: `${r.data?.first_name||""} ${r.data?.last_name||""}`.trim() || r.data?.name || r.data?.job_title || r.id
          }));
          _pickerCache[cacheKey] = opts;
          setOptions(opts);
          setLoaded(true);
        }).catch(() => {});

    if (field.lookup_object_id) { fetchRecords(field.lookup_object_id); return; }
    const slug = field.related_object_slug || "people";
    api.get(`/objects?environment_id=${_currentEnvId}`)
      .then(objs => (Array.isArray(objs) ? objs : []).find(o => o.slug === slug))
      .then(obj => obj && fetchRecords(obj.id))
      .catch(() => {});
  }, [open, loaded, field.lookup_object_id, field.related_object_slug]);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const isSelected = id => selected.some(s => (typeof s === "object" ? s.id : s) === id);
  const inits = name => (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const toggle = (opt, e) => {
    e?.stopPropagation();
    const already = isSelected(opt.id);
    if (isMulti) {
      onChange(already ? selected.filter(s=>(typeof s==="object"?s.id:s)!==opt.id) : [...selected,{id:opt.id,name:opt.name}]);
      setSearch(""); inputRef.current?.focus();
    } else {
      onChange(already ? [] : [{id:opt.id,name:opt.name}]);
      setOpen(false); setSearch("");
    }
  };

  const remove = (id, e) => { e.stopPropagation(); onChange(selected.filter(s=>(typeof s==="object"?s.id:s)!==id)); };

  return (
    <div ref={ref} style={{position:"relative"}}>
      {/* Combined pill + search input box */}
      <div onClick={()=>{ checkDropDirection(); setOpen(true); setTimeout(()=>inputRef.current?.focus(),10); }}
        style={{display:"flex",flexWrap:"wrap",gap:4,padding:"5px 8px",borderRadius:8,
          border:`1.5px solid ${open?C.accent:C.border}`,background:C.surface,cursor:"text",
          minHeight:36,alignItems:"center",transition:"border-color .15s"}}>
        {selected.map((s,i) => {
          const name = typeof s==="object" ? s.name : s;
          const id   = typeof s==="object" ? s.id   : s;
          return (
            <span key={i} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px 2px 3px",
              borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,fontSize:12,fontWeight:600,color:C.accent}}>
              <span style={{width:16,height:16,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:8,
                fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {inits(name)}
              </span>
              {name}
              <button onClick={e=>remove(id,e)} style={{background:"none",border:"none",cursor:"pointer",
                color:C.accent,padding:"0 0 0 2px",fontSize:13,lineHeight:1,opacity:0.5,display:"flex",alignItems:"center"}}>×</button>
            </span>
          );
        })}
        <input ref={inputRef} value={search} onChange={e=>{ setSearch(e.target.value); checkDropDirection(); setOpen(true); }}
          onFocus={()=>setOpen(true)}
          placeholder={selected.length===0?(field.placeholder||`Search ${field.name||"people"}…`):""}
          style={{border:"none",outline:"none",fontSize:13,fontFamily:F,color:C.text1,background:"transparent",
            minWidth:80,flex:1,padding:"1px 0"}}/>
      </div>
      {/* Dropdown */}
      {open && (
        <div style={{position:"absolute",
          ...(dropUp ? {bottom:"calc(100% + 3px)"} : {top:"calc(100% + 3px)"}),
          left:0,right:0,zIndex:400,background:C.surface,
          border:`1px solid ${C.border}`,borderRadius:9,boxShadow:"0 8px 24px rgba(0,0,0,.1)",
          maxHeight:200,overflowY:"auto"}}>
          {!loaded && <div style={{padding:"12px",fontSize:12,color:C.text3,textAlign:"center"}}>Loading…</div>}
          {loaded && filtered.length===0 && <div style={{padding:"12px",fontSize:12,color:C.text3,textAlign:"center"}}>No matches</div>}
          {filtered.map(opt => (
            <div key={opt.id} onMouseDown={e=>toggle(opt,e)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",cursor:"pointer",
                background:isSelected(opt.id)?`${C.accent}08`:"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background=`${C.accent}08`}
              onMouseLeave={e=>e.currentTarget.style.background=isSelected(opt.id)?`${C.accent}08`:"transparent"}>
              <span style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                background:isSelected(opt.id)?C.accent:`${C.accent}18`,
                color:isSelected(opt.id)?"#fff":C.accent,
                fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                {inits(opt.name)}
              </span>
              <span style={{fontSize:13,color:C.text1,fontWeight:isSelected(opt.id)?600:400,flex:1}}>{opt.name}</span>
              {isSelected(opt.id) && (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </div>
          ))}
          {/* ── Inline create-new ── */}
          {!pickerCreating ? (
            <div style={{borderTop:`1px solid ${C.border}`,padding:"5px 8px"}}>
              <button onMouseDown={e=>{e.preventDefault();e.stopPropagation();setPickerCreating(true);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:7,border:"none",background:"transparent",color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Create new person
              </button>
            </div>
          ) : (
            <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}} onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em"}}>Quick-create</div>
              <div style={{display:"flex",gap:6}}>
                <input placeholder="First name *" value={pickerFirst} onChange={e=>setPickerFirst(e.target.value)}
                  style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:"inherit"}} autoFocus
                  onKeyDown={e=>{if(e.key==="Escape"){setPickerCreating(false);setPickerFirst("");setPickerLast("");setPickerEmail("");}}}/>
                <input placeholder="Last name" value={pickerLast} onChange={e=>setPickerLast(e.target.value)}
                  style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <input placeholder="Email (optional)" value={pickerEmail} onChange={e=>setPickerEmail(e.target.value)}
                style={{width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:6}}>
                <button disabled={!pickerFirst.trim()||pickerSaving}
                  onClick={async()=>{
                    if(!pickerFirst.trim()||!_currentEnvId) return;
                    setPickerSaving(true);
                    try {
                      const objs = await api.get(`/objects?environment_id=${_currentEnvId}`);
                      const pObj = (Array.isArray(objs)?objs:[]).find(o=>o.slug==="people"||o.name?.toLowerCase()==="person"||o.name?.toLowerCase()==="people");
                      if (!pObj) return;
                      const rec = await api.post("/records",{ object_id:pObj.id, environment_id:_currentEnvId, data:{first_name:pickerFirst.trim(),last_name:pickerLast.trim(),email:pickerEmail.trim()||undefined} });
                      if (rec?.id) {
                        const newOpt={id:rec.id,name:`${pickerFirst.trim()} ${pickerLast.trim()}`.trim()};
                        const ck=`${field.lookup_object_id||field.related_object_slug||"people"}_${_currentEnvId}`;
                        delete _pickerCache[ck];
                        toggle(newOpt,null);
                        setPickerCreating(false);setPickerFirst("");setPickerLast("");setPickerEmail("");
                      }
                    } catch(e){console.error(e);} finally{setPickerSaving(false);}
                  }}
                  style={{flex:1,padding:"6px 10px",borderRadius:6,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:700,cursor:!pickerFirst.trim()?"not-allowed":"pointer",opacity:!pickerFirst.trim()?0.5:1,fontFamily:"inherit"}}>
                  {pickerSaving?"Saving…":"Create & select"}
                </button>
                <button onClick={()=>{setPickerCreating(false);setPickerFirst("");setPickerLast("");setPickerEmail("");}}
                  style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── DatasetPicker ─────────────────────────────────────────────────────────────
// Renders a searchable dropdown for a field whose options come from a Data Set.
const DatasetPicker = ({ field, value, onChange }) => {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isMulti = field.dataset_multi !== false && field.dataset_multi !== "false";
  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    if (!field.dataset_id) return;
    const cacheKey = field.dataset_id;
    if (_datasetCache[cacheKey]) { setOptions(_datasetCache[cacheKey]); return; }
    tFetch(`/api/datasets/${cacheKey}`).then(r=>r.json()).then(d => {
      const opts = (d.options||[]).filter(o=>o.is_active!==false).map(o=>({ id: o.id, label: o.label, color: o.color }));
      _datasetCache[cacheKey] = opts;
      setOptions(opts);
    });
  }, [field.dataset_id]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (label) => {
    if (isMulti) {
      onChange(selected.includes(label) ? selected.filter(s=>s!==label) : [...selected, label]);
    } else {
      onChange(label === selected[0] ? "" : label);
      setOpen(false);
    }
  };
  const remove = (label, e) => { e.stopPropagation(); onChange(isMulti ? selected.filter(s=>s!==label) : ""); };

  if (!field.dataset_id) {
    return <div style={{fontSize:12,color:C.text3,padding:"4px 0"}}>No data set configured for this field</div>;
  }

  return (
    <div ref={ref} style={{position:"relative"}}>
      {/* Selected pills + input trigger */}
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",flexWrap:"wrap",gap:4,padding:"6px 8px",borderRadius:8,border:`1.5px solid ${open?C.accent:C.border}`,background:"white",cursor:"pointer",minHeight:36,alignItems:"center"}}>
        {selected.map(s => {
          const opt = options.find(o=>o.label===s);
          return (
            <span key={s} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:opt?.color?`${opt.color}18`:`${C.accent}12`,border:`1px solid ${opt?.color||C.accent}28`,fontSize:12,fontWeight:600,color:opt?.color||C.accent}}>
              {opt?.color && <div style={{width:7,height:7,borderRadius:"50%",background:opt.color,flexShrink:0}}/>}
              {s}
              <span onClick={e=>remove(s,e)} style={{cursor:"pointer",opacity:0.6,fontSize:13,lineHeight:1}}>×</span>
            </span>
          );
        })}
        {selected.length===0 && <span style={{fontSize:13,color:C.text3,userSelect:"none"}}>{field.placeholder||`Choose ${field.name}…`}</span>}
      </div>
      {/* Dropdown */}
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"white",borderRadius:10,border:`1.5px solid ${C.border}`,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:240,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"6px 8px",borderBottom:`1px solid ${C.border}`}}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:"100%",border:"none",outline:"none",fontSize:13,fontFamily:F,color:C.text1,background:"transparent"}}/>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {filtered.map(opt => {
              const active = selected.includes(opt.label);
              return (
                <div key={opt.id} onClick={()=>toggle(opt.label)}
                  style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:active?`${C.accent}08`:"white"}}>
                  {opt.color && <div style={{width:10,height:10,borderRadius:"50%",background:opt.color,flexShrink:0}}/>}
                  <span style={{flex:1,fontSize:13,color:C.text1,fontWeight:active?600:400}}>{opt.label}</span>
                  {active && <span style={{color:C.accent,fontSize:16}}>✓</span>}
                </div>
              );
            })}
            {filtered.length===0 && <div style={{padding:"12px",textAlign:"center",fontSize:12,color:C.text3}}>No options found</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// ── SkillsPicker ──────────────────────────────────────────────────────────────
// Searchable skills picker that pulls from the Skills Ontology.
const SkillsPicker = ({ field, value, onChange, environment }) => {
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState([]);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const ref = useRef(null);
  const isMulti = field.skills_multi !== false && field.skills_multi !== "false";
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const allowedCats = field.skills_categories?.length > 0 ? field.skills_categories : null;

  useEffect(() => {
    const envId = environment?.id || window._currentEnvId;
    if (!envId) return;
    const cacheKey = `skills_v2_${envId}_${(allowedCats||[]).join(",")}`;
    if (_skillsCache[cacheKey]) { setSkills(_skillsCache[cacheKey]); return; }
    tFetch(`/api/enterprise/skills?environment_id=${envId}`).then(r=>r.json()).then(d => {
      let all = Array.isArray(d) ? d.filter(s=>s.is_active!==false) : [];
      if (allowedCats) all = all.filter(s => allowedCats.includes(s.category));
      _skillsCache[cacheKey] = all;
      setSkills(all);
    });
  }, [environment?.id, (field.skills_categories||[]).join(",")]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cats = [...new Set(skills.map(s=>s.category))].sort();
  const filtered = skills.filter(s => {
    if (filterCat && s.category !== filterCat) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.aliases||[]).some(a=>a.toLowerCase().includes(q));
  });

  const CAT_COLORS = { Technology:"#4361EE", Business:"#0CA678", Design:"#7C3AED", "Soft Skills":"#F59F00", Languages:"#E03131", Certifications:"#1098AD" };

  const toggle = (name) => {
    if (isMulti) {
      onChange(selected.includes(name) ? selected.filter(s=>s!==name) : [...selected, name]);
    } else {
      onChange(name === selected[0] ? "" : name);
      setOpen(false);
    }
  };
  const remove = (name, e) => { e.stopPropagation(); onChange(isMulti ? selected.filter(s=>s!==name) : ""); };

  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",flexWrap:"wrap",gap:4,padding:"6px 8px",borderRadius:8,border:`1.5px solid ${open?C.accent:C.border}`,background:"white",cursor:"pointer",minHeight:36,alignItems:"center"}}>
        {selected.map(s => (
          <span key={s} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,fontSize:12,fontWeight:600,color:C.accent}}>
            ⚡ {s}
            <span onClick={e=>remove(s,e)} style={{cursor:"pointer",opacity:0.6,fontSize:13,lineHeight:1}}>×</span>
          </span>
        ))}
        {selected.length===0 && <span style={{fontSize:13,color:C.text3,userSelect:"none"}}>{field.placeholder||`Add skills…`}</span>}
      </div>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"white",borderRadius:10,border:`1.5px solid ${C.border}`,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:320,display:"flex",flexDirection:"column",minWidth:280}}>
          <div style={{padding:"6px 8px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:6,alignItems:"center"}}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search skills or aliases…"
              style={{flex:1,border:"none",outline:"none",fontSize:13,fontFamily:F,color:C.text1,background:"transparent"}}/>
            {cats.length > 1 && (
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 6px",fontFamily:F,color:C.text2,background:"white",outline:"none"}}>
                <option value="">All</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {filtered.length === 0 && (
              <div style={{padding:"16px",textAlign:"center",fontSize:12,color:C.text3}}>
                {skills.length===0 ? "No skills in ontology yet — add them in Settings → Enterprise Settings" : "No matching skills"}
              </div>
            )}
            {filtered.map(s => {
              const active = selected.includes(s.name);
              const color = CAT_COLORS[s.category] || C.accent;
              return (
                <div key={s.id} onClick={()=>toggle(s.name)}
                  style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:active?`${C.accent}08`:"white",borderBottom:`1px solid ${C.border}50`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:C.text1,fontWeight:active?600:400}}>{s.name}</div>
                    {s.subcategory && <div style={{fontSize:10,color:C.text3}}>{s.category} · {s.subcategory}</div>}
                  </div>
                  {active && <span style={{color:C.accent,fontSize:16,flexShrink:0}}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const recordTitle = (record, fields) => {
  const nameField = fields.find(f=>["first_name","name","job_title","pool_name","title"].includes(f.api_key));
  const lastField = fields.find(f=>f.api_key==="last_name");
  if (!record?.data) return "Untitled";
  const first = nameField ? record.data[nameField.api_key] : null;
  const last  = lastField ? record.data[lastField.api_key]  : null;
  if (first && last) return `${first} ${last}`;
  return first || record.id?.slice(0,8) || "Untitled";
};

const recordSubtitle = (record, fields) => {
  const sub = fields.find(f=>["current_title","department","category","email"].includes(f.api_key));
  return sub ? record.data[sub.api_key] : null;
};

/* ─── Avatar ───────────────────────────────────────────────────────────────── */
const Avatar = ({ name, color=C.accent, size=32, photoUrl=null }) => {
  const initials = name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() || "?";
  const photo = photoUrl;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
      {photo
        ? <img src={photo} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{ e.target.style.display="none"; }}/>
        : <span style={{ color:"white", fontSize:size*0.35, fontWeight:700 }}>{initials}</span>
      }
    </div>
  );
};


/* ─── Avatar with Duplicate Badge ─────────────────────────────────────────── */
const AvatarWithDupBadge = ({ name, color, size = 32, photoUrl, dupInfo }) => {
  const [tip, setTip] = useState(false);

  if (!dupInfo) {
    return <Avatar name={name} color={color} size={size} photoUrl={photoUrl} />;
  }

  const isStrong   = dupInfo.score >= 80;
  const badgeColor = isStrong ? "#EF4444" : "#F59F00";

  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <Avatar name={name} color={color} size={size} photoUrl={photoUrl} />

      {/* Badge dot */}
      <div
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        style={{
          position:"absolute", bottom:-2, right:-2,
          width:13, height:13, borderRadius:"50%",
          background:badgeColor, border:"1.5px solid white",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"default", zIndex:20,
        }}
      >
        <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
          <path d="M3.5 0.7L6.2 5.3H0.8L3.5 0.7Z" fill="white"/>
        </svg>

        {tip && (
          <div style={{
            position:"absolute", bottom:18, left:"50%",
            transform:"translateX(-50%)",
            background:"#0F1729", color:"white",
            padding:"9px 12px", borderRadius:10,
            fontSize:11, lineHeight:1.6,
            boxShadow:"0 8px 28px rgba(0,0,0,.28)",
            whiteSpace:"nowrap", zIndex:9999,
            pointerEvents:"none", minWidth:170,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:badgeColor, flexShrink:0 }}/>
              <span style={{ fontWeight:700, fontSize:12, color:isStrong?"#fca5a5":"#fde68a" }}>
                {isStrong ? "Likely duplicate" : "Possible duplicate"} · {dupInfo.score}%
              </span>
            </div>
            {dupInfo.reasons.map((r,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, color:"#d1d5db", fontSize:11 }}>
                <span style={{ color:"#6b7280", flexShrink:0 }}>›</span>{r}
              </div>
            ))}
            <div style={{
              position:"absolute", bottom:-5, left:"50%",
              transform:"translateX(-50%)",
              width:0, height:0,
              borderLeft:"5px solid transparent",
              borderRight:"5px solid transparent",
              borderTop:"5px solid #0F1729",
            }}/>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Create / Edit Record Modal ───────────────────────────────────────────── */
const RecordFormModal = ({ fields, record, objectName, onSave, onClose, environment }) => {
  const [data, setData] = useState(record?.data || {});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setData(d=>({...d,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  const sections = [
    { label:"Core Details",  keys: fields.filter((_,i)=>i<6).map(f=>f.api_key) },
    { label:"Additional",    keys: fields.filter((_,i)=>i>=6).map(f=>f.api_key) },
  ].filter(s=>s.keys.length);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:560, height:"100%", background:C.surface, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.12)", animation:"slideIn .2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text1 }}>{record?"Edit":"New"} {objectName}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, display:"flex" }}><Ic n="x" s={20}/></button>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>
          {sections.map(section => (
            <div key={section.label} style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>{section.label}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {section.keys.map(key => {
                  const field = fields.find(f=>f.api_key===key);
                  if (!field) return null;
                  return (
                    <div key={key}>
                      <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:6 }}>
                        {field.name}{!!field.is_required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
                      </label>
                      <FieldEditor field={field} value={data[key]} onChange={v=>set(key,v)} environment={environment}/>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", padding:"16px 24px", borderTop:`1px solid ${C.border}` }}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":record?"Save Changes":"Create Record"}</Btn>
        </div>
      </div>
    </div>
  );
};

/* ─── Saved Lists ────────────────────────────────────────────────────────────── */
const SavedViewsDropdown = ({ objectId, environmentId, userId, currentFilters, currentFilterLogic, currentFilterChip, currentVisibleFieldIds, currentViewMode, fields, onLoad, onClose }) => {
  const [views, setViews]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveSharing, setSaveSharing] = useState({ visibility: "private", user_ids: [], group_ids: [] });
  const [deleting, setDeleting] = useState(null);
  const ref = useRef(null);

  const load = useCallback(async () => {
    const res = await api.get(`/saved-views?object_id=${objectId}&environment_id=${environmentId}&user_id=${encodeURIComponent(userId || "")}`);
    setViews(Array.isArray(res) ? res : []);
  }, [objectId, environmentId, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    await api.post("/saved-views", {
      name: saveName.trim(),
      object_id: objectId,
      environment_id: environmentId,
      created_by: userId || "unknown",
      is_shared: saveSharing.visibility === "everyone",
      sharing: saveSharing,
      filters: currentFilters,
      filter_logic: currentFilterLogic || "AND",
      filter_chip: currentFilterChip || null,
      visible_field_ids: currentVisibleFieldIds || [],
      view_mode: currentViewMode,
    });
    setSaving(false);
    setSaveName("");
    setSaveSharing({ visibility: "private", user_ids: [], group_ids: [] });
    setShowSave(false);
    load();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await api.del(`/saved-views/${id}`);
    setDeleting(null);
    load();
  };

  const handleToggleShare = async (view) => {
    const current = view.sharing?.visibility || (view.is_shared ? "everyone" : "private");
    const next = current === "private" ? "everyone" : "private";
    await api.patch(`/saved-views/${view.id}`, {
      is_shared: next === "everyone",
      sharing: { visibility: next, user_ids: view.sharing?.user_ids||[], group_ids: view.sharing?.group_ids||[] },
    });
    load();
  };

  const ibs = { padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text1, background:"white", width:"100%", boxSizing:"border-box" };

  return (
    <div ref={ref} style={{ position:"absolute", top:"100%", right:0, zIndex:350, marginTop:4,
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      boxShadow:"0 8px 28px rgba(0,0,0,.13)", minWidth:280, maxHeight:480, display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ padding:"10px 14px 8px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em" }}>Saved Lists</span>
        <button onClick={() => setShowSave(s => !s)}
          style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:7, border:`1px solid ${C.accent}`,
            background: showSave ? C.accentLight : "transparent", color:C.accent, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:F }}>
          <Ic n="plus" s={11}/> Save current list
        </button>
      </div>

      {/* Save form */}
      {showSave && (
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:8, background:"#f8f9fc" }}>
          <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="View name…" style={ibs} autoFocus
            onKeyDown={e => e.key === "Enter" && handleSave()}/>
          <SharePicker value={saveSharing} onChange={setSaveSharing} environmentId={environmentId} compact={false}/>
          {/* Show what filters will be saved */}
          {(currentFilters.length > 0 || currentFilterChip) && (
            <div style={{ padding:"6px 8px", background:"#EEF2FF", borderRadius:6, fontSize:11, color:C.accent }}>
              <span style={{ fontWeight:700 }}>Filters to save: </span>
              {currentFilterChip && <span style={{ background:"white", padding:"1px 6px", borderRadius:4, marginRight:4 }}>
                {currentFilterChip.fieldLabel || currentFilterChip.fieldKey}: {currentFilterChip.fieldValue}
              </span>}
              {currentFilters.map((f,i) => {
                const fd = fields.find(x => x.id === f.fieldId);
                return <span key={i} style={{ background:"white", padding:"1px 6px", borderRadius:4, marginRight:4 }}>
                  {fd?.name || "?"} {f.op} {f.value}
                </span>;
              })}
            </div>
          )}
          {!currentFilters.length && !currentFilterChip && (
            <div style={{ padding:"6px 8px", background:"#FEF3C7", borderRadius:6, fontSize:11, color:"#92400E" }}>
              No filters active — this list will show all records
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => { setShowSave(false); setSaveName(""); }} style={{ flex:1, padding:"5px", borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !saveName.trim()} style={{ flex:2, padding:"5px", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F, opacity:(!saveName.trim()||saving)?0.5:1 }}>
              {saving ? "Saving…" : "Save list"}
            </button>
          </div>
        </div>
      )}

      {/* Views list */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {views.length === 0 ? (
          <div style={{ padding:"20px 14px", textAlign:"center", fontSize:12, color:C.text3, fontStyle:"italic" }}>No saved lists yet</div>
        ) : views.map(view => (
          <div key={view.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
            borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background .1s" }}
            onMouseEnter={e => e.currentTarget.style.background="#f8f9fc"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            {/* Load button */}
            <div onClick={() => { onLoad(view); onClose(); }} style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{view.name}</div>
              <div style={{ fontSize:10, color:C.text3, marginTop:1, display:"flex", alignItems:"center", gap:6 }}>
                <span>Table</span>
                {(view.filters?.length > 0 || view.filter_chip) && <span>· {
                  [view.filters?.length > 0 && `${view.filters.length} filter${view.filters.length !== 1 ? "s" : ""}`,
                   view.filter_chip && `${view.filter_chip.fieldLabel || view.filter_chip.fieldKey}: ${view.filter_chip.fieldValue}`
                  ].filter(Boolean).join(", ")
                }</span>}
                {(() => {
                  const sh = view.sharing;
                  if (!sh) return view.is_shared ? <span style={{ color:"#0ca678", fontWeight:600 }}>· Everyone</span> : <span style={{ color:C.text3 }}>· Private</span>;
                  if (sh.visibility === "everyone") return <span style={{ color:"#0ca678", fontWeight:600 }}>· Everyone</span>;
                  if (sh.visibility === "specific") {
                    const u = (sh.user_ids||[]).length, g = (sh.group_ids||[]).length;
                    return <span style={{ color:C.accent, fontWeight:600 }}>· {[u&&`${u}u`,g&&`${g}g`].filter(Boolean).join(", ") || "Specific"}</span>;
                  }
                  return <span style={{ color:C.text3 }}>· Private</span>;
                })()}
              </div>
            </div>
            {/* Actions */}
            <div style={{ display:"flex", gap:2, flexShrink:0 }}>
              {view.created_by === (userId || "unknown") && (
                <button onClick={e => { e.stopPropagation(); handleToggleShare(view); }}
                  title={view.is_shared ? "Make private" : "Share with team"}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:5, color: view.is_shared ? "#0ca678" : C.text3, display:"flex" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                </button>
              )}
              {view.created_by === (userId || "unknown") && (
                <button onClick={e => { e.stopPropagation(); handleDelete(view.id); }}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:5, color: deleting===view.id ? "#ef4444" : C.text3, display:"flex" }}
                  disabled={deleting===view.id}>
                  <Ic n="trash" s={12}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Column Picker Dropdown ───────────────────────────────────────────────── */
const ColumnPickerDropdown = ({ fields, visibleIds, onChange, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const allCols = [...fields, ...SYSTEM_COLS];

  const toggleField = (id) => {
    if (visibleIds.includes(id)) {
      if (visibleIds.length <= 1) return;
      onChange(visibleIds.filter(x => x !== id));
    } else {
      onChange([...visibleIds, id]);
    }
  };

  return (
    <div ref={ref} style={{ position:"absolute", top:"100%", right:0, zIndex:300, marginTop:4,
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.12)",
      minWidth:220, maxHeight:400, overflowY:"auto", padding:"8px 0" }}>
      <div style={{ padding:"6px 14px 8px", fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:`1px solid ${C.border}`, marginBottom:4 }}>
        Columns
      </div>
      {/* Field columns */}
      {fields.map(f => {
        const on = visibleIds.includes(f.id);
        return (
          <div key={f.id} onClick={() => toggleField(f.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 14px", cursor:"pointer",
              background: on ? C.accentLight : "transparent", transition:"background .1s" }}
            onMouseEnter={e => !on && (e.currentTarget.style.background="#f8f9fc")}
            onMouseLeave={e => !on && (e.currentTarget.style.background="transparent")}>
            <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${on?C.accent:C.border}`,
              background: on ? C.accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .1s" }}>
              {on && <Ic n="check" s={10} c="white"/>}
            </div>
            <span style={{ fontSize:13, fontWeight: on?600:400, color: on?C.accent:C.text1 }}>{f.name}</span>
          </div>
        );
      })}
      {/* System columns divider */}
      <div style={{ padding:"6px 14px 6px", fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", borderTop:`1px solid ${C.border}`, marginTop:4 }}>System</div>
      {SYSTEM_COLS.map(f => {
        const on = visibleIds.includes(f.id);
        return (
          <div key={f.id} onClick={() => toggleField(f.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 14px", cursor:"pointer",
              background: on ? C.accentLight : "transparent", transition:"background .1s" }}
            onMouseEnter={e => !on && (e.currentTarget.style.background="#f8f9fc")}
            onMouseLeave={e => !on && (e.currentTarget.style.background="transparent")}>
            <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${on?C.accent:C.border}`,
              background: on ? C.accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {on && <Ic n="check" s={10} c="white"/>}
            </div>
            <span style={{ fontSize:13, fontWeight: on?600:400, color: on?C.accent:C.text1 }}>{f.name}</span>
            <span style={{ marginLeft:"auto", fontSize:10, color:C.text3, background:"#f1f5f9", padding:"1px 5px", borderRadius:99 }}>system</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Column Filter Popover ──────────────────────────────────────────────────── */
const TYPE_OPS_CF = {
  text:        ["contains","does not contain","is","is not","starts with","is empty","not empty"],
  textarea:    ["contains","does not contain","is empty","not empty"],
  number:      ["=","≠","<",">","≤","≥","is empty","not empty"],
  currency:    ["=","≠","<",">","≤","≥","is empty","not empty"],
  date:        ["is","before","after","is empty","not empty"],
  boolean:     ["is true","is false"],
  select:      ["is","is not","is empty","not empty"],
  multi_select:["includes","excludes","is empty","not empty"],
  email:       ["contains","is","is empty","not empty"],
  url:         ["contains","is empty","not empty"],
  phone:       ["contains","is","is empty","not empty"],
  rating:      ["=","≠","<",">"],
  people:      ["includes","is empty","not empty"],
};
const NO_VAL_OPS_CF = new Set(["is empty","not empty","is true","is false"]);
const getOpsCF = (f) => TYPE_OPS_CF[f?.field_type] || TYPE_OPS_CF.text;

const ColumnFilterPopover = ({ field, filterId, initialOp, initialVal, rect, onApply, onClear, onClose }) => {
  const [op, setOp]   = useState(initialOp || getOpsCF(field)[0]);
  const [val, setVal] = useState(initialVal ?? "");
  const popRef        = useRef(null);
  const needsVal      = !NO_VAL_OPS_CF.has(op);
  const ops           = getOpsCF(field);

  useEffect(() => {
    const onDown = e => { if (popRef.current && !popRef.current.contains(e.target)) onClose(); };
    const onKey  = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => { if (!needsVal) setVal(""); }, [op, needsVal]);

  const popW = 264;
  const left = Math.min((rect?.left ?? 100), window.innerWidth - popW - 12);
  const top  = Math.min((rect?.bottom ?? 80) + 6, window.innerHeight - 320);

  const handleApply = () => onApply(op, needsVal ? val : "");

  const inputStyle = {
    width:"100%", padding:"7px 10px", borderRadius:8,
    border:`1px solid ${C.border}`, fontSize:13, fontFamily:F,
    outline:"none", color:C.text1, background:C.surface, boxSizing:"border-box",
  };

  const renderValue = () => {
    if (!needsVal) return null;
    const ft = field?.field_type;
    if (ft === "boolean") return null;
    if (ft === "select" || ft === "multi_select") {
      const opts = field?.options || [];
      if (!opts.length) return <input value={val} onChange={e=>setVal(e.target.value)} placeholder="Value…" style={inputStyle} autoFocus/>;
      return (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:4 }}>
          {opts.map(o => {
            const on = String(val).split(",").map(s=>s.trim()).includes(String(o));
            return (
              <button key={o} onClick={() => {
                const parts = val ? val.split(",").map(s=>s.trim()).filter(Boolean) : [];
                const next  = on ? parts.filter(p=>p!==String(o)) : [...parts, String(o)];
                setVal(next.join(", "));
              }}
                style={{ padding:"4px 10px", borderRadius:99, fontSize:12, fontWeight:600,
                  border:`1.5px solid ${on ? C.accent : C.border}`,
                  background: on ? C.accentLight : "transparent",
                  color: on ? C.accent : C.text2, cursor:"pointer", fontFamily:F }}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    if (ft === "date") return <input type="date" value={val} onChange={e=>setVal(e.target.value)} style={inputStyle} autoFocus/>;
    if (["number","currency","rating"].includes(ft))
      return <input type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="Value…" style={inputStyle} autoFocus onKeyDown={e=>e.key==="Enter"&&handleApply()}/>;
    return <input type={ft==="email"?"email":"text"} value={val} onChange={e=>setVal(e.target.value)} placeholder="Value…" style={inputStyle} autoFocus onKeyDown={e=>e.key==="Enter"&&handleApply()}/>;
  };

  return ReactDOM.createPortal(
    <div ref={popRef} style={{
      position:"fixed", top, left, width:popW, zIndex:9999,
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.15)",
      padding:"14px 14px 12px", fontFamily:F,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:11 }}>
        <div style={{ width:22, height:22, borderRadius:6, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n="filter" s={11} c={C.accent}/>
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:C.text1, flex:1 }}>{field?.name}</span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", color:C.text3, padding:2 }}>
          <Ic n="x" s={14}/>
        </button>
      </div>
      <div style={{ marginBottom:8 }}>
        <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>Condition</label>
        <select value={op} onChange={e=>setOp(e.target.value)} style={{ ...inputStyle, padding:"7px 10px" }}>
          {ops.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {needsVal && (
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>Value</label>
          {renderValue()}
        </div>
      )}
      <div style={{ display:"flex", gap:6, marginTop:needsVal?0:8 }}>
        {filterId && (
          <button onClick={onClear}
            style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:"#dc2626", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
            Remove
          </button>
        )}
        <button onClick={handleApply}
          style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none",
            background:C.accent, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F }}>
          Apply filter
        </button>
      </div>
    </div>,
    document.body
  );
};

/* ─── Filter Bar ─────────────────────────────────────────────────────────────── */
const FILTER_OPS = {
  text:    ["contains","does not contain","is","is not","is empty","is not empty"],
  number:  ["=","≠","<",">","≤","≥","is empty","is not empty"],
  date:    ["is","is before","is after","is empty","is not empty"],
  select:  ["is","is not","is empty","is not empty"],
  multi_select: ["includes","excludes","is empty","is not empty"],
  boolean: ["is true","is false"],
};

const getOpsForField = (f) => {
  if (!f) return FILTER_OPS.text;
  if (f.field_type === "select") return FILTER_OPS.select;
  if (f.field_type === "multi_select") return FILTER_OPS.multi_select;
  if (f.field_type === "dataset") return FILTER_OPS.multi_select;
  if (f.field_type === "skills")  return FILTER_OPS.multi_select;
  if (f.field_type === "boolean") return FILTER_OPS.boolean;
  if (["number","currency","rating"].includes(f.field_type)) return FILTER_OPS.number;
  if (f.field_type === "date") return FILTER_OPS.date;
  return FILTER_OPS.text;
};

const applyFilters = (records, filters, fields, _legacyLogic = "AND", linkedRecords = {}, peopleLinks = [], linkedFieldsMap = {}) => {
  if (!filters.length) return records;
  return records.filter(record => {
    let result = null; // null = not yet evaluated
    for (const filt of filters) {
      const logic = filt.rowLogic || "AND";
      let matches;
      if (filt.source === "linked" && filt.linkedObjectId) {
        // Cross-object: check linked records for this person
        const personLinks = peopleLinks.filter(l =>
          l.person_id === record.id && l.object_id === filt.linkedObjectId
        );
        const linkedRecs = (linkedRecords[filt.linkedObjectId] || [])
          .filter(r => personLinks.some(l => l.record_id === r.id));
        const linkedFields = []; // passed via closure from RecordsView
        matches = linkedRecs.some(lr => testFilter(filt, linkedFieldsMap[filt.linkedObjectId] || [], lr));
      } else {
        matches = testFilter(filt, fields, record);
      }
      if (result === null) { result = matches; }
      else if (logic === "OR") { result = result || matches; }
      else { result = result && matches; }
    }
    return result ?? true;
  });
};

function testFilter(filt, fields, record) {
  const field = fields.find(f => f.id === filt.fieldId);
  if (!field) return true;
  const rawVal = record.data?.[field.api_key];
  const op = filt.op; const fv = filt.value;
  // $me dynamic resolution
  if (fv === ME_TOKEN) return matchesMe(rawVal, field, op);
  if (op === "is empty") return rawVal === null || rawVal === undefined || rawVal === "" || (Array.isArray(rawVal) && rawVal.length === 0);
  if (op === "is not empty") return rawVal !== null && rawVal !== undefined && rawVal !== "" && !(Array.isArray(rawVal) && rawVal.length === 0);
  if (op === "is true") return rawVal === true;
  if (op === "is false") return rawVal === false || rawVal === undefined || rawVal === null;
  const strVal = String(rawVal ?? "").toLowerCase();
  const strFv  = String(fv ?? "").toLowerCase();
  switch (op) {
    case "contains":          return strVal.includes(strFv);
    case "does not contain":  return !strVal.includes(strFv);
    case "starts with":       return strVal.startsWith(strFv);
    case "is":                return strVal === strFv;
    case "is not":            return strVal !== strFv;
    case "=":                 return Number(rawVal) === Number(fv);
    case "≠":                 return Number(rawVal) !== Number(fv);
    case "<": case "before":  return Number(rawVal) < Number(fv) || new Date(rawVal) < new Date(fv);
    case ">": case "after":   return Number(rawVal) > Number(fv) || new Date(rawVal) > new Date(fv);
    case "≤":                 return Number(rawVal) <= Number(fv);
    case "≥":                 return Number(rawVal) >= Number(fv);
    case "includes":          return Array.isArray(rawVal) ? rawVal.some(v => String(v).toLowerCase() === strFv) : strVal === strFv;
    case "excludes":          return Array.isArray(rawVal) ? !rawVal.some(v => String(v).toLowerCase() === strFv) : strVal !== strFv;
    default:                  return true;
  }
}

// ── $me dynamic user filter ────────────────────────────────────────────────────
const ME_TOKEN = "$me";
const ME_DISPLAY = "👤 Logged in user";

let _mePersonRecordId = null;
let _mePersonResolved = false;

/** Pre-resolve the logged-in user's Person record ID (matched by email). */
async function resolveMyPersonId() {
  if (_mePersonResolved) return _mePersonRecordId;
  try {
    const session = JSON.parse(localStorage.getItem("talentos_session") || "{}");
    const email = session.user?.email;
    if (!email || !_currentEnvId) return null;
    const res = await api.get(`/records/search?q=${encodeURIComponent(email)}&environment_id=${_currentEnvId}&limit=5`);
    const records = Array.isArray(res) ? res : (res?.results || []);
    const match = records.find(r => (r.data?.email || "").toLowerCase() === email.toLowerCase());
    _mePersonRecordId = match?.id || null;
    _mePersonResolved = true;
    return _mePersonRecordId;
  } catch { return null; }
}
window.addEventListener("storage", e => { if (e.key === "talentos_session") { _mePersonResolved = false; _mePersonRecordId = null; } });

function getMeContext() {
  try {
    const session = JSON.parse(localStorage.getItem("talentos_session") || "{}");
    const u = session.user;
    if (!u) return null;
    return { userId: u.id, email: (u.email || "").toLowerCase(), fullName: [u.first_name, u.last_name].filter(Boolean).join(" "), personRecordId: _mePersonRecordId };
  } catch { return null; }
}

function matchesMe(rawVal, field, op) {
  const me = getMeContext();
  if (!me) return false;
  if (field?.field_type === "people" || field?.field_type === "multi_lookup") {
    const arr = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);
    const matched = arr.some(p => {
      const pid = typeof p === "object" ? p.id : p;
      const pname = typeof p === "object" ? (p.name || "").toLowerCase() : "";
      return pid === me.personRecordId || pid === me.userId || pname === me.fullName.toLowerCase();
    });
    return (op === "is not" || op === "excludes") ? !matched : matched;
  }
  if (field?.field_type === "email") {
    const sv = String(rawVal || "").toLowerCase();
    if (op === "is" || op === "=") return sv === me.email;
    if (op === "is not" || op === "≠") return sv !== me.email;
    if (op === "contains") return sv.includes(me.email);
    return sv === me.email;
  }
  const sv = String(rawVal || "").toLowerCase(), mn = me.fullName.toLowerCase();
  if (op === "is" || op === "=") return sv === mn;
  if (op === "is not" || op === "≠") return sv !== mn;
  if (op === "contains") return sv.includes(mn);
  if (op === "does not contain") return !sv.includes(mn);
  return sv === mn;
}

const displayFilterValue = v => v === ME_TOKEN ? ME_DISPLAY : v;

// ── AdvancedFilterModal ────────────────────────────────────────────────────────
// Filter object shape:
//   { id, source:"own"|"linked", linkedObjectId?, linkedObjectSlug?, fieldId, op, value, rowLogic:"AND"|"OR" }
const TYPE_OPS = {
  text:        ["contains","does not contain","is","is not","starts with","is empty","is not empty"],
  textarea:    ["contains","does not contain","is empty","is not empty"],
  number:      ["=","≠","<",">","≤","≥","is empty","is not empty"],
  currency:    ["=","≠","<",">","≤","≥","is empty","is not empty"],
  percent:     ["=","≠","<",">","≤","≥","is empty","is not empty"],
  date:        ["is","before","after","is empty","is not empty"],
  boolean:     ["is true","is false"],
  select:      ["is","is not","is empty","is not empty"],
  multi_select:["includes","excludes","is empty","is not empty"],
  email:       ["contains","is","is empty","is not empty"],
  url:         ["contains","is empty","is not empty"],
  phone:       ["contains","is","is empty","is not empty"],
  rating:      ["=","≠","<",">","≤","≥"],
};
const NO_VAL_OPS = ["is empty","is not empty","is true","is false"];

// ── FilterRow — module-level so it is never recreated on parent re-render ─────
// (defining inside AdvancedFilterPanel caused focus loss on every keystroke)
const FilterRow = ({ filt, idx, ownGroup, linkedGroups, onUpdate, onRemove }) => {
  const getOps = f => TYPE_OPS[f?.field_type] || TYPE_OPS.text;
  const needsVal = op => !NO_VAL_OPS.includes(op);

  const findField = () => {
    if (filt.source === "linked" && filt.linkedObjectId) {
      const grp = linkedGroups.find(g => g.objectId === filt.linkedObjectId);
      return (grp?.fields || []).find(f => f.id === filt.fieldId);
    }
    return (ownGroup?.fields || []).find(f => f.id === filt.fieldId);
  };

  const field   = findField();
  const ops     = getOps(field);
  const showVal = needsVal(filt.op);
  const opts    = field?.options
    ? (Array.isArray(field.options) ? field.options : (field.options?.split?.(",") || []))
    : [];

  const sel = { padding:"7px 10px", borderRadius:8, border:`1.5px solid ${C.border}`,
    fontSize:13, fontFamily:F, background:C.surface, color:C.text1, outline:"none",
    transition:"border-color .15s" };

  const handleFieldChange = e => {
    const parts = e.target.value.split("|");
    const src   = parts[0];
    const objId = parts[1];
    const fldId = parts[2];
    const grp   = src === "linked"
      ? linkedGroups.find(g => g.objectId === objId)
      : ownGroup;
    const f = (grp?.fields || []).find(x => x.id === fldId);
    onUpdate(filt.id, {
      source: src,
      linkedObjectId:   src === "linked" ? objId : undefined,
      linkedObjectSlug: src === "linked" ? grp?.objectSlug : undefined,
      fieldId: fldId,
      op:      getOps(f)[0],
      value:   "",
    });
  };

  const fieldValue = filt.source === "linked"
    ? `linked|${filt.linkedObjectId}|${filt.fieldId}`
    : `own||${filt.fieldId}`;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0",
      borderBottom:`1px solid ${C.border}44` }}>

      {/* Row logic connector */}
      <div style={{ width:44, flexShrink:0, textAlign:"center" }}>
        {idx === 0
          ? <span style={{ fontSize:11, fontWeight:700, color:C.text3,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Where</span>
          : <button
              onClick={() => onUpdate(filt.id, { rowLogic: filt.rowLogic === "AND" ? "OR" : "AND" })}
              title="Click to toggle AND / OR"
              style={{ fontSize:11, fontWeight:800,
                color:      filt.rowLogic === "OR" ? "#7c3aed" : C.accent,
                background: filt.rowLogic === "OR" ? "#7c3aed18" : C.accentLight,
                border:`1.5px solid ${filt.rowLogic === "OR" ? "#7c3aed44" : C.accent+"44"}`,
                borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:F }}>
              {filt.rowLogic || "AND"}
            </button>
        }
      </div>

      {/* Field picker — grouped */}
      <select value={fieldValue} onChange={handleFieldChange}
        style={{ ...sel, flex:"0 0 180px" }}
        onFocus={e=>e.target.style.borderColor=C.accent}
        onBlur={e=>e.target.style.borderColor=C.border}>
        <optgroup label="This record">
          {(ownGroup?.fields || []).map(f => (
            <option key={f.id} value={`own||${f.id}`}>{f.name}</option>
          ))}
        </optgroup>
        {linkedGroups.map(grp => (
          <optgroup key={grp.objectId} label={`Linked ${grp.label}`}>
            {grp.fields.map(f => (
              <option key={f.id} value={`linked|${grp.objectId}|${f.id}`}>{f.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator */}
      <select value={filt.op} onChange={e => onUpdate(filt.id, { op: e.target.value, value: "" })}
        style={{ ...sel, flex:"0 0 150px" }}
        onFocus={e=>e.target.style.borderColor=C.accent}
        onBlur={e=>e.target.style.borderColor=C.border}>
        {ops.map(op => <option key={op} value={op}>{op}</option>)}
      </select>

      {/* Value + $me button */}
      {showVal && <>
        <button
          onClick={() => onUpdate(filt.id, { value: ME_TOKEN })}
          title="Match the currently logged-in user"
          style={{
            padding:"5px 10px", borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0,
            border: filt.value === ME_TOKEN ? `2px solid ${C.accent}` : `1.5px solid ${C.border}`,
            background: filt.value === ME_TOKEN ? C.accentLight : "white",
            color: filt.value === ME_TOKEN ? C.accent : C.text2,
            cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4,
            fontFamily:F, transition:"all .15s"
          }}>
          <Ic n="user" s={11} c={filt.value === ME_TOKEN ? C.accent : C.text3}/> Me
        </button>
        {filt.value !== ME_TOKEN && (opts.length > 0
        ? <select value={filt.value} onChange={e => onUpdate(filt.id, { value: e.target.value })}
            style={{ ...sel, flex:1 }}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border}>
            <option value="">Select…</option>
            {opts.map(o => {
              const v = typeof o === "object" ? o.value : o;
              const l = typeof o === "object" ? o.label : o;
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
        : field?.field_type === "date"
          ? <input type="date" value={filt.value}
              onChange={e => onUpdate(filt.id, { value: e.target.value })}
              style={{ ...sel, flex:1 }}/>
          : (field?.field_type === "number" || field?.field_type === "currency" || field?.field_type === "rating")
            ? <input type="number" value={filt.value} placeholder="Value"
                onChange={e => onUpdate(filt.id, { value: e.target.value })}
                style={{ ...sel, flex:1 }}/>
            : <input value={filt.value} placeholder="Value…"
                onChange={e => onUpdate(filt.id, { value: e.target.value })}
                style={{ ...sel, flex:1 }}
                onFocus={e=>e.target.style.borderColor=C.accent}
                onBlur={e=>e.target.style.borderColor=C.border}/>
      )}</>}
      {!showVal && <div style={{ flex:1 }}/>}

      <button onClick={() => onRemove(filt.id)}
        style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer",
          padding:"4px 6px", display:"flex", color:C.text3, borderRadius:6 }}
        onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
        onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
        <Ic n="x" s={14}/>
      </button>
    </div>
  );
};

const AdvancedFilterPanel = ({ fields, filters, logic, onFiltersChange, onLogicChange, onSave, onClose, open,
  allObjects = [], linkedObjectFields = {} }) => {
  if (!open) return null;

  const getOps = f => TYPE_OPS[f?.field_type] || TYPE_OPS.text;

  // Build field options grouped by object
  const ownGroup = { label: null, fields, objectId: null, objectSlug: null };
  const linkedGroups = Object.entries(linkedObjectFields)
    .filter(([key]) => !key.startsWith('__'))
    .map(([objId, flds]) => {
    const obj = allObjects.find(o => o.id === objId);
    return { label: obj?.plural_name || obj?.name || "Linked", fields: flds, objectId: objId, objectSlug: obj?.slug };
  }).filter((g, i, arr) => g.fields?.length > 0 && arr.findIndex(x => x.objectId === g.objectId) === i);

  const findField = filt => {
    if (filt.source === "linked" && filt.linkedObjectId) {
      return (linkedObjectFields[filt.linkedObjectId] || []).find(f => f.id === filt.fieldId);
    }
    return fields.find(f => f.id === filt.fieldId);
  };

  const addRow = () => {
    const first = fields[0];
    onFiltersChange([...filters, {
      id: Date.now() + "",
      source: "own",
      fieldId: first?.id || "",
      op: first ? getOps(first)[0] : "contains",
      value: "",
      rowLogic: "AND",
    }]);
  };

  const updateRow = (id, patch) => onFiltersChange(filters.map(f => f.id === id ? { ...f, ...patch } : f));
  const removeRow = id => onFiltersChange(filters.filter(f => f.id !== id));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,41,.5)",
      zIndex:9500, display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(2px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, borderRadius:16, width:720, maxWidth:"calc(100vw - 40px)",
        maxHeight:"80vh", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,.22)", border:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accentLight,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="filter" s={15} c={C.accent}/>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:C.text1 }}>Filter records</div>
              {filters.length > 0 && (
                <div style={{ fontSize:11, color:C.text3 }}>
                  {filters.length} condition{filters.length!==1?"s":""} · showing records where conditions match
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            display:"flex", color:C.text3, padding:4, borderRadius:6 }}
            onMouseEnter={e=>e.currentTarget.style.color=C.text1}
            onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
            <Ic n="x" s={16}/>
          </button>
        </div>

        {/* Filter rows */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 20px" }}>
          {filters.length === 0
            ? <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>
                  <Ic n="filter" s={32} c={C.border}/>
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text2, marginBottom:6 }}>No filters yet</div>
                <div style={{ fontSize:13, color:C.text3 }}>Add a condition below to filter records</div>
              </div>
            : filters.map((f, i) => (
            <FilterRow
              key={f.id}
              filt={f}
              idx={i}
              ownGroup={ownGroup}
              linkedGroups={linkedGroups}
              onUpdate={updateRow}
              onRemove={removeRow}
            />
          ))
          }
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 20px", borderTop:`1px solid ${C.border}`, flexShrink:0, gap:8 }}>
          <button onClick={addRow}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8,
              border:`1.5px dashed ${C.border}`, background:"transparent", fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:F, color:C.text2, transition:"all .12s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;}}>
            <Ic n="plus" s={13}/> Add condition
          </button>
          <div style={{ display:"flex", gap:8 }}>
            {filters.length > 0 && (
              <button onClick={() => onFiltersChange([])}
                style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${C.border}`,
                  background:"transparent", fontSize:13, fontWeight:600,
                  cursor:"pointer", fontFamily:F, color:C.text3 }}>
                Clear all
              </button>
            )}
            {filters.length > 0 && onSave && (
              <button onClick={onSave}
                style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${C.accent}`,
                  background:C.accentLight, fontSize:13, fontWeight:600,
                  cursor:"pointer", fontFamily:F, color:C.accent }}>
                Save as list
              </button>
            )}
            <button onClick={onClose}
              style={{ padding:"8px 18px", borderRadius:8, border:"none",
                background:C.accent, color:"white", fontSize:13, fontWeight:700,
                cursor:"pointer", fontFamily:F }}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterBar = ({ fields = [], filters = [], onEditFilter, onRemoveFilter }) => {
  if (!filters.length) return null;
  const opLabel = op => ({contains:"~","does not contain":"!~","starts with":"^",
    is:"=","is not":"≠","=":"=","≠":"≠","<":"<",">":">","≤":"≤","≥":"≥",
    before:"<",after:">",includes:"∋",excludes:"∌",
    "is empty":"∅","not empty":"≠∅","is true":"✓","is false":"✗"}[op]||op);
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
      {filters.map(filt => {
        const field  = fields.find(f => f.id === filt.fieldId);
        const hasVal = filt.value && !["is empty","not empty","is true","is false"].includes(filt.op);
        return (
          <div key={filt.id}
            style={{ display:"inline-flex", alignItems:"center", borderRadius:20,
              border:`1.5px solid ${C.accent}`, background:C.accentLight, overflow:"hidden" }}>
            <button
              onClick={e => onEditFilter?.(filt, e.currentTarget.getBoundingClientRect())}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 8px 4px 10px",
                background:"transparent", border:"none", cursor:"pointer", fontFamily:F, fontSize:12 }}>
              <Ic n="filter" s={10} c={C.accent}/>
              <span style={{ color:C.accent, fontWeight:700 }}>{field?.name||"?"}</span>
              <span style={{ color:C.text3, fontSize:11 }}>{opLabel(filt.op)}</span>
              {hasVal && <span style={{ color: filt.value === ME_TOKEN ? C.accent : C.text2, fontWeight: filt.value === ME_TOKEN ? 700 : 400, fontStyle: filt.value === ME_TOKEN ? "normal" : "italic", maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayFilterValue(filt.value)}</span>}
            </button>
            <button onClick={e=>{e.stopPropagation();onRemoveFilter?.(filt.id);}}
              style={{ background:"transparent", border:"none", borderLeft:`1px solid ${C.accent}44`,
                padding:"4px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.accent+"22"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Ic n="x" s={10} c={C.accent}/>
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Bulk Action Bar ─────────────────────────────────────────────────────── */
// ─── Bulk Confirm Modal ───────────────────────────────────────────────────────
function BulkConfirmModal({ action, count, objectName, fieldId, value, fields, onConfirm, onCancel }) {
  const field = fields?.find(f => f.id === fieldId);
  const isDanger = action === "delete";

  const summary = action === "delete"
    ? [`Permanently delete ${count} ${objectName} records`, "This cannot be undone"]
    : [
        `Update ${count} ${objectName} records`,
        field ? `Set "${field.name}" to: ${value ?? "—"}` : "Apply field change to all selected records",
      ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background:"white", borderRadius:16, padding:"28px 28px 24px", maxWidth:420, width:"90%",
        boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:12,
            background: isDanger ? "#fef2f2" : "#eff6ff",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDanger?"#ef4444":"#3b82f6"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isDanger
                ? <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
            </svg>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#111827" }}>
              {isDanger ? "Confirm Bulk Delete" : "Confirm Bulk Edit"}
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:1 }}>
              {count} records selected — above your warning threshold
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div style={{ background: isDanger?"#fef2f2":"#eff6ff", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color: isDanger?"#ef4444":"#3b82f6",
            textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
            Here's what will happen
          </div>
          {summary.map((line, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom: i<summary.length-1?6:0 }}>
              <span style={{ color: isDanger?"#ef4444":"#3b82f6", marginTop:1, flexShrink:0 }}>
                {i===0 ? "→" : "·"}
              </span>
              <span style={{ fontSize:13, color: isDanger?"#7f1d1d":"#1e3a5f", fontWeight: i===0?600:400 }}>{line}</span>
            </div>
          ))}
        </div>

        {/* Tip */}
        <p style={{ fontSize:11, color:"#9ca3af", margin:"0 0 20px", lineHeight:1.5 }}>
          You can change the threshold for this warning in{" "}
          <strong style={{ color:"#6b7280" }}>Settings → Appearance → Bulk Action Warning</strong>.
        </p>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:"10px", borderRadius:9, border:"1.5px solid #e5e7eb",
              background:"white", color:"#374151", fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex:2, padding:"10px", borderRadius:9, border:"none",
              background: isDanger?"#ef4444":"#3b82f6", color:"white",
              fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {isDanger ? `Delete ${count} Records` : `Update ${count} Records`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Double-Confirm Delete (type count to confirm, super_admin only) ─────────
const DeleteConfirmInline = ({ count, session, onConfirm, onCancel }) => {
  const [typed, setTyped] = useState("");
  const isSuperAdmin = session?.role?.slug === "super_admin";
  if (!isSuperAdmin) {
    return (
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#fca5a5", fontWeight:600 }}>Only super administrators can bulk delete.</span>
        <button onClick={onCancel} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>OK</button>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
      <span style={{ fontSize:12, color:"#fca5a5", fontWeight:600 }}>Type <strong>{count}</strong> to confirm deletion:</span>
      <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus placeholder={String(count)}
        style={{ width:80, padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)", color:"white", fontSize:12, fontFamily:F, textAlign:"center" }}/>
      <button onClick={onConfirm} disabled={typed !== String(count)}
        style={{ padding:"5px 12px", borderRadius:7, border:"none", background:typed===String(count)?"#ef4444":"#6b7280", color:"white", fontSize:12, fontWeight:700, cursor:typed===String(count)?"pointer":"not-allowed", fontFamily:F, opacity:typed===String(count)?1:0.5 }}>Delete {count} records</button>
      <button onClick={onCancel} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
    </div>
  );
};

const BtnDark = React.forwardRef(({ children, onClick, style = {} }, ref) => (
  <button ref={ref} onClick={onClick} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px",
    borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.12)",
    color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, ...style }}>
    {children}
  </button>
));

const BulkActionBar = ({ count, total, fields, onSelectAll, onClearAll, onDelete, onEdit, onCompare,
  hasActiveFilters, totalFilteredCount, selectAllMatching, onSelectAllMatching, onClearSelectAll, session,
  objectSlug, selectedRecords, environment, allObjects, onBulkAction }) => {
  const [showEditPicker,   setShowEditPicker]   = useState(false);
  const [editFieldId,      setEditFieldId]      = useState("");
  const [editValue,        setEditValue]        = useState("");
  const [confirming,       setConfirming]       = useState(false);
  const [showComms,        setShowComms]        = useState(false);
  const [showNoteModal,    setShowNoteModal]    = useState(false);
  const [showLinkModal,    setShowLinkModal]    = useState(false);
  const [noteText,         setNoteText]         = useState("");
  const [linkSearch,       setLinkSearch]       = useState("");
  const [linkObjFilter,    setLinkObjFilter]    = useState("");
  const [linkTargets,      setLinkTargets]      = useState([]);
  const [linkLoading,      setLinkLoading]      = useState(false);
  const commsRef   = useRef(null);
  const commsBtnRef = useRef(null);
  const editBtnRef  = useRef(null);
  const [commsPos,  setCommsPos]  = useState(null);
  const [editPos,   setEditPos]   = useState(null);
  const isPeople = objectSlug === "people";

  // Position helpers — compute fixed coords above a button
  const posAboveBtn = (btnRef) => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { bottom: window.innerHeight - r.top + 6, left: r.left };
  };

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showComms && !showEditPicker) return;
    const h = e => {
      if (showComms && commsBtnRef.current && !commsBtnRef.current.contains(e.target)) setShowComms(false);
      if (showEditPicker && editBtnRef.current && !editBtnRef.current.contains(e.target)) setShowEditPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showComms, showEditPicker]);

  // Load all linkable records (only those with a Linked Person workflow) when modal opens
  useEffect(() => {
    if (!showLinkModal || !environment?.id) return;
    (async () => {
      setLinkLoading(true);
      const nonPeople = (allObjects || []).filter(o => o.slug !== "people");
      const [recordGroups, allAssignments] = await Promise.all([
        Promise.all(nonPeople.map(async o => {
          const recs = await api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=200`)
            .catch(() => ({ records: [] }));
          return (recs.records || []).map(r => ({ ...r, object_name: o.name, object_color: o.color }));
        })),
        api.get(`/workflows/assignments/all?environment_id=${environment.id}`)
          .catch(() => []),
      ]);
      const allRecs = recordGroups.flat();
      const assignmentMap = {};
      (Array.isArray(allAssignments) ? allAssignments : []).forEach(a => {
        if ((a.workflow?.steps || []).length > 0) assignmentMap[a.record_id] = true;
      });
      const withWorkflow = Object.keys(assignmentMap).length > 0
        ? allRecs.filter(r => assignmentMap[r.id])
        : allRecs;
      setLinkTargets(withWorkflow);
      setLinkLoading(false);
    })();
  }, [showLinkModal, environment?.id]);

  const editableFields = fields.filter(f => !["id"].includes(f.api_key));
  const chosenField    = editableFields.find(f => f.id === editFieldId);

  const handleBulkEdit = () => {
    if (!editFieldId) return;
    onEdit(editFieldId, editValue);
    setShowEditPicker(false); setEditFieldId(""); setEditValue("");
  };

  const handleBulkNote = () => {
    if (!noteText.trim()) return;
    onBulkAction?.("note", { text: noteText });
    setNoteText(""); setShowNoteModal(false);
  };

  const handleBulkLink = (targetRecord) => {
    onBulkAction?.("link", { objectId: targetRecord.object_id, targetId: targetRecord.id });
    setShowLinkModal(false); setLinkSearch(""); setLinkObjFilter("");
  };

  const selSt = { width:"100%", padding:"6px 8px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none", background:"white", color:C.text1, boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:"#1e293b",
      borderRadius:10, marginBottom:10, flexWrap:"wrap", position:"relative" }}>
      <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{selectAllMatching ? `All ${totalFilteredCount}` : count} selected</span>
      <div style={{ display:"flex", gap:6, marginLeft:4 }}>
        <button onClick={onSelectAll}
          style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          Select all {total}
        </button>
        {hasActiveFilters && totalFilteredCount > total && !selectAllMatching && (
          <button onClick={onSelectAllMatching}
            style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(99,179,237,0.4)", background:"rgba(99,179,237,0.15)", color:"#93c5fd", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
            Select all {totalFilteredCount} matching filter
          </button>
        )}
        {selectAllMatching && (
          <span style={{ fontSize:12, fontWeight:600, color:"#93c5fd", display:"flex", alignItems:"center", gap:4 }}>
            All {totalFilteredCount} matching records selected
            <button onClick={onClearSelectAll} style={{ background:"none", border:"none", color:"#93c5fd", cursor:"pointer", fontSize:12, textDecoration:"underline", fontFamily:F }}>(undo)</button>
          </span>
        )}
        <button onClick={onClearAll}
          style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          Clear
        </button>
      </div>
      <div style={{ flex:1 }}/>
      {/* Bulk edit */}
      <div>
        <button ref={editBtnRef} onClick={() => { setEditPos(posAboveBtn(editBtnRef)); setShowEditPicker(s => !s); }}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.12)", color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          <Ic n="edit" s={12} c="white"/> Edit fields
        </button>
        {showEditPicker && editPos && ReactDOM.createPortal(
          <div style={{ position:"fixed", bottom:editPos.bottom, left:editPos.left, zIndex:9700, background:"white", borderRadius:12, border:`1px solid ${C.border}`, boxShadow:"0 8px 28px rgba(0,0,0,.15)", padding:14, minWidth:280, display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Set field on {count} records</div>
            <select value={editFieldId} onChange={e => { setEditFieldId(e.target.value); setEditValue(""); }} style={selSt}>
              <option value="">Choose field…</option>
              {editableFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {chosenField && (
              chosenField.field_type === "select" ? (
                <select value={editValue} onChange={e => setEditValue(e.target.value)} style={selSt}>
                  <option value="">— clear —</option>
                  {(chosenField.options||[]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : chosenField.field_type === "boolean" ? (
                <select value={editValue} onChange={e => setEditValue(e.target.value)} style={selSt}>
                  <option value="">— clear —</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input value={editValue} onChange={e => setEditValue(e.target.value)}
                  placeholder={`New value for ${chosenField.name}…`}
                  style={{...selSt, width:"100%", boxSizing:"border-box"}}/>
              )
            )}
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => { setShowEditPicker(false); setEditFieldId(""); setEditValue(""); }}
                style={{ flex:1, padding:"6px", borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={handleBulkEdit} disabled={!editFieldId}
                style={{ flex:2, padding:"6px", borderRadius:7, border:"none", background:C.accent, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F, opacity:!editFieldId?0.5:1 }}>Apply</button>
            </div>
          </div>,
          document.body
        )}
      </div>
      {isPeople && <>
        <div>
          <BtnDark ref={commsBtnRef} onClick={() => { setCommsPos(posAboveBtn(commsBtnRef)); setShowComms(s => !s); }}>
            <Ic n="mail" s={12} c="white"/> Communicate
            <Ic n="chevD" s={10} c="rgba(255,255,255,0.6)"/>
          </BtnDark>
          {showComms && commsPos && ReactDOM.createPortal(
            <div style={{ position:"fixed", bottom:commsPos.bottom, left:commsPos.left, zIndex:9700,
              background:"white", border:`1px solid ${C.border}`, borderRadius:10,
              boxShadow:"0 8px 24px rgba(0,0,0,.15)", overflow:"hidden", minWidth:170 }}>
              {[
                { type:"email", icon:"mail", label:"Send Email" },
                { type:"sms", icon:"message", label:"Send SMS" },
                { type:"whatsapp", icon:"phone", label:"WhatsApp" },
              ].map(({ type, icon, label }) => (
                <button key={type} onClick={() => { onBulkAction?.("communicate", { type }); setShowComms(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 14px",
                    border:"none", background:"transparent", cursor:"pointer", fontFamily:F,
                    fontSize:12, fontWeight:600, color:C.text1, textAlign:"left" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Ic n={icon} s={13} c={C.accent}/>{label}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
        <BtnDark onClick={() => setShowNoteModal(true)}><Ic n="edit" s={12} c="white"/> Add note</BtnDark>
        <BtnDark onClick={() => onBulkAction?.("interview", {})}><Ic n="calendar" s={12} c="white"/> Interview</BtnDark>
        <BtnDark onClick={() => setShowLinkModal(true)}><Ic n="link" s={12} c="white"/> Link to</BtnDark>
      </>}
      {onCompare && count >= 2 && count <= 5 && (
        <button onClick={onCompare}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.15)", color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          <Ic n="layers" s={12} c="white"/> Compare {count}
        </button>
      )}
      {!confirming ? (
        <button onClick={() => setConfirming(true)}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,0.4)", background:"rgba(239,68,68,0.15)", color:"#fca5a5", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          <Ic n="trash" s={12} c="#fca5a5"/> Delete {count}
        </button>
      ) : (
        <DeleteConfirmInline count={selectAllMatching ? totalFilteredCount : count} session={session}
          onConfirm={() => { onDelete(); setConfirming(false); }}
          onCancel={() => setConfirming(false)}/>
      )}
      {showNoteModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => e.target === e.currentTarget && setShowNoteModal(false)}>
          <div style={{ background:"white", borderRadius:14, padding:24, width:440, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:12 }}>Add note to {count} people</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus placeholder="Type your note…" rows={4}
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={() => setShowNoteModal(false)} style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={handleBulkNote} disabled={!noteText.trim()} style={{ flex:2, padding:"8px", borderRadius:8, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, opacity:!noteText.trim()?0.5:1 }}>Add Note</button>
            </div>
          </div>
        </div>
      )}
      {showLinkModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => e.target === e.currentTarget && setShowLinkModal(false)}>
          <div style={{ background:"white", borderRadius:16, width:500, maxHeight:"75vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Link {count} {count===1?"person":"people"} to…</div>
              <button onClick={() => setShowLinkModal(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><Ic n="x" s={16} c={C.text3}/></button>
            </div>
            <div style={{ padding:"10px 16px", background:"#fffbeb", borderBottom:`1px solid #fde68a`, display:"flex", alignItems:"flex-start", gap:8 }}>
              <Ic n="info" s={14} c="#92400e"/>
              <span style={{ fontSize:12, color:"#92400e", lineHeight:1.5 }}>Only records with a <strong>Linked Person Workflow</strong> are shown.</span>
            </div>
            <div style={{ display:"flex", gap:8, padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
              <input autoFocus value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search records…"
                style={{ flex:1, padding:"7px 10px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none" }}/>
              <select value={linkObjFilter} onChange={e => setLinkObjFilter(e.target.value)}
                style={{ padding:"7px 10px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:F, outline:"none", background:"white", color:C.text2 }}>
                <option value="">All types</option>
                {[...new Set(linkTargets.map(r => r.object_name))].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {linkLoading ? <div style={{ padding:24, textAlign:"center", color:C.text3, fontSize:13 }}>Loading…</div>
                : (() => {
                    const filtered = linkTargets.filter(r => {
                      if (linkObjFilter && r.object_name !== linkObjFilter) return false;
                      if (!linkSearch) return true;
                      const d = r.data || {};
                      return [d.job_title,d.pool_name,d.name,d.first_name].filter(Boolean).join(" ").toLowerCase().includes(linkSearch.toLowerCase());
                    });
                    if (!filtered.length) return <div style={{ padding:24, textAlign:"center", color:C.text3, fontSize:13 }}>{linkTargets.length===0?"No records with a Linked Person Workflow found.":"No matching records."}</div>;
                    return filtered.map((r,i) => {
                      const d = r.data||{}; const label = d.job_title||d.pool_name||d.name||d.first_name||r.id.slice(0,8); const col = r.object_color||C.accent;
                      return (
                        <div key={r.id} onClick={() => handleBulkLink(r)}
                          style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", cursor:"pointer", borderBottom: i<filtered.length-1?`1px solid ${C.border}`:"none" }}
                          onMouseEnter={e => e.currentTarget.style.background=C.accentLight}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <div style={{ width:34, height:34, borderRadius:9, background:`${col}18`, border:`1.5px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ fontSize:13, fontWeight:800, color:col }}>{label.charAt(0).toUpperCase()}</span>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{label}</div>
                            <div style={{ fontSize:11, color:C.text3 }}>{r.object_name}</div>
                          </div>
                          <span style={{ fontSize:11, color:C.accent, fontWeight:600 }}>+ Link</span>
                        </div>
                      );
                    });
                  })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Candidate Comparison Modal ─────────────────────────────────────────── */
const CompareModal = ({ records, fields, objectColor, onClose, onOpen }) => {
  const [pinned, setPinned]             = useState(null);
  const [aiSummary, setAiSummary]       = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef(null);

  const accent = objectColor || C.accent;

  const eligibleFields = fields.filter(f =>
    !["formula","auto_number","unique_id","lookup","rollup"].includes(f.field_type)
  );

  const [selectedFieldIds, setSelectedFieldIds] = useState(
    () => new Set(eligibleFields.map(f => f.id))
  );

  const compareFields = eligibleFields.filter(f => selectedFieldIds.has(f.id));

  const toggleField = (id) => {
    setSelectedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
    setAiSummary("");
  };
  const selectAll  = () => { setSelectedFieldIds(new Set(eligibleFields.map(f=>f.id))); setAiSummary(""); };
  const selectDiff = () => {
    const diffIds = new Set(eligibleFields.filter(f => {
      const vals = records.map(r => JSON.stringify(r.data?.[f.api_key] ?? ""));
      return new Set(vals).size > 1;
    }).map(f => f.id));
    if (diffIds.size > 0) { setSelectedFieldIds(diffIds); setAiSummary(""); }
  };

  useEffect(() => {
    if (!showFieldPicker) return;
    const handler = (e) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target)) setShowFieldPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFieldPicker]);

  const score = (rec) => {
    let s = 0;
    if (rec.data?.rating)           s += Number(rec.data.rating) * 10;
    if (rec.data?.skills?.length)   s += Math.min(rec.data.skills.length * 5, 30);
    if (rec.data?.years_experience) s += Math.min(Number(rec.data.years_experience) * 2, 20);
    if (rec.data?.email)            s += 5;
    if (rec.data?.phone)            s += 5;
    return Math.min(s, 100);
  };

  const name = (r) => `${r.data?.first_name||""} ${r.data?.last_name||""}`.trim() || r.data?.job_title || r.data?.name || "Record";

  const isDiff = (fieldKey) => {
    const vals = records.map(r => JSON.stringify(r.data?.[fieldKey] ?? ""));
    return new Set(vals).size > 1;
  };

  const generateSummary = async () => {
    setAiLoading(true);
    setAiSummary("");
    try {
      const profileLines = records.map(r => {
        const n = name(r);
        const fieldData = compareFields.map(f => {
          const val = r.data?.[f.api_key];
          if (val === null || val === undefined || val === "") return null;
          const display = Array.isArray(val) ? val.map(v=>v?.name||v).join(", ") : String(val);
          return `  ${f.name}: ${display}`;
        }).filter(Boolean).join("\n");
        return `${n}:\n${fieldData}`;
      }).join("\n\n");

      const prompt = `You are comparing ${records.length} candidates. Provide a concise 3-5 sentence summary highlighting the key differences and similarities between them. Focus on what matters most for a hiring decision. Be specific about standout strengths and notable gaps. End with a one-sentence recommendation if a clear preference exists.\n\nCandidates:\n${profileLines}`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, context: "" }),
      });
      const data = await res.json();
      setAiSummary(data.response || data.message || "Unable to generate summary.");
    } catch {
      setAiSummary("Unable to generate summary — check your AI configuration.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,41,.55)", zIndex:9600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px 16px", overflowY:"auto" }}>
      <div style={{ background:C.bg, borderRadius:18, width:"100%", maxWidth:1160, boxShadow:"0 32px 80px rgba(0,0,0,.25)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:C.surface, borderBottom:`1px solid ${C.border}`, gap:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>Compare {records.length} records</div>
            <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>Differences are highlighted. Click any record to open it.</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>

            {/* AI Summary button */}
            <button
              onClick={generateSummary}
              disabled={aiLoading}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", borderRadius:8, border:"none", background: aiSummary ? `${accent}18` : accent, color: aiSummary ? accent : "white", fontSize:12, fontWeight:700, cursor: aiLoading ? "wait" : "pointer", fontFamily:F, opacity: aiLoading ? 0.7 : 1, transition:"all .15s" }}>
              {aiLoading
                ? <><svg width="12" height="12" viewBox="0 0 24 24" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg> Analysing...</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg> {aiSummary ? "Re-analyse" : "AI Summary"}</>}
            </button>

            {/* Field picker */}
            <div style={{ position:"relative" }} ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", borderRadius:8, border:`1.5px solid ${showFieldPicker ? accent : C.border}`, background: showFieldPicker ? `${accent}08` : C.bg, color: showFieldPicker ? accent : C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
                Fields <span style={{ fontSize:10, padding:"1px 5px", borderRadius:99, background:accent, color:"white", fontWeight:700 }}>{selectedFieldIds.size}</span>
              </button>

              {showFieldPicker && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 12px 32px rgba(0,0,0,.18)", zIndex:10, width:240, overflow:"hidden" }}>
                  <div style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.text2, textTransform:"uppercase", letterSpacing:".05em" }}>Show fields</span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={selectAll} style={{ fontSize:10, fontWeight:600, color:accent, background:`${accent}12`, border:"none", borderRadius:6, padding:"2px 7px", cursor:"pointer", fontFamily:F }}>All</button>
                      <button onClick={selectDiff} style={{ fontSize:10, fontWeight:600, color:"#7c3aed", background:"#f5f3ff", border:"none", borderRadius:6, padding:"2px 7px", cursor:"pointer", fontFamily:F }}>Diffs only</button>
                    </div>
                  </div>
                  <div style={{ maxHeight:260, overflowY:"auto", padding:"4px 0" }}>
                    {eligibleFields.map(f => {
                      const checked = selectedFieldIds.has(f.id);
                      const hasDiff = (() => { const vals = records.map(r => JSON.stringify(r.data?.[f.api_key] ?? "")); return new Set(vals).size > 1; })();
                      return (
                        <label key={f.id} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 13px", cursor:"pointer", background:"transparent", transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <input type="checkbox" checked={checked} onChange={()=>toggleField(f.id)}
                            style={{ accentColor:accent, width:13, height:13, flexShrink:0, cursor:"pointer" }}/>
                          <span style={{ fontSize:12, color: checked ? C.text1 : C.text3, flex:1 }}>{f.name}</span>
                          {hasDiff && <span style={{ width:6, height:6, borderRadius:"50%", background:accent, flexShrink:0 }}/>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={onClose} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Close</button>
          </div>
        </div>

        {/* AI Summary panel */}
        {(aiSummary || aiLoading) && (
          <div style={{ padding:"14px 20px", background:`${accent}07`, borderBottom:`1px solid ${accent}20`, display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>Vercentic AI Summary</div>
              {aiLoading
                ? <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:accent, opacity:0.4, animation:`pulse 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
                    <span style={{ fontSize:12, color:C.text3, marginLeft:4 }}>Analysing candidates...</span>
                  </div>
                : <p style={{ margin:0, fontSize:13, color:C.text1, lineHeight:1.6 }}>{aiSummary}</p>}
            </div>
            {aiSummary && !aiLoading && (
              <button onClick={()=>setAiSummary("")} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:18, padding:2, lineHeight:1, flexShrink:0 }}>×</button>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ tableLayout:"fixed", minWidth: `${170 + 220 * 5}px`, borderCollapse:"collapse", fontFamily:F }}>
            <thead>
              <tr style={{ background:C.surface, borderBottom:`2px solid ${C.border}` }}>
                <th style={{ width:170, minWidth:170, maxWidth:170, padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".06em", position:"sticky", left:0, background:C.surface, zIndex:2 }}>
                  Field <span style={{ marginLeft:4, fontSize:10, fontWeight:500, color:C.border }}>({compareFields.length})</span>
                </th>
                {records.map(r => {
                  const isPinned = pinned === r.id;
                  const sc = score(r);
                  return (
                    <th key={r.id} style={{ width:220, minWidth:220, maxWidth:220, padding:"10px 14px", textAlign:"left", borderLeft:`1px solid ${C.border}`, background: isPinned ? `${accent}08` : C.surface, overflow:"hidden" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:`${accent}18`, color:accent, fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {name(r).split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <button onClick={()=>onOpen(r.id)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontSize:13, fontWeight:700, color:accent, textAlign:"left", fontFamily:F, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130, display:"block" }}>
                            {name(r)}
                          </button>
                          <div style={{ fontSize:10, color:C.text3 }}>{r.data?.current_title || r.data?.department || ""}</div>
                        </div>
                        <button onClick={()=>setPinned(isPinned ? null : r.id)} title={isPinned?"Unpin":"Pin as preferred"} style={{ background:"none", border:"none", cursor:"pointer", padding:2, color: isPinned ? "#f59f00" : C.text3, fontSize:16, lineHeight:1 }}>
                          {isPinned ? "★" : "☆"}
                        </button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ flex:1, height:4, borderRadius:99, background:C.border, overflow:"hidden" }}>
                          <div style={{ width:`${sc}%`, height:"100%", borderRadius:99, background: sc>=70?C.green:sc>=40?C.amber:C.red, transition:"width .3s" }}/>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:C.text3, minWidth:28 }}>{sc}%</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {compareFields.length === 0 ? (
                <tr><td colSpan={records.length + 1} style={{ padding:"32px", textAlign:"center", color:C.text3, fontSize:13 }}>No fields selected. Use the Fields picker above.</td></tr>
              ) : compareFields.map((field, fi) => {
                const diff = isDiff(field.api_key);
                return (
                  <tr key={field.id} style={{ background: fi%2===0 ? C.surface : C.bg, borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"9px 16px", fontSize:12, fontWeight:600, color:C.text2, position:"sticky", left:0, background: fi%2===0 ? C.surface : C.bg, zIndex:1, whiteSpace:"nowrap", width:170, minWidth:170, maxWidth:170, overflow:"hidden", textOverflow:"ellipsis" }}>
                      {diff && <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:accent, marginRight:6, verticalAlign:"middle" }}/>}
                      {field.name}
                    </td>
                    {records.map(r => {
                      const val = r.data?.[field.api_key];
                      const isPinned = pinned === r.id;
                      const empty = val === null || val === undefined || val === "" || (Array.isArray(val) && !val.length);
                      return (
                        <td key={r.id} style={{ padding:"9px 14px", borderLeft:`1px solid ${C.border}`, background: isPinned ? `${accent}06` : diff ? `${accent}04` : "transparent", width:220, maxWidth:220, overflow:"hidden" }}>
                          {empty ? (
                            <span style={{ color:C.border, fontSize:12 }}>—</span>
                          ) : field.field_type === "rating" ? (
                            <span style={{ color:"#f59f00", fontSize:13 }}>{"★".repeat(Number(val))}{"☆".repeat(5-Number(val))}</span>
                          ) : field.field_type === "boolean" ? (
                            <span style={{ fontSize:12, fontWeight:600, color: val ? C.green : C.red }}>{val ? "Yes" : "No"}</span>
                          ) : Array.isArray(val) ? (
                            <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                              {val.map((v,i) => <span key={i} style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:`${accent}14`, color:accent, fontWeight:600 }}>{String(v?.name||v)}</span>)}
                            </div>
                          ) : (
                            <span style={{ fontSize:12, color:C.text1, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:196 }} title={String(val)}>{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 20px", background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:accent, flexShrink:0 }}/>
          <span style={{ fontSize:11, color:C.text3 }}>Coloured dots mark fields where values differ</span>
          {pinned && <span style={{ marginLeft:"auto", fontSize:11, color:"#f59f00", fontWeight:600 }}>★ {name(records.find(r=>r.id===pinned)||{})} pinned as preferred</span>}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
};

/* ─── Table View ──────────────────────────────────────────────────────────── */
// ── System columns (not field-based) ──────────────────────────────────────────
const SYSTEM_COLS = [
  { id: '_created', name: 'Created', apiKey: '_created', isSystem: true },
  { id: '_updated', name: 'Updated',  apiKey: '_updated', isSystem: true },
  { id: '_linked_job', name: 'Linked Job', apiKey: '_linked_job', isSystem: true },
  { id: '_stage',  name: 'Stage', apiKey: '_stage', isSystem: true },
];

function getSystemValue(record, col, linkedJobs) {
  if (col === '_created') return record.created_at ? new Date(record.created_at).toLocaleDateString() : '—';
  if (col === '_updated') return record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—';
  if (col === '_linked_job') {
    const job = linkedJobs?.[record.id];
    return job ? (job.title || '—') : '—';
  }
  if (col === '_stage') {
    const job = linkedJobs?.[record.id];
    return job?.stage || '—';
  }
  return '—';
}

// ── Inline stage pill with dropdown — used in the list table ─────────────────
function StagePill({ linkInfo, onStageChange }) {
  const [open, setOpen]     = useState(false);
  const [pos,  setPos]      = useState({ top:0, left:0 });
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = e => { if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (!linkInfo?.stage) return <span style={{ fontSize:12, color:'#9ca3af' }}>—</span>;

  const hasSteps = linkInfo.steps?.length > 0;
  const accent   = '#7c3aed';

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!hasSteps) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + r.width / 2 + window.scrollX });
    }
    setOpen(v => !v);
  };

  const handlePick = async (step) => {
    if (!linkInfo.link_id || saving) return;
    setSaving(true);
    setOpen(false);
    try {
      await tFetch(`/api/workflows/people-links/${linkInfo.link_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: step.id, stage_name: step.name }),
      });
      onStageChange?.({ ...linkInfo, stage: step.name, stage_id: step.id });
    } catch(e) { console.error('stage update failed', e); }
    setSaving(false);
  };

  const dropdown = open && ReactDOM.createPortal(
    <div style={{
      position:'absolute', top: pos.top, left: pos.left,
      transform:'translateX(-50%)',
      background:'white', border:'1px solid #e5e7eb', borderRadius:10,
      boxShadow:'0 8px 24px rgba(0,0,0,.15)', zIndex:9999, minWidth:150, overflow:'hidden',
    }}>
      {linkInfo.steps.map(step => {
        const isCurrent = step.id === linkInfo.stage_id;
        const isHov     = hovered === step.id;
        const hasAuto   = (step.actions||[]).some(a => a.type);
        return (
          <button key={step.id}
            onClick={e => { e.stopPropagation(); handlePick(step); }}
            onMouseEnter={() => setHovered(step.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:8,
              padding:'9px 12px', border:'none',
              background: isCurrent ? '#f5f3ff' : isHov ? '#faf5ff' : 'white',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              transition:'background .1s',
            }}>
            {isCurrent
              ? <svg width="12" height="12" viewBox="0 0 12 12" style={{flexShrink:0}}><path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
              : <span style={{ width:12, flexShrink:0 }}/>}
            <span style={{ fontSize:12, fontWeight: isCurrent?700:400, color: isCurrent?accent:'#374151', flex:1 }}>{step.name}</span>
            {hasAuto && <span style={{ fontSize:9, background:'#fef3c7', color:'#92400e', padding:'1px 5px', borderRadius:99, fontWeight:700 }}>⚡</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <>
      <button ref={btnRef}
        onClick={handleOpen}
        disabled={saving}
        style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'3px 10px 3px 11px', borderRadius:20, fontSize:11, fontWeight:700,
          border:`1.5px solid ${open ? accent : '#c4b5fd'}`,
          background: open ? '#ede9fe' : '#f5f3ff',
          color: accent, cursor: hasSteps ? 'pointer' : 'default',
          fontFamily:'inherit', whiteSpace:'nowrap', opacity: saving ? 0.6 : 1,
          transition:'all .12s',
        }}>
        {saving ? '…' : linkInfo.stage}
        {hasSteps && (
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink:0, opacity:.7 }}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      {dropdown}
    </>
  );
}

// ── InlineStatusPicker ─────────────────────────────────────────────────────────
const InlineStatusPicker = ({ record, statusOptions, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const status = record.data?.status || "";
  const colorMap = {
    Active:"#0ca678", Open:"#0ca678", Passive:"#f59f00", Draft:"#6b7280",
    "Not Looking":"#e03131", Filled:"#3b5bdb", "On Hold":"#f59f00",
    Cancelled:"#e03131", Placed:"#7c3aed", Archived:"#9ca3af",
  };
  const color = colorMap[status] || "#6b7280";
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const handleChange = async (newStatus) => {
    setSaving(true); setOpen(false);
    try {
      const updated = await api.patch(`/records/${record.id}`, {
        data: { ...record.data, status: newStatus }
      });
      onUpdate?.(updated);
    } catch(e) { console.error(e); }
    setSaving(false);
  };
  if (!status || !statusOptions?.length) return null;
  return (
    <div ref={ref} style={{ position:"relative", display:"inline-flex" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99,
          fontSize:11, fontWeight:600, border:"none", cursor:"pointer",
          background:`${color}18`, color, opacity: saving ? 0.6 : 1 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>
        {saving ? "…" : status}<span style={{ fontSize:9, opacity:0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:9999,
          background:"white", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,.12)",
          border:"1px solid #e5e7eb", overflow:"hidden", minWidth:130 }}>
          {statusOptions.map(opt => (
            <button key={opt} onClick={() => handleChange(opt)}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px",
                background: opt===status ? "#f5f3ff" : "transparent",
                border:"none", cursor:"pointer", fontSize:12, fontWeight:500,
                color: opt===status ? "#7c3aed" : "#374151", textAlign:"left" }}
              onMouseEnter={e => { if(opt!==status) e.currentTarget.style.background="#f8f9fc"; }}
              onMouseLeave={e => { if(opt!==status) e.currentTarget.style.background="transparent"; }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:colorMap[opt]||"#6b7280", flexShrink:0 }}/>
              {opt}
              {opt===status && <span style={{ marginLeft:"auto", fontSize:10, color:"#7c3aed" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Enhanced TableView ─────────────────────────────────────────────────────────
const TableView = ({ records, fields, visibleFieldIds, objectColor, onSelect, onEdit, onDelete, onProfile, selectedIds, onToggleSelect, onToggleAll, sortBy, sortDir, onSort, onColumnFilter, colWidths, onResizeCol, visibleColOrder, onReorderCols, linkedJobs, dupMap = {},
  onStageChange, onStatusUpdate }) => {
  const [hoveredRow, setHoveredRow] = useState(null);
  const statusField = fields.find(f => f.api_key === "status");
  const statusOptions = statusField?.options || [];
  const listFields = visibleFieldIds
    ? visibleFieldIds.map(id => fields.find(f => f.id === id) || SYSTEM_COLS.find(s => s.id === id)).filter(Boolean)
    : fields.filter(f => f.show_in_list).slice(0, 6);

  // Apply column order — only use saved order if it covers all visible fields
  // If a new column was added, it won't be in visibleColOrder yet, so fall back to listFields order
  const orderedFields = (visibleColOrder?.length && visibleColOrder.length >= listFields.length)
    ? visibleColOrder.map(id => listFields.find(f => f.id === id)).filter(Boolean)
    : listFields;

  // Drag-to-reorder state
  const [dragColIdx, setDragColIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Resize state
  const resizeRef = useRef(null);

  const startResize = (e, fieldId) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths?.[fieldId] || 150;
    const onMove = (me) => { const w = Math.max(60, startW + me.clientX - startX); onResizeCol?.(fieldId, w); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleColDrop = (toIdx) => {
    if (dragColIdx === null || dragColIdx === toIdx) return;
    const newOrder = orderedFields.map(f => f.id);
    const [moved] = newOrder.splice(dragColIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorderCols?.(newOrder);
    setDragColIdx(null); setDragOverIdx(null);
  };

  if (records.length === 0) return (
    <div style={{ textAlign:"center", padding:"80px 40px", color:C.text3 }}>
      <div style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:4 }}>No records yet</div>
      <div style={{ fontSize:13 }}>Create your first record to get started</div>
    </div>
  );

  return (
    <div style={{ overflow:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
        <thead>
          <tr style={{ background:"#f8f9fc", borderBottom:`2px solid ${C.border}` }}>
            {/* Checkbox */}
            <th style={{ width:36, padding:"10px 12px" }}>
              <input type="checkbox"
                checked={selectedIds?.size > 0 && selectedIds?.size === records.length}
                ref={el => { if (el) el.indeterminate = selectedIds?.size > 0 && selectedIds?.size < records.length; }}
                onChange={onToggleAll}
                style={{ width:15, height:15, cursor:"pointer", accentColor:C.accent }}/>
            </th>
            {/* Avatar */}
            <th style={{ width:36, padding:"10px 8px" }}/>
            {/* Field headers */}
            {orderedFields.map((f, fi) => {
              const isSorted = sortBy === (f.isSystem ? f.apiKey : f.api_key);
              const w = colWidths?.[f.id] || null;
              const isDragOver = dragOverIdx === fi;
              return (
                <th key={f.id}
                  draggable
                  onDragStart={() => setDragColIdx(fi)}
                  onDragOver={e => { e.preventDefault(); setDragOverIdx(fi); }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={() => handleColDrop(fi)}
                  style={{ padding:"0", position:"relative", userSelect:"none",
                    borderLeft: isDragOver ? `2px solid ${C.accent}` : "2px solid transparent",
                    background: isDragOver ? `${C.accent}08` : undefined,
                    ...(w ? { width:w, minWidth:w, maxWidth:w } : {}) }}>
                  <div style={{ display:"flex", alignItems:"center", gap:2, padding:"10px 12px 10px 14px", cursor:"pointer", whiteSpace:"nowrap" }}
                    onClick={() => onSort?.(f.isSystem ? f.apiKey : f.api_key)}>
                    <span style={{ fontSize:11, fontWeight:700, color: isSorted ? C.accent : C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{f.name}</span>
                    {isSorted
                      ? <Ic n={sortDir === 'asc' ? 'chevronUp' : 'chevronDown'} s={11} c={C.accent}/>
                      : <Ic n="chevronDown" s={10} c="#d1d5db"/>}
                    {/* Column filter button */}
                    {!f.isSystem && <button
                      onClick={e => { e.stopPropagation(); onColumnFilter?.(f); }}
                      title={`Filter by ${f.name}`}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:"1px 3px", borderRadius:4, opacity:0.5, display:"flex", marginLeft:1 }}
                      onMouseEnter={e => e.currentTarget.style.opacity="1"}
                      onMouseLeave={e => e.currentTarget.style.opacity="0.5"}>
                      <Ic n="filter" s={9} c={C.text3}/>
                    </button>}
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={e => startResize(e, f.id)}
                    style={{ position:"absolute", right:0, top:0, bottom:0, width:4, cursor:"col-resize", background:"transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background=C.accent+"40"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}/>
                </th>
              );
            })}
            <th style={{ padding:"10px 14px", textAlign:"right", fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => {
            const title = recordTitle(record, fields);
            const isSelected = selectedIds?.has(record.id);
            return (
              <tr key={record.id}
                style={{ borderBottom:`1px solid ${C.border}`, transition:"background .1s", background: isSelected ? `${C.accent}08` : "transparent" }}
                onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background="#f8f9fc"; setHoveredRow(record.id); }}
                onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background="transparent"; setHoveredRow(null); }}>
                <td style={{ padding:"12px 12px" }}>
                  <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect(record.id)}
                    style={{ width:15, height:15, cursor:"pointer", accentColor:C.accent }}/>
                </td>
                <td style={{ padding:"12px 8px", cursor:"pointer", width:36 }} onClick={() => onProfile(record)}>
                  <AvatarWithDupBadge name={title} color={objectColor} size={28} photoUrl={record.data?.profile_photo || record.data?.photo_url} dupInfo={dupMap?.[record.id]}/>
                </td>
                {orderedFields.map((f, fi) => {
                  const val = f.isSystem
                    ? getSystemValue(record, f.apiKey, linkedJobs)
                    : record.data?.[f.api_key];
                  const w = colWidths?.[f.id] || null;
                  return (
                    <td key={f.id}
                      style={{ padding:"12px 14px", cursor: fi===0 ? "pointer" : "default",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        ...(w ? { maxWidth:w, width:w } : { maxWidth:220 }) }}
                      onClick={fi===0 ? () => onProfile(record) : undefined}>
                      {fi === 0
                        ? <span style={{ fontWeight:700, color:"#4361EE" }}
                            onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                            onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
                            {f.isSystem ? val : <FieldValue field={f} value={val} allFieldValues={record?.data}/>}
                          </span>
                        : f.apiKey === '_stage'
                          ? <StagePill
                              linkInfo={linkedJobs?.[record.id]}
                              onStageChange={updated => onStageChange?.(record.id, updated)}
                            />
                          : f.isSystem
                            ? <span style={{ fontSize:13, color: val === '—' ? C.text3 : C.text1 }}>{val}</span>
                            : <FieldValue field={f} value={val} allFieldValues={record?.data}/>
                      }
                    </td>
                  );
                })}
                <td style={{ padding:"12px 14px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end", alignItems:"center" }}>
                    <Btn v="ghost" sz="sm" icon="expand" onClick={()=>onSelect(record)}/>
                    {onDelete && <Btn v="ghost" sz="sm" icon="trash"  onClick={()=>onDelete(record.id)} style={{color:"#ef4444"}}/>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Kanban View ──────────────────────────────────────────────────────────── */
const KanbanView = ({ records, fields, objectColor, onSelect, onEdit, onDelete, onStatusChange, onProfile }) => {
  const statusField = fields.find(f=>f.api_key==="status"&&f.field_type==="select");
  const columns = statusField?.options || ["Active","Passive","Archived"];
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const getColRecords = col => records.filter(r => (r.data?.status||columns[0])===col);

  const handleDrop = (col) => {
    if (!dragging||dragging===col) return;
    const record = records.find(r=>r.id===dragging);
    if (record) onStatusChange(record.id, col);
    setDragging(null); setDragOver(null);
  };

  const colColors = {
    "Active":"#0ca678","Open":"#0ca678","Passive":"#f59f00","Draft":"#868e96",
    "On Hold":"#f59f00","Filled":"#3b5bdb","Not Looking":"#868e96","Placed":"#3b5bdb",
    "Archived":"#adb5bd","Cancelled":"#e03131","Inactive":"#adb5bd",
  };

  const titleField = fields.find(f=>["first_name","name","job_title","pool_name"].includes(f.api_key));
  const subtitleField = fields.find(f=>["current_title","department","category","email"].includes(f.api_key));
  const extraField = fields.find(f=>["current_company","location","work_type"].includes(f.api_key));

  return (
    <div style={{ display:"flex", gap:14, overflow:"auto", paddingBottom:16, alignItems:"flex-start" }}>
      {columns.map(col => {
        const colRecords = getColRecords(col);
        const colColor = colColors[col] || C.accent;
        const isOver = dragOver===col;
        return (
          <div key={col} style={{ width:260, flexShrink:0 }}
            onDragOver={e=>{e.preventDefault();setDragOver(col);}}
            onDrop={()=>handleDrop(col)}
            onDragLeave={()=>setDragOver(null)}>
            {/* Column header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"8px 10px", borderRadius:10, background:isOver?`${colColor}12`:"transparent", transition:"background .15s" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:colColor }}/>
              <span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{col}</span>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:C.text3, background:C.border, borderRadius:99, padding:"1px 7px" }}>{colRecords.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:80, borderRadius:10, padding:isOver?"6px":0, background:isOver?`${colColor}08`:"transparent", transition:"all .15s" }}>
              {colRecords.map(record=>{
                const title = titleField ? record.data?.[titleField.api_key] : recordTitle(record,fields);
                const lastN = record.data?.last_name||"";
                const fullTitle = lastN ? `${title} ${lastN}` : title;
                const sub   = subtitleField ? record.data?.[subtitleField.api_key] : null;
                const extra = extraField ? record.data?.[extraField.api_key] : null;
                return (
                  <div key={record.id} draggable onDragStart={()=>setDragging(record.id)} onClick={()=>onProfile(record)}
                    style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px", cursor:"pointer", transition:"all .12s", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="none";}}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <Avatar name={fullTitle||"?"} color={colColor} size={30}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#4361EE", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fullTitle||"Untitled"}</div>
                        {sub && <div style={{ fontSize:11, color:C.text3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
                        {extra && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{extra}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:4, marginTop:8 }} onClick={e=>e.stopPropagation()}>

                      {onDelete && <button onClick={()=>onDelete(record.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:"#ef444450", borderRadius:5, display:"flex" }}><Ic n="trash" s={12}/></button>}
                    </div>
                  </div>
                );
              })}
              {colRecords.length===0&&(
                <div style={{ padding:"20px 10px", textAlign:"center", color:C.text3, fontSize:12, fontStyle:"italic" }}>Empty</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Record Workflows Tab ─────────────────────────────────────────────────── */
const STEP_COLORS = { stage_change:"#3b5bdb", ai_prompt:"#7c3aed", update_field:"#0ca678", send_email:"#f59f00", webhook:"#e03131" };
const STEP_LABELS = { stage_change:"Change Stage", ai_prompt:"AI Prompt", update_field:"Update Field", send_email:"Send Email", webhook:"Webhook" };
const STEP_ICONS  = { stage_change:"tag", ai_prompt:"sparkles", update_field:"edit", send_email:"mail", webhook:"activity" };

// ─── Create Offer Modal (triggered by workflow) ───────────────────────────────
const CreateOfferModal = ({ workflow, record, environment, onConfirm, onClose }) => {
  const step = (workflow?.steps || []).find(s => s.automation_type === "create_offer");
  const cfg  = step?.config || {};
  const [salary,   setSalary]   = useState(cfg.default_salary || "");
  const [currency, setCurrency] = useState(cfg.currency || "USD");
  const [expiry,   setExpiry]   = useState("");
  const [bonus,    setBonus]    = useState("");
  const [notes,    setNotes]    = useState("");

  const inp = { width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8,
    border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface };
  const lbl = txt => <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{txt}</div>;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,41,.45)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:16, width:"100%", maxWidth:460,
        boxShadow:"0 24px 64px rgba(0,0,0,.18)", overflow:"hidden" }}>
        <div style={{ height:4, background:"#0ca678" }}/>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text1, marginBottom:2, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.3px" }}>Create Offer</div>
          <div style={{ fontSize:12, color:C.text3, marginBottom:18 }}>
            For: <strong>{record?.data?.first_name} {record?.data?.last_name}</strong>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10 }}>
              <div>
                {lbl("Base Salary *")}
                <input type="number" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="e.g. 80000" style={inp}/>
              </div>
              <div>
                {lbl("Currency")}
                <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{...inp, background:C.surface}}>
                  {["USD","GBP","EUR","AED","SAR","QAR","SGD","AUD","CAD"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              {lbl("Bonus (optional)")}
              <input type="number" value={bonus} onChange={e=>setBonus(e.target.value)} placeholder="e.g. 10000" style={inp}/>
            </div>
            <div>
              {lbl("Offer Expiry Date")}
              <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} style={inp}
                min={new Date().toISOString().slice(0,10)}/>
            </div>
            <div>
              {lbl("Notes (optional)")}
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
                placeholder="Internal notes…" style={{...inp, resize:"vertical"}}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              Cancel
            </button>
            <button onClick={()=>onConfirm({ salary, currency, bonus, expiry, notes })} disabled={!salary}
              style={{ padding:"9px 20px", borderRadius:8, border:"none",
                background:!salary?"#e5e7eb":"#0ca678", color:"white",
                fontSize:13, fontWeight:700, cursor:!salary?"not-allowed":"pointer", fontFamily:F }}>
              ⚡ Create Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Schedule Interview Modal (triggered by workflow) ─────────────────────────
const ScheduleInterviewModal = ({ workflow, record, environment, onConfirm, onClose }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const step = (workflow?.steps || []).find(s => s.automation_type === "schedule_interview");
  const cfg  = step?.config || {};

  const inp = { width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8,
    border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,41,.45)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:16, width:"100%", maxWidth:420,
        boxShadow:"0 24px 64px rgba(0,0,0,.18)", overflow:"hidden" }}>
        <div style={{ height:4, background:"#0891b2" }}/>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text1, marginBottom:2, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.3px" }}>Schedule Interview</div>
          <div style={{ fontSize:12, color:C.text3, marginBottom:20 }}>
            {cfg.interview_type_name || "Interview"} · {cfg.interview_duration || 30} min
            {cfg.interview_format ? ` · ${cfg.interview_format}` : ""}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Date *</div>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}
                min={new Date().toISOString().slice(0,10)}/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Time *</div>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inp}/>
            </div>
            <div style={{ padding:"10px 12px", borderRadius:8, background:"#f0fdff", border:"1px solid #0891b220", fontSize:12, color:"#0e7490" }}>
              <strong>Candidate:</strong> {record?.data?.first_name} {record?.data?.last_name}<br/>
              <strong>Interviewers:</strong> {cfg.interviewer_source === "interview_type" ? "From interview type" : cfg.interviewer_source === "both" ? "Job record + interview type" : "From job record"}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              Cancel
            </button>
            <button onClick={()=>onConfirm({ date, time })} disabled={!date||!time}
              style={{ padding:"9px 20px", borderRadius:8, border:"none", background:!date||!time?"#e5e7eb":"#0891b2",
                color:"white", fontSize:13, fontWeight:700, cursor:!date||!time?"not-allowed":"pointer", fontFamily:F }}>
              Schedule Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordWorkflows = ({ record, objectId, environment, objectName, onNavigate }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(null);
  const [results, setResults]     = useState({});
  const [scheduleModal, setScheduleModal] = useState(null);
  const [offerModal,    setOfferModal]    = useState(null);

  useEffect(() => {
    if (!objectId || !environment?.id) return;
    api.get(`/workflows?object_id=${objectId}&environment_id=${environment.id}`)
      .then(d => { setWorkflows(Array.isArray(d) ? d.filter(w => w.active !== false) : []); setLoading(false); });
  }, [objectId, environment?.id]);

  const runWorkflow = async (wf, extraParams = {}) => {
    const hasSchedule = (wf.steps||[]).some(s => s.automation_type === "schedule_interview");
    const hasOffer    = (wf.steps||[]).some(s => s.automation_type === "create_offer");
    if (hasSchedule && !extraParams.scheduled_date) { setScheduleModal({ wf }); return; }
    if (hasOffer    && !extraParams.offer_salary)   { setOfferModal({ wf });    return; }
    setRunning(wf.id);
    setResults(r => ({ ...r, [wf.id]: null }));
    try {
      const res = await api.post(`/workflows/${wf.id}/run`, { record_id: record.id, ...extraParams });
      setResults(r => ({ ...r, [wf.id]: res }));
    } catch(e) {
      setResults(r => ({ ...r, [wf.id]: { error: e.message } }));
    }
    setRunning(null);
  };

  if (loading) return <div style={{ padding:"32px 0", textAlign:"center", color:C.text3, fontSize:13 }}>Loading…</div>;

  // Automation workflows (original behaviour)
  const automationWfs = workflows.filter(w => !w.workflow_type || w.workflow_type === "automation");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {scheduleModal && (
        <ScheduleInterviewModal
          workflow={scheduleModal.wf} record={record} environment={environment}
          onClose={()=>setScheduleModal(null)}
          onConfirm={({date,time})=>{ const wf=scheduleModal.wf; setScheduleModal(null); runWorkflow(wf,{scheduled_date:date,scheduled_time:time}); }}
        />
      )}
      {offerModal && (
        <CreateOfferModal
          workflow={offerModal.wf} record={record} environment={environment}
          onClose={()=>setOfferModal(null)}
          onConfirm={({salary,currency,bonus,expiry,notes})=>{ const wf=offerModal.wf; setOfferModal(null); runWorkflow(wf,{offer_salary:salary,offer_currency:currency,offer_bonus:bonus,offer_expiry:expiry,offer_notes:notes}); }}
        />
      )}


      {/* Automation workflows */}
      {automationWfs.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>⚡ Automations</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {automationWfs.map(wf => {
              const res = results[wf.id];
              const isRunning = running === wf.id;
              return (
                <div key={wf.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.accent},#7c3aed)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="zap" s={14} c="white"/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{wf.name}</div>
                {wf.description && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{wf.description}</div>}
              </div>
              {/* Step count pills */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {(wf.steps||[]).slice(0,4).map((s,i) => {
                  const col = STEP_COLORS[s.type] || C.accent;
                  return <span key={i} style={{ fontSize:10, fontWeight:600, color:col, background:`${col}15`, padding:"2px 7px", borderRadius:99 }}>{STEP_LABELS[s.type]||s.type}</span>;
                })}
              </div>
              <button onClick={() => runWorkflow(wf)} disabled={isRunning}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:"none", background:isRunning?C.border:`linear-gradient(135deg,${C.accent},#7c3aed)`, color:"white", fontSize:12, fontWeight:700, cursor:isRunning?"not-allowed":"pointer", fontFamily:F, flexShrink:0, transition:"all .15s" }}>
                <Ic n={isRunning?"loader":"zap"} s={12}/>{isRunning ? "Running…" : "Run"}
              </button>
            </div>

            {/* Results */}
            {res && (
              <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                {res.error && <div style={{ fontSize:12, color:C.red, padding:"8px 10px", background:C.redLight, borderRadius:8 }}>Error: {res.error}</div>}
                {res.steps?.map((step, i) => {
                  const ok = step.status === "done";
                  const col = ok ? "#0ca678" : step.status === "error" ? C.red : C.orange;
                  const bg  = ok ? "#ecfdf5" : step.status === "error" ? C.redLight : "#fffbeb";
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", borderRadius:9, background:bg }}>
                      <Ic n={ok?"check":"x"} s={13} c={col}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{STEP_LABELS[step.type]||step.type}</div>
                        {step.output && <div style={{ fontSize:11, color:C.text2, marginTop:3, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{step.output}</div>}
                        {step.error  && <div style={{ fontSize:11, color:col, marginTop:2 }}>Error: {step.error}</div>}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:col, textTransform:"uppercase", flexShrink:0 }}>{step.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
          </div>
        </div>
      )}
    </div>
  );
};


/* ─── File Preview Modal ────────────────────────────────────────────────────── */
const FilePreviewModal = ({ att, onClose }) => {
  const ext = (att.ext || att.name?.split('.').pop() || '').toLowerCase();
  const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
  const isPdf   = ext === 'pdf';
  const isText  = ['txt','csv','md','log'].includes(ext);
  const rawUrl  = att.url || '#';

  // Fetch blob with auth so iframe/img has no CORS/auth issues
  const [blobUrl,  setBlobUrl]  = useState(null);
  const [blobData, setBlobData] = useState(null); // ArrayBuffer for PDF.js
  const [loadErr,  setLoadErr]  = useState(false);

  useEffect(() => {
    let url = null;
    if (rawUrl && rawUrl !== '#') {
      fetch(rawUrl, { headers: authHeaders() })
        .then(r => { if (!r.ok) throw new Error('auth'); return r.arrayBuffer(); })
        .then(buf => {
          const blob = new Blob([buf], { type: isPdf ? 'application/pdf' : 'application/octet-stream' });
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
          if (isPdf) setBlobData(buf);
        })
        .catch(() => setLoadErr(true));
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [rawUrl]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(10,14,30,.78)', zIndex:9700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:960, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #e8eaed', flexShrink:0 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>
              {att.file_type_name && <span style={{ marginRight:8, fontWeight:600, color:'#3b5bdb' }}>{att.file_type_name}</span>}
              {att.size ? `${Math.round(att.size/1024)} KB · ` : ''}{ext.toUpperCase()}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {blobUrl && (
              <a href={blobUrl} download={att.name}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid #e8eaed', background:'#f8f9fc', color:'#374151', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download
              </a>
            )}
            <button onClick={onClose}
              style={{ width:30, height:30, borderRadius:8, border:'1px solid #e8eaed', background:'#f8f9fc', cursor:'pointer', color:'#6b7280', fontSize:18, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', background:'#f0f2f5', display:'flex', flexDirection:'column', alignItems:'center', minHeight:0 }}>
          {/* Loading */}
          {!blobUrl && !loadErr && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:12, padding:48 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="#3b5bdb" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
              <span style={{ fontSize:13, color:'#6b7280' }}>Loading file…</span>
            </div>
          )}
          {/* Error */}
          {loadErr && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8, padding:48 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Could not load file</div>
            </div>
          )}
          {/* PDF — rendered by PDF.js */}
          {blobData && isPdf && <PdfViewer data={blobData}/>}
          {/* Image */}
          {blobUrl && isImage && (
            <div style={{ padding:24, display:'flex', alignItems:'center', justifyContent:'center', flex:1 }}>
              <img src={blobUrl} alt={att.name} style={{ maxWidth:'100%', maxHeight:'78vh', objectFit:'contain', borderRadius:8, boxShadow:'0 4px 24px rgba(0,0,0,.15)' }}/>
            </div>
          )}
          {/* Text */}
          {blobUrl && isText && (
            <iframe src={blobUrl} title={att.name} style={{ width:'100%', border:'none', minHeight:'78vh', background:'white', flex:1 }}/>
          )}
          {/* Unsupported */}
          {blobUrl && !isPdf && !isImage && !isText && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8, padding:48, textAlign:'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Preview not available for .{ext} files</div>
              <a href={blobUrl} download={att.name} style={{ fontSize:12, color:'#3b5bdb', fontWeight:600, textDecoration:'none' }}>Download to view</a>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

/* ─── PDF.js canvas renderer ─────────────────────────────────────────────── */
const PdfViewer = ({ data }) => {
  const [pages,      setPages]      = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [scale,      setScale]      = useState(1.4);
  const [pdfDoc,     setPdfDoc]     = useState(null);
  const canvasRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Point worker to the bundled worker via CDN to avoid Vite worker complexities
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
      } catch(e) { console.error('PDF.js load error:', e); }
    })();
    return () => { cancelled = true; };
  }, [data]);

  useEffect(() => {
    if (!pdfDoc) return;
    pages.forEach(async (pageNum) => {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      try {
        const page    = await pdfDoc.getPage(pageNum);
        const vp      = page.getViewport({ scale });
        canvas.width  = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      } catch(e) { console.error('Page render error:', e); }
    });
  }, [pdfDoc, pages, scale]);

  const ZOOM_STEPS = [0.75, 1.0, 1.25, 1.4, 1.6, 2.0, 2.5];
  const zoomIdx    = ZOOM_STEPS.findIndex(s => s >= scale - 0.01);
  const zoomOut    = () => { const i = ZOOM_STEPS.findIndex(s => s >= scale - 0.01); if (i > 0) setScale(ZOOM_STEPS[i-1]); };
  const zoomIn     = () => { const i = ZOOM_STEPS.findIndex(s => s >= scale - 0.01); if (i < ZOOM_STEPS.length-1) setScale(ZOOM_STEPS[i+1]); };

  if (!pdfDoc) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:10, padding:48 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="#3b5bdb" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
      <span style={{ fontSize:12, color:'#6b7280' }}>Rendering PDF…</span>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100%' }}>
      {/* PDF toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'8px 16px', background:'#fff', borderBottom:'1px solid #e8eaed', flexShrink:0, position:'sticky', top:0, zIndex:2 }}>
        <span style={{ fontSize:12, color:'#6b7280' }}>{totalPages} page{totalPages!==1?'s':''}</span>
        <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto' }}>
          <button onClick={zoomOut} disabled={zoomIdx<=0}
            style={{ width:28, height:28, borderRadius:6, border:'1px solid #e8eaed', background:'#f8f9fc', cursor:zoomIdx<=0?'default':'pointer', color:'#374151', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', opacity:zoomIdx<=0?.4:1 }}>−</button>
          <span style={{ fontSize:11, fontWeight:600, color:'#374151', minWidth:40, textAlign:'center' }}>{Math.round(scale*100)}%</span>
          <button onClick={zoomIn} disabled={zoomIdx>=ZOOM_STEPS.length-1}
            style={{ width:28, height:28, borderRadius:6, border:'1px solid #e8eaed', background:'#f8f9fc', cursor:zoomIdx>=ZOOM_STEPS.length-1?'default':'pointer', color:'#374151', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', opacity:zoomIdx>=ZOOM_STEPS.length-1?.4:1 }}>+</button>
        </div>
      </div>
      {/* Pages */}
      <div style={{ padding:'16px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:12, overflowY:'auto' }}>
        {pages.map(pageNum => (
          <div key={pageNum} style={{ position:'relative', boxShadow:'0 2px 12px rgba(0,0,0,.15)', borderRadius:4, overflow:'hidden', background:'white' }}>
            <canvas ref={el => { if (el) canvasRefs.current[pageNum] = el; }} style={{ display:'block' }}/>
            <div style={{ position:'absolute', bottom:4, right:8, fontSize:10, color:'rgba(0,0,0,.35)', fontFamily:'inherit' }}>{pageNum} / {totalPages}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Record Detail (slide-in panel + full-page 2-col layout) ─────────────── */

/* ─── User Panel — shows linked platform user on a Person record ─────────── */
const STATUS_COLOR = { active:"#0CAF77", invited:"#F79009", deactivated:"#EF4444" };
const STATUS_BG    = { active:"#ECFDF5", invited:"#FFF7ED", deactivated:"#FEF2F2" };

function PlatformUserSection({ record }) {
  /* Header called as fn below to avoid React identity issue */
  const email = record?.data?.email;
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [roles,     setRoles]     = useState([]);
  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [createForm,setCreateForm]= useState({ first_name:"", last_name:"", role_id:"" });

  const load = async () => {
    setLoading(true);
    const [r, rs] = await Promise.all([
      email ? api.get(`/users/by-email/${encodeURIComponent(email)}`).catch(()=>null) : Promise.resolve(null),
      api.get("/roles").catch(()=>[]),
    ]);
    const found = r && !r.error ? r : null;
    setUser(found);
    setRoles(Array.isArray(rs) ? rs : []);
    if (found) setOpen(true);
    setLoading(false);
  };
  useEffect(() => { load(); }, [email]);

  const roleName = roles.find(r=>r.id===user?.role_id)?.name || user?.role?.name || "—";

  // Section header — matches CORE / ADDITIONAL style
  const Header = () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: open ? 10 : 0, marginTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em" }}>Platform User</div>
        {!loading && user && (
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
            background:STATUS_BG[user.status]||"#f3f4f6", color:STATUS_COLOR[user.status]||C.text2 }}>
            {user.status}
          </span>
        )}
      </div>
      <button onClick={()=>setOpen(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer",
        fontSize:11, color:C.text3, fontFamily:F, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
        {open ? "▲ hide" : (user ? "▼ show" : "▼ set up")}
      </button>
    </div>
  );

  if (!open) return <Header/>;
  if (loading) return <><Header/><div style={{ fontSize:12, color:C.text3, padding:"6px 0" }}>Loading…</div></>;

  // ── No linked user ──
  if (!user) return (
    <>
      <Header/>
      <div style={{ background:"#f8f9fc", borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {!creating ? (
          <div style={{ padding:"18px 16px", textAlign:"center" }}>
            <div style={{ fontSize:13, color:C.text3, marginBottom:12 }}>
              {email ? `No platform account linked to ${email}` : "Add an email to this person first"}
            </div>
            {email && (
              <button onClick={()=>setCreating(true)} style={{ padding:"7px 16px", borderRadius:8,
                border:`1.5px solid ${C.accent}`, background:C.accentLight, color:C.accent,
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                + Invite as platform user
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {[["First name","first_name"],["Last name","last_name"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <input value={createForm[key]} onChange={e=>setCreateForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}/>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>Role</div>
              <select value={createForm.role_id} onChange={e=>setCreateForm(p=>({...p,role_id:e.target.value}))}
                style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                <option value="">Select role…</option>
                {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setCreating(false)} style={{ padding:"6px 14px", borderRadius:7,
                border:`1px solid ${C.border}`, background:"transparent", fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={async()=>{
                if(!createForm.first_name||!createForm.last_name||!createForm.role_id) return;
                setSaving(true);
                const res = await api.post("/users",{...createForm,email});
                setSaving(false);
                if(res.error){window.__toast?.alert(res.error);return;}
                setCreating(false); load();
              }} disabled={saving||!createForm.first_name||!createForm.last_name||!createForm.role_id}
                style={{ padding:"6px 16px", borderRadius:7, border:"none", background:C.accent, color:"#fff",
                  fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, opacity:saving?0.6:1 }}>
                {saving?"Inviting…":"Send Invite"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ── Linked user ──
  const viewRows = [
    ["Email",      user.email],
    ["Role",       roleName],
    ["Last login", user.last_login ? new Date(user.last_login).toLocaleString() : "Never"],
    ["Logins",     user.login_count || 0],
    ["MFA",        user.mfa_enabled ? "✅ Enabled" : "Not enabled"],
  ];

  return (
    <>
      <Header/>
      <div style={{ background:"#f8f9fc", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
        {editing ? (
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {[["First name","first_name"],["Last name","last_name"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <input value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}/>
              </div>
            ))}
            {[["Role","role_id",roles.map(r=>({v:r.id,l:r.name}))],
              ["Status","status",[{v:"active",l:"Active"},{v:"invited",l:"Invited"},{v:"deactivated",l:"Deactivated"}]]
            ].map(([lbl,key,opts])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <select value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setEditing(false)} style={{ padding:"6px 14px", borderRadius:7,
                border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600,
                cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={async()=>{ setSaving(true); await api.patch(`/users/${user.id}`,form); await load(); setEditing(false); setSaving(false); }}
                disabled={saving} style={{ padding:"6px 16px", borderRadius:7, border:"none", background:C.accent,
                  color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, opacity:saving?0.6:1 }}>
                {saving?"Saving…":"Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewRows.map(([label, val], i) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                borderBottom: i < viewRows.length-1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{label}</div>
                <div style={{ flex:1, fontSize:13, color:C.text1 }}>{val}</div>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", padding:"9px 14px",
              borderTop:`1px solid ${C.border}`, background:"#f4f5f8" }}>
              <button onClick={()=>{ setForm({first_name:user.first_name,last_name:user.last_name,role_id:user.role_id,status:user.status}); setEditing(true); }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:7,
                  border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:F, color:C.text2 }}>
                <Ic n="edit" s={12}/> Edit user
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── ReportingPanel — formal relationships on Person records ──────────────────
const REL_TYPES = [
  { value:"reports_to",         label:"Reports to",       inverse:"manages" },
  { value:"manages",            label:"Manages",          inverse:"reports_to" },
  { value:"dotted_line_to",     label:"Dotted-line to",   inverse:null },
  { value:"interim_manager_of", label:"Interim manager of", inverse:null },
];
const REL_COLORS = {
  reports_to:"#4361EE", manages:"#0CAF77",
  dotted_line_to:"#7C3AED", interim_manager_of:"#F79009",
};

const RelRow = ({ rel, dir, personName, personTitle, onDelete }) => {
  const otherId = dir === "out" ? rel.to_record_id : rel.from_record_id;
  const typeLabel = dir === "out"
    ? REL_TYPES.find(t => t.value === rel.type)?.label || rel.type
    : REL_TYPES.find(t => t.value === rel.type)?.label
        ? (REL_TYPES.find(t => t.value === rel.type).inverse
          ? REL_TYPES.find(t => t.value === REL_TYPES.find(x=>x.value===rel.type).inverse)?.label || rel.inverse_type
          : REL_TYPES.find(t => t.value === rel.type)?.label)
        : rel.type;
  const color = REL_COLORS[rel.type] || "#4361EE";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:28, height:28, borderRadius:8, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color, flexShrink:0 }}>
        {personName(otherId).split(" ").map(w=>w[0]).join("").slice(0,2)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{personName(otherId)}</div>
        <div style={{ fontSize:10, color:C.text3 }}>
          {personTitle(otherId) && <span>{personTitle(otherId)} · </span>}
          <span style={{ color }}>{typeLabel}</span>
        </div>
      </div>
      <button onClick={() => onDelete(rel.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:16, padding:"2px 4px", borderRadius:4, lineHeight:1 }} title="Remove relationship">×</button>
    </div>
  );
};

function ReportingPanel({ record, environment }) {
  const [rels, setRels]         = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ type:"reports_to", to_record_id:"" });
  const [search, setSearch]     = useState("");
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!record?.id || !environment?.id) return;
    const [r, pplObj] = await Promise.all([
      tFetch(`/api/relationships?environment_id=${environment.id}&record_id=${record.id}`).then(r=>r.json()),
      tFetch(`/api/objects?environment_id=${environment.id}`).then(r=>r.json()),
    ]);
    setRels(Array.isArray(r) ? r : []);
    // Find people objects with relationships enabled
    const personObj = (Array.isArray(pplObj) ? pplObj : []).find(o => o.slug === "people");
    if (personObj) {
      const ppl = await tFetch(`/api/records?object_id=${personObj.id}&environment_id=${environment.id}&limit=200`).then(r=>r.json());
      setAllPeople(Array.isArray(ppl?.records) ? ppl.records : []);
    }
  }, [record?.id, environment?.id]);

  useEffect(() => { load(); }, [load]);

  const personName = (id) => {
    const p = allPeople.find(p => p.id === id);
    if (!p) return "Unknown";
    const d = p.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  };

  const personTitle = (id) => {
    const p = allPeople.find(p => p.id === id);
    return p?.data?.job_title || p?.data?.current_title || "";
  };

  const handleAdd = async () => {
    if (!form.to_record_id) return;
    setSaving(true);
    await tFetch("/api/relationships", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ from_record_id: record.id, to_record_id: form.to_record_id,
        type: form.type, environment_id: environment.id }),
    });
    setAdding(false); setForm({ type:"reports_to", to_record_id:"" }); setSearch("");
    setSaving(false); load();
  };

  const handleDelete = async (id) => {
    await tFetch(`/api/relationships/${id}`, { method:"DELETE" });
    load();
  };

  // Group rels: from this person (outgoing) and to this person (incoming)
  const outgoing = rels.filter(r => r.from_record_id === record.id);
  const incoming = rels.filter(r => r.to_record_id === record.id);

  const filtered = allPeople.filter(p => p.id !== record.id && (
    !search || personName(p.id).toLowerCase().includes(search.toLowerCase()) ||
    (p.data?.email||"").toLowerCase().includes(search.toLowerCase())
  ));

  const RelRow = null; // defined at module level below — called via relRowRenderer

  const hasAny = outgoing.length > 0 || incoming.length > 0;

  return (
    <div>
      {/* Relationship rows */}
      {!hasAny && !adding && (
        <div style={{ padding:"16px 14px", fontSize:12, color:C.text3, fontStyle:"italic" }}>
          No reporting relationships yet.
        </div>
      )}
      <div style={{ background:"#f8f9fc", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
        {outgoing.map(r => <RelRow key={r.id} rel={r} dir="out" personName={personName} personTitle={personTitle} onDelete={handleDelete}/>)}
        {incoming.map(r => <RelRow key={r.id} rel={r} dir="in" personName={personName} personTitle={personTitle} onDelete={handleDelete}/>)}

        {/* Add form */}
        {adding ? (
          <div style={{ padding:"12px 14px", borderTop: hasAny ? `1px solid ${C.border}` : "none",
            display:"flex", flexDirection:"column", gap:8 }}>
            <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
              style={{ padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`,
                fontSize:12, fontFamily:F, color:C.text1 }}>
              {REL_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search people…"
              style={{ padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`,
                fontSize:12, fontFamily:F, color:C.text1 }}/>
            {search && (
              <div style={{ maxHeight:160, overflowY:"auto", border:`1px solid ${C.border}`,
                borderRadius:8, background:"white" }}>
                {filtered.length === 0
                  ? <div style={{ padding:10, fontSize:12, color:C.text3, textAlign:"center" }}>No matches</div>
                  : filtered.slice(0,10).map(p => (
                    <div key={p.id} onClick={()=>{ setForm(f=>({...f,to_record_id:p.id})); setSearch(personName(p.id)); }}
                      style={{ padding:"7px 10px", cursor:"pointer", fontSize:12, color:C.text1,
                        borderBottom:`1px solid ${C.border}`, background: form.to_record_id===p.id ? C.accentLight : "transparent" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                      onMouseLeave={e=>e.currentTarget.style.background=form.to_record_id===p.id?C.accentLight:"transparent"}>
                      <span style={{ fontWeight:600 }}>{personName(p.id)}</span>
                      {personTitle(p.id) && <span style={{ color:C.text3 }}> · {personTitle(p.id)}</span>}
                    </div>
                  ))
                }
              </div>
            )}
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={handleAdd} disabled={!form.to_record_id || saving}
                style={{ flex:1, padding:"6px", borderRadius:7, border:"none",
                  background:C.accent, color:"#fff", fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:F, opacity:(!form.to_record_id||saving)?0.5:1 }}>
                {saving ? "Saving…" : "Add relationship"}
              </button>
              <button onClick={()=>{ setAdding(false); setSearch(""); setForm({type:"reports_to",to_record_id:""}); }}
                style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${C.border}`,
                  background:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:"8px 14px", borderTop: hasAny ? `1px solid ${C.border}` : "none",
            display:"flex", justifyContent:"flex-end" }}>
            <button onClick={()=>setAdding(true)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
                borderRadius:7, border:`1px solid ${C.border}`, background:"transparent",
                fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, color:C.text2 }}>
              + Add relationship
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Panel registry — future: load custom panels from object config (Settings > Objects > Panels)
// ── Panel order helpers — order is (string | string[])[] ─────────────────────
// A string entry is a standalone panel; a string[] entry is a tabbed group.
const flatPanelIds = (order) => order.flatMap(s => Array.isArray(s) ? s : [s]);
const repIdOf      = (slot)  => Array.isArray(slot) ? slot[0] : slot;
const removePanel  = (order, id) =>
  order.map(s => {
    if (!Array.isArray(s)) return s === id ? null : s;
    const next = s.filter(x => x !== id);
    if (next.length === 0) return null;
    if (next.length === 1) return next[0]; // unwrap singleton → standalone
    return next;
  }).filter(Boolean);
const mergePanel   = (order, targetRepId, newId) =>
  order.map(s => {
    if (repIdOf(s) !== targetRepId) return s;
    return Array.isArray(s) ? [...s, newId] : [s, newId];
  });

// ─── Job Questions Panel ──────────────────────────────────────────────────────
const TYPE_COLORS_Q = { knockout:"#dc2626", competency:"#2563eb", technical:"#7c3aed", culture:"#059669" };
const TYPE_LABELS_Q = { knockout:"Eligibility / Knockout", competency:"Competency / Behavioural", technical:"Technical", culture:"Culture Fit" };

// ── Generate Preview Modal ────────────────────────────────────────────────────
const TYPE_BADGE_COLORS = { knockout:"#ef4444", competency:"#3b82f6", technical:"#8b5cf6", culture:"#10b981" };

const GeneratePreviewModal = ({ preview, onConfirm, onClose, saving }) => {
  const [qs, setQs] = useState(() => preview.questions.map(q => ({...q, _selected:true, _addToLibrary: q._addToLibrary !== false})));
  const allSelected = qs.every(q => q._selected);
  const selectedCount = qs.filter(q => q._selected).length;
  const libraryCount = qs.filter(q => q._selected && q._addToLibrary).length;
  const jobOnlyCount = qs.filter(q => q._selected && !q._addToLibrary).length;

  const toggleQ = (i) => setQs(prev => prev.map((q,idx) => idx===i ? {...q, _selected:!q._selected} : q));
  const toggleAll = () => setQs(prev => prev.map(q => ({...q, _selected:!allSelected})));
  const toggleLibrary = (i, e) => { e.stopPropagation(); setQs(prev => prev.map((q,idx) => idx===i ? {...q, _addToLibrary:!q._addToLibrary} : q)); };
  const setAllLibrary = (val) => setQs(prev => prev.map(q => ({...q, _addToLibrary:val})));

  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:680,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        {/* Header */}
        <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #f0f0f0",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:"#1e1b4b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0L9.937 15.5z"/></svg>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>Review Generated Questions</div>
              <div style={{fontSize:11,color:"#6b7280"}}>
                {qs.length} questions generated
                {preview.filtered_count > 0 && <span style={{color:"#f59e0b",fontWeight:600}}> · {preview.filtered_count} duplicates filtered out</span>}
              </div>
            </div>
            <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",padding:4,color:"#6b7280",fontSize:18,lineHeight:1}}>×</button>
          </div>

          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"#f8fafc",borderRadius:8}}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{cursor:"pointer",flexShrink:0}} />
            <span style={{fontSize:12,color:"#374151",fontWeight:500,flex:1}}>Select all ({selectedCount}/{qs.length})</span>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#6b7280"}}>
              <span>Add to library</span>
              <button onClick={()=>setAllLibrary(true)} style={{fontSize:10,padding:"2px 7px",borderRadius:4,border:"1px solid #d1d5db",background:"white",cursor:"pointer",color:"#374151",fontWeight:600}}>All</button>
              <button onClick={()=>setAllLibrary(false)} style={{fontSize:10,padding:"2px 7px",borderRadius:4,border:"1px solid #d1d5db",background:"white",cursor:"pointer",color:"#374151",fontWeight:600}}>None</button>
            </div>
          </div>

          {/* Library vs job-only legend */}
          <div style={{display:"flex",gap:14,marginTop:7,padding:"0 10px",fontSize:11,color:"#6b7280"}}>
            <span style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:"#4f46e5"}}/>
              <strong style={{color:"#4f46e5"}}>{libraryCount}</strong> added to Question Library + this job
            </span>
            <span style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:"#0891b2"}}/>
              <strong style={{color:"#0891b2"}}>{jobOnlyCount}</strong> this job only
            </span>
          </div>
        </div>

        {/* Question list */}
        <div style={{overflowY:"auto",flex:1,padding:"8px 20px"}}>
          {qs.map((q, i) => (
            <div key={i} onClick={() => toggleQ(i)}
              style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 8px",borderRadius:8,cursor:"pointer",borderBottom:"1px solid #f9fafb",opacity:q._selected?1:0.4,transition:"opacity .15s"}}>
              <input type="checkbox" checked={q._selected} onChange={() => toggleQ(i)} onClick={e=>e.stopPropagation()} style={{marginTop:2,cursor:"pointer",flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:"#111827",lineHeight:1.45,marginBottom:4}}>{q.text}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${TYPE_BADGE_COLORS[q.type]||"#6b7280"}18`,color:TYPE_BADGE_COLORS[q.type]||"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{q.type}</span>
                  {q.competency && <span style={{fontSize:10,color:"#6b7280",padding:"2px 6px",borderRadius:99,background:"#f3f4f6"}}>{q.competency}</span>}
                  {(q.tags||[]).map(t => <span key={t} style={{fontSize:10,color:"#6b7280",padding:"2px 6px",borderRadius:99,background:"#f3f4f6"}}>#{t}</span>)}
                </div>
              </div>
              {/* Add to library toggle */}
              <div onClick={e=>toggleLibrary(i,e)} title={q._addToLibrary?"In library — click to make job-only":"Job only — click to add to library"}
                style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:6,border:`1.5px solid ${q._addToLibrary?"#4f46e5":"#0891b2"}`,background:q._addToLibrary?"#eef2ff":"#e0f2fe",cursor:"pointer",userSelect:"none",opacity:q._selected?1:0.35}}>
                <div style={{width:7,height:7,borderRadius:2,background:q._addToLibrary?"#4f46e5":"#0891b2",flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:700,color:q._addToLibrary?"#4338ca":"#0369a1",whiteSpace:"nowrap"}}>{q._addToLibrary?"Library":"Job only"}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:"1px solid #f0f0f0",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <div style={{flex:1,fontSize:11,color:"#6b7280",lineHeight:1.5}}>
            {libraryCount > 0 && <div><strong style={{color:"#4338ca"}}>{libraryCount}</strong> added to Question Library and this job</div>}
            {jobOnlyCount > 0 && <div><strong style={{color:"#0369a1"}}>{jobOnlyCount}</strong> assigned to this job only (not in library)</div>}
          </div>
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"white",fontSize:13,fontWeight:600,cursor:"pointer",color:"#374151"}}>Cancel</button>
          <button onClick={() => onConfirm(qs.filter(q=>q._selected))} disabled={saving||!selectedCount}
            style={{padding:"8px 16px",borderRadius:8,border:"none",background:selectedCount?"#1e1b4b":"#e5e7eb",color:selectedCount?"#e0e7ff":"#9ca3af",fontSize:13,fontWeight:700,cursor:selectedCount?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6}}>
            {saving?"Saving…":`Add ${selectedCount} Question${selectedCount!==1?"s":""}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const JobQuestionsPanel = ({ record, environment }) => {
  const [view, setView]           = useState("assigned"); // "assigned" | "bank" | "templates"
  const [assigned, setAssigned]   = useState([]);
  const [bankQs, setBankQs]       = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]           = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [genCount, setGenCount]       = useState(8);
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("");
  const [genPreview, setGenPreview]   = useState(null); // { questions, filtered_count }

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b, t] = await Promise.all([
      api.get(`/question-bank/jobs/${record.id}`),
      api.get("/question-bank/questions"),
      api.get("/question-bank/templates"),
    ]);
    setAssigned(Array.isArray(a) ? a : []);
    setBankQs(Array.isArray(b) ? b : []);
    setTemplates(Array.isArray(t) ? t : []);
    setSelected(new Set((Array.isArray(a) ? a : []).map(q => q.id)));
    setLoading(false);
  }, [record.id]);

  useEffect(() => { load(); }, [load]);

  const save = async (ids) => {
    setSaving(true);
    await tFetch(`/api/question-bank/jobs/${record.id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ question_ids: ids }),
    });
    setSaving(false);
    load();
  };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyTemplate = async (tplId) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;
    const merged = [...new Set([...assigned.map(q=>q.id), ...(tpl.question_ids||[])])];
    await save(merged);
  };

  const generate = async () => {
    const d = record.data || {};
    setGenerating(true);
    try {
      const res = await tFetch(`/api/question-bank/jobs/${record.id}/generate`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ job_title: d.job_title||d.name, department: d.department, description: d.description, skills: d.skills, count: genCount }),
      });
      const data = await res.json();
      // New: server returns { preview, filtered_count } — show review modal
      if (data.preview && Array.isArray(data.preview)) {
        setGenPreview({ questions: data.preview.map(q => ({...q, _selected: true})), filtered_count: data.filtered_count||0 });
      }
    } catch(e) { console.error(e); }
    setGenerating(false);
  };

  const confirmGenerated = async (selectedQs) => {
    if (!selectedQs.length) { setGenPreview(null); return; }
    setSaving(true);
    try {
      const libraryQs  = selectedQs.filter(q => q._addToLibrary !== false);
      const jobOnlyQs  = selectedQs.filter(q => q._addToLibrary === false);

      // Library questions: save to question bank, then assign by ID
      let libraryIds = [];
      if (libraryQs.length) {
        const saved = await Promise.all(libraryQs.map(q =>
          tFetch("/api/question-bank/questions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(q) }).then(r=>r.json())
        ));
        libraryIds = saved.map(q => q.id).filter(Boolean);
      }

      // Assign library questions to the job
      if (libraryIds.length) {
        const ids = [...assigned.map(q=>q.id), ...libraryIds];
        await tFetch(`/api/question-bank/jobs/${record.id}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ question_ids: ids }),
        });
      }

      // Job-only questions: save directly on the job (no library entry)
      if (jobOnlyQs.length) {
        await tFetch(`/api/question-bank/jobs/${record.id}/direct`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ questions: jobOnlyQs }),
        });
      }

      load();
    } catch(e) { console.error(e); }
    setGenPreview(null);
    setSaving(false);
  };

  const saveSelection = () => save([...selected]);

  const filteredBank = bankQs.filter(q => {
    if (filterType && q.type !== filterType) return false;
    if (search) { const s=search.toLowerCase(); return q.text.toLowerCase().includes(s)||(q.competency||"").toLowerCase().includes(s); }
    return true;
  });
  const groupedBank = ["knockout","competency","technical","culture"].reduce((a,t)=>({...a,[t]:filteredBank.filter(q=>q.type===t)}),{});

  const tabSt = (active) => ({ padding:"6px 14px", borderRadius:7, border:"none", background:active?C.accent:"transparent", color:active?"#fff":C.text2, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .12s" });

  if (loading) return <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div>;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:"#f1f5f9",borderRadius:9,padding:4}}>
        {[["assigned",`Assigned (${assigned.length})`],["bank","Question Bank"],["templates","Templates"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={tabSt(view===v)}>{l}</button>
        ))}
      </div>

      {/* ── Assigned Questions ─────────────────────────────── */}
      {view==="assigned" && (
        <div>
          {assigned.length === 0
            ? <div style={{padding:"32px 16px",textAlign:"center"}}>
                <div style={{width:44,height:44,borderRadius:12,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:22}}>📋</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:6}}>No questions assigned</div>
                <div style={{fontSize:12,color:C.text3,marginBottom:20,lineHeight:1.5}}>Pick from the Question Bank, apply a template, or let AI generate questions for this role.</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  <button onClick={()=>setView("bank")} style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:C.text1}}>Browse Bank</button>
                  <button onClick={()=>setView("templates")} style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:C.text1}}>Use Template</button>
                  <button onClick={generate} disabled={generating} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#1e1b4b",color:"#e0e7ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:generating?0.6:1,display:"flex",alignItems:"center",gap:5}}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0L9.937 15.5z"/></svg>
                    {generating?"Generating…":"AI Generate"}
                  </button>
                </div>
              </div>
            : <div>
                {/* AI Generate strip */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,background:"#1e1b4b",marginBottom:14}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" style={{flexShrink:0}}><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0L9.937 15.5z"/></svg>
                  <span style={{fontSize:12,color:"#e0e7ff",flex:1,fontWeight:500}}>AI-generate role-specific questions</span>
                  <select value={genCount} onChange={e=>setGenCount(Number(e.target.value))} style={{padding:"4px 8px",borderRadius:7,border:"1px solid #4338ca",fontSize:12,background:"#312e81",color:"#e0e7ff",cursor:"pointer",outline:"none"}}>
                    {[4,6,8,10,12].map(n=><option key={n} value={n}>{n} questions</option>)}
                  </select>
                  <button onClick={generate} disabled={generating} style={{padding:"5px 12px",borderRadius:7,border:"none",background:"#6366f1",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,opacity:generating?0.6:1,whiteSpace:"nowrap"}}>
                    {generating?"Generating…":"✦ Generate"}
                  </button>
                </div>
                {/* Group by type */}
                {["knockout","competency","technical","culture"].map(type=>{
                  const qs = assigned.filter(q=>q.type===type);
                  if (!qs.length) return null;
                  return (
                    <div key={type} style={{marginBottom:16}}>
                      <div style={{fontSize:10,fontWeight:700,color:TYPE_COLORS_Q[type],textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{TYPE_LABELS_Q[type]}</div>
                      {qs.map(q=>(
                        <div key={q.id} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,marginBottom:5}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:C.text1,lineHeight:1.5}}>{q.text}</div>
                            <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:99,background:`${TYPE_COLORS_Q[q.type]}14`,color:TYPE_COLORS_Q[q.type]}}>{TYPE_LABELS_Q[q.type]}</span>
                              <span style={{fontSize:10,color:C.text3}}>{q.weight} pts</span>
                              {q.options&&<span style={{fontSize:10,color:C.text3}}>Options: {q.options.join(", ")}</span>}
                              {q._job_only&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,background:"#e0f2fe",color:"#0369a1"}}>Job only</span>}
                            </div>
                          </div>
                          <button onClick={async ()=>{
                            if (q._job_only) {
                              // Remove job-only question via the direct endpoint
                              await tFetch(`/api/question-bank/jobs/${record.id}/direct/${q.id}`, {method:"DELETE"});
                              load();
                            } else {
                              const ids=assigned.filter(a=>a.id!==q.id&&!a._job_only).map(a=>a.id);
                              save(ids);
                            }
                          }} title="Remove" style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:4,borderRadius:6,flexShrink:0}}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── Question Bank picker ───────────────────────────── */}
      {view==="bank" && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-6-6"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions…" style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </div>
            {["","knockout","competency","technical","culture"].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{padding:"5px 10px",borderRadius:7,border:`1.5px solid ${filterType===t?(TYPE_COLORS_Q[t]||C.accent):C.border}`,background:filterType===t?(TYPE_COLORS_Q[t]||C.accent):"transparent",color:filterType===t?"#fff":C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                {t||"All"}
              </button>
            ))}
          </div>
          {Object.entries(groupedBank).map(([type,qs])=> qs.length===0 ? null : (
            <div key={type} style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:TYPE_COLORS_Q[type],textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{TYPE_LABELS_Q[type]}</div>
              {qs.map(q=>{
                const isSel = selected.has(q.id);
                return (
                  <div key={q.id} onClick={()=>toggle(q.id)} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${isSel?TYPE_COLORS_Q[q.type]:C.border}`,background:isSel?`${TYPE_COLORS_Q[q.type]}08`:C.surface,marginBottom:5,cursor:"pointer",transition:"all .1s"}}>
                    <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${isSel?TYPE_COLORS_Q[q.type]:C.border}`,background:isSel?TYPE_COLORS_Q[q.type]:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,transition:"all .1s"}}>
                      {isSel&&<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,color:C.text1,lineHeight:1.5}}>{q.text}</div>
                      <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:C.text3}}>{q.weight} pts</span>
                        {(q.tags||[]).slice(0,3).map(t=><span key={t} style={{fontSize:10,color:C.text3}}>#{t}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{position:"sticky",bottom:0,background:"white",paddingTop:10,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:C.text3}}>{selected.size} selected</span>
            <button onClick={saveSelection} disabled={saving} style={{padding:"8px 18px",borderRadius:9,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>
              {saving?"Saving…":"Save Selection"}
            </button>
          </div>
        </div>
      )}

      {/* ── Templates ─────────────────────────────────────── */}
      {view==="templates" && (
        <div>
          {templates.length === 0
            ? <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No templates in the Question Bank yet. Go to Settings → Question Bank to create some.</div>
            : templates.map(t => {
                const hasQs = (t.question_ids||[]).length > 0;
                return (
                  <div key={t.id} style={{padding:"14px 16px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{t.name}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{t.description||"No description"} · {(t.question_ids||[]).length} questions</div>
                    </div>
                    {t.is_system && <span style={{fontSize:10,fontWeight:700,color:"#64748b",background:"#f1f5f9",padding:"1px 6px",borderRadius:99}}>system</span>}
                    <button onClick={()=>applyTemplate(t.id)} disabled={!hasQs||saving} style={{padding:"7px 14px",borderRadius:8,border:"none",background:hasQs?C.accent:"#e5e7eb",color:hasQs?"white":"#9ca3af",fontSize:12,fontWeight:700,cursor:hasQs?"pointer":"not-allowed",fontFamily:"inherit",opacity:saving?0.6:1}}>
                      {saving?"…":"Apply"}
                    </button>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Generate Preview Modal */}
      {genPreview && <GeneratePreviewModal preview={genPreview} onConfirm={confirmGenerated} onClose={()=>setGenPreview(null)} saving={saving}/>}
    </div>
  );
};

// ─── Interview Coordination Panel ────────────────────────────────────────────
const STATUS_COORD = {
  collecting_availability: { label:"Collecting availability", color:"#f59e0b", bg:"#fef3c7" },
  confirmed:   { label:"Interview confirmed", color:"#0ca678", bg:"#d1fae5" },
  no_overlap:  { label:"No overlap — action needed", color:"#ef4444", bg:"#fee2e2" },
  cancelled:   { label:"Cancelled", color:"#6b7280", bg:"#f3f4f6" },
};
const AccessDeniedPanel = ({ label = "this section" }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", color:C.text3, textAlign:"center", gap:8 }}>
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <span style={{ fontSize:13, fontWeight:600, color:C.text2 }}>Access restricted</span>
    <span style={{ fontSize:12 }}>You don't have permission to view {label}.</span>
  </div>
);

const CoordinationPanel = ({ record, environment }) => {
  const [runs,     setRuns]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [starting, setStarting] = useState(false);
  const appUrl = window.location.origin;
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await tFetch(`/api/interview-coordinator/runs?candidate_id=${record.id}`).then(r=>r.json()); setRuns(Array.isArray(r)?r:[]); } catch(e){}
    setLoading(false);
  }, [record.id]);
  useEffect(() => { load(); }, [load]);
  const startNew = async () => {
    setStarting(true);
    try {
      const r = await tFetch("/api/interview-coordinator/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidate_id:record.id,environment_id:environment?.id})}).then(r=>r.json());
      if (r.ok) await load(); else window.__toast?.alert(r.error||"Failed");
    } catch(e){window.__toast?.alert(e.message);}
    setStarting(false);
  };
  if (loading) return <div style={{padding:"20px 0",textAlign:"center",color:C.text3,fontSize:13}}>Loading…</div>;
  return (
    <div>
      <div style={{marginBottom:14,display:"flex",justifyContent:"flex-end"}}>
        <button onClick={startNew} disabled={starting}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,
            border:`1.5px solid ${C.accent}`,background:C.accentLight,color:C.accent,
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:starting?0.6:1}}>
          <Ic n="plus" s={13}/>{starting?"Starting…":"Start Coordination"}
        </button>
      </div>
      {!runs.length && (
        <div style={{textAlign:"center",padding:"28px 16px",color:C.text3}}>
          <div style={{width:40,height:40,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><Ic n="calendar" s={20} c={C.accent}/></div>
          <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:4}}>No coordination runs yet</div>
          <div style={{fontSize:12,lineHeight:1.5}}>Automatically collect availability from both the hiring manager and candidate, find mutual slots and confirm the interview.</div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {runs.map(run => {
          const st = STATUS_COORD[run.status] || STATUS_COORD.collecting_availability;
          const hmR = run.hm_request; const cR = run.cand_request;
          return (
            <div key={run.id} style={{background:"#f9fafb",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,background:"white",borderBottom:"1px solid #f3f4f6"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{run.job_title||"Interview"}</div>
                  <div style={{fontSize:11,color:C.text3}}>with {run.hiring_manager_name||"Hiring Manager"} · {run.duration_minutes||45} min</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:st.bg,color:st.color,whiteSpace:"nowrap"}}>{st.label}</span>
              </div>
              <div style={{padding:"10px 14px",display:"flex",gap:10}}>
                {[{label:"Hiring Manager",req:hmR},{label:"Candidate",req:cR}].map(({label,req:r})=>(
                  <div key={label} style={{flex:1,background:"white",borderRadius:8,border:"1px solid #e5e7eb",padding:"8px 10px"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{label}</div>
                    {!r ? <span style={{fontSize:11,color:C.text3}}>—</span>
                      : r.status==="responded"
                        ? <span style={{fontSize:11,fontWeight:700,color:"#0ca678"}}>✓ Responded ({(r.selected_slots||[]).length} slots)</span>
                        : <div>
                            <span style={{fontSize:11,color:"#92400e",fontWeight:600}}>⏳ Pending</span>
                            {r.token && <button onClick={()=>navigator.clipboard.writeText(`${appUrl}/availability/${r.token}`).then(()=>window.__toast?.alert("Link copied!"))}
                              style={{display:"block",fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:"2px 0",fontFamily:F,textDecoration:"underline"}}>Copy link</button>}
                          </div>}
                  </div>
                ))}
              </div>
              {run.confirmed_slot && (
                <div style={{padding:"8px 14px",background:"#d1fae5",borderTop:"1px solid #a7f3d0",fontSize:12,fontWeight:700,color:"#065f46"}}>
                  ✓ Confirmed: {new Date(run.confirmed_slot).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PANEL_META = {
  comms:        { icon:"mail",          label:"Communications",      defaultOpen:true  },
  coordination: { icon:"calendar",      label:"Interview Coordination", defaultOpen:false },
  notes:        { icon:"messageSquare", label:"Notes",               defaultOpen:true  },
  attachments:  { icon:"paperclip",     label:"Files",               defaultOpen:true  },
  forms:        { icon:"clipboard",     label:"Forms",               defaultOpen:false },
  activity:     { icon:"activity",      label:"Activity",            defaultOpen:false },
  // workflows panel removed
  linked:       { icon:"link",          label:"Linked Records",      defaultOpen:true  },
  match:        { icon:"sparkles",      label:"Recommendations",     defaultOpen:false },
  reporting:    { icon:"gitBranch",     label:"Reporting",           defaultOpen:true  },
  user:         { icon:"user",          label:"Platform User",       defaultOpen:true  },
  scorecard:    { icon:"clipboard",     label:"Scorecards",          defaultOpen:false },
  questions:    { icon:"help-circle",   label:"Interview Questions", defaultOpen:false },
  interview_plan: { icon:"calendar",    label:"Interview Plan",      defaultOpen:true  },
  screening:    { icon:"shield",        label:"Screening Rules",     defaultOpen:true  },
  insights: { icon:"barChart", label:"Insights", defaultOpen:true },
};

export const getDefaultPanelOrder = (objectName) => {
  const base = ["tasks","comms","coordination","notes","attachments","forms","activity"];
  if (objectName === "Person") base.splice(1, 0, "linked", "reporting");
  if (["Person","Job"].includes(objectName)) base.push("match");
  if (objectName === "Person") base.push("scorecard");
  if (objectName === "Job") { base.unshift("interview_plan"); base.push("questions"); base.push("screening"); }
  if (objectName === "Job" || objectName === "Jobs") base.unshift("insights");

  return base;
};

// ─── Forms Panel ─────────────────────────────────────────────────────────────
const FormsPanel = ({ record, environment, objectSlug }) => {
  const [forms,      setForms]      = useState([]);
  const [subs,       setSubs]       = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [filling,    setFilling]    = useState(false);
  const [formData,   setFormData]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expanded,   setExpanded]   = useState({});

  const loadForms = useCallback(async () => {
    if (!environment?.id) return;
    const f = await api.get(`/forms?environment_id=${environment.id}&object_slug=${objectSlug||'people'}`);
    if (Array.isArray(f)) setForms(f);
    const s = await api.get(`/forms/submissions/by-record/${record.id}?environment_id=${environment.id}`);
    if (Array.isArray(s)) setSubs(s);
  }, [record.id, environment?.id, objectSlug]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const openForm = (form) => {
    setActiveForm(form);
    const init = {};
    (form.fields||[]).forEach(f => { init[f.id || f.name] = ''; });
    setFormData(init);
    setFilling(true);
  };

  const handleSubmit = async () => {
    if (!activeForm) return;
    setSubmitting(true);
    const res = await tFetch(`/api/forms/${activeForm.id}/submissions`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ record_id:record.id, record_name:record.data?.first_name ? `${record.data.first_name} ${record.data.last_name||''}`.trim() : record.id, data: formData, environment_id: environment?.id, submitted_by:'Admin' }),
    });
    if (res.ok) { setFilling(false); setActiveForm(null); await loadForms(); }
    setSubmitting(false);
  };

  const renderInput = (field) => {
    const key = field.id || field.name;
    const val = formData[key] ?? '';
    const st  = { width:'100%',padding:'8px 10px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,outline:'none',boxSizing:'border-box',background:'#f9fafb' };

    if (field.field_type==='textarea')
      return <textarea value={val} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))} placeholder={field.placeholder||''} rows={3} style={{...st,resize:'vertical'}}/>;
    if (field.field_type==='select'||field.field_type==='multiselect')
      return <select value={val} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))} style={st}>
        <option value="">— select —</option>
        {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
      </select>;
    if (field.field_type==='boolean')
      return <div style={{display:'flex',gap:8}}>
        {['Yes','No'].map(v=><button key={v} onClick={()=>setFormData(d=>({...d,[key]:v}))} style={{padding:'6px 16px',borderRadius:8,border:`1px solid ${val===v?C.accent:C.border}`,background:val===v?C.accentLight:'transparent',color:val===v?C.accent:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>{v}</button>)}
      </div>;
    if (field.field_type==='rating')
      return <div style={{display:'flex',gap:4}}>
        {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setFormData(d=>({...d,[key]:n}))} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:n<=(val||0)?C.amber:'#D1D5DB',padding:'0 2px'}}>★</button>)}
      </div>;
    if (field.field_type==='date')
      return <input type="date" value={val} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))} style={st}/>;
    if (field.field_type==='number'||field.field_type==='currency')
      return <input type="number" value={val} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))} placeholder={field.placeholder||''} style={st}/>;
    return <input type={field.field_type==='email'?'email':field.field_type==='url'?'url':'text'} value={val} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))} placeholder={field.placeholder||''} style={st}/>;
  };

  if (forms.length===0 && subs.length===0) return (
    <div style={{textAlign:'center',padding:'28px 0',color:C.text3,fontSize:13}}>
      <div style={{marginBottom:6}}>No forms configured for this record type.</div>
      <div style={{fontSize:11}}>Go to Settings → Forms to create forms.</div>
    </div>
  );

  return (
    <div>
      {/* Available forms to fill */}
      {forms.length>0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Available Forms</div>
          {forms.map(form=>(
            <div key={form.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1px solid ${C.border}`,background:'#f9fafb',marginBottom:6}}>
              <div style={{width:30,height:30,borderRadius:8,background:`${form.color||C.accent}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:14}}>📋</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{form.name}</div>
                {form.description&&<div style={{fontSize:11,color:C.text3}}>{form.description}</div>}
              </div>
              {form.is_confidential&&<span style={{fontSize:10,padding:'1px 5px',borderRadius:4,background:'#FEF2F2',color:C.red}}>🔒</span>}
              <button onClick={()=>openForm(form)} style={{padding:'5px 12px',borderRadius:7,border:`1px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F,flexShrink:0}}>Fill in</button>
            </div>
          ))}
        </div>
      )}

      {/* Past submissions */}
      {subs.length>0 && (
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Submissions ({subs.length})</div>
          {subs.map(sub=>(
            <div key={sub.id} style={{borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f9fafb',cursor:'pointer'}} onClick={()=>setExpanded(e=>({...e,[sub.id]:!e[sub.id]}))}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{sub.form_name}</div>
                  <div style={{fontSize:11,color:C.text3}}>By {sub.submitted_by} · {new Date(sub.submitted_at).toLocaleDateString()}</div>
                </div>
                <span style={{color:C.text3,fontSize:16}}>{expanded[sub.id]?'−':'+'}</span>
              </div>
              {expanded[sub.id] && (
                <div style={{padding:'10px 12px',borderTop:`1px solid ${C.border}`}}>
                  {Object.entries(sub.data||{}).map(([k,v])=>(
                    <div key={k} style={{display:'flex',padding:'5px 0',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                      <span style={{color:C.text3,width:140,flexShrink:0,fontWeight:500}}>{k}</span>
                      <span style={{color:C.text1}}>{Array.isArray(v)?v.join(', '):String(v||'—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fill-in Modal */}
      {filling && activeForm && (
        <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.target===e.currentTarget&&setFilling(false)}
          style={{position:'fixed',inset:0,background:'rgba(15,23,41,.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:C.surface,borderRadius:16,width:'100%',maxWidth:520,maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:F}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif"}}>{activeForm.name}</div>
                {activeForm.description&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{activeForm.description}</div>}
              </div>
              <button onClick={()=>setFilling(false)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20}}>×</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
              {(activeForm.fields||[]).map((field,i)=>(
                <div key={field.id||i} style={{marginBottom:14}}>
                  <label style={{fontSize:12,fontWeight:700,color:C.text2,display:'block',marginBottom:5}}>
                    {field.name} {field.is_required&&<span style={{color:C.red}}>*</span>}
                  </label>
                  {field.help_text&&<div style={{fontSize:11,color:C.text3,marginBottom:4}}>{field.help_text}</div>}
                  {renderInput(field)}
                </div>
              ))}
            </div>
            <div style={{padding:'12px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
              <button onClick={()=>setFilling(false)} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F,color:C.text2}}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{padding:'8px 20px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,opacity:submitting?0.5:1}}>{submitting?'Submitting…':'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Doc Extract Modal ────────────────────────────────────────────────────────
const DocExtractModal = ({ result, mappings, record, onApply, onClose }) => {
  const ITEMS = (mappings||[]).filter(m => {
    const v = result[m.extracted_key];
    return v !== null && v !== undefined && String(v).trim() !== '';
  }).map(m => ({ ...m, val: result[m.extracted_key] }));

  const [selected, setSelected] = useState(() => {
    const init = {};
    ITEMS.forEach(item => { init[item.extracted_key] = !!item.field_api_key; });
    return init;
  });

  const toggle = k => setSelected(s => ({ ...s, [k]: !s[k] }));
  const mappedSelected = ITEMS.filter(i => selected[i.extracted_key] && i.field_api_key);

  const handleApply = () => {
    const out = {};
    mappedSelected.forEach(i => { out[i.field_api_key] = i.val; });
    onApply(out);
  };

  return (
    <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(15,23,41,.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:C.surface,borderRadius:18,width:'100%',maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:F}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif"}}>Document Data Extracted</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>Select fields to apply to this record</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20}}>×</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 22px'}}>
          {ITEMS.length===0
            ? <div style={{textAlign:'center',padding:'32px 0',color:C.text3,fontSize:13}}>No data could be extracted. Ensure the document is clear and well-lit. Try a higher resolution image for scanned documents.</div>
            : ITEMS.map(item=>(
              <div key={item.extracted_key} onClick={()=>toggle(item.extracted_key)}
                style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 14px',borderRadius:10,marginBottom:6,cursor:'pointer',
                  background:selected[item.extracted_key]?`${C.accent}08`:'#f8f9fc',
                  border:`1px solid ${selected[item.extracted_key]?C.accent:C.border}`,transition:'all .12s'}}>
                <input type="checkbox" checked={!!selected[item.extracted_key]} onChange={()=>toggle(item.extracted_key)}
                  style={{width:15,height:15,accentColor:C.accent,flexShrink:0,marginTop:3,cursor:'pointer'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      {item.field_label||item.extracted_key}
                    </span>
                    {!item.field_api_key && <span style={{fontSize:10,padding:'1px 5px',borderRadius:4,background:'#FEF3C7',color:'#92400E'}}>not mapped</span>}
                  </div>
                  <div style={{fontSize:13,color:C.text1,wordBreak:'break-word'}}>{String(item.val)}</div>
                  {item.description&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{item.description}</div>}
                </div>
                {record.data?.[item.field_api_key]&&(
                  <div style={{fontSize:11,color:C.text3,textAlign:'right',flexShrink:0}}>
                    <div style={{color:C.red,textDecoration:'line-through',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{String(record.data[item.field_api_key])}</div>
                    <div style={{fontSize:9}}>will replace</div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
        <div style={{padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:C.text3}}>{mappedSelected.length} field{mappedSelected.length!==1?'s':''} will be applied</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F,color:C.text2}}>Cancel</button>
            <button onClick={handleApply} disabled={mappedSelected.length===0}
              style={{padding:'8px 16px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,opacity:mappedSelected.length===0?0.5:1}}>
              Apply {mappedSelected.length} field{mappedSelected.length!==1?'s':''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CV Parse Modal ───────────────────────────────────────────────────────────
const CvParseModal = ({ result, fields, record, onApply, onClose }) => {
  const [selected, setSelected] = useState({});

  // All potentially mappable fields — shown if Claude extracted a value
  const FIELD_DEFS = [
    { key:'first_name',       label:'First Name'        },
    { key:'last_name',        label:'Last Name'         },
    { key:'email',            label:'Email'             },
    { key:'phone',            label:'Phone'             },
    { key:'current_title',    label:'Current Title'     },
    { key:'location',         label:'Location'          },
    { key:'linkedin_url',     label:'LinkedIn URL'      },
    { key:'summary',          label:'Summary'           },
    { key:'notice_period',    label:'Notice Period'     },
    { key:'nationality',      label:'Nationality'       },
    { key:'years_experience', label:'Years Experience'  },
    { key:'skills',           label:'Skills'            },
  ];

  // Show fields where Claude returned a non-empty value
  const MAPPABLE = FIELD_DEFS.filter(m => {
    const val = result[m.key];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (typeof val === 'number' && isNaN(val)) return false;
    return true;
  });

  useEffect(() => {
    const init = {};
    MAPPABLE.forEach(m => { init[m.key] = true; });
    setSelected(init);
  }, []);

  const toggle = k => setSelected(s => ({ ...s, [k]: !s[k] }));

  const handleApply = () => {
    const toApply = {};
    MAPPABLE.forEach(m => { if (selected[m.key]) toApply[m.key] = result[m.key]; });
    onApply(toApply);
  };

  const labelSt = { fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' };

  return (
    <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,41,.45)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:C.surface, borderRadius:18, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.2)', overflow:'hidden', fontFamily:F }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>CV Parsed Successfully</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>Select fields to apply to this record</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:20 }}>×</button>
        </div>

        {/* Fields */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 22px' }}>
          {MAPPABLE.length === 0 && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ color:C.text3, fontSize:13, marginBottom:12 }}>
                Vercentic couldn't extract any field values from this CV. This usually means the file format couldn't be read — try uploading a PDF instead of DOCX.
              </div>
              {result && Object.keys(result).filter(k=>result[k]!==null&&!Array.isArray(result[k])).length > 0 && (
                <div style={{ textAlign:'left', background:'#f8f9fc', borderRadius:8, padding:12, fontSize:11, color:C.text3 }}>
                  <b>Raw result:</b> {JSON.stringify(result).slice(0,300)}
                </div>
              )}
            </div>
          )}
          {MAPPABLE.map(m => (
            <div key={m.key} onClick={()=>toggle(m.key)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, marginBottom:6, cursor:'pointer',
                background: selected[m.key] ? `${C.accent}08` : '#f8f9fc',
                border:`1px solid ${selected[m.key] ? C.accent : C.border}`, transition:'all .12s' }}>
              <input type="checkbox" checked={!!selected[m.key]} onChange={()=>toggle(m.key)}
                style={{ width:15, height:15, accentColor:C.accent, flexShrink:0, cursor:'pointer' }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{m.label}</div>
                {m.key === 'skills' && Array.isArray(result[m.key]) ? (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                    {result[m.key].slice(0, 12).map(s => (
                      <span key={s} style={{ padding:'2px 8px', borderRadius:99, background:'#F59F0018', border:'1px solid #F59F0028', fontSize:11, fontWeight:600, color:'#F59F00' }}>⚡ {s}</span>
                    ))}
                    {result[m.key].length > 12 && <span style={{ fontSize:11, color:C.text3 }}>+{result[m.key].length - 12} more</span>}
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:C.text1, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(result[m.key])}</div>
                )}
              </div>
              {record.data?.[m.key] && (
                <div style={{ fontSize:11, color:C.text3, textAlign:'right', flexShrink:0 }}>
                  <div style={{ color:C.red, textDecoration:'line-through', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis' }}>{String(record.data[m.key])}</div>
                  <div style={{ fontSize:9 }}>will be replaced</div>
                </div>
              )}
            </div>
          ))}

          {/* Extra parsed info (read-only) */}
          {(result.work_history?.length || result.education?.length) && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:10, background:'#f8f9fc', border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:8 }}>ALSO EXTRACTED (not applied to fields)</div>
              {result.years_experience && <div style={{ fontSize:12, color:C.text2, marginBottom:4 }}><b>Experience:</b> {result.years_experience} years</div>}
              {result.education?.length > 0 && <div style={{ fontSize:12, color:C.text2, marginBottom:4 }}><b>Education:</b> {result.education[0]?.degree} — {result.education[0]?.institution}</div>}
              {result.work_history?.length > 0 && <div style={{ fontSize:12, color:C.text2 }}><b>Last role:</b> {result.work_history[0]?.title} @ {result.work_history[0]?.company}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.text3 }}>{Object.values(selected).filter(Boolean).length} field{Object.values(selected).filter(Boolean).length!==1?'s':''} selected</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, color:C.text2 }}>Cancel</button>
            <button onClick={handleApply} disabled={Object.values(selected).filter(Boolean).length===0}
              style={{ padding:'8px 16px', borderRadius:8, border:'none', background:C.accent, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, opacity:Object.values(selected).filter(Boolean).length===0?0.5:1 }}>
              Apply {Object.values(selected).filter(Boolean).length} field{Object.values(selected).filter(Boolean).length!==1?'s':''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Activity Panel ─────────────────────────────────────────────────────────
const ACTIVITY_CATEGORIES = [
  { id:"all",           label:"All",          color:"#6b7280" },
  { id:"field_change",  label:"Field edits",  color:"#3b5bdb" },
  { id:"note",          label:"Notes",        color:"#f59f00" },
  { id:"communication", label:"Comms",        color:"#0891b2" },
  { id:"file",          label:"Files",        color:"#7048e8" },
  { id:"pipeline",      label:"Linked People",     color:"#0ca678" },
  { id:"status",        label:"Status",       color:"#e03131" },
  { id:"created",       label:"Created",      color:"#16a34a" },
];

const ACT_META = {
  created:       { icon:"plus",      bg:"#f0fdf4", ic:"#16a34a" },
  field_changed: { icon:"edit",      bg:"#eff6ff", ic:"#3b5bdb" },
  note_added:    { icon:"file-text", bg:"#fffbeb", ic:"#f59f00" },
  note_deleted:  { icon:"trash",     bg:"#fef2f2", ic:"#e03131" },
  email_sent:    { icon:"mail",      bg:"#f0f9ff", ic:"#0891b2" },
  sms_sent:      { icon:"phone",     bg:"#f0f9ff", ic:"#0891b2" },
  whatsapp_sent: { icon:"phone",     bg:"#f0f9ff", ic:"#0891b2" },
  call_logged:   { icon:"phone",     bg:"#f0f9ff", ic:"#0891b2" },
  file_uploaded: { icon:"paperclip", bg:"#f5f3ff", ic:"#7048e8" },
  file_deleted:  { icon:"trash",     bg:"#fef2f2", ic:"#e03131" },
  stage_changed: { icon:"trending",  bg:"#f0fdf4", ic:"#0ca678" },
  linked:        { icon:"link",      bg:"#f0fdf4", ic:"#0ca678" },
  unlinked:      { icon:"x",         bg:"#fef2f2", ic:"#e03131" },
  status_changed:{ icon:"activity",  bg:"#fef2f2", ic:"#e03131" },
  updated:       { icon:"edit",      bg:"#eff6ff", ic:"#3b5bdb" },
};

const ActivityPanel = memo(({ record }) => {
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [loading,  setLoading]  = useState(false);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    if (!record?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, search, category });
      const d = await api.get(`/records/${record.id}/activity?${params}`);
      // Support both old (array) and new (paginated) response shapes
      if (Array.isArray(d)) {
        setItems(d); setTotal(d.length); setPages(1);
      } else {
        setItems(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1);
      }
    } catch { setItems([]); }
    setLoading(false);
  }, [record?.id, page, search, category]);

  useEffect(() => { load(); }, [load]);
  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [search, category]);

  const formatVal = v => {
    if (v === null || v === undefined || v === "") return <em style={{color:C.text3}}>empty</em>;
    if (Array.isArray(v)) return v.join(", ") || <em style={{color:C.text3}}>empty</em>;
    return String(v).slice(0, 80);
  };

  const relTime = ts => {
    const diff = Date.now() - new Date(ts);
    if (diff < 60000)   return "just now";
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
    return new Date(ts).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  };

  const actionLabel = a => {
    if (a.action==="created")        return "created this record";
    if (a.action==="field_changed")  return `updated ${a.changes?.field_name||a.changes?.field_key||"a field"}`;
    if (a.action==="note_added")     return "added a note";
    if (a.action==="note_deleted")   return "deleted a note";
    if (a.action==="email_sent")     return `sent an email${a.changes?.subject ? `: "${a.changes.subject}"` : ""}`;
    if (a.action==="sms_sent")       return "sent an SMS";
    if (a.action==="whatsapp_sent")  return "sent a WhatsApp";
    if (a.action==="call_logged")    return "logged a call";
    if (a.action==="file_uploaded")  return `uploaded a file${a.changes?.name ? `: ${a.changes.name}` : ""}`;
    if (a.action==="file_deleted")   return "deleted a file";
    if (a.action==="stage_changed")  return `moved to ${a.changes?.stage||"a new stage"}`;
    if (a.action==="linked")         return "linked to a record";
    if (a.action==="unlinked")       return "unlinked a record";
    if (a.action==="status_changed") return `changed status to ${a.changes?.new_value||""}`;
    return "updated this record";
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>

      {/* Search + filter header */}
      <div style={{marginBottom:12}}>
        {/* Search */}
        <div style={{position:"relative",marginBottom:8}}>
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
            <Ic n="search" s={13} c={C.text3}/>
          </div>
          <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search activity…"
            style={{width:"100%",boxSizing:"border-box",padding:"7px 10px 7px 30px",
              borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,
              fontFamily:F,background:"#f8f9fc",color:C.text1,outline:"none"}}/>
          {search && (
            <button onClick={()=>setSearch("")}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",padding:2,display:"flex"}}>
              <Ic n="x" s={12} c={C.text3}/>
            </button>
          )}
        </div>

        {/* Category chips */}
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {ACTIVITY_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={()=>setCategory(cat.id)}
              style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:600,
                cursor:"pointer",fontFamily:F,border:"1.5px solid",
                borderColor: category===cat.id ? cat.color : C.border,
                background: category===cat.id ? `${cat.color}15` : "transparent",
                color: category===cat.id ? cat.color : C.text3,
                transition:"all .1s"}}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div style={{fontSize:11,color:C.text3,marginBottom:8}}>
        {loading ? "Loading…" : `${total} event${total!==1?"s":""}`}
        {(search||category!=="all") ? " matching filters" : ""}
      </div>

      {/* Item list */}
      {loading ? (
        <div style={{textAlign:"center",padding:"20px 0",color:C.text3,fontSize:13}}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{textAlign:"center",padding:"28px 0",color:C.text3,fontSize:13}}>
          {search||category!=="all" ? "No matching activity" : "No activity yet"}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {items.map((event, idx) => {
            const meta = ACT_META[event.action] || ACT_META.updated;
            const ch   = event.changes || {};
            return (
              <div key={event.id}
                style={{display:"flex",gap:10,padding:"11px 0",
                  borderBottom: idx<items.length-1 ? `1px solid ${C.border}` : "none"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:meta.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,marginTop:1}}>
                  <Ic n={meta.icon} s={12} c={meta.ic}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text1}}>
                      {event.actor || "System"}
                    </span>
                    <span style={{fontSize:12,color:C.text2}}>{actionLabel(event)}</span>
                    <span style={{fontSize:11,color:C.text3,marginLeft:"auto",whiteSpace:"nowrap"}}>
                      {relTime(event.created_at)}
                    </span>
                  </div>

                  {/* Field change diff */}
                  {event.action==="field_changed" && (ch.old_value!==undefined||ch.new_value!==undefined) && (
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,
                      padding:"5px 8px",background:"#f8f9fc",borderRadius:7,
                      border:`1px solid ${C.border}`,fontSize:11,flexWrap:"wrap"}}>
                      <span style={{padding:"2px 6px",borderRadius:5,background:"#fee2e2",
                        color:"#b91c1c",fontWeight:500,maxWidth:160,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {formatVal(ch.old_value)}
                      </span>
                      <Ic n="chevR" s={10} c={C.text3}/>
                      <span style={{padding:"2px 6px",borderRadius:5,background:"#dcfce7",
                        color:"#15803d",fontWeight:500,maxWidth:160,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {formatVal(ch.new_value)}
                      </span>
                    </div>
                  )}

                  {/* Note preview */}
                  {event.action==="note_added" && ch.preview && (
                    <div style={{marginTop:4,padding:"5px 8px",background:"#fffbeb",
                      borderRadius:7,border:`1px solid #fde68a`,fontSize:11,
                      color:"#92400e",lineHeight:1.4}}>
                      "{ch.preview}{ch.preview?.length>=100?"…":""}"
                    </div>
                  )}

                  {/* Comm subject */}
                  {["email_sent","sms_sent","whatsapp_sent"].includes(event.action) && ch.subject && (
                    <div style={{marginTop:4,fontSize:11,color:C.text3,fontStyle:"italic"}}>
                      {ch.subject}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginTop:14,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
            style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",
              borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",
              fontSize:12,fontWeight:600,cursor:page<=1?"not-allowed":"pointer",
              color:page<=1?C.text3:C.text2,fontFamily:F,opacity:page<=1?0.5:1}}>
            <Ic n="chevL" s={12} c={page<=1?C.text3:C.text2}/> Prev
          </button>
          <span style={{fontSize:11,color:C.text3}}>
            Page {page} of {pages} · {total} total
          </span>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages}
            style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",
              borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",
              fontSize:12,fontWeight:600,cursor:page>=pages?"not-allowed":"pointer",
              color:page>=pages?C.text3:C.text2,fontFamily:F,opacity:page>=pages?0.5:1}}>
            Next <Ic n="chevR" s={12} c={page>=pages?C.text3:C.text2}/>
          </button>
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.record?.id === next.record?.id);

// ── Notes Panel — defined OUTSIDE RecordDetail to prevent remount on every keystroke ──
const NotesPanel = ({ record, notes, onNotesChange, canAdd=true, canDelete=true, linkedJobRecords=[], activeJobContext=null }) => {
  const [newNote, setNewNote]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [noteContext, setNoteContext] = useState(null); // null=general, string=job record id
  const [filterCtx, setFilterCtx] = useState("all");   // "all" | "general" | <job id>

  // When job context tab changes in parent, sync both the filter and the note-context picker
  useEffect(() => {
    setNoteContext(activeJobContext);
    setFilterCtx(activeJobContext || "all");
  }, [activeJobContext]);

  const handleAdd = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    await api.post("/notes", {
      record_id: record.id,
      content: newNote,
      author: "Admin",
      related_record_id: noteContext || null,
    });
    setNewNote("");
    setSaving(false);
    onNotesChange();
  };

  const handleDelete = async (id) => {
    await api.del(`/notes/${id}`);
    onNotesChange();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
  };

  // Filter displayed notes by context
  const filteredNotes = filterCtx === "all" ? notes
    : filterCtx === "general" ? notes.filter(n => !n.related_record_id)
    : notes.filter(n => n.related_record_id === filterCtx);

  // Job title lookup
  const jobTitle = (id) => {
    const j = linkedJobRecords.find(j => j.id === id);
    return j ? (j.title || j.data?.job_title || "Job") : "Job";
  };

  return (
    <div>
      {/* Context filter tabs — only when person has linked jobs */}
      {linkedJobRecords.length > 0 && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {[{id:"all",label:`All (${notes.length})`},{id:"general",label:"General"},...linkedJobRecords.map(j=>({id:j.id,label:jobTitle(j.id)}))].map(tab=>(
            <button key={tab.id} onClick={()=>setFilterCtx(tab.id)}
              style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:filterCtx===tab.id?700:500,
                border:`1.5px solid ${filterCtx===tab.id?C.accent:C.border}`,
                background:filterCtx===tab.id?C.accentLight:"transparent",
                color:filterCtx===tab.id?C.accent:C.text3, cursor:"pointer", fontFamily:F }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {canAdd && (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a note… (Ctrl+Enter to save)"
            rows={3}
            style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, resize:"vertical", width:"100%", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            {/* Job context picker — only on Person records with linked jobs */}
            {linkedJobRecords.length > 0 ? (
              <select value={noteContext||""} onChange={e=>setNoteContext(e.target.value||null)}
                style={{ flex:1, padding:"5px 8px", borderRadius:8, border:`1px solid ${C.border}`,
                  fontSize:12, fontFamily:F, outline:"none", background:"white", color:C.text2 }}>
                <option value="">General note</option>
                {linkedJobRecords.map(j=>(
                  <option key={j.id} value={j.id}>Re: {jobTitle(j.id)}</option>
                ))}
              </select>
            ) : <div/>}
            <Btn onClick={handleAdd} disabled={!newNote.trim() || saving} sz="sm">{saving ? "Saving…" : "Add Note"}</Btn>
          </div>
        </div>
      )}

      {filteredNotes.length === 0
        ? <div style={{ textAlign:"center", padding:"20px 0", color:C.text3, fontSize:13 }}>No notes yet</div>
        : filteredNotes.map(note => {
          const relJob = note.related_record_id ? linkedJobRecords.find(j=>j.id===note.related_record_id) : null;
          return (
            <div key={note.id} style={{ background: isAiGenerated(note) ? "#F5F3FF" : "#f8f9fc", borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${isAiGenerated(note) ? "#7048E830" : C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={note.author} size={22} color={isAiGenerated(note) ? "#7048E8" : C.accent}/>
                  <span style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{note.author}</span>
                  {isAiGenerated(note) && <AiBadge/>}
                  {relJob && (
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
                      background:C.accentLight, color:C.accent, whiteSpace:"nowrap" }}>
                      {jobTitle(relJob.id)}
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:C.text3 }}>{new Date(note.created_at).toLocaleDateString()}</span>
                  {canDelete && (
                    <button onClick={() => handleDelete(note.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:2, borderRadius:4 }}>
                      <Ic n="trash" s={12} c={C.text3}/>
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize:13, color:C.text1, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{note.content}</div>
            </div>
          );
        })
      }
    </div>
  );
};

// Stable wrapper so MatchingEngine never remounts due to PanelContent's wide dep array.
// Only re-renders when the actual record id or object type changes.
const StableMatchPanel = memo(({ recordId, objectName, environment, record, onNavigate }) => (
  <div style={{ margin:"-16px" }}>
    <MatchingEngine
      environment={environment}
      initialRecord={record}
      initialObject={{ name:objectName, slug: objectName==="Person" ? "people" : "jobs" }}
      onNavigate={onNavigate}
    />
  </div>
), (prev, next) =>
  prev.recordId === next.recordId &&
  prev.objectName === next.objectName &&
  prev.environment?.id === next.environment?.id
);


// ── PanelCard — defined at module level (uses useRef, can't be nested) ──
const PanelCard = ({ id, compact, openPanels, setOpenPanels, openPanelsKey, renderPanel, startPanelDrag, overSlot, overZone,
  draggingPanel, notes, attachments, clearZone, reportZone }) => {
  const meta = PANEL_META[id];
  if (!meta) return null;
  const isOpen     = compact ? true : openPanels[id];
  const isDragging = draggingPanel === id;
  const myRepId    = id; // standalone → repId === id
  const isOver     = overSlot === myRepId && !isDragging;
  const zone       = isOver ? overZone : null;
  const badge      = id==="notes" ? (notes?.length ?? 0) : id==="attachments" ? (attachments?.length ?? 0) : 0;

  const cardRef = useRef(null);

  if (compact) return <div style={{ padding:"16px" }}>{renderPanel({id})}</div>;

  const borderColor = zone === "middle" ? C.accent : C.border;
  const shadow = zone === "middle"
    ? `0 0 0 3px ${C.accent}50, 0 4px 20px rgba(59,91,219,.2)`
    : "0 1px 4px rgba(0,0,0,.04)";

  return (
    <div ref={cardRef}
      onMouseMove={e => cardRef.current && reportZone(myRepId, e, cardRef.current)}
      onMouseLeave={() => clearZone(myRepId)}
      style={{
        background: C.surface,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 14, marginBottom: 12, overflow: "hidden",
        transition: "opacity .12s, box-shadow .1s, border-color .1s, transform .1s",
        opacity:   isDragging ? 0.3 : 1,
        boxShadow: shadow,
        transform: isDragging ? "scale(0.97)" : "scale(1)",
        position: "relative",
      }}>
      {/* Zone hint overlay */}
      {isOver && zone !== "middle" && (
        <div style={{
          position:"absolute", left:0, right:0, height:3, background:C.accent, zIndex:10,
          borderRadius:2, boxShadow:`0 0 6px ${C.accent}80`,
          top: zone === "top" ? 0 : "auto", bottom: zone === "bottom" ? 0 : "auto",
        }}/>
      )}
      {isOver && zone === "middle" && (
        <div style={{ position:"absolute", inset:0, borderRadius:12,
          background:`${C.accent}08`, zIndex:1, pointerEvents:"none",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.accent, background:C.accentLight,
            padding:"3px 10px", borderRadius:8, boxShadow:`0 1px 4px ${C.accent}30` }}>
            Group together
          </span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
        userSelect:"none", borderBottom: isOpen ? `1px solid ${C.border}` : "none", position:"relative", zIndex:2 }}>
        {/* Grip */}
        <div title="Drag: reorder between cards · drop onto card center to group"
          onMouseDown={e => { e.preventDefault(); startPanelDrag(id); }}
          onClick={e => e.stopPropagation()}
          style={{ color:C.text3, cursor:"grab", padding:"2px 3px", display:"flex", flexShrink:0,
            borderRadius:4, transition:"color .12s, background .12s" }}
          onMouseEnter={e=>{ e.currentTarget.style.color=C.accent; e.currentTarget.style.background=C.accentLight; }}
          onMouseLeave={e=>{ e.currentTarget.style.color=C.text3;  e.currentTarget.style.background="transparent"; }}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
            {[4,9,14].flatMap(y=>[4,9].map(x=><circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="currentColor"/>))}
          </svg>
        </div>
        {/* Collapse toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, cursor:"pointer" }}
          onClick={() => setOpenPanels(p => {
            const next = { ...p, [id]: !p[id] };
            try { localStorage.setItem(openPanelsKey, JSON.stringify(next)); } catch {}
            return next;
          })}>
          <Ic n={meta.icon} s={14} c={C.accent}/>
          <span style={{ flex:1, fontSize:13, fontWeight:700, color:C.text1 }}>{meta.label}</span>
          {badge > 0 && <span style={{ background:C.accentLight, color:C.accent, fontSize:11, fontWeight:700, borderRadius:20, padding:"1px 7px" }}>{badge}</span>}
          <span style={{ display:"flex", transition:"transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <Ic n="chevD" s={14} c={C.text3}/>
          </span>
        </div>
      </div>
      {isOpen && <div style={{ padding:"16px", position:"relative", zIndex:2 }}>{renderPanel({id})}</div>}
    </div>
  );
};

// ── Tabbed group card — defined at module level (hooks must not be in nested functions) ──
const GroupCard = ({ ids, overSlot, overZone, openPanels, setOpenPanels, openPanelsKey, panelOrder, savePanelOrder, removePanel, renderPanel, startPanelDrag }) => {
  const repId   = ids[0];
  const cardRef = useRef(null);
  const tabStripRef = useRef(null);
  const isOver  = overSlot === repId;
  const zone    = isOver ? overZone : null;
  const groupOpenKey = `grp_${ids.join("_")}`;
  const isGroupOpen  = openPanels[groupOpenKey] !== false;
  const [activeTab, setActiveTab] = useState(ids[0]);
  const safeActive = ids.includes(activeTab) ? activeTab : ids[0];

  // ── In-group tab drag state ──────────────────────────────────────────────
  const [draggingTab,    setDraggingTab]    = useState(null);  // id being dragged within group
  const [tabInsertBefore, setTabInsertBefore] = useState(null); // id to insert before (null=end)
  const draggingTabRef    = useRef(null);
  const tabInsertRef      = useRef(null);

  const startTabDrag = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingTabRef.current  = id;
    tabInsertRef.current    = null;
    setDraggingTab(id);
    setTabInsertBefore(null);

    const onMove = (ev) => {
      if (!draggingTabRef.current) return;
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;

      // If cursor drifts far outside the tab strip vertically → eject to card-level drag
      if (tabStripRef.current) {
        const stripRect = tabStripRef.current.getBoundingClientRect();
        const outsideVertically = clientY < stripRect.top - 24 || clientY > stripRect.bottom + 24;
        if (outsideVertically) {
          // Promote to a card-level drag
          const fromId = draggingTabRef.current;
          draggingTabRef.current = null;
          tabInsertRef.current   = null;
          setDraggingTab(null);
          setTabInsertBefore(null);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup",   onUp);
          startPanelDrag(fromId);
          return;
        }
      }

      // Find which tab the cursor is over and which half
      if (!tabStripRef.current) return;
      const tabEls = [...tabStripRef.current.querySelectorAll('[data-tab-id]')];
      let newBefore = null;
      for (const el of tabEls) {
        const tid = el.dataset.tabId;
        if (tid === draggingTabRef.current) continue;
        const rect = el.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) { newBefore = tid; break; }
      }
      if (tabInsertRef.current !== newBefore) {
        tabInsertRef.current = newBefore;
        setTabInsertBefore(newBefore);
      }
    };

    const onUp = () => {
      const fromId = draggingTabRef.current;
      const before = tabInsertRef.current;
      draggingTabRef.current = null;
      tabInsertRef.current   = null;
      setDraggingTab(null);
      setTabInsertBefore(null);

      if (fromId && fromId !== before) {
        const next = ids.filter(x => x !== fromId);
        const idx  = before === null ? next.length : next.indexOf(before);
        if (idx === -1) next.push(fromId);
        else next.splice(idx, 0, fromId);
        const newOrder = panelOrder.map(s =>
          Array.isArray(s) && s[0] === repId ? next : s
        );
        savePanelOrder(newOrder);
      }

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend",  onUp);
  };

  const ejectTab = (id, e) => {
    e.stopPropagation();
    savePanelOrder(removePanel(panelOrder, id));
  };

  return (
    <div ref={cardRef}
      onMouseMove={e => cardRef.current && reportZone(repId, e, cardRef.current)}
      onMouseLeave={() => clearZone(repId)}
      style={{
        background: C.surface,
        border: `1.5px solid ${zone === "middle" ? C.accent : C.border}`,
        borderRadius: 14, marginBottom: 12, overflow: "hidden",
        boxShadow: zone === "middle" ? `0 0 0 3px ${C.accent}50, 0 4px 20px rgba(59,91,219,.2)` : "0 1px 4px rgba(0,0,0,.04)",
        transition: "border-color .1s, box-shadow .1s",
        position: "relative",
      }}>
      {/* Zone line indicators */}
      {isOver && zone !== "middle" && (
        <div style={{ position:"absolute", left:0, right:0, height:3, background:C.accent, zIndex:10,
          borderRadius:2, boxShadow:`0 0 6px ${C.accent}80`,
          top: zone === "top" ? 0 : "auto", bottom: zone === "bottom" ? 0 : "auto" }}/>
      )}
      {isOver && zone === "middle" && (
        <div style={{ position:"absolute", inset:0, borderRadius:12,
          background:`${C.accent}08`, zIndex:1, pointerEvents:"none",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.accent, background:C.accentLight,
            padding:"3px 10px", borderRadius:8 }}>Add to group</span>
        </div>
      )}

      {/* Tab strip header */}
      <div style={{ display:"flex", alignItems:"stretch", borderBottom:`1px solid ${C.border}`,
        background:"#fafbfc", userSelect:"none", padding:"4px 0" }}>

        {/* Group grip (move whole group) */}
        <div title="Drag group"
          onMouseDown={e => { e.preventDefault(); startPanelDrag(repId); }}
          onClick={e => e.stopPropagation()}
          style={{ display:"flex", alignItems:"center", padding:"0 8px 0 12px",
            color:C.text3, cursor:"grab", flexShrink:0, transition:"color .12s" }}
          onMouseEnter={e=>e.currentTarget.style.color=C.accent}
          onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            {[3,8,13].flatMap(y=>[2,7].map(x=><circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="currentColor"/>))}
          </svg>
        </div>

        {/* Tabs */}
        <div ref={tabStripRef} style={{ display:"flex", flex:1, overflowX:"auto", userSelect:"none",
          gap:2, padding:"0 4px", alignItems:"center" }}>
          {ids.map(id => {
            const meta = PANEL_META[id];
            if (!meta) return null;
            const isActive        = id === safeActive;
            const isDraggingThis  = draggingTab === id;
            const showInsertLine  = tabInsertBefore === id && draggingTab && draggingTab !== id;
            return (
              <div key={id} data-tab-id={id} style={{ display:"flex", alignItems:"center", gap:5,
                padding:"5px 10px", cursor:"pointer", flexShrink:0, position:"relative",
                borderRadius:8,
                background: isActive ? `${C.accent}12` : "transparent",
                border: isActive ? `1px solid ${C.accent}30` : "1px solid transparent",
                opacity: isDraggingThis ? 0.35 : 1,
                transition:"background .15s, border .15s, opacity .12s" }}>

                {/* Vertical insert indicator */}
                {showInsertLine && (
                  <div style={{ position:"absolute", left:-2, top:4, bottom:4, width:2.5,
                    background:C.accent, borderRadius:2, boxShadow:`0 0 6px ${C.accent}80`, zIndex:10 }}/>
                )}

                {/* Tab grip */}
                <div
                  title="Drag to reorder tabs"
                  onMouseDown={e => startTabDrag(id, e)}
                  onClick={e => e.stopPropagation()}
                  style={{ color: isActive ? C.accent : C.text3, cursor:"grab",
                    display:"flex", opacity:0.4, transition:"opacity .12s, color .12s",
                    flexShrink:0 }}
                  onMouseEnter={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.color=C.accent; }}
                  onMouseLeave={e=>{ e.currentTarget.style.opacity="0.4"; e.currentTarget.style.color=isActive?C.accent:C.text3; }}>
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                    {[2,6,10].flatMap(y=>[1,5].map(x=><circle key={`${x}${y}`} cx={x} cy={y} r="1.1" fill="currentColor"/>))}
                  </svg>
                </div>

                {/* Tab label */}
                <div onClick={() => setActiveTab(id)}
                  style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <Ic n={meta.icon} s={12} c={isActive ? C.accent : C.text3}/>
                  <span style={{ fontSize:12, fontWeight: isActive ? 700 : 500,
                    color: isActive ? C.accent : C.text2, whiteSpace:"nowrap" }}>
                    {meta.label}
                  </span>
                </div>

                {/* Eject × */}
                <button onClick={e => ejectTab(id, e)} title="Remove from group"
                  style={{ background:"none", border:"none", cursor:"pointer", padding:"0 0 0 2px",
                    color:C.text3, display:"flex", opacity:0.4, lineHeight:1, fontSize:13,
                    transition:"opacity .1s, color .1s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.color="#ef4444"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.opacity="0.4"; e.currentTarget.style.color=C.text3; }}>
                  ×
                </button>
              </div>
            );
          })}
          {/* Insert-at-end indicator */}
          {draggingTab && tabInsertBefore === null && (
            <div style={{ width:2.5, alignSelf:"stretch", margin:"4px 0",
              background:C.accent, borderRadius:2, boxShadow:`0 0 6px ${C.accent}80` }}/>
          )}
        </div>

        {/* Collapse toggle for the whole group */}
        <button onClick={() => setOpenPanels(p => {
            const next = { ...p, [groupOpenKey]: !isGroupOpen };
            try { localStorage.setItem(openPanelsKey, JSON.stringify(next)); } catch {}
            return next;
          })}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"0 14px",
            display:"flex", alignItems:"center", color:C.text3, flexShrink:0,
            transition:"transform .2s", transform: isGroupOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <Ic n="chevD" s={14} c={C.text3}/>
        </button>
      </div>

      {/* Active tab content */}
      {isGroupOpen && (
        <div style={{ padding:"16px" }}>
          {renderPanel({id:safeActive})}
        </div>
      )}
    </div>
  );
};


// ── FormPickerModal — lets user link an existing form to a record ─────────────
const FormPickerModal = ({ environment, record, onClose, onLinked }) => {
  const [forms, setForms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/forms?environment_id=${environment.id}`)
      .then(d => { setForms(Array.isArray(d) ? d : d?.forms || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environment?.id]);

  const linkForm = async (formId) => {
    setLinking(formId);
    try {
      await api.post(`/forms/${formId}/responses`, {
        record_id: record?.id,
        environment_id: environment?.id,
        data: {},
      });
      onLinked?.();
    } catch (e) {
      console.error('Link form error:', e);
    }
    setLinking(null);
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"var(--t-surface)",borderRadius:14,width:"100%",maxWidth:440,
        boxShadow:"0 16px 48px rgba(0,0,0,0.18)",maxHeight:"80vh",
        display:"flex",flexDirection:"column",overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",borderBottom:"1px solid var(--t-border)"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--t-text1)"}}>Add Form</div>
            <div style={{fontSize:12,color:"var(--t-text3)",marginTop:2}}>
              Select a form to link to this record
            </div>
          </div>
          <button onClick={onClose}
            style={{background:"none",border:"none",cursor:"pointer",
              padding:4,borderRadius:6,color:"var(--t-text3)",display:"flex"}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          {loading && (
            <div style={{padding:"32px",textAlign:"center",color:"var(--t-text3)",fontSize:13}}>
              Loading forms…
            </div>
          )}
          {!loading && forms.length === 0 && (
            <div style={{padding:"32px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--t-text1)",marginBottom:6}}>
                No forms available
              </div>
              <div style={{fontSize:12,color:"var(--t-text3)"}}>
                Create forms in Settings → Forms first.
              </div>
            </div>
          )}
          {!loading && forms.map(f => (
            <div key={f.id}
              style={{display:"flex",alignItems:"center",gap:12,
                padding:"10px 20px",borderBottom:"1px solid var(--t-border2)",
                transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--t-surface2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{
                width:34,height:34,borderRadius:9,flexShrink:0,
                background:"var(--t-accentLight,#eef2ff)",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="var(--t-accent,#4361EE)" strokeWidth={1.8} strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="4" rx="1"/>
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t-text1)",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {f.name}
                </div>
                {f.description && (
                  <div style={{fontSize:11,color:"var(--t-text3)",marginTop:1,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {f.description}
                  </div>
                )}
                <div style={{fontSize:10,color:"var(--t-text3)",marginTop:2}}>
                  {(f.fields||[]).length} fields
                  {f.category ? ` · ${f.category}` : ""}
                </div>
              </div>
              <button
                onClick={() => linkForm(f.id)}
                disabled={linking === f.id}
                style={{
                  padding:"6px 14px",borderRadius:7,
                  background: linking===f.id ? "var(--t-surface2)" : "var(--t-accent,#4361EE)",
                  color: linking===f.id ? "var(--t-text3)" : "white",
                  border:"none",cursor:linking===f.id?"default":"pointer",
                  fontSize:12,fontWeight:700,fontFamily:"inherit",flexShrink:0,
                  transition:"all .15s",
                }}>
                {linking === f.id ? "Adding…" : "Add"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SuggestedActions ────────────────────────────────────────────────────────
const SA_ICONS = {
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5",
  calendar:"M3 9h18M3 15h18M8 3v2m8-2v2M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z",
  dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  fileText:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  arrowRight:"M5 12h14M12 5l7 7-7 7",
  globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c-2.76 0-5 4.48-5 10s2.24 10 5 10 5-4.48 5-10S14.76 2 12 2zM2 12h20",
  sparkles:"M12 3l1.88 5.76H20l-4.94 3.58 1.88 5.76L12 14.52l-4.94 3.58 1.88-5.76L4 8.76h6.12L12 3z",
  x:"M18 6L6 18M6 6l12 12",
};
const SuggestedActions = ({ record, environment, onAction }) => {
  const [actions, setActions]   = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered]   = useState(null);
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    api.get(`/records/${record.id}/suggested-actions?environment_id=${environment.id}`)
      .then(d => { if (Array.isArray(d) && d.length) setActions(d); }).catch(()=>{});
  }, [record?.id, environment?.id]);
  if (!actions.length || dismissed) return null;
  const actionIcon = (type) => {
    const map = {
      email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
      call:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .73h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
      note:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
      task:"M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    };
    const t=(type||"").toLowerCase();
    for(const [k,v] of Object.entries(map)){if(t.includes(k))return v;}
    return "M12 5v14M5 12h14";
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px 7px 14px",
      background:"linear-gradient(90deg,#FFFBEB 0%,#FEFCE8 100%)",
      borderBottom:"1px solid #FDE68A", flexShrink:0, overflowX:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, marginRight:4 }}>
        <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
          background:"linear-gradient(135deg,#F59E0B,#EF4444)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M12 2L9.1 9.1 2 12l7.1 2.9L12 22l2.9-7.1L22 12l-7.1-2.9L12 2z"/>
          </svg>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:"#92400E", letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>AI Suggested</span>
        <div style={{ width:1, height:14, background:"#FCD34D", marginLeft:2, flexShrink:0 }}/>
      </div>
      <div style={{ display:"flex", gap:5, alignItems:"center", flex:1 }}>
        {actions.map((action, idx) => (
          <button key={idx} onClick={()=>onAction?.(action)}
            onMouseEnter={()=>setHovered(idx)} onMouseLeave={()=>setHovered(null)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px 5px 9px",
              borderRadius:20, border:`1.5px solid ${hovered===idx?"#D97706":"#FCD34D"}`,
              background:hovered===idx?"#FEF3C7":"white",
              color:hovered===idx?"#92400E":"#B45309",
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              whiteSpace:"nowrap", transition:"all .12s",
              boxShadow:hovered===idx?"0 2px 8px rgba(217,119,6,.15)":"0 1px 2px rgba(0,0,0,.06)",
              transform:hovered===idx?"translateY(-1px)":"translateY(0)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={actionIcon(action.type)}/>
            </svg>
            {action.label||action.title||"Take action"}
          </button>
        ))}
      </div>
      <button onClick={()=>setDismissed(true)} title="Dismiss"
        style={{ flexShrink:0, marginLeft:4, width:22, height:22, borderRadius:6,
          border:"none", background:"transparent", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", color:"#D97706", transition:"all .12s" }}
        onMouseEnter={e=>{e.currentTarget.style.background="#FDE68A";}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
};

// Module-level components used inside RecordDetail
// MUST be here so FunctionalityBar (called as a function inside RecordDetail) can reference them

const SlideOutHeader = ({ title, subtitle, objectColor, status, statusField, record, onToggleFullPage, onDelete, onClose, photoUrl }) => (
  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
    <Avatar name={title} color={objectColor} size={38} photoUrl={photoUrl}/>
    <div style={{ flex:1, minWidth:0 }}>
      <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:C.text1, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.3px" }}>{title}</h2>
      {subtitle && <div style={{ fontSize:12, color:C.text3, marginTop:1 }}>{subtitle}</div>}
    </div>
    {status && statusField && <Badge color={STATUS_COLORS[status]||C.accent} light>{status}</Badge>}
    <div style={{ display:"flex", gap:6 }}>
      <Btn v="ghost" sz="sm" icon="expand" onClick={onToggleFullPage}/>
      <Btn v="danger" sz="sm" icon="trash" onClick={()=>onDelete(record.id)}/>
      <Btn v="ghost" sz="sm" icon="x" onClick={onClose}/>
    </div>
  </div>
);

function _DropIndicator({ beforeRepId, afterRepId, draggingPanel, overSlot, overZone }) {
  if (!draggingPanel) return null;
  if (overZone === "middle") return null;
  const showBefore = beforeRepId && overSlot === beforeRepId && overZone === "top";
  const showAfter  = afterRepId  && overSlot === afterRepId  && overZone === "bottom";
  if (!showBefore && !showAfter) return null;
  return <div style={{ height:3, borderRadius:2, background:C.accent, margin:"0 0 12px", boxShadow:`0 0 8px ${C.accent}70` }}/>;
}

const ActionBtn = ({ icon, label, onClick, accent, danger }) => (
  <button onClick={onClick}
    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:20,
      border:"none",
      background: danger ? "#FEF2F2" : accent ? C.accentLight : "#F1F5F9",
      color: danger ? "#DC2626" : accent ? C.accent : "#475569",
      fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap",
      transition:"all .15s", letterSpacing:"0.01em", boxShadow:"0 1px 2px rgba(0,0,0,0.06)" }}
    onMouseEnter={e=>{ e.currentTarget.style.background=danger?"#FEE2E2":accent?`${C.accent}25`:"#E2E8F0"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.10)"; e.currentTarget.style.transform="translateY(-1px)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.background=danger?"#FEF2F2":accent?C.accentLight:"#F1F5F9"; e.currentTarget.style.boxShadow="0 1px 2px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="translateY(0)"; }}>
    <Ic n={icon} s={12} c="currentColor"/> {label}
  </button>
);

export const RecordDetail = ({ record, fields, allObjects, environment, objectName, objectColor, onClose, fullPage, onToggleFullPage, onUpdate, onDelete, onNavigate }) => {
  const _permCtx = usePermCtx();
  const canRecord = (flag) => _permCtx ? _permCtx.canGlobal(flag) : true;
  // ── Job context — Person records only ────────────────────────────────────
  const [highlightEmptyFields, setHighlightEmptyFields] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [availableForms, setAvailableForms]  = useState([]);
  const [activeJobContext, setActiveJobContext] = useState(null); // null=General, string=job record id
  const [linkedJobRecords, setLinkedJobRecords] = useState([]);
  useEffect(() => {
    if (objectName !== "Person") return;
    if (!record?.id || !environment?.id) return;
    tFetch(`/api/records/linked-jobs?person_id=${record.id}&environment_id=${environment.id}`)
      .then(r => r.json())
      .then(d => setLinkedJobRecords(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [record?.id, environment?.id, objectName]);
  const [tab, setTab]           = useState("fields");
  const [editing, setEditing]   = useState({});
  const [globalEdit, setGlobalEdit] = useState(false);
  const [notes, setNotes]       = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [saving, setSaving]     = useState(false);
  const openPanelsKey = `talentos_openpanels_${objectName}`;
  const [openPanels, setOpenPanels] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`talentos_openpanels_${objectName}`));
      if (saved && typeof saved === "object") return saved;
    } catch {}
    return {comms:true,notes:true,attachments:true,activity:false,workflows:false,match:false,reporting:true,user:true,forms:false};
  });
  const [composeType, setComposeType] = useState(null);   // drives compose modal in CommunicationsPanel
  const [showCommMenu, setShowCommMenu] = useState(false);
  const [showTalentCard, setShowTalentCard] = useState(false);
  // Track which custom sections are collapsed (by separatorId)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`talentos_collapsed_${objectName}`)) || {}; } catch { return {}; }
  });
  const toggleSection = (id) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(`talentos_collapsed_${objectName}`, JSON.stringify(next));
      return next;
    });
  };
  // ── Record search ──────────────────────────────────────────────────────────
  const [recordSearch, setRecordSearch] = useState("");
  const [recordSearchOpen, setRecordSearchOpen] = useState(false);
  const [recordSearchResults, setRecordSearchResults] = useState([]);
  const recordSearchRef = useRef(null);
  const recordSearchInputRef = useRef(null);
  const [draggingPanel, setDraggingPanel] = useState(null);  // panel id being dragged
  const [overSlot,      setOverSlot]      = useState(null);  // repId currently hovered
  const [overZone,      setOverZone]      = useState(null);  // 'top'|'middle'|'bottom'
  // Refs so event closures always see fresh values
  const draggingRef = useRef(null);
  const overSlotRef = useRef(null);
  const overZoneRef = useRef(null);
  const rightColRef = useRef(null);
  const currentObject = (allObjects||[]).find(o => o.id === record?.object_id) || {};

  const storageKey = `talentos_panels_${objectName}`;
  const [panelOrder, setPanelOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return getDefaultPanelOrder(objectName);
      // Merge any new panels not yet in saved order (handles groups)
      const defaults = getDefaultPanelOrder(objectName);
      const savedFlat = flatPanelIds(saved);
      const merged = [...saved, ...defaults.filter(id => !savedFlat.includes(id))];
      return merged;
    }
    catch { return getDefaultPanelOrder(objectName); }
  });

  const savePanelOrder = (order) => {
    setPanelOrder(order);
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  };

  // ── Record search logic ────────────────────────────────────────────────────
  useEffect(() => {
    if (!recordSearch.trim()) { setRecordSearchResults([]); return; }
    const q = recordSearch.toLowerCase();
    const results = [];

    // Search notes
    notes.forEach(n => {
      if (n.content?.toLowerCase().includes(q)) {
        results.push({ type:"note", icon:"messageSquare", label:n.content.slice(0,80), sub:"Note", panelId:"notes", created_at:n.created_at });
      }
    });

    // Search activity
    activity.forEach(a => {
      const text = [a.action, a.field_name, a.new_value, a.old_value].filter(Boolean).join(" ");
      if (text.toLowerCase().includes(q)) {
        results.push({ type:"activity", icon:"activity", label:`${a.action} — ${a.field_name||""}`, sub:"Activity", panelId:"activity", created_at:a.created_at });
      }
    });

    // Search attachments
    attachments.forEach(att => {
      if (att.filename?.toLowerCase().includes(q) || att.file_type?.toLowerCase().includes(q)) {
        results.push({ type:"file", icon:"paperclip", label:att.filename||att.name, sub:`File · ${att.file_type||""}`, panelId:"attachments", created_at:att.created_at });
      }
    });

    // Search field values on the record itself
    fields.forEach(f => {
      const val = record.data?.[f.api_key];
      if (val && String(val).toLowerCase().includes(q)) {
        results.push({ type:"field", icon:"edit", label:`${f.name}: ${String(val).slice(0,60)}`, sub:"Field value", panelId:null });
      }
    });

    setRecordSearchResults(results.slice(0, 12));
  }, [recordSearch, notes, activity, attachments, fields, record]);

  // Close search on outside click
  useEffect(() => {
    const h = e => { if (recordSearchRef.current && !recordSearchRef.current.contains(e.target)) setRecordSearchOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openPanelAndScroll = (panelId) => {
    if (panelId) {
      setOpenPanels(p => { const next={...p,[panelId]:true}; try{localStorage.setItem(openPanelsKey,JSON.stringify(next));}catch{} return next; });
    }
    setRecordSearch("");
    setRecordSearchOpen(false);
  };


  const load = useCallback(async () => {
    const [n, att] = await Promise.all([
      api.get(`/notes?record_id=${record.id}`),
      api.get(`/attachments?record_id=${record.id}`),
    ]);
    setNotes(Array.isArray(n)?n:[]);
    setAttachments(Array.isArray(att)?att:[]);
  }, [record.id]);

  useEffect(() => { load(); setEditing({}); setTab("fields"); }, [record.id, load]);

  // Click-based types save immediately when value changes; text types wait for explicit save
  const CLICK_SAVE_TYPES = ["select","multi_select","boolean","rating","people","lookup","multi_lookup","skills","dataset"];

  const handleFieldEdit = (key, value, fieldType) => {
    setEditing(e=>({...e,[key]:value}));
    // For click-based types, save immediately
    if (CLICK_SAVE_TYPES.includes(fieldType)) {
      handleSaveFieldValue(key, record.data?.[key], value);
    }
  };

  const handleSaveFieldValue = async (key, oldValue, newValue) => {
    // Array-aware equality check (for skills, multi_select, people fields)
    const serialize = v => {
      if (v === null || v === undefined) return "";
      if (Array.isArray(v)) return JSON.stringify([...v].sort());
      return String(v);
    };
    if (serialize(oldValue) === serialize(newValue)) { setEditing(e=>{ const n={...e}; delete n[key]; return n; }); return; }
    setSaving(true);
    const fieldDef = fields.find(f=>f.api_key===key);
    const updated = await api.patch(`/records/${record.id}`, {
      data: { [key]: newValue },
      updated_by: "Admin",
      field_changes: [{ field_key:key, field_name:fieldDef?.name||key, old_value:oldValue, new_value:newValue }]
    });
    onUpdate(updated);
    setEditing(e=>{ const n={...e}; delete n[key]; return n; });
    setSaving(false);
    load();
  };

  const handleSaveField = async (key, oldValue) => {
    if (!editing.hasOwnProperty(key)) return;
    await handleSaveFieldValue(key, oldValue, editing[key]);
  };

  // ── Global edit mode: open all visible fields at once ────────────────────
  const handleEnterGlobalEdit = () => {
    const allFields = visibleFields || fields;
    const snapshot = {};
    allFields.forEach(f => { snapshot[f.api_key] = record.data?.[f.api_key] ?? ""; });
    setEditing(snapshot);
    setGlobalEdit(true);
  };
  const handleCancelGlobalEdit = () => {
    setEditing({});
    setGlobalEdit(false);
  };
  const handleSaveAllFields = async () => {
    setSaving(true);
    const changes = [];
    for (const [key, newVal] of Object.entries(editing)) {
      const oldVal = record.data?.[key];
      const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
      const newStr = newVal === null || newVal === undefined ? "" : String(newVal);
      if (oldStr !== newStr) {
        const fieldDef = fields.find(f => f.api_key === key);
        changes.push({ field_key:key, field_name:fieldDef?.name||key, old_value:oldVal, new_value:newVal });
      }
    }
    if (changes.length > 0) {
      const dataPayload = {};
      changes.forEach(c => { dataPayload[c.field_key] = editing[c.field_key]; });
      const updated = await api.patch(`/records/${record.id}`, {
        data: dataPayload, updated_by:"Admin", field_changes: changes
      });
      onUpdate(updated);
      load();
    }
    setEditing({});
    setGlobalEdit(false);
    setSaving(false);
  };
  const handleDeleteNote = async (id) => { await api.del(`/notes/${id}`); load(); };
  const handleAddAttachment = async () => {
    const name = prompt("File name (demo):"); if (!name) return;
    await api.post("/attachments", { record_id:record.id, name, size:0, type:"application/pdf" }); load();
  };

  // ── File upload state ──────────────────────────────────────────────────────
  const fileInputRef      = useRef(null);
  const [fileTypes,       setFileTypes]       = useState([]);
  const [uploading,       setUploading]       = useState(false);
  const [uploadDragging,  setUploadDragging]  = useState(false);
  const [cvParseResult,   setCvParseResult]   = useState(null);
  const [cvParsing,       setCvParsing]       = useState(false);
  const [cvParseAtt,      setCvParseAtt]      = useState(null);
  const [previewAtt,      setPreviewAtt]      = useState(null);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [docExtractResult,   setDocExtractResult]   = useState(null);
  const [docExtracting,      setDocExtracting]      = useState(false);
  const [docExtractAtt,      setDocExtractAtt]      = useState(null);
  const [docExtractMappings, setDocExtractMappings] = useState([]);

  useEffect(() => {
    api.get(`/file-types?object_slug=${currentObject.slug||'people'}`).then(d => {
      if (Array.isArray(d)) setFileTypes(d);
    }).catch(()=>{});
  }, [currentObject.slug]);

  const [uploadError, setUploadError] = useState('');
  const handleFileUpload = async (file, fileTypeId) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const ft = fileTypes.find(t => t.id === fileTypeId);
      const formData = new FormData();
      formData.append('file',           file);
      formData.append('record_id',      record.id);
      formData.append('file_type_id',   fileTypeId || '');
      formData.append('file_type_name', ft?.name || 'Other');
      formData.append('uploaded_by',    'Admin');
      formData.append('environment_id', currentObject.environment_id || environment?.id || '');
      const res = await tFetch('/api/attachments/upload', { method:'POST', body: formData });
      if (!res.ok) {
        let errMsg = `Upload failed (${res.status})`;
        try { const e = await res.json(); errMsg = e.error || errMsg; } catch {}
        setUploadError(errMsg);
      } else {
        const att = await res.json();
        load();
        if (ft?.parse_cv) {
          if (confirm(`"${ft.name}" file uploaded. Parse CV fields automatically?`)) {
            handleCvParse(att);
          }
        }
      }
    } catch(e) {
      console.error('Upload error:', e);
      setUploadError(`Upload error: ${e.message}`);
    }
    setUploading(false);
  };

  const handleDropUpload = (e) => {
    e.preventDefault(); setUploadDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file, selectedFileType);
  };

  const handleCvParse = async (att) => {
    setCvParseAtt(att); setCvParsing(true); setCvParseResult(null);
    try {
      const res  = await tFetch(`/api/cv-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment_id: att.id }),
      });
      const data = await res.json();
      if (res.ok) setCvParseResult(data.parsed);
      else        window.__toast?.alert('CV parsing failed: ' + data.error);
    } catch(e) { window.__toast?.alert('CV parsing error: ' + e.message); }
    setCvParsing(false);
  };

  const handleApplyCvFields = async (selectedFields) => {
    const updates = {};
    Object.entries(selectedFields).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== '') updates[key] = val;
    });
    if (Object.keys(updates).length === 0) return;
    await api.patch(`/records/${record.id}`, { data: { ...record.data, ...updates }, updated_by: 'Admin' });
    setCvParseResult(null); setCvParseAtt(null);
    load();
  };

  const handleDocExtract = async (att) => {
    const ft = fileTypes.find(t => t.id === att.file_type_id);
    if (!ft?.extract_enabled) return;
    if (!ft?.mappings?.length) { window.__toast?.alert('This file type has no extraction mappings. Go to Settings → File Types to configure them.'); return; }
    setDocExtractAtt(att); setDocExtractMappings(ft.mappings);
    setDocExtracting(true); setDocExtractResult(null);
    try {
      const res = await tFetch('/api/doc-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment_id: att.id, file_type_id: att.file_type_id, mappings: ft.mappings }),
      });
      const data = await res.json();
      if (res.ok) setDocExtractResult(data.parsed);
      else window.__toast?.alert('Extraction failed: ' + data.error);
    } catch(e) { window.__toast?.alert('Extraction error: ' + e.message); }
    setDocExtracting(false);
  };

  const handleApplyDocFields = async (fieldsToApply) => {
    if (!Object.keys(fieldsToApply).length) return;
    await api.patch(`/records/${record.id}`, { data: { ...record.data, ...fieldsToApply }, updated_by: 'Admin' });
    setDocExtractResult(null); setDocExtractAtt(null); load();
  };

  // ── Mouse-based panel drag: event-driven zone detection ──────────────────
  // Each card reports its hovered zone via onMouseMove; mouseup reads the refs.
  const startPanelDrag = (id) => {
    draggingRef.current  = id;
    overSlotRef.current  = null;
    overZoneRef.current  = null;
    setDraggingPanel(id);
    setOverSlot(null);
    setOverZone(null);

    const onUp = () => {
      const fromId = draggingRef.current;
      const slot   = overSlotRef.current;
      const zone   = overZoneRef.current;
      draggingRef.current = null;
      setDraggingPanel(null);
      setOverSlot(null);
      setOverZone(null);

      if (!fromId || !slot) {
        // dropped outside any card — no change
        window.removeEventListener("mouseup",  onUp);
        window.removeEventListener("touchend", onUp);
        return;
      }

      // Find what's currently in that slot
      let newOrder = removePanel(panelOrder, fromId);

      if (zone === "middle") {
        // Merge into the target slot
        newOrder = mergePanel(newOrder, slot, fromId);
      } else {
        // Insert as standalone before or after the target slot
        const idx = newOrder.findIndex(s => repIdOf(s) === slot);
        const insertIdx = zone === "bottom" ? idx + 1 : idx;
        if (insertIdx < 0 || insertIdx > newOrder.length) newOrder.push(fromId);
        else newOrder.splice(insertIdx, 0, fromId);
      }

      savePanelOrder(newOrder);
      window.removeEventListener("mouseup",  onUp);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mouseup",  onUp);
    window.addEventListener("touchend", onUp);
  };

  // Called by each card's onMouseMove to report its zone
  const reportZone = (repId, e, el) => {
    if (!draggingRef.current || repIdOf(panelOrder.find(s => Array.isArray(s) ? s.includes(draggingRef.current) : s === draggingRef.current) || draggingRef.current) === repId) return;
    const rect = el.getBoundingClientRect();
    const pct  = (e.clientY - rect.top) / rect.height;
    const zone = pct < 0.3 ? "top" : pct > 0.7 ? "bottom" : "middle";
    if (overSlotRef.current !== repId || overZoneRef.current !== zone) {
      overSlotRef.current = repId;
      overZoneRef.current = zone;
      setOverSlot(repId);
      setOverZone(zone);
    }
  };

  const clearZone = (repId) => {
    if (overSlotRef.current === repId) {
      overSlotRef.current = null;
      overZoneRef.current = null;
      setOverSlot(null);
      setOverZone(null);
    }
  };

  const title = recordTitle(record, fields);
  const subtitle = recordSubtitle(record, fields);
  const statusField = fields.find(f=>f.api_key==="status");
  const status = record.data?.status;

  // Filter fields by condition — check editing state first so conditional fields
  // appear/disappear immediately as person_type is changed before saving
  const liveData = { ...record.data, ...editing };
  const visibleFields = fields.filter(f => {
    if (!f.condition_field || !f.condition_value) return true;
    const recordVal = liveData[f.condition_field];
    return String(recordVal || '').toLowerCase() === String(f.condition_value).toLowerCase();
  });

  // Build sections dynamically from section_separator fields.
  // Fields before the first separator go into an implicit "Details" section.
  // Each separator starts a new named section containing all fields until the next separator.
  const fieldSections = useMemo(() => {
    const sections = [];
    let current = { label: "Details", fs: [], collapsible: false };
    for (const f of visibleFields) {
      if (f.field_type === "section_separator") {
        if (current.fs.length) sections.push(current);
        current = { label: f.section_label || f.name, fs: [], collapsible: true, separatorId: f.id };
      } else {
        current.fs.push(f);
      }
    }
    if (current.fs.length) sections.push(current);
    return sections;
  }, [visibleFields]);


  // ── Shared field panel (used in both slide-out tab and full-page left col) ──
  // Defined as JSX variable (not a component) so React never creates a new component
  // boundary here — critical for inline editing state to survive re-renders
  const fieldsPanelJSX = (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {fieldSections.map(section => {
        const isCollapsed = section.collapsible && !!collapsedSections[section.separatorId];
        return (
          <div key={section.separatorId || section.label} style={{ marginBottom: section.collapsible ? 0 : 20 }}>
            {/* Section header — plain label for implicit first section, collapsible divider for named sections */}
            {section.collapsible ? (
              <button
                onClick={() => toggleSection(section.separatorId)}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:8,
                  background:"transparent", border:"none", cursor:"pointer",
                  padding:"14px 2px 8px", textAlign:"left", fontFamily:F,
                  marginTop:4,
                }}
              >
                <div style={{ flex:1, borderTop:`2px solid ${C.border}`, marginTop:1 }}/>
                <span style={{ fontSize:11, fontWeight:800, color:C.text2,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  whiteSpace:"nowrap", padding:"0 8px",
                  background: "white" /* lifts label off the rule */ }}>
                  {section.label}
                </span>
                <div style={{ flex:1, borderTop:`2px solid ${C.border}`, marginTop:1 }}/>
                <span style={{
                  fontSize:10, color:C.text3, marginLeft:4,
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition:"transform .2s", display:"inline-block", flexShrink:0
                }}>▼</span>
              </button>
            ) : (
              <div style={{ fontSize:11, fontWeight:700, color:C.text3,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
                {section.label}
              </div>
            )}

            {/* Fields — hidden when collapsed */}
            {!isCollapsed && (
              <div style={{ background:"#f8f9fc", borderRadius:12, border:`1px solid ${C.border}`,
                marginBottom: section.collapsible ? 8 : 0,
                overflow:"hidden" }}>
                {section.fs.map((field, i) => {
                  const isEditing = editing.hasOwnProperty(field.api_key);
                  const originalVal = record.data?.[field.api_key];
                  const val = isEditing ? editing[field.api_key] : originalVal;
                  const READONLY_KEYS = ["id","created_at","updated_at"];
                  const isReadonly = READONLY_KEYS.includes(field.api_key);
                  const isPickerField = ["multi_lookup","lookup","people"].includes(field.field_type);
                  const isClickSave = CLICK_SAVE_TYPES.includes(field.field_type);
                  return (
                    <div key={field.id}
                      style={{ display:"flex", alignItems:isEditing?"flex-start":"center", gap:12,
                        padding:"11px 14px",
                        borderBottom: i < section.fs.length-1 ? `1px solid ${C.border}` : "none",
                        background:isEditing?"#fafbff":"transparent", transition:"background .1s" }}
                      onMouseEnter={e=>{ if(!isEditing&&!isReadonly){e.currentTarget.style.background="#f0f4ff";const btn=e.currentTarget.querySelector(".edit-hint");if(btn)btn.style.opacity=1;}}}
                      onMouseLeave={e=>{ e.currentTarget.style.background=isEditing?"#fafbff":"transparent";const btn=e.currentTarget.querySelector(".edit-hint");if(btn)btn.style.opacity=0;}}>
                      <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{field.name}</div>
                      <div style={{ flex:1, minWidth:0 }}
                        onBlur={e=>{ if(isEditing&&!isClickSave&&!e.currentTarget.contains(e.relatedTarget)) handleSaveField(field.api_key, originalVal); }}
                        onKeyDown={e=>{ if(isEditing&&!isClickSave){ if(e.key==="Enter"&&field.field_type!=="textarea"&&field.field_type!=="rich_text") handleSaveField(field.api_key, originalVal); if(e.key==="Escape") setEditing(prev=>{const n={...prev};delete n[field.api_key];return n;}); }}}>
                        {isPickerField
                          ? <PeoplePicker field={field} value={originalVal} onChange={v=>handleFieldEdit(field.api_key, v, field.field_type)}/>
                          : isEditing
                          ? <FieldEditor field={field} value={val} onChange={v=>handleFieldEdit(field.api_key, v, field.field_type)} autoFocus={!isClickSave} environment={environment}/>
                          : <div onClick={()=>!isReadonly&&setEditing(e=>({...e,[field.api_key]:originalVal}))} style={{ cursor:isReadonly?"default":"text", minHeight:22 }}>
                              <FieldValue field={field} value={val} allFieldValues={record?.data}/>
                            </div>
                        }
                      </div>
                      {!isPickerField && (isEditing ? (
                        <button onClick={()=>{ setEditing(e=>{const n={...e};delete n[field.api_key];return n;}); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:"3px 4px", display:"flex", alignItems:"center", borderRadius:5, flexShrink:0, fontFamily:F }}
                          title="Cancel (Esc)">
                          <Ic n="x" s={12} c={C.text3}/>
                        </button>
                      ) : !isReadonly && (
                        <button className="edit-hint" onClick={()=>setEditing(e=>({...e,[field.api_key]:originalVal}))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, opacity:0, padding:"3px 6px", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, borderRadius:6, transition:"opacity .1s", flexShrink:0, fontFamily:F }}>
                          <Ic n="edit" s={12} c={C.accent}/> Edit
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsed summary pill */}
            {isCollapsed && (
              <div style={{ fontSize:11, color:C.text3, padding:"2px 4px 10px",
                fontStyle:"italic" }}>
                {section.fs.length} field{section.fs.length!==1?"s":""} hidden
              </div>
            )}
          </div>
        );
      })}
      {objectName === "Person" && <PlatformUserSection record={record}/>}
    </div>
  );


  // ── Panel content renderer ── (lowercase = render function, NOT a React component)
  const renderPanel = useCallback(({ id }) => {
    if (id==="comms") return canRecord('record_view_comms') ? (
      <CommunicationsPanel record={record} environment={environment} externalCompose={composeType} onExternalComposeDone={()=>setComposeType(null)} initialJobContext={activeJobContext}/>
    ) : <AccessDeniedPanel label="Communications"/>;
    if (id==="coordination") return (
      <CoordinationPanel record={record} environment={environment}/>
    );
    if (id==="notes") return canRecord('record_add_note') || canRecord('record_view_comms') ? (
      <NotesPanel record={record} notes={notes} onNotesChange={load} canAdd={canRecord('record_add_note')} canDelete={canRecord('record_delete_note')} linkedJobRecords={linkedJobRecords} activeJobContext={activeJobContext}/>
    ) : <AccessDeniedPanel label="Notes"/>;
      if (id === "insights") return <InsightsPanel record={record} environment={environment} />;


    if (id==="attachments") return (
      <div>
        {/* File type selector + drop zone */}
        {<div style={{ marginBottom:8 }}>
          <select value={selectedFileType} onChange={e=>setSelectedFileType(e.target.value)}
            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text2, background:C.surface, marginBottom:8 }}>
            <option value="">Select file type…</option>
            {fileTypes.map(ft=><option key={ft.id} value={ft.id}>{ft.name}</option>)}
          </select>
          <label
            onDragOver={e=>{e.preventDefault();setUploadDragging(true);}}
            onDragLeave={()=>setUploadDragging(false)}
            onDrop={e=>{e.preventDefault();setUploadDragging(false);const f=e.dataTransfer.files?.[0];if(f)handleFileUpload(f,selectedFileType);}}
            style={{ display:'block', width:'100%', border:`2px dashed ${uploadDragging?C.accent:C.border}`, borderRadius:12, padding:'16px', textAlign:'center', cursor:'pointer', background:uploadDragging?`${C.accent}06`:'transparent', fontFamily:F, color:uploadDragging?C.accent:C.text3, transition:'all .15s', boxSizing:'border-box' }}>
            <input type="file" style={{display:'none'}}
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFileUpload(f, selectedFileType); e.target.value=''; }}/>
            {uploading
              ? <><Ic n="upload" s={16}/><div style={{fontSize:12,marginTop:4}}>Uploading…</div></>
              : <><Ic n="upload" s={16}/><div style={{fontSize:12,marginTop:4,fontWeight:600}}>Click or drop file to upload</div><div style={{fontSize:10,marginTop:2}}>{selectedFileType?fileTypes.find(t=>t.id===selectedFileType)?.allowed_formats?.join(', '):'Select a file type above first'}</div></>
            }
          </label>
          {uploadError && <div style={{ marginTop:6, fontSize:11, color:'#ef4444', fontWeight:600, padding:'6px 8px', background:'#fef2f2', borderRadius:6, border:'1px solid #fecaca' }}>{uploadError}</div>}
        </div>}

        {/* File list */}
        {attachments.length===0
          ? <div style={{ textAlign:'center', padding:'16px 0', color:C.text3, fontSize:13 }}>No files yet</div>
          : attachments.map(att=>{
            const isCV = att.file_type_name?.toLowerCase().includes('cv') || att.file_type_name?.toLowerCase().includes('resume');
            const ext  = att.ext || att.name?.split('.').pop()?.toLowerCase() || '';
            const iconName = ['jpg','jpeg','png','gif','webp'].includes(ext)?'image':['pdf'].includes(ext)?'file-text':'file';
            return (
              <div key={att.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#f8f9fc', borderRadius:10, marginBottom:6, border:`1px solid ${C.border}` }}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.accentLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic n={iconName} s={14} c={C.accent}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
                    {att.file_type_name && <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:4, background:`${C.accent}14`, color:C.accent }}>{att.file_type_name}</span>}
                    <span style={{ fontSize:10, color:C.text3 }}>{att.size ? `${Math.round(att.size/1024)}KB · ` : ''}{new Date(att.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {isCV && att.filename && canRecord('record_parse_cv') && (
                    <button onClick={()=>handleCvParse(att)} disabled={cvParsing} title="Parse CV fields"
                      style={{background:'none',border:`1px solid ${C.accent}30`,borderRadius:6,cursor:'pointer',padding:'4px 7px',color:C.accent,fontSize:10,fontWeight:700,fontFamily:F}}>
                      {cvParsing&&cvParseAtt?.id===att.id?'…':'Parse CV'}
                    </button>
                  )}
                  {att.file_type_id && fileTypes.find(t=>t.id===att.file_type_id)?.extract_enabled && att.filename && canRecord('record_extract_doc') && (
                    <button onClick={()=>handleDocExtract(att)} disabled={docExtracting} title="Extract data from document"
                      style={{background:'none',border:`1px solid ${C.green}40`,borderRadius:6,cursor:'pointer',padding:'4px 7px',color:C.green,fontSize:10,fontWeight:700,fontFamily:F}}>
                      {docExtracting&&docExtractAtt?.id===att.id?'…':'Extract Data'}
                    </button>
                  )}
                  {att.url && att.url !== '#' && (
                    <button onClick={()=>setPreviewAtt(att)} title="Preview"
                      style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:C.accent, display:'flex', alignItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  )}
                  {att.url && att.url !== '#' && (
                    <a href={att.url} target="_blank" rel="noreferrer"
                      style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:C.text3, display:'flex' }}>
                      <Ic n="link" s={13}/>
                    </a>
                  )}
                  {canRecord('record_delete_file') && <button onClick={async()=>{await api.del(`/attachments/${att.id}`);load();}}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:C.text3, display:'flex' }}>
                    <Ic n="trash" s={13}/>
                  </button>}
                </div>
              </div>
            );
          })
        }

        {/* File Preview Modal */}
        {previewAtt && ReactDOM.createPortal(
          <FilePreviewModal att={previewAtt} onClose={()=>setPreviewAtt(null)}/>,
          document.body
        )}

        {/* CV Parse Modal */}
        {cvParseResult && (
          <CvParseModal
            result={cvParseResult}
            fields={fields}
            record={record}
            onApply={handleApplyCvFields}
            onClose={()=>{ setCvParseResult(null); setCvParseAtt(null); }}
          />
        )}
        {docExtractResult && (
          <DocExtractModal result={docExtractResult} mappings={docExtractMappings} record={record}
            onApply={handleApplyDocFields} onClose={()=>{ setDocExtractResult(null); setDocExtractAtt(null); }}/>
        )}
      </div>
    );

    if (id==="activity") return <ActivityPanel record={record}/>;

    // Pipeline panel removed
    if (id==="tasks")     return <TasksEventsPanel record={record} environment={environment}/>;
    if (id==="forms")     return <div>
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:10,
          }}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--t-text3)",
              textTransform:"uppercase",letterSpacing:"0.06em"}}>
              Linked Forms
            </span>
            <button
              onClick={() => { if(window.__openFormPicker) window.__openFormPicker(record?.id); }}
              style={{
                display:"inline-flex", alignItems:"center", gap:4,
                padding:"4px 10px", borderRadius:7,
                background:"var(--t-accentLight,#eef2ff)",
                border:"1px solid var(--t-accent,#4361EE)",
                color:"var(--t-accent,#4361EE)",
                fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Form
            </button>
          </div>
          <RecordFormPanel record={record} objectSlug={currentObject.slug||'people'} environment={environment} currentUser={null} activeJobContext={activeJobContext}/>
        </div>;
    if (id==="linked") return <LinkedRecordsPanel record={record} environment={environment} onNavigate={onNavigate} activeJobContext={activeJobContext} onSetJobContext={setActiveJobContext}/>;
    if (id==="reporting") return <ReportingPanel record={record} environment={environment}/>;
    if (id==="user") return <UserPanel record={record}/>;
    if (id==="scorecard") return <ScorecardPanel record={record} environment={environment}/>;
    if (id==="questions") return <JobQuestionsPanel record={record} environment={environment}/>;
    if (id==="screening") return <ScreeningRulesPanel record={record} environment={environment}/>;
    if (id==="interview_plan") return <Suspense fallback={<div style={{padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:13}}>Loading…</div>}><InterviewPlanPanelLazy record={record} environment={environment} onNavigate={onNavigate}/></Suspense>;

    if (id==="match") return (
      <StableMatchPanel
        recordId={record.id}
        objectName={objectName}
        environment={environment}
        record={record}
        onNavigate={onNavigate}
      />
    );

    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, notes, attachments, fields, environment, objectName, composeType, fileTypes, cvParsing, cvParseAtt, docExtracting, docExtractAtt, uploading, uploadDragging, selectedFileType, currentObject, allObjects, openPanels, _permCtx, uploadError]);


  // PanelCard is defined at module level above RecordDetail

  // GroupCard is defined at module level above RecordDetail
  // ActionBtn, SlideOutHeader are defined at module level above RecordDetail

  // DropIndicator — calls module-level _DropIndicator with local state values
  const DropIndicator = ({ beforeRepId, afterRepId }) =>
    _DropIndicator({ beforeRepId, afterRepId, draggingPanel, overSlot, overZone });

  // ── SLIDE-OUT (600px panel) — tabs layout ──
  const TABS = [
    { id:"fields",      icon:"edit",          label:"Fields" },
    { id:"activity",    icon:"activity",      label:"Activity" },
    { id:"notes",       icon:"messageSquare", label:`Notes${notes.length?` (${notes.length})`:""}` },
    { id:"attachments", icon:"paperclip",     label:`Files${attachments.length?` (${attachments.length})`:""}` },
    { id:"forms",       icon:"form",          label:"Forms" },

    ...( objectName === "Person" ? [{ id:"linked", icon:"link", label:"Linked Records" }] : [] ),
    ...( ["Person","Job"].includes(objectName) ? [{ id:"match", icon:"sparkles", label:"Recommendations" }] : [] ),
  ];

  if (!fullPage) return (
    <>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.2)", zIndex:899 }} onClick={onClose}/>
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:600, background:C.surface, zIndex:900, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.14)", animation:"slideIn .2s ease" }}>
        <SlideOutHeader title={title} subtitle={subtitle} objectColor={objectColor} status={status} statusField={statusField} record={record} onToggleFullPage={onToggleFullPage} onDelete={onDelete} onClose={onClose} photoUrl={record?.data?.profile_photo || record?.data?.photo_url}/>
        <div style={{ display:"flex", gap:0, padding:"0 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?C.accent:C.text3, borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, transition:"all .12s", whiteSpace:"nowrap" }}>
              <Ic n={t.icon} s={13}/>{t.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>
          {tab==="fields"  && fieldsPanelJSX}
          {tab!=="fields"  && renderPanel({id:tab})}
        </div>
      </div>
    </>
  );


  // ── FULL PAGE — 2-col layout ──
  // ── Resizable column split ──
  const colStorageKey = `talentos_colwidth_${objectName}`;
  const [leftPct, setLeftPct] = useState(() => {
    try { return parseFloat(localStorage.getItem(colStorageKey)) || 38; } catch { return 38; }
  });
  const containerRef = useRef(null);
  const draggingCol  = useRef(false);

  const onDividerMouseDown = (e) => {
    e.preventDefault();
    draggingCol.current = true;
    const onMove = (ev) => {
      if (!draggingCol.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = Math.min(65, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100));
      setLeftPct(pct);
    };
    const onUp = () => {
      draggingCol.current = false;
      try { localStorage.setItem(colStorageKey, leftPct.toFixed(1)); } catch {}
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Persist on release — capture latest via ref
  const leftPctRef = useRef(leftPct);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);

  // Tinted identity card background from objectColor
  const hex = objectColor?.replace("#","") || "4361EE";
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  const cardBg = `rgba(${r},${g},${b},0.07)`;
  const cardBorder = `rgba(${r},${g},${b},0.18)`;

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "c" || e.key === "C") setShowCommMenu(v => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Photo upload ──
  const photoInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(record?.data?.photo_url || record?.data?.profile_photo || null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target.result;
      setPhotoUrl(url);
      await api.patch(`/records/${record.id}`, { data: { ...record.data, photo_url: url } });
    };
    reader.readAsDataURL(file);
  };

  // ── Functionality bar (full page only) ──

  // Handler for AI suggested action strip — fires the Copilot with the action prompt
  const handleSuggestedAction = (action) => {
    const prompt = action.prompt || action.description || action.label || action.title || "Help me with this action";
    window.dispatchEvent(new CustomEvent("talentos:copilotPrompt", { detail: { prompt } }));
  };

  const COMM_OPTIONS = [
    { type:"email",    label:"Send Email",    icon:"✉️" },
    { type:"sms",      label:"Send SMS",      icon:"💬" },
    { type:"whatsapp", label:"Send WhatsApp", icon:"📱" },
    { type:"call",     label:"Log Call",      icon:"📞" },
  ];

  // Last comms date from activity
  const lastCommDate = activity?.length
    ? new Date(activity[0]?.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})
    : null;
  // ActionBtn and FunctionalityBar are defined at module level above RecordDetail

  const FunctionalityBar = () => (
    <div style={{ display:"flex", alignItems:"center", gap:0, background:C.surface,
      borderBottom:`1px solid ${C.border}`, flexShrink:0, position:"relative", zIndex:50, minHeight:58 }}>

      {/* LEFT: back crumb + avatar + name + subtitle + pills */}
      <div style={{ display:"flex", alignItems:"center", gap:0, borderRight:`1px solid ${C.border}`, padding:"0 16px", minHeight:58, flexShrink:0, maxWidth:"50%" }}>
        {/* Back link */}
        <button onClick={onClose}
          style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none",
            cursor:"pointer", color:C.text3, fontSize:12, fontWeight:600, fontFamily:F, padding:"4px 0", flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.color=C.accent}
          onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <Ic n="arrowLeft" s={13}/> {objectName}s
        </button>
        <span style={{ margin:"0 8px", color:C.border, fontSize:16, flexShrink:0 }}>/</span>
        {/* Avatar */}
        <div style={{ position:"relative", flexShrink:0, marginRight:10, cursor:"pointer" }}
          onClick={()=>photoInputRef.current?.click()} title="Click to upload photo">
          {photoUrl
            ? <img src={photoUrl} style={{ width:32, height:32, borderRadius:8, objectFit:"cover" }}/>
            : <Avatar name={title} color={objectColor} size={32}/>
          }
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload}/>
        </div>
        {/* Name + subtitle */}
        <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.text1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.3px" }}>{title}</span>
            {status && statusField && (
              <Badge color={STATUS_COLORS[status]||C.accent} light>{status}</Badge>
            )}
          </div>
          {objectName === "Person" ? (() => {
            const jobLine = record?.data?.current_title || record?.data?.job_title || "";
            const company = record?.data?.current_company || "";
            const combined = [jobLine, company].filter(Boolean).join(" · ");
            return combined ? <div style={{ fontSize:12, color:C.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:340 }}>{combined}</div> : null;
          })() : subtitle ? (
            <div style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:340 }}>{subtitle}</div>
          ) : null}
        </div>
      </div>

      {/* RIGHT: action buttons */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 16px", flex:1 }}>
        {/* Communicate dropdown — only on Person records with comms access */}
        {objectName === "Person" && canRecord('record_view_comms') && (
        <div style={{ position:"relative" }}>
          <button
            onClick={()=>setShowCommMenu(v=>!v)}
            onBlur={()=>setTimeout(()=>setShowCommMenu(false),150)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:9,
              border:`1.5px solid ${C.accent}`, background:C.accentLight, color:C.accent,
              fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:F }}>
            <Ic n="mail" s={13} c={C.accent}/> Communicate
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft:2, opacity:0.7 }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>
          {showCommMenu && (
            <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:C.surface,
              border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.14)",
              minWidth:200, zIndex:200, overflow:"hidden", padding:"4px 0" }}>
              {COMM_OPTIONS.filter(opt => {
                if (opt.type==='email') return canRecord('record_send_email');
                if (opt.type==='sms' || opt.type==='whatsapp') return canRecord('record_send_sms');
                if (opt.type==='call') return canRecord('record_log_call');
                return true;
              }).map(opt=>(
                <button key={opt.type}
                  onClick={()=>{ setComposeType(opt.type); setShowCommMenu(false); }}
                  style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px",
                    background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.text1,
                    textAlign:"left", fontFamily:F, transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{ fontSize:15 }}>{opt.icon}</span>
                  <span style={{ fontWeight:500 }}>{opt.label}</span>
                </button>
              ))}
              <div style={{ borderTop:`1px solid ${C.border}`, margin:"4px 0", padding:"2px 16px 2px" }}>
                <div style={{ fontSize:11, color:C.text3, paddingTop:4 }}>Shortcut: <kbd style={{ background:"#f1f5f9", borderRadius:4, padding:"1px 5px", fontFamily:"monospace" }}>C</kbd></div>
              </div>
            </div>
          )}
        </div>
        )} {/* end Person-only communicate */}

        {/* Spacer */}
        <div style={{ flex:1 }}/>

        {/* Talent Card — only on Person records */}
        {objectName === "Person" && (
          <ActionBtn icon="fileText" label="Talent Card" onClick={() => setShowTalentCard(true)}/>
        )}

        {/* LinkedIn Finder — only on Person records */}
        {objectName === "Person" && (
          <LinkedInFinderButton
            record={record}
            fields={fields}
            onFound={(url) => {
              setRecord(prev => prev ? { ...prev, data: { ...prev.data, linkedin: url } } : prev);
            }}
          />
        )}

        {/* Last activity indicator */}
        {lastCommDate && (
          <div style={{ fontSize:12, color:C.text3, display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="activity" s={12} c={C.text3}/> Last contact {lastCommDate}
          </div>
        )}

        {/* ── Record Search ── */}
        <div ref={recordSearchRef} style={{ position:"relative", display:"flex", alignItems:"center" }}>
          {recordSearchOpen ? (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:9,
              border:`1.5px solid ${C.accent}`, background:C.surface, boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
              <Ic n="search" s={13} c={C.text3}/>
              <input
                ref={recordSearchInputRef}
                value={recordSearch}
                onChange={e=>setRecordSearch(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Escape"){ setRecordSearchOpen(false); setRecordSearch(""); }}}
                placeholder="Search this record…"
                autoFocus
                style={{ border:"none", outline:"none", fontSize:13, fontFamily:F, color:C.text1,
                  background:"transparent", width:200, fontWeight:400 }}/>
              {recordSearch && (
                <button onClick={()=>{ setRecordSearch(""); setRecordSearchResults([]); recordSearchInputRef.current?.focus(); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, display:"flex", padding:0 }}>
                  <Ic n="x" s={12}/>
                </button>
              )}
            </div>
          ) : (
            <button onClick={()=>{ setRecordSearchOpen(true); setTimeout(()=>recordSearchInputRef.current?.focus(),50); }}
              title="Search this record (notes, files, activity…)"
              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:9,
                border:`1px solid ${C.border}`, background:"transparent", color:C.text3,
                fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .12s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.text3; }}>
              <Ic n="search" s={13}/> Search
            </button>
          )}
          {/* Search results dropdown */}
          {recordSearchOpen && recordSearch.trim() && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:600,
              background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12,
              boxShadow:"0 12px 40px rgba(0,0,0,.14)", minWidth:340, maxWidth:440, maxHeight:380, overflowY:"auto" }}>
              {recordSearchResults.length === 0 ? (
                <div style={{ padding:"20px 16px", textAlign:"center", fontSize:13, color:C.text3 }}>
                  No results for "<strong>{recordSearch}</strong>"
                </div>
              ) : (
                <>
                  <div style={{ padding:"8px 14px 6px", fontSize:11, fontWeight:700, color:C.text3,
                    textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:`1px solid ${C.border}` }}>
                    {recordSearchResults.length} result{recordSearchResults.length!==1?"s":""}
                  </div>
                  {recordSearchResults.map((r,i) => (
                    <div key={i}
                      onClick={()=>openPanelAndScroll(r.panelId)}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px",
                        cursor:"pointer", transition:"background .1s", borderBottom:`1px solid ${C.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ width:28, height:28, borderRadius:8, background:C.accentLight,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <Ic n={r.icon} s={13} c={C.accent}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text1,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.label}</div>
                        <div style={{ fontSize:11, color:C.text3, marginTop:2, display:"flex", gap:8 }}>
                          <span style={{ background:`${C.accent}15`, color:C.accent, padding:"1px 6px", borderRadius:4, fontWeight:600 }}>{r.sub}</span>
                          {r.created_at && <span>{new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
                        </div>
                      </div>
                      {r.panelId && (
                        <Ic n="chevR" s={13} c={C.text3}/>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Destructive + close — far right, always visible */}
        <div style={{ display:"flex", gap:2, marginLeft:8, alignItems:"center" }}>
          <div style={{ width:1, height:20, background:C.border, marginRight:6, flexShrink:0 }}/>
          <button onClick={()=>onDelete(record.id)} title="Delete record"
            style={{ width:32, height:32, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", color:"#9CA3AF" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#FEE2E2"; e.currentTarget.style.color="#DC2626"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9CA3AF"; }}>
            <Ic n="trash" s={14} c="currentColor"/>
          </button>
          <button onClick={onClose} title="Close"
            style={{ width:32, height:32, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", color:"#9CA3AF" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#F1F5F9"; e.currentTarget.style.color="#475569"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9CA3AF"; }}>
            <Ic n="x" s={14} c="currentColor"/>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0, overflow:"hidden", background:"#F4F6FB" }}>
      <FunctionalityBar/>
      <SuggestedActions record={record} environment={environment} objectName={objectName} objectColor={objectColor} onAction={handleSuggestedAction}/>
      {/* Full-width Linked People widget — only shown on non-Person objects */}
      {objectName !== "Person" && (
        <div style={{ flexShrink:0, borderBottom:`1px solid ${C.border}` }}>
          <PeoplePipelineWidget record={record} objectId={record.object_id} environment={environment} onNavigate={onNavigate}/>
        </div>
      )}

      {/* 2-col body */}
      <div ref={containerRef} style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0, userSelect:draggingCol.current?"none":"auto" }}>

        {/* LEFT COL — Fields as panel card */}
        <div style={{ width:`${leftPct}%`, flexShrink:0, background:"#F4F6FB", display:"flex", flexDirection:"column", overflowY:"auto", overflowX:"hidden", padding:"16px 0 24px 16px", minHeight:0 }}>
          <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:14, overflow:"visible", boxShadow:"0 1px 4px rgba(0,0,0,.04)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <Ic n="edit" s={14} c={globalEdit ? C.accent : C.text3}/>
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:C.text1 }}>Profile Fields</span>
              {globalEdit ? (
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={handleCancelGlobalEdit}
                    style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${C.border}`,
                      background:"transparent", color:C.text2, fontSize:12, fontWeight:600,
                      cursor:"pointer", fontFamily:F }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveAllFields} disabled={saving}
                    style={{ padding:"4px 12px", borderRadius:7, border:"none",
                      background:C.accent, color:"white", fontSize:12, fontWeight:700,
                      cursor:"pointer", fontFamily:F, opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving…" : "Save all"}
                  </button>
                </div>
              ) : (
                <button onClick={handleEnterGlobalEdit}
                  title="Edit all fields"
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px",
                    borderRadius:7, border:`1px solid ${C.border}`, background:"transparent",
                    color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F,
                    transition:"all .12s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; e.currentTarget.style.background=C.accentLight; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.text2; e.currentTarget.style.background="transparent"; }}>
                  <Ic n="edit" s={11} c="currentColor"/> Edit
                </button>
              )}
            </div>
            <div style={{ padding:"16px" }}>
              {fieldsPanelJSX}
            </div>
          </div>
        </div>

        {/* DRAG DIVIDER — with visible grip dots */}
        <div onMouseDown={onDividerMouseDown}
          style={{ width:8, flexShrink:0, background:"transparent", cursor:"col-resize", position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e=>{ e.currentTarget.querySelector(".divider-track").style.background=C.accent; e.currentTarget.querySelector(".divider-dots").style.opacity="1"; }}
          onMouseLeave={e=>{ e.currentTarget.querySelector(".divider-track").style.background=C.border; e.currentTarget.querySelector(".divider-dots").style.opacity="0.4"; }}>
          <div className="divider-track" style={{ position:"absolute", top:0, bottom:0, left:"50%", transform:"translateX(-50%)", width:2, background:C.border, transition:"background .15s" }}/>
          <div className="divider-dots" style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:3, opacity:0.4, transition:"opacity .15s" }}>
            {[0,1,2,3,4,5].map(i=><div key={i} style={{ width:3, height:3, borderRadius:"50%", background:C.text3 }}/>)}
          </div>
        </div>

        {/* RIGHT COL — Panel cards (standalone or grouped) */}
        <div ref={rightColRef} style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"16px 20px 24px", background:"#F4F6FB", minHeight:0,
          userSelect: draggingPanel ? "none" : "auto" }}>
          {panelOrder.map((slot, idx) => {
            const slots  = panelOrder.filter(s => Array.isArray(s) ? s.some(id => PANEL_META[id]) : PANEL_META[s]);
            const prevSlot = idx > 0 ? panelOrder[idx - 1] : null;
            const prevRepId = prevSlot ? repIdOf(prevSlot) : null;

            if (Array.isArray(slot)) {
              const validIds = slot.filter(id => PANEL_META[id]);
              if (validIds.length === 0) return null;
              if (validIds.length === 1) {
                const id = validIds[0];
                return <div key={id}>{DropIndicator({beforeRepId:id, afterRepId:prevRepId})}<PanelCard id={id} openPanels={openPanels} setOpenPanels={setOpenPanels} openPanelsKey={openPanelsKey} renderPanel={renderPanel} startPanelDrag={startPanelDrag} overSlot={overSlot} overZone={overZone} draggingPanel={draggingPanel} notes={notes} attachments={attachments} clearZone={clearZone} reportZone={reportZone}/></div>;
              }
              const repId = validIds[0];
              return (
                <div key={repId}>
                  {DropIndicator({beforeRepId:repId, afterRepId:prevRepId})}
                  <GroupCard ids={validIds} overSlot={overSlot} overZone={overZone} openPanels={openPanels} setOpenPanels={setOpenPanels} openPanelsKey={openPanelsKey} panelOrder={panelOrder} savePanelOrder={savePanelOrder} removePanel={removePanel} renderPanel={renderPanel} startPanelDrag={startPanelDrag}/>
                </div>
              );
            }
            if (!PANEL_META[slot]) return null;
            return (
              <div key={slot}>
                {DropIndicator({beforeRepId:slot, afterRepId:prevRepId})}
                <PanelCard id={slot} openPanels={openPanels} setOpenPanels={setOpenPanels} openPanelsKey={openPanelsKey} renderPanel={renderPanel} startPanelDrag={startPanelDrag} overSlot={overSlot} overZone={overZone} draggingPanel={draggingPanel} notes={notes} attachments={attachments} clearZone={clearZone} reportZone={reportZone}/>
              </div>
            );
          })}
          {/* Drop line at very bottom — when last card's bottom zone is hovered */}
          {panelOrder.length > 0 && (() => {
            const last = panelOrder[panelOrder.length - 1];
            const lastRepId = repIdOf(last);
            return DropIndicator({beforeRepId:null, afterRepId:lastRepId});
          })()}
        </div>
      </div>

      {/* Talent Card modal */}
      {showTalentCard && (
        <TalentCardModal
          record={record}
          fields={fields}
          environment={environment}
          onClose={() => setShowTalentCard(false)}
        />
      )}
    </div>
  );
};


/* ─── Main Records View ────────────────────────────────────────────────────── */

/* ─── CSV Import Modal ───────────────────────────────────────────────────────── */
const CSVImportModal = ({ object, environment, onClose, onDone }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('create');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!file) return;
    setLoading(true);
    const r = await importCSV(object.id, environment.id, file, mode);
    setResult(r);
    setLoading(false);
    if (r.success) onDone();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:440, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:4 }}>Import CSV</div>
        <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>Import {object.plural_name} from a CSV file</div>

        {!result ? <>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Import Mode</label>
            <div style={{ display:"flex", gap:8 }}>
              {[{v:"create",l:"Create new records"},{v:"upsert",l:"Update existing + create new"}].map(({v,l}) => (
                <button key={v} onClick={()=>setMode(v)}
                  style={{ flex:1, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${mode===v?"#3b5bdb":"#e8eaed"}`, background:mode===v?"#eef1ff":"transparent", color:mode===v?"#3b5bdb":"#4b5563", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Select File</label>
            <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])}
              style={{ width:"100%", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}/>
          </div>

          <div style={{ marginBottom:20 }}>
            <button onClick={()=>downloadTemplate(object.id, object.slug)}
              style={{ fontSize:12, color:"#3b5bdb", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"'DM Sans',sans-serif", padding:0 }}>
              Download template CSV
            </button>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e8eaed", background:"white", color:"#4b5563", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={handle} disabled={!file||loading}
              style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:600, cursor:!file||loading?"not-allowed":"pointer", opacity:!file||loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
              {loading?"Importing…":"Import"}
            </button>
          </div>
        </> : (
          <div>
            <div style={{ background:result.success?"#f0fdf4":"#fef2f2", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:result.success?"#166534":"#991b1b", marginBottom:8 }}>
                {result.success?"Import complete":"Import failed"}
              </div>
              <div style={{ fontSize:12, color:"#374151" }}>
                ✅ {result.created} created · ✏️ {result.updated} updated · ⏭️ {result.skipped} skipped
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop:8, fontSize:11, color:"#991b1b" }}>
                  {result.errors.slice(0,3).map((e,i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width:"100%", padding:"9px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Builds a plain-text list summary for the copilot
function buildListContext(object, records, total, fields) {
  if (!object || !records) return null;
  const lines = [];
  lines.push("OBJECT: " + (object.plural_name || object.name) + " (slug: " + (object.slug||"") + ")");
  lines.push("TOTAL_VISIBLE: " + records.length + (records.length < total ? " (of " + total + " total — use APPLY_FILTER to narrow further)" : " records"));

  // Field map: api_key → field_type
  const fieldMap = {};
  if (fields && fields.length) {
    fields.forEach(f => { fieldMap[f.api_key] = f.field_type; });
    lines.push("FIELDS: " + fields.slice(0,25).map(f => f.api_key + " (" + f.field_type + ")").join(", "));
  }

  // Auto-generate breakdowns for every groupable field that has values
  // Include select/status/boolean fields AND text fields with ≤20 distinct values
  const breakdownFields = fields
    ? fields.filter(f => ['select','multi_select','status','boolean','rating','text','textarea'].includes(f.field_type))
    : [];

  // Always include these common fields even without schema
  const alwaysCheck = ['status','department','current_title','job_title','location','work_type',
    'employment_type','person_type','source','nationality','category','type'];

  const checkedKeys = new Set([
    ...breakdownFields.map(f => f.api_key),
    ...alwaysCheck
  ]);

  for (const key of checkedKeys) {
    const counts = {};
    records.forEach(r => {
      const v = r.data?.[key];
      if (v === null || v === undefined || v === '') return;
      const vals = Array.isArray(v) ? v : [String(v)];
      vals.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
    });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    // Only include if there are values and ≤30 distinct values (avoid free-text explosion)
    if (entries.length > 0 && entries.length <= 30) {
      lines.push(key + ": " + entries.map(([k,v]) => k + "=" + v).join(", "));
    }
  }

  // Sample record names for context
  const getName = r => {
    const d = r.data || {};
    return (d.first_name ? (d.first_name + " " + (d.last_name || "")).trim() : null)
      || d.job_title || d.pool_name || d.name || "";
  };
  const names = records.slice(0, 10).map(getName).filter(Boolean);
  if (names.length)
    lines.push("sample_names: " + names.join(", ") +
      (records.length > 10 ? " ... +" + (records.length - 10) + " more" : ""));

  return lines.join("\n");
}

export default function RecordsView({ environment, object, onOpenRecord, initialFilter, session, autoCreate, onAutoCreateConsumed, allObjects = [] }) {
  // Make environment available to PeoplePicker without prop drilling
  useEffect(() => { _currentEnvId = environment?.id; resolveMyPersonId(); }, [environment?.id]);

  const [records, setRecords]   = useState([]);
  const [fields,  setFields]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view,    setView]      = useState("table");
  const [search,  setSearch]    = useState("");
  const [filterChip, setFilterChip] = useState(initialFilter || null);
  
  // ── Duplicate detection map ────────────────────────────────────────────────
  const [dupMap, setDupMap] = useState({});

  // Background duplicate scan — only for People objects, runs after records load
  useEffect(() => {
    const isPeople = object?.slug === "people" ||
                     object?.name?.toLowerCase().includes("person");
    if (!isPeople || !environment?.id || !object?.id || records.length < 2) {
      setDupMap({});
      return;
    }
    const timer = setTimeout(() => {
      api.post('/duplicates/scan', {
        environment_id: environment.id,
        object_id:      object.id,
        threshold:      60,
      }).then(result => {
        if (!Array.isArray(result?.pairs)) return;
        const map = {};
        result.pairs.forEach(pair => {
          const add = (id, score, reasons) => {
            if (!map[id] || map[id].score < score) map[id] = { score, reasons };
          };
          add(pair.record_a.id, pair.score, pair.reasons);
          add(pair.record_b.id, pair.score, pair.reasons);
        });
        setDupMap(map);
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records.length, object?.id, environment?.id]);

  const [visibleFieldIds, setVisibleFieldIds] = useState(null);
  const [showColPicker, setShowColPicker]     = useState(false);
  const [activeFilters, setActiveFilters]     = useState([]);
  const [filterLogic, setFilterLogic]         = useState("AND");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterBtnRef = useRef(null);
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [showViewsMenu, setShowViewsMenu]     = useState(false);
  const skipColRestoreRef = useRef(false);
  const [showExport,    setShowExport]        = useState(false);
  // Sort state
  const [sortBy,  setSortBy]  = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  // Column widths (persisted per object)
  const [colWidths, setColWidths] = useState({});
  // Column order (drag to reorder)
  const [visibleColOrder, setVisibleColOrder] = useState(null);
  // Linked jobs for system columns
  const [linkedJobs, setLinkedJobs] = useState({});
  // Cross-object filter data
  const [linkedObjectFields, setLinkedObjectFields] = useState({});
  const [linkedObjectRecords, setLinkedObjectRecords] = useState({});
  const [peopleLinksData, setPeopleLinksData] = useState([]);
  const exportRef = useRef(null);
  const userId = session?.user?.id || session?.id || "unknown";

  // Close export dropdown on outside click
  useEffect(() => {
    const h = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Permission helper — prefers PermissionContext (server-side), falls back to session
  const _permCtx = usePermCtx(); // safe — returns defaults if outside PermissionProvider
  const can = (action) => {
    if (_permCtx) return _permCtx.can(object?.slug, action);
    if (!session) return true;
    const { role, permissions } = session;
    if (role?.slug === 'super_admin' || role?.slug === 'admin') return true;
    return (permissions || []).some(
      p => p.object_slug === object.slug && p.action === action && p.allowed
    );
  };
  const canRecord = (flag) => _permCtx ? _permCtx.canGlobal(flag) : true;
  const [selected, setSelected] = useState(null);   // slide-out panel only
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (autoCreate) { setShowForm(true); onAutoCreateConsumed?.(); }
  }, [autoCreate]);
  const [editRecord, setEditRecord] = useState(null);
  const [page, setPage]         = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeListName, setActiveListName] = useState(null);
  const [showImport, setShowImport] = useState(false);

  // Clear selection when object/page/search/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [object?.id, page, search, activeFilters.length]);
  useEffect(() => { setActiveListName(null); }, [object?.id]);
  const [activeTab, setActiveTab] = useState("records");

  // Listen for copilot filter commands — talentos:apply-filter
  useEffect(() => {
    const handler = (e) => {
      const { search: q, filters, clearFilters, field, op, value } = e.detail || {};
      // Simple single-field shorthand: { field, op, value }
      if (field !== undefined && !filters) {
        if (field === null || field === "") {
          setActiveFilters([]);
          setFilterChip(null);
        } else {
          setActiveFilters([{ field, op: op || "contains", value: value ?? "" }]);
          setFilterLogic("AND");
        }
      }
      // Full filters array
      if (filters !== undefined) {
        setActiveFilters(Array.isArray(filters) ? filters : []);
        setFilterLogic("AND");
      }
      if (clearFilters) {
        setActiveFilters([]);
        setFilterChip(null);
      }
      // Search string
      if (q !== undefined) setSearch(q);
      setPage(1);
    };
    window.addEventListener("talentos:apply-filter", handler);
    return () => window.removeEventListener("talentos:apply-filter", handler);
  }, []);
  const [total, setTotal]       = useState(0);

  const colStorageKey = `talentos_cols_${object.id}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [f, r] = await Promise.all([
      api.get(`/fields?object_id=${object.id}&environment_id=${environment.id}`),
      api.get(`/records?object_id=${object.id}&environment_id=${environment.id}&page=${page}&limit=50${search?`&search=${encodeURIComponent(search)}`:""}`),
    ]);
    const loadedFields = Array.isArray(f) ? f : [];
    setFields(loadedFields);
    // Restore saved column order/selection, or use defaults
    // Skip if a saved view was just loaded (it already set the columns)
    if (skipColRestoreRef.current) {
      skipColRestoreRef.current = false;
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(colStorageKey));
        if (saved && saved.length) {
          setVisibleFieldIds(saved.filter(id => loadedFields.some(ff => ff.id === id)));
        } else {
          setVisibleFieldIds(loadedFields.filter(ff => ff.show_in_list).slice(0, 6).map(ff => ff.id));
        }
      } catch {
        setVisibleFieldIds(loadedFields.filter(ff => ff.show_in_list).slice(0, 6).map(ff => ff.id));
      }
    }
    const loaded = r.records||[];
    // Apply active filter chip client-side
    let filtered;
    if (filterChip?.fieldKey === "_linked_record_id") {
      // Special filter: show people linked to a specific record via people-links table
      const allRecs = await api.get(`/records?object_id=${object.id}&environment_id=${environment.id}&limit=500`);
      const links = await api.get(`/workflows/people-links?target_record_id=${filterChip.fieldValue}`);
      const linkedIds = new Set((Array.isArray(links) ? links : []).map(l => l.person_record_id));
      filtered = (allRecs.records || []).filter(rec => linkedIds.has(rec.id));
    } else if (filterChip?.fieldKey === '__ids__') {
      const ids = filterChip.fieldValue.split(',').map(s => s.trim()).filter(Boolean);
      filtered = loaded.filter(rec => ids.includes(rec.id));
    } else if (filterChip) {
      filtered = loaded.filter(rec => {
        const v = rec.data?.[filterChip.fieldKey];
        if (Array.isArray(v)) return v.some(i => String(i).toLowerCase() === filterChip.fieldValue.toLowerCase());
        return String(v || "").toLowerCase() === filterChip.fieldValue.toLowerCase();
      });
    } else {
      filtered = loaded;
    }
    setRecords(filtered);
    setTotal(filterChip ? filtered.length : (r.pagination?.total||0));
    setLoading(false);
    // Broadcast list summary to copilot so it can answer list questions
    window.dispatchEvent(new CustomEvent("talentos:list-context", {
      detail: buildListContext(object, filtered, filterChip ? filtered.length : (r.pagination?.total||0), fields)
    }));
  }, [object.id, environment.id, page, search, filterChip, reloadKey]);

  const handleColChange = (ids) => {
    setVisibleFieldIds(ids);
    setVisibleColOrder(null); // reset order so new columns appear; user can re-drag after
    try { localStorage.setItem(colStorageKey, JSON.stringify(ids)); } catch {}
  };

  // Sync filterChip when initialFilter changes (e.g. navigating from a pill in another record)
  useEffect(() => { setFilterChip(initialFilter || null); setPage(1); }, [initialFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    await api.post("/records", { object_id:object.id, environment_id:environment.id, data, created_by:"Admin" });
    await load();
    setShowForm(false);
  };

  const handleUpdate = async (data) => {
    await api.patch(`/records/${editRecord.id}`, { data, updated_by:"Admin" });
    await load();
    setEditRecord(null);
  };

  const handleDetailUpdate = (updated) => {
    setRecords(rs => rs.map(r => r.id===updated.id ? updated : r));
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    if (!(await window.__confirm({ title:'Delete this record?', danger:true }))) return;
    await api.del(`/records/${id}?environment_id=${environment.id}`);
    if (selected?.id===id) setSelected(null);
    load();
  };

  const handleStatusChange = async (id, status) => {
    const updated = await api.patch(`/records/${id}`, { data:{ status }, updated_by:"Admin" });
    setRecords(rs => rs.map(r => r.id===id ? updated : r));
  };

  // ── Bulk warning confirmation ────────────────────────────────────────────────
  const [bulkConfirm, setBulkConfirm] = useState(null); // { action:'delete'|'edit', fieldId, value }
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  // Fetch total matching count when filters are active (for "select all matching" feature)
  useEffect(() => {
    if (!activeFilters.length || !object?.id || !environment?.id) { setTotalFilteredCount(0); return; }
    api.post('/records/bulk-count', { object_id: object.id, environment_id: environment.id, filters: activeFilters })
      .then(d => setTotalFilteredCount(d?.count || 0))
      .catch(() => setTotalFilteredCount(0));
    setSelectAllMatching(false);
  }, [activeFilters, object?.id, environment?.id]);
  const [showCompare, setShowCompare] = useState(false);

  const getBulkThreshold = () => {
    // Try role-specific threshold first (set in Settings → Roles)
    const session = JSON.parse(localStorage.getItem("talentos_session") || "{}");
    const roleSlug = session?.user?.role?.slug;
    if (roleSlug) {
      const v = localStorage.getItem(`talentos_bulk_threshold_${roleSlug}`);
      if (v !== null) return parseInt(v, 10);
    }
    return parseInt(localStorage.getItem("talentos_bulk_threshold") || "20", 10);
  };

  const guardedBulkAction = (action, payload = {}) => {
    // Check bulk_actions permission using session directly (sync, always available).
    // _permCtx.canGlobal() is optimistic (returns true before async load) — don't use it here.
    const hasBulkAccess = (() => {
      if (!session) return false;
      const { role, permissions: sesPerms } = session;
      if (role?.slug === 'super_admin' || role?.slug === 'admin') return true;
      return (sesPerms || []).some(p =>
        p.object_slug === '__global__' && p.action === 'bulk_actions' && p.allowed
      );
    })();
    if (!hasBulkAccess) {
      alert('You do not have permission to perform bulk actions.');
      return;
    }
    if (action === 'delete' && !can('delete')) {
      alert('You do not have permission to delete records.');
      return;
    }
    if (action === 'edit' && !can('edit')) {
      alert('You do not have permission to edit records.');
      return;
    }
    const threshold = getBulkThreshold();
    if (selectedIds.size > threshold) {
      setBulkConfirm({ action, ...payload });
    } else {
      if (action === 'delete') handleBulkDelete();
      if (action === 'edit')   handleBulkEdit(payload.fieldId, payload.value);
    }
  };

  const handleBulkDelete = async () => {
    if (selectAllMatching) {
      await api.post('/records/bulk-action', {
        object_id: object.id, environment_id: environment.id,
        filters: activeFilters, action: 'delete',
        user_role: session?.role?.slug, user_id: session?.userId,
      });
    } else {
      await Promise.all([...selectedIds].map(id => api.del(`/records/${id}?environment_id=${environment.id}`)));
    }
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    load();
  };

  const handleBulkEdit = async (fieldId, value) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    let coerced = value;
    if (field.field_type === "boolean")  coerced = value === "true";
    if (field.field_type === "number" || field.field_type === "currency") coerced = parseFloat(value) || 0;
    if (selectAllMatching) {
      await api.post('/records/bulk-action', {
        object_id: object.id, environment_id: environment.id,
        filters: activeFilters, action: 'edit',
        payload: { field_api_key: field.api_key, value: coerced },
        user_role: session?.role?.slug, user_id: session?.userId,
      });
    } else {
      await Promise.all([...selectedIds].map(id => {
        const rec = records.find(r => r.id === id);
        if (!rec) return;
        return api.patch(`/records/${id}`, { data: { ...rec.data, [field.api_key]: coerced }, updated_by: "Admin" });
      }));
    }
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    load();
  };

  // ── Bulk people actions (communicate, note, interview, link) ───────────────
  const handleBulkPeopleAction = async (action, payload) => {
    const ids = [...selectedIds];
    if (action === "communicate") {
      // Fire event — keep selection so user knows who was targeted
      window.dispatchEvent(new CustomEvent("talentos:bulkCommunicate", {
        detail: { recordIds: ids, type: payload.type, object }
      }));
      return; // don't clear selection
    } else if (action === "note") {
      await Promise.all(ids.map(id =>
        api.post(`/notes`, { record_id: id, content: payload.text, author: session?.user?.email || "Admin" })
      ));
      window.__toast?.success?.(`Note added to ${ids.length} record${ids.length !== 1 ? "s" : ""}`);
    } else if (action === "interview") {
      // Navigate to Interviews tab with bulk candidates pre-populated
      window.dispatchEvent(new CustomEvent("talentos:bulkInterview", {
        detail: {
          recordIds: ids,
          candidates: records.filter(r => ids.includes(r.id)).map(r => ({
            id: r.id,
            name: [r.data?.first_name, r.data?.last_name].filter(Boolean).join(" ") || r.data?.email || "Candidate",
          }))
        }
      }));
      return; // don't clear selection
    } else if (action === "link") {
      await Promise.all(ids.map(id =>
        api.post("/people-links", {
          person_id: id,
          record_id: payload.targetId,
          object_id: payload.objectId,
          environment_id: environment.id,
          stage: "Added",
          linked_at: new Date().toISOString(),
        })
      ));
      window.__toast?.success?.(`Linked ${ids.length} people`);
      load();
    }
    setSelectedIds(new Set());
  };
  const displayedRecords = useMemo(() => {
    let recs = applyFilters(records, activeFilters, fields, filterLogic, linkedObjectRecords, peopleLinksData, linkedObjectFields);
    if (sortBy) {
      recs = [...recs].sort((a, b) => {
        let av, bv;
        if (sortBy.startsWith('_')) {
          // System column
          if (sortBy === '_created') { av = a.created_at||''; bv = b.created_at||''; }
          else if (sortBy === '_updated') { av = a.updated_at||''; bv = b.updated_at||''; }
          else if (sortBy === '_linked_job') { av = linkedJobs[a.id]?.title||''; bv = linkedJobs[b.id]?.title||''; }
          else if (sortBy === '_stage') { av = linkedJobs[a.id]?.stage||''; bv = linkedJobs[b.id]?.stage||''; }
        } else {
          av = a.data?.[sortBy] ?? ''; bv = b.data?.[sortBy] ?? '';
        }
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return recs;
  }, [records, activeFilters, fields, sortBy, sortDir, linkedJobs]);

  // Re-broadcast list context whenever displayed records change (filters applied, sort changed etc.)
  useEffect(() => {
    if (!displayedRecords.length && !records.length) return;
    window.dispatchEvent(new CustomEvent("talentos:list-context", {
      detail: buildListContext(object, displayedRecords, displayedRecords.length, fields)
    }));
  }, [displayedRecords, fields]);

  const handleLoadView = (view) => {
    skipColRestoreRef.current = true;
    if (view.filters)           setActiveFilters(view.filters);
    if (view.filter_logic)      setFilterLogic(view.filter_logic);
    if (view.visible_field_ids?.length) { setVisibleFieldIds(view.visible_field_ids); try { localStorage.setItem(colStorageKey, JSON.stringify(view.visible_field_ids)); } catch {} }
    if (view.view_mode)         setView(view.view_mode);
    setFilterChip(view.filter_chip || null);
    setActiveListName(view.name || null);
    setPage(1);
    setReloadKey(k => k + 1);
  };

  // ── Column filter popover state ─────────────────────────────────────────────
  const [editingFilter, setEditingFilter] = useState(null);
  // { fieldId, filterId|null, op, value, rect }

  const handleColumnFilter = (field, rect) => {
    const existing = activeFilters.find(f => f.fieldId === field.id);
    setEditingFilter({
      fieldId:  field.id,
      filterId: existing?.id ?? null,
      op:       existing?.op    ?? getOpsForField(field)[0],
      value:    existing?.value ?? "",
      rect,
    });
  };

  const handleEditFilter = (filt, rect) => {
    setEditingFilter({ fieldId: filt.fieldId, filterId: filt.id, op: filt.op, value: filt.value, rect });
  };

  const handleApplyFilter = (op, value) => {
    if (!editingFilter) return;
    const { fieldId, filterId } = editingFilter;
    setActiveFilters(prev =>
      filterId
        ? prev.map(f => f.id === filterId ? { ...f, op, value } : f)
        : [...prev, { id: Date.now() + "", fieldId, op, value }]
    );
    setEditingFilter(null);
  };

  const handleClearFilter = () => {
    if (editingFilter?.filterId) setActiveFilters(prev => prev.filter(f => f.id !== editingFilter.filterId));
    setEditingFilter(null);
  };

    // Sort handler
  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };



  // Column resize handler
  const handleResizeCol = (fieldId, width) => {
    setColWidths(prev => ({ ...prev, [fieldId]: width }));
  };

  // Load linked jobs for system columns (people_links)
  useEffect(() => {
    if (!object || !environment) return;
    api.get(`/workflows/people-links?environment_id=${environment.id}`)
      .then(links => {
        if (!Array.isArray(links)) return;
        const map = {};
        links.forEach(l => {
          const pid = l.person_record_id;
          if (pid && !map[pid]) {
            map[pid] = {
              title:    l.target_title || l.target_data?.job_title || l.target_data?.title || '',
              stage:    l.stage_name  || '',
              stage_id: l.stage_id    || null,
              link_id:  l.id          || null,
              steps:    l.workflow_steps || [],
            };
          }
        });
        setLinkedJobs(map);
        // Also store flat people_links for cross-object filtering
        setPeopleLinksData(links.map(l => ({
          person_id:  l.person_record_id,
          record_id:  l.target_record_id || l.record_id,
          object_id:  l.target_object_id || l.object_id,
        })));
      }).catch(() => {});
  }, [object?.id, environment?.id]);

  // Load fields + records for linked objects (for cross-object filter)
  useEffect(() => {
    if (!object || !environment || !allObjects.length) return;
    // Only load for People — other objects link upward, not downward
    const isPeople = object.slug === "people";
    if (!isPeople) return;
    const otherObjs = allObjects.filter(o => o.id !== object.id && o.slug !== "people");
    Promise.all(otherObjs.map(async o => {
      const [flds, recs] = await Promise.all([
        api.get(`/fields?object_id=${o.id}&environment_id=${environment.id}`),
        api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=500`),
      ]);
      return { objId: o.id, fields: Array.isArray(flds) ? flds : [], records: (recs.records || []) };
    })).then(results => {
      const fldMap = {}; const recMap = {};
      results.forEach(({ objId, fields: flds, records: recs }) => {
        fldMap[objId] = flds;
        recMap[objId] = recs;
      });
      setLinkedObjectFields(fldMap);
      setLinkedObjectRecords(recMap);
    }).catch(() => {});
  }, [object?.id, environment?.id, allObjects.length]);


  const handleExport = (format) => {
    setShowExport(false);
    const exportFields = visibleFieldIds
      ? fields.filter(f => visibleFieldIds.includes(f.id))
      : fields.filter(f => f.show_in_list).slice(0, 10);
    const slug = object?.slug || 'export';
    const ts = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const json = displayedRecords.map(r => {
        const obj = {}; exportFields.forEach(f => { obj[f.api_key] = r.data?.[f.api_key] ?? null; }); return obj;
      });
      triggerDownload(`${slug}-${ts}.json`, JSON.stringify(json, null, 2), 'application/json');
      return;
    }
    const sep = format === 'tsv' ? '\t' : ',';
    const esc = (v) => { const s = String(v??''); if (format==='tsv') return s.replace(/\t/g,' '); if (s.includes(',')||s.includes('"')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"'; return s; };
    const header = exportFields.map(f => esc(f.name)).join(sep);
    const rows = displayedRecords.map(r => exportFields.map(f => { const v=r.data?.[f.api_key]; return esc(Array.isArray(v)?v.join(';'):(v??'')); }).join(sep));
    const ext = format === 'tsv' ? 'tsv' : 'csv';
    triggerDownload(`${slug}-${ts}.${ext}`, [header,...rows].join('\n'), 'text/plain');
  };

  const triggerDownload = (filename, content, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ minHeight:0, padding:"0 32px" }}>
      {/* Toolbar */}
      <div data-tour="records-toolbar" style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", position:"sticky", top:0, zIndex:50, background:"var(--t-bg, #f4f5f8)", paddingBottom:12, paddingTop:24, marginTop:0 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text1, flex:"none", fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.4px" }}>
          {object.plural_name}
          {activeListName && <span style={{ fontWeight:400, color:C.accent, fontSize:15, marginLeft:8 }}>/ {activeListName}</span>}
        </h1>
        <span style={{ fontSize:13, color:C.text3, fontWeight:500 }}>
          {activeFilters.length ? `${displayedRecords.length} of ${total}` : total} record{total!==1?"s":""}
        </span>

        <div style={{ flex:1 }}/>

        {/* Active filter chip */}
        {filterChip && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px 5px 12px", borderRadius:20,
            background:C.accentLight, border:`1.5px solid ${C.accent}`, fontSize:12, color:C.accent, fontWeight:600 }}>
            <Ic n="filter" s={11} c={C.accent}/>
            {filterChip.fieldKey === '__ids__'
              ? filterChip.label || `${filterChip.fieldValue.split(',').length} people`
              : <>{filterChip.fieldLabel}: <span style={{fontStyle:"italic"}}>{filterChip.fieldDisplay ?? filterChip.fieldValue}</span></>
            }
            <button onClick={()=>{setFilterChip(null);setActiveListName(null);setPage(1);}}
              style={{ background:"none", border:"none", cursor:"pointer", padding:"0 0 0 4px", display:"flex", color:C.accent, opacity:0.7 }}
              onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.7"}>
              <Ic n="x" s={12} c={C.accent}/>
            </button>
          </div>
        )}

        {activeTab === "records" && <>
        {/* Search */}
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={`Search ${object.plural_name}…`}
            style={{ padding:"8px 12px 8px 34px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", width:220, color:C.text1, background:C.surface }}/>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.text3, display:"flex" }}><Ic n="search" s={14}/></span>
        </div>

        {/* View toggle */}
        <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
          {[{v:"table",i:"list"}].map(({v,i})=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:"7px 12px", border:"none", cursor:"pointer", background:view===v?C.accentLight:"transparent", color:view===v?C.accent:C.text3, display:"flex", alignItems:"center", transition:"all .12s" }}>
              <Ic n={i} s={15}/>
            </button>
          ))}
        </div>

        {/* Filter button */}
        <div ref={filterBtnRef} style={{ position:"relative" }}>
          <button onClick={() => setShowFilterPanel(p => !p)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8,
              border:`1px solid ${showFilterPanel || activeFilters.length ? C.accent : C.border}`,
              background: showFilterPanel || activeFilters.length ? C.accentLight : C.surface,
              color: showFilterPanel || activeFilters.length ? C.accent : C.text2,
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .12s" }}>
            <Ic n="filter" s={13}/>
            Filter
            {activeFilters.length > 0 && (
              <span style={{ background:C.accent, color:"#fff", borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 6px", marginLeft:2 }}>
                {activeFilters.length}
              </span>
            )}
          </button>
          <AdvancedFilterPanel
            fields={fields}
            filters={activeFilters}
            logic={filterLogic}
            open={showFilterPanel}
            onFiltersChange={f => { setActiveFilters(f); setActiveListName(null); }}
            onLogicChange={setFilterLogic}
            onClose={() => setShowFilterPanel(false)}
            onSave={() => { setShowFilterPanel(false); setShowViewsMenu(true); }}
            allObjects={allObjects.filter(o => o.id !== object.id)}
            linkedObjectFields={linkedObjectFields}
          />
        </div>

        {/* Saved Lists button */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowViewsMenu(p => !p)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8,
              border:`1px solid ${showViewsMenu ? C.accent : C.border}`, background: showViewsMenu ? C.accentLight : C.surface,
              color: showViewsMenu ? C.accent : C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .12s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Lists
          </button>
          {showViewsMenu && (
            <SavedViewsDropdown
              objectId={object.id}
              environmentId={environment.id}
              userId={userId}
              currentFilters={activeFilters}
              currentFilterLogic={filterLogic}
              currentFilterChip={filterChip}
              currentVisibleFieldIds={visibleFieldIds}
              currentViewMode={view}
              fields={fields}
              onLoad={handleLoadView}
              onClose={() => setShowViewsMenu(false)}
            />
          )}
        </div>

        {/* Column picker button */}
        {view === "table" && (
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowColPicker(p => !p)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8,
                border:`1px solid ${showColPicker ? C.accent : C.border}`, background: showColPicker ? C.accentLight : C.surface,
                color: showColPicker ? C.accent : C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .12s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Columns {visibleFieldIds && <span style={{ background:C.accent, color:"#fff", borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 6px", marginLeft:2 }}>{visibleFieldIds.length}</span>}
            </button>
            {showColPicker && (
              <ColumnPickerDropdown
                fields={fields}
                visibleIds={visibleFieldIds || []}
                onChange={handleColChange}
                onClose={() => setShowColPicker(false)}
              />
            )}
          </div>
        )}

        {/* Export dropdown */}
        <div ref={exportRef} style={{ position:"relative" }}>
          <button onClick={() => setShowExport(s => !s)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8,
              border:`1px solid ${showExport ? C.accent : C.border}`, background: showExport ? C.accentLight : C.surface,
              color: showExport ? C.accent : C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .12s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export
          </button>
          {showExport && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:400, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 6px 20px rgba(0,0,0,.1)", minWidth:160, overflow:"hidden" }}>
              {[
                { fmt:"csv",  label:"CSV",  sub:"Comma separated" },
                { fmt:"tsv",  label:"TSV",  sub:"Tab separated" },
                { fmt:"json", label:"JSON", sub:"Structured data" },
              ].map(({fmt,label,sub}) => (
                <div key={fmt} onClick={() => handleExport(fmt)}
                  style={{ padding:"9px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{label}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{sub} · {displayedRecords.length} rows</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Btn icon="plus" onClick={()=>setShowForm(true)} style={{display:can("create")?"":"none"}}>New {object.name}</Btn>
        </>}
      </div>

      {/* Recommendations tab */}
      {activeTab === "matching" && (
        <MatchingEngine environment={environment} initialObject={object}/>
      )}

      {/* Records tab */}
      {activeTab === "records" && <>

      {/* Column filter popover (portal) */}
      {editingFilter && (() => {
        const field = fields.find(f => f.id === editingFilter.fieldId);
        return field ? (
          <ColumnFilterPopover
            field={field}
            filterId={editingFilter.filterId}
            initialOp={editingFilter.op}
            initialVal={editingFilter.value}
            rect={editingFilter.rect}
            onApply={handleApplyFilter}
            onClear={handleClearFilter}
            onClose={() => setEditingFilter(null)}
          />
        ) : null;
      })()}


      {/* Bulk confirm modal */}
      {bulkConfirm && (
        <BulkConfirmModal
          action={bulkConfirm.action}
          count={selectedIds.size}
          objectName={object?.name || "record"}
          fieldId={bulkConfirm.fieldId}
          value={bulkConfirm.value}
          fields={fields}
          onConfirm={() => {
            setBulkConfirm(null);
            if (bulkConfirm.action === "delete") handleBulkDelete();
            if (bulkConfirm.action === "edit")   handleBulkEdit(bulkConfirm.fieldId, bulkConfirm.value);
          }}
          onCancel={() => setBulkConfirm(null)}
        />
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          total={displayedRecords.length}
          fields={fields}
          objectSlug={object.slug}
          selectedRecords={displayedRecords.filter(r => selectedIds.has(r.id))}
          environment={environment}
          allObjects={allObjects}
          onSelectAll={() => setSelectedIds(new Set(displayedRecords.map(r => r.id)))}
          onClearAll={() => setSelectedIds(new Set())}
          onDelete={() => guardedBulkAction("delete")}
          onEdit={(fieldId, value) => guardedBulkAction("edit", { fieldId, value })}
          onCompare={selectedIds.size >= 2 && selectedIds.size <= 5 ? () => setShowCompare(true) : null}
          onBulkAction={handleBulkPeopleAction}
        />
      )}

      {/* Content */}
      <div style={{ flex:1, background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.text3 }}>Loading…</div>
        ) : (
          <TableView records={displayedRecords} fields={fields} visibleFieldIds={visibleFieldIds} objectColor={object.color||C.accent}
            onProfile={r=>onOpenRecord?.(r.id, object.id)}
            onSelect={r=>{setSelected(r);}}
            onEdit={can("edit") ? r=>setEditRecord(r) : null}
            onDelete={can("delete") ? handleDelete : null}
            
              dupMap={dupMap}
              onStatusUpdate={updated => setRecords(prev => prev.map(r => r.id===updated.id ? updated : r))}
            selectedIds={selectedIds}
            onToggleSelect={id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
            onToggleAll={() => setSelectedIds(prev => prev.size === displayedRecords.length ? new Set() : new Set(displayedRecords.map(r => r.id)))}
            sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
            activeFilters={activeFilters}
            onColumnFilter={handleColumnFilter}
            colWidths={colWidths} onResizeCol={handleResizeCol}
            visibleColOrder={visibleColOrder} onReorderCols={setVisibleColOrder}
            linkedJobs={linkedJobs}
            onStageChange={(recordId, updated) => setLinkedJobs(prev => ({ ...prev, [recordId]: updated }))}/>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
          <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</Btn>
          <span style={{ fontSize:13, color:C.text3, padding:"6px 10px" }}>Page {page}</span>
          <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>p+1)} disabled={records.length<50}>Next</Btn>
        </div>
      )}

      </>}

      {/* Slide-out panel (expand icon) */}
      {selected && (
        <RecordDetail
          record={selected}
          fields={fields}
          environment={environment}
          objectName={object.name}
          objectColor={object.color||C.accent}
          fullPage={false}
          onClose={()=>setSelected(null)}
          onToggleFullPage={()=>onOpenRecord?.(selected.id, object.id)}
          onUpdate={handleDetailUpdate}
          onDelete={handleDelete}
          onNavigate={onOpenRecord}
        />
      )}

      {/* Create form */}
      {showForm && (
        <RecordFormModal fields={fields} objectName={object.name} onSave={handleCreate} onClose={()=>setShowForm(false)} environment={environment}/>
      )}

      {/* Edit form */}
      {editRecord && (
        <RecordFormModal fields={fields} record={editRecord} objectName={object.name} onSave={handleUpdate} onClose={()=>setEditRecord(null)} environment={environment}/>
      )}

      {/* CSV Import */}
      {showImport && (
        <CSVImportModal object={object} environment={environment} onClose={()=>setShowImport(false)} onDone={()=>{ setShowImport(false); load(); }}/>
      )}

      {/* Compare modal — portal so it escapes scroll container */}
      {showCompare && selectedIds.size >= 2 && ReactDOM.createPortal(
        <CompareModal
          records={displayedRecords.filter(r => selectedIds.has(r.id))}
          fields={fields}
          objectColor={object.color || C.accent}
          onClose={() => setShowCompare(false)}
          onOpen={(id) => { setShowCompare(false); onOpenRecord?.(id, object.id); }}
        />,
        document.body
      )}
    </div>
  );
}
