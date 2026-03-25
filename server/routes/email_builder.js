'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, getStore, saveStore, findOne } = require('../db/init');

// ── CRUD for email templates ──────────────────────────────────────────────────

router.get('/', (req, res) => {
  const { environment_id, category } = req.query;
  let templates = query('email_templates_v2', () => true).filter(t => !t.deleted_at);
  if (environment_id) templates = templates.filter(t => t.environment_id === environment_id);
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

module.exports = router;
