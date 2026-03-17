// server/agent-engine.js
// Handles automatic agent execution: scheduled triggers + event-based triggers
const cron = require('node-cron');
const { query, insert, getStore, saveStore } = require('./db/init');
const { v4: uuidv4 } = require('uuid');

// ── SHARED EXECUTION LOGIC (mirrors agents.js) ────────────────────────────────
async function runAiAction(action, recordContext, previousAiOutput) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return '[AI unavailable — no API key]';
  let prompt = '';
  switch(action.type) {
    case 'ai_analyse':    prompt = action.prompt || `Analyse this record concisely:\n\n${recordContext}`; break;
    case 'ai_draft_email': prompt = `Draft a professional email. Subject on line 1 as "Subject: ...".\nRecord:\n${recordContext}\nPurpose: ${action.email_purpose||'follow up'}\nTone: ${action.tone||'professional'}`; break;
    case 'ai_summarise':  prompt = `Write a 2-3 sentence summary of this record for a recruiter:\n\n${recordContext}`; break;
    case 'ai_score':      prompt = `Score this candidate 0-100. Return ONLY JSON: {"score":85,"reasoning":"...","strengths":["..."],"gaps":["..."]}\nCriteria: ${action.criteria||'overall suitability'}\n${recordContext}`; break;
    default:              prompt = action.prompt || `Analyse:\n${recordContext}`;
  }
  if (previousAiOutput) prompt += `\n\nPrevious AI output:\n${previousAiOutput}`;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}] }),
  });
  const d = await resp.json();
  return d.content?.[0]?.text || '[No response]';
}

async function executeAction(action, record_id, environment_id, aiOutput, modifierNote) {
  const s = getStore();
  switch(action.type) {
    case 'add_note': {
      if (!record_id) break;
      const content = action.note_template
        ? action.note_template.replace('{{ai_output}}', aiOutput||'')
        : (aiOutput||'Agent note');
      insert('notes', { id:uuidv4(), record_id, content: modifierNote ? `${content}\n\n_Reviewer: ${modifierNote}_` : content, created_by:'Agent', created_at:new Date().toISOString() });
      break;
    }
    case 'update_field': {
      if (!record_id || !action.field_key) break;
      const idx = s.records.findIndex(r => r.id === record_id);
      if (idx !== -1) { s.records[idx].data = { ...s.records[idx].data, [action.field_key]: action.field_value||aiOutput||'' }; s.records[idx].updated_at = new Date().toISOString(); saveStore(); }
      break;
    }
    case 'send_email': case 'ai_draft_email': {
      if (record_id) {
        const lines = (aiOutput||'').split('\n');
        const subj = lines.find(l=>l.startsWith('Subject:'));
        insert('communications', { id:uuidv4(), record_id, environment_id, type:'email', direction:'outbound',
          subject: subj ? subj.replace('Subject:','').trim() : (action.email_subject||'Agent email'),
          body: lines.filter(l=>!l.startsWith('Subject:')).join('\n').trim() || action.email_body||'',
          status: action.type==='ai_draft_email' ? 'draft' : 'sent', sent_by:'Agent', created_at:new Date().toISOString() });
      }
      break;
    }
    case 'webhook': {
      if (!action.webhook_url) break;
      await fetch(action.webhook_url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ record_id, environment_id, ai_output:aiOutput, timestamp:new Date().toISOString() }) }).catch(()=>{});
      break;
    }
  }
}

function evaluateConditions(conditions, record) {
  if (!record) return true;
  return conditions.every(c => {
    const val = record.data?.[c.field] ?? record[c.field];
    switch(c.operator) {
      case 'equals':       return String(val||'').toLowerCase() === String(c.value||'').toLowerCase();
      case 'not_equals':   return String(val||'').toLowerCase() !== String(c.value||'').toLowerCase();
      case 'contains':     return String(val||'').toLowerCase().includes(String(c.value||'').toLowerCase());
      case 'greater_than': return Number(val) > Number(c.value);
      case 'less_than':    return Number(val) < Number(c.value);
      case 'is_empty':     return !val || val === '';
      case 'is_not_empty': return !!val && val !== '';
      case 'includes':     return Array.isArray(val) && val.includes(c.value);
      default:             return true;
    }
  });
}

