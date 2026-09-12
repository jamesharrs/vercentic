const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// Maps a raw `communications` row (inbound sms/whatsapp/web/email) into the
// same shape used for unified-inbox list items, so list-building and
// single-item lookups stay self-consistent. See resolveUnifiedMessage below.
function mapCommToUnified(c) {
  return {
    _source: 'communication', channel: c.type, id: c.id,
    thread_id: c.thread_id || c.id,
    // Demo/seed data (and some legacy writers) use from_address/to_address
    // instead of from_name/from_email/from_number — fall back to those so
    // these rows don't display as "Unknown" with no way to identify the sender.
    from_name: c.from_name || c.from_number || c.from_address || 'Unknown',
    from_contact: c.from_number || c.from_email || c.from_address || '',
    subject: c.subject || (c.type === 'sms' ? 'SMS' : c.type === 'whatsapp' ? 'WhatsApp' : c.type === 'web' ? 'Web message' : '(no subject)'),
    preview: (c.body || '').slice(0, 120),
    matched_record_id: c.record_id, related_record_id: c.related_record_id,
    read: !!c.read, assigned_to: c.assigned_to || null,
    received_at: c.sent_at || c.created_at, created_at: c.created_at, context: c.context || 'general',
  };
}

// Resolves a single unified-inbox item by id from either backing source:
// store.inbound_messages (historic rows — nothing writes new ones since the
// dead SendGrid /inbound webhook was removed, see the note above DELETE
// /:id below), or an inbound sms/whatsapp/web/email row in store.communications
// that ISN'T a mirror of
// an inbound_messages row (mirrors carry inbound_message_id and are excluded
// from the list — see the "2. Inbound..." block in GET / below — so they're
// never looked up by their own id here either). Every route below previously
// only checked store.inbound_messages and 404'd for anything actually
// sourced from communications (all SMS/WhatsApp/web items, plus any inbound
// email written directly into communications without going through the
// webhook) even though such items can appear in the GET / list.
function resolveUnifiedMessage(store, id) {
  const im = (store.inbound_messages || []).find(m => m.id === id);
  if (im) return { source: 'inbound_message', raw: im };
  const c = (store.communications || []).find(c =>
    c.id === id && c.direction === 'inbound' &&
    ['sms', 'whatsapp', 'web', 'email'].includes(c.type) && !c.inbound_message_id
  );
  if (c) return { source: 'communication', raw: c };
  return null;
}

