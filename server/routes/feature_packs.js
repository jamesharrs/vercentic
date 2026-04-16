'use strict';
const router  = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

// ─── Catalogue ────────────────────────────────────────────────────────────────
const FEATURE_CATALOGUE = [
  { key:'core',                  name:'Core ATS',                description:'People, Jobs, Talent Pools, search, records, data model.',                              icon:'database',      category:'Platform',              min_plan:null,         is_core:true  },
  { key:'portal_builder',        name:'Portal Builder',          description:'Build branded career sites, HM portals, agency portals and onboarding experiences.',    icon:'monitor',       category:'Candidate Experience',  min_plan:'starter',    is_core:false },
  { key:'live_chat',             name:'Live Chat',               description:'Real-time chat between portal visitors and recruiters, with bot-to-human handoff.',     icon:'message-circle',category:'Candidate Experience',  min_plan:'growth',     is_core:false },
  { key:'interview_management',  name:'Interview Management',    description:'Calendly-style interview scheduling, types, availability and scorecards.',              icon:'calendar',      category:'Recruitment',           min_plan:'starter',    is_core:false },
  { key:'offer_management',      name:'Offer Management',        description:'End-to-end offer lifecycle with multi-approver chains.',                                icon:'dollar',        category:'Recruitment',           min_plan:'growth',     is_core:false },
  { key:'ai_copilot',            name:'AI Copilot',              description:'Natural language assistant for search, record creation, scheduling and drafting.',      icon:'zap',           category:'AI',                    min_plan:'growth',     is_core:false },
  { key:'ai_screening',          name:'AI Screening',            description:'Automated AI interview bots, scoring and shortlisting.',                               icon:'cpu',           category:'AI',                    min_plan:'enterprise', is_core:false },
  { key:'document_intelligence', name:'Document Intelligence',   description:'CV parsing, ID extraction and document field mapping.',                                icon:'file-text',     category:'AI',                    min_plan:'growth',     is_core:false },
  { key:'advanced_reporting',    name:'Advanced Reporting',      description:'Custom report builder with formulas, charts and saved views.',                         icon:'bar-chart-2',   category:'Analytics',             min_plan:'enterprise', is_core:false },
  { key:'org_chart',             name:'Org Chart',               description:'Visual people graph with relationship management and vacancy tracking.',               icon:'git-branch',    category:'HR',                    min_plan:'growth',     is_core:false },
  { key:'forms',                 name:'Forms Builder',           description:'Create custom forms for screening, surveys and confidential data.',                    icon:'clipboard',     category:'Data',                  min_plan:'starter',    is_core:false },
  { key:'multi_language',        name:'Multi-Language',          description:'AI-generated UI translations with RTL support.',                                       icon:'globe',         category:'Platform',              min_plan:'enterprise', is_core:false },
];

function ensureCollections() {
  const s = getStore();
  if (!s.environment_features) s.environment_features = [];
  saveStore(s);
}

function getEnabledKeys(environmentId) {
  const s = getStore();
  const rows = (s.environment_features || []).filter(f => f.environment_id === environmentId);
  const enabled = new Set(rows.filter(f => f.enabled).map(f => f.feature_key));
  FEATURE_CATALOGUE.filter(p => p.is_core).forEach(p => enabled.add(p.key));
  return enabled;
}

// GET /api/feature-packs/catalogue
router.get('/catalogue', (req, res) => res.json(FEATURE_CATALOGUE));

// GET /api/feature-packs?environment_id=xxx
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  ensureCollections();
  const enabled = getEnabledKeys(environment_id);
  res.json(FEATURE_CATALOGUE.map(pack => ({ ...pack, enabled: enabled.has(pack.key) })));
});

// GET /api/feature-packs/check?environment_id=xxx&key=live_chat
router.get('/check', (req, res) => {
  const { environment_id, key } = req.query;
  if (!environment_id || !key) return res.status(400).json({ error: 'environment_id and key required' });
  ensureCollections();
  const enabled = getEnabledKeys(environment_id);
  res.json({ enabled: enabled.has(key), key });
});

// PUT /api/feature-packs/:key  body: { environment_id, enabled }
router.put('/:key', (req, res) => {
  const { environment_id, enabled } = req.body;
  const key = req.params.key;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const pack = FEATURE_CATALOGUE.find(p => p.key === key);
  if (!pack) return res.status(404).json({ error: 'Feature pack not found' });
  if (pack.is_core) return res.status(400).json({ error: 'Core features cannot be disabled' });
  ensureCollections();
  const s = getStore();
  const idx = s.environment_features.findIndex(f => f.environment_id === environment_id && f.feature_key === key);
  const now = new Date().toISOString();
  const userId = req.headers['x-user-id'] || null;
  if (idx === -1) {
    s.environment_features.push({ id: uuidv4(), environment_id, feature_key: key, enabled: enabled !== false, enabled_at: enabled !== false ? now : null, enabled_by: userId, created_at: now });
  } else {
    s.environment_features[idx] = { ...s.environment_features[idx], enabled: enabled !== false, enabled_at: enabled !== false ? now : s.environment_features[idx].enabled_at, enabled_by: enabled !== false ? userId : s.environment_features[idx].enabled_by, disabled_at: enabled === false ? now : null, updated_at: now };
  }
  saveStore(s);
  res.json({ key, enabled: enabled !== false, environment_id });
});

// POST /api/feature-packs/bulk  body: { environment_id, keys: [] }
router.post('/bulk', (req, res) => {
  const { environment_id, keys = [] } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  ensureCollections();
  const s = getStore();
  const now = new Date().toISOString();
  const userId = req.headers['x-user-id'] || null;
  for (const key of keys) {
    const pack = FEATURE_CATALOGUE.find(p => p.key === key);
    if (!pack || pack.is_core) continue;
    const idx = s.environment_features.findIndex(f => f.environment_id === environment_id && f.feature_key === key);
    if (idx === -1) {
      s.environment_features.push({ id: uuidv4(), environment_id, feature_key: key, enabled: true, enabled_at: now, enabled_by: userId, created_at: now });
    } else {
      s.environment_features[idx].enabled = true;
      s.environment_features[idx].enabled_at = now;
      s.environment_features[idx].updated_at = now;
    }
  }
  saveStore(s);
  res.json({ enabled: keys, environment_id });
});

module.exports = router;
module.exports.FEATURE_CATALOGUE = FEATURE_CATALOGUE;
module.exports.getEnabledKeys = getEnabledKeys;
