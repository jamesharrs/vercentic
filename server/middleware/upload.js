// server/middleware/upload.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared multer configuration with MIME type verification.
//
// The extension check in multer's fileFilter is a first-pass only — it can be
// bypassed by renaming any file.  After multer writes the file to disk, we read
// the first 4,100 bytes (magic bytes) with file-type to verify the actual format,
// then reject anything that doesn't match an allowlist.
//
// Usage:
//   const { upload, verifyMime } = require('../middleware/upload');
//   router.post('/upload', upload.single('file'), verifyMime, (req, res) => { ... })
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const { fromFile } = require('file-type');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Allowed extension → expected MIME prefixes ────────────────────────────────
// Key: lowercase extension. Value: array of allowed MIME type prefixes.
// Anything not in this map is rejected before it hits disk.
const ALLOWED = {
  pdf:  ['application/pdf'],
  doc:  ['application/msword', 'application/vnd.ms-office'],
  docx: ['application/vnd.openxmlformats'],
  xls:  ['application/vnd.ms-excel', 'application/vnd.ms-office'],
  xlsx: ['application/vnd.openxmlformats'],
  ppt:  ['application/vnd.ms-powerpoint', 'application/vnd.ms-office'],
  pptx: ['application/vnd.openxmlformats'],
  jpg:  ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png:  ['image/png'],
  gif:  ['image/gif'],
  webp: ['image/webp'],
  csv:  ['text/plain', 'text/csv', 'application/csv'],
  txt:  ['text/plain'],
  zip:  ['application/zip', 'application/x-zip'],
};

// ── Multer storage ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB (reduced from 50 MB)
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!ALLOWED[ext]) {
      return cb(Object.assign(new Error(`File type .${ext} is not allowed`), { status: 400 }));
    }
    cb(null, true);
  },
});

// ── Post-upload MIME verification ─────────────────────────────────────────────
async function verifyMime(req, res, next) {
  if (!req.file) return next(); // nothing uploaded, let route handle it

  const filePath = req.file.path;
  const ext      = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const allowed  = ALLOWED[ext] || [];

  let detected;
  try {
    detected = await fromFile(filePath);
  } catch {
    detected = null;
  }

  // Plain text files (CSV, TXT) have no magic bytes — file-type returns undefined
  // For those, trust the extension check that already passed
  const isTextType = ['csv', 'txt'].includes(ext);
  if (!detected && !isTextType) {
    fs.unlink(filePath, () => {});
    return res.status(400).json({
      error:  'Could not determine file type. The file may be corrupt.',
      code:   'INVALID_FILE',
    });
  }

  if (detected) {
    const mime    = detected.mime;
    const matches = allowed.some(prefix => mime.startsWith(prefix));
    if (!matches) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({
        error: `File content does not match the declared type. ` +
               `Expected ${ext.toUpperCase()} but got ${mime}.`,
        code: 'MIME_MISMATCH',
      });
    }
    // Write the detected MIME back onto req.file so routes get the real type
    req.file.mimetype = mime;
  }

  next();
}

// Multer error handler — turns multer errors into clean JSON responses
function handleMulterError(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 25 MB.', code: 'FILE_TOO_LARGE' });
  }
  if (err instanceof multer.MulterError || err.status === 400) {
    return res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
  }
  next(err);
}

module.exports = { upload, verifyMime, handleMulterError, ALLOWED, UPLOAD_DIR };
