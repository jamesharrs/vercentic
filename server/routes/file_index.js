/**
 * File Index Routes — /api/file-index
 */
const express = require('express');
const router  = express.Router();
const { indexAttachment, backfillAll, searchIndex, getStats } = require('../services/fileIndex');
const { query } = require('../db/init');

// GET /api/file-index/stats — index health
router.get('/stats', (req, res) => {
  res.json(getStats());
});

// POST /api/file-index/backfill — index all unindexed files (async, returns immediately)
router.post('/backfill', (req, res) => {
  res.json({ ok: true, message: 'Backfill started — check server logs for progress' });
  backfillAll().catch(e => console.error('[fileIndex] backfill error:', e.message));
});

// POST /api/file-index/search — search file content
// Body: { term, record_ids?, categories?, environment_id?, limit? }
router.post('/search', (req, res) => {
  const { term, record_ids, categories, environment_id, limit } = req.body;
  if (!term) return res.status(400).json({ error: 'term required' });
  const results = searchIndex({ term, recordIds: record_ids, categories, environmentId: environment_id, limit });
  res.json({ results, total: results.length });
});

// POST /api/file-index/index-one — (re)index a specific attachment
router.post('/index-one', async (req, res) => {
  const { attachment_id } = req.body;
  if (!attachment_id) return res.status(400).json({ error: 'attachment_id required' });
  const att = query('attachments', a => a.id === attachment_id)[0];
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  const entry = await indexAttachment(att);
  res.json({ ok: true, entry });
});

module.exports = router;
