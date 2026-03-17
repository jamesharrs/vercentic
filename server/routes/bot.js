// server/routes/bot.js
// AI Interview Bot — session management, question delivery, Claude-powered scoring

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');

const DEFAULT_QUESTIONS = [
  { id: 'kq1', type: 'knockout', competency: 'eligibility', text: 'Are you currently eligible to work in the country where this role is based?', options: ['Yes', 'No'], pass_value: 'Yes', weight: 10 },
  { id: 'kq2', type: 'knockout', competency: 'availability', text: 'Can you start within the timeframe required for this role?', options: ['Yes', 'No', 'Negotiable'], pass_value: null, weight: 5 },
  { id: 'bq1', type: 'competency', competency: 'leadership', text: 'Tell me about a time you led a team through a challenging project. What was your approach and what was the outcome?', weight: 15 },
  { id: 'bq2', type: 'competency', competency: 'problem_solving', text: 'Describe a complex problem you encountered at work. How did you break it down and what steps did you take to resolve it?', weight: 15 },
  { id: 'bq3', type: 'competency', competency: 'communication', text: 'Give an example of a time you had to communicate difficult news to a stakeholder. How did you approach it?', weight: 10 },
  { id: 'bq4', type: 'competency', competency: 'adaptability', text: 'Tell me about a time when priorities changed unexpectedly. How did you respond and what was the result?', weight: 10 },
  { id: 'bq5', type: 'competency', competency: 'collaboration', text: 'Describe a situation where you had to work closely with someone whose working style differed significantly from yours.', weight: 10 },
  { id: 'tq1', type: 'technical', competency: 'technical_depth', text: 'Walk me through your approach to a recent technical challenge in your current or most recent role.', weight: 20 },
  { id: 'tq2', type: 'technical', competency: 'technical_breadth', text: 'What technologies or tools do you consider yourself most proficient in, and how have you applied them recently?', weight: 15 },
  { id: 'cq1', type: 'culture', competency: 'values', text: 'What type of working environment helps you do your best work?', weight: 10 },
  { id: 'cq2', type: 'culture', competency: 'motivation', text: 'What excites you most about this opportunity, and where do you see yourself in three years?', weight: 10 },
  { id: 'cq3', type: 'culture', competency: 'feedback', text: 'How do you prefer to give and receive feedback in a professional setting?', weight: 10 },
];

const seedQuestionBank = () => {
  const store = getStore();
  if (!store.question_bank) { store.question_bank = DEFAULT_QUESTIONS.map(q => ({ ...q, created_at: new Date().toISOString() })); saveStore(store); }
  if (!store.bot_sessions) { store.bot_sessions = []; saveStore(store); }
  if (!store.scorecards) { store.scorecards = []; saveStore(store); }
};
seedQuestionBank();

const callClaude = async (prompt, systemPrompt) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: systemPrompt, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
};

const getJobContext = (jobRecord) => {
  if (!jobRecord) return '';
  const d = jobRecord.data || {};
  return `Job Title: ${d.job_title || 'Unknown'}\nDepartment: ${d.department || 'Unknown'}\nLocation: ${d.location || 'Unknown'}\nEmployment Type: ${d.employment_type || 'Unknown'}\nDescription: ${d.description || 'Not provided'}\nRequired Skills: ${Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || 'Not specified')}`;
};

