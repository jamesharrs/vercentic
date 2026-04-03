const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');
const { hasPermission, hasGlobalAction, applyFieldVisibility, applyFieldVisibilityBulk, isSuperAdmin, getHiddenFieldKeys } = require('../middleware/rbac');

// Lazy-load agent engine to avoid circular deps at startup
let agentEngine = null;
const getEngine = () => { if (!agentEngine) agentEngine = require('../agent-engine'); return agentEngine; };

// Lazy-load workflow trigger to avoid circular deps
let _triggerWorkflows = null;
const fireTrigger = (...args) => {
  if (!_triggerWorkflows) {
    try { _triggerWorkflows = require('./workflows').triggerWorkflows; } catch(e) {}
  }
  if (_triggerWorkflows) _triggerWorkflows(...args).catch(()=>{});
};


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
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
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
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

// Cross-object quick search — used by the global search bar

// GET /avatars?ids=id1,id2,id3 — batch fetch person avatars for calendar/UI
router.get('/avatars', (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json([]);
  const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
  const results = idList.map(id => {
    const rec = query('records', r => r.id === id)[0];
    if (!rec) return { id, name: null, photo_url: null };
    const d = rec.data || {};
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.name || d.full_name || null;
    return { id, name, photo_url: d.photo_url || d.profile_photo || null };
  });
  res.json(results);
});

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
  // RBAC: filter by object permission + apply field visibility
  const user = req.currentUser;
  let visible = merged.slice(0, lim);
  if (user && !isSuperAdmin(user)) {
    visible = visible.filter(r => hasPermission(user, r.object_slug, 'view'));
    visible = visible.map(r => applyFieldVisibility(user, r, r.object_id));
  }
  res.json(visible);
});

router.get('/', (req, res) => {
  const { object_id, environment_id, page=1, limit=50, search, sort_dir='desc', filter_key, filter_value, user_id } = req.query;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});

  // Security: if a user ID was sent but user not found in current store context,
  // the user belongs to a different tenant — deny access entirely.
  const requestingUserId = req.headers['x-user-id'];
  if (requestingUserId && !req.currentUser) {
    return res.status(403).json({ error: 'Access denied — invalid session context' });
  }

  // Environment scoping: non-admin users can only query their own environment
  if (req.currentUser) {
    const role = req.currentUser.role || findOne('roles', r => r.id === req.currentUser.role_id);
    const isAdmin = role?.slug === 'super_admin' || role?.slug === 'admin';
    if (!isAdmin && req.currentUser.environment_id && req.currentUser.environment_id !== environment_id) {
      return res.status(403).json({ error: 'Access denied to this environment' });
    }
  }

  // Skip permission check for unauthenticated GET requests (portal/career site visitors)
  if (req.currentUser && checkPerm(req, res, object_id, 'view') === false) return;
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
  const pageRecords = records.slice(start,start+parseInt(limit));
  const visibleRecords = req.currentUser ? applyFieldVisibilityBulk(req.currentUser, pageRecords, object_id) : pageRecords;
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

// Linked jobs for a person — used by Communications "Related to" picker
router.get('/linked-jobs', (req, res) => {
  const { person_id, environment_id } = req.query;
  if (!person_id) return res.status(400).json({ error: 'person_id required' });
  const { getStore } = require('../db/init');
  const store = getStore();
  // Find all pipeline links where this person is linked to a job/object record
  const links = (store.people_links || []).filter(l =>
    (l.person_id === person_id || l.person_record_id === person_id) &&
    (!environment_id || l.environment_id === environment_id)
  );
  // Fetch the target records and return their titles
  const results = links.map(l => {
    const rec = (store.records || []).find(r => r.id === (l.record_id || l.target_record_id) && !r.deleted_at);
    if (!rec) return null;
    const d = rec.data || {};
    const obj = (store.objects || store.object_definitions || []).find(o => o.id === rec.object_id);
    return {
      id: rec.id,
      title: d.job_title || d.title || d.name || d.role_name || 'Untitled',
      object_id: rec.object_id,
      object_name: obj?.name || obj?.plural_name || '',
      stage: l.stage || l.current_stage || null,
    };
  }).filter(Boolean);
  res.json(results);
});

