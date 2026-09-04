// server/routes/media_library.js
// ─────────────────────────────────────────────────────────────────────────────
// Asset / Media Library — reusable images for job headers, portals, email
// templates etc. Two asset types:
//   'stock'  — curated royalty-free starter images (seeded once per environment)
//   'custom' — files uploaded by the tenant (stored on the same persistent
//              volume as attachments, via the shared multer config)
//
// AI selection: given a job title/department/description, picks the best
// matching asset from the library. Uses Claude when an API key is present
// (reasons over name/category/tags — no image bytes needed, so it's fast and
// cheap), falling back to a deterministic keyword/tag overlap score otherwise.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { upload, verifyMime, handleMulterError, UPLOAD_DIR } = require('../middleware/upload');
const { MODEL_DEFAULT } = require('../config/ai_models');

const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const CATEGORIES = [
  'Team & Culture', 'Technology & Engineering', 'Business & Finance',
  'Healthcare', 'Retail & Logistics', 'Construction & Industrial',
  'Creative & Design', 'Remote & Flexible', 'Customer & Sales',
  'Corporate & Leadership', 'Other',
];

// ── Curated starter stock library ─────────────────────────────────────────────
// Hotlinked from Unsplash's CDN under the Unsplash License (free for commercial
// use, no attribution required). These are long-lived direct photo URLs, not
// the deprecated "source.unsplash.com" redirect service. If any go stale over
// time they can be removed from the gallery in one click — broken thumbnails
// are flagged automatically in the UI.
function stockSeed() {
  const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75`;
  return [
    { name: 'Team Meeting',            category: 'Team & Culture',          tags: ['team','meeting','collaboration','office','culture','people'],           url: img('photo-1522071820081-009f0129c71c') },
    { name: 'Team High Five',          category: 'Team & Culture',          tags: ['team','celebration','success','culture','win','startup'],               url: img('photo-1552664730-d307ca884978') },
    { name: 'Diverse Team Discussion', category: 'Team & Culture',          tags: ['diversity','team','collaboration','discussion','inclusion'],            url: img('photo-1521737604893-d14cc237f11d') },
    { name: 'Group Team Photo',        category: 'Team & Culture',          tags: ['team','group','people','culture','staff'],                              url: img('photo-1543269865-cbf427effbad') },
    { name: 'Modern Office Space',     category: 'Corporate & Leadership',  tags: ['office','workspace','corporate','interior','building'],                 url: img('photo-1497366811353-6870744d04b2') },
    { name: 'Corporate Skyline',       category: 'Corporate & Leadership',  tags: ['corporate','building','skyline','city','headquarters','leadership'],    url: img('photo-1486406146926-c627a92ad1ab') },
    { name: 'Business Handshake',      category: 'Business & Finance',      tags: ['handshake','deal','partnership','business','agreement','sales'],        url: img('photo-1521791136064-7986c2920216') },
    { name: 'Finance Analytics',       category: 'Business & Finance',      tags: ['finance','analytics','data','charts','accounting','numbers'],           url: img('photo-1460925895917-afdab827c52f') },
    { name: 'Software Engineer',       category: 'Technology & Engineering',tags: ['engineering','software','developer','coding','laptop','tech','it'],     url: img('photo-1522202176988-66273c2fd55f') },
    { name: 'Data Center / Servers',   category: 'Technology & Engineering',tags: ['data','server','infrastructure','it','cloud','engineering','devops'],    url: img('photo-1451187580459-43490279c0fa') },
    { name: 'Whiteboard Collaboration',category: 'Technology & Engineering',tags: ['product','engineering','planning','whiteboard','agile','design'],       url: img('photo-1600880292203-757bb62b4baf') },
    { name: 'Healthcare Professional', category: 'Healthcare',              tags: ['healthcare','medical','doctor','nurse','clinical','hospital'],          url: img('photo-1584982751601-97dcc096659c') },
    { name: 'Warehouse Logistics',     category: 'Retail & Logistics',      tags: ['warehouse','logistics','operations','supply chain','inventory'],        url: img('photo-1553413077-190dd305871c') },
    { name: 'Retail Store',            category: 'Retail & Logistics',      tags: ['retail','store','shop','customer','merchandising'],                     url: img('photo-1441986300917-64674bd600d8') },
    { name: 'Construction Site',       category: 'Construction & Industrial',tags: ['construction','engineering','site','industrial','safety','trades'],    url: img('photo-1541888946425-d81bb19240f5') },
    { name: 'Manufacturing Floor',     category: 'Construction & Industrial',tags: ['manufacturing','factory','industrial','production','operations'],      url: img('photo-1565043589221-1a6fd9ae45c7') },
    { name: 'Creative Design Studio',  category: 'Creative & Design',       tags: ['design','creative','studio','marketing','branding','ux'],               url: img('photo-1561070791-2526d30994b5') },
    { name: 'Remote Work Laptop',      category: 'Remote & Flexible',       tags: ['remote','work from home','laptop','flexible','digital nomad'],          url: img('photo-1522199755839-a2bacb67c546') },
    { name: 'Customer Support',        category: 'Customer & Sales',        tags: ['customer','support','service','call centre','helpdesk'],                url: img('photo-1553877522-43269d4ea984') },
    { name: 'Sales Team Celebration',  category: 'Customer & Sales',        tags: ['sales','team','celebration','success','target','commercial'],          url: img('photo-1552581234-26160f608093') },
  ];
}

function ensureStock(environment_id) {
  const s = getStore();
  if (!s.media_assets) s.media_assets = [];
  const hasStock = s.media_assets.some(a => a.environment_id === environment_id && a.type === 'stock' && !a.deleted_at);
  if (hasStock) return;
  const now = new Date().toISOString();
  stockSeed().forEach(item => {
    s.media_assets.push({
      id: uuidv4(), environment_id, type: 'stock', source: 'seed',
      name: item.name, category: item.category, tags: item.tags, url: item.url,
      filename: null, mimetype: 'image/jpeg', size: null, usage_count: 0,
      created_at: now, updated_at: now, deleted_at: null,
    });
  });
  saveStore();
}

// ── List / filter ─────────────────────────────────────────────────────────────
router.get('/', ah(async (req, res) => {
  const { environment_id, type, category, search } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  ensureStock(environment_id);
  let assets = (getStore().media_assets || []).filter(a => a.environment_id === environment_id && !a.deleted_at);
  if (type)     assets = assets.filter(a => a.type === type);
  if (category) assets = assets.filter(a => a.category === category);
  if (search) {
    const q = search.toLowerCase();
    assets = assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (a.category || '').toLowerCase().includes(q)
    );
  }
  assets.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0) || new Date(b.created_at) - new Date(a.created_at));
  res.json({ assets, categories: CATEGORIES });
}));

// ── Upload a custom image ─────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), verifyMime, ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  if (!req.file.mimetype.startsWith('image/')) {
    fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
    return res.status(400).json({ error: 'Only image files (JPG, PNG, GIF, WEBP) are allowed in the Media Library' });
  }
  const { environment_id, name, category, tags } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const s = getStore();
  if (!s.media_assets) s.media_assets = [];
  const now = new Date().toISOString();
  const asset = {
    id: uuidv4(), environment_id, type: 'custom', source: 'upload',
    name: name || req.file.originalname.replace(/\.[^.]+$/, ''),
    category: category || 'Other',
    tags: tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean)) : [],
    url: `/api/media-library/file/${req.file.filename}`,
    filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size,
    usage_count: 0, created_at: now, updated_at: now, deleted_at: null,
  };
  s.media_assets.push(asset);
  saveStore();
  res.status(201).json(asset);
}));

// ── Serve a custom-uploaded image ─────────────────────────────────────────────
router.get('/file/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep) && filePath !== UPLOAD_DIR) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const mime = require('mime-types').lookup(filename) || 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.sendFile(filePath);
});

// ── Edit name / category / tags ───────────────────────────────────────────────
router.patch('/:id', ah(async (req, res) => {
  const s = getStore();
  const idx = (s.media_assets || []).findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { name, category, tags } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (name !== undefined)     patch.name = name;
  if (category !== undefined) patch.category = category;
  if (tags !== undefined)     patch.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
  s.media_assets[idx] = { ...s.media_assets[idx], ...patch };
  saveStore();
  res.json(s.media_assets[idx]);
}));

// ── Delete (soft; also removes the file from disk for custom uploads) ────────
router.delete('/:id', ah(async (req, res) => {
  const s = getStore();
  const asset = (s.media_assets || []).find(a => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  if (asset.filename) {
    const filePath = path.join(UPLOAD_DIR, asset.filename);
    if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
  }
  asset.deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
}));

// ── Bump usage count when an asset is applied to a record ────────────────────
router.post('/:id/track-use', ah(async (req, res) => {
  const s = getStore();
  const asset = (s.media_assets || []).find(a => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  asset.usage_count = (asset.usage_count || 0) + 1;
  saveStore();
  res.json({ ok: true });
}));

// ── Deterministic keyword-overlap scorer (no API key needed) ─────────────────
function heuristicSelect(assets, query) {
  const q = query.toLowerCase();
  const qWords = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  let best = null, bestScore = -1;
  for (const a of assets) {
    const haystack = [a.name, a.category, ...(a.tags || [])].join(' ').toLowerCase();
    let score = 0;
    for (const w of qWords) if (haystack.includes(w)) score += 1;
    // small category-name direct-match boost
    if (a.category && q.includes(a.category.toLowerCase().split(' ')[0])) score += 2;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  // Safe universal fallback if nothing scored — a generic team photo reads well on almost any job
  if (!best || bestScore <= 0) {
    best = assets.find(a => a.category === 'Team & Culture') || assets[0] || null;
  }
  return { asset: best, score: bestScore, method: 'heuristic' };
}

// ── AI-assisted selection ──────────────────────────────────────────────────────
router.post('/ai-select', ah(async (req, res) => {
  const { environment_id, title = '', department = '', description = '', exclude_ids = [] } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  ensureStock(environment_id);

  const assets = (getStore().media_assets || [])
    .filter(a => a.environment_id === environment_id && !a.deleted_at && !exclude_ids.includes(a.id));
  if (!assets.length) return res.status(404).json({ error: 'No images in the media library yet' });

  const query = [title, department, description].filter(Boolean).join(' ').slice(0, 600);
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    const { asset, score, method } = heuristicSelect(assets, query);
    return res.json({ asset, reason: score > 0 ? 'Matched by keyword overlap with job title/department' : 'No strong match — used a safe general team photo', method });
  }

  try {
    const catalog = assets.map(a => ({ id: a.id, name: a.name, category: a.category, tags: a.tags || [] }));
    const prompt = `You are choosing a header/banner image for a job posting on a careers site.

Job title: ${title || 'Unknown'}
Department: ${department || 'Unknown'}
Description: ${(description || '').slice(0, 400)}

Available images (choose exactly one id from this list):
${JSON.stringify(catalog)}

Return ONLY valid JSON, no markdown, no preamble:
{"asset_id":"<id from the list above>","reason":"<one short sentence, under 15 words, explaining the choice>"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const chosen = assets.find(a => a.id === parsed.asset_id);
    if (!chosen) throw new Error('Model returned an unknown asset id');
    return res.json({ asset: chosen, reason: parsed.reason || 'Selected by AI', method: 'ai' });
  } catch (e) {
    console.warn('[media-library] AI select failed, falling back to heuristic:', e.message);
    const { asset, score, method } = heuristicSelect(assets, query);
    res.json({ asset, reason: 'AI selection unavailable — matched by keyword overlap instead', method });
  }
}));

