'use strict';
// server/services/milestone_engine.js
// Detects client milestones and fires sequence enrolments + email sends

const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { applyMerge } = require('../routes/email_sequencer');

const now  = () => new Date().toISOString();
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
const hoursBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 3600000);

function getCol(col) { const s=getStore(); if(!s[col])s[col]=[]; return s[col]; }
function saveCol(col,data) { const s=getStore(); s[col]=data; saveStore(s); }

// ── Detect which milestones a client has hit ─────────────────────────────────
function detectMilestones(client) {
  const hit = new Set(client.milestones_hit || []);
  const nowTs = new Date();
  const provisionedAt = new Date(client.created_at || nowTs);
  const daysSince = daysBetween(provisionedAt, nowTs);
  const hoursSince = hoursBetween(provisionedAt, nowTs);

  const store = getStore();
  const envId = client.environment_id;

  // Login data from users store
  const users = (store.users || []).filter(u => u.environment_id === envId && u.email === client.admin_email);
  const adminUser = users[0];
  const hasLoggedIn = adminUser && adminUser.login_count > 0;
  const lastLoginDays = adminUser?.last_login ? daysBetween(adminUser.last_login, nowTs) : 999;

  // Records
  const records = (store.records || []).filter(r => r.environment_id === envId && !r.deleted_at);
  const hasRecord = records.length > 0;

  // Extra users (beyond the initial admin)
  const allUsers = (store.users || []).filter(u => u.environment_id === envId);
  const hasTeamMember = allUsers.length > 1;

  // Workflows
  const workflows = (store.workflows || []).filter(w => w.environment_id === envId);
  const hasWorkflow = workflows.length > 0;

  // Portals
  const portals = (store.portals || []).filter(p => p.environment_id === envId && p.status === 'live');
  const hasPortal = portals.length > 0;

  const toMark = [];

  if (!hit.has('client_provisioned')) toMark.push('client_provisioned');
  if (hasLoggedIn && !hit.has('first_login')) toMark.push('first_login');
  if (!hasLoggedIn && hoursSince >= 24 && !hit.has('no_login_24h')) toMark.push('no_login_24h');
  if (!hasLoggedIn && hoursSince >= 72 && !hit.has('no_login_72h')) toMark.push('no_login_72h');
  if (hasRecord && !hit.has('first_record_created')) toMark.push('first_record_created');
  if (!hasRecord && daysSince >= 7 && !hit.has('no_record_7d')) toMark.push('no_record_7d');
  if (hasTeamMember && !hit.has('first_user_invited')) toMark.push('first_user_invited');
  if (hasWorkflow && !hit.has('first_workflow')) toMark.push('first_workflow');
  if (hasPortal && !hit.has('first_portal_published')) toMark.push('first_portal_published');
  if (daysSince >= 14 && hasLoggedIn && lastLoginDays <= 7 && !hit.has('day_14_active')) toMark.push('day_14_active');
  if (daysSince >= 30 && hasLoggedIn && lastLoginDays <= 14 && !hit.has('day_30_active')) toMark.push('day_30_active');
  if (daysSince >= 30 && lastLoginDays > 14 && !hit.has('day_30_inactive')) toMark.push('day_30_inactive');

  return toMark;
}

// ── Check if sequence goal is met for a client ───────────────────────────────
function isGoalMet(goal, client) {
  if (!goal || goal === 'none') return false;
  const hit = new Set(client.milestones_hit || []);
  const goalMap = {
    first_login:            'first_login',
    first_record_created:   'first_record_created',
    first_user_invited:     'first_user_invited',
    first_workflow:         'first_workflow',
    first_portal_published: 'first_portal_published',
  };
  return hit.has(goalMap[goal]);
}

// ── Send one step email ──────────────────────────────────────────────────────
async function sendStepEmail(enrolment, step, template, client) {
  const mergeData = {
    client_name:       client.company_name || 'there',
    admin_first_name:  client.admin_first_name || 'there',
    admin_email:       client.admin_email || '',
    environment_name:  client.environment_name || '',
    login_url:         process.env.APP_URL || 'https://app.vercentic.com',
    days_since_signup: String(daysBetween(client.created_at, now())),
    unsubscribe_url:   `${process.env.APP_URL || 'https://app.vercentic.com'}/api/sequencer/unsubscribe?token=${Buffer.from(enrolment.id).toString('base64')}`,
  };

  const subject = applyMerge(step.subject_override || template.subject, mergeData);
  const html    = applyMerge(template.body_html, mergeData);
  const text    = applyMerge(template.body_text, mergeData);

  // Add unsubscribe footer if not already present
  const htmlWithFooter = html.includes('unsubscribe') ? html : html + `
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
      <a href="${mergeData.unsubscribe_url}" style="color:#9ca3af">Unsubscribe</a> from these emails
    </div>`;

  try {
    const { sendEmail } = require('../services/messaging');
    await sendEmail(client.admin_email, subject, htmlWithFooter, text, template.from_email, template.from_name);

    // Log the send
    const log = getCol('email_send_log');
    log.push({
      id:          uuidv4(),
      enrolment_id: enrolment.id,
      client_id:   enrolment.client_id,
      sequence_id: enrolment.sequence_id,
      step_id:     step.id,
      template_id: template.id,
      to_email:    client.admin_email,
      subject,
      sent_at:     now(),
      opened:      false,
      clicked:     false,
    });
    saveCol('email_send_log', log);
    return true;
  } catch (e) {
    console.error('[Sequencer] Send failed:', e.message);
    return false;
  }
}

