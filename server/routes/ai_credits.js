// server/routes/ai_credits.js
// AI Credit Management — allocations, usage tracking, enforcement, warnings
'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');

// ── Pricing constants ─────────────────────────────────────────────────────────
const ANTHROPIC_CPM = { input: 3.0, output: 15.0 };
const CLIENT_MARGIN = 5.0;
const CLIENT_CPM    = { input: ANTHROPIC_CPM.input * CLIENT_MARGIN, output: ANTHROPIC_CPM.output * CLIENT_MARGIN };

const WARN_LEVELS = [
  { pct: 20, severity: 'warning',  label: 'Low credits' },
  { pct: 5,  severity: 'critical', label: 'Credits almost exhausted' },
  { pct: 0,  severity: 'blocked',  label: 'Credits exhausted' },
];

function calcCost(ti, to, prices = ANTHROPIC_CPM) {
  return ((ti / 1_000_000) * prices.input) + ((to / 1_000_000) * prices.output);
}

function ensure() {
  const s = getStore();
  if (!s.ai_credit_allocations) { s.ai_credit_allocations = []; saveStore(); }
  if (!s.ai_usage_log)          { s.ai_usage_log = [];           saveStore(); }
  if (!s.ai_master_pool) {
    s.ai_master_pool = {
      total_budget_usd: 1000.00,
      alert_threshold_pct: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveStore();
  }
}

function envUsageThisMonth(environment_id) {
  const s = getStore();
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const logs = (s.ai_usage_log || []).filter(l =>
    l.environment_id === environment_id && l.created_at >= from
  );
  const ti = logs.reduce((a, l) => a + (l.tokens_in  || 0), 0);
  const to = logs.reduce((a, l) => a + (l.tokens_out || 0), 0);
  return {
    requests: logs.length, tokens_in: ti, tokens_out: to,
    cost_anthropic: calcCost(ti, to, ANTHROPIC_CPM),
    cost_client:    calcCost(ti, to, CLIENT_CPM),
    by_feature: Object.values(
      logs.reduce((acc, l) => {
        if (!acc[l.feature]) acc[l.feature] = { feature: l.feature, requests: 0, tokens_in: 0, tokens_out: 0 };
        acc[l.feature].requests++;
        acc[l.feature].tokens_in  += l.tokens_in  || 0;
        acc[l.feature].tokens_out += l.tokens_out || 0;
        return acc;
      }, {})
    ).sort((a, b) => (b.tokens_in + b.tokens_out) - (a.tokens_in + a.tokens_out)),
  };
}

function checkCredits(environment_id) {
  const s = getStore();
  ensure();
  const alloc = (s.ai_credit_allocations || []).find(a =>
    a.environment_id === environment_id && !a.deleted_at
  );
  if (!alloc) return { allowed: true, uncapped: true };
  const usage       = envUsageThisMonth(environment_id);
  const usedUsd     = usage.cost_client;
  const budgetUsd   = alloc.monthly_budget_usd || 0;
  const remainingUsd  = Math.max(0, budgetUsd - usedUsd);
  const pctRemaining  = budgetUsd > 0 ? (remainingUsd / budgetUsd) * 100 : 0;
  const warnLevel     = WARN_LEVELS.find(w => pctRemaining <= w.pct);
  return {
    allowed:       !(alloc.hard_cap && remainingUsd <= 0),
    allocation:    alloc, usage,
    budget_usd:    budgetUsd, used_usd: usedUsd,
    remaining_usd: remainingUsd,
    pct_remaining: Math.round(pctRemaining),
    warn_level:    warnLevel || null,
    hard_cap:      alloc.hard_cap || false,
  };
}

module.exports.checkCredits  = checkCredits;
module.exports.calcCost      = calcCost;
module.exports.CLIENT_CPM    = CLIENT_CPM;
module.exports.ANTHROPIC_CPM = ANTHROPIC_CPM;
module.exports.CLIENT_MARGIN = CLIENT_MARGIN;

// Routes
router.get('/master', (req, res) => {
  ensure();
  const s = getStore();
  // Gather environments from master + all tenant stores with proper naming
  const allClients    = s.clients || [];
  const allClientEnvs = s.client_environments || [];
  const masterEnvs = s.environments || [];
  const allAllocs = s.ai_credit_allocations || [];
  const totalAllocated = allAllocs.filter(a => !a.deleted_at).reduce((sum, a) => sum + (a.monthly_budget_usd || 0), 0);
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  // Aggregate ai_usage_log across tenant stores
  let allLogs = (s.ai_usage_log || []).filter(l => l.created_at >= from);
  try {
    const { listTenants, loadTenantStore } = require('../db/init');
    const tenants = listTenants ? listTenants() : [];
    for (const slug of tenants) {
      try {
        const ts = loadTenantStore(slug);
        const tl = (ts.ai_usage_log||[]).filter(l=>l.created_at>=from);
        allLogs = [...allLogs, ...tl];
      } catch(e) {}
    }
  } catch(e) {}
  const totalTi  = allLogs.reduce((a, l) => a + (l.tokens_in  || 0), 0);
  const totalTo  = allLogs.reduce((a, l) => a + (l.tokens_out || 0), 0);
  const pool = s.ai_master_pool;
  const usedUsd = calcCost(totalTi, totalTo, ANTHROPIC_CPM);
  const clientRevUsd = calcCost(totalTi, totalTo, CLIENT_CPM);

  // Build environment list: client envs (with proper names) + master envs
  const enrichedEnvs = [];
  // Client environments
  allClientEnvs.filter(e=>!e.deleted_at).forEach(env => {
    const client = allClients.find(c=>c.id===env.client_id);
    const displayName = client ? `${client.name} — ${env.name}` : env.name;
    const alloc = allAllocs.find(a => a.environment_id === env.id && !a.deleted_at);
    const usage = envUsageThisMonth(env.id);
    enrichedEnvs.push({
      environment_id: env.id, environment_name: displayName,
      client_name: client?.name || null, is_default: env.is_default,
      allocation: alloc || null, usage,
      status: alloc ? checkCredits(env.id) : { allowed: true, uncapped: true },
    });
  });
  // Master environments not in client_environments
  masterEnvs.forEach(env => {
    if (!enrichedEnvs.find(e=>e.environment_id===env.id)) {
      const alloc = allAllocs.find(a => a.environment_id === env.id && !a.deleted_at);
      const usage = envUsageThisMonth(env.id);
      enrichedEnvs.push({
        environment_id: env.id, environment_name: `${env.name} (master)`,
        client_name: null, is_default: env.is_default,
        allocation: alloc || null, usage,
        status: alloc ? checkCredits(env.id) : { allowed: true, uncapped: true },
      });
    }
  });

  res.json({
    pool,
    stats: {
      total_environments: enrichedEnvs.length,
      environments_with_cap: allAllocs.filter(a => !a.deleted_at).length,
      total_allocated_usd: totalAllocated,
      used_usd_anthropic: usedUsd,
      client_revenue_usd: clientRevUsd,
      margin_usd: clientRevUsd - usedUsd,
      total_requests: allLogs.length,
      tokens_in: totalTi, tokens_out: totalTo,
    },
    environments: enrichedEnvs,
  });
});

router.patch('/master', (req, res) => {
  ensure();
  const s = getStore();
  const { total_budget_usd, alert_threshold_pct } = req.body;
  if (total_budget_usd !== undefined) s.ai_master_pool.total_budget_usd = total_budget_usd;
  if (alert_threshold_pct !== undefined) s.ai_master_pool.alert_threshold_pct = alert_threshold_pct;
  s.ai_master_pool.updated_at = new Date().toISOString();
  saveStore();
  res.json(s.ai_master_pool);
});

router.get('/allocations', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  let rows = query('ai_credit_allocations', a => !a.deleted_at);
  if (environment_id) rows = rows.filter(a => a.environment_id === environment_id);
  res.json(rows);
});

