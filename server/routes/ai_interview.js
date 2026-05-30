/**
 * Vercentic — AI Interview Session Route
 * server/routes/ai_interview.js
 */
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, tenantStorage, getCurrentTenant, listTenants, storeCache, loadTenantStore } = require('../db/init');
const pg = require('../db/postgres');
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Token → tenant resolution ─────────────────────────────────────────────────
// Candidates open interview links with no session, so the tenant middleware
// cannot resolve their store from a cookie. We scan all loaded tenant stores
// (and the master store) to find the token, then run subsequent operations
// inside tenantStorage.run(slug) so getStore() returns the right data.
function findInterviewToken(tokenValue) {
  // 0. Check master store index (fast, works on Railway with PG)
  const masterStore = tenantStorage.run('master', () => getStore());
  const indexed = (masterStore.interview_token_index || []).find(t => t.token === tokenValue);
  if (indexed) {
    // Load the actual token record from the correct tenant
    const tenantStore = tenantStorage.run(indexed.tenant_slug, () => getStore());
    const tr = (tenantStore.agent_tokens || []).find(t => t.token === tokenValue);
    if (tr) return { tr, tenantSlug: indexed.tenant_slug };
  }

  // 1. Try current context (works for authenticated/tenant-aware requests)
  const cur = getCurrentTenant();
  const curStore = getStore();
  const trCur = (curStore?.agent_tokens || []).find(t => t.token === tokenValue);
  if (trCur) return { tr: trCur, tenantSlug: cur };

  // 2. Search every tenant store already in the in-memory cache
  for (const [slug, store] of Object.entries(storeCache || {})) {
    if (slug === cur) continue;
    const found = (store.agent_tokens || []).find(t => t.token === tokenValue);
    if (found) return { tr: found, tenantSlug: slug };
  }

  // 3. Try any known tenants not yet cached (listTenants returns persisted slugs)
  const known = listTenants ? listTenants() : [];
  for (const slug of known) {
    if (storeCache[slug]) continue; // already searched above
    // Load lazily — tenantStorage.run ensures getStore() returns this tenant
    const found = tenantStorage.run(slug, () => {
      const s = getStore();
      return (s.agent_tokens || []).find(t => t.token === tokenValue) || null;
    });
    if (found) return { tr: found, tenantSlug: slug };
  }

  return { tr: null, tenantSlug: null };
}

