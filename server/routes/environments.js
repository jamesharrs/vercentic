const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, getCurrentTenant } = require('../db/init');

router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = userId ? require('../db/init').findOne('users', u => u.id === userId) : null;
  const isSuperAdmin = user?.role_id && (() => {
    const role = require('../db/init').findOne('roles', r => r.id === user.role_id);
    return role?.slug === 'super_admin' || role?.slug === 'admin';
  })();

  const currentTenant = getCurrentTenant();
  const isTenantContext = currentTenant && currentTenant !== 'master';

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
  res.status(201).json(insert('environments', {id:uuidv4(),name,slug,description:description||null,color:color||'#3b5bdb',is_default:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
});
router.patch('/:id', (req, res) => { const e = update('environments', x=>x.id===req.params.id, req.body); e ? res.json(e) : res.status(404).json({error:'Not found'}); });
module.exports = router;
