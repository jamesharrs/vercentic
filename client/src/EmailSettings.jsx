/**
 * EmailSettings.jsx — User email preferences section in Settings → Your Preferences
 */
import { useState, useEffect, useRef } from "react";
import { getCsrfToken } from "./apiClient.js";

const F = "'Geist', -apple-system, sans-serif";
const accent = "#4361ee";

const Lbl = ({ children, hint }) => (
  <div style={{ marginBottom: 4 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{children}</span>
    {hint && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{hint}</span>}
  </div>
);

const Inp = ({ value, onChange, placeholder, type = "text", disabled }) => (
  <input type={type} value={value || ""} disabled={disabled}
    onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: F, boxSizing: "border-box", background: disabled ? "#f9fafb" : "white", color: "#111827", outline: "none" }} />
);

const Sel = ({ value, onChange, children }) => (
  <select value={value || ""} onChange={e => onChange(e.target.value)}
    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: F, background: "white", color: "#111827", outline: "none" }}>
    {children}
  </select>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <div onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? accent : "#d1d5db", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: checked ? 21 : 3, transition: "left .2s" }} />
    </div>
    {label && <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>}
  </label>
);

const Card = ({ title, desc, children }) => (
  <div style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{desc}</div>}
    </div>
    {children}
  </div>
);

const Row2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 12 }}>
    <Lbl hint={hint}>{label}</Lbl>
    {children}
  </div>
);

const SaveBtn = ({ saving, onClick, saved }) => (
  <button onClick={onClick} disabled={saving}
    style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saved ? "#059669" : accent, color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: F, transition: "background .15s" }}>
    {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
  </button>
);

