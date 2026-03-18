const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove } = require('../db/init');
const { sendSMS, sendWhatsApp, sendEmail, getProviderStatus } = require('../services/messaging');

const router = express.Router();

// GET /api/comms/status — provider status (live vs simulation)
router.get('/status', (req, res) => {
  res.json(getProviderStatus());
});

// POST /api/comms/test-email — send a test email to verify SendGrid is working
router.post('/test-email', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to address required' });
  try {
    const status = getProviderStatus();
    const result = await sendEmail({
      to,
      subject: 'TalentOS — Test Email',
      text: `This is a test email from TalentOS.\n\nProvider: ${status.email_provider || 'unknown'}\nFrom: ${process.env.SENDGRID_FROM_EMAIL || 'not set'}\nSent: ${new Date().toISOString()}`,
      html: `<p>This is a test email from TalentOS.</p><p>Provider: <b>${status.email_provider||'unknown'}</b><br>From: <b>${process.env.SENDGRID_FROM_EMAIL||'not set'}</b></p>`
    });
    res.json({ ok: true, result, provider: status.email_provider, from: process.env.SENDGRID_FROM_EMAIL || 'not set' });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/comms?record_id=X&type=email&direction=inbound&search=X&limit=50&offset=0
router.get('/', (req, res) => {
  const { record_id, type, direction, search, limit = 100, offset = 0 } = req.query;
  let all = query('communications', () => true);
  if (record_id)  all = all.filter(c => c.record_id === record_id);
  if (type)       all = all.filter(c => c.type === type);
  if (direction)  all = all.filter(c => c.direction === direction);
  if (search) {
    const s = search.toLowerCase();
    all = all.filter(c =>
      (c.subject||'').toLowerCase().includes(s) ||
      (c.body||'').toLowerCase().includes(s) ||
      (c.from_label||'').toLowerCase().includes(s)
    );
  }
  all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = all.length;
  const items = all.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ items, total });
});

router.get('/:id', (req, res) => {
  const item = query('communications', () => true).find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /api/comms — create + dispatch
router.post('/', async (req, res) => {
  const { type, direction, to, subject, body, ...rest } = req.body;

  let dispatchResult = {};
  let status = 'logged';

  try {
    if (direction === 'outbound') {
      if (type === 'sms') {
        dispatchResult = await sendSMS({ to, body });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      } else if (type === 'whatsapp') {
        dispatchResult = await sendWhatsApp({ to, body });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      } else if (type === 'email') {
        dispatchResult = await sendEmail({ to, subject, body });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      }
    }
  } catch (err) {
    console.error(`[comms] dispatch error (${type}):`, err.message);
    status = 'failed';
    dispatchResult = { error: err.message };
  }

  const item = {
    id: uuidv4(),
    type,
    direction: direction || 'logged',
    to: to || undefined,
    subject: subject || undefined,
    body,
    status,
    provider_sid:  dispatchResult.sid || dispatchResult.messageId || undefined,
    provider_status: dispatchResult.status || undefined,
    simulated: dispatchResult.simulated || false,
    ...rest,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('communications', item);
  res.status(201).json(item);
});

router.patch('/:id', (req, res) => {
  const updated = update('communications', req.params.id, {
    ...req.body,
    updated_at: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  remove('communications', req.params.id);
  res.json({ ok: true });
});

// ─── Inbound webhooks (Twilio calls these when a message arrives) ─────────────

// Twilio SMS inbound
router.post('/webhook/sms', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body, MessageSid } = req.body;
  // Try to match a record by phone number stored in record data
  const item = {
    id: uuidv4(),
    type: 'sms',
    direction: 'inbound',
    from_label: From,
    body: Body,
    status: 'received',
    provider_sid: MessageSid,
    simulated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // record_id left null — UI can match to a contact later
  };
  insert('communications', item);
  console.log(`[comms] Inbound SMS from ${From}`);
  // Twilio expects TwiML response (empty = no auto-reply)
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// Twilio WhatsApp inbound
router.post('/webhook/whatsapp', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body, MessageSid } = req.body;
  const item = {
    id: uuidv4(),
    type: 'whatsapp',
    direction: 'inbound',
    from_label: From.replace('whatsapp:', ''),
    body: Body,
    status: 'received',
    provider_sid: MessageSid,
    simulated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insert('communications', item);
  console.log(`[comms] Inbound WhatsApp from ${From}`);
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// Twilio delivery status callback
router.post('/webhook/sms-status', express.urlencoded({ extended: false }), (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid) {
    const all = query('communications', () => true);
    const item = all.find(c => c.provider_sid === MessageSid);
    if (item) update('communications', item.id, { provider_status: MessageStatus });
  }
  res.sendStatus(204);
});

router.post('/webhook/wa-status', express.urlencoded({ extended: false }), (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid) {
    const all = query('communications', () => true);
    const item = all.find(c => c.provider_sid === MessageSid);
    if (item) update('communications', item.id, { provider_status: MessageStatus });
  }
  res.sendStatus(204);
});

module.exports = router;
