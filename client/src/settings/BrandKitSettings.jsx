// BrandKitSettings.jsx — Settings → Brand Kits
// Central brand management: create/edit brand kits used across portals, email templates, and documents
import { useState, useEffect, useCallback, useRef } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  accent: "var(--t-accent, #4361ee)", accentLight: "var(--t-accent-light, #eef1ff)",
  text1: "var(--t-text1, #111827)", text2: "var(--t-text2, #374151)", text3: "var(--t-text3, #6b7280)", text4: "var(--t-text4, #9ca3af)",
  border: "var(--t-border, #e5e7eb)", card: "var(--t-card, #ffffff)", bg: "var(--t-bg, #f9fafb)",
  green: "#059669", red: "#dc2626", amber: "#d97706", purple: "#7c3aed",
};

const api = {
  get: u => fetch(`/api${u}`).then(r => r.json()),
  post: (u, b) => fetch(`/api${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  patch: (u, b) => fetch(`/api${u}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  del: u => fetch(`/api${u}`, { method: 'DELETE' }).then(r => r.json()),
};

const ICON_PATHS = {
  palette: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.95-10-9.95z",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  copy: "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  image: "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
};

const Ic = ({ n, s = 16, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d={ICON_PATHS[n] || ""} />
  </svg>
);

const Btn = ({ children, variant, size, disabled, onClick, style }) => {
  const isPrimary = variant === "primary";
  const isSm = size === "sm";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 6, padding: isSm ? "6px 12px" : "9px 18px",
      borderRadius: 9, border: isPrimary ? "none" : `1.5px solid ${C.border}`,
      background: isPrimary ? C.accent : "white", color: isPrimary ? "white" : C.text2,
      fontSize: isSm ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, fontFamily: F, transition: "all .15s", ...style,
    }}>{children}</button>
  );
};

const ColorInput = ({ value, onChange, label }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
    <div style={{ position: "relative", width: 40, height: 40 }}>
      <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 40, border: `2px solid ${C.border}`, borderRadius: 10, cursor: "pointer", padding: 0, background: "none" }} />
    </div>
    <span style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>{label}</span>
    <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#hex"
      style={{ width: 64, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, textAlign: "center", fontFamily: "monospace" }} />
  </div>
);

const SOCIAL_PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
];

