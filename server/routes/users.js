const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { query, findOne, insert, update, remove } = require('../db/init');

const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

// GET all users
router.get('/', (req, res) => {
  const users = query('users').map(u => {
    const role = findOne('roles', r => r.id === u.role_id);
    return { ...u, password_hash: undefined, role };
  });
  res.json(users);
});

// GET single user
router.get('/:id', (req, res) => {
  const u = findOne('users', u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
});

// POST invite/create user
router.post('/', (req, res) => {
  const { email, first_name, last_name, role_id, auth_provider = 'local' } = req.body;
  if (!email || !first_name || !last_name || !role_id) return res.status(400).json({ error: 'email, first_name, last_name, role_id required' });
  if (findOne('users', u => u.email === email)) return res.status(409).json({ error: 'Email already exists' });
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const user = insert('users', {
    id: uuidv4(), email, first_name, last_name, role_id,
    password_hash: hashPassword(tempPassword),
    status: 'invited', auth_provider,
    mfa_enabled: 0, must_change_password: 1,
    last_login: null, last_login_ip: null, login_count: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  // Log audit
  insert('audit_log', { id:uuidv4(), action:'user.created', actor:'system', target_id:user.id, target_type:'user', details:{ email }, created_at:new Date().toISOString() });
  res.status(201).json({ ...user, password_hash: undefined, temp_password: tempPassword });
});

// PATCH update user
router.patch('/:id', (req, res) => {
  const { first_name, last_name, role_id, status, mfa_enabled } = req.body;
  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name;
  if (last_name !== undefined) updates.last_name = last_name;
  if (role_id !== undefined) updates.role_id = role_id;
  if (status !== undefined) updates.status = status;
  if (mfa_enabled !== undefined) updates.mfa_enabled = mfa_enabled;
  const u = update('users', x => x.id === req.params.id, updates);
  if (!u) return res.status(404).json({ error: 'Not found' });
  insert('audit_log', { id:uuidv4(), action:'user.updated', actor:'system', target_id:u.id, target_type:'user', details:updates, created_at:new Date().toISOString() });
  res.json({ ...u, password_hash: undefined });
});

// POST reset password
router.post('/:id/reset-password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  update('users', x => x.id === req.params.id, { password_hash: hashPassword(password), must_change_password: 0 });
  insert('audit_log', { id:uuidv4(), action:'user.password_reset', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ success: true });
});

// DELETE (deactivate) user
router.delete('/:id', (req, res) => {
  const u = findOne('users', x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  update('users', x => x.id === req.params.id, { status: 'deactivated' });
  insert('audit_log', { id:uuidv4(), action:'user.deactivated', actor:'system', target_id:req.params.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  res.json({ deactivated: true });
});

// POST login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = findOne('users', u => u.email === email);
  if (!user || user.status === 'deactivated') return res.status(401).json({ error: 'Invalid credentials' });
  if (user.password_hash !== hashPassword(password)) {
    insert('audit_log', { id:uuidv4(), action:'auth.login_failed', actor:email, target_id:user.id, target_type:'user', details:{ reason:'bad_password' }, created_at:new Date().toISOString() });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = uuidv4() + '-' + uuidv4();
  insert('sessions', { id:uuidv4(), user_id:user.id, token, created_at:new Date().toISOString(), expires_at: new Date(Date.now() + 60*60*1000).toISOString(), ip: req.ip });
  update('users', u => u.id === user.id, { last_login: new Date().toISOString(), login_count: (user.login_count||0)+1 });
  insert('audit_log', { id:uuidv4(), action:'auth.login', actor:email, target_id:user.id, target_type:'user', details:{}, created_at:new Date().toISOString() });
  const role = findOne('roles', r => r.id === user.role_id);
  res.json({ token, user: { ...user, password_hash: undefined, role }, must_change_password: user.must_change_password });
});

module.exports = router;

// POST /api/users/login — simple credential check, returns user + role + permissions
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const u = findOne('users', u => u.email === email);
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.status === 'deactivated') return res.status(403).json({ error: 'Account deactivated' });
  const hashed = hashPassword(password);
  if (u.password_hash !== hashed) return res.status(401).json({ error: 'Invalid credentials' });
  const role = findOne('roles', r => r.id === u.role_id);
  const permissions = query('permissions', p => p.role_id === u.role_id && p.allowed);
  // Update last login
  update('users', x => x.id === u.id, { last_login: new Date().toISOString(), login_count: (u.login_count||0)+1 });
  insert('audit_log', { id:require('uuid').v4(), action:'user.login', actor:u.id, target_id:u.id, target_type:'user', details:{ email }, created_at:new Date().toISOString() });
  res.json({ ...u, password_hash: undefined, role, permissions });
});

// GET /api/users/me/:id — refresh user session data
router.get('/me/:id', (req, res) => {
  const u = findOne('users', u => u.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  const permissions = query('permissions', p => p.role_id === u.role_id && p.allowed);
  res.json({ ...u, password_hash: undefined, role, permissions });
});

// GET /api/users/by-email/:email — find user linked to a Person record
router.get('/by-email/:email', (req, res) => {
  const u = findOne('users', u => u.email === decodeURIComponent(req.params.email));
  if (!u) return res.status(404).json({ error: 'Not found' });
  const role = findOne('roles', r => r.id === u.role_id);
  res.json({ ...u, password_hash: undefined, role });
});
