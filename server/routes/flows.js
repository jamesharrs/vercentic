// server/routes/flows.js — Vercentic Flow Routes
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { executeFlow, validateFlow } = require('../services/flowRunner');

let cron;
try { cron = require('node-cron'); } catch { cron = null; }

const _cronJobs = new Map();

function ensureStore() {
  const s = getStore();
  if (!s.flows)     { s.flows = [];     saveStore(); }
  if (!s.flow_runs) { s.flow_runs = []; saveStore(); }
  return s;
}

function findFlow(id) {
  return (ensureStore().flows || []).find(f => f.id === id && !f.deleted_at) || null;
}

function unregisterCron(flowId) {
  const job = _cronJobs.get(flowId);
  if (job) { job.stop(); _cronJobs.delete(flowId); }
}

function registerCron(flow) {
  if (!cron || flow.trigger?.type !== 'schedule' || !flow.enabled) return;
  const expr = flow.trigger.cron;
  if (!expr || !cron.validate(expr)) {
    console.warn(`[FlowScheduler] Invalid cron '${expr}' for '${flow.name}'`); return;
  }
  unregisterCron(flow.id);
  const job = cron.schedule(expr, async () => {
    console.log(`[FlowScheduler] Running '${flow.name}'`);
    try { await executeFlow(flow.id, { scheduled_at: new Date().toISOString() }, { triggerType: 'schedule' }); }
    catch (e) { console.error(`[FlowScheduler] '${flow.name}' failed:`, e.message); }
  }, { timezone: flow.trigger.timezone || 'UTC' });
  _cronJobs.set(flow.id, job);
  console.log(`[FlowScheduler] Registered '${flow.name}' → ${expr}`);
}

function initScheduler() {
  const s = ensureStore();
  const flows = (s.flows || []).filter(f => !f.deleted_at && f.enabled && f.trigger?.type === 'schedule');
  for (const flow of flows) registerCron(flow);
  console.log(`[FlowScheduler] Initialised — ${flows.length} scheduled flow(s)`);
}

async function flowEventHandler(environmentId, eventType, payload) {
  const s = ensureStore();
  const flows = (s.flows || []).filter(f =>
    !f.deleted_at && f.enabled &&
    f.environment_id === environmentId &&
    f.trigger?.type === 'event' &&
    f.trigger?.event_type === eventType
  );
  for (const flow of flows) {
    setImmediate(async () => {
      try { await executeFlow(flow.id, { event_type: eventType, ...payload }, { triggerType: 'event' }); }
      catch (e) { console.error(`[FlowEngine] Event flow '${flow.name}' failed:`, e.message); }
    });
  }
}

// ── CRUD routes ───────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const flows = (ensureStore().flows || [])
    .filter(f => f.environment_id === environment_id && !f.deleted_at)
    .map(f => ({ ...f, cron_active: _cronJobs.has(f.id), step_count: (f.steps||[]).length }));
  res.json(flows);
});

router.get('/stats/overview', (req, res) => {
  const { environment_id } = req.query;
  const s = ensureStore();
  const flows = (s.flows||[]).filter(f => f.environment_id === environment_id && !f.deleted_at);
  const ids = new Set(flows.map(f => f.id));
  const allRuns = (s.flow_runs||[]).filter(r => ids.has(r.flow_id));
  const now = Date.now();
  const last24h = allRuns.filter(r => now - new Date(r.started_at).getTime() < 86400000);
  res.json({
    total_flows: flows.length, enabled_flows: flows.filter(f => f.enabled).length,
    scheduled_flows: flows.filter(f => f.trigger?.type === 'schedule').length,
    webhook_flows: flows.filter(f => f.trigger?.type === 'webhook').length,
    event_flows: flows.filter(f => f.trigger?.type === 'event').length,
    runs_last_24h: last24h.length,
    success_rate_24h: last24h.length ? Math.round(last24h.filter(r=>r.ok).length/last24h.length*100) : null,
    errors_last_24h: last24h.filter(r => !r.ok).length,
  });
});

router.get('/catalog/steps',    (req, res) => res.json(STEP_CATALOG));
router.get('/catalog/triggers', (req, res) => res.json(TRIGGER_CATALOG));

