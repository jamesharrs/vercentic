import { Suspense, lazy, useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import DashboardViewer  from "./DashboardViewer.jsx";
import DashboardBuilder from "./DashboardBuilder.jsx";
import api from "./apiClient.js";
const BadgesModule = lazy(() => import("./Badges.jsx"));

const Dashboard           = lazy(() => import("./Dashboard.jsx"));
const InterviewDashboard  = lazy(() => import("./InterviewDashboard.jsx"));
const OfferDashboard      = lazy(() => import("./OfferDashboard.jsx"));
const AdminDashboard      = lazy(() => import("./AdminDashboard.jsx"));
const AgentDashboard      = lazy(() => import("./AgentDashboard.jsx"));
const ScreeningDashboard  = lazy(() => import("./ScreeningDashboard.jsx"));
const OnboardingDashboard = lazy(() => import("./OnboardingDashboard.jsx"));
const DashboardInsights   = lazy(() => import("./DashboardInsights.jsx"));
const DashboardCampaigns  = lazy(() => import("./DashboardCampaigns.jsx"));

const F = "'DM Sans', -apple-system, sans-serif";
const PUR = "#8B7EC8";

const Loader = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
    height:300, color:"#9ca3af", fontSize:13, fontFamily:F }}>
    Loading…
  </div>
);

// Shared styled select used in the filter panel — uses a portal so the dropdown
// escapes any overflow:hidden ancestor (e.g. the panel card container).
function StyledSel({ value, onChange, options, placeholder, accentColor = PUR }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  const handleOpen = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };
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
  useEffect(() => {
    if (!open) return;
    const update = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open]);

  const sel = options.find(o => o.value === value);

  const dropdown = open && rect && ReactDOM.createPortal(
    <div ref={dropRef} style={{
      position:"fixed", top: rect.bottom + 4, left: rect.left, width: rect.width,
      zIndex:99999, background:"white", borderRadius:10,
      border:"1.5px solid rgba(0,0,0,.09)", boxShadow:"0 8px 28px rgba(0,0,0,.15)",
      maxHeight:240, overflowY:"auto", padding:"4px"
    }}>
      {placeholder && (
        <button onClick={() => { onChange(""); setOpen(false); }}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            width:"100%", padding:"8px 10px", borderRadius:7, border:"none",
            background: !value ? `${accentColor}08` : "transparent",
            cursor:"pointer", fontFamily:F, fontSize:13, color: !value ? accentColor : "#94a3b8",
            fontWeight: !value ? 700 : 400, textAlign:"left" }}>
          {placeholder}
          {!value && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      )}
      {options.map(o => (
        <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            width:"100%", padding:"8px 10px", borderRadius:7, border:"none",
            background: o.value === value ? `${accentColor}08` : "transparent",
            cursor:"pointer", fontFamily:F, fontSize:13,
            color: o.value === value ? accentColor : "#1e293b",
            fontWeight: o.value === value ? 700 : 400, textAlign:"left" }}
          onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = "#f8faff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? `${accentColor}08` : "transparent"; }}>
          <span>{o.label}</span>
          {o.value === value && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div style={{ position:"relative", width:"100%" }}>
      <button ref={btnRef} onClick={handleOpen}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
          padding:"8px 12px", borderRadius:9, border:`1.5px solid ${sel ? accentColor+"50" : "rgba(0,0,0,.1)"}`,
          background: sel ? `${accentColor}06` : "white", cursor:"pointer", fontFamily:F,
          fontSize:13, color: sel ? accentColor : "#94a3b8", fontWeight: sel ? 600 : 400, textAlign:"left" }}>
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {sel ? sel.label : placeholder}
        </span>
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ flexShrink:0, opacity:0.4, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {dropdown}
    </div>
  );
}

export default function DashboardHub({ tab = "overview", onTabChange, environment, session, onOpenRecord, onNavigate, builderMode, setBuilderMode, onViewAll }) {
  const [editDashId, setEditDashId] = useState(null);
  const [viewDashId, setViewDashId] = useState(null);

  // Auto-select a dashboard created by the Copilot — it stores the ID in sessionStorage
  // before navigating here so we can open it immediately without the user having to pick from the dropdown.
  useEffect(() => {
    const pending = sessionStorage.getItem('vercentic_open_dashboard');
    if (pending) {
      sessionStorage.removeItem('vercentic_open_dashboard');
      setViewDashId(pending);
    }
  }, []);
  const showNav = ["overview","screening","interviews","offers","onboarding"].includes(tab);

  const navigate = (id) => {
    if (id === "overview") { onTabChange?.("overview"); onNavigate?.(id); return; }
    onTabChange?.(`dashboard_${id}`); onNavigate?.(id);
  };

  return (
    <Suspense fallback={<Loader/>}>
      {tab === "overview" && (
        <Dashboard environment={environment} session={session} onOpenRecord={onOpenRecord} onNavigate={onNavigate} onViewAll={onViewAll}/>
      )}
      {tab === "interviews" && (
        <InterviewDashboard environment={environment} session={session} onNavigate={onNavigate}/>
      )}
      {tab === "offers" && (
        <OfferDashboard environment={environment} session={session} onNavigate={onNavigate}/>
      )}
      {tab === "agents" && (
        <AgentDashboard environment={environment} session={session} onNavigate={onNavigate}/>
      )}
      {tab === "admin" && (
        <AdminDashboard environment={environment} session={session}/>
      )}
      {tab === "screening" && (
        <ScreeningDashboard environment={environment} session={session} onNavigate={onNavigate}/>
      )}
      {tab === "onboarding" && (
        <OnboardingDashboard environment={environment} onNavigate={onNavigate}/>
      )}
      {tab === "campaigns" && (
        <DashboardCampaigns environment={environment} onNavigate={onNavigate}/>
      )}
      {tab === "insights" && (
        <DashboardInsights environment={environment} onNavigate={(id) => {
          window.dispatchEvent(new CustomEvent("talentos:openRecord", { detail: { recordId: id } }));
        }}/>
      )}
      {tab === "custom" && !builderMode && (
        <DashboardViewer environment={environment} session={session}
          onOpenRecord={onOpenRecord} onNavigate={onNavigate}
          initialDashId={viewDashId}
          onManage={(dashId) => { setEditDashId(dashId||null); setBuilderMode(true); }}/>
      )}
      {tab === "custom" && builderMode && (
        <DashboardBuilder environment={environment} session={session}
          initialEditId={editDashId}
          onView={(dashId) => { setViewDashId(dashId); setBuilderMode(false); }}
          onBack={() => { setBuilderMode(false); setEditDashId(null); }}/>
      )}
      {tab === "achievements" && (
        <BadgesModule environment={environment} session={session}/>
      )}
    </Suspense>
  );
}
