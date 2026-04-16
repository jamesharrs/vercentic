const { hasGlobalAction } = require("../middleware/rbac");
const { logSecurityEvent, logPermissionChange, SEC_EVENT, SEVERITY, auditContext } = require('../middleware/security-audit');
function checkGlobal(req,res,action){const u=req.currentUser;if(!u)return null;if(!hasGlobalAction(u,action)){res.status(403).json({error:"Permission denied",code:"FORBIDDEN",required:{action}});return false;}return null;}
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');
const { cacheResponse, invalidatePath } = require('../utils/cache');

// GET all roles with user counts — cached 5 minutes (roles rarely change)
router.get('/', cacheResponse(300_000), (req, res) => {
  const roles = query('roles').map(role => ({
    ...role,
    user_count: query('users', u => u.role_id === role.id && u.status !== 'deactivated').length,
    permissions: query('permissions', p => p.role_id === role.id)
  }));
  res.json(roles);
});

// GET single role
router.get('/:id', (req, res) => {
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  const permissions = query('permissions', p => p.role_id === req.params.id);
  const users = query('users', u => u.role_id === req.params.id).map(u => ({ ...u, password_hash: undefined }));
  res.json({ ...role, permissions, users });
});

// POST create custom role
router.post('/', (req, res) => {
  if (checkGlobal(req, res, 'manage_roles') === false) return;
  const { name, description, color, clone_from_role_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const id = uuidv4();
  const role = insert('roles', { id, name, slug, description: description||'', color: color||'#3b5bdb', is_system: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  // Clone permissions from another role if specified
  if (clone_from_role_id) {
    const sourcePerms = query('permissions', p => p.role_id === clone_from_role_id);
    for (const perm of sourcePerms) {
      insert('permissions', { ...perm, id: uuidv4(), role_id: id, created_at: new Date().toISOString() });
    }
  }
  // AUDIT: role created
  logSecurityEvent({ ...auditContext(req), event: SEC_EVENT.ROLE_CREATED, severity: SEVERITY.CRITICAL,
    target_type: 'role', target_id: id, action: 'create_role',
    details: { name, slug, clone_from_role_id: clone_from_role_id || null } });
  invalidatePath('roles');
  res.status(201).json(role);
});

// PATCH update role
router.patch('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_roles') === false) return;
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.is_system) return res.status(403).json({ error: 'Cannot modify system roles' });
  const updated = update('roles', r => r.id === req.params.id, req.body);
  invalidatePath('roles');
  res.json(updated);
});

// DELETE role (custom only)
router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_roles') === false) return;
  const role = findOne('roles', r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.is_system) return res.status(403).json({ error: 'Cannot delete system roles' });
  // AUDIT: role deleted
  logSecurityEvent({ ...auditContext(req), event: SEC_EVENT.ROLE_DELETED, severity: SEVERITY.CRITICAL,
    target_type: 'role', target_id: req.params.id, action: 'delete_role',
    details: { name: role.name, slug: role.slug } });
  remove('roles', r => r.id === req.params.id);
  remove('permissions', p => p.role_id === req.params.id);
  invalidatePath('roles');
  res.json({ deleted: true });
});

// GET permissions for a role
router.get('/:id/permissions', (req, res) => {
  res.json(query('permissions', p => p.role_id === req.params.id));
});

// PUT update permissions for a role (bulk replace)
router.put('/:id/permissions', (req, res) => {
  if (checkGlobal(req, res, 'manage_roles') === false) return;
  const { permissions } = req.body; // [{ object_slug, action, allowed }]
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });
  for (const perm of permissions) {
    const existing = findOne('permissions', p => p.role_id === req.params.id && p.object_slug === perm.object_slug && p.action === perm.action);
    if (existing) update('permissions', p => p.id === existing.id, { allowed: perm.allowed ? 1 : 0 });
    else insert('permissions', { id:uuidv4(), role_id:req.params.id, object_slug:perm.object_slug, action:perm.action, allowed:perm.allowed?1:0, created_at:new Date().toISOString() });
  }
  // AUDIT: permissions changed
  const role = findOne('roles', r => r.id === req.params.id);
  logPermissionChange(req, req.params.id, role?.name || 'unknown', {
    permissions_count: permissions.length,
    summary: permissions.slice(0, 5).map(p => `${p.object_slug}:${p.action}=${p.allowed}`)
  });
  res.json(query('permissions', p => p.role_id === req.params.id));
});

module.exports = router;
