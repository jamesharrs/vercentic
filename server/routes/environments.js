const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, getCurrentTenant } = require('../db/init');
const { cacheResponse, invalidatePath } = require('../utils/cache');

// Wraps async route handlers so unhandled promise rejections flow to Express
// global error handler instead of silently crashing the request.
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);


router.get('/', cacheResponse(30_000), (req, res) => {
  // x-user-id header is sent by the React app; fall back to session for server-side / curl calls
  const userId = req.headers['x-user-id'] || req.session?.userId;
  const user = userId ? require('../db/init').findOne('users', u => u.id === userId) : null;
  const isSuperAdmin = user?.role_id && (() => {
    const role = require('../db/init').findOne('roles', r => r.id === user.role_id);
    return role?.slug === 'super_admin' || role?.slug === 'admin';
  })();

  const currentTenant = getCurrentTenant();
  const isTenantContext = currentTenant && currentTenant !== 'master';

  // Super admins in a TENANT context see only their own environment
  // (otherwise they'd see zero results because tenant stores don't have master envs)
  if (isSuperAdmin && isTenantContext && user?.environment_id) {
    let env = findOne('environments', e => e.id === user.environment_id);
    if (!env) {
      // Fall back to master client_environments
      const masterStore = require('../db/init').loadTenantStore(null);
      env = (masterStore.client_environments || []).find(e => e.id === user.environment_id && !e.deleted_at);
      if (env) {
        // Seed into tenant store
        const ts = getStore();
        if (!ts.environments) ts.environments = [];
        if (!ts.environments.find(e => e.id === env.id)) ts.environments.push(env);
        require('../db/init').saveStore(currentTenant);
      }
    }
    return res.json(env ? [env] : []);
  }

  // Super admins in master context:
  // - If they belong to a specific client (client_id set), scope to that client's environments only
  // - If they are a true platform admin (no client_id), they see everything
  if (isSuperAdmin) {
    if (user?.client_id) {
      // Client super admin in master store — only see their own environment
      const clientEnvs = query('environments', e =>
        (e.client_id === user.client_id || e.id === user.environment_id) && !e.deleted_at
      );
      // Also check client_environments table
      const s = getStore();
      const clientEnvIds = new Set(clientEnvs.map(e => e.id));
      const fromClientEnvs = (s.client_environments || []).filter(e =>
        e.client_id === user.client_id && !e.deleted_at && !clientEnvIds.has(e.id)
      );
      return res.json([...clientEnvs, ...fromClientEnvs].sort((a, b) =>
        b.is_default - a.is_default || (a.name || '').localeCompare(b.name || '')
      ));
    }
    // True platform admin — see all environments
    const envs = query('environments', () => true)
      .sort((a, b) => {
        if (b.is_default && !a.is_default) return 1;
        if (a.is_default && !b.is_default) return -1;
        if (a.is_sandbox && !b.is_sandbox) return 1;
        if (!a.is_sandbox && b.is_sandbox) return -1;
        return (a.name || '').localeCompare(b.name || '');
      });
    return res.json(envs);
  }

  // Tenant context: look up the environment from master client_environments
  // (tenant stores don't always have a populated environments array)
  if (isTenantContext && user?.environment_id) {
    // First try tenant store's own environments array
    let env = findOne('environments', e => e.id === user.environment_id);

    // Fall back to master client_environments (where provisioned envs live)
    if (!env) {
      const masterStore = require('../db/init').loadTenantStore(null); // load master
      const clientEnv = (masterStore.client_environments || [])
        .find(e => e.id === user.environment_id && !e.deleted_at);
      if (clientEnv) {
        // Seed it into the tenant store so future lookups work
        const ts = getStore();
        if (!ts.environments) ts.environments = [];
        ts.environments.push(clientEnv);
        require('../db/init').saveStore(currentTenant);
        env = clientEnv;
      }
    }
    return res.json(env ? [env] : []);
  }

  // Regular user with specific environment_id (non-tenant context)
  if (!isSuperAdmin && user?.environment_id) {
    const env = findOne('environments', e => e.id === user.environment_id);
    return res.json(env ? [env] : []);
  }

  // Super admin or no user: return all master environments (exclude client-owned ones)
  const envs = query('environments', e => !e.client_id)
    .sort((a, b) => b.is_default - a.is_default);
  res.json(envs);
});
router.get('/:id', (req, res) => { const e = findOne('environments', x=>x.id===req.params.id); e ? res.json(e) : res.status(404).json({error:'Not found'}); });
router.post('/', (req, res) => {
  const { name, slug, description, color } = req.body;
  if (!name||!slug) return res.status(400).json({error:'name and slug required'});
  if (findOne('environments', x=>x.slug===slug)) return res.status(409).json({error:'Slug already exists'});
  const env = insert('environments', {id:uuidv4(),name,slug,description:description||null,color:color||'#3b5bdb',is_default:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  invalidatePath('environments');
  res.status(201).json(env);
});
router.patch('/:id', (req, res) => { const e = update('environments', x=>x.id===req.params.id, req.body); if (e) invalidatePath('environments'); e ? res.json(e) : res.status(404).json({error:'Not found'}); });
module.exports = router;
