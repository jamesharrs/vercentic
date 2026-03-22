// client/src/api.js
// Centralised API client — attaches X-User-Id on every request automatically.
// Import { api } from './api' everywhere instead of calling fetch directly.

const BASE = '/api';

function getSession() {
  try { return JSON.parse(localStorage.getItem('talentos_session') || '{}'); }
  catch { return {}; }
}

function getTenantSlug() {
  // 1. Session (most reliable — set at login)
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  } catch {}
  // 2. URL ?tenant= param (used before session exists, e.g. during login)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tenant')) return params.get('tenant');
  } catch {}
  return null;
}

function headers(extra = {}) {
  const session = getSession();
  const h = { 'Content-Type': 'application/json', ...extra };
  const uid  = session.userId || session.user?.id;
  const slug = getTenantSlug();
  if (uid)  h['X-User-Id']     = uid;
  if (slug) h['X-Tenant-Slug'] = slug;
  return h;
}

export const api = {
  get:   (path)       => fetch(`${BASE}${path}`, { headers: headers() }).then(r => r.json()),
  post:  (path, body) => fetch(`${BASE}${path}`, { method: 'POST',   headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
  patch: (path, body) => fetch(`${BASE}${path}`, { method: 'PATCH',  headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
  put:   (path, body) => fetch(`${BASE}${path}`, { method: 'PUT',    headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
  del:   (path)       => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(r => r.json()),
};

// ── Permission cache ──────────────────────────────────────────────────────────

let _permCache = null;

/** Fetch and cache the current user + permission map. Call once after login. */
export async function loadMyPermissions() {
  const session = getSession();
  const uid2 = session.userId || session.user?.id;
  if (!uid2) { _permCache = { objects: {}, global: {} }; return _permCache; }
  try {
    const data = await api.get('/auth/me');
    const perms = data.permissions || { objects: {}, global: {} };
    // Embed role slug so client-side super_admin bypass works without trusting the permissions map
    if (data.user?.role?.slug) perms._roleSlug = data.user.role.slug;
    _permCache = perms;
    return _permCache;
  } catch { _permCache = { objects: {}, global: {} }; return _permCache; }
}

/** Clear the cache (call on logout or role change). */
export function clearPermCache() { _permCache = null; }

/** Get cached permissions synchronously. */
export function getPermCache() { return _permCache; }

// ── Permission helpers (sync, use after loadMyPermissions) ────────────────────

/**
 * Check if current user can perform `action` on `objectSlug`.
 * Returns true optimistically until cache is loaded.
 */
export function can(objectSlug, action) {
  if (!_permCache) return true;
  if (_permCache.objects['*']?.[action]) return true;
  return Boolean(_permCache.objects[objectSlug]?.[action]);
}

/**
 * Check a global platform action (e.g. 'manage_users', 'run_reports').
 * Returns true optimistically until cache is loaded.
 */
export function canGlobal(action) {
  if (!_permCache) return true;
  return Boolean(_permCache.global?.[action]);
}
