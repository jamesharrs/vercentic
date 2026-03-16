const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getStore, saveStore } = require('../db/init');

const uid = () => crypto.randomUUID();

function ensure() {
  const s = getStore();
  if (!s.portals) { s.portals = []; saveStore(); }
}

// GET / — list portals for an environment
router.get('/', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const rows = (store.portals || []).filter(p => p.environment_id === environment_id && !p.deleted_at);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

// GET /:id
router.get('/:id', (req, res) => {
  ensure();
  const store = getStore();
  const portal = (store.portals || []).find(p => p.id === req.params.id && !p.deleted_at);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  res.json(portal);
});

// GET /slug/:slug — public lookup
router.get('/slug/:slug', (req, res) => {
  ensure();
  const store = getStore();
  const portal = (store.portals || []).find(p => p.slug === req.params.slug && p.status === 'published' && !p.deleted_at);
  if (!portal) return res.status(404).json({ error: 'Not found or unpublished' });
  res.json(portal);
});

// POST / — create
router.post('/', (req, res) => {
  ensure();
  const { environment_id, name, slug, status, theme, pages, description } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const store = getStore();
  const now = new Date().toISOString();
  const rec = {
    id: uid(), environment_id, name,
    slug: slug || `/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    description: description || '',
    status: status || 'draft',
    theme: theme || {},
    pages: pages || [],
    deleted_at: null, created_at: now, updated_at: now,
  };
  if (!store.portals) store.portals = [];
  store.portals.push(rec);
  saveStore();
  res.status(201).json(rec);
});

// PATCH /:id — update
router.patch('/:id', (req, res) => {
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Portal not found' });
  const allowed = ['name', 'slug', 'description', 'status', 'theme', 'pages'];
  const updates = { updated_at: new Date().toISOString() };
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  store.portals[idx] = { ...store.portals[idx], ...updates };
  saveStore();
  res.json(store.portals[idx]);
});

// DELETE /:id — soft delete
router.delete('/:id', (req, res) => {
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.portals[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

module.exports = router;
