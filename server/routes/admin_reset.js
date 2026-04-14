// server/routes/admin_reset.js
// Utility endpoint to clear record data from a tenant without wiping schema.
// Protected by the super admin password.

const express = require('express');
const router  = express.Router();
const { getStore, saveStore, tenantStorage } = require('../db/init');
const pg = require('../db/postgres');

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'talentos-internal-2026';

// DELETE /api/admin/tenant/:slug/records
// Clears all records (and related data) for a tenant, leaving schema intact.
router.delete('/tenant/:slug/records', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;

  if (password !== SUPER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!slug) {
    return res.status(400).json({ error: 'slug required' });
  }

  try {
    await tenantStorage.run(slug, async () => {
      const store = getStore();

      // Tables to clear (data only — schema tables are left intact)
      const dataTables = [
        'records', 'relationships', 'activity',
        'communications', 'attachments', 'form_responses',
        'people_links', 'record_workflow_assignments',
        'workflow_runs', 'workflow_run_steps',
        'interviews', 'offers', 'offer_approvals',
        'scorecards', 'bot_sessions',
      ];

      const counts = {};
      for (const table of dataTables) {
        counts[table] = (store[table] || []).length;
        store[table] = [];
      }

      saveStore(slug);

      // Also delete from PostgreSQL if enabled
      if (pg.isEnabled()) {
        const pool = pg.getPool();
        if (pool) {
          for (const table of dataTables) {
            await pool.query(
              `DELETE FROM tenant_store WHERE tenant_slug = $1 AND table_name = $2`,
              [slug, table]
            );
          }
        }
      }

      res.json({
        success: true,
        tenant: slug,
        cleared: counts,
        message: `All record data cleared for tenant "${slug}"`,
      });
    });
  } catch (err) {
    console.error('[admin_reset] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenant-reset/trim-logs
// Trims oversized log tables on master store to prevent file bloat.
// Safe to call any time — just rotates logs, never deletes real data.
router.post('/trim-logs', (req, res) => {
  const { password } = req.body;
  if (password !== SUPER_ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const LIMITS = {
    error_logs:    500,
    ai_usage_log:  100,
    portal_events: 100,
    security_audit: 50,
    audit_log:     100,
    activity:      150,
  };

  const store = getStore();
  const report = {};
  let totalRemoved = 0;

  for (const [table, limit] of Object.entries(LIMITS)) {
    if (!Array.isArray(store[table])) continue;
    const before = store[table].length;
    if (before > limit) {
      store[table] = store[table].slice(-limit);
      const removed = before - limit;
      totalRemoved += removed;
      report[table] = { before, after: limit, removed };
    } else {
      report[table] = { before, after: before, removed: 0 };
    }
  }

  saveStore();
  res.json({ ok: true, totalRemoved, tables: report });
});

module.exports = router;
