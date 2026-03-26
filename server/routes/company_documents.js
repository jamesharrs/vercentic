// server/routes/company_documents.js — Company knowledge base with visibility control
const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'company-docs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${uuidv4().slice(0,8)}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const VISIBILITY_LEVELS = {
  internal: { label: 'Internal Only', desc: 'Salary bands, scoring rubrics, internal policies — never shown to candidates', color: '#EF4444' },
  candidate: { label: 'Candidate-Safe', desc: 'Benefits overview, culture docs, process info — safe to share with candidates', color: '#F59F00' },
  public: { label: 'Public', desc: 'Press releases, public brand materials, job descriptions', color: '#0CA678' },
};

const CATEGORIES = [
  'Company Overview', 'Benefits & Perks', 'Culture & Values', 'Hiring Process',
  'Policies', 'Brand Guidelines', 'Job Descriptions', 'Salary & Compensation',
  'Interview Guides', 'Onboarding', 'Training', 'Other'
];

// ── Text extraction ──────────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
    if (ext === '.docx' || ext === '.doc') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return '';
  } catch (e) {
    console.warn('Text extraction failed:', e.message);
    return '';
  }
}

// ── Chunk text for search ────────────────────────────────────────────────────
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

// ── Routes ───────────────────────────────────────────────────────────────────
// GET — list documents
router.get('/', (req, res) => {
  const { environment_id, visibility, category } = req.query;
  const store = getStore();
  let docs = (store.company_documents || []).filter(d => !d.deleted_at);
  if (environment_id) docs = docs.filter(d => d.environment_id === environment_id);
  if (visibility) docs = docs.filter(d => d.visibility === visibility);
  if (category) docs = docs.filter(d => d.category === category);
  // Don't return full text content in list view
  res.json(docs.map(d => ({ ...d, text_content: undefined, chunks: undefined })));
});

// POST — upload document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { environment_id, name, category, visibility, description } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

    const text_content = await extractText(req.file.path, req.file.mimetype);
    const chunks = chunkText(text_content);
    const store = getStore();
    if (!store.company_documents) store.company_documents = [];

    const doc = {
      id: uuidv4(),
      environment_id,
      name: name || req.file.originalname,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      category: category || 'Other',
      visibility: visibility || 'internal',
      description: description || '',
      text_content,
      chunks,
      chunk_count: chunks.length,
      word_count: text_content.split(/\s+/).length,
      uploaded_by: req.body.uploaded_by || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    store.company_documents.push(doc);
    saveStore();
    res.json({ ...doc, text_content: undefined, chunks: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH — update metadata
router.patch('/:id', (req, res) => {
  const store = getStore();
  const doc = (store.company_documents || []).find(d => d.id === req.params.id && !d.deleted_at);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const allowed = ['name', 'category', 'visibility', 'description'];
  allowed.forEach(k => { if (req.body[k] !== undefined) doc[k] = req.body[k]; });
  doc.updated_at = new Date().toISOString();
  saveStore();
  res.json({ ...doc, text_content: undefined, chunks: undefined });
});

// DELETE — soft delete
router.delete('/:id', (req, res) => {
  const store = getStore();
  const doc = (store.company_documents || []).find(d => d.id === req.params.id && !d.deleted_at);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  doc.deleted_at = new Date().toISOString();
  saveStore();
  res.json({ success: true });
});

// GET — single document (includes text for preview)
router.get('/:id', (req, res) => {
  const store = getStore();
  const doc = (store.company_documents || []).find(d => d.id === req.params.id && !d.deleted_at);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ...doc, chunks: undefined }); // include text_content for preview, skip chunks
});

// GET /search — keyword search across document content with visibility filtering
router.get('/search/query', (req, res) => {
  const { q, environment_id, visibility, limit = 5 } = req.query;
  if (!q) return res.json({ results: [] });

  const store = getStore();
  let docs = (store.company_documents || []).filter(d => !d.deleted_at);
  if (environment_id) docs = docs.filter(d => d.environment_id === environment_id);
  
  // Visibility filtering — "internal" sees everything, "candidate" sees candidate+public, "public" sees public only
  if (visibility === 'candidate') docs = docs.filter(d => d.visibility === 'candidate' || d.visibility === 'public');
  else if (visibility === 'public') docs = docs.filter(d => d.visibility === 'public');
  // visibility === 'internal' or undefined = see all

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];

  docs.forEach(doc => {
    (doc.chunks || []).forEach((chunk, chunkIndex) => {
      const lower = chunk.toLowerCase();
      const matchCount = terms.filter(t => lower.includes(t)).length;
      if (matchCount > 0) {
        results.push({
          doc_id: doc.id,
          doc_name: doc.name,
          category: doc.category,
          visibility: doc.visibility,
          chunk_index: chunkIndex,
          relevance: matchCount / terms.length,
          snippet: chunk.slice(0, 300),
        });
      }
    });
  });

  results.sort((a, b) => b.relevance - a.relevance);
  res.json({ results: results.slice(0, parseInt(limit)) });
});

// GET /meta — returns visibility levels and categories for UI
router.get('/meta/config', (req, res) => {
  res.json({ visibility_levels: VISIBILITY_LEVELS, categories: CATEGORIES });
});

module.exports = router;
