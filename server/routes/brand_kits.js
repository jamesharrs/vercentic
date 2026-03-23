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
    const req = mod.get(url, { timeout: 8000,
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

function extractLogo(html, baseUrl) {
  const patterns = [
    /(?:src|href)=["']([^"']*(?:logo|brand|mark)[^"']*\.(?:svg|png|webp|jpg))/gi,
    /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+(?:class|alt)=["'][^"']*(?:logo|brand)[^"']*["'][^>]+src=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    const x = re.exec(html);
    if (x) {
      let u = x[1];
      if (u.startsWith('//'))  u = 'https:' + u;
      else if (u.startsWith('/')) u = baseUrl + u;
      return u;
    }
  }
  return null;
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
      // Return a partial result indicating the site blocked scraping
      // Claude will still try to build a theme from the domain name alone
      const domainTheme = await synthesiseTheme({
        url: target, colors: [], fonts: [], logo: null,
        title: new URL(target).hostname.replace(/^www\./,'')
      });
      return res.json({
        source_url: target,
        title: new URL(target).hostname.replace(/^www\./,''),
        logo: null, colors: [], fonts: [],
        theme: domainTheme || buildFallbackTheme([], []),
        blocked: true,
        blocked_message: 'This site blocks automated access. Claude generated a theme based on the brand name instead. You can also paste colours manually.'
      });
    }

    const base   = new URL(target).origin;
    const title  = (html.match(/<title[^>]*>([^<]+)</) || [])[1]?.trim() || '';
    const colors = extractHexColors(html);
    const fonts  = extractFonts(html);
    const logo   = extractLogo(html, base);
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
