const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getStore, saveStore } = require('../db/init');

const uid = () => crypto.randomUUID();

function ensure() {
  const s = getStore();
  if (!s.portals) { s.portals = []; saveStore(); }
}

// GET / — list portals for an environment
router.get('/', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const rows = (store.portals || []).filter(p => p.environment_id === environment_id && !p.deleted_at);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

// GET /:id
router.get('/slug/:slug', (req, res) => {
  ensure();
  const store = getStore();
  const slug = req.params.slug.startsWith('/') ? req.params.slug : '/' + req.params.slug;
  const envId = req.query.environment_id; // optional — scopes lookup to specific environment

  const matches = (store.portals || []).filter(p =>
    (p.slug === slug || p.slug === req.params.slug) && (p.status === 'published' || req.currentUser) && !p.deleted_at
    && (!envId || p.environment_id === envId)
  );

  if (matches.length === 0) return res.status(404).json({ error: 'Not found or unpublished' });

  // If multiple matches and no environment filter, return the most recently updated
  const portal = matches.sort((a, b) =>
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )[0];

  res.json({ ...portal, branding: portal.theme || portal.branding || {}, type: portal.type || 'career_site' });
});


router.get('/:id', (req, res) => {
  ensure();
  const store = getStore();
  const portal = (store.portals || []).find(p => p.id === req.params.id && !p.deleted_at);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  res.json(portal);
});

// GET /slug/:slug — public lookup
// POST / — create
router.post('/', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const { environment_id, name, slug, status, theme, pages, description } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const store = getStore();
  const now = new Date().toISOString();
  const finalSlug = slug || `/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Enforce unique slug within environment
  const existing = (store.portals || []).find(p =>
    p.environment_id === environment_id && !p.deleted_at &&
    (p.slug === finalSlug || p.slug === finalSlug.replace(/^\//, ''))
  );
  if (existing) return res.status(409).json({ error: `Slug "${finalSlug}" already exists in this environment`, existing_id: existing.id });

  const rec = {
    id: uid(), environment_id, name,
    slug: finalSlug,
    description: description || '',
    status: status || 'draft',
    access_type: req.body.access_type || 'public',
    allowed_roles: req.body.allowed_roles || [],
    theme: theme || {},
    pages: pages || [],
    deleted_at: null, created_at: now, updated_at: now,
  };
  if (!store.portals) store.portals = [];
  store.portals.push(rec);
  saveStore();
  res.status(201).json(rec);
});

// PATCH /:id — update
router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Portal not found' });

  // If slug is being changed, enforce uniqueness within environment
  if (req.body.slug) {
    const portal = store.portals[idx];
    const newSlug = req.body.slug;
    const conflict = (store.portals || []).find(p =>
      p.id !== req.params.id && p.environment_id === portal.environment_id && !p.deleted_at &&
      (p.slug === newSlug || p.slug === newSlug.replace(/^\//, '') || ('/' + p.slug.replace(/^\//, '')) === newSlug)
    );
    if (conflict) return res.status(409).json({ error: `Slug "${newSlug}" already exists in this environment`, existing_id: conflict.id });
  }

  const allowed = ['name', 'slug', 'description', 'status', 'theme', 'pages', 'nav', 'footer', 'branding', 'gdpr', 'feedback', 'config', 'custom_domain', 'type', 'access_type', 'allowed_roles', 'copilot'];
  const updates = { updated_at: new Date().toISOString() };
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  store.portals[idx] = { ...store.portals[idx], ...updates };
  saveStore();
  res.json(store.portals[idx]);
});

// PATCH /:id/widget-config — surgically update a single widget's config
router.patch('/:id/widget-config', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Portal not found' });
  const { pageIndex = 0, rowIndex, cellIndex = 0, widgetConfig } = req.body;
  if (rowIndex === undefined || !widgetConfig) return res.status(400).json({ error: 'rowIndex and widgetConfig required' });
  const portal = store.portals[idx];
  const page = portal.pages?.[pageIndex];
  if (!page) return res.status(400).json({ error: 'Page not found at index ' + pageIndex });
  const row = page.rows?.[rowIndex];
  if (!row) return res.status(400).json({ error: 'Row not found at index ' + rowIndex });
  const cell = row.cells?.[cellIndex];
  if (!cell) return res.status(400).json({ error: 'Cell not found at index ' + cellIndex });
  cell.widgetConfig = { ...cell.widgetConfig, ...widgetConfig };
  portal.updated_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true, widgetConfig: cell.widgetConfig });
});

// DELETE /:id — soft delete
router.delete('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const idx = (store.portals || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.portals[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ deleted: true });
});

// POST /cleanup — deduplicate portals within each environment (keeps most recently updated)
router.post('/cleanup', (req, res) => {
  if (_checkGA(req, res, 'manage_portals') === false) return;
  ensure();
  const store = getStore();
  const portals = (store.portals || []).filter(p => !p.deleted_at);
  const seen = {};
  const removed = [];
  portals.forEach(p => {
    const key = `${p.environment_id}::${(p.slug || '').replace(/^\//, '').toLowerCase()}`;
    if (!seen[key]) seen[key] = [];
    seen[key].push(p);
  });
  Object.values(seen).forEach(group => {
    if (group.length <= 1) return;
    group.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    for (let i = 1; i < group.length; i++) {
      const idx = store.portals.findIndex(p => p.id === group[i].id);
      if (idx !== -1) {
        store.portals[idx].deleted_at = new Date().toISOString();
        removed.push({ id: group[i].id, name: group[i].name, slug: group[i].slug });
      }
    }
  });
  if (removed.length > 0) saveStore();
  res.json({ cleaned: removed.length, removed });
});


