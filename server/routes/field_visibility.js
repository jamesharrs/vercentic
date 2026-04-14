'use strict';
// field_visibility — per-role field hiding
// Stored in store.field_visibility: [{ id, role_id, field_id, hidden, created_at }]

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore } = require('../db/init');
const { hasGlobalAction } = require('../middleware/rbac');
const { logFieldVisibilityChange } = require('../middleware/security-audit');

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

// GET /api/field-visibility?role_id=&object_id=&field_id=
router.get('/', (req, res) => {
  const { role_id, object_id, field_id } = req.query;
  const store = getStore();
  if (!store.field_visibility) store.field_visibility = [];

  let rules = store.field_visibility;
  if (role_id)    rules = rules.filter(r => r.role_id === role_id);
  if (field_id)   rules = rules.filter(r => r.field_id === field_id);
  if (object_id) {
    const fieldIds = query('fields', f => f.object_id === object_id).map(f => f.id);
    rules = rules.filter(r => fieldIds.includes(r.field_id));
  }
  res.json(rules);
});

// PUT /api/field-visibility — set visibility for a role+object (bulk) or role+field (single)
// Bulk:  body: { role_id, object_id, rules: [{ field_id, hidden }] }
// Single: body: { role_id, object_id, rules: [{ field_id, hidden }] }  ← same shape, single-item rules
router.put('/', (req, res) => {
  try {
    if (checkGlobal(req, res, 'manage_settings') === false) return;
    const { role_id, object_id, rules } = req.body;
    if (!role_id || !object_id || !Array.isArray(rules))
      return res.status(400).json({ error: 'role_id, object_id and rules[] required' });

    const store = getStore();
    if (!store.field_visibility) store.field_visibility = [];

    const now = new Date().toISOString();

    // If single-field save (rules has exactly 1 item), only touch that field's rule for this role
    if (rules.length === 1 && rules[0].field_id) {
      const { field_id, hidden } = rules[0];
      store.field_visibility = store.field_visibility.filter(r =>
        !(r.role_id === role_id && r.field_id === field_id)
      );
      if (hidden) {
        store.field_visibility.push({ id: uuidv4(), role_id, field_id, hidden: true, created_at: now });
      }
    } else {
      // Bulk: replace all rules for this role+object
      const fieldIds = query('fields', f => f.object_id === object_id).map(f => f.id);
      store.field_visibility = store.field_visibility.filter(r =>
        !(r.role_id === role_id && fieldIds.includes(r.field_id))
      );
      for (const rule of rules) {
        if (rule.hidden) {
          store.field_visibility.push({ id: uuidv4(), role_id, field_id: rule.field_id, hidden: true, created_at: now });
        }
      }
    }

    require('../db/init').saveStore();
    logFieldVisibilityChange(req, role_id, object_id, rules);
    res.json({ saved: rules.length });
  } catch (e) {
    console.error('[field-visibility PUT] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/field-visibility/:id
router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  remove('field_visibility', r => r.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
