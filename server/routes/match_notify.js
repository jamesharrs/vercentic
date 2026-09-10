/**
 * /api/match-notify
 * Generates and sends personalised match notification emails to candidates.
 *
 * POST /api/match-notify/preview
 *   Body: { people_ids[], job_ids[], mode, template_id, portal_id, environment_id }
 *   Returns: { emails: [{ person_id, person_name, email, subject, html_body, text_body, match_score, reasons }] }
 *   AI blocks are resolved; no emails are sent yet.
 *
 * POST /api/match-notify/send
 *   Body: { emails: [...], environment_id }
 *   Actually dispatches via the messaging service and logs to communications store.
 */

const router  = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { resolveBrand } = require('../utils/brandKit');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { MODEL_DEFAULT: MODEL } = require('../config/ai_models');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Resolve merge tags like {{first_name}} from a person or job record */
function resolveMerge(text, ctx = {}) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim();
    return ctx[k] !== undefined ? String(ctx[k]) : '';
  });
}

/**
 * Build merge context from a person record, one or more job records, and portal info.
 * Used for both {{tag}} and {{ai: ...}} resolution.
 */
function buildMergeCtx(person, jobs = [], portal = null, portalBaseUrl = '') {
  const p = person?.data || {};
  const j = jobs[0]?.data || {};
  const ctx = {
    // Candidate
    first_name:       p.first_name || '',
    last_name:        p.last_name  || '',
    full_name:        [p.first_name, p.last_name].filter(Boolean).join(' '),
    email:            p.email || '',
    phone:            p.phone || '',
    current_title:    p.current_title || '',
    current_company:  p.current_company || '',
    location:         p.location || '',
    skills:           Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || ''),
    years_experience: p.years_experience || '',
    // Primary job (first in list)
    job_title:        j.job_title || '',
    job_department:   j.department || '',
    job_location:     j.location   || '',
    job_work_type:    j.work_type  || '',
    job_salary_min:   j.salary_min || '',
    job_salary_max:   j.salary_max || '',
    // Portal
    company_name:     portal?.theme?.companyName || portal?.name || '',
    portal_link:      portalBaseUrl,
    unsubscribe_link: `${portalBaseUrl}?unsubscribe=1`,
    current_year:     new Date().getFullYear(),
  };
  // Add per-job portal links (for multi-job notify from person record)
  jobs.forEach((job, i) => {
    const d = job.data || {};
    const jobLink = portalBaseUrl ? `${portalBaseUrl}?job=${job.id}` : '';
    ctx[`job_${i+1}_title`]   = d.job_title   || '';
    ctx[`job_${i+1}_dept`]    = d.department   || '';
    ctx[`job_${i+1}_location`]= d.location     || '';
    ctx[`job_${i+1}_link`]    = jobLink;
  });
  return ctx;
}

/**
 * Build a natural-language description of WHY these jobs match this person,
 * based on scoring reasons already computed client-side and passed in.
 */
function buildMatchSummary(person, job, reasons = [], gaps = [], score = 0) {
  const p = person?.data || {};
  const j = job?.data || {};
  return {
    score,
    reasons,
    gaps,
    candidate_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Candidate',
    job_title: j.job_title || 'this role',
    department: j.department || '',
    location: j.location || '',
  };
}

/**
 * Resolve all {{ai: ...}} blocks in a subject/body string.
 * Each block is replaced by a Claude-generated string.
 * We batch all blocks for a given person+job combo into a single API call.
 */
