// server/middleware/csrf.js
// Double-submit cookie CSRF protection.
//
// How it works:
//   1. On every authenticated response, server sets a `vercentic_csrf` cookie
//      (readable by JS — intentionally NOT httpOnly) containing a random token.
//   2. For every state-changing request (POST / PATCH / PUT / DELETE) the client
//      must read that cookie and send the value as an `X-CSRF-Token` header.
//   3. This middleware compares the two values. A cross-site attacker can read
//      the session cookie (SameSite=None) but CANNOT read JS-accessible cookies
//      from another origin, so they can't forge the header.
//
// Exemptions (return next() without check):
//   - Safe methods: GET, HEAD, OPTIONS
//   - Public API paths that legitimately receive unauthenticated POST/PATCH
//     (portals, webhooks, login, superadmin auth)
//   - Requests that carry only X-User-Id (mobile app / Chrome extension) —
//     these don't use cookies at all so CSRF via cookie-theft is impossible.
//
'use strict';

const crypto = require('crypto');

// Routes that must never require a CSRF token (unauthenticated callers)
const CSRF_EXEMPT_PREFIXES = [
  '/api/users/login',
  '/api/users/auth/login',
  '/api/users/logout',
  '/api/users/exchange-impersonation',
  '/api/portals',          // public portal apply / job list / session endpoints
  '/api/portal-auth',
  '/api/portal-public',
  '/api/comms/webhook',    // Twilio inbound webhooks
  '/api/campaign-links',
  '/api/superadmin/auth',
  '/api/superadmin/clients/provision', // called from super admin console
  '/api/chrome-import',
  '/api/hub/',
  '/api/reschedule',
  '/api/bot',
  '/api/linkedin-search',
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Attach a CSRF token to the response cookie whenever the user is authenticated.
 * This is called as part of the normal middleware chain, not just on login.
 */
function attachCsrfCookie(req, res, next) {
  // Only attach if user is authenticated and no token exists yet
  if (req.currentUser && !req.cookies?.vercentic_csrf) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('vercentic_csrf', token, {
      httpOnly: false,   // must be readable by JS (that's the point)
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge:   8 * 60 * 60 * 1000,  // matches session cookie lifetime
    });
  }
  next();
}

/**
 * Enforce CSRF token for state-changing requests.
 * Must run AFTER attachUser so req.currentUser is populated.
 */
function verifyCsrf(req, res, next) {
  // Safe methods never mutate state
  if (SAFE_METHODS.has(req.method)) return next();

  // Exempt public endpoints
  const path = req.path || '';
  if (CSRF_EXEMPT_PREFIXES.some(p => req.originalUrl.startsWith(p))) return next();

  // Requests that use only X-User-Id header (no cookies) are not vulnerable to CSRF
  // because there's no cookie for an attacker to hijack. Allow them through.
  const hasCookieSession = !!req.session?.userId;
  const hasHeaderOnly    = !!req.headers['x-user-id'] && !hasCookieSession;
  if (hasHeaderOnly) return next();

  // Unauthenticated requests are handled by the auth guard — skip CSRF
  if (!req.currentUser) return next();

  const cookieToken  = req.cookies?.vercentic_csrf;
  const headerToken  = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code:  'CSRF_MISSING',
    });
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(cookieToken,  'hex');
    const b = Buffer.from(headerToken,  'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'CSRF token invalid', code: 'CSRF_INVALID' });
    }
  } catch {
    return res.status(403).json({ error: 'CSRF token invalid', code: 'CSRF_INVALID' });
  }

  next();
}

module.exports = { attachCsrfCookie, verifyCsrf };
