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
  const slug = req.params.slug.startsWith('/') ? req.params.slug : '/' + req.params.slug;
  const envId = req.query.environment_id; // optional — scopes lookup to specific environment

  const matches = (store.portals || []).filter(p =>
    (p.slug === slug || p.slug === req.params.slug) && p.status === 'published' && !p.deleted_at
    && (!envId || p.environment_id === envId)
  );

  if (matches.length === 0) return res.status(404).json({ error: 'Not found or unpublished' });

  // If multiple matches and no environment filter, return the most recently updated
  const portal = matches.sort((a, b) =>
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )[0];

  res.json({ ...portal, branding: portal.theme || portal.branding || {}, type: portal.type || 'career_site' });
});

// POST / — create
router.post('/', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const { environment_id, name, slug, status, theme, pages, description } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const store = getStore();
  const now = new Date().toISOString();
  const finalSlug = slug || `/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Enforce unique slug within environment
  const existing = (store.portals || []).find(p =>
    p.environment_id === environment_id && !p.deleted_at &&
    (p.slug === finalSlug || p.slug === finalSlug.replace(/^\//, ''))
  );
  if (existing) return res.status(409).json({ error: `Slug "${finalSlug}" already exists in this environment`, existing_id: existing.id });

  const rec = {
    id: uid(), environment_id, name,
    slug: finalSlug,
    description: description || '',
    status: status || 'draft',
    access_type: req.body.access_type || 'public',
    allowed_roles: req.body.allowed_roles || [],
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
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Portal not found' });

  // If slug is being changed, enforce uniqueness within environment
  if (req.body.slug) {
    const portal = store.portals[idx];
    const newSlug = req.body.slug;
    const conflict = (store.portals || []).find(p =>
      p.id !== req.params.id && p.environment_id === portal.environment_id && !p.deleted_at &&
      (p.slug === newSlug || p.slug === newSlug.replace(/^\//, '') || ('/' + p.slug.replace(/^\//, '')) === newSlug)
    );
    if (conflict) return res.status(409).json({ error: `Slug "${newSlug}" already exists in this environment`, existing_id: conflict.id });
  }

  const allowed = ['name', 'slug', 'description', 'status', 'theme', 'pages', 'nav', 'footer', 'branding', 'gdpr', 'feedback', 'config', 'custom_domain', 'type', 'access_type', 'allowed_roles'];
  const updates = { updated_at: new Date().toISOString() };
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  store.portals[idx] = { ...store.portals[idx], ...updates };
  saveStore();
  res.json(store.portals[idx]);
});

// PATCH /:id/widget-config — surgically update a single widget's config
router.patch('/:id/widget-config', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Portal not found' });
  const { pageIndex = 0, rowIndex, cellIndex = 0, widgetConfig } = req.body;
  if (rowIndex === undefined || !widgetConfig) return res.status(400).json({ error: 'rowIndex and widgetConfig required' });
  const portal = store.portals[idx];
  const page = portal.pages?.[pageIndex];
  if (!page) return res.status(400).json({ error: 'Page not found at index ' + pageIndex });
  const row = page.rows?.[rowIndex];
  if (!row) return res.status(400).json({ error: 'Row not found at index ' + rowIndex });
  const cell = row.cells?.[cellIndex];
  if (!cell) return res.status(400).json({ error: 'Cell not found at index ' + cellIndex });
  cell.widgetConfig = { ...cell.widgetConfig, ...widgetConfig };
  portal.updated_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true, widgetConfig: cell.widgetConfig });
});

// DELETE /:id — soft delete
router.delete('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.portals[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// POST /cleanup — deduplicate portals within each environment (keeps most recently updated)
router.post('/cleanup', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const portals = (store.portals || []).filter(p => !p.deleted_at);
  const seen = {};
  const removed = [];
  portals.forEach(p => {
    const key = `${p.environment_id}::${(p.slug || '').replace(/^\//, '').toLowerCase()}`;
    if (!seen[key]) seen[key] = [];
    seen[key].push(p);
  });
  Object.values(seen).forEach(group => {
    if (group.length <= 1) return;
    group.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    for (let i = 1; i < group.length; i++) {
      const idx = store.portals.findIndex(p => p.id === group[i].id);
      if (idx !== -1) {
        store.portals[idx].deleted_at = new Date().toISOString();
        removed.push({ id: group[i].id, name: group[i].name, slug: group[i].slug });
      }
    }
  });
  if (removed.length > 0) saveStore();
  res.json({ cleaned: removed.length, removed });
});


// ── Job Alerts signup ─────────────────────────────────────────────────────────
router.post('/job-alerts', (req, res) => {
  const { portal_id, environment_id, email, keywords, department } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { insert } = require('../db/init');
  insert('job_alerts', {
    portal_id: portal_id || null,
    environment_id: environment_id || null,
    email,
    keywords: keywords || '',
    department: department || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// ── Application status lookup ─────────────────────────────────────────────────
router.get('/application-status', (req, res) => {
  const { portal_id, email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { query } = require('../db/init');
  const people = query('records', function(r) {
    return (r.data && r.data.email || '').toLowerCase() === email.toLowerCase();
  });
  if (!people.length) return res.json({ applications: [] });
  const links = query('people_links', function(l) {
    return people.some(function(p) { return p.id === l.person_id; });
  });
  const applications = links.map(function(link) {
    return {
      job_title: link.target_title || 'Application',
      status: link.stage || 'Submitted',
      reference: (link.id || '').slice(0, 8).toUpperCase(),
      applied_at: link.created_at,
      message: null,
    };
  });
  res.json({ applications: applications });
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

// GET /api/portals/public/application/:personId
// Returns application status for a candidate — public endpoint (no auth)
router.get('/public/application/:personId', (req, res) => {
  try {
    const store = getStore();
    const person = (store.records || []).find(r => r.id === req.params.personId);
    if (!person) return res.status(404).json({ error: 'Application not found' });

    // Find applications (activity entries for this person)
    const applications = (store.activity || [])
      .filter(a => a.record_id === person.id && a.action === 'applied')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // For each application find the job and pipeline stage
    const enriched = applications.map(app => {
      const { job_id, job_title, portal_name } = app.details || {};
      // Find pipeline stage if linked
      const links = (store.people_links || [])
        .filter(l => l.person_id === person.id && (!job_id || l.record_id === job_id));
      const stageLink = links[0];
      let stageLabel = null;
      if (stageLink) {
        // Look up the workflow step name
        const wf = (store.workflows || []).find(w => w.id === stageLink.workflow_id);
        const step = (wf?.steps || []).find(s => s.id === stageLink.stage_id);
        stageLabel = step?.name || stageLink.stage_id;
      }
      return {
        applied_at: app.created_at,
        job_id, job_title, portal_name,
        stage: stageLabel,
        status: stageLabel ? 'In progress' : 'Under review',
      };
    });

    res.json({
      person: {
        first_name: person.data?.first_name || '',
        last_name:  person.data?.last_name  || '',
        email:      person.data?.email      || '',
      },
      applications: enriched,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
