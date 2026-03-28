const express = require('express');
const router  = express.Router();
const { getStore, saveStore } = require('../db/init');
const crypto  = require('crypto');

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ── Collections that are part of environment config ─────────────────────────
const CONFIG_COLLECTIONS = [
  // Core schema
  'objects', 'fields',
  // Workflow config — workflow_steps must follow workflows so IDs are mapped
  'workflows', 'workflow_steps',
  // Communication & templates
  'email_templates',
  // Portals & branding
  'portals', 'brand_kits',
  // Lookup / reference data
  'saved_views', 'org_units', 'roles',
  // Forms & file types
  'forms', 'file_types',
  // Interviews
  'interview_types',
  // Datasets (field option lists)
  'datasets', 'dataset_options',
  // Automation flows
  'flows',
  // Skills library
  'skills',
  // Question bank
  'question_bank_v2', 'question_templates',
  // Company / RPO settings
  'company_profiles', 'rpo_settings', 'company_documents',
];
const DATA_COLLECTIONS   = ['records','communications','relationships','interviews','offers','form_responses','activity_log','people_links','record_workflow_assignments'];

// FK keys that need remapping during promote (sandbox ID → production ID)
const FK_KEYS = ['object_id','workflow_id','form_id','portal_id','dataset_id','lookup_object_id','related_object_id','parent_id'];

// Remap all FK references in an item from sandbox IDs → production IDs
function remapForProduction(item, reverseMap, promoteIdMap) {
  const out = { ...item };
  FK_KEYS.forEach(fk => {
    if (out[fk]) {
      // Check promoteIdMap first (items already promoted this run), then reverseMap (original clone map)
      out[fk] = promoteIdMap[out[fk]] || reverseMap[out[fk]] || out[fk];
    }
  });
  return out;
}
// Collections linked via FK rather than environment_id — must clone/promote AFTER their parent
const LINKED_COLLECTIONS = {
  'workflow_steps':  'workflow_id',
  'dataset_options': 'dataset_id',
};

// ── Obfuscation helpers ──────────────────────────────────────────────────────
const FIRST_NAMES = ['Alex','Jordan','Sam','Casey','Morgan','Taylor','Riley','Quinn','Avery','Blake'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore'];
const COMPANIES   = ['Acme Corp','Globex','Initech','Umbrella Ltd','Hooli','Dunder Mifflin','Vandelay','Massive Dynamic'];
const DOMAINS     = ['example.com','test.org','sandbox.io','demo.net'];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Field type patterns used to detect what kind of data a field contains
const PII_KEYS = /^(first_name|last_name|name|full_name|email|phone|mobile|address|street|city|postcode|zip|dob|date_of_birth|national_id|passport|ssn|linkedin|twitter|instagram|facebook|salary|compensation|pay|bank|iban|account)/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\+\-\(\)]{7,}$/;

function obfuscateValue(key, value) {
  if (value === null || value === undefined || value === '') return value;
  const k = String(key).toLowerCase();
  // Email
  if (k.includes('email') || (typeof value === 'string' && EMAIL_RE.test(value))) {
    const fn = randItem(FIRST_NAMES).toLowerCase();
    return `${fn}${randInt(10,99)}@${randItem(DOMAINS)}`;
  }
  // Phone / mobile
  if (k.includes('phone') || k.includes('mobile') || (typeof value === 'string' && PHONE_RE.test(value))) {
    return `+${randInt(1,99)} ${randInt(100,999)} ${randInt(1000,9999)} ${randInt(1000,9999)}`;
  }
  // Name fields
  if (k === 'first_name') return randItem(FIRST_NAMES);
  if (k === 'last_name')  return randItem(LAST_NAMES);
  if (k.includes('name') && !k.includes('object') && !k.includes('field') && !k.includes('env')) {
    return `${randItem(FIRST_NAMES)} ${randItem(LAST_NAMES)}`;
  }
  // Company
  if (k.includes('company') || k.includes('employer') || k.includes('organisation') || k.includes('organization')) {
    return randItem(COMPANIES);
  }
  // Salary / compensation — replace with a random band
  if (k.includes('salary') || k.includes('compensation') || k.includes('pay') || k.includes('wage')) {
    const base = randInt(3, 25) * 5000;
    return typeof value === 'number' ? base : String(base);
  }
  // Address / postcode
  if (k.includes('address') || k.includes('street')) return `${randInt(1,999)} Example Street`;
  if (k.includes('postcode') || k.includes('zip'))    return `XX${randInt(1,9)} ${randInt(1,9)}XX`;
  // National ID / passport / SSN — mask completely
  if (k.includes('national_id') || k.includes('passport') || k.includes('ssn') || k.includes('iban')) {
    return '***REDACTED***';
  }
  // LinkedIn / social profiles
  if (k.includes('linkedin') || k.includes('twitter') || k.includes('instagram') || k.includes('facebook')) {
    return `https://example.com/sandbox_user_${randInt(100,999)}`;
  }
  // Date of birth — shift by random years
  if ((k.includes('dob') || k.includes('date_of_birth') || k.includes('birth')) && typeof value === 'string') {
    try {
      const d = new Date(value);
      d.setFullYear(d.getFullYear() - randInt(1, 5));
      return d.toISOString().split('T')[0];
    } catch { return value; }
  }
  return value;
}