// ── Main engine — call every hour via cron ───────────────────────────────────
async function runSequencerCycle() {
  console.log('[Sequencer] Cycle started', now());
  const store = getStore();

  const clients    = store.superadmin_clients || [];
  const sequences  = (store.email_sequences  || []).filter(s => s.active && !s.deleted_at);
  const steps      = store.email_sequence_steps || [];
  const templates  = store.email_templates || [];
  const enrolments = store.email_enrolments || [];
  const sendLog    = store.email_send_log || [];

  let changes = false;

  for (const client of clients) {
    if (client.status === 'suspended') continue;

    // 1. Detect new milestones
    const newMilestones = detectMilestones(client);
    if (newMilestones.length) {
      client.milestones_hit = [...(client.milestones_hit || []), ...newMilestones];
      client.updated_at = now();
      changes = true;
      console.log(`[Sequencer] Client ${client.company_name} hit milestones: ${newMilestones.join(', ')}`);

      // 2. Auto-enrol in matching sequences
      for (const seq of sequences) {
        if (!newMilestones.includes(seq.trigger)) continue;
        const alreadyEnrolled = enrolments.find(e => e.client_id === client.id && e.sequence_id === seq.id && e.status === 'active');
        if (alreadyEnrolled) continue;
        // Check if client is unsubscribed from this sequence
        const unsubbed = enrolments.find(e => e.client_id === client.id && e.sequence_id === seq.id && e.status === 'unsubscribed');
        if (unsubbed) continue;

        const newEnr = { id:uuidv4(), client_id:client.id, sequence_id:seq.id, status:'active', current_step:0, goal_met:false, enrolled_at:now(), updated_at:now() };
        enrolments.push(newEnr);
        changes = true;
        console.log(`[Sequencer] Enrolled ${client.company_name} in sequence: ${seq.name}`);
      }
    }

    // 3. Process active enrolments for this client
    const activeEnrs = enrolments.filter(e => e.client_id === client.id && e.status === 'active');
    for (const enr of activeEnrs) {
      const seq = sequences.find(s => s.id === enr.sequence_id);
      if (!seq) continue;

      // Check if goal already met
      if (!enr.goal_met && isGoalMet(seq.goal, client)) {
        enr.goal_met = true;
        enr.goal_met_at = now();
        enr.status = 'completed';
        enr.updated_at = now();
        changes = true;
        console.log(`[Sequencer] Goal met for ${client.company_name} in sequence: ${seq.name}`);
        continue;
      }

      // Get ordered steps for this sequence
      const seqSteps = steps
        .filter(s => s.sequence_id === seq.id && !s.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order);

      if (!seqSteps.length) continue;

      // Find the current step to send
      const currentStepIdx = enr.current_step || 0;
      if (currentStepIdx >= seqSteps.length) {
        // All steps sent — complete
        enr.status = 'completed';
        enr.updated_at = now();
        changes = true;
        continue;
      }

      const step = seqSteps[currentStepIdx];

      // Check if this step has already been sent
      const alreadySent = sendLog.find(l => l.enrolment_id === enr.id && l.step_id === step.id);
      if (alreadySent) continue;

      // Check delay — when should this step send?
      const referenceTime = currentStepIdx === 0
        ? new Date(enr.enrolled_at)
        : (() => {
            const prevStep = seqSteps[currentStepIdx - 1];
            const prevSend = sendLog.find(l => l.enrolment_id === enr.id && l.step_id === prevStep?.id);
            return prevSend ? new Date(prevSend.sent_at) : new Date(enr.enrolled_at);
          })();

      const totalDelayHours = (step.delay_days || 0) * 24 + (step.delay_hours || 0);
      const hoursSinceRef = hoursBetween(referenceTime, nowTs);
      if (hoursSinceRef < totalDelayHours) continue; // Not time yet

      // Check condition
      if (step.condition === 'goal_not_met' && enr.goal_met) continue;
      if (step.condition === 'email_opened') {
        // Previous step must have been opened
        const prevStep = seqSteps[currentStepIdx - 1];
        if (prevStep) {
          const prevSend = sendLog.find(l => l.enrolment_id === enr.id && l.step_id === prevStep.id);
          if (!prevSend?.opened) continue;
        }
      }
      if (step.condition === 'email_not_opened') {
        const prevStep = seqSteps[currentStepIdx - 1];
        if (prevStep) {
          const prevSend = sendLog.find(l => l.enrolment_id === enr.id && l.step_id === prevStep.id);
          if (prevSend?.opened) continue;
        }
      }

      // Get template
      const template = templates.find(t => t.id === step.template_id && !t.deleted_at);
      if (!template) {
        console.warn(`[Sequencer] Template not found for step ${step.id}`);
        enr.current_step = currentStepIdx + 1;
        enr.updated_at = now();
        changes = true;
        continue;
      }

      // Send!
      const sent = await sendStepEmail(enr, step, template, client);
      if (sent) {
        enr.current_step = currentStepIdx + 1;
        enr.last_sent_at = now();
        enr.updated_at = now();
        changes = true;
        console.log(`[Sequencer] Sent step ${currentStepIdx + 1}/${seqSteps.length} to ${client.company_name}`);
      }
    }
  }

  if (changes) {
    // Persist all mutations
    store.superadmin_clients = clients;
    store.email_enrolments   = enrolments;
    store.email_send_log     = sendLog;
    saveStore(store);
  }

  console.log('[Sequencer] Cycle complete', now());
}

module.exports = { runSequencerCycle, detectMilestones };
