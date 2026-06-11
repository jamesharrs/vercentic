'use strict';
// server/routes/email_sequencer.js
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, tenantStorage } = require('../db/init');

const now = () => new Date().toISOString();
function getCol(col) { const s=getStore(); if(!s[col])s[col]=[]; return s[col]; }
function saveCol(col,data) { const s=getStore(); s[col]=data; saveStore(); }

// ── Force master store context for all sequencer routes ───────────────────────
// Sequences are global (not per-tenant). This guards against a browser session
// that was scoped to a tenant store — reads and writes always hit master.
router.use((req, res, next) => {
  req.session.tenantSlug = 'master';
  tenantStorage.run('master', next);
});

const MILESTONES = [
  { id:'client_provisioned',    label:'Client provisioned' },
  { id:'first_login',           label:'Admin first login' },
  { id:'no_login_24h',          label:'No login after 24 hours' },
  { id:'no_login_72h',          label:'No login after 3 days' },
  { id:'first_record_created',  label:'First record created' },
  { id:'no_record_7d',          label:'No records after 7 days' },
  { id:'first_user_invited',    label:'First team member invited' },
  { id:'first_workflow',        label:'First workflow configured' },
  { id:'first_portal_published',label:'First portal published' },
  { id:'day_14_active',         label:'Active at 14 days' },
  { id:'day_30_active',         label:'Active at 30 days' },
  { id:'day_30_inactive',       label:'Inactive at 30 days' },
];

const SEQUENCE_GOALS = [
  { id:'none',                  label:'No goal — send all steps' },
  { id:'first_login',           label:'Admin logs in' },
  { id:'first_record_created',  label:'First record created' },
  { id:'first_user_invited',    label:'Team member invited' },
  { id:'first_workflow',        label:'First workflow created' },
  { id:'first_portal_published',label:'Portal published' },
];

router.get('/milestones', (req,res) => res.json({ milestones:MILESTONES, goals:SEQUENCE_GOALS }));

// ── Templates ────────────────────────────────────────────────────────────────
router.get('/templates', (req,res) => res.json(getCol('email_templates').filter(t=>!t.deleted_at && !t.environment_id)));

router.post('/templates', (req,res) => {
  const { name, subject, body_html, body_text, from_name, from_email, tags } = req.body;
  if (!name||!subject||!body_html) return res.status(400).json({ error:'name, subject, body_html required' });
  const t = { id:uuidv4(), name, subject, body_html, body_text:body_text||'', from_name:from_name||'Vercentic', from_email:from_email||process.env.SENDGRID_FROM_EMAIL||'hello@vercentic.com', tags:tags||[], created_at:now(), updated_at:now() };
  const col=getCol('email_templates'); col.push(t); saveCol('email_templates',col);
  res.status(201).json(t);
});

