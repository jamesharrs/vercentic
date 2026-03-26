const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');
const eventBus = require('../services/eventBus');

function ensureTables() {
  const store = getStore();
  if (!store.webhooks) store.webhooks = [];
  if (!store.webhook_deliveries) store.webhook_deliveries = [];
  if (!store.inbound_webhooks) store.inbound_webhooks = [];
}

function generateSecret() { return 'whsec_' + crypto.randomBytes(24).toString('hex'); }

function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return { signature: `v1=${signature}`, timestamp };
}

const RETRY_DELAYS = [0, 5000, 30000, 120000, 600000];

async function deliverWebhook(webhook, event) {
  const delivery = { id: uuidv4(), webhook_id: webhook.id, event_type: event.type, event_id: event.id,
    status: 'pending', attempts: 0, max_attempts: webhook.max_retries || 5, request_body: null,
    response_status: null, response_body: null, error: null, created_at: new Date().toISOString(), completed_at: null };
  const store = getStore();
  if (!store.webhook_deliveries) store.webhook_deliveries = [];
  store.webhook_deliveries.push(delivery); saveStore();

  const payload = { id: event.id, type: event.type, timestamp: event.timestamp,
    environment_id: event.context?.environment_id, data: event.payload,
    context: { record_id: event.context?.record_id, object_id: event.context?.object_id,
      object_name: event.context?.object_name, user_id: event.context?.user_id } };
  delivery.request_body = JSON.stringify(payload);

  for (let attempt = 0; attempt < delivery.max_attempts; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]));
    delivery.attempts = attempt + 1;
    try {
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Vercentic-Webhooks/1.0',
        'X-Vercentic-Event': event.type, 'X-Vercentic-Delivery': delivery.id };
      if (webhook.signing_secret) {
        const { signature, timestamp } = signPayload(payload, webhook.signing_secret);
        headers['X-Vercentic-Signature'] = signature; headers['X-Vercentic-Timestamp'] = String(timestamp);
      }
      if (webhook.custom_headers) { for (const [k, v] of Object.entries(webhook.custom_headers)) headers[k] = v; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeout_ms || 10000);
      const resp = await fetch(webhook.url, { method: 'POST', headers, body: delivery.request_body, signal: controller.signal });
      clearTimeout(timeout);
      delivery.response_status = resp.status;
      try { delivery.response_body = (await resp.text()).slice(0, 2000); } catch { delivery.response_body = ''; }
      if (resp.ok) { delivery.status = 'success'; delivery.completed_at = new Date().toISOString(); saveDelivery(delivery); return delivery; }
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
        delivery.status = 'failed'; delivery.error = `HTTP ${resp.status}`; delivery.completed_at = new Date().toISOString(); saveDelivery(delivery); return delivery;
      }
      delivery.error = `HTTP ${resp.status} — retrying (${attempt + 1}/${delivery.max_attempts})`;
    } catch (err) { delivery.error = err.name === 'AbortError' ? 'Timed out' : err.message; }
    saveDelivery(delivery);
  }
  delivery.status = 'failed'; delivery.completed_at = new Date().toISOString(); saveDelivery(delivery);
  const recent = (getStore().webhook_deliveries || []).filter(d => d.webhook_id === webhook.id).slice(-10);
  if (recent.filter(d => d.status === 'failed').length >= 5) {
    update('webhooks', w => w.id === webhook.id, { status: 'disabled', disabled_reason: 'Too many failures', updated_at: new Date().toISOString() });
  }
  return delivery;
}

function saveDelivery(delivery) {
  const store = getStore();
  const idx = (store.webhook_deliveries || []).findIndex(d => d.id === delivery.id);
  if (idx >= 0) store.webhook_deliveries[idx] = delivery;
  saveStore();
}

// GET /api/webhooks
router.get('/', (req, res) => {
  ensureTables();
  const { environment_id } = req.query;
  let webhooks = query('webhooks', w => !w.deleted_at);
  if (environment_id) webhooks = webhooks.filter(w => w.environment_id === environment_id);
  const result = webhooks.map(w => {
    const deliveries = (getStore().webhook_deliveries || []).filter(d => d.webhook_id === w.id);
    const last30 = deliveries.slice(-30);
    const successRate = last30.length > 0 ? Math.round(last30.filter(d => d.status === 'success').length / last30.length * 100) : null;
    return { ...w, stats: { total_deliveries: deliveries.length, success_rate: successRate, last_delivery: deliveries[deliveries.length - 1] || null } };
  });
  res.json(result);
});

