const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// GET /api/inbox — list messages
router.get('/', (req, res) => {
  const { environment_id, filter = 'all', page = 1, limit = 50, search } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  let messages = (store.inbound_messages || []).filter(m => m.environment_id === environment_id);
  if (filter === 'unread') messages = messages.filter(m => !m.read);
  if (filter === 'unmatched') messages = messages.filter(m => !m.matched_record_id);
  if (filter === 'mine') messages = messages.filter(m => m.assigned_to === req.query.user_id);
  if (search) {
    const q = search.toLowerCase();
    messages = messages.filter(m =>
      (m.from_name || '').toLowerCase().includes(q) ||
      (m.from_email || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.body_text || '').toLowerCase().includes(q)
    );
  }
  messages.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
  const total = messages.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = messages.slice(start, start + parseInt(limit));
  const records = store.records || [];
  const enriched = paginated.map(m => {
    let matched_record = null;
    if (m.matched_record_id) {
      const rec = records.find(r => r.id === m.matched_record_id);
      if (rec) {
        const d = rec.data || {};
        matched_record = {
          id: rec.id,
          name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown',
          object_id: rec.object_id
        };
      }
    }
    return { ...m, matched_record };
  });
  const unread_count = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id && !m.read).length;
  res.json({ messages: enriched, total, unread_count });
});

// GET /api/inbox/unread-count
router.get('/unread-count', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.json({ count: 0 });
  const store = getStore();
  const count = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id && !m.read).length;
  res.json({ count });
});

// GET /api/inbox/:id — single message with thread
router.get('/:id', (req, res) => {
  const store = getStore();
  const msg = (store.inbound_messages || []).find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  let thread = [];
  if (msg.thread_id) {
    const comms = (store.communications || []).filter(c => c.thread_id === msg.thread_id);
    // Track which inbound_message_ids are already represented in comms
    const coveredInboundIds = new Set(comms.map(c => c.inbound_message_id).filter(Boolean));
    // Only include raw inbound messages not already covered by a comms entry
    const inbound = (store.inbound_messages || []).filter(m =>
      m.thread_id === msg.thread_id && !coveredInboundIds.has(m.id)
    );
    thread = [...comms, ...inbound].sort((a, b) =>
      new Date(a.sent_at || a.received_at) - new Date(b.sent_at || b.received_at));
  }
  let matched_record = null;
  if (msg.matched_record_id) {
    const rec = (store.records || []).find(r => r.id === msg.matched_record_id);
    if (rec) {
      const d = rec.data || {};
      matched_record = {
        id: rec.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown',
        email: d.email, object_id: rec.object_id
      };
    }
  }
  res.json({ ...msg, thread, matched_record });
});

// PATCH /api/inbox/:id/read
router.patch('/:id/read', (req, res) => {
  const store = getStore();
  if (!store.inbound_messages) return res.status(404).json({ error: 'Not found' });
  const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.inbound_messages[idx] = {
    ...store.inbound_messages[idx],
    read: req.body.read !== false,
    read_at: req.body.read !== false ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };
  saveStore(store);
  res.json(store.inbound_messages[idx]);
});

// PATCH /api/inbox/:id/assign
router.patch('/:id/assign', (req, res) => {
  const { user_id } = req.body;
  const store = getStore();
  if (!store.inbound_messages) return res.status(404).json({ error: 'Not found' });
  const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.inbound_messages[idx] = {
    ...store.inbound_messages[idx], assigned_to: user_id || null,
    updated_at: new Date().toISOString()
  };
  saveStore(store);
  res.json(store.inbound_messages[idx]);
});

// PATCH /api/inbox/:id/link — link to a person record
router.patch('/:id/link', (req, res) => {
  const { record_id } = req.body;
  const store = getStore();
  if (!store.inbound_messages) return res.status(404).json({ error: 'Not found' });
  const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
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
  res.json(store.inbound_messages[idx]);
});

// POST /api/inbox/:id/reply
router.post('/:id/reply', async (req, res) => {
  const { body, subject } = req.body;
  const store = getStore();
  const msg = (store.inbound_messages || []).find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (!store.communications) store.communications = [];
  const comm = {
    id: uuidv4(), record_id: msg.matched_record_id || null,
    environment_id: msg.environment_id, type: 'email', direction: 'outbound',
    subject: subject || `Re: ${msg.subject}`, body, to_email: msg.from_email,
    thread_id: msg.thread_id || msg.id,
    related_record_id: msg.related_record_id || null,
    context: msg.context || 'general',
    status: 'sent',
    sent_at: new Date().toISOString(), created_at: new Date().toISOString()
  };
  store.communications.push(comm);
  const idx = store.inbound_messages.findIndex(m => m.id === req.params.id);
  if (idx !== -1) {
    store.inbound_messages[idx].read = true;
    store.inbound_messages[idx].read_at = new Date().toISOString();
  }
  saveStore(store);
  res.json({ ...comm, simulated: !process.env.SENDGRID_API_KEY });
});

