/**
 * portal_public.js
 * All public-facing portal API endpoints, mounted at /api/portal-public.
 * No authentication required — safe for anonymous portal visitors.
 *
 * Endpoints:
 *   GET  /slug/:slug                    slug → portal config
 *   GET  /:portalId/jobs                published job listings
 *   GET  /:portalId/job/:jobId          single job detail
 *   POST /:portalId/apply               submit application
 *   GET  /application/:personId         candidate application status (by person id)
 *   GET  /application-by-email          candidate status by email + portal
 *   POST /:portalId/track               analytics event
 *   POST /:portalId/job-alert           subscribe to job alert emails
 *   GET  /:portalId/forms/:formId       portal-linked form schema
 */
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getStore, saveStore, query, findOne, insert } = require('../db/init');
const uid = () => crypto.randomUUID();

// ── Slug lookup ───────────────────────────────────────────────────────────────
router.get('/slug/:slug', (req, res) => {
  const store = getStore();
  const slug  = req.params.slug;
  const norm  = slug.startsWith('/') ? slug : '/' + slug;
  const portal = (store.portals || []).find(p =>
    !p.deleted_at && p.status === 'published' &&
    (p.slug === norm || p.slug === slug || p.slug === '/' + slug)
  );
  if (!portal) return res.status(404).json({ error: 'Portal not found or not published' });
  res.json({ ...portal, branding: portal.theme || portal.branding || {}, type: portal.type || 'career_site' });
});

