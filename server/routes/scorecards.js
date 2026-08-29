'use strict';
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, findOne, getStore, saveStore } = require('../db/init');
const { MODEL_DEFAULT } = require('../config/ai_models');

function ensureTables() {
  const s = getStore();
  if (!s.scorecard_templates)    s.scorecard_templates = [];
  if (!s.scorecard_competencies) s.scorecard_competencies = [];
  if (!s.scorecard_submissions)  s.scorecard_submissions = [];
  if (!s.scorecard_responses)    s.scorecard_responses = [];
}

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  ensureTables();
  const { environment_id, interview_type_id } = req.query;
  let tmpl = query('scorecard_templates', () => true);
  if (environment_id)    tmpl = tmpl.filter(t => t.environment_id === environment_id);
  if (interview_type_id) tmpl = tmpl.filter(t => t.interview_type_id === interview_type_id);
  tmpl = tmpl.filter(t => !t.deleted_at);
  const comps = query('scorecard_competencies', () => true);
  tmpl = tmpl.map(t => ({
    ...t,
    competencies: comps.filter(c => c.template_id === t.id && !c.deleted_at)
                       .sort((a, b) => (a.order || 0) - (b.order || 0)),
  }));
  res.json(tmpl);
});

router.post('/templates', (req, res) => {
  ensureTables();
  const { name, description, interview_type_id, environment_id, rating_scale, competencies = [] } = req.body;
  if (!name || !environment_id) return res.status(400).json({ error: 'name and environment_id required' });
  const now = new Date().toISOString();
  const tmpl = insert('scorecard_templates', {
    id: uuidv4(), name, description: description || '', interview_type_id: interview_type_id || null,
    environment_id, rating_scale: rating_scale || 'five_point', created_at: now, updated_at: now,
  });
  const saved = competencies.map((c, i) => insert('scorecard_competencies', {
    id: c.id || uuidv4(), template_id: tmpl.id, name: c.name, description: c.description || '',
    weight: Number(c.weight) || 1, order: i, required: c.required !== false, created_at: now,
  }));
  res.status(201).json({ ...tmpl, competencies: saved });
});

router.put('/templates/:id', (req, res) => {
  ensureTables();
  const { name, description, interview_type_id, rating_scale, competencies } = req.body;
  const now = new Date().toISOString();
  const store = getStore();
  const idx = store.scorecard_templates.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Template not found' });
  Object.assign(store.scorecard_templates[idx], { name, description, interview_type_id, rating_scale, updated_at: now });
  if (Array.isArray(competencies)) {
    store.scorecard_competencies = store.scorecard_competencies.filter(c => c.template_id !== req.params.id);
    competencies.forEach((c, i) => store.scorecard_competencies.push({
      id: c.id || uuidv4(), template_id: req.params.id, name: c.name,
      description: c.description || '', weight: Number(c.weight) || 1, order: i,
      required: c.required !== false, created_at: now,
    }));
  }
  saveStore(store);
  const saved = store.scorecard_competencies.filter(c => c.template_id === req.params.id).sort((a,b)=>a.order-b.order);
  res.json({ ...store.scorecard_templates[idx], competencies: saved });
});

router.delete('/templates/:id', (req, res) => {
  ensureTables();
  const store = getStore();
  const idx = store.scorecard_templates.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  store.scorecard_templates[idx].deleted_at = new Date().toISOString();
  saveStore(store);
  res.json({ ok: true });
});

// ── Submissions ───────────────────────────────────────────────────────────────
router.get('/submissions', (req, res) => {
  ensureTables();
  const { interview_id, candidate_record_id, job_record_id, interviewer_id } = req.query;
  let subs = query('scorecard_submissions', () => true);
  if (interview_id)        subs = subs.filter(s => s.interview_id === interview_id);
  if (candidate_record_id) subs = subs.filter(s => s.candidate_record_id === candidate_record_id);
  if (job_record_id)       subs = subs.filter(s => s.job_record_id === job_record_id);
  if (interviewer_id)      subs = subs.filter(s => s.interviewer_id === interviewer_id);
  subs = subs.filter(s => !s.deleted_at);
  const allResp = query('scorecard_responses', () => true);
  subs = subs.map(s => ({ ...s, responses: allResp.filter(r => r.submission_id === s.id) }));
  res.json(subs);
});

