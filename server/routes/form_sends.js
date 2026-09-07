/**
 * server/routes/form_sends.js
 *
 * Sends a form to one or more people via a unique tokenised link, emailed
 * directly or via a chosen email template. The recipient lands on a public,
 * branded page (client/src/portals/FormFillPage.jsx), fills it in, and the
 * response is stored against their record exactly like an internally-filled
 * form response — same form_responses table, same context_record_id for
 * job-application scoping, same activity log entry, same agent trigger.
 *
 * Auth: GET/POST / and GET / are internal (session required, same as forms.js).
 * The /token/:token routes are public — no auth, no CSRF (see index.js
 * AUTH_EXEMPT and middleware/csrf.js CSRF_EXEMPT_PREFIXES).
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { resolveBrand } = require('../utils/brandKit');

function ensure() {
  const s = getStore();
  if (!s.form_sends) { s.form_sends = []; saveStore(); }
}
function personName(d = {}) {
  return [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Candidate';
}
function mergeTags(text, vars) {
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// ── GET / — list sends for a record or form (internal, used by the record's
// Forms panel to show "Sent 2 days ago, not yet completed") ─────────────────
router.get('/', (req, res) => {
  ensure();
  const { record_id, form_id, environment_id } = req.query;
  let sends = (getStore().form_sends || []).filter(s => !s.deleted_at);
  if (record_id)      sends = sends.filter(s => s.record_id === record_id);
  if (form_id)         sends = sends.filter(s => s.form_id === form_id);
  if (environment_id) sends = sends.filter(s => s.environment_id === environment_id);
  sends.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  res.json(sends);
});

// ── POST / — create + send to one or more people in one call ────────────────
router.post('/', async (req, res) => {
  ensure();
  const {
    environment_id, form_id, record_ids, context_record_id, context_record_title,
    email, sent_by, expires_hours,
  } = req.body;
  if (!environment_id || !form_id || !Array.isArray(record_ids) || !record_ids.length)
    return res.status(400).json({ error: 'environment_id, form_id and record_ids[] are required' });

  const s = getStore();
  const form = (s.forms || []).find(f => f.id === form_id && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  // Resolve the email content once — either an existing template or a raw compose
  let subjectTpl = email?.subject || '', bodyTpl = email?.body || '';
  if (email?.template_id) {
    const tpl = (s.email_templates || []).find(t => t.id === email.template_id);
    if (tpl) { subjectTpl = tpl.subject || subjectTpl; bodyTpl = tpl.body || bodyTpl; }
  }
  if (!subjectTpl) subjectTpl = `Please complete: ${form.name}`;
  if (!bodyTpl) bodyTpl = `Hi {{first_name}},\n\nPlease complete the following: {{form_name}}.\n\n{{form_link}}\n\nThanks,\n{{sent_by}}`;

  let messaging;
  try { messaging = require('../services/messaging'); } catch (_) { messaging = null; }
  const baseUrl = (req.headers.origin || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const now = new Date().toISOString();
  const results = { sent: [], failed: [] };

  for (const record_id of record_ids) {
    const record = (s.records || []).find(r => r.id === record_id && !r.deleted_at);
    if (!record) { results.failed.push({ record_id, reason: 'Record not found' }); continue; }
    const d = record.data || {};
    const token = uuidv4().replace(/-/g, '');
    const link  = `${baseUrl}/form-fill/${token}`;

    const vars = {
      first_name: d.first_name || '', last_name: d.last_name || '',
      full_name: personName(d), candidate_name: personName(d), form_name: form.name,
      job_title: context_record_title || '', form_link: link,
      sent_by: sent_by || 'The hiring team',
    };
    const subject = mergeTags(subjectTpl, vars);
    const bodyHtml = mergeTags(bodyTpl, vars).split('\n').map(l => `<p style="margin:0 0 12px">${l}</p>`).join('');

    const send = {
      id: uuidv4(), token, environment_id, form_id, form_name: form.name,
      record_id, record_name: personName(d), record_email: d.email || null,
      context_record_id: context_record_id || null, context_record_title: context_record_title || null,
      status: 'sent', response_id: null,
      sent_at: now, opened_at: null, completed_at: null,
      expires_at: expires_hours ? new Date(Date.now() + expires_hours * 3600000).toISOString() : null,
      sent_by: sent_by || null,
    };
    s.form_sends.push(send);

    // Ensure a form_links row exists — RecordFormPanel (the Forms panel on a
    // record) only ever shows forms it can find via GET /forms/links, so
    // without this the response lands correctly in form_responses but is
    // completely invisible in the UI. Same dedupe check forms.js's own
    // POST /forms/links uses, so re-sending the same form+context is a no-op.
    if (!s.form_links) s.form_links = [];
    const existingLink = s.form_links.find(l =>
      !l.deleted_at && l.record_id === record_id && l.form_id === form_id
      && (l.context_record_id || null) === (context_record_id || null)
    );
    if (!existingLink) {
      s.form_links.push({
        id: uuidv4(), record_id, form_id, environment_id,
        context_record_id: context_record_id || null,
        context_record_title: context_record_title || null,
        linked_by: sent_by || null,
        created_at: now, updated_at: now,
      });
    }

    if (d.email && messaging) {
      // messaging.sendEmail()'s raw success shape varies by provider
      // ({messageId,status,provider} for Resend, etc.) — there is no `.sent`
      // boolean on success. The only reliable signal is: did it throw/return
      // an error, or come back marked `.simulated` (no credentials configured).
      // (approvals.js wraps this the same way via its own sendApprovalEmail().)
      const r = await messaging.sendEmail({ to: d.email, toName: vars.full_name, subject, html: bodyHtml })
        .catch(err => ({ error: err.message }));
      if (r?.error) results.failed.push({ record_id, reason: r.error, token });
      else results.sent.push({ record_id, token, ...(r?.simulated ? { simulated: true } : {}) });
    } else if (!d.email) {
      results.failed.push({ record_id, reason: 'No email address on record', token });
    } else {
      results.sent.push({ record_id, token, simulated: true }); // messaging service unavailable in dev
    }
  }
  saveStore();
  res.status(201).json(results);
});

// ── PUBLIC: GET /token/:token — load the form for the recipient to fill in ──
router.get('/token/:token', (req, res) => {
  ensure();
  const s = getStore();
  const send = (s.form_sends || []).find(x => x.token === req.params.token);
  if (!send) return res.status(404).json({ error: 'This link is invalid.' });
  if (send.expires_at && new Date(send.expires_at) < new Date())
    return res.status(410).json({ error: 'This link has expired. Please ask your recruiter to resend it.' });

  const form = (s.forms || []).find(f => f.id === send.form_id && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'This form is no longer available.' });

  if (send.status === 'sent') {
    send.status = 'opened'; send.opened_at = new Date().toISOString(); saveStore();
  }

  res.json({
    send: {
      id: send.id, status: send.status, record_name: send.record_name,
      context_record_title: send.context_record_title, completed_at: send.completed_at,
    },
    form: { id: form.id, name: form.name, description: form.description, fields: form.fields || [] },
    brand: resolveBrand(s, send.environment_id),
  });
});

// ── PUBLIC: POST /token/:token/submit — record the response ─────────────────
// Mirrors forms.js's POST /:id/responses exactly (same activity log entry,
// same agent trigger) so a form completed externally is indistinguishable
// from one filled in internally — it's the same form_responses row either way.
router.post('/token/:token/submit', (req, res) => {
  ensure();
  const s = getStore();
  const send = (s.form_sends || []).find(x => x.token === req.params.token);
  if (!send) return res.status(404).json({ error: 'This link is invalid.' });
  if (send.expires_at && new Date(send.expires_at) < new Date())
    return res.status(410).json({ error: 'This link has expired.' });
  if (send.status === 'completed')
    return res.status(409).json({ error: 'This form has already been submitted.' });

  const form = (s.forms || []).find(f => f.id === send.form_id && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'This form is no longer available.' });

  if (!s.form_responses) s.form_responses = [];
  if (!s.activity) s.activity = [];
  const now = new Date().toISOString();
  const response = {
    id: uuidv4(), form_id: form.id, form_name: form.name,
    environment_id: send.environment_id,
    record_id: send.record_id, record_type: 'people',
    context_record_id: send.context_record_id, context_record_title: send.context_record_title,
    data: req.body.data || {},
    submitted_by: send.record_name, submitted_at: now, created_at: now, deleted_at: null,
  };
  s.form_responses.push(response);

  s.activity.push({
    id: uuidv4(), record_id: response.record_id, environment_id: response.environment_id,
    action: 'form_submitted', actor: response.submitted_by,
    changes: { form_name: form.name, response_id: response.id, via: 'emailed_link' },
    created_at: now,
  });

  send.status = 'completed'; send.completed_at = now; send.response_id = response.id;
  saveStore();

  try {
    const engine = require('../agent-engine');
    engine.fireFormSubmitTrigger(response.form_id, response.record_id, response.environment_id).catch(() => {});
  } catch (e) { /* agent-engine optional */ }

  res.status(201).json({ ok: true });
});

module.exports = router;
