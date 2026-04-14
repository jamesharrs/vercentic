const express = require('express');
const router  = express.Router();
const { getStore, saveStore } = require('../db/init');
const crypto  = require('crypto');
const https   = require('https');
const http    = require('http');

function ensure() {
  const s = getStore();
  if (!s.brand_kits) { s.brand_kits = []; saveStore(); }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercentic/1.0; +https://vercentic.com)' }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; if (body.length > 400000) res.destroy(); });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const chunks = [];
    const req = mod.get(url, { timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercentic/1.0)' }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBinary(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/png' }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── URL normalisation ─────────────────────────────────────────────────────────
function normaliseUrl(raw) {
  let u = raw.trim();
  if (!u.startsWith('http')) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    // If no dot in hostname, append .com (e.g. "vodafone" → "vodafone.com")
    if (!parsed.hostname.includes('.')) {
      u = u.replace(parsed.hostname, parsed.hostname + '.com');
    }
    return u;
  } catch {
    throw new Error('Invalid URL — please enter a web address like vodafone.com');
  }
}

// ── Colour extraction ─────────────────────────────────────────────────────────
function extractHexColors(html) {
  const raw = new Set();
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m;
  while ((m = hexRe.exec(html)) !== null) {
    const c = m[0].length === 4
      ? '#' + m[0][1]+m[0][1]+m[0][2]+m[0][2]+m[0][3]+m[0][3]
      : m[0];
    raw.add(c.toUpperCase());
  }
  const rgbRe = /rgb[a]?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  while ((m = rgbRe.exec(html)) !== null) {
    const r = parseInt(m[1]).toString(16).padStart(2,'0');
    const g = parseInt(m[2]).toString(16).padStart(2,'0');
    const b = parseInt(m[3]).toString(16).padStart(2,'0');
    raw.add(('#'+r+g+b).toUpperCase());
  }
  const boring = new Set(['#FFFFFF','#000000','#FAFAFA','#F5F5F5','#EEEEEE',
    '#E0E0E0','#9E9E9E','#616161','#212121','#BDBDBD','#F9FAFB','#F3F4F6',
    '#E5E7EB','#D1D5DB','#9CA3AF','#6B7280','#374151','#111827','#EEF2FF','#E8ECF8']);
  return [...raw].filter(c => !boring.has(c) && c.length === 7).slice(0,12);
}

