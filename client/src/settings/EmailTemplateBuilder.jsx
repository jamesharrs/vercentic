// EmailTemplateBuilder.jsx — Settings → Email Templates
// Block editor for email templates with brand kit integration, merge tags, and live preview
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
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  plus: "M12 5v14M5 12h14", check: "M20 6L9 17l-5-5", x: "M18 6L6 18M6 6l12 12",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  copy: "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  chevU: "M18 15l-6-6-6 6", chevD: "M6 9l6 6 6-6",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  image: "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  columns: "M12 3v18M3 3h18v18H3z",
  minus: "M5 12h14",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  grip: "M9 4h.01M9 8h.01M9 12h.01M9 16h.01M9 20h.01M15 4h.01M15 8h.01M15 12h.01M15 16h.01M15 20h.01",
  monitor: "M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4",
  smartphone: "M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01",
};

const Ic = ({ n, s = 16, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d={ICON_PATHS[n] || ""} />
  </svg>
);

const uid = () => Math.random().toString(36).slice(2, 10);

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'application', label: 'Application' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'outreach', label: 'Sourcing / Outreach' },
  { value: 'followup', label: 'Follow-up' },
];

const BLOCK_TYPES = [
  { type: 'header', label: 'Header', icon: 'type', description: 'Logo + company name from brand kit' },
  { type: 'text', label: 'Text', icon: 'type', description: 'Rich text with merge tags' },
  { type: 'heading', label: 'Heading', icon: 'type', description: 'Section heading' },
  { type: 'button', label: 'Button', icon: 'link', description: 'Call-to-action button' },
  { type: 'image', label: 'Image', icon: 'image', description: 'Image from URL' },
  { type: 'divider', label: 'Divider', icon: 'minus', description: 'Horizontal line' },
  { type: 'spacer', label: 'Spacer', icon: 'minus', description: 'Vertical spacing' },
  { type: 'two_column', label: 'Two Columns', icon: 'columns', description: 'Side-by-side layout' },
  { type: 'footer', label: 'Footer', icon: 'type', description: 'Auto-generated from brand kit' },
];

const MERGE_TAGS = {
  'Candidate': ['first_name', 'last_name', 'email', 'phone', 'current_title', 'current_company', 'location', 'skills'],
  'Job': ['job_title', 'job_department', 'job_location', 'job_salary_min', 'job_salary_max', 'job_work_type'],
  'Interview': ['interview_date', 'interview_time', 'interview_format', 'interview_location'],
  'Offer': ['offer_salary', 'offer_start_date', 'offer_expiry_date'],
  'Company': ['company_name', 'company_website', 'current_year'],
  'Links': ['portal_link', 'unsubscribe_link', 'privacy_link'],
};

