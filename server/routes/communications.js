/**
 * server/routes/communications.js
 * Includes MailerSend reply-tracking in outbound flow + inbound email webhooks.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, findOne } = require('../db/init');
const { sendSMS, sendWhatsApp, sendEmail, getProviderStatus } = require('../services/messaging');

const router = express.Router();

// ─── Provider status ──────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json(getProviderStatus());
});

// ─── Test email ───────────────────────────────────────────────────────────────
router.post('/test-email', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to address required' });
  try {
    const status = getProviderStatus();
    const result = await sendEmail({
      to, subject: 'Vercentic — Test Email',
      text: `Test email from Vercentic.\nProvider: ${status.email_provider}\nSent: ${new Date().toISOString()}`,
      html: `<p>Test email from Vercentic.</p><p>Provider: <b>${status.email_provider}</b></p>`,
    });
    res.json({ ok: true, result, provider: status.email_provider });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { record_id, type, direction, context, related_record_id, search, limit = 100, offset = 0 } = req.query;
  let all = query('communications', () => true);
  if (record_id)         all = all.filter(c => c.record_id === record_id);
  if (type)              all = all.filter(c => c.type === type);
  if (direction)         all = all.filter(c => c.direction === direction);
  if (context === 'general')     all = all.filter(c => !c.related_record_id);
  if (context === 'application') all = all.filter(c => !!c.related_record_id);
  if (related_record_id) all = all.filter(c => c.related_record_id === related_record_id);
  if (search) {
    const s = search.toLowerCase();
    all = all.filter(c =>
      (c.subject||'').toLowerCase().includes(s) ||
      (c.body||'').toLowerCase().includes(s) ||
      (c.from_label||'').toLowerCase().includes(s)
    );
  }
  all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ items: all.slice(Number(offset), Number(offset) + Number(limit)), total: all.length });
});

router.get('/:id', (req, res) => {
  const item = query('communications', () => true).find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// ─── Send / create communication ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { type, direction, to, subject, body, record_id, environment_id, ...rest } = req.body;

  let dispatchResult = {};
  let status = 'logged';
  let replyToAddress = null;

  try {
    if (direction === 'outbound') {
      const threadId  = rest.thread_id || uuidv4();
      rest.thread_id  = threadId;

      // Build reply-tracking address for emails
      if (type === 'email' && record_id) {
        try {
          const { buildReplyToAddress } = require('../services/mailersend');
          replyToAddress = buildReplyToAddress(record_id, threadId, environment_id);
        } catch { /* mailersend not available */ }
      }

      if (type === 'sms') {
        dispatchResult = await sendSMS({ to, body });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      } else if (type === 'whatsapp') {
        dispatchResult = await sendWhatsApp({ to, body });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      } else if (type === 'email') {
        // Resolve per-client verified from-domain if one is set as default
        let fromEmail = null;
        if (environment_id) {
          try {
            const domainRec = query('email_domains', d =>
              d.environment_id === environment_id && d.is_default && d.verified
            )[0];
            if (domainRec) fromEmail = `noreply@${domainRec.domain}`;
          } catch { /* no domains table yet */ }
        }
        dispatchResult = await sendEmail({
          to, from: fromEmail, replyTo: replyToAddress, subject,
          html: rest.body_html || body,   // use pre-built branded HTML if available
          text: rest.body_text || body,   // plain-text fallback for email clients
        });
        status = dispatchResult.simulated ? 'simulated' : 'sent';
      }
    }
  } catch (err) {
    console.error(`[comms] dispatch error (${type}):`, err.message);
    status = 'failed';
    dispatchResult = { error: err.message };
  }

  const related_record_id = rest.related_record_id || null;
  const context   = rest.context || (related_record_id ? 'application' : 'general');
  const thread_id = rest.thread_id || uuidv4();

  const item = {
    id: uuidv4(), type,
    direction: direction || 'logged',
    record_id: record_id || undefined,
    environment_id: environment_id || undefined,
    to: to || undefined,
    reply_to: replyToAddress || undefined,
    subject: subject || undefined,
    body,
    status,
    provider: dispatchResult.provider || undefined,
    provider_message_id: dispatchResult.messageId || undefined,
    provider_sid:        dispatchResult.sid        || undefined,
    provider_status:     dispatchResult.status     || undefined,
    simulated: dispatchResult.simulated || false,
    related_record_id, context, thread_id,
    ...rest,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('communications', item);

  if (record_id) {
    const rec = findOne('records', r => r.id === record_id);
    if (rec) {
      const actionMap = { email:'email_sent', sms:'sms_sent', whatsapp:'whatsapp_sent', call:'call_logged' };
      insert('activity', {
        id: uuidv4(), record_id, object_id: rec.object_id,
        environment_id: rec.environment_id,
        action: actionMap[item.type] || 'communication_logged',
        actor: item.from_address || 'System',
        changes: { subject: item.subject, type: item.type, direction: item.direction },
        created_at: new Date().toISOString(),
      });
    }
  }

  res.status(201).json(item);
});

