// server/routes/chat_bot_webhooks.js
// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC bot webhook receivers — Slack Events API / Slash Commands /
// Interactivity, and the Microsoft Teams Bot Framework `/messages` endpoint.
//
// Called directly by Slack's and Microsoft's servers — never a logged-in
// Vercentic user — so this carries no X-User-Id / session cookie. Add this
// router's mount path to AUTH_EXEMPT in index.js (see PATCH notes below).
// CSRF is already a non-issue: middleware/csrf.js's verifyCsrf skips any
// request where req.currentUser is unset, which it always will be here.
//
// Relies on req.rawBody being populated by the global express.json `verify`
// hook (added in the index.js patch) for signature verification — Slack
// signs the exact bytes it sent, not the re-serialised JSON.
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const gateway = require('../services/chat_bot_gateway');
const { update, tenantStorage, insert } = require('../db/init');
const { postToChannel } = require('./chat_bot_channels');

// TEMPORARY diagnostic logger — writes to master tenant regardless of current
// context, so failures on any tenant's webhook are readable from one place.
// Remove alongside the debug route in superadmin_clients.js once resolved.
function debugLog(entry) {
  try {
    tenantStorage.run('master', () => {
      const { getStore, saveStoreNow } = require('../db/init');
      const s = getStore();
      if (!s.chat_bot_webhook_debug) s.chat_bot_webhook_debug = [];
      s.chat_bot_webhook_debug.unshift({ ts: new Date().toISOString(), ...entry });
      if (s.chat_bot_webhook_debug.length > 50) s.chat_bot_webhook_debug.length = 50;
      saveStoreNow('master');
    });
  } catch (e) { console.error('[debugLog] failed:', e.message); }
}

// Same encryption scheme as routes/integrations.js / chat_bot_channels.js
if (process.env.NODE_ENV === 'production' && !process.env.INTEGRATION_SECRET) {
  console.error('[SECURITY] INTEGRATION_SECRET env var is not set for chat_bot_webhooks decryption.');
}
const ENC_KEY = process.env.INTEGRATION_SECRET
  ? Buffer.from(process.env.INTEGRATION_SECRET.padEnd(32).slice(0, 32))
  : crypto.scryptSync('vercentic-dev-only-fallback-key-' + (process.env.NODE_ENV || 'dev'), 'vercentic-salt', 32);

function decryptWithChannelKey(encoded) {
  if (!encoded || !encoded.includes(':')) return encoded;
  try {
    const [ivHex, tagHex, encHex] = encoded.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SLACK
// ═══════════════════════════════════════════════════════════════════════════

function verifySlackSignature(req, signingSecretPlain) {
  const ts = req.headers['x-slack-request-timestamp'];
  const sig = req.headers['x-slack-signature'];
  const diag = { ts_present: !!ts, sig_present: !!sig, rawBody_present: !!req.rawBody, rawBody_length: req.rawBody ? req.rawBody.length : 0 };
  if (!ts || !sig || !req.rawBody) { debugLog({ event: 'sig_fail', reason: 'missing_ts_sig_or_rawbody', ...diag }); return false; }
  const skew = Math.abs(Date.now() / 1000 - Number(ts));
  if (skew > 60 * 5) { debugLog({ event: 'sig_fail', reason: 'timestamp_skew', skew_seconds: skew, ...diag }); return false; }
  const base = `v0:${ts}:${req.rawBody.toString('utf8')}`;
  const hmac = 'v0=' + crypto.createHmac('sha256', signingSecretPlain).update(base).digest('hex');
  let match = false;
  try { match = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig)); } catch (e) { debugLog({ event: 'sig_fail', reason: 'timingSafeEqual_threw', error: e.message, computed_sig: hmac.slice(0,14)+'...', received_sig: sig.slice(0,14)+'...', ...diag }); return false; }
  if (!match) debugLog({ event: 'sig_fail', reason: 'mismatch', computed_sig: hmac.slice(0,14)+'...', received_sig: sig.slice(0,14)+'...', body_preview: req.rawBody.toString('utf8').slice(0,80), skew_seconds: skew, ...diag });
  return match;
}

function findSlackChannelAndVerify(req, teamId) {
  const found = gateway.findChannel('slack', teamId);
  if (!found) { debugLog({ event: 'channel_not_found', team_id: teamId }); return null; }
  const secret = decryptWithChannelKey(found.channel.signing_secret);
  if (!secret) { debugLog({ event: 'secret_decrypt_failed', team_id: teamId, tenant: found.tenantSlug }); return null; }
  if (!verifySlackSignature(req, secret)) return null;
  return found;
}

