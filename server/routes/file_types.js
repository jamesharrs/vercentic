const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.file_types) {
    s.file_types = [
      { id: uuidv4(), name: 'CV / Resume',     slug: 'cv',         icon: 'file-text',  color: '#4361EE', parse_cv: true,  allowed_formats: ['pdf','doc','docx'], max_size_mb: 10, applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Cover Letter',     slug: 'cover',      icon: 'file-text',  color: '#0CAF77', parse_cv: false, allowed_formats: ['pdf','doc','docx'], max_size_mb: 5,  applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Portfolio',        slug: 'portfolio',  icon: 'layers',     color: '#F79009', parse_cv: false, allowed_formats: ['pdf','zip'],        max_size_mb: 50, applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Right to Work',    slug: 'rtw',        icon: 'shield',     color: '#7C3AED', parse_cv: false, allowed_formats: ['pdf','jpg','png'],  max_size_mb: 10, applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'ID Document',      slug: 'id',         icon: 'credit-card',color: '#EF4444', parse_cv: false, allowed_formats: ['pdf','jpg','png'],  max_size_mb: 10, applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Contract',         slug: 'contract',   icon: 'file',       color: '#0891B2', parse_cv: false, allowed_formats: ['pdf','doc','docx'], max_size_mb: 20, applies_to: ['people','jobs'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Reference Letter', slug: 'reference',  icon: 'award',      color: '#EC4899', parse_cv: false, allowed_formats: ['pdf','doc','docx'], max_size_mb: 5,  applies_to: ['people'], created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Other',            slug: 'other',      icon: 'paperclip',  color: '#9DA8C7', parse_cv: false, allowed_formats: ['pdf','doc','docx','jpg','png','zip','xlsx'], max_size_mb: 20, applies_to: ['people','jobs'], created_at: new Date().toISOString() },
    ];
    saveStore();
  }
}

router.get('/', (req, res) => {
  ensure();
  const { environment_id, object_slug } = req.query;
  let types = (getStore().file_types || []).filter(t => !t.deleted_at);
  if (object_slug) types = types.filter(t => !t.applies_to || t.applies_to.includes(object_slug));
  res.json(types);
});

router.post('/', (req, res) => {
  ensure();
  const s = getStore();
  const ft = { id: uuidv4(), ...req.body, created_at: new Date().toISOString(), deleted_at: null };
  if (!s.file_types) s.file_types = [];
  s.file_types.push(ft);
  saveStore();
  res.status(201).json(ft);
});

router.patch('/:id', (req, res) => {
  ensure();
  const s = getStore();
  const idx = (s.file_types||[]).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.file_types[idx] = { ...s.file_types[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore();
  res.json(s.file_types[idx]);
});

router.delete('/:id', (req, res) => {
  ensure();
  const s = getStore();
  const idx = (s.file_types||[]).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.file_types[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

module.exports = router;
