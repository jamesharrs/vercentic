const express = require('express');
const router = express.Router();
const { getStore, insert, update } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// GET security settings
router.get('/settings', (req, res) => {
  const store = getStore();
  res.json(store.security_settings || {});
});

// PATCH update security settings
router.patch('/settings', (req, res) => {
  const store = getStore();
  store.security_settings = { ...store.security_settings, ...req.body, updated_at: new Date().toISOString() };
  const fs = require('fs'); const path = require('path');
  const DB_PATH = path.join(__dirname, '../../data/talentos.json');
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
  res.json(store.security_settings);
});

// GET audit log
router.get('/audit-log', (req, res) => {
  const store = getStore();
  const { page=1, limit=50, action, actor } = req.query;
  let logs = (store.audit_log || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (action) logs = logs.filter(l => l.action.includes(action));
  if (actor) logs = logs.filter(l => l.actor && l.actor.includes(actor));
  const total = logs.length;
  const start = (parseInt(page)-1)*parseInt(limit);
  res.json({ logs: logs.slice(start, start+parseInt(limit)), pagination:{total,page:parseInt(page),limit:parseInt(limit),pages:Math.ceil(total/parseInt(limit))} });
});

// GET active sessions
router.get('/sessions', (req, res) => {
  const store = getStore();
  const now = new Date();
  const active = (store.sessions || []).filter(s => new Date(s.expires_at) > now).map(s => {
    const user = (store.users||[]).find(u => u.id === s.user_id);
    return { ...s, token: s.token.substring(0,8)+'...', user: user ? { id:user.id, email:user.email, first_name:user.first_name, last_name:user.last_name } : null };
  });
  res.json(active);
});

// DELETE revoke session
router.delete('/sessions/:id', (req, res) => {
  const { remove } = require('../db/init');
  remove('sessions', s => s.id === req.params.id);
  res.json({ revoked: true });
});

module.exports = router;
