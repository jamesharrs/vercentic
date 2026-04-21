const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { createRecordSchema, patchRecordSchema } = require('../validation/schemas');
const { v4: uuidv4 } = require('uuid');
const sanitizeHtml = require('sanitize-html');

// Allowed HTML in rich_text fields — same allowlist as the client DOMPurify config
const RICH_TEXT_OPTIONS = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'h1','h2','h3','h4','h5','h6',
    'u','s','strike','del',
    'table','thead','tbody','tr','th','td',
    'img','pre','code',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*':  ['style','class'],
    'a':  ['href','target','rel'],
    'img':['src','alt','width','height'],
    'th': ['colspan','rowspan','style'],
    'td': ['colspan','rowspan','style'],
  },
  allowedSchemes: ['http','https','mailto'],
};

/** Strip dangerous HTML from rich_text fields before storing. */
function sanitizeRecordData(data, fields) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  (fields || []).forEach(f => {
    if (f.field_type === 'rich_text' && typeof out[f.api_key] === 'string') {
      out[f.api_key] = sanitizeHtml(out[f.api_key], RICH_TEXT_OPTIONS);
    }
  });
  return out;
}
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
  if (a.action && a.action.startsWith('ai_')) return 'ai';
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

  if (search) {
    const _sq = search.toLowerCase();
    records = records.filter(r => {
      if (!r.data) return false;
      // Flat field search
      if (JSON.stringify(r.data).toLowerCase().includes(_sq)) return true;
      return false; // (table rows included via JSON.stringify above)
    });
    // Annotate each record with whether a table row matched (for relevance sorting)
    records.forEach(r => {
      if (!r.data) return;
      for (const v of Object.values(r.data)) {
        if (Array.isArray(v) && v.some(row =>
          Object.values(row).some(c => c != null && String(c).toLowerCase().includes(_sq))
        )) { r._tableMatch = true; break; }
      }
    });
  }
  if (filter_key && filter_value !== undefined) {
    // Resolve $me → current user's full name (or email)
    const resolveMeToken = (val) => {
      if (val !== '$me') return val;
      const u = req.currentUser || req.portalUser;
      if (!u) return val;
      return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || val;
    };
    // Support arrays of filters (filter_key[]=a&filter_value[]=b)
    const keys   = Array.isArray(filter_key)   ? filter_key   : [filter_key];
    const values = Array.isArray(filter_value)  ? filter_value : [filter_value];
    records = records.filter(r => keys.every((k, i) => {
      const fv = resolveMeToken(values[i] ?? '');
      const v  = r.data?.[k];
      if (Array.isArray(v)) return v.some(item => String(item).toLowerCase() === fv.toLowerCase());
      return String(v || '').toLowerCase() === fv.toLowerCase();
    }));
  }
  records.sort((a,b)=>sort_dir==='asc'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
  const total = records.length;
  const start = (parseInt(page)-1)*parseInt(limit);
  const pageRecords = records.slice(start,start+parseInt(limit));
  const visibleRecords = req.currentUser ? applyFieldVisibilityBulk(req.currentUser, pageRecords, object_id) : pageRecords;
  res.json({records:visibleRecords,pagination:{total,page:parseInt(page),limit:parseInt(limit),pages:Math.ceil(total/parseInt(limit))}});
});

// Global activity feed for dashboard — enriched with record/object/actor context
// Cache lookup maps for 10 seconds — avoids rebuilding on every dashboard poll
let _feedCache = { key: null, maps: null, ts: 0 };

