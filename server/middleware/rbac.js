'use strict';
const { findOne, query } = require('../db/init');
const { logAccessDenied } = require('./security-audit');

const ACTIONS = { VIEW:'view', CREATE:'create', EDIT:'edit', DELETE:'delete', EXPORT:'export' };

const GLOBAL_ACTIONS = [
  // ── Admin / config ──────────────────────────────────────────────────────────
  'manage_users','manage_roles','manage_settings','manage_workflows',
  'manage_portals','manage_forms','manage_interviews','manage_org_structure',
  'manage_integrations','view_audit_log',
  // ── Data actions ────────────────────────────────────────────────────────────
  'run_reports','export_data','bulk_actions',
  // ── Feature access flags (gate entire nav sections) ─────────────────────────
  'access_dashboard','access_org_chart','access_interviews','access_offers',
  'access_reports','access_copilot','access_calendar','access_search',
  // ── Record action flags (gate actions within a record) ───────────────────────
  'record_send_email','record_send_sms','record_log_call','record_view_comms',
  'record_add_note','record_delete_note','record_upload_file','record_delete_file',
  'record_parse_cv','record_extract_doc',
  'record_add_to_pipeline','record_move_stage','record_run_workflow',
  'record_schedule_interview','record_create_offer',
];

const SUPER_ADMIN_SLUG = 'super_admin';

function resolveUser(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  try {
    const user = findOne('users', u => u.id === userId && u.status !== 'deactivated');
    if (!user) return null;
    const role = findOne('roles', r => r.id === user.role_id);
    return { ...user, role };
  } catch { return null; }
}

function attachUser(req, res, next) {
  req.currentUser = resolveUser(req);
  next();
}

function requireAuth(req, res, next) {
  req.currentUser = resolveUser(req);
  if (!req.currentUser) return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  next();
}

function isSuperAdmin(user) {
  return user?.role?.slug === SUPER_ADMIN_SLUG;
}

function hasPermission(user, objectSlug, action) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  try {
    const perm = findOne('permissions', p =>
      p.role_id === user.role_id && p.object_slug === objectSlug && p.action === action
    );
    return perm ? Boolean(perm.allowed) : false;
  } catch { return false; }
}

function hasGlobalAction(user, action) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  try {
    const perm = findOne('permissions', p =>
      p.role_id === user.role_id && p.object_slug === '__global__' && p.action === action
    );
    return perm ? Boolean(perm.allowed) : false;
  } catch { return false; }
}

function requirePermission(objectSlug, action) {
  return (req, res, next) => {
    const user = req.currentUser || resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    if (!hasPermission(user, objectSlug, action)) {
      req._accessDenialLogged = true;
      logAccessDenied(req, objectSlug, action, 'Missing object permission');
      return res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { objectSlug, action } });
    }
    req.currentUser = user;
    next();
  };
}

function requireGlobalAction(action) {
  return (req, res, next) => {
    const user = req.currentUser || resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    if (!hasGlobalAction(user, action)) {
      req._accessDenialLogged = true;
      logAccessDenied(req, '__global__', action, 'Missing global action permission');
      return res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    }
    req.currentUser = user;
    next();
  };
}

function getUserPermissions(user) {
  if (!user) return { objects: {}, global: {} };
  if (isSuperAdmin(user)) {
    const all = Object.fromEntries(Object.values(ACTIONS).map(a => [a, true]));
    return {
      objects: { '*': all },
      global: Object.fromEntries(GLOBAL_ACTIONS.map(a => [a, true]))
    };
  }
  try {
    const perms = query('permissions', p => p.role_id === user.role_id);
    const objects = {}, global = {};
    for (const p of perms) {
      if (p.object_slug === '__global__') {
        global[p.action] = Boolean(p.allowed);
      } else {
        if (!objects[p.object_slug]) objects[p.object_slug] = {};
        objects[p.object_slug][p.action] = Boolean(p.allowed);
      }
    }
    return { objects, global };
  } catch { return { objects: {}, global: {} }; }
}

