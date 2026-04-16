'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

let _wss = null;
function setWss(wss) { _wss = wss; }

function broadcast(channel, payload) {
  if (!_wss) return;
  const msg = JSON.stringify({ channel, ...payload });
  _wss.clients.forEach(client => {
    if (client.readyState === 1 && client.subscriptions?.has(channel)) client.send(msg);
  });
}

function ensureCollections() {
  const s = getStore();
  if (!s.conversations) s.conversations = [];
  if (!s.conversation_messages) s.conversation_messages = [];
  saveStore(s);
}

// POST /api/live-chat/conversations — start or resume a session
router.post('/conversations', (req, res) => {
  ensureCollections();
  const { portal_id, session_id, source_url, visitor_name, visitor_email, initial_message, environment_id } = req.body;
  const s = getStore();
  const existing = s.conversations.find(c => c.session_id === session_id && c.status !== 'resolved');
  if (existing) return res.json(existing);
  const conv = {
    id: uuidv4(), portal_id: portal_id || null, session_id: session_id || uuidv4(),
    environment_id: environment_id || null, status: 'bot',
    identity_status: visitor_email ? 'partial' : 'anonymous',
    visitor_name: visitor_name || null, visitor_email: visitor_email || null, visitor_phone: null,
    person_id: null, claimed_by: null, claimed_at: null, source_url: source_url || null, unread_agent: 0,
    created_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
  };
  s.conversations.push(conv);
  if (initial_message) {
    s.conversation_messages.push({ id: uuidv4(), conversation_id: conv.id, role: 'visitor', content: initial_message, created_at: new Date().toISOString(), read: false });
  }
  saveStore(s);
  res.status(201).json(conv);
});

// GET /api/live-chat/conversations
router.get('/conversations', (req, res) => {
  ensureCollections();
  const userId = req.headers['x-user-id'];
  const { status, mine, environment_id, search, limit = 50, offset = 0 } = req.query;
  const s = getStore();
  let convs = s.conversations || [];
  if (environment_id) convs = convs.filter(c => c.environment_id === environment_id);
  if (status)         convs = convs.filter(c => c.status === status);
  if (mine === 'true' && userId) convs = convs.filter(c => c.claimed_by === userId);
  if (search) { const q = search.toLowerCase(); convs = convs.filter(c => c.visitor_name?.toLowerCase().includes(q) || c.visitor_email?.toLowerCase().includes(q)); }
  convs = convs.sort((a, b) => {
    if (a.status === 'escalated' && b.status !== 'escalated') return -1;
    if (b.status === 'escalated' && a.status !== 'escalated') return 1;
    return new Date(b.last_message_at) - new Date(a.last_message_at);
  });
  const total = convs.length;
  const enriched = convs.slice(Number(offset), Number(offset) + Number(limit)).map(c => {
    let person = null;
    if (c.person_id) {
      const rec = (s.records || []).find(r => r.id === c.person_id);
      if (rec) { const d = rec.data || {}; person = { id: rec.id, name: [d.first_name,d.last_name].filter(Boolean).join(' ') || d.email, email: d.email }; }
    }
    let claimed_by_user = null;
    if (c.claimed_by) { const u = (s.users||[]).find(u=>u.id===c.claimed_by); if(u) claimed_by_user={id:u.id,name:`${u.first_name} ${u.last_name}`}; }
    const msgs = (s.conversation_messages||[]).filter(m=>m.conversation_id===c.id);
    const lastMsg = msgs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    return { ...c, person, claimed_by_user, last_message_preview: lastMsg?.content?.slice(0,80)||null, message_count: msgs.length };
  });
  res.json({ conversations: enriched, total });
});

