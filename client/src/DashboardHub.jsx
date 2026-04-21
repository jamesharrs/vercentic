import { Suspense, lazy, useState } from "react";
import DashboardViewer  from "./DashboardViewer.jsx";
import DashboardBuilder from "./DashboardBuilder.jsx";

const Dashboard           = lazy(() => import("./Dashboard.jsx"));
const InterviewDashboard  = lazy(() => import("./InterviewDashboard.jsx"));
const OfferDashboard      = lazy(() => import("./OfferDashboard.jsx"));
const AdminDashboard      = lazy(() => import("./AdminDashboard.jsx"));
const AgentDashboard      = lazy(() => import("./AgentDashboard.jsx"));
const ScreeningDashboard  = lazy(() => import("./ScreeningDashboard.jsx"));
const OnboardingDashboard = lazy(() => import("./OnboardingDashboard.jsx"));
const DashboardInsights   = lazy(() => import("./DashboardInsights.jsx"));

const F = "'DM Sans', -apple-system, sans-serif";
const Loader = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
    height:300, color:"#9ca3af", fontSize:13, fontFamily:F }}>
    Loading…
  </div>
);

export default function DashboardHub({ tab = "overview", onTabChange, environment, session, onOpenRecord, onNavigate, builderMode, setBuilderMode, onViewAll }) {
  const [editDashId, setEditDashId] = useState(null);
  const [viewDashId, setViewDashId] = useState(null);
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
        <ScreeningDashboard environment={environment} onNavigate={onNavigate}/>
      )}
      {tab === "onboarding" && (
        <OnboardingDashboard environment={environment} onNavigate={onNavigate}/>
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
    </Suspense>
  );
}
