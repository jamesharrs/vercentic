const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

// Relationship types with their inverse
const INVERSE = {
  reports_to:   'manages',
  manages:      'reports_to',
  dotted_line_to: null,
  interim_manager_of: null,
  acting_as: null,
};

const REL_TYPES = Object.keys(INVERSE);

// GET all relationships for an environment (optionally filter by record_id)
router.get('/', (req, res) => {
  const { environment_id, record_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rels = query('relationships', r =>
    r.environment_id === environment_id && !r.deleted_at
  );
  if (record_id) {
    rels = rels.filter(r => r.from_record_id === record_id || r.to_record_id === record_id);
  }
  res.json(rels);
});

// POST create a relationship
router.post('/', (req, res) => {
  const { from_record_id, to_record_id, type, environment_id, start_date, end_date, notes } = req.body;
  if (!from_record_id || !to_record_id || !type || !environment_id)
    return res.status(400).json({ error: 'from_record_id, to_record_id, type, environment_id required' });
  if (!REL_TYPES.includes(type))
    return res.status(400).json({ error: `Invalid type. Must be one of: ${REL_TYPES.join(', ')}` });

  // Prevent duplicate
  const exists = query('relationships', r =>
    r.from_record_id === from_record_id && r.to_record_id === to_record_id &&
    r.type === type && !r.deleted_at
  );
  if (exists.length) return res.status(409).json({ error: 'Relationship already exists' });

  const rel = insert('relationships', {
    id: uuidv4(), from_record_id, to_record_id, type,
    inverse_type: INVERSE[type] || null,
    environment_id, start_date: start_date || null,
    end_date: end_date || null, notes: notes || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    deleted_at: null,
  });
  res.status(201).json(rel);
});

// PATCH update a relationship (dates/notes only)
router.patch('/:id', (req, res) => {
  const rel = findOne('relationships', r => r.id === req.params.id && !r.deleted_at);
  if (!rel) return res.status(404).json({ error: 'Not found' });
  const { start_date, end_date, notes } = req.body;
  const updated = update('relationships', r => r.id === req.params.id, {
    start_date: start_date !== undefined ? start_date : rel.start_date,
    end_date:   end_date   !== undefined ? end_date   : rel.end_date,
    notes:      notes      !== undefined ? notes       : rel.notes,
  });
  res.json(updated);
});

// DELETE a relationship
router.delete('/:id', (req, res) => {
  const rel = findOne('relationships', r => r.id === req.params.id);
  if (!rel) return res.status(404).json({ error: 'Not found' });
  update('relationships', r => r.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

module.exports = router;
