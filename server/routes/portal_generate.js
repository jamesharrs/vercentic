// server/routes/portal_generate.js
// POST /api/portals/generate
// Takes questionnaire answers, returns a complete portal JSON

const express  = require('express');
const router   = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const WIDGET_SCHEMA = `
AVAILABLE WIDGET TYPES (use ONLY these):
1. hero — config: { headline, subheading, align, primaryCta, primaryCtaLink, secondaryCta }
2. text — config: { heading, content, align }
3. stats — config: { stats:[{value:"500+",label:"Team Members"}] } — 2-4 stats max
4. jobs — config: { title, showSearch:true, showFilters:true } — renders live listings
5. team — config: { title, subtitle } — renders people from database
6. cta_banner — config: { headline, body, ctaText, ctaUrl, style("dark"|"accent"|"light") }
7. testimonials — config: { title, items:[{quote,name,role}] }
8. find_your_fit — config: { headline, subheading, enableCv:true, enableGuided:true }
9. image — config: { url:"", alt:"", objectFit:"cover" }
10. divider — config: { thickness:1 }
11. spacer — config: { height:"sm" }

ROW: { id, preset("1"|"2"|"3"|"1-2"|"2-1"), bgColor, padding("xs"|"sm"|"md"|"lg"|"xl"),
       cells:[{ id, widgetType, widgetConfig }] }

PADDING: xl=hero, lg=main content, md=compact, sm=tight
PRESETS: "1"=full width, "2"=equal cols, "3"=3 cols, "1-2"=1/3+2/3, "2-1"=2/3+1/3
`;

router.post('/generate', async (req, res) => {
  try {
    const { company, tagline, industry, logo_url, tone, palette,
            sections, messages, stats_input, team_intro, benefits } = req.body;
    if (!company || !palette) return res.status(400).json({ error: 'company and palette are required' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are an expert career site designer. Create a professional, high-converting careers portal.

COMPANY: ${company} | Industry: ${industry||'Technology'} | Tagline: ${tagline||'Find your next opportunity'}
TONE: ${tone||'professional'} | Logo: ${logo_url||''}
EVP/Messages: ${messages||'Great culture, competitive pay, interesting work'}
${stats_input?`Stats: ${stats_input}`:''}
${benefits?`Benefits: ${benefits}`:''}
${team_intro?`Team: ${team_intro}`:''}
SECTIONS REQUESTED: ${(sections||['hero','stats','jobs','cta']).join(', ')}
PALETTE: primary:${palette.primary} secondary:${palette.secondary} bg:${palette.bg} text:${palette.text}

${WIDGET_SCHEMA}

Write specific copy for ${industry||'technology'} — NOT generic filler.
Hero headline: 5-9 words, candidate-facing, compelling.
SECTION ORDER: hero → stats → culture/values → find_your_fit (if requested) → jobs → team → cta_banner

Return ONLY valid JSON. No markdown. No explanation. Structure:
{
  "theme":{"primaryColor":"${palette.primary}","secondaryColor":"${palette.secondary}","bgColor":"${palette.bg}","textColor":"${palette.text}","accentColor":"#F79009","fontFamily":"'Plus Jakarta Sans', sans-serif","headingFont":"'Plus Jakarta Sans', sans-serif","fontSize":"16px","headingWeight":"700","borderRadius":"10px","buttonStyle":"filled","buttonRadius":"10px","maxWidth":"1200px"},
  "nav":{"logoText":"${company}","logoUrl":"${logo_url||''}","links":[{"label":"Open Roles","url":"#jobs"},{"label":"Our Culture","url":"#culture"}],"sticky":true,"bgColor":"${palette.bg}","textColor":"${palette.text}"},
  "footer":{"bgColor":"#0F1729","textColor":"#F1F5F9","bottomText":"© 2026 ${company}. All rights reserved.","columns":[{"id":"fc1","heading":"Company","links":[{"label":"About Us","href":"#"},{"label":"Our Values","href":"#"}]},{"id":"fc2","heading":"Working Here","links":[{"label":"Benefits","href":"#benefits"},{"label":"Career Growth","href":"#"}]},{"id":"fc3","heading":"Jobs","links":[{"label":"All Open Roles","href":"#jobs"}]}]},
  "pages":[{"id":"page_home","name":"Home","slug":"/","rows":[...your rows...]}]
}`;

    const response = await client.messages.create({
      model:'claude-sonnet-4-6', max_tokens:4000,
      messages:[{ role:'user', content:prompt }]
    });

    const raw     = response.content[0]?.text || '';
    const cleaned = raw.replace(/\`\`\`json\s*/g,'').replace(/\`\`\`\s*/g,'').trim();
    let generated;
    try { generated = JSON.parse(cleaned); }
    catch {
      const m = cleaned.match(/\{[\s\S]+\}/);
      if (m) generated = JSON.parse(m[0]);
      else throw new Error('Could not parse AI response as JSON');
    }

    // Ensure all IDs exist
    const uid = () => Math.random().toString(36).slice(2,10);
    generated.pages = (generated.pages||[]).map((page,pi) => ({
      ...page, id: page.id||`page_${pi}`,
      rows: (page.rows||[]).map(row => ({
        ...row, id: row.id||uid(),
        cells: (row.cells||[]).map(cell => ({ ...cell, id: cell.id||uid() }))
      }))
    }));

    res.json({ portal: generated });
  } catch (err) {
    console.error('[portal-generate]', err);
    res.status(500).json({ error: 'Generation failed', detail: err.message });
  }
});

module.exports = router;
