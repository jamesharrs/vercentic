'use strict';
const express = require('express');
const router = express.Router();
const { getStore } = require('../db/init');
const { hasGlobalAction } = require('../middleware/rbac');

function checkAccess(req, res) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return false; }
  if (!hasGlobalAction(user, 'view_audit_log')) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN' }); return false;
  }
  return true;
}

router.get('/', (req, res) => {
  if (checkAccess(req, res) === false) return;
  const { page=1, limit=50, event, severity, user_id, user_email, object_slug, action,
          target_type, from, to, search, environment_id } = req.query;
  const store = getStore();
  let entries = (store.security_audit || []).slice().reverse();
  if (event) entries = entries.filter(e => e.event === event);
  if (severity) entries = entries.filter(e => e.severity === severity);
  if (user_id) entries = entries.filter(e => e.user_id === user_id);
  if (user_email) entries = entries.filter(e => e.user_email?.toLowerCase().includes(user_email.toLowerCase()));
  if (object_slug) entries = entries.filter(e => e.object_slug === object_slug);
  if (action) entries = entries.filter(e => e.action === action);
  if (target_type) entries = entries.filter(e => e.target_type === target_type);
  if (environment_id) entries = entries.filter(e => e.environment_id === environment_id);
  if (from) entries = entries.filter(e => e.timestamp >= from);
  if (to) entries = entries.filter(e => e.timestamp <= to);
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(e =>
      (e.event||'').toLowerCase().includes(q) || (e.user_email||'').toLowerCase().includes(q) ||
      (e.action||'').toLowerCase().includes(q) || JSON.stringify(e.details||{}).toLowerCase().includes(q));
  }
  const total = entries.length;
  const pg = Math.max(1, parseInt(page)), lm = Math.min(100, Math.max(1, parseInt(limit)));
  res.json({ items: entries.slice((pg-1)*lm, pg*lm), total, page: pg, limit: lm, pages: Math.ceil(total/lm) });
});

router.get('/stats', (req, res) => {
  if (checkAccess(req, res) === false) return;
  const { from, to, environment_id } = req.query;
  const store = getStore();
  let entries = store.security_audit || [];
  if (from) entries = entries.filter(e => e.timestamp >= from);
  if (to) entries = entries.filter(e => e.timestamp <= to);
  if (environment_id) entries = entries.filter(e => e.environment_id === environment_id);
  const byEvent = {}, bySeverity = { info:0, warn:0, critical:0 }, deniedActions = {};
  for (const e of entries) {
    byEvent[e.event] = (byEvent[e.event]||0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity]||0) + 1;
    if (e.event === 'access_denied' && e.action) deniedActions[e.action] = (deniedActions[e.action]||0) + 1;
  }
  res.json({
    total: entries.length, by_event: byEvent, by_severity: bySeverity,
    top_denied_actions: Object.entries(deniedActions).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([action,count])=>({action,count})),
    recent_critical: entries.filter(e=>e.severity==='critical').slice(-5).reverse(),
  });
});

router.get('/export', (req, res) => {
  if (checkAccess(req, res) === false) return;
  const { from, to, event, severity, environment_id } = req.query;
  let entries = (getStore().security_audit || []).slice().reverse();
  if (event) entries = entries.filter(e => e.event === event);
  if (severity) entries = entries.filter(e => e.severity === severity);
  if (from) entries = entries.filter(e => e.timestamp >= from);
  if (to) entries = entries.filter(e => e.timestamp <= to);
  if (environment_id) entries = entries.filter(e => e.environment_id === environment_id);
  const headers = ['timestamp','event','severity','user_email','role_slug','action','object_slug','target_type','target_id','ip','details'];
  const esc = v => { if (v==null) return ''; const s = typeof v==='object'?JSON.stringify(v):String(v); return s.includes(',')||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s; };
  const rows = [headers.join(','), ...entries.map(e => headers.map(h=>esc(e[h])).join(','))];
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition',`attachment; filename="security-audit-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(rows.join('\n'));
});

module.exports = router;
