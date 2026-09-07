// server/routes/feature_requests.js
// Captures two kinds of signal in one place:
//   1. "copilot" — logged silently when the Copilot hits something it can't
//                  do, via a <FEATURE_REQUEST> block (see AI.jsx system prompt)
//   2. "manual"  — submitted directly by a user via Help → Request a Feature
// Both land here and are reviewed together in Super Admin → Feature Requests.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.feature_requests) { s.feature_requests = []; saveStore(); }
}

// GET /api/feature-requests?status=&source=&environment_id=
router.get('/', (req, res) => {
  ensure();
  const { status, source, environment_id } = req.query;
  let items = query('feature_requests', f => {
    if (status && f.status !== status) return false;
    if (source && f.source !== source) return false;
    if (environment_id && f.environment_id !== environment_id) return false;
    return true;
  });
  items = items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json(items);
});

// GET /api/feature-requests/stats
router.get('/stats', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  const items = query('feature_requests', f => !environment_id || f.environment_id === environment_id);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  res.json({
    total: items.length,
    new: items.filter(i => i.status === 'new').length,
    this_week: items.filter(i => i.created_at > weekAgo).length,
    by_status: {
      new:       items.filter(i => i.status === 'new').length,
      reviewing: items.filter(i => i.status === 'reviewing').length,
      planned:   items.filter(i => i.status === 'planned').length,
      shipped:   items.filter(i => i.status === 'shipped').length,
      wont_do:   items.filter(i => i.status === 'wont_do').length,
    },
    by_source: {
      copilot: items.filter(i => i.source === 'copilot').length,
      manual:  items.filter(i => i.source === 'manual').length,
    },
  });
});

// POST /api/feature-requests
// source: "copilot" (fired silently by AI.jsx) or "manual" (Help → Request a Feature)
// Identity is resolved from req.currentUser (set by the auth/rbac middleware from
// X-User-Id, attached automatically by apiClient.js) — body fields are just a fallback.
router.post('/', (req, res) => {
  ensure();
  const {
    environment_id, request_text, description, reason, category, source,
    context_label, context_record_id, context_record_type,
    requested_by_id, requested_by_name, requested_by_email,
  } = req.body;

  if (!request_text) return res.status(400).json({ error: 'request_text is required' });

  const user = req.currentUser;
  const item = {
    id: uuidv4(),
    environment_id: environment_id || null,
    source: source === 'manual' ? 'manual' : 'copilot',
    request_text,
    description: description || '',
    reason: reason || '',
    category: category || null,
    context_label: context_label || null,
    context_record_id: context_record_id || null,
    context_record_type: context_record_type || null,
    requested_by_id: user?.id || requested_by_id || null,
    requested_by_name: (user && [user.first_name, user.last_name].filter(Boolean).join(' ')) || requested_by_name || 'Unknown user',
    requested_by_email: user?.email || requested_by_email || null,
    status: 'new', // new | reviewing | planned | shipped | wont_do
    admin_notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('feature_requests', item);
  res.status(201).json(item);
});

// PATCH /api/feature-requests/:id
router.patch('/:id', (req, res) => {
  ensure();
  const updated = update('feature_requests', f => f.id === req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// DELETE /api/feature-requests/:id
router.delete('/:id', (req, res) => {
  ensure();
  const n = remove('feature_requests', f => f.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  res.json({ id: req.params.id, deleted: true });
});

module.exports = router;