function obfuscateRecord(record) {
  if (!record.data || typeof record.data !== 'object') return record;
  const obfData = {};
  for (const [k, v] of Object.entries(record.data)) {
    obfData[k] = PII_KEYS.test(k) ? obfuscateValue(k, v) : v;
  }
  return { ...record, data: obfData };
}

function cloneWithNewIds(items, envId, idMap = {}) {
  return items.map(item => {
    const oldId = item.id;
    const newId = uid();
    idMap[oldId] = newId;
    return { ...JSON.parse(JSON.stringify(item)), id: newId, environment_id: envId, _source_id: oldId };
  });
}

// Remap foreign key references (object_id, lookup_object_id, etc.)
function remapReferences(items, idMap) {
  const FK_KEYS = ['object_id','lookup_object_id','related_object_id','workflow_id','form_id','record_id','from_record_id','to_record_id','candidate_id','job_id','portal_id','parent_id','dataset_id','flow_id','step_id','interview_type_id','brand_kit_id'];
  return items.map(item => {
    const patched = { ...item };
    FK_KEYS.forEach(fk => {
      if (patched[fk] && idMap[patched[fk]]) {
        patched[fk] = idMap[patched[fk]];
      }
    });
    return patched;
  });
}

// ── GET /sandboxes — list all sandbox environments ──────────────────────────
router.get('/', (req, res) => {
  const store = getStore();
  const { environment_id } = req.query;
  const sandboxes = (store.sandboxes || []).filter(s => !s.deleted_at);
  if (environment_id) {
    return res.json(sandboxes.filter(s => s.production_env_id === environment_id));
  }
  res.json(sandboxes);
});

// ── GET /sandboxes/:id — get sandbox details + change summary ───────────────
router.get('/:id', (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!sb) return res.status(404).json({ error: 'Sandbox not found' });

  // Compute change summary
  const changes = computeChanges(store, sb);
  res.json({ ...sb, changes });
});