const StatusPill = ({ status }) => {
  const map = {
    verified:   { label: "Verified",      bg: "#d1fae5", color: "#065f46" },
    pending:    { label: "Pending",        bg: "#fef3c7", color: "#92400e" },
    unverified: { label: "Not verified",   bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.unverified;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>;
};

const FooterEditor = ({ value, onChange }) => {
  const [mode, setMode] = useState("visual"); // visual | html | preview
  const editorRef = useRef(null);

  // Sync contentEditable → state on blur
  const handleBlur = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Toolbar command helper
  const cmd = (command, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    onChange(editorRef.current.innerHTML);
  };

  const btnStyle = (active) => ({
    padding: "3px 8px", borderRadius: 5, border: `1px solid ${active ? accent : "#e5e7eb"}`,
    background: active ? `${accent}15` : "white", color: active ? accent : "#374151",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F, lineHeight: 1.4,
  });

  const ToolBtn = ({ label, title, onClick }) => (
    <button type="button" title={title} onClick={onClick} style={btnStyle(false)}>{label}</button>
  );

  return (
    <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1.5px solid #e5e7eb", background: "#f9fafb" }}>
        {[["visual","Visual"],["html","HTML"],["preview","Preview"]].map(([m, label]) => (
          <button key={m} type="button" onClick={() => {
            if (m === "html" && editorRef.current) onChange(editorRef.current.innerHTML);
            setMode(m);
          }} style={{ padding: "6px 14px", border: "none", borderRight: "1px solid #e5e7eb", background: mode===m ? "white" : "transparent", color: mode===m ? accent : "#6b7280", fontSize: 12, fontWeight: mode===m ? 700 : 500, cursor: "pointer", fontFamily: F }}>
            {label}
          </button>
        ))}
      </div>

      {/* Visual toolbar */}
      {mode === "visual" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 8px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
          <ToolBtn label="B" title="Bold" onClick={() => cmd("bold")} />
          <ToolBtn label="I" title="Italic" onClick={() => cmd("italic")} />
          <ToolBtn label="U" title="Underline" onClick={() => cmd("underline")} />
          <div style={{ width: 1, background: "#e5e7eb", margin: "2px 4px" }} />
          <ToolBtn label="H1" title="Heading 1" onClick={() => cmd("formatBlock","<h1>")} />
          <ToolBtn label="H2" title="Heading 2" onClick={() => cmd("formatBlock","<h2>")} />
          <ToolBtn label="¶"  title="Paragraph" onClick={() => cmd("formatBlock","<p>")} />
          <div style={{ width: 1, background: "#e5e7eb", margin: "2px 4px" }} />
          <ToolBtn label="• List" title="Bullet list" onClick={() => cmd("insertUnorderedList")} />
          <ToolBtn label="Link" title="Insert link" onClick={() => {
            const url = prompt("URL:", "https://");
            if (url) cmd("createLink", url);
          }} />
          <ToolBtn label="—" title="Remove formatting" onClick={() => cmd("removeFormat")} />
          <div style={{ width: 1, background: "#e5e7eb", margin: "2px 4px" }} />
          {/* Colour picker */}
          <label title="Text colour" style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:12, color:"#374151" }}>
            A
            <input type="color" defaultValue="#000000" onChange={e => cmd("foreColor", e.target.value)}
              style={{ width:18, height:18, border:"none", padding:0, cursor:"pointer", background:"none" }} />
          </label>
        </div>
      )}

      {/* Visual editor */}
      {mode === "visual" && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: value || "" }}
          style={{ minHeight: 130, padding: "12px 14px", fontSize: 13, fontFamily: F, color: "#111827", outline: "none", lineHeight: 1.7 }}
        />
      )}

      {/* HTML source editor */}
      {mode === "html" && (
        <textarea value={value || ""} onChange={e => onChange(e.target.value)}
          rows={8}
          placeholder="<p>Best regards,</p><p><strong>James Harrington</strong></p>"
          style={{ width: "100%", padding: "12px 14px", border: "none", fontSize: 12, fontFamily: "ui-monospace, monospace", resize: "vertical", boxSizing: "border-box", color: "#111827", outline: "none", display: "block" }} />
      )}

      {/* Preview */}
      {mode === "preview" && (
        <div style={{ minHeight: 100, padding: "12px 14px", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
          {value
            ? <div dangerouslySetInnerHTML={{ __html: value }} />
            : <span style={{ color: "#9ca3af" }}>No signature set — it will appear here</span>
          }
        </div>
      )}

      <div style={{ padding: "4px 10px", background: "#f9fafb", borderTop: "1px solid #f0f0f0", fontSize: 11, color: "#9ca3af" }}>
        HTML supported · Use Preview tab to check how it looks in email
      </div>
    </div>
  );
};