router.patch('/templates/:id', (req,res) => {
  const col=getCol('email_templates'); const idx=col.findIndex(t=>t.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  ['name','subject','body_html','body_text','from_name','from_email','tags'].forEach(k=>{if(req.body[k]!==undefined)col[idx][k]=req.body[k];});
  col[idx].updated_at=now(); saveCol('email_templates',col); res.json(col[idx]);
});

router.delete('/templates/:id', (req,res) => {
  const col=getCol('email_templates'); const idx=col.findIndex(t=>t.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  col[idx].deleted_at=now(); saveCol('email_templates',col); res.json({ok:true});
});

router.post('/templates/:id/test-send', async (req,res) => {
  const { to_email } = req.body;
  if(!to_email) return res.status(400).json({error:'to_email required'});
  const t=getCol('email_templates').find(t=>t.id===req.params.id);
  if(!t) return res.status(404).json({error:'Not found'});
  const sample={ client_name:'Acme Corp', admin_first_name:'James', admin_email:to_email, environment_name:'Acme Production', login_url:process.env.APP_URL||'https://app.vercentic.com', days_since_signup:'3' };
  try {
    const { sendEmail } = require('../services/messaging');
    await sendEmail({
      to:      to_email,
      subject: applyMerge(t.subject, sample),
      html:    applyMerge(t.body_html, sample),
      text:    applyMerge(t.body_text, sample),
    });
    res.json({ ok:true, message:`Test sent to ${to_email}` });
  } catch(e) { res.status(500).json({error:e.message}); }
});


// ── Sequences ────────────────────────────────────────────────────────────────
router.get('/sequences', (req,res) => {
  const seqs=getCol('email_sequences').filter(s=>!s.deleted_at);
  const steps=getCol('email_sequence_steps');
  res.json(seqs.map(s=>({...s, step_count:steps.filter(st=>st.sequence_id===s.id&&!st.deleted_at).length})));
});

router.post('/sequences', (req,res) => {
  const { name, description, trigger, goal, active } = req.body;
  if(!name||!trigger) return res.status(400).json({error:'name and trigger required'});
  const s={ id:uuidv4(), name, description:description||'', trigger, goal:goal||'none', active:active!==false, created_at:now(), updated_at:now() };
  const col=getCol('email_sequences'); col.push(s); saveCol('email_sequences',col);
  res.status(201).json(s);
});

router.patch('/sequences/:id', (req,res) => {
  const col=getCol('email_sequences'); const idx=col.findIndex(s=>s.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  ['name','description','trigger','goal','active'].forEach(k=>{if(req.body[k]!==undefined)col[idx][k]=req.body[k];});
  col[idx].updated_at=now(); saveCol('email_sequences',col); res.json(col[idx]);
});

router.delete('/sequences/:id', (req,res) => {
  const col=getCol('email_sequences'); const idx=col.findIndex(s=>s.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  col[idx].deleted_at=now(); saveCol('email_sequences',col); res.json({ok:true});
});

// Steps
router.get('/sequences/:id/steps', (req,res) => res.json(getCol('email_sequence_steps').filter(s=>s.sequence_id===req.params.id&&!s.deleted_at).sort((a,b)=>a.sort_order-b.sort_order)));

router.post('/sequences/:id/steps', (req,res) => {
  const seq=getCol('email_sequences').find(s=>s.id===req.params.id);
  if(!seq) return res.status(404).json({error:'Sequence not found'});
  const { template_id, delay_days, delay_hours, condition, subject_override } = req.body;
  if(!template_id) return res.status(400).json({error:'template_id required'});
  const steps=getCol('email_sequence_steps');
  const existing=steps.filter(s=>s.sequence_id===req.params.id&&!s.deleted_at);
  const step={ id:uuidv4(), sequence_id:req.params.id, template_id, delay_days:delay_days||0, delay_hours:delay_hours||0, condition:condition||'goal_not_met', subject_override:subject_override||null, sort_order:existing.length, created_at:now(), updated_at:now() };
  steps.push(step); saveCol('email_sequence_steps',steps);
  res.status(201).json(step);
});

router.patch('/sequences/:seqId/steps/:stepId', (req,res) => {
  const steps=getCol('email_sequence_steps'); const idx=steps.findIndex(s=>s.id===req.params.stepId);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  ['template_id','delay_days','delay_hours','condition','subject_override','sort_order'].forEach(k=>{if(req.body[k]!==undefined)steps[idx][k]=req.body[k];});
  steps[idx].updated_at=now(); saveCol('email_sequence_steps',steps); res.json(steps[idx]);
});

router.delete('/sequences/:seqId/steps/:stepId', (req,res) => {
  const steps=getCol('email_sequence_steps'); const idx=steps.findIndex(s=>s.id===req.params.stepId);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  steps[idx].deleted_at=now(); saveCol('email_sequence_steps',steps); res.json({ok:true});
});

// Stats
router.get('/sequences/:id/stats', (req,res) => {
  const log=getCol('email_send_log').filter(l=>l.sequence_id===req.params.id);
  const enrs=getCol('email_enrolments').filter(e=>e.sequence_id===req.params.id);
  const steps=getCol('email_sequence_steps').filter(s=>s.sequence_id===req.params.id&&!s.deleted_at).sort((a,b)=>a.sort_order-b.sort_order);
  res.json({
    total_enrolled:enrs.length, active:enrs.filter(e=>e.status==='active').length,
    completed:enrs.filter(e=>e.status==='completed').length, goal_met:enrs.filter(e=>e.goal_met).length,
    unsubscribed:enrs.filter(e=>e.status==='unsubscribed').length,
    total_sent:log.length, total_opened:log.filter(l=>l.opened).length, total_clicked:log.filter(l=>l.clicked).length,
    step_stats:steps.map(step=>{ const sent=log.filter(l=>l.step_id===step.id); return { step_id:step.id, sort_order:step.sort_order, sent:sent.length, opened:sent.filter(l=>l.opened).length, clicked:sent.filter(l=>l.clicked).length, open_rate:sent.length?Math.round(sent.filter(l=>l.opened).length/sent.length*100):0 }; })
  });
});


// ── Enrolments ───────────────────────────────────────────────────────────────
router.get('/enrolments', (req,res) => {
  let e=getCol('email_enrolments');
  if(req.query.client_id) e=e.filter(x=>x.client_id===req.query.client_id);
  if(req.query.sequence_id) e=e.filter(x=>x.sequence_id===req.query.sequence_id);
  res.json(e);
});

router.post('/enrolments', (req,res) => {
  const { client_id, sequence_id } = req.body;
  if(!client_id||!sequence_id) return res.status(400).json({error:'client_id and sequence_id required'});
  const col=getCol('email_enrolments');
  if(col.find(e=>e.client_id===client_id&&e.sequence_id===sequence_id&&e.status==='active')) return res.status(409).json({error:'Already enrolled'});
  const e={ id:uuidv4(), client_id, sequence_id, status:'active', current_step:0, goal_met:false, enrolled_at:now(), updated_at:now() };
  col.push(e); saveCol('email_enrolments',col); res.status(201).json(e);
});

router.patch('/enrolments/:id', (req,res) => {
  const col=getCol('email_enrolments'); const idx=col.findIndex(e=>e.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  ['status','current_step','goal_met'].forEach(k=>{if(req.body[k]!==undefined)col[idx][k]=req.body[k];});
  col[idx].updated_at=now(); saveCol('email_enrolments',col); res.json(col[idx]);
});

// ── Send Log ─────────────────────────────────────────────────────────────────
router.get('/send-log', (req,res) => {
  let log=getCol('email_send_log').sort((a,b)=>b.sent_at.localeCompare(a.sent_at));
  if(req.query.client_id) log=log.filter(l=>l.client_id===req.query.client_id);
  if(req.query.sequence_id) log=log.filter(l=>l.sequence_id===req.query.sequence_id);
  // Enrich older log entries that were saved before sequence_name was stored
  const sequences=getCol('email_sequences');
  const enriched=log.slice(0,200).map(l=>{
    if(l.sequence_name) return l;
    const seq=sequences.find(s=>s.id===l.sequence_id);
    return seq ? {...l, sequence_name:seq.name} : l;
  });
  res.json(enriched);
});

router.post('/send-log/:id/opened', (req,res) => {
  const log=getCol('email_send_log'); const idx=log.findIndex(l=>l.id===req.params.id);
  if(idx!==-1){log[idx].opened_at=now();log[idx].opened=true;saveCol('email_send_log',log);}
  res.json({ok:true});
});

// ── Unsubscribe (public — no auth) ───────────────────────────────────────────
router.get('/unsubscribe', (req,res) => {
  const { token } = req.query;
  if(!token) return res.status(400).send('Invalid link');
  try {
    const enrId=Buffer.from(token,'base64').toString('utf8');
    const col=getCol('email_enrolments'); const idx=col.findIndex(e=>e.id===enrId);
    if(idx!==-1){col[idx].status='unsubscribed';col[idx].unsubscribed_at=now();saveCol('email_enrolments',col);}
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Unsubscribed</h2><p>You won't receive further onboarding emails from Vercentic.</p></body></html>`);
  } catch(e) { res.status(400).send('Invalid token'); }
});

function applyMerge(str,data) { return (str||'').replace(/\{\{(\w+)\}\}/g,(_,k)=>data[k]??`{{${k}}}`); }

// ── fireMilestone — called from other server routes to trigger enrolled sequences
// Always runs in the master store context — sequences are global, not per-tenant.
// Pass client_id so we can create a proper enrolment record and avoid duplicate sends.
async function fireMilestone(milestoneId, { client_id, email, client_name, admin_name, env_name, login_url } = {}) {
  await tenantStorage.run('master', async () => {
    const sequences = getCol('email_sequences').filter(s =>
      s.trigger === milestoneId && s.active && !s.deleted_at
    );
    if (!sequences.length) {
      console.log(`[Sequencer] No active sequences for milestone: ${milestoneId}`);
      return;
    }

    // Mark the milestone as hit on the client record so the hourly cycle does not
    // re-detect it and create duplicate enrolments on the next tick.
    if (client_id) {
      const clients = getCol('clients');
      const cidx = clients.findIndex(c => c.id === client_id);
      if (cidx !== -1 && !(clients[cidx].milestones_hit || []).includes(milestoneId)) {
        clients[cidx].milestones_hit = [...(clients[cidx].milestones_hit || []), milestoneId];
        clients[cidx].updated_at = now();
        saveCol('clients', clients);
        console.log(`[Sequencer] Marked milestone ${milestoneId} on client ${client_id}`);
      }
    }

    const messaging = require('../services/messaging');
    for (const seq of sequences) {
      // ── Dedup: skip if already enrolled (prevents double-fire from signup + superadmin) ──
      if (client_id) {
        const existing = getCol('email_enrolments').find(e =>
          e.client_id === client_id && e.sequence_id === seq.id &&
          (e.status === 'active' || e.status === 'completed')
        );
        if (existing) {
          console.log(`[Sequencer] ${seq.name} already enrolled for client ${client_id} — skipping`);
          continue;
        }
        // Create the enrolment record so the cycle knows this client is enrolled
        // and won't re-fire step 0 when it runs.
        const enrolments = getCol('email_enrolments');
        enrolments.push({
          id: uuidv4(), client_id, sequence_id: seq.id,
          status: 'active', current_step: 0, goal_met: false,
          enrolled_at: now(), updated_at: now(),
        });
        saveCol('email_enrolments', enrolments);
        console.log(`[Sequencer] Enrolled client ${client_id} → ${seq.name}`);
      }

      const steps = getCol('email_sequence_steps')
        .filter(s => s.sequence_id === seq.id && !s.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (!steps.length) {
        console.log(`[Sequencer] ${seq.name} has no steps — skipping`);
        continue;
      }
      const firstStep = steps[0];
      // Only send immediately if step has no delay; otherwise the hourly cycle handles it.
      if (firstStep.delay_days > 0 || firstStep.delay_hours > 0) {
        console.log(`[Sequencer] ${seq.name} step 0 has delay (${firstStep.delay_days}d ${firstStep.delay_hours}h) — hourly cycle will send`);
        continue;
      }
      const template = getCol('email_templates').find(t => t.id === firstStep.template_id);
      if (!template) {
        console.log(`[Sequencer] Template ${firstStep.template_id} not found — skipping`);
        continue;
      }
      const interpolate = str => (str || '')
        .replace(/\{\{client_name\}\}/g, client_name || '')
        .replace(/\{\{admin_name\}\}/g, admin_name || '')
        .replace(/\{\{env_name\}\}/g, env_name || '')
        .replace(/\{\{email\}\}/g, email || '')
        .replace(/\{\{login_url\}\}/g, login_url || '');
      try {
        // logId defined below after result — pre-generate it here for pixel URL
        const logId = uuidv4();
        const _appUrl = process.env.APP_URL || 'https://talentos-production-4045.up.railway.app';
        const _pixelUrl = `${_appUrl}/api/superadmin/sequencer/track-open?log_id=${logId}`;
        const _trackedHtml = interpolate(template.body_html) + `<img src="${_pixelUrl}" width="1" height="1" alt="" style="display:none"/>`;
        const result = await messaging.sendEmail({
          to:       email,
          subject:  interpolate(firstStep.subject_override || template.subject),
          html:     _trackedHtml,
          text:     interpolate(template.body_text || ''),
          fromName: template.from_name,
          from:     template.from_email,
        });
        // Look up the enrolment we just created so we can attach enrolment_id to the
        // log entry — this lets the cycle's dedup check (sendLog.find by enrolment_id)
        // skip step 0 instead of re-sending it.
        const enr = client_id
          ? getCol('email_enrolments').find(e => e.client_id === client_id && e.sequence_id === seq.id)
          : null;
        const log = getCol('email_send_log');
        const _appUrl2 = process.env.APP_URL || 'https://talentos-production-4045.up.railway.app';
        const _trackedHtml2 = interpolate(template.body_html) + `<img src="${_appUrl2}/api/superadmin/sequencer/track-open?log_id=${logId}" width="1" height="1" alt="" style="display:none"/>`;
        log.push({
          id:           logId,
          enrolment_id: enr?.id || null,
          client_id:    client_id || null,
          sequence_id:  seq.id,
          sequence_name:seq.name || null,
          step_id:      firstStep.id,
          to_email:     email,
          subject:      interpolate(firstStep.subject_override || template.subject),
          body_html:    _trackedHtml2,
          status:       result.simulated ? 'simulated' : 'sent',
          sent_at:      now(),
        });
        saveCol('email_send_log', log);
        // Advance current_step past step 0 so the cycle picks up from step 1 onwards.
        if (enr) {
          const enrolments = getCol('email_enrolments');
          const eidx = enrolments.findIndex(e => e.id === enr.id);
          if (eidx !== -1) {
            enrolments[eidx].current_step = 1;
            enrolments[eidx].last_sent_at = now();
            enrolments[eidx].updated_at   = now();
            saveCol('email_enrolments', enrolments);
          }
        }
        console.log(`[Sequencer] ${seq.name} → ${email}: ${result.simulated ? 'simulated (no SendGrid creds)' : 'sent OK'}`);
      } catch (e) {
        console.error(`[Sequencer] Failed to send for ${seq.name} → ${email}:`, e.message);
      }
      // Brief pause between sequence sends — prevents provider rate-limit errors when
      // multiple sequences fire at once (e.g. several active client_provisioned sequences).
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });
}

module.exports = { router, MILESTONES, fireMilestone, applyMerge };
