const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_CATEGORIES = [
  { name: 'New',          color: '#3B82F6', icon: 'inbox',      sort_order: 0, is_system: true,  is_terminal: false, description: 'Just entered the pipeline' },
  { name: 'Screening',    color: '#F59E0B', icon: 'filter',     sort_order: 1, is_system: true,  is_terminal: false, description: 'Being reviewed or filtered' },
  { name: 'Interviewing', color: '#8B5CF6', icon: 'users',      sort_order: 2, is_system: true,  is_terminal: false, description: 'Active interview process' },
  { name: 'Offering',     color: '#06B6D4', icon: 'file-text',  sort_order: 3, is_system: true,  is_terminal: false, description: 'Offer being made' },
  { name: 'Hired',        color: '#10B981', icon: 'check',      sort_order: 4, is_system: true,  is_terminal: true,  description: 'Successfully placed' },
  { name: 'Rejected',     color: '#EF4444', icon: 'x-circle',   sort_order: 5, is_system: true,  is_terminal: true,  description: 'Not progressing' },
  { name: 'Withdrawn',    color: '#6B7280', icon: 'minus-circle',sort_order: 6, is_system: true,  is_terminal: true,  description: 'Candidate withdrew' },
];

// Keyword → category mapping for auto-suggest
const CATEGORY_KEYWORDS = {
  'New':          ['new','applied','application','received','submitted','fresh','enquiry','enquired','sourced'],
  'Screening':    ['screen','review','cv','resume','phone','call','pre','qualify','longlist','shortlist','assess','initial'],
  'Interviewing': ['interview','meet','panel','technical','video','zoom','teams','onsite','visit','second','third','final','test'],
  'Offering':     ['offer','package','salary','negotiate','propose','verbal','written','contract'],
  'Hired':        ['hired','hire','placed','accepted','started','onboard','joined','won'],
  'Rejected':     ['reject','declined','failed','unsuccessful','not progressing','no','pass','drop','remove'],
  'Withdrawn':    ['withdrawn','withdrew','withdrew','pulled out','no longer','cancelled','not interested'],
};

function seedDefaults(environment_id) {
  const existing = query('stage_categories', c => c.environment_id === environment_id);
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  DEFAULT_CATEGORIES.forEach(cat => {
    insert('stage_categories', { id: uuidv4(), environment_id, ...cat, created_at: now, updated_at: now });
  });
  saveStore();
}

// GET /api/stage-categories?environment_id=
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  seedDefaults(environment_id);
  const cats = query('stage_categories', c => c.environment_id === environment_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  res.json(cats);
});

// POST /api/stage-categories
router.post('/', (req, res) => {
  const { environment_id, name, color, icon, description } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const existing = query('stage_categories', c => c.environment_id === environment_id);
  const max_order = existing.reduce((m, c) => Math.max(m, c.sort_order ?? 0), -1);
  const now = new Date().toISOString();
  const cat = insert('stage_categories', {
    id: uuidv4(), environment_id, name, color: color || '#6B7280',
    icon: icon || 'circle', description: description || '',
    sort_order: max_order + 1, is_system: false, is_terminal: false,
    created_at: now, updated_at: now,
  });
  saveStore();
  res.status(201).json(cat);
});

// PATCH /api/stage-categories/:id
router.patch('/:id', (req, res) => {
  const cat = query('stage_categories', c => c.id === req.params.id)[0];
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const allowed = ['name','color','icon','description','is_terminal','sort_order'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  updates.updated_at = new Date().toISOString();
  const updated = update('stage_categories', c => c.id === req.params.id, updates);
  saveStore();
  res.json(updated[0]);
});

// DELETE /api/stage-categories/:id
router.delete('/:id', (req, res) => {
  const cat = query('stage_categories', c => c.id === req.params.id)[0];
  if (!cat) return res.status(404).json({ error: 'Not found' });
  if (cat.is_system) return res.status(403).json({ error: 'Cannot delete system categories' });
  remove('stage_categories', c => c.id === req.params.id);
  saveStore();
  res.json({ deleted: true });
});

// POST /api/stage-categories/reorder  { environment_id, ordered_ids: [...] }
router.post('/reorder', (req, res) => {
  const { environment_id, ordered_ids } = req.body;
  if (!environment_id || !Array.isArray(ordered_ids)) return res.status(400).json({ error: 'Invalid' });
  ordered_ids.forEach((id, idx) => {
    update('stage_categories', c => c.id === id, { sort_order: idx, updated_at: new Date().toISOString() });
  });
  saveStore();
  res.json({ ok: true });
});

// GET /api/stage-categories/suggest?name=Phone+Screen&environment_id=
router.get('/suggest', (req, res) => {
  const { name, environment_id } = req.query;
  if (!name || !environment_id) return res.json({ category: null });
  const lower = name.toLowerCase();
  let best = null;
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) { best = catName; break; }
  }
  if (!best) return res.json({ category: null });
  seedDefaults(environment_id);
  const cat = query('stage_categories', c => c.environment_id === environment_id && c.name === best)[0];
  res.json({ category: cat || null });
});

module.exports = router;
