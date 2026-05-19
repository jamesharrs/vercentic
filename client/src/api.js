// client/src/api.js

function _sessionKey() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const reserved = ['www','app','api','admin','localhost','client','portal'];
    const isSubdomain = parts.length >= 3 && !reserved.includes(parts[0]) &&
      !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
    return isSubdomain ? `talentos_session_${parts[0]}` : 'talentos_session_default';
  } catch { return 'talentos_session_default'; }
}

// Centralised API client — calls Railway directly in production (no Vercel edge proxy).

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ORIGIN}/api`;

function getSession() {
  try { return JSON.parse(localStorage.getItem(_sessionKey()) || '{}'); }
  catch { return {}; }
}

function getTenantSlug() {
  try {
    const sess = JSON.parse(localStorage.getItem(_sessionKey()) || 'null');
    if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tenant')) return params.get('tenant');
  } catch {}
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const reserved = ['www', 'app', 'api', 'admin', 'localhost', 'client', 'portal'];
    if (parts.length >= 3 && !reserved.includes(parts[0])) return parts[0];
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

let _permCache = null;

export async function loadMyPermissions() {
  const session = getSession();
  const uid2 = session.userId || session.user?.id;
  if (!uid2) { _permCache = { objects: {}, global: {} }; return _permCache; }
  try {
    const data = await api.get('/auth/me');
    const perms = data.permissions || { objects: {}, global: {} };
    if (data.user?.role?.slug) perms._roleSlug = data.user.role.slug;
    _permCache = perms;
    return _permCache;
  } catch { _permCache = { objects: {}, global: {} }; return _permCache; }
}

export function clearPermCache() { _permCache = null; }
export function getPermCache() { return _permCache; }

export function canDo(objectId, action) {
  if (!_permCache) return true;
  if (_permCache._roleSlug === 'super_admin') return true;
  const objPerms = _permCache.objects?.[objectId];
  if (!objPerms) return _permCache.global?.[action] ?? true;
  return objPerms[action] ?? false;
}

export function hasGlobalPerm(action) {
  if (!_permCache) return true;
  if (_permCache._roleSlug === 'super_admin') return true;
  return _permCache.global?.[action] ?? false;
}
