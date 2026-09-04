// client/src/ConversationalActions.jsx
// Settings → Processes → Conversational Actions
// Admin control surface for headless (Slack / Microsoft Teams) access to
// Vercentic: connect workspaces, define what people can ask/do from chat,
// link identities, and test trigger phrases before publishing.

import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const F = "var(--t-font, 'Plus Jakarta Sans', -apple-system, sans-serif)";

const CHANNEL_META = {
  slack:           { label: "Slack",            color: "#4A154B" },
  microsoft_teams: { label: "Microsoft Teams",  color: "#6264A7" },
};

const PATHS = {
  plus:       "M12 5v14M5 12h14",
  x:          "M18 6 6 18M6 6l12 12",
  edit:       "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:      "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z",
  slack:      "M14.5 10a2.5 2.5 0 01-2.5-2.5V4a2.5 2.5 0 015 0v3.5A2.5 2.5 0 0114.5 10zM20 14.5a2.5 2.5 0 01-2.5 2.5H14v-3.5a2.5 2.5 0 012.5-2.5h3.5a2.5 2.5 0 010 5V14.5zM9.5 20a2.5 2.5 0 002.5-2.5V14a2.5 2.5 0 00-5 0v3.5A2.5 2.5 0 009.5 20zM4 9.5A2.5 2.5 0 006.5 7H10v3.5A2.5 2.5 0 017.5 13H4a2.5 2.5 0 010-5V9.5z",
  teams:      "M17 7a3 3 0 100-6 3 3 0 000 6zM10 8a4 4 0 100-8 4 4 0 000 8zM17 8.5c-2.2 0-4 1.8-4 4V17c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4.5c0-2.2-1.8-4-4-4zM10 9c-2.8 0-5 2.2-5 5v5.5c0 1.4 1.1 2.5 2.5 2.5h5c1.4 0 2.5-1.1 2.5-2.5V14c0-2.8-2.2-5-5-5z",
  zap:        "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  check:      "M20 6 9 17l-5-5",
  loader:     "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  msgSquare:  "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  key:        "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  link:       "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
};

const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || ""} />
  </svg>
);

const Btn = ({ children, variant = "secondary", onClick, disabled, style, ...rest }) => {
  const base = { padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid transparent", opacity: disabled ? 0.5 : 1, transition: "opacity .12s" };
  const variants = {
    primary:   { background: "var(--t-accent)", color: "#fff" },
    secondary: { background: "var(--t-surface)", color: "var(--t-text1)", border: "1px solid var(--t-border)" },
    ghost:     { background: "transparent", color: "var(--t-text2)" },
    danger:    { background: "var(--t-surface)", color: "#dc2626", border: "1px solid var(--t-border)" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }} {...rest}>{children}</button>;
};

const Badge = ({ children, color = "var(--t-text3)", bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg || `${color}14` }}>{children}</span>
);

const Toggle = ({ on, onChange }) => (
  <div onClick={onChange} style={{ width: 34, height: 20, borderRadius: 12, background: on ? "var(--t-accent)" : "var(--t-border2)", cursor: "pointer", position: "relative", transition: "background .15s", flexShrink: 0 }}>
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 16 : 2, transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
  </div>
);

