import { IntegrationMonitor } from "./IntegrationMonitor.jsx";
// client/src/IntegrationsSettings.jsx
// Unified integration library for Settings — merges old Twilio/SendGrid panel
// with the full 32-provider catalog. Uses brand-accurate logos via SVG.
import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans',-apple-system,sans-serif";
const api = {
  get:    (u)   => fetch(u).then(r=>r.json()),
  post:   (u,b) => fetch(u,{method:'POST',  headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (u,b) => fetch(u,{method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: (u)   => fetch(u,{method:'DELETE'}).then(r=>r.json()),
};

// ── Brand SVG logos ───────────────────────────────────────────────────────────
// Each returns an SVG element sized to fit inside a square container
const LOGOS = {
  okta: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#007DC1"/>
      <circle cx="50" cy="50" r="22" fill="white"/>
    </svg>
  ),
  azure_ad: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 96 96">
      <path d="M48 0L0 83h96L48 0z" fill="#0072C6"/>
      <path d="M18 83L48 8l30 75H18z" fill="#00A4EF"/>
    </svg>
  ),
  google_workspace: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  microsoft_365: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  ),
  google_calendar: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="18" rx="2" fill="white" stroke="#4285F4" strokeWidth="1.5"/>
      <rect x="2" y="4" width="20" height="5" rx="2" fill="#4285F4"/>
      <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4285F4">CAL</text>
      <line x1="7" y1="2" x2="7" y2="7" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      <line x1="17" y1="2" x2="17" y2="7" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  zoom: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 120 120">
      <rect width="120" height="120" rx="22" fill="#2D8CFF"/>
      <path d="M20 42a8 8 0 018-8h44a8 8 0 018 8v36a8 8 0 01-8 8H28a8 8 0 01-8-8V42z" fill="white"/>
      <path d="M80 52l20-12v40L80 68V52z" fill="white"/>
    </svg>
  ),
  slack: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 122 122">
      <path d="M25.8 77.6a12.8 12.8 0 01-12.8 12.8 12.8 12.8 0 01-12.8-12.8 12.8 12.8 0 0112.8-12.8h12.8v12.8z" fill="#E01E5A"/>
      <path d="M32.2 77.6a12.8 12.8 0 0112.8-12.8 12.8 12.8 0 0112.8 12.8v32a12.8 12.8 0 01-12.8 12.8 12.8 12.8 0 01-12.8-12.8v-32z" fill="#E01E5A"/>
      <path d="M45 25.8a12.8 12.8 0 01-12.8-12.8A12.8 12.8 0 0145 .2a12.8 12.8 0 0112.8 12.8V25.8H45z" fill="#36C5F0"/>
      <path d="M45 32.2a12.8 12.8 0 0112.8 12.8 12.8 12.8 0 01-12.8 12.8H13a12.8 12.8 0 01-12.8-12.8A12.8 12.8 0 0113 32.2h32z" fill="#36C5F0"/>
      <path d="M96.2 45a12.8 12.8 0 0112.8-12.8 12.8 12.8 0 0112.8 12.8 12.8 12.8 0 01-12.8 12.8H96.2V45z" fill="#2EB67D"/>
      <path d="M89.8 45a12.8 12.8 0 01-12.8 12.8 12.8 12.8 0 01-12.8-12.8V13a12.8 12.8 0 0112.8-12.8A12.8 12.8 0 0189.8 13v32z" fill="#2EB67D"/>
      <path d="M77 96.2a12.8 12.8 0 0112.8 12.8 12.8 12.8 0 01-12.8 12.8 12.8 12.8 0 01-12.8-12.8V96.2H77z" fill="#ECB22E"/>
      <path d="M77 89.8a12.8 12.8 0 01-12.8-12.8 12.8 12.8 0 0112.8-12.8h32a12.8 12.8 0 0112.8 12.8 12.8 12.8 0 01-12.8 12.8H77z" fill="#ECB22E"/>
    </svg>
  ),
  microsoft_teams: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 2228 2073">
      <path d="M1554 777h370a120 120 0 01120 120v524a120 120 0 01-120 120h-370V777z" fill="#5059C9"/>
      <circle cx="1834" cy="537" r="200" fill="#5059C9"/>
      <path d="M1124 815h480a80 80 0 0180 80v560a80 80 0 01-80 80h-480V815z" fill="#7B83EB"/>
      <circle cx="1364" cy="440" r="259" fill="#7B83EB"/>
      <rect x="784" y="895" width="820" height="740" rx="80" fill="#4B53BC"/>
      <circle cx="1194" cy="420" r="259" fill="white" fillOpacity=".9"/>
    </svg>
  ),
  docusign: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#FFB600"/>
      <path d="M60 50h48c33 0 52 18 52 50s-19 50-52 50H60V50zm24 20v60h22c17 0 28-10 28-30s-11-30-28-30H84z" fill="white"/>
    </svg>
  ),
  adobe_sign: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="15" fill="#FF0000"/>
      <path d="M50 20L80 80H20L50 20z" fill="white"/>
    </svg>
  ),
  linkedin_jobs: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 72 72">
      <rect width="72" height="72" rx="8" fill="#0A66C2"/>
      <path d="M8 25.5h11V56H8V25.5zm5.5-17a6.4 6.4 0 110 12.8 6.4 6.4 0 010-12.8zM28 25.5h10.5v4.2h.1c1.5-2.8 5-5.7 10.4-5.7C60.2 24 63 30.7 63 40V56H52V42.2c0-4.1-.1-9.4-5.7-9.4s-6.6 4.4-6.6 9v14.3H28V25.5z" fill="white"/>
    </svg>
  ),
  indeed: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#003A9B"/>
      <text x="100" y="135" textAnchor="middle" fontSize="90" fontWeight="900" fill="white" fontFamily="Georgia,serif">i</text>
    </svg>
  ),
  bayt: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#E60026"/>
      <text x="100" y="140" textAnchor="middle" fontSize="52" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">bayt</text>
    </svg>
  ),
  reed: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#CC0000"/>
      <text x="100" y="135" textAnchor="middle" fontSize="62" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">reed</text>
    </svg>
  ),
  checkr: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#15803D"/>
      <path d="M50 100l35 35 65-65" stroke="white" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  sterling: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#004B87"/>
      <text x="100" y="130" textAnchor="middle" fontSize="48" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">STRLG</text>
    </svg>
  ),
  workday: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#0875E1"/>
      <text x="100" y="125" textAnchor="middle" fontSize="72" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">W</text>
    </svg>
  ),
  bamboohr: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#73C41D"/>
      <rect x="88" y="30" width="24" height="140" rx="12" fill="white"/>
      <rect x="50" y="65" width="55" height="20" rx="10" fill="white"/>
      <rect x="95" y="100" width="55" height="20" rx="10" fill="white"/>
    </svg>
  ),
  personio: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#00A0DC"/>
      <circle cx="100" cy="75" r="32" fill="white"/>
      <path d="M40 165c0-33 27-60 60-60s60 27 60 60" fill="white"/>
    </svg>
  ),
  sap_successfactors: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#008FD3"/>
      <text x="100" y="120" textAnchor="middle" fontSize="58" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">SAP</text>
    </svg>
  ),
  rippling: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#FF5B2D"/>
      <circle cx="80" cy="100" r="28" fill="white"/>
      <circle cx="140" cy="68" r="20" fill="white" fillOpacity=".7"/>
      <circle cx="140" cy="132" r="20" fill="white" fillOpacity=".7"/>
    </svg>
  ),
  hirevue: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#1B1464"/>
      <rect x="30" y="55" width="100" height="80" rx="10" fill="white"/>
      <path d="M130 80l40-25v70l-40-25V80z" fill="white"/>
    </svg>
  ),
  codility: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#FF4B4B"/>
      <text x="55" y="125" fontSize="60" fontWeight="800" fill="white" fontFamily="monospace">&lt;/&gt;</text>
    </svg>
  ),
  salesforce: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#00A1E0"/>
      <path d="M100 45c12 0 23 5 30 13 6-3 13-4 20-2 17 5 27 23 22 40-1 3-2 6-4 9 9 7 14 18 13 30-2 22-22 38-44 36a41 41 0 01-74-12c-3 1-7 1-11 0-16-4-26-21-22-37 2-8 7-14 14-18-4-9-4-19 1-27 9-19 33-28 52-19a37 37 0 013-13z" fill="white"/>
    </svg>
  ),
  hubspot: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#FF7A59"/>
      <circle cx="130" cy="65" r="28" fill="white"/>
      <circle cx="130" cy="65" r="16" fill="#FF7A59"/>
      <rect x="72" y="58" width="42" height="14" rx="7" fill="white"/>
      <rect x="94" y="95" width="14" height="65" rx="7" fill="white"/>
      <circle cx="60" cy="128" r="22" fill="white"/>
    </svg>
  ),
  zapier: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#FF4A00"/>
      <path d="M108 100l42-42-16-16-42 42-42-42-16 16 42 42-42 42 16 16 42-42 42 42 16-16z" fill="white"/>
    </svg>
  ),
  make: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#6D00CC"/>
      <polygon points="100,30 170,72 170,128 100,170 30,128 30,72" fill="none" stroke="white" strokeWidth="12"/>
      <text x="100" y="118" textAnchor="middle" fontSize="52" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">M</text>
    </svg>
  ),
  xref: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#0050C8"/>
      <text x="100" y="125" textAnchor="middle" fontSize="62" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">xref</text>
    </svg>
  ),
  power_bi: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#F2C811"/>
      <rect x="50" y="110" width="25" height="60" rx="4" fill="#333"/>
      <rect x="88" y="75" width="25" height="95" rx="4" fill="#333"/>
      <rect x="126" y="45" width="25" height="125" rx="4" fill="#333"/>
    </svg>
  ),
  twilio: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#F22F46"/>
      <circle cx="75" cy="75" r="18" fill="white"/>
      <circle cx="125" cy="75" r="18" fill="white"/>
      <circle cx="75" cy="125" r="18" fill="white"/>
      <circle cx="125" cy="125" r="18" fill="white"/>
    </svg>
  ),
  sendgrid: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#1A82E2"/>
      <rect x="30" y="30" width="65" height="65" rx="8" fill="white"/>
      <rect x="105" y="30" width="65" height="65" rx="8" fill="white" fillOpacity=".6"/>
      <rect x="30" y="105" width="65" height="65" rx="8" fill="white" fillOpacity=".6"/>
      <rect x="105" y="105" width="65" height="65" rx="8" fill="white"/>
    </svg>
  ),
  inbound_webhooks: ({s}) => (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#6366F1"/>
      <path d="M60 100 Q60 55 100 55 Q140 55 140 100" stroke="white" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <path d="M80 130 Q80 155 100 155 Q120 155 120 130" stroke="white" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <circle cx="100" cy="100" r="16" fill="white"/>
    </svg>
  ),
};

