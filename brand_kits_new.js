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

function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: opts.timeout || 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vercentic/1.0; +https://vercentic.com)' }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchUrl(loc, opts).then(resolve).catch(reject);
      }
      if (opts.binary) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), headers: res.headers }));
        res.on('error', reject);
      } else {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => { body += c; if (body.length > 400000) res.destroy(); });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      }
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

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

// ── Enhanced multi-source logo extraction ─────────────────────────────────────
async function extractLogo(html, baseUrl) {
  const domain = new URL(baseUrl).hostname.replace(/^www\./, '');
  const candidates = [];

  // Strategy 1: OpenGraph image (often the best quality brand image)
  const ogPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const re of ogPatterns) {
    const m = re.exec(html);
    if (m) {
      let u = resolveUrl(m[1], baseUrl);
      if (u) candidates.push({ url: u, source: 'og:image', priority: 3 });
      break;
    }
  }

  // Strategy 2: Structured data (JSON-LD) — look for logo in schema.org
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;
  while ((ldMatch = jsonLdRe.exec(html)) !== null) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const logoUrl = ld.logo?.url || ld.logo || ld.image?.url || ld.image;
      if (typeof logoUrl === 'string' && logoUrl.match(/\.(svg|png|webp|jpg|jpeg)/i)) {
        candidates.push({ url: resolveUrl(logoUrl, baseUrl), source: 'json-ld', priority: 5 });
      }
    } catch {}
  }

  // Strategy 3: HTML patterns — logo/brand in src/href/class/alt
  const htmlPatterns = [
    // SVG logo files first (best quality)
    /(?:src|href)=["']([^"']*(?:logo|brand|mark)[^"']*\.svg)/gi,
    // PNG logo files
    /(?:src|href)=["']([^"']*(?:logo|brand|mark)[^"']*\.(?:png|webp))/gi,
    // Images with logo/brand in class or alt
    /<img[^>]+(?:class|alt|id)=["'][^"']*(?:logo|brand|site-logo|header-logo|navbar-logo)[^"']*["'][^>]+src=["']([^"']+)["']/gi,
    // Reverse order: src before class/alt
    /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|alt|id)=["'][^"']*(?:logo|brand|site-logo|header-logo)[^"']*["']/gi,
    // Link tags with icon rel
    /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/gi,
    // Apple touch icon (often high quality)
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/gi,
  ];
  for (let pi = 0; pi < htmlPatterns.length; pi++) {
    const re = htmlPatterns[pi];
    const m = re.exec(html);
    if (m) {
      const u = resolveUrl(m[1], baseUrl);
      if (u) candidates.push({ url: u, source: 'html', priority: 4 - pi * 0.5 });
    }
  }

  // Strategy 4: Clearbit Logo API (free, reliable for well-known brands)
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  candidates.push({ url: clearbitUrl, source: 'clearbit', priority: 2 });

  // Strategy 5: Google favicon service (always returns something)
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  candidates.push({ url: googleFavicon, source: 'google-favicon', priority: 1 });

  // Sort by priority (highest first) and validate
  candidates.sort((a, b) => b.priority - a.priority);

  // Validate top candidates — check they actually resolve to an image
  for (const cand of candidates.slice(0, 5)) {
    if (!cand.url) continue;
    const validated = await validateLogoUrl(cand.url);
    if (validated) {
      console.log(`[brand-extractor] Logo found via ${cand.source}: ${cand.url}`);
      return cand.url;
    }
  }

  // If nothing validated, return Clearbit anyway (it returns a default)
  console.log(`[brand-extractor] Using Clearbit fallback for ${domain}`);
  return clearbitUrl;
}

function resolveUrl(u, baseUrl) {
  if (!u) return null;
  try {
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http')) return u;
    if (u.startsWith('/')) return new URL(u, baseUrl).href;
    if (u.startsWith('data:')) return null; // skip data URIs
    return new URL(u, baseUrl).href;
  } catch { return null; }
}

async function validateLogoUrl(url) {
  try {
    const result = await fetchUrl(url, { binary: true, timeout: 4000 });
    if (!result || !result.status) return false;
    if (result.status >= 400) return false;
    // Check content type is an image
    const ct = result.headers?.['content-type'] || '';
    if (ct.includes('image') || ct.includes('svg')) return true;
    // Check if response starts with image magic bytes or SVG
    if (result.buffer && result.buffer.length > 10) {
      const head = result.buffer.slice(0, 20).toString('utf8');
      if (head.includes('<svg') || head.includes('PNG') || head.includes('JFIF') || head.includes('GIF')) return true;
    }
    return false;
  } catch {
    return false;
  }
}

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
      body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:512, messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text||'';
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  } catch { return null; }
}

