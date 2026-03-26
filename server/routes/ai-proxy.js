const express = require('express');
const router = express.Router();
const { trackAIUsage } = require('./admin_dashboard');

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: req.body.max_tokens || 4096,
        system: system || 'You are a helpful assistant.',
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('[AI proxy] Anthropic error:', response.status, data.error);
      const msg = data.error.message || 'AI service error';
      const detail = response.status === 401
        ? 'Invalid API key. Check ANTHROPIC_API_KEY in Railway environment variables.'
        : response.status === 429
        ? 'Rate limited or insufficient credits. Check your Anthropic account balance.'
        : msg;
      return res.status(response.status || 400).json({ error: detail, anthropic_status: response.status, raw: data.error.type });
    }
    // Track AI usage
    try {
      const b = req.body || {};
      trackAIUsage({
        user_id:        b.user_id        || b.userId        || 'anonymous',
        user_name:      b.user_name      || b.userName      || 'Unknown',
        user_email:     b.user_email     || b.userEmail     || '',
        feature:        b.feature        || 'copilot',
        tokens_in:      data.usage?.input_tokens  || 0,
        tokens_out:     data.usage?.output_tokens || 0,
        model:          b.model          || 'claude-sonnet-4-6',
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
    model: 'claude-sonnet-4-20250514',
  });
});

module.exports = router;
