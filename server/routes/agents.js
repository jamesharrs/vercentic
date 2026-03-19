// server/routes/agents.js
const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ── Init store collections ────────────────────────────────────────────────────
const store = getStore();
if (!store.agents)       { store.agents = [];       saveStore(); }
if (!store.agent_runs)   { store.agent_runs = [];   saveStore(); }

const TRIGGER_TYPES = {
  record_created:   { label: 'Record Created',   description: 'Fires when a new record is added to an object' },
  record_updated:   { label: 'Record Updated',   description: 'Fires when a record field changes' },
  stage_changed:    { label: 'Stage Changed',    description: 'Fires when a pipeline stage changes' },
  form_submitted:   { label: 'Form Submitted',   description: 'Fires when a form response is submitted' },
  schedule_daily:   { label: 'Daily Schedule',   description: 'Runs at a set time every day' },
  schedule_weekly:  { label: 'Weekly Schedule',  description: 'Runs once a week on a chosen day' },
  manual:           { label: 'Manual Trigger',   description: 'Run on demand from a record or the agents page' },
};

const ACTION_TYPES = {
  ai_analyse:       { label: 'AI Analyse',        description: 'Use AI to evaluate the record and produce a result' },
  ai_draft_email:   { label: 'AI Draft Email',    description: 'Draft a personalised email using AI — holds for approval' },
  ai_summarise:     { label: 'AI Summarise',      description: 'Generate an AI summary and save it to a field' },
  ai_score:         { label: 'AI Score',          description: 'Score the record against criteria and save the result' },
  send_email:       { label: 'Send Email',        description: 'Send an email using a template' },
  update_field:     { label: 'Update Field',      description: 'Set a field value on the record' },
  add_note:         { label: 'Add Note',          description: 'Log a note on the record' },
  add_to_pool:      { label: 'Add to Pool',       description: 'Add the person to a talent pool' },
  create_task:      { label: 'Create Task',       description: 'Create a follow-up task for a user' },
  notify_user:      { label: 'Notify User',       description: 'Send an in-app notification to a user' },
  webhook:          { label: 'Call Webhook',      description: 'POST record data to an external URL' },
  human_review:      { label: 'Request Approval',   description: 'Pause and wait for a human to approve before continuing' },
  ai_interview:      { label: 'AI Interview',          description: 'Send the candidate a link to an AI-powered voice interview' },
  interview_coordinator: { label: 'Interview Coordinator', description: 'Automatically collect availability from the hiring manager and candidate, find mutual slots, and confirm the interview' },
};

// GET all agents
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  let agents = query('agents', a => !a.deleted_at);
  if (environment_id) agents = agents.filter(a => a.environment_id === environment_id);
  const runs = query('agent_runs', () => true);
  const enriched = agents.map(a => {
    const agentRuns = runs.filter(r => r.agent_id === a.id).sort((x,y) => new Date(y.created_at) - new Date(x.created_at));
    return { ...a, last_run: agentRuns[0] || null, run_count: Math.max(agentRuns.length, a.run_count || 0), pending_approvals: agentRuns.filter(r => r.status === 'pending_approval').length };
  });
  res.json(enriched);
});

router.get('/meta', (req, res) => res.json({ trigger_types: TRIGGER_TYPES, action_types: ACTION_TYPES }));

