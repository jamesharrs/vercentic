// server/db/init.js — Multi-tenant aware data store
const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AsyncLocalStorage } = require('async_hooks');
const pg = require('./postgres');

const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '../../data');

// ── Tenant context ─────────────────────────────────────────────────────────────
const tenantStorage = new AsyncLocalStorage();

// ── Per-tenant in-memory store cache ──────────────────────────────────────────
const storeCache = {};

const EMPTY_STORE = () => ({
  environments: [], objects: [], fields: [], records: [],
  relationships: [], activity: [],
  users: [], roles: [], permissions: [], sessions: [], audit_log: [],
  org_units: [], question_bank: [], bot_sessions: [], scorecards: [],
});

function tenantDbPath(slug) {
  if (!slug || slug === 'master') return path.join(DATA_DIR, 'talentos.json');
  return path.join(DATA_DIR, `tenant-${slug}.json`);
}

function loadTenantStore(slug) {
  const key  = slug || 'master';
  const file = tenantDbPath(slug);
  const base = { ...EMPTY_STORE() };
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(file)) {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      storeCache[key] = { ...base, ...loaded };
    } else {
      storeCache[key] = base;
      try { fs.writeFileSync(file, JSON.stringify(base, null, 2)); } catch(e) {}
      console.log(`Created tenant store: ${file}`);
    }
  } catch(e) {
    console.log(`Error loading store for ${key}:`, e.message);
    storeCache[key] = base;
  }
  return storeCache[key];
}

// ── Core store access ──────────────────────────────────────────────────────────
// Routes call getStore() — it automatically returns the right tenant's store
// for the current HTTP request via AsyncLocalStorage. No route changes needed.
function getCurrentTenant() {
  return tenantStorage.getStore() || 'master';
}

function getStore() {
  const key = getCurrentTenant();
  if (!storeCache[key]) loadTenantStore(key === 'master' ? null : key);
  return storeCache[key];
}

let _saveTimers = {};
function saveStore(slugOverride) {
  const key = slugOverride || getCurrentTenant();
  if (_saveTimers[key]) clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(() => {
    delete _saveTimers[key];
    const store = storeCache[key];
    if (!store) return;
    // JSON fallback (always write locally too — good for dev & backup)
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(tenantDbPath(key === 'master' ? null : key), JSON.stringify(store, null, 2));
    } catch(e) { /* ignore fs errors in read-only environments */ }
    // Postgres write (non-blocking)
    if (pg.isEnabled()) {
      pg.saveTenant(key, store).catch(e => console.error('PG saveStore error:', e.message));
    }
  }, 150);
}

function saveStoreNow(slugOverride) {
  const key = slugOverride || getCurrentTenant();
  if (_saveTimers[key]) { clearTimeout(_saveTimers[key]); delete _saveTimers[key]; }
  const store = storeCache[key];
  if (!store) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(tenantDbPath(key === 'master' ? null : key), JSON.stringify(store, null, 2));
  } catch(e) { /* ignore */ }
  if (pg.isEnabled()) {
    pg.saveTenant(key, store).catch(e => console.error('PG saveStoreNow error:', e.message));
  }
}

function query(table, predicate) {
  return (getStore()[table] || []).filter(predicate || (() => true));
}
function findOne(table, predicate) {
  return (getStore()[table] || []).find(predicate);
}
function insert(table, record) {
  const store = getStore();
  if (!store[table]) store[table] = [];
  store[table].push(record);
  saveStore();
  return record;
}
function update(table, predicate, updates) {
  const store = getStore();
  const idx = store[table].findIndex(predicate);
  if (idx === -1) return null;
  store[table][idx] = { ...store[table][idx], ...updates, updated_at: new Date().toISOString() };
  saveStore();
  return store[table][idx];
}
function remove(table, predicate) {
  const store = getStore();
  const before = store[table].length;
  store[table] = store[table].filter(r => !predicate(r));
  saveStore();
  return before - store[table].length;
}