export default function EmailSettings({ session }) {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState({});
  const [verifyStatus, setVerifyStatus] = useState("idle");

  useEffect(() => {
    // No userId check needed — server validates session cookie
    fetch("/api/users/me/preferences", { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { setPrefs(d || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const save = async (sectionId, fields) => {
    setSections(s => ({ ...s, [sectionId]: { saving: true } }));
    try {
      const body = {};
      fields.forEach(k => { body[k] = prefs[k]; });
      const r = await fetch("/api/users/me/preferences", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Save failed");
      setSections(s => ({ ...s, [sectionId]: { saved: true } }));
      setTimeout(() => setSections(s => ({ ...s, [sectionId]: {} })), 2500);
    } catch {
      setSections(s => ({ ...s, [sectionId]: { error: true } }));
    }
  };

  const sendVerification = async () => {
    if (!prefs.send_as_email) return;
    setVerifyStatus("sending");
    try {
      const r = await fetch("/api/users/me/verify-email", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ send_as_email: prefs.send_as_email }),
      });
      setVerifyStatus(r.ok ? "sent" : "error");
    } catch { setVerifyStatus("error"); }
  };

  if (loading) return <div style={{ padding: 32, color: "#6b7280", fontSize: 14 }}>Loading your email preferences…</div>;

  const s = (id) => sections[id] || {};

  return (
    <div style={{ maxWidth: 700, padding: "24px 32px", fontFamily: F }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827" }}>Email settings</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Configure how your emails look and where replies go. These settings apply to emails you send from Vercentic.</p>
      </div>

      {/* Signature */}
      <Card title="Email signature" desc="Appended automatically to every email you send from Vercentic.">
        <Field label="Your signature">
          <FooterEditor value={prefs.email_footer} onChange={v => set("email_footer", v)} />
        </Field>
        <Field label="Default greeting" hint="optional">
          <Inp value={prefs.default_greeting} onChange={v => set("default_greeting", v)} placeholder="e.g. Hi {first_name}," />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <SaveBtn saving={s("signature").saving} saved={s("signature").saved} onClick={() => save("signature", ["email_footer", "default_greeting"])} />
        </div>
      </Card>

      {/* Send-as */}
      <Card title="Send-as email address" desc="Authenticate a personal email address so candidates receive emails from you directly, not a shared address.">
        <Row2>
          <Field label="Display name">
            <Inp value={prefs.send_as_name} onChange={v => set("send_as_name", v)} placeholder="James Harrington" />
          </Field>
          <Field label="Email address">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Inp value={prefs.send_as_email} onChange={v => set("send_as_email", v)} placeholder="james@company.com" type="email" />
              </div>
              {prefs.send_as_email && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  <StatusPill status={prefs.send_as_verified ? "verified" : prefs.send_as_token ? "pending" : "unverified"} />
                  {!prefs.send_as_verified && (
                    <button onClick={sendVerification} disabled={verifyStatus === "sending"}
                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${accent}`, background: "white", color: accent, cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}>
                      {verifyStatus === "sent" ? "Email sent ✓" : verifyStatus === "sending" ? "Sending…" : "Verify →"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </Field>
        </Row2>
        <Field label="Reply-to address" hint="optional — if different from send-as">
          <Inp value={prefs.reply_to} onChange={v => set("reply_to", v)} placeholder="e.g. talent@company.com" type="email" />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={s("sendas").saving} saved={s("sendas").saved} onClick={() => save("sendas", ["send_as_name", "send_as_email", "reply_to"])} />
        </div>
      </Card>

      {/* CC/BCC */}
      <Card title="Default CC / BCC" desc="Automatically add these addresses to every outbound candidate email you send.">
        <Row2>
          <Field label="Always CC" hint="optional">
            <Inp value={prefs.default_cc} onChange={v => set("default_cc", v)} placeholder="e.g. talent-team@company.com" type="email" />
          </Field>
          <Field label="Always BCC" hint="optional">
            <Inp value={prefs.default_bcc} onChange={v => set("default_bcc", v)} placeholder="e.g. crm@company.com" type="email" />
          </Field>
        </Row2>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={s("ccbcc").saving} saved={s("ccbcc").saved} onClick={() => save("ccbcc", ["default_cc", "default_bcc"])} />
        </div>
      </Card>

      {/* Out of office */}
      <Card title="Out of office" desc="When enabled, your message is appended to outbound emails and shown on your profile.">
        <Field label="">
          <Toggle checked={!!prefs.out_of_office_enabled} onChange={v => set("out_of_office_enabled", v)} label="I am currently out of office" />
        </Field>
        {prefs.out_of_office_enabled && (
          <>
            <Row2>
              <Field label="From"><Inp value={prefs.out_of_office_from} onChange={v => set("out_of_office_from", v)} type="date" /></Field>
              <Field label="Until"><Inp value={prefs.out_of_office_until} onChange={v => set("out_of_office_until", v)} type="date" /></Field>
            </Row2>
            <Field label="Message">
              <textarea value={prefs.out_of_office_message || ""} onChange={e => set("out_of_office_message", e.target.value)}
                placeholder="e.g. I'm on leave until 2 June. For urgent matters please contact talent@company.com."
                rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: F, resize: "vertical", boxSizing: "border-box" }} />
            </Field>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={s("ooo").saving} saved={s("ooo").saved} onClick={() => save("ooo", ["out_of_office_enabled", "out_of_office_from", "out_of_office_until", "out_of_office_message"])} />
        </div>
      </Card>

      {/* Digest */}
      <Card title="Email digest" desc="How often you receive a summary of activity across your candidates and roles.">
        <Field label="Digest frequency">
          <Sel value={prefs.digest_frequency} onChange={v => set("digest_frequency", v)}>
            <option value="">Select frequency…</option>
            <option value="none">Off — no digest emails</option>
            <option value="instant">Instant — email for each activity</option>
            <option value="daily">Daily digest — once per day</option>
            <option value="weekly">Weekly digest — Monday mornings</option>
          </Sel>
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={s("digest").saving} saved={s("digest").saved} onClick={() => save("digest", ["digest_frequency"])} />
        </div>
      </Card>

      {/* Working hours */}
      <Card title="Working hours" desc="Used when scheduling interviews and showing your availability to colleagues.">
        <Field label="Timezone">
          <Sel value={prefs.timezone} onChange={v => set("timezone", v)}>
            <option value="">Select timezone…</option>
            <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            <option value="Europe/London">Europe/London (GMT+0/+1)</option>
            <option value="Europe/Paris">Europe/Paris (GMT+1/+2)</option>
            <option value="America/New_York">America/New_York (GMT-5/-4)</option>
            <option value="America/Chicago">America/Chicago (GMT-6/-5)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (GMT-8/-7)</option>
            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
            <option value="Australia/Sydney">Australia/Sydney (GMT+10/+11)</option>
          </Sel>
        </Field>
        <Row2>
          <Field label="Working hours from">
            <Sel value={prefs.working_hours_start} onChange={v => set("working_hours_start", v)}>
              {["07:00","07:30","08:00","08:30","09:00","09:30","10:00"].map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </Field>
          <Field label="Working hours until">
            <Sel value={prefs.working_hours_end} onChange={v => set("working_hours_end", v)}>
              {["16:00","16:30","17:00","17:30","18:00","18:30","19:00"].map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </Field>
        </Row2>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn saving={s("hours").saving} saved={s("hours").saved} onClick={() => save("hours", ["timezone", "working_hours_start", "working_hours_end"])} />
        </div>
      </Card>
    </div>
  );
}

// ── Admin: Default Signature Panel ───────────────────────────────────────────
export function DefaultSignatureSettings({ environment }) {
  const envId = environment?.id;
  const [form, setForm] = useState({
    default_email_footer: "",
    default_email_greeting: "",
    default_send_as_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!envId) return;
    fetch(`/api/environments/${envId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setForm({
          default_email_footer:   d.default_email_footer   || "",
          default_email_greeting: d.default_email_greeting || "",
          default_send_as_name:   d.default_send_as_name   || "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [envId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/environments/${envId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#6b7280", fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 700, padding: "24px 32px", fontFamily: F }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827" }}>Default email signature</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Set the organisation-wide default. New users inherit this — each person can personalise their own in <strong>Your Preferences → Email</strong>.
        </p>
      </div>

      <div style={{ padding: "10px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, color: "#1e40af", marginBottom: 20 }}>
        Users who have not customised their signature will send with this default. Changes here do not override signatures users have already personalised.
      </div>

      <Card title="Default signature template" desc="HTML supported — build a branded template below.">
        <Field label="Default greeting line" hint="optional">
          <Inp value={form.default_email_greeting} onChange={v => set("default_email_greeting", v)}
            placeholder="e.g. Hi {first_name}," />
        </Field>
        <Field label="Default display name" hint="shown as sender name when user has not set their own">
          <Inp value={form.default_send_as_name} onChange={v => set("default_send_as_name", v)}
            placeholder="e.g. The Talent Team" />
        </Field>
        <Field label="Signature / footer">
          <FooterEditor value={form.default_email_footer} onChange={v => set("default_email_footer", v)} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <SaveBtn saving={saving} saved={saved} onClick={save} />
        </div>
      </Card>
    </div>
  );
}
