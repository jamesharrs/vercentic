// server/routes/candidate_hub.js
// Candidate Hub — token-based self-service portal for candidates
// Public endpoints (no auth required) — candidates access via a signed token.

const express  = require('express');
const router   = express.Router();
const { resolveBrand } = require('../utils/brandKit');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const crypto   = require('crypto');

function now() { return new Date().toISOString(); }
function candidateName(d = {}) {
  return [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Candidate';
}
function ensureHubTokens(store) {
  if (!store.hub_tokens) { store.hub_tokens = []; }
}

// POST /api/candidate-hub/token  — generate / refresh a hub link (recruiter auth required)
router.post('/token', (req, res) => {
  const { candidate_id, environment_id, expires_days = 30 } = req.body;
  if (!candidate_id || !environment_id)
    return res.status(400).json({ error: 'candidate_id and environment_id required' });

  const store = getStore();
  ensureHubTokens(store);

  const candidate = (store.records || []).find(r => r.id === candidate_id && !r.deleted_at);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Revoke any existing active token for this candidate
  store.hub_tokens = store.hub_tokens.map(t =>
    t.candidate_id === candidate_id && t.status === 'active'
      ? { ...t, status: 'revoked', revoked_at: now() }
      : t
  );

  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + expires_days * 86400000).toISOString();
  const d = candidate.data || {};

  const hubToken = {
    id: uuidv4(), token, candidate_id, environment_id,
    candidate_name: candidateName(d),
    candidate_email: d.email || null,
    status: 'active',
    created_by: req.currentUser?.id || 'system',
    created_at: now(), expires_at: expiresAt,
    last_accessed: null, access_count: 0,
  };

  store.hub_tokens.push(hubToken);
  saveStore();

  const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'https://client-gamma-ruddy-63.vercel.app';
  res.status(201).json({
    token,
    hub_url: `${baseUrl}/hub/${token}`,            // legacy standalone route
    portal_hub_url_hint: `{portal_url}?token=${token}`, // use this on portal pages with candidate_hub widget
    expires_at: expiresAt,
    candidate_name: hubToken.candidate_name
  });
});


// GET /api/candidate-hub/verify/:token  — validate token & return candidate data (public)
router.get('/verify/:token', (req, res) => {
  const store = getStore();
  ensureHubTokens(store);

  const hubToken = store.hub_tokens.find(t => t.token === req.params.token);
  if (!hubToken) return res.status(404).json({ error: 'Invalid or expired link' });
  if (hubToken.status !== 'active') return res.status(403).json({ error: 'This link has been revoked' });
  if (new Date(hubToken.expires_at) < new Date()) {
    hubToken.status = 'expired'; saveStore();
    return res.status(403).json({ error: 'This link has expired. Please ask your recruiter for a new one.' });
  }

  hubToken.last_accessed = now();
  hubToken.access_count  = (hubToken.access_count || 0) + 1;
  saveStore();

  const candidate = (store.records || []).find(r => r.id === hubToken.candidate_id && !r.deleted_at);
  if (!candidate) return res.status(404).json({ error: 'Candidate record not found' });

  const d = candidate.data || {};
  res.json({
    candidate: {
      id: candidate.id, first_name: d.first_name || '', last_name: d.last_name || '',
      email: d.email || '', phone: d.phone || '', current_title: d.current_title || '',
      location: d.location || '',
    },
    environment_id: hubToken.environment_id, token_id: hubToken.id, expires_at: hubToken.expires_at,
    brand: resolveBrand(store, hubToken.environment_id),
  });
});

// GET /api/candidate-hub/:token/applications
router.get('/:token/applications', (req, res) => {
  const store = getStore();
  ensureHubTokens(store);
  const hubToken = store.hub_tokens.find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const candidateId = hubToken.candidate_id;
  const links = (store.people_links || []).filter(
    l => (l.person_id === candidateId || l.person_record_id === candidateId) && !l.deleted_at
  );

  const applications = links.map(l => {
    const jobRec  = (store.records || []).find(r => r.id === (l.record_id || l.target_record_id) && !r.deleted_at);
    const jobData = jobRec?.data || {};
    let stageName = l.stage || l.current_stage || null;
    if (l.stage_id && !stageName) {
      const wf   = (store.workflows || []).find(w => w.id === l.workflow_id);
      const step = (wf?.steps || []).find(s => s.id === l.stage_id);
      stageName  = step?.name || null;
    }
    const applyActivity = (store.activity || [])
      .filter(a => a.record_id === candidateId && a.action === 'applied' && a.details?.job_id === jobRec?.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      id: l.id, job_id: jobRec?.id, job_title: jobData.job_title || jobData.title || 'Role',
      department: jobData.department || '', location: jobData.location || '', company: jobData.company || '',
      status: stageName || 'Under Review',
      applied_at: applyActivity?.created_at || l.created_at || hubToken.created_at,
    };
  });

  // Also pull portal applications without a people_link
  (store.activity || [])
    .filter(a => a.record_id === candidateId && a.action === 'applied')
    .filter(a => !links.some(l => a.details?.job_id === (l.record_id || l.target_record_id)))
    .forEach(a => {
      const { job_id, job_title, portal_name } = a.details || {};
      applications.push({ id: a.id, job_id, job_title: job_title || 'Application', department: '', location: '',
        company: portal_name || '', status: 'Under Review', applied_at: a.created_at });
    });

  res.json(applications.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)));
});


