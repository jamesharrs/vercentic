const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');
const { v4: uuid } = require('uuid');

// GET /api/reports/:envId  — list saved reports
router.get('/:envId', (req, res) => {
  const store = getStore();
  const reports = (store.reports || []).filter(r => r.envId === req.params.envId);
  res.json(reports);
});

// POST /api/reports/:envId  — save a report
router.post('/:envId', (req, res) => {
  const store = getStore();
  if (!store.reports) store.reports = [];
  const report = {
    id: uuid(),
    envId: req.params.envId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body,
  };
  store.reports.push(report);
  saveStore(store);
  res.status(201).json(report);
});

// PATCH /api/reports/:envId/:id  — update a report
router.patch('/:envId/:id', (req, res) => {
  const store = getStore();
  if (!store.reports) return res.status(404).json({ error: 'Not found' });
  const idx = store.reports.findIndex(r => r.id === req.params.id && r.envId === req.params.envId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.reports[idx] = { ...store.reports[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveStore(store);
  res.json(store.reports[idx]);
});

// DELETE /api/reports/:envId/:id
router.delete('/:envId/:id', (req, res) => {
  const store = getStore();
  if (!store.reports) return res.status(404).json({ error: 'Not found' });
  const idx = store.reports.findIndex(r => r.id === req.params.id && r.envId === req.params.envId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.reports.splice(idx, 1);
  saveStore(store);
  res.json({ ok: true });
});

// POST /api/reports/:envId/run  — execute a report query (no save)
router.post('/:envId/run', (req, res) => {
  const store = getStore();
  const { objectId, columns, filters, groupBy, sortBy, sortDir, limit } = req.body;
  const envId = req.params.envId;

  // Get all records for this object
  // Flatten data field onto each row
  const allRecords = (store.records || [])
    .filter(r => r.environment_id === envId && r.object_id === objectId && !r.deleted_at)
    .map(r => ({ id: r.id, created_at: r.created_at, ...( r.data || {}) }));

  // Apply filters
  let rows = allRecords.filter(row => {
    if (!filters || filters.length === 0) return true;
    return filters.every(f => {
      const val = row[f.field];
      const fval = f.value;
      switch (f.op) {
        case 'eq':  return String(val) === String(fval);
        case 'neq': return String(val) !== String(fval);
        case 'contains': return String(val || '').toLowerCase().includes(String(fval).toLowerCase());
        case 'gt':  return Number(val) > Number(fval);
        case 'lt':  return Number(val) < Number(fval);
        case 'gte': return Number(val) >= Number(fval);
        case 'lte': return Number(val) <= Number(fval);
        case 'empty': return !val || val === '';
        case 'notempty': return val && val !== '';
        default: return true;
      }
    });
  });

  // Project columns
  const cols = columns && columns.length > 0 ? columns : Object.keys(rows[0] || {}).filter(k => !k.startsWith('_'));
  let projected = rows.map(row => {
    const out = {};
    cols.forEach(c => {
      if (c.startsWith('formula:')) return; // handled below
      out[c] = row[c] ?? '';
    });
    return out;
  });

  // Group by
  if (groupBy) {
    const groups = {};
    projected.forEach(row => {
      const key = String(row[groupBy] ?? '(empty)');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    projected = Object.entries(groups).map(([key, groupRows]) => {
      const agg = { [groupBy]: key, _count: groupRows.length };
      // Aggregate numeric cols
      cols.filter(c => !c.startsWith('formula:')).forEach(c => {
        if (c === groupBy) return;
        const nums = groupRows.map(r => Number(r[c])).filter(n => !isNaN(n));
        if (nums.length > 0) {
          agg[c + '_sum'] = nums.reduce((a, b) => a + b, 0);
          agg[c + '_avg'] = agg[c + '_sum'] / nums.length;
          agg[c + '_min'] = Math.min(...nums);
          agg[c + '_max'] = Math.max(...nums);
        }
      });
      return agg;
    });
  }

  // Sort
  if (sortBy) {
    projected.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy];
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'desc' ? nb - na : na - nb;
      return sortDir === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
    });
  }

  // Limit
  const maxRows = Math.min(limit || 500, 2000);
  const total = projected.length;
  projected = projected.slice(0, maxRows);

  res.json({ rows: projected, total, truncated: total > maxRows });
});

module.exports = router;
