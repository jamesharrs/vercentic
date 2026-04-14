// server/middleware/tenant.js
// Routes every request to the correct tenant store.
// Tenant resolution priority:
//   1. X-Tenant-Slug header (set by client after login)
//   2. ?tenant= query param (super admin client links)
//   3. Subdomain of the request host
//   4. null → master store

const { tenantStorage, getStore, loadTenantStore, listTenants, storeCache } = require('../db/init');

// Subdomains that are infrastructure — never treated as tenant slugs
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'portal', 'localhost', 'mail', 'smtp', 'ftp', 'static', 'cdn', 'assets']);

// Cache listTenants() result — recompute at most every 30s to avoid per-request overhead
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
// Expose for invalidation after provisioning a new tenant
function invalidateTenantCache() { _tenantCache = null; }

function slugFromHost(host) {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase();
  const parts = h.split('.');
  // Must have at least subdomain.domain.tld
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (RESERVED.has(sub)) return null;
  // Skip Railway/Vercel/Netlify infra hosts
  if (parts.some(p => ['railway', 'vercel', 'up', 'netlify', 'herokuapp'].includes(p))) return null;
  return sub;
}

function tenantMiddleware(req, res, next) {
  const slug =
    req.headers['x-tenant-slug'] ||
    req.query.tenant ||
    slugFromHost(req.hostname) ||
    null;

  if (!slug || slug === 'master') {
    tenantStorage.run('master', next);
    return;
  }

  // Validate the slug actually exists as a tenant file
  const knownTenants = cachedTenants();
  if (!knownTenants.has(slug)) {
    // Unknown slug — fall back to master
    tenantStorage.run('master', next);
    return;
  }

  const userId = req.headers['x-user-id'];
  if (userId) {
    // Check if user exists in the tenant store
    tenantStorage.run(slug, () => {
      const tenantStore = getStore();
      const userInTenant = (tenantStore.users || []).find(u => u.id === userId && u.status !== 'deactivated');
      if (userInTenant) {
        next();
        return;
      }

      // User not in tenant store — check if they are a super admin in master
      // Super admins can access any tenant store (for support, demo viewing etc.)
      const masterStore = storeCache['master'] || loadTenantStore(null);
      const masterUser  = (masterStore.users || []).find(u => u.id === userId && u.status !== 'deactivated');
      const masterRole  = masterUser
        ? ((masterStore.roles || []).find(r => r.id === masterUser.role_id)?.slug || masterUser.role_name || '')
        : '';
      if (masterUser && (masterRole === 'super_admin' || masterUser.is_super_admin)) {
        // Super admin from master — allow through to the requested tenant store
        next();
        return;
      }

      // Not in tenant, not super admin — fall back to master
      tenantStorage.run('master', next);
    });
    return;
  }

  // Pre-auth request (e.g. login) — use the tenant store directly
  tenantStorage.run(slug, next);
}

module.exports = tenantMiddleware;
module.exports.slugFromHost = slugFromHost;
module.exports.invalidateTenantCache = invalidateTenantCache;