router.get('/activity/feed', (req, res) => {
  const { environment_id, limit = 25, types } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const n = Number(limit);

  // Build lookup maps — cached for 10s so rapid dashboard reloads don't re-scan
  const now10 = Date.now();
  if (!_feedCache.maps || _feedCache.key !== environment_id || now10 - _feedCache.ts > 10000) {
    const recordMap = {};
    (store.records || []).filter(r => r.environment_id === environment_id)
      .forEach(r => { recordMap[r.id] = r; });
    const objectMap = {};
    (store.objects || store.object_definitions || []).filter(o => o.environment_id === environment_id)
      .forEach(o => { objectMap[o.id] = o; });
    const userMap = {};
    (store.users || []).forEach(u => { userMap[u.id] = u; });
    _feedCache = { key: environment_id, maps: { recordMap, objectMap, userMap }, ts: now10 };
  }
  const { recordMap, objectMap, userMap } = _feedCache.maps;

  const stripEmoji = s => (s || "").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}]/gu, "").trim();

  // Helper: get display name for a record
  const getRecordName = (rec) => {
    if (!rec) return 'Unknown record';
    const d = rec.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(' ')
      || d.job_title || d.pool_name || d.name || d.title || rec.id.slice(0, 8);
  };
  // Helper: resolve actor
  const resolveActor = (actorId) => {
    if (!actorId) return null;
    const u = userMap[actorId];
    if (u) return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
    return actorId; // may already be a name string
  };

  const entries = [];

  // 1. Activity log entries
  const rawActivity = query('activity', a => a.environment_id === environment_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, n * 3); // over-fetch so we can enrich and dedupe

  rawActivity.forEach(a => {
    const rec = recordMap[a.record_id];
    const obj = objectMap[a.object_id];
    const recordName = getRecordName(rec);
    const actor = resolveActor(a.actor);

    // Map raw action to a friendly type + label
    let type = a.action;
    let label = '';
    let detail = '';
    let icon = 'edit';
    let color = '#4361EE';

    switch (a.action) {
      case 'created':
        label = 'Added'; icon = 'plus'; color = '#0CA678'; break;
      case 'updated':
        label = 'Updated'; icon = 'edit'; color = '#4361EE'; break;
      case 'field_changed': {
        const ch = a.changes || {};
        const fieldName = stripEmoji(ch.field_name || ch.field_key || 'Field');
        label = `${fieldName} changed`;
        const rawVal = ch.new_value != null ? ch.new_value : (ch.old_value != null ? ch.old_value : '');
        detail = Array.isArray(rawVal) ? rawVal.join(', ').slice(0, 60) : String(rawVal).slice(0, 60);
        icon = 'edit'; color = '#4361EE'; break;
      }
      case 'note_added':
        label = 'Note added'; icon = 'message-square'; color = '#7C3AED';
        detail = (a.changes?.preview || '').slice(0, 80); break;
      case 'email_sent':
        label = 'Email sent'; icon = 'mail'; color = '#2563EB';
        detail = a.changes?.subject || ''; break;
      case 'sms_sent':
        label = 'SMS sent'; icon = 'message-circle'; color = '#059669'; break;
      case 'whatsapp_sent':
        label = 'WhatsApp sent'; icon = 'message-circle'; color = '#25D366'; break;
      case 'call_logged':
        label = 'Call logged'; icon = 'phone'; color = '#D97706'; break;
      case 'applied':
        label = 'Applied'; icon = 'file-text'; color = '#7C3AED';
        detail = a.details?.job_title || ''; break;
      default:
        label = a.action.replace(/_/g, ' '); icon = 'activity'; color = '#6B7280';
    }

    entries.push({
      id: a.id, type, label,
      record_id: a.record_id, record_name: recordName,
      object_name: obj?.plural_name || obj?.name || 'Record',
      object_color: obj?.color || '#4361EE',
      object_slug: obj?.slug || '',
      object_id: a.object_id,
      actor, detail, icon, color,
      created_at: a.created_at,
      source: 'activity',
    });
  });

  // 2. Recent interviews (up to n/2)
  const interviews = (store.interviews || [])
    .filter(i => {
      const rec = recordMap[i.candidate_id];
      return rec && rec.environment_id === environment_id;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, Math.ceil(n / 2));

  interviews.forEach(i => {
    const rec = recordMap[i.candidate_id];
    if (!rec) return;
    const obj = objectMap[rec.object_id];
    const d = i.date ? new Date(i.date) : null;
    const dateStr = d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    entries.push({
      id: `int_${i.id}`, type: 'interview_scheduled', label: 'Interview scheduled',
      record_id: i.candidate_id, record_name: getRecordName(rec),
      object_name: obj?.plural_name || 'People', object_color: obj?.color || '#4361EE',
      object_slug: obj?.slug || 'people', object_id: rec.object_id,
      actor: resolveActor(i.created_by),
      detail: [i.interview_type, dateStr, i.format].filter(Boolean).join(' · '),
      icon: 'calendar', color: '#7C3AED',
      created_at: i.created_at, source: 'interview',
    });
  });

  // 3. Recent offers
  const offers = (store.offers || [])
    .filter(o => {
      const rec = recordMap[o.candidate_id];
      return rec && rec.environment_id === environment_id;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, Math.ceil(n / 3));

  offers.forEach(o => {
    const rec = recordMap[o.candidate_id];
    if (!rec) return;
    const obj = objectMap[rec.object_id];
    const statusLabels = { draft: 'Offer drafted', pending_approval: 'Offer pending approval',
      sent: 'Offer sent', accepted: 'Offer accepted', declined: 'Offer declined',
      withdrawn: 'Offer withdrawn', expired: 'Offer expired' };
    const statusColors = { accepted: '#0CA678', declined: '#E03131', sent: '#2563EB', default: '#D97706' };
    entries.push({
      id: `off_${o.id}`, type: `offer_${o.status}`, label: statusLabels[o.status] || 'Offer updated',
      record_id: o.candidate_id, record_name: getRecordName(rec),
      object_name: obj?.plural_name || 'People', object_color: obj?.color || '#4361EE',
      object_slug: obj?.slug || 'people', object_id: rec.object_id,
      actor: resolveActor(o.updated_by || o.created_by),
      detail: o.base_salary ? `${o.currency || 'AED'} ${Number(o.base_salary).toLocaleString()}` : '',
      icon: 'file-check', color: statusColors[o.status] || statusColors.default,
      created_at: o.updated_at || o.created_at, source: 'offer',
    });
  });

  // 4. Pipeline stage changes from people_links
  const stageChanges = (store.people_links || [])
    .filter(l => l.environment_id === environment_id && l.stage_name && l.updated_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, Math.ceil(n / 3));

  stageChanges.forEach(l => {
    const personRec = recordMap[l.person_record_id];
    const targetRec = recordMap[l.target_record_id];
    if (!personRec || !targetRec) return;
    const obj = objectMap[personRec.object_id];
    const targetObj = objectMap[targetRec.object_id];
    const targetName = getRecordName(targetRec);
    entries.push({
      id: `stg_${l.id}`, type: 'stage_changed', label: 'Stage moved',
      record_id: l.person_record_id, record_name: getRecordName(personRec),
      object_name: obj?.plural_name || 'People', object_color: obj?.color || '#4361EE',
      object_slug: obj?.slug || 'people', object_id: personRec.object_id,
      actor: null,
      detail: `${l.stage_name} · ${targetObj?.name || 'Job'}: ${targetName}`,
      icon: 'arrow-right', color: '#F08C00',
      created_at: l.updated_at, source: 'stage',
    });
  });

  // Merge, sort, dedupe, limit
  const typeFilter = types ? types.split(',') : null;
  const sorted = entries
    .filter(e => !typeFilter || typeFilter.includes(e.source))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, n);

  res.json(sorted);
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
    (l.person_id === person_id || l.person_record_id === person_id)
    // Note: intentionally no environment_id filter — person record IDs are globally unique
  );
  // Fetch the target records and return their titles + status
  const { open_only } = req.query; // default: only open records
  const showAll = open_only === 'false';
  const CLOSED_STATUSES = new Set(['closed','filled','cancelled','rejected','withdrawn','archived','inactive','complete','completed','on hold']);
  const results = links.map(l => {
    const rec = (store.records || []).find(r => r.id === (l.record_id || l.target_record_id) && !r.deleted_at);
    if (!rec) return null;
    const d = rec.data || {};
    const status = (d.status || '').toLowerCase();
    const isClosed = CLOSED_STATUSES.has(status);
    if (!showAll && isClosed) return null; // filter closed by default
    const obj = (store.objects || store.object_definitions || []).find(o => o.id === rec.object_id);
    return {
      id: rec.id,
      title: d.job_title || d.title || d.name || d.role_name || 'Untitled',
      object_id: rec.object_id,
      object_name: obj?.name || obj?.plural_name || '',
      stage: l.stage || l.current_stage || null,
      status: d.status || null,
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

// People-links for a specific person record — used by AssessmentsPanel job picker
router.get('/:id/people-links', (req, res) => {
  const store = require('../db/init').getStore();
  const personId = req.params.id;
  const links = (store.people_links || []).filter(l =>
    (l.person_record_id === personId || l.person_id === personId) && !l.deleted_at
  );
  // Enrich with target record name (job title / name)
  const enriched = links.map(l => {
    const targetId = l.target_record_id || l.record_id;
    const target   = (store.records || []).find(r => r.id === targetId && !r.deleted_at);
    const wf       = l.workflow_id ? (store.workflows || []).find(w => w.id === l.workflow_id) : null;
    const steps    = wf ? (wf.steps || []) : [];
    const stage    = steps.find(s => s.id === l.stage_id);
    return {
      ...l,
      target_name: target?.data?.job_title || target?.data?.name || target?.data?.pool_name || targetId?.slice(0,8) || "Job",
      stage_name:  stage?.name || l.stage_name || null,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const r = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!r) return res.status(404).json({error:'Not found'});
  if (req.currentUser && checkPerm(req, res, r.object_id, 'view') === false) return;
  res.json(req.currentUser ? applyFieldVisibility(req.currentUser, r, r.object_id) : r);
});

router.post('/', validate(createRecordSchema), (req, res) => {
  const { object_id, environment_id, data={}, created_by, user_id } = req.body;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});
  if (checkPerm(req, res, object_id, 'create') === false) return;
  const required = query('fields', f=>f.object_id===object_id&&f.is_required);
  const missing = required.filter(f=>!data[f.api_key]&&data[f.api_key]!==0);
  if (missing.length) return res.status(400).json({error:'Missing required fields',missing:missing.map(f=>f.api_key)});
  // Inherit org_unit_id from creating user
  const creator = user_id ? findOne('users', u => u.id === user_id) : null;
  const org_unit_id = creator?.org_unit_id || null;
  // Resolve auto_number fields, then sanitise rich_text HTML before storing
  const fields        = query('fields', f => f.object_id === object_id);
  const resolvedData  = sanitizeRecordData(resolveAutoNumbers(object_id, data), fields);
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

router.patch('/:id', validate(patchRecordSchema), (req, res) => {
  const record = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!record) return res.status(404).json({error:'Not found'});
  if (checkPerm(req, res, record.object_id, 'edit') === false) return;
  const { data, updated_by, field_changes } = req.body;
  // Sanitise rich_text HTML in the patch data before merging into stored record
  const objFields  = query('fields', f => f.object_id === record.object_id);
  const cleanData  = sanitizeRecordData(data, objFields);
  const updated = update('records', r=>r.id===req.params.id, {data:{...record.data,...cleanData},updated_at:new Date().toISOString()});
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

// ── Bulk update multiple records ─────────────────────────────────────────────
router.post('/bulk-update', (req, res) => {
  const { record_ids, field_updates } = req.body;
  if (!Array.isArray(record_ids) || !record_ids.length)
    return res.status(400).json({ error: 'record_ids array required' });
  if (!field_updates || typeof field_updates !== 'object')
    return res.status(400).json({ error: 'field_updates object required' });
  const updated = [], failed = [];
  for (const id of record_ids) {
    try {
      const existing = query('records', r => r.id === id)[0];
      if (!existing) { failed.push(id); continue; }
      const rec = update('records', r => r.id === id, {
        data: { ...existing.data, ...field_updates },
        updated_at: new Date().toISOString(),
      });
      rec ? updated.push(id) : failed.push(id);
    } catch(e) { failed.push(id); }
  }
  res.json({ updated: updated.length, failed: failed.length, updated_ids: updated });
});

// ── Move a person to a pipeline stage ────────────────────────────────────────
router.post('/move-stage', (req, res) => {
  const { person_id, job_id, stage_name } = req.body;
  if (!person_id || !stage_name)
    return res.status(400).json({ error: 'person_id and stage_name required' });
  const store = getStore();
  const links = store.people_links || [];
  const link = links.find(l =>
    l.person_id === person_id &&
    (!job_id || l.target_record_id === job_id) &&
    !l.deleted_at
  );
  if (!link)
    return res.status(404).json({ error: `No pipeline link found for this person${job_id ? ' on this job' : ''}` });
  const workflow = (store.workflows || []).find(w => w.id === link.workflow_id);
  const steps = workflow?.steps || [];
  const step = steps.find(s =>
    s.name?.toLowerCase().includes(stage_name.toLowerCase()) ||
    stage_name.toLowerCase().includes((s.name || '').toLowerCase())
  );
  if (!step && steps.length > 0)
    return res.status(400).json({ error: `Stage "${stage_name}" not found. Available: ${steps.map(s => s.name).join(', ')}` });
  const idx = store.people_links.findIndex(l => l.id === link.id);
  if (idx !== -1) {
    store.people_links[idx].stage_id   = step?.id || null;
    store.people_links[idx].stage_name = step?.name || stage_name;
    store.people_links[idx].updated_at = new Date().toISOString();
    saveStore(store);
  }
  res.json({ success: true, person_id, job_id: link.target_record_id, stage: step?.name || stage_name });
});

// ── DB Query — full-dataset search with system field support ─────────────────
// Supports filtering on data.* fields AND system fields (updated_at, created_at, id)
// Operators: eq, neq, contains, not_contains, gt, lt, gte, lte,
//            before_days (older than N days), after_days (newer than N days),
//            is_empty, not_empty, in, not_in
router.post('/db-query', (req, res) => {
  const { object_id, object_slug, environment_id, filters = [], sort = 'updated_at', sort_dir = 'desc', limit = 100 } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  // Resolve object_id from slug if needed
  let objId = object_id;
  if (!objId && object_slug) {
    const objects = query('objects', o => o.environment_id === environment_id);
    const obj = objects.find(o => o.slug === object_slug);
    if (!obj) return res.status(404).json({ error: `Object "${object_slug}" not found` });
    objId = obj.id;
  }
  if (!objId) return res.status(400).json({ error: 'object_id or object_slug required' });

  const now = Date.now();
  const SYSTEM_FIELDS = new Set(['updated_at', 'created_at', 'id', 'created_by']);

  const applyOp = (fieldVal, op, filterVal) => {
    const strVal = String(fieldVal || '').toLowerCase();
    const fv = String(filterVal || '').toLowerCase();
    switch (op) {
      case 'eq':            return strVal === fv;
      case 'neq':           return strVal !== fv;
      case 'contains':      return strVal.includes(fv);
      case 'not_contains':  return !strVal.includes(fv);
      case 'gt':            return Number(fieldVal) > Number(filterVal);
      case 'lt':            return Number(fieldVal) < Number(filterVal);
      case 'gte':           return Number(fieldVal) >= Number(filterVal);
      case 'lte':           return Number(fieldVal) <= Number(filterVal);
      case 'before_days': { // field date is older than N days ago
        if (!fieldVal) return false;
        const ms = now - new Date(fieldVal).getTime();
        return ms > Number(filterVal) * 24 * 60 * 60 * 1000;
      }
      case 'after_days': { // field date is within last N days
        if (!fieldVal) return false;
        const ms = now - new Date(fieldVal).getTime();
        return ms < Number(filterVal) * 24 * 60 * 60 * 1000;
      }
      case 'is_empty':      return !fieldVal || strVal === '';
      case 'not_empty':     return !!fieldVal && strVal !== '';
      case 'in': {
        const arr = Array.isArray(filterVal) ? filterVal : String(filterVal).split(',').map(s=>s.trim());
        if (Array.isArray(fieldVal)) return fieldVal.some(v => arr.map(a=>a.toLowerCase()).includes(String(v).toLowerCase()));
        return arr.map(a=>a.toLowerCase()).includes(strVal);
      }
      case 'not_in': {
        const arr = Array.isArray(filterVal) ? filterVal : String(filterVal).split(',').map(s=>s.trim());
        if (Array.isArray(fieldVal)) return !fieldVal.some(v => arr.map(a=>a.toLowerCase()).includes(String(v).toLowerCase()));
        return !arr.map(a=>a.toLowerCase()).includes(strVal);
      }
      default: return strVal === fv;
    }
  };

  let records = query('records', r =>
    r.object_id === objId &&
    r.environment_id === environment_id &&
    !r.deleted_at
  );

  // Apply each filter
  for (const f of filters) {
    const { field, op = 'eq', value } = f;
    records = records.filter(r => {
      const fieldVal = SYSTEM_FIELDS.has(field) ? r[field] : r.data?.[field];
      return applyOp(fieldVal, op, value);
    });
  }

  // Sort
  records.sort((a, b) => {
    const av = SYSTEM_FIELDS.has(sort) ? a[sort] : a.data?.[sort];
    const bv = SYSTEM_FIELDS.has(sort) ? b[sort] : b.data?.[sort];
    const dir = sort_dir === 'asc' ? 1 : -1;
    if (!av && !bv) return 0;
    if (!av) return dir;
    if (!bv) return -dir;
    return dir * (av < bv ? -1 : av > bv ? 1 : 0);
  });

  const total = records.length;
  const results = records.slice(0, Math.min(parseInt(limit), 200));

  // Build display-friendly result set
  const display = results.map(r => ({
    id: r.id,
    object_id: r.object_id,
    data: r.data || {},
    created_at: r.created_at,
    updated_at: r.updated_at,
    display_name: [r.data?.first_name, r.data?.last_name].filter(Boolean).join(' ') ||
                  r.data?.job_title || r.data?.name || r.data?.pool_name || 'Untitled',
    display_sub:  r.data?.email || r.data?.department || r.data?.location || r.data?.category || '',
  }));

  res.json({ results: display, total, returned: display.length });
});

module.exports = router;
