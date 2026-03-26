const express = require('express');
const router  = express.Router();
const { query, insert, update, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// Notification types and their display config
const NOTIF_TYPES = {
  message_reply:    { label: 'Message Reply',       icon: 'mail',       color: '#3b82f6' },
  task_reminder:    { label: 'Task Reminder',        icon: 'clock',      color: '#f59e0b' },
  agent_review:     { label: 'Agent Review Needed',  icon: 'sparkles',   color: '#8b5cf6' },
  interview_today:  { label: 'Interview Today',      icon: 'calendar',   color: '#0ca678' },
  offer_action:     { label: 'Offer Action',         icon: 'dollar',     color: '#10b981' },
  application_new:  { label: 'New Application',      icon: 'user',       color: '#6366f1' },
  workflow_blocked: { label: 'Workflow Blocked',      icon: 'layers',     color: '#ef4444' },
  mention:          { label: 'Mention',              icon: 'at-sign',    color: '#ec4899' },
};

// GET /api/notifications?user_id=&environment_id=&unread_only=true&limit=20
router.get('/', (req, res) => {
  const { user_id, environment_id, unread_only, limit = 20 } = req.query;
  let notifs = query('notifications', n =>
    (!environment_id || n.environment_id === environment_id) &&
    (!user_id        || n.user_id === user_id || n.user_id === null)
  );
  if (unread_only === 'true') notifs = notifs.filter(n => !n.read_at);
  notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total   = notifs.length;
  const unread  = notifs.filter(n => !n.read_at).length;
  res.json({ notifications: notifs.slice(0, Number(limit)), total, unread });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  update('notifications', n => n.id === req.params.id, { read_at: new Date().toISOString() });
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res) => {
  const { user_id, environment_id } = req.body;
  const store = getStore();
  if (!store.notifications) { res.json({ ok: true }); return; }
  store.notifications = store.notifications.map(n => {
    if ((!user_id || n.user_id === user_id) && (!environment_id || n.environment_id === environment_id) && !n.read_at) {
      return { ...n, read_at: new Date().toISOString() };
    }
    return n;
  });
  saveStore(store);
  res.json({ ok: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  const store = getStore();
  if (store.notifications) store.notifications = store.notifications.filter(n => n.id !== req.params.id);
  saveStore(store);
  res.json({ ok: true });
});

// POST /api/notifications  (internal use — create a notification)
router.post('/', (req, res) => {
  const { type, title, body, record_id, object_slug, user_id, environment_id, action_url } = req.body;
  const notif = insert('notifications', {
    id: uuidv4(), type, title, body: body||'', record_id: record_id||null,
    object_slug: object_slug||null, user_id: user_id||null,
    environment_id: environment_id||null, action_url: action_url||null,
    read_at: null, created_at: new Date().toISOString(),
  });
  res.json(notif);
});

// GET /api/notifications/types  — return type metadata
router.get('/types', (req, res) => res.json(NOTIF_TYPES));

module.exports = router;