// GET /api/inbox — unified multi-channel inbox (email + SMS + WhatsApp)
router.get('/', (req, res) => {
  const { environment_id, filter = 'mine', channel = 'all', page = 1, limit = 50, search, user_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();

  // 1. Inbound emails from inbound_messages
  const inboundEmails = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id)
    .map(m => ({
      _source: 'inbound_message', channel: 'email', id: m.id,
      thread_id: m.thread_id, from_name: m.from_name, from_contact: m.from_email,
      subject: m.subject, preview: (m.body_text || '').slice(0, 120),
      matched_record_id: m.matched_record_id, related_record_id: m.related_record_id,
      read: !!m.read, assigned_to: m.assigned_to,
      received_at: m.received_at, created_at: m.created_at, context: m.context || 'general',
    }));

  // 2. Inbound SMS / WhatsApp / web / not-yet-mirrored email from communications.
  // A communications row with inbound_message_id is a *mirror* of an
  // inbound_messages row (historically created by the now-removed SendGrid
  // /inbound webhook, or still today by PATCH /:id/link) purely so GET /:id
  // can reconstruct a full thread — see the note above DELETE /:id below —
  // it must be excluded
  // here or every such email would be double-counted against its source
  // inbound_messages row. Any inbound email written directly into
  // communications with no inbound_message_id (e.g. demo/seed data, or any
  // integration that writes here without going through the webhook) has no
  // other representation anywhere, so it must be surfaced directly here or
  // it's invisible in the inbox regardless of any other fix.
  const inboundComms = (store.communications || [])
    .filter(c => c.environment_id === environment_id && c.direction === 'inbound'
              && ['sms', 'whatsapp', 'web', 'email'].includes(c.type)
              && !c.inbound_message_id)
    .map(mapCommToUnified);

  // 3. Merge — keep latest message per thread
  const threadMap = new Map();
  [...inboundEmails, ...inboundComms].forEach(m => {
    const key = m.thread_id || m.id;
    const ex  = threadMap.get(key);
    if (!ex || new Date(m.received_at) > new Date(ex.received_at)) threadMap.set(key, m);
  });
  let messages = Array.from(threadMap.values());

  // 4. "Mine" — threads I replied to, OR candidates linked to jobs I own.
  // "Own" mirrors the app-wide convention used on desktop/mobile (see
  // MobileApp.jsx computeMyJobIds / Dashboard.jsx peopleFields): the user's
  // first name appears as a substring match in a job's owner-type fields.
  // Jobs don't carry owner_id/recruiter_id/hiring_manager_id fields, so the
  // previous ID-equality check here never matched anything.
  if (filter === 'mine' && user_id) {
    const myThreads = new Set(
      (store.communications || [])
        .filter(c => c.direction === 'outbound' && c.created_by === user_id)
        .map(c => c.thread_id).filter(Boolean)
    );
    const me = (store.users || []).find(u => u.id === user_id);
    const firstName = (me?.first_name || '').toLowerCase().trim();
    const PEOPLE_OWNER_FIELDS = ['hiring_manager', 'recruiter', 'coordinator', 'sourcing_partner', 'interviewers', 'approved_by', 'interviewer'];
    let myJobIds = new Set();
    if (firstName) {
      const objects = store.object_definitions || store.objects || [];
      const jobsObj = objects.find(o => o.slug === 'jobs' && o.environment_id === environment_id);
      if (jobsObj) {
        const myJobs = (store.records || []).filter(r => {
          if (r.object_id !== jobsObj.id || r.environment_id !== environment_id) return false;
          const d = r.data || {};
          const textFields = [d.owner, d.recruiter_name, d.coordinator_name].filter(Boolean).map(v => String(v).toLowerCase());
          if (textFields.some(v => v.includes(firstName))) return true;
          return PEOPLE_OWNER_FIELDS.some(key => {
            const v = d[key];
            if (!v) return false;
            const arr = Array.isArray(v) ? v : [v];
            return arr.some(p => {
              const name = typeof p === 'object' ? (p?.name || '') : String(p);
              return name.toLowerCase().includes(firstName);
            });
          });
        });
        myJobIds = new Set(myJobs.map(j => j.id));
      }
    }
    const myPersonIds = new Set(
      (store.people_links || []).filter(l => myJobIds.has(l.record_id)).map(l => l.person_id)
    );
    messages = messages.filter(m => myThreads.has(m.thread_id) || myPersonIds.has(m.matched_record_id));
  }

  // 5. Standard filters
  if (filter === 'unread')    messages = messages.filter(m => !m.read);
  if (filter === 'unmatched') messages = messages.filter(m => !m.matched_record_id);
  if (channel !== 'all')      messages = messages.filter(m => m.channel === channel);

  // 6. Search
  if (search) {
    const q = search.toLowerCase();
    messages = messages.filter(m =>
      (m.from_name || '').toLowerCase().includes(q) ||
      (m.from_contact || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.preview || '').toLowerCase().includes(q)
    );
  }

  messages.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));

  // 7. Enrich with person name
  const allUnified = Array.from(threadMap.values());
  const total = messages.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const enriched = messages.slice(start, start + parseInt(limit)).map(m => {
    let matched_record = null;
    if (m.matched_record_id) {
      const rec = (store.records || []).find(r => r.id === m.matched_record_id);
      if (rec) {
        const d = rec.data || {};
        matched_record = { id: rec.id, object_id: rec.object_id,
          name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown' };
      }
    }
    return { ...m, matched_record };
  });

  res.json({
    messages: enriched, total,
    unread_count: allUnified.filter(m => !m.read).length,
    channel_counts: {
      email:    allUnified.filter(m => m.channel === 'email').length,
      sms:      allUnified.filter(m => m.channel === 'sms').length,
      whatsapp: allUnified.filter(m => m.channel === 'whatsapp').length,
      web:      allUnified.filter(m => m.channel === 'web').length,
    },
  });
});

