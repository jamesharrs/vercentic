const { hasGlobalAction } = require("../middleware/rbac");
const { seedPermissionsForNewObject } = require("../middleware/rbac");
function checkGlobal(req,res,action){const u=req.currentUser;if(!u)return null;if(!hasGlobalAction(u,action)){res.status(403).json({error:"Permission denied",code:"FORBIDDEN",required:{action}});return false;}return null;}
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');
const { cacheResponse, invalidatePath } = require('../utils/cache');

// Wraps async route handlers so unhandled promise rejections flow to Express
// global error handler instead of silently crashing the request.
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);


router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({error:'environment_id required'});

  // Non-admin users can only query their own environment
  if (req.currentUser) {
    const role = req.currentUser.role || require('../db/init').findOne('roles', r => r.id === req.currentUser.role_id);
    const isAdmin = role?.slug === 'super_admin' || role?.slug === 'admin';
    if (!isAdmin && req.currentUser.environment_id && req.currentUser.environment_id !== environment_id) {
      return res.status(403).json({ error: 'Access denied to this environment' });
    }
  }

  const objects = query('objects', o=>o.environment_id===environment_id).sort((a,b)=>a.sort_order-b.sort_order);
  const withCounts = objects.map(o => ({
    ...o,
    field_count: query('fields', f=>f.object_id===o.id && (!f.environment_id || f.environment_id===environment_id)).length,
    record_count: query('records', r=>r.object_id===o.id&&r.environment_id===environment_id&&!r.deleted_at).length,
  }));
  res.json(withCounts);
});

router.get('/:id', (req, res) => {
  const obj = findOne('objects', o=>o.id===req.params.id);
  if (!obj) return res.status(404).json({error:'Not found'});
  const { environment_id } = req.query;
  const fields = query('fields', f => {
    if (f.object_id !== req.params.id) return false;
    if (environment_id && f.environment_id && f.environment_id !== environment_id) return false;
    return true;
  }).sort((a,b)=>a.sort_order-b.sort_order);
  res.json({...obj, fields});
});

router.post('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const { environment_id, name, plural_name, slug, icon, color, description } = req.body;
  if (!environment_id||!name||!slug) return res.status(400).json({error:'environment_id, name, slug required'});
  if (findOne('objects', o=>o.environment_id===environment_id&&o.slug===slug)) return res.status(409).json({error:'Slug exists'});
  const maxOrder = Math.max(0, ...query('objects', o=>o.environment_id===environment_id).map(o=>o.sort_order));
  const newObj = insert('objects', {id:uuidv4(),environment_id,name,plural_name:plural_name||name+'s',slug,icon:icon||'circle',color:color||'#3b5bdb',description:description||null,is_system:0,sort_order:maxOrder+1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  // Auto-seed permissions for all roles on the new object
  seedPermissionsForNewObject(slug);
  invalidatePath('objects');
  res.status(201).json(newObj);
});

router.patch('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const o = update('objects', x=>x.id===req.params.id, req.body);
  if (o) invalidatePath('objects');
  o ? res.json(o) : res.status(404).json({error:'Not found'});
});

// ── Impact check before delete ────────────────────────────────────────────────
router.get('/:id/delete-impact', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const obj = findOne('objects', o => o.id === req.params.id);
  if (!obj) return res.status(404).json({ error: 'Not found' });
  if (obj.is_system) return res.status(403).json({ error: 'Cannot delete system objects' });

  const store = getStore();
  const envId = req.query.environment_id;

  const recordCount = query('records', r =>
    r.object_id === obj.id &&
    (envId ? r.environment_id === envId : true) &&
    !r.deleted_at
  ).length;

  const fieldCount = query('fields', f => f.object_id === obj.id).length;

  const workflowCount = (store.workflows || []).filter(w =>
    w.object_id === obj.id && !w.deleted_at
  ).length;

  // Lookup fields that point TO this object from other objects
  const inboundLookups = query('fields', f =>
    f.lookup_object_id === obj.id || f.related_object_id === obj.id
  );

  const inboundCount = inboundLookups.length;

  // People-link pipelines that reference this object's records
  const pipelineLinks = (store.people_links || []).filter(l =>
    l.object_id === obj.id && !l.deleted_at
  ).length;

  const formCount = (store.forms || []).filter(f =>
    (f.applies_to || []).includes(obj.slug) && !f.deleted_at
  ).length;

  const reportCount = (store.datasets || []).filter(d =>
    d.object_id === obj.id
  ).length;

  res.json({
    object: { id: obj.id, name: obj.name, slug: obj.slug, is_system: obj.is_system },
    impact: {
      records:       recordCount,
      fields:        fieldCount,
      workflows:     workflowCount,
      pipeline_links: pipelineLinks,
      inbound_lookups: inboundCount,
      forms:         formCount,
      reports:       reportCount,
    },
    can_delete: !obj.is_system,
    warnings: [
      recordCount   > 0 ? `${recordCount} record${recordCount !== 1 ? 's' : ''} will be permanently deleted` : null,
      fieldCount    > 0 ? `${fieldCount} field definition${fieldCount !== 1 ? 's' : ''} will be removed` : null,
      workflowCount > 0 ? `${workflowCount} workflow${workflowCount !== 1 ? 's' : ''} linked to this object will be deleted` : null,
      pipelineLinks > 0 ? `${pipelineLinks} people currently linked via pipelines will lose those links` : null,
      inboundCount  > 0 ? `${inboundCount} field${inboundCount !== 1 ? 's' : ''} in other objects reference this object and will break` : null,
      formCount     > 0 ? `${formCount} form${formCount !== 1 ? 's' : ''} attached to this object will be unlinked` : null,
      reportCount   > 0 ? `${reportCount} saved report${reportCount !== 1 ? 's' : ''} will lose their data source` : null,
    ].filter(Boolean),
  });
});

router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const obj = findOne('objects', o=>o.id===req.params.id);
  if (!obj) return res.status(404).json({error:'Not found'});
  if (obj.is_system) return res.status(403).json({error:'Cannot delete system objects'});

  const store = getStore();

  // Cascade: soft-delete all records belonging to this object
  const now = new Date().toISOString();
  (store.records || []).forEach(r => {
    if (r.object_id === obj.id && !r.deleted_at) r.deleted_at = now;
  });

  // Remove fields
  store.fields = (store.fields || []).filter(f => f.object_id !== obj.id);

  // Soft-delete workflows
  (store.workflows || []).forEach(w => {
    if (w.object_id === obj.id) w.deleted_at = now;
  });

  // Remove people-link pipeline entries for this object
  (store.people_links || []).forEach(l => {
    if (l.object_id === obj.id) l.deleted_at = now;
  });

  // Remove the object itself
  store.objects = (store.objects || []).filter(o => o.id !== obj.id);

  saveStore();
  invalidatePath('objects');
  invalidatePath('fields');
  invalidatePath('records');

  res.json({ deleted: true, cascaded: { object: obj.name } });
});

module.exports = router;