router.post('/submissions', (req, res) => {
  ensureTables();
  const { interview_id, candidate_record_id, job_record_id, template_id,
    interviewer_id, interviewer_name, responses = [], recommendation,
    overall_comments, highlights, red_flags, status = 'draft' } = req.body;
  if (!candidate_record_id || !template_id)
    return res.status(400).json({ error: 'candidate_record_id and template_id required' });
  const now = new Date().toISOString();
  const store = getStore();
  let sub = store.scorecard_submissions.find(s =>
    s.interview_id === interview_id && s.interviewer_id === interviewer_id && !s.deleted_at
  );
  if (sub) {
    Object.assign(sub, { recommendation, overall_comments, highlights, red_flags, status, updated_at: now,
      submitted_at: status === 'submitted' ? now : sub.submitted_at });
    store.scorecard_responses = store.scorecard_responses.filter(r => r.submission_id !== sub.id);
  } else {
    sub = { id: uuidv4(), interview_id: interview_id || null, candidate_record_id,
      job_record_id: job_record_id || null, template_id,
      interviewer_id: interviewer_id || null, interviewer_name: interviewer_name || 'Interviewer',
      recommendation: recommendation || null, overall_comments: overall_comments || '',
      highlights: highlights || '', red_flags: red_flags || '', status, created_at: now, updated_at: now,
      submitted_at: status === 'submitted' ? now : null };
    store.scorecard_submissions.push(sub);
  }
  const savedResponses = responses.map(r => {
    const resp = { id: uuidv4(), submission_id: sub.id, competency_id: r.competency_id,
      rating: r.rating ?? null, notes: r.notes || '', created_at: now };
    store.scorecard_responses.push(resp);
    return resp;
  });
  saveStore(store);
  res.status(201).json({ ...sub, responses: savedResponses });
});

router.get('/submissions/:id', (req, res) => {
  ensureTables();
  const sub = findOne('scorecard_submissions', s => s.id === req.params.id && !s.deleted_at);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const responses = query('scorecard_responses', r => r.submission_id === sub.id);
  res.json({ ...sub, responses });
});

router.delete('/submissions/:id', (req, res) => {
  ensureTables();
  const store = getStore();
  const idx = store.scorecard_submissions.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  store.scorecard_submissions[idx].deleted_at = new Date().toISOString();
  saveStore(store);
  res.json({ ok: true });
});

// ── Aggregate summary ─────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  ensureTables();
  const { candidate_record_id, job_record_id } = req.query;
  if (!candidate_record_id) return res.status(400).json({ error: 'candidate_record_id required' });
  let subs = query('scorecard_submissions', s =>
    s.candidate_record_id === candidate_record_id && s.status === 'submitted' && !s.deleted_at
  );
  if (job_record_id) subs = subs.filter(s => s.job_record_id === job_record_id);
  const allResp = query('scorecard_responses', () => true);
  const allComps = query('scorecard_competencies', () => true);
  const recCounts = { strong_yes:0, yes:0, no:0, strong_no:0 };
  subs.forEach(s => { if (s.recommendation && recCounts[s.recommendation] !== undefined) recCounts[s.recommendation]++; });
  const compMap = {};
  subs.forEach(sub => {
    allResp.filter(r => r.submission_id === sub.id).forEach(r => {
      if (!compMap[r.competency_id]) {
        const comp = allComps.find(c => c.id === r.competency_id);
        compMap[r.competency_id] = { name: comp?.name || r.competency_id, weight: comp?.weight || 1, ratings: [] };
      }
      if (r.rating !== null && r.rating !== undefined) compMap[r.competency_id].ratings.push(Number(r.rating));
    });
  });
  const competencyAverages = Object.entries(compMap).map(([id, d]) => ({
    competency_id: id, name: d.name, weight: d.weight,
    avg: d.ratings.length ? Math.round((d.ratings.reduce((a,b)=>a+b,0)/d.ratings.length)*10)/10 : null,
    count: d.ratings.length,
  })).sort((a,b) => (b.weight||1)-(a.weight||1));
  let totalWeight = 0, totalScore = 0;
  competencyAverages.forEach(c => { if (c.avg !== null) { totalWeight += c.weight; totalScore += c.avg * c.weight; } });
  const overallAvg = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : null;
  let aiSummary = null;
  if (subs.length > 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic();
      const context = subs.map(s => `Interviewer: ${s.interviewer_name}\nRecommendation: ${s.recommendation||'none'}\nComments: ${s.overall_comments||''}\nHighlights: ${s.highlights||''}\nRed Flags: ${s.red_flags||''}`).join('\n---\n');
      const msg = await client.messages.create({ model: MODEL_DEFAULT, max_tokens:300,
        messages:[{ role:'user', content:`Summarise these interview scorecards in 2-3 sentences. Be objective and concise.\n\n${context}` }] });
      aiSummary = msg.content[0]?.text || null;
    } catch(e) { aiSummary = null; }
  }
  res.json({ total_submissions: subs.length, recommendation_breakdown: recCounts,
    competency_averages: competencyAverages, overall_average: overallAvg, ai_summary: aiSummary,
    submissions: subs.map(s => ({ id:s.id, interviewer_name:s.interviewer_name, recommendation:s.recommendation,
      overall_comments:s.overall_comments, highlights:s.highlights, red_flags:s.red_flags,
      submitted_at:s.submitted_at, interview_id:s.interview_id })) });
});

module.exports = router;