// ── CORE EXECUTION ─────────────────────────────────────────────────────────────
async function executeAgentForRecord(agent, record_id, trigger) {
  const s = getStore();
  const run = insert('agent_runs', {
    id: uuidv4(), agent_id: agent.id, agent_name: agent.name, trigger,
    record_id: record_id || null, environment_id: agent.environment_id,
    status: 'running', steps: [], ai_output: null, pending_actions: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  const runIdx = () => s.agent_runs.findIndex(r => r.id === run.id);
  const addStep = (step) => { const i=runIdx(); if(i!==-1){s.agent_runs[i].steps.push({step,timestamp:new Date().toISOString()});saveStore();} };

  try {
    addStep(`Agent triggered: ${trigger}`);
    let record = null, fields = [];
    if (record_id) {
      record = query('records', r => r.id === record_id)[0] || null;
      if (record) fields = query('field_definitions', f => f.object_id === record.object_id && !f.deleted_at);
    }
    if (agent.conditions?.length > 0) {
      if (!evaluateConditions(agent.conditions, record)) {
        const i=runIdx(); s.agent_runs[i].status='skipped'; s.agent_runs[i].skip_reason='Conditions not met'; s.agent_runs[i].updated_at=new Date().toISOString(); saveStore();
        addStep('Conditions not met — skipped'); return;
      }
      addStep('Conditions passed');
    }
    let recordContext = '';
    if (record && fields.length > 0) recordContext = fields.map(f=>{ const v=record.data?.[f.api_key]; return v!=null?`${f.name}: ${v}`:null; }).filter(Boolean).join('\n');

    let aiOutput = null;
    const pendingActions = [];
    for (let i = 0; i < agent.actions.length; i++) {
      const action = agent.actions[i];
      addStep(`Action ${i+1}: ${action.type}`);
      if (['ai_analyse','ai_draft_email','ai_summarise','ai_score'].includes(action.type)) {
        aiOutput = await runAiAction(action, recordContext, aiOutput);
        const ri=runIdx(); s.agent_runs[ri].ai_output=aiOutput; saveStore();
        addStep('AI action completed');
      } else if (action.type === 'human_review') {
        pendingActions.push({ action, action_index:pendingActions.length, ai_output:aiOutput, record_preview:recordContext.slice(0,300), approved:undefined, created_at:new Date().toISOString() });
        addStep('Paused — awaiting approval');
      } else {
        const lastPending = pendingActions[pendingActions.length-1];
        if (lastPending && lastPending.approved === undefined) pendingActions.push({ action, action_index:pendingActions.length, queued:true });
        else { await executeAction(action, record_id, agent.environment_id, aiOutput); addStep(`Executed: ${action.type}`); }
      }
    }
    const hasPending = pendingActions.some(a => a.approved === undefined);
    const ri=runIdx();
    s.agent_runs[ri].status = hasPending ? 'pending_approval' : 'completed';
    s.agent_runs[ri].pending_actions = pendingActions;
    s.agent_runs[ri].updated_at = new Date().toISOString();
    const ai=s.agents.findIndex(a=>a.id===agent.id);
    if(ai!==-1){s.agents[ai].run_count=(s.agents[ai].run_count||0)+1;s.agents[ai].last_run_at=new Date().toISOString();}
    saveStore();
    addStep(hasPending ? 'Awaiting approval' : 'Completed');
  } catch(err) {
    const ri=runIdx(); s.agent_runs[ri].status='failed'; s.agent_runs[ri].error=err.message; s.agent_runs[ri].updated_at=new Date().toISOString(); saveStore();
    console.error(`[Agent] ${agent.name} failed:`, err.message);
  }
}

// ── SCHEDULED TRIGGERS ─────────────────────────────────────────────────────────
// Runs every minute to check for agents that should fire
function startScheduler() {
  // Check every minute
  cron.schedule('* * * * *', () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];

    const agents = query('agents', a => a.is_active && !a.deleted_at);
    for (const agent of agents) {
      if (agent.trigger_type === 'schedule_daily' && agent.schedule_time === timeStr) {
        console.log(`[Scheduler] Firing daily agent: ${agent.name}`);
        executeAgentForRecord(agent, null, 'schedule_daily').catch(console.error);
      }
      if (agent.trigger_type === 'schedule_weekly' && agent.schedule_time === timeStr && agent.trigger_config?.day_of_week === dayName) {
        console.log(`[Scheduler] Firing weekly agent: ${agent.name}`);
        executeAgentForRecord(agent, null, 'schedule_weekly').catch(console.error);
      }
    }
  });
  console.log('[Scheduler] Agent scheduler started — checking every minute');
}

// ── EVENT-BASED TRIGGERS ───────────────────────────────────────────────────────
// Called from the records route when a record is created/updated
async function fireEventTrigger(eventType, record, changedFields) {
  const agents = query('agents', a =>
    a.is_active && !a.deleted_at && a.trigger_type === eventType &&
    (!a.target_object_id || a.target_object_id === record.object_id)
  );

  for (const agent of agents) {
    // For stage_changed, check if relevant field actually changed
    if (eventType === 'stage_changed') {
      const hasStageChange = changedFields && changedFields.some(f => f === 'status' || f === 'pipeline_stage' || f === 'stage');
      if (!hasStageChange) continue;
    }
    console.log(`[Event] Firing ${eventType} agent "${agent.name}" for record ${record.id}`);
    // Small delay to avoid blocking the HTTP response
    setTimeout(() => executeAgentForRecord(agent, record.id, eventType).catch(console.error), 100);
  }
}

// ── FORM SUBMISSION TRIGGER ────────────────────────────────────────────────────
async function fireFormSubmitTrigger(formId, recordId, environmentId) {
  const agents = query('agents', a =>
    a.is_active && !a.deleted_at && a.trigger_type === 'form_submitted' &&
    (!a.trigger_config?.form_id || a.trigger_config.form_id === formId) &&
    a.environment_id === environmentId
  );
  for (const agent of agents) {
    console.log(`[Event] Firing form_submitted agent "${agent.name}"`);
    setTimeout(() => executeAgentForRecord(agent, recordId, 'form_submitted').catch(console.error), 100);
  }
}

module.exports = { startScheduler, fireEventTrigger, fireFormSubmitTrigger, executeAgentForRecord };