router.post('/analyse', async (req, res) => {
  const { url, environment_id, manual_colors, manual_fonts, manual_logo } = req.body;
  if (!url) return res.status(400).json({ error:'url required' });
  let target = url.trim();
  if (!target.startsWith('http')) target = 'https://' + target;

  // If the client already sent manually-extracted data (fallback mode), skip scraping
  if (manual_colors || manual_fonts) {
    const colors = manual_colors || [];
    const fonts  = manual_fonts  || [];
    const logo   = manual_logo   || null;
    const theme  = await synthesiseTheme({ url:target, colors, fonts, logo, title: new URL(target).hostname });
    return res.json({ source_url:target, title: new URL(target).hostname, logo, colors, fonts,
      theme: theme || buildFallbackTheme(colors, fonts), blocked: false });
  }

  try {
    const html = await fetchUrl(target);

    // Detect bot-blocking pages (very short HTML or contains bot-challenge markers)
    const isBlocked = html.length < 2000 ||
      /challenge|captcha|cloudflare|access denied|403 forbidden|just a moment/i.test(html.slice(0, 3000));

    if (isBlocked) {
      const domain = new URL(target).hostname.replace(/^www\./, '');
      // Even when blocked, try Clearbit + Google favicon for the logo
      const clearbitLogo = `https://logo.clearbit.com/${domain}`;
      const validated = await validateLogoUrl(clearbitLogo);
      const logo = validated ? clearbitLogo : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      const domainTheme = await synthesiseTheme({
        url: target, colors: [], fonts: [], logo,
        title: new URL(target).hostname.replace(/^www\./,'')
      });
      return res.json({
        source_url: target,
        title: new URL(target).hostname.replace(/^www\./,''),
        logo,
        colors: [], fonts: [],
        theme: domainTheme || buildFallbackTheme([], []),
        blocked: true,
        blocked_message: 'This site blocks automated access. Vercentic generated a theme from the brand name instead. You can also paste colours manually.'
      });
    }

    const base   = new URL(target).origin;
    const title  = (html.match(/<title[^>]*>([^<]+)</) || [])[1]?.trim() || '';
    const colors = extractHexColors(html);
    const fonts  = extractFonts(html);
    const logo   = await extractLogo(html, base);
    const theme  = await synthesiseTheme({ url:target, colors, fonts, logo, title });
    res.json({ source_url:target, title, logo, colors, fonts,
      theme: theme || buildFallbackTheme(colors, fonts), blocked: false });
  } catch(e) {
    res.status(500).json({ error: e.message || 'Failed to analyse URL' });
  }
});

function buildFallbackTheme(colors, fonts) {
  return {
    primaryColor: colors[0] || '#3B5BDB', secondaryColor: colors[1] || '#4DABF7',
    bgColor: '#FFFFFF', textColor: '#0F1729', accentColor: colors[2] || '#7950F2',
    fontFamily: fonts[0] || 'Inter', headingFont: fonts[0] || 'Inter', headingWeight: 700,
    fontSize: '16px', borderRadius: '8px', buttonStyle: 'filled',
    buttonRadius: '8px', maxWidth: '1200px'
  };
}

router.get('/', (req,res) => {
  ensure();
  const kits = (getStore().brand_kits||[])
    .filter(k=>!k.deleted_at&&(!req.query.environment_id||k.environment_id===req.query.environment_id))
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  res.json(kits);
});
router.post('/', (req,res) => {
  ensure();
  const kit = { id:crypto.randomUUID(), ...req.body, created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
  const s=getStore(); s.brand_kits.push(kit); saveStore();
  res.status(201).json(kit);
});
router.patch('/:id', (req,res) => {
  ensure();
  const s=getStore(); const i=s.brand_kits.findIndex(k=>k.id===req.params.id);
  if(i<0) return res.status(404).json({error:'Not found'});
  s.brand_kits[i]={...s.brand_kits[i],...req.body,updated_at:new Date().toISOString()};
  saveStore(); res.json(s.brand_kits[i]);
});
router.delete('/:id', (req,res) => {
  ensure();
  const s=getStore(); const i=s.brand_kits.findIndex(k=>k.id===req.params.id);
  if(i<0) return res.status(404).json({error:'Not found'});
  s.brand_kits[i].deleted_at=new Date().toISOString(); saveStore(); res.json({ok:true});
});

module.exports = router;
