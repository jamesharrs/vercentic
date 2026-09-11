// server/routes/company_research.js
const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
const { MODEL_DEFAULT } = require('../config/ai_models');

function ensureCollection() {
  const store = getStore();
  if (!store.company_profiles) { store.company_profiles = []; saveStore(store); }
  if (!store.email_templates) { store.email_templates = []; saveStore(store); }
}

router.post('/research', async (req, res) => {
  const { company_name, environment_id } = req.body;
  if (!company_name || !environment_id) return res.status(400).json({ error: 'company_name and environment_id required' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  // Helper: call Anthropic with retry on rate limit
  const callAI = async (body, attempt = 0) => {
    const hasWebSearch = (body.tools||[]).some(t => t.type?.includes('web_search'));
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...(hasWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {})
    };
    // Remove undefined tools key before sending
    const cleanBody = { ...body };
    if (!cleanBody.tools) delete cleanBody.tools;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanBody)
    });
    if (r.status === 429 && attempt < 3) {
      const wait = (attempt + 1) * 20000;
      console.log(`Rate limited, waiting ${wait/1000}s before retry ${attempt+1}...`);
      await new Promise(res => setTimeout(res, wait));
      return callAI(body, attempt + 1);
    }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };

  try {
    // ── Step 1: Research company profile ──────────────────────────────────────
    const searchData = await callAI({
      model: MODEL_DEFAULT,
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a company research specialist. Research the company and return ONLY valid compact JSON, no markdown, no extra text.',
      messages: [{ role: 'user', content: `Research "${company_name}" and return ONLY this JSON (no other text):
{"name":"","industry":"technology/finance/healthcare/legal/consulting/retail/manufacturing/media/energy/other","size":"startup/small/medium/large/enterprise","founded":"","description":"2 sentences max","website":"","logo_url":"","brand_color":"#hex","headquarters":"city,country","locations":[{"city":"","country":"","is_hq":true}],"evp":{"headline":"max 8 words","statement":"2 sentences","pillars":["","",""]},"tone":"formal/professional/conversational/startup","typical_roles":["","",""],"key_benefits":["","",""],"social":{"linkedin":""}}` }]
    });

    let profileText = '';
    for (const block of searchData.content || []) { if (block.type === 'text') profileText += block.text; }
    let profile;
    try { profile = JSON.parse(profileText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); }
    catch(e) { return res.status(500).json({ error: 'Failed to parse research results', raw: profileText.slice(0,500) }); }

    // ── Step 2: Generate logo candidates from domain ──────────────────────────
    // Extract domain from website or company name
    const rawSite = profile.website || '';
    let domain = '';
    try {
      const withProto = rawSite.startsWith('http') ? rawSite : `https://${rawSite}`;
      domain = new URL(withProto).hostname.replace(/^www\./, '');
    } catch {
      // Fallback: derive domain from company name
      domain = (profile.name || company_name)
        .toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    }

    // Multiple logo sources — client will try each and show working ones.
    // NOTE: Clearbit's public Logo API (logo.clearbit.com) was shut down after
    // HubSpot's acquisition and no longer resolves at all (confirmed: every
    // request fails at the connection level, not even a 404) — it must not be
    // used, and must never be the thing `profile.logo_url` defaults to, since
    // a dead default is worse than no default (the user sees a blank/broken
    // logo instead of a working best-effort one). unavatar.io is a maintained
    // aggregator (falls back across multiple providers itself) and was
    // verified working for real domains; it's listed first as the best-odds
    // default. Google/DuckDuckGo/favicon.ico remain as further fallbacks.
    const logoCandidates = domain ? [
      { source: 'unavatar',    url: `https://unavatar.io/${domain}`,                          label: 'Best match' },
      { source: 'google',      url: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`, label: 'Google' },
      { source: 'duckduckgo',  url: `https://icons.duckduckgo.com/ip3/${domain}.ico`,         label: 'DuckDuckGo' },
      { source: 'favicon',     url: `https://${domain}/favicon.ico`,                          label: 'Site favicon' },
    ] : [];

    // The AI's own research pass sometimes surfaces a real, high-quality logo
    // URL from the company's own site (e.g. a press-kit or /assets/logo.svg)
    // that outranks any generic favicon aggregator — but it can also just
    // hallucinate a plausible-looking non-existent URL, so it's offered as an
    // extra *candidate* for the user to pick (never trusted as the default).
    const aiLogoUrl = typeof profile.logo_url === 'string' ? profile.logo_url.trim() : '';
    const looksLikeImageUrl = /^https?:\/\/\S+\.(png|jpe?g|svg|webp|gif)(\?\S*)?$/i.test(aiLogoUrl);
    if (looksLikeImageUrl) {
      logoCandidates.unshift({ source: 'ai_research', url: aiLogoUrl, label: 'AI research' });
    }

    profile.logo_url = logoCandidates[0]?.url || '';
    profile.domain = domain;
    profile.logo_candidates = logoCandidates;

    // Template generation removed — use Email Templates section instead
    const emailTemplates = [];

    res.json({ profile, email_templates: emailTemplates, research_date: new Date().toISOString() });
  } catch(err) { console.error('Company research error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/save', async (req, res) => {
  ensureCollection();
  const { environment_id, profile, email_templates, apply_templates } = req.body;
  if (!environment_id || !profile) return res.status(400).json({ error: 'environment_id and profile required' });
  const store = getStore(); const now = new Date().toISOString();
  const existing = store.company_profiles.find(p => p.environment_id === environment_id);
  if (existing) { Object.assign(existing, { ...profile, environment_id, updated_at: now }); }
  else { store.company_profiles.push({ id: uuidv4(), environment_id, ...profile, created_at: now, updated_at: now }); }
  if (apply_templates && email_templates?.length) {
    for (const tpl of email_templates) {
      if (!(store.email_templates||[]).find(t => t.name===tpl.name && t.environment_id===environment_id)) {
        if (!store.email_templates) store.email_templates = [];
        store.email_templates.push({ id: uuidv4(), environment_id, ...tpl, created_at: now });
      }
    }
  }
  saveStore(store);
  res.json({ success: true, profile: store.company_profiles.find(p => p.environment_id === environment_id) });
});

router.get('/', (req, res) => {
  ensureCollection();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  res.json((store.company_profiles||[]).find(p => p.environment_id === environment_id) || null);
});

router.patch('/', (req, res) => {
  ensureCollection();
  const { environment_id, ...updates } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const profile = (store.company_profiles||[]).find(p => p.environment_id === environment_id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  Object.assign(profile, updates, { updated_at: new Date().toISOString() });
  saveStore(store); res.json(profile);
});

module.exports = router;
