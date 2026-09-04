const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

// Wraps async route handlers so unhandled promise rejections flow to Express
// global error handler instead of silently crashing the request.
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);


// Ensure saved_views table exists
function ensureTable() {
  const store = getStore();
  if (!store.saved_views) { store.saved_views = []; saveStore(); }
}

// ── Filter matching engine ─────────────────────────────────────────────────
// Server-side port of client/src/Records.jsx's testFilter/applyFilters, so a
// saved view's filters can be executed without any browser-side app state —
// used by portal widgets (Hiring Manager shortlist, etc.) and any other
// server-driven consumer. Keep in sync with the client implementation if the
// operator vocabulary changes there.
function _matchesMeServer(rawVal, field, op, meCtx) {
  if (!meCtx) return false;
  if (field?.field_type === 'people' || field?.field_type === 'multi_lookup') {
    const arr = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);
    const matched = arr.some(p => {
      const pid = typeof p === 'object' ? p.id : p;
      const pname = typeof p === 'object' ? String(p.name || '').toLowerCase() : '';
      return pid === meCtx.personRecordId || pid === meCtx.userId || pname === (meCtx.fullName || '').toLowerCase();
    });
    return (op === 'is not' || op === 'excludes') ? !matched : matched;
  }
  if (field?.field_type === 'email') {
    const sv = String(rawVal || '').toLowerCase();
    if (op === 'is' || op === '=') return sv === meCtx.email;
    if (op === 'is not' || op === '≠') return sv !== meCtx.email;
    if (op === 'contains') return sv.includes(meCtx.email);
    return sv === meCtx.email;
  }
  const sv = String(rawVal || '').toLowerCase(), mn = (meCtx.fullName || '').toLowerCase();
  if (op === 'is' || op === '=') return sv === mn;
  if (op === 'is not' || op === '≠') return sv !== mn;
  if (op === 'contains') return sv.includes(mn);
  if (op === 'does not contain') return !sv.includes(mn);
  return sv === mn;
}

function _testFilterServer(filt, fields, record, meCtx) {
  const field = fields.find(f => f.id === filt.fieldId);
  if (!field) return true;
  const rawVal = record.data ? record.data[field.api_key] : undefined;
  const op = filt.op; const fv = filt.value;
  if (fv === '$me') return _matchesMeServer(rawVal, field, op, meCtx);
  if (op === 'is empty')     return rawVal === null || rawVal === undefined || rawVal === '' || (Array.isArray(rawVal) && rawVal.length === 0);
  if (op === 'is not empty') return rawVal !== null && rawVal !== undefined && rawVal !== '' && !(Array.isArray(rawVal) && rawVal.length === 0);
  if (op === 'is true')      return rawVal === true;
  if (op === 'is false')     return rawVal === false || rawVal === undefined || rawVal === null;
  const strVal = String(rawVal ?? '').toLowerCase();
  const strFv  = String(fv ?? '').toLowerCase();
  switch (op) {
    case 'contains':          return strVal.includes(strFv);
    case 'does not contain':  return !strVal.includes(strFv);
    case 'starts with':       return strVal.startsWith(strFv);
    case 'is':                return strVal === strFv;
    case 'is not':            return strVal !== strFv;
    case '=':                 return Number(rawVal) === Number(fv);
    case '≠':                 return Number(rawVal) !== Number(fv);
    case '<': case 'before':  return Number(rawVal) < Number(fv) || new Date(rawVal) < new Date(fv);
    case '>': case 'after':   return Number(rawVal) > Number(fv) || new Date(rawVal) > new Date(fv);
    case '≤':                 return Number(rawVal) <= Number(fv);
    case '≥':                 return Number(rawVal) >= Number(fv);
    case 'includes':          return Array.isArray(rawVal) ? rawVal.some(v => String(v).toLowerCase() === strFv) : strVal === strFv;
    case 'excludes':          return Array.isArray(rawVal) ? !rawVal.some(v => String(v).toLowerCase() === strFv) : strVal !== strFv;
    default:                  return true;
  }
}