// NOTE on body parsing: no express.json() is attached to /slack/events or
// /teams/messages below — the global express.json({ verify }) in index.js
// already parses those bodies AND stashes the raw bytes on req.rawBody
// before this router sees the request. A second JSON parser here would try
// to re-read an already-drained stream and fail. The two
// application/x-www-form-urlencoded Slack routes below DO need their own
// parser, since the global parser only handles JSON.

router.post('/slack/events', async (req, res) => {
  const body = req.body || {};
  if (body.type === 'url_verification') return res.json({ challenge: body.challenge });

  const teamId = body.team_id;
  const found = findSlackChannelAndVerify(req, teamId);
  if (!found) return res.status(401).end();

  res.status(200).end(); // Slack requires a response within 3s — ack, then process async

  const event = body.event;
  if (!event || event.bot_id) { debugLog({ event: 'dropped_pre_process', reason: !event ? 'no_event' : 'has_bot_id', body_preview: JSON.stringify(body).slice(0,300) }); return; }
  if (!['app_mention', 'message'].includes(event.type)) { debugLog({ event: 'dropped_pre_process', reason: 'unhandled_event_type', event_type: event.type }); return; }
  if (event.channel_type && event.channel_type !== 'im' && event.type !== 'app_mention') { debugLog({ event: 'dropped_pre_process', reason: 'wrong_channel_type', channel_type: event.channel_type, event_type: event.type }); return; }

  const text = (event.text || '').replace(/<@[^>]+>/g, '').trim();
  if (!text) { debugLog({ event: 'dropped_pre_process', reason: 'empty_text_after_strip', raw_text: event.text }); return; }

  debugLog({ event: 'processing', team_id: teamId, tenant: found.tenantSlug, user: event.user, channel: event.channel, text });

  try {
    const response = await gateway.handleInboundMessage({
      platform: 'slack', externalWorkspaceId: teamId,
      externalUserId: event.user, externalUserName: null,
      conversationId: event.channel, text,
    });
    debugLog({ event: 'gateway_response', response_text: response?.text, response_blocks: !!response?.blocks });

    const slackResp = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${decryptWithChannelKey(found.channel.bot_token)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: event.channel, text: response.text, blocks: response.blocks }),
    });
    const slackData = await slackResp.json();
    debugLog({ event: 'slack_reply_attempt', slack_ok: slackData.ok, slack_error: slackData.error || null, http_status: slackResp.status });
  } catch (err) {
    debugLog({ event: 'exception', error: err.message, stack: err.stack?.slice(0, 400) });
    console.error('[ChatBot/Slack] handling error:', err.message);
  }
});

// -- Slash command (/vercentic <text>) ----------------------------------------
router.post('/slack/commands', express.urlencoded({ extended: true, verify: (req, _res, buf) => { req.rawBody = buf; } }), async (req, res) => {
  const { team_id, user_id, channel_id, text } = req.body;
  const found = findSlackChannelAndVerify(req, team_id);
  if (!found) return res.status(401).end();

  res.json({ response_type: 'ephemeral', text: 'Working on it…' }); // must ack within 3s

  try {
    const response = await gateway.handleInboundMessage({
      platform: 'slack', externalWorkspaceId: team_id,
      externalUserId: user_id, externalUserName: null,
      conversationId: channel_id, text: text || '',
    });
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${decryptWithChannelKey(found.channel.bot_token)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channel_id, text: response.text, blocks: response.blocks }),
    });
  } catch (err) {
    console.error('[ChatBot/Slack] slash command error:', err.message);
  }
});