router.post('/allocations', (req, res) => {
  ensure();
  const { environment_id, monthly_budget_usd, hard_cap = true, rollover = false, notes = '', alert_threshold_pct = 20 } = req.body;
  if (!environment_id || monthly_budget_usd === undefined) return res.status(400).json({ error: 'environment_id and monthly_budget_usd required' });
  const s = getStore();
  const existing = (s.ai_credit_allocations || []).find(a => a.environment_id === environment_id && !a.deleted_at);
  if (existing) {
    const up = update('ai_credit_allocations', a => a.id === existing.id, { monthly_budget_usd, hard_cap, rollover, notes, alert_threshold_pct, updated_at: new Date().toISOString() });
    return res.json(up);
  }
  const rec = insert('ai_credit_allocations', { id: uuidv4(), environment_id, monthly_budget_usd, hard_cap, rollover, notes, alert_threshold_pct, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null });
  res.status(201).json(rec);
});

router.delete('/allocations/:id', (req, res) => {
  ensure();
  update('ai_credit_allocations', a => a.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

router.get('/usage/:environmentId', (req, res) => {
  ensure();
  const s = getStore();
  const envId = req.params.environmentId;
  const months = parseInt(req.query.months || 3);
  const monthlyData = [];
  const now = new Date();
  for (let m = 0; m < months; m++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const logs = (s.ai_usage_log || []).filter(l => l.environment_id === envId && l.created_at >= monthStart.toISOString() && l.created_at < monthEnd.toISOString());
    const ti = logs.reduce((a, l) => a + (l.tokens_in  || 0), 0);
    const to = logs.reduce((a, l) => a + (l.tokens_out || 0), 0);
    monthlyData.unshift({ month: monthStart.toLocaleString('en-GB', { month: 'short', year: 'numeric' }), requests: logs.length, tokens_in: ti, tokens_out: to, cost_anthropic: calcCost(ti, to, ANTHROPIC_CPM), cost_client: calcCost(ti, to, CLIENT_CPM) });
  }
  const thisMonth = envUsageThisMonth(envId);
  const status    = checkCredits(envId);
  const alloc     = (s.ai_credit_allocations || []).find(a => a.environment_id === envId && !a.deleted_at);
  const fromDate  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthLogs = (s.ai_usage_log || []).filter(l => l.environment_id === envId && l.created_at >= fromDate);
  const daily = {};
  thisMonthLogs.forEach(l => {
    const day = l.created_at.slice(0, 10);
    if (!daily[day]) daily[day] = { date: day, requests: 0, tokens_in: 0, tokens_out: 0, cost_client: 0 };
    daily[day].requests++; daily[day].tokens_in += l.tokens_in || 0; daily[day].tokens_out += l.tokens_out || 0;
    daily[day].cost_client += calcCost(l.tokens_in || 0, l.tokens_out || 0, CLIENT_CPM);
  });
  res.json({ environment_id: envId, allocation: alloc || null, status, this_month: thisMonth, monthly: monthlyData, daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)), pricing: { anthropic_cpm: ANTHROPIC_CPM, client_cpm: CLIENT_CPM, margin: CLIENT_MARGIN } });
});

router.get('/check/:environmentId', (req, res) => { ensure(); res.json(checkCredits(req.params.environmentId)); });

router.post('/topup', (req, res) => {
  ensure();
  const { environment_id, amount_usd, note } = req.body;
  if (!environment_id || !amount_usd) return res.status(400).json({ error: 'environment_id and amount_usd required' });
  const s = getStore();
  const alloc = (s.ai_credit_allocations || []).find(a => a.environment_id === environment_id && !a.deleted_at);
  if (!alloc) return res.status(404).json({ error: 'No allocation found' });
  const newBudget = (alloc.monthly_budget_usd || 0) + parseFloat(amount_usd);
  const up = update('ai_credit_allocations', a => a.id === alloc.id, { monthly_budget_usd: newBudget, updated_at: new Date().toISOString() });
  if (!s.ai_credit_events) s.ai_credit_events = [];
  s.ai_credit_events.push({ id: uuidv4(), type: 'topup', environment_id, amount_usd: parseFloat(amount_usd), note: note || '', previous_budget: alloc.monthly_budget_usd, new_budget: newBudget, created_at: new Date().toISOString() });
  saveStore();
  res.json({ allocation: up });
});

router.get('/warnings', (req, res) => {
  ensure();
  const allAllocs = (getStore().ai_credit_allocations || []).filter(a => !a.deleted_at);
  const warnings = allAllocs.map(alloc => ({ ...checkCredits(alloc.environment_id), environment_id: alloc.environment_id })).filter(s => s.warn_level).sort((a, b) => a.pct_remaining - b.pct_remaining);
  res.json(warnings);
});

module.exports = Object.assign(router, { checkCredits, calcCost, CLIENT_CPM, ANTHROPIC_CPM, CLIENT_MARGIN });
