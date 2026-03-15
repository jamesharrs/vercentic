const express = require('express');
const router  = express.Router();

router.post('/translate', async (req, res) => {
  const { targetLanguage, targetCode, strings } = req.body;
  if (!targetLanguage || !strings) return res.status(400).json({ error: 'targetLanguage and strings required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: `You are a professional translator for enterprise HR software (TalentOS).
Translate the JSON object provided into ${targetLanguage}.
Rules:
- Preserve ALL JSON keys exactly as-is (do not translate keys)
- Translate only the string values
- Keep {placeholder} tokens unchanged (e.g. {count}, {name})
- Keep UPPERCASE strings as UPPERCASE in the translation
- Be concise — these are UI labels, not prose
- For Arabic: use formal Modern Standard Arabic appropriate for business software
- Respond ONLY with valid JSON, no markdown fences, no explanation`,
        messages: [{
          role: 'user',
          content: `Translate this JSON into ${targetLanguage}:\n${JSON.stringify(strings, null, 2)}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Anthropic API error: ${err}` });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const translated = JSON.parse(clean);
    res.json({ translated });
  } catch (e) {
    console.error('Translation error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
