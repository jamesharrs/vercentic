/**
 * Candidate Hub — server/routes/hub.js
 * Magic-link auth + data endpoints for the candidate-facing hub.
 */

const express  = require('express');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const { getStore, saveStore } = require('../db/init');
const { sendEmail } = require('../services/messaging');

const router = express.Router();

const JWT_SECRET    = process.env.HUB_JWT_SECRET || 'vercentic-hub-secret-change-in-prod';
const TOKEN_TTL_MS  = 15 * 60 * 1000;
const SESSION_TTL_S = 7 * 24 * 3600;
const BASE_URL      = process.env.APP_BASE_URL || 'https://www.vercentic.com';

function uid() { return crypto.randomUUID(); }

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    req.hubSession = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function evaluateConditions(conditions = [], logic = 'and', personData = {}, jobData = {}) {
  if (!conditions.length) return true;
  const results = conditions.map(c => {
    const src  = c.source === 'job' ? jobData : personData;
    const raw  = src[c.field];
    const val  = raw === undefined || raw === null ? '' : String(raw).toLowerCase().trim();
    const cVal = String(c.value || '').toLowerCase().trim();
    switch (c.operator) {
      case 'eq':         return val === cVal;
      case 'neq':        return val !== cVal;
      case 'contains':   return val.includes(cVal);
      case 'gt':         return parseFloat(val) > parseFloat(cVal);
      case 'lt':         return parseFloat(val) < parseFloat(cVal);
      case 'is_set':     return raw !== undefined && raw !== null && raw !== '';
      case 'is_not_set': return raw === undefined || raw === null || raw === '';
      default:           return true;
    }
  });
  return logic === 'or' ? results.some(Boolean) : results.every(Boolean);
}

function resolveHubConfig(workflow, stageId, personData, jobData) {
  if (!workflow) return null;
  const step = (workflow.steps || []).find(s => s.id === stageId);
  if (!step) return null;
  const hub = step.hub_config || {};
  if (!hub.sections) return null;
  const conditionsPass = evaluateConditions(
    hub.conditions || [], hub.conditions_logic || 'and', personData, jobData
  );
  if (!conditionsPass) return null;
  return {
    sections:         hub.sections || {},
    message:          hub.message || '',
    step_name:        step.name,
    notify_candidate: !!hub.notify_candidate,
  };
}