// ── AUDIT: all runs for a specific record (GDPR-friendly) ─────────────────────
router.get('/runs/by-record/:record_id', (req, res) => {
  const runs = query('agent_runs', r => r.record_id === req.params.record_id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(runs);
});

// ── AUDIT: all runs across all agents (with optional filters) ─────────────────
router.get('/runs/all', (req, res) => {
  const { environment_id, record_id, status, from, to } = req.query;
  let runs = query('agent_runs', () => true);
  if (environment_id) runs = runs.filter(r => r.environment_id === environment_id);
  if (record_id)      runs = runs.filter(r => r.record_id === record_id);
  if (status)         runs = runs.filter(r => r.status === status);
  if (from)           runs = runs.filter(r => new Date(r.created_at) >= new Date(from));
  if (to)             runs = runs.filter(r => new Date(r.created_at) <= new Date(to));
  res.json(runs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// ── Dashboard stats ────────────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  const { environment_id } = req.query;
  const s = getStore();

  let agents = query('agents', a => !a.deleted_at);
  if (environment_id) agents = agents.filter(a => a.environment_id === environment_id);

  let runs = query('agent_runs', () => true);
  if (environment_id) runs = runs.filter(r => r.environment_id === environment_id);

  const now = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week   = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Aggregate run stats
  const runsToday     = runs.filter(r => new Date(r.created_at) >= today);
  const runsThisWeek  = runs.filter(r => new Date(r.created_at) >= week);
  const failedRuns    = runs.filter(r => r.status === 'failed');
  const pendingRuns   = runs.filter(r => r.status === 'pending_approval');
  const completedRuns = runs.filter(r => r.status === 'completed');

  // Interview links generated (via agent ai_interview action)
  const interviewTokens = (s.agent_tokens || []).filter(t =>
    !environment_id || t.environment_id === environment_id
  );
  const interviewsCompleted = interviewTokens.filter(t => t.status === 'completed').length;
  const interviewsPending   = interviewTokens.filter(t => t.status === 'pending').length;

  // Runs per day for the last 7 days (for sparkline)
  const dailyCounts = [];
  for (let d = 0; d < 7; d++) {
    const dayStart = new Date(today.getTime() - (6 - d) * 24 * 60 * 60 * 1000);
    const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    dailyCounts.push({
      date: dayStart.toISOString().slice(0, 10),
      runs: runs.filter(r => {
        const t = new Date(r.created_at);
        return t >= dayStart && t < dayEnd;
      }).length,
    });
  }

  // Recent runs with agent name enriched
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const recentRuns = runs
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map(r => ({ ...r, agent_name: agentMap[r.agent_id] || 'Unknown agent' }));

  // Per-agent summary
  const agentSummary = agents.map(a => {
    const ar = runs.filter(r => r.agent_id === a.id);
    return {
      id: a.id, name: a.name, is_active: a.is_active,
      trigger_type: a.trigger_type,
      total_runs: ar.length,
      runs_today: ar.filter(r => new Date(r.created_at) >= today).length,
      failed: ar.filter(r => r.status === 'failed').length,
      pending_approval: ar.filter(r => r.status === 'pending_approval').length,
      last_run: ar.sort((x,y) => new Date(y.created_at) - new Date(x.created_at))[0]?.created_at || null,
    };
  });

  res.json({
    agents:       { total: agents.length, active: agents.filter(a => a.is_active).length, inactive: agents.filter(a => !a.is_active).length },
    runs:         { today: runsToday.length, this_week: runsThisWeek.length, total: runs.length, failed: failedRuns.length, pending_approval: pendingRuns.length, completed: completedRuns.length },
    interviews:   { total: interviewTokens.length, completed: interviewsCompleted, pending: interviewsPending },
    daily:        dailyCounts,
    recent_runs:  recentRuns,
    agent_summary: agentSummary,
  });
});

// ── GDPR: Right to Erasure — purge all AI run data for a record ───────────────
router.delete('/runs/by-record/:record_id', (req, res) => {
  const s = getStore();
  const before = s.agent_runs.length;
  s.agent_runs = s.agent_runs.filter(r => r.record_id !== req.params.record_id);
  const purged = before - s.agent_runs.length;
  saveStore();
  // Also purge any AI-generated notes for this record
  if (s.notes) {
    const notesBefore = s.notes.length;
    s.notes = s.notes.filter(n => !(n.record_id === req.params.record_id && n.ai_generated));
    saveStore();
    res.json({ purged_runs: purged, purged_notes: notesBefore - s.notes.length });
  } else {
    res.json({ purged_runs: purged, purged_notes: 0 });
  }
});

// ── GDPR: Right to Explanation — full AI decision report for a record ─────────
router.get('/runs/explanation/:record_id', (req, res) => {
  const record_id = req.params.record_id;
  const runs = query('agent_runs', r => r.record_id === record_id)
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

  // Build a human-readable explanation report
  const report = {
    record_id,
    generated_at: new Date().toISOString(),
    total_ai_interactions: runs.length,
    summary: `This record was processed by AI ${runs.length} time(s).`,
    interactions: runs.map(r => ({
      date: r.created_at,
      agent: r.agent_name,
      trigger: r.trigger,
      status: r.status,
      ai_output: r.ai_output,
      was_reviewed_by_human: r.pending_actions?.some(a => a.approved !== undefined) || false,
      reviewer_notes: r.pending_actions?.filter(a => a.modifier_note).map(a => a.modifier_note) || [],
      steps: r.steps?.map(s => s.step) || [],
    })),
  };
  res.json(report);
});

router.get('/approvals/pending', (req, res) => {
  const { environment_id } = req.query;
  let runs = query('agent_runs', r => r.status === 'pending_approval');
  if (environment_id) runs = runs.filter(r => r.environment_id === environment_id);
  res.json(runs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// GET /api/agents/templates — must be BEFORE /:id to avoid route conflict
router.get('/templates', (req, res) => {
  try {
    const templates = require('../data/agent_templates');
    res.json(templates);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AGENT ACTIVITY FEED (must be before /:id wildcard) ──────────────────────
router.get('/activity-feed', (req, res) => {
  const { environment_id, limit = 20 } = req.query;
  const s = getStore();
  let runs = (s.agent_runs || []).filter(r => !environment_id || r.environment_id === environment_id);
  runs = runs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
  const agentMap  = Object.fromEntries((s.agents || []).map(a => [a.id, a]));
  const recordMap = Object.fromEntries((s.records || []).map(r => [r.id, r]));
  const objectMap = Object.fromEntries((s.object_definitions || []).map(o => [o.id, o]));
  const items = runs.map(run => {
    const agent  = agentMap[run.agent_id] || {};
    const record = run.record_id ? recordMap[run.record_id] : null;
    const object = record ? objectMap[record.object_id] : null;
    let recordName = null;
    if (record) {
      const d = record.data || {};
      recordName = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.job_title || d.name || d.pool_name || `#${(record.id||'').slice(0,6)}`;
    }
    const actions = agent.actions || [];
    const hasAi   = actions.some(a => ['ai_analyse','ai_summarise','ai_score','ai_draft_email'].includes(a.type));
    let summary = null;
    if      (run.status === 'skipped')          summary = 'Conditions not met — skipped';
    else if (run.status === 'failed')           summary = run.error ? `Error: ${run.error.slice(0,80)}` : 'Run failed';
    else if (run.status === 'pending_approval') summary = 'Waiting for your review';
    else if (hasAi && run.ai_output)            summary = run.ai_output.replace(/\n/g,' ').slice(0,100) + (run.ai_output.length>100?'…':'');
    else if (actions.some(a=>['send_email','ai_draft_email'].includes(a.type))) summary = 'Drafted outreach email';
    else if (actions.some(a=>a.type==='add_note'))    summary = 'Added AI note to record';
    else if (actions.some(a=>a.type==='update_field')) summary = 'Updated record field';
    else if (run.steps?.length > 0)             summary = run.steps[run.steps.length-1]?.step || null;
    else                                        summary = 'Completed successfully';
    return {
      id: run.id, agent_id: run.agent_id,
      agent_name: agent.name || run.agent_name || 'Unknown agent',
      trigger: run.trigger || agent.trigger_type || 'manual',
      status: run.status, is_ai: hasAi || actions.some(a=>a.type?.startsWith('ai_')),
      summary, record_id: run.record_id||null, record_name: recordName,
      object_name: object?.name||null, object_color: object?.color||null,
      ai_output: run.ai_output||null, steps_count: (run.steps||[]).length,
      has_pending: (run.pending_actions||[]).some(a=>a.approved===undefined),
      created_at: run.created_at,
    };
  });
  const allRuns = (s.agent_runs||[]).filter(r=>!environment_id||r.environment_id===environment_id);
  const today = new Date(); today.setHours(0,0,0,0);
  res.json({ items, stats: {
    runs_today:       allRuns.filter(r=>new Date(r.created_at)>=today).length,
    ai_actions_today: allRuns.filter(r=>new Date(r.created_at)>=today&&r.ai_output).length,
    pending_reviews:  allRuns.filter(r=>r.status==='pending_approval').length,
    active_agents:    (s.agents||[]).filter(a=>a.is_active&&!a.deleted_at&&(!environment_id||a.environment_id===environment_id)).length,
  }});
});

router.get('/:id', (req, res) => {
  const agent = query('agents', a => a.id === req.params.id && !a.deleted_at)[0];
  if (!agent) return res.status(404).json({ error: 'Not found' });
  res.json(agent);
});

router.get('/:id/runs', (req, res) => {
  const runs = query('agent_runs', r => r.agent_id === req.params.id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  res.json(runs);
});

router.post('/', (req, res) => {
  const { name, description, environment_id, trigger_type, trigger_config, conditions, actions, is_active, schedule_time, target_object_id } = req.body;
  if (!name || !environment_id || !trigger_type) return res.status(400).json({ error: 'name, environment_id, trigger_type required' });
  const agent = insert('agents', {
    id: uuidv4(), name, description: description||'', environment_id, trigger_type,
    trigger_config: trigger_config || {}, conditions: conditions || [], actions: actions || [],
    target_object_id: target_object_id || null, schedule_time: schedule_time || '09:00',
    is_active: is_active !== false ? 1 : 0, run_count: 0,
    sharing: req.body.sharing || { visibility: 'private', user_ids: [], group_ids: [] },
    created_by: req.body.created_by || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  res.status(201).json(agent);
});

router.patch('/:id', (req, res) => {
  const s = getStore();
  const idx = s.agents.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.agents[idx] = { ...s.agents[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore();
  res.json(s.agents[idx]);
});

router.delete('/:id', (req, res) => {
  const s = getStore();
  const idx = s.agents.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.agents[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ success: true });
});

router.post('/:id/run', async (req, res) => {
  const agent = query('agents', a => a.id === req.params.id && !a.deleted_at)[0];
  if (!agent) return res.status(404).json({ error: 'Not found' });
  const { record_id, environment_id } = req.body;
  const run = insert('agent_runs', {
    id: uuidv4(), agent_id: agent.id, agent_name: agent.name, trigger: 'manual',
    record_id: record_id || null, environment_id: environment_id || agent.environment_id,
    status: 'running', steps: [], ai_output: null, pending_actions: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  executeAgent(agent, run, record_id).catch(err => {
    console.error('Agent run error:', err);
    const s = getStore();
    const idx = s.agent_runs.findIndex(r => r.id === run.id);
    if (idx !== -1) { s.agent_runs[idx].status = 'failed'; s.agent_runs[idx].error = err.message; s.agent_runs[idx].updated_at = new Date().toISOString(); saveStore(); }
  });
  res.json({ run_id: run.id, status: 'running' });
});

router.post('/runs/:run_id/approve', async (req, res) => {
  const { action_index, approved, modifier_note } = req.body;
  const s = getStore();
  const run = s.agent_runs.find(r => r.id === req.params.run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const pendingAction = run.pending_actions[action_index];
  if (!pendingAction) return res.status(400).json({ error: 'Action not found' });
  pendingAction.approved = approved;
  pendingAction.modifier_note = modifier_note || '';
  pendingAction.reviewed_at = new Date().toISOString();
  if (approved) {
    try {
      await executeAction(pendingAction.action, run.record_id, run.environment_id, run.ai_output, modifier_note);
      pendingAction.executed = true;
      run.steps.push({ step: `Approved action executed: ${pendingAction.action.type}`, timestamp: new Date().toISOString() });
    } catch(err) { pendingAction.error = err.message; }
  } else {
    run.steps.push({ step: `Action rejected: ${pendingAction.action.type}`, timestamp: new Date().toISOString() });
  }
  if (run.pending_actions.every(a => a.approved !== undefined)) run.status = 'completed';
  run.updated_at = new Date().toISOString();
  saveStore();
  res.json(run);
});

async function executeAgent(agent, run, record_id) {
  const s = getStore();
  const runIdx = s.agent_runs.findIndex(r => r.id === run.id);
  const addStep = (step) => { s.agent_runs[runIdx].steps.push({ step, timestamp: new Date().toISOString() }); saveStore(); };
  try {
    addStep('Agent started');
    let record = null, fields = [];
    if (record_id) {
      record = query('records', r => r.id === record_id)[0] || null;
      if (record) { fields = query('fields', f => f.object_id === record.object_id); addStep(`Loaded record: ${record_id}`); }
    }
    if (agent.conditions && agent.conditions.length > 0) {
      if (!evaluateConditions(agent.conditions, record)) {
        s.agent_runs[runIdx].status = 'skipped'; s.agent_runs[runIdx].skip_reason = 'Conditions not met';
        s.agent_runs[runIdx].updated_at = new Date().toISOString(); saveStore();
        addStep('Conditions not met — agent skipped'); return;
      }
      addStep('All conditions passed');
    }
    let recordContext = '';
    if (record) {
      if (fields.length > 0) {
        const lines = fields.map(f => {
          const v = record.data?.[f.api_key];
          if (v == null || v === '') return null;
          return `${f.name}: ${Array.isArray(v) ? v.join(', ') : v}`;
        }).filter(Boolean);
        recordContext = lines.join('\n');
      }
      // Fallback: raw data keys if field lookup returned nothing
      if (!recordContext && record.data) {
        recordContext = Object.entries(record.data)
          .filter(([,v]) => v != null && v !== '')
          .map(([k,v]) => `${k.replace(/_/g,' ')}: ${Array.isArray(v)?v.join(', '):v}`)
          .join('\n');
      }
      if (!recordContext) recordContext = `Record ID: ${record.id} (no field data available)`;
    }
    let aiOutput = null;
    const pendingActions = [];
    for (let i = 0; i < agent.actions.length; i++) {
      const action = agent.actions[i];
      addStep(`Running action ${i+1}: ${action.type}`);
      if (['ai_analyse','ai_draft_email','ai_summarise','ai_score'].includes(action.type)) {
        aiOutput = await runAiAction(action, recordContext, record, fields, aiOutput);
        s.agent_runs[runIdx].ai_output = aiOutput; saveStore();
        addStep(`AI action completed`);
      } else if (action.type === 'human_review') {
        pendingActions.push({ action, action_index: pendingActions.length, ai_output: aiOutput, record_preview: recordContext.slice(0,300), approved: undefined, created_at: new Date().toISOString() });
        addStep('Paused — awaiting human approval');
      } else {
        const lastPending = pendingActions[pendingActions.length - 1];
        if (lastPending && lastPending.approved === undefined) { pendingActions.push({ action, action_index: pendingActions.length, queued: true }); }
        else { await executeAction(action, record_id, agent.environment_id, aiOutput); addStep(`Action executed: ${action.type}`); }
      }
    }
    const hasPending = pendingActions.some(a => a.approved === undefined);
    s.agent_runs[runIdx].status = hasPending ? 'pending_approval' : 'completed';
    s.agent_runs[runIdx].pending_actions = pendingActions;
    s.agent_runs[runIdx].updated_at = new Date().toISOString();
    const agentIdx = s.agents.findIndex(a => a.id === agent.id);
    if (agentIdx !== -1) { s.agents[agentIdx].run_count = (s.agents[agentIdx].run_count || 0) + 1; s.agents[agentIdx].last_run_at = new Date().toISOString(); }
    saveStore();
    addStep(hasPending ? 'Awaiting approval' : 'Agent completed successfully');
    // Sync run stats to Postgres
    try {
      const pg = require('../db/postgres');
      const { getCurrentTenant } = require('../db/init');
      const tenant = getCurrentTenant() || 'master';
      if (pg.isEnabled()) {
        await pg.saveCollection(tenant, 'agent_runs', s.agent_runs);
        await pg.saveCollection(tenant, 'agents', s.agents);
      }
    } catch(e) { console.error('[agents run] pg sync error:', e.message); }
  } catch(err) {
    s.agent_runs[runIdx].status = 'failed'; s.agent_runs[runIdx].error = err.message;
    s.agent_runs[runIdx].updated_at = new Date().toISOString(); saveStore(); throw err;
  }
}

function evaluateConditions(conditions, record) {
  if (!record) return true;
  return conditions.every(c => {
    const val = record.data?.[c.field] ?? record[c.field];
    switch(c.operator) {
      case 'equals': return String(val||'').toLowerCase() === String(c.value||'').toLowerCase();
      case 'not_equals': return String(val||'').toLowerCase() !== String(c.value||'').toLowerCase();
      case 'contains': return String(val||'').toLowerCase().includes(String(c.value||'').toLowerCase());
      case 'greater_than': return Number(val) > Number(c.value);
      case 'less_than': return Number(val) < Number(c.value);
      case 'is_empty': return !val || val === '';
      case 'is_not_empty': return !!val && val !== '';
      case 'includes': return Array.isArray(val) && val.includes(c.value);
      default: return true;
    }
  });
}

async function runAiAction(action, recordContext, record, fields, previousAiOutput) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return '[AI unavailable — no API key]';
  let prompt = '';
  switch(action.type) {
    case 'ai_analyse': prompt = action.prompt || `Analyse this record and provide a concise assessment:\n\n${recordContext}`; break;
    case 'ai_draft_email': prompt = `Draft a professional, personalised email. Subject on first line prefixed "Subject: ".\nRecord: ${recordContext}\nPurpose: ${action.email_purpose||'follow up'}\nTone: ${action.tone||'professional'}`; break;
    case 'ai_summarise': prompt = `Write a concise 2-3 sentence summary of this record for a recruiter:\n\n${recordContext}`; break;
    case 'ai_score': prompt = `Score this candidate 0-100. Return ONLY JSON: {"score":85,"reasoning":"...","strengths":["..."],"gaps":["..."]}\nCriteria: ${action.criteria||'overall suitability'}\nData:\n${recordContext}`; break;
    default: prompt = action.prompt || `Analyse this record:\n${recordContext}`;
  }
  if (previousAiOutput) prompt += `\n\nPrevious AI analysis:\n${previousAiOutput}`;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || '[No response]';
}

async function executeAction(action, record_id, environment_id, aiOutput, modifierNote) {
  const s = getStore();
  switch(action.type) {
    case 'add_note': {
      if (!record_id) break;
      const content = action.note_template ? action.note_template.replace('{{ai_output}}', aiOutput||'') : (aiOutput||'Agent note');
      insert('notes', { id: uuidv4(), record_id, content: modifierNote ? `${content}\n\n_Reviewer note: ${modifierNote}_` : content, author: 'Agent', created_by: 'Agent', ai_generated: true, created_at: new Date().toISOString() });
      break;
    }
    case 'update_field': {
      if (!record_id || !action.field_key) break;
      const idx = s.records.findIndex(r => r.id === record_id);
      if (idx !== -1) { s.records[idx].data = { ...s.records[idx].data, [action.field_key]: action.field_value || aiOutput || '' }; s.records[idx].updated_at = new Date().toISOString(); saveStore(); }
      break;
    }
    case 'send_email': case 'ai_draft_email': {
      if (record_id) {
        const lines = (aiOutput||'').split('\n');
        const subjectLine = lines.find(l => l.startsWith('Subject:'));
        insert('communications', { id: uuidv4(), record_id, environment_id, type: 'email', direction: 'outbound',
          subject: subjectLine ? subjectLine.replace('Subject:','').trim() : (action.email_subject||'Agent email'),
          body: lines.filter(l => !l.startsWith('Subject:')).join('\n').trim() || action.email_body || '',
          status: action.type === 'ai_draft_email' ? 'draft' : 'sent', sent_by: 'Agent', created_at: new Date().toISOString() });
      }
      break;
    }
    case 'webhook': {
      if (!action.webhook_url) break;
      await fetch(action.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record_id, environment_id, ai_output: aiOutput, timestamp: new Date().toISOString() }) }).catch(() => {});
      break;
    }
    case 'ai_interview': {
      // Auto-generate an interview link — questions come from the linked job OR manual selection
      const s2 = getStore();
      if (!s2.agent_tokens) s2.agent_tokens = [];
      const rec2 = (s2.records || []).find(r => r.id === record_id);
      if (!rec2) break;

      const d2 = rec2.data || {};
      const questionSource = action.question_source || 'job'; // 'job' | 'manual'

      let qIds = [];
      let sourceLabel = '';

      if (questionSource === 'manual') {
        // Use the question IDs selected by the admin when building the agent
        qIds = action.question_ids || [];
        sourceLabel = 'manually selected';
        if (qIds.length === 0) {
          run.steps.push({ step: `⚠ AI Interview skipped — no questions selected. Edit this agent and choose questions manually.`, timestamp: new Date().toISOString() });
          break;
        }
      } else {
        // 'job' mode: resolve from the candidate's linked job at runtime
        const link = (s2.people_links || []).find(l => l.person_id === record_id);
        const linkedJobId = link?.record_id || null;

        if (!linkedJobId) {
          run.steps.push({ step: `⚠ AI Interview skipped — candidate is not linked to any job. Link the candidate to a job first.`, timestamp: new Date().toISOString() });
          break;
        }

        const jobRec = (s2.records || []).find(r => r.id === linkedJobId);
        const jobName = jobRec?.data?.job_title || jobRec?.data?.title || 'linked job';
        const jobAssignments = (s2.job_question_assignments || []).filter(a => a.job_id === linkedJobId);
        qIds = jobAssignments.map(a => a.question_id);

        if (qIds.length === 0) {
          run.steps.push({ step: `⚠ AI Interview skipped — "${jobName}" has no questions assigned. Add questions via Settings → Question Bank.`, timestamp: new Date().toISOString() });
          break;
        }
        sourceLabel = `linked job "${jobName}"`;

        // Tag the candidate so we can see which job drove the interview
        rec2.data._interview_job_id = linkedJobId;
      }

      // Resolve full question objects
      const allQuestions = s2.question_bank_v2 || [];
      const scorecardQuestions = qIds
        .map(id => allQuestions.find(q => q.id === id))
        .filter(Boolean)
        .map(q => ({ id: q.id, text: q.text, type: q.type, competency: q.competency, weight: q.weight, follow_ups: q.follow_ups || [], good_answer_guidance: q.good_answer_guidance || '', red_flags: q.red_flags || '' }));

      if (scorecardQuestions.length === 0) {
        run.steps.push({ step: `⚠ AI Interview skipped — the selected questions could not be resolved in the question bank.`, timestamp: new Date().toISOString() });
        break;
      }

      // Generate the interview token
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      s2.agent_tokens.push({
        id: require('uuid').v4(), token, agent_id,
        persona_name: action.persona_name || 'Alex',
        persona_description: action.persona_description || '',
        avatar_color: action.avatar_color || '#6366f1',
        voice: action.voice || 'en-US',
        candidate_id: record_id,
        candidate_name: [d2.first_name, d2.last_name].filter(Boolean).join(' ') || 'Candidate',
        candidate_email: d2.email || null,
        environment_id, scorecard_questions: scorecardQuestions,
        question_source: questionSource,
        status: 'pending',
        created_at: new Date().toISOString(), expires_at: expiresAt,
        started_at: null, completed_at: null,
      });

      // Store resolved question IDs on the candidate record
      rec2.data._interview_question_ids = qIds;
      rec2.data._interview_question_source = questionSource;
      rec2.updated_at = new Date().toISOString();

      // Add a note to the candidate
      if (!s2.record_notes) s2.record_notes = [];
      s2.record_notes.push({
        id: require('uuid').v4(), record_id,
        content: `AI Interview link generated — ${scorecardQuestions.length} question${scorecardQuestions.length !== 1 ? 's' : ''} from ${sourceLabel}. Link expires in 72 hours: /interview/${token}`,
        created_by: 'agent', created_at: new Date().toISOString(),
      });

      saveStore();
      run.steps.push({
        step: `✓ AI Interview link generated — ${scorecardQuestions.length} questions from ${sourceLabel}. Link: /interview/${token}`,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case 'interview_coordinator': {
      try {
        const { startCoordination } = require('./interview_coordinator');
        const rec = (getStore().records || []).find(r => r.id === record_id);
        const result = await startCoordination({
          candidate_id: record_id,
          environment_id,
          config: action.config || {},
          agent_id: null,
        });
        output = result.logs?.join(' | ') || '✓ Interview coordination started';
      } catch(e) { output = `⚠ Coordinator error: ${e.message}`; }
      break;
    }
  }
}


// ─── Interview Agent: generate token ─────────────────────────────────────────
// POST /api/agents/:id/generate-token
router.post('/:id/generate-token', (req, res) => {
  const agent = query('agents', a => a.id === req.params.id && !a.deleted_at)[0];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const { candidate_id, job_id, environment_id, expires_hours = 72 } = req.body;
  const s = getStore();
  if (!s.agent_tokens) s.agent_tokens = [];

  // Build candidate context
  let candidateName = 'Candidate';
  let candidateEmail = null;
  if (candidate_id) {
    const rec = (s.records || []).find(r => r.id === candidate_id);
    if (rec?.data) {
      const d = rec.data;
      candidateName = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Candidate';
      candidateEmail = d.email || null;
    }
  }

  // Build job context
  let jobTitle = 'the role', jobDept = '';
  if (job_id) {
    const job = (s.records || []).find(r => r.id === job_id);
    if (job?.data) { jobTitle = job.data.job_title || job.data.title || 'the role'; jobDept = job.data.department || ''; }
  }

  // Resolve question bank questions for this agent
  const questionIds = agent.question_ids || [];
  const scorecardQuestions = questionIds
    .map(id => (s.question_bank_v2 || []).find(q => q.id === id))
    .filter(Boolean)
    .map(q => ({ id: q.id, text: q.text, type: q.type, competency: q.competency, weight: q.weight, follow_ups: q.follow_ups || [], good_answer_guidance: q.good_answer_guidance || '', red_flags: q.red_flags || '' }));

  const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();

  const tokenRecord = {
    id: uuidv4(), token, agent_id: agent.id,
    candidate_id: candidate_id || null, candidate_name: candidateName, candidate_email: candidateEmail,
    job_id: job_id || null, job_title: jobTitle, job_department: jobDept,
    environment_id: environment_id || agent.environment_id,
    scorecard_questions: scorecardQuestions,
    status: 'pending',
    created_at: new Date().toISOString(), expires_at: expiresAt,
    started_at: null, completed_at: null,
  };

  s.agent_tokens.push(tokenRecord);
  saveStore();

  res.json({
    token, interview_url: `/interview/${token}`,
    expires_at: expiresAt, candidate_name: candidateName, candidate_email: candidateEmail,
  });
});


module.exports = router;