function seedDefaultPermissions(store) {
  if (!store.permissions) store.permissions = [];
  const { v4: uuidv4 } = require('uuid');
  const now = new Date().toISOString();
  const ALL_RECORD = ['record_send_email','record_send_sms','record_log_call','record_view_comms','record_add_note','record_delete_note','record_upload_file','record_delete_file','record_parse_cv','record_extract_doc','record_add_to_pipeline','record_move_stage','record_run_workflow','record_schedule_interview','record_create_offer'];
  const roleDefaults = {
    super_admin:    { people:['view','create','edit','delete','export'], jobs:['view','create','edit','delete','export'], talent_pools:['view','create','edit','delete','export'], __global__: GLOBAL_ACTIONS },
    admin:          { people:['view','create','edit','delete','export'], jobs:['view','create','edit','delete','export'], talent_pools:['view','create','edit','delete','export'], __global__:['manage_users','manage_roles','manage_settings','manage_workflows','manage_portals','manage_forms','manage_interviews','manage_org_structure','manage_integrations','view_audit_log','run_reports','export_data','bulk_actions','access_dashboard','access_org_chart','access_interviews','access_offers','access_reports','access_copilot','access_calendar','access_search',...ALL_RECORD] },
    recruiter:      { people:['view','create','edit','export'], jobs:['view','create','edit','export'], talent_pools:['view','create','edit'], __global__:['manage_interviews','run_reports','export_data','bulk_actions','access_dashboard','access_org_chart','access_interviews','access_offers','access_reports','access_copilot','access_calendar','access_search',...ALL_RECORD] },
    hiring_manager: { people:['view'], jobs:['view','edit'], talent_pools:['view'], __global__:['manage_interviews','access_dashboard','access_interviews','access_copilot','access_calendar','access_search','record_view_comms','record_add_note','record_schedule_interview','record_move_stage'] },
    read_only:      { people:['view'], jobs:['view'], talent_pools:['view'], __global__:['access_dashboard','access_search','record_view_comms'] },
  };

  // Always fully rebuild super_admin permissions so they can never be accidentally disabled
  const superAdminRole = (store.roles || []).find(r => r.slug === 'super_admin');
  if (superAdminRole) {
    // Remove all existing super_admin permissions and rebuild from scratch
    store.permissions = store.permissions.filter(p => p.role_id !== superAdminRole.id);
    const saDefs = roleDefaults.super_admin;
    for (const [objSlug, allowed] of Object.entries(saDefs)) {
      const allActions = objSlug === '__global__' ? GLOBAL_ACTIONS : Object.values(ACTIONS);
      for (const action of allActions) {
        store.permissions.push({
          id: uuidv4(), role_id: superAdminRole.id, object_slug: objSlug,
          action, allowed: 1, created_at: now
        });
      }
    }
    console.log(`✅ Super Admin permissions rebuilt (${store.permissions.filter(p=>p.role_id===superAdminRole.id).length} rules)`);
  }

  // Seed other roles only if they have NO permissions at all
  const hasRecordFlags = store.permissions.some(p => p.object_slug === '__global__' && p.action === 'record_send_email');
  if (hasRecordFlags) return; // other roles already seeded

  // Clear non-super-admin global perms and re-seed
  if (superAdminRole) {
    store.permissions = store.permissions.filter(p => p.role_id === superAdminRole.id);
  } else {
    store.permissions = [];
  }

  for (const role of (store.roles || [])) {
    if (role.slug === 'super_admin') continue; // already handled above
    const defaults = roleDefaults[role.slug];
    if (!defaults) continue;
    for (const [objSlug, allowed] of Object.entries(defaults)) {
      const allActions = objSlug === '__global__' ? GLOBAL_ACTIONS : Object.values(ACTIONS);
      for (const action of allActions) {
        store.permissions.push({
          id: uuidv4(), role_id: role.id, object_slug: objSlug,
          action, allowed: allowed.includes(action) ? 1 : 0, created_at: now
        });
      }
    }
  }
  console.log(`✅ Seeded ${store.permissions.length} permissions across ${(store.roles||[]).length} roles`);
}