const DEFAULT_BLOCKS = [
  { id: uid(), type: 'header', config: { showCompanyName: true } },
  { id: uid(), type: 'text', content: '<p>Hi {{first_name}},</p><p>Thank you for your interest in the <strong>{{job_title}}</strong> role.</p>' },
  { id: uid(), type: 'button', config: { text: 'View Job Details', url: '{{portal_link}}', style: 'filled', align: 'left' } },
  { id: uid(), type: 'footer' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function EmailTemplateBuilder({ environment }) {
  const [templates, setTemplates] = useState([]);
  const [brandKits, setBrandKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop | mobile
  const [showMergeTags, setShowMergeTags] = useState(false);
  const [showBrandRules, setShowBrandRules] = useState(false);
  const [activePanel, setActivePanel] = useState('blocks'); // blocks | settings | rules
  const [dragIdx, setDragIdx] = useState(null);

  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    const [t, bk] = await Promise.all([
      api.get(`/email-builder?environment_id=${envId}`),
      api.get(`/brand-kits?environment_id=${envId}`),
    ]);
    setTemplates(Array.isArray(t) ? t : []);
    setBrandKits(Array.isArray(bk) ? bk : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  // ── Preview ─────────────────────────────────────────────────────────────────
  const refreshPreview = useCallback(async () => {
    if (!editing) return;
    try {
      const result = await api.post('/email-builder/preview', {
        blocks: editing.blocks || [],
        subject: editing.subject || '',
        preview_text: editing.preview_text || '',
        brand_kit_id: editing.brand_kit_id || null,
      });
      setPreviewHtml(result.html || '');
    } catch (_) {}
  }, [editing?.blocks, editing?.subject, editing?.brand_kit_id]);

  useEffect(() => {
    if (editing) {
      const t = setTimeout(refreshPreview, 500);
      return () => clearTimeout(t);
    }
  }, [refreshPreview, editing]);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleCreate = () => {
    const defaultKit = brandKits.find(k => k.is_default);
    setEditing({
      environment_id: envId, name: 'New Template', category: 'general',
      subject: '', preview_text: '',
      brand_kit_id: defaultKit?.id || null, brand_rules: [],
      blocks: JSON.parse(JSON.stringify(DEFAULT_BLOCKS)),
      track_opens: true, track_clicks: true,
    });
    setActivePanel('blocks');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) await api.patch(`/email-builder/${editing.id}`, editing);
      else { const created = await api.post('/email-builder', editing); setEditing(prev => ({ ...prev, id: created.id })); }
      await load();
    } catch (err) { alert('Save failed: ' + err.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await api.del(`/email-builder/${id}`);
    load();
  };

  const handleDuplicate = async (id) => {
    await api.post(`/email-builder/${id}/duplicate`);
    load();
  };

  // ── Block operations ────────────────────────────────────────────────────────
  const set = (key, val) => setEditing(prev => ({ ...prev, [key]: val }));
  const addBlock = (type) => {
    const block = { id: uid(), type, content: '', config: {} };
    if (type === 'text') block.content = '<p>Your text here…</p>';
    if (type === 'heading') block.content = 'Section Heading';
    if (type === 'button') block.config = { text: 'Click Here', url: '#', style: 'filled', align: 'left' };
    if (type === 'image') block.config = { src: '', alt: '', width: '100%' };
    if (type === 'spacer') block.config = { height: 20 };
    if (type === 'header') block.config = { showCompanyName: true };
    if (type === 'two_column') { block.left = []; block.right = []; }
    set('blocks', [...(editing.blocks || []), block]);
  };
  const updateBlock = (idx, updates) => set('blocks', editing.blocks.map((b, i) => i === idx ? { ...b, ...updates } : b));
  const removeBlock = (idx) => set('blocks', editing.blocks.filter((_, i) => i !== idx));
  const moveBlock = (from, to) => {
    const blocks = [...editing.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    set('blocks', blocks);
  };

  const insertMergeTag = (tag) => {
    // Copy to clipboard for easy pasting
    navigator.clipboard?.writeText(`{{${tag}}}`);
    setShowMergeTags(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading…</div>;

  // ── Editor ──────────────────────────────────────────────────────────────────
  if (editing) {
    const selectedKit = brandKits.find(k => k.id === editing.brand_kit_id);
    return (
      <div style={{ fontFamily: F, display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 0, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: F }}>← Back</button>
            <input value={editing.name} onChange={e => set('name', e.target.value)} style={{ fontSize: 16, fontWeight: 700, border: "none", outline: "none", color: C.text1, fontFamily: F, background: "transparent", width: 260 }} />
            <select value={editing.category} onChange={e => set('category', e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F, color: C.text2 }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowMergeTags(!showMergeTags)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: showMergeTags ? C.accentLight : "white", fontSize: 11, fontWeight: 600, cursor: "pointer", color: showMergeTags ? C.accent : C.text3, fontFamily: F }}>
              {'{{ }}'} Tags
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.accent, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 5 }}>
              <Ic n="check" s={12} c="white" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Merge tags popover */}
        {showMergeTags && (
          <div style={{ position: "absolute", top: 90, right: 20, width: 280, background: "white", borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,.12)", zIndex: 100, padding: "12px 16px", maxHeight: 400, overflowY: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Merge Tags (click to copy)</div>
            {Object.entries(MERGE_TAGS).map(([group, tags]) => (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 4 }}>{group}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {tags.map(tag => (
                    <button key={tag} onClick={() => insertMergeTag(tag)} style={{
                      padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg,
                      fontSize: 10, fontFamily: "monospace", cursor: "pointer", color: C.accent, fontWeight: 600,
                    }}>{'{{' + tag + '}}'}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subject + preview text */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.text4, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Subject line</label>
            <input value={editing.subject} onChange={e => set('subject', e.target.value)} placeholder="Welcome to {{company_name}}, {{first_name}}!"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.text4, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Preview text</label>
            <input value={editing.preview_text} onChange={e => set('preview_text', e.target.value)} placeholder="Shown in inbox before opening"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Main split: left editor, right preview */}
        <div style={{ display: "flex", gap: 0, flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left: blocks editor */}
          <div style={{ width: 400, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Panel tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[{ id: 'blocks', label: 'Content' }, { id: 'settings', label: 'Brand & Tracking' }, { id: 'rules', label: 'Brand Rules' }].map(t => (
                <button key={t.id} onClick={() => setActivePanel(t.id)} style={{
                  flex: 1, padding: "8px", border: "none", borderBottom: `2px solid ${activePanel === t.id ? C.accent : 'transparent'}`,
                  background: "transparent", fontSize: 11, fontWeight: activePanel === t.id ? 700 : 500,
                  color: activePanel === t.id ? C.accent : C.text3, cursor: "pointer", fontFamily: F,
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
              {activePanel === 'blocks' && (
                <>
                  {/* Block list */}
                  {(editing.blocks || []).map((block, idx) => (
                    <BlockEditor key={block.id} block={block} idx={idx} total={editing.blocks.length}
                      onUpdate={(updates) => updateBlock(idx, updates)}
                      onRemove={() => removeBlock(idx)}
                      onMoveUp={() => idx > 0 && moveBlock(idx, idx - 1)}
                      onMoveDown={() => idx < editing.blocks.length - 1 && moveBlock(idx, idx + 1)}
                    />
                  ))}

                  {/* Add block buttons */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 8 }}>Add block</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt.type} onClick={() => addBlock(bt.type)} style={{
                          padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "white",
                          cursor: "pointer", fontFamily: F, textAlign: "center", transition: "all .12s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "white"; }}>
                          <Ic n={bt.icon} s={14} c={C.text2} style={{ margin: "0 auto 4px", display: "block" }} />
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.text1 }}>{bt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activePanel === 'settings' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Brand kit selector */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 5 }}>Brand Kit</label>
                    <select value={editing.brand_kit_id || ''} onChange={e => set('brand_kit_id', e.target.value || null)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: F }}>
                      <option value="">No brand kit</option>
                      {brandKits.map(k => <option key={k.id} value={k.id}>{k.name}{k.is_default ? ' (default)' : ''}</option>)}
                    </select>
                    {selectedKit && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
                        {[selectedKit.primaryColor, selectedKit.secondaryColor, selectedKit.accentColor, selectedKit.bgColor, selectedKit.textColor].map((c, i) => (
                          <div key={i} style={{ background: c || '#ccc' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tracking */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 8 }}>Tracking</label>
                    {[
                      { key: 'track_opens', label: 'Track opens (pixel)' },
                      { key: 'track_clicks', label: 'Track link clicks' },
                    ].map(t => (
                      <label key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text2, marginBottom: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={editing[t.key]} onChange={e => set(t.key, e.target.checked)} style={{ accentColor: C.accent }} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activePanel === 'rules' && (
                <BrandRulesPanel rules={editing.brand_rules || []} brandKits={brandKits}
                  onChange={(rules) => set('brand_rules', rules)} />
              )}
            </div>
          </div>

          {/* Right: live preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f4f4f5", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${C.border}`, background: "white", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text2 }}>Preview</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ id: 'desktop', icon: 'monitor' }, { id: 'mobile', icon: 'smartphone' }].map(v => (
                  <button key={v.id} onClick={() => setPreviewMode(v.id)} style={{
                    padding: "4px 8px", borderRadius: 5, border: `1px solid ${previewMode === v.id ? C.accent : C.border}`,
                    background: previewMode === v.id ? C.accentLight : "white", cursor: "pointer",
                  }}><Ic n={v.icon} s={13} c={previewMode === v.id ? C.accent : C.text4} /></button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "20px 16px" }}>
              <div style={{ width: previewMode === 'mobile' ? 375 : '100%', maxWidth: 680, transition: "width .2s" }}>
                {previewHtml ? (
                  <iframe srcDoc={previewHtml} style={{ width: "100%", height: "100%", minHeight: 500, border: `1px solid ${C.border}`, borderRadius: 8, background: "white" }}
                    sandbox="allow-same-origin" title="Email Preview" />
                ) : (
                  <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>Add blocks to see a preview</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, fontFamily: F }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: C.text1 }}>Email Templates</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Build email templates with your brand kit — used in communications, workflows, and bulk actions.</p>
        </div>
        <button onClick={handleCreate} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 6 }}>
          <Ic n="plus" s={14} c="white" /> New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 48, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${C.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Ic n="mail" s={28} c={C.accent} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>No email templates yet</div>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 20 }}>Create branded email templates for interview invitations, offer letters, and outreach.</div>
          <button onClick={handleCreate} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            <Ic n="plus" s={14} c="white" /> Create first template
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {templates.map(t => {
            const kit = brandKits.find(k => k.id === t.brand_kit_id);
            const catLabel = CATEGORIES.find(c => c.value === t.category)?.label || t.category;
            return (
              <div key={t.id} onClick={() => setEditing({ ...t })} style={{
                background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}>

                {/* Kit colour strip */}
                {kit && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 4 }}>
                    {[kit.primaryColor, kit.secondaryColor, kit.accentColor, kit.bgColor, kit.textColor].map((c, i) => <div key={i} style={{ background: c || '#ccc' }} />)}
                  </div>
                )}

                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: `${C.accent}12`, color: C.accent }}>{catLabel}</span>
                  </div>
                  {t.subject && <div style={{ fontSize: 11, color: C.text3, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>}
                  <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.text4 }}>
                    <span>{(t.blocks || []).length} blocks</span>
                    {kit && <span>· {kit.name}</span>}
                    {t.brand_rules?.length > 0 && <span style={{ color: C.purple }}>· {t.brand_rules.length} rule{t.brand_rules.length !== 1 ? 's' : ''}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDuplicate(t.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", color: C.text3, fontFamily: F }}>
                      <Ic n="copy" s={10} c={C.text4} /> Duplicate
                    </button>
                    <button onClick={() => handleDelete(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3 }}>
                      <Ic n="trash" s={12} c={C.text4} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Block Editor ──────────────────────────────────────────────────────────────
function BlockEditor({ block, idx, total, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(true);
  const typeInfo = BLOCK_TYPES.find(t => t.type === block.type) || { label: block.type, icon: 'type' };

  return (
    <div style={{ background: "white", borderRadius: 10, border: `1.5px solid ${C.border}`, marginBottom: 8, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", cursor: "pointer", background: expanded ? C.bg : "white" }}
        onClick={() => setExpanded(!expanded)}>
        <Ic n="grip" s={12} c={C.text4} style={{ cursor: "grab" }} />
        <Ic n={typeInfo.icon} s={13} c={C.accent} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text1 }}>{typeInfo.label}</span>
        <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 2, opacity: idx === 0 ? .3 : 1 }}><Ic n="chevU" s={11} c={C.text4} /></button>
          <button onClick={onMoveDown} disabled={idx === total - 1} style={{ background: "none", border: "none", cursor: idx === total - 1 ? "default" : "pointer", padding: 2, opacity: idx === total - 1 ? .3 : 1 }}><Ic n="chevD" s={11} c={C.text4} /></button>
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><Ic n="trash" s={11} c={C.red} /></button>
        </div>
        <Ic n={expanded ? "chevU" : "chevD"} s={12} c={C.text4} />
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
          {block.type === 'text' && (
            <textarea value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })}
              rows={4} placeholder="<p>Your text here… Use {{first_name}} for merge tags</p>"
              style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
          )}
          {block.type === 'heading' && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })} placeholder="Section heading"
                style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F, fontWeight: 700 }} />
              <select value={block.config?.level || 2} onChange={e => onUpdate({ config: { ...block.config, level: Number(e.target.value) } })}
                style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F }}>
                {[1, 2, 3].map(l => <option key={l} value={l}>H{l}</option>)}
              </select>
            </div>
          )}
          {block.type === 'button' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={block.config?.text || ''} onChange={e => onUpdate({ config: { ...block.config, text: e.target.value } })} placeholder="Button text"
                style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }} />
              <input value={block.config?.url || ''} onChange={e => onUpdate({ config: { ...block.config, url: e.target.value } })} placeholder="URL or {{portal_link}}"
                style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "monospace" }} />
              <div style={{ display: "flex", gap: 4 }}>
                {['filled', 'outline'].map(s => (
                  <button key={s} onClick={() => onUpdate({ config: { ...block.config, style: s } })} style={{
                    flex: 1, padding: "4px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: F, textTransform: "capitalize",
                    border: `1px solid ${(block.config?.style || 'filled') === s ? C.accent : C.border}`,
                    background: (block.config?.style || 'filled') === s ? C.accentLight : "white",
                    color: (block.config?.style || 'filled') === s ? C.accent : C.text3,
                  }}>{s}</button>
                ))}
                {['left', 'center'].map(a => (
                  <button key={a} onClick={() => onUpdate({ config: { ...block.config, align: a } })} style={{
                    padding: "4px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: F, textTransform: "capitalize",
                    border: `1px solid ${(block.config?.align || 'left') === a ? C.accent : C.border}`,
                    background: (block.config?.align || 'left') === a ? C.accentLight : "white",
                    color: (block.config?.align || 'left') === a ? C.accent : C.text3,
                  }}>{a}</button>
                ))}
              </div>
            </div>
          )}
          {block.type === 'image' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input value={block.config?.src || ''} onChange={e => onUpdate({ config: { ...block.config, src: e.target.value } })} placeholder="Image URL"
                style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }} />
              <input value={block.config?.alt || ''} onChange={e => onUpdate({ config: { ...block.config, alt: e.target.value } })} placeholder="Alt text"
                style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }} />
            </div>
          )}
          {block.type === 'spacer' && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: C.text3 }}>Height:</span>
              <input type="number" min={4} max={80} value={block.config?.height || 20}
                onChange={e => onUpdate({ config: { ...block.config, height: Number(e.target.value) } })}
                style={{ width: 60, padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F, textAlign: "center" }} />
              <span style={{ fontSize: 11, color: C.text4 }}>px</span>
            </div>
          )}
          {block.type === 'header' && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text2, cursor: "pointer" }}>
              <input type="checkbox" checked={block.config?.showCompanyName !== false}
                onChange={e => onUpdate({ config: { ...block.config, showCompanyName: e.target.checked } })}
                style={{ accentColor: C.accent }} />
              Show company name next to logo
            </label>
          )}
          {block.type === 'footer' && (
            <div style={{ fontSize: 11, color: C.text3, fontStyle: "italic" }}>Auto-generated from brand kit — includes social links, company address, privacy/unsubscribe links.</div>
          )}
          {block.type === 'divider' && (
            <div style={{ fontSize: 11, color: C.text3, fontStyle: "italic" }}>Horizontal divider line</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Brand Rules Panel ─────────────────────────────────────────────────────────
function BrandRulesPanel({ rules, brandKits, onChange }) {
  const addRule = () => onChange([...rules, { field: '', value: '', brand_kit_id: '' }]);
  const updateRule = (idx, updates) => onChange(rules.map((r, i) => i === idx ? { ...r, ...updates } : r));
  const removeRule = (idx) => onChange(rules.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Variable Brand Switching</div>
      <div style={{ fontSize: 12, color: C.text3, marginBottom: 12, lineHeight: 1.5 }}>
        Switch brand kit automatically based on record data. For example: if the job's company is "Acme Corp", use the Acme brand kit instead of the default.
      </div>

      {rules.map((rule, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.text3, flexShrink: 0 }}>If</span>
          <input value={rule.field} onChange={e => updateRule(idx, { field: e.target.value })} placeholder="job.company"
            style={{ width: 120, padding: "5px 7px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: "monospace" }} />
          <span style={{ fontSize: 11, color: C.text3 }}>=</span>
          <input value={rule.value} onChange={e => updateRule(idx, { value: e.target.value })} placeholder="Acme Corp"
            style={{ flex: 1, padding: "5px 7px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F }} />
          <span style={{ fontSize: 11, color: C.text3 }}>→</span>
          <select value={rule.brand_kit_id} onChange={e => updateRule(idx, { brand_kit_id: e.target.value })}
            style={{ width: 120, padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F }}>
            <option value="">Select kit…</option>
            {brandKits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <button onClick={() => removeRule(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <Ic n="x" s={12} c={C.red} />
          </button>
        </div>
      ))}

      <button onClick={addRule} style={{
        width: "100%", padding: "8px", borderRadius: 7, border: `1.5px dashed ${C.border}`, background: "transparent",
        color: C.text3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F,
      }}>+ Add rule</button>

      {rules.length > 0 && (
        <div style={{ fontSize: 11, color: C.text4, marginTop: 8, lineHeight: 1.5 }}>
          Rules are evaluated top-to-bottom. The first matching rule wins. If no rules match, the default brand kit is used.
        </div>
      )}
    </div>
  );
}