// ── Job Alerts signup ─────────────────────────────────────────────────────────
router.post('/job-alerts', (req, res) => {
  const { portal_id, environment_id, email, keywords, department } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { insert } = require('../db/init');
  insert('job_alerts', {
    portal_id: portal_id || null,
    environment_id: environment_id || null,
    email,
    keywords: keywords || '',
    department: department || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// ── Application status lookup ─────────────────────────────────────────────────
router.get('/application-status', (req, res) => {
  const { portal_id, email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { query } = require('../db/init');
  const people = query('records', function(r) {
    return (r.data && r.data.email || '').toLowerCase() === email.toLowerCase();
  });
  if (!people.length) return res.json({ applications: [] });
  const links = query('people_links', function(l) {
    return people.some(function(p) { return p.id === l.person_id; });
  });
  const applications = links.map(function(link) {
    return {
      job_title: link.target_title || 'Application',
      status: link.stage || 'Submitted',
      reference: (link.id || '').slice(0, 8).toUpperCase(),
      applied_at: link.created_at,
      message: null,
    };
  });
  res.json({ applications: applications });
});



// ── Check email — duplicate detection ─────────────────────────────────────────
router.get('/:id/apply/check-email', (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id);
    if (!portal) return res.status(404).json({ error:'Portal not found' });
    const email = (req.query.email||'').toLowerCase().trim();
    if (!email) return res.json({ exists:false });
    const jobId = req.query.job_id;
    const person = (store.records||[]).find(r=>r.data?.email?.toLowerCase()===email);
    if (!person) return res.json({ exists:false });
    const priorApplication = jobId ? (store.activity||[]).find(a=>a.record_id===person.id&&a.action==='applied'&&a.details?.job_id===jobId) : null;
    const priorAny = (store.activity||[]).find(a=>a.record_id===person.id&&a.action==='applied');
    // Return exists:true but do NOT return person data — that only comes after OTP verification
    res.json({ exists:true, already_applied_this_job:!!priorApplication, already_applied_any:!!priorAny });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// POST /api/portals/:id/apply/send-otp — send a 6-digit verification code
router.post('/:id/apply/send-otp', async (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id);
    if (!portal) return res.status(404).json({ error:'Portal not found' });
    const email = (req.body.email||'').toLowerCase().trim();
    if (!email) return res.status(400).json({ error:'email required' });

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    if (!store.wizard_otps) store.wizard_otps = [];
    // Remove any prior OTPs for this email+portal
    store.wizard_otps = store.wizard_otps.filter(o => !(o.email===email && o.portal_id===req.params.id));
    store.wizard_otps.push({ id:uid(), email, portal_id:req.params.id, code, expires_at:expiresAt, used:false });
    saveStore();

    // Try to send via messaging service; fall back to simulation
    let simulated = true;
    try {
      const { sendEmail } = require('../services/messaging');
      const portalName = portal.name || 'Career Portal';
      const result = await sendEmail({
        to: email,
        subject: `Your verification code — ${portalName}`,
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
        html: `<p style="font-family:sans-serif">Your verification code for <strong>${portalName}</strong> is:</p><p style="font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:0.1em">${code}</p><p style="font-family:sans-serif;color:#6b7280">This code expires in 10 minutes.</p>`,
      });
      if (!result.simulated) simulated = false;
    } catch {}

    res.json({ sent:true, simulated, ...(simulated ? { code } : {}) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// POST /api/portals/:id/apply/verify-otp — check code and return person data if valid
router.post('/:id/apply/verify-otp', (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id);
    if (!portal) return res.status(404).json({ error:'Portal not found' });
    const email = (req.body.email||'').toLowerCase().trim();
    const code  = (req.body.code||'').trim();
    if (!email || !code) return res.status(400).json({ error:'email and code required' });

    const otp = (store.wizard_otps||[]).find(o =>
      o.email===email && o.portal_id===req.params.id && !o.used
    );
    if (!otp) return res.status(400).json({ error:'No code found — please request a new one.' });
    if (new Date(otp.expires_at) < new Date()) return res.status(400).json({ error:'Code expired — please request a new one.' });
    if (otp.code !== code) return res.status(400).json({ error:'Incorrect code. Please try again.' });

    // Mark used
    otp.used = true;
    saveStore();

    // Return person data now that identity is verified
    const person = (store.records||[]).find(r=>r.data?.email?.toLowerCase()===email);
    const personData = person ? {
      first_name:person.data?.first_name||'', last_name:person.data?.last_name||'',
      phone:person.data?.phone||'', location:person.data?.location||'',
      current_title:person.data?.current_title||'', linkedin_url:person.data?.linkedin_url||'',
    } : {};

    res.json({ verified:true, person:personData });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Save draft ─────────────────────────────────────────────────────────────────
router.post('/:id/draft', (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id);
    if (!portal) return res.status(404).json({ error:'Portal not found' });
    const { email, job_id, form_data, step } = req.body;
    if (!email) return res.status(400).json({ error:'email required' });
    if (!store.application_drafts) store.application_drafts = [];
    const existing = store.application_drafts.find(d=>d.email===email&&d.job_id===job_id&&d.portal_id===req.params.id);
    const token = existing?.token || require('crypto').randomBytes(24).toString('hex');
    const draft = { id:existing?.id||uid(), token, portal_id:req.params.id, email, job_id:job_id||null, form_data:form_data||{}, step:step||1, created_at:existing?.created_at||new Date().toISOString(), updated_at:new Date().toISOString(), expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString() };
    if (existing) { store.application_drafts=store.application_drafts.map(d=>d.id===existing.id?draft:d); } else { store.application_drafts.push(draft); }
    saveStore();
    const baseUrl = process.env.PORTAL_BASE_URL || 'https://client-gamma-ruddy-63.vercel.app';
    const portalSlug = portal.slug || req.params.id;
    const resumeUrl = `${baseUrl}/${portalSlug}?resume_token=${token}&job_id=${job_id||''}`;
    try {
      const { sendEmail } = require('../services/messaging');
      sendEmail({ to:email, subject:`Continue your application — ${portal.branding?.company_name||'Us'}`, body:`Hi${draft.form_data.first_name?' '+draft.form_data.first_name:''},\n\nYou saved your application. Click below to continue:\n\n${resumeUrl}\n\nThis link expires in 7 days.` });
    } catch(_) {}
    res.json({ ok:true, token, resume_url:resumeUrl });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Resume draft ───────────────────────────────────────────────────────────────
router.get('/:id/draft/:token', (req, res) => {
  try {
    const store = getStore();
    const draft = (store.application_drafts||[]).find(d=>d.token===req.params.token&&d.portal_id===req.params.id);
    if (!draft) return res.status(404).json({ error:'Draft not found or expired' });
    if (new Date(draft.expires_at)<new Date()) return res.status(410).json({ error:'This link has expired. Please start a new application.' });
    res.json(draft);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ─── Wizard Submit — generic record creation (target object varies) ──────────
// POST /api/portals/:id/wizard/submit
router.post('/:id/wizard/submit', async (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id && !p.deleted_at);
    if (!portal) return res.status(404).json({ error:'Portal not found' });

    const wizard = portal.wizard || {};
    const { target_object='people', link_to_job=true } = wizard;
    const { form_data={}, job_id, meta={} } = req.body;

    // Find the target object for this environment
    const targetObj = (store.objects||[]).find(
      o => o.environment_id===portal.environment_id && (o.slug===target_object || o.slug===target_object.replace('_','-'))
    );
    if (!targetObj) return res.status(400).json({ error:`Object '${target_object}' not found` });

    // For people: de-duplicate on email
    let record;
    if (target_object==='people') {
      const email = form_data.email?.toLowerCase().trim();
      if (!email || !form_data.first_name)
        return res.status(400).json({ error:'first_name and email are required' });

      const existing = (store.records||[]).find(
        r=>r.object_id===targetObj.id && r.data?.email?.toLowerCase()===email
      );
      if (existing) {
        // Merge any new data onto existing record (not sq_ answers)
        existing.data = { ...existing.data, ...cleanFormData };
        existing.updated_at = new Date().toISOString();
        record = existing;
      } else {
        record = {
          id:uid(), object_id:targetObj.id, environment_id:portal.environment_id,
          data:{ status:'Active', source:'Portal', person_type:'Candidate', ...cleanFormData },
          created_by:'portal', created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
        };
        if (!store.records) store.records=[];
        store.records.push(record);
      }
    } else {
      // For other objects (jobs, etc.) always create new
      record = {
        id:uid(), object_id:targetObj.id, environment_id:portal.environment_id,
        data:{ status:'Draft', source:'Portal', ...cleanFormData },
        created_by:'portal', created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
      };
      if (!store.records) store.records=[];
      store.records.push(record);
    }

    // Link to a job record if requested
    if (link_to_job && job_id && target_object==='people') {
      if (!store.people_links) store.people_links=[];
      const alreadyLinked = store.people_links.find(l=>l.person_id===record.id && l.record_id===job_id);
      if (!alreadyLinked) {
        store.people_links.push({
          id:uid(), person_id:record.id, record_id:job_id,
          stage_id:null, workflow_id:null, added_by:'portal', added_at:new Date().toISOString(),
        });
      }
    }

    // Save activity log entry
    if (!store.activity) store.activity=[];
    store.activity.push({
      id:uid(), record_id:record.id, object_id:targetObj.id,
      environment_id:portal.environment_id,
      action:'wizard_submit', actor:'portal',
      details:{ portal_id:portal.id, portal_name:portal.name, job_id:job_id||null, ...meta },
      created_at:new Date().toISOString(),
    });

    // ── Extract and store screening question responses ────────────────────────
    // sq_* keys in form_data are screening answers — strip them from the record
    // and store in dedicated screening_responses collection
    const screeningAnswers = {};
    const cleanFormData = {};
    for (const [k, v] of Object.entries(form_data)) {
      if (k.startsWith('sq_')) screeningAnswers[k.replace('sq_', '')] = v;
      else cleanFormData[k] = v;
    }

    if (Object.keys(screeningAnswers).length > 0 && job_id) {
      // Load the screening rules to compute pass/fail
      const jobRules = (store.screening_job_rules||[]).filter(r=>r.record_id===job_id);
      let score = 0, totalWeight = 0, knockedOut = false;
      const results = {};
      for (const rule of jobRules) {
        const answerId = rule.id || rule.question_id;
        const answer = screeningAnswers[answerId];
        const hasOptions = (rule.question_options||[]).length > 0;
        let passed = true;
        if (hasOptions && rule.pass_value && answer !== undefined) {
          passed = String(answer).toLowerCase() === String(rule.pass_value).toLowerCase();
        }
        if (rule.rule_type === 'knockout' && hasOptions && !passed) knockedOut = true;
        if (rule.rule_type === 'preferred' && hasOptions && passed) {
          score += (rule.weight || 5);
        }
        totalWeight += (rule.rule_type === 'preferred' ? (rule.weight || 5) : 0);
        results[answerId] = { answer, passed, rule_type: rule.rule_type };
      }
      const scorePercent = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : null;

      if (!store.screening_responses) store.screening_responses = [];
      store.screening_responses.push({
        id: uid(),
        record_id: record.id,
        job_id,
        portal_id: req.params.id,
        environment_id: portal.environment_id,
        answers: screeningAnswers,
        results,
        score: scorePercent,
        knocked_out: knockedOut,
        submitted_at: new Date().toISOString(),
      });
    }

    // Save any form responses (from form_response blocks)
    const formResponses = req.body.form_responses || [];
    for (const fr of formResponses) {
      if (!fr.form_id || !fr.answers) continue;
      if (!store.form_responses) store.form_responses=[];
      store.form_responses.push({
        id:uid(), form_id:fr.form_id, record_id:record.id,
        object_id:targetObj.id, environment_id:portal.environment_id,
        answers:fr.answers, submitted_by:'portal', created_at:new Date().toISOString(),
      });
    }

    // Clear any saved wizard draft for this session
    if (req.body.draft_token) {
      const di = (store.wizard_drafts||[]).findIndex(d=>d.token===req.body.draft_token);
      if (di!==-1) { store.wizard_drafts[di].submitted_at=new Date().toISOString(); }
    }

    // ── Auto-create candidate hub account ──────────────────────────────────
    let hub_credentials = null;
    if (target_object === 'people' && form_data.email) {
      const email = form_data.email.toLowerCase().trim();
      const hashPw = (pw) => crypto.createHash('sha256').update(pw + 'vrc_portal_2026').digest('hex');
      if (!store.portal_users) store.portal_users = [];
      const existing_hub = store.portal_users.find(u => u.email === email);
      if (!existing_hub) {
        // Generate a readable temporary password
        const tempPw = crypto.randomBytes(4).toString('hex') + '-' + crypto.randomBytes(4).toString('hex');
        const fullName = [form_data.first_name, form_data.last_name].filter(Boolean).join(' ');
        store.portal_users.push({
          id: uid(), email, name: fullName || email,
          password_hash: hashPw(tempPw),
          client_id: portal.environment_id, client_name: portal.name || 'Career Portal',
          client_domain: portal.slug || '', role: 'candidate',
          record_id: record.id, status: 'active',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        hub_credentials = { email, password: tempPw, is_new: true };
      } else {
        // Account already exists — don't expose the password
        hub_credentials = { email, is_new: false };
      }
    }

    saveStore();
    res.json({ success:true, record_id:record.id, hub_credentials,
      is_new:!(target_object==='people' && !!record.created_at<new Date().toISOString()) });
  } catch(e) {
    console.error('Wizard submit error:',e);
    res.status(500).json({ error:e.message });
  }
});

// ─── Wizard Draft — save & resume progress ───────────────────────────────────
// POST /api/portals/:id/wizard/draft
router.post('/:id/wizard/draft', async (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id && !p.deleted_at);
    if (!portal) return res.status(404).json({ error:'Portal not found' });

    const { email, form_data={}, page_id, job_id } = req.body;
    if (!email) return res.status(400).json({ error:'email required to save progress' });

    if (!store.wizard_drafts) store.wizard_drafts=[];
    const existing = store.wizard_drafts.find(
      d=>d.email===email && d.portal_id===req.params.id && !d.submitted_at && (job_id?d.job_id===job_id:true)
    );
    const token = existing?.token || require('crypto').randomBytes(24).toString('hex');
    const draft = {
      id:existing?.id||uid(), token, portal_id:req.params.id,
      email, job_id:job_id||null, form_data, page_id:page_id||null,
      created_at:existing?.created_at||new Date().toISOString(),
      updated_at:new Date().toISOString(),
      expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString(),
    };
    if (existing) {
      const idx = store.wizard_drafts.findIndex(d=>d.id===existing.id);
      store.wizard_drafts[idx]=draft;
    } else {
      store.wizard_drafts.push(draft);
    }

    // Try to send a resume email
    try {
      const resumeUrl = `${req.headers.origin||''}?resume_token=${token}&job_id=${job_id||''}`;
      const { sendEmail } = require('../services/messaging');
      await sendEmail(email, `Continue your application — ${portal.branding?.company_name||portal.name}`,
        `<p>Hi there,</p><p>You saved your application progress. Click below to continue where you left off:</p><p><a href="${resumeUrl}" style="padding:10px 20px;background:#4361EE;color:white;border-radius:8px;text-decoration:none;font-weight:700;">Continue my application →</a></p><p>This link expires in 7 days.</p>`,
        process.env.SENDGRID_FROM_EMAIL||'noreply@vercentic.com'
      );
    } catch(emailErr) { console.warn('Draft email skipped:',emailErr.message); }

    saveStore();
    res.json({ token, expires_at:draft.expires_at });
  } catch(e) {
    res.status(500).json({ error:e.message });
  }
});

// GET /api/portals/:id/wizard/draft/:token — resume saved progress
router.get('/:id/wizard/draft/:token', (req, res) => {
  try {
    const store = getStore();
    const draft = (store.wizard_drafts||[]).find(d=>d.token===req.params.token && d.portal_id===req.params.id);
    if (!draft) return res.status(404).json({ error:'Draft not found or expired' });
    if (new Date(draft.expires_at)<new Date()) return res.status(410).json({ error:'This link has expired. Please start a new application.' });
    if (draft.submitted_at) return res.status(410).json({ error:'This application has already been submitted.' });
    res.json(draft);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;

// ── Portal jobs — only jobs with a linked_person workflow attached ─────────────
// GET /api/portals/:id/jobs
router.get('/:id/jobs', (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals||[]).find(p=>p.id===req.params.id && !p.deleted_at);
    if (!portal) return res.status(404).json({ error:'Portal not found' });

    const jobObj = (store.objects||[]).find(
      o => o.environment_id===portal.environment_id && (o.slug==='jobs' || o.slug==='job')
    );
    if (!jobObj) return res.json({ jobs: [] });

    // Find job IDs that have a linked_person workflow assignment
    const assignments = (store.record_workflow_assignments||[])
      .filter(a => a.assignment_type==='linked_person');
    const jobsWithWorkflow = new Set(assignments.map(a => a.record_id));

    // Fetch open jobs, filter to only those with an assignment
    const allJobs = (store.records||[]).filter(r =>
      r.object_id===jobObj.id &&
      !r.deleted_at &&
      (r.data?.status==='Open' || r.data?.status==='open' || !r.data?.status) &&
      jobsWithWorkflow.has(r.id)
    );

    res.json({ jobs: allJobs });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Portal session auth (for HM portal login) ────────────────────────────────
// POST /api/portals/:id/session — login as a platform user for a specific portal.
// Returns a session token bound to the user, used by HM portal for $me resolution.
router.post('/:id/session', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const bcrypt = require('bcryptjs');
  const user = findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const portal = findOne('portals', p => p.id === req.params.id);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  // Issue a signed session token (simple JWT-style, no extra library needed)
  const token = require('crypto').randomBytes(32).toString('hex');
  // Store in-memory session (survives server restart for dev, use Redis in prod)
  if (!global._portalSessions) global._portalSessions = {};
  global._portalSessions[token] = {
    user_id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    portal_id: portal.id,
    environment_id: portal.environment_id,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
  };
  res.json({
    token,
    user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email },
    portal_id: portal.id,
    expires_at: global._portalSessions[token].expires_at,
  });
});

// GET /api/portals/:id/session — verify a portal session token
router.get('/:id/session', (req, res) => {
  const token = req.headers['x-portal-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const sess = global._portalSessions?.[token];
  if (!sess || new Date(sess.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ valid: true, user: { id: sess.user_id, first_name: sess.first_name, last_name: sess.last_name, email: sess.email }, environment_id: sess.environment_id });
});


// ── Career site: submit application ──────────────────────────────────────────
// POST /api/portals/:id/apply
// Creates a Person record + activity log entry for the application.
// Public endpoint — no auth required (portal candidates aren't users).
router.post('/:id/apply', async (req, res) => {
  try {
    const store = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    const { first_name, last_name, email, phone, cover_note, job_id, job_title } = req.body;
    if (!email || !first_name) return res.status(400).json({ error: 'first_name and email required' });

    // Find the People object for this environment
    const peopleObj = (store.objects || []).find(
      o => o.environment_id === portal.environment_id && o.slug === 'people'
    );
    if (!peopleObj) return res.status(400).json({ error: 'People object not found' });

    // Check for duplicate — don't create two records for the same email
    const existing = (store.records || []).find(
      r => r.object_id === peopleObj.id && r.data?.email === email
    );

    let personRecord;
    if (existing) {
      personRecord = existing;
    } else {
      personRecord = {
        id: uid(), object_id: peopleObj.id, environment_id: portal.environment_id,
        data: { first_name, last_name: last_name || '', email, phone: phone || '',
                status: 'Active', source: 'Career Site', person_type: 'Candidate' },
        created_by: 'portal', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (!store.records) store.records = [];
      store.records.push(personRecord);
    }

    // Log the application in activity
    if (!store.activity) store.activity = [];
    store.activity.push({
      id: uid(), record_id: personRecord.id, object_id: peopleObj.id,
      environment_id: portal.environment_id,
      action: 'applied', actor: 'portal',
      details: { job_id, job_title, portal_id: portal.id, portal_name: portal.name, cover_note },
      created_at: new Date().toISOString(),
    });

    // Add a note with cover letter if provided
    if (cover_note) {
      if (!store.notes) store.notes = [];
      store.notes.push({
        id: uid(), record_id: personRecord.id,
        content: `Applied via ${portal.name || 'career site'}${job_title ? ` for ${job_title}` : ''}.\n\n${cover_note}`,
        author: 'Career Site', source: 'portal', created_at: new Date().toISOString(),
      });
    }

    saveStore();
    res.json({ success: true, person_id: personRecord.id, is_new: !existing });
  } catch (e) {
    console.error('Apply error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portals/public/application/:personId
// Returns application status for a candidate — public endpoint (no auth)
router.get('/public/application/:personId', (req, res) => {
  try {
    const store = getStore();
    const person = (store.records || []).find(r => r.id === req.params.personId);
    if (!person) return res.status(404).json({ error: 'Application not found' });

    // Find applications (activity entries for this person)
    const applications = (store.activity || [])
      .filter(a => a.record_id === person.id && a.action === 'applied')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // For each application find the job and pipeline stage
    const enriched = applications.map(app => {
      const { job_id, job_title, portal_name } = app.details || {};
      // Find pipeline stage if linked
      const links = (store.people_links || [])
        .filter(l => l.person_id === person.id && (!job_id || l.record_id === job_id));
      const stageLink = links[0];
      let stageLabel = null;
      if (stageLink) {
        // Look up the workflow step name
        const wf = (store.workflows || []).find(w => w.id === stageLink.workflow_id);
        const step = (wf?.steps || []).find(s => s.id === stageLink.stage_id);
        stageLabel = step?.name || stageLink.stage_id;
      }
      return {
        applied_at: app.created_at,
        job_id, job_title, portal_name,
        stage: stageLabel,
        status: stageLabel ? 'In progress' : 'Under review',
      };
    });

    res.json({
      person: {
        first_name: person.data?.first_name || '',
        last_name:  person.data?.last_name  || '',
        email:      person.data?.email      || '',
      },
      applications: enriched,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
