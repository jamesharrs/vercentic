/**
 * Vercentic — AI Interview Session Route
 * server/routes/ai_interview.js
 */
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── GET /api/ai-interview/session/:token ──────────────────────────────────────
router.get('/session/:token', (req, res) => {
  const store = getStore();
  const tr = (store.agent_tokens || []).find(t => t.token === req.params.token);
  if (!tr) return res.status(404).json({ error: 'Invalid or expired link' });
  if (tr.status === 'completed') return res.status(410).json({ error: 'This interview has already been completed' });
  if (new Date(tr.expires_at) < new Date()) return res.status(410).json({ error: 'This interview link has expired' });
  const agent = (store.agents || []).find(a => a.id === tr.agent_id && !a.deleted_at);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({
    token: tr.token,
    candidate_name: tr.candidate_name,
    job_title: tr.job_title,
    job_department: tr.job_department,
    agent: {
      persona_name: agent.persona_name || agent.name || 'Alex',
      persona_description: agent.persona_description || "Hi, I'm here to learn more about you.",
      instructions: agent.description || '',
      avatar_color: agent.avatar_color || '#6366f1',
      voice: agent.voice || 'en-US',
      language: agent.language || 'en-US',
    },
    question_count: (tr.scorecard_questions || []).length,
    status: tr.status,
  });
});

// ── POST /api/ai-interview/chat ───────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { token, history = [], candidate_message } = req.body;
  if (!token || !candidate_message) return res.status(400).json({ error: 'token and candidate_message required' });
  const store = getStore();
  const tr = (store.agent_tokens || []).find(t => t.token === token);
  if (!tr) return res.status(404).json({ error: 'Invalid token' });
  if (tr.status === 'completed') return res.status(410).json({ error: 'Interview already completed' });
  if (tr.status === 'pending') { tr.status = 'in_progress'; tr.started_at = new Date().toISOString(); saveStore(store); }

  const agent = (store.agents || []).find(a => a.id === tr.agent_id && !a.deleted_at);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const personaName = agent.persona_name || agent.name || 'Alex';
  const questions   = tr.scorecard_questions || [];
  const totalQ      = questions.length;
  const currentEx   = history.filter(h => h.role === 'user').length + 1;
  const approxQ     = totalQ > 0 ? Math.min(totalQ, Math.ceil(currentEx / Math.max(2, Math.floor(15 / totalQ)))) : 0;
  const isNearEnd   = totalQ > 0 && approxQ >= totalQ && currentEx >= totalQ * 2;

  const qBlock = questions.length > 0
    ? questions.map((q, i) => {
        let b = `${i+1}. [${q.competency || q.type || 'General'}] "${q.text}"`;
        if (q.follow_ups?.length) b += `\n   Probes: ${q.follow_ups.join(' | ')}`;
        if (q.good_answer_guidance) b += `\n   ✓ Good: ${q.good_answer_guidance}`;
        if (q.red_flags) b += `\n   ⚠ Flag: ${q.red_flags}`;
        return b;
      }).join('\n\n')
    : 'Assess the candidate holistically for the role.';

  const system = `You are ${personaName}, a professional AI interviewer conducting a job interview.
CANDIDATE: ${tr.candidate_name}
ROLE: ${tr.job_title}${tr.job_department ? ` — ${tr.job_department}` : ''}

INTERVIEW QUESTIONS TO COVER:
${qBlock}

RULES:
- Ask ONE question at a time. Never combine multiple questions.
- This is a VOICE interview — keep replies to 2-4 sentences max.
- Cover questions naturally — don't read them verbatim.
- Use follow-up probes when answers are shallow.
- ${isNearEnd ? 'You have covered all areas. Give a warm, genuine closing and end your message with exactly: INTERVIEW_COMPLETE' : `You are approximately on question ${approxQ} of ${totalQ}. Continue covering the remaining areas.`}
- Never mention that you have a structured question list.`;

  try {
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 350, system,
      messages: [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: candidate_message }],
    });
    const reply = resp.content[0]?.text || '';
    const isComplete = reply.includes('INTERVIEW_COMPLETE');
    res.json({ reply: reply.replace('INTERVIEW_COMPLETE', '').trim(), is_complete: isComplete, exchange_count: currentEx, questions_total: totalQ });
  } catch (err) {
    console.error('AI interview chat error:', err.message);
    res.status(500).json({ error: 'AI response failed' });
  }
});