function extractFonts(html) {
  const fonts = new Set();
  const gfRe = /family=([^&"']+)/g;
  let m;
  while ((m = gfRe.exec(html)) !== null) {
    const f = decodeURIComponent(m[1]).split(':')[0].replace(/\+/g,' ').trim();
    if (f.length > 1) fonts.add(f);
  }
  const ffRe = /font-family\s*:\s*['"\s]*([A-Za-z][A-Za-z0-9 ]+)/g;
  while ((m = ffRe.exec(html)) !== null) {
    const f = m[1].trim().split(',')[0].replace(/['"]/g,'').trim();
    if (f.length > 2 && !f.match(/^(sans|serif|mono|inherit|initial|system)/i)) fonts.add(f);
  }
  return [...fonts].slice(0,5);
}

// ── Logo extraction — scored candidates ──────────────────────────────────────
function resolveUrl(u, baseUrl) {
  if (!u) return null;
  u = u.split('?')[0].split('#')[0];
  if (u.startsWith('//'))   return 'https:' + u;
  if (u.startsWith('/'))    return baseUrl + u;
  if (u.startsWith('http')) return u;
  return baseUrl + '/' + u;
}
function extractLogoCandidates(html, baseUrl) {
  const candidates = [];
  const seen = new Set();
  const add = (rawUrl, score, type) => {
    const url = resolveUrl(rawUrl, baseUrl);
    if (!url || seen.has(url)) return;
    if (url.endsWith('.ico')) return;
    if (url.includes('sprite') || url.includes('background')) return;
    seen.add(url);
    candidates.push({ url, score, type });
  };
  let m;
  // Tier 1 — SVG with logo/brand/mark in filename (vector, always current)
  const svgLogoRe = /(?:src|href|data-src)=["']([^"']*(?:logo|brand|mark|wordmark)[^"']*\.svg[^"']*)/gi;
  while ((m = svgLogoRe.exec(html)) !== null) add(m[1], 100, 'svg-logo');
  // Tier 2 — PNG/WebP with logo/brand in filename
  const pngLogoRe = /(?:src|href|data-src)=["']([^"']*(?:logo|brand|mark|wordmark)[^"']*\.(?:png|webp)[^"']*)/gi;
  while ((m = pngLogoRe.exec(html)) !== null) add(m[1], 80, 'png-logo');
  // Tier 3 — Any SVG inside a header/nav element
  const navSvgRe = /(?:<header|<nav)[^>]*>[\s\S]{0,2000}?(?:src|href)=["']([^"']*\.svg[^"']*)/gi;
  while ((m = navSvgRe.exec(html)) !== null) add(m[1], 75, 'nav-svg');
  // Tier 4 — img with class/alt containing logo/brand
  const imgClassRe = /<img[^>]+(?:class|alt)=["'][^"']*(?:logo|brand|mark)[^"']*["'][^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  while ((m = imgClassRe.exec(html)) !== null) add(m[1], 70, 'img-class');
  const imgSrcClassRe = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]+(?:class|alt)=["'][^"']*(?:logo|brand|mark)[^"']*["']/gi;
  while ((m = imgSrcClassRe.exec(html)) !== null) add(m[1], 70, 'img-src-class');
  // Tier 5 — Apple touch icon (high-res, current)
  const appleRe = /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/gi;
  while ((m = appleRe.exec(html)) !== null) add(m[1], 35, 'apple-icon');
  // Tier 6 — SVG/PNG favicon (last resort)
  const faviconRe = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+\.(?:svg|png))["']/gi;
  while ((m = faviconRe.exec(html)) !== null) add(m[1], 20, 'favicon');
  return candidates.sort((a, b) => b.score - a.score);
}

// ── Claude Vision logo validation ─────────────────────────────────────────────
async function validateLogoWithAI(candidates, brandName, key) {
  if (!candidates.length) return { logo: null, candidates: [] };
  if (!key) return { logo: candidates[0]?.url || null, candidates: candidates.map(c => c.url) };

  const topUrls = candidates.filter(c => c.score >= 35).slice(0, 5).map(c => c.url);
  if (!topUrls.length) return { logo: null, candidates: [] };

  // SVGs can't go through vision API — verify reachability then accept
  const topSvg = candidates.find(c => c.url.endsWith('.svg') && c.score >= 70);
  if (topSvg) {
    try {
      const res = await Promise.race([
        fetchBinary(topSvg.url),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      if (res && res.buffer.length > 100) {
        console.log(`[brand] SVG logo verified: ${topSvg.url}`);
        return { logo: topSvg.url, candidates: topUrls };
      }
    } catch { /* fall through to raster check */ }
  }

  // Raster images — ask Claude Vision to confirm the logo is correct
  for (const candidate of candidates.filter(c => c.score >= 35 && !c.url.endsWith('.svg')).slice(0, 3)) {
    try {
      const { buffer, contentType } = await Promise.race([
        fetchBinary(candidate.url),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      if (!buffer || buffer.length < 100 || buffer.length > 4 * 1024 * 1024) continue;
      const mediaType = contentType.split(';')[0].trim();
      if (!['image/png','image/jpeg','image/jpg','image/webp','image/gif'].includes(mediaType)) continue;
      const base64 = buffer.toString('base64');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 60,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `Is this the main current brand logo for "${brandName}"? Reply only "yes" or "no" with a brief reason, e.g. "yes - current red logo" or "no - looks like a small icon/favicon".` }
          ]}]
        })
      });
      const data = await response.json();
      const answer = (data.content?.[0]?.text || '').toLowerCase().trim();
      console.log(`[brand] Vision check ${candidate.url}: ${answer}`);
      if (answer.startsWith('yes')) return { logo: candidate.url, candidates: topUrls };
    } catch (e) {
      console.log(`[brand] Vision check failed for ${candidate.url}: ${e.message}`);
    }
  }
  // Fallback to highest-scored candidate
  return { logo: topUrls[0] || null, candidates: topUrls };
}

// ── Theme synthesis ───────────────────────────────────────────────────────────
async function synthesiseTheme({ url, colors, fonts, logo, title }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `You are a brand designer. A website has been scraped and you must create a portal design theme.
Website: ${url}
Page title: ${title||'Unknown'}
Extracted colours: ${colors.join(', ')||'none'}
Extracted fonts: ${fonts.join(', ')||'none'}
Logo URL: ${logo||'not found'}

Return ONLY valid JSON (no markdown, no preamble):
{"primaryColor":"#hex","secondaryColor":"#hex","bgColor":"#hex","textColor":"#hex","accentColor":"#hex","fontFamily":"name","headingFont":"name","headingWeight":700,"fontSize":"16px","borderRadius":"8px","buttonStyle":"filled","buttonRadius":"8px","maxWidth":"1200px"}

Rules: primaryColor = dominant brand colour (not black/white). bgColor usually white. textColor dark. buttonStyle = filled|outline|ghost.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:512, messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text||'';
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  } catch { return null; }
}

function buildFallbackTheme(colors, fonts) {
  return {
    primaryColor: colors[0] || '#3B5BDB', secondaryColor: colors[1] || '#4DABF7',
    bgColor: '#FFFFFF', textColor: '#0F1729', accentColor: colors[2] || '#7950F2',
    fontFamily: fonts[0] || 'Inter', headingFont: fonts[0] || 'Inter', headingWeight: 700,
    fontSize: '16px', borderRadius: '8px', buttonStyle: 'filled',
    buttonRadius: '8px', maxWidth: '1200px'
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/analyse', async (req, res) => {
  const { url, environment_id, manual_colors, manual_fonts, manual_logo } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let target;
  try {
    target = normaliseUrl(url);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const key = process.env.ANTHROPIC_API_KEY;

  if (manual_colors || manual_fonts) {
    const colors = manual_colors || [];
    const fonts  = manual_fonts  || [];
    const logo   = manual_logo   || null;
    const theme  = await synthesiseTheme({ url: target, colors, fonts, logo, title: new URL(target).hostname });
    return res.json({
      source_url: target, title: new URL(target).hostname,
      logo, logo_candidates: logo ? [logo] : [],
      colors, fonts,
      theme: theme || buildFallbackTheme(colors, fonts), blocked: false
    });
  }

  try {
    const html = await fetchUrl(target);
    const isBlocked = html.length < 2000 ||
      /challenge|captcha|cloudflare|access denied|403 forbidden|just a moment/i.test(html.slice(0, 3000));

    if (isBlocked) {
      const domainTheme = await synthesiseTheme({
        url: target, colors: [], fonts: [], logo: null,
        title: new URL(target).hostname.replace(/^www\./, '')
      });
      return res.json({
        source_url: target, title: new URL(target).hostname.replace(/^www\./, ''),
        logo: null, logo_candidates: [], colors: [], fonts: [],
        theme: domainTheme || buildFallbackTheme([], []),
        blocked: true,
        blocked_message: 'This site blocks automated access. Vercentic generated a theme based on the brand name instead.'
      });
    }

    const base   = new URL(target).origin;
    const title  = (html.match(/<title[^>]*>([^<]+)</) || [])[1]?.trim() || '';
    const colors = extractHexColors(html);
    const fonts  = extractFonts(html);
    const logoCandidates = extractLogoCandidates(html, base);
    const brandName = title || new URL(target).hostname.replace(/^www\./, '');
    const { logo, candidates: logoUrls } = await validateLogoWithAI(logoCandidates, brandName, key);
    const theme = await synthesiseTheme({ url: target, colors, fonts, logo, title });
    res.json({
      source_url: target, title, logo,
      logo_candidates: logoUrls,
      colors, fonts,
      theme: theme || buildFallbackTheme(colors, fonts),
      blocked: false
    });
  } catch (e) {
    // ENOTFOUND = bad domain
    if (e.code === 'ENOTFOUND') {
      const host = (() => { try { return new URL(target).hostname; } catch { return target; } })();
      return res.status(400).json({ error: `Could not reach "${host}" — check the URL is correct (e.g. vodafone.com, not just "vodafone")` });
    }
    // Timeout or connection refused → fall back to AI-only theme from brand name
    if (e.message === 'Timeout' || e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
      const host = (() => { try { return new URL(target).hostname.replace(/^www\./, ''); } catch { return target; } })();
      console.log(`[brand] Timeout for ${target}, falling back to AI-only theme`);
      try {
        const domainTheme = await synthesiseTheme({ url: target, colors: [], fonts: [], logo: null, title: host });
        return res.json({
          source_url: target,
          title: host,
          logo: null, logo_candidates: [],
          colors: [], fonts: [],
          theme: domainTheme || buildFallbackTheme([], []),
          blocked: true,
          blocked_message: `"${host}" took too long to respond — Vercentic generated a theme from the brand name instead. You can also paste colours manually.`
        });
      } catch (aiErr) {
        return res.status(500).json({ error: `"${host}" timed out and AI fallback failed. Try again or paste colours manually.` });
      }
    }
    res.status(500).json({ error: e.message || 'Failed to analyse URL' });
  }
});

router.get('/', (req, res) => {
  ensure();
  const kits = (getStore().brand_kits || [])
    .filter(k => !k.deleted_at && (!req.query.environment_id || k.environment_id === req.query.environment_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(kits);
});

router.post('/', (req, res) => {
  ensure();
  const kit = { id: crypto.randomUUID(), ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const s = getStore(); s.brand_kits.push(kit); saveStore();
  res.status(201).json(kit);
});

router.patch('/:id', (req, res) => {
  ensure();
  const s = getStore(); const i = s.brand_kits.findIndex(k => k.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  s.brand_kits[i] = { ...s.brand_kits[i], ...req.body, updated_at: new Date().toISOString() };
  saveStore(); res.json(s.brand_kits[i]);
});

router.delete('/:id', (req, res) => {
  ensure();
  const s = getStore(); const i = s.brand_kits.findIndex(k => k.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  s.brand_kits[i].deleted_at = new Date().toISOString(); saveStore(); res.json({ ok: true });
});

module.exports = router;
