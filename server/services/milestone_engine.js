'use strict';
// server/services/milestone_engine.js
// Detects client milestones and fires sequence enrolments + email sends

const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { applyMerge } = require('../routes/email_sequencer');

const now = () => new Date().toISOString();
const daysBetween  = (a,b) => Math.floor((new Date(b)-new Date(a))/86400000);
const hoursBetween = (a,b) => Math.floor((new Date(b)-new Date(a))/3600000);

function getCol(col) { const s=getStore(); if(!s[col])s[col]=[]; return s[col]; }
function saveCol(col,data) { const s=getStore(); s[col]=data; saveStore(s); }

// ── Detect new milestones for a client ───────────────────────────────────────
function detectMilestones(client) {
  const hit = new Set(client.milestones_hit || []);
  const nowTs = new Date();
  const provisionedAt = new Date(client.created_at || nowTs);
  const daysSince  = daysBetween(provisionedAt, nowTs);
  const hoursSince = hoursBetween(provisionedAt, nowTs);
  const store = getStore();
  const envId = client.environment_id;

  const users    = (store.users    || []).filter(u=>u.environment_id===envId);
  const adminUser = users.find(u=>u.email===client.admin_email);
  const hasLoggedIn  = adminUser && (adminUser.login_count||0) > 0;
  const lastLoginDays = adminUser?.last_login ? daysBetween(adminUser.last_login, nowTs) : 999;

  const records   = (store.records   || []).filter(r=>r.environment_id===envId&&!r.deleted_at);
  const workflows = (store.workflows || []).filter(w=>w.environment_id===envId);
  const portals   = (store.portals   || []).filter(p=>p.environment_id===envId&&p.status==='live');

  const toMark = [];
  if(!hit.has('client_provisioned'))    toMark.push('client_provisioned');
  if(hasLoggedIn&&!hit.has('first_login')) toMark.push('first_login');
  if(!hasLoggedIn&&hoursSince>=24&&!hit.has('no_login_24h')) toMark.push('no_login_24h');
  if(!hasLoggedIn&&hoursSince>=72&&!hit.has('no_login_72h')) toMark.push('no_login_72h');
  if(records.length>0&&!hit.has('first_record_created')) toMark.push('first_record_created');
  if(!records.length&&daysSince>=7&&!hit.has('no_record_7d')) toMark.push('no_record_7d');
  if(users.length>1&&!hit.has('first_user_invited')) toMark.push('first_user_invited');
  if(workflows.length>0&&!hit.has('first_workflow')) toMark.push('first_workflow');
  if(portals.length>0&&!hit.has('first_portal_published')) toMark.push('first_portal_published');
  if(daysSince>=14&&hasLoggedIn&&lastLoginDays<=7&&!hit.has('day_14_active')) toMark.push('day_14_active');
  if(daysSince>=30&&hasLoggedIn&&lastLoginDays<=14&&!hit.has('day_30_active')) toMark.push('day_30_active');
  if(daysSince>=30&&lastLoginDays>14&&!hit.has('day_30_inactive')) toMark.push('day_30_inactive');
  return toMark;
}

function isGoalMet(goal, client) {
  if(!goal||goal==='none') return false;
  return (client.milestones_hit||[]).includes(goal);
}


// ── Send one step email ──────────────────────────────────────────────────────
async function sendStepEmail(enrolment, step, template, client) {
  const appUrl = process.env.APP_URL || 'https://app.vercentic.com';
  const mergeData = {
    client_name:       client.company_name || 'there',
    admin_first_name:  client.admin_first_name || client.admin_name?.split(' ')[0] || 'there',
    admin_email:       client.admin_email || '',
    environment_name:  client.environment_name || client.company_name || '',
    login_url:         appUrl,
    days_since_signup: String(daysBetween(client.created_at, now())),
    unsubscribe_url:   `${appUrl}/api/sequencer/unsubscribe?token=${Buffer.from(enrolment.id).toString('base64')}`,
  };

  const subject = applyMerge(step.subject_override||template.subject, mergeData);
  const html    = applyMerge(template.body_html, mergeData);
  const text    = applyMerge(template.body_text, mergeData);
  const footer  = `<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center"><a href="${mergeData.unsubscribe_url}" style="color:#9ca3af">Unsubscribe</a></div>`;
  const htmlFinal = html.includes('unsubscribe_url') ? html : html + footer;

  try {
    const { sendEmail } = require('../services/messaging');
    await sendEmail({
      to:      client.admin_email,
      subject,
      html:    htmlFinal,
      text,
    });
    const log = getCol('email_send_log');
    log.push({ id:uuidv4(), enrolment_id:enrolment.id, client_id:enrolment.client_id, sequence_id:enrolment.sequence_id, step_id:step.id, template_id:template.id, to_email:client.admin_email, subject, sent_at:now(), opened:false, clicked:false });
    saveCol('email_send_log', log);
    return true;
  } catch(e) { console.error('[Sequencer] Send failed:', e.message); return false; }
}