router.get('/:id', (req, res) => {
  const f = findFlow(req.params.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  res.json({ ...f, cron_active: _cronJobs.has(f.id) });
});

router.post('/', (req, res) => {
  const { environment_id, name, description, trigger, steps, enabled = false, tags = [] } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const v = validateFlow({ name, trigger, steps: steps || [] });
  if (!v.valid) return res.status(400).json({ error: 'Validation failed', errors: v.errors });
  const flow = { id: uuidv4(), environment_id, name, description: description || '',
    trigger: trigger || { type: 'manual' },
    steps: (steps||[]).map((s,i) => ({
      id: s.id || `step_${i+1}`, name: s.name || `Step ${i+1}`,
      type: s.type, config: s.config || {}, enabled: s.enabled !== false,
      on_error: s.on_error || 'stop', run_if: s.run_if || null
    })),
    enabled, tags, run_count: 0, last_run_at: null, last_run_ok: null, last_error: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null };
  const s = getStore(); s.flows.push(flow); saveStore();
  if (flow.enabled) registerCron(flow);
  res.status(201).json(flow);
});

router.patch('/:id', (req, res) => {
  const s = getStore();
  const idx = (s.flows||[]).findIndex(f => f.id === req.params.id && !f.deleted_at);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const allowed = ['name','description','trigger','steps','enabled','tags'];
  const updates = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  s.flows[idx] = { ...s.flows[idx], ...updates }; saveStore();
  if ('trigger' in updates || 'enabled' in updates) {
    unregisterCron(req.params.id);
    if (s.flows[idx].enabled) registerCron(s.flows[idx]);
  }
  res.json(s.flows[idx]);
});

router.delete('/:id', (req, res) => {
  const s = getStore();
  const idx = (s.flows||[]).findIndex(f => f.id === req.params.id && !f.deleted_at);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  s.flows[idx].deleted_at = new Date().toISOString(); s.flows[idx].enabled = false;
  saveStore(); unregisterCron(req.params.id); res.json({ ok: true });
});

router.post('/:id/enable', (req, res) => {
  const s = getStore();
  const idx = (s.flows||[]).findIndex(f => f.id === req.params.id && !f.deleted_at);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  s.flows[idx].enabled = !!req.body.enabled; s.flows[idx].updated_at = new Date().toISOString();
  saveStore(); unregisterCron(req.params.id);
  if (s.flows[idx].enabled) registerCron(s.flows[idx]);
  res.json({ ok: true, enabled: s.flows[idx].enabled });
});

router.post('/:id/run', async (req, res) => {
  const { dry_run = false, payload = {} } = req.body;
  const flow = findFlow(req.params.id);
  if (!flow) return res.status(404).json({ error: 'Not found' });
  try { res.json(await executeFlow(flow.id, { ...payload, _manual: true }, { triggerType: 'manual', dryRun: dry_run })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Inbound webhook trigger — public endpoint given to external systems
router.all('/webhook/:flowId', async (req, res) => {
  const flow = findFlow(req.params.flowId);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  if (flow.trigger?.type !== 'webhook') return res.status(400).json({ error: 'Not a webhook flow' });
  if (!flow.enabled) return res.json({ ok: true, message: 'Flow disabled' });
  if (flow.trigger.hmac_secret) {
    const sig = req.headers['x-signature'] || req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', flow.trigger.hmac_secret).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) return res.status(401).json({ error: 'Invalid signature' });
  }
  res.json({ ok: true, message: 'Flow queued' });
  setImmediate(async () => {
    try { await executeFlow(flow.id, { method: req.method, headers: req.headers, query: req.query, body: req.body, received_at: new Date().toISOString() }, { triggerType: 'webhook' }); }
    catch (e) { console.error(`[FlowEngine] Webhook flow '${flow.name}' failed:`, e.message); }
  });
});

router.get('/:id/runs', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const s = ensureStore();
  const all = (s.flow_runs||[]).filter(r => r.flow_id === req.params.id).sort((a,b) => new Date(b.started_at)-new Date(a.started_at));
  res.json({ runs: all.slice(Number(offset), Number(offset)+Number(limit)), total: all.length });
});

router.get('/:id/runs/:runId', (req, res) => {
  const s = ensureStore();
  const run = (s.flow_runs||[]).find(r => r.id === req.params.runId && r.flow_id === req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

const TRIGGER_CATALOG = [
  { type:'manual',   label:'Manual',         icon:'play',  description:'Run manually or via API' },
  { type:'schedule', label:'Schedule',        icon:'clock', description:'Run on a cron expression',
    fields:[{key:'cron',label:'Cron expression',type:'text',placeholder:'0 9 * * 1-5'},{key:'timezone',label:'Timezone',type:'select',options:['UTC','Asia/Dubai','Europe/London','America/New_York'],default:'UTC'}] },
  { type:'webhook',  label:'Webhook',         icon:'link',  description:'Triggered by an inbound HTTP request',
    fields:[{key:'hmac_secret',label:'HMAC Secret (optional)',type:'password'}] },
  { type:'event',    label:'Vercentic Event', icon:'zap',   description:'Triggered by a platform event',
    fields:[{key:'event_type',label:'Event Type',type:'select',options:['new_application','interview_scheduled','offer_accepted','offer_declined','stage_change','record_created','record_updated','new_hire']}] },
];

const STEP_CATALOG = [
  { type:'http_request',  label:'HTTP Request',       icon:'globe',       color:'#3B82F6', description:'Call any external API' },
  { type:'transform',     label:'Transform',          icon:'shuffle',     color:'#8B5CF6', description:'Map and convert fields' },
  { type:'find_record',   label:'Find Record',        icon:'search',      color:'#0EA5E9', description:'Query Vercentic records' },
  { type:'create_record', label:'Create Record',      icon:'plus-circle', color:'#10B981', description:'Create a Vercentic record' },
  { type:'update_record', label:'Update Record',      icon:'edit',        color:'#F59E0B', description:'Update a Vercentic record' },
  { type:'notify',        label:'Send Notification',  icon:'bell',        color:'#4A154B', description:'Slack or Teams notification' },
  { type:'ai_prompt',     label:'AI Prompt',          icon:'sparkles',    color:'#7C3AED', description:'Vercentic AI completion' },
  { type:'condition',     label:'Condition / Branch', icon:'git-branch',  color:'#F97316', description:'Branch on a condition' },
  { type:'delay',         label:'Delay',              icon:'clock',       color:'#6B7280', description:'Wait N seconds (max 60)' },
  { type:'set_variable',  label:'Set Variable',       icon:'code',        color:'#64748B', description:'Store computed values' },
];

module.exports = { router, initScheduler, flowEventHandler };