const scoreAnswer = async (question, answer, jobContext, candidateName) => {
  if (question.type === 'knockout') {
    const passed = question.pass_value === null || answer === question.pass_value;
    return { score: passed ? question.weight : 0, max_score: question.weight, passed, feedback: passed ? 'Candidate meets the basic requirement.' : `Did not meet knockout criterion.`, ai_annotation: passed ? 'PASS' : 'FAIL — disqualifying', strengths: [], gaps: [] };
  }
  const systemPrompt = `You are an expert recruiter evaluating a candidate's interview response. Be fair and objective. Respond with valid JSON only, no markdown.`;
  const prompt = `Job context:\n${jobContext}\nCandidate: ${candidateName}\nQuestion type: ${question.type} — Competency: ${question.competency}\nQuestion: ${question.text}\nCandidate's answer: ${answer}\nMax score: ${question.weight}\n\nRespond with JSON:\n{"score":<0-${question.weight}>,"feedback":"<1-2 sentences>","ai_annotation":"<1 sentence>","strengths":["<s1>"],"gaps":["<g1>"]}`;
  try {
    const raw = await callClaude(prompt, systemPrompt);
    const parsed = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, '').trim());
    return { ...parsed, max_score: question.weight, passed: true };
  } catch {
    return { score: Math.round(question.weight * 0.5), max_score: question.weight, passed: true, feedback: 'Manual review required.', ai_annotation: 'Scoring error.', strengths: [], gaps: [] };
  }
};

const generateSummary = async (session, jobContext) => {
  const answersText = (session.answers || []).map(a => `Q: ${a.question_text}\nA: ${a.answer}\nScore: ${a.score}/${a.max_score}`).join('\n\n');
  const systemPrompt = `You are a senior recruiter writing a candidate assessment. Respond with valid JSON only.`;
  const prompt = `Job context:\n${jobContext}\nCandidate: ${session.candidate_name}\nResponses:\n${answersText}\nTotal: ${session.total_score}/${session.max_score}\n\nJSON format:\n{"headline":"<1 sentence>","summary":"<3-4 sentences>","top_strengths":["s1","s2","s3"],"areas_to_probe":["p1","p2"],"recommendation":"strong_yes"|"yes"|"consider"|"no"|"knockout_fail","recommendation_reason":"<1 sentence>"}`;
  try {
    const raw = await callClaude(prompt, systemPrompt);
    return JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, '').trim());
  } catch {
    const pct = Math.round((session.total_score / session.max_score) * 100);
    return { headline: `Candidate scored ${pct}%.`, summary: 'Review individual responses.', top_strengths: [], areas_to_probe: [], recommendation: pct >= 70 ? 'yes' : pct >= 50 ? 'consider' : 'no', recommendation_reason: 'Based on overall score.' };
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/questions', (req, res) => { const store = getStore(); res.json(store.question_bank || []); });

router.post('/questions', (req, res) => {
  const { text, type, competency, weight, options, pass_value } = req.body;
  if (!text || !type) return res.status(400).json({ error: 'text and type required' });
  const store = getStore();
  const q = { id: uuidv4(), text, type, competency: competency || type, weight: weight || 10, options: options || null, pass_value: pass_value || null, created_at: new Date().toISOString(), is_custom: true };
  store.question_bank.push(q);
  saveStore(store);
  res.json(q);
});

router.delete('/questions/:id', (req, res) => {
  const store = getStore();
  const idx = store.question_bank.findIndex(q => q.id === req.params.id && q.is_custom);
  if (idx === -1) return res.status(404).json({ error: 'Custom question not found' });
  store.question_bank.splice(idx, 1);
  saveStore(store);
  res.json({ deleted: true });
});

router.post('/sessions', (req, res) => {
  const { interview_id, candidate_id, job_id, environment_id, question_ids, config } = req.body;
  if (!interview_id || !environment_id) return res.status(400).json({ error: 'interview_id and environment_id required' });
  const store = getStore();
  const candidate = store.records?.find(r => r.id === candidate_id);
  const job = store.records?.find(r => r.id === job_id);
  const d = candidate?.data || {};
  const candidateName = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Candidate';
  let questions;
  if (question_ids?.length) {
    questions = store.question_bank.filter(q => question_ids.includes(q.id));
  } else {
    questions = [
      ...store.question_bank.filter(q => q.type === 'knockout').slice(0, 2),
      ...store.question_bank.filter(q => q.type === 'competency').slice(0, 2),
      ...store.question_bank.filter(q => q.type === 'technical').slice(0, 1),
      ...store.question_bank.filter(q => q.type === 'culture').slice(0, 1),
    ];
  }
  const session = {
    id: uuidv4(), interview_id, candidate_id, job_id, environment_id,
    candidate_name: candidateName, candidate_email: d.email || null,
    job_context: getJobContext(job), questions: questions.map(q => ({ ...q })),
    answers: [], current_question_index: 0, status: 'pending',
    knockout_passed: null, total_score: 0,
    max_score: questions.reduce((s, q) => s + (q.weight || 0), 0),
    started_at: null, completed_at: null,
    config: config || { allow_retake: false, show_progress: true, time_limit_minutes: null },
    created_at: new Date().toISOString(), token: uuidv4(),
  };
  if (!store.bot_sessions) store.bot_sessions = [];
  store.bot_sessions.push(session);
  saveStore(store);
  res.json({ ...session, bot_url: `/bot/${session.token}` });
});

router.get('/sessions/by-interview/:interview_id', (req, res) => {
  const store = getStore();
  const session = store.bot_sessions?.find(s => s.interview_id === req.params.interview_id);
  if (!session) return res.status(404).json({ error: 'No bot session for this interview' });
  // Include token so frontend can build the bot URL
  res.json({ id: session.id, token: session.token, interview_id: session.interview_id, candidate_name: session.candidate_name, status: session.status, bot_url: `/bot/${session.token}` });
});

router.get('/sessions/:token', (req, res) => {
  const store = getStore();
  const session = store.bot_sessions?.find(s => s.token === req.params.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ id: session.id, token: session.token, candidate_name: session.candidate_name, status: session.status, current_question_index: session.current_question_index, total_questions: session.questions.length, config: session.config, knockout_passed: session.knockout_passed, next_question: session.status !== 'completed' && session.status !== 'knocked_out' ? session.questions[session.current_question_index] || null : null });
});

