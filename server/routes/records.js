const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');
const { hasPermission, hasGlobalAction, applyFieldVisibility, applyFieldVisibilityBulk } = require('../middleware/rbac');

// Lazy-load agent engine to avoid circular deps at startup
let agentEngine = null;
const getEngine = () => { if (!agentEngine) agentEngine = require('../agent-engine'); return agentEngine; };


// Resolve object slug for permission checks
function getObjectSlug(objectId) {
  if (!objectId) return null;
  const obj = findOne('objects', o => o.id === objectId);
  return obj ? obj.slug : null;
}

// Categorise an activity entry for filtering
function categorise(a) {
  if (a.action === 'created') return 'created';
  if (a.action === 'field_changed') return 'field_change';
  if (a.action === 'note_added' || a.action === 'note_deleted') return 'note';
  if (['email_sent','sms_sent','whatsapp_sent','call_logged'].includes(a.action)) return 'communication';
  if (a.action === 'file_uploaded' || a.action === 'file_deleted') return 'file';
  if (['stage_changed','linked','unlinked'].includes(a.action)) return 'pipeline';
  if (a.action === 'status_changed') return 'status';
  return 'other';
}

// Auto-number field resolver — sets REQ-0001 style values on new records
function resolveAutoNumbers(objectId, data) {
  const store = getStore();
  const fields = (store.field_definitions || []).filter(f => f.object_id === objectId && f.field_type === 'auto_number');
  if (!fields.length) return data;
  const result = { ...data };
  if (!store.auto_number_counters) store.auto_number_counters = [];
  for (const field of fields) {
    if (result[field.api_key]) continue; // already set (e.g. import)
    const key = `${objectId}:${field.id}`;
    let counter = store.auto_number_counters.find(c => c.key === key);
    if (!counter) { counter = { key, next: 1 }; store.auto_number_counters.push(counter); }
    const prefix = field.auto_number_prefix || '';
    const padding = Number(field.auto_number_padding) || 4;
    result[field.api_key] = `${prefix}${String(counter.next).padStart(padding, '0')}`;
    counter.next += 1;
  }
  saveStore(store);
  return result;
}

// Permission gate — returns 403 if user lacks permission, null if OK
function checkPerm(req, res, objectId, action) {
  const user = req.currentUser;
  if (!user) return null; // no auth = allow (backward compat until full auth wired)
  const slug = getObjectSlug(objectId);
  if (!slug) return null; // unknown object = allow
  if (!hasPermission(user, slug, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { object: slug, action } });
    return false;
  }
  return null;
}

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) return null;
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

// Cross-object quick search — used by the global search bar
router.get('/search', (req, res) => {
  const { q, environment_id, limit=6 } = req.query;
  if (!q || !environment_id) return res.json([]);
  const term = q.toLowerCase();
  const lim  = parseInt(limit);
  const objects = query('objects', o => o.environment_id === environment_id);

  // Collect up to `limit` matches per object so every object type gets representation
  const perObject = [];
  for (const obj of objects) {
    const records = query('records', r => r.object_id === obj.id && r.environment_id === environment_id && !r.deleted_at);
    const hits = [];
    for (const r of records) {
      if (JSON.stringify(r.data).toLowerCase().includes(term)) {
        const d = r.data || {};
        const display_name = [d.first_name, d.last_name].filter(Boolean).join(' ')
          || d.job_title || d.pool_name || d.name || d.title || 'Untitled';
        hits.push({ ...r, object_name: obj.name, object_slug: obj.slug, object_color: obj.color, display_name });
        if (hits.length >= lim) break;
      }
    }
    if (hits.length) perObject.push(hits);
  }

  // Round-robin merge so results are spread across object types
  const merged = [];
  const maxRounds = lim;
  for (let i = 0; i < maxRounds && merged.length < lim * 2; i++) {
    for (const objHits of perObject) {
      if (i < objHits.length) merged.push(objHits[i]);
    }
  }

  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(merged.slice(0, lim));
});

router.get('/', (req, res) => {
  const { object_id, environment_id, page=1, limit=50, search, sort_dir='desc', filter_key, filter_value, user_id } = req.query;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});
  if (checkPerm(req, res, object_id, 'view') === false) return;
  let records = query('records', r=>r.object_id===object_id&&r.environment_id===environment_id&&!r.deleted_at);

  // Org scoping: auto-scoped to currentUser's subtree (or explicit user_id override)
  const scopeUser = req.currentUser || (user_id ? findOne('users', u => u.id === user_id) : null);
  if (scopeUser && scopeUser.org_unit_id) {
    const scopeRole = scopeUser.role || findOne('roles', r => r.id === scopeUser.role_id);
    const isScopeAdmin = scopeRole && (scopeRole.slug === 'super_admin' || scopeRole.slug === 'admin');
    if (!isScopeAdmin) {
      const { getSubtree } = require('./org_units');
      const allUnits = query('org_units');
      const visibleIds = getSubtree(scopeUser.org_unit_id, allUnits);
      records = records.filter(r => !r.org_unit_id || visibleIds.includes(r.org_unit_id));
    }
  }

  if (search) records = records.filter(r=>JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()));
  if (filter_key && filter_value !== undefined) {
    records = records.filter(r => {
      const v = r.data?.[filter_key];
      if (Array.isArray(v)) return v.some(i => String(i).toLowerCase() === filter_value.toLowerCase());
      return String(v || '').toLowerCase() === filter_value.toLowerCase();
    });
  }
  records.sort((a,b)=>sort_dir==='asc'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
  const total = records.length;
  const start = (parseInt(page)-1)*parseInt(limit);
  const visibleRecords = applyFieldVisibilityBulk(req.currentUser, records.slice(start,start+parseInt(limit)), object_id);
  res.json({records:visibleRecords,pagination:{total,page:parseInt(page),limit:parseInt(limit),pages:Math.ceil(total/parseInt(limit))}});
});

