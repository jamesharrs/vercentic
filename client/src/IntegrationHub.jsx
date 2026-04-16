// IntegrationHub.jsx — unified Integrations page
// Tabs: Library | Flows | Monitoring | Event Log
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import FlowBuilder from "./FlowBuilder.jsx";
import { IntegrationMonitor } from "./IntegrationMonitor.jsx";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  bg:"var(--t-bg,#F8F9FB)", card:"var(--t-card,#fff)", border:"var(--t-border,#E5E7EB)",
  text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)",
  green:"#10B981", red:"#EF4444", amber:"#F59E0B",
};
const IP = {
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  globe:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  "bar-chart":"M12 20V10M18 20V4M6 20v-4",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  x:"M18 6L6 18M6 6l12 12",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  check:"M20 6L9 17l-5-5",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  warning:"M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
};
const Ic = ({n,s=16,c="currentColor"}) => {
  const d=IP[n]||IP.info;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
};

const StatusBadge = ({status}) => {
  const m={active:{l:'Connected',bg:'#D1FAE5',c:'#065F46'},error:{l:'Error',bg:'#FEE2E2',c:'#991B1B'},
    pending_test:{l:'Not tested',bg:'#FEF3C7',c:'#92400E'},disabled:{l:'Disabled',bg:'#F3F4F6',c:'#6B7280'}};
  const s=m[status]||m.disabled;
  return <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c}}>{s.l}</span>;
};
const Pill = ({active,onClick,children,color=C.accent}) =>
  <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${active?color:C.border}`,
    background:active?`${color}10`:"transparent",color:active?color:C.text3,fontSize:12,fontWeight:active?700:500,
    cursor:"pointer",fontFamily:F,transition:"all .15s"}}>{children}</button>;

function ProviderIcon({item,size=40}){
  // Inline SVG logos keyed by provider slug
  const LOGOS = {
    slack: <svg viewBox="0 0 54 54" width={size*0.6} height={size*0.6}><path d="M19.712 30.578a4.286 4.286 0 01-4.285 4.286A4.286 4.286 0 0111.14 30.578a4.286 4.286 0 014.286-4.286h4.286v4.286zm2.144 0a4.286 4.286 0 014.286-4.286 4.286 4.286 0 014.286 4.286v10.714a4.286 4.286 0 01-4.286 4.286 4.286 4.286 0 01-4.286-4.286V30.578zM26.142 19.712a4.286 4.286 0 01-4.286-4.285A4.286 4.286 0 0126.142 11.14a4.286 4.286 0 014.286 4.286v4.286H26.142zm0 2.144a4.286 4.286 0 014.286 4.286 4.286 4.286 0 01-4.286 4.286H15.428a4.286 4.286 0 01-4.286-4.286 4.286 4.286 0 014.286-4.286H26.142zm10.866 4.286a4.286 4.286 0 014.285-4.286 4.286 4.286 0 014.286 4.286 4.286 4.286 0 01-4.286 4.286H37.008V26.142zm-2.144 0a4.286 4.286 0 01-4.286 4.286 4.286 4.286 0 01-4.286-4.286V15.428a4.286 4.286 0 014.286-4.286 4.286 4.286 0 014.286 4.286V26.142zM30.578 37.008a4.286 4.286 0 014.286 4.285 4.286 4.286 0 01-4.286 4.286 4.286 4.286 0 01-4.286-4.286V37.008h4.286zm0-2.144a4.286 4.286 0 01-4.286-4.286 4.286 4.286 0 014.286-4.286h10.714a4.286 4.286 0 014.286 4.286 4.286 4.286 0 01-4.286 4.286H30.578z" fill="#E01E5A"/></svg>,
    google_workspace: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
    google_calendar: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M17 3h-1V1h-2v2H7V1H5v2H4C2.9 3 2 3.9 2 5v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1zm2 18H4V8h16v13z" fill="#4285F4"/><path d="M9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" fill="#4285F4"/></svg>,
    microsoft_365: <svg viewBox="0 0 23 23" width={size*0.6} height={size*0.6}><path fill="#f25022" d="M0 0h11v11H0z"/><path fill="#00a4ef" d="M12 0h11v11H12z"/><path fill="#7fba00" d="M0 12h11v11H0z"/><path fill="#ffb900" d="M12 12h11v11H12z"/></svg>,
    microsoft_teams: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M20.625 5.625h-3.75V3.375A1.125 1.125 0 0015.75 2.25H8.25A1.125 1.125 0 007.125 3.375v2.25H3.375A1.125 1.125 0 002.25 6.75v10.5a1.125 1.125 0 001.125 1.125h3.75v2.25a1.125 1.125 0 001.125 1.125h7.5a1.125 1.125 0 001.125-1.125v-2.25h3.75a1.125 1.125 0 001.125-1.125V6.75a1.125 1.125 0 00-1.125-1.125zM8.625 3.75h6.75v1.875h-6.75V3.75zm6.75 16.5H8.625V18.375h6.75V20.25z" fill="#6264A7"/></svg>,
    zoom: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12z" fill="#2D8CFF"/><path d="M7 8.5C7 7.672 7.672 7 8.5 7h6.25c.92 0 1.25.672 1.25 1.5v4.125L18.5 11.25v1.5l-2.5 1.375V14.5c0 .828-.33 1.5-1.25 1.5H8.5C7.672 16 7 15.328 7 14.5V8.5z" fill="#fff"/></svg>,
    linkedin_jobs: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/></svg>,
    indeed: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M12.1 0C5.45 0 0 5.45 0 12.1s5.45 12.1 12.1 12.1S24.2 18.75 24.2 12.1 18.75 0 12.1 0zm0 3.6c1.99 0 3.6 1.61 3.6 3.6S14.09 10.8 12.1 10.8s-3.6-1.61-3.6-3.6 1.61-3.6 3.6-3.6zm0 17.2c-3 0-5.67-1.54-7.23-3.87.04-2.39 4.82-3.7 7.23-3.7s7.19 1.31 7.23 3.7c-1.56 2.33-4.23 3.87-7.23 3.87z" fill="#003A9B"/></svg>,
    salesforce: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M11.83 5.88A4.31 4.31 0 0115.09 4.5a4.35 4.35 0 013.87 2.36A3.28 3.28 0 0121 6.75a3.25 3.25 0 013.25 3.25 3.25 3.25 0 01-3.25 3.25H3.9A3.15 3.15 0 01.75 10.1a3.15 3.15 0 013.15-3.15 3.14 3.14 0 011.09.19 4.73 4.73 0 016.84-1.26z" fill="#00A1E0"/></svg>,
    hubspot: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M22.006 9.774a3.9 3.9 0 00-1.565-1.086V6.344a1.77 1.77 0 00.921-1.565 1.768 1.768 0 10-3.534 0 1.77 1.77 0 00.921 1.565v2.344a6.543 6.543 0 00-2.63.919L9.36 5.14a2.555 2.555 0 00.087-.643 2.567 2.567 0 10-2.567 2.567 2.56 2.56 0 001.338-.378l6.611 4.51a6.538 6.538 0 001.026 7.207L13.76 19.49a2.054 2.054 0 10.846.84l2.105-1.088a6.542 6.542 0 007.295-9.468z" fill="#FF7A59"/></svg>,
    workday: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#0875E1"/><path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    bamboohr: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#73C41D"/><path d="M7 17c0-2.76 2.24-5 5-5s5 2.24 5 5M12 7a3 3 0 110 6 3 3 0 010-6z" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>,
    twilio: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm3.218 15.215a2.004 2.004 0 110-4.008 2.004 2.004 0 010 4.008zm0-6.43a2.004 2.004 0 110-4.007 2.004 2.004 0 010 4.008zm-6.43 6.43a2.004 2.004 0 110-4.008 2.004 2.004 0 010 4.008zm0-6.43a2.004 2.004 0 110-4.007 2.004 2.004 0 010 4.008z" fill="#F22F46"/></svg>,
    sendgrid: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M0 8h8v8H0zM8 0h8v8H8zM0 16h8v8H0zM16 8h8v8h-8z" fill="#1A82E2"/><path d="M8 8h8v8H8z" fill="#1A82E2" opacity=".4"/></svg>,
    zapier: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M14.85 9.15L12 12l-2.85-2.85L6.3 12l2.85 2.85L12 12l2.85 2.85L17.7 12l-2.85-2.85zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#FF4A00"/></svg>,
    docusign: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#FFB600"/><path d="M8 12h8M12 8v8" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/></svg>,
    okta: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><path d="M12 0C5.379 0 0 5.379 0 12s5.379 12 12 12 12-5.379 12-12S18.621 0 12 0zm0 17.143A5.143 5.143 0 1112 6.857a5.143 5.143 0 010 10.286z" fill="#007DC1"/></svg>,
    checkr: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#15803D"/><path d="M7 12l3.5 3.5L17 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    rippling: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#FF5B2D"/><path d="M8 8h3.5a4.5 4.5 0 010 9H8V8zm0 5h3.5a.5.5 0 000-1H8v1z" fill="#fff"/></svg>,
    make: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#6D00CC"/><path d="M7 12h10M12 7l5 5-5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    hirevue: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><rect width="24" height="24" rx="4" fill="#1B1464"/><path d="M6 8l6 4-6 4V8zm6 0h6v8h-6z" fill="#fff" opacity=".9"/></svg>,
    codility: <svg viewBox="0 0 24 24" width={size*0.6} height={size*0.6}><circle cx="12" cy="12" r="10" fill="#FF4B4B"/><path d="M9 9l-3 3 3 3M15 9l3 3-3 3M13 8l-2 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  };

  const logo = LOGOS[item.slug];
  if (logo) {
    return (
      <div style={{width:size,height:size,borderRadius:size*0.22,background:`${(item.color||C.accent)}12`,
        border:`1.5px solid ${(item.color||C.accent)}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {logo}
      </div>
    );
  }
  // Fallback — coloured abbreviation badge
  return(
    <div style={{width:size,height:size,borderRadius:size*0.25,background:(item.color||C.accent)+'18',
      border:`1.5px solid ${(item.color||C.accent)}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <span style={{fontSize:Math.max(9,size*0.27),fontWeight:800,color:item.color||C.accent,letterSpacing:'-0.5px'}}>{item.icon}</span>
    </div>
  );
}

// ── Setup Modal (from Integrations.jsx) ──────────────────────────────────────
function SetupModal({provider,existing,environmentId,onClose,onSaved}){
  const [form,setForm]=useState(()=>{
    const init={};
    (provider.fields||[]).forEach(f=>{ init[f.key]=existing?.config?.[f.key]||(f.type==='boolean'?false:''); });
    return init;
  });
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(existing?.test_result||null);
  const [showSecrets,setShowSecrets]=useState({});
  const [error,setError]=useState('');
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    setSaving(true); setError('');
    try{
      const result=existing?.id
        ? await api.patch(`/integrations/${existing.id}`,{config:form,enabled:true})
        : await api.post('/integrations',{environment_id:environmentId,provider_slug:provider.slug,config:form,enabled:true});
      if(result?.error){setError(result.error);setSaving(false);return;}
      onSaved(result);
    }catch(e){setError(e.message);setSaving(false);}
  };

  const handleTest=async()=>{
    if(!existing?.id){setError('Save first before testing');return;}
    setTesting(true);setTestResult(null);
    try{
      const r=await api.post(`/integrations/${existing.id}/test`,{});
      setTestResult(r); setTesting(false);
    }catch(e){setTestResult({ok:false,message:e.message});setTesting(false);}
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',
      alignItems:'center',justifyContent:'center',padding:20}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:20,width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'hidden',
        display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',fontFamily:F}} onMouseDown={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'20px 24px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:14}}>
          <ProviderIcon item={provider} size={44}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{provider.name}</div>
            <div style={{fontSize:12,color:C.text3}}>{provider.category_label}</div>
          </div>
          {existing?.status&&<StatusBadge status={existing.status}/>}
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{padding:'10px 24px',background:C.bg,borderBottom:`1px solid ${C.border}`,fontSize:13,color:C.text2,lineHeight:1.5}}>
          {provider.description}
        </div>
        {/* Fields */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          {(provider.fields||[]).map(field=>(
            <div key={field.key}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.text2,marginBottom:4}}>
                {field.label}{field.required&&<span style={{color:C.red,marginLeft:4}}>*</span>}
              </label>
              {field.hint&&<div style={{fontSize:11,color:C.text3,marginBottom:5}}>{field.hint}</div>}
              {field.type==='boolean'?(
                <button onClick={()=>set(field.key,!form[field.key])} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'7px 12px',borderRadius:8,border:`1.5px solid ${form[field.key]?C.accent:C.border}`,
                  background:form[field.key]?C.accentLight:'transparent',cursor:'pointer',fontSize:13,fontFamily:F,color:form[field.key]?C.accent:C.text2,fontWeight:500}}>
                  <div style={{width:32,height:18,borderRadius:9,background:form[field.key]?C.accent:'#D1D5DB',position:'relative',transition:'background .15s'}}>
                    <div style={{position:'absolute',top:2,left:form[field.key]?14:2,width:14,height:14,borderRadius:'50%',background:'white',transition:'left .15s'}}/>
                  </div>{field.label}
                </button>
              ):(
                <div style={{position:'relative'}}>
                  <input
                    type={field.type==='password'&&!showSecrets[field.key]?'password':'text'}
                    value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)}
                    placeholder={field.placeholder||''}
                    style={{width:'100%',padding:'9px 36px 9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
                      fontSize:13,color:C.text1,fontFamily:field.type==='password'?'ui-monospace,monospace':F,
                      outline:'none',boxSizing:'border-box'}}/>
                  {field.type==='password'&&(
                    <button onClick={()=>setShowSecrets(s=>({...s,[field.key]:!s[field.key]}))}
                      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer'}}>
                      <Ic n={showSecrets[field.key]?'eyeOff':'eye'} s={14} c={C.text3}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {error&&<div style={{padding:'10px 14px',borderRadius:8,background:'#FEE2E2',border:'1px solid #FECACA',fontSize:13,color:'#991B1B'}}>{error}</div>}
          {testResult&&(
            <div style={{padding:'10px 14px',borderRadius:8,background:testResult.ok?'#D1FAE5':'#FEE2E2',
              border:`1px solid ${testResult.ok?'#A7F3D0':'#FECACA'}`,fontSize:13,color:testResult.ok?'#065F46':'#991B1B'}}>
              {testResult.ok?'✓ Connection successful':'✗ '+testResult.message}
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'space-between'}}>
          <button onClick={handleTest} disabled={testing||!existing?.id}
            style={{padding:'9px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',
              color:C.text2,fontSize:13,fontWeight:600,cursor:existing?.id?'pointer':'not-allowed',opacity:existing?.id?1:0.5,fontFamily:F}}>
            {testing?'Testing…':'Test connection'}
          </button>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{padding:'9px 20px',borderRadius:10,border:`1.5px solid ${C.border}`,
              background:'transparent',color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'9px 20px',borderRadius:10,border:'none',background:C.accent,color:'white',
                fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,fontFamily:F}}>
              {saving?'Saving…':'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────
function IntegrationCard({item,connection,onConfigure,onToggle,onDelete}){
  const connected=!!connection;
  const status=connection?.status||'disabled';
  return(
    <div style={{background:C.card,borderRadius:14,border:`1.5px solid ${connected?C.accent+'40':C.border}`,
      padding:18,display:'flex',flexDirection:'column',gap:12,transition:'box-shadow .15s'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.07)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <ProviderIcon item={item} size={44}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{item.name}</span>
            {connected&&<StatusBadge status={status}/>}
          </div>
          <div style={{fontSize:12,color:C.text3,lineHeight:1.4}}>{item.description}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        {connected&&(
          <>
            <button onClick={()=>onToggle(connection)} style={{padding:'6px 12px',borderRadius:8,
              border:`1.5px solid ${C.border}`,background:'transparent',fontSize:12,fontWeight:600,
              color:C.text2,cursor:'pointer',fontFamily:F}}>{connection.enabled?'Pause':'Resume'}</button>
            <button onClick={()=>onDelete(connection.id)} style={{padding:'6px 12px',borderRadius:8,
              border:`1.5px solid #FEE2E2`,background:'transparent',fontSize:12,fontWeight:600,
              color:C.red,cursor:'pointer',fontFamily:F}}>Remove</button>
          </>
        )}
        <button onClick={()=>onConfigure(item,connection)}
          style={{padding:'6px 14px',borderRadius:8,border:'none',
            background:connected?C.accentLight:C.accent,
            color:connected?C.accent:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F,
            display:'flex',alignItems:'center',gap:5}}>
          <Ic n="settings" s={12} c={connected?C.accent:'white'}/>
          {connected?'Configure':'Connect'}
        </button>
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────
function LibraryTab({ envId }) {
  const [catalog,setCatalog]=useState([]);
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [activeCategory,setActiveCategory]=useState('all');
  const [configuring,setConfiguring]=useState(null);

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const [cat,conn]=await Promise.all([
      api.get('/integrations/catalog').catch(()=>[]),
      api.get(`/integrations?environment_id=${envId}`).catch(()=>[]),
    ]);
    setCatalog(Array.isArray(cat)?cat:[]);
    setConnections(Array.isArray(conn)?conn:[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  const handleSaved=async(r)=>{ setConfiguring(null); await load(); };
  const handleToggle=async(conn)=>{
    await api.patch(`/integrations/${conn.id}`,{enabled:!conn.enabled});
    load();
  };
  const handleDelete=async(id)=>{
    if(!confirm('Remove this integration?'))return;
    await api.delete(`/integrations/${id}`);
    load();
  };

  const allItems=(catalog||[]).flatMap(g=>g.items||[]);
  const connectedCount=connections.filter(c=>c.enabled).length;
  const filtered=allItems.filter(item=>{
    if(filter==='connected'&&!connections.find(c=>c.provider_slug===item.slug))return false;
    if(filter==='available'&&connections.find(c=>c.provider_slug===item.slug))return false;
    if(activeCategory!=='all'){const g=catalog.find(g=>g.slug===activeCategory);if(!g||(g.items||[]).every(i=>i.slug!==item.slug))return false;}
    if(search&&!item.name.toLowerCase().includes(search.toLowerCase())&&
       !(item.description||'').toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return(
    <div>
      {connectedCount>0&&(
        <div style={{marginBottom:18,padding:'10px 16px',borderRadius:10,background:C.accentLight,
          border:`1.5px solid ${C.accent}30`,fontSize:13,color:C.text2,display:'flex',alignItems:'center',gap:8}}>
          <Ic n="check" s={14} c={C.accent}/>
          <strong style={{color:C.accent}}>{connectedCount}</strong> integration{connectedCount!==1?'s':''} connected
        </div>
      )}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search integrations…"
            style={{width:'100%',padding:'8px 12px 8px 34px',borderRadius:10,border:`1.5px solid ${C.border}`,
              fontSize:13,fontFamily:F,outline:'none',color:C.text1,boxSizing:'border-box'}}/>
          <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
            <Ic n="search" s={14} c={C.text3}/>
          </div>
        </div>
        <Pill active={filter==='all'} onClick={()=>setFilter('all')}>All</Pill>
        <Pill active={filter==='connected'} onClick={()=>setFilter('connected')}>Connected ({connectedCount})</Pill>
        <Pill active={filter==='available'} onClick={()=>setFilter('available')}>Available</Pill>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:18,overflowX:'auto',paddingBottom:4}}>
        <Pill active={activeCategory==='all'} onClick={()=>setActiveCategory('all')}>All categories</Pill>
        {(catalog||[]).map(g=><Pill key={g.slug} active={activeCategory===g.slug} onClick={()=>setActiveCategory(g.slug)}>{g.label}</Pill>)}
      </div>
      {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:
      filtered.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}><Ic n="zap" s={32} c={C.text3}/><div style={{marginTop:12,fontSize:14,fontWeight:600}}>No integrations found</div></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(item=>{
            const conn=connections.find(c=>c.provider_slug===item.slug);
            return <IntegrationCard key={item.slug} item={item} connection={conn}
              onConfigure={(i,c)=>setConfiguring({item:i,connection:c})}
              onToggle={handleToggle} onDelete={handleDelete}/>;
          })}
        </div>
      )}
      {configuring&&<SetupModal provider={configuring.item} existing={configuring.connection}
        environmentId={envId} onClose={()=>setConfiguring(null)} onSaved={handleSaved}/>}
    </div>
  );
}

