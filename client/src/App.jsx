import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import ReschedulePage from './ReschedulePage.jsx';
import ReportingErrorBoundary from "./ErrorBoundary.jsx";
import InboxModule, { useInboxUnreadCount } from "./Inbox";
import { MobileShell, useIsMobile } from "./MobileApp.jsx";
import MaintenanceOverlay from "./MaintenanceOverlay";
import GuidedTour, { useTour } from "./GuidedTour";

// Heavy modules — loaded on demand only when navigated to
// Chunk-load error handler — reloads once when a lazy chunk fails (stale deployment cache)
const lazyWithRetry = (factory) => lazy(() =>
  factory().catch((err) => {
    // Only auto-reload once per session to avoid infinite loops
    const reloadKey = "vrc_chunk_reload";
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
    }
    return { default: () => null };
  })
);

const SettingsPage    = lazyWithRetry(() => import("./Settings.jsx"));
const OrgChart        = lazyWithRetry(() => import("./OrgChart.jsx"));
const SearchPage      = lazyWithRetry(() => import("./Search.jsx"));
const Dashboard          = lazyWithRetry(() => import("./Dashboard.jsx"));
const ActivityJournal    = lazyWithRetry(() => import("./ActivityJournal.jsx"));
const AdminDashboard      = lazyWithRetry(() => import("./AdminDashboard.jsx"));
const InterviewDashboard = lazyWithRetry(() => import("./InterviewDashboard.jsx"));
const OfferDashboard     = lazyWithRetry(() => import("./OfferDashboard.jsx"));
const DashboardHub       = lazyWithRetry(() => import("./DashboardHub.jsx"));
import PortalApp from "./PortalApp.jsx";
import InterviewSession from "./InterviewSession.jsx";
const WorkflowsPage   = lazyWithRetry(() => import("./Workflows.jsx"));
const PortalsPage     = lazyWithRetry(() => import("./Portals.jsx"));
const ReportsPage     = lazyWithRetry(() => import("./Reports.jsx"));
const Interviews      = lazyWithRetry(() => import("./Interviews.jsx"));
const OffersModule    = lazyWithRetry(() => import("./Offers.jsx"));
const SourcingHub     = lazyWithRetry(() => import("./SourcingHub.jsx"));
const CampaignLinks   = lazyWithRetry(() => import("./CampaignLinks.jsx"));
const Campaigns       = lazyWithRetry(() => import("./Campaigns.jsx"));
const SuperAdminConsole = lazyWithRetry(() => import("./SuperAdminConsole.jsx"));
const AgentsModule      = lazyWithRetry(() => import("./Agents.jsx"));
const AvailabilityPickerPage = lazyWithRetry(() => import("./AvailabilityPicker.jsx"));
const IntegrationsPage  = lazyWithRetry(() => import("./IntegrationsSettings.jsx"));
const HelpPage          = lazyWithRetry(() => import("./Help.jsx"));
const CompanySetupWizard = lazyWithRetry(() => import("./CompanySetupWizard.jsx"));

// Records loaded eagerly — used everywhere for record detail navigation
import RecordsView, { RecordDetail } from "./Records.jsx";
import { AICopilot, MatchingEngine } from "./AI.jsx";
import { ThemeProvider, useTheme, SCHEMES, FONTS, DENSITIES } from "./Theme.jsx";
import { useI18n } from "./i18n/I18nContext.jsx";
import LoginPage from "./LoginPage.jsx";
import CalendarModule from "./Calendar.jsx";
import CandidateChat from "./CandidateChat.jsx";
import DocumentBuilder from "./DocumentBuilder.jsx";
import BotInterview from "./BotInterview.jsx";
import CandidateHub from "./CandidateHub.jsx";
import ClientHub from "./ClientHub.jsx";
import ClientCasePortal from "./ClientCasePortal.jsx";
import SupportPortalPage from "./SupportPortalPage.jsx";
import { getSession, clearSession } from "./usePermissions.js";
import { PermissionProvider, usePermissions, Gate } from "./PermissionContext.jsx";
import { useHistory } from "./useHistory";
import { HistoryDropdown } from "./RecentHistory";


// ─── AccessDenied fallback ───────────────────────────────────────────────────
const AccessDenied = ({ feature = 'this feature' }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', height:'60vh', gap:16,
    fontFamily:"var(--t-font,'DM Sans',sans-serif)" }}>
    <svg width={48} height={48} viewBox='0 0 24 24' fill='none'
      stroke='#d1d5db' strokeWidth={1.5} strokeLinecap='round'>
      <circle cx='12' cy='12' r='10'/>
      <line x1='4.93' y1='4.93' x2='19.07' y2='19.07'/>
    </svg>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:18, fontWeight:700, color:'#374151', marginBottom:6 }}>
        Access restricted
      </div>
      <div style={{ fontSize:13, color:'#9ca3af' }}>
        You don't have permission to access {feature}.<br/>
        Contact your administrator to request access.
      </div>
    </div>
  </div>
);

// ─── API Client ───────────────────────────────────────────────────────────────
// Derive tenant slug — session takes priority, then URL param, then subdomain
function getTenantSlug() {
  // 1. Subdomain (highest priority — the URL is the source of truth)
  //    e.g. acme.vercentic.com → 'acme', client.vercentic.com → 'client'
  const host = window.location.hostname;
  const parts = host.split('.');
  const INFRA = new Set(['www','app','api','admin','portal','localhost','mail','cdn','static','assets']);
  if (parts.length >= 3 &&
      !INFRA.has(parts[0]) &&
      !['vercel','railway','up','netlify','herokuapp'].some(r => host.includes(r))) {
    return parts[0];
  }
  // 2. Session slug (set after login — covers same-domain sessions)
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  } catch {}
  // 3. URL query param ?tenant=slug (super admin testing)
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenant')) return params.get('tenant');
  return null;
}

// TENANT_SLUG is re-evaluated per request so it picks up the session after login
function getUserId() {
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    return sess?.user?.id || null;
  } catch { return null; }
}

function apiHeaders(extra = {}) {
  const slug   = getTenantSlug();
  const userId = getUserId();
  const h = { 'Content-Type': 'application/json', ...extra };
  if (slug)   h['X-Tenant-Slug'] = slug;
  if (userId) h['X-User-Id']     = userId;
  return h;
}

