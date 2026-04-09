const express = require('express');
const { validate } = require('../middleware/validate');
const { createUserSchema, patchUserSchema, resetPasswordSchema, loginSchema } = require('../validation/schemas');
const { hasGlobalAction } = require('../middleware/rbac');

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { query, findOne, insert, update, remove } = require('../db/init');

const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

// GET all users
router.get('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
  const users = query('users').map(u => {
    const role = findOne('roles', r => r.id === u.role_id);
    return { ...u, password_hash: undefined, role };
  });
  res.json(users);
});

// GET /api/users/me/:id — refresh user session data (MUST be before /:id wildcard)
router.get('/me/:id', (req, res) => {
  const u = findOne('users', u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  const permissions = query('permissions', p => p.role_id === u.role_id && p.allowed);
  res.json({ ...u, password_hash: undefined, role, permissions });
});

// GET /api/users/by-email/:email — find user linked to a Person record (MUST be before /:id wildcard)
router.get('/by-email/:email', (req, res) => {
  const u = findOne('users', u => u.email === decodeURIComponent(req.params.email));
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
});

// GET single user
router.get('/:id', (req, res) => {
  const u = findOne('users', u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
});

// POST invite/create user
router.post('/', validate(createUserSchema), (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
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
router.patch('/:id', validate(patchUserSchema), (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
  const { first_name, last_name, role_id, status, mfa_enabled, org_unit_id, environment_id, password } = req.body;
  const updates = {};
  if (first_name      !== undefined) updates.first_name      = first_name;
  if (last_name       !== undefined) updates.last_name       = last_name;
  if (role_id         !== undefined) updates.role_id         = role_id;
  if (status          !== undefined) updates.status          = status;
  if (mfa_enabled     !== undefined) updates.mfa_enabled     = mfa_enabled;
  if (org_unit_id     !== undefined) updates.org_unit_id     = org_unit_id || null;
  if (environment_id  !== undefined) updates.environment_id  = environment_id || null;
  if (password        !== undefined && password.length >= 8) updates.password_hash = hashPassword(password);
  const u = update('users', x => x.id === req.params.id, updates);
  if (!u) return res.status(404).json({ error: 'Not found' });
  insert('audit_log', { id:uuidv4(), action:'user.updated', actor:'system', target_id:u.id, target_type:'user', details:updates, created_at:new Date().toISOString() });
  res.json({ ...u, password_hash: undefined });
});

// POST reset password
router.post('/:id/reset-password', validate(resetPasswordSchema), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  update('users', x => x.id === req.params.id, { password_hash: hashPassword(password), must_change_password: 0 });
  insert('audit_log', { id:uuidv4(), action:'user.password_reset', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ success: true });
});

// DELETE (deactivate) user
router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
  const u = findOne('users', x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  update('users', x => x.id === req.params.id, { status: 'deactivated' });
  insert('audit_log', { id:uuidv4(), action:'user.deactivated', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ deactivated: true });
});

// POST login
router.post('/auth/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = findOne('users', u => u.email === email);
  if (!user || user.status === 'deactivated') return res.status(401).json({ error: 'Invalid credentials' });
  if (user.password_hash !== hashPassword(password)) {
    insert('audit_log', { id:uuidv4(), action:'auth.login_failed', actor:email, target_id:user.id, target_type:'user', details:{ reason:'bad_password' }, created_at:new Date().toISOString() });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = uuidv4() + '-' + uuidv4();
  const tenantSlug = require('../db/init').getCurrentTenant();
  insert('sessions', { id:uuidv4(), user_id:user.id, token, tenant_slug: tenantSlug, created_at:new Date().toISOString(), expires_at: new Date(Date.now() + 8*60*60*1000).toISOString(), ip: req.ip });
  update('users', u => u.id === user.id, { last_login: new Date().toISOString(), login_count: (user.login_count||0)+1 });
  insert('audit_log', { id:uuidv4(), action:'auth.login', actor:email, target_id:user.id, target_type:'user', details:{ tenant: tenantSlug }, created_at:new Date().toISOString() });
  const role = findOne('roles', r => r.id === user.role_id);
  // Set httpOnly session cookie (primary auth mechanism)
  req.session.userId     = user.id;
  req.session.tenantSlug = tenantSlug;
  // Also return token/user in body for backward compat (mobile app, Chrome extension, existing clients)
  res.json({ token, user: { ...user, password_hash: undefined, role }, tenant_slug: tenantSlug, must_change_password: user.must_change_password });
});

// POST /api/users/exchange-impersonation — exchange a superadmin impersonation token for a real session
router.post('/exchange-impersonation', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  // Load master store to find the token
  const { loadTenantStore, getStore, saveStore, findOne: masterFindOne } = require('../db/init');
  const s = getStore();
  if (!s.impersonation_tokens) return res.status(401).json({ error: 'Invalid or expired token' });

  const now = new Date().toISOString();
  const tokenEntry = s.impersonation_tokens.find(t =>
    t.token === token && !t.used && t.expires_at > now
  );
  if (!tokenEntry) return res.status(401).json({ error: 'Invalid or expired token' });

  // Mark as used (single-use)
  tokenEntry.used = true;
  saveStore();

  // Load user from tenant store
  const ts = loadTenantStore(tokenEntry.tenant_slug);
  const user = (ts.users||[]).find(u => u.id === tokenEntry.user_id);
  if (!user) return res.status(401).json({ error: 'User not found in tenant' });

  const role = (ts.roles||[]).find(r => r.id === user.role_id) || null;
  const permissions = role ? ['view','create','edit','delete','export'] : [];

  res.json({
    ...user,
    password_hash: undefined,
    role,
    permissions,
    tenant_slug: tokenEntry.tenant_slug,
    impersonated: true,
  });
});

// ── Export ────────────────────────────────────────────────────────────────────
// NOTE: intentionally at TOP — routes defined below are still registered because
// router is exported by reference. module.exports here is purely conventional.

// POST /api/users/login — credential check across current tenant store + fallback search
router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const hashed = hashPassword(password);
  const { getCurrentTenant, listTenants, loadTenantStore, tenantStorage } = require('../db/init');

  // Try current store first (set by tenant middleware based on subdomain/header)
  let u = findOne('users', u => u.email === email);
  let resolvedTenantSlug = (() => { const t = getCurrentTenant(); return (t && t !== 'master') ? t : null; })();

  // If not found in current store, search all tenant stores
  if (!u) {
    const tenants = listTenants ? listTenants() : [];
    for (const slug of tenants) {
      const ts = loadTenantStore(slug);
      const found = (ts.users || []).find(u => u.email === email);
      if (found) { u = found; resolvedTenantSlug = slug; break; }
    }
  }

  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.status === 'deactivated') return res.status(403).json({ error: 'Account deactivated' });
  if (u.password_hash !== hashed) return res.status(401).json({ error: 'Invalid credentials' });

  // Fetch role + permissions from the correct store
  const doInStore = (slug, fn) => {
    let result;
    tenantStorage.run(slug || 'master', () => { result = fn(); });
    return result;
  };
  const storeKey = resolvedTenantSlug || 'master';
  const role        = doInStore(storeKey, () => findOne('roles', r => r.id === u.role_id)) || findOne('roles', r => r.id === u.role_id);
  const permissions = doInStore(storeKey, () => query('permissions', p => p.role_id === u.role_id && p.allowed)) || query('permissions', p => p.role_id === u.role_id && p.allowed);

  // Update last login in the correct store
  doInStore(storeKey, () => {
    update('users', x => x.id === u.id, { last_login: new Date().toISOString(), login_count: (u.login_count||0)+1 });
    insert('audit_log', { id:require('uuid').v4(), action:'user.login', actor:u.id, target_id:u.id, target_type:'user', details:{ email }, created_at:new Date().toISOString() });
  });

  // Set httpOnly session cookie (primary auth mechanism going forward)
  req.session.userId     = u.id;
  req.session.tenantSlug = resolvedTenantSlug;

  res.json({ ...u, password_hash: undefined, role, permissions, tenant_slug: resolvedTenantSlug });
});

// POST /api/users/logout — destroy session cookie
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('[logout] session destroy error', err);
    res.clearCookie('vercentic_sid');
    res.json({ ok: true });
  });
});

module.exports = router;
