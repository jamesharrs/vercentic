const express = require('express');
const router  = express.Router();
const { getStore, saveStore, query } = require('../db/init');

const CONFIG_VERSION = 1;

// ── Export config ─────────────────────────────────────────────────────────────
// GET /api/config/export?environment_id=
router.get('/export', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();

  const objects   = (store.objects   || []).filter(o => o.environment_id === environment_id);
  const objIds    = objects.map(o => o.id);
  const fields    = (store.fields    || []).filter(f => objIds.includes(f.object_id));
  const workflows = (store.workflows || []).filter(w => w.environment_id === environment_id);
  const templates = (store.email_templates || []).filter(t => t.environment_id === environment_id);
  const portals   = (store.portals   || []).filter(p => p.environment_id === environment_id);
  const savedViews= (store.saved_views|| []).filter(v => v.environment_id === environment_id);
  const orgUnits  = (store.org_units || []).filter(u => u.environment_id === environment_id);
  const roles     = (store.roles     || []).filter(r => r.environment_id === environment_id);

  const payload = {
    _meta: {
      version: CONFIG_VERSION,
      exported_at: new Date().toISOString(),
      environment_id,
      environment_name: (store.environments||[]).find(e=>e.id===environment_id)?.name || 'Unknown',
      counts: { objects:objects.length, fields:fields.length, workflows:workflows.length,
                templates:templates.length, portals:portals.length, savedViews:savedViews.length }
    },
    objects, fields, workflows, email_templates: templates,
    portals, saved_views: savedViews, org_units: orgUnits, roles,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="talentos-config-${environment_id.slice(0,8)}-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});


// ── Preview import (dry-run, returns diff) ────────────────────────────────────
// POST /api/config/preview?environment_id=
router.post('/preview', express.json({ limit: '10mb' }), (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const incoming = req.body;
  if (!incoming?._meta) return res.status(400).json({ error: 'Invalid config file — missing _meta' });

  const store   = getStore();
  const diff    = buildDiff(store, incoming, environment_id);
  res.json({ valid: true, meta: incoming._meta, diff });
});

// ── Apply import ──────────────────────────────────────────────────────────────
// POST /api/config/import?environment_id=&mode=merge|replace
router.post('/import', express.json({ limit: '10mb' }), (req, res) => {
  const { environment_id, mode = 'merge' } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const incoming = req.body;
  if (!incoming?._meta) return res.status(400).json({ error: 'Invalid config file — missing _meta' });

  const store = getStore();
  const results = { objects:0, fields:0, workflows:0, email_templates:0, portals:0, saved_views:0 };

  const applyCollection = (storeKey, incoming, matchKey = 'id') => {
    if (!Array.isArray(incoming)) return;
    if (!store[storeKey]) store[storeKey] = [];

    incoming.forEach(item => {
      // Re-scope to target environment
      const patched = { ...item, environment_id };
      const idx = store[storeKey].findIndex(x => x[matchKey] === patched[matchKey]);

      if (mode === 'replace' || idx === -1) {
        if (idx !== -1) store[storeKey][idx] = patched;
        else store[storeKey].push(patched);
      } else {
        // merge — incoming wins on all keys
        store[storeKey][idx] = { ...store[storeKey][idx], ...patched };
      }
      results[storeKey] = (results[storeKey] || 0) + 1;
    });
  };

  applyCollection('objects',         incoming.objects);
  applyCollection('fields',          incoming.fields);
  applyCollection('workflows',       incoming.workflows);
  applyCollection('email_templates', incoming.email_templates);
  applyCollection('portals',         incoming.portals);
  applyCollection('saved_views',     incoming.saved_views);

  saveStore();
  res.json({ success: true, mode, results });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildDiff(store, incoming, environment_id) {
  const diff = {};
  const collections = [
    ['objects', 'objects'], ['fields', 'fields'], ['workflows', 'workflows'],
    ['email_templates', 'email_templates'], ['portals', 'portals'], ['saved_views', 'saved_views'],
  ];

  collections.forEach(([inKey, storeKey]) => {
    const inItems  = Array.isArray(incoming[inKey]) ? incoming[inKey] : [];
    const existing = (store[storeKey] || []).filter(x => x.environment_id === environment_id);
    const existingIds = new Set(existing.map(x => x.id));
    const incomingIds = new Set(inItems.map(x => x.id));

    diff[storeKey] = {
      add:     inItems.filter(x => !existingIds.has(x.id)).map(x => x.name || x.id),
      update:  inItems.filter(x =>  existingIds.has(x.id)).map(x => x.name || x.id),
      remove:  existing.filter(x => !incomingIds.has(x.id)).map(x => x.name || x.id),
    };
  });
  return diff;
}

module.exports = router;
