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

// ── Career site: submit application ──────────────────────────────────────────
// POST /api/portals/:id/apply
// Creates a Person record + activity log entry for the application.
// Public endpoint — no auth required (portal candidates aren't users).
router.post('/:id/apply', async (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    const { first_name, last_name, email, phone, cover_note, job_id, job_title } = req.body;
    if (!email || !first_name) return res.status(400).json({ error: 'first_name and email required' });

    // Find the People object for this environment
    const peopleObj = (store.objects || []).find(
      o => o.environment_id === portal.environment_id && o.slug === 'people'
    );
    if (!peopleObj) return res.status(400).json({ error: 'People object not found' });

    // Check for duplicate — don't create two records for the same email
    const existing = (store.records || []).find(
      r => r.object_id === peopleObj.id && r.data?.email === email
    );

    let personRecord;
    if (existing) {
      personRecord = existing;
    } else {
      personRecord = {
        id: uid(), object_id: peopleObj.id, environment_id: portal.environment_id,
        data: { first_name, last_name: last_name || '', email, phone: phone || '',
                status: 'Active', source: 'Career Site', person_type: 'Candidate' },
        created_by: 'portal', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (!store.records) store.records = [];
      store.records.push(personRecord);
    }

    // Log the application in activity
    if (!store.activity) store.activity = [];
    store.activity.push({
      id: uid(), record_id: personRecord.id, object_id: peopleObj.id,
      environment_id: portal.environment_id,
      action: 'applied', actor: 'portal',
      details: { job_id, job_title, portal_id: portal.id, portal_name: portal.name, cover_note },
      created_at: new Date().toISOString(),
    });

    // Add a note with cover letter if provided
    if (cover_note) {
      if (!store.notes) store.notes = [];
      store.notes.push({
        id: uid(), record_id: personRecord.id,
        content: `Applied via ${portal.name || 'career site'}${job_title ? ` for ${job_title}` : ''}.\n\n${cover_note}`,
        author: 'Career Site', source: 'portal', created_at: new Date().toISOString(),
      });
    }

    saveStore();
    res.json({ success: true, person_id: personRecord.id, is_new: !existing });
  } catch (e) {
    console.error('Apply error:', e);
    res.status(500).json({ error: e.message });
  }
});
