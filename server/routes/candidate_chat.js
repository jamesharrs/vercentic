// server/routes/candidate_chat.js — Candidate Chat / Inbox
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');

const now = () => new Date().toISOString();

// Long-poll queues: { [chatId]: [{ resolve, timer }] }
const pollQueues = {};

function ensureCollections() {
  const s = getStore();
  if (!s.chats)         s.chats = [];
  if (!s.chat_messages) s.chat_messages = [];
}

function notifyPoll(chatId) {
  const queue = pollQueues[chatId] || [];
  while (queue.length) {
    const { resolve, timer } = queue.shift();
    clearTimeout(timer);
    resolve();
  }
  delete pollQueues[chatId];
}

// ─── GET /chats/stats/summary ─────────────────────────────────────────────────
router.get('/stats/summary', (req, res) => {
  ensureCollections();
  const { environment_id } = req.query;
  let chats = query('chats', c => !c.deleted_at);
  if (environment_id) chats = chats.filter(c => c.environment_id === environment_id);
  const msgs = query('chat_messages', m => chats.some(c => c.id === m.chat_id));
  res.json({
    total:    chats.length,
    open:     chats.filter(c => c.status === 'open').length,
    pending:  chats.filter(c => c.status === 'pending').length,
    resolved: chats.filter(c => c.status === 'resolved').length,
    unread:   msgs.filter(m => !m.read_at && m.direction === 'inbound').length,
    urgent:   chats.filter(c => c.priority === 'urgent' && c.status !== 'resolved').length,
  });
});

// ─── GET /chats ───────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  ensureCollections();
  const { environment_id, record_id, status, limit = 50 } = req.query;
  let chats = query('chats', c => !c.deleted_at);
  if (environment_id) chats = chats.filter(c => c.environment_id === environment_id);
  if (record_id)      chats = chats.filter(c => c.record_id === record_id);
  if (status)         chats = chats.filter(c => c.status === status);
  chats = chats
    .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
    .slice(0, Number(limit));
  const result = chats.map(chat => {
    const msgs  = query('chat_messages', m => m.chat_id === chat.id);
    const last  = msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const unread = msgs.filter(m => !m.read_at && m.direction === 'inbound').length;
    return { ...chat, last_message: last || null, unread_count: unread, message_count: msgs.length };
  });
  res.json(result);
});

// ─── GET /chats/:id ───────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  ensureCollections();
  const chat = findOne('chats', c => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Not found' });
  const messages = query('chat_messages', m => m.chat_id === chat.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json({ ...chat, messages });
});

// ─── POST /chats ──────────────────────────────────────────────────────────────
router.post('/', express.json(), (req, res) => {
  ensureCollections();
  const { record_id, environment_id, channel = 'internal', subject,
          participant_name, participant_email, participant_phone, created_by } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const chat = insert('chats', {
    id: uuidv4(), environment_id, record_id: record_id || null, channel,
    subject: subject || 'New conversation', status: 'open', priority: 'normal',
    participant_name: participant_name || null,
    participant_email: participant_email || null,
    participant_phone: participant_phone || null,
    assigned_to_user_id: null, labels: [],
    last_message_at: now(), created_by: created_by || null,
    created_at: now(), updated_at: now(),
  });
  saveStore();
  res.status(201).json(chat);
});