// Global activity feed for dashboard — must be before /:id
router.get('/activity/feed', (req, res) => {
  const { environment_id, limit=20 } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const feed = query('activity', a => a.environment_id === environment_id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, Number(limit));
  res.json(feed);
});

// People-links for Client Hub — must be before /:id
router.get('/people-links', (req, res) => {
  const { environment_id } = req.query;
  const links = query('people_links', l =>
    !environment_id || l.environment_id === environment_id
  );
  res.json(links);
});

router.get('/:id', (req, res) => {
  const r = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!r) return res.status(404).json({error:'Not found'});
  if (checkPerm(req, res, r.object_id, 'view') === false) return;
  res.json(applyFieldVisibility(req.currentUser, r, r.object_id));
});

router.post('/', (req, res) => {
  const { object_id, environment_id, data={}, created_by, user_id } = req.body;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});
  if (checkPerm(req, res, object_id, 'create') === false) return;
  const required = query('fields', f=>f.object_id===object_id&&f.is_required);
  const missing = required.filter(f=>!data[f.api_key]&&data[f.api_key]!==0);
  if (missing.length) return res.status(400).json({error:'Missing required fields',missing:missing.map(f=>f.api_key)});
  // Inherit org_unit_id from creating user
  const creator = user_id ? findOne('users', u => u.id === user_id) : null;
  const org_unit_id = creator?.org_unit_id || null;
  // Resolve auto_number fields
  const resolvedData = resolveAutoNumbers(object_id, data);
  const record = insert('records', {id:uuidv4(),object_id,environment_id,data:resolvedData,org_unit_id,created_by:created_by||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),deleted_at:null});
  insert('activity', {id:uuidv4(),environment_id,record_id:record.id,object_id,action:'created',actor:created_by||null,changes:resolvedData,created_at:new Date().toISOString()});
  // Fire agent triggers
  getEngine().fireEventTrigger('record_created', record, null).catch(()=>{});
  res.status(201).json(record);
});

router.patch('/:id', (req, res) => {
  const record = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!record) return res.status(404).json({error:'Not found'});
  if (checkPerm(req, res, record.object_id, 'edit') === false) return;
  const { data, updated_by, field_changes } = req.body;
  const updated = update('records', r=>r.id===req.params.id, {data:{...record.data,...data},updated_at:new Date().toISOString()});
  // If frontend sends rich field_changes array, log one event per field; otherwise log a generic updated event
  if (field_changes && Array.isArray(field_changes) && field_changes.length > 0) {
    for (const fc of field_changes) {
      insert('activity', {id:uuidv4(),environment_id:record.environment_id,record_id:record.id,object_id:record.object_id,
        action:'field_changed',actor:updated_by||null,
        changes:{ field_key:fc.field_key, field_name:fc.field_name, old_value:fc.old_value, new_value:fc.new_value },
        created_at:new Date().toISOString()});
    }
  } else {
    insert('activity', {id:uuidv4(),environment_id:record.environment_id,record_id:record.id,object_id:record.object_id,action:'updated',actor:updated_by||null,changes:data,created_at:new Date().toISOString()});
  }
  // Fire agent triggers — check which fields changed
  const changedFields = Object.keys(data || {});
  getEngine().fireEventTrigger('record_updated', updated, changedFields).catch(()=>{});
  getEngine().fireEventTrigger('stage_changed', updated, changedFields).catch(()=>{});
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const delRec = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!delRec) return res.status(404).json({error:'Not found'});
  if (checkPerm(req, res, delRec.object_id, 'delete') === false) return;
  update('records', r=>r.id===req.params.id, {deleted_at:new Date().toISOString()});
  res.json({deleted:true});
});

router.get('/:id/activity', (req, res) => {
  const { page=1, limit=10, search='', category='' } = req.query;
  let items = query('activity', a => a.record_id === req.params.id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  // Category filter
  if (category && category !== 'all') {
    items = items.filter(a => categorise(a) === category);
  }

  // Search — matches actor, action, field_name, or stringified value
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(a => {
      const haystack = [a.actor, a.action, a.changes?.field_name,
        JSON.stringify(a.changes)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  const total = items.length;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(50, Math.max(1, parseInt(limit)));
  const paged = items.slice((pg-1)*lm, pg*lm);

  res.json({ items: paged, total, page: pg, limit: lm, pages: Math.ceil(total/lm) });
});

module.exports = router;
