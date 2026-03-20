// server/routes/connector_actions.js
// On-demand connector triggers callable from the frontend UI
const express = require('express');
const router  = express.Router();
const { getConnector, createInterviewMeeting, fireEvent } = require('../services/connectors');

// GET /api/connector-actions/available/:environment_id
// Returns which action categories are available based on connected integrations
router.get('/available/:environment_id', (req, res) => {
  const envId = req.params.environment_id;
  const checks = [
    { action: 'background_check',  providers: ['checkr', 'sterling'] },
    { action: 'reference_check',   providers: ['xref', 'skillsurvey'] },
    { action: 'e_signature',       providers: ['docusign', 'adobe_sign'] },
    { action: 'video_meeting',     providers: ['zoom', 'microsoft_365', 'google_calendar'] },
    { action: 'hris_sync',         providers: ['bamboohr', 'workday', 'sap_successfactors', 'rippling', 'oracle_hcm'] },
    { action: 'job_posting',       providers: ['linkedin_jobs', 'indeed', 'bayt', 'reed', 'stepstone'] },
    { action: 'notification',      providers: ['slack', 'microsoft_teams', 'zapier', 'make'] },
    { action: 'crm_sync',          providers: ['salesforce', 'hubspot'] },
    { action: 'payroll_sync',      providers: ['xero', 'adp', 'gusto'] },
  ];
  const available = {};
  for (const check of checks) {
    const active = check.providers.filter(p => getConnector(envId, p) !== null);
    available[check.action] = { available: active.length > 0, providers: active };
  }
  res.json(available);
});

// POST /api/connector-actions/background-check
router.post('/background-check', async (req, res) => {
  const { environment_id, candidate } = req.body;
  const checkr = getConnector(environment_id, 'checkr');
  if (!checkr) return res.status(404).json({ error: 'Checkr not connected in Settings → Integrations' });
  try {
    let checkrCandidate = await checkr.findByEmail(candidate.email).catch(() => null);
    if (!checkrCandidate) {
      checkrCandidate = await checkr.createCandidate({ firstName: candidate.first_name,
        lastName: candidate.last_name, email: candidate.email, phone: candidate.phone });
    }
    const report = await checkr.orderReport({ candidateId: checkrCandidate.id, packageSlug: req.body.package });
    res.json({ ok: true, report_id: report.id, status: report.status, candidate_id: checkrCandidate.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connector-actions/reference-check
router.post('/reference-check', async (req, res) => {
  const { environment_id, candidate } = req.body;
  const xref = getConnector(environment_id, 'xref');
  if (!xref) return res.status(404).json({ error: 'Xref not connected in Settings → Integrations' });
  try {
    const request = await xref.sendReferenceCheck({ candidateName: `${candidate.first_name} ${candidate.last_name}`,
      candidateEmail: candidate.email, jobTitle: candidate.job_title, refereeCount: req.body.referee_count || 2 });
    res.json({ ok: true, request_id: request.id, status: request.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connector-actions/send-offer-signature
router.post('/send-offer-signature', async (req, res) => {
  const { environment_id, offer } = req.body;
  const docusign = getConnector(environment_id, 'docusign');
  if (!docusign) return res.status(404).json({ error: 'DocuSign not connected in Settings → Integrations' });
  try {
    const envelope = await docusign.sendOfferForSignature(offer);
    res.json({ ok: true, envelope_id: envelope.envelope_id, status: envelope.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connector-actions/sync-to-hris
router.post('/sync-to-hris', async (req, res) => {
  const { environment_id, employee } = req.body;
  const results = {};
  for (const slug of ['bamboohr', 'workday', 'sap_successfactors']) {
    const connector = getConnector(environment_id, slug);
    if (!connector) continue;
    try {
      results[slug] = slug === 'sap_successfactors'
        ? await connector.createCandidate(employee)
        : await connector.createEmployee ? await connector.createEmployee(employee)
        : await connector.createPreHire(employee);
    } catch (e) { results[slug] = { ok: false, error: e.message }; }
  }
  if (Object.keys(results).length === 0) return res.status(404).json({ error: 'No HRIS connected in Settings → Integrations' });
  res.json({ ok: true, results });
});

// POST /api/connector-actions/post-job
router.post('/post-job', async (req, res) => {
  const { environment_id, job, job_boards = ['linkedin'] } = req.body;
  const results = {};
  if (job_boards.includes('linkedin')) {
    const linkedin = getConnector(environment_id, 'linkedin_jobs');
    if (linkedin) {
      try { results.linkedin = await linkedin.postJob(job); }
      catch (e) { results.linkedin = { ok: false, error: e.message }; }
    }
  }
  if (Object.keys(results).length === 0)
    return res.status(404).json({ error: 'No job boards connected in Settings → Integrations' });
  res.json({ ok: true, results });
});

// POST /api/connector-actions/create-meeting
router.post('/create-meeting', async (req, res) => {
  const { environment_id, ...details } = req.body;
  try {
    const meeting = await createInterviewMeeting(environment_id, details);
    if (!meeting) return res.status(404).json({ error: 'No video/calendar provider connected in Settings → Integrations' });
    res.json({ ok: true, ...meeting });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connector-actions/notify
router.post('/notify', async (req, res) => {
  const { environment_id, event_type, payload } = req.body;
  try {
    const results = await fireEvent(environment_id, event_type, payload);
    res.json({ ok: true, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connector-actions/crm-sync
router.post('/crm-sync', async (req, res) => {
  const { environment_id, candidate } = req.body;
  const results = {};
  for (const slug of ['salesforce', 'hubspot']) {
    const connector = getConnector(environment_id, slug);
    if (!connector) continue;
    try { results[slug] = await connector.upsertContact(candidate); }
    catch (e) { results[slug] = { ok: false, error: e.message }; }
  }
  if (Object.keys(results).length === 0)
    return res.status(404).json({ error: 'No CRM connected in Settings → Integrations' });
  res.json({ ok: true, results });
});

module.exports = router;
