const { hasGlobalAction } = require("../middleware/rbac");
const { seedPermissionsForNewObject } = require("../middleware/rbac");
function checkGlobal(req,res,action){const u=req.currentUser;if(!u)return null;if(!hasGlobalAction(u,action)){res.status(403).json({error:"Permission denied",code:"FORBIDDEN",required:{action}});return false;}return null;}
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

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
  res.status(201).json(newObj);
});

router.patch('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return; const o = update('objects', x=>x.id===req.params.id, req.body); o ? res.json(o) : res.status(404).json({error:'Not found'}); });

router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const obj = findOne('objects', o=>o.id===req.params.id);
  if (!obj) return res.status(404).json({error:'Not found'});
  if (obj.is_system) return res.status(403).json({error:'Cannot delete system objects'});
  remove('objects', o=>o.id===req.params.id);
  res.json({deleted:true});
});

module.exports = router;
