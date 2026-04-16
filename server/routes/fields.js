// server/routes/fields.js  — with response caching
const { hasGlobalAction } = require("../middleware/rbac");
function checkGlobal(req,res,action){const u=req.currentUser;if(!u)return null;if(!hasGlobalAction(u,action)){res.status(403).json({error:"Permission denied",code:"FORBIDDEN",required:{action}});return false;}return null;}
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');
const { cacheResponse, invalidatePath } = require('../utils/cache');

const VALID = ['text','textarea','number','email','phone','url','date','datetime','boolean','select','multi_select','lookup','multi_lookup','file','rich_text','currency','rating'];

// ── LIST — cached 60 s ────────────────────────────────────────────────────────
router.get('/', cacheResponse(60_000), (req, res) => {
  const { object_id } = req.query;
  if (!object_id) return res.status(400).json({error:'object_id required'});
  res.json(query('fields', f=>f.object_id===object_id).sort((a,b)=>a.sort_order-b.sort_order));
});

// ── WRITE handlers ────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const { object_id, environment_id, name, api_key, field_type, is_required, is_unique,
    show_in_list, show_in_form, options, lookup_object_id, default_value,
    placeholder, help_text, sort_order, condition_field, condition_value,
    as_panel, section_label, collapsible, related_object, multi } = req.body;
  if (!object_id||!environment_id||!name||!api_key||!field_type) return res.status(400).json({error:'Missing required fields'});
  if (!VALID.includes(field_type)) return res.status(400).json({error:'Invalid field_type'});
  if (findOne('fields', f=>f.object_id===object_id&&f.api_key===api_key)) return res.status(409).json({error:'api_key already exists on this object'});
  const maxOrder = Math.max(0, ...query('fields', f=>f.object_id===object_id).map(f=>f.sort_order));
  const field = insert('fields', {
    id:uuidv4(), object_id, environment_id, name, api_key, field_type,
    is_required:is_required?1:0, is_unique:is_unique?1:0, is_system:0,
    show_in_list:show_in_list!==undefined?(show_in_list?1:0):1,
    show_in_form:show_in_form!==undefined?(show_in_form?1:0):1,
    options:options||null, lookup_object_id:lookup_object_id||null,
    default_value:default_value||null, placeholder:placeholder||null,
    help_text:help_text||null,
    sort_order:sort_order!==undefined?sort_order:maxOrder+1,
    condition_field:condition_field||null, condition_value:condition_value||null,
    as_panel:as_panel||0, section_label:section_label||null, collapsible:collapsible||0,
    related_object:related_object||null, multi:multi||0,
    created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
  });
  invalidatePath('fields');
  invalidatePath('objects');
  res.status(201).json(field);
});

router.patch('/reorder', (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) return res.status(400).json({error:'orders array required'});
  const updated = orders.map(({id, sort_order}) => update('fields', f=>f.id===id, {sort_order})).filter(Boolean);
  invalidatePath('fields');
  res.json(updated);
});

router.patch('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const f = update('fields', x=>x.id===req.params.id, req.body);
  if (!f) return res.status(404).json({error:'Not found'});
  invalidatePath('fields');
  invalidatePath('objects');
  res.json(f);
});

router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_settings') === false) return;
  const f = findOne('fields', x=>x.id===req.params.id);
  if (!f) return res.status(404).json({error:'Not found'});
  if (f.is_system) return res.status(403).json({error:'Cannot delete system fields'});
  remove('fields', x=>x.id===req.params.id);
  invalidatePath('fields');
  invalidatePath('objects');
  res.json({deleted:true});
});

module.exports = router;
