// server/routes/ai_governance.js
// Persists AI governance state: compliance status, risk register, data rights requests
'use strict';
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

function ensure(store) {
  if (!store.ai_governance_status)  store.ai_governance_status  = {};
  if (!store.risk_register)         store.risk_register         = [];
  if (!store.data_rights_requests)  store.data_rights_requests  = [];
}

// GET /api/ai-governance/status?environment_id=
router.get('/status', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  ensure(store);
  const key = environment_id || 'default';
  res.json(store.ai_governance_status[key] || {});
});

// PATCH /api/ai-governance/status
router.patch('/status', (req, res) => {
  const { environment_id, items } = req.body;
  const store = getStore();
  ensure(store);
  const key = environment_id || 'default';
  store.ai_governance_status[key] = {
    ...(store.ai_governance_status[key] || {}),
    items,
    updated_at: new Date().toISOString(),
  };
  saveStore();
  res.json({ ok: true });
});

// GET /api/ai-governance/risk-register?environment_id=
router.get('/risk-register', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  ensure(store);
  const items = store.risk_register.filter(r => r.environment_id === environment_id);
  res.json(items);
});

// POST /api/ai-governance/risk-register
router.post('/risk-register', (req, res) => {
  const store = getStore();
  ensure(store);
  const item = {
    id: uuidv4(),
    environment_id: req.body.environment_id,
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'operational',
    likelihood: req.body.likelihood || 'medium',  // low|medium|high
    impact: req.body.impact || 'medium',
    status: req.body.status || 'open',             // open|accepted|mitigated|closed
    owner: req.body.owner || '',
    mitigation: req.body.mitigation || '',
    review_date: req.body.review_date || null,
    regulations: req.body.regulations || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.risk_register.push(item);
  saveStore();
  res.json(item);
});

// PATCH /api/ai-governance/risk-register/:id
router.patch('/risk-register/:id', (req, res) => {
  const store = getStore();
  ensure(store);
  const idx = store.risk_register.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.risk_register[idx] = { ...store.risk_register[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore();
  res.json(store.risk_register[idx]);
});

// DELETE /api/ai-governance/risk-register/:id
router.delete('/risk-register/:id', (req, res) => {
  const store = getStore();
  ensure(store);
  store.risk_register = store.risk_register.filter(r => r.id !== req.params.id);
  saveStore();
  res.json({ ok: true });
});

// GET /api/ai-governance/data-rights?environment_id=
router.get('/data-rights', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  ensure(store);
  res.json(store.data_rights_requests.filter(r => r.environment_id === environment_id));
});

// POST /api/ai-governance/data-rights (log a rights request)
router.post('/data-rights', (req, res) => {
  const store = getStore();
  ensure(store);
  const req2 = {
    id: uuidv4(),
    environment_id: req.body.environment_id,
    person_id: req.body.person_id,
    person_name: req.body.person_name,
    type: req.body.type, // access|erasure|portability|explanation
    status: 'pending',
    requested_at: new Date().toISOString(),
    completed_at: null,
    notes: req.body.notes || '',
  };
  store.data_rights_requests.push(req2);
  saveStore();
  res.json(req2);
});

// PATCH /api/ai-governance/data-rights/:id
router.patch('/data-rights/:id', (req, res) => {
  const store = getStore();
  ensure(store);
  const idx = store.data_rights_requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.data_rights_requests[idx] = {
    ...store.data_rights_requests[idx],
    ...req.body,
    completed_at: req.body.status === 'completed' ? new Date().toISOString() : store.data_rights_requests[idx].completed_at,
  };
  saveStore();
  res.json(store.data_rights_requests[idx]);
});

module.exports = router;