// -- Interactivity (button clicks — e.g. Approve/Decline on an approval card)
router.post('/slack/interactive', express.urlencoded({ extended: true, verify: (req, _res, buf) => { req.rawBody = buf; } }), async (req, res) => {
  let payload;
  try { payload = JSON.parse(req.body.payload); } catch { return res.status(400).end(); }
  const teamId = payload.team?.id;
  const found = findSlackChannelAndVerify(req, teamId);
  if (!found) return res.status(401).end();

  res.status(200).end();

  const action = payload.actions?.[0];
  if (!action) return;
  // Buttons are built with value = "approval_action|<target_id>|<decision>"
  const [kind, targetId, decision] = (action.value || '').split('|');
  if (kind !== 'approval_action') return;

  try {
    const response = await gateway.handleInboundMessage({
      platform: 'slack', externalWorkspaceId: teamId,
      externalUserId: payload.user?.id, externalUserName: payload.user?.name,
      conversationId: payload.channel?.id,
      text: `approve ${targetId} ${decision}`,
    });
    await fetch(payload.response_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replace_original: true, text: response.text, blocks: response.blocks }),
    });
  } catch (err) {
    console.error('[ChatBot/Slack] interactive error:', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT TEAMS
// ═══════════════════════════════════════════════════════════════════════════
// JWT validation per the Bot Framework Activity Protocol. For production
// hardening, prefer the official `botbuilder` SDK's CloudAdapter, which
// additionally handles token refresh and channel allow-listing. This
// hand-rolled version covers the essentials: signature, audience, expiry.

let jwksClient = null;
try { jwksClient = require('jwks-rsa'); } catch { /* npm install jwks-rsa */ }
let jwt = null;
try { jwt = require('jsonwebtoken'); } catch { /* already a project dependency */ }

let _jwksClientInstance = null;
async function getSigningKey(kid) {
  if (!_jwksClientInstance) {
    if (!jwksClient) throw new Error('jwks-rsa not installed');
    _jwksClientInstance = jwksClient({ jwksUri: 'https://login.botframework.com/v1/keys', cache: true, cacheMaxAge: 24 * 60 * 60 * 1000 });
  }
  const key = await _jwksClientInstance.getSigningKey(kid);
  return key.getPublicKey();
}

async function verifyTeamsToken(req, expectedAppId) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !jwt) return false;
  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader?.header?.kid) return false;
    const publicKey = await getSigningKey(decodedHeader.header.kid);
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    if (payload.aud !== expectedAppId) return false;
    return true;
  } catch (err) {
    console.warn('[ChatBot/Teams] token verification failed:', err.message);
    return false;
  }
}

router.post('/teams/messages', async (req, res) => {
  const activity = req.body || {};
  const appId = activity.recipient?.id;
  const tenantAadId = activity.channelData?.tenant?.id;

  const found = gateway.findChannel('microsoft_teams', tenantAadId) || gateway.findChannel('microsoft_teams', appId);
  if (!found) return res.status(401).end();

  const verified = await verifyTeamsToken(req, found.channel.app_id);
  if (!verified) return res.status(401).end();

  res.status(200).end();

  if (activity.type !== 'message' || !activity.text) return;

  update('chat_bot_channels', c => c.id === found.channel.id, {
    conversation_reference: { conversation: activity.conversation, serviceUrl: activity.serviceUrl, bot: activity.recipient, user: activity.from },
  });

  const text = activity.text.replace(/<at>.*?<\/at>/g, '').trim();
  try {
    const response = await gateway.handleInboundMessage({
      platform: 'microsoft_teams', externalWorkspaceId: found.channel.external_workspace_id,
      externalUserId: activity.from?.id, externalUserName: activity.from?.name,
      conversationId: activity.conversation?.id, text,
    });
    await replyToTeams(activity, found.channel, response);
  } catch (err) {
    console.error('[ChatBot/Teams] handling error:', err.message);
  }
});

async function getTeamsBotToken(appId, appPasswordPlain) {
  const resp = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: appId, client_secret: appPasswordPlain, scope: 'https://api.botframework.com/.default' }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to obtain Bot Framework token');
  return data.access_token;
}

async function replyToTeams(activity, channel, response) {
  const appPassword = decryptWithChannelKey(channel.app_password);
  const token = await getTeamsBotToken(channel.app_id, appPassword);
  const replyUrl = `${activity.serviceUrl}v3/conversations/${activity.conversation.id}/activities/${activity.id}`;
  const card = {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard', version: '1.4',
        body: [
          { type: 'TextBlock', text: response.title || 'Vercentic', weight: 'Bolder', size: 'Medium' },
          ...(response.text ? [{ type: 'TextBlock', text: response.text, wrap: true }] : []),
          ...((response.facts || []).length ? [{ type: 'FactSet', facts: response.facts.map(f => ({ title: f.label, value: f.value })) }] : []),
        ],
      },
    }],
  };
  await fetch(replyUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
}

module.exports = router;
