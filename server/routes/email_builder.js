'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, getStore, saveStore, findOne } = require('../db/init');

// ── CRUD for email templates ──────────────────────────────────────────────────

router.get('/', (req, res) => {
  const { environment_id, category } = req.query;
  let templates = query('email_templates_v2', () => true).filter(t => !t.deleted_at);
  if (environment_id) templates = templates.filter(t => t.is_system || !t.environment_id || t.environment_id === environment_id);
  if (category) templates = templates.filter(t => t.category === category);
  templates.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(templates);
});

router.get('/:id', (req, res) => {
  const t = findOne('email_templates_v2', t => t.id === req.params.id && !t.deleted_at);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

router.post('/', (req, res) => {
  try {
    const store = getStore();
    if (!store.email_templates_v2) store.email_templates_v2 = [];
    const now = new Date().toISOString();
    const template = {
      id: uuidv4(),
      environment_id: req.body.environment_id,
      name: req.body.name || 'Untitled Template',
      category: req.body.category || 'general',
      subject: req.body.subject || '',
      preview_text: req.body.preview_text || '',
      brand_kit_id: req.body.brand_kit_id || null,
      brand_rules: req.body.brand_rules || [],
      blocks: req.body.blocks || [],
      track_opens: req.body.track_opens !== false,
      track_clicks: req.body.track_clicks !== false,
      is_locked: false,
      created_by: req.body.created_by || 'admin',
      created_at: now,
      updated_at: now,
    };
    store.email_templates_v2.push(template);
    saveStore();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const store = getStore();
    if (!store.email_templates_v2) store.email_templates_v2 = [];
    const idx = store.email_templates_v2.findIndex(t => t.id === req.params.id && !t.deleted_at);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const allowed = ['name', 'category', 'subject', 'preview_text', 'brand_kit_id', 'brand_rules',
      'blocks', 'track_opens', 'track_clicks', 'is_locked'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) store.email_templates_v2[idx][k] = req.body[k];
    });
    store.email_templates_v2[idx].updated_at = new Date().toISOString();
    saveStore();
    res.json(store.email_templates_v2[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const store = getStore();
    const idx = (store.email_templates_v2 || []).findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    if (store.email_templates_v2[idx].is_system) return res.status(403).json({ error: 'System templates cannot be deleted. You can edit the subject and body.' });
    store.email_templates_v2[idx].deleted_at = new Date().toISOString();
    saveStore();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Duplicate template ────────────────────────────────────────────────────────
router.post('/:id/duplicate', (req, res) => {
  try {
    const original = findOne('email_templates_v2', t => t.id === req.params.id && !t.deleted_at);
    if (!original) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      id: uuidv4(),
      name: original.name + ' (copy)',
      is_locked: false,
      created_at: now,
      updated_at: now,
    };
    const store = getStore();
    store.email_templates_v2.push(copy);
    saveStore();
    res.status(201).json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Render template with data ─────────────────────────────────────────────────
router.post('/render', (req, res) => {
  try {
    const { template_id, record_data = {}, job_data = {}, custom_data = {}, brand_kit_id_override } = req.body;
    const template = findOne('email_templates_v2', t => t.id === template_id && !t.deleted_at);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Resolve brand kit — check brand rules first, then override, then template default
    let resolvedKitId = brand_kit_id_override || template.brand_kit_id;
    if (!brand_kit_id_override && template.brand_rules?.length) {
      for (const rule of template.brand_rules) {
        const fieldParts = rule.field.split('.');
        let val = fieldParts[0] === 'job' ? job_data : record_data;
        for (const part of fieldParts.slice(1)) val = val?.[part];
        if (val !== undefined && String(val).toLowerCase() === String(rule.value).toLowerCase()) {
          resolvedKitId = rule.brand_kit_id;
          break;
        }
      }
    }

    const brandKit = resolvedKitId
      ? findOne('brand_kits', k => k.id === resolvedKitId && !k.deleted_at)
      : null;

    // Merge all data for tag resolution
    const mergeData = {
      ...record_data,
      ...Object.fromEntries(Object.entries(job_data).map(([k, v]) => [`job_${k}`, v])),
      ...custom_data,
      company_name: brandKit?.company_name || '',
      company_website: brandKit?.company_website || '',
      current_year: new Date().getFullYear(),
    };

    // Resolve subject
    const subject = resolveTags(template.subject, mergeData);
    const previewText = resolveTags(template.preview_text, mergeData);

    // Render blocks to HTML
    const bodyHtml = template.blocks.map(block => renderBlock(block, mergeData, brandKit)).join('');

    // Build full email HTML
    const html = buildEmailHtml({
      subject, previewText, bodyHtml, brandKit, template,
      trackingId: null, // set when actually sending
    });

    res.json({ subject, preview_text: previewText, html, brand_kit_used: resolvedKitId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Preview with sample data ──────────────────────────────────────────────────
router.post('/preview', (req, res) => {
  try {
    const { blocks = [], subject = '', preview_text = '', brand_kit_id } = req.body;
    const sampleData = {
      first_name: 'James', last_name: 'Harrison', email: 'james@example.com',
      current_title: 'Senior Engineer', company_name: 'Acme Corporation',
      job_title: 'Product Manager', job_department: 'Product', job_location: 'Dubai, UAE',
      interview_date: 'Thursday, 27 March 2026', interview_time: '2:00 PM',
      portal_link: 'https://careers.example.com/apply/12345',
      offer_salary: 'AED 35,000/month', current_year: new Date().getFullYear(),
    };

    const brandKit = brand_kit_id
      ? findOne('brand_kits', k => k.id === brand_kit_id && !k.deleted_at)
      : null;

    if (brandKit) {
      sampleData.company_name = brandKit.company_name || sampleData.company_name;
    }

    const resolvedSubject = resolveTags(subject, sampleData);
    const bodyHtml = blocks.map(block => renderBlock(block, sampleData, brandKit)).join('');
    const html = buildEmailHtml({ subject: resolvedSubject, previewText: resolveTags(preview_text, sampleData), bodyHtml, brandKit, template: { track_opens: false, track_clicks: false } });

    res.json({ html, subject: resolvedSubject });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Merge tag reference ───────────────────────────────────────────────────────
router.get('/merge-tags', (req, res) => {
  res.json({
    candidate: ['first_name', 'last_name', 'email', 'phone', 'current_title', 'current_company', 'location', 'skills'],
    job: ['job_title', 'job_department', 'job_location', 'job_salary_min', 'job_salary_max', 'job_work_type'],
    interview: ['interview_date', 'interview_time', 'interview_format', 'interview_location'],
    offer: ['offer_salary', 'offer_start_date', 'offer_expiry_date'],
    company: ['company_name', 'company_website', 'current_year'],
    links: ['portal_link', 'unsubscribe_link', 'privacy_link'],
  });
});

// ── Tracking: open pixel ──────────────────────────────────────────────────────
router.get('/track/open/:trackingId', (req, res) => {
  try {
    const store = getStore();
    if (!store.email_tracking) store.email_tracking = [];
    store.email_tracking.push({
      id: uuidv4(),
      tracking_id: req.params.trackingId,
      event: 'open',
      timestamp: new Date().toISOString(),
      user_agent: req.headers['user-agent'] || '',
      ip: req.ip,
    });
    saveStore();
  } catch (_) {}
  // Return 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(pixel);
});

// ── Tracking: click redirect ──────────────────────────────────────────────────
router.get('/track/click/:trackingId', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing URL');
  try {
    const store = getStore();
    if (!store.email_tracking) store.email_tracking = [];
    store.email_tracking.push({
      id: uuidv4(),
      tracking_id: req.params.trackingId,
      event: 'click',
      url: url,
      timestamp: new Date().toISOString(),
      user_agent: req.headers['user-agent'] || '',
      ip: req.ip,
    });
    saveStore();
  } catch (_) {}
  res.redirect(url);
});

// ── Tracking: stats for a communication ───────────────────────────────────────
router.get('/track/stats/:trackingId', (req, res) => {
  const events = query('email_tracking', e => e.tracking_id === req.params.trackingId);
  const opens = events.filter(e => e.event === 'open');
  const clicks = events.filter(e => e.event === 'click');
  res.json({
    tracking_id: req.params.trackingId,
    opens: opens.length,
    first_opened: opens[0]?.timestamp || null,
    last_opened: opens[opens.length - 1]?.timestamp || null,
    clicks: clicks.length,
    clicked_urls: [...new Set(clicks.map(c => c.url))],
    unique_opens: new Set(opens.map(o => o.ip)).size,
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveTags(text, data) {
  if (!text) return '';
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = data[key.trim()];
    if (val === undefined || val === null) return `{{${key.trim()}}}`;
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  });
}

function renderBlock(block, data, brandKit) {
  const bk = brandKit || {};
  const primary = bk.primaryColor || '#4361EE';
  const textColor = bk.textColor || '#374151';
  const bgColor = bk.bgColor || '#ffffff';
  const fontFamily = bk.fontFamily || "'Inter', Arial, sans-serif";
  const headingFont = bk.headingFont || fontFamily;
  const btnRadius = bk.buttonRadius || '8px';
  const btnStyle = bk.buttonStyle || 'filled';

  switch (block.type) {
    case 'header': {
      const cfg = block.config || {};
      const logoHtml = bk.logo_url ? `<img src="${bk.logo_url}" alt="${bk.company_name || ''}" style="height:40px;max-width:200px;object-fit:contain;" />` : '';
      const nameHtml = (cfg.showCompanyName !== false && bk.company_name) ? `<span style="font-size:18px;font-weight:700;color:${primary};font-family:${headingFont};">${bk.company_name}</span>` : '';
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:20px 0;border-bottom:2px solid ${primary}10;">${logoHtml}${logoHtml && nameHtml ? '&nbsp;&nbsp;' : ''}${nameHtml}</td></tr></table>`;
    }

    case 'text': {
      const content = resolveTags(block.content || '', data);
      return `<div style="font-size:15px;line-height:1.7;color:${textColor};font-family:${fontFamily};margin-bottom:16px;">${content}</div>`;
    }

    case 'heading': {
      const content = resolveTags(block.content || '', data);
      const level = block.config?.level || 2;
      const sizes = { 1: '24px', 2: '20px', 3: '16px' };
      return `<div style="font-size:${sizes[level] || '20px'};font-weight:${bk.headingWeight || 700};color:${textColor};font-family:${headingFont};margin-bottom:12px;">${content}</div>`;
    }

    case 'button': {
      const cfg = block.config || {};
      const text = resolveTags(cfg.text || 'Click here', data);
      const url = resolveTags(cfg.url || '#', data);
      const isFilled = (cfg.style || btnStyle) === 'filled';
      const bg = isFilled ? primary : 'transparent';
      const color = isFilled ? '#ffffff' : primary;
      const border = isFilled ? 'none' : `2px solid ${primary}`;
      const align = cfg.align || 'left';
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td align="${align}"><a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;background:${bg};color:${color};border:${border};border-radius:${btnRadius};font-size:14px;font-weight:700;font-family:${fontFamily};text-decoration:none;">${text}</a></td></tr></table>`;
    }

    case 'image': {
      const cfg = block.config || {};
      const src = resolveTags(cfg.src || '', data);
      const alt = resolveTags(cfg.alt || '', data);
      const width = cfg.width || '100%';
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td align="center"><img src="${src}" alt="${alt}" style="max-width:${width};height:auto;border-radius:${bk.borderRadius || '8px'};" /></td></tr></table>`;
    }

    case 'divider':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-top:1px solid #e5e7eb;"></td></tr></table>`;

    case 'spacer':
      return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:${block.config?.height || 20}px;"></td></tr></table>`;

    case 'two_column': {
      const left = (block.left || []).map(b => renderBlock(b, data, brandKit)).join('');
      const right = (block.right || []).map(b => renderBlock(b, data, brandKit)).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td width="48%" valign="top" style="padding-right:12px;">${left}</td><td width="48%" valign="top" style="padding-left:12px;">${right}</td></tr></table>`;
    }

    case 'footer': {
      const social = bk.social_links || {};
      const socialHtml = Object.entries(social).filter(([, v]) => v).map(([k, v]) =>
        `<a href="${v}" style="color:${primary};text-decoration:none;font-size:12px;margin:0 6px;">${k.charAt(0).toUpperCase() + k.slice(1)}</a>`
      ).join(' · ');
      const address = bk.company_address || '';
      const privacyUrl = bk.privacy_url || '#';
      const footerText = bk.footer_text || `© ${new Date().getFullYear()} ${bk.company_name || 'Company'}. All rights reserved.`;
      const unsub = bk.unsubscribe_text || 'Unsubscribe';

      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:20px;">
        <tr><td style="text-align:center;font-size:12px;color:#9ca3af;font-family:${fontFamily};line-height:1.8;">
          ${socialHtml ? `<div style="margin-bottom:10px;">${socialHtml}</div>` : ''}
          ${address ? `<div>${address}</div>` : ''}
          <div>${footerText}</div>
          <div style="margin-top:8px;"><a href="${privacyUrl}" style="color:#9ca3af;text-decoration:underline;font-size:11px;">Privacy Policy</a> · <a href="{{unsubscribe_link}}" style="color:#9ca3af;text-decoration:underline;font-size:11px;">${unsub}</a></div>
        </td></tr></table>`;
    }

    default:
      return '';
  }
}

function buildEmailHtml({ subject, previewText, bodyHtml, brandKit, template, trackingId }) {
  const bk = brandKit || {};
  const bgColor = bk.bgColor || '#ffffff';
  const outerBg = '#f4f4f5';
  const fontFamily = bk.fontFamily || "'Inter', Arial, sans-serif";
  const maxWidth = bk.maxWidth || '600px';

  let trackingPixel = '';
  if (trackingId && template?.track_opens) {
    trackingPixel = `<img src="/api/email-builder/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${outerBg};font-family:${fontFamily};">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${outerBg};"><tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:${maxWidth};background:${bgColor};border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
</table></td></tr></table>${trackingPixel}</body></html>`;
}

// ── Seed system templates (idempotent — only inserts if slug not already present) ──
router.post('/seed-system', (req, res) => {
  const store = getStore();
  if (!store.email_templates_v2) store.email_templates_v2 = [];
  const now = new Date().toISOString();
  let added = 0;

  const SYSTEM_TEMPLATES = [
    {
      slug: 'sys_interview_scheduled',
      name: 'Interview Scheduled — Candidate & Interviewer Invite',
      category: 'interview',
      is_system: true,
      has_ics: true,
      supports_reschedule_link: true,
      description: 'Sent automatically to the candidate and all interviewers when an interview is scheduled. Includes an ICS calendar attachment.',
      subject: 'Interview Confirmed: {{candidate_name}}{{job_name ? " — " + job_name : ""}}',
      html_body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#4361EE;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Interview Scheduled</h2>
  </div>
  <div style="background:#f8f9fc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">Your interview has been confirmed. Please find the calendar invite attached.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px;width:120px">Candidate</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{candidate_name}}</td></tr>
      {{#if job_name}}<tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Role</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{job_name}}</td></tr>{{/if}}
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Date</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{date_label}}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Time</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{time}}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Format</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{format}}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Duration</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{duration}} minutes</td></tr>
      {{#if interviewers}}<tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Interviewer(s)</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">{{interviewers}}</td></tr>{{/if}}
    </table>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb">
      <a href="{{reschedule_url}}" style="display:inline-block;background:#4361EE;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">Need to reschedule? →</a>
    </div>
  </div>
</div>`,
      text_body: 'Interview confirmed for {{candidate_name}}{{job_name ? " — " + job_name : ""}}\nDate: {{date_label}} at {{time}}\nFormat: {{format}} ({{duration}} min)\nReschedule: {{reschedule_url}}',
      variables: ['candidate_name','job_name','date_label','time','format','duration','interviewers','reschedule_url'],
    },
    {
      slug: 'sys_application_hub',
      name: 'Application Hub — Magic Link',
      category: 'portal',
      is_system: true,
      description: 'Sent when a candidate requests access to their application hub. Contains a one-time magic link that expires in 15 minutes.',
      subject: 'Your {{company_name}} application hub',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <div style="width:40px;height:40px;border-radius:10px;background:{{brand_color}};margin-bottom:24px;"></div>
  <h2 style="margin:0 0 8px;font-size:20px;color:#0F1729;">Your application hub link</h2>
  <p style="color:#4B5675;line-height:1.6;margin:0 0 24px;">Hi {{first_name}}, click below to access your candidate hub. This link expires in 15 minutes.</p>
  <a href="{{hub_url}}" style="display:inline-block;padding:12px 28px;background:{{brand_color}};color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Open my hub →</a>
  <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
</div>`,
      text_body: 'Hi {{first_name}},\n\nClick here to access your hub:\n{{hub_url}}\n\nExpires in 15 minutes.',
      variables: ['first_name','company_name','brand_color','hub_url'],
    },
    {
      slug: 'sys_saved_application',
      name: 'Saved Application — Resume Link',
      category: 'portal',
      is_system: true,
      description: 'Sent when a candidate saves their in-progress application on a career portal. Contains a link to resume where they left off (expires in 7 days).',
      subject: 'Continue your application — {{company_name}}',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#0F1729;">Your saved application</h2>
  <p style="color:#4B5675;line-height:1.6;">Hi{{first_name ? " " + first_name : ""}},</p>
  <p style="color:#4B5675;line-height:1.6;">You saved your application. Click below to pick up where you left off. This link expires in 7 days.</p>
  <a href="{{resume_url}}" style="display:inline-block;padding:12px 28px;background:#4361EE;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Continue application →</a>
</div>`,
      text_body: 'Hi{{first_name ? " " + first_name : ""}},\n\nContinue your application here:\n{{resume_url}}\n\nThis link expires in 7 days.',
      variables: ['first_name','company_name','resume_url'],
    },
    {
      slug: 'sys_user_invite',
      name: 'Platform Invite — New User Welcome',
      category: 'system',
      is_system: true,
      description: 'Sent when a new platform user is invited. Contains their login credentials and a link to the platform.',
      subject: 'You have been invited to {{company_name}}',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#0F1729;">Welcome to {{company_name}}</h2>
  <p style="color:#4B5675;line-height:1.6;">Hi {{first_name}}, you have been invited to join the {{company_name}} recruitment platform.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px">Email</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">{{email}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Password</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">{{temp_password}}</td></tr>
  </table>
  <a href="{{login_url}}" style="display:inline-block;padding:12px 28px;background:#4361EE;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Log in →</a>
  <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">Please change your password after your first login.</p>
</div>`,
      text_body: 'Hi {{first_name}},\n\nYou have been invited to {{company_name}}.\nEmail: {{email}}\nTemporary password: {{temp_password}}\nLog in at: {{login_url}}\n\nPlease change your password after first login.',
      variables: ['first_name','company_name','email','temp_password','login_url'],
    },
    {
      slug: 'sys_interview_feedback_reminder',
      name: 'Interview Feedback Reminder',
      category: 'interview',
      is_system: true,
      description: 'Sent to interviewers as a reminder to submit their scorecard/feedback after an interview.',
      subject: 'Feedback needed — {{candidate_name}} interview',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#0F1729;">Feedback reminder</h2>
  <p style="color:#4B5675;line-height:1.6;">Hi,</p>
  <p style="color:#4B5675;line-height:1.6;">Just a reminder to submit your interview feedback for <strong>{{candidate_name}}</strong>{{job_title ? " applying for " + job_title : ""}}.</p>
  <p style="color:#4B5675;line-height:1.6;">Please add your scorecard notes as soon as possible so we can move quickly.</p>
  <a href="{{feedback_url}}" style="display:inline-block;padding:12px 28px;background:#4361EE;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Submit feedback →</a>
</div>`,
      text_body: 'Hi,\n\nPlease submit your interview feedback for {{candidate_name}}{{job_title ? " applying for " + job_title : ""}}.\n\n{{feedback_url}}',
      variables: ['candidate_name','job_title','feedback_url'],
    },
    {
      slug: 'sys_offer_sent',
      name: 'Offer Letter — Sent to Candidate',
      category: 'offer',
      is_system: true,
      description: 'Sent to a candidate when a formal offer is made. Links to the offer letter for review and acceptance.',
      subject: 'Your offer from {{company_name}}',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#0F1729;">Congratulations, {{first_name}}!</h2>
  <p style="color:#4B5675;line-height:1.6;">We are delighted to offer you the position of <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong>.</p>
  <p style="color:#4B5675;line-height:1.6;">Please review your offer letter and let us know your decision by <strong>{{expiry_date}}</strong>.</p>
  <a href="{{offer_url}}" style="display:inline-block;padding:12px 28px;background:#4361EE;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">View my offer →</a>
</div>`,
      text_body: 'Hi {{first_name}},\n\nWe are delighted to offer you {{job_title}} at {{company_name}}.\nPlease review your offer by {{expiry_date}}:\n{{offer_url}}',
      variables: ['first_name','company_name','job_title','expiry_date','offer_url'],
    },
    {
      slug: 'sys_offer_accepted',
      name: 'Offer Accepted — Recruiter Notification',
      category: 'offer',
      is_system: true,
      description: 'Sent to the recruiting team when a candidate accepts their offer.',
      subject: '✅ Offer accepted — {{candidate_name}} ({{job_title}})',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#059669;">Offer Accepted 🎉</h2>
  <p style="color:#4B5675;line-height:1.6;"><strong>{{candidate_name}}</strong> has accepted the offer for <strong>{{job_title}}</strong>.</p>
  <p style="color:#4B5675;line-height:1.6;">Start date: <strong>{{start_date}}</strong></p>
  <a href="{{record_url}}" style="display:inline-block;padding:12px 28px;background:#059669;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">View record →</a>
</div>`,
      text_body: '{{candidate_name}} has accepted the offer for {{job_title}}.\nStart date: {{start_date}}\n{{record_url}}',
      variables: ['candidate_name','job_title','start_date','record_url'],
    },
    {
      slug: 'sys_welcome_team',
      name: 'Welcome to the Team',
      category: 'onboarding',
      is_system: true,
      description: 'Sent to a new hire after their offer is accepted, welcoming them to the company.',
      subject: 'Welcome to the team, {{first_name}}!',
      html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;color:#0F1729;">Welcome, {{first_name}}! 🎉</h2>
  <p style="color:#4B5675;line-height:1.6;">We are absolutely delighted to welcome you to <strong>{{company_name}}</strong>!</p>
  <p style="color:#4B5675;line-height:1.6;">Your start date is confirmed as <strong>{{start_date}}</strong> and we'll be in touch shortly with everything you need to know before day one.</p>
  <p style="color:#4B5675;line-height:1.6;">We cannot wait to have you on board!</p>
</div>`,
      text_body: 'Hi {{first_name}},\n\nWe are absolutely delighted to welcome you to {{company_name}}!\n\nYour start date is confirmed as {{start_date}} and we will be in touch shortly.\n\nWe cannot wait to have you on board!',
      variables: ['first_name','company_name','start_date'],
    },
    {
      slug: 'sys_ai_interview_invite',
      name: 'AI Interview Invitation',
      category: 'interview',
      is_system: true,
      description: 'Sent to a candidate when they are invited to complete an AI-conducted interview. Contains a link to start the interview.',
      subject: "You've been invited to an AI interview — {{job_title}}",
      blocks: [{"id": "7bec0033-cf00-4b92-8558-1af4301241b6", "type": "header", "content": {"text": "AI Interview Invitation"}}, {"id": "dab15290-6724-4596-ae98-c379b035c67b", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "092ddd49-5659-448e-bc85-b67e66e5976a", "type": "text", "content": {"text": "You have been invited to complete an AI interview for the **{{job_title}}** position. Click the button below to start when you are ready."}}, {"id": "99d5df04-d11e-4dd8-b5d0-08a1d7179b86", "type": "text", "content": {"text": "\u26a1 The interview is conducted by an AI agent and typically takes 20\u201330 minutes. Find a quiet place and ensure your microphone is working."}}, {"id": "8af4dd5b-92ee-477c-9560-4d7189e4fc29", "type": "button", "content": {"text": "Start Interview \u2192", "url": "{{interview_link}}", "style": "primary"}}, {"id": "22c3e997-4028-47ad-8e2a-f730a7a68f7f", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: "Hi {{first_name}},\n\nYou've been invited to complete an AI interview{{job_title ? ' for the ' + job_title + ' position' : ''}}.\n\nStart here: {{interview_link}}\n\nThe interview typically takes 20-30 minutes.",
      variables: ['first_name','job_title','interview_link','company_name'],
    },
    {
      slug: 'sys_application_received',
      name: 'Application Received',
      category: 'application',
      is_system: true,
      description: 'Sent automatically to a candidate when their application is received.',
      subject: 'We received your application — {{job_title}}',
      blocks: [{"id": "15e33b19-1388-4a4d-8e78-21e2cc75c1fb", "type": "header", "content": {"text": "Application Received"}}, {"id": "7f80f76c-852a-4bb5-93ea-93aa7e70d5df", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "a33a45a6-b35f-4c7e-a218-bd57dd92b8cb", "type": "text", "content": {"text": "Thank you for applying for the **{{job_title}}** position at **{{company_name}}**. We have received your application and our team will review it shortly."}}, {"id": "c848250f-2f29-4630-818e-eb20048e8a10", "type": "text", "content": {"text": "We will be in touch about next steps."}}, {"id": "ecab444a-67c3-4890-a2c4-b3ab36c2530c", "type": "text", "content": {"text": "{{company_name}} Talent Team"}}, {"id": "2905ddf1-8a4d-40c4-9664-1c618257dae3", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Hi {{first_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}. We\'ve received your application and will be in touch.\n\n{{company_name}} Talent Team',
      variables: ['first_name','job_title','company_name'],
    },
    {
      slug: 'sys_application_shortlisted',
      name: 'Application Shortlisted',
      category: 'application',
      is_system: true,
      description: 'Sent to a candidate when they have been shortlisted for a role.',
      subject: "Great news — you've been shortlisted for {{job_title}}",
      blocks: [{"id": "5cdd1cc1-06b0-4ffc-9362-aea9c4b8cdd0", "type": "header", "content": {"text": "You have been shortlisted \ud83c\udf89"}}, {"id": "49e4f392-c755-4588-92f8-7a92ae0c202d", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "9c4eb1cd-86fe-4b8b-bb17-08b8eba21beb", "type": "text", "content": {"text": "We are pleased to let you know that your application for the **{{job_title}}** position has been shortlisted. Congratulations!"}}, {"id": "5121a149-77a8-4859-9081-68c6d5a04ce5", "type": "text", "content": {"text": "Someone from our team will be in touch shortly to discuss next steps."}}, {"id": "3ca1d12f-0d6b-4af2-87cb-d2d7c4971233", "type": "text", "content": {"text": "{{company_name}} Talent Team"}}, {"id": "f147bf84-024f-4ade-a9c0-778a55e22859", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: "Hi {{first_name}},\n\nGreat news — your application for {{job_title}} has been shortlisted! Someone will be in touch shortly.\n\n{{company_name}} Talent Team",
      variables: ['first_name','job_title','company_name'],
    },
    {
      slug: 'sys_application_unsuccessful',
      name: 'Application Unsuccessful',
      category: 'application',
      is_system: true,
      description: 'Sent to a candidate when their application has not been successful.',
      subject: 'Your application for {{job_title}}',
      blocks: [{"id": "86ad5165-e92e-42eb-b73f-481ea1d0183f", "type": "header", "content": {"text": "Application Update"}}, {"id": "1d70f281-e467-489e-a5c4-d9fe6fc182cf", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "a3615491-2e3e-4db1-ac61-5a46cbad0122", "type": "text", "content": {"text": "Thank you for applying for the **{{job_title}}** position at **{{company_name}}**. After careful consideration, we regret to inform you that we will not be moving forward with your application on this occasion."}}, {"id": "b7c98a66-0604-450e-834a-ab4199266c15", "type": "text", "content": {"text": "We wish you the very best in your search."}}, {"id": "27cd8273-1183-4bdb-8a05-0bd35c538532", "type": "text", "content": {"text": "{{company_name}} Talent Team"}}, {"id": "c9b844a3-d758-4205-b624-38407c2503c3", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Hi {{first_name}},\n\nThank you for applying for {{job_title}} at {{company_name}}. After careful consideration we will not be moving forward on this occasion. We wish you the best.\n\n{{company_name}} Talent Team',
      variables: ['first_name','job_title','company_name'],
    },
    {
      slug: 'sys_candidate_outreach',
      name: 'Candidate Outreach',
      category: 'outreach',
      is_system: true,
      description: 'Initial outreach message to a prospective candidate about a role.',
      subject: 'Exciting opportunity at {{company_name}} — {{job_title}}',
      blocks: [{"id": "7c2e4fa9-6ce0-418c-971f-a84c11aa13ef", "type": "header", "content": {"text": "An opportunity at {{company_name}}"}}, {"id": "fcbb518e-b63f-497e-9717-0bd4346e6ddb", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "7bbb554b-cf77-4a5e-98cd-035ea48043b6", "type": "text", "content": {"text": "I came across your profile and wanted to reach out about an exciting **{{job_title}}** opportunity at **{{company_name}}**. Would you be open to a brief conversation to find out more?"}}, {"id": "224e3df8-8a85-44ab-94a6-4391d2d2dbd3", "type": "text", "content": {"text": "Best regards,\n{{sender_name}}\n{{company_name}}"}}, {"id": "b8cdd931-4753-475e-a090-661f55de26b7", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Hi {{first_name}},\n\nI came across your profile and wanted to reach out about a {{job_title}} opportunity at {{company_name}}. Would you be open to a brief conversation?\n\n{{sender_name}}, {{company_name}}',
      variables: ['first_name','job_title','company_name','sender_name'],
    },
    {
      slug: 'sys_followup_no_response',
      name: 'Follow-up (No Response)',
      category: 'outreach',
      is_system: true,
      description: 'Follow-up message when a candidate has not responded to initial outreach.',
      subject: 'Following up — {{job_title}} at {{company_name}}',
      blocks: [{"id": "e294decb-2a2f-4711-81c8-fb09cedb5f8a", "type": "header", "content": {"text": "Following up"}}, {"id": "af2d56ec-8c29-45f4-818f-7c2797b1ef62", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "9cb03927-fe5e-4523-8516-75f315dc1fef", "type": "text", "content": {"text": "I wanted to follow up on my previous message about the **{{job_title}}** role at **{{company_name}}**. Would any time this week work for a quick 15-minute call?"}}, {"id": "b6e46c2a-82fd-45c2-b5e3-566cbb8027bc", "type": "text", "content": {"text": "Best regards,\n{{sender_name}}"}}, {"id": "c4365dad-6b8d-4be5-8c74-0814e852abb8", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Hi {{first_name}},\n\nFollowing up on my previous message about {{job_title}} at {{company_name}}. Would any time this week work for a brief call?\n\n{{sender_name}}',
      variables: ['first_name','job_title','company_name','sender_name'],
    },
    {
      slug: 'sys_pre_start_welcome',
      name: 'Pre-Start Welcome',
      category: 'onboarding',
      is_system: true,
      description: 'Sent before a new hire\'s start date to help them prepare for day one.',
      subject: 'Getting ready for your first day — {{company_name}}',
      blocks: [{"id": "547edd64-760a-40ff-a861-af7e226b66c4", "type": "header", "content": {"text": "Getting ready for day one"}}, {"id": "2cdec2dd-2e13-4aee-ac86-c1cf161cdfbb", "type": "text", "content": {"text": "Hi {{first_name}},"}}, {"id": "42c217c7-4633-4587-921e-b90a0c377e0d", "type": "text", "content": {"text": "We are counting down to your start date of **{{start_date}}** and wanted to share some information to help you prepare."}}, {"id": "17c5e129-44d1-41ea-9124-f53cc1a2353f", "type": "text", "content": {"text": "Your buddy for your first week will be **{{buddy_name}}**, who will reach out before you start."}}, {"id": "06194fad-042e-4989-a537-441c176bfb19", "type": "text", "content": {"text": "Looking forward to welcoming you!\n\n{{company_name}} People Team"}}, {"id": "aac80e94-fb79-4069-81e0-54452090644e", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Hi {{first_name}},\n\nWe\'re counting down to your start date of {{start_date}}! Your buddy will be {{buddy_name}} who will reach out before you start.\n\n{{company_name}} People Team',
      variables: ['first_name','start_date','buddy_name','company_name'],
    },
    {
      slug: 'sys_reference_request',
      name: 'Reference Request',
      category: 'onboarding',
      is_system: true,
      description: 'Sent to a referee to request a reference for a candidate.',
      subject: 'Reference request for {{candidate_name}}',
      blocks: [{"id": "db0cdbb1-7e99-4b0a-b398-ea3d3c7ba572", "type": "header", "content": {"text": "Reference Request"}}, {"id": "d01b125e-a916-49e7-91f7-2d92d8f33d30", "type": "text", "content": {"text": "Dear {{referee_name}},"}}, {"id": "619911e9-3682-4b13-ae75-456e6b01d721", "type": "text", "content": {"text": "**{{candidate_name}}** has applied for the position of **{{job_title}}** at **{{company_name}}** and has given your name as a reference."}}, {"id": "5d648785-5598-4467-8537-23461d7280c3", "type": "text", "content": {"text": "We would be most grateful if you could take a few minutes to provide a reference. Your response will be kept in strict confidence."}}, {"id": "72c51ca7-6d47-48ea-bd83-146cea9724b5", "type": "text", "content": {"text": "{{company_name}} Talent Team"}}, {"id": "09e676d6-260c-4b2f-8fe3-2e46635cfa36", "type": "button", "content": {"text": "Provide Reference \u2192", "url": "{{reference_link}}", "style": "primary"}}, {"id": "7554c1e3-c4b4-4984-b37f-6baa27bb368a", "type": "footer", "content": {}}],
      html_body: ``,
      text_body: 'Dear {{referee_name}},\n\n{{candidate_name}} has applied for {{job_title}} at {{company_name}} and given your name as a reference. Please provide a reference here:\n{{reference_link}}\n\nThank you.\n{{company_name}} Talent Team',
      variables: ['referee_name','candidate_name','job_title','company_name','reference_link'],
    },

    // ── Match Notification templates (shown in the Notify flow from AI Match panel) ──
    {
      slug: 'sys_match_notify_job',
      name: '✦ Role Match — Candidate Notification',
      category: 'outreach',
      is_system: true,
      notify_mode: 'job',   // shown when notifying candidates about a single job
      description: 'Sent to matched candidates when a job goes live. Personalised by AI using the candidate\'s profile and match score.',
      subject: 'We thought you\'d be a great fit — {{job_title}} at {{company_name}}',
      blocks: [
        { id: 'mn_job_h',  type: 'header',  content: { text: '{{job_title}} — Open Role' } },
        { id: 'mn_job_t1', type: 'text',    content: { text: 'Hi {{first_name}},' } },
        { id: 'mn_job_ai', type: 'ai_content', prompt: 'Write 2–3 sentences explaining why this candidate is a strong match for the {{job_title}} role at {{company_name}}. Reference their background, skills, and any standout match reasons. Be specific, warm, and concise.', config: { prompt: 'Write 2–3 sentences explaining why this candidate is a strong match for the {{job_title}} role at {{company_name}}. Reference their background, skills, and any standout match reasons. Be specific, warm, and concise.' } },
        { id: 'mn_job_b1', type: 'button',  content: { text: 'View role →', url: '{{portal_link}}', style: 'primary' } },
        { id: 'mn_job_t2', type: 'text',    content: { text: 'Best regards,\n{{company_name}} Talent Team' } },
        { id: 'mn_job_ft', type: 'footer',  content: {} },
      ],
      variables: ['first_name', 'job_title', 'company_name', 'portal_link'],
    },
    {
      slug: 'sys_match_notify_person',
      name: '✦ Job Recommendations — Candidate Digest',
      category: 'outreach',
      is_system: true,
      notify_mode: 'person', // shown when notifying one candidate about multiple jobs
      description: 'Sent to a candidate with a personalised list of recommended roles. AI writes a tailored summary for each job.',
      subject: '{{company_name}} — {{job_1_title}}{{job_2_title ? " and more roles" : " and other opportunities"}} matched for you',
      blocks: [
        { id: 'mn_p_h',  type: 'header',  content: { text: 'Roles matched for you' } },
        { id: 'mn_p_t1', type: 'text',    content: { text: 'Hi {{first_name}},\n\nBased on your profile we\'ve identified some roles that look like a strong fit. Here\'s a summary of what we think could be great opportunities for you.' } },
        { id: 'mn_p_ai', type: 'ai_content', prompt: 'Write a personalised digest for this candidate listing all the recommended jobs. For each job, write 1–2 sentences on why it fits their background. Format as a clean HTML list with the job title bolded and a "View role →" link using the job_N_link variables. Be warm and encouraging.', config: { prompt: 'Write a personalised digest for this candidate listing all the recommended jobs. For each job, write 1–2 sentences on why it fits their background. Format as a clean HTML list with the job title bolded and a "View role →" link using the job_N_link variables. Be warm and encouraging.' } },
        { id: 'mn_p_t2', type: 'text',    content: { text: 'We\'d love to hear your thoughts — feel free to reply to this email.\n\nBest regards,\n{{company_name}} Talent Team' } },
        { id: 'mn_p_ft', type: 'footer',  content: {} },
      ],
      variables: ['first_name', 'company_name', 'job_1_title', 'job_1_link', 'job_2_title', 'job_2_link'],
    },
  ];

  for (const tmpl of SYSTEM_TEMPLATES) {
    const idx = (store.email_templates_v2 || []).findIndex(t => t.slug === tmpl.slug && !t.deleted_at);
    if (idx < 0) {
      // New template — insert
      store.email_templates_v2.push({ ...tmpl, id: uuidv4(), created_at: now, updated_at: now });
      added++;
    } else {
      // Existing — update html_body if empty OR if it doesn't yet use %%BRAND_%% placeholders
      const existing = store.email_templates_v2[idx];
      const needsUpdate = tmpl.html_body && (
        !existing.html_body ||
        (existing.html_body && !existing.html_body.includes('%%BRAND_'))
      ) || (tmpl.blocks?.length > 0 && !(existing.blocks?.length > 0));
      if (needsUpdate) {
        if (tmpl.html_body) store.email_templates_v2[idx].html_body = tmpl.html_body;
        if (tmpl.blocks?.length > 0) store.email_templates_v2[idx].blocks = tmpl.blocks;
        store.email_templates_v2[idx].updated_at = now;
      }
    }
  }
  saveStore();
  res.json({ seeded: added, total: SYSTEM_TEMPLATES.length });
});

module.exports = router;
