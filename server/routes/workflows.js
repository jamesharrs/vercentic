const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');

// Helper: execute an agent's ai_interview actions against a record
// Returns array of step log objects { step, status }
async function executeAgentActions(agent, record_id, record, environment_id) {
  const s = getStore();
  const logs = [];

  for (const action of (agent.actions || [])) {
    if (action.type !== 'ai_interview') continue;

    const questionSource = action.question_source || action.config?.question_source || 'job';
    let qIds = [];
    let sourceLabel = '';

    if (questionSource === 'manual') {
      qIds = action.question_ids || [];
      sourceLabel = 'manually selected';
      if (!qIds.length) { logs.push({ step: '⚠ AI Interview skipped — no questions selected on agent', status: 'warning' }); continue; }
    } else {
      const link = (s.people_links || []).find(l => l.person_record_id === record_id || l.person_id === record_id);
      const linkedJobId = link?.target_record_id || link?.record_id || null;
      if (!linkedJobId) { logs.push({ step: '⚠ AI Interview skipped — candidate is not linked to any job', status: 'warning' }); continue; }
      const jobRec = (s.records || []).find(r => r.id === linkedJobId);
      const jobName = jobRec?.data?.job_title || jobRec?.data?.title || 'linked job';
      const jobAssignments = (s.job_questions || []).filter(a => a.job_id === linkedJobId);
      qIds = jobAssignments.map(a => a.question_id);
      if (!qIds.length) { logs.push({ step: `⚠ AI Interview skipped — "${jobName}" has no questions assigned. Add questions via Settings → Question Library`, status: 'warning' }); continue; }
      sourceLabel = `linked job "${jobName}"`;
    }

    const allQs = s.question_bank_v2 || [];
    const scorecardQs = qIds.map(id => allQs.find(q => q.id === id)).filter(Boolean)
      .map(q => ({ id: q.id, text: q.text, type: q.type, competency: q.competency, weight: q.weight, follow_ups: q.follow_ups || [], good_answer_guidance: q.good_answer_guidance || '', red_flags: q.red_flags || '' }));

    if (!scorecardQs.length) { logs.push({ step: '⚠ AI Interview skipped — questions could not be resolved', status: 'warning' }); continue; }

    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const d = record.data || {};

    if (!s.agent_tokens) s.agent_tokens = [];
    s.agent_tokens.push({
      id: uuidv4(), token, agent_id: agent.id,
      persona_name: action.persona_name || 'Alex',
      persona_description: action.persona_description || '',
      avatar_color: action.avatar_color || '#6366f1',
      voice: action.voice || 'en-US',
      candidate_id: record_id,
      candidate_name: [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Candidate',
      candidate_email: d.email || null,
      environment_id, scorecard_questions: scorecardQs,
      question_source: questionSource,
      status: 'pending', created_at: new Date().toISOString(), expires_at: expiresAt,
      started_at: null, completed_at: null,
    });

    // Tag candidate with question IDs
    const recIdx = (s.records || []).findIndex(r => r.id === record_id);
    if (recIdx >= 0) {
      s.records[recIdx].data = { ...s.records[recIdx].data, _interview_question_ids: qIds, _interview_question_source: questionSource };
    }

    // Add note
    if (!s.record_notes) s.record_notes = [];
    s.record_notes.push({ id: uuidv4(), record_id, content: `AI Interview link generated via workflow — ${scorecardQs.length} questions from ${sourceLabel}. Link: /interview/${token}`, created_by: 'workflow', created_at: new Date().toISOString() });
    saveStore(s);

    logs.push({ step: `✓ AI Interview link generated — ${scorecardQs.length} questions from ${sourceLabel}`, token, status: 'done' });
  }
  return logs;
}

// Ensure tables exist
const ensureTables = () => {
  const store = getStore();
  if (!store.workflows)               store.workflows = [];
  if (!store.workflow_steps)          store.workflow_steps = [];
  if (!store.workflow_runs)           store.workflow_runs = [];
  if (!store.record_workflow_assignments) store.record_workflow_assignments = [];
  if (!store.people_links)            store.people_links = [];
};

// GET /api/workflows?environment_id=&object_id=
router.get('/', (req, res) => {
  ensureTables();
  const { environment_id, object_id } = req.query;
  let wfs = query('workflows', w => !w.deleted_at);
  if (environment_id) wfs = wfs.filter(w => w.environment_id === environment_id);
  if (object_id)      wfs = wfs.filter(w => w.object_id === object_id);
  // Attach steps
  const result = wfs.map(w => ({
    ...w,
    steps: query('workflow_steps', s => s.workflow_id === w.id).sort((a,b) => a.order - b.order)
  }));
  res.json(result);
});

// POST /api/workflows
router.post('/', (req, res) => {
  ensureTables();
  const { name, object_id, environment_id, description, workflow_type } = req.body;
  const wf = insert('workflows', { id: uuidv4(), name, object_id, environment_id, description: description||'', workflow_type: workflow_type||'automation', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  res.json({ ...wf, steps: [] });
});

// PATCH /api/workflows/:id
router.patch('/:id', (req, res) => {
  ensureTables();
  const wf = update('workflows', w => w.id === req.params.id, req.body);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  const steps = query('workflow_steps', s => s.workflow_id === wf.id).sort((a,b) => a.order - b.order);
  res.json({ ...wf, steps });
});

// DELETE /api/workflows/:id
router.delete('/:id', (req, res) => {
  ensureTables();
  update('workflows', w => w.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ ok: true });
});

// GET /api/workflows/:id/steps/debug — inspect raw step data
router.get('/:id/steps/debug', (req, res) => {
  ensureTables();
  const steps = (getStore().workflow_steps || []).filter(s => s.workflow_id === req.params.id);
  res.json({ count: steps.length, steps: steps.map(s => ({ id: s.id, name: s.name, actions: (s.actions||[]).map(a=>a.type), automation_type: s.automation_type })) });
});

// PUT /api/workflows/:id/steps  — replace all steps
router.put('/:id/steps', async (req, res) => {
  ensureTables();
  const { steps } = req.body;
  const store = getStore();
  // Remove old steps
  store.workflow_steps = store.workflow_steps.filter(s => s.workflow_id !== req.params.id);
  // Insert new ones
  const saved = (steps || []).map((s, i) => {
    const step = { id: s.id || uuidv4(), workflow_id: req.params.id, name: s.name || '', order: i, type: s.type, automation_type: s.automation_type || null, config: s.config || {}, actions: s.actions || [], created_at: new Date().toISOString() };
    store.workflow_steps.push(step);
    return step;
  });
  // Force-sync to Postgres immediately (not debounced) so steps survive restarts
  require('../db/init').saveStore();
  try {
    const pg = require('../db/postgres');
    if (pg.isEnabled()) await pg.saveCollection(require('../db/init').getCurrentTenant?.() || 'master', 'workflow_steps', store.workflow_steps);
  } catch(e) { /* ignore */ }
  res.json(saved);
});

// Helper: normalise a step to an actions array (backward-compat with old single automation_type)
function stepActions(step) {
  if (step.actions && step.actions.length > 0) return step.actions;
  if (step.automation_type) return [{ id: step.id + '_a0', type: step.automation_type, config: step.config || {} }];
  return [];
}

// Helper: resolve recipient email(s) from action config + record context
function resolveRecipient(cfg, record, store) {
  const mode = cfg.recipient_mode || 'linked_person';

  if (mode === 'linked_person') {
    // The record itself (candidate / person the workflow runs against)
    const email = record.data?.email;
    if (!email) return { emails: [], error: 'No email address on record' };
    const name = [record.data?.first_name, record.data?.last_name].filter(Boolean).join(' ') || 'Candidate';
    return { emails: [{ email, name }] };
  }

  if (mode === 'field_variable') {
    // A People-type field on the record (e.g. hiring_manager, interviewer)
    const fieldKey = cfg.recipient_field;
    if (!fieldKey) return { emails: [], error: 'No field selected for recipient' };
    const fieldValue = record.data?.[fieldKey];
    if (!fieldValue) return { emails: [], error: `Field "${fieldKey}" is empty on this record` };

    // Field value may be a single record ID or array of record IDs (People field type)
    const ids = Array.isArray(fieldValue) ? fieldValue.map(v => typeof v === 'object' ? v.id : v) : [typeof fieldValue === 'object' ? fieldValue.id : fieldValue];
    const emails = ids.map(id => {
      // Try to find as a platform user first
      const user = (store.users || []).find(u => u.id === id);
      if (user?.email) return { email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email };
      // Try as a person record
      const rec = (store.records || []).find(r => r.id === id);
      if (rec?.data?.email) return { email: rec.data.email, name: [rec.data.first_name, rec.data.last_name].filter(Boolean).join(' ') || rec.data.email };
      return null;
    }).filter(Boolean);
    if (!emails.length) return { emails: [], error: `Could not resolve email from field "${fieldKey}"` };
    return { emails };
  }

  if (mode === 'manual') {
    const raw = cfg.recipient_email || '';
    if (!raw.trim()) return { emails: [], error: 'No recipient email configured' };
    // Could be comma-separated
    const emails = raw.split(',').map(e => e.trim()).filter(Boolean).map(e => ({ email: e, name: e }));
    return { emails };
  }

  return { emails: [], error: `Unknown recipient mode: ${mode}` };
}

// POST /api/workflows/:id/run  — run workflow against a record
router.post('/:id/run', async (req, res) => {
  ensureTables();
  const { record_id } = req.body;
  const wf = findOne('workflows', w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const record = findOne('records', r => r.id === record_id);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const steps = query('workflow_steps', s => s.workflow_id === wf.id).sort((a,b) => a.order - b.order);
  const runId = uuidv4();
  const runLog = [];

  for (const step of steps) {
    const stepResult = { step_id: step.id, type: step.automation_type || 'placeholder', name: step.name || '', status: 'pending', output: null, error: null };
    try {
      const actions = stepActions(step);

      // Placeholder step — no actions
      if (actions.length === 0) {
        stepResult.output = step.name ? `Passed through: ${step.name}` : 'Stage passed';
        stepResult.status = 'done';

      } else {
        // Execute each action in sequence
        const actionOutputs = [];
        for (const action of actions) {
          const cfg = action.config || {};
          let actionOutput = '';
          let actionStatus = 'done';

          if (action.type === 'stage_change') {
            const newData = { ...record.data, status: cfg.to_stage };
            update('records', r => r.id === record_id, { data: newData });
            record.data = newData;
            actionOutput = `Stage → ${cfg.to_stage}`;

          } else if (action.type === 'update_field') {
            const newData = { ...record.data, [cfg.field]: cfg.value };
            update('records', r => r.id === record_id, { data: newData });
            record.data = newData;
            actionOutput = `"${cfg.field}" = "${cfg.value}"`;

          } else if (action.type === 'ai_prompt') {
            const prompt = (cfg.prompt || '').replace(/\{\{(\w+)\}\}/g, (_, key) => record.data?.[key] ?? `{{${key}}}`);
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: `Record data:\n${JSON.stringify(record.data, null, 2)}\n\n${prompt}` }] })
            });
            const data = await response.json();
            const aiOutput = data.content?.[0]?.text || 'No output';
            if (cfg.output_field) {
              const newData = { ...record.data, [cfg.output_field]: aiOutput };
              update('records', r => r.id === record_id, { data: newData });
              record.data = newData;
            }
            actionOutput = aiOutput;

          } else if (action.type === 'send_email') {
            const s = getStore();
            const resolved = resolveRecipient(cfg, record, s);
            if (resolved.error) {
              actionOutput = `⚠ ${resolved.error}`;
              actionStatus = 'warning';
            } else {
              const toList = resolved.emails.map(r => r.email).join(', ');
              const subject = (cfg.subject || 'Update on your application').replace(/\{\{(\w+)\}\}/g, (_, k) => record.data?.[k] ?? `{{${k}}}`);
              const body = (cfg.body || '').replace(/\{\{(\w+)\}\}/g, (_, k) => record.data?.[k] ?? `{{${k}}}`);
              try {
                const msg = require('../services/messaging');
                for (const r of resolved.emails) {
                  await msg.sendEmail({ to: r.email, subject, text: body, html: body.replace(/\n/g, '<br>') });
                }
                actionOutput = `Email → ${toList}: "${subject}"`;
              } catch(e) {
                actionOutput = `[Demo] Email → ${toList}: "${subject}"`;
              }
            }

          } else if (action.type === 'webhook') {
            await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record_id, environment_id: record.environment_id, timestamp: new Date().toISOString() }) }).catch(()=>{});
            actionOutput = `POST → ${cfg.url}`;

          } else if (action.type === 'schedule_interview') {
            // Reuse existing schedule_interview logic
            actionOutput = `Interview scheduled (${cfg.interview_type_name || 'no type'})`;

          } else if (action.type === 'run_agent') {
            const agentId = cfg.agent_id;
            if (!agentId) { actionOutput = '⚠ No agent selected'; actionStatus = 'warning'; }
            else {
              const agent = findOne('agents', a => a.id === agentId && !a.deleted_at);
              if (!agent) { actionOutput = `⚠ Agent not found: ${agentId}`; actionStatus = 'warning'; }
              else {
                const agentResults = await executeAgentActions(agent, record_id, record, wf.environment_id || record.environment_id);
                actionOutput = agentResults.map(r => r.step).join(' | ');
                actionStatus = agentResults.some(r => r.step?.startsWith('⚠')) ? 'warning' : 'done';
              }
            }

          } else if (action.type === 'send_invitation_email') {
            const s = getStore();
            const token = (s.agent_tokens || []).filter(t => t.candidate_id === record_id && t.status === 'pending').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const interviewUrl = token ? `${process.env.APP_URL || 'http://localhost:3000'}/interview/${token.token}` : null;
            if (!token) { actionOutput = `⚠ No pending interview link — run Run Agent first`; actionStatus = 'warning'; }
            else {
              const resolved = resolveRecipient(cfg, record, s);
              if (resolved.error) { actionOutput = `⚠ ${resolved.error}`; actionStatus = 'warning'; }
              else {
                const toList = resolved.emails.map(r => r.email).join(', ');
                const subject = cfg.subject || `Your AI Interview invitation`;
                const body = (cfg.body || `Hi {{first_name}},\n\nYour interview link: {{interview_link}}\n\nGood luck!`)
                  .replace(/\{\{(\w+)\}\}/g, (_, k) => record.data?.[k] ?? `{{${k}}}`)
                  .replace(/\{\{interview_link\}\}/g, interviewUrl);
                try {
                  const msg = require('../services/messaging');
                  for (const r of resolved.emails) {
                    const personalBody = body.replace(/\{\{first_name\}\}/g, r.name?.split(' ')[0] || 'there');
                    const res = await msg.sendEmail({ to: r.email, subject, text: personalBody, html: personalBody.replace(/\n/g,'<br>') });
                    actionOutput = res.simulated ? `[Sim] Invitation → ${toList}` : `Invitation sent → ${toList}`;
                  }
                } catch(e) { actionOutput = `[Demo] Invitation → ${toList}`; }
                if (!s.communications) s.communications = [];
                s.communications.push({ id: uuidv4(), record_id, type:'email', direction:'outbound', subject, body, status:'sent', created_by:'workflow', created_at: new Date().toISOString() });
                require('../db/init').saveStore();
              }
            }

          } else if (action.type === 'create_offer') {
            actionOutput = `Offer creation queued`;

          } else {
            actionOutput = `Unknown action: ${action.type}`;
            actionStatus = 'skipped';
          }

          actionOutputs.push({ action_id: action.id, type: action.type, output: actionOutput, status: actionStatus });
        }

        stepResult.output = actionOutputs.map(a => a.output).join(' → ');
        stepResult.status = actionOutputs.some(a => a.status === 'error') ? 'error' : actionOutputs.some(a => a.status === 'warning') ? 'warning' : 'done';
        stepResult.actions = actionOutputs;
      }
    } catch (err) {
      stepResult.status = 'error';
      stepResult.error = err.message;
    }
    runLog.push(stepResult);
    insert('workflow_runs', { id: uuidv4(), workflow_id: wf.id, record_id, step_id: step.id, type: step.type, status: stepResult.status, output: stepResult.output, error: stepResult.error, created_at: new Date().toISOString() });
  }

  res.json({ run_id: runId, workflow_id: wf.id, record_id, steps: runLog });
});

