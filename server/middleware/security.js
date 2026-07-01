/**
 * middleware/security.js
 *
 * Provides:
 *  - loginLimiter   — rate limit login endpoints (10 attempts / 15 min / IP)
 *  - apiLimiter     — general API rate limit (300 req / min / IP)
 *  - secureHeaders  — sets X-Content-Type-Options, X-Frame-Options etc.
 *  - generateToken  — cryptographically random session token (plain, for client)
 *  - hashToken      — SHA-256 hash of token (for server-side storage)
 *  - validateUpload — magic-byte file type check after multer
 */
'use strict';
const fs        = require('fs');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many login attempts. Please wait 15 minutes before trying again.',
    code: 'RATE_LIMITED',
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  skip: (req) => req.path === '/api/health' || req.method === 'OPTIONS',
});

function secureHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(plain) {
  if (!plain) return null;
  return crypto.createHash('sha256').update(plain).digest('hex');
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
]);

const MAGIC_SIGNATURES = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  { bytes: [0xFF, 0xD8, 0xFF],        mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },
  { bytes: [0xD0, 0xCF, 0x11, 0xE0], mime: 'application/msword' },
  { bytes: [0x50, 0x4B, 0x03, 0x04], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
];

function detectMimeFromBuffer(buf) {
  for (const { bytes, mime } of MAGIC_SIGNATURES) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  return null;
}

function validateUpload(req, res, next) {
  const file = req.file || (Array.isArray(req.files) && req.files[0]);
  if (!file) return next();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return res.status(415).json({ error: `File type "${file.mimetype}" is not allowed.`, allowed: [...ALLOWED_MIME_TYPES] });
  }
  let buf = file.buffer;
  if (!buf && file.path) {
    try {
      const fd = fs.openSync(file.path, 'r');
      buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);
    } catch (_) {}
  }
  if (buf) {
    const detected = detectMimeFromBuffer(buf);
    if (detected && detected !== file.mimetype) {
      const isOOxml = file.mimetype.startsWith('application/vnd.openxmlformats');
      if (!(isOOxml && detected === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        return res.status(415).json({ error: 'File content does not match its declared type.' });
      }
    }
    req.detectedMime = detected || file.mimetype;
  }
  next();
}

module.exports = { loginLimiter, apiLimiter, secureHeaders, generateToken, hashToken, validateUpload };