// ── Event Log Tab ─────────────────────────────────────────────────────────────
function EventLogTab({ envId }) {
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('all');

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const data=await api.get(`/integrations/monitor/events?environment_id=${envId}&limit=100`).catch(()=>({events:[]}));
    setEvents(Array.isArray(data)?data:data?.events||[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  function timeAgo(ts){
    if(!ts)return'';const s=Math.floor((Date.now()-new Date(ts).getTime())/1000);
    if(s<60)return`${s}s ago`;if(s<3600)return`${Math.floor(s/60)}m ago`;
    if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;
  }

  const filtered=filter==='all'?events:events.filter(e=>filter==='errors'?!e.ok:e.ok);
  return(
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <Pill active={filter==='all'} onClick={()=>setFilter('all')}>All</Pill>
        <Pill active={filter==='success'} onClick={()=>setFilter('success')} color={C.green}>Success</Pill>
        <Pill active={filter==='errors'} onClick={()=>setFilter('errors')} color={C.red}>Errors</Pill>
        <button onClick={load} style={{marginLeft:'auto',padding:'5px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
          background:'transparent',fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:5}}>
          <Ic n="refresh" s={12} c={C.text3}/>Refresh
        </button>
      </div>
      {loading?<div style={{textAlign:'center',padding:40,color:C.text3}}>Loading…</div>:
      filtered.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}><Ic n="activity" s={32} c={C.text3}/><div style={{marginTop:12,fontSize:14,fontWeight:600}}>No events yet</div></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {filtered.map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,
              background:C.card,border:`1px solid ${C.border}`,fontSize:13}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:e.ok?C.green:C.red,flexShrink:0}}/>
              <span style={{fontWeight:600,color:C.text1,minWidth:120}}>{e.provider||'—'}</span>
              <span style={{color:C.text2,flex:1}}>{e.action||'—'}</span>
              {!e.ok&&e.detail&&<span style={{fontSize:11,color:C.red,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.detail}</span>}
              <span style={{fontSize:11,color:C.text3,whiteSpace:'nowrap'}}>{timeAgo(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Monitoring Tab — wraps IntegrationMonitor ─────────────────────────────────
function MonitoringTab({ environment }) {
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    if(!environment?.id)return;
    setLoading(true);
    const data=await api.get(`/integrations?environment_id=${environment.id}`).catch(()=>[]);
    setConnections(Array.isArray(data)?data:[]);
    setLoading(false);
  },[environment?.id]);

  useEffect(()=>{load();},[load]);

  if(loading)return<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>;
  return <IntegrationMonitor environment={environment} connections={connections} onRetest={load}/>;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function IntegrationHub({ environment }) {
  const [tab, setTab] = useState("library");
  const envId = environment?.id;

  const TABS = [
    { id:"library",    label:"Library",    icon:"zap"       },
    { id:"flows",      label:"Flows",      icon:"link"      },
    { id:"monitor",    label:"Monitoring", icon:"bar-chart" },
    { id:"events",     label:"Event Log",  icon:"activity"  },
  ];

  return (
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text1,margin:0}}>Integrations</h1>
        <p style={{fontSize:13,color:C.text3,margin:"4px 0 0"}}>Connect external services, automate flows, and monitor platform events</p>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:2,borderBottom:`2px solid ${C.border}`,marginBottom:24}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",border:"none",
              borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,
              background:"none",color:tab===t.id?C.accent:C.text3,fontSize:13,
              fontWeight:tab===t.id?700:500,cursor:"pointer",fontFamily:F,transition:"color .15s"}}>
            <Ic n={t.icon} s={14} c={tab===t.id?C.accent:C.text3}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab==="library"  && <LibraryTab envId={envId}/>}
      {tab==="flows"    && <FlowBuilder environment={environment}/>}
      {tab==="monitor"  && <MonitoringTab environment={environment}/>}
      {tab==="events"   && <EventLogTab envId={envId}/>}
    </div>
  );
}
