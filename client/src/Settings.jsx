import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { tFetch } from "./apiClient.js";
import BrandKitSettings from "./settings/BrandKitSettings.jsx";
import EmailTemplateBuilder from "./settings/EmailTemplateBuilder.jsx";
import SettingsDashboard from "./SettingsDashboard.jsx";
import { usePermissions, Gate } from "./PermissionContext.jsx";
import ReactDOM from "react-dom";
import FileTypesSettings from "./settings/FileTypesSettings.jsx";
import CompanyDocuments from "./settings/CompanyDocuments.jsx";
import DuplicatesSettings from "./settings/DuplicatesSettings.jsx";
import GroupsSection from "./settings/GroupsSection.jsx";
import AgentsSettings from "./settings/AgentsSettings.jsx";
import DataImportSettings from "./settings/DataImportSettings.jsx";
import AiGovernance from "./settings/AiGovernance.jsx";
import QuestionBankSettings from "./settings/QuestionBankSettings.jsx";
import FeatureFlagsSettings from "./settings/FeatureFlagsSettings.jsx";
import AiMatchingSettings from "./settings/AiMatchingSettings.jsx";
import { FormsList } from "./Forms.jsx";

import IntegrationsSettings from "./IntegrationsSettings.jsx";
import DatasetsSection from "./settings/DatasetsSection.jsx";
import EnterpriseSettings from "./EnterpriseSettings.jsx";
import IntegrationHub from "./IntegrationHub.jsx";
import OrgChart from "./OrgChart.jsx";
import WorkflowsPage from "./Workflows.jsx";
import PortalsPage from "./Portals.jsx";
import SandboxManager from "./SandboxManager.jsx";
import { useTheme, SCHEMES, FONTS, DENSITIES } from "./Theme.jsx";
import { useI18n, LANGUAGES } from "./i18n/I18nContext.jsx";

function getAuthHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    if (sess?.user?.id) h['X-User-Id'] = sess.user.id;
    if (sess?.tenant_slug && sess.tenant_slug !== 'master') h['X-Tenant-Slug'] = sess.tenant_slug;
  } catch {}
  return h;
}

const api = {
  get:   p     => tFetch(`/api${p}`, { headers: getAuthHeaders() }).then(r=>r.json()),
  post:  (p,b) => tFetch(`/api${p}`,{method:"POST",   headers:getAuthHeaders(), body:JSON.stringify(b)}).then(r=>r.json()),
  put:   (p,b) => tFetch(`/api${p}`,{method:"PUT",    headers:getAuthHeaders(), body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b) => tFetch(`/api${p}`,{method:"PATCH",  headers:getAuthHeaders(), body:JSON.stringify(b)}).then(r=>r.json()),
  del:   p     => tFetch(`/api${p}`,{method:"DELETE",  headers:getAuthHeaders()}).then(r=>r.json()),
};

const F = "'Geist', -apple-system, sans-serif";
const C = { bg:"#f8f9fc", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db", text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb" };

// ── Primitives ───────────────────────────────────────────────────────────────
const Btn = ({children,onClick,v="primary",sz="md",icon,disabled,style={}}) => {
  const base={display:"inline-flex",alignItems:"center",gap:6,fontFamily:F,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"1px solid transparent",borderRadius:8,transition:"all 0.15s",opacity:disabled?0.5:1,...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"})};
  const vs={primary:{background:C.accent,color:"#fff",borderColor:C.accent},secondary:{background:C.surface,color:C.text1,borderColor:C.border},ghost:{background:"transparent",color:C.text3},danger:{background:"#fef2f2",color:"#dc2626",borderColor:"#fecaca"}};
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

const Inp = ({label,value,onChange,placeholder,type="text",required,help,disabled,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}{required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:disabled?"#f9fafb":C.surface,width:"100%",boxSizing:"border-box",...style}}/>
    {help&&<span style={{fontSize:11,color:C.text3}}>{help}</span>}
  </div>
);

const Sel = ({label,value,onChange,options}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",background:C.surface,color:C.text1}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

const Tog = ({checked,onChange,label,help}) => (
  <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
    <div style={{flex:1}}>
      <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{label}</div>
      {help&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{help}</div>}
    </div>
    <div onClick={()=>onChange(!checked)} style={{width:40,height:22,borderRadius:99,position:"relative",background:checked?C.accent:"#d1d5db",transition:"background 0.2s",flexShrink:0,cursor:"pointer",marginTop:2}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:2,left:checked?20:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
    </div>
  </div>
);

const Modal = ({title,children,onClose,width=500}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:width,boxShadow:"0 20px 40px rgba(0,0,0,.14)",maxHeight:"90vh",overflow:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text1}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.text3,display:"flex"}}><Ic n="x" s={18}/></button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);

const Badge = ({children,color="#6b7280",light}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,background:light?`${color}18`:color,color:light?color:"white",border:`1px solid ${color}28`}}>{children}</span>
);

const Card = ({title,subtitle,children,action}) => (
  <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:C.text1}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{subtitle}</div>}
      </div>
      {action}
    </div>
    <div style={{padding:"0 24px 20px"}}>{children}</div>
  </div>
);

// SVG icons
const PATHS = {
  "sun":"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M17 12a5 5 0 11-10 0 5 5 0 0110 0z",
  "globe":"M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  "building":"M3 21V5a2 2 0 012-2h6a2 2 0 012 2v16M13 21V9a2 2 0 012-2h4a2 2 0 012 2v12M3 21h18M7 9h.01M7 13h.01M7 17h.01M17 13h.01M17 17h.01",
  "users":"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
  "layers":"M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "shield":"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "lock":"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  "activity":"M22 12h-4l-3 9L9 3l-3 9H2",
  "key":"M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  "database":"M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5",
  "paperclip":"M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
  "form":"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8M8 9h2",
  "workflow":"M22 12h-4l-3 9L9 3l-3 9H2",
  "sparkles":"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 19l.7 2.1L7.8 22l-2.1.7L5 24.8l-.7-2.1L2.2 22l2.1-.7L5 19z",
  "zap":"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "bot":"M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1H3v-1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM16.5 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM3 18h18v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z",
  "help-circle":"M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01",
  "briefcase":"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  "refresh":"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  "plus":"M12 5v14M5 12h14",
  "settings":"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  "check":"M20 6L9 17l-5-5",
  "x":"M18 6L6 18M6 6l12 12",
  "search":"M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5zM16 16l4.5 4.5",
  "edit":"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  "trash":"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  "clipboard":"M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z",
  "mail":"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  "monitor":"M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4",
  "bar-chart-2":"M18 20V10M12 20V4M6 20v-6",
  "dollar":"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  "calendar":"M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  "star":"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "filter":"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  "git-branch":"M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  "user":"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  "chevD":"M6 9l6 6 6-6",
  "chevR":"M9 18l6-6-6-6",
  "loader":"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  "file-text":"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  "link":"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  "target":"M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  "download":"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  "cpu":"M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9z",
  "send":"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  "home":"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  "grid":"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  "list":"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {PATHS[n]&&<path d={PATHS[n]}/>}
  </svg>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({status}) => {
  const map = { active:{color:"#0ca678",label:"Active"}, invited:{color:"#f59f00",label:"Invited"}, deactivated:{color:"#868e96",label:"Inactive"} };
  const s = map[status] || {color:"#868e96",label:status};
  return <Badge color={s.color} light>{s.label}</Badge>;
};

// ── Users Section ─────────────────────────────────────────────────────────────
const UsersSection = () => {
  const [users, setUsers]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [u, r, envs] = await Promise.all([
      api.get("/users"),
      api.get("/roles"),
      api.get("/environments"),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
    // Fetch org units for the first environment
    const envId = Array.isArray(envs) && envs[0]?.id;
    if (envId) {
      const ou = await api.get(`/org-units?environment_id=${envId}`);
      setOrgUnits(Array.isArray(ou) ? ou : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (form) => {
    await api.post("/users", form);
    await load();
    setShowInvite(false);
  };

  const handleUpdate = async (id, updates) => {
    await api.patch(`/users/${id}`, updates);
    await load();
    setEditUser(null);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    await api.del(`/users/${id}`);
    load();
  };

  const handleResetPassword = async (id, password) => {
    await api.post(`/users/${id}/reset-password`, { password });
    setResetUser(null);
  };

  const filtered = users.filter(u => !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Card
        title="Users"
        subtitle={`${users.filter(u=>u.status!=='deactivated').length} active users`}
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…"
                style={{padding:"6px 10px 6px 30px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",width:180,color:C.text1}}/>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.text3,display:"flex"}}><Ic n="user" s={13}/></span>
            </div>
            <Btn icon="plus" onClick={()=>setShowInvite(true)}>Invite User</Btn>
          </div>
        }
      >
        {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : (
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:16}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {["User","Role","Org Unit","Status","Last Login",""].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:800,color:C.text2,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:u.role?.color||C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"white",fontSize:12,fontWeight:700}}>{u.first_name?.[0]}{u.last_name?.[0]}</span>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{u.first_name} {u.last_name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"12px 12px"}}>
                    {u.role ? <Badge color={u.role.color||C.accent} light>{u.role.name}</Badge> : <span style={{color:C.text3,fontSize:12}}>—</span>}
                  </td>
                  <td style={{padding:"12px 12px"}}>
                    <OrgUnitCell userId={u.id} orgUnitId={u.org_unit_id} orgUnits={orgUnits} onChanged={load}/>
                  </td>
                  <td style={{padding:"12px 12px"}}><StatusBadge status={u.status}/></td>
                  <td style={{padding:"12px 12px",fontSize:12,color:C.text3}}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}</td>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                      <Btn v="ghost" sz="sm" icon="edit" onClick={()=>setEditUser(u)}/>
                      <Btn v="ghost" sz="sm" icon="key" onClick={()=>setResetUser(u)}/>
                      {u.status !== 'deactivated' && <Btn v="danger" sz="sm" icon="trash" onClick={()=>handleDeactivate(u.id)}/>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showInvite && <InviteUserModal roles={roles} orgUnits={orgUnits} onSave={handleInvite} onClose={()=>setShowInvite(false)}/>}
      {editUser && <EditUserModal user={editUser} roles={roles} orgUnits={orgUnits} onSave={(updates)=>handleUpdate(editUser.id,updates)} onClose={()=>setEditUser(null)}/>}
      {resetUser && <ResetPasswordModal user={resetUser} onSave={(pw)=>handleResetPassword(resetUser.id,pw)} onClose={()=>setResetUser(null)}/>}
    </div>
  );
};

