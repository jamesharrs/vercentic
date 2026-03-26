const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

// Build the full subtree of org_unit_ids rooted at a given id
function getSubtree(rootId, all) {
  const ids = [rootId];
  const children = all.filter(u => u.parent_id === rootId);
  for (const child of children) ids.push(...getSubtree(child.id, all));
  return ids;
}

// GET all org units for an environment
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  const units = query('org_units', u => !environment_id || u.environment_id === environment_id);
  // Attach user count to each unit
  const withCounts = units.map(u => ({
    ...u,
    user_count: query('users', usr => usr.org_unit_id === u.id && usr.status !== 'deactivated').length
  }));
  res.json(withCounts);
});

// GET subtree ids for a user (used by records route for scoping)
router.get('/subtree/:userId', (req, res) => {
  const user = findOne('users', u => u.id === req.params.userId);
  if (!user) return res.json({ ids: [] });
  if (!user.org_unit_id) return res.json({ ids: [] }); // no scoping if unassigned
  const all = query('org_units');
  const ids = getSubtree(user.org_unit_id, all);
  res.json({ ids, org_unit_id: user.org_unit_id });
});

// POST create org unit
router.post('/', (req, res) => {
  const { name, type = 'team', parent_id = null, environment_id, color = '#4361EE' } = req.body;
  if (!name || !environment_id) return res.status(400).json({ error: 'name and environment_id required' });
  const unit = insert('org_units', {
    id: uuidv4(), name, type, parent_id, environment_id, color,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  res.status(201).json(unit);
});

// PATCH update org unit
router.patch('/:id', (req, res) => {
  const { name, type, parent_id, color } = req.body;
  const updates = {};
  if (name      !== undefined) updates.name      = name;
  if (type      !== undefined) updates.type      = type;
  if (parent_id !== undefined) updates.parent_id = parent_id;
  if (color     !== undefined) updates.color     = color;
  const unit = update('org_units', u => u.id === req.params.id, updates);
  if (!unit) return res.status(404).json({ error: 'Not found' });
  res.json(unit);
});

// DELETE org unit (unassign users first)
router.delete('/:id', (req, res) => {
  const unit = findOne('org_units', u => u.id === req.params.id);
  if (!unit) return res.status(404).json({ error: 'Not found' });
  // Reparent children to this unit's parent
  const children = query('org_units', u => u.parent_id === req.params.id);
  for (const child of children) {
    update('org_units', u => u.id === child.id, { parent_id: unit.parent_id });
  }
  // Unassign users
  const users = query('users', u => u.org_unit_id === req.params.id);
  for (const u of users) update('users', x => x.id === u.id, { org_unit_id: null });
  remove('org_units', u => u.id === req.params.id);
  res.json({ deleted: true });
});

// PATCH assign user to org unit
router.patch('/:id/assign-user', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const u = update('users', u => u.id === user_id, { org_unit_id: req.params.id });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
});

// PATCH remove user from org unit
router.patch('/unassign-user/:userId', (req, res) => {
  const u = update('users', u => u.id === req.params.userId, { org_unit_id: null });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
});

module.exports = router;
module.exports.getSubtree = getSubtree;