function _applyFiltersServer(records, filters, fields, meCtx) {
  if (!filters || !filters.length) return records;
  return records.filter(record => {
    let result = null;
    for (const filt of filters) {
      const logic = filt.rowLogic || 'AND';
      const matches = _testFilterServer(filt, fields, record, meCtx);
      if (result === null) result = matches;
      else if (logic === 'OR') result = result || matches;
      else result = result && matches;
    }
    return result ?? true;
  });
}

// GET /api/saved-views?object_id=&environment_id=&user_id=
router.get('/', (req, res) => {
  ensureTable();
  const { object_id, environment_id, user_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const views = query('saved_views', v => {
    if (v.deleted_at) return false; // exclude soft-deleted
    if (v.environment_id !== environment_id) return false;
    // If object_id is supplied, filter to that object only
    if (object_id && v.object_id !== object_id) return false;
    if (user_id === 'system') return true; // widget config bypass — show all lists
    if (!user_id) return true; // no user filter — return all
    if (v.created_by === user_id) return true;
    const sh = v.sharing;
    if (!sh) return !!v.is_shared; // legacy
    if (sh.visibility === 'everyone') return true;
    if (sh.visibility === 'specific') {
      if ((sh.user_ids || []).includes(user_id)) return true;
    }
    return false;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(views);
});

// GET /api/saved-views/pinned?environment_id=
router.get('/pinned', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const pinned = query('saved_views', v => v.environment_id === environment_id && v.pinned === true)
    .sort((a, b) => (a.dashboard_position ?? 99) - (b.dashboard_position ?? 99));
  res.json(pinned);
});

// GET /api/saved-views/portal-lists?environment_id= — lists marked portal_visible
router.get('/portal-lists', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const lists = query('saved_views', v =>
    v.environment_id === environment_id && v.portal_visible === true
  );
  res.json(lists);
});

// GET /api/saved-views/all-reports?environment_id= — saved views usable as report widgets
router.get('/all-reports', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const reports = query('saved_views', v =>
    v.environment_id === environment_id &&
    !!(v.chart_type || v.group_by || (Array.isArray(v.formulas) && v.formulas.length))
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(reports);
});

// GET /api/saved-views/:id
router.get('/:id', (req, res) => {
  ensureTable();
  const view = query('saved_views', v => v.id === req.params.id)[0];
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json(view);
});

// GET /api/saved-views/:id/run?environment_id=&viewer_email=
// Executes a saved view's filters against live records, server-side —
// no browser app-state required. Primary consumer: portal widgets (e.g. the
// Hiring Manager Portal's configurable candidate shortlist), where the admin
// picks a Saved View to define "who needs review" and the portal has to
// resolve that filter itself with only an environment_id + viewer identity.
// viewer_email lets filters using the "$me" dynamic token resolve against the
// requesting viewer (matched to a platform user + Person record by email).
router.get('/:id/run', (req, res) => {
  ensureTable();
  const { environment_id, viewer_email } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const view = query('saved_views', v => v.id === req.params.id && !v.deleted_at)[0];
  if (!view || view.environment_id !== environment_id) return res.status(404).json({ error: 'View not found' });

  const store  = getStore();
  const fields = (store.fields || store.field_definitions || []).filter(f => f.object_id === view.object_id);
  let records  = (store.records || []).filter(r =>
    r.object_id === view.object_id && r.environment_id === environment_id && !r.deleted_at
  );

  let meCtx = null;
  if (viewer_email) {
    const emailLc = String(viewer_email).toLowerCase();
    const user = (store.users || []).find(u => (u.email || '').toLowerCase() === emailLc);
    const peopleObj = (store.objects || store.object_definitions || [])
      .find(o => o.environment_id === environment_id && (o.slug === 'people' || o.name === 'People'));
    const personMatch = peopleObj
      ? (store.records || []).find(r => r.object_id === peopleObj.id && r.environment_id === environment_id &&
          (r.data?.email || '').toLowerCase() === emailLc)
      : null;
    meCtx = {
      userId: user?.id || null,
      email: emailLc,
      fullName: user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '',
      personRecordId: personMatch?.id || null,
    };
  }

  records = _applyFiltersServer(records, view.filters || [], fields, meCtx);

  if (view.sort_by) {
    const sf  = fields.find(f => f.api_key === view.sort_by || f.id === view.sort_by);
    const dir = view.sort_dir === 'asc' ? 1 : -1;
    records = [...records].sort((a, b) => {
      const av = sf ? a.data?.[sf.api_key] : a[view.sort_by];
      const bv = sf ? b.data?.[sf.api_key] : b[view.sort_by];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  res.json({ view_id: view.id, object_id: view.object_id, count: records.length, records });
});

// POST /api/saved-views
router.post('/', (req, res) => {
  ensureTable();
  const { name, object_id, environment_id, created_by, is_shared, filters, filter_chip,
          visible_field_ids, view_mode, pinned, dashboard_position,
          columns, group_by, sort_by, sort_dir, formulas, chart_type, chart_x, chart_y } = req.body;
  if (!name || !object_id || !environment_id) return res.status(400).json({ error: 'name, object_id, environment_id required' });
  const view = insert('saved_views', {
    id: uuidv4(), name, object_id, environment_id,
    created_by: created_by || 'unknown',
    is_shared: !!is_shared,
    sharing: req.body.sharing || { visibility: is_shared ? 'everyone' : 'private', user_ids: [], group_ids: [] },
    filters: filters || [],
    filter_chip: filter_chip || null,
    visible_field_ids: visible_field_ids || [],
    view_mode: view_mode || 'table',
    pinned: !!pinned,
    dashboard_position: dashboard_position ?? null,
    columns: columns || [],
    group_by: group_by || '',
    sort_by: sort_by || '',
    sort_dir: sort_dir || 'desc',
    formulas: formulas || [],
    chart_type: chart_type || 'bar',
    chart_x: chart_x || '',
    chart_y: chart_y || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  res.status(201).json(view);
});

// PATCH /api/saved-views/:id
router.patch('/:id', (req, res) => {
  ensureTable();
  const allowed = ['name','is_shared','filters','visible_field_ids','view_mode','sharing',
                   'pinned','dashboard_position','columns','group_by','sort_by','sort_dir',
                   'formulas','chart_type','chart_x','chart_y','filter_chip',
                   'portal_visible','portal_label','portal_icon'];
  const up = { updated_at: new Date().toISOString() };
  allowed.forEach(k => { if (req.body[k] !== undefined) up[k] = req.body[k]; });
  if (up.is_shared !== undefined) up.is_shared = !!up.is_shared;
  if (up.pinned    !== undefined) up.pinned    = !!up.pinned;
  const updated = update('saved_views', v => v.id === req.params.id, up);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});

// DELETE /api/saved-views/:id — soft delete (survives 24h for recovery)
router.delete('/:id', (req, res) => {
  ensureTable();
  const store = getStore();
  const view = (store.saved_views || []).find(v => v.id === req.params.id);
  if (!view) return res.status(404).json({ error: 'Not found' });
  view.deleted_at = new Date().toISOString();
  view.updated_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// POST /api/saved-views/:id/restore — restore a soft-deleted report
router.post('/:id/restore', (req, res) => {
  ensureTable();
  const store = getStore();
  const view = (store.saved_views || []).find(v => v.id === req.params.id);
  if (!view) return res.status(404).json({ error: 'Not found' });
  delete view.deleted_at;
  view.updated_at = new Date().toISOString();
  saveStore();
  res.json(view);
});

// GET /api/saved-views/recently-deleted?environment_id=
router.get('/recently-deleted', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const deleted = query('saved_views', v =>
    v.environment_id === environment_id &&
    v.deleted_at && v.deleted_at >= cutoff
  ).sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
  res.json(deleted);
});

// Exported for reuse by other server-side consumers that need to run a saved
// view's filters without an internal HTTP round-trip — e.g. the Hiring
// Manager Portal wrapper routes (server/routes/hm_portal.js), which build the
// same meCtx shape themselves (email/userId/fullName/personRecordId) before
// calling applyFiltersServer directly.
module.exports = router;
module.exports.applyFiltersServer = _applyFiltersServer;
module.exports.testFilterServer = _testFilterServer;
module.exports.matchesMeServer = _matchesMeServer;
