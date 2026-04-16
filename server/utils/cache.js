// server/utils/cache.js
// Lightweight in-process TTL cache for API route responses.
//
// Keys are tenant-scoped: "<tenant>:<path>?<query>"
// Values are raw JSON strings (skip double-serialize on cache hit)
// invalidatePath(prefix) busts all keys starting with that prefix
// cacheResponse(ttlMs) is an Express middleware for GET handlers
'use strict';

const { getCurrentTenant } = require('../db/init');

// ── Internal store ────────────────────────────────────────────────────────────
const _cache = new Map();

// Evict stale entries every 60s so the Map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _cache) {
    if (now - entry.ts > entry.ttl) _cache.delete(key);
  }
}, 60_000).unref();

// ── Key builder ───────────────────────────────────────────────────────────────
function makeKey(req) {
  const tenant = getCurrentTenant() || 'master';
  const params = new URLSearchParams(req.query);
  params.sort(); // deterministic key regardless of param order
  return `${tenant}:${req.path}?${params.toString()}`;
}

// ── Core helpers ──────────────────────────────────────────────────────────────
function get(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { _cache.delete(key); return null; }
  return entry.body;
}

function set(key, body, ttlMs) {
  _cache.set(key, { body, ts: Date.now(), ttl: ttlMs });
}

/**
 * Bust all cache entries whose key starts with `prefix`.
 * Called after any write to invalidate stale list responses.
 */
function invalidate(prefix) {
  let count = 0;
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) { _cache.delete(key); count++; }
  }
  return count;
}

/**
 * Convenience: bust all entries for the current tenant that match a path prefix.
 * @param {string} pathPrefix  e.g. 'objects', 'fields', 'environments', 'roles'
 */
function invalidatePath(pathPrefix) {
  const tenant = getCurrentTenant() || 'master';
  return invalidate(`${tenant}:/${pathPrefix}`);
}

/** Cache stats for the /api/health endpoint. */
function stats() {
  const now = Date.now();
  let live = 0, stale = 0;
  for (const entry of _cache.values()) {
    if (now - entry.ts <= entry.ttl) live++; else stale++;
  }
  return { total: _cache.size, live, stale };
}

// ── Express middleware ─────────────────────────────────────────────────────────
/**
 * cacheResponse(ttlMs)
 * Drop-in middleware for GET handlers:
 *   router.get('/', cacheResponse(60_000), myHandler);
 *
 * Cache hit  → sends stored JSON with X-Cache: HIT, skips handler.
 * Cache miss → runs handler, intercepts res.json(), stores result.
 * Only 2xx responses are ever stored.
 */
function cacheResponse(ttlMs = 30_000) {
  return function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();
    const key = makeKey(req);
    const hit = get(key);
    if (hit) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Cache', 'HIT');
      return res.send(hit);
    }
    const origJson = res.json.bind(res);
    res.json = function cachedJson(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const body = JSON.stringify(data);
        set(key, body, ttlMs);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(body);
      }
      return origJson(data);
    };
    next();
  };
}

module.exports = { get, set, invalidate, invalidatePath, stats, cacheResponse };
