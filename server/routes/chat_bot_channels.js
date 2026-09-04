// server/routes/chat_bot_channels.js
// Admin management of Slack / Microsoft Teams workspace connections and
// identity links. Mounted at /api/chat-bot-channels — normal authenticated
// route. Credential encryption matches routes/integrations.js exactly (same
// AES-256-GCM scheme keyed off INTEGRATION_SECRET).

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore, getCurrentTenant } = require('../db/init');
const { hasGlobalAction } = require('../middleware/rbac');
const gateway = require('../services/chat_bot_gateway');

function checkGlobal(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }); return false; }
  if (!hasGlobalAction(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

function ensure() {
  const s = getStore();
  let changed = false;
  if (!s.chat_bot_channels)       { s.chat_bot_channels = [];       changed = true; }
  if (!s.chat_bot_identity_links) { s.chat_bot_identity_links = []; changed = true; }
  if (changed) saveStore();
}

if (process.env.NODE_ENV === 'production' && !process.env.INTEGRATION_SECRET) {
  console.error('[SECURITY] INTEGRATION_SECRET env var is not set. Bot channel credentials will not be encrypted securely.');
}
const ENC_KEY = process.env.INTEGRATION_SECRET
  ? Buffer.from(process.env.INTEGRATION_SECRET.padEnd(32).slice(0, 32))
  : crypto.scryptSync('vercentic-dev-only-fallback-key-' + (process.env.NODE_ENV || 'dev'), 'vercentic-salt', 32);

function encrypt(plain) {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}
function decrypt(encoded) {
  if (!encoded || typeof encoded !== 'string' || !encoded.includes(':')) return encoded;
  try {
    const [ivHex, tagHex, encHex] = encoded.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  } catch { return null; }
}
function mask(v) { return v ? `••••••••${String(v).slice(-4)}` : null; }

function serializeChannel(c) {
  return {
    id: c.id, environment_id: c.environment_id, platform: c.platform, status: c.status,
    external_workspace_id: c.external_workspace_id, external_workspace_name: c.external_workspace_name,
    default_channel_id: c.default_channel_id, installed_by_user_id: c.installed_by_user_id,
    created_at: c.created_at, updated_at: c.updated_at,
    bot_token_masked: mask(decrypt(c.bot_token)),
    signing_secret_set: !!c.signing_secret,
    app_password_set: !!c.app_password,
  };
}

router.get('/', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  res.json(query('chat_bot_channels', c => c.environment_id === environment_id).map(serializeChannel));
});

// POST /slack — connect a Slack workspace.
// bot_token: xoxb-... from OAuth & Permissions after installing the app.
// signing_secret: from Basic Information, used to verify inbound webhooks.
router.post('/slack', async (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  ensure();
  const { environment_id, bot_token, signing_secret, default_channel_id } = req.body;
  if (!environment_id || !bot_token || !signing_secret) return res.status(400).json({ error: 'environment_id, bot_token and signing_secret required' });

  let identity;
  try {
    const resp = await fetch('https://slack.com/api/auth.test', { headers: { Authorization: `Bearer ${bot_token}` } });
    identity = await resp.json();
    if (!identity.ok) return res.status(400).json({ error: `Slack rejected the token: ${identity.error}` });
  } catch (err) {
    return res.status(400).json({ error: `Could not reach Slack: ${err.message}` });
  }

  const existing = findOne('chat_bot_channels', c => c.environment_id === environment_id && c.platform === 'slack' && c.external_workspace_id === identity.team_id);
  const row = {
    environment_id, platform: 'slack', status: 'connected',
    external_workspace_id: identity.team_id, external_workspace_name: identity.team,
    bot_user_id: identity.user_id, default_channel_id: default_channel_id || null,
    bot_token: encrypt(bot_token), signing_secret: encrypt(signing_secret),
    installed_by_user_id: req.currentUser.id, tenant_slug: getCurrentTenant(),
    updated_at: new Date().toISOString(),
  };
  const saved = existing ? update('chat_bot_channels', c => c.id === existing.id, row) : insert('chat_bot_channels', { id: uuidv4(), ...row, created_at: new Date().toISOString() });
  res.status(existing ? 200 : 201).json(serializeChannel(saved));
});

// POST /teams — connect a Microsoft Teams bot registration (per-tenant
// Azure Bot resource, same pilot pattern as Slack's own-app model).
router.post('/teams', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  ensure();
  const { environment_id, app_id, app_password, tenant_id, default_channel_id } = req.body;
  if (!environment_id || !app_id || !app_password) return res.status(400).json({ error: 'environment_id, app_id and app_password required' });

  const existing = findOne('chat_bot_channels', c => c.environment_id === environment_id && c.platform === 'microsoft_teams' && c.external_workspace_id === (tenant_id || app_id));
  const row = {
    environment_id, platform: 'microsoft_teams', status: 'connected',
    external_workspace_id: tenant_id || app_id, external_workspace_name: null,
    app_id, app_password: encrypt(app_password), default_channel_id: default_channel_id || null,
    installed_by_user_id: req.currentUser.id, tenant_slug: getCurrentTenant(),
    updated_at: new Date().toISOString(),
  };
  const saved = existing ? update('chat_bot_channels', c => c.id === existing.id, row) : insert('chat_bot_channels', { id: uuidv4(), ...row, created_at: new Date().toISOString() });
  res.status(existing ? 200 : 201).json(serializeChannel(saved));
});