// ─── PATCH /chats/:id ─────────────────────────────────────────────────────────
router.patch('/:id', express.json(), (req, res) => {
  ensureCollections();
  const allowed = ['status','priority','subject','assigned_to_user_id','labels',
                   'participant_name','participant_email'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = update('chats', c => c.id === req.params.id, { ...patch, updated_at: now() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  saveStore();
  res.json(updated);
});

// ─── DELETE /chats/:id ────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  ensureCollections();
  update('chats', c => c.id === req.params.id, { deleted_at: now() });
  saveStore();
  res.json({ ok: true });
});

// ─── GET /chats/:id/messages ──────────────────────────────────────────────────
router.get('/:id/messages', (req, res) => {
  ensureCollections();
  const { limit = 50 } = req.query;
  const msgs = query('chat_messages', m => m.chat_id === req.params.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(msgs.slice(-Number(limit)));
});

// ─── POST /chats/:id/messages ─────────────────────────────────────────────────
router.post('/:id/messages', express.json(), (req, res) => {
  ensureCollections();
  const { body, direction = 'outbound', sender_id, sender_name,
          attachments = [], message_type = 'text' } = req.body;
  if (!body?.trim() && !attachments.length)
    return res.status(400).json({ error: 'body required' });
  const chat = findOne('chats', c => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const msg = insert('chat_messages', {
    id: uuidv4(), chat_id: req.params.id,
    body: body?.trim() || null, direction, message_type,
    sender_id: sender_id || null, sender_name: sender_name || null,
    attachments, read_at: direction === 'outbound' ? now() : null,
    created_at: now(),
  });
  update('chats', c => c.id === req.params.id, {
    last_message_at: now(),
    status: chat.status === 'resolved' ? 'open' : chat.status,
    updated_at: now(),
  });
  saveStore();
  notifyPoll(req.params.id);
  res.status(201).json(msg);
});

// ─── POST /chats/:id/read-all ─────────────────────────────────────────────────
router.post('/:id/read-all', (req, res) => {
  ensureCollections();
  const s = getStore();
  (s.chat_messages || []).forEach(m => {
    if (m.chat_id === req.params.id && !m.read_at && m.direction === 'inbound')
      m.read_at = now();
  });
  saveStore();
  res.json({ ok: true });
});

// ─── GET /chats/:id/poll — long-poll for new messages ─────────────────────────
router.get('/:id/poll', async (req, res) => {
  ensureCollections();
  const since = req.query.since ? new Date(req.query.since) : new Date(0);
  const getNew = () =>
    query('chat_messages', m => m.chat_id === req.params.id && new Date(m.created_at) > since);
  const newMsgs = getNew();
  if (newMsgs.length) return res.json(newMsgs);
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 25000);
    if (!pollQueues[req.params.id]) pollQueues[req.params.id] = [];
    pollQueues[req.params.id].push({ resolve, timer });
  });
  res.json(getNew());
});

// ─── POST /chats/:id/ai-suggest ───────────────────────────────────────────────
router.post('/:id/ai-suggest', express.json(), async (req, res) => {
  ensureCollections();
  const chat = findOne('chats', c => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: 'Not found' });
  const { tone = 'professional' } = req.body;
  const messages = query('chat_messages', m => m.chat_id === chat.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(-10);
  const convHistory = messages.map(m =>
    `[${m.direction === 'inbound' ? 'Candidate' : 'Recruiter'}]: ${m.body}`).join('\n');
  let recordCtx = '';
  if (chat.record_id) {
    const rec = findOne('records', r => r.id === chat.record_id);
    if (rec?.data) {
      const { first_name, last_name, current_title } = rec.data;
      recordCtx = `Candidate: ${[first_name,last_name].filter(Boolean).join(' ')} — ${current_title||''}`;
    }
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 400,
      messages: [{ role: 'user', content:
        `You are a ${tone} recruiter. Write a short reply (2–3 sentences) to this candidate conversation.\n${recordCtx}\n\nConversation:\n${convHistory}\n\nWrite ONLY the reply body.`
      }],
    });
    res.json({ suggestion: r.content[0]?.text?.trim() || '' });
  } catch (err) {
    res.status(500).json({ error: 'AI suggestion failed: ' + err.message });
  }
});

// ─── POST /chats/inbound — receive from Twilio/email webhook ─────────────────
router.post('/inbound', express.json(), (req, res) => {
  ensureCollections();
  const { environment_id, channel, from_name, from_email, from_phone, body, subject } = req.body;
  let chat = from_email
    ? findOne('chats', c => c.participant_email === from_email && c.status !== 'resolved' && c.environment_id === environment_id)
    : from_phone
    ? findOne('chats', c => c.participant_phone === from_phone && c.status !== 'resolved' && c.environment_id === environment_id)
    : null;
  if (!chat) {
    chat = insert('chats', {
      id: uuidv4(), environment_id, channel: channel || 'email',
      subject: subject || `Message from ${from_name || from_email || 'unknown'}`,
      status: 'open', priority: 'normal',
      participant_name: from_name || null, participant_email: from_email || null,
      participant_phone: from_phone || null,
      assigned_to_user_id: null, labels: [],
      last_message_at: now(), created_by: 'system', created_at: now(), updated_at: now(),
    });
  }
  const msg = insert('chat_messages', {
    id: uuidv4(), chat_id: chat.id, body: body || '(empty)',
    direction: 'inbound', message_type: 'text',
    sender_name: from_name || from_email || from_phone,
    sender_id: null, attachments: [], read_at: null, created_at: now(),
  });
  update('chats', c => c.id === chat.id, { last_message_at: now(), updated_at: now() });
  saveStore();
  notifyPoll(chat.id);
  res.json({ chat_id: chat.id, message_id: msg.id });
});

module.exports = router;
