// server/routes/fit_check.js
// Public endpoints — no auth required (portal candidates don't have accounts)
// POST /api/portals/:id/fit-check
// POST /api/portals/:id/talent-alert

const express  = require('express');
const router   = express.Router({ mergeParams: true });
const Anthropic = require('@anthropic-ai/sdk');
const { getStore, saveStore } = require('../db/init');

// ── Scoring logic (mirrors client-side matchCandidateToJob) ─────────────────
function matchProfileToJob(profile, job) {
  let score = 0;
  const reasons = [];
  const gaps    = [];
  const jData   = job.data || {};

  const toArr = v => (Array.isArray(v) ? v : String(v || '').split(','))
    .map(s => s.trim().toLowerCase()).filter(Boolean);

  // Skills (40 pts)
  const pSkills = toArr(profile.skills);
  const jSkills = toArr(jData.required_skills || jData.skills || '');
  if (jSkills.length > 0) {
    const matched = pSkills.filter(s => jSkills.some(j => j.includes(s) || s.includes(j)));
    score += Math.round((matched.length / jSkills.length) * 40);
    if (matched.length > 0) reasons.push(`Matches ${matched.length} of ${jSkills.length} required skills`);
    const missing = jSkills.filter(j => !pSkills.some(p => p.includes(j) || j.includes(p)));
    if (missing.length > 0) gaps.push(`Skills gap: ${missing.slice(0, 3).join(', ')}`);
  } else { score += 28; }

  // Location (20 pts)
  if (profile.location && jData.location) {
    const pl = String(profile.location).toLowerCase();
    const jl = String(jData.location).toLowerCase();
    if (pl === jl || pl.includes(jl) || jl.includes(pl)) {
      score += 20; reasons.push('Location match');
    } else if (String(jData.work_type || '').toLowerCase() === 'remote' ||
               String(profile.work_type || '').toLowerCase() === 'remote') {
      score += 15; reasons.push('Remote role');
    } else {
      score += 5;
      gaps.push(`Location: you're in ${profile.location}, role is in ${jData.location}`);
    }
  } else { score += 10; }

  // Experience (20 pts)
  const exp = Number(profile.years_experience || 0);
  if      (exp >= 8) { score += 20; reasons.push(`${exp} years experience`); }
  else if (exp >= 5) { score += 18; reasons.push(`${exp} years experience`); }
  else if (exp >= 3) { score += 13; reasons.push(`${exp} years experience`); }
  else if (exp >= 1) { score +=  8; }
  else               { gaps.push('Entry-level experience'); }

  // Work type (10 pts)
  if (profile.work_type && jData.work_type) {
    if (String(profile.work_type).toLowerCase() === String(jData.work_type).toLowerCase()) {
      score += 10; reasons.push(`${jData.work_type} preference aligns`);
    } else { score += 4; }
  } else { score += 6; }

  // Department (10 pts)
  if (profile.department && jData.department) {
    if (String(profile.department).toLowerCase() === String(jData.department).toLowerCase()) {
      score += 10; reasons.push('Department match');
    } else { score += 3; }
  } else { score += 5; }

  return { score: Math.min(100, Math.max(0, score)), reasons: reasons.slice(0,4), gaps: gaps.slice(0,2) };
}

