// server/routes/env_diagnosis.js
// POST /api/env-diagnosis  { environment_id, client_name? }
// Builds an environment snapshot and asks Claude for a health diagnosis.
// GET  /api/env-diagnosis/snapshot/:environment_id — data only, no AI

const express = require('express');
const router  = express.Router();
const { getStore } = require('../db/init');
const { MODEL_DEFAULT } = require('../config/ai_models');

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function buildSnapshot(environment_id, clientName) {
  const s = getStore();
  const snap = { environment_id, client: clientName || environment_id, issues: [], warnings: [] };

  const objects = (s.object_definitions || []).filter(o => o.environment_id === environment_id && !o.deleted_at);
  const records = (s.records || []).filter(r => r.environment_id === environment_id && !r.deleted_at);

  snap.objects = objects.map(o => {
    const recs   = records.filter(r => r.object_id === o.id);
    const fields = (s.field_definitions || []).filter(f => f.object_id === o.id && !f.deleted_at);
    return { name: o.plural_name || o.name, slug: o.slug, record_count: recs.length, field_count: fields.length };
  });
  snap.total_records = records.length;

  snap.objects.forEach(o => {
    if (o.record_count === 0 && o.field_count > 0)
      snap.warnings.push(`Object "${o.name}" has fields configured but no records.`);
  });

  const users = (s.users || []).filter(u => u.environment_id === environment_id && !u.deleted_at);
  snap.user_count              = users.length;
  snap.users_never_logged_in   = users.filter(u => !u.last_login).length;
  snap.users_active_last_30d   = users.filter(u => u.last_login && daysSince(u.last_login) <= 30).length;

  if (users.length === 0) snap.issues.push('No users provisioned on this environment.');
  if (snap.users_never_logged_in === users.length && users.length > 0)
    snap.issues.push('No users have ever logged in — environment may not have been adopted.');
  if (snap.users_active_last_30d === 0 && users.length > 0)
    snap.warnings.push('No user activity in the last 30 days — possible churn risk.');

  const comms = (s.communications || []).filter(c => {
    const rec = records.find(r => r.id === c.record_id);
    return !!rec;
  });
  snap.comms_total     = comms.length;
  snap.comms_simulated = comms.filter(c => c.simulated).length;
  if (snap.comms_simulated > 0 && snap.comms_total > 0) {
    const pct = Math.round((snap.comms_simulated / snap.comms_total) * 100);
    if (pct > 50) snap.warnings.push(`${pct}% of communications are simulated — messaging integration not configured.`);
  }

  const agents    = (s.agents || []).filter(a => a.environment_id === environment_id && !a.deleted_at);
  const workflows = (s.workflows || []).filter(w => w.environment_id === environment_id && !w.deleted_at);
  snap.workflow_count  = workflows.length;
  snap.agent_count     = agents.length;
  snap.agents_active   = agents.filter(a => a.is_active).length;

  const agentRuns  = (s.agent_runs || []).filter(r => agents.find(a => a.id === r.agent_id));
  const failedRuns = agentRuns.filter(r => r.status === 'failed');
  snap.agent_runs_total  = agentRuns.length;
  snap.agent_runs_failed = failedRuns.length;
  if (failedRuns.length > 0) {
    const rate = Math.round((failedRuns.length / agentRuns.length) * 100);
    if (rate > 20) snap.issues.push(`Agent failure rate is ${rate}% (${failedRuns.length}/${agentRuns.length} runs failed).`);
  }
  const stuckApprovals = agentRuns.filter(r => r.status === 'pending_approval' && daysSince(r.created_at) > 3);
  if (stuckApprovals.length > 0)
    snap.warnings.push(`${stuckApprovals.length} agent run(s) stuck in pending approval for >3 days.`);

  const errors = (s.error_logs || []).filter(e => e.environment_id === environment_id && !e.resolved);
  snap.unresolved_errors = errors.length;
  snap.errors_last_7d    = errors.filter(e => daysSince(e.created_at) <= 7).length;
  if (errors.length > 10) snap.issues.push(`${errors.length} unresolved errors — needs investigation.`);
  else if (errors.length > 0) snap.warnings.push(`${errors.length} unresolved error log(s).`);

  const errCounts = {};
  errors.forEach(e => { const k = e.message?.slice(0, 80) || 'Unknown'; errCounts[k] = (errCounts[k] || 0) + 1; });
  snap.top_errors = Object.entries(errCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([message, count]) => ({ message, count }));

  const offers = (s.offers || []).filter(o => records.find(r => r.id === o.candidate_id || r.id === o.job_id));
  snap.offer_count              = offers.length;
  snap.offers_pending_approval  = offers.filter(o => o.status === 'pending_approval').length;
  snap.offers_expired           = offers.filter(o => o.status === 'sent' && o.expiry_date && new Date(o.expiry_date) < new Date()).length;
  if (snap.offers_expired > 0) snap.warnings.push(`${snap.offers_expired} offer(s) sent but now expired without a response.`);

  snap.interview_count         = (s.interviews || []).filter(i => records.find(r => r.id === i.candidate_id || r.id === i.job_id)).length;
  snap.records_created_last_7d  = records.filter(r => daysSince(r.created_at) <= 7).length;
  snap.records_created_last_30d = records.filter(r => daysSince(r.created_at) <= 30).length;
  if (snap.total_records > 10 && snap.records_created_last_30d === 0)
    snap.warnings.push('No new records created in the last 30 days — possible inactivity.');

  return snap;
}

