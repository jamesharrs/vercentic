// server/routes/superadmin_perf.js
// Superadmin performance metrics — response times + AI usage (cross-tenant)
const express = require('express');
const router = express.Router();
const { getStore, listTenants, loadTenantStore } = require('../db/init');

// Cost per million tokens (must match admin_dashboard.js)
const CPM = { input: 3.0, output: 15.0 };
const calcCost = (ti, to) => ((ti / 1_000_000) * CPM.input) + ((to / 1_000_000) * CPM.output);

const FEATURE_LABELS = {
  copilot: 'Copilot Chat', cv_parse: 'CV Parsing',
  doc_extract: 'Document Extract', job_match: 'Job Matching',
  translation: 'Translation', form_suggest: 'Form Builder',
  interview_schedule: 'Interview Schedule', offer_create: 'Offer Creation',
  jd_generate: 'JD Generation', unknown: 'Other',
};

// ── GET /api/superadmin/perf/response-times ──────────────────────────────────
router.get('/response-times', (req, res) => {
  try {
    const log = global._reqLog || [];
    const now = Date.now();
    const since = now - 24 * 60 * 60 * 1000; // last 24h
    const recent = log.filter(e => e.ts >= since);

    if (!recent.length) return res.json({ summary: null, slowest: [], by_hour: [] });

    const durations = recent.map(e => e.ms).sort((a, b) => a - b);
    const p = pct => durations[Math.floor((pct / 100) * (durations.length - 1))];
    const avg = Math.round(durations.reduce((s, v) => s + v, 0) / durations.length);

    // Group by endpoint prefix (first 2 path segments)
    const byEndpoint = {};
    recent.forEach(e => {
      const key = e.path.split('/').slice(0, 4).join('/');
      if (!byEndpoint[key]) byEndpoint[key] = [];
      byEndpoint[key].push(e.ms);
    });
    const slowest = Object.entries(byEndpoint)
      .map(([path, ms]) => ({
        path,
        calls: ms.length,
        avg_ms: Math.round(ms.reduce((s, v) => s + v, 0) / ms.length),
        p95_ms: ms.sort((a, b) => a - b)[Math.floor(0.95 * (ms.length - 1))],
      }))
      .sort((a, b) => b.avg_ms - a.avg_ms)
      .slice(0, 8);

    // By hour (last 12h)
    const by_hour = [];
    for (let h = 11; h >= 0; h--) {
      const start = now - (h + 1) * 3600000;
      const end   = now - h * 3600000;
      const slice = recent.filter(e => e.ts >= start && e.ts < end);
      by_hour.push({
        hour: new Date(end).toISOString().slice(11, 16),
        count: slice.length,
        avg_ms: slice.length ? Math.round(slice.reduce((s, e) => s + e.ms, 0) / slice.length) : 0,
        errors: slice.filter(e => e.status >= 400).length,
      });
    }

    // Error rate
    const errors = recent.filter(e => e.status >= 400).length;
    const error_rate = recent.length ? Math.round((errors / recent.length) * 1000) / 10 : 0;

    res.json({
      summary: { avg_ms: avg, p50_ms: p(50), p95_ms: p(95), p99_ms: p(99), total_requests: recent.length, error_rate },
      slowest,
      by_hour,
    });
  } catch (err) {
    console.error('[perf/response-times]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/superadmin/perf/ai-usage ────────────────────────────────────────
router.get('/ai-usage', (req, res) => {
  try {
    // Aggregate across master store + all tenant stores
    let logs = [];
    const addLogs = (store, tenantSlug) => {
      const sl = store.ai_usage_log || [];
      sl.forEach(l => logs.push({ ...l, tenant_slug: tenantSlug }));
    };
    addLogs(getStore(), 'master');
    try {
      const tenants = listTenants ? listTenants() : [];
      for (const slug of tenants) {
        try { addLogs(loadTenantStore(slug), slug); } catch(e) { /* skip */ }
      }
    } catch(e) {}

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const d30ago = new Date(now - 30 * 86400000).toISOString();
    const d7ago  = new Date(now - 7  * 86400000).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const recent30 = logs.filter(l => l.created_at >= d30ago);
    const recent7  = logs.filter(l => l.created_at >= d7ago);
    const thisMonth = logs.filter(l => l.created_at >= monthStart);

    const totals = arr => ({
      calls:  arr.length,
      tokens_in:  arr.reduce((s, l) => s + (l.tokens_in  || 0), 0),
      tokens_out: arr.reduce((s, l) => s + (l.tokens_out || 0), 0),
      cost:   calcCost(
        arr.reduce((s, l) => s + (l.tokens_in  || 0), 0),
        arr.reduce((s, l) => s + (l.tokens_out || 0), 0)
      ),
    });

    // Daily breakdown — last 30 days
    const daily = [];
    for (let d = 29; d >= 0; d--) {
      const dayStart = new Date(now - (d + 1) * 86400000).toISOString();
      const dayEnd   = new Date(now - d       * 86400000).toISOString();
      const slice = logs.filter(l => l.created_at >= dayStart && l.created_at < dayEnd);
      const date  = new Date(now - d * 86400000).toISOString().slice(0, 10);
      daily.push({ date, calls: slice.length, cost: calcCost(
        slice.reduce((s, l) => s + (l.tokens_in  || 0), 0),
        slice.reduce((s, l) => s + (l.tokens_out || 0), 0)
      )});
    }

    // By feature
    const featureMap = {};
    recent30.forEach(l => {
      const f = l.feature || 'unknown';
      if (!featureMap[f]) featureMap[f] = { feature: f, label: FEATURE_LABELS[f] || f, calls: 0, tokens_in: 0, tokens_out: 0 };
      featureMap[f].calls++;
      featureMap[f].tokens_in  += l.tokens_in  || 0;
      featureMap[f].tokens_out += l.tokens_out || 0;
    });
    const by_feature = Object.values(featureMap)
      .map(f => ({ ...f, cost: calcCost(f.tokens_in, f.tokens_out) }))
      .sort((a, b) => b.calls - a.calls);

    // By tenant
    const tenantMap = {};
    recent30.forEach(l => {
      const slug = l.tenant_slug || 'master';
      if (!tenantMap[slug]) tenantMap[slug] = { tenant: slug, calls: 0, tokens_in: 0, tokens_out: 0 };
      tenantMap[slug].calls++;
      tenantMap[slug].tokens_in  += l.tokens_in  || 0;
      tenantMap[slug].tokens_out += l.tokens_out || 0;
    });

    res.json({
      this_month: totals(thisMonth),
      last_7d:    totals(recent7),
      last_30d:   totals(recent30),
      daily,
      by_feature,
      by_tenant: Object.values(tenantMap).sort((a,b)=>b.calls-a.calls),
      generated_at: nowIso,
    });
  } catch (err) {
    console.error('[perf/ai-usage]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
