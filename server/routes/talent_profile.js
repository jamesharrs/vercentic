const express = require('express');
const router  = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ─── Default section configuration ─────────────────────────────────────────
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

// ─── GET config ─────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  const configs = store.talent_profile_configs || [];
  const found = configs.find(c => c.environment_id === environment_id);
  if (found) return res.json(found);
  // return defaults
  res.json({
    environment_id,
    sections: DEFAULT_SECTIONS,
    header_fields: ['email','phone','location','linkedin','source'],
    custom_field_ids: [],
  });
});

// ─── PUT config ─────────────────────────────────────────────────────────────
router.put('/config', (req, res) => {
  const { environment_id, sections, header_fields, custom_field_ids } = req.body;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });
  const store = getStore();
  store.talent_profile_configs = store.talent_profile_configs || [];
  const idx = store.talent_profile_configs.findIndex(c => c.environment_id === environment_id);
  const cfg = { id: idx>=0 ? store.talent_profile_configs[idx].id : uuidv4(), environment_id, sections, header_fields, custom_field_ids, updated_at: new Date().toISOString() };
  if (idx>=0) store.talent_profile_configs[idx] = cfg;
  else store.talent_profile_configs.push(cfg);
  saveStore();
  res.json(cfg);
});

// ─── GET full person profile ─────────────────────────────────────────────────
// Returns person record, fields, attachments, notes, activity, form responses, link data
router.get('/person', async (req, res) => {
  const { person_record_id, link_id, environment_id } = req.query;
  if (!person_record_id) return res.status(400).json({ error:'person_record_id required' });
  const store = getStore();

  // Person record
  const records   = store.records || [];
  const record    = records.find(r => r.id === person_record_id);
  if (!record) return res.status(404).json({ error:'Record not found' });

  // Fields for this object
  const fields = (store.field_definitions || []).filter(f => f.object_id === record.object_id);

  // Attachments
  const attachments = (store.attachments || []).filter(a => a.record_id === person_record_id && !a.deleted_at);

  // Notes
  const notes = (store.notes || []).filter(n => n.record_id === person_record_id && !n.deleted_at)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  // Activity log
  const activity = (store.activity_log || []).filter(a => a.record_id === person_record_id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);

  // Form responses
  const formResponses = (store.form_responses || []).filter(r => r.record_id === person_record_id)
    .map(resp => {
      const form = (store.forms || []).find(f => f.id === resp.form_id);
      return { ...resp, form_name: form?.name || 'Unknown form', form_fields: form?.fields || [] };
    });

  // Pipeline link data (stage history etc.) if link_id provided
  const link = link_id ? (store.people_links || []).find(l => l.id === link_id) : null;

  // Stage history for this person across all links
  const stageHistory = (store.people_links || [])
    .filter(l => l.person_record_id === person_record_id)
    .map(l => {
      const wf = (store.workflows || []).find(w => w.id === l.workflow_id);
      const target = records.find(r => r.id === l.target_record_id);
      return { ...l, workflow_name: wf?.name || '—', target_name: target?.data?.job_title || target?.data?.name || l.target_record_id?.slice(0,8) };
    });

  // Communications
  const comms = (store.communications || []).filter(c => c.record_id === person_record_id && !c.deleted_at)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  res.json({ record: { ...record }, fields, attachments, notes, activity, formResponses, link, stageHistory, comms });
});

module.exports = router;
