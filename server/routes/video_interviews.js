// server/routes/video_interviews.js
// Async on-demand video interviewing — template builder, session management,
// video storage (base64 blobs), AI scoring via Claude.

'use strict';
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');

// ── helpers ───────────────────────────────────────────────────────────────────
function ts() { return new Date().toISOString(); }

function ensure() {
  const s = getStore();
  if (!s.video_interview_templates) s.video_interview_templates = [];
  if (!s.video_interview_sessions)  s.video_interview_sessions  = [];
  saveStore();
}

function checkAuth(req, res) {
  if (!req.currentUser) { res.status(401).json({ error: 'Authentication required' }); return false; }
  return true;
}

function callClaude(prompt, system = 'You are an expert recruiter evaluator. Return valid JSON only, no markdown.') {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client.messages
    .create({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', max_tokens: 1200,
      system, messages: [{ role: 'user', content: prompt }] })
    .then(r => r.content[0]?.text || '{}');
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

// GET /api/video-interviews/templates?environment_id=
router.get('/templates', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const rows = query('video_interview_templates',
    t => t.environment_id === environment_id && !t.deleted_at
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

// GET /api/video-interviews/templates/:id
router.get('/templates/:id', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const t = query('video_interview_templates', t => t.id === req.params.id && !t.deleted_at)[0];
  t ? res.json(t) : res.status(404).json({ error: 'Not found' });
});

// POST /api/video-interviews/templates
router.post('/templates', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const {
    environment_id, name, description, job_title, welcome_message, completion_message,
    questions, time_limit_per_question, retakes_allowed, deadline_hours, is_active,
  } = req.body;
  if (!environment_id || !name) return res.status(400).json({ error: 'environment_id and name required' });
  const rec = insert('video_interview_templates', {
    id: uuidv4(),
    environment_id,
    name,
    description:          description          || '',
    job_title:            job_title            || '',
    welcome_message:      welcome_message      || 'Thank you for taking the time to complete this video interview. Please answer each question as fully as you can.',
    completion_message:   completion_message   || 'Thank you for completing the interview. We will review your responses and be in touch shortly.',
    questions:            Array.isArray(questions) ? questions : [],
    time_limit_per_question: time_limit_per_question || 120,  // seconds
    retakes_allowed:      retakes_allowed !== undefined ? retakes_allowed : 1,
    deadline_hours:       deadline_hours       || 72,
    is_active:            is_active !== false,
    created_by:           req.currentUser?.id  || null,
    created_at:           ts(),
    updated_at:           ts(),
    deleted_at:           null,
  });
  res.status(201).json(rec);
});

// PATCH /api/video-interviews/templates/:id
router.patch('/templates/:id', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const allowed = ['name','description','job_title','welcome_message','completion_message',
    'questions','time_limit_per_question','retakes_allowed','deadline_hours','is_active'];
  const updates = { updated_at: ts() };
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const rec = update('video_interview_templates', t => t.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

// DELETE /api/video-interviews/templates/:id
router.delete('/templates/:id', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  update('video_interview_templates', t => t.id === req.params.id, { deleted_at: ts() });
  res.json({ ok: true });
});

// ── SESSIONS ──────────────────────────────────────────────────────────────────

// POST /api/video-interviews/sessions — create and send to a candidate
router.post('/sessions', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const { template_id, candidate_id, candidate_name, candidate_email, job_id, job_name, environment_id } = req.body;
  if (!template_id || !environment_id) return res.status(400).json({ error: 'template_id and environment_id required' });

  const template = query('video_interview_templates', t => t.id === template_id && !t.deleted_at)[0];
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const token = uuidv4().replace(/-/g, '');
  const deadline = new Date(Date.now() + (template.deadline_hours || 72) * 3600 * 1000).toISOString();

  const session = insert('video_interview_sessions', {
    id:               uuidv4(),
    token,
    environment_id,
    template_id,
    template_snapshot: template,   // snapshot so edits don't change live sessions
    candidate_id:     candidate_id   || null,
    candidate_name:   candidate_name || '',
    candidate_email:  candidate_email || '',
    job_id:           job_id          || null,
    job_name:         job_name        || '',
    status:           'pending',      // pending | in_progress | completed | expired
    responses:        [],             // { question_index, video_blob, transcript, duration_s, submitted_at, score, feedback }
    ai_summary:       null,
    ai_recommendation: null,
    ai_scores:        [],
    reviewer_notes:   '',
    reviewer_decision: null,
    sent_at:          ts(),
    started_at:       null,
    completed_at:     null,
    deadline,
    created_by:       req.currentUser?.id || null,
    created_at:       ts(),
    updated_at:       ts(),
  });
  res.status(201).json({ ...session, interview_url: `/video-interview/${token}` });
});

// GET /api/video-interviews/sessions?environment_id=&candidate_id=&status=
router.get('/sessions', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const { environment_id, candidate_id, status, template_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rows = query('video_interview_sessions', s => s.environment_id === environment_id);
  if (candidate_id)  rows = rows.filter(s => s.candidate_id  === candidate_id);
  if (status)        rows = rows.filter(s => s.status         === status);
  if (template_id)   rows = rows.filter(s => s.template_id    === template_id);
  // Strip video blobs from list view (too large)
  rows = rows.map(s => ({ ...s, responses: (s.responses || []).map(r => ({ ...r, video_blob: r.video_blob ? '[blob]' : null })) }));
  rows.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  res.json(rows);
});

// GET /api/video-interviews/sessions/:id — full session with blobs
router.get('/sessions/:id', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const s = query('video_interview_sessions', s => s.id === req.params.id)[0];
  s ? res.json(s) : res.status(404).json({ error: 'Not found' });
});