// ── GET /api/ai-interview/session/:token ──────────────────────────────────────
router.get('/session/:token', async (req, res) => {
  const { tr, tenantSlug } = findInterviewToken(req.params.token);
  if (!tr) return res.status(404).json({ error: 'Invalid or expired link' });
  if (tr.status === 'completed') return res.status(410).json({ error: 'This interview has already been completed' });
  if (new Date(tr.expires_at) < new Date()) return res.status(410).json({ error: 'This interview link has expired' });

  // Load tenant store — try memory first, then PG directly if not found
  let agent = null;
  let store = null;

  const tryFindAgent = (s) => (s?.agents || []).find(a => a.id === tr.agent_id && !a.deleted_at);

  // 1. Try tenant store from memory
  store = tenantSlug ? tenantStorage.run(tenantSlug, () => getStore()) : getStore();
  agent = tryFindAgent(store);

  // 2. Search all other cached stores
  if (!agent) {
    for (const [, s] of Object.entries(storeCache || {})) {
      agent = tryFindAgent(s);
      if (agent) { store = s; break; }
    }
  }

  // 3. Load directly from PG — the definitive fallback on Railway
  if (!agent && tenantSlug && pg.isEnabled()) {
    try {
      const pgStore = await pg.loadTenant(tenantSlug);
      if (pgStore) {
        storeCache[tenantSlug] = { ...pgStore };
        store = storeCache[tenantSlug];
        agent = tryFindAgent(store);
      }
    } catch (e) {
      console.error('[ai-interview] PG tenant load failed:', e.message);
    }
  }

  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  await tenantStorage.run(tenantSlug, async () => {

    // Resolve brand kit — prefer agent's own kit, then env default, then plain fallback
    const envId = tr.environment_id || agent.environment_id;
    const brandKits = (store.brand_kits || []).filter(k => !k.deleted_at && k.environment_id === envId);
    const brandKit  = brandKits.find(k => k.id === agent.brand_kit_id)
                   || brandKits.find(k => k.is_default)
                   || null;
    const brand = brandKit ? {
      company_name:  brandKit.company_name  || brandKit.name || null,
      logo_url:      brandKit.logo_url      || null,
      logo_dark_url: brandKit.logo_dark_url || null,
      favicon_url:   brandKit.favicon_url   || null,
      primary_color: brandKit.primaryColor  || '#6366f1',
      bg_color:      brandKit.bgColor       || null,
      text_color:    brandKit.textColor     || null,
      font_family:   brandKit.fontFamily    || null,
      button_style:  brandKit.buttonStyle   || 'filled',
      button_radius: brandKit.buttonRadius  || '8px',
    } : null;

    res.json({
      token: tr.token,
      candidate_name: tr.candidate_name,
      job_title: tr.job_title,
      job_department: tr.job_department,
      agent: {
        persona_name: agent.persona_name || 'Alex',
        persona_description: agent.persona_description || "Hi, I'm here to learn more about you.",
        instructions: agent.description || '',
        avatar_color: agent.avatar_color || brand?.primary_color || '#6366f1',
        voice: agent.voice || 'en-US',
        language: agent.language || 'en-US',
      },
      brand,
      question_count: (tr.scorecard_questions || []).length,
      status: tr.status,
    });
  }); // end tenantStorage.run
});

// ── POST /api/ai-interview/chat ───────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { token, history = [], candidate_message } = req.body;
  if (!token || !candidate_message) return res.status(400).json({ error: 'token and candidate_message required' });
  let tr, chatTenantSlug;
  try {
    ({ tr, tenantSlug: chatTenantSlug } = findInterviewToken(token));
  } catch (findErr) {
    console.error('[ai-interview /chat] findInterviewToken threw:', findErr);
    return res.status(500).json({ error: 'Session lookup failed' });
  }
  if (!tr) return res.status(404).json({ error: 'Invalid token' });
  return tenantStorage.run(chatTenantSlug, async () => {
  const store = getStore();
  if (tr.status === 'completed') return res.status(410).json({ error: 'Interview already completed' });
  if (tr.status === 'pending') { tr.status = 'in_progress'; tr.started_at = new Date().toISOString(); saveStore(); }

  const agent = (store.agents || []).find(a => a.id === tr.agent_id && !a.deleted_at);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const personaName = agent.persona_name || 'Alex';
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
    // Build message list for Anthropic.
    // The client-side history always starts with the assistant greeting
    // (role: 'assistant'). Anthropic requires the first message to be
    // role: 'user' — sending an assistant-first list causes a 400 error.
    // Strip any leading assistant turns before appending the current user message.
    const apiMessages = history.map(h => ({ role: h.role, content: h.content }));
    while (apiMessages.length && apiMessages[0].role !== 'user') apiMessages.shift();
    apiMessages.push({ role: 'user', content: candidate_message });

    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 350, system,
      messages: apiMessages,
    });
    const reply = resp.content[0]?.text || '';
    const isComplete = reply.includes('INTERVIEW_COMPLETE');
    res.json({ reply: reply.replace('INTERVIEW_COMPLETE', '').trim(), is_complete: isComplete, exchange_count: currentEx, questions_total: totalQ });
  } catch (err) {
    console.error('[ai-interview /chat] Anthropic error — status:', err?.status, '| message:', err?.message);
    if (err?.error) console.error('[ai-interview /chat] Anthropic error body:', JSON.stringify(err.error));
    res.status(500).json({ error: 'AI response failed', detail: err?.message });
  }
  }); // end tenantStorage.run
});