// ── Provision a new tenant data file ──────────────────────────────────────────
// Called by superadmin_clients.js when provisioning a new client.
// Creates an isolated data file and seeds it with the standard objects.
function provisionTenant(slug) {
  const key  = slug;
  const file = tenantDbPath(slug);

  // ALWAYS start with a completely empty store.
  // Never reuse an existing file — it may contain records from a previous
  // provision, demo seed, or deleted client with the same slug.
  const fresh = { ...EMPTY_STORE() };
  storeCache[key] = fresh;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(fresh, null, 2));
    console.log(`✅ Provisioned clean tenant store: ${file}`);
  } catch(e) {
    console.error(`⚠️  Could not write tenant file ${file}:`, e.message);
  }
  return storeCache[key];
}

// ── Reload a tenant store from disk (called after external writes) ─────────────
function reloadTenantStore(slug) {
  const key = slug || 'master';
  delete storeCache[key];
  return loadTenantStore(slug);
}

// ── List all tenant slugs (only active/non-deleted clients) ──────────────────
function listTenants() {
  try {
    // Cross-reference file system with active clients in master store
    // so deleted clients' stale files are not treated as valid tenants
    const masterStore = storeCache['master'];
    if (masterStore?.clients) {
      return (masterStore.clients)
        .filter(c => !c.deleted_at && c.tenant_slug)
        .map(c => c.tenant_slug);
    }
    // Fallback to filesystem scan before master store is loaded
    fs.mkdirSync(DATA_DIR, { recursive: true });
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('tenant-') && f.endsWith('.json'))
      .map(f => f.replace('tenant-', '').replace('.json', ''));
  } catch { return []; }
}

