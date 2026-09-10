/**
 * middleware/extension_auth.js
 *
 * Gates the Chrome-extension-only routes (/api/chrome-import/*) behind a
 * shared secret sent as a header — those routes use `Access-Control-Allow-
 * Origin: *` for a content-script/cross-origin context, so a normal cookie
 * session isn't a workable auth mechanism there.
 *
 * SAFE-BY-DEFAULT: if CHROME_EXTENSION_API_KEY is not set in the server
 * environment, this middleware is a no-op and every request passes through
 * exactly as it did before this file existed — so shipping it does NOT change
 * behavior for the live extension until the key is deliberately turned on.
 *
 * To activate once the real extension is ready to send it:
 *   1. Set CHROME_EXTENSION_API_KEY=<a long random secret> on the server.
 *   2. Update the Chrome extension to send that value on every request to
 *      /api/chrome-import/* as either:
 *        X-Extension-Key: <key>
 *      or
 *        Authorization: Bearer <key>
 */
'use strict';
const crypto = require('crypto');

function requireExtensionKey(req, res, next) {
  const configured = process.env.CHROME_EXTENSION_API_KEY;
  if (!configured) return next(); // not yet enabled — no behavior change

  const provided = req.headers['x-extension-key']
    || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(configured));
  const valid = a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);

  if (!valid) {
    return res.status(401).json({ error: 'Missing or invalid extension API key' });
  }
  next();
}

module.exports = { requireExtensionKey };
