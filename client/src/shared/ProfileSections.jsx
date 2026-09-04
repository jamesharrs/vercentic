import { useState } from 'react';

export const F = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
export const PURPLE = '#7c3aed';

export const ICON_PATHS = {
  x: 'M18 6 6 18M6 6l12 12',
  mail: 'M4 4h16v16H4V4zm0 0l8 8 8-8',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  briefcase: 'M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 4h4v3h-4V4z',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89 7 23l5-3 5 3-1.21-9.12',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  form: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  align: 'M17 10H3M21 6H3M21 14H3M17 18H3',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14 21 3',
  chevD: 'M6 9l6 6 6-6',
  chevR: 'M9 18l6-6-6-6',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  grip: 'M9 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  star_off: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  layers: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
};

export const Ic = ({ n, s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICON_PATHS[n] || 'M12 2a10 10 0 100 20A10 10 0 0012 2z'} />
  </svg>
);

export function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export const EmptyMsg = ({ msg = 'Nothing here yet.' }) => (
  <div style={{ padding: '18px 4px', color: '#9ca3af', fontSize: 13, fontFamily: F, textAlign: 'center' }}>{msg}</div>
);

export const SectionShell = ({ icon, label, children, accent = PURPLE, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14, border: '1px solid #f0f0f5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: '#fafafe', border: 'none', cursor: 'pointer', fontFamily: F,
        }}
      >
        <Ic n={icon} s={14} c={accent} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1, textAlign: 'left' }}>{label}</span>
        <Ic n={open ? 'chevD' : 'chevR'} s={13} c="#9ca3af" />
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
};

// ───────────────────────────── Application Section ─────────────────────────────
export const ApplicationSection = ({ link, stageHistory, accent = PURPLE }) => (
  <SectionShell icon="briefcase" label="Application Details" accent={accent}>
    {!link ? <EmptyMsg msg="No application context." /> : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FieldCard label="Target" value={link.target_name || '—'} accent={accent} />
        <FieldCard label="Workflow" value={link.workflow_name || '—'} accent={accent} />
        <FieldCard label="Stage" value={link.stage || '—'} accent={accent} />
        <FieldCard label="Applied" value={link.created_at ? relTime(link.created_at) : '—'} accent={accent} />
      </div>
    )}
  </SectionShell>
);

