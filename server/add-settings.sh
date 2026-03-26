#!/bin/bash
set -e
echo "🔧 Adding Settings: Users, Roles, Permissions, Security..."

# ── Add users/roles/sessions to the JSON store ───────────────────────────────
cat > db/init.js << 'EOF'
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '../../data/talentos.json');

let store = {
  environments: [], objects: [], fields: [], records: [],
  relationships: [], activity: [],
  users: [], roles: [], permissions: [], sessions: [], audit_log: []
};

function loadStore() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      store = { ...store, ...loaded };
    }
  } catch(e) { console.log('Starting fresh store'); }
}

function saveStore() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

function getStore() { return store; }
function query(table, predicate) { return (store[table] || []).filter(predicate || (() => true)); }
function findOne(table, predicate) { return (store[table] || []).find(predicate); }
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
    await seedUsersAndRoles();
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
      { name:'Current Title', ak:'current_title', type:'text', list:1, o:6 },
      { name:'Current Company', ak:'current_company', type:'text', list:1, o:7 },
      { name:'Status', ak:'status', type:'select', list:1, o:8, opts:['Active','Passive','Not Looking','Placed','Archived'] },
      { name:'Source', ak:'source', type:'select', list:1, o:9, opts:['LinkedIn','Referral','Job Board','Direct Apply','Agency','Event','Other'] },
      { name:'LinkedIn URL', ak:'linkedin_url', type:'url', list:0, o:10 },
      { name:'Summary', ak:'summary', type:'textarea', list:0, o:11 },
      { name:'Skills', ak:'skills', type:'multi_select', list:0, o:12, opts:[] },
      { name:'Years Experience', ak:'years_experience', type:'number', list:1, o:13 },
      { name:'Rating', ak:'rating', type:'rating', list:1, o:14 },
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
    insert('objects', { id:objId, environment_id:envId, name:obj.name, plural_name:obj.plural, slug:obj.slug, icon:obj.icon, color:obj.color, description:null, is_system:1, sort_order:obj.order, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    for (const f of (fieldSets[obj.slug]||[])) {
      insert('fields', { id:uuidv4(), object_id:objId, environment_id:envId, name:f.name, api_key:f.ak, field_type:f.type, is_required:f.req||0, is_unique:f.uniq||0, is_system:1, show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    }
  }

  await seedUsersAndRoles();
  console.log('✅ Seeded default environment + system objects + users');
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

module.exports = { getStore, query, findOne, insert, update, remove, initDB };
EOF

# ── routes/users.js ──────────────────────────────────────────────────────────
cat > routes/users.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { query, findOne, insert, update, remove } = require('../db/init');

const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

// GET all users
router.get('/', (req, res) => {
  const users = query('users').map(u => {
    const role = findOne('roles', r => r.id === u.role_id);
    return { ...u, password_hash: undefined, role };
  });
  res.json(users);
});

// GET single user
router.get('/:id', (req, res) => {
  const u = findOne('users', u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
});

// POST invite/create user
router.post('/', (req, res) => {
  const { email, first_name, last_name, role_id, auth_provider = 'local' } = req.body;
  if (!email || !first_name || !last_name || !role_id) return res.status(400).json({ error: 'email, first_name, last_name, role_id required' });
  if (findOne('users', u => u.email === email)) return res.status(409).json({ error: 'Email already exists' });
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const user = insert('users', {
    id: uuidv4(), email, first_name, last_name, role_id,
    password_hash: hashPassword(tempPassword),
    status: 'invited', auth_provider,
    mfa_enabled: 0, must_change_password: 1,
    last_login: null, last_login_ip: null, login_count: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  // Log audit
  insert('audit_log', { id:uuidv4(), action:'user.created', actor:'system', target_id:user.id, target_type:'user', details:{ email }, created_at:new Date().toISOString() });
  res.status(201).json({ ...user, password_hash: undefined, temp_password: tempPassword });
});

// PATCH update user
router.patch('/:id', (req, res) => {
  const { first_name, last_name, role_id, status, mfa_enabled } = req.body;
  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name;
  if (last_name !== undefined) updates.last_name = last_name;
  if (role_id !== undefined) updates.role_id = role_id;
  if (status !== undefined) updates.status = status;
  if (mfa_enabled !== undefined) updates.mfa_enabled = mfa_enabled;
  const u = update('users', x => x.id === req.params.id, updates);
  if (!u) return res.status(404).json({ error: 'Not found' });
  insert('audit_log', { id:uuidv4(), action:'user.updated', actor:'system', target_id:u.id, target_type:'user', details:updates, created_at:new Date().toISOString() });
  res.json({ ...u, password_hash: undefined });
});

// POST reset password
router.post('/:id/reset-password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  update('users', x => x.id === req.params.id, { password_hash: hashPassword(password), must_change_password: 0 });
  insert('audit_log', { id:uuidv4(), action:'user.password_reset', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ success: true });
});

// DELETE (deactivate) user
router.delete('/:id', (req, res) => {
  const u = findOne('users', x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  update('users', x => x.id === req.params.id, { status: 'deactivated' });
  insert('audit_log', { id:uuidv4(), action:'user.deactivated', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ deactivated: true });
});

// POST login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = findOne('users', u => u.email === email);
  if (!user || user.status === 'deactivated') return res.status(401).json({ error: 'Invalid credentials' });
  if (user.password_hash !== hashPassword(password)) {
    insert('audit_log', { id:uuidv4(), action:'auth.login_failed', actor:email, target_id:user.id, target_type:'user', details:{ reason:'bad_password' }, created_at:new Date().toISOString() });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = uuidv4() + '-' + uuidv4();
  insert('sessions', { id:uuidv4(), user_id:user.id, token, created_at:new Date().toISOString(), expires_at: new Date(Date.now() + 60*60*1000).toISOString(), ip: req.ip });
  update('users', u => u.id === user.id, { last_login: new Date().toISOString(), login_count: (user.login_count||0)+1 });
  insert('audit_log', { id:uuidv4(), action:'auth.login', actor:email, target_id:user.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  const role = findOne('roles', r => r.id === user.role_id);
  res.json({ token, user: { ...user, password_hash: undefined, role }, must_change_password: user.must_change_password });
});

module.exports = router;
EOF

# ── routes/roles.js ──────────────────────────────────────────────────────────
cat > routes/roles.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

// GET all roles with user counts
router.get('/', (req, res) => {
  const roles = query('roles').map(role => ({
    ...role,
    user_count: query('users', u => u.role_id === role.id && u.status !== 'deactivated').length,
    permissions: query('permissions', p => p.role_id === role.id)
  }));
  res.json(roles);
});

// GET single role
router.get('/:id', (req, res) => {
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  const permissions = query('permissions', p => p.role_id === req.params.id);
  const users = query('users', u => u.role_id === req.params.id).map(u => ({ ...u, password_hash: undefined }));
  res.json({ ...role, permissions, users });
});

// POST create custom role
router.post('/', (req, res) => {
  const { name, description, color, clone_from_role_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const id = uuidv4();
  const role = insert('roles', { id, name, slug, description: description||'', color: color||'#3b5bdb', is_system: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  // Clone permissions from another role if specified
  if (clone_from_role_id) {
    const sourcePerms = query('permissions', p => p.role_id === clone_from_role_id);
    for (const perm of sourcePerms) {
      insert('permissions', { ...perm, id: uuidv4(), role_id: id, created_at: new Date().toISOString() });
    }
  }
  res.status(201).json(role);
});

// PATCH update role
router.patch('/:id', (req, res) => {
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.is_system) return res.status(403).json({ error: 'Cannot modify system roles' });
  const updated = update('roles', r => r.id === req.params.id, req.body);
  res.json(updated);
});

// DELETE role (custom only)
router.delete('/:id', (req, res) => {
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.is_system) return res.status(403).json({ error: 'Cannot delete system roles' });
  remove('roles', r => r.id === req.params.id);
  remove('permissions', p => p.role_id === req.params.id);
  res.json({ deleted: true });
});

// GET permissions for a role
router.get('/:id/permissions', (req, res) => {
  res.json(query('permissions', p => p.role_id === req.params.id));
});

// PUT update permissions for a role (bulk replace)
router.put('/:id/permissions', (req, res) => {
  const { permissions } = req.body; // [{ object_slug, action, allowed }]
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });
  for (const perm of permissions) {
    const existing = findOne('permissions', p => p.role_id === req.params.id && p.object_slug === perm.object_slug && p.action === perm.action);
    if (existing) update('permissions', p => p.id === existing.id, { allowed: perm.allowed ? 1 : 0 });
    else insert('permissions', { id:uuidv4(), role_id:req.params.id, object_slug:perm.object_slug, action:perm.action, allowed:perm.allowed?1:0, created_at:new Date().toISOString() });
  }
  res.json(query('permissions', p => p.role_id === req.params.id));
});

module.exports = router;
EOF

# ── routes/security.js ───────────────────────────────────────────────────────
cat > routes/security.js << 'EOF'
const express = require('express');
const router = express.Router();
const { getStore, insert, update } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// GET security settings
router.get('/settings', (req, res) => {
  const store = getStore();
  res.json(store.security_settings || {});
});

// PATCH update security settings
router.patch('/settings', (req, res) => {
  const store = getStore();
  store.security_settings = { ...store.security_settings, ...req.body, updated_at: new Date().toISOString() };
  const fs = require('fs'); const path = require('path');
  const DB_PATH = path.join(__dirname, '../../data/talentos.json');
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
  res.json(store.security_settings);
});

// GET audit log
router.get('/audit-log', (req, res) => {
  const store = getStore();
  const { page=1, limit=50, action, actor } = req.query;
  let logs = (store.audit_log || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (action) logs = logs.filter(l => l.action.includes(action));
  if (actor) logs = logs.filter(l => l.actor && l.actor.includes(actor));
  const total = logs.length;
  const start = (parseInt(page)-1)*parseInt(limit);
  res.json({ logs: logs.slice(start, start+parseInt(limit)), pagination:{total,page:parseInt(page),limit:parseInt(limit),pages:Math.ceil(total/parseInt(limit))} });
});

// GET active sessions
router.get('/sessions', (req, res) => {
  const store = getStore();
  const now = new Date();
  const active = (store.sessions || []).filter(s => new Date(s.expires_at) > now).map(s => {
    const user = (store.users||[]).find(u => u.id === s.user_id);
    return { ...s, token: s.token.substring(0,8)+'...', user: user ? { id:user.id, email:user.email, first_name:user.first_name, last_name:user.last_name } : null };
  });
  res.json(active);
});

// DELETE revoke session
router.delete('/sessions/:id', (req, res) => {
  const { remove } = require('../db/init');
  remove('sessions', s => s.id === req.params.id);
  res.json({ revoked: true });
});

module.exports = router;
EOF

# ── Update index.js to include new routes ────────────────────────────────────
cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/init');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/environments', require('./routes/environments'));
app.use('/api/objects',      require('./routes/objects'));
app.use('/api/fields',       require('./routes/fields'));
app.use('/api/records',      require('./routes/records'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/roles',        require('./routes/roles'));
app.use('/api/security',     require('./routes/security'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

initDB().then(() => {
  app.listen(3001, () => console.log('TalentOS API → http://localhost:3001'));
}).catch(err => { console.error(err); process.exit(1); });
EOF

echo "✅ Backend updated. Restarting server..."
echo ""
echo "Now update the frontend — copy the new App.jsx from Claude, then:"
echo "  Tab 1: node index.js"
echo "  Tab 2: cd ../client && npm run dev"
