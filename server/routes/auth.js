'use strict';
const express = require('express');
const router = express.Router();
const { findOne } = require('../db/init');
const { getUserPermissions } = require('../middleware/rbac');

// GET /api/auth/me
// Returns current user profile + full permission map.
// Called by the frontend once on load to hydrate the session context.
router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'No user id provided' });

  const user = findOne('users', u => u.id === userId && u.status !== 'deactivated');
  if (!user) return res.status(401).json({ error: 'User not found or deactivated' });

  const role = findOne('roles', r => r.id === user.role_id);
  const fullUser = { ...user, role };
  const permissions = getUserPermissions(fullUser);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id,
      role,
      org_unit_id: user.org_unit_id || null,
      status: user.status,
    },
    permissions,
  });
});

module.exports = router;
