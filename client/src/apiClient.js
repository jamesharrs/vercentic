/**
 * apiClient.js — shared authenticated API helper
 *
 * In production, calls go DIRECTLY to Railway (api.vercentic.com) —
 * bypassing Vercel's edge proxy entirely, saving all those edge requests.
 *
 * In local dev, calls go to /api which Vite proxies to localhost:3001.
 */

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

// Session key is scoped to the current subdomain so each tenant has its own
// isolated session — prevents a login on starter-template.vercentic.com from
// bleeding into standard-template.vercentic.com via shared localStorage.
function sessionKey() {
  const host = window.location.hostname;
  const parts = host.split('.');
  const reserved = ['www','app','api','admin','localhost','client','portal'];
  const isSubdomain = parts.length >= 3 && !reserved.includes(parts[0]) &&
    !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
  const slug = isSubdomain ? parts[0] : 'default';
  return `talentos_session_${slug}`;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey()) || 'null'); } catch { return null; }
}

function getTenantSlug() {
  // Check the subdomain FIRST — it's the authoritative source on production.
  // Only fall back to the session if no subdomain is present (e.g. localhost, app.vercentic.com).
  const host = window.location.hostname;
  const parts = host.split('.');
  const reserved = ['www','app','api','admin','localhost','client','portal'];
  const isDeployedSubdomain = parts.length >= 2 && !reserved.includes(parts[0]) &&
    !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
  if (isDeployedSubdomain) return parts[0];

  const sess = getSession();
  if (sess?.tenant_slug && sess.tenant_slug !== 'master') return sess.tenant_slug;
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenant')) return params.get('tenant');
  return null;
}

export function getCsrfToken() {
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
const SILENT_404_PATTERNS = [
  '/users/by-email/',      // Platform user lookup — 404 = no linked account (expected)
  '/records/by-number',    // Numeric URL resolve — 404 = record doesn't exist locally
];

function handleResponse(r, path = '') {
  if (r.status === 404 && SILENT_404_PATTERNS.some(p => path.includes(p))) return null;
  if (r.status === 503) {
    // Server still starting up — NOT a logout trigger. Retry after 2s.
    window.dispatchEvent(new CustomEvent('talentos:server-starting'));
    return Promise.resolve(null);
  }
  if (r.status === 401) {
    // In dev: try to re-sync session before logging out
    if (!import.meta.env.PROD) {
      window.dispatchEvent(new CustomEvent('talentos:session-lost'));
      return Promise.resolve(null); // return null instead of the error JSON
    }
    window.dispatchEvent(new CustomEvent('talentos:unauthenticated'));
  }
  return r.json();
}

// Mutation response handler — fires same events as handleResponse but always returns parsed JSON
// (call sites expect to read .id, .error etc on the response — we shouldn't return null mid-flow)
function handleMutationResponse(r, path = '') {
  if (r.status === 503) {
    window.dispatchEvent(new CustomEvent('talentos:server-starting'));
    return Promise.resolve({ __server_starting: true, error: 'Server starting up — try again' });
  }
  if (r.status === 401) {
    if (!import.meta.env.PROD) {
      window.dispatchEvent(new CustomEvent('talentos:session-lost'));
    } else {
      window.dispatchEvent(new CustomEvent('talentos:unauthenticated'));
    }
    // Still parse the body so callers see { error: 'Authentication required' }
  }
  return r.json().catch(() => ({ error: 'Response not JSON', status: r.status }));
}

const api = {
  get:    (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', headers: authHeaders() }).then(r => handleResponse(r, path)),
  post:   (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'POST',   headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => handleMutationResponse(r, path)),
  patch:  (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'PATCH',  headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => handleMutationResponse(r, path)),
  put:    (path, body) => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'PUT',    headers: jsonHeaders(),     body: JSON.stringify(body) }).then(r => handleMutationResponse(r, path)),
  del:    (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'DELETE', headers: mutationHeaders() }).then(r => handleMutationResponse(r, path)),
  delete: (path)       => fetch(`${API_ORIGIN}/api${path}`, { credentials:'include', method: 'DELETE', headers: mutationHeaders() }).then(r => handleMutationResponse(r, path)),
};

export default api;
export { authHeaders, jsonHeaders, getTenantSlug, getSession, API_ORIGIN };

export function tFetch(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const csrf = isMutation ? getCsrfToken() : '';
  const h = { ...authHeaders(), ...(opts.headers || {}) };
  if (csrf) h['X-CSRF-Token'] = csrf;

  // Auto-stringify plain object bodies and set Content-Type
  let body = opts.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    body = JSON.stringify(body);
    if (!h['Content-Type']) h['Content-Type'] = 'application/json';
  }

  return fetch(url, { ...opts, headers: h, body }).then(r => r.json());
}
