const express   = require('express');
const router    = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { MODEL_DEFAULT } = require('../config/ai_models');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/portal-ai/summary
// Body: { context: { role, userName, dataSources: [{ label, records[] }] } }
router.post('/summary', async (req, res) => {
  const { context } = req.body;
  if (!context) return res.status(400).json({ error: 'context required' });

  const { role = 'Hiring Manager', userName = 'there', dataSources = [] } = context;

  // Build a concise data snapshot for Claude
  const dataBlocks = dataSources.map(ds => {
    const items = (ds.records || []).slice(0, 30).map((r, i) => {
      const d     = r.data || r;
      const name  = d.first_name
        ? `${d.first_name} ${d.last_name || ''}`.trim()
        : d.name || d.job_title || d.pool_name || `Item ${i + 1}`;
      const stage = d.stage || d.status || d.current_stage || '';
      const days  = d.days_pending != null
        ? `${d.days_pending}d pending`
        : d.created_at
          ? `${Math.floor((Date.now() - new Date(d.created_at)) / 86400000)}d old`
          : '';
      const extra = [stage, days].filter(Boolean).join(', ');
      return `  - ${name}${extra ? ` (${extra})` : ''}`;
    }).join('\n');
    return `### ${ds.label} (${(ds.records || []).length} total)\n${items || '  (none)'}`;
  }).join('\n\n');

  const prompt = `You are an intelligent assistant embedded in a ${role} portal for an ATS/HCM platform.
The current user is ${userName}.

Here is their live workload data:

${dataBlocks}

Your job: write a concise, personalised daily briefing for this ${role}.

Rules:
- Lead with the most URGENT items (oldest pending first).
- Be specific — use actual names and numbers from the data.
- Flag anything over 5 days old as high priority.
- Keep the tone professional but warm. Maximum 120 words for the summary.
- After the summary, return structured priority and action items.

Respond ONLY in this exact JSON format (no markdown fences, no extra text):
{
  "greeting": "Good morning, [name] — here's your priority overview.",
  "summary": "2-4 sentence personalised briefing using real names and numbers from the data.",
  "priority_items": [
    { "label": "Candidate or item name", "detail": "Why urgent or current stage", "urgency": "high", "days": 7 }
  ],
  "action_items": [
    { "text": "Short action description", "category": "review" }
  ]
}

urgency must be: high (>5 days or blocking), medium (2-5 days), or low (<2 days).
category must be one of: review, feedback, interview, decision.`;

  try {
    const msg = await client.messages.create({
      model: MODEL_DEFAULT,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw   = msg.content[0]?.text || '{}';
    const clean = raw.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error('portal-ai error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
