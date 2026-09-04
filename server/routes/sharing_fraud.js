// server/routes/sharing_fraud.js
// Social sharing with source tracking + AI fraud analysis
const express = require('express');
const router  = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
// fetch is a native Node.js 18+ global — no import needed

const ts = () => new Date().toISOString();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const { MODEL_DEFAULT: MODEL } = require('../config/ai_models');

// ── SHARE TOKEN MANAGEMENT ──────────────────────────────────────────────────

// POST /api/sharing/tokens
router.post('/tokens', (req, res) => {
  const { record_id, environment_id, channels = ['linkedin','twitter','whatsapp','facebook','email','direct'] } = req.body;
  if (!record_id || !environment_id) return res.status(400).json({ error: 'record_id and environment_id required' });
  const s = getStore();
  if (!s.share_tokens) s.share_tokens = [];
  s.share_tokens = s.share_tokens.filter(t => t.record_id !== record_id);
  const tokens = channels.map(channel => ({
    id: uuidv4(), token: uuidv4().replace(/-/g, '').slice(0, 16),
    record_id, environment_id, channel,
    clicks: 0, applications: 0,
    created_at: ts(), last_clicked: null,
  }));
  s.share_tokens.push(...tokens);
  saveStore();
  res.json(tokens);
});

// GET /api/sharing/tokens/:record_id
router.get('/tokens/:record_id', (req, res) => {
  const s = getStore();
  res.json((s.share_tokens || []).filter(t => t.record_id === req.params.record_id));
});

// POST /api/sharing/click  (PUBLIC — no auth needed)
router.post('/click', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const s = getStore();
  const idx = (s.share_tokens || []).findIndex(t => t.token === token);
  if (idx === -1) return res.status(404).json({ error: 'token not found' });
  s.share_tokens[idx].clicks += 1;
  s.share_tokens[idx].last_clicked = ts();
  saveStore();
  res.json({ ok: true, channel: s.share_tokens[idx].channel });
});

// POST /api/sharing/conversion
router.post('/conversion', (req, res) => {
  const { token, person_id, job_id } = req.body;
  if (!token) return res.json({ ok: true });
  const s = getStore();
  const idx = (s.share_tokens || []).findIndex(t => t.token === token);
  if (idx !== -1) {
    s.share_tokens[idx].applications += 1;
    if (!s.share_conversions) s.share_conversions = [];
    s.share_conversions.push({ id: uuidv4(), token, person_id, job_id, converted_at: ts() });
    saveStore();
  }
  res.json({ ok: true });
});

// GET /api/sharing/analytics/:record_id
router.get('/analytics/:record_id', (req, res) => {
  const s = getStore();
  const tokens = (s.share_tokens || []).filter(t => t.record_id === req.params.record_id);
  const totals = tokens.reduce((acc, t) => {
    acc.clicks += t.clicks; acc.applications += t.applications; return acc;
  }, { clicks: 0, applications: 0 });
  totals.conversion_rate = totals.clicks > 0 ? Math.round((totals.applications / totals.clicks) * 100) : 0;
  res.json({ tokens, totals });
});

// GET /api/sharing/analytics/global/summary
router.get('/analytics/global/summary', (req, res) => {
  const { environment_id } = req.query;
  const s = getStore();
  const tokens = (s.share_tokens || []).filter(t => !environment_id || t.environment_id === environment_id);
  const byChannel = {};
  tokens.forEach(t => {
    if (!byChannel[t.channel]) byChannel[t.channel] = { channel: t.channel, clicks: 0, applications: 0, jobs: new Set() };
    byChannel[t.channel].clicks += t.clicks;
    byChannel[t.channel].applications += t.applications;
    byChannel[t.channel].jobs.add(t.record_id);
  });
  const summary = Object.values(byChannel).map(c => ({
    channel: c.channel, clicks: c.clicks, applications: c.applications,
    jobs_shared: c.jobs.size,
    conversion_rate: c.clicks > 0 ? Math.round((c.applications / c.clicks) * 100) : 0,
  })).sort((a, b) => b.clicks - a.clicks);
  res.json(summary);
});


// ── AI FRAUD / VERIFICATION ANALYSIS ────────────────────────────────────────