const Modal = ({ children, onClose, width = 560 }) => (
  <div onMouseDown={e => e.target === e.currentTarget && onClose?.()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onMouseDown={e => e.stopPropagation()} style={{ background: "var(--t-surface)", borderRadius: 14, width, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-text1)", marginBottom: 5 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: "var(--t-text3)", marginTop: 4 }}>{hint}</div>}
  </div>
);

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--t-border)", borderRadius: 7, fontSize: 13, fontFamily: F, outline: "none", color: "var(--t-text1)", background: "var(--t-bg)" };

// ═══════════════════════════════════════════════════════════════════════════
// STATS BAR
// ═══════════════════════════════════════════════════════════════════════════
function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Enabled actions", value: stats.enabled_actions },
    { label: "Invocations today", value: stats.invocations_today },
    { label: "Success rate", value: stats.success_rate !== null ? `${stats.success_rate}%` : "—" },
    { label: "Channels connected", value: stats.channels_connected?.length || 0 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
      {items.map(it => (
        <div key={it.label} style={{ padding: "14px 16px", background: "var(--t-surface2)", border: "1px solid var(--t-border)", borderRadius: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t-text1)", letterSpacing: -0.5 }}>{it.value}</div>
          <div style={{ fontSize: 11, color: "var(--t-text3)", marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNELS PANEL
// ═══════════════════════════════════════════════════════════════════════════
function ChannelsPanel({ environmentId }) {
  const [channels, setChannels] = useState([]);
  const [connecting, setConnecting] = useState(null);

  const load = useCallback(async () => {
    const d = await api.get(`/chat-bot-channels?environment_id=${environmentId}`);
    setChannels(Array.isArray(d) ? d.filter(c => c.status === "connected") : []);
  }, [environmentId]);
  useEffect(() => { if (environmentId) load(); }, [environmentId, load]);

  const disconnect = async (id) => { if (!confirm("Disconnect this workspace?")) return; await api.delete(`/chat-bot-channels/${id}`); load(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text1)" }}>Connected workspaces</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => setConnecting("slack")}><Ic n="slack" s={13} /> Connect Slack</Btn>
          <Btn variant="secondary" onClick={() => setConnecting("microsoft_teams")}><Ic n="teams" s={13} /> Connect Teams</Btn>
        </div>
      </div>

      {channels.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", background: "var(--t-surface2)", border: "1px dashed var(--t-border)", borderRadius: 10, color: "var(--t-text3)", fontSize: 13 }}>
          No workspaces connected yet. Connect Slack or Teams to start using conversational actions.
        </div>
      )}
      {channels.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--t-border)", borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${CHANNEL_META[c.platform]?.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic n={c.platform === "slack" ? "slack" : "teams"} s={16} c={CHANNEL_META[c.platform]?.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text1)" }}>{c.external_workspace_name || CHANNEL_META[c.platform]?.label}</div>
            <div style={{ fontSize: 11, color: "var(--t-text3)" }}>{CHANNEL_META[c.platform]?.label} · Bot token {c.bot_token_masked || "•••"}</div>
          </div>
          <Badge color="#16a34a">● Connected</Badge>
          <Btn variant="ghost" onClick={() => disconnect(c.id)}><Ic n="x" s={13} /></Btn>
        </div>
      ))}

      {connecting && <ConnectChannelModal platform={connecting} environmentId={environmentId} onClose={() => setConnecting(null)} onSaved={() => { setConnecting(null); load(); }} />}
    </div>
  );
}

function ConnectChannelModal({ platform, environmentId, onClose, onSaved }) {
  const [form, setForm] = useState({ bot_token: "", signing_secret: "", app_id: "", app_password: "", tenant_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const path = platform === "slack" ? "/chat-bot-channels/slack" : "/chat-bot-channels/teams";
      const body = platform === "slack"
        ? { environment_id: environmentId, bot_token: form.bot_token, signing_secret: form.signing_secret }
        : { environment_id: environmentId, app_id: form.app_id, app_password: form.app_password, tenant_id: form.tenant_id };
      const res = await api.post(path, body);
      if (res?.error) { setError(res.error); setSaving(false); return; }
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--t-border)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t-text1)", display: "flex", alignItems: "center", gap: 8 }}>
          <Ic n={platform === "slack" ? "slack" : "teams"} s={16} c={CHANNEL_META[platform].color} /> Connect {CHANNEL_META[platform].label}
        </div>
      </div>
      <div style={{ padding: 22, overflowY: "auto" }}>
        {platform === "slack" ? (
          <>
            <Field label="Bot User OAuth Token" hint="From your Slack app → OAuth & Permissions. Starts with xoxb-.">
              <input style={inputStyle} type="password" value={form.bot_token} onChange={e => set("bot_token", e.target.value)} placeholder="xoxb-..." />
            </Field>
            <Field label="Signing Secret" hint="From your Slack app → Basic Information → App Credentials.">
              <input style={inputStyle} type="password" value={form.signing_secret} onChange={e => set("signing_secret", e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Microsoft App ID" hint="From your Azure Bot resource → Configuration.">
              <input style={inputStyle} value={form.app_id} onChange={e => set("app_id", e.target.value)} />
            </Field>
            <Field label="Client Secret" hint="Generated in the App Registration → Certificates & secrets.">
              <input style={inputStyle} type="password" value={form.app_password} onChange={e => set("app_password", e.target.value)} />
            </Field>
            <Field label="Tenant (AAD) ID" hint="Your customer's Microsoft 365 tenant ID — used to route inbound messages to this environment.">
              <input style={inputStyle} value={form.tenant_id} onChange={e => set("tenant_id", e.target.value)} />
            </Field>
          </>
        )}
        {error && <div style={{ padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>}
      </div>
      <div style={{ padding: "14px 22px", borderTop: "1px solid var(--t-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Connecting…" : "Connect"}</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IDENTITY LINKS PANEL
// ═══════════════════════════════════════════════════════════════════════════
function IdentityLinksPanel({ environmentId }) {
  const [links, setLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemUser, setRedeemUser] = useState("");

  const load = useCallback(async () => {
    const [l, u] = await Promise.all([
      api.get(`/chat-bot-channels/identity-links?environment_id=${environmentId}`),
      api.get(`/users`),
    ]);
    setLinks(Array.isArray(l) ? l : []);
    setUsers(Array.isArray(u) ? u : (Array.isArray(u?.users) ? u.users : []));
  }, [environmentId]);
  useEffect(() => { if (environmentId) load(); }, [environmentId, load]);

  const redeem = async () => {
    if (!redeemCode || !redeemUser) return;
    const res = await api.post(`/chat-bot-channels/identity-links/redeem`, { code: redeemCode, vercentic_user_id: redeemUser });
    if (res?.error) { alert(res.error); return; }
    setRedeemCode(""); setRedeemUser(""); load();
  };

  const unlink = async (id) => { await api.delete(`/chat-bot-channels/identity-links/${id}`); load(); };

  const pending = links.filter(l => !l.vercentic_user_id);
  const linked = links.filter(l => l.vercentic_user_id);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text1)", marginBottom: 8 }}>Redeem a link code</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input style={{ ...inputStyle, width: 140, textTransform: "uppercase" }} placeholder="e.g. 8F2KQZ" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} />
        <select style={{ ...inputStyle, flex: 1 }} value={redeemUser} onChange={e => setRedeemUser(e.target.value)}>
          <option value="">Which Vercentic user is this?</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>)}
        </select>
        <Btn variant="primary" onClick={redeem}>Link</Btn>
      </div>

      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>Waiting to be linked ({pending.length})</div>
          {pending.map(l => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--t-border)", borderRadius: 8, marginBottom: 6 }}>
              <Badge color={CHANNEL_META[l.platform]?.color || "var(--t-text3)"}>{CHANNEL_META[l.platform]?.label}</Badge>
              <div style={{ fontSize: 12, color: "var(--t-text2)", flex: 1 }}>{l.external_user_name || l.external_user_id}</div>
              <code style={{ fontSize: 12, fontWeight: 700, background: "var(--t-surface2)", padding: "2px 8px", borderRadius: 5 }}>{l.link_code}</code>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text3)", textTransform: "uppercase", letterSpacing: ".04em", margin: "16px 0 8px" }}>Linked ({linked.length})</div>
      {linked.length === 0 && <div style={{ fontSize: 12, color: "var(--t-text3)" }}>No identities linked yet.</div>}
      {linked.map(l => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--t-border)", borderRadius: 8, marginBottom: 6 }}>
          <Badge color={CHANNEL_META[l.platform]?.color || "var(--t-text3)"}>{CHANNEL_META[l.platform]?.label}</Badge>
          <div style={{ fontSize: 12, color: "var(--t-text2)", flex: 1 }}>{l.external_user_name || l.external_user_id} → <strong>{l.vercentic_user_name}</strong></div>
          <Btn variant="ghost" onClick={() => unlink(l.id)}><Ic n="x" s={12} /></Btn>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PICKER
// ═══════════════════════════════════════════════════════════════════════════
function TemplatePicker({ onClose, onPicked }) {
  const [templates, setTemplates] = useState([]);
  useEffect(() => { api.get("/conversational-actions/templates").then(d => setTemplates(Array.isArray(d) ? d : [])); }, []);

  return (
    <Modal onClose={onClose} width={680}>
      <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--t-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t-text1)" }}>Starting templates</div>
        <Btn variant="ghost" onClick={onClose}><Ic n="x" s={16} /></Btn>
      </div>
      <div style={{ padding: 18, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {templates.map(t => (
          <div key={t.id} onClick={() => onPicked(t.id)} style={{ padding: 14, border: "1px solid var(--t-border)", borderRadius: 10, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--t-accent)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--t-border)"}>
            <Badge color={t.category_color}>{t.category_label}</Badge>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text1)", margin: "8px 0 4px" }}>{t.name}</div>
            <div style={{ fontSize: 12, color: "var(--t-text3)", lineHeight: 1.4 }}>{t.description}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDER MODAL
// ═══════════════════════════════════════════════════════════════════════════
function BuilderModal({ action, environmentId, meta, onClose, onSaved }) {
  const isEdit = !!action?.id;
  const [tab, setTab] = useState("trigger");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: action?.name || "", description: action?.description || "",
    trigger_type: action?.trigger_type || "command",
    trigger_phrases: action?.trigger_phrases || [],
    trigger_event: action?.trigger_event || "",
    parameters: action?.parameters || [],
    action_type: action?.action_type || "",
    permission_required: action?.permission_required || { type: "global", action: "" },
    approval_required: action?.approval_required || false,
    rate_limit_per_user_per_hour: action?.rate_limit_per_user_per_hour ?? 30,
    channels: action?.channels || ["slack"],
    response_type: action?.response_type || "text",
    card_type: action?.card_type || "",
    response_template: action?.response_template || "",
    status: action?.status || "draft",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const addPhrase = () => set("trigger_phrases", [...form.trigger_phrases, ""]);
  const updatePhrase = (i, v) => { const p = [...form.trigger_phrases]; p[i] = v; set("trigger_phrases", p); };
  const removePhrase = (i) => set("trigger_phrases", form.trigger_phrases.filter((_, idx) => idx !== i));

  const addParam = () => set("parameters", [...form.parameters, { key: "", label: "", type: "text", required: true }]);
  const updateParam = (i, k, v) => { const p = [...form.parameters]; p[i] = { ...p[i], [k]: v }; set("parameters", p); };
  const removeParam = (i) => set("parameters", form.parameters.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.name || !form.action_type) return;
    setSaving(true);
    try {
      const payload = { ...form, environment_id: environmentId };
      if (isEdit) await api.patch(`/conversational-actions/${action.id}`, payload);
      else await api.post(`/conversational-actions`, payload);
      onSaved();
    } finally { setSaving(false); }
  };

  const runTest = async () => {
    if (!testText.trim() || !isEdit) return;
    setTesting(true);
    try {
      const r = await api.post(`/conversational-actions/test`, { environment_id: environmentId, text: testText, conversation_id: `builder-${action.id}` });
      setTestResult(r);
    } finally { setTesting(false); }
  };

  const TABS = ["trigger", "action", "guardrails", "response"];
  const TAB_LABELS = { trigger: "Trigger", action: "Action", guardrails: "Guardrails", response: "Response" };

  return (
    <Modal width={640}>
      <div style={{ padding: "20px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--t-surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="msgSquare" s={18} c="var(--t-text1)" />
          </div>
          <div style={{ flex: 1 }}>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Action name"
              style={{ fontSize: 16, fontWeight: 700, color: "var(--t-text1)", border: "none", outline: "none", width: "100%", fontFamily: F, background: "transparent" }} />
            <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short description"
              style={{ fontSize: 12, color: "var(--t-text3)", border: "none", outline: "none", width: "100%", fontFamily: F, marginTop: 2, background: "transparent" }} />
          </div>
          <Btn variant="ghost" onClick={onClose}><Ic n="x" s={16} /></Btn>
        </div>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--t-border)" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: F, color: tab === t ? "var(--t-text1)" : "var(--t-text3)", borderBottom: tab === t ? "2px solid var(--t-accent)" : "2px solid transparent" }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
        {tab === "trigger" && (
          <>
            <Field label="Trigger type">
              <select style={inputStyle} value={form.trigger_type} onChange={e => set("trigger_type", e.target.value)}>
                <option value="command">Command — exact/fuzzy phrase</option>
                <option value="intent">Intent — AI-classified natural language</option>
                <option value="event">Event — fired by the system</option>
              </select>
            </Field>
            {form.trigger_type !== "event" ? (
              <Field label="Example phrases" hint="3-5 examples help the classifier a lot. Use {param} placeholders for values to extract.">
                {form.trigger_phrases.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input style={inputStyle} value={p} onChange={e => updatePhrase(i, e.target.value)} placeholder="e.g. move {candidate_name} to {stage}" />
                    <Btn variant="ghost" onClick={() => removePhrase(i)}><Ic n="x" s={13} /></Btn>
                  </div>
                ))}
                <Btn variant="secondary" onClick={addPhrase}><Ic n="plus" s={12} /> Add phrase</Btn>
              </Field>
            ) : (
              <Field label="System event" hint="Which internal event should fire this — e.g. record_created, approval_requested.">
                <input style={inputStyle} value={form.trigger_event} onChange={e => set("trigger_event", e.target.value)} placeholder="record_created" />
              </Field>
            )}

            <Field label="Parameters to extract">
              {form.parameters.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={p.key} onChange={e => updateParam(i, "key", e.target.value)} placeholder="key" />
                  <input style={{ ...inputStyle, flex: 1 }} value={p.label} onChange={e => updateParam(i, "label", e.target.value)} placeholder="Question to ask if missing" />
                  <select style={{ ...inputStyle, width: 100 }} value={p.type} onChange={e => updateParam(i, "type", e.target.value)}>
                    <option value="text">Text</option><option value="people">Person</option><option value="date">Date</option><option value="select">Select</option>
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--t-text2)" }}>
                    <input type="checkbox" checked={p.required} onChange={e => updateParam(i, "required", e.target.checked)} /> Req
                  </label>
                  <Btn variant="ghost" onClick={() => removeParam(i)}><Ic n="x" s={13} /></Btn>
                </div>
              ))}
              <Btn variant="secondary" onClick={addParam}><Ic n="plus" s={12} /> Add parameter</Btn>
            </Field>
          </>
        )}

        {tab === "action" && (
          <>
            <Field label="Underlying action" hint="What actually runs when this is triggered.">
              <select style={inputStyle} value={form.action_type} onChange={e => set("action_type", e.target.value)}>
                <option value="">Select…</option>
                {Object.keys(meta.action_types || {}).map(k => <option key={k} value={k}>{meta.action_types[k].label}</option>)}
              </select>
            </Field>
            <Field label="Channels" hint="Which platforms this action is available on.">
              <div style={{ display: "flex", gap: 8 }}>
                {["slack", "microsoft_teams"].map(ch => (
                  <label key={ch} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "1px solid var(--t-border)", borderRadius: 7, fontSize: 12, cursor: "pointer", color: "var(--t-text2)" }}>
                    <input type="checkbox" checked={form.channels.includes(ch)} onChange={e => set("channels", e.target.checked ? [...form.channels, ch] : form.channels.filter(c => c !== ch))} />
                    {CHANNEL_META[ch].label}
                  </label>
                ))}
              </div>
            </Field>
          </>
        )}

        {tab === "guardrails" && (
          <>
            <Field label="Permission required" hint="Reuses the exact same object/global permissions from Roles & Permissions — nothing new is invented.">
              <div style={{ display: "flex", gap: 8 }}>
                <select style={{ ...inputStyle, width: 110 }} value={form.permission_required.type} onChange={e => set("permission_required", { ...form.permission_required, type: e.target.value })}>
                  <option value="global">Global</option><option value="object">Object</option>
                </select>
                {form.permission_required.type === "object" && (
                  <input style={inputStyle} placeholder="object slug (e.g. people)" value={form.permission_required.object_slug || ""} onChange={e => set("permission_required", { ...form.permission_required, object_slug: e.target.value })} />
                )}
                <input style={inputStyle} placeholder="action (e.g. record_move_stage or view)" value={form.permission_required.action || ""} onChange={e => set("permission_required", { ...form.permission_required, action: e.target.value })} />
              </div>
            </Field>
            <Field label="Require approval before running">
              <Toggle on={form.approval_required} onChange={() => set("approval_required", !form.approval_required)} />
            </Field>
            <Field label="Rate limit (per user, per hour)">
              <input type="number" style={{ ...inputStyle, width: 100 }} value={form.rate_limit_per_user_per_hour ?? ""} onChange={e => set("rate_limit_per_user_per_hour", e.target.value ? Number(e.target.value) : null)} placeholder="No limit" />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft — not live yet</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
          </>
        )}

        {tab === "response" && (
          <>
            <Field label="Response type">
              <select style={inputStyle} value={form.response_type} onChange={e => set("response_type", e.target.value)}>
                <option value="text">Plain text</option><option value="card">Card</option><option value="list">List</option>
              </select>
            </Field>
            {form.response_type === "card" && (
              <Field label="Card type">
                <select style={inputStyle} value={form.card_type} onChange={e => set("card_type", e.target.value)}>
                  <option value="">Select…</option>
                  {(meta.card_types || []).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </Field>
            )}
            {form.response_type === "text" && (
              <Field label="Text template" hint="Use {{key}} tokens to insert values from the action's result.">
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.response_template} onChange={e => set("response_template", e.target.value)} placeholder="✅ Moved {{candidate_name}} to {{stage}}." />
              </Field>
            )}

            {isEdit && (
              <div style={{ marginTop: 20, padding: 14, background: "var(--t-surface2)", borderRadius: 10, border: "1px solid var(--t-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text1)", marginBottom: 8 }}>Try it</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input style={inputStyle} value={testText} onChange={e => setTestText(e.target.value)} placeholder="Type a message like you would in Slack…" onKeyDown={e => e.key === "Enter" && runTest()} />
                  <Btn variant="primary" onClick={runTest} disabled={testing}>{testing ? "…" : "Run"}</Btn>
                </div>
                {testResult && (
                  <div style={{ marginTop: 10, padding: 10, background: "var(--t-bg)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12 }}>
                    <div style={{ color: "var(--t-text3)", marginBottom: 4 }}>Matched: <strong style={{ color: "var(--t-text1)" }}>{testResult.matched_action || "nothing"}</strong>{testResult.confidence ? ` (${Math.round(testResult.confidence * 100)}% confidence)` : ""}</div>
                    <div style={{ color: "var(--t-text1)" }}>{testResult.reply}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: "14px 22px", borderTop: "1px solid var(--t-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving || !form.name || !form.action_type}>
          {saving && <Ic n="loader" s={13} />}{isEdit ? "Save changes" : "Create action"}
        </Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION ROW
// ═══════════════════════════════════════════════════════════════════════════
function ActionRow({ a, onEdit, onDelete, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--t-border)", borderRadius: 10, marginBottom: 8, background: a.status === "enabled" ? "var(--t-surface)" : "var(--t-surface2)" }}>
      <Toggle on={a.status === "enabled"} onChange={() => onToggle(a)} />
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEdit(a)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text1)" }}>{a.name}</span>
          <Badge>{a.trigger_type}</Badge>
          {a.approval_required && <Badge color="#d97706">needs approval</Badge>}
          {a.is_system && <Badge color="var(--t-text3)">template</Badge>}
        </div>
        <div style={{ fontSize: 12, color: "var(--t-text3)", marginTop: 2 }}>{a.description}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {(a.channels || []).map(ch => <Ic key={ch} n={ch === "slack" ? "slack" : "teams"} s={13} c={CHANNEL_META[ch]?.color} />)}
      </div>
      <div style={{ fontSize: 11, color: "var(--t-text3)", minWidth: 70, textAlign: "right" }}>{a.usage_count || 0} uses</div>
      <Btn variant="ghost" onClick={() => onEdit(a)}><Ic n="edit" s={13} /></Btn>
      {!a.is_system && <Btn variant="ghost" onClick={() => onDelete(a.id)}><Ic n="trash" s={13} c="#dc2626" /></Btn>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function ConversationalActions({ environment }) {
  const envId = environment?.id;
  const [tab, setTab] = useState("actions");
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    const [a, s, m] = await Promise.all([
      api.get(`/conversational-actions?environment_id=${envId}`),
      api.get(`/conversational-actions/stats/summary?environment_id=${envId}`),
      api.get(`/conversational-actions/meta`),
    ]);
    setActions(Array.isArray(a) ? a : []);
    setStats(s);
    setMeta(m || {});
    setLoading(false);
  }, [envId]);
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (a) => {
    const next = a.status === "enabled" ? "disabled" : "enabled";
    await api.patch(`/conversational-actions/${a.id}/status`, { status: next });
    load();
  };
  const handleDelete = async (id) => { if (!confirm("Delete this action?")) return; await api.delete(`/conversational-actions/${id}`); load(); };
  const handlePickTemplate = async (templateId) => {
    setShowTemplates(false);
    const row = await api.post(`/conversational-actions/from-template`, { environment_id: envId, template_id: templateId });
    load();
    setEditing(row);
  };

  const TABS = [
    { id: "actions",  label: "Actions",         icon: "msgSquare" },
    { id: "channels", label: "Channels",        icon: "link" },
    { id: "identity", label: "Identity Links",  icon: "key" },
  ];

  return (
    <div style={{ maxWidth: 880, fontFamily: F }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t-text1)", letterSpacing: -0.3 }}>Conversational Actions</div>
          <div style={{ fontSize: 13, color: "var(--t-text3)", marginTop: 2 }}>Let people search, update records, and approve things from Slack or Microsoft Teams.</div>
        </div>
        {tab === "actions" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={() => setShowTemplates(true)}><Ic n="zap" s={13} /> Browse templates</Btn>
            <Btn variant="primary" onClick={() => setEditing({})}><Ic n="plus" s={13} /> New action</Btn>
          </div>
        )}
      </div>

      <StatsBar stats={stats} />

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--t-border)", marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, fontFamily: F, color: tab === t.id ? "var(--t-text1)" : "var(--t-text3)", borderBottom: tab === t.id ? "2px solid var(--t-accent)" : "2px solid transparent" }}>
            <Ic n={t.icon} s={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "actions" && (
        loading ? <div style={{ color: "var(--t-text3)", fontSize: 13 }}>Loading…</div> :
        actions.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", background: "var(--t-surface2)", border: "1px dashed var(--t-border)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: "var(--t-text3)", marginBottom: 12 }}>No conversational actions yet.</div>
            <Btn variant="primary" onClick={() => setShowTemplates(true)} style={{ margin: "0 auto" }}><Ic n="zap" s={13} /> Start from a template</Btn>
          </div>
        ) : actions.map(a => <ActionRow key={a.id} a={a} onEdit={setEditing} onDelete={handleDelete} onToggle={handleToggle} />)
      )}

      {tab === "channels" && <ChannelsPanel environmentId={envId} />}
      {tab === "identity" && <IdentityLinksPanel environmentId={envId} />}

      {editing && <BuilderModal action={editing} environmentId={envId} meta={meta} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {showTemplates && <TemplatePicker onClose={() => setShowTemplates(false)} onPicked={handlePickTemplate} />}
    </div>
  );
}