// Fallback: colored square with initials
function FallbackIcon({ item, size }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.22, background:item.color+'20',
      border:`2px solid ${item.color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:Math.max(9,size*0.27), fontWeight:800, color:item.color, letterSpacing:'-0.5px' }}>
        {item.icon}
      </span>
    </div>
  );
}

function ProviderLogo({ item, size = 40 }) {
  const Logo = LOGOS[item.slug];
  if (Logo) return (
    <div style={{ width:size, height:size, borderRadius:size*0.2, overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Logo s={size} />
    </div>
  );
  return <FallbackIcon item={item} size={size} />;
}

function Ic({n,s=16,c="currentColor"}){
  const p={check:"M20 6L9 17l-5-5",x:"M18 6L6 18M6 6l12 12",eye:"M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z",eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",warning:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",search:"M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",toggle:"M15 8a7 7 0 010 8M2 12h13",info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01"};
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={p[n]||p.info}/></svg>;
}

function StatusBadge({status}){
  const m={active:{label:'Connected',bg:'#D1FAE5',c:'#065F46'},error:{label:'Error',bg:'#FEE2E2',c:'#991B1B'},pending_test:{label:'Not tested',bg:'#FEF3C7',c:'#92400E'},disabled:{label:'Disabled',bg:'#F3F4F6',c:'#6B7280'}};
  const s=m[status]||m.disabled;
  return <span style={{padding:'2px 9px',borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c}}>{s.label}</span>;
}

// ── Setup Modal ───────────────────────────────────────────────────────────────
function SetupModal({provider,existing,environmentId,onClose,onSaved}){
  const [form,setForm]=useState(()=>{
    const init={};
    (provider.fields||[]).forEach(f=>{init[f.key]=existing?.config?.[f.key]||(f.type==='boolean'?false:'');});
    return init;
  });
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(existing?.test_result||null);
  const [showSec,setShowSec]=useState({});
  const [err,setErr]=useState('');
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    setSaving(true);setErr('');
    // Special handling for messaging providers — use old PUT endpoint for env vars
    const messagingSlugs=['twilio','sendgrid','inbound_webhooks'];
    if(messagingSlugs.includes(provider.slug)){
      const providerKey=provider.slug==='inbound_webhooks'?'webhook':provider.slug;
      const res=await api.post(`/api/integrations`,{environment_id:environmentId,provider_slug:provider.slug,config:form,enabled:true});
      // Also apply to env via old endpoint
      await fetch(`/api/integrations/${providerKey}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}).catch(()=>{});
      if(res.error){setErr(res.error);setSaving(false);return;}
      onSaved(res);return;
    }
    const res=await api.post('/api/integrations',{environment_id:environmentId,provider_slug:provider.slug,config:form,enabled:true});
    if(res.error){setErr(res.error);setSaving(false);return;}
    onSaved(res);
  };
  const handleTest=async()=>{
    if(!existing?.id){setErr('Save first before testing');return;}
    setTesting(true);setTestResult(null);
    const r=await fetch(`/api/integrations/${existing.id}/test`,{method:'POST'}).then(x=>x.json()).catch(e=>({ok:false,message:e.message}));
    setTestResult(r);setTesting(false);
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',fontFamily:F}} onMouseDown={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid #F0F0F0',display:'flex',alignItems:'center',gap:14}}>
          <ProviderLogo item={provider} size={44}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:'#111827'}}>{provider.name}</div>
            <div style={{fontSize:12,color:'#9CA3AF'}}>{provider.category_label}</div>
          </div>
          {existing?.status&&<StatusBadge status={existing.status}/>}
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Ic n="x" s={18} c="#9CA3AF"/></button>
        </div>
        <div style={{padding:'10px 22px',background:'#F9FAFB',borderBottom:'1px solid #F0F0F0',fontSize:13,color:'#374151',lineHeight:1.5}}>
          {provider.description}
          {provider.docs_url&&<a href={provider.docs_url} target="_blank" rel="noreferrer" style={{marginLeft:8,color:'#4361EE',fontSize:12,fontWeight:600,textDecoration:'none'}}>View docs →</a>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          {(provider.fields||[]).map(field=>(
            <div key={field.key}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>
                {field.label}{field.required&&<span style={{color:'#EF4444',marginLeft:4}}>*</span>}
              </label>
              {field.hint&&<div style={{fontSize:11,color:'#9CA3AF',marginBottom:5,lineHeight:1.4}}>{field.hint}</div>}
              {field.type==='boolean'?(
                <button onClick={()=>set(field.key,!form[field.key])} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:8,border:`1.5px solid ${form[field.key]?'#4361EE':'#E5E7EB'}`,background:form[field.key]?'#EEF2FF':'transparent',cursor:'pointer',fontSize:13,fontFamily:F,color:form[field.key]?'#4361EE':'#374151',fontWeight:500}}>
                  <div style={{width:32,height:18,borderRadius:9,background:form[field.key]?'#4361EE':'#D1D5DB',position:'relative',transition:'background .15s'}}>
                    <div style={{position:'absolute',top:2,left:form[field.key]?14:2,width:14,height:14,borderRadius:'50%',background:'white',transition:'left .15s'}}/>
                  </div>{field.label}
                </button>
              ):field.type==='select'?(
                <select value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #E5E7EB',fontSize:13,color:'#111827',fontFamily:F,background:'white',outline:'none'}}>
                  <option value="">Select…</option>
                  {(field.options||[]).map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                </select>
              ):field.type==='textarea'?(
                <textarea value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)} placeholder={field.placeholder||''} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #E5E7EB',fontSize:12,color:'#111827',fontFamily:'ui-monospace,monospace',resize:'vertical',outline:'none',boxSizing:'border-box'}}/>
              ):(
                <div style={{position:'relative'}}>
                  <input type={field.type==='password'&&!showSec[field.key]?'password':'text'} value={form[field.key]||''} onChange={e=>set(field.key,e.target.value)} placeholder={field.placeholder||(field.secret?'••••••••':'')} style={{width:'100%',padding:'9px 40px 9px 12px',borderRadius:8,border:'1.5px solid #E5E7EB',fontSize:13,color:'#111827',fontFamily:field.type==='password'?'ui-monospace,monospace':F,outline:'none',boxSizing:'border-box'}}/>
                  {field.type==='password'&&<button onClick={()=>setShowSec(p=>({...p,[field.key]:!p[field.key]}))} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:0}}><Ic n={showSec[field.key]?'eyeOff':'eye'} s={15} c="#9CA3AF"/></button>}
                </div>
              )}
            </div>
          ))}
        </div>
        {testResult&&<div style={{margin:'0 22px 10px',padding:'10px 14px',borderRadius:10,background:testResult.ok?'#D1FAE5':'#FEE2E2',display:'flex',alignItems:'center',gap:8,fontSize:13}}><Ic n={testResult.ok?'check':'warning'} s={16} c={testResult.ok?'#065F46':'#991B1B'}/><span style={{color:testResult.ok?'#065F46':'#991B1B',fontWeight:600}}>{testResult.message}</span></div>}
        {err&&<div style={{margin:'0 22px 10px',padding:'10px 14px',borderRadius:10,background:'#FEE2E2',fontSize:13,color:'#991B1B',fontWeight:600}}>{err}</div>}
        <div style={{padding:'14px 22px',borderTop:'1px solid #F0F0F0',display:'flex',gap:8}}>
          {existing?.id&&<button onClick={handleTest} disabled={testing} style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'transparent',fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6}}>{testing?<><Ic n="loader" s={14} c="#9CA3AF"/>Testing…</>:<><Ic n="zap" s={14} c="#9CA3AF"/>Test</>}</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'transparent',fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer',fontFamily:F}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{padding:'9px 20px',borderRadius:10,border:'none',background:'#4361EE',color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6}}>{saving?<><Ic n="loader" s={14} c="white"/>Saving…</>:<><Ic n="check" s={14} c="white"/>Save</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────