// GET /api/inbox/unread-count
router.get('/unread-count', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.json({ count: 0 });
  const store = getStore();
  // Mirrors the unread_count computed by GET / (allUnified) — must include
  // inbound SMS/WhatsApp/web from communications, not just email, or the
  // sidebar badge undercounts relative to what the inbox list itself shows.
  const emailUnread = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id && !m.read).length;
  // Must match the same set GET / merges into the list (see the "2. Inbound..."
  // block there): sms/whatsapp/web, plus inbound email rows written directly
  // into communications that aren't a mirror of an inbound_messages row.
  const commsUnread = (store.communications || [])
    .filter(c => c.environment_id === environment_id && c.direction === 'inbound'
              && ['sms', 'whatsapp', 'web', 'email'].includes(c.type)
              && !c.inbound_message_id && !c.read).length;
  res.json({ count: emailUnread + commsUnread });
});

// GET /api/inbox/:id — single message with thread
router.get('/:id', (req, res) => {
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });
  const { source, raw: msg } = resolved;
  const thread_id = source === 'inbound_message' ? msg.thread_id : (msg.thread_id || msg.id);
  let thread = [];
  if (thread_id) {
    const comms = (store.communications || []).filter(c => c.thread_id === thread_id);
    // Track which inbound_message_ids are already represented in comms
    const coveredInboundIds = new Set(comms.map(c => c.inbound_message_id).filter(Boolean));
    // Only include raw inbound messages not already covered by a comms entry
    const inbound = (store.inbound_messages || []).filter(m =>
      m.thread_id === thread_id && !coveredInboundIds.has(m.id)
    );
    thread = [...comms, ...inbound].sort((a, b) =>
      new Date(a.sent_at || a.received_at) - new Date(b.sent_at || b.received_at));
  }
  const matched_record_id = source === 'inbound_message' ? msg.matched_record_id : msg.record_id;
  let matched_record = null;
  if (matched_record_id) {
    const rec = (store.records || []).find(r => r.id === matched_record_id);
    if (rec) {
      const d = rec.data || {};
      matched_record = {
        id: rec.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown',
        email: d.email, object_id: rec.object_id
      };
    }
  }
  // inbound_message-sourced: keep the exact raw-row shape as before (the
  // frontend detail view already relies on this working today for email).
  // communication-sourced: return the same unified shape the list route
  // already uses for these items (the frontend already renders that shape
  // for SMS/WhatsApp/web list rows) plus the raw body/address fields as a
  // superset, since there was no prior detail response for this source to
  // stay compatible with (every such lookup previously 404'd).
  const base = source === 'inbound_message'
    ? msg
    : { ...mapCommToUnified(msg), body: msg.body, from_email: msg.from_email || msg.from_address, from_number: msg.from_number, status: msg.status };
  res.json({ ...base, thread, matched_record });
});

// PATCH /api/inbox/:id/read
router.patch('/:id/read', (req, res) => {
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });
  const read = req.body.read !== false;
  const patch = { read, read_at: read ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  if (resolved.source === 'inbound_message') {
    const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
    store.inbound_messages[idx] = { ...store.inbound_messages[idx], ...patch };
    saveStore(store);
    return res.json(store.inbound_messages[idx]);
  }
  const idx = store.communications.findIndex(c => c.id === req.params.id);
  store.communications[idx] = { ...store.communications[idx], ...patch };
  saveStore(store);
  res.json(store.communications[idx]);
});

// PATCH /api/inbox/:id/assign
router.patch('/:id/assign', (req, res) => {
  const { user_id } = req.body;
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });
  const patch = { assigned_to: user_id || null, updated_at: new Date().toISOString() };
  if (resolved.source === 'inbound_message') {
    const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
    store.inbound_messages[idx] = { ...store.inbound_messages[idx], ...patch };
    saveStore(store);
    return res.json(store.inbound_messages[idx]);
  }
  const idx = store.communications.findIndex(c => c.id === req.params.id);
  store.communications[idx] = { ...store.communications[idx], ...patch };
  saveStore(store);
  res.json(store.communications[idx]);
});

