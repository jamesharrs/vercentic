const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Allow Railway Volume path override via env var (set DATA_PATH=/data in Railway Variables)
const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '../../data');
const DB_PATH  = path.join(DATA_DIR, 'talentos.json');

let store = {
  environments: [], objects: [], fields: [], records: [],
  relationships: [], activity: [],
  users: [], roles: [], permissions: [], sessions: [], audit_log: [],
  org_units: []
};

function loadStore() {
  try {
    // Ensure data directory exists (important on Railway/cloud)
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      store = { ...store, ...loaded };
    } else {
      // Bootstrap empty DB file
      fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
      console.log('Created fresh data store at', DB_PATH);
    }
  } catch(e) { console.log('Starting fresh store:', e.message); }
}

function saveStore() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

function getStore() { return store; }
function query(table, predicate) { return (store[table] || []).filter(predicate || (() => true)); }
function findOne(table, predicate) { return (store[table] || []).find(predicate); }

// Debounced saveStore — batches rapid writes (e.g. field edits) into one disk write
let _saveTimer = null;
function saveStore() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
  }, 150);
}
function saveStoreNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}
function insert(table, record) { if (!store[table]) store[table] = []; store[table].push(record); saveStore(); return record; }
function update(table, predicate, updates) {
  const idx = store[table].findIndex(predicate);
  if (idx === -1) return null;
  store[table][idx] = { ...store[table][idx], ...updates, updated_at: new Date().toISOString() };
  saveStore(); return store[table][idx];
}
function remove(table, predicate) { const before = store[table].length; store[table] = store[table].filter(r => !predicate(r)); saveStore(); return before - store[table].length; }

