const express = require('express');
const { validate } = require('../middleware/validate');
const { createUserSchema, patchUserSchema, resetPasswordSchema, loginSchema } = require('../validation/schemas');
const { hasGlobalAction } = require('../middleware/rbac');
const crypto = require('crypto');
const { query, findOne, insert, update, remove, getStore, saveStore, saveStoreNow, getCurrentTenant,
        listTenants, loadTenantStore, tenantStorage } = require('../db/init');

// Set the CSRF double-submit cookie on a successful login response
function setCsrfCookie(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('vercentic_csrf', token, {
    httpOnly: false,   // must be JS-readable (that's the whole point)
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain:   process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || '.vercentic.com') : undefined,
    maxAge:   8 * 60 * 60 * 1000,
  });
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
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const bcrypt = require('bcryptjs');
const BCRYPT_ROUNDS = 12;

// Hash a password with bcrypt (async-safe wrapper used synchronously via bcryptjs sync API)
const hashPassword = (pw) => bcrypt.hashSync(pw, BCRYPT_ROUNDS);

// Verify password — supports three formats for backward compat during migration:
//   1. bcrypt hash   ($2a$ or $2b$ prefix) — new standard
//   2. "salt:sha256" — intermediate format created by signup.js
//   3. plain sha256  — legacy fixed-salt format
function verifyPassword(plaintext, storedHash) {
  if (!storedHash) return false;
  // bcrypt
  if (storedHash.startsWith('$2')) {
    return bcrypt.compareSync(plaintext, storedHash);
  }
  // intermediate salted sha256 ("salt:hash")
  if (storedHash.includes(':')) {
    const [salt, hash] = storedHash.split(':');
    const candidate = crypto.createHash('sha256').update(plaintext + salt).digest('hex');
    return candidate === hash;
  }
  // legacy fixed-salt sha256 — verify then silently upgrade to bcrypt on next save
  const legacyHash = crypto.createHash('sha256').update(plaintext + 'talentos_salt').digest('hex');
  return storedHash === legacyHash;
}

// GET all users
router.get('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
  const users = query('users').map(u => {
    const role = findOne('roles', r => r.id === u.role_id);
    return { ...u, password_hash: undefined, role };
  });
  res.json(users);
});

// GET /api/users/me — session check (used by client to verify session is still valid)
router.get('/me', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const u = findOne('users', u => u.id === userId);
  if (!u) return res.status(401).json({ error: 'User not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
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
// Returns 200 {found:false} instead of 404 so the browser network log stays clean
router.get('/by-email/:email', (req, res) => {
  const u = findOne('users', u => u.email === decodeURIComponent(req.params.email));
  if (!u) return res.json({ found: false });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, found: true, password_hash: undefined, role });
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

// ── Self-service preferences (no manage_users permission needed) ──────────────

// GET /api/users/me/preferences
router.get('/me/preferences', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const u = findOne('users', x => x.id === userId);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u.preferences || {});
});

// PATCH /api/users/me/preferences
router.patch('/me/preferences', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const allowedFields = [
    'email_footer', 'email_signature', 'send_as_name', 'send_as_email',
    'reply_to', 'default_cc', 'default_bcc', 'default_greeting',
    'out_of_office_enabled', 'out_of_office_message', 'out_of_office_from', 'out_of_office_until',
    'digest_frequency', 'timezone', 'working_hours_start', 'working_hours_end',
    'avatar_url', 'job_title', 'phone', 'linkedin_url',
  ];
  const incoming = {};
  allowedFields.forEach(k => { if (req.body[k] !== undefined) incoming[k] = req.body[k]; });
  const existing = findOne('users', x => x.id === userId)?.preferences || {};
  const u = update('users', x => x.id === userId, { preferences: { ...existing, ...incoming }, updated_at: new Date().toISOString() });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ ...u, password_hash: undefined });
});

// POST /api/users/me/verify-email — send verification to user's send-as address
router.post('/me/verify-email', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const { send_as_email } = req.body;
  if (!send_as_email) return res.status(400).json({ error: 'send_as_email required' });
  const token = require('crypto').randomBytes(20).toString('hex');
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const existing = findOne('users', x => x.id === userId)?.preferences || {};
  update('users', x => x.id === userId, {
    preferences: { ...existing, send_as_email, send_as_verified: false, send_as_token: token, send_as_token_expires: expires },
    updated_at: new Date().toISOString(),
  });
  // TODO: integrate with mailer.sendEmail() once Resend domain verified
  res.json({ ok: true, message: `Verification sent to ${send_as_email}` });
});