// PATCH /api/inbox/:id/link — link to a person record
router.patch('/:id/link', (req, res) => {
  const { record_id } = req.body;
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });

  if (resolved.source === 'inbound_message') {
    const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
    const msg = store.inbound_messages[idx];
    if (record_id) {
      if (!store.communications) store.communications = [];
      const alreadyLinked = store.communications.find(c => c.inbound_message_id === msg.id);
      if (!alreadyLinked) {
        store.communications.push({
          id: uuidv4(), record_id, environment_id: msg.environment_id,
          type: 'email', direction: 'inbound', subject: msg.subject, body: msg.body_text,
          from_email: msg.from_email, from_name: msg.from_name, status: 'received',
          thread_id: msg.thread_id, inbound_message_id: msg.id,
          sent_at: msg.received_at, created_at: new Date().toISOString()
        });
      }
    }
    store.inbound_messages[idx] = {
      ...msg, matched_record_id: record_id || null, updated_at: new Date().toISOString()
    };
    saveStore(store);
    return res.json(store.inbound_messages[idx]);
  }

  // communication-sourced: it already IS the canonical row, so link it directly
  // rather than creating a redundant mirror (unlike the inbound_message branch
  // above, which mirrors into communications purely for thread reconstruction).
  const idx = store.communications.findIndex(c => c.id === req.params.id);
  store.communications[idx] = {
    ...store.communications[idx], record_id: record_id || null, updated_at: new Date().toISOString()
  };
  saveStore(store);
  res.json(store.communications[idx]);
});

