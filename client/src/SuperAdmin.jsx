import { useState, useEffect, useCallback } from "react";

const api = {
  get:  (p)    => fetch(`/api${p}`).then(r=>r.json()),
  put:  (p,b)  => fetch(`/api${p}`,{method:"PUT",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:  (p)    => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const C = {
  accent:"var(--t-accent)", accentLight:"var(--t-accent-light)",
  border:"var(--t-border)", surface:"var(--t-surface)", bg:"var(--t-bg)",
  text1:"var(--t-text1)", text2:"var(--t-text2)", text3:"var(--t-text3)",
  success:"#16a34a", danger:"#ef4444", warn:"#d97706",
};
const F = "'Inter','Segoe UI',system-ui,sans-serif";

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:17, fontWeight:800, color:C.text1 }}>{children}</div>
      {sub && <div style={{ fontSize:13, color:C.text3, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ live }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px",
      borderRadius:20, fontSize:11, fontWeight:700,
      background: live ? "#f0fdf4" : "#fffbeb",
      color: live ? C.success : C.warn,
      border: `1px solid ${live ? "#bbf7d0" : "#fde68a"}` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: live ? C.success : C.warn, display:"inline-block" }}/>
      {live ? "Live" : "Not configured"}
    </span>
  );
}

// ─── Credential field row ─────────────────────────────────────────────────────
function CredField({ label, fieldKey, value, placeholder, type="text", onSave, onClear }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState("");
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!val.trim()) return;
    setSaving(true);
    await onSave(fieldKey, val.trim());
    setSaving(false);
    setEditing(false);
    setVal("");
  };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:200, flexShrink:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.text2, fontFamily:"monospace" }}>{fieldKey}</div>
        <div style={{ fontSize:11, color:C.text3 }}>{label}</div>
      </div>
      <div style={{ flex:1 }}>
        {editing ? (
          <div style={{ display:"flex", gap:6 }}>
            <input type={type} value={val} onChange={e=>setVal(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&save()}
              placeholder={placeholder}
              autoFocus
              style={{ flex:1, padding:"7px 10px", border:`1.5px solid ${C.accent}`, borderRadius:8,
                fontSize:13, fontFamily:"monospace", outline:"none", background:C.bg }}/>
            <button onClick={save} disabled={saving||!val.trim()}
              style={{ padding:"7px 14px", background:C.accent, color:"#fff", border:"none",
                borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>
              {saving?"…":"Save"}
            </button>
            <button onClick={()=>{setEditing(false);setVal("");}}
              style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8,
                background:"none", cursor:"pointer", fontSize:12 }}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"monospace", fontSize:13, color: value.set ? C.text1 : C.text3 }}>
              {value.set ? value.masked : "Not set"}
            </span>
            <button onClick={()=>setEditing(true)}
              style={{ padding:"4px 10px", border:`1px solid ${C.border}`, borderRadius:6,
                background:"none", cursor:"pointer", fontSize:11, color:C.text2, fontWeight:600 }}>
              {value.set ? "Update" : "Set"}
            </button>
            {value.set && (
              <button onClick={()=>onClear(fieldKey)}
                style={{ padding:"4px 10px", border:`1px solid #fecaca`, borderRadius:6,
                  background:"#fff5f5", cursor:"pointer", fontSize:11, color:C.danger, fontWeight:600 }}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────
function ProviderCard({ provider, title, description, icon, fields, configs, status, onSave, onClear }) {
  const [open, setOpen] = useState(false);
  const isLive = status === "live";

  return (
    <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:14,
      marginBottom:14, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", cursor:"pointer" }}
        onClick={()=>setOpen(o=>!o)}>
        <div style={{ fontSize:28 }}>{icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:C.text1 }}>{title}</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{description}</div>
        </div>
        <StatusPill live={isLive}/>
        <div style={{ fontSize:16, color:C.text3, marginLeft:8 }}>{open?"▲":"▼"}</div>
      </div>

      {/* Fields */}
      {open && (
        <div style={{ padding:"0 20px 16px", borderTop:`1px solid ${C.border}` }}>
          {fields.map(f => (
            <CredField key={f.key} fieldKey={f.key} label={f.label}
              placeholder={f.placeholder} type={f.secret?"password":"text"}
              value={configs?.[provider]?.[f.key] || { set:false, masked:"" }}
              onSave={(key, val) => onSave(provider, key, val)}
              onClear={(key) => onClear(provider, key)}/>
          ))}
          {isLive && (
            <div style={{ marginTop:12, padding:"8px 12px", background:"#f0fdf4",
              border:"1px solid #bbf7d0", borderRadius:8, fontSize:12, color:C.success }}>
              ✓ Credentials configured — integration is active
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Integrations tab ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    provider: "twilio",
    title: "Twilio — SMS & WhatsApp",
    description: "Send and receive SMS and WhatsApp messages. Required for live messaging from person records.",
    icon: "💬",
    fields: [
      { key:"TWILIO_ACCOUNT_SID",  label:"Account SID",          placeholder:"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", secret:false },
      { key:"TWILIO_AUTH_TOKEN",   label:"Auth Token",           placeholder:"your_auth_token", secret:true },
      { key:"TWILIO_SMS_NUMBER",   label:"SMS Phone Number",     placeholder:"+14155552671", secret:false },
      { key:"TWILIO_WA_NUMBER",    label:"WhatsApp Number",      placeholder:"whatsapp:+14155552671", secret:false },
    ],
  },
  {
    provider: "sendgrid",
    title: "SendGrid — Email",
    description: "Send transactional emails directly from person records. Required for live email dispatch.",
    icon: "✉️",
    fields: [
      { key:"SENDGRID_API_KEY",      label:"API Key",         placeholder:"SG.xxxxxxxxxxxxx", secret:true },
      { key:"SENDGRID_FROM_EMAIL",   label:"From Email",      placeholder:"noreply@yourdomain.com", secret:false },
      { key:"SENDGRID_FROM_NAME",    label:"From Name",       placeholder:"Vercentic", secret:false },
    ],
  },
  {
    provider: "webhook",
    title: "Inbound Webhooks",
    description: "Twilio calls these URLs when messages are received. Set to your Railway deployment URL.",
    icon: "🔗",
    fields: [
      { key:"WEBHOOK_BASE_URL", label:"Base URL", placeholder:"https://talentos-production-4045.up.railway.app", secret:false },
    ],
  },
];

function IntegrationsSection({ configs, status, onSave, onClear }) {
  return (
    <div>
      <SectionTitle
        children="Integrations"
        sub="Configure third-party service credentials. All values are stored securely and masked after entry."/>

      {/* Setup guide */}
      <div style={{ background:"#f8faff", border:`1px solid #c7d2fe`, borderRadius:12,
        padding:"14px 16px", marginBottom:24, fontSize:13, color:"#3730a3" }}>
        <strong>Setup guide:</strong> Configure Twilio first (SMS + WhatsApp), then SendGrid (Email),
        then set your Webhook Base URL so Twilio can deliver inbound messages.
        Once credentials are saved the integration activates immediately — no restart required.
      </div>

      {PROVIDERS.map(p => (
        <ProviderCard key={p.provider} {...p}
          configs={configs}
          status={status?.[p.provider === "webhook" ? "sms" : p.provider]}
          onSave={onSave}
          onClear={onClear}/>
      ))}
    </div>
  );
}

// ─── Super Admin page (tabs: Integrations | more to come) ───────────────────
const SA_TABS = [
  { id:"integrations", label:"Integrations", icon:"🔌" },
  // Future: { id:"billing", label:"Billing", icon:"💳" },
  // Future: { id:"audit",   label:"Audit Log", icon:"🔍" },
];

export default function SuperAdminSection() {
  const [activeTab, setActiveTab] = useState("integrations");
  const [configs, setConfigs]     = useState({});
  const [status, setStatus]       = useState({});
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      api.get("/integrations"),
      api.get("/integrations/status"),
    ]);
    setConfigs(c);
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (provider, key, value) => {
    await api.put(`/integrations/${provider}`, { [key]: value });
    load();
  };

  const handleClear = async (provider, key) => {
    await api.del(`/integrations/${provider}/${key}`);
    load();
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"#fef3c7",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🛡️</div>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:C.text1 }}>Super Admin</div>
          <div style={{ fontSize:13, color:C.text3 }}>System-level configuration — restricted to Super Admin role</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:`1.5px solid ${C.border}`, marginBottom:24 }}>
        {SA_TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:"8px 18px", border:"none", background:"none", cursor:"pointer",
              fontFamily:F, fontSize:13, fontWeight:activeTab===t.id?700:500,
              color:activeTab===t.id?C.accent:C.text2,
              borderBottom:activeTab===t.id?`2.5px solid ${C.accent}`:"2.5px solid transparent",
              marginBottom:-1.5, display:"flex", alignItems:"center", gap:6 }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:C.text3 }}>Loading…</div>
      ) : (
        <>
          {activeTab==="integrations" && (
            <IntegrationsSection configs={configs} status={status} onSave={handleSave} onClear={handleClear}/>
          )}
        </>
      )}
    </div>
  );
}
