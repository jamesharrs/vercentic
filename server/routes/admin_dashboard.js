const express = require('express');
const router = express.Router();
const { query, insert, getStore } = require('../db/init');

// ── AI usage tracking helper ────────────────────────────────────────────────
// Call from ai-proxy.js, cv_parse.js, doc_extract.js, translate.js etc.
function trackAIUsage(data) {
  try {
    insert('ai_usage_log', {
      user_id: data.user_id || 'system',
      user_name: data.user_name || 'System',
      user_email: data.user_email || '',
      feature: data.feature || 'unknown',
      tokens_in: data.tokens_in || 0,
      tokens_out: data.tokens_out || 0,
      model: data.model || 'claude-sonnet-4-6',
      environment_id: data.environment_id || '',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[AI tracking]', e.message);
  }
}

// Cost per million tokens
const CPM = { input: 3.0, output: 15.0 };
function calcCost(ti, to) {
  return ((ti / 1_000_000) * CPM.input) + ((to / 1_000_000) * CPM.output);
}

const FEATURE_LABELS = {
  copilot: 'Copilot Chat', cv_parse: 'CV Parsing',
  doc_extract: 'Document Extract', job_match: 'Job Matching',
  translation: 'Translation', form_suggest: 'Form Builder',
  interview_schedule: 'Interview Schedule', offer_create: 'Offer Creation',
  jd_generate: 'JD Generation', unknown: 'Other'
};

// ── GET /api/admin/dashboard ────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const store = getStore();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = startOfMonth;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // ── AI Usage ─────────────────────────────────────────────────
    const allLogs = store.ai_usage_log || [];
    const thisMonthLogs = allLogs.filter(l => l.created_at >= startOfMonth);
    const lastMonthLogs = allLogs.filter(l => l.created_at >= startOfLastMonth && l.created_at < endOfLastMonth);
    const last30Logs = allLogs.filter(l => l.created_at >= thirtyDaysAgo);

    const aiTotals = {
      this_month: thisMonthLogs.length,
      last_month: lastMonthLogs.length,
      tokens_in: thisMonthLogs.reduce((s, l) => s + (l.tokens_in || 0), 0),
      tokens_out: thisMonthLogs.reduce((s, l) => s + (l.tokens_out || 0), 0),
      estimated_cost: calcCost(
        thisMonthLogs.reduce((s, l) => s + (l.tokens_in || 0), 0),
        thisMonthLogs.reduce((s, l) => s + (l.tokens_out || 0), 0)
      )
    };
    aiTotals.trend_pct = lastMonthLogs.length > 0
      ? Math.round(((thisMonthLogs.length - lastMonthLogs.length) / lastMonthLogs.length) * 100)
      : null;

    const featureMap = {};
    thisMonthLogs.forEach(l => {
      const f = l.feature || 'unknown';
      if (!featureMap[f]) featureMap[f] = { feature: f, label: FEATURE_LABELS[f] || f, count: 0, tokens_in: 0, tokens_out: 0 };
      featureMap[f].count++;
      featureMap[f].tokens_in += l.tokens_in || 0;
      featureMap[f].tokens_out += l.tokens_out || 0;
    });
    const byFeature = Object.values(featureMap).sort((a, b) => b.count - a.count);

    const userMap = {};
    thisMonthLogs.forEach(l => {
      const uid = l.user_id || 'system';
      if (!userMap[uid]) userMap[uid] = { user_id: uid, user_name: l.user_name || 'Unknown', user_email: l.user_email || '', count: 0, tokens_in: 0, tokens_out: 0 };
      userMap[uid].count++;
      userMap[uid].tokens_in += l.tokens_in || 0;
      userMap[uid].tokens_out += l.tokens_out || 0;
    });
    const byUser = Object.values(userMap)
      .map(u => ({ ...u, estimated_cost: calcCost(u.tokens_in, u.tokens_out) }))
      .sort((a, b) => b.count - a.count);

    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dailyMap[key] = { date: key, count: 0, tokens: 0 };
    }
    last30Logs.forEach(l => {
      const key = l.created_at.slice(0, 10);
      if (dailyMap[key]) { dailyMap[key].count++; dailyMap[key].tokens += (l.tokens_in || 0) + (l.tokens_out || 0); }
    });
    const aiDailyTrend = Object.values(dailyMap);

    // ── Users ─────────────────────────────────────────────────────
    const allUsers = store.users || [];
    const activeThisMonth = allUsers.filter(u => u.last_login && u.last_login >= startOfMonth);
    const newThisMonth = allUsers.filter(u => u.created_at && u.created_at >= startOfMonth);
    const byRole = {};
    allUsers.forEach(u => { const r = u.role?.name || 'Unknown'; byRole[r] = (byRole[r] || 0) + 1; });
    const recentLogins = [...allUsers]
      .filter(u => u.last_login).sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
      .slice(0, 10).map(u => ({ id: u.id, name: `${u.first_name||''} ${u.last_name||''}`.trim(), email: u.email, role: u.role?.name || 'Unknown', last_login: u.last_login, login_count: u.login_count || 0 }));
    const userStats = { total: allUsers.length, active_this_month: activeThisMonth.length, new_this_month: newThisMonth.length, by_role: Object.entries(byRole).map(([role, count]) => ({ role, count })), recent_logins: recentLogins };

    // ── Records ───────────────────────────────────────────────────
    const allRecords = store.records || [];
    const allObjects = store.object_definitions || [];
    const allEnvs = store.environments || [];
    const recThisMonth = allRecords.filter(r => r.created_at >= startOfMonth);
    const recLastMonth = allRecords.filter(r => r.created_at >= startOfLastMonth && r.created_at < endOfLastMonth);
    const byObject = {};
    allObjects.forEach(o => { byObject[o.id] = { name: o.plural_name || o.name, count: 0, this_month: 0 }; });
    allRecords.forEach(r => { if (byObject[r.object_id]) { byObject[r.object_id].count++; if (r.created_at >= startOfMonth) byObject[r.object_id].this_month++; } });
    const recDailyMap = {};
    for (let i = 29; i >= 0; i--) { const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); recDailyMap[key] = { date: key, count: 0 }; }
    allRecords.filter(r => r.created_at >= thirtyDaysAgo).forEach(r => { const key = r.created_at.slice(0, 10); if (recDailyMap[key]) recDailyMap[key].count++; });
    const recordStats = { total: allRecords.length, this_month: recThisMonth.length, last_month: recLastMonth.length, trend_pct: recLastMonth.length > 0 ? Math.round(((recThisMonth.length - recLastMonth.length) / recLastMonth.length) * 100) : null, by_object: Object.values(byObject).sort((a, b) => b.count - a.count), daily_trend: Object.values(recDailyMap) };

    // ── Other stats ───────────────────────────────────────────────
    const allWorkflows = store.workflows || [];
    const allWorkflowRuns = store.workflow_runs || [];
    const allInterviews = store.interviews || [];
    const allOffers = store.offers || [];
    const allForms = store.forms || [];
    const allFormResponses = store.form_responses || [];
    const allAttachments = store.attachments || [];
    const allComms = store.communications || [];
    const commsThisMonth = allComms.filter(c => c.created_at >= startOfMonth);
    // Estimate store size cheaply by summing per-table array lengths × avg bytes
    // Avoids serialising the entire store just to get a byte count
    const storeSize = Object.values(store).reduce((sum, v) =>
      sum + (Array.isArray(v) ? v.length * 800 : 200), 0);

    res.json({
      generated_at: now.toISOString(),
      ai: { totals: aiTotals, by_feature: byFeature, by_user: byUser, daily_trend: aiDailyTrend },
      users: userStats,
      records: recordStats,
      workflows: { total: allWorkflows.length, active: allWorkflows.filter(w => w.is_active).length, runs_this_month: allWorkflowRuns.filter(r => r.created_at >= startOfMonth).length, runs_last_month: allWorkflowRuns.filter(r => r.created_at >= startOfLastMonth && r.created_at < endOfLastMonth).length },
      interviews: { total: allInterviews.length, this_month: allInterviews.filter(i => i.created_at >= startOfMonth).length, upcoming: allInterviews.filter(i => i.date > now.toISOString() && i.status !== 'cancelled').length },
      offers: { total: allOffers.length, this_month: allOffers.filter(o => o.created_at >= startOfMonth).length, pending: allOffers.filter(o => ['draft','pending_approval','sent'].includes(o.status)).length, accepted: allOffers.filter(o => o.status === 'accepted').length, accepted_this_month: allOffers.filter(o => o.status === 'accepted' && o.updated_at >= startOfMonth).length },
      forms: { total: allForms.length, responses_this_month: allFormResponses.filter(r => r.created_at >= startOfMonth).length },
      files: { total: allAttachments.length, this_month: allAttachments.filter(a => a.created_at >= startOfMonth).length },
      communications: { total: allComms.length, this_month: commsThisMonth.length, by_type: ['email','sms','whatsapp','call'].map(t => ({ type: t, count: commsThisMonth.filter(c => c.type === t).length })) },
      system: { node_version: process.version, uptime_seconds: Math.floor(process.uptime()), heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), store_size_kb: Math.round(storeSize / 1024), environments: allEnvs.length, total_objects: allObjects.length }
    });
  } catch (err) {
    console.error('[admin dashboard]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/ai-usage (paginated log) ───────────────────────────────
router.get('/ai-usage', (req, res) => {
  const { page = 1, limit = 50, feature, user_id } = req.query;
  const store = getStore();
  let logs = store.ai_usage_log || [];
  if (feature) logs = logs.filter(l => l.feature === feature);
  if (user_id) logs = logs.filter(l => l.user_id === user_id);
  logs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = logs.length;
  const start = (page - 1) * limit;
  res.json({ logs: logs.slice(start, start + Number(limit)), total, page: Number(page) });
});

module.exports = { router, trackAIUsage };