// POST /api/inbox/:id/reply
//
// Previously this only ever wrote a `communications` row marked "sent" —
// for every channel, in both source branches — without calling any real
// provider. A recruiter hitting Reply believed their message went out; in
// truth nothing was ever dispatched, on any channel, ever. This now calls
// through to services/messaging.js (the same dispatch layer already used by
// routes/communications.js) so replies actually send, while keeping the
// existing behavior of always recording the attempt — successful, simulated,
// or failed — so a delivery failure doesn't silently swallow the reply.
router.post('/:id/reply', async (req, res) => {
  const { body, subject } = req.body;
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });
  const { source, raw: msg } = resolved;
  if (!store.communications) store.communications = [];
  const { sendEmail, sendSMS, sendWhatsApp } = require('../services/messaging');

  // A dispatch result's "was this simulated" signal isn't consistent across
  // providers — the plain simulation-mode path sets `simulated: true`, but
  // messaging.js's Resend branch only encodes it via `status: 'simulated'`.
  // Check both so a live Resend reply isn't misrecorded as failed/unclear.
  const wasSimulated = (r) => r?.simulated === true || r?.status === 'simulated';

  if (source === 'inbound_message') {
    const comm = {
      id: uuidv4(), record_id: msg.matched_record_id || null,
      environment_id: msg.environment_id, type: 'email', direction: 'outbound',
      subject: subject || `Re: ${msg.subject}`, body, to_email: msg.from_email,
      thread_id: msg.thread_id || msg.id,
      related_record_id: msg.related_record_id || null,
      context: msg.context || 'general',
      status: 'sending',
      // Without this, the "mine" filter's myThreads lookup (outbound comms
      // authored by the current user) never matches anything a user replies
      // to from the inbox.
      created_by: req.body.created_by || req.headers['x-user-id'] || null,
      sent_at: new Date().toISOString(), created_at: new Date().toISOString()
    };
    let dispatchResult;
    try {
      dispatchResult = await sendEmail({
        to: msg.from_email, toName: msg.from_name,
        subject: comm.subject, text: body, html: body.replace(/\n/g, '<br>'),
        // tags.environment_id is how messaging.js's Resend branch picks the
        // replying environment's own verified/auto-provisioned domain rather
        // than the platform default — see services/mailer.js.
        tags: { environment_id: msg.environment_id },
      });
      comm.status = wasSimulated(dispatchResult) ? 'simulated' : 'sent';
    } catch (err) {
      dispatchResult = { error: err.message };
      comm.status = 'failed';
    }
    comm.provider = dispatchResult.provider || null;
    comm.provider_message_id = dispatchResult.messageId || null;
    comm.simulated = wasSimulated(dispatchResult);
    store.communications.push(comm);
    const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
    if (idx !== -1) {
      store.inbound_messages[idx].read = true;
      store.inbound_messages[idx].read_at = new Date().toISOString();
    }
    saveStore(store);
    return res.json({ ...comm, dispatch_error: dispatchResult.error || null });
  }

  // communication-sourced (sms/whatsapp/web/email written directly into
  // communications): reply in the same channel/type as the original message.
  const to = msg.from_email || msg.from_number || msg.from_address || undefined;
  const comm = {
    id: uuidv4(), record_id: msg.record_id || null,
    environment_id: msg.environment_id, type: msg.type, direction: 'outbound',
    subject: subject || (msg.subject ? `Re: ${msg.subject}` : undefined), body,
    to, thread_id: msg.thread_id || msg.id,
    related_record_id: msg.related_record_id || null,
    context: msg.context || 'general',
    status: 'sending',
    created_by: req.body.created_by || req.headers['x-user-id'] || null,
    sent_at: new Date().toISOString(), created_at: new Date().toISOString()
  };
  let dispatchResult;
  try {
    if (msg.type === 'sms') {
      dispatchResult = await sendSMS({ to, body });
    } else if (msg.type === 'whatsapp') {
      dispatchResult = await sendWhatsApp({ to, body });
    } else if (msg.type === 'email') {
      dispatchResult = await sendEmail({
        to, subject: comm.subject, text: body, html: body.replace(/\n/g, '<br>'),
        tags: { environment_id: msg.environment_id },
      });
    } else {
      // 'web' (or any other channel with no outbound send capability in
      // services/messaging.js) — there is no live dispatch path for this,
      // so record honestly as simulated rather than claiming a send that
      // has no mechanism behind it.
      dispatchResult = { simulated: true, status: 'simulated' };
    }
    comm.status = wasSimulated(dispatchResult) ? 'simulated' : 'sent';
  } catch (err) {
    dispatchResult = { error: err.message };
    comm.status = 'failed';
  }
  comm.provider = dispatchResult.provider || null;
  comm.provider_message_id = dispatchResult.messageId || null;
  comm.provider_sid = dispatchResult.sid || null;
  comm.simulated = wasSimulated(dispatchResult);
  store.communications.push(comm);
  const idx = store.communications.findIndex(c => c.id === req.params.id);
  if (idx !== -1) {
    store.communications[idx].read = true;
    store.communications[idx].read_at = new Date().toISOString();
  }
  saveStore(store);
  res.json({ ...comm, dispatch_error: dispatchResult.error || null });
});

// Note: this router used to also expose POST /inbound (a SendGrid/Postmark
// inbound-parse webhook) and POST /seed-test (a dev-only fake-inbound
// generator for demoing it). Both were removed 2026-09-12 — /inbound was
// never reachable in production (missing from index.js's AUTH_EXEMPT and
// middleware/csrf.js's exemption list, and no SendGrid Inbound Parse DNS/MX
// setup ever existed to call it), and nothing else in the repo referenced
// either route. Live inbound email now arrives exclusively via
// routes/communications.js's POST /webhook/email (MailerSend), which writes
// straight into store.communications with direction:'inbound' — already
// merged into the unified inbox by the "2. Inbound SMS / WhatsApp / web /
// not-yet-mirrored email from communications" block in GET / above. Historic
// rows already in store.inbound_messages (from either removed route, back
// when they were live) are untouched and still display normally; nothing
// writes new ones anymore.

// DELETE /api/inbox/:id
router.delete('/:id', (req, res) => {
  const store = getStore();
  const resolved = resolveUnifiedMessage(store, req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Not found' });
  if (resolved.source === 'inbound_message') {
    store.inbound_messages = store.inbound_messages.filter(m => m.id !== req.params.id);
  } else {
    store.communications = store.communications.filter(c => c.id !== req.params.id);
  }
  saveStore(store);
  res.json({ deleted: true });
});

module.exports = router;
