// server/routes/rpo_clients.js
const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');

function ensureCollection() {
  const store = getStore();
  if (!store.rpo_settings) { store.rpo_settings = []; saveStore(store); }
}

router.get('/', (req, res) => {
  ensureCollection();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const settings = (store.rpo_settings||[]).find(s => s.environment_id === environment_id);
  res.json({ clients: settings?.clients||[], rpo_mode: settings?.rpo_mode||false });
});

router.put('/', (req, res) => {
  ensureCollection();
  const { environment_id, clients, rpo_mode } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const existing = (store.rpo_settings||[]).find(s => s.environment_id === environment_id);
  if (existing) {
    existing.clients = clients ?? existing.clients;
    existing.rpo_mode = rpo_mode ?? existing.rpo_mode;
    existing.updated_at = new Date().toISOString();
  } else {
    store.rpo_settings.push({ environment_id, clients: clients||[], rpo_mode: rpo_mode||false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  saveStore(store); res.json({ success: true });
});

module.exports = router;