async function resolveAiBlocks(text, person, jobs, portal, matchSummaries) {
  const AI_PATTERN = /\{\{ai:\s*([\s\S]+?)\}\}/gi;
  const blocks = [];
  let match;
  while ((match = AI_PATTERN.exec(text)) !== null) {
    blocks.push({ placeholder: match[0], prompt: match[1].trim(), index: match.index });
  }
  if (!blocks.length) return text;

  const p = person?.data || {};
  const personCtx = [
    `Candidate: ${[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}`,
    p.current_title    ? `Current title: ${p.current_title}`    : '',
    p.current_company  ? `Company: ${p.current_company}`        : '',
    p.location         ? `Location: ${p.location}`              : '',
    p.skills           ? `Skills: ${Array.isArray(p.skills) ? p.skills.join(', ') : p.skills}` : '',
    p.years_experience ? `Experience: ${p.years_experience} years` : '',
  ].filter(Boolean).join('\n');

  const jobsCtx = jobs.map((j, i) => {
    const d = j.data || {};
    const ms = matchSummaries?.[i];
    return [
      `Job ${i+1}: ${d.job_title || 'Open Role'}`,
      d.department   ? `  Department: ${d.department}` : '',
      d.location     ? `  Location: ${d.location}` : '',
      d.work_type    ? `  Work type: ${d.work_type}` : '',
      d.salary_min   ? `  Salary: ${d.salary_min}–${d.salary_max || ''}` : '',
      d.summary      ? `  Summary: ${d.summary.slice(0, 300)}` : '',
      ms?.reasons?.length ? `  Why matched: ${ms.reasons.join(', ')}` : '',
      ms?.gaps?.length    ? `  Gaps: ${ms.gaps.join(', ')}`          : '',
      ms?.score != null   ? `  Match score: ${ms.score}/100` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const systemPrompt = `You are writing personalised recruitment email content for a talent acquisition platform called Vercentic.
You have access to a candidate's profile and job details. Generate only the requested content — no preamble, no labels.
Keep tone professional but warm. Output clean HTML if it looks like the block is for HTML email, otherwise plain text.

CANDIDATE PROFILE:
${personCtx}

JOBS BEING RECOMMENDED:
${jobsCtx}`;

  const userMessages = blocks.map((b, i) => `BLOCK_${i}: ${b.prompt}`).join('\n\n');

  let result;
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate content for each block. Return ONLY a JSON object:\n{"BLOCK_0":"...","BLOCK_1":"...",...}\n\n${userMessages}` }],
    });
    const raw = resp.content.find(b => b.type === 'text')?.text || '{}';
    const clean = raw.replace(/^```json\n?|```$/gm, '').trim();
    result = JSON.parse(clean);
  } catch (e) {
    console.error('[match-notify] AI block resolution failed:', e.message);
    result = {};
  }

  let resolved = text;
  blocks.forEach((b, i) => {
    const replacement = result[`BLOCK_${i}`] || '';
    resolved = resolved.replace(b.placeholder, replacement);
  });
  return resolved;
}

/**
 * Convert the legacy plain-text-with-lightweight-Markdown format used by
 * store.email_templates[].body into branded HTML. Supports:
 *   **bold**              -> <strong>
 *   [Label](url)          -> inline link, coloured with the brand's primary color
 *   a paragraph that is ONLY a [Label](url) -> rendered as a branded CTA button
 *     (matches real content like "[Start Interview →]({{interview_link}})")
 *   blank-line-separated paragraphs -> individual <div> blocks
 * `text` is expected to already have merge tags and {{ai: ...}} blocks
 * resolved (same order used by the blocks-based renderer below).
 * Deliberately does NOT HTML-escape — matches this file's existing
 * convention of injecting merge-tag/AI values raw everywhere else, and
 * avoids corrupting any real HTML resolveAiBlocks may have produced.
 */
function renderBodyMarkdownToHtml(text, { primaryColor, fontFamily }) {
  const SOLO_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;
  const paragraphs = String(text || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs.map(para => {
    const soloLink = para.match(SOLO_LINK_RE);
    if (soloLink) {
      const [, label, url] = soloLink;
      return `
        <div style="padding:8px 32px 16px;text-align:center">
          <a href="${url}" style="display:inline-block;background:${primaryColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;font-family:${fontFamily}">${label}</a>
        </div>`;
    }
    const html = para
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${primaryColor};text-decoration:underline">$1</a>`)
      .replace(/\n/g, '<br/>');
    return `<div style="padding:0 32px 16px;font-size:15px;line-height:1.7;color:#374151;font-family:${fontFamily}">${html}</div>`;
  }).join('');
}