// POST /api/sharing/fraud/analyse
router.post('/fraud/analyse', async (req, res) => {
  const { record_id, environment_id, record_data, fields_context } = req.body;
  if (!record_id || !record_data) return res.status(400).json({ error: 'record_id and record_data required' });
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: 'AI not configured' });

  const d = record_data;
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown';

  // ── Pull peer candidates for similarity check ──────────────────────────────
  // Gather up to 30 other people records from the same environment for comparison
  const s0 = getStore();
  const peerRecords = (s0.records || [])
    .filter(r => r.environment_id === environment_id && r.id !== record_id && r.object_id)
    .slice(0, 30);

  // Build compact peer summaries (name, title, skills, location, bio snippet)
  const peerSummaries = peerRecords
    .map(r => {
      const pd = r.data || {};
      const pName = [pd.first_name, pd.last_name].filter(Boolean).join(' ');
      if (!pName && !pd.email) return null;
      return {
        id: r.id,
        name: pName || pd.email || 'Unknown',
        title: pd.current_title || pd.job_title || '',
        location: pd.location || '',
        skills: Array.isArray(pd.skills) ? pd.skills.join(', ') : (pd.skills || ''),
        bio: (pd.bio || pd.summary || '').slice(0, 200),
        email_domain: pd.email ? pd.email.split('@')[1] || '' : '',
      };
    })
    .filter(Boolean);

  // Also pull CV attachment text for this candidate if available
  const cvAttachment = (s0.attachments || []).find(a =>
    a.record_id === record_id && (a.file_type === 'cv_resume' || (a.name || '').toLowerCase().includes('cv') || (a.name || '').toLowerCase().includes('resume'))
  );
  const cvText = cvAttachment?.extracted_text || '';

  const peerBlock = peerSummaries.length > 0
    ? `\nOTHER CANDIDATES IN SYSTEM (${peerSummaries.length} total — use for similarity comparison):\n` +
      peerSummaries.map((p, i) => `${i + 1}. ${p.name} | ${p.title} | ${p.location} | Skills: ${p.skills || 'none'} | Bio: ${p.bio || 'none'}`).join('\n')
    : '\nNO OTHER CANDIDATES in system for comparison.';

  const cvBlock = cvText
    ? `\nCANDIDATE CV TEXT (first 800 chars):\n${cvText.slice(0, 800)}`
    : '';

  const prompt = `You are a recruitment fraud analyst. Analyse this candidate record for inconsistencies, red flags, or indicators of potential misrepresentation. Be fair, balanced, and factual — your job is to flag things worth verifying, not to make accusations.

CANDIDATE RECORD:
Name: ${name}
Email: ${d.email || '—'}
Phone: ${d.phone || '—'}
Current Title: ${d.current_title || '—'}
Location: ${d.location || '—'}
Nationality: ${d.nationality || '—'}
Years Experience: ${d.years_experience || '—'}
Person Type: ${d.person_type || '—'}
Employment Type: ${d.employment_type || '—'}
Department: ${d.department || '—'}
Entity/Company: ${d.entity || d.company || '—'}
Status: ${d.status || '—'}
Source: ${d.source || '—'}
Start Date: ${d.start_date || '—'}
Skills: ${Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || '—')}
LinkedIn: ${d.linkedin_url || d.linkedin || '—'}
Summary/Bio: ${d.bio || d.summary || '—'}
Additional fields: ${JSON.stringify(fields_context || {}).slice(0, 500)}
${cvBlock}
${peerBlock}

ANALYSE FOR:
1. Employment timeline gaps or overlaps (if dates provided)
2. Claimed experience vs stated age/graduation dates (if available)
3. Location inconsistencies
4. Email domain red flags (free email for senior role, domain mismatch)
5. Skills mismatch with claimed seniority
6. Missing expected data for person type
7. Unusual patterns in the source
8. Generic duplicate-identity signals (no contact info, no specifics)
9. CV/PROFILE SIMILARITY — compare this candidate's skills, bio, job titles and location against the other candidates listed above. Flag if the profile looks suspiciously similar to another candidate (possible duplicate submission, copied CV, or candidate farm). Name the specific candidate(s) if similar.
10. Anything else that seems inconsistent or worth verifying

RESPOND ONLY with valid JSON in exactly this format:
{
  "risk_score": 0-100,
  "risk_level": "low|medium|high",
  "summary": "2-3 sentence plain-English summary",
  "flags": [
    {
      "category": "category name",
      "severity": "low|medium|high",
      "flag": "Short title",
      "detail": "Specific detail about what was flagged and why",
      "recommendation": "What to do to verify or resolve this"
    }
  ],
  "similar_candidates": [
    {
      "name": "candidate name",
      "similarity": "Brief description of what is suspiciously similar",
      "severity": "low|medium|high"
    }
  ],
  "positive_indicators": ["list of things that look genuine or positive"],
  "overall_recommendation": "approve|review|investigate"
}

Risk score guide: 0-25 = routine candidate, 26-50 = a few things to check, 51-75 = warrants attention, 76-100 = significant concerns.
If the profile has very little data, note that but keep score moderate — incomplete ≠ fraudulent.
For similarity: only flag if the resemblance is genuinely suspicious, not just same industry.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI API error', detail: err.slice(0, 200) });
    }
    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let analysis;
    try { analysis = JSON.parse(clean); }
    catch { return res.status(500).json({ error: 'AI returned unparseable response', raw: clean.slice(0, 500) }); }

    const s = getStore();
    if (!s.fraud_analyses) s.fraud_analyses = [];
    const existing = s.fraud_analyses.findIndex(f => f.record_id === record_id);
    const entry = { id: uuidv4(), record_id, environment_id, analysis, analysed_at: ts() };
    if (existing !== -1) s.fraud_analyses[existing] = entry;
    else s.fraud_analyses.push(entry);
    saveStore();
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sharing/fraud/:record_id
router.get('/fraud/:record_id', (req, res) => {
  const s = getStore();
  const entry = (s.fraud_analyses || []).find(f => f.record_id === req.params.record_id);
  if (!entry) return res.status(404).json({ error: 'No analysis found' });
  res.json(entry);
});

// DELETE /api/sharing/fraud/:record_id
router.delete('/fraud/:record_id', (req, res) => {
  const s = getStore();
  const before = (s.fraud_analyses || []).length;
  s.fraud_analyses = (s.fraud_analyses || []).filter(f => f.record_id !== req.params.record_id);
  saveStore();
  res.json({ deleted: before - s.fraud_analyses.length });
});

module.exports = router;
