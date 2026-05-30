// server/agent-engine.js
// Handles automatic agent execution: scheduled triggers + event-based triggers
const cron = require('node-cron');
const { query, insert, getStore, saveStore } = require('./db/init');
const { v4: uuidv4 } = require('uuid');

// ── SHARED EXECUTION LOGIC (mirrors agents.js) ────────────────────────────────
async function runAiAction(action, recordContext, previousAiOutput) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return '[AI unavailable — no API key]';
  const promptMap = {
    'ai_analyse':    action.prompt || `Analyse this record concisely:\n\n${recordContext}`,
    'ai_draft_email': `Draft a professional email. Subject on line 1 as "Subject: ...".\nRecord:\n${recordContext}\nPurpose: ${action.email_purpose||'follow up'}\nTone: ${action.tone||'professional'}`,
    'ai_summarise':  `Write a 2-3 sentence summary of this record for a recruiter:\n\n${recordContext}`,
    'ai_score':      `Score this candidate 0-100. Return ONLY JSON: {"score":85,"reasoning":"...","strengths":["..."],"gaps":["..."]}\nCriteria: ${action.criteria||'overall suitability'}\n${recordContext}`,
  };
  let prompt = promptMap[action.type] || action.prompt || `Analyse:\n${recordContext}`;
  if (previousAiOutput) prompt += `\n\nPrevious AI output:\n${previousAiOutput}`;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens:1000, messages:[{role:'user',content:prompt}] }),
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
      insert('notes', { id:uuidv4(), record_id, content: modifierNote ? `${content}\n\n_Reviewer: ${modifierNote}_` : content, author:'Agent', created_by:'Agent', ai_generated:true, created_at:new Date().toISOString() });
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
    case 'add_to_pool': {
      if (!record_id || !action.pool_name) break;
      const poolStore = getStore();
      const poolObj = (poolStore.objects||[]).find(o=>o.name==='Talent Pool'||o.name==='TalentPool'||o.slug==='talent-pools');
      if (!poolObj) break;
      let pool = (poolStore.records||[]).find(r=>r.object_id===poolObj.id&&(r.data?.pool_name||r.data?.name||'').toLowerCase()===action.pool_name.toLowerCase()&&!r.deleted_at);
      if (!pool) {
        pool = insert('records',{id:uuidv4(),object_id:poolObj.id,environment_id,data:{pool_name:action.pool_name,name:action.pool_name},created_by:'Agent',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      }
      const already=(poolStore.people_links||[]).find(l=>l.person_record_id===record_id&&l.target_record_id===pool.id);
      if (!already){insert('people_links',{id:uuidv4(),person_record_id:record_id,target_record_id:pool.id,target_object_id:poolObj.id,stage_id:null,stage_name:null,environment_id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});saveStore();}
      break;
    }
    case 'notify_user': {
      if (!action.message) break;
      const ns = getStore();
      if (!ns.notifications) ns.notifications = [];
      const rec = record_id ? (ns.records||[]).find(r=>r.id===record_id) : null;
      const msg = (action.message||'').replace(/\{\{(\w+)\}\}/g,(_,k)=>rec?.data?.[k]??`{{${k}}}`);
      ns.notifications.push({id:uuidv4(),message:msg,record_id:record_id||null,environment_id,read:false,created_by:'Agent',created_at:new Date().toISOString()});
      saveStore();
      break;
    }
    case 'run_agent': {
      if (!action.agent_id) break;
      const targetAgent = query('agents', a => a.id === action.agent_id && !a.deleted_at)[0];
      if (!targetAgent) break;
      // Fire async — don't await to avoid blocking the parent chain
      setTimeout(() => executeAgentForRecord(targetAgent, record_id, 'chained').catch(console.error), 50);
      break;
    }
    case 'move_stage': {
      if (!record_id || !action.stage_name) break;
      const ms = getStore();
      const link = (ms.people_links || []).find(l => l.person_record_id === record_id && !l.deleted_at);
      if (!link) break;
      const assignment = (ms.record_workflow_assignments || []).find(a => a.record_id === link.target_record_id && a.type === 'people_link');
      const wf = assignment ? (ms.workflows || []).find(w => w.id === assignment.workflow_id) : null;
      const wfSteps = wf ? (ms.workflow_steps || []).filter(s => s.workflow_id === wf.id).sort((a,b) => a.order - b.order) : [];
      const tStep = wfSteps.find(s => s.name?.toLowerCase() === action.stage_name?.toLowerCase());
      if (tStep) {
        const li = ms.people_links.findIndex(l => l.id === link.id);
        if (li !== -1) { ms.people_links[li].stage_id = tStep.id; ms.people_links[li].stage_name = tStep.name; ms.people_links[li].updated_at = new Date().toISOString(); saveStore(); }
      }
      break;
    }
    case 'link_to_object': {
      if (!record_id || !action.object_id) break;
      const targetRecordId = action.record_id || null;
      if (!targetRecordId) break;
      const existingLink = query('people_links', l => l.person_record_id === record_id && l.target_record_id === targetRecordId)[0];
      if (existingLink) break;
      const assignment = query('record_workflow_assignments', a => a.record_id === targetRecordId && a.type === 'people_link')[0];
      const wf = assignment ? query('workflows', w => w.id === assignment.workflow_id)[0] : null;
      const steps = wf ? query('workflow_steps', s => s.workflow_id === wf.id).sort((a,b)=>a.order-b.order) : [];
      const firstStep = steps[0] || null;
      insert('people_links', {
        id: uuidv4(), person_record_id: record_id, target_record_id: targetRecordId,
        target_object_id: action.object_id, stage_id: firstStep?.id||null, stage_name: firstStep?.name||null,
        environment_id: environment_id||null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      saveStore();
      break;
    }
    case 'create_task': {
      if (!action.task_title) break;
      const interpolate = (str) => (str||'').replace(/\{\{(\w+)\}\}/g, (_,k) => {
        const rec = query('records', r=>r.id===record_id)[0];
        return rec?.data?.[k]??`{{${k}}}`;
      });
      const title = interpolate(action.task_title);
      const dueDate = action.due_days!=null
        ? new Date(Date.now()+action.due_days*86400000).toISOString().split('T')[0]
        : null;
      insert('tasks', {
        id: uuidv4(), title, description: interpolate(action.task_description||''),
        due_date: dueDate, priority: action.task_priority||'Normal', status: 'Open',
        tags: action.task_tags ? action.task_tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
        record_id: action.task_link_record ? record_id : null,
        environment_id, created_by: 'Agent', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      saveStore();
      break;
    }
  }
}

function evaluateConditions(conditions, record) {
  if (!record) return true;
  return conditions.every(c => {
    const val = record.data?.[c.field] ?? record[c.field];
    const strVal = String(val ?? '').toLowerCase();
    const strCv  = String(c.value ?? '').toLowerCase();
    const numVal = Number(val);
    const numCv  = Number(c.value);
    switch(c.operator) {
      // equality
      case 'equals': case 'is': case '=':
        return strVal === strCv;
      case 'not_equals': case 'is not': case '≠':
        return strVal !== strCv;
      // text
      case 'contains':
        return strVal.includes(strCv);
      case 'does not contain':
        return !strVal.includes(strCv);
      case 'starts with':
        return strVal.startsWith(strCv);
      // numeric
      case 'greater_than': case '>':
        return numVal > numCv;
      case 'less_than': case '<':
        return numVal < numCv;
      case '≥': case 'greater_than_or_equal':
        return numVal >= numCv;
      case '≤': case 'less_than_or_equal':
        return numVal <= numCv;
      // date
      case 'is before':
        return val && c.value && new Date(val) < new Date(c.value);
      case 'is after':
        return val && c.value && new Date(val) > new Date(c.value);
      // emptiness
      case 'is_empty': case 'is empty':
        return !val || val === '' || (Array.isArray(val) && val.length === 0);
      case 'is_not_empty': case 'is not empty': case 'not empty':
        return !!(val && val !== '') || (Array.isArray(val) && val.length > 0);
      // boolean
      case 'is true':  return val === true || val === 'true' || val === 1;
      case 'is false': return !val || val === 'false' || val === 0;
      // array
      case 'includes':
        return Array.isArray(val) ? val.some(v => String(v).toLowerCase() === strCv) : strVal.includes(strCv);
      case 'excludes':
        return Array.isArray(val) ? !val.some(v => String(v).toLowerCase() === strCv) : !strVal.includes(strCv);
      default: return true;
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
      if (record) fields = query('fields', f => f.object_id === record.object_id);
    }
    if (agent.conditions?.length > 0) {
      if (!evaluateConditions(agent.conditions, record)) {
        const i=runIdx(); s.agent_runs[i].status='skipped'; s.agent_runs[i].skip_reason='Conditions not met'; s.agent_runs[i].updated_at=new Date().toISOString(); saveStore();
        addStep('Conditions not met — skipped'); return;
      }
      addStep('Conditions passed');
    }
    let recordContext = '';
    if (record) {
      // Build context from field definitions + raw data fallback
      if (fields.length > 0) {
        const lines = fields.map(f => {
          const v = record.data?.[f.api_key];
          if (v == null || v === '') return null;
          return `${f.name}: ${Array.isArray(v) ? v.join(', ') : v}`;
        }).filter(Boolean);
        recordContext = lines.join('\n');
      }
      // Fallback: use raw data keys if no field definitions resolved
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
  cron.schedule('* * * * *', () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];

    const agents = query('agents', a => a.is_active && !a.deleted_at);
    for (const agent of agents) {
      const isDaily  = agent.trigger_type === 'schedule_daily'  && agent.schedule_time === timeStr;
      const isWeekly = agent.trigger_type === 'schedule_weekly' && agent.schedule_time === timeStr && agent.trigger_config?.day_of_week === dayName;
      if (!isDaily && !isWeekly) continue;

      console.log(`[Scheduler] Firing ${agent.trigger_type} agent: ${agent.name}`);

      // If the agent targets a specific object, run once per matching record
      if (agent.target_object_id) {
        const records = query('records', r => r.object_id === agent.target_object_id && !r.deleted_at);
        if (records.length === 0) {
          // Still run once with no record (e.g. a summary/report agent)
          executeAgentForRecord(agent, null, agent.trigger_type).catch(console.error);
        } else {
          for (const rec of records) {
            // Stagger slightly to avoid hammering the AI API
            const delay = records.indexOf(rec) * 200;
            setTimeout(() => executeAgentForRecord(agent, rec.id, agent.trigger_type).catch(console.error), delay);
          }
        }
      } else {
        executeAgentForRecord(agent, null, agent.trigger_type).catch(console.error);
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
    if (eventType === 'stage_changed') {
      // Must have an actual stage field change
      const hasStageChange = changedFields && changedFields.some(f => f === 'status' || f === 'pipeline_stage' || f === 'stage');
      if (!hasStageChange) continue;
      // If agent specifies a stage_value, only fire when the record's status matches
      const targetStage = agent.trigger_config?.stage_value;
      if (targetStage) {
        const currentStage = record.data?.status || record.data?.pipeline_stage || record.data?.stage || '';
        if (currentStage.toLowerCase() !== targetStage.toLowerCase()) continue;
      }
    }
    if (eventType === 'record_updated') {
      // If agent specifies watch_field, only fire when that field changed
      const watchField = agent.trigger_config?.watch_field;
      if (watchField && changedFields && !changedFields.includes(watchField)) continue;
    }
    console.log(`[Event] Firing ${eventType} agent "${agent.name}" for record ${record.id}`);
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