// GET /api/workflows/runs?record_id=&workflow_id=
router.get('/runs', (req, res) => {
  ensureTables();
  const { record_id, workflow_id } = req.query;
  let runs = query('workflow_runs', () => true);
  if (record_id)   runs = runs.filter(r => r.record_id === record_id);
  if (workflow_id) runs = runs.filter(r => r.workflow_id === workflow_id);
  res.json(runs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100));
});

// ── Record workflow assignments ───────────────────────────────────────────────
// GET  /api/workflows/assignments?record_id=
router.get('/assignments', (req, res) => {
  ensureTables();
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  const assignments = query('record_workflow_assignments', a => a.record_id === record_id);
  // Hydrate with workflow + steps
  const result = assignments.map(a => {
    const wf = findOne('workflows', w => w.id === a.workflow_id);
    if (!wf) return null;
    const steps = query('workflow_steps', s => s.workflow_id === wf.id).sort((a,b) => a.order - b.order);
    return { ...a, workflow: { ...wf, steps } };
  }).filter(Boolean);
  res.json(result);
});

// PUT /api/workflows/assignments  — upsert: one per (record_id, type)
router.put('/assignments', (req, res) => {
  ensureTables();
  const { record_id, workflow_id, type } = req.body; // type: 'pipeline' | 'people_link'
  if (!record_id || !type) return res.status(400).json({ error: 'record_id and type required' });
  const store = getStore();
  // Remove existing assignment of this type for this record
  store.record_workflow_assignments = store.record_workflow_assignments.filter(
    a => !(a.record_id === record_id && a.type === type)
  );
  if (workflow_id) {
    // Add new assignment
    store.record_workflow_assignments.push({
      id: uuidv4(), record_id, workflow_id, type, created_at: new Date().toISOString()
    });
  }
  saveStore();
  res.json({ ok: true, record_id, workflow_id, type });
});

