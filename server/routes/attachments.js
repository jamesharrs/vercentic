const express  = require('express');
const router    = express.Router();
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query, insert, remove, getStore, saveStore } = require('../db/init');

// ── Upload directory ──────────────────────────────────────────────────────────
// Use persistent volume on Railway (/data), fall back to local uploads/
const UPLOAD_DIR = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${uuidv4().slice(0,8)}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['pdf','doc','docx','jpg','jpeg','png','gif','zip','xlsx','xls','csv','txt','ppt','pptx'];
    const ext = path.extname(file.originalname).toLowerCase().replace('.','');
    cb(null, allowed.includes(ext));
  },
});

// ── List attachments ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('attachments', a => a.record_id === record_id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// ── Upload file ───────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), (req, res) => {
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

module.exports = router;