// ── Main hourly cycle ────────────────────────────────────────────────────────
async function runSequencerCycle() {
  console.log('[Sequencer] Cycle started', now());
  const store = getStore();
  const clients   = store.superadmin_clients || [];
  const sequences = (store.email_sequences||[]).filter(s=>s.active&&!s.deleted_at);
  const steps     = store.email_sequence_steps || [];
  const templates = store.email_templates || [];
  let enrolments  = store.email_enrolments || [];
  let sendLog     = store.email_send_log || [];
  let changes = false;

  for (const client of clients) {
    if(client.status==='suspended') continue;
    const newMilestones = detectMilestones(client);
    if(newMilestones.length) {
      client.milestones_hit = [...(client.milestones_hit||[]), ...newMilestones];
      client.updated_at = now(); changes = true;
      console.log(`[Sequencer] ${client.company_name} hit: ${newMilestones.join(', ')}`);
      for(const seq of sequences) {
        if(!newMilestones.includes(seq.trigger)) continue;
        const alreadyActive = enrolments.find(e=>e.client_id===client.id&&e.sequence_id===seq.id&&e.status==='active');
        const unsub = enrolments.find(e=>e.client_id===client.id&&e.sequence_id===seq.id&&e.status==='unsubscribed');
        if(alreadyActive||unsub) continue;
        const newEnr={ id:uuidv4(), client_id:client.id, sequence_id:seq.id, status:'active', current_step:0, goal_met:false, enrolled_at:now(), updated_at:now() };
        enrolments.push(newEnr); changes=true;
        console.log(`[Sequencer] Enrolled ${client.company_name} → ${seq.name}`);
      }
    }

    const activeEnrs = enrolments.filter(e=>e.client_id===client.id&&e.status==='active');
    for(const enr of activeEnrs) {
      const seq = sequences.find(s=>s.id===enr.sequence_id); if(!seq) continue;
      if(!enr.goal_met&&isGoalMet(seq.goal,client)) { enr.goal_met=true; enr.goal_met_at=now(); enr.status='completed'; enr.updated_at=now(); changes=true; continue; }
      const seqSteps = steps.filter(s=>s.sequence_id===seq.id&&!s.deleted_at).sort((a,b)=>a.sort_order-b.sort_order);
      if(!seqSteps.length) continue;
      const idx = enr.current_step||0;
      if(idx>=seqSteps.length) { enr.status='completed'; enr.updated_at=now(); changes=true; continue; }
      const step = seqSteps[idx];
      if(sendLog.find(l=>l.enrolment_id===enr.id&&l.step_id===step.id)) continue;
      const refTime = idx===0 ? new Date(enr.enrolled_at) : (() => { const prev=seqSteps[idx-1]; const ps=sendLog.find(l=>l.enrolment_id===enr.id&&l.step_id===prev?.id); return ps?new Date(ps.sent_at):new Date(enr.enrolled_at); })();
      const totalDelayHours = (step.delay_days||0)*24+(step.delay_hours||0);
      if(hoursBetween(refTime,new Date())<totalDelayHours) continue;
      if(step.condition==='goal_not_met'&&enr.goal_met) continue;
      const template = templates.find(t=>t.id===step.template_id&&!t.deleted_at);
      if(!template) { enr.current_step=idx+1; enr.updated_at=now(); changes=true; continue; }
      const sent = await sendStepEmail(enr,step,template,client);
      if(sent) { enr.current_step=idx+1; enr.last_sent_at=now(); enr.updated_at=now(); changes=true; sendLog=getCol('email_send_log'); }
    }
  }

  if(changes) { store.superadmin_clients=clients; store.email_enrolments=enrolments; saveStore(store); }
  console.log('[Sequencer] Cycle complete', now());
}

module.exports = { runSequencerCycle, detectMilestones };
