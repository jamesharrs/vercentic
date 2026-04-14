// server/routes/error_logs.js
const express = require('express');
const router = express.Router();
const { query, insert, getStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ── Public: receive error report from frontend ──────────────────────────────
router.post('/', (req, res) => {
  try {
    const {
      code, message, stack, component, url,
      user_id, user_email, environment_id, environment_name,
      severity = 'error', extra = {}
    } = req.body;

    if (!message) return res.status(400).json({ error: 'message required' });

    const store = getStore();
    if (!store.error_logs) store.error_logs = [];

    const log = {
      id: uuidv4(),
      code: code || `ERR-${Date.now().toString(36).toUpperCase()}`,
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      component: component || null,
      url: url || null,
      user_id: user_id || null,
      user_email: user_email || null,
      environment_id: environment_id || null,
      environment_name: environment_name || null,
      severity,
      extra: JSON.stringify(extra || {}),
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
    };
    store.error_logs.push(log);

    // Rotate — keep only the latest 500 entries to prevent file bloat
    const MAX_ERROR_LOGS = 500;
    if (store.error_logs.length > MAX_ERROR_LOGS) {
      store.error_logs = store.error_logs.slice(-MAX_ERROR_LOGS);
    }

    const { saveStore } = require('../db/init');
    saveStore();
    res.json({ ok: true, code: log.code });
  } catch (e) {
    console.error('Error logging failed:', e.message);
    res.json({ ok: false });
  }
});

// ── GET all logs ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { severity, resolved, search, page = 1, limit = 50 } = req.query;
  const store = getStore();
  let logs = store.error_logs || [];

  if (severity) logs = logs.filter(l => l.severity === severity);
  if (resolved !== undefined) logs = logs.filter(l => String(l.resolved) === resolved);
  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(l =>
      l.message?.toLowerCase().includes(q) ||
      l.code?.toLowerCase().includes(q) ||
      l.component?.toLowerCase().includes(q) ||
      l.user_email?.toLowerCase().includes(q)
    );
  }
  logs = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = logs.length;
  const offset = (Number(page) - 1) * Number(limit);
  res.json({ logs: logs.slice(offset, offset + Number(limit)), total, page: Number(page) });
});

// ── Stats ───────────────────────────────────────────────────────────────────
router.get('/meta/stats', (req, res) => {
  const store = getStore();
  const logs = store.error_logs || [];
  const now = Date.now(), day = 86400000;
  res.json({
    total: logs.length,
    unresolved: logs.filter(l => !l.resolved).length,
    last_24h: logs.filter(l => now - new Date(l.created_at) < day).length,
    last_7d:  logs.filter(l => now - new Date(l.created_at) < 7 * day).length,
    by_severity: {
      error:   logs.filter(l => l.severity === 'error').length,
      warning: logs.filter(l => l.severity === 'warning').length,
      info:    logs.filter(l => l.severity === 'info').length,
    },
    by_environment: Object.fromEntries(
      [...new Set(logs.map(l => l.environment_name || 'Unknown'))]
        .map(n => [n, logs.filter(l => (l.environment_name || 'Unknown') === n).length])
    )
  });
});

// ── Resolve / unresolve ─────────────────────────────────────────────────────
router.patch('/:id/resolve', (req, res) => {
  const store = getStore();
  const log = (store.error_logs || []).find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Not found' });
  const { resolved = true, resolution_note, resolved_by } = req.body;
  Object.assign(log, {
    resolved,
    resolved_by: resolved ? (resolved_by || 'Admin') : null,
    resolved_at: resolved ? new Date().toISOString() : null,
    resolution_note: resolved ? (resolution_note || null) : null,
  });
  const { saveStore } = require('../db/init');
  saveStore();
  res.json(log);
});

// ── Delete ──────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const store = getStore();
  const idx = (store.error_logs || []).findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.error_logs.splice(idx, 1);
  const { saveStore } = require('../db/init');
  saveStore();
  res.json({ ok: true });
});

module.exports = router;
