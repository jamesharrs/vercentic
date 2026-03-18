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

    const questionSource = action.question_source || 'job';
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

// PUT /api/workflows/:id/steps  — replace all steps
router.put('/:id/steps', (req, res) => {
  ensureTables();
  const { steps } = req.body;
  const store = getStore();
  // Remove old steps
  store.workflow_steps = store.workflow_steps.filter(s => s.workflow_id !== req.params.id);
  // Insert new ones
  const saved = (steps || []).map((s, i) => {
    const step = { id: s.id || uuidv4(), workflow_id: req.params.id, name: s.name || '', order: i, type: s.type, automation_type: s.automation_type || null, config: s.config || {}, created_at: new Date().toISOString() };
    store.workflow_steps.push(step);
    return step;
  });
  require('../db/init').saveStore();
  res.json(saved);
});

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
      // Placeholder — no automation, just log passage
      if (!step.automation_type) {
        stepResult.output = step.name ? `Passed through: ${step.name}` : 'Stage passed';
        stepResult.status = 'done';

      } else if (step.automation_type === 'stage_change') {
        const newData = { ...record.data, status: step.config.to_stage };
        update('records', r => r.id === record_id, { data: newData });
        record.data = newData;
        stepResult.output = `Stage changed to: ${step.config.to_stage}`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'update_field') {
        const newData = { ...record.data, [step.config.field]: step.config.value };
        update('records', r => r.id === record_id, { data: newData });
        record.data = newData;
        stepResult.output = `Field "${step.config.field}" set to "${step.config.value}"`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'ai_prompt') {
        // Call the Anthropic API
        const prompt = (step.config.prompt || '').replace(/\{\{(\w+)\}\}/g, (_, key) => record.data?.[key] ?? `{{${key}}}`);
        const fullPrompt = `Record data:\n${JSON.stringify(record.data, null, 2)}\n\n${prompt}`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: fullPrompt }] })
        });
        const data = await response.json();
        const aiOutput = data.content?.[0]?.text || 'No output';
        // Optionally write result to a field
        if (step.config.output_field) {
          const newData = { ...record.data, [step.config.output_field]: aiOutput };
          update('records', r => r.id === record_id, { data: newData });
          record.data = newData;
        }
        stepResult.output = aiOutput;
        stepResult.status = 'done';

      } else if (step.automation_type === 'send_email') {
        stepResult.output = `[Demo] Email would be sent to ${record.data?.email || 'unknown'}: "${step.config.subject}"`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'webhook') {
        stepResult.output = `[Demo] POST to ${step.config.url}`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'schedule_interview') {
        const cfg = step.config || {};
        const { scheduled_date, scheduled_time } = req.body;

        // Resolve interviewers based on config
        let interviewers = [];
        const source = cfg.interviewer_source || 'job_record';

        // Get interviewers from interview type
        if (['interview_type','both'].includes(source) && cfg.interview_type_id) {
          const itype = findOne('interview_types', t => t.id === cfg.interview_type_id);
          if (itype?.interviewers?.length) interviewers.push(...itype.interviewers);
        }

        // Get interviewers from the linked job record
        if (['job_record','both'].includes(source)) {
          // Find job linked to this record — check data.job_id or relationships
          const jobId = record.data?.job_id;
          if (jobId) {
            const jobRecord = findOne('records', r => r.id === jobId);
            const jobIvs = jobRecord?.data?.interviewers;
            if (Array.isArray(jobIvs)) interviewers.push(...jobIvs);
          }
          // Also check relationships
          const rels = query('relationships', r =>
            (r.source_id === record.id || r.target_id === record.id)
          );
          for (const rel of rels) {
            const otherId = rel.source_id === record.id ? rel.target_id : rel.source_id;
            const other = findOne('records', r => r.id === otherId);
            if (other?.data?.interviewers?.length) {
              interviewers.push(...other.data.interviewers);
            }
          }
        }

        // Dedupe by id
        const seen = new Set();
        interviewers = interviewers.filter(iv => {
          const id = typeof iv === 'object' ? iv.id : iv;
          if (seen.has(id)) return false;
          seen.add(id); return true;
        });

        // Create the interview record
        const interview = insert('interviews', {
          id: uuidv4(),
          environment_id: record.environment_id,
          interview_type_id: cfg.interview_type_id || null,
          interview_type_name: cfg.interview_type_name || 'Interview',
          candidate_id: record.id,
          candidate_name: `${record.data?.first_name||''} ${record.data?.last_name||''}`.trim() || record.id,
          date: scheduled_date || null,
          time: scheduled_time || null,
          duration: cfg.interview_duration || 30,
          format: cfg.interview_format || 'Video Call',
          interviewers,
          status: 'scheduled',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        stepResult.output = `Interview scheduled for ${scheduled_date} at ${scheduled_time} with ${interviewers.length} interviewer(s)`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'create_offer') {
        const cfg = step.config || {};
        const { offer_salary, offer_currency, offer_bonus, offer_expiry, offer_notes } = req.body;

        // Resolve linked job from record data or relationships
        let jobId = record.data?.job_id || null;
        let jobName = record.data?.job_name || '';
        let jobDepartment = record.data?.job_department || '';
        if (!jobId) {
          const rels = query('relationships', r => r.source_id === record.id || r.target_id === record.id);
          for (const rel of rels) {
            const otherId = rel.source_id === record.id ? rel.target_id : rel.source_id;
            const other = findOne('records', r => r.id === otherId);
            if (other?.data?.job_title) { jobId = other.id; jobName = other.data.job_title; jobDepartment = other.data.department || ''; break; }
          }
        }

        if (!store.offers) store.offers = [];
        const offer = insert('offers', {
          id: uuidv4(),
          environment_id: record.environment_id,
          candidate_id:   record.id,
          candidate_name: `${record.data?.first_name||''} ${record.data?.last_name||''}`.trim() || record.id,
          job_id:         jobId,
          job_name:       jobName,
          job_department: jobDepartment,
          base_salary:    parseFloat(offer_salary) || null,
          currency:       offer_currency || cfg.currency || 'USD',
          bonus:          offer_bonus ? parseFloat(offer_bonus) : null,
          bonus_type:     'fixed',
          start_date:     null,
          expiry_date:    offer_expiry || null,
          status:         'draft',
          approval_chain: [],
          current_approver_index: null,
          notes:          offer_notes || '',
          terms:          '',
          custom_fields:  {},
          created_by:     'Workflow',
          sent_at: null, accepted_at: null, declined_at: null, withdrawn_at: null, decline_reason: '',
          activity_log: [{ id: uuidv4(), type: 'created', message: `Offer created by workflow: ${wf.name}`, user: 'Workflow', timestamp: new Date().toISOString() }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        });

        stepResult.output = `Offer created (Draft) — ${offer_currency || cfg.currency || 'USD'} ${Number(offer_salary).toLocaleString()} for ${offer.candidate_name}`;
        stepResult.status = 'done';

      } else if (step.automation_type === 'run_agent') {
        // Run a specific agent against this record
        const agentId = step.config?.agent_id;
        if (!agentId) { stepResult.status = 'skipped'; stepResult.output = 'No agent selected'; }
        else {
          const agent = findOne('agents', a => a.id === agentId && !a.deleted_at);
          if (!agent) { stepResult.status = 'error'; stepResult.output = `Agent not found: ${agentId}`; }
          else {
            // Execute the agent's ai_interview action directly (same logic as agents route)
            const agentResults = await executeAgentActions(agent, record_id, record, wf.environment_id || record.environment_id);
            stepResult.output = agentResults.map(r => r.step).join(' | ');
            stepResult.status = agentResults.some(r => r.step?.startsWith('⚠')) ? 'warning' : 'done';
            // Merge any generated tokens/notes back into step context
            stepResult.agent_run = agentResults;
          }
        }

      } else if (step.automation_type === 'send_invitation_email') {
        // Send candidate an interview invitation email with the link
        const s = getStore();
        // Find the most recent interview token for this candidate
        const token = (s.agent_tokens || [])
          .filter(t => t.candidate_id === record_id && t.status === 'pending')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const candidateName = record.data ? [record.data.first_name, record.data.last_name].filter(Boolean).join(' ') || 'Candidate' : 'Candidate';
        const candidateEmail = record.data?.email;
        const interviewUrl = token ? `${process.env.APP_URL || 'http://localhost:3000'}/interview/${token.token}` : null;

        if (!candidateEmail) {
          stepResult.status = 'warning';
          stepResult.output = `⚠ No email address on record — invitation not sent to ${candidateName}`;
        } else if (!token) {
          stepResult.status = 'warning';
          stepResult.output = `⚠ No pending interview link found for ${candidateName} — run the AI Interview agent step first`;
        } else {
          const subject = step.config?.subject || `You're invited to an AI interview — ${token.job_name || 'your application'}`;
          const body = step.config?.body || `Hi ${candidateName},\n\nThank you for your interest. We'd like to invite you to complete a short AI-powered interview at your convenience.\n\nClick the link below to begin:\n${interviewUrl}\n\nThis link is valid for 72 hours.\n\nGood luck!\nThe Recruitment Team`;
          const interpolated = body.replace(/\{\{(\w+)\}\}/g, (_, k) => record.data?.[k] ?? `{{${k}}}`).replace('{{interview_link}}', interviewUrl);

          // Use messaging service if configured, otherwise log
          try {
            const messaging = require('../services/messaging');
            const result = await messaging.sendEmail({ to: candidateEmail, subject, text: interpolated, html: interpolated.replace(/\n/g, '<br>') });
            stepResult.output = result.simulated
              ? `[Simulated] Invitation email queued for ${candidateEmail} — subject: "${subject}"`
              : `Invitation email sent to ${candidateEmail}`;
          } catch(e) {
            stepResult.output = `[Demo] Invitation email would be sent to ${candidateEmail} — link: ${interviewUrl}`;
          }

          // Save as a communication record
          if (!s.communications) s.communications = [];
          s.communications.push({ id: uuidv4(), record_id, type: 'email', direction: 'outbound', subject, body: interpolated, status: 'sent', created_by: 'workflow', created_at: new Date().toISOString() });
          saveStore(s);
          stepResult.status = 'done';
        }

      } else {
        stepResult.status = 'skipped';
        stepResult.output = 'Unknown step type';
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

// PATCH /api/workflows/people-links/:id  — update stage
router.patch('/people-links/:id', (req, res) => {
  ensureTables();
  const { stage_id, stage_name } = req.body;
  const link = update('people_links', l => l.id === req.params.id, { stage_id, stage_name, updated_at: new Date().toISOString() });
  if (!link) return res.status(404).json({ error: 'Not found' });
  const person = findOne('records', r => r.id === link.person_record_id);
  res.json({ ...link, person_data: person?.data || {} });
});

// DELETE /api/workflows/people-links/:id
router.delete('/people-links/:id', (req, res) => {
  ensureTables();
  remove('people_links', l => l.id === req.params.id);
  res.json({ ok: true });
});

module.exports = router;