const OrgUnitCell = ({ userId, orgUnitId, orgUnits, onChanged }) => {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [pos, setPos]         = useState({ top:0, left:0 });
  const btnRef                = useRef(null);
  const unit = orgUnits.find(u => u.id === orgUnitId);

  // Position the popup relative to the button on open
  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setSearch("");
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const assign = async (unitId) => {
    setSaving(true);
    if (unitId) await api.patch(`/org-units/${unitId}/assign-user`, { user_id: userId });
    else        await api.patch(`/org-units/unassign-user/${userId}`, {});
    setSaving(false);
    setOpen(false);
    onChanged();
  };

  const filtered = orgUnits.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} disabled={saving}
        style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:6,
          border:`1px solid ${unit ? unit.color+"40" : C.border}`,
          background: unit ? unit.color+"12" : "transparent",
          color: unit ? unit.color : C.text3, fontSize:11, fontWeight:600,
          cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>
        {saving ? "…" : unit ? unit.name : "Unassigned"}
        <Ic n="chevronDown" s={10}/>
      </button>

      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div style={{ position:"fixed", top: pos.top, left: pos.left, zIndex:9999,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 12px 40px rgba(0,0,0,0.15)", width:240, overflow:"hidden" }}>
          {/* Search */}
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ position:"relative" }}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex"}}>
                <Ic n="search" s={12} c={C.text3}/>
              </span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search org units…"
                style={{ width:"100%", boxSizing:"border-box", padding:"5px 8px 5px 26px",
                  borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F,
                  outline:"none", color:C.text1 }}/>
            </div>
          </div>
          {/* Options */}
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            <div onClick={() => assign(null)}
              style={{ padding:"8px 12px", fontSize:12, color:C.text3, cursor:"pointer",
                borderBottom:`1px solid ${C.border}`, fontStyle:"italic",
                background: !orgUnitId ? C.accentLight : "transparent" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
              onMouseLeave={e=>e.currentTarget.style.background=!orgUnitId?C.accentLight:"transparent"}>
              — Unassigned
            </div>
            {filtered.length === 0 && (
              <div style={{ padding:"12px", fontSize:12, color:C.text3, textAlign:"center", fontStyle:"italic" }}>
                No matches
              </div>
            )}
            {filtered.map(ou => (
              <div key={ou.id} onClick={() => assign(ou.id)}
                style={{ padding:"8px 12px", fontSize:12, cursor:"pointer",
                  background: ou.id === orgUnitId ? C.accentLight : "transparent",
                  borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:8 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                onMouseLeave={e=>e.currentTarget.style.background=ou.id===orgUnitId?C.accentLight:"transparent"}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:ou.color, flexShrink:0 }}/>
                <div>
                  <div style={{ fontWeight:600, color:C.text1 }}>{ou.name}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{ou.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const InviteUserModal = ({roles, orgUnits, onSave, onClose}) => {
  const [form,setForm] = useState({email:"",first_name:"",last_name:"",role_id:roles[0]?.id||""});
  const [saving,setSaving] = useState(false);
  const [result,setResult] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.email||!form.first_name||!form.last_name||!form.role_id) return;
    setSaving(true);
    const res = await onSave(form);
    if (res?.temp_password) setResult(res);
    setSaving(false);
  };

  if (result) return (
    <Modal title="User Invited" onClose={onClose}>
      <div style={{textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic n="check" s={24} c="#16a34a"/></div>
        <p style={{fontSize:14,color:C.text1,fontWeight:600,margin:"0 0 8px"}}>{result.first_name} {result.last_name} has been invited</p>
        <p style={{fontSize:12,color:C.text3,margin:"0 0 20px"}}>Share these credentials securely. They must change their password on first login.</p>
        <div style={{background:"#f8f9fc",borderRadius:10,padding:16,textAlign:"left"}}>
          <div style={{fontSize:12,color:C.text3,marginBottom:4}}>Temporary credentials</div>
          <div style={{fontSize:13,fontFamily:"ui-monospace,monospace",color:C.text1}}>Email: <strong>{result.email}</strong></div>
          <div style={{fontSize:13,fontFamily:"ui-monospace,monospace",color:C.text1,marginTop:4}}>Password: <strong>{result.temp_password}</strong></div>
        </div>
        <Btn style={{marginTop:16}} onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  );

  return (
    <Modal title="Invite New User" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="First Name" value={form.first_name} onChange={v=>set("first_name",v)} required/>
          <Inp label="Last Name" value={form.last_name} onChange={v=>set("last_name",v)} required/>
        </div>
        <Inp label="Email Address" type="email" value={form.email} onChange={v=>set("email",v)} required/>
        <Sel label="Role" value={form.role_id} onChange={v=>set("role_id",v)} options={roles.map(r=>({value:r.id,label:r.name}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving||!form.email||!form.first_name}>{saving?"Inviting…":"Send Invite"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const EditUserModal = ({user, roles, orgUnits, onSave, onClose}) => {
  const [form,setForm] = useState({first_name:user.first_name, last_name:user.last_name, role_id:user.role_id, status:user.status, org_unit_id:user.org_unit_id||""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title={`Edit: ${user.first_name} ${user.last_name}`} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="First Name" value={form.first_name} onChange={v=>set("first_name",v)}/>
          <Inp label="Last Name" value={form.last_name} onChange={v=>set("last_name",v)}/>
        </div>
        <Sel label="Role" value={form.role_id} onChange={v=>set("role_id",v)} options={roles.map(r=>({value:r.id,label:r.name}))}/>
        <Sel label="Org Unit" value={form.org_unit_id} onChange={v=>set("org_unit_id",v)}
          options={[{value:"",label:"Unassigned"},...orgUnits.map(o=>({value:o.id,label:`${o.name} (${o.type})`}))]}/>
        <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={["active","invited","deactivated"].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>onSave(form)}>Save Changes</Btn>
        </div>
      </div>
    </Modal>
  );
};

const ResetPasswordModal = ({user,onSave,onClose}) => {
  const [pw,setPw] = useState(""); const [confirm,setConfirm] = useState("");
  const valid = pw.length>=8 && pw===confirm;
  return (
    <Modal title={`Reset Password: ${user.first_name}`} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="New Password" type="password" value={pw} onChange={setPw} help="Min 8 characters"/>
        <Inp label="Confirm Password" type="password" value={confirm} onChange={setConfirm}/>
        {confirm && pw!==confirm && <span style={{fontSize:12,color:"#dc2626"}}>Passwords don't match</span>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>onSave(pw)} disabled={!valid}>Reset Password</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Roles & Permissions Section ───────────────────────────────────────────────
const OBJECTS = [{slug:"people",label:"People"},{slug:"jobs",label:"Jobs"},{slug:"talent-pools",label:"Talent Pools"}];
const ACTIONS = ["view","create","edit","delete","export"];
const ROLE_COLORS = ["#3b5bdb","#f59f00","#0ca678","#e03131","#7048e8","#e64980","#1098ad"];

// Per-role bulk action warning threshold
function RoleBulkThreshold({ role }) {
  const storageKey = `${BULK_THRESHOLD_KEY}_${role.slug}`;
  const [value, setValue] = useState(() => {
    const v = localStorage.getItem(storageKey);
    return v !== null ? parseInt(v, 10) : 20;
  });
  const [saved, setSaved] = useState(false);

  const save = (raw) => {
    const n = Math.max(1, Math.min(9999, parseInt(raw, 10) || 20));
    setValue(n);
    localStorage.setItem(storageKey, String(n));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div style={{ marginTop:28, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:4 }}>
            Bulk Action Warning Threshold
          </div>
          <div style={{ fontSize:12, color:C.text3, lineHeight:1.5 }}>
            Users with the <strong>{role.name}</strong> role will see a confirmation
            dialog when selecting more than this many records for a bulk action.
            This explains what will happen and requires them to confirm before proceeding.
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", border:`1.5px solid ${C.border}`,
            borderRadius:9, overflow:"hidden", background:C.surface }}>
            <button onClick={() => save(value - 1)} disabled={value <= 1}
              style={{ width:32, height:34, border:"none", background:"transparent", fontSize:16,
                color:value<=1?"#d1d5db":C.text2, cursor:value<=1?"default":"pointer", fontFamily:F }}>−</button>
            <input type="number" value={value} min={1} max={9999}
              onChange={e => setValue(e.target.value)}
              onBlur={e => save(e.target.value)}
              onKeyDown={e => e.key==="Enter" && save(value)}
              style={{ width:52, height:34, border:"none", borderLeft:`1px solid ${C.border}`,
                borderRight:`1px solid ${C.border}`, textAlign:"center", fontSize:14, fontWeight:700,
                color:C.text1, background:C.surface, fontFamily:F, outline:"none" }}/>
            <button onClick={() => save(value + 1)}
              style={{ width:32, height:34, border:"none", background:"transparent", fontSize:16,
                color:C.text2, cursor:"pointer", fontFamily:F }}>+</button>
          </div>
          <span style={{ fontSize:12, color:C.text3 }}>records</span>
          {saved && <span style={{ fontSize:11, color:"#0ca678", fontWeight:700 }}>✓</span>}
        </div>
      </div>
    </div>
  );
}

const RolesSection = ({ environment }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [roleTab, setRoleTab] = useState("permissions"); // "permissions" | "field_visibility"
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get("/roles");
    setRoles(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectRole = async (role) => {
    setSelectedRole(role);
    const perms = await api.get(`/roles/${role.id}/permissions`);
    setPermissions(Array.isArray(perms) ? perms : []);
  };

  const getPerm = (objectSlug, action) => {
    const p = permissions.find(p => p.object_slug === objectSlug && p.action === action);
    return p ? !!p.allowed : false;
  };

  const togglePerm = (objectSlug, action) => {
    const current = getPerm(objectSlug, action);
    setPermissions(prev => {
      const existing = prev.find(p => p.object_slug === objectSlug && p.action === action);
      if (existing) return prev.map(p => p.object_slug===objectSlug&&p.action===action ? {...p,allowed:current?0:1} : p);
      return [...prev, {object_slug:objectSlug,action,allowed:current?0:1}];
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const payload = OBJECTS.flatMap(obj => ACTIONS.map(action => ({object_slug:obj.slug,action,allowed:getPerm(obj.slug,action)})));
    await api.put(`/roles/${selectedRole.id}/permissions`, {permissions:payload});
    setSaving(false);
  };

  const handleCreateRole = async (form) => {
    await api.post("/roles", form);
    await load();
    setShowCreate(false);
  };

  return (
    <Card title="Roles & Permissions" subtitle="Define what each role can do per object">
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20,marginTop:16}}>
        {/* Role list */}
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
            {loading ? <div style={{color:C.text3,fontSize:13}}>Loading…</div> : roles.map(role=>(
              <button key={role.id} onClick={()=>selectRole(role)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`2px solid ${selectedRole?.id===role.id?role.color||C.accent:"transparent"}`,background:selectedRole?.id===role.id?`${role.color||C.accent}10`:"#f8f9fc",cursor:"pointer",fontFamily:F,textAlign:"left",transition:"all .12s"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:role.color||C.accent,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text1,display:"flex",alignItems:"center",gap:6}}>
                    {role.name}
                    {role.is_system?<Badge color="#868e96" light>system</Badge>:null}
                  </div>
                  <div style={{fontSize:11,color:C.text3}}>{role.user_count||0} users</div>
                </div>
              </button>
            ))}
          </div>
          <Btn v="secondary" sz="sm" icon="plus" onClick={()=>setShowCreate(true)} style={{width:"100%",justifyContent:"center"}}>New Role</Btn>
        </div>

        {/* Permission matrix */}
        <div>
          {!selectedRole ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:C.text3,fontSize:13,flexDirection:"column",gap:8,background:"#f8f9fc",borderRadius:12}}>
              <Ic n="sliders" s={24} c="#d1d5db"/>
              Select a role to configure permissions
            </div>
          ) : (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{selectedRole.name}</span>
                  <span style={{fontSize:12,color:C.text3,marginLeft:8}}>{selectedRole.description}</span>
                </div>
                <Btn onClick={savePermissions} disabled={saving} sz="sm">{saving?"Saving…":"Save Permissions"}</Btn>
              </div>
              {/* Tab bar */}
              <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>
                {[{id:"permissions",label:"Permissions"},{id:"field_visibility",label:"Field Visibility"},{id:"feature_access",label:"Feature Access"}].map(tab=>(
                  <button key={tab.id} onClick={()=>setRoleTab(tab.id)}
                    style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:roleTab===tab.id?700:500,border:"none",
                      background:roleTab===tab.id?C.accent:"transparent",color:roleTab===tab.id?"white":C.text3,cursor:"pointer",fontFamily:F}}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {roleTab==="feature_access"
                ? <FeatureAccessSection selectedRole={selectedRole}/>
                : roleTab==="field_visibility"
                ? <FieldVisibilityPanel role={selectedRole} environment={environment}/>
                : <>
                    {selectedRole.slug === 'super_admin' ? (
                      <div>
                        <div style={{padding:"14px 16px",borderRadius:10,background:"#f0fdf4",border:"1.5px solid #bbf7d0",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                          <Ic n="check" s={16} c="#0ca678"/>
                          <span style={{fontSize:13,fontWeight:600,color:"#065f46"}}>Super Admin has unrestricted access to all objects and actions. Permissions cannot be modified for this role.</span>
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                          <thead>
                            <tr style={{background:"#f8f9fc"}}>
                              <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:800,color:C.text2,textTransform:"uppercase",letterSpacing:"0.05em"}}>Object</th>
                              {ACTIONS.map(a=>(<th key={a} style={{padding:"8px 14px",textAlign:"center",fontSize:11,fontWeight:800,color:C.text2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{a}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            {OBJECTS.map(obj=>(
                              <tr key={obj.slug} style={{borderBottom:`1px solid ${C.border}`}}>
                                <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:C.text1}}>{obj.label}</td>
                                {ACTIONS.map(action=>(
                                  <td key={action} style={{padding:"12px 14px",textAlign:"center"}}>
                                    <div style={{width:24,height:24,borderRadius:6,border:`2px solid #0ca678`,background:"#0ca678",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"not-allowed",opacity:0.7}}>
                                      <Ic n="check" s={12} c="white"/>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                    <><table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr style={{background:"#f8f9fc"}}>
                          <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:800,color:C.text2,textTransform:"uppercase",letterSpacing:"0.05em",borderRadius:"8px 0 0 8px"}}>Object</th>
                          {ACTIONS.map(a=>(
                            <th key={a} style={{padding:"8px 14px",textAlign:"center",fontSize:11,fontWeight:800,color:C.text2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{a}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {OBJECTS.map((obj,i)=>(
                          <tr key={obj.slug} style={{borderBottom:`1px solid ${C.border}`}}>
                            <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:C.text1}}>{obj.label}</td>
                            {ACTIONS.map(action=>{
                              const allowed = getPerm(obj.slug,action);
                              return (
                                <td key={action} style={{padding:"12px 14px",textAlign:"center"}}>
                                  <button onClick={()=>!selectedRole.is_system&&togglePerm(obj.slug,action)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${allowed?selectedRole.color||C.accent:C.border}`,background:allowed?selectedRole.color||C.accent:"transparent",cursor:selectedRole.is_system?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}>
                                    {allowed&&<Ic n="check" s={12} c="white"/>}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedRole.is_system && <p style={{fontSize:11,color:C.text3,marginTop:12,fontStyle:"italic"}}>System role permissions cannot be modified.</p>}
                    <RoleBulkThreshold role={selectedRole}/></>
                    )}
                  </>
              }
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create Custom Role" onClose={()=>setShowCreate(false)}>
          <CreateRoleForm roles={roles} onSave={handleCreateRole} onClose={()=>setShowCreate(false)}/>
        </Modal>
      )}
    </Card>
  );
};


// ── Field Visibility Panel ────────────────────────────────────────────────────
// Shown inside RolesSection when a role is selected — lets admin hide fields per role
const FieldVisibilityPanel = ({ role, environment }) => {
  const [objects, setObjects] = useState([]);
  const [selObj, setSelObj]   = useState(null);
  const [fields, setFields]   = useState([]);
  const [rules, setRules]     = useState({}); // field_id → hidden bool
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    if (!environment) return;
    api.get(`/objects?environment_id=${environment.id}`).then(d => {
      const objs = Array.isArray(d) ? d : [];
      setObjects(objs);
      if (objs.length) setSelObj(objs[0]);
    });
  }, [environment?.id]);

  useEffect(() => {
    if (!selObj || !role) return;
    Promise.all([
      api.get(`/fields?object_id=${selObj.id}`),
      api.get(`/field-visibility?role_id=${role.id}&object_id=${selObj.id}`),
    ]).then(([f, v]) => {
      setFields(Array.isArray(f) ? f : []);
      const r = {};
      (Array.isArray(v) ? v : []).forEach(rule => { if (rule.hidden) r[rule.field_id] = true; });
      setRules(r);
    });
  }, [selObj?.id, role?.id]);

  const toggle = (fieldId) => setRules(r => ({ ...r, [fieldId]: !r[fieldId] }));

  const handleSave = async () => {
    setSaving(true);
    await api.put('/field-visibility', {
      role_id: role.id,
      object_id: selObj.id,
      rules: fields.map(f => ({ field_id: f.id, hidden: !!rules[f.id] })),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hiddenCount = Object.values(rules).filter(Boolean).length;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Field Visibility</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
            Hidden fields are stripped from API responses for this role. {hiddenCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>{hiddenCount} hidden</span>}
          </div>
        </div>
        <Btn onClick={handleSave} disabled={saving || !selObj} style={{ fontSize: 12 }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </Btn>
      </div>
      {/* Object tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {objects.map(o => (
          <button key={o.id} onClick={() => setSelObj(o)}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: selObj?.id === o.id ? 700 : 500,
              border: `1.5px solid ${selObj?.id === o.id ? (o.color || C.accent) : C.border}`,
              background: selObj?.id === o.id ? `${o.color || C.accent}15` : 'transparent',
              color: selObj?.id === o.id ? (o.color || C.accent) : C.text3, cursor: 'pointer' }}>
            {o.plural_name || o.name}
          </button>
        ))}
      </div>
      {/* Field list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {fields.map(f => (
          <div key={f.id} onClick={() => toggle(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, border: `1px solid ${rules[f.id] ? '#fecaca' : C.border}`,
              background: rules[f.id] ? '#fff5f5' : 'white', cursor: 'pointer', transition: 'all .1s' }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${rules[f.id] ? '#ef4444' : C.border}`,
              background: rules[f.id] ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {rules[f.id] && <svg width={10} height={10} viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth={3}><path d='M18 6L6 18M6 6l12 12'/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: rules[f.id] ? '#ef4444' : C.text1 }}>{f.name}</span>
              <span style={{ fontSize: 11, color: C.text3, marginLeft: 8 }}>{f.api_key}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: rules[f.id] ? '#ef4444' : C.text3,
              padding: '2px 7px', borderRadius: 10, background: rules[f.id] ? '#fee2e2' : C.bg }}>
              {rules[f.id] ? 'HIDDEN' : 'visible'}
            </span>
          </div>
        ))}
        {fields.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: C.text3, fontSize: 13 }}>Select an object above to configure field visibility.</div>}
      </div>
    </div>
  );
};

const CreateRoleForm = ({roles,onSave,onClose}) => {
  const [form,setForm] = useState({name:"",description:"",color:ROLE_COLORS[0],clone_from_role_id:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Inp label="Role Name" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Senior Recruiter" required/>
      <Inp label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="What can this role do?"/>
      <Sel label="Clone permissions from" value={form.clone_from_role_id} onChange={v=>set("clone_from_role_id",v)} options={[{value:"",label:"Start fresh"},...roles.map(r=>({value:r.id,label:r.name}))]}/>
      <div>
        <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:8}}>Colour</label>
        <div style={{display:"flex",gap:8}}>{ROLE_COLORS.map(c=><button key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:form.color===c?`3px solid ${c}`:"none",outlineOffset:2}}/>)}</div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
        <Btn v="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form)} disabled={!form.name} style={{background:form.color,borderColor:form.color}}>Create Role</Btn>
      </div>
    </div>
  );
};

// ── Security Section ──────────────────────────────────────────────────────────
const SecuritySection = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/security/settings").then(d => { setSettings(d); setLoading(false); });
  }, []);

  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    await api.patch("/security/settings", settings);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  if (loading||!settings) return <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div>;

  return (
    <div>
      {/* Password Policy */}
      <Card title="Password Policy" subtitle="Rules enforced when users set or change passwords"
        action={<Btn onClick={handleSave} disabled={saving}>{saved?"✓ Saved":saving?"Saving…":"Save Changes"}</Btn>}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
          <Inp label="Minimum Length" type="number" value={settings.password_min_length} onChange={v=>set("password_min_length",parseInt(v))} help="Minimum number of characters"/>
          <Inp label="Password Expiry (days)" type="number" value={settings.password_expiry_days} onChange={v=>set("password_expiry_days",parseInt(v))} help="0 = never expires"/>
        </div>
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.password_require_uppercase} onChange={v=>set("password_require_uppercase",v?1:0)} label="Require uppercase letter" help="At least one A–Z character"/>
          <Tog checked={!!settings.password_require_number} onChange={v=>set("password_require_number",v?1:0)} label="Require number" help="At least one 0–9 digit"/>
          <Tog checked={!!settings.password_require_symbol} onChange={v=>set("password_require_symbol",v?1:0)} label="Require symbol" help="At least one special character like !@#$"/>
        </div>
      </Card>

      {/* Session & Login */}
      <Card title="Session & Login Security" subtitle="Control session duration and login attempt limits">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
          <Inp label="Session Timeout (minutes)" type="number" value={settings.session_timeout_minutes} onChange={v=>set("session_timeout_minutes",parseInt(v))} help="Inactive sessions expire after this"/>
          <Inp label="Max Login Attempts" type="number" value={settings.max_login_attempts} onChange={v=>set("max_login_attempts",parseInt(v))} help="Before account lockout"/>
          <Inp label="Lockout Duration (minutes)" type="number" value={settings.lockout_duration_minutes} onChange={v=>set("lockout_duration_minutes",parseInt(v))} help="How long account stays locked"/>
        </div>
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.mfa_required} onChange={v=>set("mfa_required",v?1:0)} label="Require MFA for all users" help="Users must set up multi-factor authentication"/>
        </div>
      </Card>

      {/* SSO */}
      <Card title="Single Sign-On (SSO)" subtitle="Allow users to log in via your identity provider">
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.sso_enabled} onChange={v=>set("sso_enabled",v?1:0)} label="Enable SSO" help="Users can log in via OAuth 2.0 / SAML"/>
        </div>
        {settings.sso_enabled ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <Sel label="SSO Provider" value={settings.sso_provider||""} onChange={v=>set("sso_provider",v)} options={[{value:"",label:"Select provider…"},{value:"google",label:"Google Workspace"},{value:"azure",label:"Microsoft Azure AD"},{value:"okta",label:"Okta"},{value:"saml",label:"Custom SAML"}]}/>
            <Inp label="Domain" value={settings.sso_domain||""} onChange={v=>set("sso_domain",v)} placeholder="yourcompany.com"/>
            <Inp label="Client ID" value={settings.sso_client_id||""} onChange={v=>set("sso_client_id",v)} placeholder="OAuth Client ID"/>
            <Inp label="Client Secret" type="password" value={settings.sso_client_secret||""} onChange={v=>set("sso_client_secret",v)} placeholder="OAuth Client Secret"/>
          </div>
        ) : (
          <div style={{marginTop:12,padding:"12px 16px",background:"#f8f9fc",borderRadius:10,fontSize:12,color:C.text3}}>
            Enable SSO to configure your identity provider. Supports Google Workspace, Microsoft Azure AD, Okta, and custom SAML 2.0.
          </div>
        )}
      </Card>
    </div>
  );
};

// ── Audit Log Section ────────────────────────────────────────────────────────
const AuditLogSection = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [tab, setTab] = useState("events"); // "events" | "summary"
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = [`page=${page}`, `limit=25`];
      if (severityFilter) params.push(`severity=${severityFilter}`);
      if (eventFilter) params.push(`event=${eventFilter}`);
      const d = await api.get(`/security-audit?${params.join("&")}`);
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch { setItems([]); setTotal(0); }
    try { const s = await api.get("/security-audit/stats"); setStats(s); } catch {}
    setLoading(false);
  }, [page, severityFilter, eventFilter]);

  useEffect(() => { load(); }, [load]);

  const sevColor = { critical:"#e03131", warn:"#f59f00", info:"#3b5bdb" };
  const sevIcon  = { CRITICAL:"alert-triangle", HIGH:"shield", LOW:"check", INFO:"activity" };

  const exportCsv = async () => {
    try {
      const res = await fetch("/api/security-audit/export", { headers: { "X-User-Id": JSON.parse(localStorage.getItem("talentos_session")||"{}").userId } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `security-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Export failed"); }
  };

  return (
    <Card title="Security Audit Log" subtitle={`${total} events recorded`}
      action={
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn v="secondary" sz="sm" onClick={exportCsv}><Ic n="download" s={12}/> Export CSV</Btn>
          <Btn v="secondary" sz="sm" onClick={load}><Ic n="refresh-cw" s={12}/> Refresh</Btn>
        </div>
      }>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginTop:12,marginBottom:16,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>
        {[{id:"events",label:"Events"},{id:"summary",label:"Summary"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===t.id?700:500,background:tab===t.id?C.accentLight:"transparent",color:tab===t.id?C.accent:C.text3,fontFamily:F}}>{t.label}</button>
        ))}
      </div>

      {tab === "summary" && stats ? (
        <div>
          {/* Severity cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
            {Object.entries(stats.by_severity||{}).map(([sev,count])=>(
              <div key={sev} style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${sevColor[sev]||C.border}25`,background:`${sevColor[sev]||C.border}08`}}>
                <div style={{fontSize:20,fontWeight:800,color:sevColor[sev]||C.text1}}>{count}</div>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{sev}</div>
              </div>
            ))}
          </div>
          {/* Most denied */}
          {stats.top_denied_actions?.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>Most Denied Actions</div>
              {stats.top_denied_actions.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                  <code style={{fontSize:11,color:"#e03131",fontWeight:600,flex:1}}>{d.action}</code>
                  <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
          {/* Recent critical */}
          {stats.recent_critical?.length > 0 && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>Recent Critical Events</div>
              {stats.recent_critical.map((e,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#e03131",flexShrink:0}}/>
                  <code style={{fontSize:11,color:"#e03131",fontWeight:600}}>{e.event}</code>
                  <span style={{fontSize:11,color:C.text3,flex:1}}>{e.user_email||"system"}</span>
                  <span style={{fontSize:10,color:C.text3}}>{new Date(e.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Filters */}
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <select value={severityFilter} onChange={e=>{setSeverityFilter(e.target.value);setPage(1);}} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:C.surface,color:C.text1}}>
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
            </select>
            <select value={eventFilter} onChange={e=>{setEventFilter(e.target.value);setPage(1);}} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:C.surface,color:C.text1}}>
              <option value="">All event types</option>
              <option value="access_denied">Access Denied</option>
              <option value="permissions_changed">Permissions Changed</option>
              <option value="role_created">Role Created</option>
              <option value="role_deleted">Role Deleted</option>
              <option value="field_visibility_changed">Field Visibility</option>
            </select>
          </div>

          {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : items.length === 0 ? (
            <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No security audit events found</div>
          ) : (
            <div>
              {items.map(item => (
                <div key={item.id} onClick={()=>setExpanded(expanded===item.id?null:item.id)} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9f9fb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
                    <span style={{display:"inline-flex",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,color:sevColor[item.severity]||C.text3,background:`${sevColor[item.severity]||C.border}15`,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0}}>{item.severity}</span>
                    <code style={{fontSize:12,fontWeight:600,color:C.text1,flex:1}}>{item.event}</code>
                    <span style={{fontSize:11,color:C.text3}}>{item.user_email||"system"}</span>
                    <span style={{fontSize:10,color:C.text3,flexShrink:0}}>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  {expanded===item.id && item.details && (
                    <div style={{padding:"0 0 10px 30px",fontSize:11,color:C.text2,fontFamily:"ui-monospace,monospace",lineHeight:1.6,whiteSpace:"pre-wrap",maxHeight:200,overflow:"auto"}}>
                      {JSON.stringify(item.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
                <span style={{fontSize:12,color:C.text3}}>Page {page} · {items.length} of {total}</span>
                <div style={{display:"flex",gap:6}}>
                  <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</Btn>
                  <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>p+1)} disabled={items.length<25}>Next</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ── Active Sessions Section ──────────────────────────────────────────────────
const SessionsSection = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await api.get("/security/sessions");
    setSessions(Array.isArray(d)?d:[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id) => {
    await api.del(`/security/sessions/${id}`);
    load();
  };

  return (
    <Card title="Active Sessions" subtitle={`${sessions.length} active sessions`}>
      {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : (
        <div style={{marginTop:16}}>
          {sessions.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No active sessions</div>
          ) : sessions.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#f0f4ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic n="user" s={14} c={C.accent}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{s.user?.first_name} {s.user?.last_name}</div>
                <div style={{fontSize:11,color:C.text3}}>{s.user?.email} · Token: {s.token} · Expires: {new Date(s.expires_at).toLocaleString()}</div>
              </div>
              <Btn v="danger" sz="sm" onClick={()=>revoke(s.id)}>Revoke</Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ── Data Model Section ────────────────────────────────────────────────────────
const FIELD_TYPES_DM = [
  // Layout
  {value:"section_separator", label:"Section",      icon:"━",  group:"Layout"},
  // Text
  {value:"text",         label:"Text",         icon:"T",  group:"Text"},
  {value:"textarea",     label:"Long Text",    icon:"¶",  group:"Text"},
  {value:"rich_text",    label:"Rich Text",    icon:"✦",  group:"Text"},
  // Numbers
  {value:"number",       label:"Number",       icon:"#",  group:"Number"},
  {value:"currency",     label:"Currency",     icon:"$",  group:"Number"},
  {value:"percent",      label:"Percent",      icon:"%",  group:"Number"},
  {value:"formula",      label:"Formula",      icon:"ƒ",  group:"Number"},
  {value:"progress",     label:"Progress",     icon:"▬",  group:"Number"},
  // Dates
  {value:"date",         label:"Date",         icon:"📅", group:"Date"},
  {value:"datetime",     label:"Date & Time",  icon:"🕐", group:"Date"},
  {value:"date_range",   label:"Date Range",   icon:"↔",  group:"Date"},
  {value:"duration",     label:"Duration",     icon:"⏱",  group:"Date"},
  // Choice
  {value:"select",       label:"Select",       icon:"⊙",  group:"Choice"},
  {value:"multi_select", label:"Multi Select", icon:"⊛",  group:"Choice"},
  {value:"status",       label:"Status",       icon:"◈",  group:"Choice"},
  {value:"boolean",      label:"Boolean",      icon:"✓",  group:"Choice"},
  {value:"rating",       label:"Rating",       icon:"★",  group:"Choice"},
  // Contact
  {value:"email",        label:"Email",        icon:"@",  group:"Contact"},
  {value:"phone",        label:"Phone",        icon:"☎",  group:"Contact"},
  {value:"phone_intl",   label:"Phone (Intl)", icon:"☏",  group:"Contact"},
  {value:"url",          label:"URL",          icon:"🔗", group:"Contact"},
  {value:"social",       label:"Social Link",  icon:"⬡",  group:"Contact"},
  // Location
  {value:"country",      label:"Country",      icon:"🌍", group:"Location"},
  {value:"address",      label:"Address",      icon:"📍", group:"Location"},
  // Reference
  {value:"people",       label:"People",       icon:"👤", group:"Reference"},
  {value:"lookup",       label:"Lookup",       icon:"⤷",  group:"Reference"},
  {value:"rollup",       label:"Rollup",       icon:"∑",  group:"Reference"},
  // System
  {value:"auto_number",  label:"Auto Number",  icon:"№",  group:"System"},
  {value:"unique_id",    label:"Unique ID",    icon:"⌗",  group:"System"},
  // Legacy / kept for compatibility
  {value:"dataset",      label:"Data Set",     icon:"≡",  group:"Other"},
  {value:"skills",       label:"Skills",       icon:"⚡", group:"Other"},
];
const COLORS_DM = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#64748b"];

// ── PersonTypeConfig — manage person_type options for People objects ───────────
const PersonTypeConfig = ({ object, onUpdate }) => {
  const [options, setOptions] = useState(object.person_type_options || ['Employee','Contractor','Consultant','Candidate','Contact']);
  const [newOpt, setNewOpt]   = useState("");
  const [saving, setSaving]   = useState(false);

  const save = async (opts) => {
    setSaving(true);
    const updated = await tFetch(`/api/objects/${object.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ person_type_options: opts }),
    }).then(r=>r.json());
    setSaving(false);
    if (onUpdate) onUpdate(updated);
  };

  const addOption = () => {
    const trimmed = newOpt.trim();
    if (!trimmed || options.includes(trimmed)) return;
    const next = [...options, trimmed];
    setOptions(next); setNewOpt(""); save(next);
  };

  const removeOption = (opt) => {
    const next = options.filter(o => o !== opt);
    setOptions(next); save(next);
  };

  return (
    <div style={{ background:"#fff8f0", border:"1px solid #fed7aa", borderRadius:12,
      padding:"14px 16px", marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"#92400e", marginBottom:10 }}>
        👤 Person Type Options
      </div>
      <div style={{ fontSize:11, color:"#a16207", marginBottom:12 }}>
        These are the options for the <strong>Person Type</strong> field. Setting a record to <strong>Employee</strong> reveals employment fields (Job Title, Department, Entity, etc.).
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {options.map(opt => (
          <div key={opt} style={{ display:"flex", alignItems:"center", gap:5,
            background:"white", border:"1px solid #fed7aa", borderRadius:20,
            padding:"3px 10px", fontSize:12, fontWeight:600, color:"#92400e" }}>
            {opt}
            <button onClick={() => removeOption(opt)}
              style={{ background:"none", border:"none", cursor:"pointer",
                color:"#d97706", fontSize:14, lineHeight:1, padding:"0 0 0 2px" }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input value={newOpt} onChange={e=>setNewOpt(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") addOption(); }}
          placeholder="Add option…"
          style={{ flex:1, padding:"6px 10px", borderRadius:8, border:"1px solid #fed7aa",
            fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none" }}/>
        <button onClick={addOption} disabled={!newOpt.trim()||saving}
          style={{ padding:"6px 14px", borderRadius:8, border:"none",
            background:"#f59e0b", color:"white", fontSize:12, fontWeight:700,
            cursor:"pointer", opacity:(!newOpt.trim()||saving)?0.5:1 }}>
          {saving ? "…" : "Add"}
        </button>
      </div>
    </div>
  );
};

// ─── FieldList — drag-to-reorder + order-number input ────────────────────────
const FieldList = ({ fields, onReorder, onEdit, onDelete }) => {
  const [dragIdx,    setDragIdx]    = useState(null);
  const [overIdx,    setOverIdx]    = useState(null);
  const [orderInputs, setOrderInputs] = useState({}); // fieldId -> string while editing

  // Commit a numeric order input: supports decimals like "2.5"
  const commitOrder = (f, raw) => {
    const num = parseFloat(raw);
    if (isNaN(num)) { setOrderInputs(p => { const n={...p}; delete n[f.id]; return n; }); return; }
    // Insert field at the new position by sorting
    const others = fields.filter(x => x.id !== f.id);
    // Find insertion point
    let insertAt = others.length;
    for (let i = 0; i < others.length; i++) {
      const pos = i + 1; // 1-based current position of this "other" field
      if (num <= pos) { insertAt = i; break; }
    }
    const reordered = [...others.slice(0, insertAt), f, ...others.slice(insertAt)];
    setOrderInputs(p => { const n={...p}; delete n[f.id]; return n; });
    onReorder(reordered);
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", idx);
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...fields];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setDragIdx(null); setOverIdx(null);
    onReorder(reordered);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {fields.map((f, idx) => {
        const isSep = f.field_type === "section_separator";
        const isOver = overIdx === idx && dragIdx !== idx;
        const isDragging = dragIdx === idx;
        const orderVal = orderInputs.hasOwnProperty(f.id) ? orderInputs[f.id] : String(idx + 1);

        return (
          <div
            key={f.id}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            style={{
              display:"flex", alignItems:"center", gap:8,
              padding: isSep ? "8px 12px" : "9px 12px",
              borderRadius:10,
              border: isOver
                ? `2px solid ${C.accent}`
                : isSep
                ? "1.5px dashed #93c5fd"
                : `1px solid ${C.border}`,
              background: isDragging ? "#f0f4ff" : isSep ? "#f0f4ff" : "#fff",
              opacity: isDragging ? 0.5 : 1,
              transition: "border .1s, background .1s",
              cursor: "grab",
            }}
          >
            {/* Drag handle */}
            <div title="Drag to reorder" style={{
              display:"flex", flexDirection:"column", gap:2,
              padding:"2px 4px", cursor:"grab", flexShrink:0, color:C.text3,
              opacity: 0.5,
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{width:12,height:2,borderRadius:1,background:"currentColor"}}/>
              ))}
            </div>

            {/* Order number input */}
            <input
              type="text"
              value={orderVal}
              title="Order number (decimals like 2.5 allowed)"
              onChange={e => setOrderInputs(p => ({...p, [f.id]: e.target.value}))}
              onBlur={e => commitOrder(f, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.target.blur(); } if (e.key === "Escape") { setOrderInputs(p => { const n={...p}; delete n[f.id]; return n; }); } }}
              style={{
                width:34, textAlign:"center", padding:"3px 4px",
                border:`1px solid ${C.border}`, borderRadius:6,
                fontSize:11, fontWeight:700, color:C.text2,
                background:"#f8f9fc", fontFamily:F,
                flexShrink:0,
              }}
            />

            {/* Content */}
            {isSep ? (
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.07em"}}>━ {f.section_label||f.name}</span>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#dbeafe",color:"#3b82f6",fontWeight:600}}>section</span>
                </div>
                <div style={{fontSize:11,color:C.text3,marginTop:1}}>Fields below collapse under this header</div>
              </div>
            ) : (
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text1}}>{f.name}</span>
                  {f.is_system&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#f1f5f9",color:"#64748b",fontWeight:600}}>system</span>}
                  {!!f.is_required&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#fef2f2",color:"#ef4444",fontWeight:600}}>required</span>}
                </div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                  <code style={{fontFamily:"monospace"}}>{f.api_key}</code> · {f.field_type}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <Btn v="ghost" sz="sm" icon="edit" onClick={()=>onEdit(f)}/>
              {!f.is_system && <Btn v="ghost" sz="sm" icon="trash" onClick={()=>onDelete(f)} style={{color:"#ef4444"}}/>}
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ─── FieldModal (module-level — NOT inside DataModelSection) ──────────────────
// Props: field, selEnv, selObj, onSaved, onClose
function FieldModal({ field, selEnv, selObj, onSaved, onClose }) {
  const isEdit = !!field?.id;
  const [form, setForm] = React.useState({
    name: field?.name||"", api_key: field?.api_key||"", field_type: field?.field_type||"text",
    is_required: field?.is_required||false, show_in_list: field?.show_in_list!==undefined?!!field.show_in_list:true,
    options: field?.options ? (Array.isArray(field.options)?field.options.join(", "):field.options) : "",
    placeholder: field?.placeholder||"", help_text: field?.help_text||"",
    section_label: field?.section_label||"",
    related_object_slug: field?.related_object_slug||"people",
    people_multi: field?.people_multi!==undefined ? !!field.people_multi : true,
    dataset_id: field?.dataset_id||"",
    dataset_multi: field?.dataset_multi!==undefined ? !!field.dataset_multi : false,
    skills_multi: field?.skills_multi!==undefined ? !!field.skills_multi : true,
    skills_categories: field?.skills_categories||[],
  });
  const [autoKey, setAutoKey] = React.useState(!isEdit);
  const [saving, setSaving] = React.useState(false);
  const [datasets, setDatasets] = React.useState([]);
  const [skillsCats, setSkillsCats] = React.useState([]);

  React.useEffect(() => {
    if (selEnv?.id) {
      tFetch(`/api/datasets?environment_id=${selEnv.id}`).then(r=>r.json()).then(d=>setDatasets(Array.isArray(d)?d:[])).catch(()=>{});
      tFetch(`/api/enterprise/skills/categories?environment_id=${selEnv.id}`).then(r=>r.json()).then(d=>setSkillsCats(Array.isArray(d)?d.map(c=>c.category):[])).catch(()=>{});
    }
  }, [selEnv?.id]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleName = v => { set("name",v); if(autoKey) set("api_key", v.toLowerCase().replace(/[^a-z0-9]/g,"_").replace(/__+/g,"_").replace(/^_|_$/g,"")); };

  const handle = async () => {
    if (!form.name || !selObj?.id || !selEnv?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        object_id: selObj.id,
        environment_id: selEnv.id,
        options: ["select","multi_select","status"].includes(form.field_type) ? form.options.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
        related_object_slug: form.field_type === "people" ? form.related_object_slug : undefined,
        people_multi: form.field_type === "people" ? form.people_multi : undefined,
        dataset_id: form.field_type === "dataset" ? form.dataset_id : undefined,
        dataset_multi: form.field_type === "dataset" ? form.dataset_multi : undefined,
        skills_multi: form.field_type === "skills" ? form.skills_multi : undefined,
        skills_categories: form.field_type === "skills" ? form.skills_categories : undefined,
      };
      const result = isEdit ? await api.patch(`/fields/${field.id}`, payload) : await api.post("/fields", payload);
      if (result?.error) { alert(`Could not save field: ${result.error}`); setSaving(false); return; }
      onSaved();
      onClose();
    } catch(e) {
      alert(`Could not save field: ${e.message}`);
    }
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",width:520,maxHeight:"90vh",overflow:"auto",fontFamily:F,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif",letterSpacing:"-0.3px",marginBottom:16}}>{isEdit?"Edit":"New"} Field</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>
          {FIELD_TYPES_DM.map(ft=>(
            <button key={ft.value} onClick={()=>set("field_type",ft.value)} style={{padding:"7px 4px",borderRadius:8,border:`2px solid ${form.field_type===ft.value?"#3b5bdb":"#e8eaed"}`,background:form.field_type===ft.value?"#3b5bdb":"#fff",color:form.field_type===ft.value?"#fff":"#6b7280",cursor:"pointer",fontSize:10,fontWeight:600,textAlign:"center",fontFamily:F}}>
              <div>{ft.icon}</div><div>{ft.label}</div>
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Inp label="Field Name" value={form.name} onChange={handleName} required/>
          <Inp label="API Key" value={form.api_key} onChange={v=>{set("api_key",v);setAutoKey(false);}} disabled={isEdit&&field?.is_system}/>
        </div>
        {["select","multi_select","status"].includes(form.field_type) && <div style={{marginBottom:12}}><Inp label="Options (comma-separated)" value={form.options} onChange={v=>set("options",v)} placeholder="Option A, Option B"/></div>}
        {form.field_type === "people" && (
          <div style={{marginBottom:12,padding:"12px",background:"#f8f9fc",borderRadius:10,border:"1px solid #e8eaed"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>People Field Settings</div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:600,color:C.text3,display:"block",marginBottom:4}}>OBJECT TO LINK</label>
              <Inp value={form.related_object_slug} onChange={v=>set("related_object_slug",v)} placeholder="people"/>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[{v:false,l:"Single select"},{v:true,l:"Multi select"}].map(({v,l})=>(
                <button key={String(v)} onClick={()=>set("people_multi",v)}
                  style={{flex:1,padding:"6px",borderRadius:8,border:`2px solid ${form.people_multi===v?"#3b5bdb":"#e8eaed"}`,background:form.people_multi===v?"#3b5bdb":"#fff",color:form.people_multi===v?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:F}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        {form.field_type === "dataset" && (
          <div style={{marginBottom:12,padding:"12px",background:"#f8f9fc",borderRadius:10,border:"1px solid #e8eaed"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>Data Set Field</div>
            <select value={form.dataset_id} onChange={e=>set("dataset_id",e.target.value)}
              style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid #e8eaed",fontSize:13,fontFamily:F,background:"white",color:C.text1,marginBottom:8}}>
              <option value="">— choose a data set —</option>
              {datasets.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              {[{v:false,l:"Single select"},{v:true,l:"Multi select"}].map(({v,l})=>(
                <button key={String(v)} onClick={()=>set("dataset_multi",v)}
                  style={{flex:1,padding:"6px",borderRadius:8,border:`2px solid ${form.dataset_multi===v?"#3b5bdb":"#e8eaed"}`,background:form.dataset_multi===v?"#3b5bdb":"#fff",color:form.dataset_multi===v?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:F}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        {form.field_type === "skills" && (
          <div style={{marginBottom:12,padding:"12px",background:"#f8f9fc",borderRadius:10,border:"1px solid #e8eaed"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>Skills Field</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
              {(skillsCats.length>0?skillsCats:['Technology','Business','Design','Soft Skills','Languages','Certifications']).map(cat=>{
                const active=(form.skills_categories||[]).includes(cat);
                return <button key={cat} onClick={()=>set("skills_categories",active?(form.skills_categories||[]).filter(c=>c!==cat):[...(form.skills_categories||[]),cat])}
                  style={{padding:"3px 10px",borderRadius:99,border:`1.5px solid ${active?"#3b5bdb":"#e8eaed"}`,background:active?"#3b5bdb":"white",color:active?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{cat}</button>;
              })}
            </div>
            <div style={{display:"flex",gap:8}}>
              {[{v:true,l:"Multi select"},{v:false,l:"Single select"}].map(({v,l})=>(
                <button key={String(v)} onClick={()=>set("skills_multi",v)}
                  style={{flex:1,padding:"6px",borderRadius:8,border:`2px solid ${form.skills_multi===v?"#3b5bdb":"#e8eaed"}`,background:form.skills_multi===v?"#3b5bdb":"#fff",color:form.skills_multi===v?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:F}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <Inp label="Placeholder" value={form.placeholder} onChange={v=>set("placeholder",v)}/>
          <Inp label="Help Text" value={form.help_text} onChange={v=>set("help_text",v)}/>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          {form.field_type !== "section_separator" && [{k:"is_required",l:"Required"},{k:"show_in_list",l:"Show in list"}].map(({k,l})=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,fontWeight:600,color:C.text2}}>
              <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)}/>{l}
            </label>
          ))}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${C.border}`,paddingTop:16}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handle} disabled={saving||!form.name}>{saving?"Saving…":isEdit?"Save Changes":"Add Field"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── CreateObjectModal (module-level) ─────────────────────────────────────────
function CreateObjectModal({ selEnv, onCreated, onClose }) {
  const [form, setForm] = React.useState({name:"",plural_name:"",slug:"",color:"#6366f1",description:""});
  const [saving, setSaving] = React.useState(false);
  const [autoSlug, setAutoSlug] = React.useState(true);
  const [autoPlural, setAutoPlural] = React.useState(true);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleName = v => {
    set("name",v);
    if(autoSlug)   set("slug",   v.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/--+/g,"-").replace(/^-|-$/g,""));
    if(autoPlural) set("plural_name", v+"s");
  };
  const handle = async () => {
    setSaving(true);
    await api.post("/objects", { ...form, environment_id: selEnv.id });
    setSaving(false);
    onCreated();
    onClose();
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",width:440,fontFamily:F,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif",letterSpacing:"-0.3px",marginBottom:16}}>New Object</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Name" value={form.name} onChange={handleName} required/>
            <Inp label="Plural Name" value={form.plural_name} onChange={v=>{set("plural_name",v);setAutoPlural(false);}}/>
          </div>
          <Inp label="Slug" value={form.slug} onChange={v=>{set("slug",v);setAutoSlug(false);}} help="Used in API and URLs"/>
          <Inp label="Description" value={form.description} onChange={v=>set("description",v)}/>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Color</label>
            <div style={{display:"flex",gap:6}}>
              {COLORS_DM.map(c=><button key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:form.color===c?`3px solid ${c}`:"none",outlineOffset:2}}/>)}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:16}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handle} disabled={saving||!form.name} style={{background:form.color}}>{saving?"Creating…":"Create Object"}</Btn>
        </div>
      </div>
    </div>
  );
}

const DataModelSection = () => {
  const [envs,       setEnvs]       = useState([]);
  const [selEnv,     setSelEnv]     = useState(null);
  const [objects,    setObjects]    = useState([]);
  const [selObj,     setSelObj]     = useState(null);
  const [fields,     setFields]     = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showField,  setShowField]  = useState(false);
  const [editField,  setEditField]  = useState(null);
  const [loading,    setLoading]    = useState(false);

  // Load envs
  useEffect(() => {
    api.get("/environments").then(d => {
      const list = Array.isArray(d) ? d : [];
      setEnvs(list);
      const def = list.find(e => e.is_default) || list[0];
      if (def) setSelEnv(def);
    });
  }, []);

  // Load objects when env changes
  useEffect(() => {
    if (!selEnv) return;
    api.get(`/objects?environment_id=${selEnv.id}`).then(d => {
      setObjects(Array.isArray(d) ? d : []);
      setSelObj(null);
    });
  }, [selEnv?.id]);

  // Load fields when object selected
  useEffect(() => {
    if (!selObj) return;
    setLoading(true);
    api.get(`/fields?object_id=${selObj.id}`).then(d => {
      setFields(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, [selObj?.id]);

  const reloadFields = () => {
    if (!selObj?.id) return;
    api.get(`/fields?object_id=${selObj.id}`).then(d => setFields(Array.isArray(d)?d:[]));
  };
  const reloadObjects = () => {
    if (!selEnv?.id) return;
    api.get(`/objects?environment_id=${selEnv.id}`).then(d => setObjects(Array.isArray(d)?d:[]));
  };

  const deleteField = async (f) => {
    if (!confirm(`Delete field "${f.name}"? This removes data from all records.`)) return;
    await api.del(`/fields/${f.id}`);
    reloadFields();
  };

  // ── FieldModal & CreateObjectModal are defined at module level above ──


  if (!selEnv) return <div style={{padding:40,textAlign:"center",color:C.text3}}>Loading…</div>;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif",letterSpacing:"-0.4px"}}>Data Model</div>
          <div style={{fontSize:12,color:C.text3}}>Configure objects and fields for each environment</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <select value={selEnv?.id||""} onChange={e=>setSelEnv(envs.find(v=>v.id===e.target.value))}
            style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:"#fff",color:C.text1}}>
            {envs.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {selObj && <Btn v="ghost" sz="sm" icon="x" onClick={()=>setSelObj(null)}>Back to Objects</Btn>}
          {!selObj && <Btn sz="sm" icon="plus" onClick={()=>setShowCreate(true)}>New Object</Btn>}
          {selObj  && <Btn sz="sm" icon="plus" onClick={()=>setShowField(true)}>Add Field</Btn>}
        </div>
      </div>

      {/* Objects grid */}
      {!selObj && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {objects.map(o=>(
            <div key={o.id} onClick={()=>setSelObj(o)} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.borderColor="#d1d5db";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
              <div style={{width:40,height:40,borderRadius:10,background:o.color||"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:"white",fontSize:16,fontWeight:700}}>{o.name.charAt(0)}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{o.plural_name||o.name}</div>
                <div style={{fontSize:11,color:C.text3}}>{o.field_count||0} fields · {o.record_count||0} records {o.is_system&&"· system"}</div>
              </div>
              <Ic n="chevR" s={14} c={C.text3}/>
            </div>
          ))}
        </div>
      )}

      {/* Fields list */}
      {selObj && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"14px 16px",background:"#fff",borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{width:36,height:36,borderRadius:9,background:selObj.color||"#6366f1",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:"white",fontSize:14,fontWeight:700}}>{selObj.name.charAt(0)}</span>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif",letterSpacing:"-0.3px"}}>{selObj.name} Schema</div>
              <div style={{fontSize:11,color:C.text3}}>{fields.length} fields</div>
            </div>
          </div>
          {loading ? <div style={{padding:40,textAlign:"center",color:C.text3}}>Loading fields…</div> : (
            <>
              {/* Person Type config — only for People objects */}
              {selObj.slug === "people" && (
                <PersonTypeConfig object={selObj} onUpdate={updated => { setSelObj(updated); reloadObjects(); }}/>
              )}
              <FieldList
                fields={fields}
                onReorder={async (reordered) => {
                  setFields(reordered);
                  await api.post("/fields/reorder", {
                    field_orders: reordered.map((f, i) => ({ id: f.id, sort_order: i + 1 }))
                  });
                }}
                onEdit={f => setEditField(f)}
                onDelete={deleteField}
              />
            </>
          )}
        </div>
      )}

      {showCreate && <CreateObjectModal selEnv={selEnv} onCreated={()=>{ reloadObjects(); }} onClose={()=>setShowCreate(false)}/>}
      {(showField||editField) && <FieldModal field={editField} selEnv={selEnv} selObj={selObj} onSaved={reloadFields} onClose={()=>{setShowField(false);setEditField(null);}}/>}
    </div>
  );
};

// ─── Import/Export Tabs Wrapper ──────────────────────────────────────────────
const ImportExportTabs = ({ environment }) => {
  const [ietab, setIetab] = useState("config");
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[{id:"config",label:"Platform Config"},{id:"data",label:"Data Import"}].map(t=>
          <button key={t.id} onClick={()=>setIetab(t.id)} style={{
            padding:"7px 16px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,
            cursor:"pointer",fontFamily:F,
            background:ietab===t.id?C.accent:"transparent",
            color:ietab===t.id?"white":C.text3,
          }}>{t.label}</button>
        )}
      </div>
      {ietab==="config" ? <ConfigSection environment={environment}/> : <DataImportSettings environment={environment}/>}
    </div>
  );
};

// ─── Config Import / Export Section ──────────────────────────────────────────
const ConfigSection = ({ environment }) => {
  const [status,    setStatus]    = useState(null);
  const [diff,      setDiff]      = useState(null);
  const [diffMeta,  setDiffMeta]  = useState(null);
  const [pending,   setPending]   = useState(null);
  const [applying,  setApplying]  = useState(false);
  const [mode,      setMode]      = useState('merge');
  const fileRef = useRef(null);
  const envId = environment?.id;

  const handleExport = () => {
    const a = document.createElement('a');
    a.href = `/api/config/export?environment_id=${envId}`;
    a.download = `talentos-config-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setStatus({ type:'success', msg:'Config exported successfully.' });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setStatus({ type:'info', msg:'Validating config file…' }); setDiff(null); setPending(null);
    try {
      const json = JSON.parse(await file.text());
      const res  = await tFetch(`/api/config/preview?environment_id=${envId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(json) });
      const data = await res.json();
      if (!res.ok) { setStatus({ type:'error', msg: data.error||'Invalid config file.' }); return; }
      setDiff(data.diff); setDiffMeta(data.meta); setPending(json);
      setStatus({ type:'info', msg:'Review the changes below, then click Apply Import.' });
    } catch(err) { setStatus({ type:'error', msg:`Parse error: ${err.message}` }); }
    e.target.value = '';
  };

  const handleApply = async () => {
    if (!pending) return; setApplying(true);
    try {
      const res  = await tFetch(`/api/config/import?environment_id=${envId}&mode=${mode}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pending) });
      const data = await res.json();
      if (!res.ok) { setStatus({ type:'error', msg: data.error||'Import failed.' }); return; }
      const summary = Object.entries(data.results).filter(([,v])=>v>0).map(([k,v])=>`${v} ${k}`).join(', ');
      setStatus({ type:'success', msg:`Import complete: ${summary||'no changes'}. Reload to see changes.` });
      setDiff(null); setPending(null);
    } catch(err) { setStatus({ type:'error', msg: err.message }); }
    setApplying(false);
  };

  const DiffPills = ({ items, color, bg }) => items?.length > 0 ? (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 }}>
      {items.map((n,i) => <span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:bg, color, fontWeight:600 }}>{n}</span>)}
    </div>
  ) : null;

  const card = { background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:'22px 24px', marginBottom:16 };
  const btn  = (col) => ({ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, border:'none', background:col, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F });

  return (
    <div style={{ maxWidth:720 }}>
      <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:700, color:C.text1, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.4px" }}>Import / Export</h2>
      <p style={{ margin:'0 0 20px', fontSize:13, color:C.text3 }}>Export your platform configuration or import from another environment.</p>

      {status && (
        <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14, fontSize:13, fontWeight:500,
          background:status.type==='error'?'#fef2f2':status.type==='success'?'#f0fdf4':'#eff6ff',
          color:status.type==='error'?'#b91c1c':status.type==='success'?'#15803d':'#1d4ed8',
          border:`1px solid ${status.type==='error'?'#fecaca':status.type==='success'?'#bbf7d0':'#bfdbfe'}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <span>{status.msg}</span>
          <button onClick={()=>setStatus(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'inherit', opacity:0.6 }}>×</button>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginBottom:4 }}>Export Configuration</div>
        <div style={{ fontSize:13, color:C.text3, marginBottom:14 }}>Downloads a JSON bundle of all objects, fields, workflows, email templates, portals, saved lists, and org structure.</div>
        <button onClick={handleExport} style={btn(C.accent)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export config
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginBottom:4 }}>Import Configuration</div>
        <div style={{ fontSize:13, color:C.text3, marginBottom:12 }}>Upload a config JSON — you'll preview what changes before anything is applied.</div>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['merge','Merge','Add/update, keep existing'],['replace','Replace','Imported data overwrites']].map(([val,label,desc])=>(
            <div key={val} onClick={()=>setMode(val)} style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`2px solid ${mode===val?C.accent:C.border}`, cursor:'pointer', background:mode===val?'#eff6ff':C.surface }}>
              <div style={{ fontSize:13, fontWeight:700, color:mode===val?C.accent:C.text1 }}>{label}</div>
              <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{desc}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>fileRef.current?.click()} style={btn('#64748b')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Choose config file…
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleFileChange}/>

        {diff && diffMeta && (
          <div style={{ borderTop:`1px solid ${C.border}`, marginTop:16, paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:12 }}>
              Preview — from "{diffMeta.environment_name}" · exported {new Date(diffMeta.exported_at).toLocaleDateString()}
            </div>
            {Object.entries(diff).map(([col, ch]) => {
              const total = (ch.add?.length||0)+(ch.update?.length||0)+(ch.remove?.length||0);
              if (!total) return null;
              return (
                <div key={col} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:C.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{col.replace(/_/g,' ')}</div>
                  <DiffPills items={ch.add}    color="#15803d" bg="#dcfce7"/>
                  <DiffPills items={ch.update} color="#92400e" bg="#fef3c7"/>
                  <DiffPills items={ch.remove} color="#b91c1c" bg="#fee2e2"/>
                </div>
              );
            })}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={handleApply} disabled={applying} style={{...btn('#16a34a'), opacity:applying?0.6:1}}>
                {applying?'Applying…':'✓ Apply Import'}
              </button>
              <button onClick={()=>{setDiff(null);setPending(null);setStatus(null);}}
                style={{ padding:'9px 16px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, color:C.text2 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Bulk Threshold Setting (sub-component used inside Appearance) ────────────
const BULK_THRESHOLD_KEY = "talentos_bulk_threshold";
export const getBulkThreshold = (roleSlug) => {
  if (roleSlug) {
    const v = localStorage.getItem(`${BULK_THRESHOLD_KEY}_${roleSlug}`);
    if (v !== null) return parseInt(v, 10);
  }
  return parseInt(localStorage.getItem(BULK_THRESHOLD_KEY) || "20", 10);
};

// ─── Appearance Section ───────────────────────────────────────────────────────
function AppearanceSection() {
  const { prefs, update } = useTheme();
  const labelSt = { fontSize:11, fontWeight:800, color:C.text2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 };

  const handleLangSelect = async (code) => {
    if (code === locale) return;
    setGenStatus(s => ({ ...s, [code]: "loading" }));
    const ok = await generateTranslations(code);
    setGenStatus(s => ({ ...s, [code]: ok ? "done" : "error" }));
  };

  return (
    <div style={{ maxWidth:540 }}>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, color:C.text1, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.4px" }}>Appearance</h2>
      <p style={{ margin:"0 0 28px", fontSize:13, color:C.text3 }}>Personalise your workspace theme and layout.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

        {/* Mode */}
        <div>
          <div style={labelSt}>Mode</div>
          <div style={{ display:"flex", gap:8 }}>
            {[{id:false,label:"Light"},{id:true,label:"Dark"}].map(({id,label}) => (
              <button key={String(id)} onClick={() => update("dark", id)} style={{
                flex:1, padding:"10px 0", borderRadius:9, border:`1.5px solid ${prefs.dark===id?C.accent:C.border}`,
                background:prefs.dark===id?C.accentLight:C.surface, color:prefs.dark===id?C.accent:C.text2,
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all 0.15s"
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Colour */}
        <div>
          <div style={labelSt}>Colour</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
            {Object.entries(SCHEMES).map(([id, s]) => (
              <button key={id} onClick={() => update("scheme", id)} title={s.label} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"10px 4px",
                borderRadius:10, border:`1.5px solid ${prefs.scheme===id?C.accent:C.border}`,
                background:prefs.scheme===id?C.accentLight:C.surface, cursor:"pointer", fontFamily:F, transition:"all 0.15s"
              }}>
                <div style={{ display:"flex", gap:3 }}>
                  <span style={{ width:12, height:12, borderRadius:"50%", background:s.accentDark, display:"inline-block" }}/>
                  <span style={{ width:12, height:12, borderRadius:"50%", background:s.accent, display:"inline-block" }}/>
                </div>
                <span style={{ fontSize:10, fontWeight:600, color:prefs.scheme===id?C.accent:C.text3 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <div style={labelSt}>Font</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(FONTS).map(([id, f]) => (
              <button key={id} onClick={() => update("font", id)} style={{
                padding:"10px 14px", borderRadius:9, border:`1.5px solid ${prefs.font===id?C.accent:C.border}`,
                background:prefs.font===id?C.accentLight:C.surface, color:prefs.font===id?C.accent:C.text2,
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:f.value, textAlign:"left",
                display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all 0.15s"
              }}>
                <span>{f.label}</span>
                <span style={{ fontSize:11, opacity:0.5 }}>Aa</span>
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <div style={labelSt}>Density</div>
          <div style={{ display:"flex", gap:8 }}>
            {Object.entries(DENSITIES).map(([id, d]) => (
              <button key={id} onClick={() => update("density", id)} style={{
                flex:1, padding:"10px 0", borderRadius:9, border:`1.5px solid ${prefs.density===id?C.accent:C.border}`,
                background:prefs.density===id?C.accentLight:C.surface, color:prefs.density===id?C.accent:C.text2,
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all 0.15s"
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        {/* Bulk Action Warning — now in Roles & Permissions */}

      </div>
    </div>
  );
}

// ─── Language Section ─────────────────────────────────────────────────────────
function LanguageSection() {
  const { locale, generateTranslations, generating, LANGUAGES } = useI18n();
  const [genStatus, setGenStatus] = useState({});

  const handleLangSelect = async (code) => {
    if (code === locale) return;
    setGenStatus(s => ({ ...s, [code]: "loading" }));
    const ok = await generateTranslations(code);
    setGenStatus(s => ({ ...s, [code]: ok ? "done" : "error" }));
  };

  return (
    <div style={{ maxWidth:540 }}>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, color:C.text1, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.4px" }}>Language</h2>
      <p style={{ margin:"0 0 24px", fontSize:13, color:C.text3 }}>Choose your preferred display language.</p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        {LANGUAGES.map(lang => {
          const isActive  = locale === lang.code;
          const isLoading = genStatus[lang.code] === "loading" || (generating && lang.code !== locale);
          return (
            <button key={lang.code} onClick={() => handleLangSelect(lang.code)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderRadius:10,
                border:`1.5px solid ${isActive ? C.accent : C.border}`,
                background: isActive ? C.accentLight : C.surface,
                cursor: isLoading ? "wait" : "pointer", fontFamily:F, transition:"all .15s",
                opacity: isLoading ? 0.7 : 1 }}>
              <span style={{ fontSize:20 }}>{lang.flag}</span>
              <div style={{ textAlign:"left", flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: isActive ? C.accent : C.text1 }}>{lang.label}</div>
                <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>
                  {lang.code.toUpperCase()}{lang.dir === "rtl" ? " · RTL" : ""}
                </div>
              </div>
              {isActive  && <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, flexShrink:0 }}/>}
              {isLoading && <div style={{ fontSize:10, color:C.text3, flexShrink:0 }}>…</div>}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"12px 14px", borderRadius:10, background:"#f8f9fc", border:`1px solid ${C.border}`, fontSize:12, color:C.text3, lineHeight:1.6 }}>
        Non-English languages are AI-generated on first use and cached for the session. Switching back to English is instant.
      </div>
    </div>
  );
}

function CompanyProfilePanel({ environment }) {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [editing, setEditing]   = useState(null); // which section is open
  const [form,    setForm]      = useState({});
  const [launched, setLaunched] = useState(false);

  const envId = environment?.id;

  // Load profile on mount
  useEffect(() => {
    if (!envId) return;
    tFetch(`/api/company-research?environment_id=${envId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [envId]);

  const launchWizard = () => {
    if (envId) localStorage.removeItem(`talentos_setup_complete_${envId}`);
    window.dispatchEvent(new CustomEvent('talentos:launch-setup-wizard'));
    setLaunched(true);
    setTimeout(() => setLaunched(false), 3000);
  };

  const startEdit = (section, initial) => {
    setEditing(section);
    setForm(initial);
  };

  const saveSection = async (patch) => {
    setSaving(true);
    try {
      const merged = { ...(profile || {}), ...patch, environment_id: envId };
      const r = await tFetch('/api/company-research/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment_id: envId, profile: merged, apply_templates: false }),
      });
      if (r.ok) { const d = await r.json(); setProfile(d.profile || merged); }
      setEditing(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };


  // ── Shared helpers ─────────────────────────────────────────────────────────
  const FRow = ({ label, value, placeholder = "—" }) => (
    <div style={{ display:"flex", gap:12, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:160, flexShrink:0, fontSize:12, fontWeight:600, color:C.text3, paddingTop:1 }}>{label}</div>
      <div style={{ flex:1, fontSize:13, color: value ? C.text1 : C.text3, fontStyle: value ? "normal" : "italic" }}>{value || placeholder}</div>
    </div>
  );

  const SectionCard = ({ title, icon, onEdit, children }) => (
    <div style={{ background:C.surface, borderRadius:14, border:`1.5px solid ${C.border}`, marginBottom:16, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background:"#fafbff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Ic n={icon} s={15} c={C.accent}/>
          <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{title}</span>
        </div>
        <button onClick={onEdit} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
          <Ic n="edit" s={12} c={C.text3}/>Edit
        </button>
      </div>
      <div style={{ padding:"4px 20px 12px" }}>{children}</div>
    </div>
  );

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.text3 }}>Loading profile…</div>;

  const hasProfile = !!profile;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:C.text1, margin:"0 0 4px", fontFamily:F }}>Company Profile</h2>
          <p style={{ fontSize:14, color:C.text3, margin:0 }}>Your organisation's brand, locations, EVP and tone — used by the AI Copilot to write on-brand content.</p>
        </div>
        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
          {saved && <span style={{ fontSize:12, color:C.green, display:"flex", alignItems:"center", gap:4 }}><Ic n="check" s={12} c={C.green}/>Saved</span>}
          <button onClick={launchWizard} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10, border:"none", background: launched ? C.green : C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, transition:"background 0.2s" }}>
            <Ic n="sparkle" s={14} c="white"/>
            {launched ? "Opening…" : hasProfile ? "Re-run AI Research" : "Run AI Research"}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasProfile && (
        <div style={{ textAlign:"center", padding:"48px 32px", borderRadius:16, border:`2px dashed ${C.border}`, background:C.surface }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`${C.accent}12`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Ic n="building" s={26} c={C.accent}/>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text1, marginBottom:8 }}>No company profile yet</div>
          <p style={{ fontSize:13, color:C.text3, margin:"0 0 20px", maxWidth:360, marginLeft:"auto", marginRight:"auto", lineHeight:1.6 }}>
            Click "Run AI Research" to automatically populate your profile, or add your details manually using the sections below.
          </p>
          <button onClick={() => startEdit("identity", { name:"", industry:"", size:"", founded:"", website:"", logo_url:"", brand_color:"#4361EE", headquarters:"", description:"", tone:"professional" })}
            style={{ padding:"9px 20px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"white", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
            + Add manually
          </button>
        </div>
      )}

      {/* ── Identity section ──────────────────────────────────────────────── */}
      {hasProfile && (
        <SectionCard title="Identity" icon="building"
          onEdit={() => startEdit("identity", { name: profile.name||"", industry: profile.industry||"", size: profile.size||"", founded: profile.founded||"", website: profile.website||"", logo_url: profile.logo_url||"", brand_color: profile.brand_color||"#4361EE", headquarters: profile.headquarters||"", description: profile.description||"", tone: profile.tone||"professional" })}>
          <div style={{ display:"flex", gap:16, paddingTop:12, alignItems:"flex-start" }}>
            {profile.logo_url && (
              <div style={{ width:56, height:56, borderRadius:12, border:`1.5px solid ${C.border}`, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#f9fafb" }}>
                <img src={profile.logo_url} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain", padding:6 }} onError={e=>e.target.style.display="none"}/>
              </div>
            )}
            <div style={{ flex:1 }}>
              <FRow label="Company name" value={profile.name}/>
              <FRow label="Industry" value={profile.industry}/>
              <FRow label="Size" value={profile.size}/>
              <FRow label="Founded" value={profile.founded}/>
              <FRow label="Headquarters" value={profile.headquarters}/>
              <FRow label="Website" value={profile.website}/>
              <FRow label="Communication tone" value={profile.tone}/>
              <FRow label="Brand colour" value={profile.brand_color ? <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><span style={{ width:14, height:14, borderRadius:3, background:profile.brand_color, display:"inline-block", border:"1px solid rgba(0,0,0,0.1)" }}/>{profile.brand_color}</span> : null}/>
            </div>
          </div>
          {profile.description && <div style={{ fontSize:13, color:C.text2, lineHeight:1.6, padding:"10px 0 4px", borderTop:`1px solid ${C.border}`, marginTop:4 }}>{profile.description}</div>}
        </SectionCard>
      )}

      {/* ── EVP section ───────────────────────────────────────────────────── */}
      {hasProfile && (
        <SectionCard title="Employer Value Proposition" icon="star"
          onEdit={() => startEdit("evp", { headline: profile.evp?.headline||"", statement: profile.evp?.statement||"", pillars: (profile.evp?.pillars||[]).join("\n"), culture_points: (profile.evp?.culture_points||[]).join("\n") })}>
          <FRow label="Headline" value={profile.evp?.headline}/>
          <FRow label="Statement" value={profile.evp?.statement}/>
          {profile.evp?.pillars?.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"8px 0" }}>
              {profile.evp.pillars.map((p,i) => <span key={i} style={{ padding:"3px 10px", borderRadius:99, background:`${C.accent}12`, color:C.accent, fontSize:12, fontWeight:600 }}>{p}</span>)}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Locations section ─────────────────────────────────────────────── */}
      {hasProfile && (
        <SectionCard title="Locations" icon="map"
          onEdit={() => startEdit("locations", { locations_text: (profile.locations||[]).map(l=>`${l.city}, ${l.country}${l.is_hq?" (HQ)":""}`).join("\n") })}>
          {(profile.locations||[]).length === 0
            ? <div style={{ fontSize:13, color:C.text3, padding:"10px 0", fontStyle:"italic" }}>No locations added</div>
            : <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"10px 0" }}>
                {profile.locations.map((loc,i) => (
                  <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background: loc.is_hq ? `${C.accent}12` : "#F3F4F6", border:`1px solid ${loc.is_hq ? C.accent+"30" : C.border}`, color: loc.is_hq ? C.accent : C.text2, fontSize:12, fontWeight: loc.is_hq ? 700 : 400 }}>
                    <Ic n="map" s={10} c={loc.is_hq ? C.accent : C.text3}/>{loc.city}, {loc.country}{loc.is_hq && " · HQ"}
                  </span>
                ))}
              </div>
          }
        </SectionCard>
      )}

      {/* ── Typical roles & benefits ──────────────────────────────────────── */}
      {hasProfile && (
        <SectionCard title="Typical Roles & Benefits" icon="briefcase"
          onEdit={() => startEdit("roles", { typical_roles: (profile.typical_roles||[]).join("\n"), key_benefits: (profile.key_benefits||[]).join("\n") })}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, paddingTop:8 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:C.text2, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Typical roles hired</div>
              {(profile.typical_roles||[]).map((r,i) => <div key={i} style={{ fontSize:13, color:C.text2, padding:"3px 0" }}>• {r}</div>)}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:C.text2, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Key benefits</div>
              {(profile.key_benefits||[]).map((b,i) => <div key={i} style={{ fontSize:13, color:C.text2, padding:"3px 0" }}>• {b}</div>)}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Social / web ──────────────────────────────────────────────────── */}
      {hasProfile && (
        <SectionCard title="Web & Social" icon="globe"
          onEdit={() => startEdit("social", { linkedin: profile.social?.linkedin||"", twitter: profile.social?.twitter||"" })}>
          <FRow label="LinkedIn" value={profile.social?.linkedin}/>
          <FRow label="Twitter / X" value={profile.social?.twitter}/>
        </SectionCard>
      )}

      {/* ── Edit modals ───────────────────────────────────────────────────── */}
      {editing === "identity" && (
        <Modal title="Edit Identity" onClose={() => setEditing(null)} width={560}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Company name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required/>
              <Inp label="Website" value={form.website} onChange={v=>setForm(f=>({...f,website:v}))} placeholder="https://..."/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Sel label="Industry" value={form.industry} onChange={v=>setForm(f=>({...f,industry:v}))} options={["","technology","finance","healthcare","legal","consulting","retail","manufacturing","media","energy","other"].map(v=>({value:v,label:v||"Select…"}))}/>
              <Sel label="Size" value={form.size} onChange={v=>setForm(f=>({...f,size:v}))} options={["","startup","small","medium","large","enterprise"].map(v=>({value:v,label:v||"Select…"}))}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Founded" value={form.founded} onChange={v=>setForm(f=>({...f,founded:v}))} placeholder="e.g. 2005"/>
              <Inp label="Headquarters" value={form.headquarters} onChange={v=>setForm(f=>({...f,headquarters:v}))} placeholder="Dubai, UAE"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Logo URL" value={form.logo_url} onChange={v=>setForm(f=>({...f,logo_url:v}))} placeholder="https://..."/>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Brand colour</label>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="color" value={form.brand_color||"#4361EE"} onChange={e=>setForm(f=>({...f,brand_color:e.target.value}))} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${C.border}`, padding:2, cursor:"pointer" }}/>
                  <Inp value={form.brand_color} onChange={v=>setForm(f=>({...f,brand_color:v}))} placeholder="#4361EE"/>
                </div>
              </div>
            </div>
            <Sel label="Communication tone" value={form.tone} onChange={v=>setForm(f=>({...f,tone:v}))} options={["formal","professional","conversational","startup","creative"].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))}/>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Description</label>
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} placeholder="2-3 sentences about what the company does…" style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:4 }}>
              <button onClick={()=>setEditing(null)} style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
              <button onClick={()=>saveSection({ name:form.name, industry:form.industry, size:form.size, founded:form.founded, website:form.website, logo_url:form.logo_url, brand_color:form.brand_color, headquarters:form.headquarters, description:form.description, tone:form.tone })} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {editing === "evp" && (
        <Modal title="Edit EVP" onClose={() => setEditing(null)} width={520}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Inp label="Headline" value={form.headline} onChange={v=>setForm(f=>({...f,headline:v}))} placeholder="Max 10 words — why people love working here"/>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Statement</label>
              <textarea value={form.statement} onChange={e=>setForm(f=>({...f,statement:e.target.value}))} rows={3} placeholder="2-3 sentences about what makes you a great employer…" style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Culture pillars <span style={{ fontWeight:400, color:C.text3 }}>(one per line)</span></label>
              <textarea value={form.pillars} onChange={e=>setForm(f=>({...f,pillars:e.target.value}))} rows={3} placeholder={"Innovation\nCollaboration\nImpact"} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setEditing(null)} style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
              <button onClick={()=>saveSection({ evp:{ headline:form.headline, statement:form.statement, pillars:form.pillars.split("\n").map(s=>s.trim()).filter(Boolean), culture_points:form.culture_points?.split("\n").map(s=>s.trim()).filter(Boolean)||[] }})} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {editing === "locations" && (
        <Modal title="Edit Locations" onClose={() => setEditing(null)} width={480}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Locations <span style={{ fontWeight:400, color:C.text3 }}>(one per line — add "(HQ)" to mark headquarters)</span></label>
              <textarea value={form.locations_text} onChange={e=>setForm(f=>({...f,locations_text:e.target.value}))} rows={6} placeholder={"Dubai, UAE (HQ)\nLondon, UK\nNew York, USA"} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setEditing(null)} style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
              <button onClick={()=>{
                const locs = form.locations_text.split("\n").map(s=>s.trim()).filter(Boolean).map(s=>{
                  const isHQ = /\(hq\)/i.test(s);
                  const clean = s.replace(/\s*\(hq\)/i,"").trim();
                  const parts = clean.split(",").map(p=>p.trim());
                  return { city:parts[0]||"", country:parts[1]||"", is_hq:isHQ };
                });
                saveSection({ locations: locs });
              }} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {editing === "roles" && (
        <Modal title="Edit Roles & Benefits" onClose={() => setEditing(null)} width={520}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Typical roles hired <span style={{ fontWeight:400, color:C.text3 }}>(one per line)</span></label>
              <textarea value={form.typical_roles} onChange={e=>setForm(f=>({...f,typical_roles:e.target.value}))} rows={4} placeholder={"Software Engineer\nProduct Manager\nData Analyst"} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>Key benefits <span style={{ fontWeight:400, color:C.text3 }}>(one per line)</span></label>
              <textarea value={form.key_benefits} onChange={e=>setForm(f=>({...f,key_benefits:e.target.value}))} rows={4} placeholder={"Flexible working\nGenerous annual leave\nLearning & development budget"} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setEditing(null)} style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
              <button onClick={()=>saveSection({ typical_roles:form.typical_roles.split("\n").map(s=>s.trim()).filter(Boolean), key_benefits:form.key_benefits.split("\n").map(s=>s.trim()).filter(Boolean) })} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {editing === "social" && (
        <Modal title="Edit Web & Social" onClose={() => setEditing(null)} width={480}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Inp label="LinkedIn URL" value={form.linkedin} onChange={v=>setForm(f=>({...f,linkedin:v}))} placeholder="https://linkedin.com/company/..."/>
            <Inp label="Twitter / X URL" value={form.twitter} onChange={v=>setForm(f=>({...f,twitter:v}))} placeholder="https://twitter.com/..."/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setEditing(null)} style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>Cancel</button>
              <button onClick={()=>saveSection({ social:{ linkedin:form.linkedin, twitter:form.twitter }})} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:C.accent, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

const NAV_GROUPS = [
  {
    id: "preferences",
    label: "Your preferences",
    items: [
      { id:"appearance",  icon:"sun",       label:"Appearance" },
      { id:"language",    icon:"globe",     label:"Language" },
      { id:"setup_wizard", icon:"building", label:"Company Profile" },
    ],
  },
  {
    id: "people",
    label: "People & access",
    items: [
      { id:"users",  icon:"users",  label:"Users" },
      { id:"groups", icon:"layers", label:"Groups" },
      { id:"roles",  icon:"shield", label:"Roles & permissions" },
      { id:"org",    icon:"layers", label:"Org structure" },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      { id:"security", icon:"lock",     label:"Security" },
      { id:"sessions", icon:"activity", label:"Active sessions" },
      { id:"audit",    icon:"key",      label:"Audit log" },
    ],
  },
  {
    id: "schema",
    label: "Data & schema",
    items: [
      { id:"datamodel",  icon:"database",    label:"Data model" },
      { id:"duplicates", icon:"users",       label:"Duplicates" },
      { id:"file_types", icon:"paperclip",   label:"File types" },
      { id:"company_docs", icon:"file",       label:"Company Documents" },
      { id:"forms",      icon:"form",        label:"Forms" },
      { id:"questions",  icon:"help-circle", label:"Question library" },
      { id:"agents",     icon:"bot",         label:"Agents" },
      { id:"datasets",   icon:"layers",      label:"Data Sets" },
      { id:"enterprise", icon:"briefcase",   label:"Enterprise Settings" },
    ],
  },
  {
    id: "processes",
    label: "Processes",
    items: [
      { id:"brand_kits",      icon:"palette",  label:"Brand Kits" },
      { id:"email_templates", icon:"mail",     label:"Email Templates" },
      { id:"workflows", icon:"workflow", label:"Workflows" },
      { id:"portals",   icon:"globe",    label:"Portals" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { id:"ai_governance", icon:"sparkles", label:"AI governance" },
      { id:"ai_matching",   icon:"zap",      label:"Recommendations" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id:"superadmin",       icon:"zap",        label:"Integrations" },
      { id:"feature-flags",    icon:"flag",       label:"Feature Flags" },
      { id:"integration_hub",  icon:"webhook",    label:"Integration Hub" },
      { id:"sandbox",          icon:"gitBranch",  label:"Sandbox Manager" },
      { id:"config",           icon:"refresh",    label:"Import / Export" },
    ],
  },
];

export default function SettingsPage({ currentUser, environment, initialSection, onSectionChange }) {
  const [activeSection, setActiveSectionState] = useState(initialSection || null);
  const [fullScreenMode, setFullScreenMode] = useState(false);

  const setActiveSection = (id) => {
    if (id !== "portals") setFullScreenMode(false);
    window.dispatchEvent(new CustomEvent("talentos:settings-section", { detail: id }));
    setActiveSectionState(id);
    if (onSectionChange) onSectionChange(id);
  };
  // Read section hint from Copilot navigation (on mount + on re-navigate)
  useEffect(() => {
    const checkHint = () => {
      const hint = sessionStorage.getItem("talentos_settings_section");
      if (hint) {
        sessionStorage.removeItem("talentos_settings_section");
        setActiveSection(hint);
      }
    };
    checkHint(); // check on mount
    const handler = () => setTimeout(checkHint, 50); // check after navigate event
    window.addEventListener("talentos:navigate", handler);
    return () => window.removeEventListener("talentos:navigate", handler);
  }, []);
  const [search, setSearch]               = useState("");
  const [collapsed, setCollapsed]         = useState({});
  const [sideCollapsed, setSideCollapsed] = useState(
    () => localStorage.getItem('vrc_settings_nav_collapsed') === 'true'
  );
  const [sideHovered, setSideHovered]     = useState(false);
  const sideExpanded = !sideCollapsed || sideHovered;
  const SIDE_W = fullScreenMode ? 0 : sideExpanded ? 210 : 44;
  const toggleSide = () => setSideCollapsed(v => {
    const next = !v;
    localStorage.setItem('vrc_settings_nav_collapsed', String(next));
    return next;
  });
  const toggleGroup = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const q = search.trim().toLowerCase();
  const filteredGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: q ? g.items.filter(i => i.label.toLowerCase().includes(q)) : g.items,
  })).filter(g => g.items.length > 0);

  return (
    <div style={{display:"flex",gap:0,minHeight:"100%",height:fullScreenMode?"100%":undefined,overflow:fullScreenMode?"hidden":undefined}}>
      {/* Settings sidebar */}
      <div
        onMouseEnter={() => sideCollapsed && setSideHovered(true)}
        data-settings-sidebar="1"
        onMouseLeave={() => setSideHovered(false)}
        style={{width:SIDE_W,flexShrink:0,paddingRight:fullScreenMode?0:sideExpanded?20:0,display:"flex",flexDirection:"column",pointerEvents:fullScreenMode?"none":"auto",
          overflow:"hidden",transition:"width 0.2s cubic-bezier(0.4,0,0.2,1)"}}>

        {/* Header row — title + collapse button */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,minHeight:28}}>
          {sideExpanded && (
            <h1 onClick={()=>setActiveSection(null)}
              style={{margin:0,fontSize:18,fontWeight:700,color:C.text1,fontFamily:"'Space Grotesk', sans-serif",
                letterSpacing:"-0.4px",cursor:"pointer",whiteSpace:"nowrap"}}
              title="Back to settings overview">Settings</h1>
          )}
          <button
            onClick={toggleSide}
            title={sideCollapsed ? "Expand settings nav" : "Collapse settings nav"}
            style={{width:24,height:24,borderRadius:6,background:"transparent",border:"1px solid transparent",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
              flexShrink:0,color:C.text3,transition:"all .15s",marginLeft:sideExpanded?"auto":0}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.surface2;e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text1;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";e.currentTarget.style.color=C.text3;}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {sideExpanded
                ? <><path d="M9 18l6-6-6-6"/><line x1="5" y1="6" x2="5" y2="18"/></>
                : <><path d="M15 18l-6-6 6-6"/><line x1="19" y1="6" x2="19" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Search — hidden when collapsed */}
        {sideExpanded && (
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex"}}>
            <Ic n="search" s={13} c={C.text3}/>
          </span>
          <input value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value)setCollapsed({});}}
            placeholder="Find a setting…"
            style={{width:"100%",boxSizing:"border-box",padding:"7px 28px 7px 28px",borderRadius:8,
              border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",
              color:C.text1,background:C.surface}}/>
          {search && (
            <button onClick={()=>setSearch("")} style={{position:"absolute",right:7,top:"50%",
              transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",
              padding:0,display:"flex",color:C.text3}}>
              <Ic n="x" s={12}/>
            </button>
          )}
        </div>
        )}

        {/* Groups */}
        <div style={{display:"flex",flexDirection:"column",gap:2,overflowY:"auto",flex:1}}>
          {filteredGroups.length === 0 && (
            <div style={{padding:"20px 8px",textAlign:"center",color:C.text3,fontSize:12}}>
              No settings matching "{search}"
            </div>
          )}
          {filteredGroups.map(group => {
            const isOpen = q ? true : (collapsed[group.id] === undefined ? true : !collapsed[group.id]);
            return (
              <div key={group.id} style={{marginBottom:4}}>
                <button onClick={()=>!q&&toggleGroup(group.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"5px 6px 4px",background:"none",border:"none",
                    cursor:q?"default":"pointer",borderRadius:6,
                    opacity: sideExpanded ? 1 : 0, height: sideExpanded ? undefined : 0, overflow:"hidden", transition:"opacity 0.15s, height 0.15s"}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",
                    textTransform:"uppercase",color:C.text3}}>{group.label}</span>
                  {!q && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:isOpen?"rotate(0deg)":"rotate(-90deg)",transition:"transform .15s",flexShrink:0}}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  )}
                </button>
                {isOpen && group.items.map(s => (
                  <button key={s.id} onClick={()=>setActiveSection(s.id)}
                    title={!sideExpanded ? s.label : undefined}
                    style={{display:"flex",alignItems:"center",gap:sideExpanded?9:0,
                      padding:sideExpanded?"7px 10px":"7px 0",
                      justifyContent:sideExpanded?"flex-start":"center",
                      borderRadius:8,border:"none",cursor:"pointer",width:"100%",marginBottom:1,
                      background:activeSection===s.id?C.accentLight:"transparent",
                      color:activeSection===s.id?C.accent:C.text2,
                      fontSize:13,fontWeight:activeSection===s.id?600:400,
                      fontFamily:F,textAlign:"left",transition:"all .1s"}}
                    onMouseEnter={e=>{if(activeSection!==s.id)e.currentTarget.style.background=C.bg;}}
                    onMouseLeave={e=>{if(activeSection!==s.id)e.currentTarget.style.background="transparent";}}>
                    <Ic n={s.icon} s={14} c={activeSection===s.id?C.accent:C.text3}/>
                    {sideExpanded && <span style={{lineHeight:1.4,whiteSpace:"nowrap",overflow:"hidden"}}>{s.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,minWidth:0,overflow:fullScreenMode?"hidden":undefined}}>
        {!activeSection && (
          <SettingsDashboard
            onNavigate={(id) => setActiveSection(id)}
            searchQuery={search}
          />
        )}
        {activeSection==="datamodel"  && <DataModelSection/>}
        {activeSection==="users"      && <UsersSection/>}
        {activeSection==="groups"     && <GroupsSection environment={environment}/>}
        {activeSection==="roles"      && <RolesSection environment={environment}/>}
        {activeSection==="org"        && <OrgChart environment={environment}/>}
        {activeSection==="security"   && <SecuritySection/>}
        {activeSection==="sessions"   && <SessionsSection/>}
        {activeSection==="audit"      && <AuditLogSection/>}
        {activeSection==="ai_governance" && <AiGovernance environment={environment}/>}
        {activeSection==="ai_matching"  && <AiMatchingSettings/>}
        {activeSection==="file_types" && <FileTypesSettings environment={environment} objects={[]}/>}
        {activeSection==="company_docs" && <CompanyDocuments environment={environment}/>}
        {activeSection==="duplicates" && <DuplicatesSettings environment={environment}/>}
        {activeSection==="forms"      && <FormsList environment={environment}/>}
        {activeSection==="appearance" && <AppearanceSection/>}
        {activeSection==="language"   && <LanguageSection/>}
        {activeSection==="workflows"  && <WorkflowsPage environment={environment}/>}
        {activeSection==="portals"    && <PortalsPage environment={environment} onFullScreen={setFullScreenMode}/>}
        {activeSection==="questions"  && <QuestionBankSettings/>}
        {activeSection==="agents"     && <AgentsSettings environment={environment}/>}
        {activeSection==="superadmin"  && <IntegrationsSettings environment={environment}/>}
        {activeSection==="feature-flags" && <FeatureFlagsSettings environment={environment}/>}
        {activeSection==="sandbox"     && <SandboxManager environment={environment}/>}
        {activeSection==="brand_kits"  && <BrandKitSettings environment={environment}/>}
        {activeSection==="email_templates" && <EmailTemplateBuilder environment={environment}/>}
        {activeSection==="config"      && <ImportExportTabs environment={environment}/>}
        {activeSection==="datasets"    && <DatasetsSection environment={environment}/>}
        {activeSection==="enterprise"  && <EnterpriseSettings environment={environment}/>}
        {activeSection==="integration_hub" && <IntegrationHub environment={environment}/>}
        {activeSection==="setup_wizard" && (
          <CompanyProfilePanel environment={environment}/>
        )}
      </div>
    </div>
  );
}


// ── Feature Access Section ────────────────────────────────────────────────────
const FEATURE_FLAGS_LIST = [
  { id:'access_dashboard',    label:'Dashboard',              group:'Navigation' },
  { id:'access_org_chart',    label:'Org Chart',              group:'Navigation' },
  { id:'access_interviews',   label:'Interviews',             group:'Navigation' },
  { id:'access_offers',       label:'Offers',                 group:'Navigation' },
  { id:'access_reports',      label:'Reports',                group:'Navigation' },
  { id:'access_calendar',     label:'Calendar',               group:'Navigation' },
  { id:'access_search',       label:'Global Search',          group:'Navigation' },
  { id:'access_copilot',      label:'AI Copilot',             group:'AI' },
  { id:'run_reports',         label:'Run Reports',            group:'Data' },
  { id:'export_data',         label:'Export Data',            group:'Data' },
  { id:'bulk_actions',        label:'Bulk Actions',           group:'Data' },
  { id:'manage_users',        label:'Manage Users',           group:'Admin' },
  { id:'manage_roles',        label:'Manage Roles',           group:'Admin' },
  { id:'manage_settings',     label:'Data Model / Settings',  group:'Admin' },
  { id:'manage_workflows',    label:'Workflows',              group:'Admin' },
  { id:'manage_portals',      label:'Portals',                group:'Admin' },
  { id:'manage_forms',        label:'Forms',                  group:'Admin' },
  { id:'manage_interviews',   label:'Manage Interview Types', group:'Admin' },
  { id:'manage_org_structure',label:'Org Structure',          group:'Admin' },
  { id:'manage_integrations', label:'Integrations',           group:'Admin' },
  { id:'view_audit_log',      label:'Audit Log',              group:'Admin' },
  { id:'record_send_email',       label:'Send Email',             group:'Record Actions' },
  { id:'record_send_sms',         label:'Send SMS / WhatsApp',    group:'Record Actions' },
  { id:'record_log_call',         label:'Log Call',               group:'Record Actions' },
  { id:'record_view_comms',       label:'View Communications',    group:'Record Actions' },
  { id:'record_add_note',         label:'Add Note',               group:'Record Actions' },
  { id:'record_delete_note',      label:'Delete Note',            group:'Record Actions' },
  { id:'record_upload_file',      label:'Upload File',            group:'Record Actions' },
  { id:'record_delete_file',      label:'Delete File',            group:'Record Actions' },
  { id:'record_parse_cv',         label:'Parse CV (AI)',          group:'Record Actions' },
  { id:'record_extract_doc',      label:'Extract Document (AI)',  group:'Record Actions' },
  { id:'record_add_to_pipeline',  label:'Add to Pipeline',        group:'Record Actions' },
  { id:'record_move_stage',       label:'Move Pipeline Stage',    group:'Record Actions' },
  { id:'record_run_workflow',     label:'Run Workflow',           group:'Record Actions' },
  { id:'record_schedule_interview',label:'Schedule Interview',    group:'Record Actions' },
  { id:'record_create_offer',     label:'Create Offer',           group:'Record Actions' },
];
const FEATURE_GROUPS_LIST = [...new Set(FEATURE_FLAGS_LIST.map(f => f.group))];

const FeatureAccessSection = ({ selectedRole }) => {
  const [perms,   setPerms]   = useState({}); // flag → allowed bool
  const [orig,    setOrig]    = useState({}); // original state for dirty check
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (!selectedRole) { setLoading(false); return; }
    setLoading(true);
    api.get(`/roles/${selectedRole.id}/permissions`).then(p => {
      const map = {};
      (Array.isArray(p) ? p : []).forEach(x => {
        if (x.object_slug === '__global__') map[x.action] = Boolean(x.allowed);
      });
      setPerms(map);
      setOrig(map);
      setLoading(false);
    });
  }, [selectedRole?.id]);

  const toggle = (flag) => {
    setPerms(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  const isDirty = JSON.stringify(perms) !== JSON.stringify(orig);

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const ALL_FLAGS = FEATURE_FLAGS_LIST.map(f => f.id);
    // Load existing perms to preserve object-level ones
    const existing = await api.get(`/roles/${selectedRole.id}/permissions`);
    const objectPerms = (Array.isArray(existing) ? existing : [])
      .filter(p => p.object_slug !== '__global__')
      .map(p => ({ object_slug: p.object_slug, action: p.action, allowed: p.allowed }));
    const nonFlagGlobals = (Array.isArray(existing) ? existing : [])
      .filter(p => p.object_slug === '__global__' && !ALL_FLAGS.includes(p.action))
      .map(p => ({ object_slug: '__global__', action: p.action, allowed: p.allowed }));
    const flagPerms = ALL_FLAGS.map(flag => ({
      object_slug: '__global__', action: flag, allowed: perms[flag] ? 1 : 0
    }));
    try {
      const result = await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: [...objectPerms, ...nonFlagGlobals, ...flagPerms]
      });
      if (result?.error) { setSaveErr(result.error); setSaving(false); return; }
      setOrig({ ...perms });
      setSaved(true); setSaveErr('');
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {
      setSaveErr(e.message || 'Save failed');
    }
    setSaving(false);
  };

  if (!selectedRole) return (
    <div style={{ padding:'24px 0', textAlign:'center', color:C.text3, fontSize:13 }}>
      Select a role to configure feature access.
    </div>
  );

  if (loading) return <div style={{ padding:20, color:C.text3, fontSize:13 }}>Loading…</div>;

  const isSystem = selectedRole.is_system;
  const isSuperAdmin = selectedRole.slug === 'super_admin';
  const roleColor = selectedRole.color || C.accent;

  // Super admin — show all flags as permanently on and locked
  if (isSuperAdmin) return (
    <div>
      <div style={{padding:"14px 16px",borderRadius:10,background:"#f0fdf4",border:"1.5px solid #bbf7d0",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <Ic n="check" s={16} c="#0ca678"/>
        <span style={{fontSize:13,fontWeight:600,color:"#065f46"}}>Super Admin has full access to every feature. These settings cannot be modified.</span>
      </div>
      {FEATURE_GROUPS_LIST.map(group => (
        <div key={group} style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.text2, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, paddingBottom:4, borderBottom:`1px solid ${C.border}` }}>{group}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
            {FEATURE_FLAGS_LIST.filter(f => f.group === group).map(feature => (
              <div key={feature.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderRadius:8, border:`1.5px solid #0ca67840`, background:'#0ca67808', opacity:0.8, cursor:'not-allowed' }}>
                <span style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{feature.label}</span>
                <div style={{ flexShrink:0, width:32, height:18, borderRadius:99, background:'#0ca678', position:'relative' }}>
                  <div style={{ position:'absolute', top:2, left:16, width:14, height:14, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, color:C.text2 }}>
          Toggle features for <strong style={{ color:roleColor }}>{selectedRole.name}</strong>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <Btn onClick={handleSave} disabled={saving || !isDirty} sz="sm"
            style={{ opacity: isDirty ? 1 : 0.4 }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </Btn>
          {saveErr && <div style={{ fontSize:11, color:'#dc2626' }}>{saveErr}</div>}
        </div>
      </div>

      {/* Feature groups */}
      {FEATURE_GROUPS_LIST.map(group => (
        <div key={group} style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.text2, textTransform:'uppercase',
            letterSpacing:'0.08em', marginBottom:6, paddingBottom:4,
            borderBottom:`1px solid ${C.border}` }}>
            {group}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
            {FEATURE_FLAGS_LIST.filter(f => f.group === group).map(feature => {
              const on = Boolean(perms[feature.id]);
              return (
                <div key={feature.id}
                  onClick={() => toggle(feature.id)}
                  title={on ? 'Click to revoke access' : 'Click to grant access'}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'6px 10px', borderRadius:8, cursor:'pointer',
                    border:`1.5px solid ${on ? roleColor+'40' : C.border}`,
                    background: on ? roleColor+'08' : 'transparent',
                    transition:'all .12s', userSelect:'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = on ? roleColor+'15' : '#f9fafb'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? roleColor+'08' : 'transparent'; }}>
                  <span style={{ fontSize:12, fontWeight: on ? 600 : 400,
                    color: on ? C.text1 : C.text3 }}>
                    {feature.label}
                  </span>
                  {/* Toggle pill */}
                  <div style={{ flexShrink:0, width:32, height:18, borderRadius:99,
                    background: on ? roleColor : '#e5e7eb', position:'relative',
                    transition:'background .15s' }}>
                    <div style={{ position:'absolute', top:2, left: on ? 16 : 2,
                      width:14, height:14, borderRadius:'50%', background:'white',
                      boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .15s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