router.delete('/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const row = findOne('chat_bot_channels', c => c.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  update('chat_bot_channels', c => c.id === req.params.id, { status: 'disconnected' });
  res.json({ disconnected: true });
});

router.post('/:id/test-message', async (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  const channel = findOne('chat_bot_channels', c => c.id === req.params.id);
  if (!channel) return res.status(404).json({ error: 'Not found' });
  try {
    if (channel.platform === 'slack') {
      const resp = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${decrypt(channel.bot_token)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: req.body.channel_id || channel.default_channel_id, text: '👋 Vercentic is connected and ready. Try messaging me: "my digest"' }),
      });
      const data = await resp.json();
      if (!data.ok) return res.status(400).json({ error: data.error });
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Teams test messages require a conversation reference from an existing chat — message the bot first, then use event-triggered alerts.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function postToChannel(channel, response) {
  if (channel.platform === 'slack') {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${decrypt(channel.bot_token)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channel.default_channel_id, text: response.text, blocks: response.blocks }),
    });
    return;
  }
  // Teams proactive sends need a stored conversation reference — see
  // chat_bot_webhooks.js, which persists it after the first inbound message.
  // Production hardening: use botbuilder's CloudAdapter.continueConversationAsync
  // rather than a hand-rolled REST call.
}

router.get('/identity-links', (req, res) => {
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const rows = query('chat_bot_identity_links', l => l.environment_id === environment_id);
  const userMap = Object.fromEntries((getStore().users || []).map(u => [u.id, `${u.first_name} ${u.last_name}`.trim()]));
  res.json(rows.map(l => ({ ...l, vercentic_user_name: l.vercentic_user_id ? userMap[l.vercentic_user_id] : null })));
});

router.post('/identity-links/redeem', (req, res) => {
  const { code, vercentic_user_id } = req.body;
  if (!code || !vercentic_user_id) return res.status(400).json({ error: 'code and vercentic_user_id required' });
  const linked = gateway.completeLinkByCode(code.toUpperCase(), vercentic_user_id);
  if (!linked) return res.status(404).json({ error: 'Invalid or already-used code' });
  res.json(linked);
});

router.delete('/identity-links/:id', (req, res) => {
  if (checkGlobal(req, res, 'manage_conversational_actions') === false) return;
  remove('chat_bot_identity_links', l => l.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
module.exports.postToChannel = postToChannel;