const FONT_OPTIONS = [
  'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Geist', 'Space Grotesk', 'Outfit',
  'Poppins', 'Montserrat', 'Lato', 'Roboto', 'Open Sans', 'Nunito',
  'Playfair Display', 'Merriweather', 'Georgia', 'Arial', 'Helvetica',
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function BrandKitSettings({ environment }) {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | kit object
  const [saving, setSaving] = useState(false);
  const [aiUrl, setAiUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    const data = await api.get(`/brand-kits?environment_id=${envId}`);
    setKits(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing({
      name: '', company_name: '', company_address: '', company_website: '', reply_to_email: '',
      logo_url: '', logo_dark_url: '', favicon_url: '',
      primaryColor: '#4361EE', secondaryColor: '#7C3AED', accentColor: '#F79009',
      bgColor: '#FFFFFF', textColor: '#0F1729',
      fontFamily: 'Inter', headingFont: 'Inter', headingWeight: 700,
      fontSize: '16px', borderRadius: '8px', buttonStyle: 'filled', buttonRadius: '8px', maxWidth: '1200px',
      social_links: {}, footer_text: '', privacy_url: '', unsubscribe_text: 'Unsubscribe',
      is_default: kits.length === 0,
      environment_id: envId,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/brand-kits/${editing.id}`, editing);
      } else {
        await api.post('/brand-kits', editing);
      }
      await load();
      setEditing(null);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand kit? Portals and templates using it will need to be reassigned.')) return;
    await api.del(`/brand-kits/${id}`);
    load();
  };

  const handleSetDefault = async (id) => {
    // Unset all others, set this one
    for (const kit of kits) {
      if (kit.is_default && kit.id !== id) await api.patch(`/brand-kits/${kit.id}`, { is_default: false });
    }
    await api.patch(`/brand-kits/${id}`, { is_default: true });
    load();
  };

  const handleAiGenerate = async () => {
    if (!aiUrl.trim()) return;
    setAiLoading(true);
    try {
      const result = await api.post('/brand-kits/analyse', { url: aiUrl, environment_id: envId });
      if (result.theme) {
        setEditing(prev => ({
          ...prev,
          ...result.theme,
          logo_url: result.logo || prev.logo_url,
          company_name: result.title || prev.company_name,
          source_url: result.source_url,
          ai_generated: true,
        }));
      }
      setShowAiModal(false);
      setAiUrl('');
    } catch (err) {
      alert('AI analysis failed: ' + err.message);
    }
    setAiLoading(false);
  };

  const set = (key, value) => setEditing(prev => ({ ...prev, [key]: value }));
  const setSocial = (key, value) => setEditing(prev => ({
    ...prev, social_links: { ...(prev.social_links || {}), [key]: value }
  }));

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading brand kits…</div>;

  // ── Editor view ─────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ maxWidth: 900, fontFamily: F }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: F, padding: 0, marginBottom: 4 }}>
              ← Back to all kits
            </button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text1 }}>{editing.id ? 'Edit' : 'Create'} Brand Kit</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setShowAiModal(true)}><Ic n="zap" s={14} c={C.purple} /> AI Generate</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving || !editing.name}>
              <Ic n="check" s={14} c="white" /> {saving ? 'Saving…' : 'Save Kit'}
            </Btn>
          </div>
        </div>

        {/* Company info */}
        <Section title="Company Information" icon="globe">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Brand / Kit Name *" value={editing.name} onChange={v => set('name', v)} placeholder="e.g. Acme Corporation" />
            <Field label="Company Name" value={editing.company_name} onChange={v => set('company_name', v)} placeholder="Legal company name" />
            <Field label="Company Website" value={editing.company_website} onChange={v => set('company_website', v)} placeholder="https://acme.com" />
            <Field label="Reply-to Email" value={editing.reply_to_email} onChange={v => set('reply_to_email', v)} placeholder="careers@acme.com" />
            <Field label="Company Address" value={editing.company_address} onChange={v => set('company_address', v)} placeholder="123 Business St, Dubai, UAE" full />
          </div>
        </Section>

        {/* Logos */}
        <Section title="Logos" icon="image">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <Field label="Logo URL" value={editing.logo_url} onChange={v => set('logo_url', v)} placeholder="https://..." />
              {editing.logo_url && <img src={editing.logo_url} alt="Logo" style={{ height: 36, maxWidth: 160, objectFit: "contain", marginTop: 8, background: "#f9f9f9", borderRadius: 6, padding: 4 }} onError={e => e.target.style.display = 'none'} />}
            </div>
            <div>
              <Field label="Dark Logo URL" value={editing.logo_dark_url} onChange={v => set('logo_dark_url', v)} placeholder="For dark backgrounds" />
              {editing.logo_dark_url && <img src={editing.logo_dark_url} alt="Dark logo" style={{ height: 36, maxWidth: 160, objectFit: "contain", marginTop: 8, background: "#1a1a2e", borderRadius: 6, padding: 4 }} onError={e => e.target.style.display = 'none'} />}
            </div>
            <Field label="Favicon URL" value={editing.favicon_url} onChange={v => set('favicon_url', v)} placeholder="16x16 or 32x32 icon" />
          </div>
        </Section>

        {/* Colours */}
        <Section title="Brand Colours" icon="palette">
          <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "8px 0" }}>
            <ColorInput label="Primary" value={editing.primaryColor} onChange={v => set('primaryColor', v)} />
            <ColorInput label="Secondary" value={editing.secondaryColor} onChange={v => set('secondaryColor', v)} />
            <ColorInput label="Accent" value={editing.accentColor} onChange={v => set('accentColor', v)} />
            <ColorInput label="Background" value={editing.bgColor} onChange={v => set('bgColor', v)} />
            <ColorInput label="Text" value={editing.textColor} onChange={v => set('textColor', v)} />
          </div>
          {/* Preview strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
            {[editing.primaryColor, editing.secondaryColor, editing.accentColor, editing.bgColor, editing.textColor].map((c, i) => (
              <div key={i} style={{ background: c || '#ccc' }} />
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" icon="edit">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Body Font</label>
              <select value={editing.fontFamily} onChange={e => set('fontFamily', e.target.value)} style={selectStyle}>
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Heading Font</label>
              <select value={editing.headingFont} onChange={e => set('headingFont', e.target.value)} style={selectStyle}>
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Button Style</label>
              <div style={{ display: "flex", gap: 4 }}>
                {['filled', 'outline', 'ghost'].map(s => (
                  <button key={s} onClick={() => set('buttonStyle', s)} style={{
                    flex: 1, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F,
                    border: `1.5px solid ${editing.buttonStyle === s ? C.accent : C.border}`,
                    background: editing.buttonStyle === s ? C.accentLight : "white",
                    color: editing.buttonStyle === s ? C.accent : C.text3, textTransform: "capitalize",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Social links */}
        <Section title="Social Media" icon="link">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {SOCIAL_PLATFORMS.map(p => (
              <Field key={p.key} label={p.label} value={(editing.social_links || {})[p.key] || ''} onChange={v => setSocial(p.key, v)} placeholder={p.placeholder} />
            ))}
          </div>
        </Section>

        {/* Legal / Footer */}
        <Section title="Legal & Footer" icon="edit">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Footer Text" value={editing.footer_text} onChange={v => set('footer_text', v)} placeholder="© 2026 Company. All rights reserved." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Privacy Policy URL" value={editing.privacy_url} onChange={v => set('privacy_url', v)} placeholder="https://..." />
              <Field label="Unsubscribe Text" value={editing.unsubscribe_text} onChange={v => set('unsubscribe_text', v)} placeholder="Unsubscribe" />
            </div>
          </div>
        </Section>

        {/* Live preview card */}
        <Section title="Preview" icon="star">
          <BrandPreviewCard kit={editing} />
        </Section>

        {/* AI Generate Modal */}
        {showAiModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowAiModal(false)}>
            <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", width: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic n="zap" s={16} c={C.purple} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>AI Brand Generator</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>Enter any website URL — Vercentic will extract the brand identity</div>
                </div>
              </div>
              <input value={aiUrl} onChange={e => setAiUrl(e.target.value)} placeholder="https://company.com"
                onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: F, marginBottom: 16, outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => setShowAiModal(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={handleAiGenerate} disabled={aiLoading || !aiUrl.trim()}>
                  <Ic n="zap" s={14} c="white" /> {aiLoading ? 'Analysing…' : 'Generate'}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, fontFamily: F }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: C.text1 }}>Brand Kits</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Central brand identity system — used across portals, email templates, and documents.</p>
        </div>
        <Btn variant="primary" onClick={handleCreate}><Ic n="plus" s={14} c="white" /> New Brand Kit</Btn>
      </div>

      {kits.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 48, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${C.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Ic n="palette" s={28} c={C.accent} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>No brand kits yet</div>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 20, lineHeight: 1.6 }}>
            Create your first brand kit to apply consistent branding across career sites, email templates, and portals.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={handleCreate}><Ic n="plus" s={14} /> Manual setup</Btn>
            <Btn variant="primary" onClick={() => { handleCreate(); setTimeout(() => setShowAiModal(true), 100); }}>
              <Ic n="zap" s={14} c="white" /> Generate from website
            </Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {kits.map(kit => (
            <div key={kit.id} style={{
              background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden",
              transition: "all .15s", cursor: "pointer", position: "relative",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              onClick={() => setEditing({ ...kit })}>

              {/* Colour strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 6 }}>
                {[kit.primaryColor, kit.secondaryColor, kit.accentColor, kit.bgColor, kit.textColor].map((c, i) => (
                  <div key={i} style={{ background: c || '#ccc' }} />
                ))}
              </div>

              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {kit.logo_url ? (
                    <img src={kit.logo_url} alt="" style={{ height: 28, maxWidth: 80, objectFit: "contain" }} onError={e => e.target.style.display = 'none'} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: kit.primaryColor || C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white" }}>
                      {(kit.name || '?')[0]}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kit.name}</div>
                    {kit.company_name && <div style={{ fontSize: 11, color: C.text3 }}>{kit.company_name}</div>}
                  </div>
                  {kit.is_default && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${C.green}12`, color: C.green }}>Default</span>
                  )}
                </div>

                {/* Font preview */}
                <div style={{ fontSize: 11, color: C.text4, marginBottom: 8 }}>
                  {kit.fontFamily || 'Inter'} · {kit.buttonStyle || 'filled'} buttons
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  {!kit.is_default && (
                    <button onClick={() => handleSetDefault(kit.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", color: C.text3, fontFamily: F }}>
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(kit.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Ic n="trash" s={13} c={C.text4} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Ic n={icon} s={15} c={C.accent} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: F, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

const selectStyle = { width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: F, outline: "none", background: "white" };

function BrandPreviewCard({ kit }) {
  const b = kit || {};
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <div style={{ background: b.bgColor || '#fff', padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${b.primaryColor || '#4361ee'}15` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {b.logo_url ? <img src={b.logo_url} alt="" style={{ height: 28, maxWidth: 100, objectFit: "contain" }} onError={e => e.target.style.display = 'none'} /> : null}
            <span style={{ fontSize: 16, fontWeight: 800, color: b.primaryColor || '#4361ee', fontFamily: b.headingFont || 'sans-serif' }}>{b.company_name || b.name || 'Brand'}</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {['Jobs', 'Team', 'Apply'].map(l => <span key={l} style={{ fontSize: 12, color: b.textColor || '#111', opacity: .5 }}>{l}</span>)}
          </div>
        </div>
        {/* Content */}
        <div style={{ fontSize: 20, fontWeight: b.headingWeight || 700, color: b.textColor || '#111', fontFamily: b.headingFont || 'sans-serif', marginBottom: 8 }}>
          Find Your Next Opportunity
        </div>
        <div style={{ fontSize: 13, color: b.textColor || '#111', opacity: .6, marginBottom: 16, fontFamily: b.fontFamily || 'sans-serif', lineHeight: 1.6 }}>
          Join a team building something meaningful. Explore open roles across the business.
        </div>
        <span style={{
          display: "inline-block", padding: "10px 24px", borderRadius: b.buttonRadius || '8px',
          background: b.buttonStyle === 'outline' || b.buttonStyle === 'ghost' ? 'transparent' : (b.primaryColor || '#4361ee'),
          color: b.buttonStyle === 'outline' || b.buttonStyle === 'ghost' ? (b.primaryColor || '#4361ee') : '#fff',
          border: b.buttonStyle === 'outline' ? `2px solid ${b.primaryColor || '#4361ee'}` : 'none',
          fontSize: 13, fontWeight: 700, fontFamily: b.fontFamily || 'sans-serif',
        }}>See Open Roles →</span>
      </div>
      {/* Colour strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 6 }}>
        {[b.primaryColor, b.secondaryColor, b.accentColor, b.bgColor, b.textColor].map((c, i) => <div key={i} style={{ background: c || '#ccc' }} />)}
      </div>
    </div>
  );
}
