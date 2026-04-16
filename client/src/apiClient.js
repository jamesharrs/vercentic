/**
 * apiClient.js — shared authenticated API helper
 *
 * In production, calls go DIRECTLY to Railway (api.vercentic.com) —
 * bypassing Vercel's edge proxy entirely, saving all those edge requests.
 *
 * In local dev, calls go to /api which Vite proxies to localhost:3001.
 */

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

function getSession() {
  try { return JSON.parse(localStorage.getItem('talentos_session') || 'null'); } catch { return null; }
}

function getTenantSlug() {
  const sess = getSession();
  if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenant')) return params.get('tenant');
  const host = window.location.hostname;
  const parts = host.split('.');
  const reserved = ['www','app','api','admin','localhost','client','portal'];
  if (parts.length >= 2 && !reserved.includes(parts[0]) &&
      !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r))) {
    return parts[0];
  }
  return null;
}

function getCsrfToken() {
  const match = document.cookie.match(/vercentic_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function authHeaders(extra = {}) {
  const sess   = getSession();
  const slug   = getTenantSlug();
  const userId = sess?.user?.id || null;
  const h = { ...extra };
  if (slug)   h['X-Tenant-Slug'] = slug;
  if (userId) h['X-User-Id']     = userId;
  return h;
}

function jsonHeaders() {
  const csrf = getCsrfToken();
  const h = { 'Content-Type': 'application/json', ...authHeaders() };
  if (csrf) h['X-CSRF-Token'] = csrf;
  return h;
}

function mutationHeaders() {
  const csrf = getCsrfToken();
  const h = { ...authHeaders() };
  if (csrf) h['X-CSRF-Token'] = csrf;
  return h;
}

// Paths that are expected to 404 (e.g. lookup-by-email) — suppress browser console errors
const SILENT_404_PATTERNS = ['/users/by-email/'];

function handleResponse(r, path = '') {
  if (r.status === 404 && SILENT_404_PATTERNS.some(p => path.includes(p))) return null;
  return r.json();
}

const api = {
  get:    (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', headers: authHeaders() }).then(r => handleResponse(r, path)),
  post:   (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'POST',   headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => r.json()),
  patch:  (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'PATCH',  headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => r.json()),
  put:    (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'PUT',    headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => r.json()),
  del:    (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'DELETE', headers: mutationHeaders() }).then(r => r.json()),
  delete: (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'DELETE', headers: mutationHeaders() }).then(r => r.json()),
};

export default api;
export { authHeaders, jsonHeaders, getTenantSlug, getSession, API_ORIGIN };

export function tFetch(url, opts = {}) {
  const h = { ...authHeaders(), ...(opts.headers || {}) };
  return fetch(url, { ...opts, headers: h });
}