// ── Extract profile from file (CV/DOCX/PDF) ──────────────────────────────────
async function extractProfileFromFile(base64, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const buf = Buffer.from(base64, 'base64');
  let text  = '';

  try {
    if (ext === 'pdf') {
      const pdfParse = require('pdf-parse');
      text = (await pdfParse(buf)).text;
    } else if (['docx','doc'].includes(ext)) {
      const mammoth = require('mammoth');
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    }
  } catch (e) { console.error('[fit-check] extraction error:', e.message); }

  if (!text) {
    const mediaTypeMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp' };
    const mediaType = mediaTypeMap[ext];
    if (!mediaType) return null;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model:'claude-sonnet-4-6', max_tokens:800,
      messages:[{ role:'user', content:[
        { type:'image', source:{ type:'base64', media_type:mediaType, data:base64 } },
        { type:'text', text:'Extract any CV or resume information from this image. Return raw text only.' }
      ]}]
    });
    text = resp.content[0]?.text || '';
  }
  if (!text) return null;

  const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const extract = await client.messages.create({
    model:'claude-sonnet-4-6', max_tokens:600,
    messages:[{ role:'user', content:`Extract fields from this CV. Return ONLY valid JSON (no markdown):
{"skills":["skill1"],"location":"city, country","years_experience":0,"department":"Engineering","work_type":"Any","current_title":"","first_name":"","last_name":"","email":""}

CV TEXT:\n${text.slice(0,4000)}`}]
  });
  try {
    const raw = (extract.content[0]?.text||'').replace(/\`\`\`json|\`\`\`/g,'').trim();
    return JSON.parse(raw);
  } catch { return null; }
}

// ── POST /api/portals/:id/fit-check ──────────────────────────────────────────
router.post('/fit-check', async (req, res) => {
  try {
    const store  = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    const envId   = portal.environment_id;
    const jobsObj = (store.objects || []).find(o => o.environment_id === envId && o.slug === 'jobs');
    if (!jobsObj) return res.status(400).json({ error: 'Jobs object not found' });

    const openJobs = (store.records || []).filter(r =>
      r.object_id === jobsObj.id && r.environment_id === envId && !r.deleted_at &&
      (r.data?.status === 'Open' || !r.data?.status)
    );
    if (openJobs.length === 0) return res.json({ matches: [], total_jobs: 0 });

    let profile = req.body.profile;
    if (!profile && req.body.file) {
      profile = await extractProfileFromFile(req.body.file, req.body.filename || 'cv.pdf');
      if (!profile) return res.status(422).json({ error: 'Could not extract profile from file' });
    }
    if (!profile) return res.status(400).json({ error: 'Either profile or file is required' });

    const scored = openJobs.map(job => {
      const { score, reasons, gaps } = matchProfileToJob(profile, job);
      const d = job.data || {};
      return { score, reasons, gaps, job: {
        id:d.id||job.id, title:d.job_title||d.name||'Untitled Role',
        department:d.department||'', location:d.location||'', work_type:d.work_type||'',
        salary_min:d.salary_min||null, salary_max:d.salary_max||null, currency:d.currency||'USD',
        summary:d.summary||d.description||'', employment_type:d.employment_type||''
      }};
    }).sort((a,b)=>b.score-a.score).slice(0,5);

    res.json({ matches:scored, total_jobs:openJobs.length, profile:{
      skills:profile.skills||[], location:profile.location||'',
      years_experience:profile.years_experience||0, department:profile.department||'',
      work_type:profile.work_type||'', first_name:profile.first_name||'',
      last_name:profile.last_name||'', email:profile.email||''
    }});
  } catch (err) {
    console.error('[fit-check]', err);
    res.status(500).json({ error: 'Fit check failed', detail: err.message });
  }
});

// ── POST /api/portals/:id/talent-alert ───────────────────────────────────────
router.post('/talent-alert', async (req, res) => {
  try {
    const { email, first_name, skills, department, location } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const { v4: uuidv4 } = require('uuid');
    const store  = getStore();
    const portal = (store.portals || []).find(p => p.id === req.params.id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });

    if (!store.talent_alerts) store.talent_alerts = [];
    const existing = store.talent_alerts.find(a => a.email === email && a.portal_id === req.params.id);
    if (!existing) {
      store.talent_alerts.push({
        id:uuidv4(), portal_id:req.params.id,
        environment_id:portal.environment_id,
        email, first_name:first_name||'',
        skills:skills||[], department:department||'', location:location||'',
        created_at:new Date().toISOString()
      });
      saveStore();
    }
    res.json({ success:true, already_registered:!!existing });
  } catch (err) {
    console.error('[talent-alert]', err);
    res.status(500).json({ error: 'Failed to save alert' });
  }
});

module.exports = router;
