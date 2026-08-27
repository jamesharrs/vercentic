/**
 * Feature Flags — /api/feature-flags
 * Per-environment feature flag system. New features ship OFF by default.
 */
const express = require('express');
const router  = express.Router();
const { query, insert, update, findOne } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_FLAGS = {
  // Feature access flags — nav sections
  // Stable — on by default
  ai_copilot: true, ai_matching: true, communications_panel: true,
  workflows: true, portals: true, reports: true, org_chart: true,
  interviews: true, offers: true, forms: true, achievements: true,
  bulk_actions: true, cv_parsing: true, duplicate_detection: true,
  // Nav section flags
  access_calendar: true, access_search: true,
  access_chat: true, access_documents: true,
  access_sourcing: true, access_campaigns: true, access_achievements: true,
  // Record panels — on by default
  panel_notes: true, panel_files: true, panel_activity: true,
  panel_forms: true, panel_recommendations: true,
  panel_linked_records: true,
  panel_tasks: true, panel_assessments: true, panel_engagement: true,
  panel_reporting: true, panel_agents: true, panel_user: true,
  panel_insights: true, panel_questions: true,
  // Advanced admin settings sections — on by default, hidden in lean templates (Basic)
  agents: true, ai_governance: true, data_sets: true, test_scripts: true,
  sandbox: true, enterprise_settings: true,
  // Beta — off by default, enable per client
  linkedin_finder: false, document_extraction: false,
  // Experimental — off everywhere
  voice_copilot: false, predictive_analytics: false, auto_screening: false,
};

function ensureTable() {
  const store = require('../db/init').getStore?.();
  if (store && !store.feature_flags) store.feature_flags = [];
}

// GET /api/feature-flags?environment_id=  — merged flags for an env
router.get('/', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  const overrides = environment_id ? query('feature_flags', f => f.environment_id === environment_id) : [];
  const merged = { ...DEFAULT_FLAGS };
  // perObject: { slug: { panel_notes: bool, panel_tasks: bool, ... } }
  const perObject = {};
  // panelConditions: { panel_key: { field, operator, value } }
  const panelConditions = {};
  overrides.forEach(f => {
    if (f.flag_key.includes('__condition__')) {
      // Panel condition: panel_reporting__condition__person
      const [panelKey, , scope] = f.flag_key.split('__condition__');
      if (!panelConditions[panelKey]) panelConditions[panelKey] = {};
      try { panelConditions[panelKey][scope || 'all'] = typeof f.condition === 'string' ? JSON.parse(f.condition) : f.condition; } catch {}
    } else if (f.flag_key.includes('__')) {
      // Per-object override: panel_notes__talent-pools
      const [baseKey, slug] = f.flag_key.split('__');
      if (!perObject[slug]) perObject[slug] = {};
      perObject[slug][baseKey] = f.enabled;
    } else {
      merged[f.flag_key] = f.enabled;
    }
  });
  res.json({ ...merged, _perObject: perObject, _panelConditions: panelConditions });
});

// GET /api/feature-flags/all — admin view with override status
router.get('/all', (req, res) => {
  ensureTable();
  const { environment_id } = req.query;
  const overrides = environment_id ? query('feature_flags', f => f.environment_id === environment_id) : [];
  const overrideMap = {};
  overrides.forEach(f => { overrideMap[f.flag_key] = f; });
  const flags = Object.entries(DEFAULT_FLAGS).map(([key, defaultVal]) => ({
    key, default: defaultVal,
    overridden: !!overrideMap[key],
    enabled: overrideMap[key] ? overrideMap[key].enabled : defaultVal,
    updated_at: overrideMap[key]?.updated_at || null,
  }));
  res.json({ flags, environment_id });
});

// PUT /api/feature-flags/:key — set a flag for an environment
router.put('/:key', (req, res) => {
  ensureTable();
  const { key } = req.params;
  const { environment_id, enabled, condition } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  // Condition update — key like "panel_reporting__condition__person"
  if (key.includes('__condition__')) {
    const existing = findOne('feature_flags', f => f.environment_id === environment_id && f.flag_key === key);
    const condStr = condition ? JSON.stringify(condition) : null;
    if (existing) {
      update('feature_flags', f => f.id === existing.id, { condition: condStr, enabled: true, updated_at: new Date().toISOString() });
    } else if (condition) {
      insert('feature_flags', { id: uuidv4(), environment_id, flag_key: key, enabled: true, condition: condStr, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return res.json({ key, environment_id, condition });
  }

  // For per-object scoped keys (e.g. panel_tasks__talent-pools), skip base-key validation
  // For global keys, validate against DEFAULT_FLAGS to catch typos
  if (!key.includes('__') && !(key in DEFAULT_FLAGS)) {
    return res.status(404).json({ error: `Unknown flag: ${key}` });
  }
  const existing = findOne('feature_flags', f => f.environment_id === environment_id && f.flag_key === key);
  if (existing) {
    update('feature_flags', f => f.id === existing.id, { enabled: !!enabled, updated_at: new Date().toISOString() });
  } else {
    insert('feature_flags', { id: uuidv4(), environment_id, flag_key: key, enabled: !!enabled, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  res.json({ key, environment_id, enabled: !!enabled });
});

// DELETE /api/feature-flags/:key — reset to default
router.delete('/:key', (req, res) => {
  ensureTable();
  const { key } = req.params;
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const existing = findOne('feature_flags', f => f.environment_id === environment_id && f.flag_key === key);
  if (existing) { const { remove } = require('../db/init'); remove('feature_flags', f => f.id === existing.id); }
  res.json({ key, environment_id, enabled: DEFAULT_FLAGS[key], reset: true });
});

function isEnabled(flagKey, environmentId) {
  ensureTable();
  const override = environmentId ? findOne('feature_flags', f => f.environment_id === environmentId && f.flag_key === flagKey) : null;
  if (override) return override.enabled;
  return DEFAULT_FLAGS[flagKey] ?? false;
}

// Build feature_flags override rows for a template "keep on" allowlist.
// Any default flag whose desired state differs from its default becomes an
// override row. Used at provisioning time to ship a lean environment (Basic).
function overridesForKeepOn(environmentId, keepOn = []) {
  const keep = new Set(keepOn);
  const now  = new Date().toISOString();
  const rows = [];
  for (const [key, def] of Object.entries(DEFAULT_FLAGS)) {
    const desired = keep.has(key);
    if (desired !== def) {
      rows.push({ id: uuidv4(), environment_id: environmentId, flag_key: key, enabled: desired, created_at: now, updated_at: now });
    }
  }
  return rows;
}

module.exports = router;
module.exports.isEnabled = isEnabled;
module.exports.DEFAULT_FLAGS = DEFAULT_FLAGS;
module.exports.overridesForKeepOn = overridesForKeepOn;
