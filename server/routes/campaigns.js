// server/routes/campaigns.js
const express = require('express');
const router  = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function ensure() {
  const s = getStore();
  if (!s.campaigns) { s.campaigns = []; saveStore(); }
}

// ── GET /  ───────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    ensure();
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
    const s = getStore();

    let campaigns = (s.campaigns || [])
      .filter(c => c.environment_id === environment_id && !c.deleted_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Attach link stats from campaign_links
    const allLinks = (s.campaign_links || []).filter(l => !l.deleted_at);
    const allClicks = s.campaign_clicks || [];
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    campaigns = campaigns.map(c => {
      const links = allLinks.filter(l => l.campaign_id === c.id);
      const clicks = allClicks.filter(cl => links.some(l => l.id === cl.link_id));
      const recent = clicks.filter(cl => cl.ts >= since30);
      return {
        ...c,
        link_count:    links.length,
        channel_count: [...new Set(links.map(l => l.utm_medium || l.utm_source).filter(Boolean))].length,
        total_clicks:  clicks.length,
        clicks_30d:    recent.length,
        joins_30d:     recent.filter(cl => cl.joined).length,
      };
    });

    res.json(campaigns);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /  ──────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    ensure();
    const { name, environment_id, goal, status, brief, audience_tags,
            start_date, end_date, budget, attached_jobs, attached_pools } = req.body;
    if (!name || !environment_id) return res.status(400).json({ error: 'name and environment_id required' });
    const campaign = {
      id: uuidv4(), name, environment_id,
      goal:           goal           || 'applications',
      status:         status         || 'draft',
      brief:          brief          || '',
      audience_tags:  Array.isArray(audience_tags)  ? audience_tags  : [],
      attached_jobs:  Array.isArray(attached_jobs)  ? attached_jobs  : [],
      attached_pools: Array.isArray(attached_pools) ? attached_pools : [],
      start_date:     start_date     || null,
      end_date:       end_date       || null,
      budget:         budget         || null,
      generated_content: null,
      created_by: req.currentUser?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    insert('campaigns', campaign);
    res.status(201).json(campaign);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /:id  ──────────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const existing = query('campaigns', c => c.id === req.params.id)[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.created_at;
    update('campaigns', c => c.id === req.params.id, updates);
    res.json({ ...existing, ...updates });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id  ─────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    update('campaigns', c => c.id === req.params.id, { deleted_at: new Date().toISOString() });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:id  ─────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    ensure();
    const campaign = query('campaigns', c => c.id === req.params.id && !c.deleted_at)[0];
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const s = getStore();
    const links = (s.campaign_links || []).filter(l => l.campaign_id === req.params.id && !l.deleted_at);
    const allClicks = s.campaign_clicks || [];
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const clicks = allClicks.filter(cl => links.some(l => l.id === cl.link_id));
    const recent = clicks.filter(cl => cl.ts >= since30);
    res.json({
      ...campaign,
      links,
      stats: {
        total_clicks: clicks.length,
        clicks_30d:   recent.length,
        joins_30d:    recent.filter(cl => cl.joined).length,
        join_rate:    recent.length ? Math.round((recent.filter(cl => cl.joined).length / recent.length) * 100) : 0,
        by_channel:   Object.entries(
          recent.reduce((acc, cl) => {
            const link = links.find(l => l.id === cl.link_id);
            const ch = link?.utm_medium || link?.utm_source || 'direct';
            acc[ch] = (acc[ch] || 0) + 1;
            return acc;
          }, {})
        ).sort(([,a],[,b]) => b - a).map(([channel,clicks]) => ({ channel, clicks })),
      },
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/generate — AI content generation ────────────────────────────────
router.post('/:id/generate', async (req, res) => {
  try {
    const campaign = query('campaigns', c => c.id === req.params.id)[0];
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const goalLabels = {
      applications:  'drive job applications',
      pool_growth:   'grow a talent community / talent pool',
      event:         'promote a recruitment event',
      brand_awareness: 'raise employer brand awareness',
    };
    const audience = campaign.audience_tags?.length
      ? campaign.audience_tags.join(', ')
      : 'relevant professionals';

    const prompt = `You are a recruitment marketing copywriter. Generate campaign content based on this brief.

Campaign goal: ${goalLabels[campaign.goal] || campaign.goal}
Target audience: ${audience}
Campaign brief: ${campaign.brief || campaign.name}

Generate the following in JSON format (no markdown, raw JSON only):
{
  "linkedin_posts": [
    { "variant": "A", "tone": "professional", "text": "..." },
    { "variant": "B", "tone": "conversational", "text": "..." },
    { "variant": "C", "tone": "bold/direct", "text": "..." }
  ],
  "email_subjects": ["...", "...", "...", "...", "..."],
  "portal_hero": {
    "headline": "...",
    "subheading": "..."
  },
  "whatsapp_message": "...",
  "key_messages": ["...", "...", "..."]
}

Keep LinkedIn posts under 200 words each. Email subjects under 60 chars. WhatsApp under 100 words.`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.text || '{}';
    let generated;
    try {
      generated = JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
    } catch {
      generated = { error: 'Could not parse AI response', raw };
    }

    // Save back to campaign
    update('campaigns', c => c.id === req.params.id, {
      generated_content: generated,
      updated_at: new Date().toISOString(),
    });

    res.json(generated);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/rules — save automation rules ───────────────────────────────────
router.post('/:id/rules', (req, res) => {
  try {
    const { rules } = req.body; // array of rule objects
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules must be an array' });
    update('campaigns', c => c.id === req.params.id, {
      automation_rules: rules,
      updated_at: new Date().toISOString(),
    });
    res.json({ ok: true, rules });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
