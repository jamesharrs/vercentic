// server/middleware/tenant.js
// Sets the tenant context for each request via AsyncLocalStorage.
// getStore() in db/init.js handles lazy loading automatically.

const { tenantStorage, getStore } = require('../db/init');

function slugFromHost(host) {
  if (!host) return null;
  const h = host.split(':')[0];
  const parts = h.split('.');
  if (parts.length < 2) return null;
  const sub = parts[0];
  // Skip reserved/infra subdomains
  if (['www','app','api','admin','localhost','client','portal'].includes(sub)) return null;
  // Skip Railway/Vercel/infra hosts
  if (parts.some(p => ['railway','vercel','up','netlify'].includes(p))) return null;
  return sub;
}

function tenantMiddleware(req, res, next) {
  // Priority order:
  // 1. X-Tenant-Slug header (dev/testing/API clients)
  // 2. ?tenant= query param (used by super admin client links)
  // 3. Subdomain (production custom domains e.g. jamesco.talentos.io)
  // 4. null → master store
  const slug =
    req.headers['x-tenant-slug'] ||
    req.query.tenant ||
    slugFromHost(req.hostname) ||
    null;

  if (!slug || slug === 'master') {
    // No tenant — use master store
    tenantStorage.run('master', next);
    return;
  }

  // Validate: check the user exists in the requested tenant store.
  // If user is in master but not in the tenant, fall back to master.
  // This prevents ?tenant= param from locking out master admins.
  const userId = req.headers['x-user-id'];
  if (userId) {
    tenantStorage.run(slug, () => {
      const tenantStore = getStore();
      const userInTenant = (tenantStore.users || []).find(u => u.id === userId);
      if (!userInTenant) {
        // User not found in tenant store — fall back to master
        tenantStorage.run('master', next);
        return;
      }
      next();
    });
    return;
  }

  // No user ID yet (pre-auth requests like login) — use the requested tenant
  tenantStorage.run(slug, next);
}

module.exports = tenantMiddleware;