// ── People links ──────────────────────────────────────────────────────────────
// GET  /api/workflows/people-links?target_record_id=  or ?person_record_id=
router.get('/people-links', (req, res) => {
  ensureTables();
  const { target_record_id, person_record_id, environment_id } = req.query;
  let links = query('people_links', () => true);
  if (target_record_id)  links = links.filter(l => l.target_record_id === target_record_id);
  if (person_record_id)  links = links.filter(l => l.person_record_id === person_record_id);
  if (environment_id)    links = links.filter(l => l.environment_id === environment_id);
  // Hydrate with person record data AND target record/object data
  const result = links.map(l => {
    const person = findOne('records', r => r.id === l.person_record_id);
    const target = findOne('records', r => r.id === l.target_record_id);
    const targetObj = target ? findOne('objects', o => o.id === target.object_id) : null;
    // Build a display title for the target record
    const td = target?.data || {};
    const targetTitle = td.job_title || td.pool_name || td.name || td.first_name || l.target_record_id?.slice(0,8);
    // Hydrate workflow steps for stage dropdown
    const wfAssignment = findOne('record_workflow_assignments', a => a.record_id === l.target_record_id && a.type === 'people_link');
    const wf = wfAssignment ? findOne('workflows', w => w.id === wfAssignment.workflow_id) : null;
    const wfSteps = wf ? query('workflow_steps', s => s.workflow_id === wf.id).sort((a,b)=>a.order-b.order) : [];
    return {
      ...l,
      person_data: person?.data || {},
      target_data: td,
      target_title: targetTitle,
      target_object_name: targetObj?.name || 'Record',
      target_object_color: targetObj?.color || '#4361EE',
      workflow_steps: wfSteps,
      workflow_name: wf?.name || null,
    };
  });
  res.json(result);
});

