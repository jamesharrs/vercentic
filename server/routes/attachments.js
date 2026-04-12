const express  = require('express');
const router    = express.Router();
const path      = require('path');
const fs        = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query, insert, remove, getStore, saveStore } = require('../db/init');
const { upload, verifyMime, handleMulterError, UPLOAD_DIR } = require('../middleware/upload');

// Ensure persistent-volume upload dir exists (Railway: /data/uploads)
const ATTACH_DIR = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'uploads')
  : UPLOAD_DIR;
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });

// ── List attachments ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('attachments', a => a.record_id === record_id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// ── Upload file ───────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), verifyMime, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const { record_id, file_type_id, file_type_name, uploaded_by, environment_id } = req.body;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });

  const ext  = path.extname(req.file.originalname).toLowerCase().replace('.','');
  const att  = insert('attachments', {
    id:             uuidv4(),
    record_id,
    environment_id: environment_id || null,
    name:           req.file.originalname,
    filename:       req.file.filename,
    size:           req.file.size,
    mimetype:       req.file.mimetype,
    ext,
    file_type_id:   file_type_id   || null,
    file_type_name: file_type_name || 'Other',
    url:            `/api/attachments/file/${req.file.filename}`,
    uploaded_by:    uploaded_by    || 'Admin',
    created_at:     new Date().toISOString(),
  });
  res.status(201).json(att);
});

// ── Serve file ────────────────────────────────────────────────────────────────
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});

// ── DOCX → HTML preview ───────────────────────────────────────────────────────
router.get('/preview/:filename', async (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(req.params.filename).toLowerCase();
  if (!['.docx','.doc'].includes(ext)) return res.status(400).json({ error: 'Only DOCX/DOC preview supported' });
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Segoe UI',sans-serif;font-size:14px;line-height:1.7;padding:32px 40px;max-width:800px;margin:0 auto;color:#1f2937;}
h1,h2,h3{color:#111827;}p{margin:0 0 12px;}table{border-collapse:collapse;width:100%;}
td,th{border:1px solid #e5e7eb;padding:6px 10px;}ul,ol{padding-left:20px;}</style>
</head><body>${result.value}</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) {
    console.error('[preview] docx error:', e.message);
    res.status(500).json({ error: 'Could not convert document' });
  }
});

// ── Legacy POST (metadata-only, keep for backwards compat) ───────────────────
router.post('/', (req, res) => {
  const { record_id, name, size, type, url, uploaded_by, file_type_id, file_type_name } = req.body;
  if (!record_id || !name) return res.status(400).json({ error: 'record_id and name required' });
  res.status(201).json(insert('attachments', {
    id: uuidv4(), record_id, name, size: size||0, mimetype: type||'application/octet-stream',
    url: url||'#', file_type_id: file_type_id||null, file_type_name: file_type_name||'Other',
    uploaded_by: uploaded_by||'Admin', created_at: new Date().toISOString(),
  }));
});

router.delete('/:id', (req, res) => {
  const s = getStore();
  const att = (s.attachments||[]).find(a => a.id === req.params.id);
  if (att?.filename) {
    const filePath = path.join(UPLOAD_DIR, att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  remove('attachments', x => x.id === req.params.id);
  res.json({ deleted: true });
});

// Multer / MIME errors → clean JSON instead of Express HTML page
router.use(handleMulterError);

module.exports = router;