async function initDB() {
  loadStore();
  if (store.environments && store.environments.length > 0) {
    // Migrate: ensure new tables exist
    if (!store.users) store.users = [];
    if (!store.roles) store.roles = [];
    if (!store.permissions) store.permissions = [];
    if (!store.sessions) store.sessions = [];
    if (!store.audit_log) store.audit_log = [];
    if (!store.org_units) store.org_units = [];
    if (!store.relationships) store.relationships = [];

    // Migrate: add condition columns to existing fields if missing
    (store.fields || []).forEach(f => {
      if (f.condition_field === undefined) f.condition_field = null;
      if (f.condition_value === undefined) f.condition_value = null;
    });

    // Migrate: add person_type_options to existing objects if missing
    (store.objects || []).forEach(o => {
      if (o.person_type_options === undefined) o.person_type_options = null;
      if (o.relationships_enabled === undefined) o.relationships_enabled = 0;
    });

    // Migrate: add Interviewers multi_lookup field to Jobs if missing
    const jobsObjs = (store.objects || []).filter(o => o.slug === 'jobs');
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

    // Migrate: seed person_type + employment fields on People object if missing
    await seedPersonTypeFields();

    await seedUsersAndRoles();
    saveStore();
    console.log('✅ Store loaded');
    return;
  }

  // Seed environments + objects
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
      { name:'Summary', ak:'summary', type:'textarea', list:0, o:12 },
      { name:'Skills', ak:'skills', type:'multi_select', list:0, o:13, opts:[] },
      { name:'Years Experience', ak:'years_experience', type:'number', list:1, o:14 },
      { name:'Rating', ak:'rating', type:'rating', list:1, o:15 },
      // Employment fields — only shown when person_type = Employee
      { name:'Job Title', ak:'job_title', type:'text', list:1, o:16, cond_field:'person_type', cond_val:'Employee' },
      { name:'Department', ak:'department', type:'select', list:1, o:17, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'], cond_field:'person_type', cond_val:'Employee' },
      { name:'Entity', ak:'entity', type:'text', list:1, o:18, cond_field:'person_type', cond_val:'Employee' },
      { name:'Employment Type', ak:'employment_type', type:'select', list:0, o:19, opts:['Full-time','Part-time','Fixed-term','Zero Hours'], cond_field:'person_type', cond_val:'Employee' },
      { name:'Start Date', ak:'start_date', type:'date', list:0, o:20, cond_field:'person_type', cond_val:'Employee' },
      { name:'End Date', ak:'end_date', type:'date', list:0, o:21, cond_field:'person_type', cond_val:'Employee' },
    ],
    jobs: [
      { name:'Job Title', ak:'job_title', type:'text', req:1, list:1, o:1 },
      { name:'Department', ak:'department', type:'select', list:1, o:2, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'] },
      { name:'Location', ak:'location', type:'text', list:1, o:3 },
      { name:'Work Type', ak:'work_type', type:'select', list:1, o:4, opts:['On-site','Remote','Hybrid'] },
      { name:'Employment Type', ak:'employment_type', type:'select', list:1, o:5, opts:['Full-time','Part-time','Contract','Internship','Freelance'] },
      { name:'Status', ak:'status', type:'select', list:1, o:6, opts:['Draft','Open','On Hold','Filled','Cancelled'] },
      { name:'Priority', ak:'priority', type:'select', list:1, o:7, opts:['Low','Medium','High','Critical'] },
      { name:'Salary Min', ak:'salary_min', type:'currency', list:0, o:8 },
      { name:'Salary Max', ak:'salary_max', type:'currency', list:0, o:9 },
      { name:'Hiring Manager', ak:'hiring_manager', type:'text', list:1, o:10 },
      { name:'Description', ak:'description', type:'rich_text', list:0, o:11 },
      { name:'Required Skills', ak:'required_skills', type:'multi_select', list:0, o:12, opts:[] },
      { name:'Open Date', ak:'open_date', type:'date', list:1, o:13 },
      { name:'Target Close Date', ak:'target_close_date', type:'date', list:1, o:14 },
      { name:'Interviewers', ak:'interviewers', type:'multi_lookup', list:0, o:15 },
    ],
    'talent-pools': [
      { name:'Pool Name', ak:'pool_name', type:'text', req:1, list:1, o:1 },
      { name:'Description', ak:'description', type:'textarea', list:1, o:2 },
      { name:'Category', ak:'category', type:'select', list:1, o:3, opts:['Technical','Leadership','Sales','Operations','Creative','Graduates','Diversity','Other'] },
      { name:'Status', ak:'status', type:'select', list:1, o:4, opts:['Active','Inactive','Archived'] },
      { name:'Owner', ak:'owner', type:'text', list:1, o:5 },
      { name:'Tags', ak:'tags', type:'multi_select', list:1, o:6, opts:[] },
    ],
  };

  for (const obj of systemObjects) {
    const objId = uuidv4();
    insert('objects', { id:objId, environment_id:envId, name:obj.name, plural_name:obj.plural, slug:obj.slug, icon:obj.icon, color:obj.color, description:null, is_system:1, sort_order:obj.order, relationships_enabled:0, person_type_options: obj.slug==='people' ? ['Employee','Contractor','Consultant','Candidate','Contact'] : null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    for (const f of (fieldSets[obj.slug]||[])) {
      insert('fields', { id:uuidv4(), object_id:objId, environment_id:envId, name:f.name, api_key:f.ak, field_type:f.type, is_required:f.req||0, is_unique:f.uniq||0, is_system:1, show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, condition_field:f.cond_field||null, condition_value:f.cond_val||null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    }
  }
  // Wire up lookup_object_id for multi_lookup fields
  const peopleObjId = (store.objects||[]).find(o=>o.environment_id===envId&&o.slug==='people')?.id;
  if (peopleObjId) {
    (store.fields||[]).filter(f=>f.environment_id===envId&&f.field_type==='multi_lookup').forEach(f=>{ f.lookup_object_id = peopleObjId; });
    saveStore();
  }

  await seedUsersAndRoles();
  console.log('✅ Seeded default environment + system objects + users');
}

async function seedPersonTypeFields() {
  // Find all People objects across all environments
  const peopleObjects = (store.objects || []).filter(o => o.slug === 'people');
  for (const obj of peopleObjects) {
    const existing = store.fields.filter(f => f.object_id === obj.id);
    // Ensure person_type_options on object
    if (!obj.person_type_options) {
      obj.person_type_options = ['Employee','Contractor','Consultant','Candidate','Contact'];
    }
    if (obj.relationships_enabled === undefined) obj.relationships_enabled = 0;

    const newFields = [
      { name:'Person Type', ak:'person_type', type:'select', list:1, o:6, opts:['Employee','Contractor','Consultant','Candidate','Contact'], cond_field:null, cond_val:null },
      { name:'Job Title', ak:'job_title', type:'text', list:1, o:16, cond_field:'person_type', cond_val:'Employee' },
      { name:'Department', ak:'department', type:'select', list:1, o:17, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'], cond_field:'person_type', cond_val:'Employee' },
      { name:'Entity', ak:'entity', type:'text', list:1, o:18, cond_field:'person_type', cond_val:'Employee' },
      { name:'Employment Type', ak:'employment_type', type:'select', list:0, o:19, opts:['Full-time','Part-time','Fixed-term','Zero Hours'], cond_field:'person_type', cond_val:'Employee' },
      { name:'Start Date', ak:'start_date', type:'date', list:0, o:20, cond_field:'person_type', cond_val:'Employee' },
      { name:'End Date', ak:'end_date', type:'date', list:0, o:21, cond_field:'person_type', cond_val:'Employee' },
    ];
    for (const f of newFields) {
      if (!existing.find(e => e.api_key === f.ak)) {
        insert('fields', { id:uuidv4(), object_id:obj.id, environment_id:obj.environment_id,
          name:f.name, api_key:f.ak, field_type:f.type, is_required:0, is_unique:0, is_system:1,
          show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o,
          options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null,
          help_text:null, condition_field:f.cond_field||null, condition_value:f.cond_val||null,
          created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
      } else {
        // Ensure condition columns exist on existing field
        const ef = existing.find(e => e.api_key === f.ak);
        if (ef.condition_field === undefined) ef.condition_field = f.cond_field || null;
        if (ef.condition_value === undefined) ef.condition_value = f.cond_val || null;
      }
    }
  }
}

async function seedUsersAndRoles() {
  if (store.roles && store.roles.length > 0) return;

  const crypto = require('crypto');
  const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

  // System roles
  const roles = [
    { id: uuidv4(), name: 'Super Admin', slug: 'super_admin', description: 'Full access to everything', is_system: 1, color: '#e03131' },
    { id: uuidv4(), name: 'Admin', slug: 'admin', description: 'Manage users, settings and all data', is_system: 1, color: '#f59f00' },
    { id: uuidv4(), name: 'Recruiter', slug: 'recruiter', description: 'Manage candidates, jobs and talent pools', is_system: 1, color: '#3b5bdb' },
    { id: uuidv4(), name: 'Hiring Manager', slug: 'hiring_manager', description: 'View and provide feedback on candidates', is_system: 1, color: '#0ca678' },
    { id: uuidv4(), name: 'Read Only', slug: 'read_only', description: 'View data only, no edits', is_system: 1, color: '#868e96' },
  ];

  for (const role of roles) {
    insert('roles', { ...role, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }

  // Default permissions per role per object action
  const objects = ['people', 'jobs', 'talent-pools'];
  const actions = ['view', 'create', 'edit', 'delete', 'export'];
  const rolePerms = {
    super_admin:    { view:1, create:1, edit:1, delete:1, export:1 },
    admin:          { view:1, create:1, edit:1, delete:1, export:1 },
    recruiter:      { view:1, create:1, edit:1, delete:0, export:1 },
    hiring_manager: { view:1, create:0, edit:0, delete:0, export:0 },
    read_only:      { view:1, create:0, edit:0, delete:0, export:0 },
  };

  for (const role of roles) {
    for (const obj of objects) {
      const perms = rolePerms[role.slug];
      for (const action of actions) {
        insert('permissions', { id:uuidv4(), role_id:role.id, object_slug:obj, action, allowed:perms[action]||0, created_at:new Date().toISOString() });
      }
    }
  }

  // Default admin user
  const superAdminRole = roles.find(r => r.slug === 'super_admin');
  insert('users', {
    id: uuidv4(), email: 'admin@talentos.io', first_name: 'Admin', last_name: 'User',
    password_hash: hashPassword('Admin1234!'), role_id: superAdminRole.id,
    status: 'active', auth_provider: 'local',
    mfa_enabled: 0, must_change_password: 1,
    last_login: null, last_login_ip: null, login_count: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });

  // Security settings
  if (!store.security_settings) {
    store.security_settings = {
      password_min_length: 8,
      password_require_uppercase: 1,
      password_require_number: 1,
      password_require_symbol: 1,
      password_expiry_days: 90,
      session_timeout_minutes: 60,
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      mfa_required: 0,
      mfa_methods: ['totp', 'email'],
      sso_enabled: 0,
      sso_provider: null,
      sso_client_id: null,
      sso_client_secret: null,
      sso_domain: null,
      allowed_ip_ranges: [],
      updated_at: new Date().toISOString()
    };
    saveStore();
  }
}

module.exports = { getStore, saveStore, saveStoreNow, query, findOne, insert, update, remove, initDB };
