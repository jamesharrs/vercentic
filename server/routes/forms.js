const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

// ── helpers ───────────────────────────────────────────────────────────────────
function ensure() {
  const s = getStore();
  if (!s.forms)          { s.forms = [];          saveStore(); }
  if (!s.form_responses) { s.form_responses = [];  saveStore(); }
}

// ── List forms ────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  ensure();
  const { environment_id, object_slug, record_id } = req.query;
  let forms = (getStore().forms || []).filter(f => !f.deleted_at);
  if (environment_id) forms = forms.filter(f => f.environment_id === environment_id);
  if (object_slug)    forms = forms.filter(f => !f.applies_to?.length || f.applies_to.includes(object_slug));
  res.json(forms);
});

// ── Get single form ───────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  ensure();
  const form = (getStore().forms || []).find(f => f.id === req.params.id && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'Not found' });
  // Enrich with response count
  const responses = (getStore().form_responses || []).filter(r => r.form_id === form.id && !r.deleted_at);
  res.json({ ...form, response_count: responses.length });
});

// ── Create form ───────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  if (_checkGA(req, res, 'manage_forms') === false) return;
  ensure();
  const s = getStore();
  const now = new Date().toISOString();
  const form = {
    id:             uuidv4(),
    environment_id: req.body.environment_id,
    name:           req.body.name           || 'Untitled Form',
    description:    req.body.description    || '',
    slug:           req.body.slug           || req.body.name?.toLowerCase().replace(/[^a-z0-9]+/g,'_') || uuidv4().slice(0,8),
    category:       req.body.category       || 'general',   // general | screening | interview | survey | confidential
    applies_to:     req.body.applies_to     || [],           // ['people','jobs'] etc
    fields:         req.body.fields         || [],           // field definitions (inline, not in fields table)
    sharing:        req.body.sharing        || 'internal',   // internal | link | public
    share_token:    uuidv4().slice(0,16),                    // used for link sharing
    confidential:   req.body.confidential   || false,        // hides responses from non-admins
    allow_multiple: req.body.allow_multiple !== false,       // allow multiple responses per record
    show_in_record: req.body.show_in_record !== false,       // show in record panel
    searchable:     req.body.searchable     !== false,       // include in search/reports
    parseable:      req.body.parseable      !== false,       // include in CV/doc parse targets
    status:         'active',
    created_by:     req.body.created_by     || 'Admin',
    created_at:     now,
    updated_at:     now,
    deleted_at:     null,
  };
  s.forms.push(form);
  saveStore();
  res.status(201).json(form);
});

// ── Update form ───────────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_forms') === false) return;
  ensure();
  const s = getStore();
  const idx = (s.forms || []).findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.forms[idx] = { ...s.forms[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore();
  res.json(s.forms[idx]);
});

// ── Delete form ───────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_forms') === false) return;
  ensure();
  const s = getStore();
  const idx = (s.forms || []).findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.forms[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// ── Form Responses ────────────────────────────────────────────────────────────

// List responses for a form or record
router.get('/:id/responses', (req, res) => {
  ensure();
  const { record_id, environment_id } = req.query;
  let responses = (getStore().form_responses || []).filter(r => r.form_id === req.params.id && !r.deleted_at);
  if (record_id) responses = responses.filter(r => r.record_id === record_id);
  res.json(responses);
});

// Submit a response
router.post('/:id/responses', (req, res) => {
  ensure();
  const s = getStore();
  const form = (s.forms || []).find(f => f.id === req.params.id && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const now = new Date().toISOString();
  const response = {
    id:             uuidv4(),
    form_id:        form.id,
    form_name:      form.name,
    environment_id: req.body.environment_id || form.environment_id,
    record_id:      req.body.record_id      || null,
    record_type:    req.body.record_type    || null,   // 'people', 'jobs' etc
    data:           req.body.data           || {},     // { field_key: value }
    submitted_by:   req.body.submitted_by   || 'Admin',
    submitted_at:   now,
    created_at:     now,
    deleted_at:     null,
  };

  // Activity log entry on the record if attached
  if (response.record_id && s.activity) {
    s.activity.push({
      id: uuidv4(), record_id: response.record_id,
      environment_id: response.environment_id,
      action: 'form_submitted', actor: response.submitted_by,
      changes: { form_name: form.name, response_id: response.id },
      created_at: now,
    });
  }

  s.form_responses.push(response);
  saveStore();
  res.status(201).json(response);
});

// Update a response
router.patch('/:id/responses/:responseId', (req, res) => {
  ensure();
  const s = getStore();
  const idx = (s.form_responses || []).findIndex(r => r.id === req.params.responseId && r.form_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Response not found' });
  s.form_responses[idx] = { ...s.form_responses[idx], data: { ...s.form_responses[idx].data, ...req.body.data }, updated_at: new Date().toISOString() };
  saveStore();
  res.json(s.form_responses[idx]);
});

// Delete response
router.delete('/:id/responses/:responseId', (req, res) => {
  ensure();
  const s = getStore();
  const idx = (s.form_responses || []).findIndex(r => r.id === req.params.responseId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.form_responses[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// ── Cross-form search (for reports) ──────────────────────────────────────────
router.get('/search/responses', (req, res) => {
  ensure();
  const { environment_id, query, form_id, record_id } = req.query;
  let responses = (getStore().form_responses || []).filter(r => !r.deleted_at);
  if (environment_id) responses = responses.filter(r => r.environment_id === environment_id);
  if (form_id)        responses = responses.filter(r => r.form_id === form_id);
  if (record_id)      responses = responses.filter(r => r.record_id === record_id);
  if (query) {
    const q = query.toLowerCase();
    responses = responses.filter(r =>
      Object.values(r.data || {}).some(v => String(v||'').toLowerCase().includes(q))
    );
  }
  res.json(responses);
});

module.exports = router;