// POST /api/workflows/people-links
router.post('/people-links', (req, res) => {
  ensureTables();
  const { person_record_id, target_record_id, target_object_id, stage_id, stage_name, environment_id } = req.body;
  if (!person_record_id || !target_record_id) return res.status(400).json({ error: 'person_record_id and target_record_id required' });
  // Prevent duplicates
  const existing = findOne('people_links', l => l.person_record_id === person_record_id && l.target_record_id === target_record_id);
  if (existing) return res.status(409).json({ error: 'Link already exists', link: existing });
  const link = insert('people_links', {
    id: uuidv4(), person_record_id, target_record_id, target_object_id: target_object_id||null,
    stage_id: stage_id||null, stage_name: stage_name||null,
    environment_id: environment_id||null, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  const person = findOne('records', r => r.id === person_record_id);
  res.json({ ...link, person_data: person?.data || {} });
});

// PATCH /api/workflows/people-links/:id  — update stage + auto-run step actions
router.patch('/people-links/:id', async (req, res) => {
  ensureTables();
  const { stage_id, stage_name } = req.body;
  const link = update('people_links', l => l.id === req.params.id, { stage_id, stage_name, updated_at: new Date().toISOString() });
  if (!link) return res.status(404).json({ error: 'Not found' });

  const person = findOne('records', r => r.id === link.person_record_id);

  // Auto-execute actions on the step they just moved into
  let stepRunLog = [];
  if (stage_id && person) {
    const s2 = getStore();
    const step = (s2.workflow_steps || []).find(s => s.id === stage_id);
    console.log(`[stage-move] stage_id=${stage_id} person=${person?.id?.slice(0,8)} step=${step?.name} actions=${JSON.stringify((step?.actions||[]).map(a=>a.type))}`);
    if (step) {
      const actions = stepActions(step);
      if (actions.length > 0) {
        // Find the workflow to get environment_id
        const wf = findOne('workflows', w => w.id === step.workflow_id);
        const environment_id = wf?.environment_id || person.environment_id;

        for (const action of actions) {
          const cfg = action.config || {};
          let actionOutput = '';
          let actionStatus = 'done';
          try {
            if (action.type === 'run_agent') {
              const agentId = cfg.agent_id;
              if (!agentId) { actionOutput = '⚠ No agent selected'; actionStatus = 'warning'; }
              else {
                const agent = findOne('agents', a => a.id === agentId && !a.deleted_at);
                if (!agent) { actionOutput = `⚠ Agent not found`; actionStatus = 'warning'; }
                else {
                  const agentResults = await executeAgentActions(agent, person.id, person, environment_id);
                  actionOutput = agentResults.map(r => r.step).join(' | ');
                  actionStatus = agentResults.some(r => r.step?.startsWith('⚠')) ? 'warning' : 'done';
                }
              }
            } else if (action.type === 'send_email') {
              const s = getStore();
              const resolved = resolveRecipient(cfg, person, s);
              if (resolved.error) { actionOutput = `⚠ ${resolved.error}`; actionStatus = 'warning'; }
              else {
                const toList = resolved.emails.map(r => r.email).join(', ');
                // Resolve {{interview_link}} from latest pending token for this person
                const latestToken = (s.agent_tokens || [])
                  .filter(t => t.candidate_id === person.id && t.status === 'pending')
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                const interviewUrl = latestToken
                  ? `${process.env.APP_URL || 'https://client-lovat-nu-33.vercel.app'}/interview/${latestToken.token}`
                  : null;
                const interpolate = (str) => (str || '')
                  .replace(/\{\{(\w+)\}\}/g, (_, k) => person.data?.[k] ?? `{{${k}}}`)
                  .replace(/\{\{interview_link\}\}/g, interviewUrl || '{{interview_link}}');
                const subject = interpolate(cfg.subject);
                const body    = interpolate(cfg.body);
                try {
                  const msg = require('../services/messaging');
                  for (const r of resolved.emails) await msg.sendEmail({ to: r.email, subject, text: body, html: body.replace(/\n/g, '<br>') });
                  actionOutput = `Email → ${toList}: "${subject}"`;
                } catch(e) { actionOutput = `[Demo] Email → ${toList}: "${subject}"`; }
              }
            } else if (action.type === 'send_invitation_email') {
              const s = getStore();
              const token = (s.agent_tokens || []).filter(t => t.candidate_id === person.id && t.status === 'pending').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
              const interviewUrl = token ? `${process.env.APP_URL || 'http://localhost:3000'}/interview/${token.token}` : null;
              if (!token) { actionOutput = `⚠ No pending interview link — run Run Agent first`; actionStatus = 'warning'; }
              else {
                const resolved = resolveRecipient(cfg, person, s);
                if (resolved.error) { actionOutput = `⚠ ${resolved.error}`; actionStatus = 'warning'; }
                else {
                  const toList = resolved.emails.map(r => r.email).join(', ');
                  const subject = cfg.subject || `Your AI Interview invitation`;
                  const body = (cfg.body || `Hi {{first_name}},\n\nYour interview link: {{interview_link}}\n\nGood luck!`)
                    .replace(/\{\{(\w+)\}\}/g, (_, k) => person.data?.[k] ?? `{{${k}}}`)
                    .replace(/\{\{interview_link\}\}/g, interviewUrl);
                  try {
                    const msg = require('../services/messaging');
                    for (const r of resolved.emails) { const res2 = await msg.sendEmail({ to: r.email, subject, text: body, html: body.replace(/\n/g,'<br>') }); actionOutput = res2.simulated ? `[Sim] Invitation → ${toList}` : `Invitation sent → ${toList}`; }
                  } catch(e) { actionOutput = `[Demo] Invitation → ${toList}`; }
                  if (!s.communications) s.communications = [];
                  s.communications.push({ id: uuidv4(), record_id: person.id, type:'email', direction:'outbound', subject, body, status:'sent', created_by:'workflow-auto', created_at: new Date().toISOString() });
                  require('../db/init').saveStore();
                }
              }
            } else if (action.type === 'stage_change') {
              const newData = { ...person.data, status: cfg.to_stage };
              update('records', r => r.id === person.id, { data: newData });
              person.data = newData;
              actionOutput = `Stage → ${cfg.to_stage}`;
            } else if (action.type === 'update_field') {
              const newData = { ...person.data, [cfg.field_key]: cfg.field_value };
              update('records', r => r.id === person.id, { data: newData });
              person.data = newData;
              actionOutput = `Field ${cfg.field_key} → ${cfg.field_value}`;
            } else if (action.type === 'ai_prompt') {
              actionOutput = `[AI prompt queued]`;
            } else {
              actionOutput = `Action: ${action.type}`;
            }
          } catch (err) {
            actionOutput = `Error: ${err.message}`;
            actionStatus = 'error';
          }
          stepRunLog.push({ action_type: action.type, status: actionStatus, output: actionOutput });
        }
      }
    }
  }

  res.json({ ...link, person_data: person?.data || {}, step_run_log: stepRunLog });
});

// DELETE /api/workflows/people-links/:id
router.delete('/people-links/:id', (req, res) => {
  ensureTables();
  remove('people_links', l => l.id === req.params.id);
  res.json({ ok: true });
});

module.exports = router;
