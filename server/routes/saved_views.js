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
  const views = query('saved_views', v => {
    if (v.object_id !== object_id || v.environment_id !== environment_id) return false;
    if (v.created_by === user_id) return true;
    const sh = v.sharing;
    if (!sh) return !!v.is_shared; // legacy
    if (sh.visibility === 'everyone') return true;
    if (sh.visibility === 'specific') {
      if ((sh.user_ids || []).includes(user_id)) return true;
      // group check done client-side for simplicity
    }
    return false;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(views);
});

// GET /api/saved-views/pinned?environment_id=
router.get('/pinned', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const pinned = query('saved_views', v => v.environment_id === environment_id && v.pinned === true)
    .sort((a, b) => (a.dashboard_position ?? 99) - (b.dashboard_position ?? 99));
  res.json(pinned);
});

// GET /api/saved-views/:id
router.get('/:id', (req, res) => {
  ensureTable();
  const view = query('saved_views', v => v.id === req.params.id)[0];
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json(view);
});

// POST /api/saved-views
router.post('/', (req, res) => {
  ensureTable();
  const { name, object_id, environment_id, created_by, is_shared, filters, filter_chip,
          visible_field_ids, view_mode, pinned, dashboard_position,
          columns, group_by, sort_by, sort_dir, formulas, chart_type, chart_x, chart_y } = req.body;
  if (!name || !object_id || !environment_id) return res.status(400).json({ error: 'name, object_id, environment_id required' });
  const view = insert('saved_views', {
    id: uuidv4(), name, object_id, environment_id,
    created_by: created_by || 'unknown',
    is_shared: !!is_shared,
    sharing: req.body.sharing || { visibility: is_shared ? 'everyone' : 'private', user_ids: [], group_ids: [] },
    filters: filters || [],
    filter_chip: filter_chip || null,
    visible_field_ids: visible_field_ids || [],
    view_mode: view_mode || 'table',
    pinned: !!pinned,
    dashboard_position: dashboard_position ?? null,
    columns: columns || [],
    group_by: group_by || '',
    sort_by: sort_by || '',
    sort_dir: sort_dir || 'desc',
    formulas: formulas || [],
    chart_type: chart_type || 'bar',
    chart_x: chart_x || '',
    chart_y: chart_y || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  res.status(201).json(view);
});

// PATCH /api/saved-views/:id
router.patch('/:id', (req, res) => {
  ensureTable();
  const allowed = ['name','is_shared','filters','visible_field_ids','view_mode','sharing',
                   'pinned','dashboard_position','columns','group_by','sort_by','sort_dir',
                   'formulas','chart_type','chart_x','chart_y','filter_chip'];
  const up = { updated_at: new Date().toISOString() };
  allowed.forEach(k => { if (req.body[k] !== undefined) up[k] = req.body[k]; });
  if (up.is_shared !== undefined) up.is_shared = !!up.is_shared;
  if (up.pinned    !== undefined) up.pinned    = !!up.pinned;
  const updated = update('saved_views', v => v.id === req.params.id, up);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});

// DELETE /api/saved-views/:id
router.delete('/:id', (req, res) => {
  ensureTable();
  remove('saved_views', v => v.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
