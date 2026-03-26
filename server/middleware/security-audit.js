'use strict';
// Security audit — centralized logging for all access control events
const { v4: uuidv4 } = require('uuid');

const SEC_EVENT = {
  ACCESS_DENIED: 'access_denied',
  ACCESS_GRANTED: 'access_granted',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',
  PERMISSIONS_CHANGED: 'permissions_changed',
  FIELD_VISIBILITY_CHANGED: 'field_visibility_changed',
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_DEACTIVATED: 'user_deactivated',
  USER_CREATED: 'user_created',
  COPILOT_ACTION: 'copilot_action',
  COPILOT_DENIED: 'copilot_denied',
  BULK_EXPORT: 'bulk_export',
};
const SEVERITY = { INFO: 'info', WARN: 'warn', CRITICAL: 'critical' };

function logSecurityEvent(params) {
  try {
    const { getStore, saveStore } = require('../db/init');
    const store = getStore();
    if (!store.security_audit) store.security_audit = [];
    const entry = {
      id: uuidv4(),
      event: params.event, severity: params.severity || SEVERITY.INFO,
      user_id: params.user_id || null, user_email: params.user_email || null,
      role_slug: params.role_slug || null,
      target_type: params.target_type || null, target_id: params.target_id || null,
      action: params.action || null, object_slug: params.object_slug || null,
      details: params.details || null, ip: params.ip || null,
      environment_id: params.environment_id || null,
      timestamp: new Date().toISOString(),
    };
    store.security_audit.push(entry);
    if (store.security_audit.length > 10000) store.security_audit = store.security_audit.slice(-10000);
    saveStore();
    if (params.severity === SEVERITY.CRITICAL) {
      console.warn(`🔒 SECURITY [${params.event}] user=${params.user_email||params.user_id} action=${params.action} target=${params.target_type}:${params.target_id}`);
    }
  } catch (err) { console.error('Security audit log failed:', err.message); }
}

function auditContext(req) {
  const user = req.currentUser;
  return {
    user_id: user?.id || null, user_email: user?.email || null,
    role_slug: user?.role?.slug || null,
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    environment_id: req.query?.environment_id || req.body?.environment_id || null,
  };
}

function logAccessDenied(req, objectSlug, action, reason) {
  const ctx = auditContext(req);
  logSecurityEvent({ ...ctx, event: SEC_EVENT.ACCESS_DENIED, severity: SEVERITY.WARN,
    action, object_slug: objectSlug, target_type: 'object', target_id: objectSlug,
    details: { reason, path: req.originalUrl, method: req.method } });
}

function logPermissionChange(req, roleId, roleName, changes) {
  const ctx = auditContext(req);
  logSecurityEvent({ ...ctx, event: SEC_EVENT.PERMISSIONS_CHANGED, severity: SEVERITY.CRITICAL,
    target_type: 'role', target_id: roleId, action: 'update_permissions',
    details: { role_name: roleName, changes } });
}

function logFieldVisibilityChange(req, roleId, objectId, rules) {
  const ctx = auditContext(req);
  const hiddenCount = rules.filter(r => r.hidden).length;
  logSecurityEvent({ ...ctx, event: SEC_EVENT.FIELD_VISIBILITY_CHANGED, severity: SEVERITY.CRITICAL,
    target_type: 'role', target_id: roleId, action: 'update_field_visibility',
    details: { object_id: objectId, hidden_count: hiddenCount } });
}

function auditResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 403 && body?.code === 'FORBIDDEN' && !req._accessDenialLogged) {
      const ctx = auditContext(req);
      logSecurityEvent({ ...ctx, event: SEC_EVENT.ACCESS_DENIED, severity: SEVERITY.WARN,
        action: body.required?.action || 'unknown',
        object_slug: body.required?.object || body.required?.objectSlug || null,
        target_type: 'endpoint', target_id: req.originalUrl,
        details: { method: req.method } });
    }
    return originalJson(body);
  };
  next();
}

module.exports = {
  SEC_EVENT, SEVERITY, logSecurityEvent, logAccessDenied,
  logPermissionChange, logFieldVisibilityChange,
  auditContext, auditResponseMiddleware,
};