// PATCH update user
router.patch('/:id', validate(patchUserSchema), (req, res) => {
  if (checkGlobal(req, res, 'manage_users') === false) return;
  const { first_name, last_name, email, role_id, status, mfa_enabled, org_unit_id, environment_id, password } = req.body;
  const updates = {};
  if (first_name      !== undefined) updates.first_name      = first_name;
  if (last_name       !== undefined) updates.last_name       = last_name;
  if (email           !== undefined) updates.email           = email.toLowerCase().trim();
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

// POST login — supports cross-store lookup when no tenant context (e.g. www.vercentic.com login)
router.post('/auth/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  // Tenant is already resolved by middleware from the subdomain / X-Tenant-Slug header.
  // We ONLY search the current tenant store — no cross-store lookup.
  // Each environment is fully isolated: john@company.com in tenant A is a
  // completely separate account from john@company.com in tenant B.
  const resolvedSlug = getCurrentTenant();
  const user = findOne('users', u => u.email === email.toLowerCase() && u.status !== 'deactivated');

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  completeLogin(req, res, user, resolvedSlug, password);
});

function completeLogin(req, res, user, tenantSlug, password) {
  if (!verifyPassword(password, user.password_hash)) {
    insert('audit_log', { id:uuidv4(), action:'auth.login_failed', actor:user.email, target_id:user.id, target_type:'user', details:{ reason:'bad_password' }, created_at:new Date().toISOString() });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Silent hash upgrade: if stored as legacy SHA-256, re-hash with bcrypt now
  if (user.password_hash && !user.password_hash.startsWith('$2')) {
    try {
      update('users', u => u.id === user.id, { password_hash: hashPassword(password) });
    } catch(e) { /* non-fatal */ }
  }
  const token = uuidv4() + '-' + uuidv4();
  insert('sessions', { id:uuidv4(), user_id:user.id, token, tenant_slug: tenantSlug, created_at:new Date().toISOString(), expires_at: new Date(Date.now() + 8*60*60*1000).toISOString(), ip: req.ip });
  update('users', u => u.id === user.id, { last_login: new Date().toISOString(), login_count: (user.login_count||0)+1 });
  insert('audit_log', { id:uuidv4(), action:'auth.login', actor:user.email, target_id:user.id, target_type:'user', details:{ tenant: tenantSlug }, created_at:new Date().toISOString() });
  const role = findOne('roles', r => r.id === user.role_id);
  req.session.userId     = user.id;
  req.session.tenantSlug = tenantSlug;

  // CRITICAL: save() must complete before sending the response.
  // Without this, the Set-Cookie header is emitted but the session data
  // hasn't been persisted yet, so the very next request (auth/me, objects, etc.)
  // finds no session and returns 401 — the "logged in but immediately logged out" bug.
  req.session.save((err) => {
    if (err) console.error('[login] session save error:', err);
    setCsrfCookie(res);
    res.json({ token, user: { ...user, password_hash: undefined, role }, tenant_slug: tenantSlug, must_change_password: user.must_change_password });
  });
}

// POST /api/users/exchange-impersonation — exchange a superadmin impersonation token for a real session
router.post('/exchange-impersonation', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  // ALWAYS read impersonation tokens from the master store — they are written
  // there by the SA console regardless of which tenant subdomain the request
  // is coming from.  getStore() respects AsyncLocalStorage context, so we
  // must explicitly run in the master context here.
  let tokenEntry = null;
  let masterStore = null;
  tenantStorage.run('master', () => {
    masterStore = getStore();
    if (!masterStore.impersonation_tokens) return;
    const now = new Date().toISOString();
    tokenEntry = masterStore.impersonation_tokens.find(t =>
      t.token === token && !t.used && t.expires_at > now
    );
    if (tokenEntry) {
      tokenEntry.used = true;
      saveStore('master');
    }
  });

  if (!tokenEntry) return res.status(401).json({ error: 'Invalid or expired token' });

  // Load user — try tenant store first, fall back to master (self-serve signups live there)
  const ts = loadTenantStore(tokenEntry.tenant_slug);
  let user = (ts.users||[]).find(u => u.id === tokenEntry.user_id);
  let role = null;
  let permissions = [];

  if (user) {
    role = (ts.roles||[]).find(r => r.id === user.role_id) || null;
    permissions = role ? ['view','create','edit','delete','export'] : [];
  } else {
    // Self-serve: user is in master store
    tenantStorage.run('master', () => {
      const ms = getStore();
      user = (ms.users||[]).find(u => u.id === tokenEntry.user_id);
      if (user) {
        role = (ms.roles||[]).find(r => r.id === user.role_id) || null;
        permissions = role ? ['view','create','edit','delete','export'] : [];
      }
    });
  }

  if (!user) return res.status(401).json({ error: 'User not found' });

  // ── Establish a real server-side session (same as normal login) ────────────
  // Without this, all subsequent API calls from the client have no valid
  // session cookie and the server returns 401 on every request.
  req.session.userId     = user.id;
  req.session.tenantSlug = tokenEntry.tenant_slug;

  req.session.save((err) => {
    if (err) console.error('[impersonation] session save error:', err);

    // Set the CSRF cookie for subsequent mutating requests.
    // (attachCsrfCookie won't run because req.currentUser isn't set at this point —
    //  attachUser ran before the session was written.)
    const crypto = require('crypto');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('vercentic_csrf', csrfToken, {
      httpOnly: false,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain:   process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || '.vercentic.com') : undefined,
      maxAge:   8 * 60 * 60 * 1000,
    });

    res.json({
      ...user,
      password_hash: undefined,
      role,
      permissions,
      tenant_slug: tokenEntry.tenant_slug,
      impersonated: true,
    });
  });
});