// GET /api/live-chat/conversations/:id
router.get('/conversations/:id', (req, res) => {
  ensureCollections();
  const s = getStore();
  const conv = (s.conversations||[]).find(c=>c.id===req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const messages = (s.conversation_messages||[]).filter(m=>m.conversation_id===conv.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  let person = null;
  if (conv.person_id) { const rec=(s.records||[]).find(r=>r.id===conv.person_id); if(rec){const d=rec.data||{};person={id:rec.id,name:[d.first_name,d.last_name].filter(Boolean).join(' ')||d.email,email:d.email};} }
  let claimed_by_user = null;
  if (conv.claimed_by) { const u=(s.users||[]).find(u=>u.id===conv.claimed_by); if(u) claimed_by_user={id:u.id,name:`${u.first_name} ${u.last_name}`}; }
  res.json({ ...conv, messages, person, claimed_by_user });
});

// POST /api/live-chat/conversations/:id/messages
router.post('/conversations/:id/messages', (req, res) => {
  ensureCollections();
  const { content, role = 'visitor' } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  const s = getStore();
  const convIdx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (convIdx === -1) return res.status(404).json({ error: 'Conversation not found' });
  const msg = { id: uuidv4(), conversation_id: req.params.id, role, content: content.trim(), created_at: new Date().toISOString(), read: role === 'visitor' ? false : true };
  s.conversation_messages.push(msg);
  s.conversations[convIdx].last_message_at = msg.created_at;
  if (role === 'visitor') s.conversations[convIdx].unread_agent = (s.conversations[convIdx].unread_agent||0)+1;
  saveStore(s);
  broadcast(`conversation:${req.params.id}`, { type:'message', message:msg });
  if (role === 'visitor') broadcast('team_channel', { type:'new_message', conversation_id:req.params.id, preview:content.slice(0,60) });
  res.status(201).json(msg);
});

// POST /api/live-chat/conversations/:id/escalate
router.post('/conversations/:id/escalate', (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.conversations[idx].status = 'escalated';
  s.conversations[idx].escalated_at = new Date().toISOString();
  saveStore(s);
  broadcast('team_channel', { type:'escalation', conversation_id:req.params.id, visitor_name:s.conversations[idx].visitor_name, visitor_email:s.conversations[idx].visitor_email });
  res.json(s.conversations[idx]);
});

// POST /api/live-chat/conversations/:id/claim
router.post('/conversations/:id/claim', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  ensureCollections();
  const s = getStore();
  const idx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (s.conversations[idx].claimed_by && s.conversations[idx].claimed_by !== userId) return res.status(409).json({ error: 'Already claimed by another agent' });
  const user = (s.users||[]).find(u=>u.id===userId);
  const agentName = user ? `${user.first_name} ${user.last_name}` : 'a recruiter';
  s.conversations[idx].claimed_by = userId;
  s.conversations[idx].claimed_at = new Date().toISOString();
  s.conversations[idx].status = 'claimed';
  const sysMsg = { id:uuidv4(), conversation_id:req.params.id, role:'system', content:`You're now chatting with ${agentName}.`, created_at:new Date().toISOString(), read:true };
  s.conversation_messages.push(sysMsg);
  saveStore(s);
  broadcast(`conversation:${req.params.id}`, { type:'claimed', message:sysMsg, agent_name:agentName });
  res.json(s.conversations[idx]);
});

// POST /api/live-chat/conversations/:id/resolve
router.post('/conversations/:id/resolve', (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  s.conversations[idx].status = 'resolved';
  s.conversations[idx].resolved_at = new Date().toISOString();
  saveStore(s);
  broadcast(`conversation:${req.params.id}`, { type:'resolved' });
  res.json(s.conversations[idx]);
});

// PATCH /api/live-chat/conversations/:id/identity
router.patch('/conversations/:id/identity', (req, res) => {
  const { person_id, visitor_name, visitor_email, visitor_phone } = req.body;
  ensureCollections();
  const s = getStore();
  const idx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  if (visitor_name)  s.conversations[idx].visitor_name  = visitor_name;
  if (visitor_email) s.conversations[idx].visitor_email = visitor_email;
  if (visitor_phone) s.conversations[idx].visitor_phone = visitor_phone;
  if (person_id) {
    s.conversations[idx].person_id = person_id;
    s.conversations[idx].identity_status = 'linked';
    const msgs = (s.conversation_messages||[]).filter(m=>m.conversation_id===req.params.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const transcript = msgs.map(m=>`[${m.role.toUpperCase()}] ${m.content}`).join('\n');
    if (!s.communications) s.communications = [];
    s.communications.push({ id:uuidv4(), record_id:person_id, environment_id:s.conversations[idx].environment_id, type:'live_chat', direction:'inbound', subject:`Live chat – ${s.conversations[idx].visitor_name||'Anonymous visitor'}`, body:transcript, from_name:s.conversations[idx].visitor_name||'Portal visitor', status:'received', conversation_id:req.params.id, sent_at:s.conversations[idx].created_at, created_at:new Date().toISOString() });
  } else {
    s.conversations[idx].identity_status = visitor_email ? 'partial' : s.conversations[idx].identity_status;
  }
  saveStore(s);
  res.json(s.conversations[idx]);
});

// PATCH /api/live-chat/conversations/:id/read
router.patch('/conversations/:id/read', (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = s.conversations.findIndex(c=>c.id===req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  (s.conversation_messages||[]).forEach((m,i) => { if(m.conversation_id===req.params.id && m.role==='visitor') s.conversation_messages[i].read=true; });
  s.conversations[idx].unread_agent = 0;
  saveStore(s);
  res.json({ ok:true });
});

// GET /api/live-chat/unread-count
router.get('/unread-count', (req, res) => {
  ensureCollections();
  const userId = req.headers['x-user-id'];
  const { environment_id } = req.query;
  const s = getStore();
  const convs = (s.conversations||[]).filter(c => {
    if (environment_id && c.environment_id !== environment_id) return false;
    if (c.status === 'resolved') return false;
    if (c.claimed_by && c.claimed_by !== userId) return false;
    return true;
  });
  res.json({ total: convs.reduce((sum,c)=>sum+(c.unread_agent||0),0), escalated: convs.filter(c=>c.status==='escalated').length });
});

module.exports = router;
module.exports.setWss = setWss;
module.exports.broadcast = broadcast;
