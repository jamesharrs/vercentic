const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

function ensureTable() {
  const s = getStore();
  if (!s.scheduled_reports) { s.scheduled_reports = []; saveStore(); }
}

// GET — list for an environment
router.get('/', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  res.json(query('scheduled_reports', r => r.environment_id === environment_id));
});

// POST — create schedule
router.post('/', (req, res) => {
  ensureTable();
  const { saved_view_id, name, environment_id, frequency, day_of_week, hour, recipients, created_by } = req.body;
  if (!saved_view_id || !environment_id || !recipients?.length)
    return res.status(400).json({ error: 'saved_view_id, environment_id, recipients required' });
  const rec = insert('scheduled_reports', {
    id: uuidv4(), saved_view_id, name: name || 'Scheduled Report',
    environment_id, frequency: frequency || 'weekly',
    day_of_week: day_of_week ?? 1, hour: hour ?? 9,
    recipients: Array.isArray(recipients) ? recipients : [recipients],
    active: true, last_sent: null,
    created_by: created_by || 'unknown',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  res.status(201).json(rec);
});

// PATCH — update schedule
router.patch('/:id', (req, res) => {
  ensureTable();
  const up = { ...req.body, updated_at: new Date().toISOString() };
  const r  = update('scheduled_reports', r => r.id === req.params.id, up);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});

// DELETE
router.delete('/:id', (req, res) => {
  ensureTable();
  remove('scheduled_reports', r => r.id === req.params.id);
  res.json({ deleted: true });
});

// POST /:id/send — manual trigger (marks last_sent, returns info)
router.post('/:id/send', (req, res) => {
  ensureTable();
  const rec = query('scheduled_reports', r => r.id === req.params.id)[0];
  if (!rec) return res.status(404).json({ error: 'Not found' });
  update('scheduled_reports', r => r.id === rec.id, {
    last_sent: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  res.json({ ok: true, sent_at: new Date().toISOString(), recipients: rec.recipients });
});

module.exports = router;