router.post('/sessions/:token/start', (req, res) => {
  const store = getStore();
  const idx = store.bot_sessions?.findIndex(s => s.token === req.params.token);
  if (idx === -1 || idx === undefined) return res.status(404).json({ error: 'Session not found' });
  if (store.bot_sessions[idx].status !== 'pending') return res.status(400).json({ error: 'Already started' });
  store.bot_sessions[idx].status = 'in_progress';
  store.bot_sessions[idx].started_at = new Date().toISOString();
  saveStore(store);
  res.json({ started: true, first_question: store.bot_sessions[idx].questions[0] });
});

router.post('/sessions/:token/answer', async (req, res) => {
  const { answer } = req.body;
  if (!answer) return res.status(400).json({ error: 'answer required' });
  const store = getStore();
  const idx = store.bot_sessions?.findIndex(s => s.token === req.params.token);
  if (idx === -1 || idx === undefined) return res.status(404).json({ error: 'Session not found' });
  const session = store.bot_sessions[idx];
  if (session.status !== 'in_progress') return res.status(400).json({ error: 'Not in progress' });
  const question = session.questions[session.current_question_index];
  if (!question) return res.status(400).json({ error: 'No current question' });
  const scored = await scoreAnswer(question, answer, session.job_context, session.candidate_name);
  const answerRecord = { question_id: question.id, question_text: question.text, question_type: question.type, competency: question.competency, answer, score: scored.score, max_score: scored.max_score, passed: scored.passed, feedback: scored.feedback, ai_annotation: scored.ai_annotation, strengths: scored.strengths || [], gaps: scored.gaps || [], answered_at: new Date().toISOString() };
  store.bot_sessions[idx].answers.push(answerRecord);
  store.bot_sessions[idx].total_score += scored.score;
  if (question.type === 'knockout' && !scored.passed) {
    store.bot_sessions[idx].knockout_passed = false;
    store.bot_sessions[idx].status = 'knocked_out';
    store.bot_sessions[idx].completed_at = new Date().toISOString();
    saveStore(store);
    return res.json({ status: 'knocked_out', message: 'Session ended at knockout question.', answer_recorded: true });
  }
  const nextIndex = session.current_question_index + 1;
  store.bot_sessions[idx].current_question_index = nextIndex;
  const isLast = nextIndex >= session.questions.length;
  if (isLast) {
    store.bot_sessions[idx].status = 'completed';
    store.bot_sessions[idx].knockout_passed = store.bot_sessions[idx].knockout_passed !== false;
    store.bot_sessions[idx].completed_at = new Date().toISOString();
    saveStore(store);
    const completedSession = { ...store.bot_sessions[idx] };
    generateSummary(completedSession, completedSession.job_context).then(summary => {
      const s2 = getStore(); const i2 = s2.bot_sessions.findIndex(x => x.token === req.params.token);
      if (i2 !== -1) {
        s2.bot_sessions[i2].summary = summary;
        const sc = { id: uuidv4(), interview_id: completedSession.interview_id, candidate_id: completedSession.candidate_id, job_id: completedSession.job_id, environment_id: completedSession.environment_id, bot_session_id: completedSession.id, source: 'bot', candidate_name: completedSession.candidate_name, total_score: completedSession.total_score, max_score: completedSession.max_score, percentage: Math.round((completedSession.total_score / completedSession.max_score) * 100), knockout_passed: completedSession.knockout_passed, recommendation: summary.recommendation, headline: summary.headline, summary_text: summary.summary, top_strengths: summary.top_strengths, areas_to_probe: summary.areas_to_probe, recommendation_reason: summary.recommendation_reason, answers: completedSession.answers, status: 'complete', created_at: new Date().toISOString() };
        if (!s2.scorecards) s2.scorecards = [];
        s2.scorecards.push(sc);
        saveStore(s2);
      }
    }).catch(console.error);
    return res.json({ status: 'completed', message: 'All questions answered. Thank you!', answer_recorded: true, next_question: null });
  }
  saveStore(store);
  res.json({ status: 'in_progress', answer_recorded: true, next_question: store.bot_sessions[idx].questions[nextIndex], progress: { current: nextIndex + 1, total: session.questions.length } });
});