// ── Export ────────────────────────────────────────────────────────────────────
// NOTE: intentionally at TOP — routes defined below are still registered because
// router is exported by reference. module.exports here is purely conventional.

// POST /api/users/login — credential check across current tenant store + fallback search
router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  // Try current store first (set by tenant middleware based on subdomain/header)
  let u = findOne('users', u => u.email === email);
  let resolvedTenantSlug = (() => { const t = getCurrentTenant(); return (t && t !== 'master') ? t : null; })();

  // Search all tenant stores if no tenant resolved yet (e.g. localhost with no subdomain)
  // or if user wasn't found in the current (master) store
  if (!resolvedTenantSlug || !u) {
    const tenants = listTenants ? listTenants() : [];
    for (const slug of tenants) {
      const ts = loadTenantStore(slug);
      const found = (ts.users || []).find(tu => tu.email === email);
      if (found) { u = found; resolvedTenantSlug = slug; break; }
    }
  }

  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.status === 'deactivated') return res.status(403).json({ error: 'Account deactivated' });
  // Use verifyPassword to support both hash formats (new: salt:hash, old: fixed-salt sha256)
  if (!verifyPassword(password, u.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });

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

  // Backfill tenant_slug + environment_id on master-store users who are missing it
  // (happens on first login after provisioning or dev seed)
  if (resolvedTenantSlug && (!u.tenant_slug || !u.environment_id)) {
    try {
      const { loadTenantStore } = require('../db/init');
      const ts  = loadTenantStore(resolvedTenantSlug);
      const env = ts?.environments?.[0];
      if (env) {
        update('users', x => x.id === u.id, {
          tenant_slug:    resolvedTenantSlug,
          environment_id: env.id,
        });
        saveStoreNow('master');
      }
    } catch (_) {}
  }

  // Set httpOnly session cookie (primary auth mechanism).
  // CRITICAL: session.save() must complete before sending the response —
  // otherwise the session isn't persisted to the store (PostgreSQL on Railway)
  // and every subsequent request gets 401 ("logged in → immediately logged out").
  req.session.userId     = u.id;
  req.session.tenantSlug = resolvedTenantSlug;
  req.session.save((err) => {
    if (err) console.error('[login] session save error:', err);
    setCsrfCookie(res);  // JS-readable CSRF double-submit token
    res.json({ ...u, password_hash: undefined, role, permissions, tenant_slug: resolvedTenantSlug });
  });
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