const FieldCard = ({ label, value, accent = PURPLE }) => (
  <div style={{ background: '#F8F9FF', borderRadius: 10, padding: '10px 12px' }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#1f2430', fontWeight: 600, wordBreak: 'break-word' }}>{value ?? '—'}</div>
  </div>
);

// ───────────────────────────── Summary Section ─────────────────────────────
export const SummarySection = ({ data, accent = PURPLE }) => {
  const bio = data?.summary || data?.bio || data?.about || data?.notes_summary;
  return (
    <SectionShell icon="align" label="Summary / Bio" accent={accent}>
      {!bio ? <EmptyMsg msg="No summary provided." /> : (
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{bio}</div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Experience Section ─────────────────────────────
export function normaliseWorkRow(row) {
  if (!row) return null;
  if (typeof row === 'string') {
    try { row = JSON.parse(row); } catch { return { title: row }; }
  }
  const colMap = { lcc54yyb: 'company', ora3hhct: 'title', '5x50b998': 'start', ajpx5qfs: 'end', xryp64ss: 'current', e4rcpwq0: 'description' };
  const out = {};
  Object.entries(row).forEach(([k, v]) => {
    const key = colMap[k] || k;
    out[key] = v;
  });
  return {
    title: out.title || out.role || out.position || '',
    company: out.company || out.employer || '',
    start: out.start || out.start_date || out.from || '',
    end: out.end || out.end_date || out.to || '',
    current: !!(out.current || out.is_current),
    description: out.description || out.details || '',
  };
}

export const ExperienceSection = ({ data, accent = PURPLE }) => {
  let raw = data?.work_history || data?.experience || data?.employment_history || [];
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = []; } }
  if (!Array.isArray(raw)) raw = [];
  const rows = raw.map(normaliseWorkRow).filter(Boolean);
  return (
    <SectionShell icon="award" label="Work Experience" accent={accent}>
      {rows.length === 0 ? <EmptyMsg msg="No work history recorded." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${accent}33` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2430' }}>{r.title || 'Role'}</div>
              <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 1 }}>{r.company}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {r.start || '?'} — {r.current ? 'Present' : (r.end || '?')}
              </div>
              {r.description && <div style={{ fontSize: 12, color: '#4b5563', marginTop: 5, lineHeight: 1.5 }}>{r.description}</div>}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Education Section ─────────────────────────────
export function normaliseEduRow(row) {
  if (!row) return null;
  if (typeof row === 'string') { try { row = JSON.parse(row); } catch { return { institution: row }; } }
  const out = {};
  Object.entries(row).forEach(([k, v]) => {
    const kl = k.toLowerCase();
    if (kl.includes('inst') || kl.includes('school') || kl.includes('univ')) out.institution = v;
    else if (kl.includes('degree') || kl.includes('qual')) out.degree = v;
    else if (kl.includes('field') || kl.includes('major') || kl.includes('subject')) out.field = v;
    else if (kl.includes('start') || kl.includes('from')) out.start = v;
    else if (kl.includes('end') || kl.includes('to') || kl.includes('grad')) out.end = v;
    else out[k] = v;
  });
  return {
    institution: out.institution || '',
    degree: out.degree || '',
    field: out.field || '',
    start: out.start || '',
    end: out.end || '',
  };
}

export const EducationSection = ({ data, accent = PURPLE }) => {
  let raw = data?.education || data?.education_history || [];
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = []; } }
  if (!Array.isArray(raw)) raw = [];
  const rows = raw.map(normaliseEduRow).filter(Boolean);
  return (
    <SectionShell icon="book" label="Education" accent={accent}>
      {rows.length === 0 ? <EmptyMsg msg="No education recorded." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${accent}33` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2430' }}>{r.institution || 'Institution'}</div>
              <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 1 }}>{[r.degree, r.field].filter(Boolean).join(', ')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{r.start || '?'} — {r.end || '?'}</div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Skills Section ─────────────────────────────
export const SkillsSection = ({ data, accent = PURPLE }) => {
  let raw = data?.skills || [];
  if (typeof raw === 'string') raw = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(raw)) raw = [];
  return (
    <SectionShell icon="zap" label="Skills" accent={accent}>
      {raw.length === 0 ? <EmptyMsg msg="No skills listed." /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {raw.map((s, i) => (
            <span key={i} style={{ padding: '5px 10px', borderRadius: 20, background: `${accent}14`, color: accent, fontSize: 12, fontWeight: 600 }}>
              {typeof s === 'string' ? s : (s?.name || s?.value || JSON.stringify(s))}
            </span>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Documents Section (with preview) ─────────────────────────────
export const DocumentsSection = ({ attachments = [], accent = PURPLE }) => {
  const [previewFor, setPreviewFor] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [loading, setLoading] = useState(false);

  const typeFor = (name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'docx';
    return null;
  };

  const openPreview = async (a) => {
    const t = typeFor(a.name || a.filename || '');
    if (!t) { window.open(`${a.url}`, '_blank'); return; }
    setPreviewFor(a.id);
    setPreviewType(t);
    setLoading(true);
    try {
      if (t === 'docx') {
        const rewritten = (a.url || '').replace('/api/attachments/file/', '/api/attachments/preview/');
        setPreviewUrl(rewritten);
      } else {
        const { authHeaders } = await import('../apiClient.js');
        const r = await fetch(a.url, { headers: authHeaders(), credentials: 'include' });
        const blob = await r.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewUrl(blobUrl);
      }
    } catch (e) {
      console.error('preview failed', e);
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => { setPreviewFor(null); setPreviewUrl(null); setPreviewType(null); };

  return (
    <SectionShell icon="paperclip" label="Documents & CV" accent={accent}>
      {attachments.length === 0 ? <EmptyMsg msg="No documents uploaded." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map(a => (
            <div key={a.id}>
              <button
                onClick={() => openPreview(a)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
                  background: previewFor === a.id ? `${accent}10` : '#F8F9FF', border: 'none', borderRadius: 9,
                  cursor: 'pointer', fontFamily: F, textAlign: 'left',
                }}
              >
                <Ic n="paperclip" s={14} c={accent} />
                <span style={{ flex: 1, fontSize: 12.5, color: '#1f2430', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name || a.filename || 'File'}
                </span>
                <Ic n={previewFor === a.id ? 'chevD' : 'chevR'} s={12} c="#9ca3af" />
              </button>
              {previewFor === a.id && (
                <div style={{ marginTop: 6, border: '1px solid #f0f0f5', borderRadius: 10, overflow: 'hidden', background: '#fafafe' }}>
                  {loading ? (
                    <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>Loading preview…</div>
                  ) : previewType === 'image' && previewUrl ? (
                    <img src={previewUrl} alt={a.name} style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'contain', background: '#111' }} />
                  ) : previewType === 'pdf' && previewUrl ? (
                    <object data={`${previewUrl}#toolbar=0`} type="application/pdf" style={{ width: '100%', height: 480, display: 'block' }}>
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 12 }}>
                        <a href={a.url} target="_blank" rel="noreferrer" style={{ color: accent, fontWeight: 600 }}>Download to view</a>
                      </div>
                    </object>
                  ) : previewType === 'docx' && previewUrl ? (
                    <iframe src={previewUrl} title={a.name} style={{ width: '100%', height: 480, border: 'none', display: 'block' }} />
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                      Preview unavailable. <a href={a.url} target="_blank" rel="noreferrer" style={{ color: accent, fontWeight: 600 }}>Download</a>
                    </div>
                  )}
                  <div style={{ padding: '6px 11px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f0f0f5' }}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ic n="download" s={11} c={accent} /> Download
                    </a>
                    <button onClick={closePreview} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Close</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Notes Section ─────────────────────────────
export const NotesSection = ({ notes = [], accent = PURPLE }) => (
  <SectionShell icon="edit" label="Notes" accent={accent}>
    {notes.length === 0 ? <EmptyMsg msg="No notes yet." /> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map(n => (
          <div key={n.id} style={{ background: '#F8F9FF', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.body || n.content || n.text}</div>
            <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6, fontWeight: 600 }}>
              {n.author_name || n.created_by_name || 'Someone'} · {relTime(n.created_at)}
            </div>
          </div>
        ))}
      </div>
    )}
  </SectionShell>
);

// ───────────────────────────── Activity Section ─────────────────────────────
export const ActivitySection = ({ activity = [], stageHistory = [], accent = PURPLE }) => {
  const items = [
    ...activity.map(a => ({ ts: a.created_at, label: a.description || a.action || 'Activity', type: 'activity' })),
    ...stageHistory.map(s => ({ ts: s.updated_at || s.created_at, label: `Moved to ${s.stage}${s.workflow_name ? ` (${s.workflow_name})` : ''}`, type: 'stage' })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return (
    <SectionShell icon="activity" label="Stage History" accent={accent}>
      {items.length === 0 ? <EmptyMsg msg="No activity recorded." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: '#374151' }}>{it.label}</div>
                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>{relTime(it.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Forms Section ─────────────────────────────
export const FormsSection = ({ formResponses = [], formIds = null, accent = PURPLE, label = 'Form Responses' }) => {
  const filtered = formIds?.length
    ? (formResponses || []).filter(r => formIds.includes(r.form_id) || formIds.includes(r.form_template_id))
    : (formResponses || []);
  const [openId, setOpenId] = useState(null);
  return (
    <SectionShell icon="form" label={label} accent={accent}>
      {filtered.length === 0 ? <EmptyMsg msg="No form responses." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ border: '1px solid #f0f0f5', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenId(o => o === r.id ? null : r.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', background: '#F8F9FF', border: 'none', cursor: 'pointer', fontFamily: F, textAlign: 'left' }}
              >
                <Ic n="form" s={13} c={accent} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#1f2430' }}>{r.form_name || r.form_template_name || 'Form'}</span>
                <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{relTime(r.created_at || r.submitted_at)}</span>
                <Ic n={openId === r.id ? 'chevD' : 'chevR'} s={12} c="#9ca3af" />
              </button>
              {openId === r.id && (
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(r.form_fields || []).map(f => (
                    <div key={f.id || f.api_key}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3 }}>{f.label || f.name}</div>
                      <div style={{ fontSize: 12.5, color: '#374151', marginTop: 2 }}>
                        {(() => {
                          const v = (r.values || r.data || {})[f.api_key || f.id];
                          if (v == null || v === '') return '—';
                          if (Array.isArray(v)) return v.join(', ');
                          return String(v);
                        })()}
                      </div>
                    </div>
                  ))}
                  {(!r.form_fields || r.form_fields.length === 0) && (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>No fields recorded for this response.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Custom Fields Section ─────────────────────────────
export const CustomFieldsSection = ({ fields = [], data = {}, fieldIds = null, accent = PURPLE, label = 'Profile Fields' }) => {
  const shown = fieldIds?.length ? fields.filter(f => fieldIds.includes(f.id) || fieldIds.includes(f.api_key)) : fields;
  return (
    <SectionShell icon="list" label={label} accent={accent} defaultOpen={false}>
      {shown.length === 0 ? <EmptyMsg msg="No fields selected." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {shown.map(f => (
            <FieldCard key={f.id || f.api_key} label={f.name || f.label} value={
              (() => {
                const v = data[f.api_key];
                if (v == null || v === '') return '—';
                if (Array.isArray(v)) return v.join(', ');
                return String(v);
              })()
            } accent={accent} />
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ───────────────────────────── Section registry + dispatcher ─────────────────────────────
export const SECTION_ICONS = {
  application: 'briefcase', summary: 'align', experience: 'award', education: 'book',
  skills: 'zap', documents: 'paperclip', forms: 'form', notes: 'edit', activity: 'activity',
  custom_fields: 'list',
};

export function renderProfileSection(s, { profileData, d, fields, link, accent }) {
  if (!profileData) return null;
  const { attachments, notes, activity, formResponses, stageHistory } = profileData;
  switch (s.id) {
    case 'application':   return <ApplicationSection key={s.id} link={link} stageHistory={stageHistory} accent={accent} />;
    case 'summary':       return <SummarySection     key={s.id} data={d} accent={accent} />;
    case 'experience':    return <ExperienceSection  key={s.id} data={d} accent={accent} />;
    case 'education':     return <EducationSection   key={s.id} data={d} accent={accent} />;
    case 'skills':        return <SkillsSection      key={s.id} data={d} accent={accent} />;
    case 'documents':     return <DocumentsSection   key={s.id} attachments={attachments} accent={accent} />;
    case 'notes':         return <NotesSection        key={s.id} notes={notes} accent={accent} />;
    case 'activity':      return <ActivitySection     key={s.id} activity={activity} stageHistory={stageHistory} accent={accent} />;
    case 'forms':         return <FormsSection        key={s.id} formResponses={formResponses} formIds={s.form_ids} accent={accent} label={s.label} />;
    case 'custom_fields': return <CustomFieldsSection key={s.id} fields={fields || []} data={d} fieldIds={s.field_ids} accent={accent} label={s.label} />;
    default:
      if (s.id?.startsWith('form:')) {
        return <FormsSection key={s.id} formResponses={formResponses} formIds={[s.id.slice(5)]} accent={accent} label={s.label || 'Form'} />;
      }
      return null;
  }
}

// ───────────────────────────── Tab / flat layout composer ─────────────────────────────
export function ProfileTabs({ config, profileData, fields, link, accent = PURPLE, extraTabs = null, stickyTabBar = false }) {
  const d = profileData?.record?.data || {};
  const sections = (config?.sections || []).filter(s => s.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const tabs = (config?.tabs || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ctx = { profileData, d, fields, link, accent };

  const [active, setActive] = useState(tabs[0]?.id || '__ungrouped__');

  if (!tabs.length) {
    return (
      <div>
        {sections.map(s => renderProfileSection(s, ctx))}
        {extraTabs}
      </div>
    );
  }

  const ungrouped = sections.filter(s => !s.tab_id);
  const shown = active === '__ungrouped__' ? ungrouped : sections.filter(s => s.tab_id === active);
  const tabBarStyle = {
    display: 'flex', gap: 4, borderBottom: '1.5px solid #f0edff', marginBottom: 16, flexWrap: 'wrap',
    ...(stickyTabBar ? { position: 'sticky', top: -1, background: '#fff', zIndex: 2, paddingTop: 2 } : {}),
  };

  return (
    <div>
      <div style={tabBarStyle}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'none', border: 'none',
              borderBottom: active === t.id ? `2px solid ${accent}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700,
              color: active === t.id ? accent : '#9ca3af', marginBottom: -1.5,
            }}
          >
            {t.icon && <Ic n={t.icon} s={13} c={active === t.id ? accent : '#9ca3af'} />}
            {t.label}
          </button>
        ))}
        {ungrouped.length > 0 && (
          <button
            onClick={() => setActive('__ungrouped__')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'none', border: 'none',
              borderBottom: active === '__ungrouped__' ? `2px solid ${accent}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700,
              color: active === '__ungrouped__' ? accent : '#9ca3af', marginBottom: -1.5,
            }}
          >
            More
          </button>
        )}
      </div>
      {shown.length === 0 ? <EmptyMsg msg="No sections assigned to this tab yet." /> : shown.map(s => renderProfileSection(s, ctx))}
      {extraTabs}
    </div>
  );
}
