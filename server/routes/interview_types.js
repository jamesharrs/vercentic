const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.interview_types) { s.interview_types = []; saveStore(); }
}

router.get('/', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  res.json(query('interview_types', t => t.environment_id === environment_id && !t.deleted_at)
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
});

router.post('/', (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const { environment_id, name, interview_format, duration, format, description, location,
          buffer_before, buffer_after, max_bookings_per_day, interviewers, availability, color } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const rec = insert('interview_types', {
    id: uuidv4(), environment_id, name, interview_format: interview_format||'video',
    duration: duration||30, format: format||'Video Call', description: description||'',
    location: location||'', buffer_before: buffer_before||0, buffer_after: buffer_after||0,
    max_bookings_per_day: max_bookings_per_day||0, interviewers: interviewers||[],
    availability: availability||{}, color: color||'#4361EE',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
  });
  res.status(201).json(rec);
});

router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const fields = ['name','interview_format','duration','format','description','location',
                  'buffer_before','buffer_after','max_bookings_per_day','interviewers','availability','color'];
  const updates = { updated_at: new Date().toISOString() };
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const rec = update('interview_types', t => t.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  update('interview_types', t => t.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

module.exports = router;
