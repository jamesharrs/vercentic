const express = require('express');
const router = express.Router();
const { trackAIUsage } = require('./admin_dashboard');
const { MODEL_DEFAULT } = require('../config/ai_models');
const { redactPrompt } = require('../lib/redactPrompt');

// Pull the text out of the most recent user turn, whatever shape it's in —
// plain string, or an Anthropic-style content-block array ([{type:'text',text:'...'}, ...]).
// Used only to build a redacted usage-log snippet; never sent anywhere or stored raw.
function extractLastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user') {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter(c => c && c.type === 'text' && typeof c.text === 'string')
          .map(c => c.text)
          .join(' ');
      }
      return '';
    }
  }
  return '';
}

router.post('/chat', async (req, res) => {
  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens: req.body.max_tokens || 4096,
        system: system || 'You are a helpful assistant.',
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('[AI proxy] error:', response.status, data.error.type);
      // Return sanitised user-facing message — never expose provider names or billing details
      let detail;
      if (response.status === 401 || data.error.type === 'authentication_error') {
        detail = 'AI service is not configured. Please contact customer support.';
      } else if (response.status === 429 || data.error.type === 'insufficient_quota' || (data.error.message||'').toLowerCase().includes('credit')) {
        detail = 'Your AI credits are running low. Please contact customer support to top up your allowance.';
      } else if (response.status === 529 || data.error.type === 'overloaded_error') {
        detail = 'AI service is temporarily busy. Please try again in a moment.';
      } else {
        detail = 'AI service error — please try again or contact customer support.';
      }
      return res.status(response.status || 400).json({ error: detail });
    }
    // Respond to the user immediately — usage tracking (including redaction,
    // which does an in-memory name-token scan) must never add latency to the
    // actual chat response. It runs in setImmediate() below, strictly after
    // this response has been flushed.
    res.json({ content: data.content?.[0]?.text || '' });

    // Track AI usage — prefer the verified session/header identity (req.currentUser,
    // set globally by attachUser before this route runs) over anything a client could
    // put in the request body. Body fields remain as a fallback only for the rare case
    // a caller has no resolvable session (e.g. a background job hitting this route
    // directly), so usage still gets attributed to *something* rather than dropped.
    //
    // Deferred via setImmediate so it runs after the response above, and so a slow
    // redaction pass (cold per-tenant name-cache) can never delay the reply. This is
    // safe for tenant scoping: AsyncLocalStorage context (server/db/init.js's
    // tenantStorage) is continuation-local, not call-stack-local, so it still resolves
    // correctly to the request's tenant inside this callback.
    setImmediate(() => {
      try {
        const b = req.body || {};
        const u = req.currentUser || null;
        const userName = u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : '';
        let promptSnippet = null;
        try {
          promptSnippet = redactPrompt(extractLastUserText(messages));
        } catch (_re) { /* redaction is best-effort; never block usage logging on it */ }
        trackAIUsage({
          user_id:        u?.id    || b.user_id    || b.userId    || 'anonymous',
          user_name:      userName || b.user_name  || b.userName  || 'Unknown',
          user_email:     u?.email || b.user_email || b.userEmail || '',
          feature:        b.feature        || 'copilot',
          tokens_in:      data.usage?.input_tokens  || 0,
          tokens_out:     data.usage?.output_tokens || 0,
          model:          b.model          || MODEL_DEFAULT,
          environment_id: b.environment_id || b.environmentId || '',
          prompt_snippet: promptSnippet,
        });
      } catch (_e) { /* tracking must never surface an error to the client */ }
    });
  } catch (err) {
    console.error('AI proxy error:', err);
    res.status(500).json({ error: 'Failed to reach AI service' });
  }
});

// Diagnostic: check if AI is configured (no key revealed)
router.get('/status', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({
    configured: key.length > 10,
    key_prefix: key ? key.slice(0, 10) + '...' : 'NOT SET',
    key_length: key.length,
    model: MODEL_DEFAULT,
  });
});

module.exports = router;