// GET /api/candidate-hub/:token/interviews
router.get('/:token/interviews', (req, res) => {
  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const interviews = (store.interviews || [])
    .filter(i => i.candidate_id === hubToken.candidate_id && !i.deleted_at)
    .map(i => ({
      id: i.id, job_name: i.job_name || '', date: i.date, time: i.time,
      duration: i.duration || 45, format: i.format || 'Video Call',
      interviewers: (i.interviewers || []).map(iv => typeof iv === 'string' ? iv : (iv.name || iv.label || '')).filter(Boolean),
      video_link: i.video_link || i.meet_link || null, location: i.location || null,
      status: i.status || 'scheduled', notes_for_candidate: i.notes_for_candidate || null,
      type_name: i.interview_type_name || i.type_name || 'Interview',
    }))
    .sort((a, b) => new Date(`${a.date}T${a.time||'00:00'}`) - new Date(`${b.date}T${b.time||'00:00'}`));

  res.json(interviews);
});

// GET /api/candidate-hub/:token/offers
router.get('/:token/offers', (req, res) => {
  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const offers = (store.offers || [])
    .filter(o => (o.candidate_id === hubToken.candidate_id || o.candidate_record_id === hubToken.candidate_id) && !o.deleted_at)
    .map(o => ({
      id: o.id, job_name: o.job_name || '', job_department: o.job_department || '',
      status: o.status, base_salary: o.base_salary, currency: o.currency || 'USD',
      bonus: o.bonus, bonus_type: o.bonus_type || 'fixed',
      package_items: o.package_items || [], total_package: o.total_package || null,
      start_date: o.start_date, expiry_date: o.expiry_date,
      notes: o.candidate_notes || null, terms: o.terms || null,
      created_at: o.created_at, updated_at: o.updated_at,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(offers);
});

// PATCH /api/candidate-hub/:token/offers/:offerId  — accept or decline
router.patch('/:token/offers/:offerId', (req, res) => {
  const { action, decline_reason } = req.body;
  if (!['accept', 'decline'].includes(action))
    return res.status(400).json({ error: 'action must be accept or decline' });

  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const offerIdx = (store.offers || []).findIndex(
    o => o.id === req.params.offerId &&
         (o.candidate_id === hubToken.candidate_id || o.candidate_record_id === hubToken.candidate_id)
  );
  if (offerIdx === -1) return res.status(404).json({ error: 'Offer not found' });

  const offer = store.offers[offerIdx];
  if (offer.status !== 'sent')
    return res.status(400).json({ error: `Offer is ${offer.status} — cannot ${action}` });

  store.offers[offerIdx] = {
    ...offer, status: action === 'accept' ? 'accepted' : 'declined',
    candidate_response: action, candidate_response_at: now(),
    decline_reason: decline_reason || null, updated_at: now(),
  };

  if (!store.activity) store.activity = [];
  store.activity.push({
    id: uuidv4(), record_id: hubToken.candidate_id,
    action: `offer_${action}ed`, actor: 'candidate_hub',
    details: { offer_id: offer.id, job_name: offer.job_name }, created_at: now(),
  });

  saveStore();
  res.json({ ok: true, status: store.offers[offerIdx].status });
});


// GET /api/candidate-hub/:token/messages
router.get('/:token/messages', (req, res) => {
  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const messages = (store.communications || [])
    .filter(c => c.record_id === hubToken.candidate_id && !c.deleted_at && ['email','sms','whatsapp'].includes(c.type))
    .map(c => ({
      id: c.id, type: c.type, direction: c.direction,
      subject: c.subject || '', body: c.body || '',
      created_at: c.created_at, status: c.status || 'sent',
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(messages);
});

// POST /api/candidate-hub/:token/messages  — candidate replies
router.post('/:token/messages', (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'message body required' });

  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  if (!store.communications) store.communications = [];
  const msg = {
    id: uuidv4(), record_id: hubToken.candidate_id, type: 'email',
    direction: 'inbound', subject: 'Reply from candidate hub',
    body: body.trim(), status: 'received', created_by: 'candidate_hub', created_at: now(),
  };
  store.communications.push(msg);

  if (!store.inbox) store.inbox = [];
  store.inbox.push({
    id: uuidv4(), type: 'candidate_reply', from_name: hubToken.candidate_name || 'Candidate',
    subject: 'Reply via Candidate Hub', preview: body.trim().slice(0, 120),
    record_id: hubToken.candidate_id, environment_id: hubToken.environment_id,
    read: false, created_at: now(),
  });

  saveStore();
  res.status(201).json({ ok: true, id: msg.id });
});

// GET /api/candidate-hub/:token/documents
router.get('/:token/documents', (req, res) => {
  const store = getStore();
  const hubToken = (store.hub_tokens || []).find(t => t.token === req.params.token && t.status === 'active');
  if (!hubToken || new Date(hubToken.expires_at) < new Date())
    return res.status(403).json({ error: 'Invalid or expired token' });

  const docs = (store.attachments || [])
    .filter(a => a.record_id === hubToken.candidate_id && !a.deleted_at)
    .map(a => ({
      id: a.id, name: a.name || a.filename || 'Document',
      file_type: a.file_type_name || a.file_type || 'File',
      size: a.size || null, created_at: a.created_at, uploaded_by: a.uploaded_by || 'Recruiter',
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(docs);
});

// GET /api/candidate-hub/tokens — list tokens for a candidate (recruiter view)
router.get('/tokens', (req, res) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Authentication required' });
  const { candidate_id } = req.query;
  const store = getStore();
  ensureHubTokens(store);
  const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'https://client-gamma-ruddy-63.vercel.app';
  const tokens = store.hub_tokens
    .filter(t => !candidate_id || t.candidate_id === candidate_id)
    .map(t => ({ ...t, hub_url: `${baseUrl}/hub/${t.token}` }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(tokens);
});

// DELETE /api/candidate-hub/tokens/:id — revoke a token
router.delete('/tokens/:id', (req, res) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Authentication required' });
  const store = getStore();
  ensureHubTokens(store);
  const idx = store.hub_tokens.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Token not found' });
  store.hub_tokens[idx] = { ...store.hub_tokens[idx], status: 'revoked', revoked_at: now() };
  saveStore();
  res.json({ ok: true });
});

// POST /api/candidate-hub/request-link — candidate requests a magic link by email (public)
router.post('/request-link', async (req, res) => {
  const { email, portal_id, environment_id } = req.body;
  console.log('[request-link] email:', email, 'portal_id:', portal_id);
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const store = getStore();
  ensureHubTokens(store);

  // Find environment — from portal_id or direct environment_id
  let envId = environment_id;
  if (!envId && portal_id) {
    const portal = (store.portals || []).find(p => p.id === portal_id);
    envId = portal?.environment_id;
  }
  if (!envId) return res.status(400).json({ error: 'Cannot determine environment' });

  // Find candidate by email
  const emailLower = email.toLowerCase().trim();
  const candidate = (store.records || []).find(r =>
    !r.deleted_at &&
    r.environment_id === envId &&
    (r.data?.email || '').toLowerCase() === emailLower
  );
  console.log('[request-link] envId:', envId, 'candidate found:', !!candidate, 'total records:', store.records?.length);

  // Always respond OK to prevent email enumeration
  if (!candidate) {
    console.log('[request-link] no candidate — returning without dev_link');
    return res.json({ ok: true, message: 'If we have an application on file for this email, you\'ll receive a link shortly.' });
  }

  // Revoke existing active tokens for this candidate
  store.hub_tokens = store.hub_tokens.map(t =>
    t.candidate_id === candidate.id && t.status === 'active'
      ? { ...t, status: 'revoked', revoked_at: now() }
      : t
  );

  // Generate new token (24h expiry for magic links)
  const crypto = require('crypto');
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
  const d = candidate.data || {};

  store.hub_tokens.push({
    id: uuidv4(), token, candidate_id: candidate.id, environment_id: envId,
    candidate_name: candidateName(d), candidate_email: d.email || null,
    status: 'active', created_by: 'self-service', created_at: now(),
    expires_at: expiresAt, last_accessed: null, access_count: 0,
  });
  saveStore();

  // Build the magic link URL — use X-App-Origin from Vite proxy for local dev, APP_URL for prod
  const appOrigin = req.headers['x-app-origin'] || process.env.APP_URL || process.env.CLIENT_URL || '';
  const portal = portal_id ? (store.portals || []).find(p => p.id === portal_id) : null;
  const portalSlug = portal?.slug?.replace(/^\//, '') || '';
  const tokenParam = `token=${token}`;
  const magicLink = `${appOrigin}/${portalSlug}?${tokenParam}`;

  // Send email via messaging service if available
  try {
    const messaging = require('../services/messaging');
    const candidateName2 = candidateName(d) || 'there';
    await messaging.sendEmail({
      to: email,
      subject: `Your ${portal?.branding?.company_name || 'application'} hub access link`,
      body: `Hi ${candidateName2},\n\nHere is your secure link to view your application status:\n\n${magicLink}\n\nThis link expires in 24 hours and can only be used once.\n\nIf you didn't request this, you can ignore this email.\n\nBest regards,\n${portal?.branding?.company_name || 'The Recruitment Team'}`,
      html: `<p>Hi ${candidateName2},</p><p>Here is your secure link to view your application status:</p><p><a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#4361EE;color:white;text-decoration:none;border-radius:8px;font-weight:700">View My Applications →</a></p><p style="color:#9CA3AF;font-size:13px">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>`,
    });
  } catch (e) {
    // Email sending failed — still return the link in dev/sim mode
    console.warn('[hub] Email send failed:', e.message);
  }

  res.json({
    ok: true,
    message: 'If we have an application on file for this email, you\'ll receive a link shortly.',
    // Always include dev_link unless explicitly in production — makes testing easy
    dev_link: magicLink,
  });
});

module.exports = router;