function IntCard({item,connection,onConfigure,onToggle,onDelete}){
  const [confirm,setConfirm]=useState(false);
  const isConn=connection?.status==='active';
  const hasErr=connection?.status==='error';
  return(
    <div style={{background:'white',borderRadius:14,border:`1.5px solid ${isConn?item.color+'35':'#E5E7EB'}`,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10,transition:'box-shadow .15s',boxShadow:isConn?`0 2px 8px ${item.color}15`:'none'}} onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'} onMouseLeave={e=>e.currentTarget.style.boxShadow=isConn?`0 2px 8px ${item.color}15`:'none'}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <ProviderLogo item={item} size={36}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:'#111827',marginBottom:2}}>{item.name}</div>
          {connection&&<StatusBadge status={connection.status}/>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {connection&&<button onClick={()=>onToggle(connection)} title={connection.enabled?'Disable':'Enable'} style={{width:26,height:26,borderRadius:6,border:'1px solid #E5E7EB',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="toggle" s={13} c={connection.enabled?'#4361EE':'#9CA3AF'}/></button>}
          <button onClick={()=>onConfigure(item,connection)} style={{width:26,height:26,borderRadius:6,border:`1px solid ${connection?'#4361EE40':'#E5E7EB'}`,background:connection?'#EEF2FF':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="settings" s={13} c={connection?'#4361EE':'#9CA3AF'}/></button>
        </div>
      </div>
      <div style={{fontSize:12,color:'#6B7280',lineHeight:1.4}}>{item.description}</div>
      {hasErr&&connection?.test_result?.message&&<div style={{padding:'6px 10px',borderRadius:8,background:'#FEE2E2',fontSize:12,color:'#991B1B',display:'flex',gap:6}}><Ic n="warning" s={13} c="#991B1B"/>{connection.test_result.message}</div>}
      {connection?.last_tested_at&&<div style={{fontSize:11,color:'#9CA3AF'}}>Tested {new Date(connection.last_tested_at).toLocaleDateString()}</div>}
      <div style={{display:'flex',gap:7,paddingTop:4,borderTop:'1px solid #F0F0F0'}}>
        {!connection?(
          <button onClick={()=>onConfigure(item,null)} style={{flex:1,padding:'7px',borderRadius:9,border:'none',background:'#4361EE',color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>+ Connect</button>
        ):(
          <>
            <button onClick={()=>onConfigure(item,connection)} style={{flex:1,padding:'7px',borderRadius:9,border:'1px solid #E5E7EB',background:'transparent',color:'#374151',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Edit</button>
            {confirm?(
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>onDelete(connection)} style={{padding:'7px 10px',borderRadius:8,border:'none',background:'#EF4444',color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>Remove</button>
                <button onClick={()=>setConfirm(false)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #E5E7EB',background:'transparent',fontSize:12,cursor:'pointer',fontFamily:F}}>✕</button>
              </div>
            ):(
              <button onClick={()=>setConfirm(true)} style={{width:30,height:30,borderRadius:8,border:'1px solid #E5E7EB',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="trash" s={13} c="#EF4444"/></button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function IntegrationsSettings({environment}){
  const [catalog,setCatalog]=useState([]);
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeCategory,setActiveCategory]=useState('all');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [configuring,setConfiguring]=useState(null);
  const [activeTab,setActiveTab]=useState("library");
  const envId=environment?.id;

  const load=useCallback(async()=>{
    if(!envId)return;
    setLoading(true);
    const [cat,conn]=await Promise.all([
      api.get(`/api/integrations/catalog?environment_id=${envId}`),
      api.get(`/api/integrations?environment_id=${envId}`),
    ]);
    setCatalog(Array.isArray(cat)?cat:[]);
    setConnections(Array.isArray(conn)?conn:[]);
    setLoading(false);
  },[envId]);

  useEffect(()=>{load();},[load]);

  const allItems=catalog.flatMap(g=>(g.items||[]).map(i=>({...i,category_label:g.label,category_slug:g.slug})));
  const filtered=allItems.filter(item=>{
    const conn=connections.find(c=>c.provider_slug===item.slug);
    if(filter==='connected'&&!conn)return false;
    if(filter==='available'&&conn)return false;
    if(activeCategory!=='all'&&item.category_slug!==activeCategory)return false;
    if(search){const q=search.toLowerCase();return item.name.toLowerCase().includes(q)||(item.description||'').toLowerCase().includes(q)||(item.tags||[]).some(t=>t.includes(q));}
    return true;
  });

  const connectedCount=connections.filter(c=>c.status==='active').length;
  const errorCount=connections.filter(c=>c.status==='error').length;

  const handleSaved=(saved)=>{
    setConnections(prev=>{
      const idx=prev.findIndex(c=>c.id===saved.id||c.provider_slug===saved.provider_slug);
      if(idx>=0){const n=[...prev];n[idx]=saved;return n;}
      return [...prev,saved];
    });
    setConfiguring(null);
  };
  const handleRetest=async(id)=>{
    try { await fetch(`/api/integrations/${id}/test`,{method:'POST'}); await load(); }
    catch(e){ console.warn('retest failed',e); }
  };
  const handleToggle=async(conn)=>{const u=await api.patch(`/api/integrations/${conn.id}`,{enabled:!conn.enabled});if(!u.error)setConnections(prev=>prev.map(c=>c.id===conn.id?u:c));};
  const handleDelete=async(conn)=>{await api.delete(`/api/integrations/${conn.id}`);setConnections(prev=>prev.filter(c=>c.id!==conn.id));};

  const pill=(label,active,onClick,count)=>(
    <button onClick={onClick} style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,whiteSpace:'nowrap',border:active?'none':'1.5px solid #E5E7EB',background:active?'#111827':'white',color:active?'white':'#374151'}}>
      {label}{count!==undefined&&<span style={{marginLeft:5,padding:'1px 5px',borderRadius:99,fontSize:10,background:active?'rgba(255,255,255,0.2)':'#F3F4F6',color:active?'white':'#6B7280'}}>{count}</span>}
    </button>
  );

  if(loading)return<div style={{padding:40,textAlign:'center',color:'#9CA3AF',fontFamily:F}}>Loading integrations…</div>;

  return(
    <div style={{fontFamily:F}}>
      {/* Tab strip */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid #E5E7EB',marginBottom:20}}>
        {[{id:'library',label:'Library',icon:'grid'},{id:'monitor',label:'Monitor',icon:'zap',badge:errorCount>0?errorCount:null}].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:'9px 20px',fontSize:13,
            fontWeight:activeTab===tab.id?700:500,fontFamily:F,cursor:'pointer',background:'transparent',border:'none',
            color:activeTab===tab.id?'#4361EE':'#374151',
            borderBottom:activeTab===tab.id?'2px solid #4361EE':'2px solid transparent',
            marginBottom:-2,display:'flex',alignItems:'center',gap:6,transition:'color .15s'}}>
            <Ic n={tab.icon} s={14} c={activeTab===tab.id?'#4361EE':'#9CA3AF'}/>
            {tab.label}
            {tab.badge&&<span style={{padding:'1px 6px',borderRadius:99,fontSize:10,fontWeight:700,background:'#FEE2E2',color:'#991B1B'}}>{tab.badge}</span>}
          </button>
        ))}
      </div>
      {/* Monitor tab */}
      {activeTab==='monitor'&&<IntegrationMonitor environment={environment} connections={connections} onRetest={handleRetest}/>}
      {/* Library tab */}
      {activeTab==='library'&&<div>
      {/* Stats strip */}
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        {[{l:'Available',v:allItems.length,c:'#4361EE'},{l:'Connected',v:connectedCount,c:'#0CA678'},{l:'Errors',v:errorCount,c:errorCount?'#EF4444':'#9CA3AF'},{l:'Pending',v:connections.filter(c=>c.status==='pending_test').length,c:'#F59F00'}].map(s=>(
          <div key={s.l} style={{padding:'8px 14px',background:'#F9FAFB',borderRadius:12,border:'1px solid #E5E7EB',textAlign:'center',minWidth:80}}>
            <div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{s.l}</div>
          </div>
        ))}
        <div style={{flex:1}}/>
        <button onClick={load} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'transparent',fontSize:12,fontWeight:600,color:'#374151',cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6,alignSelf:'center'}}><Ic n="refresh" s={13} c="#9CA3AF"/>Refresh</button>
      </div>

      {/* Search + filter */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:180,maxWidth:260}}>
          <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Ic n="search" s={14} c="#9CA3AF"/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search integrations…" style={{width:'100%',padding:'8px 12px 8px 32px',borderRadius:10,border:'1.5px solid #E5E7EB',fontSize:13,fontFamily:F,outline:'none',color:'#111827',boxSizing:'border-box'}}/>
        </div>
        {pill('All',filter==='all',()=>setFilter('all'))}
        {pill('Connected',filter==='connected',()=>setFilter('connected'),connectedCount)}
        {pill('Available',filter==='available',()=>setFilter('available'))}
      </div>

      {/* Category tabs */}
      <div style={{display:'flex',gap:5,marginBottom:20,overflowX:'auto',paddingBottom:4,flexWrap:'wrap'}}>
        {pill('All categories',activeCategory==='all',()=>setActiveCategory('all'))}
        {catalog.map(g=>pill(g.label,activeCategory===g.slug,()=>setActiveCategory(g.slug),(g.items||[]).length))}
      </div>

      {/* Grid */}
      {filtered.length===0
        ?<div style={{textAlign:'center',padding:'48px 20px',color:'#9CA3AF',fontSize:14}}>No integrations found</div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {filtered.map(item=>{
            const connection=connections.find(c=>c.provider_slug===item.slug);
            return <IntCard key={item.slug} item={item} connection={connection} onConfigure={(i,c)=>setConfiguring({item:i,connection:c})} onToggle={handleToggle} onDelete={handleDelete}/>;
          })}
        </div>
      }

      {configuring&&<SetupModal provider={configuring.item} existing={configuring.connection} environmentId={envId} onClose={()=>setConfiguring(null)} onSaved={handleSaved}/>}
      </div>}
    </div>
  );
}