/**
 * Strip fields the user's role cannot see from a record's data object.
 */
function applyFieldVisibility(user, record, objectId) {
  if (!user || !record || !record.data) return record;
  if (isSuperAdmin(user)) return record;
  try {
    const store = require('../db/init').getStore();
    if (!store.field_visibility || store.field_visibility.length === 0) return record;
    const fieldIds = query('fields', f => f.object_id === objectId).map(f => f.id);
    const hiddenFieldIds = new Set(
      store.field_visibility
        .filter(r => r.role_id === user.role_id && r.hidden && fieldIds.includes(r.field_id))
        .map(r => r.field_id)
    );
    if (hiddenFieldIds.size === 0) return record;
    const hiddenKeys = new Set(query('fields', f => hiddenFieldIds.has(f.id)).map(f => f.api_key));
    const cleanData = { ...record.data };
    for (const key of hiddenKeys) delete cleanData[key];
    return { ...record, data: cleanData };
  } catch { return record; }
}

function applyFieldVisibilityBulk(user, records, objectId) {
  if (!user || isSuperAdmin(user)) return records;
  return records.map(r => applyFieldVisibility(user, r, objectId));
}

/**
 * Auto-seed permissions for a newly created custom object.
 */
function seedPermissionsForNewObject(objectSlug) {
  try {
    const { getStore, saveStore } = require('../db/init');
    const { v4: uuidv4 } = require('uuid');
    const store = getStore();
    const now = new Date().toISOString();
    const roles = store.roles || [];
    let added = 0;
    for (const role of roles) {
      for (const action of Object.values(ACTIONS)) {
        const exists = (store.permissions || []).find(p =>
          p.role_id === role.id && p.object_slug === objectSlug && p.action === action);
        if (!exists) {
          const allowed = (role.slug === 'super_admin' || role.slug === 'admin') ? 1 : (action === 'view' ? 1 : 0);
          if (!store.permissions) store.permissions = [];
          store.permissions.push({ id: uuidv4(), role_id: role.id, object_slug: objectSlug, action, allowed, created_at: now });
          added++;
        }
      }
    }
    if (added > 0) { saveStore(); console.log(`✅ Seeded ${added} permissions for new object "${objectSlug}"`); }
  } catch (err) { console.error(`Failed to seed permissions for "${objectSlug}":`, err.message); }
}

/**
 * Get the set of hidden field api_keys for a user+object (for activity log redaction).
 */
function getHiddenFieldKeys(user, objectId) {
  if (!user || isSuperAdmin(user)) return new Set();
  try {
    const store = require('../db/init').getStore();
    if (!store.field_visibility || store.field_visibility.length === 0) return new Set();
    const fieldIds = query('fields', f => f.object_id === objectId).map(f => f.id);
    const hiddenFieldIds = new Set(
      store.field_visibility.filter(r => r.role_id === user.role_id && r.hidden && fieldIds.includes(r.field_id)).map(r => r.field_id));
    if (hiddenFieldIds.size === 0) return new Set();
    return new Set(query('fields', f => hiddenFieldIds.has(f.id)).map(f => f.api_key));
  } catch { return new Set(); }
}

module.exports = {
  attachUser, requireAuth, requirePermission, requireGlobalAction,
  hasPermission, hasGlobalAction, getUserPermissions, seedDefaultPermissions,
  seedPermissionsForNewObject,
  isSuperAdmin, ACTIONS, GLOBAL_ACTIONS,
  applyFieldVisibility, applyFieldVisibilityBulk, getHiddenFieldKeys,
};
