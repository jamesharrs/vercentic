// server/middleware/tenant.js
// Routes every request to the correct tenant store.
// Tenant resolution priority:
//   1. X-Tenant-Slug header (set by client after login)
//   2. ?tenant= query param (super admin client links)
//   3. Subdomain of the request host
//   4. null → master store

const { tenantStorage, getStore, loadTenantStore, listTenants } = require('../db/init');

// Subdomains that are infrastructure — never treated as tenant slugs
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'portal', 'localhost', 'mail', 'smtp', 'ftp', 'static', 'cdn', 'assets']);

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
  const knownTenants = new Set(listTenants ? listTenants() : []);
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
      if (!userInTenant) {
        // User not in tenant store — fall back to master
        tenantStorage.run('master', next);
        return;
      }
      next();
    });
    return;
  }

  // Pre-auth request (e.g. login) — use the tenant store directly
  tenantStorage.run(slug, next);
}

module.exports = tenantMiddleware;
module.exports.slugFromHost = slugFromHost;