// Look up a record by object slug + sequential record_number (e.g. /people/42)
router.get('/by-number', (req, res) => {
  const { object_slug, number, environment_id } = req.query;
  if (!object_slug || !number || !environment_id)
    return res.status(400).json({ error: 'object_slug, number, environment_id required' });
  const num = parseInt(number, 10);
  if (isNaN(num)) return res.status(400).json({ error: 'number must be an integer' });
  const obj = findOne('objects', o => o.slug === object_slug && o.environment_id === environment_id);
  if (!obj) return res.status(404).json({ error: 'Object not found' });
  const record = findOne('records', r =>
    r.object_id === obj.id &&
    r.environment_id === environment_id &&
    r.record_number === num &&
    !r.deleted_at
  );
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ ...record, object_id: obj.id });
});

router.get('/:id', (req, res) => {
  const r = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!r) return res.status(404).json({error:'Not found'});
  if (req.currentUser && checkPerm(req, res, r.object_id, 'view') === false) return;
  res.json(req.currentUser ? applyFieldVisibility(req.currentUser, r, r.object_id) : r);
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
  // Auto-assign sequential record_number per object (used for clean URLs)
  const _existingNums = query('records', r => r.object_id === object_id && r.environment_id === environment_id)
    .map(r => r.record_number || 0).filter(n => typeof n === 'number' && !isNaN(n));
  const record_number = _existingNums.length > 0 ? Math.max(..._existingNums) + 1 : 1;
  const record = insert('records', {id:uuidv4(),record_number,object_id,environment_id,data:resolvedData,org_unit_id,created_by:created_by||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),deleted_at:null});
  insert('activity', {id:uuidv4(),environment_id,record_id:record.id,object_id,action:'created',actor:created_by||null,changes:resolvedData,created_at:new Date().toISOString()});
  // Fire agent triggers + workflow automation triggers
  getEngine().fireEventTrigger('record_created', record, null).catch(()=>{});
  fireTrigger('record_created', record, []);
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
  fireTrigger('record_updated', updated, changedFields);
  // Fire stage_changed separately if status field changed
  if (changedFields.includes('status')) fireTrigger('stage_changed', updated, changedFields);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { environment_id } = req.query;
  const delRec = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  if (!delRec) return res.status(404).json({error:'Not found'});
  // Verify the record belongs to the requested environment — prevents cross-environment deletes
  if (environment_id && delRec.environment_id !== environment_id) {
    return res.status(403).json({error:'Record does not belong to this environment'});
  }
  if (checkPerm(req, res, delRec.object_id, 'delete') === false) return;
  update('records', r=>r.id===req.params.id, {deleted_at:new Date().toISOString()});
  res.json({deleted:true});
});

router.get('/:id/activity', (req, res) => {
  // RBAC: check view permission on the parent record's object
  const parentRecord = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  if (parentRecord && req.currentUser) {
    if (checkPerm(req, res, parentRecord.object_id, 'view') === false) return;
  }
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

  // RBAC: redact hidden field values from activity entries
  const hiddenKeys = parentRecord ? getHiddenFieldKeys(req.currentUser, parentRecord.object_id) : new Set();
  const redacted = hiddenKeys.size > 0 ? paged.map(a => {
    if (!a.changes) return a;
    const clean = { ...a, changes: { ...a.changes } };
    if (clean.changes.field_key && hiddenKeys.has(clean.changes.field_key)) {
      clean.changes.old_value = '[hidden]';
      clean.changes.new_value = '[hidden]';
    }
    if (typeof clean.changes === 'object' && !clean.changes.field_key) {
      for (const k of hiddenKeys) { if (k in clean.changes) clean.changes[k] = '[hidden]'; }
    }
    return clean;
  }) : paged;

  res.json({ items: redacted, total, page: pg, limit: lm, pages: Math.ceil(total/lm) });
});

module.exports = router;
