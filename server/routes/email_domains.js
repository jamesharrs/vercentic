/**
 * server/routes/email_domains.js
 * Client-side email domain management — verify & send from custom domains via Resend
 */
const router  = require('express').Router();
const { attachUser } = require('../middleware/rbac');
const mailer  = require('../services/mailer');

router.use(attachUser);

// GET /api/email-domains?environment_id=
router.get('/', async (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const cfg = await mailer.checkDomainStatus(environment_id);
    res.json(cfg || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email-domains — register a new domain
router.post('/', async (req, res) => {
  const { environment_id, domain, from_email, from_name } = req.body;
  if (!environment_id || !domain) return res.status(400).json({ error: 'environment_id and domain required' });
  try {
    const cfg = await mailer.registerClientDomain({ environmentId: environment_id, domain, fromEmail: from_email, fromName: from_name });
    res.status(201).json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email-domains/verify — poll current status from Resend
router.post('/verify', async (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const cfg = await mailer.checkDomainStatus(environment_id);
    res.json(cfg || { status: 'not_configured' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/email-domains — remove domain
router.delete('/', async (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    await mailer.deleteClientDomain(environment_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email-domains/test-send — send a test email
router.post('/test-send', async (req, res) => {
  const { environment_id, to } = req.body;
  if (!environment_id || !to) return res.status(400).json({ error: 'environment_id and to required' });
  try {
    const result = await mailer.sendEmail({
      to,
      subject: 'Vercentic — Email Domain Test',
      html: `<p>Your custom email domain is working correctly.</p><p>Sent via <strong>Vercentic</strong>.</p>`,
      environmentId: environment_id,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
