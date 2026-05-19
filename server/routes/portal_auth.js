const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { query, insert, getStore, saveStore } = require('../db/init');

// Wraps async route handlers so unhandled promise rejections flow to Express
// global error handler instead of silently crashing the request.
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);


const bcrypt = require('bcryptjs');

function hashPw(pw) {
  return bcrypt.hashSync(pw, 12);
}
function verifyPw(plain, hash) {
  if (!hash) return false;
  if (hash.startsWith('$2')) return bcrypt.compareSync(plain, hash);
  // legacy portal sha256 fallback
  const legacy = require('crypto').createHash('sha256').update(plain + 'vrc_portal_2026').digest('hex');
  return hash === legacy;
}
function genToken() { return require('crypto').randomBytes(32).toString('hex'); }

function ensureCollections() {
  const s = getStore();
  if (!s.portal_users)    s.portal_users    = [];
  if (!s.portal_sessions) s.portal_sessions = [];
  saveStore();
}

// Exported helper — used by cases route to identify caller
function getPortalUser(req) {
  const token = req.headers['x-portal-token'];
  if (!token) return null;
  const s = getStore();
  const session = (s.portal_sessions || []).find(
    se => se.token === token && new Date(se.expires_at) > new Date()
  );
  if (!session) return null;
  return (s.portal_users || []).find(u => u.id === session.user_id && u.status === 'active') || null;
}

// POST /api/portal-auth/login
router.post('/login', (req, res) => {
  ensureCollections();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const s    = getStore();
  const user = (s.portal_users || []).find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.status === 'active'
  );
  if (!user || !verifyPw(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = genToken();
  s.portal_sessions.push({
    id: crypto.randomUUID(), token, user_id: user.id,
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });
  const idx = s.portal_users.findIndex(u => u.id === user.id);
  if (idx !== -1) s.portal_users[idx].last_login = new Date().toISOString();
  saveStore();
  res.json({ token, user: { id:user.id, email:user.email, name:user.name,
    company:user.client_name, client_id:user.client_id,
    client_domain:user.client_domain, role:user.role } });
});

// GET /api/portal-auth/me
router.get('/me', (req, res) => {
  const user = getPortalUser(req);
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' });
  res.json({ id:user.id, email:user.email, name:user.name,
    company:user.client_name, client_id:user.client_id,
    client_domain:user.client_domain, role:user.role });
});

// POST /api/portal-auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers['x-portal-token'];
  if (token) {
    const s = getStore();
    s.portal_sessions = (s.portal_sessions || []).filter(se => se.token !== token);
    saveStore();
  }
  res.json({ ok: true });
});

// GET /api/portal-auth/tasks — tasks for the authenticated portal user's linked record
router.get('/tasks', (req, res) => {
  ensureCollections();
  const user = getPortalUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });

  const s = getStore();

  // Resolve the person record by matching email
  const personRecord = (s.records || []).find(r =>
    !r.deleted_at &&
    r.data?.email?.toLowerCase() === user.email.toLowerCase()
  );
  const record_id = personRecord?.id || user.record_id || null;

  if (!record_id) return res.json({ tasks: [], groups: [], record_id: null });

  // Get all open tasks for this record
  const tasks = (s.calendar_tasks || []).filter(t =>
    !t.deleted_at && t.record_id === record_id
  );

  // Get group assignments for this record
  const assignments = (s.task_group_assignments || []).filter(a =>
    !a.deleted_at && a.record_id === record_id && a.status !== 'cancelled'
  );

  // Enrich assignments with their tasks and progress
  const groupedAssignments = assignments.map(a => {
    const groupTasks = tasks.filter(t => t.group_assignment_id === a.id);
    const done = groupTasks.filter(t => t.status === 'done').length;
    const tpl = (s.task_group_templates || []).find(t => t.id === a.template_id);
    return {
      ...a,
      template_name:  tpl?.name  || a.template_name,
      template_color: tpl?.color || a.template_color,
      template_icon:  tpl?.icon  || a.template_icon,
      tasks: groupTasks,
      task_count: groupTasks.length,
      tasks_done: done,
      complete: groupTasks.length > 0 && done === groupTasks.length,
    };
  });

  // Standalone tasks (not part of any group)
  const standaloneTasks = tasks.filter(t => !t.group_assignment_id);

  res.json({ tasks: standaloneTasks, groups: groupedAssignments, record_id });
});

// PATCH /api/portal-auth/tasks/:id — complete a task from the portal
router.patch('/tasks/:id', async (req, res, next) => { try {
  ensureCollections();
  const user = getPortalUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });

  const s = getStore();
  const task = (s.calendar_tasks || []).find(t => t.id === req.params.id && !t.deleted_at);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status, completion_data } = req.body;
  if (status) task.status = status;
  if (status === 'done' && !task.completed_at) task.completed_at = new Date().toISOString();
  if (status === 'todo') task.completed_at = null;
  if (completion_data !== undefined) {
    task.completion_data = typeof completion_data === 'string'
      ? completion_data : JSON.stringify(completion_data);
  }
  task.updated_at = new Date().toISOString();
  saveStore();
  res.json(task);
} catch(e){next(e);}
});

// GET /api/portal-auth/users
router.get('/users', (req, res) => {
  ensureCollections();
  let users = query('portal_users', () => true);
  if (req.query.client_id) users = users.filter(u => u.client_id === req.query.client_id);
  res.json(users.map(u => ({ ...u, password_hash: undefined })));
});

// POST /api/portal-auth/users
router.post('/users', (req, res) => {
  ensureCollections();
  const { email, password, name, client_id, client_name, client_domain, role } = req.body;
  if (!email || !password || !name || !client_id)
    return res.status(400).json({ error: 'email, password, name and client_id required' });
  const existing = query('portal_users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existing.length) return res.status(409).json({ error: 'Email already exists' });
  const user = insert('portal_users', {
    email: email.trim().toLowerCase(), password_hash: hashPw(password),
    name, client_id, client_name: client_name || '', client_domain: client_domain || '',
    role: role || 'member', status: 'active', last_login: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  res.status(201).json({ ...user, password_hash: undefined });
});

// PATCH /api/portal-auth/users/:id
router.patch('/users/:id', (req, res) => {
  ensureCollections();
  const s   = getStore();
  const idx = (s.portal_users || []).findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { password, ...rest } = req.body;
  const upd = { ...rest, updated_at: new Date().toISOString() };
  if (password) upd.password_hash = hashPw(password);
  s.portal_users[idx] = { ...s.portal_users[idx], ...upd };
  saveStore();
  res.json({ ...s.portal_users[idx], password_hash: undefined });
});

// DELETE /api/portal-auth/users/:id
router.delete('/users/:id', (req, res) => {
  ensureCollections();
  const s   = getStore();
  const idx = (s.portal_users || []).findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.portal_users[idx].status     = 'inactive';
  s.portal_users[idx].updated_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

module.exports              = router;
module.exports.getPortalUser = getPortalUser;
module.exports.hashPw        = hashPw;
