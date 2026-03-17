// server/middleware/tenant.js
const { tenantStorage, loadTenantStore, storeCache } = require('../db/init');

function slugFromHost(host) {
  if (!host) return null;
  const h = host.split(':')[0];
  const parts = h.split('.');
  const ignoredApex = ['localhost', 'railway', 'vercel', 'up'];
  if (parts.length < 2) return null;
  const sub = parts[0];
  if (['www','app','api','admin','localhost','client','portal'].includes(sub)) return null;
  if (ignoredApex.some(i => parts[1].includes(i))) return null;
  return sub;
}

function tenantMiddleware(req, res, next) {
  const slug = req.headers['x-tenant-slug'] || slugFromHost(req.hostname) || null;

  if (slug) {
    const cache = require('../db/init').storeCache;
    if (cache && !cache[slug]) {
      try { loadTenantStore(slug); } catch(e) { /* tenant doesn't exist, use master */ }
    }
  }

  tenantStorage.run(slug || 'master', next);
}

module.exports = tenantMiddleware;
