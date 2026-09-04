const express = require('express');
const router  = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DEFAULT_SECTIONS = [
  { id:'application',   label:'Application Details', icon:'briefcase', enabled:true,  order:0 },
  { id:'summary',       label:'Summary / Bio',        icon:'align',     enabled:true,  order:1 },
  { id:'experience',    label:'Work Experience',       icon:'award',     enabled:true,  order:2 },
  { id:'education',     label:'Education',             icon:'book',      enabled:true,  order:3 },
  { id:'skills',        label:'Skills',                icon:'zap',       enabled:true,  order:4 },
  { id:'documents',     label:'Documents & CV',        icon:'paperclip', enabled:true,  order:5 },
  { id:'forms',         label:'Form Responses',        icon:'form',      enabled:true,  order:6 },
  { id:'notes',         label:'Notes',                 icon:'edit',      enabled:true,  order:7 },
  { id:'activity',      label:'Stage History',         icon:'activity',  enabled:true,  order:8 },
  { id:'custom_fields', label:'Profile Fields',        icon:'list',      enabled:false, order:9 },
];

function defaultConfigFor(environment_id, object_id) {
  return {
    id: null,
    environment_id,
    object_id: object_id || 'people',
    name: 'Default',
    is_default: true,
    sections: DEFAULT_SECTIONS,
    tabs: [],
    header_fields: ['email','phone','location','linkedin','source'],
    custom_field_ids: [],
  };
}

// ── list all configs (optionally filtered by object_id) ──
router.get('/configs', ah(async (req, res) => {
  const { environment_id, object_id } = req.query;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });
  const store = getStore();
  let configs = (store.talent_profile_configs || []).filter(c => c.environment_id === environment_id);
  if (object_id) configs = configs.filter(c => (c.object_id || 'people') === object_id);
  res.json(configs);
}));

// ── create a new named config ──
router.post('/configs', ah(async (req, res) => {
  const { environment_id, object_id, name, sections, tabs, header_fields, custom_field_ids, is_default } = req.body;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const objId = object_id || 'people';
  if (is_default) {
    store.talent_profile_configs.forEach(c => {
      if (c.environment_id === environment_id && (c.object_id || 'people') === objId) c.is_default = false;
    });
  }
  const cfg = {
    id: uuidv4(),
    environment_id,
    object_id: objId,
    name: name || 'Untitled configuration',
    is_default: !!is_default,
    sections: sections || DEFAULT_SECTIONS,
    tabs: tabs || [],
    header_fields: header_fields || ['email','phone','location','linkedin','source'],
    custom_field_ids: custom_field_ids || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.talent_profile_configs.push(cfg);
  saveStore();
  res.json(cfg);
}));

// ── update a named config by id ──
router.put('/configs/:id', ah(async (req, res) => {
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const idx = store.talent_profile_configs.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error:'Config not found' });
  const existing = store.talent_profile_configs[idx];
  const { name, sections, tabs, header_fields, custom_field_ids, is_default, object_id } = req.body;
  if (is_default) {
    store.talent_profile_configs.forEach(c => {
      if (c.id !== existing.id && c.environment_id === existing.environment_id && (c.object_id || 'people') === (object_id || existing.object_id || 'people')) {
        c.is_default = false;
      }
    });
  }
  const cfg = {
    ...existing,
    name: name ?? existing.name,
    object_id: object_id ?? existing.object_id ?? 'people',
    sections: sections ?? existing.sections,
    tabs: tabs ?? existing.tabs ?? [],
    header_fields: header_fields ?? existing.header_fields,
    custom_field_ids: custom_field_ids ?? existing.custom_field_ids,
    is_default: is_default ?? existing.is_default,
    updated_at: new Date().toISOString(),
  };
  store.talent_profile_configs[idx] = cfg;
  saveStore();
  res.json(cfg);
}));

// ── delete a named config ──
router.delete('/configs/:id', ah(async (req, res) => {
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const idx = store.talent_profile_configs.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error:'Config not found' });
  const removed = store.talent_profile_configs[idx];
  store.talent_profile_configs.splice(idx, 1);
  // if it was the default, promote another config for the same object to default
  if (removed.is_default) {
    const sibling = store.talent_profile_configs.find(c => c.environment_id === removed.environment_id && (c.object_id||'people') === (removed.object_id||'people'));
    if (sibling) sibling.is_default = true;
  }
  saveStore();
  res.json({ success:true });
}));