// PATCH /api/video-interviews/sessions/:id — reviewer decision / notes
router.patch('/sessions/:id', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const allowed = ['reviewer_notes','reviewer_decision','status'];
  const updates = { updated_at: ts() };
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const rec = update('video_interview_sessions', s => s.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

// ── PUBLIC — candidate-facing (token-gated, no login) ─────────────────────────

// GET /api/video-interviews/take/:token — load session for candidate
router.get('/take/:token', (req, res) => {
  ensure();
  const s = query('video_interview_sessions', s => s.token === req.params.token)[0];
  if (!s) return res.status(404).json({ error: 'Interview not found. Please check your link.' });
  if (s.status === 'expired' || (s.deadline && new Date() > new Date(s.deadline))) {
    update('video_interview_sessions', x => x.id === s.id, { status: 'expired', updated_at: ts() });
    return res.status(410).json({ error: 'This interview link has expired. Please contact your recruiter.' });
  }
  // Return session without blobs (candidate doesn't need previous recordings on load)
  const safe = { ...s, responses: (s.responses || []).map(r => ({ ...r, video_blob: undefined })) };
  res.json(safe);
});

// POST /api/video-interviews/take/:token/start
router.post('/take/:token/start', (req, res) => {
  ensure();
  const s = query('video_interview_sessions', s => s.token === req.params.token)[0];
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (s.status === 'completed') return res.status(409).json({ error: 'Already completed' });
  update('video_interview_sessions', x => x.id === s.id,
    { status: 'in_progress', started_at: s.started_at || ts(), updated_at: ts() });
  res.json({ ok: true });
});

// POST /api/video-interviews/take/:token/respond — submit a video answer
router.post('/take/:token/respond', express.json({ limit: '50mb' }), (req, res) => {
  ensure();
  const s = query('video_interview_sessions', s => s.token === req.params.token)[0];
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (s.status === 'completed') return res.status(409).json({ error: 'Already completed' });

  const { question_index, video_blob, transcript, duration_s } = req.body;
  if (question_index === undefined) return res.status(400).json({ error: 'question_index required' });

  const responses = [...(s.responses || [])];
  const existing  = responses.findIndex(r => r.question_index === question_index);
  const response  = {
    question_index,
    video_blob:   video_blob   || null,   // base64 WebM
    transcript:   transcript   || '',
    duration_s:   duration_s   || 0,
    submitted_at: ts(),
    score:        null,
    feedback:     null,
  };

  if (existing >= 0) responses[existing] = response;
  else               responses.push(response);

  update('video_interview_sessions', x => x.id === s.id,
    { responses, status: 'in_progress', updated_at: ts() });
  res.json({ ok: true, responses_count: responses.length });
});

// POST /api/video-interviews/take/:token/complete — candidate finishes, trigger AI scoring
router.post('/take/:token/complete', (req, res) => {
  ensure();
  const s = query('video_interview_sessions', s => s.token === req.params.token)[0];
  if (!s) return res.status(404).json({ error: 'Not found' });

  update('video_interview_sessions', x => x.id === s.id,
    { status: 'completed', completed_at: ts(), updated_at: ts() });

  // Fire async AI scoring — don't block the response
  setTimeout(async () => {
    try {
      const fresh = query('video_interview_sessions', x => x.id === s.id)[0];
      const template = fresh.template_snapshot || fresh;
      const questions = template.questions || [];
      const responses = fresh.responses || [];

      // Score each response individually
      const scoredResponses = await Promise.all(responses.map(async (resp) => {
        const q = questions[resp.question_index];
        if (!q || !resp.transcript) return resp;
        const prompt = `You are evaluating a candidate's video interview response.\n\nJob: ${fresh.job_name || template.job_title || 'Not specified'}\nCandidate: ${fresh.candidate_name}\nQuestion (${q.type || 'general'}): ${q.text}\nRubric: ${q.rubric || 'Assess clarity, relevance, and depth of answer.'}\nMax score: ${q.max_score || 10}\n\nCandidate's response (transcribed):\n"${resp.transcript}"\n\nRespond with JSON only:\n{"score": <0-${q.max_score || 10}>, "feedback": "<1-2 sentence evaluation>", "strengths": ["<s1>"], "improvements": ["<i1>"]}`;
        try {
          const raw = await callClaude(prompt);
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          return { ...resp, score: parsed.score, feedback: parsed.feedback, strengths: parsed.strengths, improvements: parsed.improvements };
        } catch { return resp; }
      }));

      // Overall summary
      const answersText = scoredResponses.map((r, i) => {
        const q = questions[r.question_index];
        return `Q${i + 1}: ${q?.text || 'Question'}\nAnswer: ${r.transcript || '(no transcript)'}\nScore: ${r.score ?? '?'}/${q?.max_score || 10}`;
      }).join('\n\n');

      const totalPossible = questions.reduce((sum, q) => sum + (q.max_score || 10), 0);
      const totalScore    = scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0);

      const summaryPrompt = `You are a senior recruiter reviewing a video interview.\n\nJob: ${fresh.job_name || template.job_title}\nCandidate: ${fresh.candidate_name}\nTotal score: ${totalScore}/${totalPossible}\n\nQ&A summary:\n${answersText}\n\nProvide a JSON assessment:\n{"headline": "<1 sentence>", "summary": "<3-4 sentence overall assessment>", "top_strengths": ["<s1>", "<s2>", "<s3>"], "areas_to_probe": ["<p1>", "<p2>"], "recommendation": "strong_yes" | "yes" | "consider" | "no", "recommendation_reason": "<1 sentence>"}`;

      let summary = {};
      try {
        const raw = await callClaude(summaryPrompt);
        summary = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch { summary = { headline: `Scored ${totalScore}/${totalPossible}`, recommendation: 'consider' }; }

      update('video_interview_sessions', x => x.id === s.id, {
        responses:         scoredResponses,
        ai_summary:        summary.summary        || '',
        ai_headline:       summary.headline       || '',
        ai_recommendation: summary.recommendation || 'consider',
        ai_top_strengths:  summary.top_strengths  || [],
        ai_areas_to_probe: summary.areas_to_probe || [],
        ai_recommendation_reason: summary.recommendation_reason || '',
        ai_total_score:    totalScore,
        ai_max_score:      totalPossible,
        updated_at:        ts(),
      });

      // Write a note to the candidate record
      if (fresh.candidate_id) {
        const store = getStore();
        const recIdx = (store.records || []).findIndex(r => r.id === fresh.candidate_id);
        if (recIdx !== -1) {
          if (!store.records[recIdx].notes) store.records[recIdx].notes = [];
          const pct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
          store.records[recIdx].notes.push({
            id:         uuidv4(),
            content:    `## Video Interview Completed — ${template.name || 'Video Interview'}\n\n**Score:** ${totalScore}/${totalPossible} (${pct}%)\n**Recommendation:** ${(summary.recommendation || 'consider').replace(/_/g, ' ').toUpperCase()}\n\n${summary.summary || ''}\n\n**Strengths:** ${(summary.top_strengths || []).join(' · ') || '—'}\n**Areas to probe:** ${(summary.areas_to_probe || []).join(' · ') || '—'}`,
            created_by: 'system',
            created_at: ts(),
          });
          saveStore();
        }
      }

      console.log(`[VideoInterview] Scored session ${s.id}: ${totalScore}/${totalPossible} — ${summary.recommendation}`);
    } catch (err) {
      console.error('[VideoInterview] Scoring error:', err.message);
    }
  });

  res.json({ ok: true, message: 'Interview completed. Thank you!' });
});

// GET /api/video-interviews/take/:token/video/:question_index — serve video blob to reviewer
router.get('/take/:token/video/:qi', (req, res) => {
  if (!checkAuth(req, res)) return;
  ensure();
  const s = query('video_interview_sessions', s => s.token === req.params.token)[0];
  if (!s) return res.status(404).json({ error: 'Not found' });
  const resp = (s.responses || []).find(r => r.question_index === Number(req.params.qi));
  if (!resp?.video_blob) return res.status(404).json({ error: 'No video for this question' });
  // video_blob is base64 WebM — decode and stream
  const buf = Buffer.from(resp.video_blob, 'base64');
  res.set('Content-Type', 'video/webm');
  res.set('Content-Length', buf.length);
  res.send(buf);
});

module.exports = router;
