const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.interviews) { s.interviews = []; saveStore(); }
}

router.get('/', (req, res) => {
  ensure();
  const { environment_id, candidate_id, job_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rows = query('interviews', i => i.environment_id === environment_id && !i.deleted_at);
  if (candidate_id) rows = rows.filter(i => i.candidate_id === candidate_id);
  if (job_id)       rows = rows.filter(i => i.job_id === job_id);
  res.json(rows.sort((a,b) => {
    const da = new Date(`${a.date}T${a.time||'00:00'}`);
    const db = new Date(`${b.date}T${b.time||'00:00'}`);
    return da - db;
  }));
});

router.post('/', (req, res) => {
  ensure();
  const { environment_id, interview_type_id, interview_type_name, candidate_id, candidate_name,
          job_id, job_name, date, time, duration, format, interviewers, notes, status } = req.body;
  if (!environment_id || !candidate_id || !date) return res.status(400).json({ error: 'environment_id, candidate_id and date required' });
  const rec = insert('interviews', {
    id: uuidv4(), environment_id, interview_type_id: interview_type_id||null,
    interview_type_name: interview_type_name||'Interview',
    candidate_id, candidate_name: candidate_name||'', job_id: job_id||null, job_name: job_name||'',
    date, time: time||'09:00', duration: duration||30, format: format||'Video Call',
    interviewers: interviewers||[], notes: notes||'', status: status||'pending',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
  });
  res.status(201).json(rec);
});

router.patch('/:id', (req, res) => {
  ensure();
  const fields = ['date','time','status','notes','interviewers','candidate_id','candidate_name','job_id','job_name'];
  const updates = { updated_at: new Date().toISOString() };
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const rec = update('interviews', i => i.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', (req, res) => {
  ensure();
  update('interviews', i => i.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

module.exports = router;