const api = {
  get: (path) => {
    const slug = getTenantSlug(); const userId = getUserId();
    const h = {};
    if (slug)   h['X-Tenant-Slug'] = slug;
    if (userId) h['X-User-Id']     = userId;
    return fetch(`/api${path}`, { headers: h }).then(r => r.json());
  },
  post:   (path, body) => fetch(`/api${path}`, { method: "POST",   headers: apiHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
  patch:  (path, body) => fetch(`/api${path}`, { method: "PATCH",  headers: apiHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
  delete: (path)       => fetch(`/api${path}`, { method: "DELETE", headers: apiHeaders() }).then(r => r.json()),
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
    headphones: "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
    flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
    box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    award: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
    workflow: "M22 12h-4l-3 9L9 3l-3 9H2",
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    inbox: "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
    building: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "bar-chart-2": "M18 20V10M12 20V4M6 20v-6",
    "shield":      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "git-branch": "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    "help-circle": "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
    calendar: "M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
    "calendar-days": "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 14h.01M13 14h.01M17 14h.01M9 18h.01M13 18h.01",
    dollar: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z",
    gitBranch: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    "file-text": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    "message-circle": "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
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
      color: "var(--t-text1)", cursor: "pointer"
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
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--t-text1)" }}>{title}</h2>
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
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text1)" }}>{field.name}</span>
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
    const data = await api.get(`/fields?object_id=${object.id}&environment_id=${environmentId}`);
    setFields(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [object.id]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleSaveField = async (payload, fieldId) => {
    const result = fieldId
      ? await api.patch(`/fields/${fieldId}`, payload)
      : await api.post("/fields", payload);
    if (result?.error) {
      window.__toast?.alert(`Could not save field: ${result.error}`);
      return;
    }
    await loadFields();
    setShowAddField(false);
    setEditingField(null);
  };

  const handleDeleteField = async (field) => {
    if (!(await window.__confirm({ title:`Delete field "${field.name}"? This will remove data for all records.`, danger:true }))) return;
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
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--t-text1)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.4px" }}>{object.name} Schema</h1>
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
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text1)" }}>{obj.plural_name || obj.name}</span>
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--t-text1)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.4px" }}>{title}</h1>
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
const GlobalSearch = ({ selectedEnv, navObjects, onNavigateToSearch, onNavigateToRecord, onCreateRecord, onNavigateToCalendar, historySlot, activeDashTab, onDashboardNav }) => {
  // userId must be read locally — GlobalSearch is module-level, not inside App()
  const userId = getSession()?.user?.id || null;
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [open,        setOpen]        = useState(false);
  const [dashOpen,    setDashOpen]    = useState(false);
  const dashRef = useRef(null);
  // Notifications
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [bellOpen,    setBellOpen]    = useState(false);
  const [bellTab,     setBellTab]     = useState("notifications"); // "notifications" | "whats_new" | "preferences"
  // Notification preferences — persisted in localStorage
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vrc_notif_prefs')) || {}; } catch { return {}; }
  });
  const saveNotifPref = (type, enabled) => {
    const next = { ...notifPrefs, [type]: enabled };
    setNotifPrefs(next);
    localStorage.setItem('vrc_notif_prefs', JSON.stringify(next));
  };
  const [releases,    setReleases]    = useState([]);
  const [relLastSeen, setRelLastSeen] = useState(() => localStorage.getItem('vrc_news_seen') || '2000-01-01');
  const [selRelease,  setSelRelease]  = useState(null);
  const bellRef  = useRef(null);
  const [loading,     setLoading]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const ref       = useRef(null);
  const createRef = useRef(null);
  const timer     = useRef(null);

  useEffect(() => {
    const h = (e) => { if (dashRef.current && !dashRef.current.contains(e.target)) setDashOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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

  // Load notifications + release notes — only when authenticated
  useEffect(() => {
    if (!userId) return; // don't fire before login
    const load = async () => {
      try {
        const d = await api.get(`/notifications?limit=30`);
        if (d && Array.isArray(d.notifications)) {
          setNotifs(d.notifications);
          setUnread(d.unread || 0);
        }
      } catch(e) { console.error("notif fetch failed", e); }
      try {
        const rel = await api.get(`/release-notes`);
        setReleases(Array.isArray(rel) ? rel : []);
      } catch(e) {}
    };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [userId]); // re-run after login

  useEffect(() => { const h = e => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? {...n, read_at: new Date().toISOString()} : n));
    setUnread(prev => Math.max(0, prev - 1));
  };
  const markAllRead = async () => {
    await api.patch("/notifications/read-all", { environment_id: selectedEnv?.id });
    setNotifs(prev => prev.map(n => ({...n, read_at: n.read_at || new Date().toISOString()})));
    setUnread(0);
  };
  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    setNotifs(prev => prev.filter(n => n.id !== id));
    setUnread(prev => notifs.find(n=>n.id===id && !n.read_at) ? Math.max(0,prev-1) : prev);
  };

  const NOTIF_ICONS = {
    message_reply:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    interview_today:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    agent_review:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0L9.937 15.5z"/></svg>,
    task_reminder:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    offer_action:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    application_new:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    workflow_blocked: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    mention:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M16 12v1a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>,
  };
  const NOTIF_COLORS = {
    message_reply:"#3b82f6", interview_today:"#0ca678", agent_review:"#8b5cf6",
    task_reminder:"#f59e0b", offer_action:"#10b981", application_new:"#6366f1",
    workflow_blocked:"#ef4444", mention:"#ec4899",
  };
  const relTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000)   return "just now";
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  };

  const search = async (q) => {
    if (!q.trim() || !selectedEnv?.id) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await api.get(`/records/search?q=${encodeURIComponent(q)}&environment_id=${selectedEnv.id}&limit=6`);
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
    <div ref={ref} style={{ position: "relative", zIndex: 1000, flexShrink: 0, background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)", padding: "8px 20px", display: "flex", alignItems: "center", gap: 10 }}>

      {/* Dashboard dropdown */}
      <div ref={dashRef} style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={() => setDashOpen(o => !o)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
          borderRadius: 9, border: `1.5px solid ${dashOpen ? "var(--t-accent)" : "var(--t-border)"}`,
          background: dashOpen ? "var(--t-accent-light, #EEF2FF)" : "var(--t-surface2)",
          color: dashOpen ? "var(--t-accent)" : "var(--t-text2)",
          fontSize: 13, fontWeight: 600, fontFamily: "var(--t-font, inherit)",
          cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Dashboards
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: dashOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {dashOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--t-surface)", borderRadius: 12, border: "1px solid var(--t-border)", boxShadow: "0 8px 32px rgba(0,0,0,.14)", zIndex: 700, overflow: "hidden", minWidth: 190 }}>
            {[
              { id: "overview",    label: "Overview",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, desc: "Hiring summary" },
              { id: "interviews",  label: "Interviews",  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, desc: "Scheduling & pipeline" },
              { id: "offers",      label: "Offers",      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, desc: "Acceptance & approvals" },
        { id: "campaigns",     icon: "zap",  label: "Campaigns" },
              { id: "screening",   label: "Screening",   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/></svg>, desc: "Candidates & AI review" },
              { id: "onboarding",  label: "Onboarding",  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, desc: "Pre & post start" },
              { id: "admin",       label: "Admin Stats", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, desc: "Platform stats" },
              { id: "insights",    label: "Insights",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg>, desc: "Predictive analytics" },
              { id: "custom",      label: "My Dashboards", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="4"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="10" width="7" height="7"/></svg>, desc: "Custom dashboards" },
            ].map(item => {
              const active = activeDashTab === item.id || (!activeDashTab && item.id === "overview");
              return (
                <div key={item.id} onClick={() => { onDashboardNav(item.id); setDashOpen(false); }}
                  style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    background: active ? "var(--t-accent-light, #EEF2FF)" : "transparent",
                    transition: "background .1s" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--t-surface2)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ color: active ? "var(--t-accent)" : "var(--t-text3)", display: "flex", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--t-accent)" : "var(--t-text1)" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--t-text3)" }}>{item.desc}</div>
                  </div>
                  {active && <svg style={{ marginLeft: "auto" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-accent)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search — capped width */}
      <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
        {/* Input */}
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder="Search candidates, jobs, talent pools…"
          style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 10, border: `1.5px solid ${open ? "var(--t-accent)" : "var(--t-border)"}`, fontSize: 13, fontFamily: "var(--t-font, 'Geist', sans-serif)", outline: "none", background: "var(--t-surface2)", color: "var(--t-text1)", boxSizing: "border-box", transition: "border-color .15s" }}
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
      {/* Create dropdown — sits right of search */}
      <div ref={createRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            border: "none", background: showCreate ? "var(--t-accent-dark, #3451d1)" : "var(--t-accent)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--t-font, 'Geist', sans-serif)",
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

      {/* ── Right group: Calendar + Bell + History ── */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto", flexShrink:0, borderLeft:"1px solid var(--t-border)", paddingLeft:10 }}>

        {/* Calendar — pill style matching history */}
        <button onClick={() => onNavigateToCalendar?.()} title="Calendar"
          style={{ display:"flex", alignItems:"center", gap:5, height:34, borderRadius:8,
            border:"1px solid var(--t-border)", padding:"0 10px 0 8px",
            background:"var(--t-surface2)", color:"var(--t-text2)",
            cursor:"pointer", transition:"all .12s", fontSize:12, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap" }}
          onMouseEnter={e=>{ e.currentTarget.style.background="var(--t-accent-light,#eef2ff)"; e.currentTarget.style.color="var(--t-accent)"; e.currentTarget.style.borderColor="var(--t-accent)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="var(--t-surface2)"; e.currentTarget.style.color="var(--t-text2)"; e.currentTarget.style.borderColor="var(--t-border)"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendar
        </button>

        {/* What's New — pill style */}
        <div ref={bellRef} style={{ position:"relative" }}>
          <button onClick={() => setBellOpen(o => !o)} title="Notifications & What's New"
            style={{ display:"flex", alignItems:"center", gap:5, height:34, borderRadius:8,
              border:`1px solid ${bellOpen ? "var(--t-accent)" : "var(--t-border)"}`,
              padding:"0 10px 0 8px", position:"relative",
              background: bellOpen ? "var(--t-accent-light,#eef2ff)" : "var(--t-surface2)",
              color: bellOpen ? "var(--t-accent)" : "var(--t-text2)",
              cursor:"pointer", transition:"all .12s", fontSize:12, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap" }}
            onMouseEnter={e=>{ if(!bellOpen){ e.currentTarget.style.background="var(--t-accent-light,#eef2ff)"; e.currentTarget.style.color="var(--t-accent)"; e.currentTarget.style.borderColor="var(--t-accent)"; } }}
            onMouseLeave={e=>{ if(!bellOpen){ e.currentTarget.style.background="var(--t-surface2)"; e.currentTarget.style.color="var(--t-text2)"; e.currentTarget.style.borderColor="var(--t-border)"; } }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            Updates
            {/* Dot indicator — only shows when there's something unread */}
            {(unread + releases.filter(r => new Date(r.published_at) > new Date(relLastSeen)).length) > 0 && (
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444",
                border:"1.5px solid var(--t-surface)", flexShrink:0 }} />
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:380, maxHeight:520, background:"var(--t-surface)", border:"1px solid var(--t-border)", borderRadius:14, boxShadow:"0 12px 40px rgba(0,0,0,.18)", zIndex:700, display:"flex", flexDirection:"column", overflow:"hidden" }}>

              {/* Tab strip */}
              {(() => {
                const newReleases = releases.filter(r => new Date(r.published_at) > new Date(relLastSeen)).length;
                return (
                  <div style={{ display:"flex", borderBottom:"1px solid var(--t-border)", background:"var(--t-surface2)" }}>
                    {[
                      { id:"notifications", label:"Notifications", badge: unread },
                      { id:"whats_new",     label:"What's New",    badge: newReleases },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => {
                        setBellTab(tab.id);
                        if (tab.id === "whats_new") {
                          const now = new Date().toISOString();
                          localStorage.setItem('vrc_news_seen', now);
                          setRelLastSeen(now);
                          setSelRelease(null);
                        }
                      }} style={{
                        flex:1, padding:"10px 12px", border:"none", background:"transparent",
                        cursor:"pointer", fontSize:12, fontWeight: bellTab===tab.id ? 700 : 500,
                        color: bellTab===tab.id ? "var(--t-accent,#4361EE)" : "var(--t-text3,#6B7280)",
                        borderBottom: bellTab===tab.id ? "2px solid var(--t-accent,#4361EE)" : "2px solid transparent",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                        fontFamily:"var(--t-font,'Geist',sans-serif)", transition:"all .12s",
                      }}>
                        {tab.label}
                        {tab.badge > 0 && (
                          <span style={{ minWidth:16, height:16, borderRadius:99, background: bellTab===tab.id ? "var(--t-accent,#4361EE)" : "#6b7280", color:"white", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                            {tab.badge > 9 ? "9+" : tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Notifications tab */}
              {bellTab === "notifications" && (
                <>
                  {unread > 0 && (
                    <div style={{ padding:"8px 14px 6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, color:"var(--t-text3)" }}>{unread} unread</span>
                      <button onClick={markAllRead} style={{ fontSize:11, color:"var(--t-accent)", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:"2px 6px", borderRadius:5 }}>Mark all read</button>
                    </div>
                  )}
                  <div style={{ overflowY:"auto", flex:1 }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--t-text3)", fontSize:12 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                        All caught up!
                      </div>
                    ) : (() => {
                      // Time-group notifications
                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
                      const yestStart  = todayStart - 86400000;
                      const weekStart  = todayStart - 6*86400000;
                      const groups = [
                        { label:"Today",     items: notifs.filter(n=>new Date(n.created_at).getTime()>=todayStart) },
                        { label:"Yesterday", items: notifs.filter(n=>{const t=new Date(n.created_at).getTime();return t>=yestStart&&t<todayStart;}) },
                        { label:"This week", items: notifs.filter(n=>{const t=new Date(n.created_at).getTime();return t>=weekStart&&t<yestStart;}) },
                        { label:"Earlier",   items: notifs.filter(n=>new Date(n.created_at).getTime()<weekStart) },
                      ].filter(g=>g.items.length>0);

                      // Inline action map
                      const NOTIF_ACTIONS = {
                        interview_today:  { label:"View interview",  fn:(n)=>{ setBellOpen(false); window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:n.record_id,objectId:n.object_id}})); } },
                        application_new:  { label:"View candidate",  fn:(n)=>{ setBellOpen(false); window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:n.record_id,objectId:n.object_id}})); } },
                        offer_action:     { label:"View offer",      fn:(n)=>{ setBellOpen(false); setActiveNav("offers"); } },
                        workflow_blocked: { label:"Review workflow",  fn:(n)=>{ setBellOpen(false); setActiveNav("workflows"); } },
                        agent_review:     { label:"Review agent",     fn:(n)=>{ setBellOpen(false); setActiveNav("agents"); } },
                        stage_change:     { label:"View candidate",  fn:(n)=>{ setBellOpen(false); window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:n.record_id,objectId:n.object_id}})); } },
                        scorecard_submitted:{ label:"View scorecard",fn:(n)=>{ setBellOpen(false); window.dispatchEvent(new CustomEvent("talentos:openRecord",{detail:{recordId:n.record_id,objectId:n.object_id}})); } },
                      };

                      return groups.map(group => (
                        <div key={group.label}>
                          <div style={{ padding:"8px 14px 4px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".06em", background:"#f9fafb", borderBottom:"1px solid #f3f4f6" }}>
                            {group.label}
                          </div>
                          {group.items.map(n => {
                            const color    = NOTIF_COLORS[n.type] || "#6b7280";
                            const icon     = NOTIF_ICONS[n.type]  || null;
                            const isUnread = !n.read_at;
                            const action   = NOTIF_ACTIONS[n.type];
                            return (
                              <div key={n.id} onClick={() => { if(isUnread) markRead(n.id); }}
                                style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px", borderBottom:"1px solid #f3f4f6", cursor:"pointer", background: isUnread ? `${color}08` : "transparent", transition:"background .1s" }}
                                onMouseEnter={e=>{ e.currentTarget.style.background = isUnread ? `${color}14` : "#f9fafb"; }}
                                onMouseLeave={e=>{ e.currentTarget.style.background = isUnread ? `${color}08` : "transparent"; }}>
                                <div style={{ width:30, height:30, borderRadius:9, background:`${color}18`, color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                                  {icon}
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                                    <span style={{ fontSize:12, fontWeight: isUnread ? 700 : 500, color:"#111827", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.title}</span>
                                    {isUnread && <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>}
                                  </div>
                                  <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.45, marginBottom:n.count>1||action?5:0 }}>{n.body}</div>
                                  {n.count>1 && <div style={{ fontSize:10, color:color, fontWeight:700, marginBottom:4 }}>+{n.count-1} more like this</div>}
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <span style={{ fontSize:10, color:"#9ca3af" }}>{relTime(n.created_at)}</span>
                                    {action && <button onClick={e=>{e.stopPropagation();markRead(n.id);action.fn(n);}}
                                      style={{ fontSize:10, fontWeight:700, color:color, background:`${color}12`, border:`1px solid ${color}25`, borderRadius:6, padding:"2px 8px", cursor:"pointer", fontFamily:"inherit" }}>
                                      {action.label} →
                                    </button>}
                                  </div>
                                </div>
                                <button onClick={e=>deleteNotif(n.id,e)}
                                  style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px", color:"#d1d5db", borderRadius:4, fontSize:16, lineHeight:1, flexShrink:0 }}
                                  onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";}}
                                  onMouseLeave={e=>{e.currentTarget.style.color="#d1d5db";}}>×</button>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}

              {/* What's New tab */}
              {bellTab === "whats_new" && (
                <div style={{ overflowY:"auto", flex:1 }}>
                  {selRelease ? (
                    /* Detail view */
                    (() => {
                      const CAT = { feature:{label:"New Feature",color:"var(--t-accent,#4361EE)",bg:"var(--t-accent-light,#EEF2FF)"}, improvement:{label:"Improvement",color:"#0CAF77",bg:"#F0FDF4"}, fix:{label:"Bug Fix",color:"#F59F00",bg:"#FFFBEB"}, security:{label:"Security",color:"#EF4444",bg:"#FEF2F2"} };
                      const meta = CAT[selRelease.category] || CAT.feature;
                      return (
                        <div>
                          <div style={{ padding:"11px 14px", borderBottom:"1px solid var(--t-border)", display:"flex", alignItems:"center", gap:8 }}>
                            <button onClick={() => setSelRelease(null)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:4, color:"var(--t-text3)" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            </button>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text1)" }}>{selRelease.title}</div>
                              <div style={{ fontSize:11, color:"var(--t-text3)" }}>v{selRelease.version}</div>
                            </div>
                            <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:99, background:meta.bg, color:meta.color }}>{meta.label}</span>
                          </div>
                          <div style={{ padding:"14px 16px" }}>
                            <div style={{ fontSize:11, color:"var(--t-text3)", marginBottom:10 }}>
                              {new Date(selRelease.published_at).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                            </div>
                            {selRelease.summary && (
                              <div style={{ fontSize:13, color:"var(--t-text2)", lineHeight:1.6, marginBottom:14, padding:"10px 12px", background:"var(--t-bg,#f7f8fc)", borderRadius:8 }}>
                                {selRelease.summary}
                              </div>
                            )}
                            {selRelease.features?.length > 0 && (
                              <div>
                                <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>What's included</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                  {selRelease.features.map((f,i) => (
                                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:"var(--t-text2)", lineHeight:1.5 }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}><path d="M20 6L9 17l-5-5"/></svg>
                                      {f}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* List view */
                    releases.length === 0 ? (
                      <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--t-text3)", fontSize:12 }}>No release notes yet.</div>
                    ) : releases.map(note => {
                      const CAT = { feature:{color:"var(--t-accent,#4361EE)",bg:"var(--t-accent-light,#EEF2FF)"}, improvement:{color:"#0CAF77",bg:"#F0FDF4"}, fix:{color:"#F59F00",bg:"#FFFBEB"}, security:{color:"#EF4444",bg:"#FEF2F2"} };
                      const meta = CAT[note.category] || CAT.feature;
                      const isNew = new Date(note.published_at) > new Date(relLastSeen);
                      return (
                        <div key={note.id} onClick={() => setSelRelease(note)}
                          style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderBottom:"1px solid var(--t-border)", cursor:"pointer", background: isNew ? "#FAFBFF" : "transparent", transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--t-accent-light,#EEF2FF)"}
                          onMouseLeave={e=>e.currentTarget.style.background=isNew?"#FAFBFF":"transparent"}>
                          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="1.8"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2"/></svg>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:"var(--t-text1)", flex:1 }}>{note.title}</span>
                              {isNew && <span style={{ fontSize:9, fontWeight:700, padding:"2px 5px", background:"var(--t-accent,#4361EE)", color:"#fff", borderRadius:99 }}>NEW</span>}
                            </div>
                            <div style={{ fontSize:11, color:"var(--t-text3)", marginBottom:3 }}>v{note.version} · {new Date(note.published_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                            <div style={{ fontSize:12, color:"var(--t-text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.summary}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* History slot — rendered inside the sticky bar */}
        {historySlot}

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
            <div style={{ fontSize:14,fontWeight:700,color:"var(--t-text1)", fontFamily:"'Space Grotesk', sans-serif" }}>Appearance</div>
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
function RecordPage({ recordId, objectId, environment, allObjects, onBack, onNavigate, onHistoryUpdate, onRecordLoad }) {
  const [state, setState] = useState(null); // { record, fields, object }
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!recordId || !objectId) return;
    let obj = allObjects?.find(o => o.id === objectId);
    if (!obj) {
      const objs = await api.get(`/objects?environment_id=${environment?.id}`);
      obj = Array.isArray(objs) ? objs.find(o => o.id === objectId) : null;
    }
    if (!obj) { setLoading(false); return; }
    const [recResp, fields] = await Promise.all([
      api.get(`/records/${recordId}`),
      api.get(`/fields?object_id=${objectId}&environment_id=${environment?.id}`),
    ]);
    const record = recResp?.id ? recResp : null;
    if (!record) { setLoading(false); return; }
    setState({ record, fields: Array.isArray(fields) ? fields : [], object: obj });
    setLoading(false);
    if (onRecordLoad) onRecordLoad(record, obj);
    if (onHistoryUpdate) {
      const d = record.data || {};
      const label = [d.first_name, d.last_name].filter(Boolean).join(" ")
        || d.job_title || d.name || d.pool_name || "Untitled";
      const subtitle = d.current_title || d.department || d.category || "";
      onHistoryUpdate({ id: recordId, nav: `record_${recordId}_${objectId}`,
        label, subtitle, type: "record",
        objectName: obj.plural_name || obj.name, objectColor: obj.color || "#4361EE" });
    }
  }, [recordId, objectId, environment?.id]);

  // Initial load
  useEffect(() => { setLoading(true); load(); }, [load]);

  // Reload when Copilot updates this record
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.recordId === recordId) load();
    };
    window.addEventListener('talentos:recordUpdated', handler);
    return () => window.removeEventListener('talentos:recordUpdated', handler);
  }, [recordId, load]);

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
  // ── ALL hooks must be called unconditionally before any early returns ────────
  const { TourPortal, startTour } = useTour();
  const { prefs, update } = useTheme();
  const { t, isRTL } = useI18n();

  // ── Route detection (non-hook, safe before returns) ──────────────────────────
  const _path = window.location.pathname;
  const _appRoutes = /^\/(hub|support|superadmin|availability|bot|interview|api|dashboard|dashboard_custom|dashboard_interviews|dashboard_offers|dashboard_screening|dashboard_onboarding|dashboard_admin|dashboard_agents|dashboard_insights|people|jobs|talent-pools|search|interviews|offers|sourcing|campaign-links|campaigns|reports|insights|calendar|org-chart|org_chart|settings|workflows|portals|inbox|admin_stats|admin-stats|client-hub|client_hub|help|matching|record|chat|documents|agents|integrations|orgchart|org.chart|app|schema|overview|onboarding|screening)(\/|$)/;

  // Candidate Hub — magic-link auth, completely separate from admin app
  if (_path.startsWith('/hub')) return <CandidateHub />;

  // Client support portal — must be before the portal slug fallback
  if (_path === '/support' || _path.startsWith('/support/')) return <SupportPortalPage />;

  // /portal/{slug} is the canonical public portal URL.
  // vercel.json gives /portal/* an explicit SPA rewrite and public cache headers.
  // All portal API calls go through /api/portal-public/* which is fully auth-exempt.
  const portalSlug = _path.match(/^\/portal\/(.+)$/)?.[1];
  if (portalSlug) return <PortalApp slug={portalSlug}/>;

  // Legacy fallback: bare slug URLs (e.g. /careers) also resolve as portals.
  // Limited to single-segment paths only so mis-typed app routes don't silently
  // render as an empty portal page.
  if (_path !== '/' && !_appRoutes.test(_path)) {
    const segments = _path.replace(/^\//, '').split('/');
    const cleanSlug = segments[0];
    if (cleanSlug && !cleanSlug.includes('.') && segments.length <= 2) {
      return <PortalApp slug={cleanSlug}/>;
    }
  }
    if (_path === '/superadmin') return <SuperAdminConsole />;
  if (_path.startsWith('/availability/')) {
    return <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"sans-serif",color:"#9ca3af"}}>Loading…</div>}><AvailabilityPickerPage/></Suspense>;
  }
  const botToken = _path.match(/^\/bot\/(.+)$/)?.[1];
  if (botToken) return <BotInterview token={botToken} />;

  // If the subdomain doesn't match the stored session's tenant_slug,
  // clear the stale session so the user is prompted to log in fresh.
  // This prevents cross-tenant bleed when a user visits a different subdomain.
  const [session, setSession] = useState(() => {
    const sess = getSession();
    const subdomainSlug = getTenantSlug();
    if (sess && subdomainSlug) {
      const sessionTenant = sess.tenant_slug || null;
      // Clear if: session belongs to a different tenant, OR session has no tenant_slug
      // (master admin) but we're on a tenant subdomain — master users can't access tenant apps
      if (sessionTenant !== subdomainSlug) {
        try { localStorage.removeItem('talentos_session'); } catch {}
        return null;
      }
    }
    return sess;
  });
  const isMobile = useIsMobile();
  const userId = session?.user?.id || null;

  // Handle ?impersonate=TOKEN — exchange for a real session then strip the param from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const impToken = params.get('impersonate');
    if (!impToken) return;
    // Strip the token from the URL immediately (don't show it in the bar)
    const cleanUrl = window.location.pathname + (params.toString().replace(/[?&]?impersonate=[^&]*/,'').replace(/^&/,'?') || '');
    window.history.replaceState({}, '', cleanUrl);

    fetch('/api/users/exchange-impersonation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: impToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { console.warn('Impersonation failed:', data.error); return; }
        const sessionData = {
          user: { id: data.id, email: data.email, first_name: data.first_name, last_name: data.last_name,
                  environment_id: data.environment_id, role_id: data.role_id },
          role: data.role,
          permissions: data.permissions || [],
          tenant_slug: data.tenant_slug,
        };
        try { localStorage.setItem('talentos_session', JSON.stringify(sessionData)); } catch {}
        setSession(sessionData);
      })
      .catch(err => console.error('Impersonation exchange error:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Permission helpers using session (App renders PermissionProvider so cannot consume it directly)
  const _sessionRole = session?.role?.slug;
  const _sessionPerms = session?.permissions || [];
  const canGlobal = (action) => {
    if (!session) return false;
    if (_sessionRole === "super_admin") return true;
    return _sessionPerms.some(p => p.object_slug === "__global__" && p.action === action && p.allowed);
  };
  const can = (objectSlug, action) => {
    if (!session) return false;
    if (_sessionRole === "super_admin") return true;
    return _sessionPerms.some(p => p.object_slug === objectSlug && p.action === action && p.allowed);
  };
  const [environments, setEnvironments] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [allObjects, setAllObjects] = useState([]);
  // ── URL-based routing helpers ──────────────────────────────────────────────
  // Convert a URL path to an activeNav value (called on mount + popstate)
  const navFromPath = (path, objects = []) => {
    if (!path || path === '/') return 'dashboard';
    const parts = path.replace(/^\//, '').split('/');
    const seg0 = parts[0];
    const seg1 = parts[1];
    // /record/:objectSlug/:recordId  (deep link to a specific record)
    if (seg0 === 'record' && seg1 && parts[2]) return `record_${parts[2]}_${seg1}`;
    // /:objectSlug/:number  (clean numeric URL e.g. /people/42)
    if (seg1 && /^\d+$/.test(seg1)) {
      return `resolve_${seg0}_${seg1}`;
    }
    // /:objectSlug/:recordId  (UUID form — look up object id from slug)
    if (seg1 && seg1.length > 8) {
      const obj = objects.find(o => o.slug === seg0);
      if (obj) return `record_${seg1}_${obj.id}`;
    }
    // /:objectSlug  (list view)
    const obj = objects.find(o => o.slug === seg0);
    if (obj) return `obj_${obj.id}`;
    // Named pages (settings sub-pages use seg0 only — section handled inside Settings)
    const named = [
      'dashboard','dashboard_interviews','dashboard_offers','dashboard_agents',
      'dashboard_screening','dashboard_onboarding','dashboard_admin','dashboard_custom',
      'dashboard_insights',
      'search','interviews','offers','reports','calendar',
      'org-chart','org_chart','settings','workflows','portals',
      'inbox','admin_stats','admin-stats','client-hub','client_hub',
      'help','matching',
    ];
    if (named.includes(seg0)) return seg0;
    return 'dashboard';
  };

  // Convert an activeNav value to a URL path
  const pathFromNav = (nav, objects = []) => {
    if (!nav || nav === 'dashboard') return '/dashboard';
    if (nav.startsWith('record_')) {
      const [, recordId, objectId] = nav.split('_');
      const obj = objects.find(o => o.id === objectId);
      const slug = obj?.slug || objectId;
      return `/${slug}/${recordId}`;
    }
    if (nav.startsWith('obj_')) {
      const objectId = nav.replace('obj_', '');
      const obj = objects.find(o => o.id === objectId);
      return obj ? `/${obj.slug}` : '/';
    }
    return `/${nav}`;
  };

  const [activeNav, setActiveNav] = useState(() => navFromPath(window.location.pathname));
  const activeNavRef = useRef(activeNav);
  // Keep activeNavRef in sync — used by effects that need current activeNav without re-registering
  useEffect(() => { activeNavRef.current = activeNav; });
  // ── Collapsible sidebar ──
  const [navCollapsed, setNavCollapsed] = useState(
    () => localStorage.getItem('vrc_nav_collapsed') === 'true'
  );
  const [navHovered, setNavHovered] = useState(false);
  const navExpanded = !navCollapsed || navHovered;
  const NAV_W = navExpanded ? 220 : 56;
  const toggleNav = () => {
    setNavCollapsed(v => {
      const next = !v;
      localStorage.setItem('vrc_nav_collapsed', String(next));
      return next;
    });
    setNavHovered(false);
  };
  const { history: navHistory, pinned, push: pushHistory, clear: clearHistory, togglePin, isPinned } = useHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copilotDocked, setCopilotDocked] = useState(false);
  const [dashBuilderMode, setDashBuilderMode] = useState(false);
  const [navObjects, setNavObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);
  const [showTheme, setShowTheme] = useState(false);
  const [filterPreset, setFilterPreset] = useState(null);
  const [reportPreset, setReportPreset] = useState(null);
  const [createTarget, setCreateTarget] = useState(null); // obj to auto-open new record modal
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    if (apiOnline !== true) return;
    // Re-runs when userId changes (i.e. after login) so we always fetch
    // environments in the correct tenant context.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOnline, userId]);

  useEffect(() => {
    if (!selectedEnv?.id) return;
    api.get(`/objects?environment_id=${selectedEnv.id}`).then(d => {
      const objs = Array.isArray(d) ? d : [];
      setNavObjects(objs);
      // Re-resolve activeNav now that we have objects — handles direct URL loads
      // Only update if the URL genuinely points somewhere different from current nav
      const resolved = navFromPath(window.location.pathname, objs);
      if (resolved !== activeNavRef.current) {
        setActiveNav(resolved);
      }
    });
  }, [selectedEnv?.id]);

  // Persist session context for error reporter
  useEffect(() => {
    if (session?.user && selectedEnv) {
      sessionStorage.setItem('talentos_session', JSON.stringify({
        user: { id: session.user.id, email: session.user.email },
        environment: { id: selectedEnv.id, name: selectedEnv.name },
      }));
    }
  }, [session?.user?.id, selectedEnv?.id]);

  // First-run company setup wizard
  useEffect(() => {
    if (!selectedEnv?.id) return;
    const key = `talentos_setup_complete_${selectedEnv.id}`;
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setShowSetupWizard(true), 1200);
      return () => clearTimeout(t);
    }
  }, [selectedEnv?.id]);

  // Manual launch from Settings
  useEffect(() => {
    const handler = () => setShowSetupWizard(true);
    window.addEventListener('talentos:launch-setup-wizard', handler);
    return () => window.removeEventListener('talentos:launch-setup-wizard', handler);
  }, []);

  const inboxUnread = useInboxUnreadCount(selectedEnv?.id);

  const OBJECT_ICONS = { people: "users", jobs: "briefcase", "talent-pools": "layers" };

  const navSections = [
    {
      label: t("nav.overview"),
      items: [
        { id: "inbox",       icon: "inbox",   label: "Inbox", badge: inboxUnread || null },
      ]
    },
    {
      label: t("nav.recruit"),
      items: navObjects.map(o => ({ id: `obj_${o.id}`, icon: OBJECT_ICONS[o.slug] || "database", label: o.plural_name, object: o }))
    },
    {
      label: t("nav.tools"),
      items: [
        { id: "interviews",  icon: "calendar",     label: t("nav.interviews") },
        { id: "calendar",    icon: "calendar-days", label: t("nav.calendar") },
        { id: "sourcing",    icon: "sparkles",     label: "Sourcing Hub" },
        { id: "offers",      icon: "dollar",       label: t("nav.offers") || "Offers" },
        { id: "campaigns",     icon: "zap",       label: "Campaigns" },
        { id: "chat",        icon: "message-circle", label: "Chat" },
        { id: "documents",   icon: "file-text",    label: "Documents" },
        ...(selectedEnv?.tags && String(selectedEnv.tags).toLowerCase().includes('rpo')
          ? [{ id: "client-hub", icon: "building", label: "Client Hub" }]
          : []),
        { id: "reports",     icon: "bar-chart-2",  label: t("nav.reports") },
        { id: "search",      icon: "search",       label: t("nav.search") },
      ]
    },
    // configure section removed — Help + Settings are in the user footer menu
  ];

  // Filter nav items the user cannot access
  const filteredNavSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (['dashboard','dashboard_interviews','dashboard_offers','dashboard_agents','dashboard_admin','dashboard_screening','dashboard_onboarding','dashboard_custom','dashboard_insights'].includes(item.id))
        return canGlobal('access_dashboard');
      if (item.id === 'org_chart')  return canGlobal('access_org_chart');
      if (item.id === 'interviews') return canGlobal('access_interviews');
      if (item.id === 'offers')     return canGlobal('access_offers');
      if (item.id === 'reports')    return canGlobal('access_reports');
      if (item.id === 'search')     return canGlobal('access_search');
      if (item.id === 'calendar')   return canGlobal('access_calendar');
      if (item.id === 'settings')   return canGlobal('manage_settings');
      return true;
    })
  })).filter(section => section.items.length > 0);

  // When on a record page, extract the parent object id for nav highlighting
  const activeObjectId = activeNav.startsWith("record_") ? activeNav.split("_")[2] : null;

  const switchNav = (id) => {
    if (!id.startsWith("obj_") || id !== activeNav) setFilterPreset(null);
    if (id !== "reports") setReportPreset(null);

    if (!id.startsWith("record_")) { setActiveRecord(null); setActiveRecordObj(null); }
    if (!id.startsWith("obj_") && !id.startsWith("record_")) { setListContext(null); }
    const NAV_META = {
      dashboard:            { label: "Dashboard",   objectName: "Overview",   objectColor: "#4361EE" },
      dashboard_interviews: { label: "Interviews",  objectName: "Dashboard",  objectColor: "#0891b2" },
      dashboard_offers:     { label: "Offers",      objectName: "Dashboard",  objectColor: "#059669" },
      dashboard_agents:     { label: "Agents",      objectName: "Dashboard",  objectColor: "#7c3aed" },
      dashboard_custom:     { label: "Dashboards",  objectName: "Dashboard",  objectColor: "#4f46e5" },
      dashboard_insights:   { label: "Insights",    objectName: "Dashboard",  objectColor: "#7F77DD" },
      search:               { label: "Search",      objectName: "Search",     objectColor: "#7c3aed" },
      interviews:           { label: "Interviews",  objectName: "Scheduling", objectColor: "#0891b2" },
      offers:               { label: "Offers",      objectName: "Offers",     objectColor: "#059669" },
      reports:              { label: "Reports",     objectName: "Reports",    objectColor: "#d97706" },
      calendar:             { label: "Calendar",    objectName: "Calendar",   objectColor: "#0891b2" },
      "org-chart":          { label: "Org Chart",   objectName: "People",     objectColor: "#7c3aed" },
    };
    if (NAV_META[id]) {
      pushHistory({ id: `nav_${id}`, nav: id, type: "nav", ...NAV_META[id] });
    } else if (id.startsWith("obj_")) {
      const obj = navObjects?.find(o => `obj_${o.id}` === id);
      if (obj) pushHistory({ id: `nav_${id}`, nav: id, type: "nav",
        label: obj.plural_name || obj.name, objectName: "List", objectColor: obj.color || "#4361EE" });
    }
    // Push URL
    const url = pathFromNav(id, navObjects || []);
    if (window.location.pathname !== url) window.history.pushState({ nav: id }, '', url);
    // Reset dashboard builder mode when navigating away from dashboard
    if (!id.startsWith("dashboard_")) setDashBuilderMode(false);
    if (id.startsWith("obj_") && (activeNav === id || activeNav.startsWith("record_"))) {
      setActiveNav("__reset__");
      setTimeout(() => { setActiveNav(id); setSelectedObject(null); }, 0);
    } else {
      setActiveNav(id);
      setSelectedObject(null);
    }
  };

  const navigateToHistoryEntry = (entry) => {
    if (entry.type === "record" && entry.nav?.startsWith("record_")) {
      const parts = entry.nav.split("_");
      openRecord(parts[1], parts[2]);
    } else if (entry.nav) {
      switchNav(entry.nav);
    }
  };

  // Track active record for copilot context
  const [activeRecord,    setActiveRecord]    = useState(null); // { id, data, object }
  const [activeRecordObj, setActiveRecordObj] = useState(null);
  const [listContext,     setListContext]     = useState(null); // current list summary for copilot

  const openRecord = (recordId, objectId) => {
    const nav = `record_${recordId}_${objectId}`;
    setActiveNav(nav);
    // Push URL: /people/abc123
    const obj = navObjects?.find(o => o.id === objectId);
    const slug = obj?.slug || objectId;
    const url = `/${slug}/${recordId}`;
    if (window.location.pathname !== url) window.history.pushState({ nav }, '', url);
    // Push placeholder to history — label updated by RecordPage once loaded
    if (recordId && obj) {
      pushHistory({
        id: recordId,
        nav,
        type: "record",
        objectName: obj.plural_name || obj.name,
        objectColor: obj.color || "#4361EE",
        label: "…",
        subtitle: "",
      });
    }
  };

  // Handle browser back / forward buttons
  useEffect(() => {
    const handler = (e) => {
      const nav = e.state?.nav || navFromPath(window.location.pathname, navObjects || []);
      setActiveNav(nav);
      setSelectedObject(null);
      // Clear stale record context when navigating away from record pages
      if (!nav.startsWith("record_")) {
        setActiveRecord(null);
        setActiveRecordObj(null);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [navObjects]);
  // Resolve numeric URL tokens (e.g. /people/42) to full record UUIDs
  useEffect(() => {
    if (!activeNav?.startsWith('resolve_')) return;
    if (!selectedEnv || !navObjects?.length) return;
    const [, slug, number] = activeNav.split('_');
    if (!slug || !number) { setActiveNav('dashboard'); return; }
    fetch(`/api/records/by-number?object_slug=${slug}&number=${number}&environment_id=${selectedEnv.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(rec => {
        if (!rec?.id) { setActiveNav('dashboard'); return; }
        openRecord(rec.id, rec.object_id);
      })
      .catch(() => setActiveNav('dashboard'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav, selectedEnv?.id, navObjects?.length]);



  // Keep refs so event listeners always call the latest version — prevents stale closure bugs
  const openRecordRef = useRef(openRecord);
  useEffect(() => { openRecordRef.current = openRecord; });
  const switchNavRef = useRef(switchNav);
  useEffect(() => { switchNavRef.current = switchNav; });

  // Global event listener — anything can fire talentos:openRecord to navigate to a record page
  useEffect(() => {
    const handler = (e) => {
      const { recordId, objectId } = e.detail || {};
      if (recordId && objectId) openRecordRef.current(recordId, objectId);
    };
    window.addEventListener("talentos:openRecord", handler);
    return () => window.removeEventListener("talentos:openRecord", handler);
  }, []); // safe — uses ref, not stale closure

  const reportNavRef = useRef(null);
  reportNavRef.current = { navObjects, activeNav, setReportPreset, setActiveNav };
  // Global event listener — dashboard fires talentos:open-report to open Reports with a preset
  useEffect(() => {
    const handler = (e) => {
      const { objectSlug: slugA, object: slugB, objectId: oidA, ...config } = e.detail || {};
      const objectSlug = slugA || slugB;
      const { navObjects: objs, activeNav: nav, setReportPreset: srp, setActiveNav: sna } = reportNavRef.current;
      const obj = objectSlug ? objs.find(o => o.slug === objectSlug || o.name?.toLowerCase() === objectSlug?.toLowerCase()) : null;
      // Preserve all identifiers so Reports.jsx can resolve the object
      const preset = {
        objectId:   oidA || obj?.id,
        objectSlug: objectSlug || obj?.slug,
        object:     slugB || objectSlug,   // Reports.jsx legacy lookup key
        ...config,
      };
      if (nav === "reports") {
        srp(null);
        setTimeout(() => srp(preset), 0);
      } else {
        srp(preset);
        sna("reports");
      }
    };
    window.addEventListener("talentos:open-report", handler);
    return () => window.removeEventListener("talentos:open-report", handler);
  }, []);

  // Listen for list context updates broadcast from RecordsView
  useEffect(() => {
    const handler = (e) => setListContext(e.detail || null);
    window.addEventListener("talentos:list-context", handler);
    return () => window.removeEventListener("talentos:list-context", handler);
  }, []);

  // talentos:navigate — generic nav event (e.g. "← Dashboard" back button)
  useEffect(() => {
    const handler = (e) => { if (e.detail) switchNavRef.current(e.detail); };
    window.addEventListener("talentos:navigate", handler);
    return () => window.removeEventListener("talentos:navigate", handler);
  }, []);
  const filterNavRef = useRef(null);
  filterNavRef.current = { activeNav, navObjects, setFilterPreset, setActiveNav };
  useEffect(() => {
    const handler = (e) => {
      const { fieldKey, fieldLabel, fieldValue, fieldDisplay, objectSlug } = e.detail || {};
      if (!fieldKey || fieldValue === undefined) return;
      const { activeNav: nav, navObjects: objs, setFilterPreset: sfp, setActiveNav: sna } = filterNavRef.current;
      sfp({ fieldKey, fieldLabel, fieldValue, fieldDisplay });
      // If objectSlug provided (e.g. from dashboard), navigate to that object
      if (objectSlug) {
        const obj = objs.find(o => o.slug === objectSlug);
        if (obj) { sna(`obj_${obj.id}`); return; }
      }
      if (nav.startsWith("record_")) {
        const objectId = nav.split("_")[2];
        sna(`obj_${objectId}`);
      }
    };
    window.addEventListener("talentos:filter-navigate", handler);
    return () => window.removeEventListener("talentos:filter-navigate", handler);
  }, []);

  // Copilot dock state — shrink content area when docked as sidebar
  useEffect(() => {
    const handler = (e) => setCopilotDocked(e.detail?.docked ?? false);
    window.addEventListener("talentos:copilot-dock", handler);
    return () => window.removeEventListener("talentos:copilot-dock", handler);
  }, []);

  // Bulk interview — navigate to Interviews and pre-fill candidates
  useEffect(() => {
    const handler = (e) => {
      const { candidates } = e.detail || {};
      // Store candidates for Interviews page to pick up
      if (candidates?.length) {
        sessionStorage.setItem("talentos_bulk_interview_candidates", JSON.stringify(candidates));
      }
      setActiveNav("interviews");
    };
    window.addEventListener("talentos:bulkInterview", handler);
    return () => window.removeEventListener("talentos:bulkInterview", handler);
  }, []);

  // Navigate to People list filtered to specific person IDs (from pipeline widget)
  useEffect(() => {
    const handler = (e) => {
      const { personIds, label } = e.detail || {};
      if (!personIds?.length) return;
      const { navObjects: objs, setFilterPreset: sfp, setActiveNav: sna } = filterNavRef.current;
      const peopleObj = objs.find(o => o.slug === 'people' || o.name?.toLowerCase() === 'person' || o.slug?.includes('people'));
      if (!peopleObj) return;
      sfp({ fieldKey: '__ids__', fieldValue: personIds.join(','), label: label || 'Pipeline filter' });
      sna(`obj_${peopleObj.id}`);
    };
    window.addEventListener("talentos:open-people-list", handler);
    return () => window.removeEventListener("talentos:open-people-list", handler);
  }, []);

  // Show login page if no session
  if (!session) {
    return <LoginPage onLogin={(s) => setSession(s)} />;
  }

  // Auto-detect mobile and serve the mobile recruiter shell
  if (isMobile && session) {
    return (
      <MobileShell
        session={session.user}
        environment={selectedEnv}
        objects={[]}
      />
    );
  }

  if (apiOnline === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist', -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--t-text1)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing:"-0.4px" }}>API Server Not Running</h2>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>Start the backend server to use Vercentic.</p>
          <div style={{ background: "#1a1a2e", color: "#a5f3fc", padding: "14px 20px", borderRadius: 10, fontFamily: "ui-monospace, monospace", fontSize: 13, marginTop: 20, textAlign: "left" }}>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}># In the server directory:</div>
            <div>node index.js</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionProvider userId={userId}>
    <div style={{ minHeight: "100vh", background: "var(--t-bg)", fontFamily: "var(--t-font)", display: "flex" }}>
      <MaintenanceOverlay />
      {/* Theme Panel */}
      {/* Sidebar */}
      <div
        onMouseEnter={() => navCollapsed && setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
        style={{ width: NAV_W, background: "var(--t-nav-bg)", borderRight: "1px solid var(--t-border2)", display: "flex", flexDirection: "column", padding: "0 0 16px", position: "fixed", height: "100vh", top: 0, left: 0, zIndex: 100, overflowY: "hidden", overflowX: "hidden", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
        {/* Logo — click to toggle collapse */}
        <div
          style={{ padding: "0 12px", borderBottom: "1px solid var(--t-border2)", display: "flex", alignItems: "center", gap: 10, height: 56, flexShrink: 0, overflow: "hidden" }}>
          {/* Logo icon — always visible, click to expand when collapsed */}
          <div
            onClick={navCollapsed ? toggleNav : () => switchNav("dashboard")}
            title={navCollapsed ? "Expand sidebar" : "Go to Dashboard"}
            style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, overflow: "hidden", cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 80 80" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
              <path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
              <path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
              <path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="var(--t-accent)" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
            </svg>
            {navExpanded && (
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t-text1)", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>Vercentic</div>
            )}
          </div>
          {/* Collapse button — only visible when expanded */}
          {navExpanded && (
            <button
              onClick={toggleNav}
              title="Collapse sidebar"
              style={{ width: 24, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "var(--t-text3)", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--t-surface2)"; e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.color = "var(--t-text1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--t-text3)"; }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {navCollapsed
                  ? <><path d="M15 18l-6-6 6-6"/><line x1="19" y1="6" x2="19" y2="18"/></>
                  : <><path d="M9 18l6-6-6-6"/><line x1="5" y1="6" x2="5" y2="18"/></>
                }
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <div data-tour="sidebar-nav" style={{ padding: "8px 12px", flex: 1, overflowY: "auto", minHeight: 0 }}>
          {filteredNavSections.map(section => (
            <div key={section.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, paddingLeft: 4, height: navExpanded ? undefined : 0, overflow: "hidden", opacity: navExpanded ? 1 : 0, transition: "opacity 0.15s, height 0.15s" }}>{section.label}</div>
              {section.items.map(item => {
                const isDashboard = item.id === "dashboard";
                const dashActive = activeNav === "dashboard" || activeNav === "dashboard_interviews" || activeNav === "dashboard_offers" || activeNav === "dashboard_admin" || activeNav === "dashboard_agents" || activeNav === "dashboard_screening" || activeNav === "dashboard_onboarding" || activeNav === "dashboard_custom" || activeNav === "dashboard_insights";
                const isActive = isDashboard ? dashActive : (activeNav === item.id || (activeObjectId && item.id === `obj_${activeObjectId}`));
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => switchNav(item.id)}
                      {...(item.id==="interviews" ? {"data-tour":"nav-interviews"} : {})}
                      title={!navExpanded ? item.label : undefined}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: navExpanded ? 9 : 0,
                        padding: navExpanded ? "8px 10px" : "8px 0", justifyContent: navExpanded ? "flex-start" : "center",
                        borderRadius: 8, border: "none", cursor: "pointer",
                        background: isActive ? "var(--t-nav-active)" : "transparent",
                        color: isActive ? "var(--t-nav-active-c)" : "var(--t-nav-text)",
                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                        fontFamily: "inherit", textAlign: "left", transition: "all 0.15s", marginBottom: 2
                      }}>
                      <Icon name={item.icon} size={15} color={isActive ? "var(--t-nav-active-c)" : "var(--t-text3)"} />
                      <span style={{ flex: 1, overflow: "hidden", opacity: navExpanded ? 1 : 0, width: navExpanded ? undefined : 0, transition: "opacity 0.1s", whiteSpace: "nowrap" }}>{item.label}</span>
                      {item.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "var(--t-accent, #4361EE)", color: "white", minWidth: 16, textAlign: "center" }}>{item.badge}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer — user card with Settings/Help popover */}
        <div style={{ padding: "0 12px 4px", position: "relative" }}>
          {session?.user && (
            navExpanded
              ? <UserFooterMenu
                  session={session}
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                  clearSession={clearSession}
                  setSession={setSession}
                  t={t}
                  environments={environments}
                  selectedEnv={selectedEnv}
                  onSwitchEnv={(env) => { setSelectedEnv(env); setActiveNav("dashboard"); }}
                />
              : <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div
                    title={`${session.user.first_name} ${session.user.last_name} — click to expand`}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: session.role?.color || "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                    onClick={toggleNav}>
                    <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
                      {(session.user.first_name?.[0] || "") + (session.user.last_name?.[0] || "")}
                    </span>
                  </div>
                </div>
          )}
        </div>

      </div>

      {/* Sandbox indicator — fixed orange outline + banner when in a sandbox env */}
      {selectedEnv?.is_sandbox && (
        <>
          <div style={{ position:"fixed", inset:0, border:"3px solid #F59E0B", zIndex:9999, pointerEvents:"none" }} />
          <div style={{ position:"fixed", top:0, left:NAV_W, right:0, zIndex:9998,
            background:"#F59E0B", color:"#78350F", fontSize:11, fontWeight:700,
            letterSpacing:"0.05em", textAlign:"center", padding:"3px 0",
            fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center",
            justifyContent:"center", gap:6,
            transition:"left 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
            ⚠ SANDBOX — {selectedEnv.name} — Changes here will not affect production until promoted
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ marginLeft: NAV_W, flex: 1, height: "100vh", display: "flex", flexDirection: "column", background: "var(--t-bg)", paddingRight: copilotDocked ? 420 : historyOpen ? 300 : 0, paddingTop: selectedEnv?.is_sandbox ? 22 : 0, transition: "margin-left 0.2s cubic-bezier(0.4,0,0.2,1), padding-right 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", position: "relative", isolation: "isolate" }}>
        {/* Top bar */}
        <GlobalSearch data-tour="global-search" selectedEnv={selectedEnv} navObjects={navObjects}
             activeDashTab={activeNav === "dashboard" ? "overview" : activeNav.startsWith("dashboard_") ? activeNav.replace("dashboard_","") : null}
             onDashboardNav={(tab) => {
               const navId = tab === "overview" ? "dashboard" : `dashboard_${tab}`;
               switchNav(navId);
             }}
             onNavigateToSearch={(q) => {
            setActiveNav("search");
            if (q) {
              sessionStorage.setItem("talentos_search_query", q);
              sessionStorage.setItem("talentos_autosearch", "1");
            }
          }} onNavigateToRecord={(recordId, objectId) => openRecord(recordId, objectId)}
             onCreateRecord={(obj) => {
               setActiveNav(`obj_${obj.id}`);
               setCreateTarget(obj);
             }}
             onNavigateToCalendar={() => setActiveNav("calendar")}
             historySlot={
               <HistoryDropdown
                 history={navHistory}
                 pinned={pinned}
                 onNavigate={navigateToHistoryEntry}
                 onPin={togglePin}
                 isPinned={isPinned}
                 onClear={clearHistory}
                 isOpen={historyOpen}
                 onToggle={() => setHistoryOpen(v => !v)}
               />
             } />
        {/* Page content */}
        <div style={{ flex: 1, display:"flex", flexDirection:"column", padding: (activeNav.startsWith("record_") || activeNav.startsWith("obj_") || activeNav === "activity_journal") ? 0 : "28px 32px", overflow: "auto", minHeight: 0, position: "relative", zIndex: 0 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>Loading…</div>
        ) : !selectedEnv ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>No environments found.</div>
        ) : (
        <div key={
          activeNav.startsWith("dashboard") ? "page-dashboard" :
          activeNav.startsWith("record_")   ? "page-record" :
          activeNav.startsWith("obj_")      ? "page-obj" :
          `page-${activeNav}`
        } style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow: "visible" }}>
        { activeNav === "inbox" ? (
          <InboxModule environment={selectedEnv} session={session} onNavigate={openRecord} />
        ) : activeNav === "dashboard" || activeNav === "dashboard_interviews" || activeNav === "dashboard_offers" || activeNav === "dashboard_admin" || activeNav === "dashboard_agents" || activeNav === "dashboard_screening" || activeNav === "dashboard_onboarding" || activeNav === "dashboard_custom" || activeNav === "dashboard_insights" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <DashboardHub
              tab={activeNav === "dashboard" ? "overview" : activeNav.replace("dashboard_", "")}
              onTabChange={(tab) => { setActiveNav(tab === "overview" ? "dashboard" : `dashboard_${tab}`); setDashBuilderMode(false); }}
              environment={selectedEnv} session={session}
              onOpenRecord={openRecord}
              builderMode={dashBuilderMode}
              setBuilderMode={setDashBuilderMode}
              onViewAll={() => setActiveNav("activity_journal")}
              onNavigate={(slug) => {
                if (slug === "matching") { setActiveNav("matching"); return; }
                if (slug === "search")   { setActiveNav("search");   return; }
                // Dashboard sub-tab navigation from pill buttons
                const dashTabs = ["screening","interviews","offers","onboarding","insights","agents","admin"];
                if (dashTabs.includes(slug)) {
                  setActiveNav(`dashboard_${slug}`);
                  return;
                }
                const obj = navObjects.find(o => o.slug === slug || o.plural_name.toLowerCase() === slug);
                if (obj) setActiveNav(`obj_${obj.id}`);
              }}
            />
          </Suspense>
        ) : activeNav.startsWith("obj_") ? (() => {
          const _obj = navObjects.find(o => `obj_${o.id}` === activeNav);
          if (!_obj) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>;
          return (
          <RecordsView
            object={_obj}
            environment={selectedEnv}
            onOpenRecord={openRecord}
            initialFilter={filterPreset}
            allObjects={navObjects}
            autoCreate={createTarget?.id === _obj?.id ? createTarget : null}
            onAutoCreateConsumed={() => setCreateTarget(null)}
            session={session}
          />
          );
        })()
        : activeNav.startsWith("record_") ? (() => {
          const parts = activeNav.split("_"); const recordId = parts[1]; const objectId = parts[2];
          const obj = navObjects.find(o => o.id === objectId);
          return <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"visible"}}><RecordPage recordId={recordId} objectId={objectId} environment={selectedEnv} allObjects={navObjects} onBack={() => { setActiveRecord(null); setActiveRecordObj(null); setActiveNav(obj ? `obj_${obj.id}` : "dashboard"); }} onNavigate={openRecord} onHistoryUpdate={pushHistory}
            onRecordLoad={(rec, recObj) => {
            setActiveRecord(rec); setActiveRecordObj(recObj);
            // Swap UUID URL for clean numeric URL once record is loaded
            if (rec?.record_number && recObj?.slug) {
              const numUrl = `/${recObj.slug}/${rec.record_number}`;
              if (window.location.pathname !== numUrl)
                window.history.replaceState({ nav: activeNav }, '', numUrl);
            }
          }}
          /></div>;
        })() : activeNav === "search" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <SearchPage environment={selectedEnv} onNavigateToRecord={(record) => {
              openRecord(record.id, record.object_id);
            }}/>
          </Suspense>
        ) : activeNav === "reports" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <ReportsPage environment={selectedEnv} initialReport={reportPreset} />
          </Suspense>
        ) : activeNav === "help" ? (
          <Suspense fallback={null}>
            <HelpPage onOpenCopilot={(msg) => {
              window.dispatchEvent(new CustomEvent("talentos:openCopilot", { detail: { message: msg } }));
            }} />
          </Suspense>
        ) : activeNav === "settings" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <SettingsPage
              environment={selectedEnv}
              initialSection={window.location.pathname.startsWith('/settings/') ? window.location.pathname.split('/settings/')[1].split('/')[0] : null}
              onSectionChange={(sectionId) => {
                const url = sectionId ? `/settings/${sectionId}` : '/settings';
                if (window.location.pathname !== url) window.history.pushState({ nav: 'settings', section: sectionId }, '', url);
              }}
            />
          </Suspense>
        ) : activeNav === "orgchart" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <div style={{ padding:"28px 32px", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column" }}>
              <OrgChart environment={selectedEnv} />
            </div>
          </Suspense>
        ) : activeNav === "interviews" ? (
          canGlobal("access_interviews")
            ? <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}><div style={{ padding:"28px 32px", flex:1, overflow:"auto" }}><Interviews environment={selectedEnv} /></div></Suspense>
            : <AccessDenied feature="Interviews"/>
        ) : activeNav === "sourcing" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <SourcingHub environment={selectedEnv} />
            </div>
          </Suspense>
        ) : activeNav === "offers" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <OffersModule environment={selectedEnv} />
            </div>
          </Suspense>
        ) : activeNav === "campaigns" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <div style={{ flex:1, overflow:"auto" }}>
              <Campaigns environment={selectedEnv} />
            </div>
          </Suspense>
        ) : activeNav === "integrations" ? (
          <div style={{ flex:1, overflow:"auto", padding:"32px" }}>
            <IntegrationsPage environment={selectedEnv} />
          </div>
        ) : activeNav === "chat" ? (
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <CandidateChat environment={selectedEnv} session={session} onOpenRecord={openRecord}/>
          </div>
        ) : activeNav === "documents" ? (
          <div style={{ flex:1, overflow:"auto" }}>
            <DocumentBuilder environment={selectedEnv} session={session}/>
          </div>
        ) : activeNav === "client-hub" ? (
          <ClientHub environment={selectedEnv} onNavigate={openRecord} />
        ) : activeNav === "agents" ? (
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", padding:"0 32px" }}>
            <AgentsModule environment={selectedEnv} />
          </div>
        ) : activeNav === "activity_journal" ? (
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#9ca3af", fontSize:13 }}>Loading…</div>}>
            <div style={{ flex:1, display:"flex", minHeight:0, overflow:"hidden" }}>
              <ActivityJournal environment={selectedEnv} onOpenRecord={openRecord} />
            </div>
          </Suspense>
        ) : activeNav === "calendar" ? (
          <div style={{ flex:1, overflow:"auto" }}>
            <CalendarModule environment={selectedEnv} />
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
        </div>
        )}
        </div>
      </div>
      {canGlobal('access_copilot') && (
        <AICopilot
          environment={selectedEnv}
          activeNav={activeNav}
          navObjects={navObjects}
          currentRecord={activeRecord}
          currentObject={activeRecordObj}
          pageContext={listContext}
          onNavigateToRecord={(record) => {
            const obj = navObjects.find(o => o.slug === record.object_slug || o.id === record.object_id);
            if (!obj) return;
            openRecord(record.id, obj.id);
          }} />
      )}

      {/* Company Setup Wizard — first-run only */}
      {showSetupWizard && (
        <Suspense fallback={null}>
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,0.65)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            <div style={{background:"white",borderRadius:24,width:"90%",maxWidth:880,maxHeight:"92vh",overflow:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
              <CompanySetupWizard
                environmentId={selectedEnv?.id}
                environmentName={selectedEnv?.name}
                onComplete={() => { localStorage.setItem(`talentos_setup_complete_${selectedEnv?.id}`,"1"); setShowSetupWizard(false); }}
                onSkip={() => { localStorage.setItem(`talentos_setup_complete_${selectedEnv?.id}`,"skipped"); setShowSetupWizard(false); }}
              />
            </div>
          </div>
        </Suspense>
      )}
    </div>
      {TourPortal}
    </PermissionProvider>
  );
}

// ErrorBoundary: using the reporting version from ErrorBoundary.jsx (reports to /api/error-logs)

// ─── User footer menu (Settings / Help / Sign out) ───────────────────────────
function UserFooterMenu({ session, activeNav, setActiveNav, clearSession, setSession, t, environments = [], selectedEnv, onSwitchEnv }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const multiEnv = environments.length > 1;

  const TEST_USERS = [
    { email: "admin@talentos.io",       password: "Admin1234!", label: "Super Admin",    roleSlug: "super_admin",    color: "#e03131" },
    { email: "admin.test@talentos.io",  password: "Admin1234!", label: "Admin",          roleSlug: "admin",          color: "#f59f00" },
    { email: "recruiter@talentos.io",   password: "Admin1234!", label: "Recruiter",      roleSlug: "recruiter",      color: "#4361EE" },
    { email: "manager@talentos.io",     password: "Admin1234!", label: "Hiring Manager", roleSlug: "hiring_manager", color: "#0ca678" },
    { email: "readonly@talentos.io",    password: "Admin1234!", label: "Read Only",      roleSlug: "read_only",      color: "#868e96" },
  ];

  const switchUser = async (u) => {
    if (switching) return;
    setSwitching(u.email);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, password: u.password }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        const sessionData = {
          user:        { id: data.id, email: data.email, first_name: data.first_name, last_name: data.last_name },
          role:        data.role || {},
          permissions: data.permissions || [],
          tenant_slug: data.tenant_slug || null,
        };
        try { localStorage.setItem("talentos_session", JSON.stringify(sessionData)); } catch {}
        setSession(sessionData);
        setOpen(false);
        window.location.reload();
      } else {
        alert(data.error || "Switch failed");
      }
    } catch { alert("Could not reach server"); }
    setSwitching(false);
  };

  const currentSlug = session?.role?.slug;
  return (
    <div style={{ position: "relative" }}>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--t-surface)", border: "1px solid var(--t-border)",
            borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 201, overflow: "hidden", padding: "4px 0" }}>

            {/* ── Dev: User switcher ── */}
            <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 700,
              color: "#f59f00", letterSpacing: "0.06em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59f00" }}/>
              Test User Switcher
            </div>
            {TEST_USERS.map(u => {
              const isCurrent = currentSlug === u.roleSlug;
              const isLoading = switching === u.email;
              return (
                <button key={u.email} onClick={() => !isCurrent && switchUser(u)}
                  disabled={isCurrent || !!switching}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9,
                    padding: "7px 14px", border: "none",
                    background: isCurrent ? `${u.color}12` : "transparent",
                    cursor: isCurrent ? "default" : "pointer",
                    fontFamily: "inherit", fontSize: 12,
                    color: isCurrent ? u.color : "var(--t-text2)",
                    textAlign: "left", opacity: (switching && !isLoading) ? 0.4 : 1,
                    transition: "opacity 0.15s" }}
                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--t-surface2)"; }}
                  onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? `${u.color}12` : "transparent"; }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: u.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 9, fontWeight: 800, color: "white" }}>
                    {isLoading ? "…" : u.label.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isCurrent ? 700 : 500, lineHeight: 1.2 }}>{u.label}</div>
                    <div style={{ fontSize: 10, color: "var(--t-text3)", lineHeight: 1.2 }}>{u.email}</div>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                      background: u.color, color: "white", flexShrink: 0 }}>ACTIVE</span>
                  )}
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--t-border)", margin: "4px 0" }} />

            {/* Environment switcher — only shown when multiple envs exist */}
            {multiEnv && (
              <>
                <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 700,
                  color: "var(--t-text3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Environment
                </div>
                {environments.map(env => {
                  const isSandbox = !!env.is_sandbox;
                  const isSelected = selectedEnv?.id === env.id;
                  const dot = env.color || (isSandbox ? "#F59E0B" : "#4f46e5");
                  return (
                    <button key={env.id}
                      onClick={() => { if (onSwitchEnv) onSwitchEnv(env); setOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "7px 14px", border: "none",
                        background: isSelected ? "var(--t-accentLight)" : "transparent",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "var(--t-accent)" : "var(--t-text2)",
                        textAlign: "left" }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--t-surface2)"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%",
                        background: dot, flexShrink: 0,
                        boxShadow: isSelected ? `0 0 0 2px ${dot}40` : "none" }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{env.name}</span>
                      {isSandbox && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px",
                          borderRadius: 4, background: "#FEF3C7", color: "#92400E",
                          flexShrink: 0 }}>SANDBOX</span>
                      )}
                      {isSelected && (
                        <Icon name="check" size={12} color="var(--t-accent)" />
                      )}
                    </button>
                  );
                })}
                <div style={{ height: 1, background: "var(--t-border)", margin: "4px 0" }} />
              </>
            )}

            {[
              { id: "settings", icon: "settings", label: t ? t("nav.settings") : "Settings" },
              { id: "help",     icon: "help-circle", label: "Help" },
            ].map(item => (
              <button key={item.id}
                onClick={() => { setActiveNav(item.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "9px 14px", border: "none", background: "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  fontWeight: activeNav === item.id ? 700 : 500,
                  color: activeNav === item.id ? "var(--t-accent)" : "var(--t-text2)",
                  textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--t-surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Icon name={item.icon} size={14} color={activeNav === item.id ? "var(--t-accent)" : "var(--t-text3)"} />
                {item.label}
              </button>
            ))}
            <button onClick={()=>{setOpen(false);window.dispatchEvent(new CustomEvent("vercentic:start-tour"));}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:"var(--t-text2)",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="var(--t-surface2)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Icon name="play-circle" size={14} color="var(--t-text3)"/>Product tour</button>
            <div style={{ height: 1, background: "var(--t-border)", margin: "4px 0" }} />
            <button onClick={() => { clearSession(); setSession(null); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9,
                padding: "9px 14px", border: "none", background: "transparent",
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                color: "#e03131", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-surface2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Icon name="log-out" size={14} color="#e03131" />
              Sign out
            </button>
          </div>
        </>
      )}
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 10,
          background: open ? "var(--t-accentLight)" : "var(--t-surface2)",
          border: `1px solid ${open ? "var(--t-accent)" : "transparent"}`,
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          textAlign: "left", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = "transparent"; }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%",
          background: session.role?.color || "#4f46e5",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
            {(session.user.first_name?.[0] || "") + (session.user.last_name?.[0] || "")}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-text1)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            lineHeight: "1.4", paddingBottom: 1 }}>
            {session.user.first_name} {session.user.last_name}
          </div>
          <div style={{ fontSize: 10, color: selectedEnv?.is_sandbox ? "#92400E" : "var(--t-text3)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.4",
            display: "flex", alignItems: "center", gap: 3 }}>
            {selectedEnv?.is_sandbox && (
              <span style={{ display:"inline-block",width:5,height:5,borderRadius:"50%",background:"#F59E0B",flexShrink:0 }}/>
            )}
            {multiEnv ? (selectedEnv?.name || session.role?.name || "") : (session.role?.name || "")}
          </div>
        </div>
        <Icon name="chevron-up" size={12} color="var(--t-text3)"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", flexShrink: 0 }} />
      </button>
    </div>
  );
}

// ─── Root export wrapped in ThemeProvider ─────────────────────────────────────
export default function AppRoot() {
  // Handle public reschedule page (no auth needed)
  if (window.location.pathname.startsWith('/reschedule/')) {
    return <ReschedulePage />;
  }
  // Public interview page — no auth needed
  if (window.location.pathname.startsWith('/interview/')) {
    return <InterviewSession />;
  }
  return (
    <ReportingErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ReportingErrorBoundary>
  );
}
