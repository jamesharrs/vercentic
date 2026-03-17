// server/middleware/tenant.js
// Extracts tenant slug from request and runs subsequent handlers
// within AsyncLocalStorage context so getStore() returns the right data.

const { tenantStorage, loadTenantStore, storeCache } = require('../db/init');

// Derive slug from hostname:
//   acme.talentos.io       → "acme"
//   acme.vercel.app        → "acme" (first subdomain)
//   localhost / talentos-production-4045.up.railway.app → null (master)
function slugFromHost(host) {
  if (!host) return null;
  // Strip port
  const h = host.split(':')[0];
  const parts = h.split('.');
  // Ignore bare localhost, railway URLs, and anything without a meaningful subdomain
  const ignoredApex = ['localhost', 'railway', 'vercel', 'up'];
  if (parts.length < 2) return null;
  const sub = parts[0];
  // Ignore www, app, api, admin — these are reserved
  if (['www','app','api','admin','localhost','client','portal'].includes(sub)) return null;
  // If the second part is railway/vercel infra, skip
  if (ignoredApex.some(i => parts[1].includes(i))) return null;
  return sub;
}

function tenantMiddleware(req, res, next) {
  // Priority: X-Tenant-Slug header (dev/testing) → subdomain → null (master)
  const slug = req.headers['x-tenant-slug'] || slugFromHost(req.hostname) || null;
  
  if (slug) {
    // Pre-load the tenant store if not cached
    const { storeCache } = require('../db/init');
    if (!storeCache[slug]) loadTenantStore(slug);
  }

  // Run the rest of the request chain within the tenant context
  tenantStorage.run(slug || 'master', next);
}

module.exports = tenantMiddleware;