/**
 * Render a template to HTML. A template's content can come from one of three
 * sources, in priority order: `blocks` (the block-based email builder
 * format), `html_body` (a pre-built raw HTML body from an older/simpler
 * editor), or `body` (the legacy plain-text-with-lightweight-Markdown format
 * used by the real, live store.email_templates records). Brand/font
 * variables are computed once, unconditionally, up front so ALL THREE
 * content sources get consistent branding — previously they were computed
 * only inside the blocks branch, AFTER an early-return for html_body (which
 * therefore never got brand/font applied at all), and `body` was never read
 * anywhere in this function (every real template rendered a blank email).
 * All three branches funnel into one shared final HTML shell/wrapper below.
 */
async function renderTemplateToHtml(template, mergeCtx, person, jobs, portal, matchSummaries, brand = {}) {
  const blocks = template.blocks || [];

  brand = brand || {};
  const primaryColor = brand.primary_color || '#4361EE';
  // brand.font_family (from resolveBrand/toBrandPayload) is a bare font name
  // like "Poppins" with no fallback stack — quote it and append a generic
  // fallback the same way email_builder.js's buildEmailHtml() does, so a
  // configured brand font actually applies instead of silently falling
  // through to serif defaults in clients that ignore unquoted/unknown names.
  const fontFamily   = brand.font_family
    ? `'${brand.font_family}', Arial, Helvetica, sans-serif`
    : "'DM Sans', Arial, sans-serif";
  // heading_font is a distinct, optional field on a brand kit (e.g. a display
  // font used only for headings) — previously read nowhere in this file, so
  // it was silently dropped even when correctly configured. Falls back to
  // the body fontFamily (already-quoted) when not set.
  const headingFont = brand.heading_font
    ? `'${brand.heading_font}', Arial, Helvetica, sans-serif`
    : fontFamily;
  const companyName  = brand.company_name  || mergeCtx.company_name || '';
  const logoUrl      = brand.logo_url      || '';

  let bodyHtml = '';

  if (blocks.length) {
    for (const block of blocks) {
      switch (block.type) {
        case 'header': {
          bodyHtml += `
            <div style="background:${primaryColor};padding:24px 32px;text-align:center">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"/>` : ''}
              ${block.config?.showCompanyName && companyName ? `<div style="color:white;font-size:13px;font-weight:600;margin-top:8px;opacity:.85;font-family:${fontFamily}">${companyName}</div>` : ''}
            </div>`;
          break;
        }
        case 'heading': {
          const text = resolveMerge(block.content || '', mergeCtx);
          bodyHtml += `<h2 style="margin:24px 32px 8px;font-size:22px;font-weight:700;color:#111827;font-family:${headingFont}">${text}</h2>`;
          break;
        }
        case 'text': {
          let text = resolveMerge(block.content || '', mergeCtx);
          text = await resolveAiBlocks(text, person, jobs, portal, matchSummaries);
          bodyHtml += `<div style="padding:0 32px 16px;font-size:15px;line-height:1.7;color:#374151;font-family:${fontFamily}">${text}</div>`;
          break;
        }
        case 'button': {
          const cfg = block.config || {};
          const btnText = resolveMerge(cfg.text || 'View', mergeCtx);
          const btnUrl  = resolveMerge(cfg.url  || '', mergeCtx);
          const align   = cfg.align === 'center' ? 'center' : cfg.align === 'right' ? 'right' : 'left';
          bodyHtml += `
            <div style="padding:8px 32px 16px;text-align:${align}">
              <a href="${btnUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;font-family:${fontFamily}">${btnText}</a>
            </div>`;
          break;
        }
        case 'image': {
          const src = resolveMerge(block.config?.src || block.config?.url || '', mergeCtx);
          if (src) bodyHtml += `<div style="padding:0 32px 16px"><img src="${src}" alt="" style="max-width:100%;border-radius:8px"/></div>`;
          break;
        }
        case 'divider': {
          bodyHtml += `<div style="margin:8px 32px"><hr style="border:none;border-top:1px solid #e5e7eb"/></div>`;
          break;
        }
        case 'spacer': {
          const h = block.config?.height || 24;
          bodyHtml += `<div style="height:${h}px"></div>`;
          break;
        }
        case 'ai_content': {
          // Dedicated AI content block — the entire block is AI-generated
          const prompt = block.config?.prompt || block.prompt || '';
          if (!prompt) break;
          const resolved = await resolveAiBlocks(`{{ai: ${prompt}}}`, person, jobs, portal, matchSummaries);
          bodyHtml += `<div style="padding:0 32px 16px;font-size:15px;line-height:1.7;color:#374151;font-family:${fontFamily}">${resolved}</div>`;
          break;
        }
        case 'footer': {
          const year = new Date().getFullYear();
          bodyHtml += `
            <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;font-family:${fontFamily}">
              ${companyName ? `<div style="margin-bottom:4px;font-weight:600;color:#6b7280">${companyName}</div>` : ''}
              <div>© ${year} · <a href="${mergeCtx.unsubscribe_link||'#'}" style="color:#9ca3af">Unsubscribe</a></div>
            </div>`;
          break;
        }
        default:
          break;
      }
    }
  } else if (template.html_body) {
    // Pre-built raw HTML body from an older/simpler editor. Previously this
    // path returned bare, unstyled HTML directly — bypassing brand/font
    // application AND the shared email shell below entirely. It's now
    // resolved the same way and funnelled into the same wrapper so it gets
    // consistent typography and the surrounding <html>/<style> scaffold.
    let html = resolveMerge(template.html_body, mergeCtx);
    html = await resolveAiBlocks(html, person, jobs, portal, matchSummaries);
    bodyHtml = html;
  } else if (template.body) {
    // Legacy format used by the 21 real store.email_templates records:
    // plain text with lightweight Markdown (**bold**, [label](url)),
    // paragraphs separated by blank lines. Previously `template.body` was
    // never read anywhere in this function, so every one of these templates
    // rendered a completely empty email body.
    let text = resolveMerge(template.body, mergeCtx);
    text = await resolveAiBlocks(text, person, jobs, portal, matchSummaries);
    bodyHtml = renderBodyMarkdownToHtml(text, { primaryColor, fontFamily });
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f4f5f8;font-family:${fontFamily}}
.wrapper{max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08)}</style>
</head><body>
<div class="wrapper">${bodyHtml}</div>
</body></html>`;
}

// ── POST /preview ─────────────────────────────────────────────────────────────
router.post('/preview', async (req, res) => {
  try {
    const { people_ids, job_ids, template_id, portal_id, environment_id, match_data } = req.body;
    // match_data: { [person_id]: [{ job_id, score, reasons, gaps }] } (pre-computed client-side)

    if (!environment_id)  return res.status(400).json({ error: 'environment_id required' });
    if (!template_id)     return res.status(400).json({ error: 'template_id required' });
    if (!people_ids?.length) return res.status(400).json({ error: 'people_ids required' });

    const store = getStore();

    // Load template from email_builder collection
    const template = (store.email_builder_templates || store.email_templates || []).find(t => t.id === template_id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Resolve the environment's brand kit once for this whole preview batch.
    // Priority (via resolveBrand/resolveBrandKit): an explicit kit set on the
    // template (template.brand_kit_id) → a kit that has opted in to
    // auto-apply for the 'email' surface → the environment's default kit →
    // null (falls back to renderTemplateToHtml's own hardcoded defaults).
    // Previously this always read template.brand_kit, a field nothing ever
    // populated, so every match-notify email silently ignored the client's
    // actual brand kit and rendered with hardcoded fallback colours/fonts.
    const brand = resolveBrand(store, environment_id, template.brand_kit_id || null, 'email') || {};

    // Load portal
    const portal = portal_id ? (store.portals || []).find(p => p.id === portal_id) : null;

    // Build the portal base URL for deep links
    // e.g. https://www.vercentic.com/careers  or  http://localhost:3000/careers
    const appBase = process.env.APP_URL || 'https://www.vercentic.com';
    const portalSlug = portal?.slug ? portal.slug.replace(/^\//, '') : '';
    const portalBaseUrl = portalSlug ? `${appBase}/${portalSlug}` : appBase;

    // Load all needed records
    const people = (store.records || []).filter(r => people_ids.includes(r.id));
    const allJobIds = job_ids || [];
    const jobs = (store.records || []).filter(r => allJobIds.includes(r.id));

    // Generate one email per person
    const emails = [];
    for (const person of people) {
      const pd = person.data || {};
      const personEmail = pd.email;
      if (!personEmail) continue;

      // Which jobs are relevant for this person?
      // In "job" mode: single job, person is the recipient
      // In "person" mode: multiple jobs recommended to one person
      const personJobs = jobs;
      const personMatchData = match_data?.[person.id] || [];

      // Build match summaries for AI context
      const matchSummaries = personJobs.map(j => {
        const ms = personMatchData.find(m => m.job_id === j.id);
        return buildMatchSummary(person, j, ms?.reasons, ms?.gaps, ms?.score);
      });

      const mergeCtx = buildMergeCtx(person, personJobs, portal, portalBaseUrl);

      // Resolve subject
      const subject = resolveMerge(template.subject || 'We found roles for you', mergeCtx);

      // Render body HTML (resolves all AI blocks)
      const html_body = await renderTemplateToHtml(template, mergeCtx, person, personJobs, portal, matchSummaries, brand);

      // Plain text fallback — strip HTML tags
      const text_body = html_body.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();

      // Build per-job info summary for the preview UI
      const jobsSummary = personJobs.map((j, i) => ({
        id: j.id,
        title: j.data?.job_title || 'Open Role',
        department: j.data?.department || '',
        location: j.data?.location || '',
        portal_link: `${portalBaseUrl}?job=${j.id}`,
        score: matchSummaries[i]?.score,
        reasons: matchSummaries[i]?.reasons || [],
        gaps: matchSummaries[i]?.gaps || [],
      }));

      emails.push({
        person_id: person.id,
        person_name: [pd.first_name, pd.last_name].filter(Boolean).join(' ') || pd.email,
        email: personEmail,
        subject,
        html_body,
        text_body,
        jobs: jobsSummary,
        overall_score: matchSummaries[0]?.score,
      });
    }

    res.json({ emails, count: emails.length });
  } catch (err) {
    console.error('[match-notify] preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /send ────────────────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { emails, environment_id } = req.body;
    if (!emails?.length) return res.status(400).json({ error: 'emails required' });

    const store = getStore();
    const now   = new Date().toISOString();
    const results = [];

    for (const em of emails) {
      // Log to communications store
      const comm = {
        id:             uuidv4(),
        record_id:      em.person_id,
        environment_id,
        type:           'email',
        direction:      'outbound',
        subject:        em.subject,
        body:           em.text_body || em.html_body,
        html_body:      em.html_body,
        status:         'sent',
        sent_at:        now,
        created_at:     now,
        updated_at:     now,
        metadata: {
          sent_via:       'match_notify',
          jobs:           em.jobs?.map(j => j.id),
          match_score:    em.overall_score,
        },
      };
      if (!store.communications) store.communications = [];
      store.communications.push(comm);

      // Try real send via messaging service if configured
      let sendResult = { simulated: true };
      try {
        const messaging = require('../services/messaging');
        if (messaging?.sendEmail) {
          sendResult = await messaging.sendEmail({
            to:      em.email,
            subject: em.subject,
            html:    em.html_body,
            text:    em.text_body,
          });
        }
      } catch (e) {
        console.warn('[match-notify] messaging service unavailable, logged only');
      }

      results.push({ person_id: em.person_id, email: em.email, status: sendResult.simulated ? 'simulated' : 'sent', comm_id: comm.id });
    }

    saveStore(store);
    res.json({ sent: results.length, results });
  } catch (err) {
    console.error('[match-notify] send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /portals — list career site portals for the portal picker ─────────────
router.get('/portals', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const portals = (store.portals || []).filter(
    p => p.environment_id === environment_id
      && (p.type === 'career_site' || !p.type)
      && (p.status === 'published' || p.status === 'draft')
      && !p.deleted_at
  ).map(p => ({ id: p.id, name: p.name, slug: p.slug, status: p.status, type: p.type }));
  res.json(portals);
});

module.exports = router;
