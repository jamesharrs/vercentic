'use strict';
const express = require('express');
const router  = express.Router();
const { query, getStore, saveStore } = require('../db/init');

// ── Apply filter logic (mirrors client-side applyFilters) ─────────────────────
function matchesFilter(record, filter, fields) {
  const { field_id, operator, value } = filter;
  const field = fields.find(f => f.id === field_id);
  if (!field) return true; // unknown field — don't filter out
  const rv = record.data?.[field.api_key];

  switch (operator) {
    case 'is':       return String(rv || '').toLowerCase() === String(value).toLowerCase();
    case 'is_not':   return String(rv || '').toLowerCase() !== String(value).toLowerCase();
    case 'contains': return String(rv || '').toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains': return !String(rv || '').toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':  return String(rv || '').toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':    return String(rv || '').toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':     return rv === null || rv === undefined || rv === '' || (Array.isArray(rv) && rv.length === 0);
    case 'is_not_empty': return rv !== null && rv !== undefined && rv !== '' && !(Array.isArray(rv) && rv.length === 0);
    case 'gt':  return Number(rv) > Number(value);
    case 'gte': return Number(rv) >= Number(value);
    case 'lt':  return Number(rv) < Number(value);
    case 'lte': return Number(rv) <= Number(value);
    case 'includes': {
      if (Array.isArray(rv)) return rv.some(v => String(v).toLowerCase() === String(value).toLowerCase());
      return String(rv || '').toLowerCase().includes(String(value).toLowerCase());
    }
    case 'before': return rv && new Date(rv) < new Date(value);
    case 'after':  return rv && new Date(rv) > new Date(value);
    default: return true;
  }
}

function applyFilters(records, filters, fields) {
  if (!filters || !filters.length) return records;
  return records.filter(r => filters.every(f => matchesFilter(r, f, fields)));
}

// ── POST /api/records/bulk-action ─────────────────────────────────────────────
// Runs a bulk action against ALL records matching the provided filters,
// not just the current page. Used for "Select all N matching this filter".
router.post('/bulk-action', (req, res) => {
  try {
    const {
      object_id, environment_id, filters = [],
      action, // 'edit' | 'delete'
      payload = {}, // { field_api_key, value } for edit
      user_role, // for permission check
      user_id,
    } = req.body;

    if (!object_id || !environment_id || !action) {
      return res.status(400).json({ error: 'object_id, environment_id, and action required' });
    }

    // Permission check: delete requires super_admin
    if (action === 'delete' && user_role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super administrators can perform bulk deletions.' });
    }

    const store = getStore();
    const fields = (store.fields || []).filter(f => f.object_id === object_id);
    let records = (store.records || []).filter(r =>
      r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at
    );

    // Apply filters
    records = applyFilters(records, filters, fields);
    const matchCount = records.length;

    if (matchCount === 0) {
      return res.json({ success: true, affected: 0, message: 'No records matched the filters.' });
    }

    const now = new Date().toISOString();
    let affected = 0;

    if (action === 'edit') {
      const { field_api_key, value } = payload;
      if (!field_api_key) return res.status(400).json({ error: 'payload.field_api_key required for edit' });

      const field = fields.find(f => f.api_key === field_api_key);
      let coerced = value;
      if (field) {
        if (field.field_type === 'boolean') coerced = value === true || value === 'true';
        if (field.field_type === 'number' || field.field_type === 'currency') coerced = parseFloat(value) || 0;
      }

      const matchIds = new Set(records.map(r => r.id));
      store.records.forEach((r, idx) => {
        if (matchIds.has(r.id)) {
          store.records[idx].data = { ...r.data, [field_api_key]: coerced };
          store.records[idx].updated_at = now;
          store.records[idx].updated_by = user_id || 'bulk_action';
          affected++;
        }
      });
    }

    if (action === 'delete') {
      const matchIds = new Set(records.map(r => r.id));
      store.records.forEach((r, idx) => {
        if (matchIds.has(r.id)) {
          store.records[idx].deleted_at = now;
          store.records[idx].deleted_by = user_id || 'bulk_action';
          affected++;
        }
      });
    }

    // Log the bulk action
    if (!store.activity_log) store.activity_log = [];
    store.activity_log.push({
      id: require('crypto').randomUUID(),
      action: `bulk_${action}`,
      object_id,
      environment_id,
      details: {
        filters_applied: filters.length,
        records_affected: affected,
        payload: action === 'edit' ? payload : undefined,
      },
      created_by: user_id || 'bulk_action',
      created_at: now,
    });

    saveStore(store);

    res.json({
      success: true,
      affected,
      total_matched: matchCount,
      action,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/records/bulk-count — count records matching filters ──────────────
// Used by the UI to show "Select all N matching this filter" without
// transferring all the record data
router.post('/bulk-count', (req, res) => {
  try {
    const { object_id, environment_id, filters = [] } = req.body;
    if (!object_id || !environment_id) return res.status(400).json({ error: 'object_id and environment_id required' });

    const store = getStore();
    const fields = (store.fields || []).filter(f => f.object_id === object_id);
    let records = (store.records || []).filter(r =>
      r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at
    );
    records = applyFilters(records, filters, fields);
    res.json({ count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