// POST /api/inbox/inbound — SendGrid/Postmark webhook
router.post('/inbound', async (req, res) => {
  try {
    const payload = req.body;
    const from_email = (payload.from || '').match(/<(.+)>/)?.[1] || payload.from || '';
    const from_name = (payload.from || '').replace(/<.+>/, '').trim().replace(/^"|"$/g, '');
    const subject = payload.subject || '(no subject)';
    const body_text = payload.text || payload['body-plain'] || '';
    const message_id = payload['Message-Id'] || uuidv4();
    const in_reply_to = payload['In-Reply-To'] || null;
    const store = getStore();
    if (!store.inbound_messages) store.inbound_messages = [];
    let environment_id = (store.environments || [])[0]?.id || null;
    let matched_record_id = null;
    const matched = (store.records || []).find(r =>
      r.environment_id === environment_id &&
      (r.data?.email || '').toLowerCase() === from_email.toLowerCase()
    );
    if (matched) matched_record_id = matched.id;
    let thread_id = null;
    if (in_reply_to) {
      const prev = store.inbound_messages.find(m => m.message_id === in_reply_to);
      thread_id = prev?.thread_id || prev?.id || in_reply_to;
    }
    if (!thread_id) thread_id = uuidv4();

    // Inherit related_record_id and context from the original outbound thread
    let related_record_id = null;
    let context = 'general';
    if (thread_id) {
      const origComm = (store.communications || []).find(c => c.thread_id === thread_id && c.direction === 'outbound');
      if (origComm?.related_record_id) {
        related_record_id = origComm.related_record_id;
        context = 'application';
      }
    }
    const msg = {
      id: uuidv4(), environment_id, message_id, thread_id, from_email,
      from_name: from_name || from_email, subject, body_text,
      matched_record_id, related_record_id, context,
      read: false, assigned_to: null,
      received_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    store.inbound_messages.push(msg);
    if (matched_record_id) {
      if (!store.communications) store.communications = [];
      store.communications.push({
        id: uuidv4(), record_id: matched_record_id, environment_id, type: 'email',
        direction: 'inbound', subject, body: body_text, from_email,
        from_name: from_name || from_email, status: 'received', thread_id,
        related_record_id, context,
        inbound_message_id: msg.id, sent_at: msg.received_at, created_at: new Date().toISOString()
      });
    }
    saveStore(store);
    res.status(200).json({ received: true, matched: !!matched_record_id });
  } catch (err) {
    res.status(200).json({ received: true, error: err.message });
  }
});

// POST /api/inbox/seed-test — simulate inbound for dev/testing
router.post('/seed-test', (req, res) => {
  const { environment_id, from_email, from_name, subject, body } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  if (!store.inbound_messages) store.inbound_messages = [];
  let matched_record_id = null;
  if (from_email) {
    const rec = (store.records || []).find(r =>
      r.environment_id === environment_id &&
      (r.data?.email || '').toLowerCase() === from_email.toLowerCase()
    );
    if (rec) matched_record_id = rec.id;
  }
  const thread_id = uuidv4();
  const msg = {
    id: uuidv4(), environment_id, message_id: `test-${uuidv4()}`, thread_id,
    from_email: from_email || 'candidate@example.com',
    from_name: from_name || 'Test Candidate',
    subject: subject || 'Re: Your application at Vercentic',
    body_text: body || 'Hi, thanks for reaching out. I am very interested in the position and would love to schedule a call.',
    matched_record_id, read: false, assigned_to: null,
    received_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  store.inbound_messages.push(msg);
  if (matched_record_id) {
    if (!store.communications) store.communications = [];
    store.communications.push({
      id: uuidv4(), record_id: matched_record_id, environment_id, type: 'email',
      direction: 'inbound', subject: msg.subject, body: msg.body_text,
      from_email: msg.from_email, from_name: msg.from_name, status: 'received',
      thread_id, inbound_message_id: msg.id, sent_at: msg.received_at, created_at: new Date().toISOString()
    });
  }
  saveStore(store);
  res.json({ message: msg, matched: !!matched_record_id });
});

// DELETE /api/inbox/:id
router.delete('/:id', (req, res) => {
  const store = getStore();
  if (!store.inbound_messages) return res.status(404).json({ error: 'Not found' });
  const before = store.inbound_messages.length;
  store.inbound_messages = store.inbound_messages.filter(m => m.id !== req.params.id);
  if (store.inbound_messages.length === before) return res.status(404).json({ error: 'Not found' });
  saveStore(store);
  res.json({ deleted: true });
});

module.exports = router;
