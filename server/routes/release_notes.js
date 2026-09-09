'use strict';
const express = require('express');
const router  = express.Router();
const { loadTenantStore, saveStore, storeCache } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
const { isSuperAdmin } = require('../middleware/rbac');

// ── Write authorization ───────────────────────────────────────────────────────
// Release notes are visible to every user on the platform, so creating/editing/
// deleting them must be locked down to either:
//   (a) a logged-in Super Admin (the ReleaseNotesAdmin UI), or
//   (b) the deploy pipeline, authenticated via a shared secret header — used
//       to auto-draft a note after a production release with no user session.
// NOTE: the /api gateway in index.js also lets an x-internal-key-bearing
// request past the session gate for this path; this is the real check.
function requireWriteAccess(req, res, next) {
  const key = process.env.INTERNAL_API_KEY;
  if (key && req.headers['x-internal-key'] === key) return next();
  if (isSuperAdmin(req.currentUser)) return next();
  return res.status(403).json({ error: 'Super Admin access required' });
}

// ── Master store helpers ──────────────────────────────────────────────────────
// Release notes are global (Vercentic-wide), not per-tenant.
// We bypass AsyncLocalStorage entirely and access the master store directly.
//
// IMPORTANT: check storeCache first — same pattern already used by
// middleware/tenant.js and routes/signup.js for master-store access.
// loadTenantStore(null) unconditionally re-reads the JSON file from disk and
// overwrites storeCache['master'] in memory. saveStore() debounces its disk
// write by 150ms — if getMaster() were called again inside that window (e.g.
// the admin UI refetching the list right after a create), the stale on-disk
// copy would clobber the in-memory store, and when the debounced write fires
// 150ms later it persists that stale copy — silently reverting the write
// that was still in flight. Reusing the cached store avoids the race.
function getMaster() {
  return storeCache['master'] || loadTenantStore(null); // null = master store
}
function saveMaster() {
  saveStore('master');
}

// ── Auto-publish scheduled notes ─────────────────────────────────────────────
function autoPublishScheduled() {
  const s = getMaster();
  if (!s.release_notes) return;
  const now = new Date();
  let changed = false;
  s.release_notes = s.release_notes.map(n => {
    if (!n.published && n.scheduled_at && new Date(n.scheduled_at) <= now) {
      changed = true;
      return { ...n, published: true, published_at: n.scheduled_at, updated_at: now.toISOString() };
    }
    return n;
  });
  if (changed) saveMaster();
}

// ── Seed default notes ────────────────────────────────────────────────────────
function seedReleaseNotes() {
  const s = getMaster();
  if (!s.release_notes) s.release_notes = [];
  if (s.release_notes.length > 0) return;
  const notes = [
    { id: uuidv4(), version: '1.0.0', title: 'Platform Launch', summary: 'Initial release of the Vercentic platform.', summary_rich: null, category: 'feature', features: ['Dynamic data model with custom objects and fields', 'People, Jobs, and Talent Pools core objects', 'Record list view with search and filtering', 'Settings with user and role management'], published: true, published_at: '2026-03-07T00:00:00.000Z', scheduled_at: null, display_at_login: false, dismissed_by: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.7.0', title: 'Portal Builder v2', summary: 'Major portal builder upgrade with five new capabilities.', summary_rich: null, category: 'feature', features: ['Multi-step Form widget with progress indicator', 'Nav & Footer editors from within the builder', 'Section Library — 15+ pre-built row templates', 'Portal Analytics — page views, clicks, applications', 'Conditional Row Visibility based on URL parameters'], published: true, published_at: '2026-03-22T00:00:00.000Z', scheduled_at: null, display_at_login: false, dismissed_by: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  s.release_notes = notes;
  saveMaster();
  console.log('[ReleaseNotes] Seeded', notes.length, 'notes into master store');
}

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    seedReleaseNotes();
    autoPublishScheduled();
    const { published_only, user_id } = req.query;
    const s = getMaster();
    let notes = (s.release_notes || []).sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
    if (published_only !== 'false') notes = notes.filter(n => n.published);
    if (user_id) notes = notes.map(n => ({ ...n, dismissed: Array.isArray(n.dismissed_by) && n.dismissed_by.includes(user_id) }));
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /login-modal ──────────────────────────────────────────────────────────
router.get('/login-modal', (req, res) => {
  try {
    seedReleaseNotes();
    autoPublishScheduled();
    const { user_id } = req.query;
    if (!user_id) return res.json([]);
    const s = getMaster();
    const notes = (s.release_notes || [])
      .filter(n => n.published && n.display_at_login && !(Array.isArray(n.dismissed_by) && n.dismissed_by.includes(user_id)))
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    console.log('[ReleaseNotes] login-modal for user', user_id, '→', notes.length, 'notes');
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /:id/dismiss ─────────────────────────────────────────────────────────
router.post('/:id/dismiss', (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const s = getMaster();
    const note = (s.release_notes || []).find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    const dismissed_by = Array.isArray(note.dismissed_by) ? [...note.dismissed_by] : [];
    if (!dismissed_by.includes(user_id)) dismissed_by.push(user_id);
    note.dismissed_by = dismissed_by;
    note.updated_at = new Date().toISOString();
    saveMaster();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const s = getMaster();
  const note = (s.release_notes || []).find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post('/', requireWriteAccess, (req, res) => {
  try {
    const { version, title, summary = '', summary_rich = null, category = 'feature',
            features = [], published = false, scheduled_at = null, display_at_login = false } = req.body;
    if (!version || !title) return res.status(400).json({ error: 'version and title required' });
    const note = {
      id: uuidv4(), version, title, summary, summary_rich, category,
      features: Array.isArray(features) ? features : [],
      published: !!published,
      published_at: published ? new Date().toISOString() : null,
      scheduled_at: scheduled_at || null,
      display_at_login: !!display_at_login,
      dismissed_by: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const s = getMaster();
    if (!s.release_notes) s.release_notes = [];
    s.release_notes.push(note);
    saveMaster();
    res.status(201).json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /:id ────────────────────────────────────────────────────────────────
router.patch('/:id', requireWriteAccess, (req, res) => {
  try {
    const s = getMaster();
    const idx = (s.release_notes || []).findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const existing = s.release_notes[idx];
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.published && !existing.published && !updates.published_at) {
      updates.published_at = new Date().toISOString();
      updates.scheduled_at = null;
    }
    if (updates.published === false) updates.published_at = null;
    if (updates.scheduled_at && !updates.published) { updates.published = false; updates.published_at = null; }
    s.release_notes[idx] = { ...existing, ...updates };
    saveMaster();
    res.json(s.release_notes[idx]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireWriteAccess, (req, res) => {
  try {
    const s = getMaster();
    s.release_notes = (s.release_notes || []).filter(n => n.id !== req.params.id);
    saveMaster();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
