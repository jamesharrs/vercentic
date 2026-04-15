// server/routes/sse.js — Server-Sent Events broadcaster
// Lightweight real-time push: server → client, per tenant
// No WebSocket overhead; browser auto-reconnects.

const router = require('express').Router();
const { platformLog } = require('../services/platformLogger');

// tenantClients: Map<tenantSlug, Set<res>>
const tenantClients = new Map();

/** Broadcast an event to all SSE clients in a tenant */
function broadcast(tenantSlug, event) {
  const slug = tenantSlug || 'master';
  const clients = tenantClients.get(slug);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) { clients.delete(res); }
  }
}

/** SSE stream endpoint — called once per browser tab */
router.get('/stream', (req, res) => {
  // Accept tenant slug from header OR query param (EventSource can't set headers)
  const slug = req.headers['x-tenant-slug'] || req.query.slug || 'master';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Register this client
  if (!tenantClients.has(slug)) tenantClients.set(slug, new Set());
  tenantClients.get(slug).add(res);
  platformLog('sse', 'client_connected', `SSE client connected`, { tenant: slug, total: tenantClients.get(slug).size });

  // Send a heartbeat every 25s to keep the connection alive through proxies
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(hb); }
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(hb);
    const clients = tenantClients.get(slug);
    if (clients) { clients.delete(res); if (clients.size === 0) tenantClients.delete(slug); }
  });
});

/** Health — how many clients are connected */
router.get('/status', (req, res) => {
  const counts = {};
  for (const [k, v] of tenantClients) counts[k] = v.size;
  res.json({ tenants: Object.keys(counts).length, clients: counts });
});

module.exports = { router, broadcast };