// ── POST /sandboxes/clone — create sandbox from production ──────────────────
router.post('/clone', express.json(), async (req, res) => {
  const { source_env_id, name, include_records, record_limit } = req.body;
  if (!source_env_id || !name) return res.status(400).json({ error: 'source_env_id and name required' });

  const store = getStore();
  if (!store.sandboxes) store.sandboxes = [];
  if (!store.sandbox_snapshots) store.sandbox_snapshots = [];

  // Verify source environment exists
  const sourceEnv = (store.environments || []).find(e => e.id === source_env_id);
  if (!sourceEnv) return res.status(404).json({ error: 'Source environment not found' });

  // Create the sandbox environment
  const sandboxEnvId = uid();
  const sandboxEnv = {
    id: sandboxEnvId,
    name: `${name}`,
    slug: `sandbox-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
    description: `Sandbox cloned from ${sourceEnv.name}`,
    color: '#F59E0B',  // Amber for sandboxes
    is_default: 0,
    is_sandbox: 1,
    created_at: now(), updated_at: now()
  };
  if (!store.environments) store.environments = [];
  store.environments.push(sandboxEnv);

  // Clone all config collections (LINKED_COLLECTIONS handled by FK after parent cloned)
  const idMap = {};
  const clonedCounts = {};

  for (const col of CONFIG_COLLECTIONS) {
    const linkedBy = LINKED_COLLECTIONS[col];

    let sourceItems;
    if (linkedBy) {
      // No environment_id — filter by whether the parent ID was already cloned
      sourceItems = (store[col] || []).filter(i => !i.deleted_at && idMap[i[linkedBy]]);
    } else {
      sourceItems = (store[col] || []).filter(i => i.environment_id === source_env_id && !i.deleted_at);
    }
    if (sourceItems.length === 0) continue;

    const cloned = cloneWithNewIds(sourceItems, sandboxEnvId, idMap);
    const remapped = remapReferences(cloned, idMap);

    if (!store[col]) store[col] = [];
    store[col].push(...remapped);
    clonedCounts[col] = remapped.length;
  }

  // Optionally clone records (always obfuscated — no live PII in sandboxes)
  let recordCount = 0;
  if (include_records) {
    const limit = record_limit || 50;
    for (const col of DATA_COLLECTIONS) {
      const sourceItems = (store[col] || []).filter(i => i.environment_id === source_env_id && !i.deleted_at);
      const toClone = sourceItems.slice(0, col === 'records' ? limit : limit * 2);
      if (toClone.length === 0) continue;

      // Obfuscate PII on all record data before cloning into sandbox
      const obfuscated = col === 'records'
        ? toClone.map(obfuscateRecord)
        : toClone;

      const cloned = cloneWithNewIds(obfuscated, sandboxEnvId, idMap);
      const remapped = remapReferences(cloned, idMap);

      if (!store[col]) store[col] = [];
      store[col].push(...remapped);
      if (col === 'records') recordCount = remapped.length;
    }
  }

  // Save the initial snapshot (baseline for change tracking)
  const snapshot = captureSnapshot(store, sandboxEnvId);
  store.sandbox_snapshots.push({
    id: uid(),
    sandbox_id: null, // will be set below
    type: 'baseline',
    label: 'Initial clone',
    data: snapshot,
    created_at: now()
  });
  const snapshotId = store.sandbox_snapshots[store.sandbox_snapshots.length - 1].id;

  // Create sandbox record
  const sandbox = {
    id: uid(),
    name,
    production_env_id: source_env_id,
    sandbox_env_id: sandboxEnvId,
    baseline_snapshot_id: snapshotId,
    status: 'active',         // active | promoted | archived
    created_by: req.body.user_id || null,
    promoted_at: null,
    promoted_by: null,
    created_at: now(), updated_at: now(),
    id_map: idMap,             // maps source IDs → sandbox IDs
    cloned_counts: clonedCounts,
    record_count: recordCount,
  };
  store.sandboxes.push(sandbox);

  // Update snapshot with sandbox_id
  store.sandbox_snapshots[store.sandbox_snapshots.length - 1].sandbox_id = sandbox.id;

  saveStore();

  res.status(201).json({
    sandbox,
    environment: sandboxEnv,
    cloned: clonedCounts,
    records_cloned: recordCount
  });
});

// ── GET /sandboxes/:id/diff — detailed diff between sandbox and production ──
router.get('/:id/diff', (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!sb) return res.status(404).json({ error: 'Sandbox not found' });

  const diff = buildDetailedDiff(store, sb);
  res.json(diff);
});

// ── POST /sandboxes/:id/promote — promote sandbox changes to production ─────
router.post('/:id/promote', express.json(), (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!sb) return res.status(404).json({ error: 'Sandbox not found' });
  if (sb.status === 'promoted') return res.status(400).json({ error: 'Already promoted' });

  const { selected_changes, include_records } = req.body;
  // selected_changes: { objects: ['id1','id2'], fields: ['id3'], ... }
  // If null/undefined, promote everything

  // Step 1: Snapshot production BEFORE changes (for rollback)
  if (!store.sandbox_snapshots) store.sandbox_snapshots = [];
  const prodSnapshot = captureSnapshot(store, sb.production_env_id);
  const rollbackSnapshotId = uid();
  store.sandbox_snapshots.push({
    id: rollbackSnapshotId,
    sandbox_id: sb.id,
    type: 'pre_promote',
    label: `Production backup before promoting "${sb.name}"`,
    data: prodSnapshot,
    created_at: now()
  });

  // Step 2: Apply changes
  const reverseMap = {};
  Object.entries(sb.id_map || {}).forEach(([src, sbx]) => { reverseMap[sbx] = src; });

  const results = {};

  // Build reverse map: sandbox item id → production item id (for linked collections)
  const promoteIdMap = {};

  for (const col of CONFIG_COLLECTIONS) {
    const linkedBy = LINKED_COLLECTIONS[col];

    let sandboxItems;
    if (linkedBy) {
      // No environment_id — filter by whether the parent was already promoted
      sandboxItems = (store[col] || []).filter(i => !i.deleted_at && promoteIdMap[i[linkedBy]]);
    } else {
      sandboxItems = (store[col] || []).filter(i => i.environment_id === sb.sandbox_env_id && !i.deleted_at);
    }
    if (sandboxItems.length === 0) continue;

    // Filter to selected changes if cherry-picking
    let toPromote = sandboxItems;
    if (selected_changes && selected_changes[col]) {
      const selectedIds = new Set(selected_changes[col]);
      toPromote = sandboxItems.filter(i => selectedIds.has(i.id));
    }

    let promoted = 0;
    toPromote.forEach(sbItem => {
      const sourceId = sbItem._source_id || reverseMap[sbItem.id];
      // Remap FK references: sandbox object/workflow IDs → production IDs
      let prodItem = remapForProduction(
        { ...JSON.parse(JSON.stringify(sbItem)) },
        reverseMap, promoteIdMap
      );

      // Restore to production env
      prodItem.environment_id = sb.production_env_id;
      delete prodItem._source_id;

      if (sourceId) {
        // Update existing item in production
        prodItem.id = sourceId;
        promoteIdMap[sbItem.id] = sourceId; // track for linked collections
        const idx = (store[col] || []).findIndex(i => i.id === sourceId);
        if (idx !== -1) {
          store[col][idx] = { ...store[col][idx], ...prodItem, updated_at: now() };
        } else {
          store[col].push({ ...prodItem, updated_at: now() });
        }
      } else {
        // New item created in sandbox — add to production with new ID
        prodItem.id = uid();
        promoteIdMap[sbItem.id] = prodItem.id; // track for linked collections
        if (!store[col]) store[col] = [];
        store[col].push(prodItem);
      }
      promoted++;
    });

    // Handle deletions: items in baseline but removed from sandbox
    const baselineSnapshot = (store.sandbox_snapshots || []).find(s => s.id === sb.baseline_snapshot_id);
    if (baselineSnapshot?.data?.[col]) {
      const currentSbIds = new Set(sandboxItems.map(i => i._source_id || reverseMap[i.id]).filter(Boolean));
      const baselineSourceIds = baselineSnapshot.data[col].map(i => i._source_id || i.id);
      baselineSourceIds.forEach(srcId => {
        if (!currentSbIds.has(srcId)) {
          // This item existed at baseline but was deleted in sandbox
          if (!selected_changes || (selected_changes[`${col}_deleted`] || []).includes(srcId)) {
            const idx = (store[col] || []).findIndex(i => i.id === srcId && i.environment_id === sb.production_env_id);
            if (idx !== -1) {
              store[col][idx].deleted_at = now();
              promoted++;
            }
          }
        }
      });
    }

    if (promoted > 0) results[col] = promoted;
  }

  // Optionally promote records too
  if (include_records) {
    for (const col of DATA_COLLECTIONS) {
      const sandboxItems = (store[col] || []).filter(i => i.environment_id === sb.sandbox_env_id && !i.deleted_at);
      let promoted = 0;
      sandboxItems.forEach(sbItem => {
        const prodItem = { ...JSON.parse(JSON.stringify(sbItem)) };
        prodItem.environment_id = sb.production_env_id;
        prodItem.id = uid();
        delete prodItem._source_id;
        if (!store[col]) store[col] = [];
        store[col].push(prodItem);
        promoted++;
      });
      if (promoted > 0) results[col] = promoted;
    }
  }

  // Mark sandbox as promoted
  sb.status = 'promoted';
  sb.promoted_at = now();
  sb.promoted_by = req.body.user_id || null;
  sb.rollback_snapshot_id = rollbackSnapshotId;
  sb.promotion_results = results;
  sb.updated_at = now();

  // Log to audit
  if (!store.audit_log) store.audit_log = [];
  store.audit_log.push({
    id: uid(), action: 'sandbox_promoted', entity_type: 'sandbox', entity_id: sb.id,
    details: { sandbox_name: sb.name, results },
    user_id: req.body.user_id || null, created_at: now()
  });

  saveStore();
  res.json({ success: true, results, rollback_snapshot_id: rollbackSnapshotId });
});

// ── POST /sandboxes/:id/rollback — revert production to pre-promote state ───
router.post('/:id/rollback', express.json(), (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id);
  if (!sb) return res.status(404).json({ error: 'Sandbox not found' });
  if (!sb.rollback_snapshot_id) return res.status(400).json({ error: 'No rollback snapshot available' });

  const snapshot = (store.sandbox_snapshots || []).find(s => s.id === sb.rollback_snapshot_id);
  if (!snapshot?.data) return res.status(400).json({ error: 'Rollback snapshot data not found' });

  // Restore each config collection from snapshot
  const results = {};
  for (const col of CONFIG_COLLECTIONS) {
    if (!snapshot.data[col]) continue;

    // Remove current production items for this env
    store[col] = (store[col] || []).filter(i => i.environment_id !== sb.production_env_id);

    // Re-add from snapshot
    store[col].push(...snapshot.data[col]);
    results[col] = snapshot.data[col].length;
  }

  // Mark sandbox
  sb.status = 'rolled_back';
  sb.rolled_back_at = now();
  sb.updated_at = now();

  // Audit
  if (!store.audit_log) store.audit_log = [];
  store.audit_log.push({
    id: uid(), action: 'sandbox_rolled_back', entity_type: 'sandbox', entity_id: sb.id,
    details: { sandbox_name: sb.name, results },
    user_id: req.body.user_id || null, created_at: now()
  });

  saveStore();
  res.json({ success: true, results });
});

// ── DELETE /sandboxes/:id — archive a sandbox ───────────────────────────────
router.delete('/:id', (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id);
  if (!sb) return res.status(404).json({ error: 'Not found' });

  sb.deleted_at = now();
  sb.status = 'archived';
  sb.updated_at = now();

  // Optionally clean up sandbox environment data
  if (req.query.cleanup === 'true') {
    for (const col of [...CONFIG_COLLECTIONS, ...DATA_COLLECTIONS]) {
      store[col] = (store[col] || []).filter(i => i.environment_id !== sb.sandbox_env_id);
    }
    store.environments = (store.environments || []).filter(e => e.id !== sb.sandbox_env_id);
  }

  saveStore();
  res.json({ archived: true });
});

// ── POST /sandboxes/:id/snapshot — save a named snapshot ────────────────────
router.post('/:id/snapshot', express.json(), (req, res) => {
  const store = getStore();
  const sb = (store.sandboxes || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!sb) return res.status(404).json({ error: 'Sandbox not found' });

  const snapshot = captureSnapshot(store, sb.sandbox_env_id);
  if (!store.sandbox_snapshots) store.sandbox_snapshots = [];

  const entry = {
    id: uid(),
    sandbox_id: sb.id,
    type: 'manual',
    label: req.body.label || `Snapshot ${new Date().toLocaleDateString()}`,
    data: snapshot,
    created_at: now()
  };
  store.sandbox_snapshots.push(entry);
  saveStore();

  res.status(201).json({ id: entry.id, label: entry.label, created_at: entry.created_at });
});

// ── GET /sandboxes/:id/snapshots — list snapshots for a sandbox ─────────────
router.get('/:id/snapshots', (req, res) => {
  const store = getStore();
  const snapshots = (store.sandbox_snapshots || [])
    .filter(s => s.sandbox_id === req.params.id)
    .map(s => ({ id: s.id, type: s.type, label: s.label, created_at: s.created_at,
      size: JSON.stringify(s.data || {}).length }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(snapshots);
});


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function captureSnapshot(store, envId) {
  const snap = {};
  for (const col of CONFIG_COLLECTIONS) {
    snap[col] = (store[col] || [])
      .filter(i => i.environment_id === envId && !i.deleted_at)
      .map(i => JSON.parse(JSON.stringify(i)));
  }
  return snap;
}

function computeChanges(store, sb) {
  const baseSnapshot = (store.sandbox_snapshots || []).find(s => s.id === sb.baseline_snapshot_id);
  if (!baseSnapshot?.data) return { total: 0, collections: {} };

  const changes = { total: 0, collections: {} };

  for (const col of CONFIG_COLLECTIONS) {
    const baseline = baseSnapshot.data[col] || [];
    const current  = (store[col] || []).filter(i => i.environment_id === sb.sandbox_env_id && !i.deleted_at);

    const baseIds = new Set(baseline.map(i => i.id));
    const currIds = new Set(current.map(i => i.id));

    const added    = current.filter(i => !baseIds.has(i.id)).length;
    const removed  = baseline.filter(i => !currIds.has(i.id)).length;

    // Modified: compare JSON serialisation
    let modified = 0;
    current.forEach(c => {
      const b = baseline.find(bi => bi.id === c.id);
      if (b) {
        const bClean = { ...b }; delete bClean.updated_at;
        const cClean = { ...c }; delete cClean.updated_at;
        if (JSON.stringify(bClean) !== JSON.stringify(cClean)) modified++;
      }
    });

    const colTotal = added + removed + modified;
    if (colTotal > 0) {
      changes.collections[col] = { added, removed, modified, total: colTotal };
      changes.total += colTotal;
    }
  }

  return changes;
}

function buildDetailedDiff(store, sb) {
  const baseSnapshot = (store.sandbox_snapshots || []).find(s => s.id === sb.baseline_snapshot_id);
  const reverseMap = {};
  Object.entries(sb.id_map || {}).forEach(([src, sbx]) => { reverseMap[sbx] = src; });

  const diff = {};

  for (const col of CONFIG_COLLECTIONS) {
    const baseline = baseSnapshot?.data?.[col] || [];
    const current  = (store[col] || []).filter(i => i.environment_id === sb.sandbox_env_id && !i.deleted_at);

    const baseMap = new Map(baseline.map(i => [i.id, i]));
    const currMap = new Map(current.map(i => [i.id, i]));

    const items = [];

    // Added items (in current but not in baseline)
    current.forEach(c => {
      if (!baseMap.has(c.id)) {
        items.push({
          id: c.id,
          source_id: c._source_id || reverseMap[c.id] || null,
          type: 'added',
          name: c.name || c.api_key || c.job_title || c.slug || c.id,
          item: c,
          before: null, after: c
        });
      }
    });

    // Removed items (in baseline but not in current)
    baseline.forEach(b => {
      if (!currMap.has(b.id)) {
        items.push({
          id: b.id,
          source_id: b._source_id || reverseMap[b.id] || null,
          type: 'removed',
          name: b.name || b.api_key || b.job_title || b.slug || b.id,
          item: b,
          before: b, after: null
        });
      }
    });

    // Modified items
    current.forEach(c => {
      const b = baseMap.get(c.id);
      if (!b) return;
      const bClean = { ...b }; delete bClean.updated_at;
      const cClean = { ...c }; delete cClean.updated_at;
      if (JSON.stringify(bClean) !== JSON.stringify(cClean)) {
        // Find which fields changed
        const changedFields = [];
        const allKeys = new Set([...Object.keys(bClean), ...Object.keys(cClean)]);
        allKeys.forEach(k => {
          if (k === 'id' || k === '_source_id' || k === 'created_at') return;
          const bv = JSON.stringify(bClean[k]);
          const cv = JSON.stringify(cClean[k]);
          if (bv !== cv) changedFields.push({ key: k, before: bClean[k], after: cClean[k] });
        });

        items.push({
          id: c.id,
          source_id: c._source_id || reverseMap[c.id] || null,
          type: 'modified',
          name: c.name || c.api_key || c.job_title || c.slug || c.id,
          item: c,
          before: b, after: c,
          changed_fields: changedFields
        });
      }
    });

    if (items.length > 0) diff[col] = items;
  }

  return diff;
}

module.exports = router;
