const express = require('express');
const router = express.Router();
const { trackAIUsage } = require('./admin_dashboard');
const { MODEL_DEFAULT } = require('../config/ai_models');

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
    // Track AI usage — prefer the verified session/header identity (req.currentUser,
    // set globally by attachUser before this route runs) over anything a client could
    // put in the request body. Body fields remain as a fallback only for the rare case
    // a caller has no resolvable session (e.g. a background job hitting this route
    // directly), so usage still gets attributed to *something* rather than dropped.
    try {
      const b = req.body || {};
      const u = req.currentUser || null;
      const userName = u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : '';
      trackAIUsage({
        user_id:        u?.id    || b.user_id    || b.userId    || 'anonymous',
        user_name:      userName || b.user_name  || b.userName  || 'Unknown',
        user_email:     u?.email || b.user_email || b.userEmail || '',
        feature:        b.feature        || 'copilot',
        tokens_in:      data.usage?.input_tokens  || 0,
        tokens_out:     data.usage?.output_tokens || 0,
        model:          b.model          || MODEL_DEFAULT,
        environment_id: b.environment_id || b.environmentId || '',
      });
    } catch(_e) {}
    res.json({ content: data.content?.[0]?.text || '' });
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
