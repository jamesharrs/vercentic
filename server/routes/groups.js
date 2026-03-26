// server/routes/groups.js
// User groups for sharing — create groups, assign members, use in share targets
const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ── GET /api/groups — list all groups for an environment ──────────────────────
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  const groups = query('groups', g =>
    !g.deleted_at && (!environment_id || g.environment_id === environment_id)
  );
  // Enrich with member count
  const allUsers = query('users', u => !u.deleted_at);
  const enriched = groups.map(g => ({
    ...g,
    member_count: (g.member_ids || []).length,
    members: (g.member_ids || []).map(id => {
      const u = allUsers.find(u => u.id === id);
      return u ? { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email } : null;
    }).filter(Boolean),
  }));
  res.json(enriched);
});

// ── POST /api/groups — create a group ─────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, description, color, environment_id, member_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const group = {
    id: uuidv4(), name, description: description || '',
    color: color || '#4361EE', environment_id,
    member_ids, created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insert('groups', group);
  res.json(group);
});

// ── PATCH /api/groups/:id — update group ──────────────────────────────────────
router.patch('/:id', (req, res) => {
  const group = query('groups', g => g.id === req.params.id)[0];
  if (!group) return res.status(404).json({ error: 'Not found' });
  const updated = update('groups', g => g.id === req.params.id, {
    ...req.body, updated_at: new Date().toISOString(),
  });
  res.json(updated);
});

// ── DELETE /api/groups/:id ─────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  update('groups', g => g.id === req.params.id, {
    deleted_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// ── POST /api/groups/:id/members — add/remove members ────────────────────────
router.post('/:id/members', (req, res) => {
  const { add = [], remove: rem = [] } = req.body;
  const group = query('groups', g => g.id === req.params.id)[0];
  if (!group) return res.status(404).json({ error: 'Not found' });
  let members = [...(group.member_ids || [])];
  members = [...new Set([...members, ...add])];
  members = members.filter(id => !rem.includes(id));
  const updated = update('groups', g => g.id === req.params.id, {
    member_ids: members, updated_at: new Date().toISOString(),
  });
  res.json(updated);
});

module.exports = router;
