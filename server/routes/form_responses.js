const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.form_responses) { s.form_responses = []; saveStore(); }
}

// GET /api/form-responses?record_id=&form_template_id=&environment_id=
router.get('/', (req, res) => {
  ensure();
  const { record_id, form_template_id, environment_id } = req.query;
  let responses = (getStore().form_responses || []).filter(r => !r.deleted_at);
  if (record_id)        responses = responses.filter(r => r.record_id === record_id);
  if (form_template_id) responses = responses.filter(r => r.form_template_id === form_template_id);
  if (environment_id)   responses = responses.filter(r => r.environment_id === environment_id);

  // Enrich with template name
  const templates = (getStore().form_templates || []);
  responses = responses.map(r => {
    const tpl = templates.find(t => t.id === r.form_template_id);
    return { ...r, template_name: tpl?.name || 'Unknown Form', template_category: tpl?.category || '' };
  });
  res.json(responses.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at)));
});

// GET /api/form-responses/:id
router.get('/:id', (req, res) => {
  ensure();
  const r = (getStore().form_responses || []).find(r => r.id === req.params.id && !r.deleted_at);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const tpl = (getStore().form_templates || []).find(t => t.id === r.form_template_id);
  res.json({ ...r, template: tpl || null });
});

// POST /api/form-responses
router.post('/', (req, res) => {
  ensure();
  const s   = getStore();
  const now = new Date().toISOString();
  const response = {
    id: uuidv4(), ...req.body,
    data:         req.body.data         || {},
    status:       req.body.status       || 'draft',
    submitted_by: req.body.submitted_by || 'Admin',
    created_at:   now,
    submitted_at: req.body.status === 'submitted' ? now : null,
    updated_at:   now, deleted_at: null,
  };
  if (!s.form_responses) s.form_responses = [];
  s.form_responses.push(response);
  saveStore();
  res.status(201).json(response);
});

// PATCH /api/form-responses/:id
router.patch('/:id', (req, res) => {
  ensure();
  const s   = getStore();
  const idx = (s.form_responses || []).findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const wasSubmitted = req.body.status === 'submitted' && s.form_responses[idx].status !== 'submitted';
  s.form_responses[idx] = {
    ...s.form_responses[idx], ...req.body,
    updated_at:   now,
    submitted_at: wasSubmitted ? now : s.form_responses[idx].submitted_at,
  };
  saveStore();
  res.json(s.form_responses[idx]);
});

// DELETE /api/form-responses/:id
router.delete('/:id', (req, res) => {
  ensure();
  const s   = getStore();
  const idx = (s.form_responses || []).findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.form_responses[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// GET /api/form-responses/search?q=&environment_id=
// Search across all form response data
router.get('/search/query', (req, res) => {
  ensure();
  const { q, environment_id } = req.query;
  if (!q) return res.json([]);
  const query = q.toLowerCase();
  let responses = (getStore().form_responses || []).filter(r => !r.deleted_at);
  if (environment_id) responses = responses.filter(r => r.environment_id === environment_id);
  const matches = responses.filter(r => {
    const dataStr = JSON.stringify(r.data || {}).toLowerCase();
    return dataStr.includes(query);
  });
  res.json(matches);
});

module.exports = router;