// ── AI auto-tag: suggests name, category, tags from the image itself ────────
router.post('/:id/ai-tag', ah(async (req, res) => {
  const asset = (getStore().media_assets || []).find(a => a.id === req.params.id && !a.deleted_at);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: 'AI tagging requires ANTHROPIC_API_KEY to be configured' });

  try {
    let base64, mediaType;
    if (asset.filename) {
      // Custom upload — read straight from disk
      const filePath = path.join(UPLOAD_DIR, asset.filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });
      base64 = fs.readFileSync(filePath).toString('base64');
      mediaType = asset.mimetype && asset.mimetype.startsWith('image/') ? asset.mimetype : 'image/jpeg';
    } else {
      // Stock asset — fetch the URL
      const https = require('https');
      const chunks = await new Promise((resolve, reject) => {
        https.get(asset.url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
          const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve(c)); r.on('error', reject);
        }).on('error', reject);
      });
      base64 = Buffer.concat(chunks).toString('base64');
      mediaType = 'image/jpeg';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `This image will be used as a header photo on a recruiting careers site.

Suggest metadata for it. Pick the category from EXACTLY this list (copy one verbatim): ${JSON.stringify(CATEGORIES)}

Return ONLY valid JSON, no markdown, no preamble:
{"name":"<short descriptive name, 3-6 words>","category":"<one of the categories above>","tags":["<4-6 lowercase single-word or short-phrase tags describing what's visually in the photo and what job types it would suit>"]}` }
        ]}],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!CATEGORIES.includes(parsed.category)) parsed.category = 'Other';
    res.json({ name: parsed.name, category: parsed.category, tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [] });
  } catch (e) {
    console.warn('[media-library] AI tag failed:', e.message);
    res.status(500).json({ error: 'Could not analyse image' });
  }
}));

router.use(handleMulterError);

module.exports = router;