// GET /api/webhooks/event-types
router.get('/event-types', (req, res) => {
  const grouped = {};
  for (const [type, meta] of Object.entries(eventBus.EVENT_TYPES)) {
    const cat = meta.category;
    if (!grouped[cat]) grouped[cat] = { slug: cat, ...(eventBus.EVENT_CATEGORIES[cat] || { label: cat }), events: [] };
    grouped[cat].events.push({ type, ...meta });
  }
  res.json(Object.values(grouped));
});

// POST /api/webhooks
router.post('/', (req, res) => {
  ensureTables();
  const { environment_id, name, url, description, event_types, custom_headers, max_retries, timeout_ms } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  if (!event_types || !event_types.length) return res.status(400).json({ error: 'At least one event_type required' });
  const signing_secret = generateSecret();
  const webhook = insert('webhooks', { id: uuidv4(), environment_id, name, url, description: description || '',
    event_types, signing_secret, custom_headers: custom_headers || {}, max_retries: max_retries || 5,
    timeout_ms: timeout_ms || 10000, status: 'active', disabled_reason: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  const subId = eventBus.subscribe(`webhook:${webhook.id}`, event_types, async (event) => {
    if (webhook.environment_id && event.context?.environment_id !== webhook.environment_id) return;
    const current = (getStore().webhooks || []).find(w => w.id === webhook.id);
    if (!current || current.status !== 'active' || current.deleted_at) return;
    await deliverWebhook(current, event);
  }, { webhook_id: webhook.id });
  webhook._subscriber_id = subId; saveStore();
  res.json(webhook);
});

// PATCH /api/webhooks/:id
router.patch('/:id', (req, res) => {
  ensureTables();
  const wh = update('webhooks', w => w.id === req.params.id, { ...req.body, updated_at: new Date().toISOString() });
  if (!wh) return res.status(404).json({ error: 'Not found' });
  if (req.body.event_types) {
    const subs = eventBus.getSubscribers(); const old = subs.find(s => s.meta?.webhook_id === wh.id);
    if (old) eventBus.unsubscribe(old.id);
    if (wh.status === 'active') {
      eventBus.subscribe(`webhook:${wh.id}`, req.body.event_types, async (event) => {
        if (wh.environment_id && event.context?.environment_id !== wh.environment_id) return;
        const current = (getStore().webhooks || []).find(w => w.id === wh.id);
        if (!current || current.status !== 'active' || current.deleted_at) return;
        await deliverWebhook(current, event);
      }, { webhook_id: wh.id });
    }
  }
  res.json(wh);
});

// DELETE /api/webhooks/:id
router.delete('/:id', (req, res) => {
  ensureTables();
  update('webhooks', w => w.id === req.params.id, { deleted_at: new Date().toISOString(), status: 'disabled' });
  const subs = eventBus.getSubscribers();
  const sub = subs.find(s => s.meta?.webhook_id === req.params.id);
  if (sub) eventBus.unsubscribe(sub.id);
  res.json({ deleted: true });
});

// POST /api/webhooks/:id/test
router.post('/:id/test', async (req, res) => {
  ensureTables();
  const webhook = (getStore().webhooks || []).find(w => w.id === req.params.id && !w.deleted_at);
  if (!webhook) return res.status(404).json({ error: 'Not found' });
  const testEvent = { id: uuidv4(), type: 'webhook.test', payload: { message: 'Test event from Vercentic', webhook_name: webhook.name, timestamp: new Date().toISOString() },
    context: { environment_id: webhook.environment_id }, timestamp: new Date().toISOString(), _meta: { label: 'Test Event', category: 'system' } };
  const delivery = await deliverWebhook(webhook, testEvent);
  res.json(delivery);
});

// POST /api/webhooks/:id/toggle
router.post('/:id/toggle', (req, res) => {
  ensureTables();
  const wh = (getStore().webhooks || []).find(w => w.id === req.params.id && !w.deleted_at);
  if (!wh) return res.status(404).json({ error: 'Not found' });
  const newStatus = wh.status === 'active' ? 'paused' : 'active';
  update('webhooks', w => w.id === req.params.id, { status: newStatus, disabled_reason: null, updated_at: new Date().toISOString() });
  res.json({ status: newStatus });
});

// GET /api/webhooks/:id/deliveries
router.get('/:id/deliveries', (req, res) => {
  ensureTables();
  const { limit = 50, offset = 0 } = req.query;
  const deliveries = (getStore().webhook_deliveries || []).filter(d => d.webhook_id === req.params.id).reverse();
  res.json({ total: deliveries.length, deliveries: deliveries.slice(Number(offset), Number(offset) + Number(limit)) });
});

// POST /api/webhooks/:id/deliveries/:deliveryId/retry
router.post('/:id/deliveries/:deliveryId/retry', async (req, res) => {
  ensureTables();
  const webhook = (getStore().webhooks || []).find(w => w.id === req.params.id && !w.deleted_at);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
  const delivery = (getStore().webhook_deliveries || []).find(d => d.id === req.params.deliveryId);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
  const event = { id: delivery.event_id, type: delivery.event_type, payload: JSON.parse(delivery.request_body || '{}'),
    context: { environment_id: webhook.environment_id }, timestamp: new Date().toISOString(),
    _meta: eventBus.EVENT_TYPES[delivery.event_type] || { label: delivery.event_type, category: 'system' } };
  const result = await deliverWebhook(webhook, event);
  res.json(result);
});

// ── INBOUND WEBHOOKS ──────────────────────────────────────────────────────

// GET /api/webhooks/inbound
router.get('/inbound', (req, res) => {
  ensureTables();
  const { environment_id } = req.query;
  let inbound = query('inbound_webhooks', w => !w.deleted_at);
  if (environment_id) inbound = inbound.filter(w => w.environment_id === environment_id);
  res.json(inbound);
});

// POST /api/webhooks/inbound
router.post('/inbound', (req, res) => {
  ensureTables();
  const { environment_id, name, description, action, action_config } = req.body;
  if (!name || !action) return res.status(400).json({ error: 'name and action required' });
  const token = crypto.randomBytes(32).toString('hex');
  const endpoint = insert('inbound_webhooks', { id: uuidv4(), environment_id, name,
    description: description || '', token, action, action_config: action_config || {},
    status: 'active', call_count: 0, last_called_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  res.json(endpoint);
});

// DELETE /api/webhooks/inbound/:id
router.delete('/inbound/:id', (req, res) => {
  ensureTables();
  update('inbound_webhooks', w => w.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

// POST /api/webhooks/inbound/receive/:token — external systems call this
router.post('/inbound/receive/:token', async (req, res) => {
  ensureTables();
  const endpoint = (getStore().inbound_webhooks || []).find(w => w.token === req.params.token && w.status === 'active' && !w.deleted_at);
  if (!endpoint) return res.status(404).json({ error: 'Invalid webhook token' });
  update('inbound_webhooks', w => w.id === endpoint.id, { call_count: (endpoint.call_count || 0) + 1, last_called_at: new Date().toISOString() });
  try {
    switch (endpoint.action) {
      case 'create_record': {
        const cfg = endpoint.action_config;
        const record = insert('records', { id: uuidv4(), object_id: cfg.object_id, environment_id: endpoint.environment_id,
          data: req.body, created_by: 'inbound_webhook', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        eventBus.emit('record.created', { id: record.id, source: 'inbound_webhook', webhook_name: endpoint.name }, { environment_id: endpoint.environment_id, record_id: record.id, object_id: cfg.object_id });
        res.json({ ok: true, record_id: record.id }); break;
      }
      case 'emit_event': {
        const cfg = endpoint.action_config;
        await eventBus.emit(cfg.event_type || 'webhook.inbound', req.body, { environment_id: endpoint.environment_id });
        res.json({ ok: true, event_type: cfg.event_type || 'webhook.inbound' }); break;
      }
      case 'trigger_workflow': {
        await eventBus.emit('workflow.triggered', { webhook_name: endpoint.name, ...req.body }, { environment_id: endpoint.environment_id });
        res.json({ ok: true, action: 'workflow_triggered' }); break;
      }
      default: res.json({ ok: true, received: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── EVENT LOG ROUTES ──────────────────────────────────────────────────────

router.get('/events', (req, res) => {
  const { environment_id, category, type, limit = 100, offset = 0 } = req.query;
  const result = eventBus.getEventLog({ environment_id, category, eventType: type, limit: Number(limit), offset: Number(offset) });
  res.json(result);
});

router.get('/events/stats', (req, res) => {
  const { environment_id, hours = 24 } = req.query;
  res.json(eventBus.getEventStats(environment_id, Number(hours)));
});

router.get('/subscribers', (req, res) => { res.json(eventBus.getSubscribers()); });

// ── Bootstrap ─────────────────────────────────────────────────────────────
function bootstrapWebhooks() {
  ensureTables();
  const webhooks = (getStore().webhooks || []).filter(w => w.status === 'active' && !w.deleted_at);
  for (const webhook of webhooks) {
    eventBus.subscribe(`webhook:${webhook.id}`, webhook.event_types || [], async (event) => {
      if (webhook.environment_id && event.context?.environment_id !== webhook.environment_id) return;
      const current = (getStore().webhooks || []).find(w => w.id === webhook.id);
      if (!current || current.status !== 'active' || current.deleted_at) return;
      await deliverWebhook(current, event);
    }, { webhook_id: webhook.id });
  }
  if (webhooks.length > 0) console.log(`[Webhooks] Bootstrapped ${webhooks.length} active subscribers`);
}

router._bootstrap = bootstrapWebhooks;
module.exports = router;
