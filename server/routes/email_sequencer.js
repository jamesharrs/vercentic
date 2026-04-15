'use strict';
// server/routes/email_sequencer.js
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

const now = () => new Date().toISOString();
function getCol(col) { const s=getStore(); if(!s[col])s[col]=[]; return s[col]; }
function saveCol(col,data) { const s=getStore(); s[col]=data; saveStore(s); }

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
router.get('/templates', (req,res) => res.json(getCol('email_templates').filter(t=>!t.deleted_at)));

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
  res.json(log.slice(0,200));
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
module.exports = { router, applyMerge };
