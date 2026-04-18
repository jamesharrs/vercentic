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
      if (f.conditions === undefined) f.conditions = null;
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
    // Deduplicate system roles only — keep first occurrence of each slug
    // DO NOT delete custom roles (user-created roles with non-system slugs)
    const SYSTEM_SLUGS = new Set(['super_admin','admin','recruiter','hiring_manager','read_only']);
    const seenSlugs = new Set();
    store.roles = (store.roles || []).filter(r => {
      // For system roles: deduplicate by slug (keep first)
      if (SYSTEM_SLUGS.has(r.slug)) {
        if (seenSlugs.has(r.slug)) return false; // remove duplicate system role
        seenSlugs.add(r.slug);
        return true;
      }
      // Custom roles: always keep
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
      { name:'Cover Letter / Notes', ak:'cover_letter', type:'rich_text', list:0, o:15 },
      { name:'Job Title', ak:'job_title', type:'text', list:1, o:16, cond_field:'person_type', cond_val:'Employee' },
      { name:'Department', ak:'department', type:'select', list:1, o:17, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'], cond_field:'person_type', cond_val:'Employee' },
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


// ── Seed system email templates (idempotent) ──────────────────────────────────
function seedSystemEmailTemplates() {
  const store = getStore();
  if (!store.email_templates_v2) store.email_templates_v2 = [];
  const now = new Date().toISOString();
  const { v4: uuidv4 } = require('uuid');
  const TEMPLATES = [
    { slug:'sys_interview_scheduled', name:'Interview Scheduled — Candidate & Interviewer Invite', category:'interview', is_system:true, has_ics:true, supports_reschedule_link:true, description:'Sent automatically to the candidate and all interviewers when an interview is scheduled. Includes an ICS calendar attachment.', subject:'Interview Confirmed: {{candidate_name}}', variables:['candidate_name','job_name','date_label','time','format','duration','interviewers','reschedule_url'] , blocks:[{"id": "hdr1", "type": "header", "config": {"showCompanyName": true}}, {"id": "h1a", "type": "heading", "content": "Interview Confirmed"}, {"id": "t1a", "type": "text", "content": "<p>Hi {{candidate_name}},</p><p>Your interview has been confirmed. Please find the calendar invite attached.</p>"}, {"id": "div1", "type": "divider"}, {"id": "t1b", "type": "text", "content": "<table style=\"width:100%;border-collapse:collapse\"><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px;width:130px\">Date</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{date_label}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Time</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{time}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Format</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{format}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Duration</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{duration}} minutes</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Interviewer(s)</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{interviewers}}</td></tr></table>"}, {"id": "div2", "type": "divider"}, {"id": "btn1", "type": "button", "config": {"text": "Need to reschedule? \u2192", "url": "{{reschedule_url}}", "style": "filled", "align": "left"}}, {"id": "ftr1", "type": "footer"}] },
    { slug:'sys_application_hub',     name:'Application Hub — Magic Link',           category:'portal',    is_system:true, description:'Sent when a candidate requests access to their application hub. Contains a one-time magic link that expires in 15 minutes.', subject:'Your {{company_name}} application hub', variables:['first_name','company_name','brand_color','hub_url'] , blocks:[{"id": "hdr2", "type": "header", "config": {"showCompanyName": true}}, {"id": "h2a", "type": "heading", "content": "Your Application Hub"}, {"id": "t2a", "type": "text", "content": "<p>Hi {{first_name}},</p><p>Here is your one-time link to access your application hub at <strong>{{company_name}}</strong>. This link expires in 15 minutes.</p>"}, {"id": "btn2", "type": "button", "config": {"text": "Access Your Application Hub \u2192", "url": "{{hub_url}}", "style": "filled", "align": "center"}}, {"id": "t2b", "type": "text", "content": "<p style=\"color:#6b7280;font-size:12px\">If you did not request this link, please ignore this email.</p>"}, {"id": "ftr2", "type": "footer"}] },
    { slug:'sys_saved_application',   name:'Saved Application — Resume Link',        category:'portal',    is_system:true, description:'Sent when a candidate saves their in-progress application on a career portal. Link expires in 7 days.', subject:'Continue your application — {{company_name}}', variables:['first_name','company_name','resume_url'] , blocks:[{"id": "hdr3", "type": "header", "config": {"showCompanyName": true}}, {"id": "h3a", "type": "heading", "content": "Continue Your Application"}, {"id": "t3a", "type": "text", "content": "<p>Hi {{first_name}},</p><p>You saved your application for a role at <strong>{{company_name}}</strong>. Use the link below to pick up where you left off \u2014 it expires in 7 days.</p>"}, {"id": "btn3", "type": "button", "config": {"text": "Continue Application \u2192", "url": "{{resume_url}}", "style": "filled", "align": "center"}}, {"id": "ftr3", "type": "footer"}] },
    { slug:'sys_user_invite',         name:'Platform Invite — New User Welcome',     category:'system',    is_system:true, description:'Sent when a new platform user is invited. Contains their login credentials and a link to the platform.', subject:'You have been invited to {{company_name}}', variables:['first_name','company_name','email','temp_password','login_url'] , blocks:[{"id": "hdr4", "type": "header", "config": {"showCompanyName": true}}, {"id": "h4a", "type": "heading", "content": "You've been invited"}, {"id": "t4a", "type": "text", "content": "<p>Hi {{first_name}},</p><p>You have been invited to join <strong>{{company_name}}</strong> on Vercentic. Use the credentials below to log in.</p>"}, {"id": "t4b", "type": "text", "content": "<table style=\"width:100%;border-collapse:collapse\"><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px;width:130px\">Email</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{email}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Temporary Password</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{temp_password}}</td></tr></table>"}, {"id": "btn4", "type": "button", "config": {"text": "Log In Now \u2192", "url": "{{login_url}}", "style": "filled", "align": "center"}}, {"id": "t4c", "type": "text", "content": "<p style=\"color:#6b7280;font-size:12px\">Please change your password after your first login.</p>"}, {"id": "ftr4", "type": "footer"}] },
    { slug:'sys_interview_feedback',  name:'Interview Feedback Reminder',            category:'interview', is_system:true, description:'Sent to interviewers as a reminder to submit their scorecard/feedback after an interview.', subject:'Feedback needed — {{candidate_name}} interview', variables:['candidate_name','job_title','feedback_url'] , blocks:[{"id": "hdr5", "type": "header", "config": {"showCompanyName": true}}, {"id": "h5a", "type": "heading", "content": "Feedback Needed"}, {"id": "t5a", "type": "text", "content": "<p>Hi,</p><p>You recently interviewed <strong>{{candidate_name}}</strong> for the <strong>{{job_title}}</strong> role. Please submit your scorecard and feedback when you have a moment.</p>"}, {"id": "btn5", "type": "button", "config": {"text": "Submit Feedback \u2192", "url": "{{feedback_url}}", "style": "filled", "align": "left"}}, {"id": "t5b", "type": "text", "content": "<p style=\"color:#6b7280;font-size:12px\">Your feedback helps the team make faster, better hiring decisions.</p>"}, {"id": "ftr5", "type": "footer"}] },
    { slug:'sys_offer_sent',          name:'Offer Letter — Sent to Candidate',       category:'offer',     is_system:true, description:'Sent to a candidate when a formal offer is made. Links to the offer letter for review and acceptance.', subject:'Your offer from {{company_name}}', variables:['first_name','company_name','job_title','expiry_date','offer_url'] , blocks:[{"id": "hdr6", "type": "header", "config": {"showCompanyName": true}}, {"id": "h6a", "type": "heading", "content": "You have an offer! \ud83c\udf89"}, {"id": "t6a", "type": "text", "content": "<p>Hi {{first_name}},</p><p>We are delighted to offer you the position of <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong>. Please review your offer letter using the link below.</p><p>This offer expires on <strong>{{expiry_date}}</strong>.</p>"}, {"id": "btn6", "type": "button", "config": {"text": "View Offer Letter \u2192", "url": "{{offer_url}}", "style": "filled", "align": "center"}}, {"id": "t6b", "type": "text", "content": "<p>If you have any questions, please don't hesitate to reach out. We look forward to welcoming you to the team.</p>"}, {"id": "ftr6", "type": "footer"}] },
    { slug:'sys_offer_accepted',      name:'Offer Accepted — Recruiter Notification',category:'offer',     is_system:true, description:'Sent to the recruiting team when a candidate accepts their offer.', subject:'Offer accepted — {{candidate_name}} ({{job_title}})', variables:['candidate_name','job_title','start_date','record_url'] , blocks:[{"id": "hdr7", "type": "header", "config": {"showCompanyName": true}}, {"id": "h7a", "type": "heading", "content": "Offer Accepted \u2713"}, {"id": "t7a", "type": "text", "content": "<p><strong>{{candidate_name}}</strong> has accepted their offer for the <strong>{{job_title}}</strong> role.</p>"}, {"id": "t7b", "type": "text", "content": "<table style=\"width:100%;border-collapse:collapse\"><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px;width:130px\">Candidate</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{candidate_name}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Role</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{job_title}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Start Date</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{start_date}}</td></tr></table>"}, {"id": "btn7", "type": "button", "config": {"text": "View Candidate Record \u2192", "url": "{{record_url}}", "style": "outline", "align": "left"}}, {"id": "ftr7", "type": "footer"}] },
    { slug:'sys_welcome_team',        name:'Welcome to the Team',                    category:'onboarding',is_system:true, description:'Sent to a new hire after their offer is accepted, welcoming them to the company.', subject:'Welcome to the team, {{first_name}}!', variables:['first_name','company_name','start_date'] , blocks:[{"id": "hdr8", "type": "header", "config": {"showCompanyName": true}}, {"id": "h8a", "type": "heading", "content": "Welcome to the team, {{first_name}}! \ud83c\udf89"}, {"id": "t8a", "type": "text", "content": "<p>We are thrilled to have you joining <strong>{{company_name}}</strong>. Your start date is <strong>{{start_date}}</strong>.</p><p>We'll be in touch soon with everything you need to get ready for your first day. In the meantime, if you have any questions please don't hesitate to reach out.</p>"}, {"id": "t8b", "type": "text", "content": "<p>We can't wait to see what we'll build together.</p>"}, {"id": "ftr8", "type": "footer"}] },
    { slug:'sys_reschedule_request',  name:'Reschedule Request — Slot Options',       category:'interview', is_system:true, supports_reschedule_link:true, description:'Sent when a candidate or interviewer requests to reschedule. Contains clickable time slots for the recipient to choose from.', subject:'Reschedule request from {{proposer_name}}', variables:['proposer_name','candidate_name','job_name','slots','confirm_url'] , blocks:[{"id": "hdr9", "type": "header", "config": {"showCompanyName": true}}, {"id": "h9a", "type": "heading", "content": "Reschedule Request"}, {"id": "t9a", "type": "text", "content": "<p><strong>{{proposer_name}}</strong> has requested to reschedule your interview for <strong>{{job_name}}</strong>. They have suggested the following times \u2014 please choose one:</p>"}, {"id": "t9b", "type": "text", "content": "{{slots}}"}, {"id": "btn9", "type": "button", "config": {"text": "View All Options \u2192", "url": "{{confirm_url}}", "style": "filled", "align": "center"}}, {"id": "ftr9", "type": "footer"}] },
    { slug:'sys_reschedule_confirmed',name:'Interview Rescheduled — Confirmation',    category:'interview', is_system:true, has_ics:true, supports_reschedule_link:true, description:'Sent to all participants when a new interview time has been agreed. Includes updated calendar attachment.', subject:'Interview rescheduled — {{date_label}} at {{time}}', variables:['candidate_name','job_name','date_label','time','format','duration'] , blocks:[{"id": "hdr10", "type": "header", "config": {"showCompanyName": true}}, {"id": "h10a", "type": "heading", "content": "Interview Rescheduled \u2713"}, {"id": "t10a", "type": "text", "content": "<p>Your interview has been rescheduled to a new time.</p>"}, {"id": "t10b", "type": "text", "content": "<table style=\"width:100%;border-collapse:collapse\"><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px;width:130px\">Candidate</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{candidate_name}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Date</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{date_label}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Time</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{time}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Format</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{format}}</td></tr><tr><td style=\"padding:8px 0;color:#6b7280;font-size:13px\">Duration</td><td style=\"padding:8px 0;font-weight:600;color:#111827\">{{duration}} minutes</td></tr></table>"}, {"id": "ftr10", "type": "footer"}] },
  ];
  let added = 0;
  for (const tmpl of TEMPLATES) {
    if (!(store.email_templates_v2 || []).find(t => t.slug === tmpl.slug && !t.deleted_at)) {
      store.email_templates_v2.push({ ...tmpl, id:uuidv4(), created_at:now, updated_at:now });
      added++;
    }
  }
  if (added > 0) { saveStoreNow(); console.log(`[init] Seeded ${added} system email template(s)`); }

  // Patch existing system templates that are missing blocks
  let patched = 0;
  for (const tmpl of TEMPLATES) {
    if (!tmpl.blocks?.length) continue;
    const existing = (store.email_templates_v2 || []).find(t => t.slug === tmpl.slug && !t.deleted_at);
    if (existing && (!existing.blocks || existing.blocks.length === 0)) {
      existing.blocks = tmpl.blocks;
      patched++;
    }
  }
  if (patched > 0) { saveStoreNow(); console.log(`[init] Patched ${patched} system email template(s) with default blocks`); }
}
seedSystemEmailTemplates();

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

// ── Add cover_letter field to existing People objects ────────────────────────
function migrateCoverLetterField() {
  let added = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    const peopleObjs = (store.objects || []).filter(o => o.slug === 'people' && !o.deleted_at);
    for (const obj of peopleObjs) {
      const existing = (store.fields || []).find(f => f.object_id === obj.id && f.api_key === 'cover_letter');
      if (!existing) {
        const { v4: uid } = require('uuid');
        const maxOrder = (store.fields || []).filter(f => f.object_id === obj.id).reduce((m,f) => Math.max(m, f.sort_order||0), 0);
        if (!store.fields) store.fields = [];
        store.fields.push({
          id: uid(), object_id: obj.id, environment_id: obj.environment_id,
          name: 'Cover Letter / Notes', api_key: 'cover_letter', field_type: 'rich_text',
          is_required: false, is_unique: false, show_in_list: false, is_system: true,
          sort_order: maxOrder + 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        added++;
      }
    }
    if (added > 0) saveStore(key);
  }
  if (added > 0) console.log(`✅ Added cover_letter field to ${added} People object(s)`);
}
migrateCoverLetterField();

// ── Backfill record_number for portal-created records that missed assignment ─
function migrateRecordNumbers() {
  for (const key of Object.keys(storeCache)) {
    const store = storeCache[key];
    if (!store.records) continue;
    const byObj = {};
    // first pass: find the current max per object
    store.records.filter(r => !r.deleted_at && typeof r.record_number === 'number').forEach(r => {
      byObj[r.object_id] = Math.max(byObj[r.object_id] || 0, r.record_number);
    });
    let changed = 0;
    store.records.filter(r => !r.deleted_at && !r.record_number).forEach(r => {
      byObj[r.object_id] = (byObj[r.object_id] || 0) + 1;
      r.record_number = byObj[r.object_id];
      changed++;
    });
    if (changed > 0) { saveStoreNow(key); console.log(`✅ Backfilled record_number for ${changed} records (tenant: ${key})`); }
  }
}
migrateRecordNumbers();

// ── Remove 🧪 test fields and known junk fields ──────────────────────────────
function removeTestFields() {
  const TEST_API_KEYS = new Set([
    'test_text','test_textarea','test_rich_text','test_number','test_currency',
    'test_percent','test_date','test_datetime','test_date_range','test_select',
    'test_multi_select','test_status','test_boolean','test_rating','test_progress',
    'test_email','test_url','test_phone','test_phone_intl','test_country',
    'test_address','test_social','test_duration','test_people','test_auto_number',
    'slills', // typo for "skills"
    'test_field', 'auth_test_field', // misc test fields
  ]);
  let removed = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    if (!store.fields) continue;
    const before = store.fields.length;
    store.fields = store.fields.filter(f => {
      // Remove by api_key match OR by 🧪 in name
      if (TEST_API_KEYS.has(f.api_key)) return false;
      if (f.name && f.name.includes('🧪')) return false;
      return true;
    });
    removed += before - store.fields.length;
    if (before !== store.fields.length) saveStoreNow(key);
  }
  if (removed > 0) console.log(`✅ Removed ${removed} test/junk field(s)`);
}
removeTestFields();

// ── Add education table field to People objects ───────────────────────────────
function migrateEducationField() {
  const { v4: uid } = require('uuid');
  let added = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    const peopleObjs = (store.objects || []).filter(o => o.slug === 'people' && !o.deleted_at);
    for (const obj of peopleObjs) {
      const existing = (store.fields || []).find(f => f.object_id === obj.id && f.api_key === 'education' && !f.deleted_at);
      if (!existing) {
        const maxOrder = (store.fields || []).filter(f => f.object_id === obj.id && !f.deleted_at)
          .reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
        if (!store.fields) store.fields = [];
        store.fields.push({
          id: uid(), object_id: obj.id, environment_id: obj.environment_id,
          name: 'Education', api_key: 'education', field_type: 'table',
          is_required: false, is_unique: false, show_in_list: false, show_in_form: true,
          is_system: true, sort_order: maxOrder + 1,
          table_template: 'education',
          table_columns: [
            { id: 'edu_inst',    name: 'Institution',      type: 'text',    width: 200 },
            { id: 'edu_deg',     name: 'Degree',           type: 'text',    width: 160 },
            { id: 'edu_subj',    name: 'Subject',          type: 'text',    width: 160 },
            { id: 'edu_from',    name: 'From',             type: 'date',    width: 110 },
            { id: 'edu_to',      name: 'To',               type: 'date',    width: 110 },
            { id: 'edu_current', name: 'Current',          type: 'boolean', width: 80  },
            { id: 'edu_grade',   name: 'Grade / Result',   type: 'text',    width: 130 },
          ],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        added++;
      }
    }
    if (added > 0) saveStoreNow(key);
  }
  if (added > 0) console.log(`✅ Added education field to ${added} People object(s)`);
}
migrateEducationField();

// ── Add work_history table field to People objects ────────────────────────────
function migrateWorkHistoryField() {
  const { v4: uid } = require('uuid');
  let added = 0, fixed = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    const peopleObjs = (store.objects || []).filter(o => o.slug === 'people' && !o.deleted_at);
    for (const obj of peopleObjs) {
      const existing = (store.fields || []).find(f => f.object_id === obj.id && f.api_key === 'work_history' && !f.deleted_at);
      const WH_COLS = [
        { id: 'wh_company', name: 'Company',     type: 'text', width: 180 },
        { id: 'wh_title',   name: 'Job Title',   type: 'text', width: 180 },
        { id: 'wh_start',   name: 'From',        type: 'date', width: 110 },
        { id: 'wh_end',     name: 'To',          type: 'date', width: 110 },
        { id: 'wh_current', name: 'Current',     type: 'boolean', width: 80 },
        { id: 'wh_desc',    name: 'Description', type: 'textarea', width: 260 },
      ];
      if (existing) {
        if (!existing.table_columns || existing.table_columns.length === 0) {
          existing.table_columns = WH_COLS;
          existing.updated_at = new Date().toISOString();
          fixed++;
        }
      } else {
        const maxOrder = (store.fields || []).filter(f => f.object_id === obj.id && !f.deleted_at)
          .reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
        if (!store.fields) store.fields = [];
        store.fields.push({
          id: uid(), object_id: obj.id, environment_id: obj.environment_id,
          name: 'Work History', api_key: 'work_history', field_type: 'table',
          is_required: false, is_unique: false, show_in_list: false, show_in_form: true,
          is_system: true, sort_order: 21,
          table_template: 'work_history',
          table_columns: WH_COLS,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        added++;
      }
    }
    if (added > 0 || fixed > 0) saveStoreNow(key);
  }
  if (added > 0) console.log(`✅ Added work_history field to ${added} People object(s)`);
  if (fixed > 0)  console.log(`✅ Fixed work_history table_columns on ${fixed} existing field(s)`);
}
migrateWorkHistoryField();

// ── Standardise People object field schema ────────────────────────────────────
// Adds missing standard fields, renames/reorders existing ones, adds section
// separators to match the agreed candidate profile field schema.
function migrateStandardCandidateFields() {
  const { v4: uid } = require('uuid');
  const now = new Date().toISOString();
  let changed = 0;

  // Full ordered schema: [sort_order, api_key, name, field_type, options?, condition_field?, condition_value?]
  const SCHEMA = [
    // ── IDENTITY ─────────────────────────────────────────────────────────────
    [1,  'section_identity',   'Identity',            'section_separator', null, null, null],
    [2,  'person_type',        'Person Type',         'select',            ['Candidate','Employee','Contractor','Consultant','Contact'], null, null],
    [3,  'first_name',         'First Name',          'text',              null, null, null],
    [4,  'last_name',          'Last Name',           'text',              null, null, null],
    [5,  'current_title',      'Current Title',       'text',              null, null, null],
    [6,  'current_company',    'Current Company',     'text',              null, null, null],
    [7,  'summary',            'Summary / Bio',       'textarea',          null, null, null],
    // ── CONTACT ──────────────────────────────────────────────────────────────
    [10, 'section_contact',    'Contact',             'section_separator', null, null, null],
    [11, 'email',              'Email',               'email',             null, null, null],
    [12, 'phone',              'Phone',               'phone',             null, null, null],
    [13, 'location',           'Location',            'text',              null, null, null],
    [14, 'country',            'Country',             'country',           null, null, null],
    // ── PROFESSIONAL ─────────────────────────────────────────────────────────
    [20, 'section_professional','Professional',       'section_separator', null, null, null],
    [21, 'work_history',       'Work History',        'table',             null, null, null],
    [22, 'education',          'Education',           'table',             null, null, null],
    [23, 'years_experience',   'Years Experience',    'number',            null, null, null],
    [24, 'skills',             'Skills',              'skills',            null, null, null],
    [25, 'languages',          'Languages',           'multi_select',      ['English','Arabic','French','German','Spanish','Mandarin','Portuguese','Hindi','Japanese','Other'], null, null],
    [26, 'linkedin_url',       'LinkedIn URL',        'url',               null, null, null],
    // ── AVAILABILITY ─────────────────────────────────────────────────────────
    [30, 'section_availability','Availability',       'section_separator', null, null, null],
    [31, 'notice_period',      'Notice Period',       'select',            ['Immediate','2 weeks','1 month','2 months','3 months','Negotiable'], null, null],
    [32, 'availability_date',  'Available From',      'date',              null, null, null],
    [33, 'salary_expectation', 'Salary Expectation',  'currency',          null, null, null],
    [34, 'work_type_preference','Work Type Preference','multi_select',     ['On-site','Hybrid','Remote'], null, null],
    [35, 'work_authorisation', 'Work Authorisation',  'select',            ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship'], null, null],
    // ── EMPLOYMENT (conditional) ──────────────────────────────────────────────
    [40, 'section_employment', 'Employment',          'section_separator', null, null, null],
    [41, 'job_title',          'Job Title',           'text',              null, 'person_type', 'Employee'],
    [42, 'department',         'Department',          'select',            ['Engineering','Product','Sales','Marketing','Finance','HR','Operations','Legal','Customer Success','Other'], 'person_type', 'Employee'],
    [43, 'entity',             'Entity / Company',    'text',              null, 'person_type', 'Employee'],
    [44, 'employment_type',    'Employment Type',     'select',            ['Full-time','Part-time','Contract','Casual'], 'person_type', 'Employee'],
    [45, 'start_date',         'Start Date',          'date',              null, 'person_type', 'Employee'],
    [46, 'end_date',           'End Date',            'date',              null, 'person_type', 'Employee'],
    // ── RECRUITMENT ───────────────────────────────────────────────────────────
    [50, 'section_recruitment','Recruitment',         'section_separator', null, null, null],
    [51, 'status',             'Status',              'select',            ['Active','Passive','Placed','On Hold','Blacklisted','Archived'], null, null],
    [52, 'source',             'Source',              'select',            ['LinkedIn','Referral','Agency','Job Board','Direct','Portal','Event','Other'], null, null],
    [53, 'source_detail',      'Source Detail',       'text',              null, null, null],
    [54, 'rating',             'Rating',              'rating',            null, null, null],
    [55, 'do_not_contact',     'Do Not Contact',      'boolean',           null, null, null],
    [56, 'gdpr_consent',       'GDPR Consent',        'boolean',           null, null, null],
    [57, 'gdpr_consent_date',  'GDPR Consent Date',   'date',              null, null, null],
    // ── DEI (deliberately last / optional) ───────────────────────────────────
    [60, 'section_dei',        'Diversity & Inclusion','section_separator',null, null, null],
    [61, 'gender',             'Gender',              'select',            ['Male','Female','Non-binary','Prefer not to say'], null, null],
    [62, 'date_of_birth',      'Date of Birth',       'date',              null, null, null],
    [63, 'nationality',        'Nationality',         'country',           null, null, null],
    // cover_letter stays at end — already seeded
    [70, 'cover_letter',       'Cover Letter',        'rich_text',         null, null, null],
  ];

  for (const [key, store] of Object.entries(storeCache)) {
    const peopleObjs = (store.objects || []).filter(o => o.slug === 'people' && !o.deleted_at);
    for (const obj of peopleObjs) {
      if (!store.fields) store.fields = [];
      const existing = store.fields.filter(f => f.object_id === obj.id && !f.deleted_at);
      const byKey = {};
      existing.forEach(f => { byKey[f.api_key] = f; });

      for (const [sort_order, api_key, name, field_type, options, cond_field, cond_value] of SCHEMA) {
        if (byKey[api_key]) {
          // Update sort_order, name, options, condition on existing fields
          const f = byKey[api_key];
          let dirty = false;
          if (f.sort_order !== sort_order)           { f.sort_order = sort_order; dirty = true; }
          if (f.name !== name)                        { f.name = name; dirty = true; }
          if (options && JSON.stringify(f.options) !== JSON.stringify(options)) { f.options = options; dirty = true; }
          if (cond_field !== undefined && f.condition_field !== cond_field)     { f.condition_field = cond_field; dirty = true; }
          if (cond_value !== undefined && f.condition_value !== cond_value)     { f.condition_value = cond_value; dirty = true; }
          if (dirty) { f.updated_at = now; changed++; }
        } else {
          // Add new field
          const newField = {
            id: uid(), object_id: obj.id, environment_id: obj.environment_id,
            name, api_key, field_type,
            sort_order, is_required: false, is_unique: false,
            show_in_list: ['first_name','last_name','current_title','status','email'].includes(api_key),
            show_in_form: true, is_system: true,
            options: options || null,
            condition_field: cond_field || null,
            condition_value: cond_value || null,
            created_at: now, updated_at: now,
          };
          // Preserve table_columns for table fields
          if (field_type === 'table') continue; // tables already migrated separately
          store.fields.push(newField);
          changed++;
        }
      }
      // Remove the old 'main' section separator (replaced by section_identity)
      store.fields = store.fields.filter(f =>
        !(f.object_id === obj.id && f.api_key === 'main' && f.field_type === 'section_separator')
      );
    }
    if (changed > 0) saveStoreNow(key);
  }
  if (changed > 0) console.log(`✅ Standard candidate fields migrated (${changed} changes)`);
}
migrateStandardCandidateFields();

// ── Standardise Jobs object field schema ──────────────────────────────────────
function migrateStandardJobFields() {
  const { v4: uid } = require('uuid');
  const now = new Date().toISOString();
  let changed = 0;

  // Full ordered Jobs schema
  // [sort_order, api_key, name, field_type, options, is_system]
  const SCHEMA = [
    // ── OVERVIEW ─────────────────────────────────────────────────────────────
    [1,  'section_overview',    'Overview',            'section_separator', null],
    [2,  'job_title',           'Job Title',           'text',              null],
    [3,  'department',          'Department',          'select',            ['Engineering','Product','Sales','Marketing','Finance','HR','Operations','Legal','Customer Success','Design','Data','Other']],
    [4,  'sub_department',      'Sub-department',      'text',              null],
    [5,  'location',            'Location',            'text',              null],
    [6,  'work_type',           'Work Type',           'select',            ['On-site','Hybrid','Remote']],
    [7,  'employment_type',     'Employment Type',     'select',            ['Full-time','Part-time','Contract','Freelance','Internship','Temporary']],
    [8,  'status',              'Status',              'select',            ['Draft','Open','On Hold','Filled','Cancelled']],
    [9,  'priority',            'Priority',            'select',            ['Critical','High','Medium','Low']],
    [10, 'job_code',            'Job Code / Req No.',  'text',              null],
    [11, 'headcount',           'Headcount',           'number',            null],
    [12, 'reason_for_hire',     'Reason for Hire',     'select',            ['New Role','Backfill','Replacement','Expansion']],
    // ── COMPENSATION ─────────────────────────────────────────────────────────
    [20, 'section_compensation','Compensation',        'section_separator', null],
    [21, 'salary_min',          'Salary Min',          'currency',          null],
    [22, 'salary_max',          'Salary Max',          'currency',          null],
    [23, 'salary_currency',     'Currency',            'select',            ['AED','USD','GBP','EUR','SAR','QAR','KWD','INR']],
    [24, 'pay_frequency',       'Pay Frequency',       'select',            ['Annual','Monthly','Hourly','Daily']],
    [25, 'bonus_percent',       'Bonus (%)',           'number',            null],
    [26, 'equity',              'Equity / Stock',      'boolean',           null],
    [27, 'visa_sponsorship',    'Visa Sponsorship',    'boolean',           null],
    [28, 'benefits',            'Benefits',            'multi_select',      ['Health Insurance','Pension','Car Allowance','Housing Allowance','Annual Flights','Gym','Remote Stipend','Childcare','Learning Budget']],
    // ── REQUIREMENTS ─────────────────────────────────────────────────────────
    [30, 'section_requirements','Requirements',        'section_separator', null],
    [31, 'experience_min_years','Min. Experience (yrs)','number',           null],
    [32, 'education_level',     'Education Level',     'select',            ['Any','High School','Degree','Masters','PhD','Professional Certification']],
    [33, 'required_skills',     'Required Skills',     'skills',            null],
    [34, 'nice_to_have_skills', 'Nice-to-have Skills', 'multi_select',      []],
    [35, 'languages_required',  'Languages Required',  'multi_select',      ['English','Arabic','French','German','Spanish','Mandarin','Portuguese','Hindi','Japanese']],
    [36, 'certifications',      'Certifications',      'text',              null],
    // ── TEAM ─────────────────────────────────────────────────────────────────
    [40, 'section_team',        'Team',                'section_separator', null],
    [41, 'hiring_manager',      'Hiring Manager',      'people',            null],
    [42, 'recruiter',           'Recruiter',           'people',            null],
    [43, 'coordinator',         'Coordinator',         'people',            null],
    [44, 'interviewers',        'Interviewers',        'multi_lookup',      null],
    [45, 'sourcing_partner',    'Sourcing Partner',    'people',            null],
    // ── POSTING ──────────────────────────────────────────────────────────────
    [50, 'section_posting',     'Posting',             'section_separator', null],
    [51, 'posting_status',      'Posting Status',      'select',            ['Not Posted','Draft','Live','Paused','Closed']],
    [52, 'career_site_visible', 'Career Site Visible', 'boolean',           null],
    [53, 'internal_only',       'Internal Only',       'boolean',           null],
    [54, 'job_boards',          'Job Boards',          'multi_select',      ['LinkedIn','Indeed','Glassdoor','Bayt','Naukri','Monster','Reed','Total Jobs','Company Website','Referral','Other']],
    [55, 'posted_date',         'Posted Date',         'date',              null],
    [56, 'application_deadline','Application Deadline','date',              null],
    [57, 'external_job_url',    'External Job URL',    'url',               null],
    [58, 'referral_bonus',      'Referral Bonus',      'currency',          null],
    [59, 'description',         'Job Description',     'rich_text',         null],
    // ── PROCESS & TIMELINE ───────────────────────────────────────────────────
    [60, 'section_process',     'Process & Timeline',  'section_separator', null],
    [61, 'open_date',           'Open Date',           'date',              null],
    [62, 'target_close_date',   'Target Close Date',   'date',              null],
    [63, 'actual_close_date',   'Actual Close Date',   'date',              null],
    [64, 'target_start_date',   'Target Start Date',   'date',              null],
    [65, 'time_to_fill_target', 'Time-to-Fill Target (days)','number',      null],
    // ── APPROVAL ─────────────────────────────────────────────────────────────
    [70, 'section_approval',    'Approval',            'section_separator', null],
    [71, 'approval_status',     'Approval Status',     'select',            ['Not Required','Pending','Approved','Rejected']],
    [72, 'approved_by',         'Approved By',         'people',            null],
    [73, 'approval_date',       'Approval Date',       'date',              null],
    [74, 'cost_centre',         'Cost Centre',         'text',              null],
    [75, 'budget_code',         'Budget Code',         'text',              null],
  ];

  for (const [key, store] of Object.entries(storeCache)) {
    const jobsObjs = (store.objects || []).filter(o => o.slug === 'jobs' && !o.deleted_at);
    for (const obj of jobsObjs) {
      if (!store.fields) store.fields = [];
      const existing = store.fields.filter(f => f.object_id === obj.id && !f.deleted_at);
      const byKey = {};
      existing.forEach(f => { byKey[f.api_key] = f; });

      // Remove broken 'new_inte' field
      store.fields = store.fields.filter(f =>
        !(f.object_id === obj.id && f.api_key === 'new_inte')
      );
      if (byKey['new_inte']) { changed++; }

      // Convert hiring_manager from text to people if still text
      const hmField = store.fields.find(f => f.object_id === obj.id && f.api_key === 'hiring_manager' && !f.deleted_at);
      if (hmField && hmField.field_type === 'text') {
        hmField.field_type = 'people';
        hmField.updated_at = now;
        changed++;
      }

      for (const [sort_order, api_key, name, field_type, options] of SCHEMA) {
        if (byKey[api_key]) {
          const f = byKey[api_key];
          let dirty = false;
          if (f.sort_order !== sort_order) { f.sort_order = sort_order; dirty = true; }
          if (f.name !== name)              { f.name = name; dirty = true; }
          if (options && options.length && JSON.stringify(f.options) !== JSON.stringify(options)) { f.options = options; dirty = true; }
          if (dirty) { f.updated_at = now; changed++; }
        } else {
          // Skip fields that need a lookup_object_id — can't resolve here without the people object
          // They'll be added with null and the app handles gracefully
          store.fields.push({
            id: uid(), object_id: obj.id, environment_id: obj.environment_id,
            name, api_key, field_type,
            sort_order, is_required: false, is_unique: false,
            show_in_list: ['job_title','department','location','status','employment_type','work_type'].includes(api_key),
            show_in_form: true, is_system: true,
            options: options || null,
            lookup_object_id: null,
            condition_field: null, condition_value: null,
            created_at: now, updated_at: now,
          });
          changed++;
        }
      }
    }
    if (changed > 0) saveStoreNow(key);
  }
  if (changed > 0) console.log(`✅ Standard jobs fields migrated (${changed} changes)`);
}
migrateStandardJobFields();

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

// ── Backfill missing IDs on calendar tasks/events ────────────────────────────
function migrateCalendarIds() {
  const { v4: uuid } = require('uuid');
  // Ensure all tenant stores are loaded before scanning
  try {
    const slugs = listTenants();
    slugs.forEach(slug => { if (!storeCache[slug]) loadTenantStore(slug); });
  } catch(_) {}
  let fixed = 0;
  for (const [key, store] of Object.entries(storeCache)) {
    let dirty = false;
    for (const table of ['calendar_tasks', 'calendar_events']) {
      if (!Array.isArray(store[table])) continue;
      for (const row of store[table]) {
        if (!row.id) { row.id = uuid(); dirty = true; fixed++; }
      }
    }
    if (dirty) saveStore(key);
  }
  if (fixed > 0) console.log(`🔑 Backfilled IDs on ${fixed} calendar row(s)`);
}
migrateCalendarIds();
