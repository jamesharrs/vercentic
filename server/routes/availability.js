'use strict';
const router = require('express').Router();
const { getStore, saveStore } = require('../db/init');

const IDLE_THRESHOLD_MS    = 15 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

function computeStatus(user) {
  if (user.availability_status === 'offline' || user.availability_status === 'dnd') return user.availability_status;
  if (!user.last_heartbeat) return 'offline';
  const elapsed = Date.now() - new Date(user.last_heartbeat).getTime();
  if (elapsed > OFFLINE_THRESHOLD_MS) return 'offline';
  if (elapsed > IDLE_THRESHOLD_MS) return 'away';
  return user.availability_status === 'away' ? 'away' : 'available';
}

// POST /api/availability/heartbeat
router.post('/heartbeat', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const s = getStore();
  const idx = (s.users || []).findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  s.users[idx].last_heartbeat = new Date().toISOString();
  if (!s.users[idx].availability_status || s.users[idx].availability_status === 'offline') {
    s.users[idx].availability_status = 'available';
  }
  saveStore(s);
  res.json({ ok: true, status: computeStatus(s.users[idx]) });
});

// PATCH /api/availability/status
router.patch('/status', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { status } = req.body;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  if (!['available','away','offline','dnd'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const s = getStore();
  const idx = (s.users || []).findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  s.users[idx].availability_status = status;
  s.users[idx].availability_set_at = new Date().toISOString();
  if (status !== 'offline') s.users[idx].last_heartbeat = new Date().toISOString();
  saveStore(s);
  res.json({ ok: true, status });
});

// GET /api/availability/me
router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const s = getStore();
  const user = (s.users || []).find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ status: computeStatus(user), manual_status: user.availability_status || 'available', last_heartbeat: user.last_heartbeat || null });
});

// GET /api/availability/team?environment_id=xxx
router.get('/team', (req, res) => {
  const s = getStore();
  const users = (s.users || []).filter(u => u.status !== 'deactivated');
  const statuses = users.map(u => ({
    id: u.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(' '),
    avatar: u.avatar_url || null,
    status: computeStatus(u),
  }));
  const availableUsers = statuses.filter(u => u.status === 'available');
  const awayUsers      = statuses.filter(u => u.status === 'away');
  res.json({ available: availableUsers.length > 0, online_count: availableUsers.length, away_count: awayUsers.length, total_active: users.length, team: statuses, next_available: null });
});

module.exports = router;
module.exports.computeStatus = computeStatus;
