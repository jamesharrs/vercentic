// server/routes/conversational_actions.js
// Admin registry for headless (Slack / Teams) use cases.
// Mounted at /api/conversational-actions — normal authenticated route.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');
const { hasGlobalAction } = require('../middleware/rbac');
const gateway = require('../services/chat_bot_gateway');

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }); return false; }
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

function ensure() {
  const s = getStore();
  if (!s.conversational_actions) { s.conversational_actions = []; saveStore(); }
}

router.get('/templates', (req, res) => {
  try { res.json(require('../data/conversational_action_templates')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta', (req, res) => {
  res.json({
    trigger_types: {
      command: { label: 'Command', description: 'Exact/fuzzy phrase match — good for short fixed commands' },
      intent:  { label: 'Intent',  description: 'AI-classified natural language, with parameter extraction' },
      event:   { label: 'Event',   description: 'Fired by the system, not typed by a user' },
    },
    action_types: Object.keys(gateway.ACTION_REGISTRY).filter(k => k !== 'proactive_notify').reduce((acc, k) => {
      acc[k] = { label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
      return acc;
    }, {}),
    channels: ['slack', 'microsoft_teams'],
    response_types: ['text', 'card', 'list'],
    card_types: ['record_summary', 'digest', 'interview_confirmation', 'ai_summary', 'approval_result', 'new_applicant', 'bulk_result'],
  });
});

router.get('/', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const rows = query('conversational_actions', a => a.environment_id === environment_id && !a.deleted_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = findOne('conversational_actions', a => a.id === req.params.id && !a.deleted_at);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.get('/:id/log', (req, res) => {
  const s = getStore();
  const rows = (s.chat_bot_invocation_log || []).filter(l => l.action_id === req.params.id).slice(0, 50);
  res.json(rows);
});

router.post('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  ensure();
  const { environment_id, name } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const row = insert('conversational_actions', {
    id: uuidv4(), environment_id, name,
    description: req.body.description || '',
    trigger_type: req.body.trigger_type || 'command',
    trigger_phrases: req.body.trigger_phrases || [],
    trigger_event: req.body.trigger_event || null,
    trigger_event_config: req.body.trigger_event_config || {},
    parameters: req.body.parameters || [],
    action_type: req.body.action_type || null,
    action_config: req.body.action_config || {},
    permission_required: req.body.permission_required || null,
    approval_required: !!req.body.approval_required,
    rate_limit_per_user_per_hour: req.body.rate_limit_per_user_per_hour ?? null,
    channels: req.body.channels || [],
    response_type: req.body.response_type || 'text',
    card_type: req.body.card_type || null,
    response_template: req.body.response_template || null,
    status: req.body.status || 'draft',
    is_system: false,
    usage_count: 0, success_count: 0, last_used_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  res.status(201).json(row);
});

router.post('/from-template', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  ensure();
  const { environment_id, template_id } = req.body;
  if (!environment_id || !template_id) return res.status(400).json({ error: 'environment_id and template_id required' });
  const templates = require('../data/conversational_action_templates');
  const tpl = templates.find(t => t.id === template_id);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  const { id, category, category_label, category_color, category_icon, use_case, ...rest } = tpl;
  const row = insert('conversational_actions', {
    id: uuidv4(), environment_id, ...rest,
    status: 'draft', is_system: false,
    usage_count: 0, success_count: 0, last_used_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const row = findOne('conversational_actions', a => a.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const updated = update('conversational_actions', a => a.id === req.params.id, req.body);
  res.json(updated);
});

router.patch('/:id/status', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const { status } = req.body;
  if (!['enabled', 'disabled', 'draft'].includes(status)) return res.status(400).json({ error: 'invalid status' });
  const updated = update('conversational_actions', a => a.id === req.params.id, { status });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const row = findOne('conversational_actions', a => a.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.is_system) return res.status(403).json({ error: 'Cannot delete a system action — disable it instead' });
  update('conversational_actions', a => a.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

router.post('/test', async (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const { environment_id, text, conversation_id } = req.body;
  if (!environment_id || !text) return res.status(400).json({ error: 'environment_id and text required' });
  try {
    const result = await gateway.simulateMessage(req.currentUser, environment_id, text, conversation_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/summary', (req, res) => {
  const { environment_id } = req.query;
  const s = getStore();
  const actions = (s.conversational_actions || []).filter(a => !environment_id || a.environment_id === environment_id);
  const log = (s.chat_bot_invocation_log || []).filter(l => !environment_id || l.environment_id === environment_id);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  res.json({
    total_actions: actions.filter(a => !a.deleted_at).length,
    enabled_actions: actions.filter(a => a.status === 'enabled').length,
    invocations_today: log.filter(l => new Date(l.created_at) >= today).length,
    invocations_total: log.length,
    success_rate: log.length ? Math.round((log.filter(l => l.success).length / log.length) * 100) : null,
    channels_connected: (s.chat_bot_channels || []).filter(c => !environment_id || c.environment_id === environment_id).filter(c => c.status === 'connected').map(c => c.platform),
    top_actions: actions.filter(a => a.usage_count > 0).sort((a, b) => b.usage_count - a.usage_count).slice(0, 5).map(a => ({ id: a.id, name: a.name, usage_count: a.usage_count })),
  });
});

module.exports = router;
