'use strict';
const express  = require('express');
const router   = express.Router();
const { requireAuth } = require('../middleware/rbac');
const { trackAIUsage } = require('./admin_dashboard');
const { MODEL_DEFAULT } = require('../config/ai_models');

const SYSTEM_PROMPT = `You are an expert in inclusive hiring practices and bias-free recruitment. 
Analyse the provided job description for language or requirements that may introduce bias or unfairly deter qualified candidates.

Return a JSON object with this exact structure:
{
  "overall_score": <number 0-100, where 100 = fully inclusive, 0 = highly biased>,
  "summary": "<1-2 sentence plain-English summary of findings>",
  "issues": [
    {
      "category": "<one of: gendered_language | age_bias | qualification_inflation | cultural_bias | disability | accessibility | other>",
      "severity": "<high | medium | low>",
      "quote": "<exact phrase from the JD, max 10 words>",
      "explanation": "<why this is a concern, 1 sentence>",
      "suggestion": "<improved replacement phrasing, 1 sentence>"
    }
  ],
  "strengths": ["<positive inclusive element found in the JD>"],
  "rewritten_summary": "<a rewritten version of the job summary paragraph with biased language removed, max 3 sentences>"
}

Severity guide:
- high: directly discriminatory, likely to deter a protected group significantly
- medium: subtly exclusive, research-backed deterrent effect
- low: minor tone issue, worth improving but not critical

Only include issues that are genuinely present. If the JD is well-written, issues array can be empty.
Return ONLY valid JSON — no markdown, no preamble.`;

router.post('/', requireAuth, async (req, res) => {
  try {
    const { job_description, job_title, environment_id } = req.body;
    if (!job_description?.trim()) {
      return res.status(400).json({ error: 'job_description is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

    const content = [
      job_title ? `Job Title: ${job_title}\n\n` : '',
      `Job Description:\n${job_description.trim()}`,
    ].join('');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL_DEFAULT,
        max_tokens: 2000,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[bias_scan] Anthropic error:', err);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data     = await response.json();
    const rawText  = data.content?.[0]?.text || '{}';
    let result;
    try {
      result = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(502).json({ error: 'Failed to parse AI response' });
    }

    // Track usage
    try {
      trackAIUsage({
        feature:    'bias_scan',
        user_id:    req.session?.userId,
        environment_id,
        input_tokens:  data.usage?.input_tokens  || 0,
        output_tokens: data.usage?.output_tokens || 0,
      });
    } catch {}

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[bias_scan]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
