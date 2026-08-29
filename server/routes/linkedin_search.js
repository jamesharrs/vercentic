// server/routes/linkedin_search.js
// LinkedIn profile finder using Claude with web search
const express = require('express');
const { MODEL_OPUS } = require('../config/ai_models');
const router = express.Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * POST /api/linkedin-search
 * Body: { first_name, last_name, email?, company?, location?, job_title? }
 * Returns: { linkedin_url, confidence, source }
 */
router.post('/', async (req, res) => {
  const { first_name, last_name, email, company, location, job_title } = req.body;

  if (!first_name && !last_name) {
    return res.status(400).json({ error: 'first_name or last_name required' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const fullName = [first_name, last_name].filter(Boolean).join(' ');

  const contextParts = [fullName];
  if (job_title) contextParts.push(job_title);
  if (company)   contextParts.push(company);
  if (location)  contextParts.push(location);
  if (email)     contextParts.push(email);
  const context = contextParts.join(', ');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: MODEL_OPUS,
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [
          {
            role: 'user',
            content: `Find the LinkedIn profile URL for this person: ${context}.

Search for their LinkedIn profile and return ONLY a JSON object in this exact format:
{
  "linkedin_url": "https://www.linkedin.com/in/username" or null if not found,
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation of how you found it or why you couldn't"
}

Rules:
- Only return linkedin.com/in/ URLs (not linkedin.com/pub or linkedin.com/company)
- If you find multiple possible matches, pick the most likely one based on name + context
- Set confidence to "high" if name + job/company match, "medium" if name matches well, "low" if uncertain
- Return null for linkedin_url if you genuinely cannot find a match
- Return ONLY valid JSON, no other text`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[linkedin-search] Claude API error:', err);
      return res.status(502).json({ error: 'Search service error', details: err });
    }

    const data = await response.json();

    const textBlock = data.content?.find(c => c.type === 'text');
    if (!textBlock) {
      return res.json({ linkedin_url: null, confidence: 'low', reason: 'No response from search' });
    }

    let result;
    try {
      const clean = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      const urlMatch = textBlock.text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
      result = {
        linkedin_url: urlMatch ? urlMatch[0] : null,
        confidence: urlMatch ? 'medium' : 'low',
        reason: 'Extracted from search results',
      };
    }

    // Validate URL format
    if (result.linkedin_url && !result.linkedin_url.match(/^https?:\/\/(?:www\.)?linkedin\.com\/in\//)) {
      result.linkedin_url = null;
      result.confidence = 'low';
      result.reason = 'Invalid LinkedIn URL format found';
    }

    console.log(`[linkedin-search] ${fullName} → ${result.linkedin_url || 'not found'} (${result.confidence})`);
    return res.json(result);

  } catch (err) {
    console.error('[linkedin-search] Error:', err);
    return res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json({ ok: true, configured: !!ANTHROPIC_API_KEY });
});

module.exports = router;