// ── duplicate a named config ──
router.post('/configs/:id/duplicate', ah(async (req, res) => {
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const existing = store.talent_profile_configs.find(c => c.id === req.params.id);
  if (!existing) return res.status(404).json({ error:'Config not found' });
  const cfg = {
    ...existing,
    id: uuidv4(),
    name: `${existing.name} (copy)`,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.talent_profile_configs.push(cfg);
  saveStore();
  res.json(cfg);
}));

// ── legacy single-config endpoints (back-compat: resolves the default config, People object) ──
router.get('/config', ah(async (req, res) => {
  const { environment_id, object_id } = req.query;
  const store = getStore();
  const configs = store.talent_profile_configs || [];
  const objId = object_id || 'people';
  const found = configs.find(c => c.environment_id === environment_id && (c.object_id || 'people') === objId && c.is_default)
             || configs.find(c => c.environment_id === environment_id && (c.object_id || 'people') === objId);
  if (found) return res.json(found);
  res.json(defaultConfigFor(environment_id, objId));
}));

router.put('/config', ah(async (req, res) => {
  const { environment_id, object_id, sections, tabs, header_fields, custom_field_ids } = req.body;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const objId = object_id || 'people';
  const idx = store.talent_profile_configs.findIndex(c => c.environment_id === environment_id && (c.object_id || 'people') === objId && c.is_default);
  const fallbackIdx = idx >= 0 ? idx : store.talent_profile_configs.findIndex(c => c.environment_id === environment_id && (c.object_id || 'people') === objId);
  const cfg = {
    id: fallbackIdx >= 0 ? store.talent_profile_configs[fallbackIdx].id : uuidv4(),
    environment_id,
    object_id: objId,
    name: fallbackIdx >= 0 ? (store.talent_profile_configs[fallbackIdx].name || 'Default') : 'Default',
    is_default: true,
    sections,
    tabs: tabs || (fallbackIdx >= 0 ? (store.talent_profile_configs[fallbackIdx].tabs || []) : []),
    header_fields,
    custom_field_ids,
    updated_at: new Date().toISOString(),
  };
  if (fallbackIdx >= 0) store.talent_profile_configs[fallbackIdx] = cfg; else store.talent_profile_configs.push(cfg);
  saveStore();
  res.json(cfg);
}));

// ── forms catalog: merge both forms systems into one pickable list ──
router.get('/forms-catalog', ah(async (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  const a = (store.forms || [])
    .filter(f => !environment_id || f.environment_id === environment_id)
    .map(f => ({ id: f.id, name: f.name, source: 'forms', fields: f.fields || [], category: f.category, applies_to: f.applies_to }));
  const b = (store.form_templates || [])
    .filter(f => !environment_id || f.environment_id === environment_id)
    .map(f => ({ id: f.id, name: f.name, source: 'form_templates', fields: f.fields || [], category: f.category, applies_to: f.applies_to }));
  res.json([...a, ...b]);
}));

router.get('/person', ah(async (req, res) => {
  const { person_record_id, link_id, environment_id, object_id } = req.query;
  if (!person_record_id) return res.status(400).json({ error:'person_record_id required' });
  const store = getStore();
  const records = store.records || [];
  const record = records.find(r => r.id === person_record_id);
  if (!record) return res.status(404).json({ error:'Record not found' });
  const fields = (store.field_definitions || []).filter(f => f.object_id === record.object_id);
  const attachments = (store.attachments || []).filter(a => a.record_id === person_record_id && !a.deleted_at);
  const notes = (store.notes || []).filter(n => n.record_id === person_record_id && !n.deleted_at).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const activity = (store.activity_log || []).filter(a => a.record_id === person_record_id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);

  const formResponses = (store.form_responses || [])
    .filter(r => r.record_id === person_record_id)
    .map(resp => {
      const formA = (store.forms || []).find(f => f.id === resp.form_id);
      const formB = (store.form_templates || []).find(f => f.id === resp.form_template_id || f.id === resp.form_id);
      const form = formA || formB;
      return { ...resp, form_name: form?.name || 'Unknown form', form_fields: form?.fields || [] };
    });

  const link = link_id ? (store.people_links || []).find(l => l.id === link_id) : null;
  const stageHistory = link_id ? (store.people_links || []).filter(l => l.id === link_id).map(l => {
    const wf = (store.workflows || []).find(w => w.id === l.workflow_id);
    const target = records.find(r => r.id === l.target_record_id);
    return { ...l, workflow_name: wf?.name || '—', target_name: target?.data?.job_title || target?.data?.name || l.target_record_id?.slice(0,8) };
  }) : [];
  const comms = (store.communications || []).filter(c => c.record_id === person_record_id && !c.deleted_at).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

  const resolvedObjectId = object_id || record.object_id;
  const configs = store.talent_profile_configs || [];
  const profile_config = configs.find(c => c.environment_id === environment_id && (c.object_id || 'people') === resolvedObjectId && c.is_default)
                       || configs.find(c => c.environment_id === environment_id && (c.object_id || 'people') === resolvedObjectId)
                       || defaultConfigFor(environment_id, resolvedObjectId);

  res.json({ record: { ...record }, fields, attachments, notes, activity, formResponses, link, stageHistory, comms, profile_config });
}));

module.exports = router;
