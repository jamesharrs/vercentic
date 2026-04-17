/**
 * Feature Flags — /api/feature-flags
 * Per-environment feature flag system. New features ship OFF by default.
 */
const express = require('express');
const router  = express.Router();
const { query, insert, update, findOne } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_FLAGS = {
  // Stable — on by default
  ai_copilot: true, ai_matching: true, communications_panel: true,
  workflows: true, portals: true, reports: true, org_chart: true,
  interviews: true, offers: true, forms: true,
  bulk_actions: true, cv_parsing: true, duplicate_detection: true,
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
  overrides.forEach(f => { merged[f.flag_key] = f.enabled; });
  res.json(merged);
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
  const { environment_id, enabled } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  if (!(key in DEFAULT_FLAGS)) return res.status(404).json({ error: `Unknown flag: ${key}` });
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
  const existing = findOne('feature_flags', f => f.environment_id === environment_id && f.flag_key === flagKey);
  if (existing) { const { remove } = require('../db/init'); remove('feature_flags', f => f.id === existing.id); }
  res.json({ key, environment_id, enabled: DEFAULT_FLAGS[key], reset: true });
});

function isEnabled(flagKey, environmentId) {
  ensureTable();
  const override = environmentId ? findOne('feature_flags', f => f.environment_id === environmentId && f.flag_key === flagKey) : null;
  if (override) return override.enabled;
  return DEFAULT_FLAGS[flagKey] ?? false;
}

module.exports = router;
module.exports.isEnabled = isEnabled;
module.exports.DEFAULT_FLAGS = DEFAULT_FLAGS;
