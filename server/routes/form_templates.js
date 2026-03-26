const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.form_templates) { s.form_templates = []; saveStore(); }
}

// GET /api/form-templates?environment_id=&object_slug=
router.get('/', (req, res) => {
  ensure();
  const { environment_id, object_slug } = req.query;
  let tpls = (getStore().form_templates || []).filter(t => !t.deleted_at);
  if (environment_id) tpls = tpls.filter(t => t.environment_id === environment_id);
  if (object_slug)    tpls = tpls.filter(t => !t.object_slug || t.object_slug === object_slug || t.object_slug === 'any');
  res.json(tpls);
});

// GET /api/form-templates/:id
router.get('/:id', (req, res) => {
  ensure();
  const t = (getStore().form_templates || []).find(t => t.id === req.params.id && !t.deleted_at);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// POST /api/form-templates
router.post('/', (req, res) => {
  ensure();
  const s   = getStore();
  const now = new Date().toISOString();
  const tpl = {
    id: uuidv4(), ...req.body,
    fields:     req.body.fields     || [],
    sharing:    req.body.sharing    || { visibility: 'team', roles: [], users: [] },
    created_at: now, updated_at: now, deleted_at: null,
  };
  if (!s.form_templates) s.form_templates = [];
  s.form_templates.push(tpl);
  saveStore();
  res.status(201).json(tpl);
});

// PATCH /api/form-templates/:id
router.patch('/:id', (req, res) => {
  ensure();
  const s   = getStore();
  const idx = (s.form_templates || []).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.form_templates[idx] = { ...s.form_templates[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore();
  res.json(s.form_templates[idx]);
});

// DELETE /api/form-templates/:id
router.delete('/:id', (req, res) => {
  ensure();
  const s   = getStore();
  const idx = (s.form_templates || []).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.form_templates[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

module.exports = router;
