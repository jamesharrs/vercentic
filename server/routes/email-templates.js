const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove } = require('../db/init');

// GET /api/email-templates?environment_id=X
router.get('/', (req, res) => {
  let all = query('email_templates', () => true);
  if (req.query.environment_id) all = all.filter(t => t.environment_id === req.query.environment_id);
  all.sort((a, b) => (a.name||'').localeCompare(b.name||''));
  res.json(all);
});

router.post('/', (req, res) => {
  const item = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() };
  insert('email_templates', item);
  res.status(201).json(item);
});

router.patch('/:id', (req, res) => {
  const updated = update('email_templates', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  remove('email_templates', req.params.id);
  res.json({ ok: true });
});

module.exports = router;