// ── POST /api/ai-interview/complete ──────────────────────────────────────────
router.post('/complete', async (req, res) => {
  const { token, transcript = [] } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const store = getStore();
  const tr = (store.agent_tokens || []).find(t => t.token === token);
  if (!tr) return res.status(404).json({ error: 'Invalid token' });
  const agent = (store.agents || []).find(a => a.id === tr.agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  tr.status = 'completed';
  tr.completed_at = new Date().toISOString();

  const personaName   = agent.persona_name || agent.name || 'Alex';
  const questions     = tr.scorecard_questions || [];
  const transcriptTxt = transcript.map(t => `${t.role === 'assistant' ? personaName : tr.candidate_name}: ${t.content}`).join('\n\n');

  let scores = {}, summary = 'AI interview completed.', recommendation = 'maybe';
  let keyStrengths = [], concerns = [];

  if (transcriptTxt.length > 100) {
    try {
      const prompt = `Analyse this job interview transcript. Return ONLY valid JSON (no markdown):\n{"scores":{${questions.map(q=>`"${q.id}":{"score_1_to_5":<1-5>,"note":"<brief>"}`).join(',')}},"summary":"<2-3 sentence overall assessment>","recommendation":"<strong_yes|yes|maybe|no|strong_no>","key_strengths":["<s1>","<s2>"],"concerns":["<c1>"]}\n\nQUESTIONS ASKED:\n${questions.map(q=>`- ${q.id}: "${q.text}"${q.good_answer_guidance?' | Good: '+q.good_answer_guidance:''}${q.red_flags?' | Flag: '+q.red_flags:''}`).join('\n')||'General assessment only'}\n\nTRANSCRIPT:\n${transcriptTxt.slice(0, 9000)}`;
      const resp   = await client.messages.create({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens:1000, messages:[{role:'user',content:prompt}] });
      const parsed = JSON.parse((resp.content[0]?.text||'{}').replace(/```json|```/g,'').trim());
      scores       = parsed.scores || {};
      summary      = parsed.summary || summary;
      recommendation = parsed.recommendation || recommendation;
      keyStrengths = parsed.key_strengths || [];
      concerns     = parsed.concerns || [];
      questions.forEach(q => {
        const idx = (store.question_bank_v2||[]).findIndex(bq=>bq.id===q.id);
        if (idx!==-1) store.question_bank_v2[idx].usage_count=(store.question_bank_v2[idx].usage_count||0)+1;
      });
    } catch (err) { console.error('Scoring error:', err.message); }
  }

  // Save note + communication to candidate record
  if (tr.candidate_id) {
    const recIdx = (store.records||[]).findIndex(r=>r.id===tr.candidate_id);
    if (recIdx !== -1) {
      if (!store.records[recIdx].notes) store.records[recIdx].notes = [];
      const scoreLines = Object.entries(scores).map(([qId,r])=>{
        const q = questions.find(q=>q.id===qId);
        return q ? `**${q.text.slice(0,70)}${q.text.length>70?'…':''}** — ${r.score_1_to_5||'?'}/5  \n${r.note||''}` : null;
      }).filter(Boolean).join('\n\n');
      store.records[recIdx].notes.push({
        id: uuidv4(),
        content: `## AI Interview — ${personaName} · ${tr.job_title}\n\n**Summary:** ${summary}\n\n**Recommendation:** ${recommendation.replace(/_/g,' ').toUpperCase()}\n\n**Strengths:** ${keyStrengths.join(' · ')||'—'}\n\n**Concerns:** ${concerns.join(' · ')||'None noted'}${scoreLines?'\n\n---\n\n'+scoreLines:''}`,
        created_at: new Date().toISOString(), created_by: personaName, is_ai: true,
      });
      if (!store.communications) store.communications = [];
      store.communications.push({
        id: uuidv4(), record_id: tr.candidate_id, object_id: store.records[recIdx].object_id,
        environment_id: tr.environment_id, type: 'ai_interview', direction: 'outbound',
        subject: `AI Interview: ${tr.job_title}`, body: transcriptTxt,
        status: 'completed', agent_name: personaName, recommendation, summary,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Log agent run
  if (!store.agent_runs) store.agent_runs = [];
  store.agent_runs.push({
    id: uuidv4(), agent_id: agent.id,
    trigger: tr.interview_id ? 'interview_scheduled' : 'manual_link',
    status: 'completed', candidate_id: tr.candidate_id, job_id: tr.job_id,
    output_summary: summary, recommendation,
    exchange_count: transcript.filter(t=>t.role==='user').length,
    created_at: tr.started_at || tr.created_at, completed_at: new Date().toISOString(),
  });

  // Update scheduled interview if linked
  if (tr.interview_id) {
    const intIdx = (store.interviews||[]).findIndex(i=>i.id===tr.interview_id);
    if (intIdx !== -1) {
      store.interviews[intIdx].status = 'completed';
      store.interviews[intIdx].ai_recommendation = recommendation;
      store.interviews[intIdx].ai_summary = summary;
    }
  }

  saveStore(store);
  res.json({ success:true, summary, recommendation, key_strengths:keyStrengths, concerns, questions_scored:Object.keys(scores).length });
});

module.exports = router;