function snapToText(snap) {
  const L = [];
  L.push(`ENVIRONMENT: ${snap.client} (${snap.environment_id})`);
  L.push(`\nOBJECTS & DATA:`);
  snap.objects.forEach(o => L.push(`  ${o.name}: ${o.record_count} records, ${o.field_count} fields`));
  L.push(`  Total: ${snap.total_records} | Last 7d: ${snap.records_created_last_7d} | Last 30d: ${snap.records_created_last_30d}`);
  L.push(`\nUSERS: ${snap.user_count} total | ${snap.users_active_last_30d} active 30d | ${snap.users_never_logged_in} never logged in`);
  L.push(`\nCOMMUNICATIONS: ${snap.comms_total} total | ${snap.comms_simulated} simulated`);
  L.push(`\nWORKFLOWS & AGENTS: ${snap.workflow_count} workflows | ${snap.agent_count} agents (${snap.agents_active} active) | runs: ${snap.agent_runs_total} total, ${snap.agent_runs_failed} failed`);
  L.push(`\nINTERVIEWS & OFFERS: ${snap.interview_count} interviews | ${snap.offer_count} offers (${snap.offers_pending_approval} pending, ${snap.offers_expired} expired)`);
  L.push(`\nERRORS: ${snap.unresolved_errors} unresolved (${snap.errors_last_7d} last 7d)`);
  if (snap.top_errors?.length) snap.top_errors.forEach(e => L.push(`  [${e.count}x] ${e.message}`));
  if (snap.issues.length) { L.push(`\nKNOWN ISSUES:`); snap.issues.forEach(i => L.push(`  ❌ ${i}`)); }
  if (snap.warnings.length) { L.push(`\nWARNINGS:`); snap.warnings.forEach(w => L.push(`  ⚠ ${w}`)); }
  return L.join('\n');
}

router.post('/', async (req, res) => {
  try {
    const { environment_id, client_name } = req.body;
    if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
    const snap     = buildSnapshot(environment_id, client_name);
    const snapText = snapToText(snap);

    const Anthropic = require('@anthropic-ai/sdk');
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await ai.messages.create({
      model: MODEL_DEFAULT, max_tokens: 1200,
      messages: [{ role: 'user', content:
        `You are a senior customer success engineer at Vercentic. Diagnose this client environment snapshot:\n\n${snapText}\n\nProvide:\n1. A 2-3 sentence plain-English health summary.\n2. Issues found — what's wrong, why it matters, what to do.\n3. Warnings — not critical but needs attention.\n4. Positive signals — what is working well.\n5. Recommended next steps for the support team, in priority order.\n\nBe direct. Name actual problems. Don't hedge.` }],
    });
    res.json({ snapshot: snap, diagnosis: response.content[0]?.text || 'No diagnosis generated.', generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[env-diagnosis]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/snapshot/:environment_id', (req, res) => {
  try { res.json(buildSnapshot(req.params.environment_id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