router.get('/sessions', (req, res) => {
  const { interview_id, candidate_id, environment_id } = req.query;
  const store = getStore();
  let sessions = store.bot_sessions || [];
  if (interview_id) sessions = sessions.filter(s => s.interview_id === interview_id);
  if (candidate_id) sessions = sessions.filter(s => s.candidate_id === candidate_id);
  if (environment_id) sessions = sessions.filter(s => s.environment_id === environment_id);
  res.json(sessions.map(({ token, ...s }) => s));
});

router.get('/scorecards', (req, res) => {
  const { candidate_id, job_id, interview_id, environment_id } = req.query;
  const store = getStore();
  let sc = store.scorecards || [];
  if (candidate_id) sc = sc.filter(s => s.candidate_id === candidate_id);
  if (job_id) sc = sc.filter(s => s.job_id === job_id);
  if (interview_id) sc = sc.filter(s => s.interview_id === interview_id);
  if (environment_id) sc = sc.filter(s => s.environment_id === environment_id);
  res.json(sc);
});

router.get('/scorecards/:id', (req, res) => {
  const store = getStore();
  const sc = store.scorecards?.find(s => s.id === req.params.id);
  if (!sc) return res.status(404).json({ error: 'Scorecard not found' });
  res.json(sc);
});

router.patch('/scorecards/:id', (req, res) => {
  const store = getStore();
  const idx = store.scorecards?.findIndex(s => s.id === req.params.id);
  if (idx === -1 || idx === undefined) return res.status(404).json({ error: 'Not found' });
  ['recommendation', 'recruiter_notes', 'status'].forEach(k => { if (req.body[k] !== undefined) store.scorecards[idx][k] = req.body[k]; });
  store.scorecards[idx].updated_at = new Date().toISOString();
  saveStore(store);
  res.json(store.scorecards[idx]);
});

module.exports = router;
