const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const dotenv  = require('dotenv');

const ENV_PATH = path.join(__dirname, '../.env');
const SA_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'talentos-internal-2026';

// ── Auth check ────────────────────────────────────────────────────────────────
router.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === SA_PASSWORD) {
    // Find the super admin user to return their ID — used by the console for API calls
    const { getStore } = require('../db/init');
    const store = getStore();
    const admin = (store.users || []).find(u =>
      (u.role?.slug === 'super_admin' || (store.roles||[]).find(r=>r.id===u.role_id)?.slug === 'super_admin')
      && u.status !== 'deactivated'
    ) || (store.users||[])[0];
    // Set a server-side session so API calls from the SA console are authenticated
    req.session.userId     = admin?.id;
    req.session.tenantSlug = 'master'; // SA console always operates in master store context
    req.session.save(() => {});
    res.json({
      ok: true,
      token:   Buffer.from(`sa:${Date.now()}`).toString('base64'),
      user_id: admin?.id || null,
    });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// ── Read .env ─────────────────────────────────────────────────────────────────
router.get('/env', (req, res) => {
  try {
    // On Railway there is no .env file — env vars are injected directly.
    // Try to read the file; if it doesn't exist, fall back to process.env.
    let vars = [];
    let raw  = '';

    const envFileExists = fs.existsSync(ENV_PATH);
    if (envFileExists) {
      raw = fs.readFileSync(ENV_PATH, 'utf8');
      const lines = raw.split('\n');
      let currentComment = '';
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ─')) {
          currentComment = trimmed.replace(/^#\s*─+\s*/, '').replace(/\s*─+\s*$/, '').trim();
        } else if (trimmed.startsWith('#')) {
          // inline comment — skip
        } else if (trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key   = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          vars.push({ key, value, group: currentComment || 'General', line: i });
        }
      });
    } else {
      // Railway / no .env file — expose process.env (filter out internal Node vars)
      const SKIP = ['PATH','HOME','USER','SHELL','TERM','COLORTERM','TMPDIR','LANG',
                    'LC_ALL','PWD','OLDPWD','SHLVL','_','RAILWAY_'];
      Object.entries(process.env).forEach(([key, value], i) => {
        if (SKIP.some(s => key.startsWith(s))) return;
        const group = key.startsWith('TWILIO') ? 'Twilio (SMS + WhatsApp)'
                    : key.startsWith('SENDGRID') ? 'SendGrid (Email)'
                    : key.startsWith('ANTHROPIC') ? 'AI'
                    : key.startsWith('DATABASE') || key.startsWith('PG') ? 'Database'
                    : 'General';
        vars.push({ key, value: value || '', group, line: i, from_env: true });
      });
      raw = '# Environment variables sourced from Railway process.env (no .env file present)';
    }

    res.json({ vars, raw, env_file_exists: envFileExists });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Write .env ────────────────────────────────────────────────────────────────
router.patch('/env', (req, res) => {
  try {
    const { updates } = req.body; // [{ key, value }]
    let raw = fs.readFileSync(ENV_PATH, 'utf8');

    updates.forEach(({ key, value }) => {
      const regex = new RegExp(`^(${key}=).*$`, 'm');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `$1${value}`);
      } else {
        raw += `\n${key}=${value}`;
      }
    });

    fs.writeFileSync(ENV_PATH, raw, 'utf8');

    // Hot-reload into process.env
    updates.forEach(({ key, value }) => { process.env[key] = value; });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── System info ───────────────────────────────────────────────────────────────
router.get('/system', (req, res) => {
  const mem = process.memoryUsage();
  const dataPath = process.env.DATA_PATH || '(not set — using default)';
  res.json({
    node:     process.version,
    uptime:   Math.floor(process.uptime()),
    memory:   { rss: mem.rss, heap: mem.heapUsed, heapTotal: mem.heapTotal },
    env:      process.env.NODE_ENV || 'development',
    pid:      process.pid,
    platform: process.platform,
    data_path: dataPath,
    volume_active: process.env.DATA_PATH ? true : false,
  });
});

// POST /api/superadmin/restore — replace entire data store
router.post("/restore", (req, res) => {
  const { saveStore } = require("../db/init");
  const incoming = req.body.data;
  if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "No data provided" });
  const store = require("../db/init").getStore();
  Object.assign(store, incoming);
  saveStore();
  const counts = Object.fromEntries(Object.entries(incoming).map(([k,v]) => [k, Array.isArray(v) ? v.length : 0]));
  res.json({ ok: true, counts });
});

// POST /api/superadmin/fix-permissions
// Rebuilds super_admin permissions in ALL stores (master + every tenant).
// Safe to call multiple times — always produces the correct full permission set.
router.post('/fix-permissions', (req, res) => {
  const { getStore, saveStore, listTenants, loadTenantStore } = require('../db/init');
  const { seedDefaultPermissions } = require('../middleware/rbac');
  const results = [];

  // Helper: rebuild one store in context
  const fixStore = (label, store) => {
    const before = (store.permissions || []).filter(p => {
      const saRole = (store.roles || []).find(r => r.slug === 'super_admin');
      return saRole && p.role_id === saRole.id;
    }).length;
    seedDefaultPermissions(store);
    saveStore();
    const saRole = (store.roles || []).find(r => r.slug === 'super_admin');
    const after = saRole
      ? (store.permissions || []).filter(p => p.role_id === saRole.id).length
      : 0;
    results.push({ store: label, before, after, roles: (store.roles || []).length });
  };

  // 1. Master store
  try {
    const masterStore = getStore();
    fixStore('master', masterStore);
  } catch (e) {
    results.push({ store: 'master', error: e.message });
  }

  // 2. All tenant stores
  const tenants = listTenants();
  for (const slug of tenants) {
    try {
      const tenantStore = loadTenantStore(slug);
      fixStore(`tenant:${slug}`, tenantStore);
    } catch (e) {
      results.push({ store: `tenant:${slug}`, error: e.message });
    }
  }

  res.json({ ok: true, stores_fixed: results.length, results });
});

// Mark an environment's setup as complete
router.post('/mark-setup-complete', (req, res) => {
  const { environment_id, tenant_slug } = req.body;
  if (!environment_id && !tenant_slug) return res.status(400).json({ error: 'environment_id or tenant_slug required' });
  const { getStore, saveStoreNow, loadTenantStore } = require('../db/init');
  let updated = 0;
  // Update master store
  try {
    const ms = getStore();
    const env = ms.environments?.find(e => e.id === environment_id || e.tenant_slug === tenant_slug);
    if (env) { env.setup_complete = true; env.updated_at = new Date().toISOString(); updated++; }
    saveStoreNow('master');
  } catch {}
  // Update tenant store
  if (tenant_slug) {
    try {
      const ts = loadTenantStore(tenant_slug);
      const env = ts.environments?.find(e => !environment_id || e.id === environment_id);
      if (env) { env.setup_complete = true; env.updated_at = new Date().toISOString(); updated++; }
      saveStoreNow(tenant_slug);
    } catch {}
  }
  res.json({ ok: true, updated });
});


// POST /api/superadmin/reset-password — reset any tenant user's password (SA only)
router.post('/reset-password', (req, res) => {
  const { tenant_slug, email, password } = req.body;
  if (!tenant_slug || !email || !password) return res.status(400).json({ error: 'tenant_slug, email, password required' });
  try {
    const { loadTenantStore, saveStoreNow, tenantStorage } = require('../db/init');
    const bcrypt = require('bcryptjs');
    const hashPassword = (pw) => bcrypt.hashSync(pw, 12);
    const store = loadTenantStore(tenant_slug);
    const user = (store.users || []).find(u => u.email === email);
    if (!user) return res.status(404).json({ error: `User ${email} not found in ${tenant_slug}` });
    user.password_hash = hashPassword(password);
    user.must_change_password = 0;
    user.updated_at = new Date().toISOString();
    saveStoreNow(tenant_slug);
    res.json({ ok: true, email, tenant_slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