// POST /api/hub/request-link
router.post('/request-link', async (req, res) => {
  const { email, portal_id } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const store = getStore();
  const person = (store.records || []).find(r =>
    r.data?.email?.toLowerCase() === email.toLowerCase().trim() && !r.deleted_at
  );
  if (!person) return res.json({ ok: true, message: 'If an account exists, a link has been sent.' });

  if (store.hub_tokens) {
    store.hub_tokens = store.hub_tokens.map(t =>
      t.person_id === person.id && !t.used ? { ...t, used: true } : t
    );
  }
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  if (!store.hub_tokens) store.hub_tokens = [];
  store.hub_tokens.push({
    id: uid(), person_id: person.id,
    environment_id: person.environment_id,
    portal_id: portal_id || null,
    token, expires_at: expiresAt, used: false,
    created_at: new Date().toISOString(),
  });
  saveStore();

  const portal = portal_id ? (store.portals || []).find(p => p.id === portal_id && !p.deleted_at) : null;
  const companyName = portal?.theme?.companyName || portal?.branding?.company_name || 'Vercentic';
  const brandColor  = portal?.theme?.primaryColor || '#4361EE';
  const firstName   = person.data?.first_name || 'there';
  const hubUrl      = `${BASE_URL}/hub?token=${token}${portal_id ? `&portal_id=${portal_id}` : ''}`;

  const emailHtml = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="width:40px;height:40px;border-radius:10px;background:${brandColor};margin-bottom:24px;"></div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#0F1729;">Your application hub link</h2>
    <p style="color:#4B5675;line-height:1.6;margin:0 0 24px;">Hi ${firstName}, click below to access your candidate hub. This link expires in 15 minutes.</p>
    <a href="${hubUrl}" style="display:inline-block;padding:12px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Open my hub →</a>
    <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
  </div>`;

  try {
    await sendEmail({ to: email, subject: `Your ${companyName} application hub`, html: emailHtml,
      text: `Hi ${firstName},\n\nClick here to access your hub:\n${hubUrl}\n\nExpires in 15 minutes.` });
  } catch (e) { console.error('[hub] Email send failed:', e.message); }

  res.json({ ok: true, message: 'If an account exists, a link has been sent.' });
});

// GET /api/hub/verify
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });
  const store = getStore();
  const idx   = (store.hub_tokens || []).findIndex(t => t.token === token && !t.used);
  if (idx === -1) return res.status(401).json({ error: 'Invalid or expired link' });
  const hubToken = store.hub_tokens[idx];
  if (new Date(hubToken.expires_at) < new Date()) {
    store.hub_tokens[idx].used = true; saveStore();
    return res.status(401).json({ error: 'This link has expired. Request a new one.' });
  }
  store.hub_tokens[idx].used    = true;
  store.hub_tokens[idx].used_at = new Date().toISOString();
  saveStore();
  const sessionToken = jwt.sign(
    { person_id: hubToken.person_id, environment_id: hubToken.environment_id, portal_id: hubToken.portal_id },
    JWT_SECRET, { expiresIn: SESSION_TTL_S }
  );
  res.json({ ok: true, session_token: sessionToken });
});

// GET /api/hub/profile
router.get('/profile', requireAuth, (req, res) => {
  const { person_id } = req.hubSession;
  const store = getStore();
  const person = (store.records || []).find(r => r.id === person_id && !r.deleted_at);
  if (!person) return res.status(404).json({ error: 'Profile not found' });
  res.json({
    id: person.id, first_name: person.data?.first_name || '',
    last_name: person.data?.last_name || '', email: person.data?.email || '',
    phone: person.data?.phone || '', avatar_url: person.data?.avatar_url || null,
    created_at: person.created_at,
  });
});

// GET /api/hub/applications
router.get('/applications', requireAuth, (req, res) => {
  const { person_id, portal_id } = req.hubSession;
  const store  = getStore();
  const person = (store.records || []).find(r => r.id === person_id && !r.deleted_at);
  if (!person) return res.status(404).json({ error: 'Not found' });

  const portal  = portal_id ? (store.portals || []).find(p => p.id === portal_id) : null;
  const rpoMode = portal?.hub?.rpo_mode || false;

  let applications = (store.activity || []).filter(a => a.record_id === person_id && a.action === 'applied');
  if (rpoMode && portal_id) applications = applications.filter(a => a.details?.portal_id === portal_id);

  const enriched = applications.map(app => {
    const { job_id, job_title, portal_name } = app.details || {};
    const link     = (store.people_links || []).find(l => l.person_id === person_id && (job_id ? l.record_id === job_id : true));
    const workflow = link?.workflow_id ? (store.workflows || []).find(w => w.id === link.workflow_id) : null;
    const jobRecord = job_id ? (store.records || []).find(r => r.id === job_id && !r.deleted_at) : null;
    const hubConfig = resolveHubConfig(workflow, link?.stage_id, person.data || {}, jobRecord?.data || {});
    const stages = (workflow?.steps || []).map((s, i) => ({ id: s.id, name: s.name, position: i }));
    const currentStageIndex = stages.findIndex(s => s.id === link?.stage_id);
    return {
      id: app.id, applied_at: app.created_at, job_id,
      job_title: job_title || 'Application', portal_name,
      stage_id: link?.stage_id || null,
      stage_name: stages[currentStageIndex]?.name || null,
      stage_index: currentStageIndex, stages, hub_config: hubConfig,
      status: !link ? 'Under Review' : !hubConfig ? 'Under Review' : hubConfig.message || hubConfig.step_name || 'In Progress',
    };
  });
  enriched.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  res.json(enriched);
});

// GET /api/hub/interviews
router.get('/interviews', requireAuth, (req, res) => {
  const { person_id } = req.hubSession;
  const store  = getStore();
  const person = (store.records || []).find(r => r.id === person_id && !r.deleted_at);
  if (!person) return res.status(404).json({ error: 'Not found' });
  const interviews = (store.interviews || [])
    .filter(i => i.candidate_id === person_id && !i.deleted_at)
    .map(i => {
      const jobRecord = i.job_id ? (store.records || []).find(r => r.id === i.job_id && !r.deleted_at) : null;
      const link      = (store.people_links || []).find(l => l.person_id === person_id && (i.job_id ? l.record_id === i.job_id : true));
      const workflow  = link?.workflow_id ? (store.workflows || []).find(w => w.id === link.workflow_id) : null;
      const hubConfig = resolveHubConfig(workflow, link?.stage_id, person.data || {}, jobRecord?.data || {});
      const visible   = !hubConfig || hubConfig.sections?.interviews !== false;
      return {
        id: i.id, job_id: i.job_id, job_title: jobRecord?.data?.job_title || 'Role',
        date: i.date, time: i.time, duration_min: i.duration_min || 45,
        format: i.format || 'Video Call', location: i.location || i.video_link || '',
        interviewers: i.interviewers || [], notes: i.candidate_notes || '',
        status: i.status || 'scheduled', visible,
      };
    }).filter(i => i.visible);
  const now = new Date();
  interviews.sort((a, b) => {
    const da = new Date(`${a.date}T${a.time || '00:00'}`);
    const db = new Date(`${b.date}T${b.time || '00:00'}`);
    const aUp = da >= now, bUp = db >= now;
    if (aUp !== bUp) return aUp ? -1 : 1;
    return aUp ? da - db : db - da;
  });
  res.json(interviews);
});

// GET /api/hub/offers
router.get('/offers', requireAuth, (req, res) => {
  const { person_id } = req.hubSession;
  const store  = getStore();
  const person = (store.records || []).find(r => r.id === person_id && !r.deleted_at);
  if (!person) return res.status(404).json({ error: 'Not found' });
  const offers = (store.offers || [])
    .filter(o => o.candidate_id === person_id && !o.deleted_at && ['sent','accepted','declined','expired'].includes(o.status))
    .map(o => {
      const jobRecord = o.job_id ? (store.records || []).find(r => r.id === o.job_id && !r.deleted_at) : null;
      const link      = (store.people_links || []).find(l => l.person_id === person_id && (o.job_id ? l.record_id === o.job_id : true));
      const workflow  = link?.workflow_id ? (store.workflows || []).find(w => w.id === link.workflow_id) : null;
      const hubConfig = resolveHubConfig(workflow, link?.stage_id, person.data || {}, jobRecord?.data || {});
      const visible   = !hubConfig || hubConfig.sections?.offers !== false;
      return {
        id: o.id, job_id: o.job_id, job_title: jobRecord?.data?.job_title || 'Offer',
        status: o.status, base_salary: o.base_salary, currency: o.currency || 'AED',
        bonus: o.bonus, start_date: o.start_date, expiry_date: o.expiry_date,
        notes: o.candidate_notes || '', visible,
      };
    }).filter(o => o.visible);
  res.json(offers);
});

// PATCH /api/hub/offers/:id — accept or decline
router.patch('/offers/:id', requireAuth, (req, res) => {
  const { person_id } = req.hubSession;
  const { action, notes } = req.body;
  if (!['accept','decline'].includes(action)) return res.status(400).json({ error: 'action must be accept or decline' });
  const store = getStore();
  const idx   = (store.offers || []).findIndex(o => o.id === req.params.id && o.candidate_id === person_id && !o.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Offer not found' });
  store.offers[idx] = { ...store.offers[idx], status: action === 'accept' ? 'accepted' : 'declined',
    candidate_notes: notes || store.offers[idx].candidate_notes || '',
    responded_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!store.activity) store.activity = [];
  store.activity.push({ id: uid(), record_id: person_id, action: `offer_${action}d`,
    actor: 'candidate', details: { offer_id: req.params.id, notes }, created_at: new Date().toISOString() });
  saveStore();
  res.json(store.offers[idx]);
});

// GET /api/hub/portal-branding  (public)
router.get('/portal-branding', (req, res) => {
  const { portal_id } = req.query;
  if (!portal_id) return res.json({ branding: {} });
  const store  = getStore();
  const portal = (store.portals || []).find(p => p.id === portal_id && !p.deleted_at);
  if (!portal) return res.json({ branding: {} });
  const theme = portal.theme || portal.branding || {};
  res.json({
    branding: { primaryColor: theme.primaryColor || '#4361EE', bgColor: theme.bgColor || '#EEF2FF',
      textColor: theme.textColor || '#0F1729', fontFamily: theme.fontFamily || 'Inter, sans-serif',
      borderRadius: theme.borderRadius || '12px', buttonStyle: theme.buttonStyle || 'filled',
      companyName: theme.companyName || 'Vercentic', logoUrl: portal.nav?.logoUrl || theme.logoUrl || '',
      tagline: theme.tagline || portal.hub?.tagline || 'Track your application journey' },
    hub: portal.hub || {},
  });
});

try { const s = getStore(); if (!s.hub_tokens) { s.hub_tokens = []; saveStore(); } } catch(e) { console.error('Hub store init:', e.message); }

module.exports = router;
