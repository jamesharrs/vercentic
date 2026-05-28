import { useState, useEffect, useCallback } from "react";
import { ClientList, ClientDetail, ProvisionWizard, Performance } from './superadmin/ClientManager.jsx';
import AiCreditsManager from './superadmin/AiCreditsManager.jsx';
import ActivityReport from './superadmin/ActivityReport.jsx';
import AIUsageReport from './superadmin/AIUsageReport.jsx';
import DemoDataManager from './superadmin/DemoDataManager';
import FeaturePacksAdmin from './superadmin/FeaturePacks';
import ErrorLogViewer from './superadmin/ErrorLogViewer.jsx';
import { ReleaseNotesAdmin } from './ReleaseNotes.jsx';
import CaseManager from './superadmin/CaseManager.jsx';
import AIDiagnosisPanel from './superadmin/AIDiagnosisPanel.jsx';
import EmailSequencer from './EmailSequencer.jsx';

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:      "#0a0e1a",
  surface: "#111827",
  surface2:"#1a2235",
  border:  "#1e2d45",
  text1:   "#f0f4ff",
  text2:   "#8899bb",
  text3:   "#4a5878",
  accent:  "#3b82f6",
  green:   "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
  purple:  "#8b5cf6",
};

// SuperAdmin API — hits /api/superadmin/* with CSRF token
function _saHeaders(mut=false) {
  const h = {'Content-Type':'application/json'};
  if (mut) { const m=document.cookie.match(/vercentic_csrf=([^;]+)/); if(m) h['X-CSRF-Token']=decodeURIComponent(m[1]); }
  return h;
}
const api = {
  get:   p     => fetch(`/api/superadmin${p}`,{credentials:'include',headers:_saHeaders()}).then(r=>r.json()),
  post:  (p,b) => fetch(`/api/superadmin${p}`,{credentials:'include',method:'POST', headers:_saHeaders(true),body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b) => fetch(`/api/superadmin${p}`,{credentials:'include',method:'PATCH',headers:_saHeaders(true),body:JSON.stringify(b)}).then(r=>r.json()),
};

// ── Group metadata ────────────────────────────────────────────────────────────
const GROUP_META = {
  "Twilio (SMS + WhatsApp)": { color: C.red,    icon: "phone",    desc: "SMS and WhatsApp messaging" },
  "SendGrid (Email)":         { color: C.accent, icon: "mail",     desc: "Transactional email" },
  "Webhooks (inbound messages)":{ color:C.amber, icon: "link",     desc: "Inbound webhook endpoints" },
  "General":                  { color: C.purple, icon: "settings2",desc: "Core configuration" },
};
const GROUP_ORDER = ["General","Twilio (SMS + WhatsApp)","SendGrid (Email)","Webhooks (inbound messages)"];

// Secret keys that should be masked by default
const SECRET_KEYS = ['KEY','TOKEN','SECRET','PASSWORD','SID','PASS'];
const isSecret = key => SECRET_KEYS.some(s => key.toUpperCase().includes(s));


// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }) {
  const [pw, setPw]     = useState('');
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr('');
    const res = await api.post('/auth', { password: pw });
    if (res.ok) { onAuth(res.token, res.user_id); }
    else { setErr('Invalid password'); setBusy(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}>
      <div style={{ width:360, padding:'36px 32px', background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:'0 24px 60px rgba(0,0,0,.5)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:`${C.purple}20`, border:`1px solid ${C.purple}40`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:C.text1, fontFamily:"'Space Grotesk', sans-serif", letterSpacing:"-0.3px" }}>Vercentic Super Admin</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:4 }}>Internal access only</div>
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()}
          placeholder="Super admin password"
          style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:`1.5px solid ${err?C.red:C.border}`, background:C.surface2, color:C.text1, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', marginBottom:8 }}/>
        {err && <div style={{ fontSize:12, color:C.red, marginBottom:8 }}>{err}</div>}
        <button onClick={submit} disabled={busy||!pw}
          style={{ width:'100%', padding:'10px', borderRadius:9, border:'none', background:C.purple, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, opacity:busy?0.7:1 }}>
          {busy ? 'Verifying…' : 'Enter Console'}
        </button>
      </div>
    </div>
  );
}


// ── Env Variable Row ──────────────────────────────────────────────────────────
function EnvRow({ variable, onSave }) {
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState(variable.value);
  const [revealed, setRevealed] = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const secret = isSecret(variable.key);
  const isEmpty = !variable.value || variable.value.startsWith('YOUR_');

  const handleSave = async () => {
    setSaving(true);
    await onSave(variable.key, draft);
    setSaving(false); setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayVal = () => {
    if (!variable.value) return '—';
    if (secret && !revealed) return '••••••••••••••••';
    return variable.value;
  };

  return (
    <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
      {/* Key */}
      <div style={{ width:240, flexShrink:0 }}>
        <code style={{ fontSize:12, fontWeight:700, color: isEmpty ? C.amber : C.accent, fontFamily:'monospace' }}>{variable.key}</code>
        {isEmpty && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, background:`${C.amber}20`, color:C.amber }}>UNSET</span>}
      </div>

      {/* Value */}
      <div style={{ flex:1, minWidth:0 }}>
        {editing ? (
          <input value={draft} onChange={e=>setDraft(e.target.value)}
            autoFocus onKeyDown={e=>{ if(e.key==='Enter') handleSave(); if(e.key==='Escape') setEditing(false); }}
            style={{ width:'100%', padding:'6px 10px', borderRadius:7, border:`1.5px solid ${C.accent}`, background:C.surface2, color:C.text1, fontSize:12, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}/>
        ) : (
          <span style={{ fontSize:12, color: isEmpty ? C.text3 : C.text2, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
            {displayVal()}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        {secret && !editing && (
          <button onClick={()=>setRevealed(r=>!r)} title={revealed?'Hide':'Reveal'}
            style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text3, fontSize:11, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center' }}>
            <NavIcon id={revealed ? 'eyeOff' : 'eye'} size={12} color={C.text3}/>
          </button>
        )}
        {!editing ? (
          <button onClick={()=>{ setDraft(variable.value); setEditing(true); }}
            style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>
            Edit
          </button>
        ) : (
          <>
            <button onClick={()=>setEditing(false)}
              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text3, fontSize:11, cursor:'pointer', fontFamily:F }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'4px 10px', borderRadius:6, border:'none', background: saved?C.green:C.accent, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F }}>
              {saving?'…':saved?'✓':'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Feature Packs Section ─────────────────────────────────────────────────────
function FeaturePacksSection() {
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState(null);
  const F = "'DM Sans', sans-serif";
  const Cs = { surface2:'#1C2035', border:'#2A2F4A', text1:'#F0F4FF', text3:'#6B7599' };

  useEffect(() => {
    fetch('/api/environments').then(r => r.json()).then(data => {
      const envs = Array.isArray(data) ? data : [];
      setEnvironments(envs);
      if (envs.length > 0) setSelectedEnvId(envs[0].id);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h3 style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:Cs.text1 }}>Feature Packs</h3>
        <p style={{ margin:'0 0 14px', fontSize:12, color:Cs.text3 }}>Enable or disable feature packs per environment. Changes take effect immediately.</p>
        {environments.length > 1 && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:Cs.text3, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Environment</label>
            <select value={selectedEnvId||''} onChange={e=>setSelectedEnvId(e.target.value)}
              style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${Cs.border}`, background:Cs.surface2, color:Cs.text1, fontSize:13, fontFamily:F, outline:'none', cursor:'pointer' }}>
              {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
            </select>
          </div>
        )}
      </div>
      {selectedEnvId
        ? <FeaturePacksAdmin environmentId={selectedEnvId}/>
        : <div style={{ padding:40, textAlign:'center', color:Cs.text3, fontSize:13 }}>No environments found.</div>
      }
    </div>
  );
}

// ── Env Config Section ────────────────────────────────────────────────────────
function EnvSection() {
  const [vars,    setVars]    = useState([]);
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [newKey,  setNewKey]  = useState('');
  const [newVal,  setNewVal]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [envRes, sysRes] = await Promise.all([api.get('/env'), api.get('/system')]);
    setVars(envRes.vars || []);
    setSysInfo(sysRes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key, value) => {
    await api.patch('/env', { updates: [{ key, value }] });
    setVars(v => v.map(vr => vr.key === key ? { ...vr, value } : vr));
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    await api.patch('/env', { updates: [{ key: newKey.trim(), value: newVal.trim() }] });
    setAdding(false); setNewKey(''); setNewVal('');
    load();
  };

  const groups = GROUP_ORDER.map(g => ({
    name: g,
    meta: GROUP_META[g] || { color: C.purple, icon: '⚙️', desc: '' },
    vars: vars.filter(v => v.group === g),
  })).filter(g => g.vars.length > 0);

  const unsetCount = vars.filter(v => !v.value || v.value.startsWith('YOUR_')).length;

  return (
    <div>
      {/* System info bar */}
      {sysInfo && (
        <div style={{ display:'flex', gap:20, padding:'12px 20px', background:C.surface2, borderRadius:10, marginBottom:24, flexWrap:'wrap' }}>
          {[
            ['Node', sysInfo.node],
            ['Uptime', `${Math.floor(sysInfo.uptime/60)}m ${sysInfo.uptime%60}s`],
            ['Heap', `${Math.round(sysInfo.memory.heap/1024/1024)}MB / ${Math.round(sysInfo.memory.heapTotal/1024/1024)}MB`],
            ['Env', sysInfo.env],
            ['PID', sysInfo.pid],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize:10, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
              <div style={{ fontSize:12, color:C.text1, fontWeight:600, marginTop:2 }}>{val}</div>
            </div>
          ))}
          {unsetCount > 0 && (
            <div style={{ marginLeft:'auto', padding:'6px 12px', borderRadius:7, background:`${C.amber}15`, border:`1px solid ${C.amber}30`, fontSize:12, color:C.amber, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
              <NavIcon id="errors" size={12} color={C.amber}/>{unsetCount} unset variable{unsetCount>1?'s':''}
            </div>
          )}
        </div>
      )}

      {loading && <div style={{ color:C.text3, fontSize:13, padding:20 }}>Loading…</div>}

      {/* Groups */}
      {groups.map(group => (
        <div key={group.name} style={{ marginBottom:20, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, background:`${group.meta.color}08` }}>
            <span style={{ display:'flex', alignItems:'center' }}><NavIcon id={group.meta.icon} size={16} color={group.meta.color}/></span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{group.name}</div>
              {group.meta.desc && <div style={{ fontSize:11, color:C.text3 }}>{group.meta.desc}</div>}
            </div>
            <div style={{ marginLeft:'auto', fontSize:11, color:C.text3 }}>{group.vars.length} variable{group.vars.length!==1?'s':''}</div>
          </div>
          {group.vars.map(v => <EnvRow key={v.key} variable={v} onSave={handleSave}/>)}
        </div>
      ))}

      {/* Add new */}
      <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:20 }}>
        {adding ? (
          <div style={{ padding:'16px 18px', display:'flex', gap:10, alignItems:'center' }}>
            <input value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="VARIABLE_NAME"
              style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.surface2, color:C.text1, fontSize:12, fontFamily:'monospace', outline:'none' }}/>
            <span style={{ color:C.text3 }}>=</span>
            <input value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="value"
              style={{ flex:2, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.surface2, color:C.text1, fontSize:12, fontFamily:'monospace', outline:'none' }}/>
            <button onClick={()=>setAdding(false)} style={{ padding:'7px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.text3, fontSize:12, cursor:'pointer', fontFamily:F }}>Cancel</button>
            <button onClick={handleAdd} disabled={!newKey.trim()} style={{ padding:'7px 14px', borderRadius:7, border:'none', background:C.green, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F }}>Add</button>
          </div>
        ) : (
          <button onClick={()=>setAdding(true)}
            style={{ width:'100%', padding:'12px 18px', border:'none', background:'transparent', color:C.text3, fontSize:12, cursor:'pointer', fontFamily:F, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>+</span> Add new variable
          </button>
        )}
      </div>
    </div>
  );
}


// ── Nav icon map ──────────────────────────────────────────────────────────────
const NAV_ICONS = {
  env:      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  health:   "M22 12h-4l-3 9L9 3l-3 9H2",
  clients:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  provision:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  perf:     "M18 20V10M12 20V4M6 20v-6",
  errors:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  cases:    "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
  cpu:      "M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  // Group icons for env variable sections
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  link:     "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  settings2:"M12 15a3 3 0 100-6 3 3 0 000 6zM2 12h2M20 12h2M12 2v2M12 20v2",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff:   "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

const NavIcon = ({ id, size=14, color="currentColor" }) => {
  const d = NAV_ICONS[id] || NAV_ICONS.env;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
};
const NAV_ITEMS = [
  { id:'env',      label:'Global Config (.env)',      icon:'env',      desc:'Manage server environment variables & secrets' },
  { id:'global_integrations', label:'Global Integrations', icon:'mail', desc:'Resend email, default domain & platform-wide API keys' },
  { id:'health',   label:'System Health',         icon:'health',   desc:'Server stats & uptime' },
  { id:'clients',  label:'Clients',               icon:'clients',  desc:'Manage client organisations' },
  { id:'provision',label:'Provision',             icon:'provision',desc:'Provision a new client environment' },
  { id:'templates',label:'Templates',             icon:'layers',   desc:'Template environments — copy config to new clients' },
  { id:'features', label:'Feature Packs',         icon:'features', desc:'Enable/disable feature packs per environment' },
  { id:'perf',     label:'Performance',           icon:'perf',     desc:'Platform-wide stats & usage' },
  { id:'demo',     label:'Demo Data',             icon:'provision',desc:'Generate realistic demo data' },
  { id:'errors',   label:'Error Logs',            icon:'errors',   desc:'App errors across all environments' },
  { id:'release_notes', label:'Release Notes',    icon:'bell',     desc:'Manage platform release notes' },
  { id:'cases',    label:'Support Cases',         icon:'cases',    desc:'Customer service case management' },
  { id:'diagnose', label:'AI Diagnose',           icon:'health',   desc:'AI environment health check for any client' },
  { id:'sequencer',label:'Email Sequencer',       icon:'mail',     desc:'Client onboarding email automation' },
  { id:'ai_usage', label:'AI Usage',             icon:'cpu',      desc:'Token usage, costs & quota management' },
  { id:'ai_credits',label:'AI Credits',          icon:'zap',      desc:'Per-environment budgets, 5× margin, enforcement' },
  { id:'activity', label:'Activity Report',      icon:'activity', desc:'Environment activity & usage analytics' },
  { id:'platform_events', label:'Platform Events', icon:'zap',    desc:'Digest sends, scheduler runs, SSE connections & system events' },
];

// ── Platform Events Monitor ───────────────────────────────────────────────────
const CATEGORY_META = {
  digest:    { label:'Digest',    color:'#60A5FA' },
  scheduler: { label:'Scheduler', color:'#A78BFA' },
  sse:       { label:'SSE',       color:'#34D399' },
  auth:      { label:'Auth',      color:'#FBBF24' },
  provision: { label:'Provision', color:'#F87171' },
  email:     { label:'Email',     color:'#60A5FA' },
  sms:       { label:'SMS',       color:'#34D399' },
  system:    { label:'System',    color:'#9CA3AF' },
  error:     { label:'Error',     color:'#F87171' },
};
const LEVEL_COLOR = { info:'#34D399', warn:'#FBBF24', error:'#F87171' };

function PlatformEvents() {
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [catFilter,setCatFilter]= useState('all');
  const [lvlFilter,setLvlFilter]= useState('all');
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [clearing, setClearing] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 300 });
      if (catFilter !== 'all') params.set('category', catFilter);
      if (lvlFilter !== 'all') params.set('level',    lvlFilter);
      if (search)               params.set('search',   search);
      const d = await api.get(`/clients/platform-logs?${params}`);
      setLogs(d.logs || []); setTotal(d.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [catFilter, lvlFilter]);  // eslint-disable-line

  const handleSearch = (e) => { if (e.key === 'Enter') load(); };

  const clearLogs = async () => {
    if (!window.confirm('Clear all platform event logs?')) return;
    setClearing(true);
    await fetch('/api/superadmin/clients/platform-logs', { method:'DELETE' });
    setClearing(false); load();
  };

  const cats = ['all','digest','scheduler','sse','auth','provision','email','system','error'];
  const fmtTs = iso => iso ? new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';

  return (
    <div style={{padding:'28px 32px',fontFamily:F,minHeight:'100vh',background:C.bg,color:C.text1}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Platform Events</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>{total} events captured · live monitoring</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={load} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>↻ Refresh</button>
          <button onClick={clearLogs} disabled={clearing} style={{padding:'7px 14px',borderRadius:8,border:`1px solid #F87171`,background:'transparent',color:'#F87171',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Clear logs</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {/* Category pills */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {cats.map(c => (
            <button key={c} onClick={()=>setCatFilter(c)}
              style={{padding:'4px 10px',borderRadius:99,border:`1px solid ${catFilter===c?(CATEGORY_META[c]?.color||C.purple):C.border}`,
                background:catFilter===c?`${CATEGORY_META[c]?.color||C.purple}18`:'transparent',
                color:catFilter===c?(CATEGORY_META[c]?.color||C.purple):C.text3,
                fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:F,textTransform:'capitalize'}}>
              {c === 'all' ? 'All' : (CATEGORY_META[c]?.label || c)}
            </button>
          ))}
        </div>
        {/* Level */}
        <select value={lvlFilter} onChange={e=>setLvlFilter(e.target.value)}
          style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text2,fontSize:12,fontFamily:F}}>
          {['all','info','warn','error'].map(l=><option key={l} value={l}>{l==='all'?'All levels':l}</option>)}
        </select>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={handleSearch}
          placeholder="Search events… (Enter)" style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text1,fontSize:12,fontFamily:F,outline:'none',minWidth:200}}/>
      </div>

      {/* Log table */}
      {loading ? (
        <div style={{textAlign:'center',color:C.text3,padding:48,fontSize:13}}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{textAlign:'center',padding:60}}>
          <div style={{fontSize:32,marginBottom:12}}>📭</div>
          <div style={{color:C.text3,fontSize:13}}>No events yet — they'll appear here as the platform runs.</div>
          <div style={{color:C.text3,fontSize:12,marginTop:6}}>Digest sends, scheduler checks, SSE connections and more are captured automatically.</div>
        </div>
      ) : (
        <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
          {logs.map((log, i) => {
            const catM = CATEGORY_META[log.category] || { label: log.category, color: C.text3 };
            const isExp = expanded === log.id;
            const hasMeta = log.meta && Object.keys(log.meta).length > 0;
            return (
              <div key={log.id}
                style={{borderBottom: i < logs.length-1 ? `1px solid ${C.border}` : 'none',
                  background: i%2===0 ? C.surface : C.surface2}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:hasMeta?'pointer':'default'}}
                  onClick={()=>hasMeta&&setExpanded(isExp?null:log.id)}>
                  {/* Level dot */}
                  <div style={{width:7,height:7,borderRadius:'50%',background:LEVEL_COLOR[log.level]||C.text3,flexShrink:0}}/>
                  {/* Timestamp */}
                  <span style={{fontSize:11,color:C.text3,width:150,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>{fmtTs(log.ts)}</span>
                  {/* Category pill */}
                  <span style={{padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700,
                    background:`${catM.color}18`,color:catM.color,flexShrink:0,minWidth:70,textAlign:'center'}}>
                    {catM.label}
                  </span>
                  {/* Event name */}
                  <span style={{fontSize:11,color:C.purple,fontWeight:600,width:160,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.event}</span>
                  {/* Message */}
                  <span style={{fontSize:12,color:C.text2,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.message}</span>
                  {/* Expand */}
                  {hasMeta && <span style={{fontSize:10,color:C.text3,flexShrink:0}}>{isExp?'▲':'▼'}</span>}
                </div>
                {/* Meta panel */}
                {isExp && hasMeta && (
                  <div style={{background:`${C.purple}08`,borderTop:`1px solid ${C.border}`,padding:'10px 14px 10px 44px'}}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'8px 24px'}}>
                      {Object.entries(log.meta).map(([k,v])=>(
                        <div key={k} style={{fontSize:11}}>
                          <span style={{color:C.text3,fontWeight:600}}>{k}: </span>
                          <span style={{color:C.text1,fontFamily:'monospace'}}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EnvDiagnoseSection() {
  const [envs,    setEnvs]    = useState([]);
  const [selEnv,  setSelEnv]  = useState('');
  const [selName, setSelName] = useState('');
  useEffect(() => {
    fetch('/api/environments').then(r=>r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setEnvs(list);
      if (list.length) { setSelEnv(list[0].id); setSelName(list[0].name); }
    }).catch(()=>{});
  }, []);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <select value={selEnv} onChange={e=>{
          setSelEnv(e.target.value);
          setSelName(envs.find(v=>v.id===e.target.value)?.name||'');
        }} style={{padding:'8px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text1,fontFamily:F,fontSize:13,minWidth:240}}>
          {envs.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <span style={{fontSize:12,color:C.text3}}>{envs.length} environment{envs.length!==1?'s':''} available</span>
      </div>
      {selEnv && <AIDiagnosisPanel environmentId={selEnv} clientName={selName}/>}
    </div>
  );
}

// ── Template Environments ─────────────────────────────────────────────────────
function TemplateEnvironments() {
  const [templates, setTemplates] = useState([]);
  const [allEnvs, setAllEnvs]     = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [flagging, setFlagging]   = useState(null);
  const [copying, setCopying]     = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(null); // template to copy from
  const [copyTarget, setCopyTarget] = useState('');
  const [copyResult, setCopyResult] = useState(null);
  const [creatingFromLocal, setCreatingFromLocal] = useState(false);
  const [createName, setCreateName] = useState('Vercentic Template');

  const createFromLocal = async () => {
    if (!createName.trim()) return;
    setCreatingFromLocal(true);
    try {
      // Step 1: fetch the snapshot from the LOCAL server (localhost:3001).
      // The live Railway server has no objects — only the local dev server has
      // the master store with real config data.
      let snapshot = null;
      const localUrl = 'http://localhost:3001/api/superadmin/local-snapshot';
      try {
        const lr = await fetch(localUrl, { headers: { 'x-super-admin': 'talentos-internal-2026' } });
        if (lr.ok) { const ld = await lr.json(); snapshot = ld.snapshot; }
      } catch {}

      // Fallback: try Railway endpoint (will have 0 objects unless Railway has data)
      if (!snapshot) {
        const tpls = await api.get('/clients/provision/templates');
        const local = Array.isArray(tpls) ? tpls.find(t => t.is_local) : null;
        snapshot = local?.snapshot || null;
      }

      if (!snapshot || !(snapshot.objects||[]).length) {
        alert('Could not load local environment snapshot.\n\nMake sure your local dev server is running on port 3001, then try again.');
        setCreatingFromLocal(false);
        return;
      }

      // Step 2: POST snapshot to Railway to create the template environment
      const r = await api.post('/clients/provision-from-local', { name: createName.trim(), snapshot });
      if (r.error) { alert('Error: ' + r.error); }
      else { alert(`✓ Template "${createName}" created\n${r.objects_copied} objects, ${r.fields_copied} fields, ${r.roles_copied} roles copied.`); await load(); }
    } catch(e) { alert('Error: ' + e.message); }
    setCreatingFromLocal(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [tmpl, clients] = await Promise.all([
        api.get('/clients/templates'),
        api.get('/clients/'),
      ]);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      const cl = Array.isArray(clients) ? clients : clients?.clients || [];
      setAllClients(cl);
      // Flatten all environments
      const envs = cl.flatMap(c => (c.environments||[]).map(e=>({...e, client_name:c.name, tenant_slug:c.tenant_slug, client_id:c.id})));
      setAllEnvs(envs);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flagAsTemplate = async (env, isTemplate) => {
    const name = isTemplate ? (prompt('Template name:', env.name) || env.name) : null;
    if (isTemplate && !name) return;
    setFlagging(env.id);
    try {
      await api.post(`/clients/environments/${env.id}/flag-template`, { is_template: isTemplate, template_name: name });
      await load();
    } catch(e) { alert('Error: '+e.message); }
    setFlagging(null);
  };

  const doCopy = async () => {
    if (!copyTarget) return alert('Select a target environment');
    setCopying(true); setCopyResult(null);
    try {
      const result = await api.post('/clients/copy-config', { from_env_id: showCopyModal.id, to_env_id: copyTarget });
      setCopyResult(result);
    } catch(e) { alert('Error: '+e.message); }
    setCopying(false);
  };

  const C = { bg:'#0F172A', card:'#1E293B', border:'#334155', text:'#F1F5F9', text2:'#94A3B8', accent:'#A78BFA', green:'#34D399', red:'#F87171', amber:'#FBBF24' };

  // Non-template environments (candidates to flag)
  const flaggable = allEnvs.filter(e => !templates.find(t=>t.id===e.id));

  return (
    <div style={{color:C.text, fontFamily:"'Inter',sans-serif"}}>
      <div style={{padding:'14px 18px',borderRadius:10,border:'1.5px solid #8b5cf6',background:'rgba(139,92,246,0.08)',marginBottom:20}}>
        <div style={{fontWeight:700,color:C.accent,fontSize:13,marginBottom:8}}>⚡ Create Template from Local Config</div>
        <div style={{fontSize:12,color:C.text2,marginBottom:12}}>Snapshot your current local environment — all objects, fields, workflows and email templates — into a new reusable template.</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input value={createName} onChange={e=>setCreateName(e.target.value)}
            placeholder="Template name…"
            style={{flex:1,padding:'8px 12px',borderRadius:8,border:`1px solid ${C.border2}`,background:C.surface2,color:C.text1,fontSize:13,fontFamily:'inherit'}}/>
          <button onClick={createFromLocal} disabled={creatingFromLocal||!createName.trim()}
            style={{padding:'8px 16px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',opacity:creatingFromLocal?0.6:1,whiteSpace:'nowrap'}}>
            {creatingFromLocal ? 'Creating…' : 'Create Template'}
          </button>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
        <div>
          <h2 style={{margin:0, fontSize:18, fontWeight:700}}>Template Environments</h2>
          <p style={{margin:'4px 0 0', fontSize:13, color:C.text2}}>Flag an environment as a template to copy its config to new client environments.</p>
        </div>
      </div>

      {loading ? <div style={{color:C.text2}}>Loading…</div> : (<>

        {/* Active templates */}
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12}}>
            Active Templates ({templates.length})
          </div>
          {templates.length === 0 && (
            <div style={{background:C.card, borderRadius:10, border:`1px dashed ${C.border}`, padding:24, textAlign:'center', color:C.text2, fontSize:13}}>
              No template environments yet. Flag an existing environment below.
            </div>
          )}
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {templates.map(t => (
              <div key={t.id} style={{background:C.card, borderRadius:10, border:`1px solid ${C.border}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:16}}>
                <div style={{width:40, height:40, borderRadius:10, background:'#312E81', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>🏛</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:14}}>{t.template_name || t.name}</div>
                  <div style={{fontSize:12, color:C.text2, marginTop:2}}>
                    {t.client_name} · {t.tenant_slug} · {t.object_count} objects · {t.field_count} fields · {t.workflow_count} workflows
                  </div>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <button onClick={()=>{ setCopyTarget(''); setCopyResult(null); setShowCopyModal(t); }}
                    style={{padding:'6px 14px', borderRadius:8, border:`1px solid ${C.accent}`, background:'transparent', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer'}}>
                    Copy to →
                  </button>
                  <button onClick={()=>flagAsTemplate(t, false)} disabled={flagging===t.id}
                    style={{padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, cursor:'pointer'}}>
                    Unflag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flag an environment as template */}
        <div>
          <div style={{fontSize:11, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12}}>
            Available Environments — Flag as Template
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {flaggable.slice(0,20).map(e => (
              <div key={e.id} style={{background:C.card, borderRadius:8, border:`1px solid ${C.border}`, padding:'10px 14px', display:'flex', alignItems:'center', gap:12}}>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600, fontSize:13}}>{e.name}</span>
                  <span style={{color:C.text2, fontSize:12, marginLeft:8}}>{e.client_name} · {e.tenant_slug}</span>
                </div>
                <button onClick={()=>flagAsTemplate(e, true)} disabled={flagging===e.id}
                  style={{padding:'5px 12px', borderRadius:7, border:`1px solid ${C.accent}`, background:'transparent', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer'}}>
                  {flagging===e.id ? 'Flagging…' : '+ Flag as Template'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Copy config modal */}
        {showCopyModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:480, maxWidth:'90vw'}}>
              <h3 style={{margin:'0 0 6px', fontSize:16, fontWeight:700, color:C.text}}>Copy Config from Template</h3>
              <p style={{margin:'0 0 20px', fontSize:13, color:C.text2}}>
                Copies objects, fields, workflows, stage categories, portals and panel layouts from <strong style={{color:C.text}}>{showCopyModal.template_name||showCopyModal.name}</strong> into the selected environment. Records are never copied.
              </p>
              <label style={{fontSize:12, fontWeight:600, color:C.text2, display:'block', marginBottom:6}}>Target Environment</label>
              <select value={copyTarget} onChange={e=>setCopyTarget(e.target.value)}
                style={{width:'100%', padding:'9px 12px', borderRadius:8, background:C.bg, border:`1px solid ${C.border}`, color:C.text, fontSize:13, marginBottom:20}}>
                <option value=''>Select an environment…</option>
                {allEnvs.filter(e=>e.id!==showCopyModal.id).map(e=>(
                  <option key={e.id} value={e.id}>{e.client_name} — {e.name} ({e.tenant_slug})</option>
                ))}
              </select>
              {copyResult && (
                <div style={{background:'#064E3B', border:'1px solid #34D399', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#34D399'}}>
                  ✅ Copied: {copyResult.objects} objects · {copyResult.fields} fields · {copyResult.workflows} workflows · {copyResult.stage_categories} stage categories · {copyResult.portals} portals
                </div>
              )}
              <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
                <button onClick={()=>{setShowCopyModal(null);setCopyResult(null);}} style={{padding:'8px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, cursor:'pointer'}}>
                  Close
                </button>
                <button onClick={doCopy} disabled={copying||!copyTarget}
                  style={{padding:'8px 20px', borderRadius:8, border:'none', background:C.accent, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:copying||!copyTarget?0.5:1}}>
                  {copying ? 'Copying…' : 'Copy Config →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}

// ── Global Integrations Section ───────────────────────────────────────────────
function GlobalIntegrationsSection() {
  const [status, setStatus]     = useState(null);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTest]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [form, setForm]         = useState({ RESEND_API_KEY:'', RESEND_DEFAULT_DOMAIN:'mail.vercentic.com', RESEND_DEFAULT_FROM_NAME:'Vercentic' });

  useEffect(() => {
    fetch('/api/superadmin/global-integrations', { credentials:'include' })
      .then(r=>r.json()).then(d=>setStatus(d)).catch(()=>{});
  }, []);

  const handleTest = async () => {
    setTesting(true); setTest(null);
    const r = await fetch('/api/superadmin/global-integrations/resend/test', { method:'POST', credentials:'include' });
    setTest(await r.json());
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // PATCH /api/superadmin/env expects { updates: [{key, value}] }
    const updates = Object.entries(form)
      .filter(([, val]) => val.trim())
      .map(([key, val]) => ({ key, value: val.trim() }));
    if (updates.length > 0) {
      await api.patch('/env', { updates });
    }
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const Row = ({ label, hint, name, type='text', placeholder }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:4, letterSpacing:'.04em', textTransform:'uppercase' }}>{label}</div>
      {hint && <div style={{ fontSize:11, color:C.text3, marginBottom:6 }}>{hint}</div>}
      <input type={type} value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))}
        placeholder={placeholder}
        style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7, border:`1px solid ${C.border}`,
          fontSize:13, fontFamily:F, color:C.text1, background:'#0a0f1e', outline:'none' }}/>
    </div>
  );

  return (
    <div style={{ maxWidth:680 }}>
      {/* Status banner */}
      {status && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8,
          background: status.resend?.configured ? '#0d2b1a' : '#2b1a0d', border:`1px solid ${status.resend?.configured ? '#1a4731' : '#4731 1a'}`,
          marginBottom:24 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: status.resend?.configured ? '#22c55e' : '#f59e0b', flexShrink:0 }}/>
          <span style={{ fontSize:12, color: status.resend?.configured ? '#86efac' : '#fcd34d', fontWeight:600 }}>
            Resend {status.resend?.configured ? `configured — sending from ${status.resend.default_domain || 'mail.vercentic.com'}` : 'not yet configured — emails will simulate only'}
          </span>
        </div>
      )}

      {/* Resend config card */}
      <div style={{ background:'#0d1117', border:`1px solid ${C.border}`, borderRadius:10, padding:20, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#1a82e2', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/></svg>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Resend — Platform Email Service</div>
            <div style={{ fontSize:11, color:C.text3 }}>Powers all outbound email — client notifications, campaigns, workflows</div>
          </div>
          <a href="https://resend.com/signup" target="_blank" rel="noreferrer"
            style={{ marginLeft:'auto', fontSize:11, color:C.purple, textDecoration:'none', fontWeight:600 }}>
            Get API key ↗
          </a>
        </div>

        <Row name="RESEND_API_KEY" label="API Key" type="password"
          hint="From resend.com → API Keys. Free tier: 3,000 emails/month, 1 domain. Pro ($20/mo): 50,000 emails, unlimited domains."
          placeholder="re_xxxxxxxxxxxxxxxxxxxx"/>
        <Row name="RESEND_DEFAULT_DOMAIN" label="Default Sending Domain"
          hint="Subdomain you own that Vercentic sends from by default (all clients). Add DNS records shown below after saving."
          placeholder="mail.vercentic.com"/>
        <Row name="RESEND_DEFAULT_FROM_NAME" label="Default From Name"
          placeholder="Vercentic"/>

        {/* DNS records helper */}
        <div style={{ background:'#060a12', borderRadius:8, padding:14, marginBottom:16, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:8, letterSpacing:'.04em', textTransform:'uppercase' }}>DNS Records to add for {form.RESEND_DEFAULT_DOMAIN || 'your domain'}</div>
          <div style={{ fontSize:11, color:C.text2, lineHeight:1.7, fontFamily:'monospace' }}>
            <div>TXT&nbsp;&nbsp; <span style={{color:'#60a5fa'}}>{form.RESEND_DEFAULT_DOMAIN || 'mail.vercentic.com'}</span> &nbsp;"v=spf1 include:_spf.resend.com ~all"</div>
            <div>CNAME&nbsp; <span style={{color:'#60a5fa'}}>resend._domainkey.{form.RESEND_DEFAULT_DOMAIN || 'mail.vercentic.com'}</span> &nbsp;→ resend._domainkey.resend.com</div>
            <div style={{color:C.text3}}>MX records are generated by Resend after domain verification in their dashboard.</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'8px 16px', borderRadius:7, border:'none', background:C.purple, color:'white',
              fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save & Apply'}
          </button>
          <button onClick={handleTest} disabled={testing}
            style={{ padding:'8px 16px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent',
              color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop:10, padding:'8px 12px', borderRadius:7, fontSize:12,
            background: testResult.ok ? '#0d2b1a' : '#2b0d0d',
            color: testResult.ok ? '#86efac' : '#fca5a5',
            border: `1px solid ${testResult.ok ? '#1a4731' : '#4b1a1a'}` }}>
            {testResult.ok
              ? `✓ Connected — ${testResult.domain_count} domain(s) registered in Resend`
              : `✗ Failed: ${testResult.error}`}
          </div>
        )}
      </div>

      <div style={{ fontSize:11, color:C.text3, lineHeight:1.6 }}>
        <strong style={{color:C.text2}}>How it works:</strong> All platform emails go through Resend using your default domain.
        Clients can optionally add their own sending domain in Settings → Integrations (requires Pro plan for multiple domains).
        Free tier (3,000 emails/month, 1 domain) is sufficient for testing.
        <br/><br/>
        <strong style={{color:C.amber}}>⚠ Railway note:</strong> Saving here applies the key for this session only.
        To persist across deploys, also add <code style={{fontFamily:'monospace',color:C.text1}}>RESEND_API_KEY</code> in your{' '}
        <a href="https://railway.app" target="_blank" rel="noreferrer" style={{color:C.purple}}>Railway dashboard → Variables</a>.
      </div>
    </div>
  );
}

export default function SuperAdminConsole() {
  const [authed,  setAuthed]  = useState(() => !!sessionStorage.getItem('sa_token'));
  const [section, setSection] = useState('clients');
  const [clientView,       setClientView]       = useState('list');
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Reset client detail view whenever we navigate away from the clients section
  useEffect(() => {
    if (section !== 'clients') { setClientView('list'); setSelectedClientId(null); }
  }, [section]);

  if (!authed) return <LoginScreen onAuth={(token, userId) => {
    sessionStorage.setItem('sa_token', token);
    if (userId) sessionStorage.setItem('sa_uid', userId);
    setAuthed(true);
  }}/>;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', fontFamily:F, color:C.text1 }}>
      {/* Sidebar */}
      <div style={{ width:220, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column' }}>
        {/* Logo */}
        <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${C.purple}25`, border:`1px solid ${C.purple}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:C.text1 }}>Super Admin</div>
              <div style={{ fontSize:10, color:C.text3 }}>Vercentic Internal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex:1, padding:'10px 10px' }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 8px 8px' }}>Console</div>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={()=>{ if(item.id==='clients'){ setClientView('list'); setSelectedClientId(null); } setSection(item.id); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, border:'none',
                background: section===item.id ? `${C.purple}18` : 'transparent',
                color: section===item.id ? C.purple : C.text2,
                fontSize:12, fontWeight: section===item.id ? 700 : 500, cursor:'pointer', fontFamily:F, textAlign:'left', transition:'all .12s' }}>
              <NavIcon id={item.id} size={14} color={section===item.id ? C.purple : C.text2}/>
              {item.label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.border}` }}>
          <button onClick={()=>{ sessionStorage.removeItem('sa_token'); sessionStorage.removeItem('sa_uid'); setAuthed(false); }}
            style={{ fontSize:11, color:C.text3, background:'none', border:'none', cursor:'pointer', fontFamily:F, padding:0 }}>
            → Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:C.text1 }}>
            {section==='clients' && clientView==='detail'
              ? <span onClick={()=>{ setClientView('list'); setSelectedClientId(null); }} style={{cursor:'pointer'}}>← Clients</span>
              : NAV_ITEMS.find(n=>n.id===section)?.label}
          </h1>
          <p style={{ margin:0, fontSize:13, color:C.text3 }}>
            {NAV_ITEMS.find(n=>n.id===section)?.desc}
          </p>
        </div>

        {section === 'env'                && <EnvSection/>}
        {section === 'global_integrations' && <GlobalIntegrationsSection/>}
        {section === 'health'             && <HealthSection/>}
        {section === 'clients' && (
          clientView === 'detail'
            ? <ClientDetail clientId={selectedClientId} onBack={()=>setClientView('list')} onProvisionEnv={()=>setSection('provision')}/>
            : <ClientList onProvision={()=>setSection('provision')} onSelectClient={c=>{ setSelectedClientId(c.id); setClientView('detail'); }}/>
        )}
        {section === 'provision' && (
          <ProvisionWizard onDone={()=>{ setSection('clients'); setClientView('list'); }} onCancel={()=>setSection('clients')}/>
        )}
        {section === 'templates' && <TemplateEnvironments/>}
        {section === 'perf' && <Performance/>}
        {section === 'features' && <FeaturePacksSection/>}
        {section === 'ai_usage' && <AIUsageReport/>}
        {section === 'ai_credits' && <AiCreditsManager/>}
        {section === 'activity' && <ActivityReport clientId={clientView==='detail'?selectedClientId:null}/>}
        {section === 'platform_events' && <PlatformEvents/>}
        {section === 'demo' && <DemoDataManager/>}
        {section === 'errors' && <ErrorLogViewer/>}
        {section === 'release_notes' && <ReleaseNotesAdmin />}
        {section === 'cases' && <CaseManager />}
        {section === 'diagnose' && (
          <div>
            <div style={{marginBottom:20}}>
              <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:800,color:C.text1}}>AI Environment Diagnosis</h2>
              <p style={{margin:0,fontSize:13,color:C.text3}}>Select a client environment to run an AI health check</p>
            </div>
            <EnvDiagnoseSection/>
          </div>
        )}
        {section === 'sequencer' && <EmailSequencer />}
      </div>
    </div>
  );
}

// ── Health Section (placeholder) ──────────────────────────────────────────────
function HealthSection() {
  const [info, setInfo] = useState(null);
  useEffect(() => { api.get('/system').then(setInfo); }, []);
  if (!info) return <div style={{ color:C.text3 }}>Loading…</div>;
  const items = [
    ['Node Version', info.node, C.green],
    ['Process ID',   info.pid,  C.text2],
    ['Platform',     info.platform, C.text2],
    ['Environment',  info.env,  info.env==='production'?C.green:C.amber],
    ['Uptime',       `${Math.floor(info.uptime/3600)}h ${Math.floor((info.uptime%3600)/60)}m`, C.text2],
    ['Heap Used',    `${Math.round(info.memory.heap/1024/1024)} MB`, C.accent],
    ['Heap Total',   `${Math.round(info.memory.heapTotal/1024/1024)} MB`, C.text2],
    ['RSS Memory',   `${Math.round(info.memory.rss/1024/1024)} MB`, C.text2],
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
      {items.map(([label, val, color]) => (
        <div key={label} style={{ padding:'16px 18px', background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
          <div style={{ fontSize:16, fontWeight:800, color: color || C.text1 }}>{val}</div>
        </div>
      ))}
    </div>
  );
}