// ── Job listings ──────────────────────────────────────────────────────────────
router.get('/:portalId/jobs', (req, res) => {
  try {
    const store  = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.portalId && !p.deleted_at);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    const { search, department, location, work_type } = req.query;
    const jobObj = (store.objects || []).find(o =>
      o.environment_id === portal.environment_id &&
      (o.slug === 'jobs' || o.name?.toLowerCase() === 'jobs')
    );
    if (!jobObj) return res.json([]);

    let jobs = (store.records || []).filter(r =>
      r.object_id === jobObj.id &&
      r.environment_id === portal.environment_id &&
      !r.deleted_at &&
      (!r.data?.status || ['Open','open','Active','active'].includes(r.data.status))
    );

    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(j => JSON.stringify(j.data).toLowerCase().includes(q));
    }
    if (department) jobs = jobs.filter(j => j.data?.department === department);
    if (location)   jobs = jobs.filter(j => (j.data?.location || '').toLowerCase().includes(location.toLowerCase()));
    if (work_type)  jobs = jobs.filter(j => j.data?.work_type === work_type);

    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(jobs.map(j => ({
      id:           j.id,
      record_number: j.record_number,
      title:        j.data?.job_title || j.data?.title || 'Untitled Role',
      department:   j.data?.department || '',
      location:     j.data?.location   || '',
      work_type:    j.data?.work_type  || '',
      salary_min:   j.data?.salary_min,
      salary_max:   j.data?.salary_max,
      currency:     j.data?.currency   || 'USD',
      description:  j.data?.job_description || j.data?.description || '',
      posted_at:    j.created_at,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Single job detail ─────────────────────────────────────────────────────────
router.get('/:portalId/job/:jobId', (req, res) => {
  try {
    const store  = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.portalId && !p.deleted_at);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const record = (store.records || []).find(r =>
      r.id === req.params.jobId && r.environment_id === portal.environment_id && !r.deleted_at
    );
    if (!record) return res.status(404).json({ error: 'Job not found' });
    res.json({
      id:           record.id,
      record_number: record.record_number,
      title:        record.data?.job_title  || record.data?.title || 'Untitled',
      department:   record.data?.department || '',
      location:     record.data?.location   || '',
      work_type:    record.data?.work_type  || '',
      salary_min:   record.data?.salary_min,
      salary_max:   record.data?.salary_max,
      currency:     record.data?.currency   || 'USD',
      description:  record.data?.job_description || record.data?.description || '',
      requirements: record.data?.requirements || '',
      benefits:     record.data?.benefits    || '',
      posted_at:    record.created_at,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Submit application ────────────────────────────────────────────────────────
router.post('/:portalId/apply', (req, res) => {
  try {
    const store  = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.portalId && !p.deleted_at);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    const { first_name, last_name, email, phone, job_id, job_title, cover_note, cv_url, custom_fields = {} } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const peopleObj = (store.objects || []).find(o =>
      o.environment_id === portal.environment_id && (o.slug === 'people' || o.slug === 'persons')
    );
    if (!peopleObj) return res.status(500).json({ error: 'People object not configured' });

    const now = new Date().toISOString();
    let person = (store.records || []).find(r =>
      r.object_id === peopleObj.id &&
      r.environment_id === portal.environment_id &&
      r.data?.email?.toLowerCase() === email.toLowerCase() &&
      !r.deleted_at
    );
    const isNew = !person;

    if (isNew) {
      const nums = (store.records || [])
        .filter(r => r.object_id === peopleObj.id && r.environment_id === portal.environment_id)
        .map(r => r.record_number || 0);
      const record_number = nums.length ? Math.max(...nums) + 1 : 1;
      person = insert('records', {
        record_number,
        object_id: peopleObj.id,
        environment_id: portal.environment_id,
        data: { first_name: first_name || '', last_name: last_name || '',
          email, phone: phone || '', status: 'New', source: 'Portal Application',
          cv_url: cv_url || '', ...custom_fields },
        deleted_at: null,
      });
    } else {
      person.data = { ...person.data, ...custom_fields, updated_at: now };
      person.updated_at = now;
    }

    if (!store.activity) store.activity = [];
    store.activity.push({
      id: uid(), record_id: person.id, object_id: peopleObj.id,
      environment_id: portal.environment_id, action: 'applied',
      details: { job_id, job_title, portal_name: portal.name, cover_note },
      created_at: now,
    });

    if (job_id) {
      if (!store.people_links) store.people_links = [];
      const linked = store.people_links.some(l => l.person_id === person.id && l.record_id === job_id && !l.deleted_at);
      if (!linked) {
        store.people_links.push({
          id: uid(), person_id: person.id, record_id: job_id,
          environment_id: portal.environment_id,
          workflow_id: null, stage_id: null, stage_name: 'Applied',
          created_at: now, updated_at: now,
        });
      }
    }

    saveStore();
    res.json({ success: true, person_id: person.id, is_new: isNew });
  } catch (e) { console.error('portal apply:', e); res.status(500).json({ error: e.message }); }
});

// ── Application status by person ID ──────────────────────────────────────────
router.get('/application/:personId', (req, res) => {
  try {
    const store  = getStore();
    const person = (store.records || []).find(r => r.id === req.params.personId && !r.deleted_at);
    if (!person) return res.status(404).json({ error: 'Application not found' });

    const apps = (store.activity || [])
      .filter(a => a.record_id === person.id && a.action === 'applied')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = apps.map(app => {
      const { job_id, job_title, portal_name } = app.details || {};
      const link = (store.people_links || []).find(l => l.person_id === person.id && (!job_id || l.record_id === job_id));
      let stageLabel = null;
      if (link) {
        const wf   = (store.workflows || []).find(w => w.id === link.workflow_id);
        const step = (wf?.steps || []).find(s => s.id === link.stage_id);
        stageLabel = step?.name || link.stage_name || null;
      }
      return { applied_at: app.created_at, job_id, job_title, portal_name,
        stage: stageLabel, status: stageLabel ? 'In progress' : 'Under review' };
    });

    res.json({
      person: { first_name: person.data?.first_name || '', last_name: person.data?.last_name || '', email: person.data?.email || '' },
      applications: enriched,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Application status by email ───────────────────────────────────────────────
router.get('/application-by-email', (req, res) => {
  try {
    const { email, portal_id } = req.query;
    if (!email) return res.status(400).json({ error: 'email required' });
    const store  = getStore();
    const portal = portal_id ? (store.portals || []).find(p => p.id === portal_id) : null;
    const peopleObj = (store.objects || []).find(o =>
      (!portal || o.environment_id === portal.environment_id) &&
      (o.slug === 'people' || o.slug === 'persons')
    );
    if (!peopleObj) return res.json({ person: null, applications: [] });

    const person = (store.records || []).find(r =>
      r.object_id === peopleObj.id &&
      r.data?.email?.toLowerCase() === email.toLowerCase() &&
      !r.deleted_at
    );
    if (!person) return res.json({ person: null, applications: [] });

    // Re-use the by-personId logic
    req.params = { personId: person.id };
    return router.handle(Object.assign(req, { url: `/application/${person.id}` }), res, () => {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Analytics tracking ────────────────────────────────────────────────────────
router.post('/:portalId/track', (req, res) => {
  try {
    const store = getStore();
    if (!store.portal_analytics) store.portal_analytics = [];
    store.portal_analytics.push({
      id: uid(), portal_id: req.params.portalId,
      event: req.body.event || 'unknown', data: req.body.data || {},
      ip: req.ip, created_at: new Date().toISOString(),
    });
    // Don't saveStore on every hit — analytics are low-priority
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ── Job alert subscription ────────────────────────────────────────────────────
router.post('/:portalId/job-alert', (req, res) => {
  try {
    const { email, keywords } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const store = getStore();
    if (!store.job_alerts) store.job_alerts = [];
    const existing = store.job_alerts.find(a => a.portal_id === req.params.portalId && a.email === email);
    if (!existing) {
      store.job_alerts.push({
        id: uid(), portal_id: req.params.portalId,
        email, keywords: keywords || [], active: true,
        created_at: new Date().toISOString(),
      });
      saveStore();
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Portal-linked form schema ─────────────────────────────────────────────────
router.get('/:portalId/forms/:formId', (req, res) => {
  const store  = getStore();
  const portal = (store.portals || []).find(p => p.id === req.params.portalId && !p.deleted_at);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  const form = (store.forms || []).find(f => f.id === req.params.formId && !f.deleted_at);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json({ id: form.id, name: form.name, description: form.description, fields: form.fields || [] });
});

module.exports = router;
