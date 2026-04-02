// server/routes/campaign_links.js
// Campaign Link Builder — smart tracked links with UTM params + talent pool auto-join

const express = require('express');
const router  = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function ensureStore() {
  const s = getStore();
  if (!s.campaign_links)  { s.campaign_links  = []; saveStore(); }
  if (!s.campaign_clicks) { s.campaign_clicks = []; saveStore(); }
}

function makeShortCode(len = 7) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function buildDestination(link) {
  const base = (process.env.PORTAL_BASE_URL || 'https://client-gamma-ruddy-63.vercel.app').replace(/\/$/, '');
  const slug = (link.portal_slug || '').replace(/^\/+/, '');
  const page = (link.page_slug   || '').replace(/^\/+/, '');
  let url = `${base}/${slug}`;
  if (page && page !== '/') url += `/${page}`;
  const params = new URLSearchParams();
  if (link.pool_id)      params.set('_pool',           link.pool_id);
  if (link.pool_stage)   params.set('_pool_stage',     link.pool_stage);
  if (link.utm_source)   params.set('utm_source',      link.utm_source);
  if (link.utm_medium)   params.set('utm_medium',      link.utm_medium);
  if (link.utm_campaign) params.set('utm_campaign',    link.utm_campaign);
  if (link.utm_content)  params.set('utm_content',     link.utm_content);
  if (link.utm_term)     params.set('utm_term',        link.utm_term);
  // variant tag — derived from utm_content automatically
  const variant = (link.utm_content || '').toLowerCase().replace('variant-', '').replace('variant_', '');
  if (variant && ['a','b','c','d','e'].includes(variant)) params.set('_variant', variant);
  params.set('_lnk', link.id);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function buildLinkUrl(link, req) {
  const proto = req?.headers['x-forwarded-proto'] || 'https';
  const host  = req?.headers['x-forwarded-host']  || req?.headers['host'] || 'localhost:3001';
  return `${proto}://${host}/api/campaign-links/${link.short_code}/click`;
}

// ── GET /  ───────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    ensureStore();
    const { environment_id, portal_id, pool_id, campaign_id } = req.query;
    let links = query('campaign_links', l => {
      if (environment_id && l.environment_id !== environment_id) return false;
      if (portal_id   && l.portal_id   !== portal_id)   return false;
      if (pool_id     && l.pool_id     !== pool_id)     return false;
      if (campaign_id && l.campaign_id !== campaign_id) return false;
      return !l.deleted_at;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const allClicks = getStore().campaign_clicks || [];
    links = links.map(l => {
      const lc     = allClicks.filter(c => c.link_id === l.id);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const recent  = lc.filter(c => c.ts >= since30);
      const sources = {};
      recent.forEach(c => { const s = c.utm_source || 'direct'; sources[s] = (sources[s]||0)+1; });
      return {
        ...l,
        link_url: buildLinkUrl(l, req),
        destination_url: buildDestination(l),
        stats: {
          total_clicks: lc.length,
          clicks_30d:   recent.length,
          joins_30d:    recent.filter(c=>c.joined).length,
          join_rate:    recent.length ? Math.round((recent.filter(c=>c.joined).length/recent.length)*100) : 0,
          top_sources:  Object.entries(sources).sort(([,a],[,b])=>b-a).slice(0,5).map(([source,clicks])=>({source,clicks})),
        },
      };
    });
    res.json(links);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /  ──────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    ensureStore();
    const { name, environment_id, portal_id, portal_slug, page_slug,
            pool_id, pool_stage, utm_source, utm_medium, utm_campaign,
            utm_content, utm_term, notes, campaign_id } = req.body;
    if (!name || !environment_id) return res.status(400).json({ error: 'name and environment_id required' });
    let short_code;
    do { short_code = makeShortCode(); }
    while (query('campaign_links', l => l.short_code === short_code).length > 0);
    const link = {
      id: uuidv4(), name, environment_id,
      portal_id: portal_id||null, portal_slug: portal_slug||'',
      page_slug: page_slug||'/',
      pool_id: pool_id||null, pool_stage: pool_stage||null,
      campaign_id: campaign_id||null,
      utm_source: utm_source||'', utm_medium: utm_medium||'',
      utm_campaign: utm_campaign||'', utm_content: utm_content||'',
      utm_term: utm_term||'', notes: notes||'',
      short_code, status: 'active',
      created_by: req.currentUser?.id||null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    insert('campaign_links', link);
    res.status(201).json({ ...link, link_url: buildLinkUrl(link, req), destination_url: buildDestination(link) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /:id  ──────────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const existing = query('campaign_links', l => l.id === req.params.id)[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.short_code; delete updates.created_at;
    update('campaign_links', l => l.id === req.params.id, updates);
    const updated = { ...existing, ...updates };
    res.json({ ...updated, link_url: buildLinkUrl(updated, req), destination_url: buildDestination(updated) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id  ─────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    update('campaign_links', l => l.id === req.params.id, { deleted_at: new Date().toISOString() });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:code/click  — PUBLIC tracked redirect ──────────────────────────────
router.get('/:code/click', (req, res) => {
  try {
    ensureStore();
    const link = query('campaign_links', l => l.short_code === req.params.code && !l.deleted_at)[0];
    if (!link) return res.status(404).send('Link not found');
    const s = getStore();
    s.campaign_clicks.push({
      id: uuidv4(), link_id: link.id, ts: new Date().toISOString(),
      utm_source: link.utm_source||null, utm_medium: link.utm_medium||null,
      utm_campaign: link.utm_campaign||null, utm_content: link.utm_content||null,
      ip: req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||null,
      ua: (req.headers['user-agent']||'').slice(0,200),
      joined: false,
    });
    if (s.campaign_clicks.length > 500000) s.campaign_clicks = s.campaign_clicks.slice(-500000);
    saveStore();
    res.redirect(302, buildDestination(link));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/joined  — called after community join ───────────────────────────
router.post('/:id/joined', (req, res) => {
  try {
    ensureStore();
    const { person_id } = req.body;
    const s = getStore();
    const clicks = (s.campaign_clicks||[]).filter(c => c.link_id === req.params.id);
    if (clicks.length) {
      const latest = clicks[clicks.length - 1];
      latest.joined = true; latest.person_id = person_id||null;
      saveStore();
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:id/stats  — detailed analytics ─────────────────────────────────────
router.get('/:id/stats', (req, res) => {
  try {
    ensureStore();
    const link = query('campaign_links', l => l.id === req.params.id)[0];
    if (!link) return res.status(404).json({ error: 'Not found' });
    const days   = parseInt(req.query.days||30);
    const since  = new Date(Date.now()-days*86400000).toISOString();
    const allClicks = (getStore().campaign_clicks||[]).filter(c => c.link_id === req.params.id);
    const recent    = allClicks.filter(c => c.ts >= since);
    const dm = {};
    recent.forEach(c => {
      const d = c.ts.slice(0,10);
      if (!dm[d]) dm[d] = { clicks:0, joins:0 };
      dm[d].clicks++; if (c.joined) dm[d].joins++;
    });
    const daily = Object.entries(dm).sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({date,...v}));
    const sources = {};
    recent.forEach(c => {
      const key = c.utm_source||'direct';
      if (!sources[key]) sources[key] = { clicks:0, joins:0 };
      sources[key].clicks++; if (c.joined) sources[key].joins++;
    });
    const by_source = Object.entries(sources).sort(([,a],[,b])=>b.clicks-a.clicks).map(([source,v])=>({source,...v}));
    res.json({
      link_id: link.id, link_name: link.name, days,
      total_clicks:  allClicks.length,
      total_joins:   allClicks.filter(c=>c.joined).length,
      period_clicks: recent.length,
      period_joins:  recent.filter(c=>c.joined).length,
      join_rate:     recent.length ? Math.round((recent.filter(c=>c.joined).length/recent.length)*100) : 0,
      daily, by_source,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