// ─── Update / delete ──────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const updated = update('communications', req.params.id, { ...req.body, updated_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  remove('communications', req.params.id);
  res.json({ ok: true });
});

// ─── Twilio SMS inbound ───────────────────────────────────────────────────────
router.post('/webhook/sms', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body, MessageSid } = req.body;
  const matched = query('records', () => true).find(r =>
    r.data?.phone && r.data.phone.replace(/\D/g,'') === From.replace(/\D/g,'')
  );
  insert('communications', {
    id: uuidv4(), type: 'sms', direction: 'inbound',
    record_id: matched?.id || null,
    from_label: From, body: Body, status: 'received',
    provider_sid: MessageSid, simulated: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  console.log(`[comms] Inbound SMS from ${From} → record ${matched?.id || '(unmatched)'}`);
  res.set('Content-Type', 'text/xml').send('<Response></Response>');
});

// ─── Twilio WhatsApp inbound ──────────────────────────────────────────────────
router.post('/webhook/whatsapp', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body, MessageSid } = req.body;
  insert('communications', {
    id: uuidv4(), type: 'whatsapp', direction: 'inbound',
    from_label: From.replace('whatsapp:', ''), body: Body,
    status: 'received', provider_sid: MessageSid, simulated: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  res.set('Content-Type', 'text/xml').send('<Response></Response>');
});

// ─── Twilio delivery status ───────────────────────────────────────────────────
router.post('/webhook/sms-status', express.urlencoded({ extended: false }), (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid) {
    const item = query('communications', () => true).find(c => c.provider_sid === MessageSid);
    if (item) update('communications', item.id, { provider_status: MessageStatus });
  }
  res.sendStatus(204);
});

router.post('/webhook/wa-status', express.urlencoded({ extended: false }), (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid) {
    const item = query('communications', () => true).find(c => c.provider_sid === MessageSid);
    if (item) update('communications', item.id, { provider_status: MessageStatus });
  }
  res.sendStatus(204);
});

// ─── MailerSend inbound email ─────────────────────────────────────────────────
// MailerSend POSTs here when a reply arrives at replies.vercentic.com.
// The To field contains reply+TOKEN@replies.vercentic.com — we decode the
// token to find the record and log the reply without any manual matching.
router.post('/webhook/email', express.json(), async (req, res) => {
  try {
    const emails = Array.isArray(req.body) ? req.body : [req.body];
    for (const email of emails) {
      const fromEmail = email.from?.email || email.envelope?.from || '';
      const fromName  = email.from?.name  || fromEmail;
      const subject   = email.subject     || '(no subject)';
      const bodyText  = email.text || email.body_text || '';
      const bodyHtml  = email.html || email.body_html || '';
      const toAddresses = (email.to || []).map(t => typeof t === 'string' ? t : (t.email || ''));

      let recordId = null, threadId = null, environmentId = null;
      try {
        const { parseReplyToken } = require('../services/mailersend');
        for (const addr of toAddresses) {
          const parsed = parseReplyToken(addr);
          if (parsed) { recordId = parsed.recordId; threadId = parsed.threadId; environmentId = parsed.environmentId; break; }
        }
      } catch { /* mailersend module not loaded */ }

      // Fallback: match by sender email
      if (!recordId) {
        const matched = query('records', () => true).find(r =>
          r.data?.email && r.data.email.toLowerCase() === fromEmail.toLowerCase()
        );
        if (matched) { recordId = matched.id; environmentId = matched.environment_id; }
      }

      const item = {
        id: uuidv4(), type: 'email', direction: 'inbound',
        record_id: recordId, environment_id: environmentId, thread_id: threadId,
        from_label: fromName, from_address: fromEmail,
        to_address: toAddresses.join(', '),
        subject, body: bodyText || bodyHtml, body_html: bodyHtml || null,
        status: 'received', provider: 'mailersend', simulated: false,
        matched_automatically: !!recordId,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      insert('communications', item);
      console.log(`[comms] Inbound email from ${fromEmail} → record ${recordId || '(unmatched)'}`);

      if (recordId) {
        const rec = findOne('records', r => r.id === recordId);
        if (rec) insert('activity', {
          id: uuidv4(), record_id: recordId, object_id: rec.object_id,
          environment_id: environmentId, action: 'email_received',
          actor: fromEmail, changes: { subject, from: fromEmail },
          created_at: new Date().toISOString(),
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('[comms] Inbound email webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ─── MailerSend delivery status ───────────────────────────────────────────────
router.post('/webhook/email-status', express.json(), (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const event of events) {
      const messageId = event.data?.email?.message?.id || event.data?.message_id || event.message_id;
      const status    = event.type || event.event;
      if (messageId) {
        const item = query('communications', () => true).find(c => c.provider_message_id === messageId);
        if (item && status) update('communications', item.id, {
          provider_status: status,
          opened_at:  status === 'opened'  ? new Date().toISOString() : item.opened_at,
          clicked_at: status === 'clicked' ? new Date().toISOString() : item.clicked_at,
          bounced_at: status === 'bounced' ? new Date().toISOString() : item.bounced_at,
          updated_at: new Date().toISOString(),
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('[comms] Email status webhook error:', err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
