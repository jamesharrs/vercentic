import { useState, useEffect, useRef, useCallback } from 'react';

const ICONS = {
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  x: 'M18 6L6 18M6 6l12 12',
  paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
  briefcase: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  check: 'M20 6L9 17l-5-5',
  search: 'M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
  sparkles: 'M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6',
  mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z',
  clock: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2',
  messageCircle: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
};
const Ic = ({ n, s = 16, c = 'currentColor' }) => {
  const d = ICONS[n]; if (!d) return null;
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
  </svg>);
};

function buildTheme(branding, copilotConfig) {
  const primary = branding.primary_color || branding.primary || '#4361EE';
  const secondary = branding.secondary_color || branding.secondary || branding.accent || primary;
  const bg = branding.background_color || branding.bg || '#FAFBFC';
  const font = branding.font || branding.font_family || "'DM Sans', -apple-system, sans-serif";
  const radius = branding.border_radius != null ? parseInt(branding.border_radius) : 12;
  const buttonRadius = branding.button_radius != null ? parseInt(branding.button_radius) : 8;
  const widgetHeight = Math.max(420, Math.min(900, parseInt(copilotConfig.widget_height) || 580));
  return {
    primary, secondary, bg, font, radius, buttonRadius, widgetHeight,
    primaryLight: `${primary}10`, primaryMedium: `${primary}20`, primaryBorder: `${primary}30`,
    cardBg: 'white', cardBorder: '#E5E7EB', textPrimary: '#111827', textSecondary: '#6B7280', textMuted: '#9CA3AF',
    name: copilotConfig.name || (branding.company_name ? `${branding.company_name} Assistant` : 'Career Assistant'),
    subtitle: copilotConfig.subtitle || 'Explore roles & apply',
    logo: copilotConfig.avatar_url || branding.logo_url || null,
    companyName: branding.company_name || '',
  };
}

const JobCard = ({ job, theme, onView, onApply }) => (
  <div onClick={() => onView(job)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onView(job); }}
    style={{ background: theme.cardBg, borderRadius: theme.radius, border: `1px solid ${theme.cardBorder}`, padding: '14px 16px', marginBottom: 8, transition: 'all 0.15s', cursor: 'pointer' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.boxShadow = `0 2px 12px ${theme.primaryLight}`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.cardBorder; e.currentTarget.style.boxShadow = 'none'; }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: theme.buttonRadius + 2, background: theme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ic n="briefcase" s={16} c={theme.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 3, lineHeight: 1.3 }}>{job.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {job.department && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#F3F4F6', color: theme.textSecondary, fontWeight: 600 }}>{job.department}</span>}
          {job.location && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>{job.location}</span>}
          {job.work_type && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#D97706', fontWeight: 600 }}>{job.work_type}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onView(job); }}
            style={{ padding: '5px 12px', borderRadius: theme.buttonRadius, fontSize: 11, fontWeight: 700, border: `1.5px solid ${theme.primaryBorder}`, background: 'transparent', color: theme.primary, cursor: 'pointer', transition: 'all 0.15s', fontFamily: theme.font, display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = theme.primaryLight} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Ic n="eye" s={12} c={theme.primary} /> View details
          </button>
          <button onClick={e => { e.stopPropagation(); onApply(job); }}
            style={{ padding: '5px 12px', borderRadius: theme.buttonRadius, fontSize: 11, fontWeight: 700, border: 'none', background: theme.primary, color: 'white', cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: theme.font, display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Apply now
          </button>
        </div>
      </div>
    </div>
  </div>
);

const JobDetailInline = ({ job, theme, onApply, onBack }) => (
  <div style={{ background: theme.cardBg, borderRadius: theme.radius, border: `1.5px solid ${theme.primaryBorder}`, padding: 16, marginBottom: 8 }}>
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: theme.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, fontFamily: theme.font }}>
      <Ic n="arrowLeft" s={12} c={theme.primary} /> Back to results
    </button>
    <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 6, lineHeight: 1.3 }}>{job.title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
      {job.department && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: '#F3F4F6', color: theme.textSecondary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Ic n="briefcase" s={10} c={theme.textSecondary} /> {job.department}</span>}
      {job.location && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: '#ECFDF5', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Ic n="mapPin" s={10} c="#059669" /> {job.location}</span>}
      {job.work_type && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: '#FEF3C7', color: '#D97706', fontWeight: 600 }}>{job.work_type}</span>}
      {job.employment_type && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: theme.primaryLight, color: theme.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Ic n="clock" s={10} c={theme.primary} /> {job.employment_type}</span>}
    </div>
    {(job.salary_min || job.salary_max) && <div style={{ padding: '8px 12px', borderRadius: theme.buttonRadius, background: theme.primaryLight, fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 12, display: 'inline-block' }}>
      {job.salary_min && job.salary_max ? `${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}` : job.salary_min ? `From ${Number(job.salary_min).toLocaleString()}` : `Up to ${Number(job.salary_max).toLocaleString()}`}
    </div>}
    {job.summary && <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{job.summary}</div>}
    {Array.isArray(job.skills) && job.skills.length > 0 && <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Skills & requirements</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {job.skills.map((s, i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: theme.primaryLight, color: theme.primary, fontWeight: 600, border: `1px solid ${theme.primaryBorder}` }}>{s}</span>)}
      </div>
    </div>}
    <button onClick={() => onApply(job)} style={{ width: '100%', padding: '10px', borderRadius: theme.buttonRadius, border: 'none', background: theme.primary, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: theme.font }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      Apply for this role
    </button>
  </div>
);