// ── initDB — seeds master store if empty ──────────────────────────────────────
// Same logic as before — only touches the master store.
async function initDB() {
  // 1. Bootstrap PG schema if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      pg.getPool(); // force pool creation
      const ok = await pg.bootstrap();
      if (ok) console.log('[PG] Connected and schema ready');
    } catch (e) {
      console.error('[PG] Bootstrap failed, falling back to JSON:', e.message);
    }
  }

  // 2. Try loading master store from PG first, then JSON fallback
  if (pg.isEnabled()) {
    try {
      const pgStore = await pg.loadTenant('master');
      if (pgStore && Object.keys(pgStore).length > 0) {
        const base = { ...EMPTY_STORE() };
        storeCache['master'] = { ...base, ...pgStore };
        console.log('[PG] Master store loaded from PostgreSQL');
      } else {
        // PG is empty — load from JSON and migrate up
        loadTenantStore(null);
        console.log('[PG] PostgreSQL empty — migrating from JSON file...');
        await pg.migrateFromJson(DATA_DIR);
        console.log('[PG] Migration complete');
      }
    } catch (e) {
      console.error('[PG] Load failed, falling back to JSON:', e.message);
      loadTenantStore(null);
    }
  } else {
    loadTenantStore(null);
  }

  const store = storeCache['master'];
  
  if (store.environments && store.environments.length > 0) {
    if (!store.users) store.users = [];
    if (!store.roles) store.roles = [];
    if (!store.permissions) store.permissions = [];
    if (!store.sessions) store.sessions = [];
    if (!store.audit_log) store.audit_log = [];
    if (!store.org_units) store.org_units = [];
    if (!store.relationships) store.relationships = [];
    if (!store.question_bank) store.question_bank = [];
    if (!store.bot_sessions) store.bot_sessions = [];
    if (!store.scorecards) store.scorecards = [];
    if (!store.auto_number_counters) store.auto_number_counters = [];
    if (!store.stage_categories) store.stage_categories = [];

    (store.fields || []).forEach(f => {
      if (f.condition_field === undefined) f.condition_field = null;
      if (f.condition_value === undefined) f.condition_value = null;
    });
    (store.objects || []).forEach(o => {
      if (o.person_type_options === undefined) o.person_type_options = null;
      if (o.relationships_enabled === undefined) o.relationships_enabled = 0;
    });

    const jobsObjs   = (store.objects || []).filter(o => o.slug === 'jobs');
    const peopleObjs = (store.objects || []).filter(o => o.slug === 'people');
    for (const jobsObj of jobsObjs) {
      const already = (store.fields || []).find(f => f.object_id === jobsObj.id && f.api_key === 'interviewers');
      if (!already) {
        const peopleObj = peopleObjs.find(p => p.environment_id === jobsObj.environment_id);
        const maxOrder = Math.max(0, ...(store.fields || []).filter(f => f.object_id === jobsObj.id).map(f => f.sort_order || 0));
        if (!store.fields) store.fields = [];
        store.fields.push({ id: uuidv4(), object_id: jobsObj.id, environment_id: jobsObj.environment_id, name: 'Interviewers', api_key: 'interviewers', field_type: 'multi_lookup', is_required: 0, is_unique: 0, is_system: 1, show_in_list: 0, show_in_form: 1, sort_order: maxOrder + 1, options: null, lookup_object_id: peopleObj ? peopleObj.id : null, default_value: null, placeholder: 'Search people…', help_text: null, condition_field: null, condition_value: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
    }
    // Deduplicate roles — keep first occurrence of each slug, remove non-system strays
    const VALID_SLUGS = new Set(['super_admin','admin','recruiter','hiring_manager','read_only']);
    const seenSlugs = new Set();
    store.roles = (store.roles || []).filter(r => {
      if (!VALID_SLUGS.has(r.slug)) return false; // remove non-system roles like 'test'
      if (seenSlugs.has(r.slug)) return false;    // remove duplicate slugs
      seenSlugs.add(r.slug);
      return true;
    });
    // Deduplicate users by email — keep first occurrence
    const seenEmails = new Set();
    store.users = (store.users || []).filter(u => {
      if (seenEmails.has(u.email)) return false;
      seenEmails.add(u.email);
      return true;
    });

    await seedPersonTypeFields('master');
    await seedUsersAndRoles('master');
    saveStore('master');
    console.log('✅ Master store loaded');
    return;
  }

  // Fresh seed — run within master tenant context
  await tenantStorage.run('master', async () => {
    await seedEnvironmentAndObjects();
    await seedUsersAndRoles('master');
  });
  console.log('✅ Seeded master store');
}

async function seedEnvironmentAndObjects() {
  const envId = uuidv4();
  insert('environments', { id:envId, name:'Production', slug:'production', description:'Main production environment', color:'#3b5bdb', is_default:1, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });

  const systemObjects = [
    { name:'Person', plural:'People', slug:'people', icon:'users', color:'#3b5bdb', order:1 },
    { name:'Job', plural:'Jobs', slug:'jobs', icon:'briefcase', color:'#f59f00', order:2 },
    { name:'Talent Pool', plural:'Talent Pools', slug:'talent-pools', icon:'layers', color:'#0ca678', order:3 },
  ];
  const fieldSets = {
    people: [
      { name:'First Name', ak:'first_name', type:'text', req:1, list:1, o:1 },
      { name:'Last Name', ak:'last_name', type:'text', req:1, list:1, o:2 },
      { name:'Email', ak:'email', type:'email', req:1, list:1, uniq:1, o:3 },
      { name:'Phone', ak:'phone', type:'phone', list:0, o:4 },
      { name:'Location', ak:'location', type:'text', list:1, o:5 },
      { name:'Person Type', ak:'person_type', type:'select', list:1, o:6, opts:['Employee','Contractor','Consultant','Candidate','Contact'] },
      { name:'Current Title', ak:'current_title', type:'text', list:1, o:7 },
      { name:'Current Company', ak:'current_company', type:'text', list:1, o:8 },
      { name:'Status', ak:'status', type:'select', list:1, o:9, opts:['Active','Passive','Not Looking','Placed','Archived'] },
      { name:'Source', ak:'source', type:'select', list:1, o:10, opts:['LinkedIn','Referral','Job Board','Direct Apply','Agency','Event','Other'] },
      { name:'LinkedIn URL', ak:'linkedin_url', type:'url', list:0, o:11 },
      { name:'Skills', ak:'skills', type:'skills', list:0, o:12, opts:[] },
      { name:'Years Experience', ak:'years_experience', type:'number', list:1, o:13 },
      { name:'Rating', ak:'rating', type:'rating', list:1, o:14 },
      { name:'Job Title', ak:'job_title', type:'text', list:1, o:15, cond_field:'person_type', cond_val:'Employee' },
      { name:'Department', ak:'department', type:'select', list:1, o:16, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'], cond_field:'person_type', cond_val:'Employee' },
    ],
    jobs: [
      { name:'Job Title', ak:'job_title', type:'text', req:1, list:1, o:1 },
      { name:'Department', ak:'department', type:'select', list:1, o:2, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'] },
      { name:'Location', ak:'location', type:'text', list:1, o:3 },
      { name:'Status', ak:'status', type:'select', list:1, o:4, opts:['Draft','Open','On Hold','Filled','Cancelled'] },
      { name:'Description', ak:'description', type:'rich_text', list:0, o:5 },
    ],
    'talent-pools': [
      { name:'Pool Name', ak:'pool_name', type:'text', req:1, list:1, o:1 },
      { name:'Category', ak:'category', type:'select', list:1, o:2, opts:['Technical','Leadership','Sales','Operations','Creative','Graduates','Diversity','Other'] },
      { name:'Status', ak:'status', type:'select', list:1, o:3, opts:['Active','Inactive','Archived'] },
    ],
  };
  for (const obj of systemObjects) {
    const objId = uuidv4();
    insert('objects', { id:objId, environment_id:envId, name:obj.name, plural_name:obj.plural, slug:obj.slug, icon:obj.icon, color:obj.color, description:null, is_system:1, sort_order:obj.order, relationships_enabled:0, person_type_options: obj.slug==='people'?['Employee','Contractor','Consultant','Candidate','Contact']:null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    for (const f of (fieldSets[obj.slug]||[])) {
      insert('fields', { id:uuidv4(), object_id:objId, environment_id:envId, name:f.name, api_key:f.ak, field_type:f.type, is_required:f.req||0, is_unique:f.uniq||0, is_system:1, show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, condition_field:f.cond_field||null, condition_value:f.cond_val||null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    }
  }
  const peopleObjId = (getStore().objects||[]).find(o=>o.environment_id===envId&&o.slug==='people')?.id;
  if (peopleObjId) {
    (getStore().fields||[]).filter(f=>f.environment_id===envId&&f.field_type==='multi_lookup').forEach(f=>{ f.lookup_object_id = peopleObjId; });
    saveStore();
  }
}

async function seedPersonTypeFields(tenantKey) {
  const store = storeCache[tenantKey || 'master'];
  if (!store) return;
  const peopleObjects = (store.objects || []).filter(o => o.slug === 'people');
  for (const obj of peopleObjects) {
    if (!obj.person_type_options) obj.person_type_options = ['Employee','Contractor','Consultant','Candidate','Contact'];
    if (obj.relationships_enabled === undefined) obj.relationships_enabled = 0;
    const existing = (store.fields || []).filter(f => f.object_id === obj.id);
    const newFields = [
      { name:'Person Type', ak:'person_type', type:'select', list:1, o:6, opts:['Employee','Contractor','Consultant','Candidate','Contact'], cond_field:null, cond_val:null },
      { name:'Job Title', ak:'job_title', type:'text', list:1, o:16, cond_field:'person_type', cond_val:'Employee' },
      { name:'Department', ak:'department', type:'select', list:1, o:17, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'], cond_field:'person_type', cond_val:'Employee' },
    ];
    for (const f of newFields) {
      if (!existing.find(e => e.api_key === f.ak)) {
        insert('fields', { id:uuidv4(), object_id:obj.id, environment_id:obj.environment_id, name:f.name, api_key:f.ak, field_type:f.type, is_required:0, is_unique:0, is_system:1, show_in_list:f.list, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, condition_field:f.cond_field||null, condition_value:f.cond_val||null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
      }
    }
  }
}

async function seedUsersAndRoles(tenantKey) {
  const store = storeCache[tenantKey || 'master'];
  if (!store) return;
  // Guard: only seed if ALL 5 system roles are missing — prevents duplicates on restart
  const SYSTEM_SLUGS = ['super_admin', 'admin', 'recruiter', 'hiring_manager', 'read_only'];
  const existingSlugs = new Set((store.roles || []).map(r => r.slug));
  if (SYSTEM_SLUGS.every(s => existingSlugs.has(s))) return;
  const crypto = require('crypto');
  const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');
  const roles = [
    { id:uuidv4(), name:'Super Admin', slug:'super_admin', description:'Full access', is_system:1, color:'#e03131' },
    { id:uuidv4(), name:'Admin', slug:'admin', description:'Manage users and all data', is_system:1, color:'#f59f00' },
    { id:uuidv4(), name:'Recruiter', slug:'recruiter', description:'Manage candidates and jobs', is_system:1, color:'#3b5bdb' },
    { id:uuidv4(), name:'Hiring Manager', slug:'hiring_manager', description:'View and provide feedback', is_system:1, color:'#0ca678' },
    { id:uuidv4(), name:'Read Only', slug:'read_only', description:'View data only', is_system:1, color:'#868e96' },
  ];
  for (const role of roles) {
    // Skip if slug already exists (prevents duplicates on partial seeds)
    if (!existingSlugs.has(role.slug)) {
      insert('roles', { ...role, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    }
  }
  const superAdminRole = roles.find(r => r.slug === 'super_admin');
  insert('users', { id:uuidv4(), email:'admin@talentos.io', first_name:'Admin', last_name:'User', password_hash:hashPassword('Admin1234!'), role_id:superAdminRole.id, status:'active', auth_provider:'local', mfa_enabled:0, must_change_password:1, last_login:null, last_login_ip:null, login_count:0, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
  if (!store.security_settings) {
    store.security_settings = { password_min_length:8, password_require_uppercase:1, password_require_number:1, password_require_symbol:1, session_timeout_minutes:60, max_login_attempts:5, lockout_duration_minutes:30, mfa_required:0, sso_enabled:0, updated_at:new Date().toISOString() };
  }
  saveStore(tenantKey || 'master');
}

module.exports = { getStore, saveStore, saveStoreNow, query, findOne, insert, update, remove, initDB, tenantStorage, getCurrentTenant, provisionTenant, reloadTenantStore, loadTenantStore, listTenants, tenantDbPath, storeCache };

// ── Migration: fix Skills field type multi_select → skills ───────────────────
// Called on server startup so all tenants get patched automatically.
function migrateSkillsFieldType() {
  let changed = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    const fields = store.fields || [];
    fields.forEach(f => {
      if (f.api_key === 'skills' && f.field_type === 'multi_select') {
        f.field_type = 'skills';
        f.updated_at = new Date().toISOString();
        changed++;
      }
    });
    if (changed > 0) saveStore(key);
  }
  if (changed > 0) console.log(`✅ Migrated ${changed} skills field(s) from multi_select → skills`);
}
migrateSkillsFieldType();

// ── Prune orphaned people_links on startup ───────────────────────────────────
// Removes any people_link where the person_record or target_record no longer exists.
function pruneOrphanedPeopleLinks() {
  let pruned = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    const links   = store.people_links;
    if (!links || !links.length) continue;
    const recordIds = new Set((store.records || []).filter(r => !r.deleted_at).map(r => r.id));
    const before    = links.length;
    store.people_links = links.filter(l =>
      l.person_record_id && recordIds.has(l.person_record_id) &&
      l.target_record_id && recordIds.has(l.target_record_id)
    );
    const removed = before - store.people_links.length;
    if (removed > 0) { pruned += removed; saveStore(key); }
  }
  if (pruned > 0) console.log(`🧹 Pruned ${pruned} orphaned people_link(s)`);
}
pruneOrphanedPeopleLinks();
