'use strict';
// field_visibility — per-role field hiding
// Stored in store.field_visibility: [{ id, role_id, field_id, hidden, created_at }]

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore } = require('../db/init');
const { hasGlobalAction } = require('../middleware/rbac');

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) return null;
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

// GET /api/field-visibility?role_id=&object_id=
// Returns array of { field_id, hidden } for the role/object combo
router.get('/', (req, res) => {
  const { role_id, object_id } = req.query;
  const store = getStore();
  if (!store.field_visibility) store.field_visibility = [];

  let rules = store.field_visibility;
  if (role_id)    rules = rules.filter(r => r.role_id === role_id);
  if (object_id) {
    const fieldIds = query('fields', f => f.object_id === object_id).map(f => f.id);
    rules = rules.filter(r => fieldIds.includes(r.field_id));
  }
  res.json(rules);
});

// PUT /api/field-visibility — bulk set visibility for a role+object
// Body: { role_id, object_id, rules: [{ field_id, hidden }] }
router.put('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const { role_id, object_id, rules } = req.body;
  if (!role_id || !object_id || !Array.isArray(rules))
    return res.status(400).json({ error: 'role_id, object_id and rules[] required' });

  const store = getStore();
  if (!store.field_visibility) store.field_visibility = [];

  const fieldIds = query('fields', f => f.object_id === object_id).map(f => f.id);
  const now = new Date().toISOString();

  // Remove all existing rules for this role+object
  store.field_visibility = store.field_visibility.filter(r =>
    !(r.role_id === role_id && fieldIds.includes(r.field_id))
  );

  // Insert new rules (only hidden:true ones — visible is the default)
  for (const rule of rules) {
    if (rule.hidden) {
      store.field_visibility.push({
        id: uuidv4(), role_id, field_id: rule.field_id,
        hidden: true, created_at: now,
      });
    }
  }

  require('../db/init').saveStore();
  res.json({ saved: rules.length });
});

// DELETE /api/field-visibility/:id
router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  remove('field_visibility', r => r.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
