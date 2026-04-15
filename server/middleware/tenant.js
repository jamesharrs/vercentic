// server/middleware/tenant.js
// Routes every request to the correct tenant store.
//
// SECURITY MODEL:
//   Authenticated requests  → tenant is locked to req.session.tenantSlug (server-side, cannot be spoofed)
//   Unauthenticated requests → tenant resolved from X-Tenant-Slug header / ?tenant= / subdomain
//   Vercentic internal admins (is_vercentic_admin: true in master) → may switch tenants via header (support use)

const { tenantStorage, getStore, loadTenantStore, listTenants, storeCache } = require('../db/init');

const RESERVED = new Set(['www','app','api','admin','portal','localhost','mail','smtp','ftp','static','cdn','assets']);

let _tenantCache = null;
let _tenantCacheAt = 0;
function cachedTenants() {
  const now = Date.now();
  if (!_tenantCache || now - _tenantCacheAt > 30000) {
    _tenantCache = new Set(listTenants ? listTenants() : []);
    _tenantCacheAt = now;
  }
  return _tenantCache;
}
function invalidateTenantCache() { _tenantCache = null; }

function slugFromHost(host) {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase();
  const parts = h.split('.');
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (RESERVED.has(sub)) return null;
  if (parts.some(p => ['railway','vercel','up','netlify','herokuapp'].includes(p))) return null;
  return sub;
}

function tenantMiddleware(req, res, next) {
  // ── 1. Authenticated session takes priority ────────────────────────────────
  // If the session has a tenantSlug, the user already authenticated into a specific
  // tenant. Lock them to it — do not allow headers or query params to override.
  const sessionTenant = req.session?.tenantSlug;
  if (sessionTenant && sessionTenant !== 'master') {
    // Check if this is a Vercentic internal admin (can switch tenants for support)
    const userId = req.session.userId || req.headers['x-user-id'];
    const masterStore = storeCache['master'] || loadTenantStore(null);
    const masterUser  = userId ? (masterStore.users || []).find(u => u.id === userId) : null;
    const isVercenticAdmin = masterUser?.is_vercentic_admin === true;

    if (isVercenticAdmin) {
      // Internal admin may use header to switch tenant (support/demo purposes)
      const requestedSlug = req.headers['x-tenant-slug'] || req.query.tenant || sessionTenant;
      const knownTenants  = cachedTenants();
      const slug = (requestedSlug && requestedSlug !== 'master' && knownTenants.has(requestedSlug))
        ? requestedSlug : sessionTenant;
      return tenantStorage.run(slug, next);
    }

    // Regular authenticated user — strictly locked to their session tenant
    const knownTenants = cachedTenants();
    if (knownTenants.has(sessionTenant)) {
      return tenantStorage.run(sessionTenant, next);
    }
    // Session tenant no longer valid — fall through to master
    return tenantStorage.run('master', next);
  }

  // ── 2. No active session — resolve from client hints (login, signup, portal) ─
  const slug =
    req.headers['x-tenant-slug'] ||
    req.query.tenant              ||
    slugFromHost(req.hostname)    ||
    null;

  if (!slug || slug === 'master') {
    return tenantStorage.run('master', next);
  }

  const knownTenants = cachedTenants();
  if (!knownTenants.has(slug)) {
    return tenantStorage.run('master', next);
  }

  // Pre-auth request (login, portal public routes, etc.) — use requested tenant
  tenantStorage.run(slug, next);
}

module.exports = tenantMiddleware;
module.exports.slugFromHost = slugFromHost;
module.exports.invalidateTenantCache = invalidateTenantCache;
