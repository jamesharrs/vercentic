const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

// Ensure saved_views table exists
function ensureTable() {
  const store = getStore();
  if (!store.saved_views) { store.saved_views = []; saveStore(); }
}

// GET /api/saved-views?object_id=&environment_id=&user_id=
router.get('/', (req, res) => {
  ensureTable();
  const { object_id, environment_id, user_id } = req.query;
  if (!object_id || !environment_id) return res.status(400).json({ error: 'object_id and environment_id required' });
  const views = query('saved_views', v =>
    v.object_id === object_id &&
    v.environment_id === environment_id &&
    (v.is_shared || v.created_by === user_id)
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(views);
});

// POST /api/saved-views
router.post('/', (req, res) => {
  ensureTable();
  const { name, object_id, environment_id, created_by, is_shared, filters, visible_field_ids, view_mode } = req.body;
  if (!name || !object_id || !environment_id) return res.status(400).json({ error: 'name, object_id, environment_id required' });
  const view = insert('saved_views', {
    id: uuidv4(), name, object_id, environment_id,
    created_by: created_by || 'unknown',
    is_shared: !!is_shared,
    filters: filters || [],
    visible_field_ids: visible_field_ids || [],
    view_mode: view_mode || 'table',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  res.status(201).json(view);
});

// PATCH /api/saved-views/:id
router.patch('/:id', (req, res) => {
  ensureTable();
  const { name, is_shared, filters, visible_field_ids, view_mode } = req.body;
  const updated = update('saved_views', v => v.id === req.params.id, {
    ...(name !== undefined && { name }),
    ...(is_shared !== undefined && { is_shared: !!is_shared }),
    ...(filters !== undefined && { filters }),
    ...(visible_field_ids !== undefined && { visible_field_ids }),
    ...(view_mode !== undefined && { view_mode }),
    updated_at: new Date().toISOString(),
  });
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});

// DELETE /api/saved-views/:id
router.delete('/:id', (req, res) => {
  ensureTable();
  remove('saved_views', v => v.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