const ApplicationCard = ({ data, theme, onConfirm, onEdit, submitting }) => (
  <div style={{ background: '#F0FDF4', borderRadius: theme.radius, border: '1.5px solid #86EFAC', padding: 16, marginBottom: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: theme.buttonRadius, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="check" s={14} c="white" /></div>
      <div><div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>Ready to submit</div><div style={{ fontSize: 11, color: '#059669' }}>Applying for {data.job_title}</div></div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
      {[['Name', `${data.first_name} ${data.last_name || ''}`], ['Email', data.email], data.phone && ['Phone', data.phone], data.cover_note && ['Note', data.cover_note.slice(0, 120) + (data.cover_note.length > 120 ? '...' : '')], data.cv_file && ['CV', data.cv_file.name]].filter(Boolean).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: theme.textSecondary, width: 48, flexShrink: 0, fontWeight: 600 }}>{k}</span><span style={{ color: theme.textPrimary }}>{v}</span></div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onEdit} style={{ flex: 1, padding: '8px', borderRadius: theme.buttonRadius, border: '1px solid #D1D5DB', background: 'white', color: theme.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font }}>Edit</button>
      <button onClick={onConfirm} disabled={submitting} style={{ flex: 2, padding: '8px', borderRadius: theme.buttonRadius, border: 'none', background: '#10B981', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font, opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </div>
  </div>
);

const SuccessCard = ({ jobTitle, theme }) => (
  <div style={{ background: `linear-gradient(135deg, ${theme.primaryLight}, ${theme.primaryMedium})`, borderRadius: theme.radius, border: `1.5px solid ${theme.primaryBorder}`, padding: 20, textAlign: 'center', marginBottom: 8 }}>
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Ic n="check" s={24} c="white" /></div>
    <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>Application submitted!</div>
    <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>Your application for <strong>{jobTitle}</strong> has been received. We'll review it and get back to you soon.</div>
  </div>
);

const inputStyle = (theme) => ({ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.cardBorder}`, fontSize: 12, color: theme.textPrimary, fontFamily: theme.font, outline: 'none', background: theme.bg, boxSizing: 'border-box' });

const ApplyForm = ({ job, form, setForm, theme, onSubmit, onCancel, submitting, fileRef, onFileSelect, isDragging }) => (
  <div style={{ background: theme.cardBg, borderRadius: theme.radius, border: `1.5px solid ${theme.primaryBorder}`, padding: 16, marginBottom: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: theme.buttonRadius, background: theme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic n="briefcase" s={14} c={theme.primary} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>Apply now</div>
        <div style={{ fontSize: 11, color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" style={inputStyle(theme)} />
        <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" style={inputStyle(theme)} />
      </div>
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" type="email" style={inputStyle(theme)} />
      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" style={inputStyle(theme)} />
      <textarea value={form.cover_note} onChange={e => setForm(f => ({ ...f, cover_note: e.target.value }))} placeholder="Cover note (optional)" rows={3} style={{ ...inputStyle(theme), resize: 'vertical' }} />
      <div onClick={() => fileRef.current?.click()}
        style={{ border: `1.5px dashed ${isDragging ? theme.primary : theme.cardBorder}`, borderRadius: theme.buttonRadius, padding: '12px 10px', textAlign: 'center', cursor: 'pointer', background: isDragging ? theme.primaryLight : (form.cv_file ? '#F0FDF4' : theme.bg), transition: 'all 0.15s' }}>
        {form.cv_file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#059669', fontWeight: 600 }}>
            <Ic n="file" s={13} c="#059669" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{form.cv_file.name}</span>
            <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, cv_file: null })); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}><Ic n="x" s={11} c="#059669" /></button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Ic n="paperclip" s={15} c={theme.textMuted} />
            <span>{isDragging ? 'Drop your CV here' : 'Click or drag your CV / resume here'}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onFileSelect} style={{ display: 'none' }} />
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: '8px', borderRadius: theme.buttonRadius, border: '1px solid #D1D5DB', background: 'white', color: theme.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font }}>Cancel</button>
      <button onClick={onSubmit} disabled={submitting || !form.first_name || !form.email}
        style={{ flex: 2, padding: '8px', borderRadius: theme.buttonRadius, border: 'none', background: theme.primary, color: 'white', fontSize: 12, fontWeight: 700, cursor: (submitting || !form.first_name || !form.email) ? 'default' : 'pointer', fontFamily: theme.font, opacity: (submitting || !form.first_name || !form.email) ? 0.5 : 1 }}>
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </div>
  </div>
);

function parseResponse(text) {
  const parts = []; let remaining = text;
  const jobMatch = remaining.match(/<JOB_CARDS>([\s\S]*?)<\/JOB_CARDS>/);
  if (jobMatch) { remaining = remaining.replace(jobMatch[0], '').trim(); try { parts.push({ type: 'jobs', jobs: JSON.parse(jobMatch[1]) }); } catch (e) {} }
  const appMatch = remaining.match(/<APPLICATION>([\s\S]*?)<\/APPLICATION>/);
  if (appMatch) { remaining = remaining.replace(appMatch[0], '').trim(); try { parts.push({ type: 'application', data: JSON.parse(appMatch[1]) }); } catch (e) {} }
  if (remaining.trim()) parts.push({ type: 'text', content: remaining.trim() });
  return parts;
}

export default function CandidateCopilot({ portal, api }) {
  const branding = portal?.branding || portal?.theme || {};
  const copilotConfig = portal?.copilot || {};
  const theme = buildTheme(branding, copilotConfig);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApp, setPendingApp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [applyForm, setApplyForm] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const applyFileRef = useRef(null);
  const dragCounter = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, open, viewingJob]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const welcomeMsg = copilotConfig.welcome_message || `Hi! I'm ${theme.name}. I can help you explore open positions${theme.companyName ? ` at ${theme.companyName}` : ''}, answer questions about roles, and guide you through applying. What are you looking for?`;

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    setViewingJob(null);
    const userMsg = { role: 'user', content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try {
      // Strip extra UI fields (e.g. `parsed`) before sending — the Anthropic
      // API rejects message objects with fields beyond role/content.
      const cleanMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
      const result = await api.post('/portal-copilot/chat', { portal_id: portal.id, messages: cleanMsgs, session_id: null });
      if (result.error) { setMessages([...newMsgs, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." }]); }
      else {
        const parsed = parseResponse(result.reply || '');
        const appBlock = parsed.find(p => p.type === 'application');
        if (appBlock) setPendingApp({ ...appBlock.data, cv_file: cvFile });
        setMessages([...newMsgs, { role: 'assistant', content: result.reply, parsed }]);
      }
    } catch (e) { setMessages([...newMsgs, { role: 'assistant', content: 'Something went wrong. Please try again.' }]); }
    finally { setLoading(false); }
  }, [messages, loading, portal?.id, api, cvFile]);

  const handleApplyFromCard = (job) => {
    setViewingJob(null); setPendingApp(null);
    setApplyForm({ job, first_name: '', last_name: '', email: '', phone: '', cover_note: '', cv_file: cvFile || null });
  };
  const handleViewJob = (job) => { setApplyForm(null); setViewingJob(job); sendMessage(`Tell me more about the ${job.title} role${job.department ? ` in ${job.department}` : ''}.`); };

  const submitApplication = async (appData) => {
    if (!appData || submitting) return; setSubmitting(true);
    try {
      const formData = new FormData(); formData.append('portal_id', portal.id);
      ['first_name','last_name','email','phone','cover_note','job_id','job_title'].forEach(k => { if (appData[k]) formData.append(k, appData[k]); });
      if (appData.cv_file) formData.append('cv', appData.cv_file);
      const res = await fetch(`${api.baseUrl || ''}/portal-copilot/apply`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) { setPendingApp(null); setApplyForm(null); setCvFile(null); setMessages(prev => [...prev, { role: 'assistant', content: '', parsed: [{ type: 'success', jobTitle: appData.job_title }] }]); }
      else { setMessages(prev => [...prev, { role: 'assistant', content: `There was an issue: ${data.error || 'Please try again.'}` }]); }
    } catch (e) { setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to submit. Please try again.' }]); }
    finally { setSubmitting(false); }
  };

  const handleConfirmApplication = () => submitApplication(pendingApp);
  const handleApplyFormSubmit = () => { if (!applyForm) return; submitApplication({ ...applyForm, job_id: applyForm.job.id, job_title: applyForm.job.title }); };
  const handleApplyFormFile = (file) => { if (file) setApplyForm(f => f ? { ...f, cv_file: file } : f); };

  const handleFileSelect = (e) => { const file = e.target.files?.[0]; if (file) { setCvFile(file); sendMessage(`I've attached my CV: ${file.name}`); } };
  const handleApplyFileSelect = (e) => { const file = e.target.files?.[0]; handleApplyFormFile(file); };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); } };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragging(false);
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    if (applyForm) handleApplyFormFile(file);
    else { setCvFile(file); sendMessage(`I've attached my CV: ${file.name}`); }
  };
  if (!copilotConfig.enabled) return null;

  return (<>
    {/* Floating trigger */}
    {!open && (
      <button onClick={() => setOpen(true)} aria-label={`Chat with ${theme.name}`}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, color: 'white', cursor: 'pointer',
          boxShadow: `0 4px 20px ${theme.primary}40, 0 2px 8px rgba(0,0,0,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        {theme.logo ? <img src={theme.logo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <Ic n="messageCircle" s={24} c="white" />}
      </button>
    )}

    {/* Chat panel */}
    {open && (
      <div onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 400, maxWidth: 'calc(100vw - 32px)', height: theme.widgetHeight, maxHeight: 'calc(100vh - 48px)',
        borderRadius: theme.radius + 8, overflow: 'hidden', background: theme.bg, boxShadow: `0 12px 48px rgba(0,0,0,0.15), 0 0 0 1px ${theme.primaryBorder}`,
        display: 'flex', flexDirection: 'column', fontFamily: theme.font }}>
        {isDragging && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: `${theme.primary}14`, backdropFilter: 'blur(2px)', border: `2px dashed ${theme.primary}`, borderRadius: theme.radius + 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ background: theme.cardBg, borderRadius: theme.radius, padding: '16px 22px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Ic n="file" s={26} c={theme.primary} />
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>Drop your CV / resume</div>
            </div>
          </div>
        )}
        {/* Header */}
        <div style={{ padding: '14px 16px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, color: 'white', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: theme.buttonRadius + 2, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {theme.logo ? <img src={theme.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Ic n="messageCircle" s={20} c="white" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{theme.name}</div>
            <div style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{theme.subtitle}</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ width: 30, height: 30, borderRadius: theme.buttonRadius, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ic n="x" s={14} c="white" />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', background: theme.bg }}>
          {messages.length === 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ background: theme.cardBg, borderRadius: `4px ${theme.radius}px ${theme.radius}px ${theme.radius}px`, padding: '12px 14px', fontSize: 13, color: theme.textPrimary, lineHeight: 1.6, border: `1px solid ${theme.cardBorder}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {welcomeMsg}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {(copilotConfig.quick_actions || [
                  { label: 'Browse open roles', prompt: 'Show me all open positions', icon: 'search' },
                  { label: 'Jobs near me', prompt: 'What jobs do you have available near me?', icon: 'mapPin' },
                  { label: 'How to apply', prompt: 'How does the application process work?', icon: 'file' },
                ]).map((chip, ci) => (
                  <button key={ci} onClick={() => sendMessage(chip.prompt)}
                    style={{ padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, border: `1px solid ${theme.primaryBorder}`, background: theme.primaryLight, color: theme.primary, cursor: 'pointer', transition: 'all 0.15s', fontFamily: theme.font, display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.primaryMedium} onMouseLeave={e => e.currentTarget.style.background = theme.primaryLight}>
                    {chip.icon && <Ic n={chip.icon} s={11} c={theme.primary} />}{chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={{ maxWidth: '88%', background: isUser ? theme.primary : theme.cardBg, color: isUser ? 'white' : theme.textPrimary,
                  borderRadius: isUser ? `${theme.radius}px ${theme.radius}px 4px ${theme.radius}px` : `4px ${theme.radius}px ${theme.radius}px ${theme.radius}px`,
                  padding: '10px 14px', fontSize: 13, lineHeight: 1.6, border: isUser ? 'none' : `1px solid ${theme.cardBorder}`,
                  boxShadow: isUser ? `0 2px 8px ${theme.primary}25` : '0 1px 3px rgba(0,0,0,0.04)', wordBreak: 'break-word' }}>
                  {msg.parsed ? msg.parsed.map((block, j) => {
                    if (block.type === 'text') return <div key={j} style={{ whiteSpace: 'pre-wrap' }}>{block.content}</div>;
                    if (block.type === 'jobs') return <div key={j} style={{ marginTop: 8 }}>{block.jobs.map((job, k) => <JobCard key={k} job={job} theme={theme} onView={handleViewJob} onApply={handleApplyFromCard} />)}</div>;
                    if (block.type === 'application') return null;
                    if (block.type === 'success') return <SuccessCard key={j} jobTitle={block.jobTitle} theme={theme} />;
                    return null;
                  }) : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>}
                </div>
              </div>
            );
          })}

          {viewingJob && !applyForm && <JobDetailInline job={viewingJob} theme={theme} onApply={handleApplyFromCard} onBack={() => setViewingJob(null)} />}
          {applyForm && <ApplyForm job={applyForm.job} form={applyForm} setForm={setApplyForm} theme={theme} onSubmit={handleApplyFormSubmit} onCancel={() => setApplyForm(null)} submitting={submitting} fileRef={applyFileRef} onFileSelect={handleApplyFileSelect} isDragging={isDragging} />}
          {pendingApp && <ApplicationCard data={pendingApp} theme={theme} onConfirm={handleConfirmApplication} onEdit={() => { setPendingApp(null); sendMessage('I need to change some details on my application.'); }} submitting={submitting} />}
          
          {loading && <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{ background: theme.cardBg, borderRadius: `4px ${theme.radius}px ${theme.radius}px ${theme.radius}px`, padding: '12px 16px', border: `1px solid ${theme.cardBorder}`, display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(k => <div key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: theme.primary, opacity: 0.3, animation: `ccDot 1.2s ${k * 0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>}

          {cvFile && !pendingApp && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#F0FDF4', borderRadius: theme.buttonRadius, border: '1px solid #BBF7D0', marginBottom: 8, fontSize: 12, color: '#059669' }}>
            <Ic n="file" s={13} c="#059669" /><span style={{ flex: 1, fontWeight: 600 }}>{cvFile.name}</span>
            <button onClick={() => setCvFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Ic n="x" s={11} c="#059669" /></button>
          </div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${theme.cardBorder}`, background: theme.cardBg, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: theme.bg, borderRadius: theme.radius, padding: '6px 10px', border: `1px solid ${theme.cardBorder}`, transition: 'border-color 0.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = theme.primary} onBlur={e => e.currentTarget.style.borderColor = theme.cardBorder}>
            <button onClick={() => fileRef.current?.click()} title="Attach CV / Resume"
              style={{ width: 30, height: 30, borderRadius: theme.buttonRadius, border: 'none', background: 'transparent', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = theme.primary} onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
              <Ic n="paperclip" s={15} />
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} style={{ display: 'none' }} />
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={copilotConfig.input_placeholder || 'Ask about roles, or start applying...'}
              rows={1} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: theme.textPrimary, resize: 'none', fontFamily: theme.font, lineHeight: 1.5, maxHeight: 80, padding: '4px 0' }} />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              style={{ width: 30, height: 30, borderRadius: theme.buttonRadius, border: 'none', background: input.trim() && !loading ? theme.primary : '#E5E7EB', color: 'white', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
              <Ic n="send" s={13} c="white" />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 5 }}><span style={{ fontSize: 9, color: theme.textMuted, letterSpacing: '0.02em' }}>Powered by {theme.companyName || 'Vercentic'}</span></div>
        </div>
      </div>
    )}
    <style>{`@keyframes ccDot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }`}</style>
  </>);
}