// ── POST /api/ai-interview/complete ──────────────────────────────────────────
router.post('/complete', async (req, res) => {
  const { token, transcript = [] } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const { tr, tenantSlug: completeTenantSlug } = findInterviewToken(token);
  if (!tr) return res.status(404).json({ error: 'Invalid token' });
  return tenantStorage.run(completeTenantSlug, async () => {
  const store = getStore();
  const agent = (store.agents || []).find(a => a.id === tr.agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  tr.status = 'completed';
  tr.completed_at = new Date().toISOString();

  const personaName   = agent.persona_name || 'Alex';
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

  saveStore();
  res.json({ success:true, summary, recommendation, key_strengths:keyStrengths, concerns, questions_scored:Object.keys(scores).length });
  }); // end tenantStorage.run
});

// ── POST /api/ai-interview/tokens — create an interview link ─────────────────
router.post('/tokens', (req, res) => {
  const { agent_id, environment_id, candidate_name, candidate_email, job_title, job_department, job_id, scorecard_questions, expires_hours = 24 } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
  const store = getStore();
  const agent = (store.agents || []).find(a => a.id === agent_id && !a.deleted_at);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  // Resolve environment: explicit > agent's own > fallback
  const resolvedEnvId = environment_id || agent.environment_id || null;
  const token = uuidv4();
  const expires_at = new Date(Date.now() + expires_hours * 3600 * 1000).toISOString();
  const record = { id: uuidv4(), token, agent_id, environment_id: resolvedEnvId, candidate_name: candidate_name || 'Candidate', candidate_email: candidate_email || null, job_title: job_title || null, job_department: job_department || null, job_id: job_id || null, scorecard_questions: scorecard_questions || [], status: 'pending', started_at: null, completed_at: null, expires_at, created_at: new Date().toISOString() };
  if (!store.agent_tokens) store.agent_tokens = [];
  store.agent_tokens.push(record);
  saveStore();
  res.json({ ...record, interview_url: `/interview/${token}` });
});

// ── POST /api/ai-interview/agents — create a voice interview agent ────────────
router.post('/agents', (req, res) => {
  const { name, persona_name, persona_description, avatar_color, language } = req.body;
  const store = getStore();
  const agent = { id: uuidv4(), name: name || 'AI Interviewer', persona_name: persona_name || 'Alex', persona_description: persona_description || '', avatar_color: avatar_color || '#6366f1', language: language || 'en-US', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!store.agents) store.agents = [];
  store.agents.push(agent);
  saveStore();
  res.json(agent);
});

// ── GET /api/ai-interview/agents — list agents ────────────────────────────────
router.get('/agents', (req, res) => {
  const store = getStore();
  res.json((store.agents || []).filter(a => !a.deleted_at));
});

// ── PATCH /api/ai-interview/agents/:id — update agent ────────────────────────
router.patch('/agents/:id', (req, res) => {
  const store = getStore();
  const idx = (store.agents || []).findIndex(a => a.id === req.params.id && !a.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
  const allowed = ['name','persona_name','persona_description','avatar_color','language','environment_id','brand_kit_id'];
  allowed.forEach(k => { if (req.body[k] !== undefined) store.agents[idx][k] = req.body[k]; });
  store.agents[idx].updated_at = new Date().toISOString();
  saveStore();
  res.json(store.agents[idx]);
});

// ── POST /api/ai-interview/tts ─────────────────────────────────────────────
// Proxy ElevenLabs TTS so the API key stays server-side.
// Voice ID: "Rachel" — warm, natural, professional female voice (free tier).
const ELEVEN_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Rachel
router.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'TTS not configured' });
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2', // lowest latency, very natural
          voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true },
        }),
      }
    );
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    // Stream directly to client
    const { Readable } = require('stream');
    Readable.fromWeb(response.body).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
