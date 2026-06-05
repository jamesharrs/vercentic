#!/usr/bin/env node
/**
 * ai-interview-live-test.js
 * Focused end-to-end test for the ai_interview action against Railway.
 *
 * Usage:
 *   TEST_API_URL=https://talentos-production-4045.up.railway.app \
 *     node server/tests/ai-interview-live-test.js
 *
 * Optional env vars:
 *   TEST_ADMIN_EMAIL    (default: admin@talentos.io)
 *   TEST_ADMIN_PASSWORD (default: Admin1234!)
 *   TEST_API_URL        (default: https://talentos-production-4045.up.railway.app)
 *   INTERVIEW_APP_URL   (default: https://app.vercentic.com)
 */
'use strict';

const BASE_URL        = process.env.TEST_API_URL     || 'https://talentos-production-4045.up.railway.app';
const ADMIN_EMAIL     = process.env.TEST_ADMIN_EMAIL    || 'admin@talentos.io';
const ADMIN_PASSWORD  = process.env.TEST_ADMIN_PASSWORD || 'Admin1234!';
const INTERVIEW_APP   = process.env.INTERVIEW_APP_URL   || 'https://app.vercentic.com';

const POLL_INTERVAL   = 2000;
const AGENT_TIMEOUT   = 60000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Minimal HTTP client (cookie jar + CSRF) ──────────────────────────────────
class Client {
  constructor(base) {
    this.base = base;
    this._jar = {};
    this._csrf = '';
  }
  _cookieHeader() {
    return Object.entries(this._jar).map(([k,v]) => `${k}=${v}`).join('; ');
  }
  _absorbCookies(res) {
    let cookies = [];
    try { cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []; } catch(_) {}
    if (!cookies.length) { const r = res.headers.get('set-cookie'); if (r) cookies = [r]; }
    for (const c of cookies) {
      const [nv] = c.split(';');
      const eq = nv.indexOf('=');
      if (eq > 0) this._jar[nv.slice(0, eq).trim()] = nv.slice(eq+1).trim();
    }
    if (this._jar.vercentic_csrf) this._csrf = this._jar.vercentic_csrf;
  }
  async _req(method, path, body) {
    const mut = /^(POST|PATCH|PUT|DELETE)$/.test(method);
    const headers = { 'Content-Type': 'application/json' };
    const cookie = this._cookieHeader();
    if (cookie)            headers['Cookie']       = cookie;
    if (mut && this._csrf) headers['X-CSRF-Token'] = this._csrf;
    const opts = { method, headers };
    if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    this._absorbCookies(res);
    let rb = null;
    try { const t = await res.text(); rb = t ? JSON.parse(t) : null; } catch(_) {}
    return { status: res.status, body: rb };
  }
  get(p)         { return this._req('GET', p); }
  post(p, b)     { return this._req('POST', p, b); }
  put(p, b)      { return this._req('PUT', p, b); }
  delete(p)      { return this._req('DELETE', p); }
}

// ─── Poll until run finishes ──────────────────────────────────────────────────
async function waitForRun(client, agentId, runId, maxMs = AGENT_TIMEOUT) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await client.get(`/api/agents/${agentId}/runs`);
    if (res.status === 200) {
      const run = (res.body || []).find(r => r.id === runId);
      if (run && run.status !== 'running') return run;
    }
    await sleep(POLL_INTERVAL);
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(' AI INTERVIEW — FOCUSED LIVE TEST');
  console.log(`  Target : ${BASE_URL}`);
  console.log(`  App    : ${INTERVIEW_APP}`);
  console.log('══════════════════════════════════════════════════════════\n');

  if (typeof fetch === 'undefined') {
    console.error('❌ Node 18+ required (fetch API missing)');
    process.exit(1);
  }

  const client = new Client(BASE_URL);
  let ENV_ID, PERSON_OBJ_ID;
  let questionIds = [];
  let personId, agentId;

  // ── Step 1: Health check ────────────────────────────────────────────────────
  console.log('1️⃣  Health check…');
  {
    const r = await client.get('/api/health');
    if (r.status !== 200) { console.error(`❌ Health check failed: ${r.status}`); process.exit(1); }
    console.log(`   ✅ Server healthy\n`);
  }

  // ── Step 2: Authenticate ────────────────────────────────────────────────────
  console.log('2️⃣  Authenticating…');
  {
    const r = await client.post('/api/users/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (r.status !== 200) { console.error(`❌ Login failed: ${r.status} ${JSON.stringify(r.body)}`); process.exit(1); }
    if (!client._csrf) { console.error('❌ No CSRF token in login response'); process.exit(1); }
    console.log(`   ✅ Authenticated (CSRF: ${client._csrf.slice(0,8)}…)\n`);
  }

  // ── Step 3: Resolve environment + person object ─────────────────────────────
  console.log('3️⃣  Resolving environment & objects…');
  {
    const envRes = await client.get('/api/environments');
    if (envRes.status !== 200 || !Array.isArray(envRes.body)) {
      console.error(`❌ /api/environments → ${envRes.status}: ${JSON.stringify(envRes.body)}`);
      process.exit(1);
    }
    const env = envRes.body.find(e => e.is_default) || envRes.body[0];
    if (!env) { console.error('❌ No environment found'); process.exit(1); }
    ENV_ID = env.id;

    const objRes = await client.get(`/api/objects?environment_id=${ENV_ID}`);
    if (objRes.status !== 200 || !Array.isArray(objRes.body)) {
      console.error(`❌ /api/objects → ${objRes.status}`); process.exit(1);
    }
    const personObj = objRes.body.find(o => o.slug === 'people' || o.name === 'Person');
    if (!personObj) { console.error('❌ Person object not found'); process.exit(1); }
    PERSON_OBJ_ID = personObj.id;
    console.log(`   ENV_ID       : ${ENV_ID}`);
    console.log(`   PERSON_OBJ   : ${PERSON_OBJ_ID}\n`);
  }

  // ── Step 4: Fetch (or create) interview questions ────────────────────────────
  console.log('4️⃣  Fetching interview questions from bank…');
  {
    const qRes = await client.get('/api/question-bank/questions');
    if (qRes.status === 200 && Array.isArray(qRes.body) && qRes.body.length >= 3) {
      questionIds = qRes.body.slice(0, 5).map(q => q.id);
      console.log(`   ✅ Found ${qRes.body.length} questions in bank. Using first ${questionIds.length}:`);
      qRes.body.slice(0, 5).forEach((q, i) => console.log(`      ${i+1}. [${q.type||'general'}] ${q.text}`));
    } else {
      // Bank is empty — seed with 5 interview questions
      console.log('   ⚠️  Bank has < 3 questions. Seeding 5 sample questions…');
      const sampleQs = [
        { text: 'Tell me about yourself and your background.',
          type: 'Opening', competency: 'Self-awareness', weight: 1 },
        { text: 'What are your greatest professional strengths?',
          type: 'Behavioural', competency: 'Self-awareness', weight: 2 },
        { text: 'Why are you interested in this role and our company?',
          type: 'Motivational', competency: 'Motivation', weight: 2 },
        { text: 'Describe a challenge you faced at work and how you handled it.',
          type: 'Behavioural', competency: 'Problem solving', weight: 3,
          follow_ups: ['What was the outcome?', 'What would you do differently?'],
          good_answer_guidance: 'Clear STAR structure, takes ownership',
          red_flags: 'Blames others, vague on their own role' },
        { text: 'Where do you see yourself in the next 2–3 years?',
          type: 'Motivational', competency: 'Ambition', weight: 2 },
      ];
      for (const q of sampleQs) {
        const r = await client.post('/api/question-bank/questions', q);
        if (r.status === 200 || r.status === 201) {
          questionIds.push(r.body.id);
          console.log(`   ✅ Created: "${q.text.slice(0,50)}…"`);
        } else {
          console.error(`   ❌ Failed to create question: ${r.status} ${JSON.stringify(r.body)}`);
        }
      }
    }
    if (questionIds.length === 0) { console.error('❌ No question IDs available — aborting'); process.exit(1); }
    console.log(`\n   Question IDs to use: [${questionIds.join(', ')}]\n`);
  }

  // ── Step 5: Create a test person record ──────────────────────────────────────
  console.log('5️⃣  Creating test candidate record…');
  {
    const r = await client.post('/api/records', {
      object_id:      PERSON_OBJ_ID,
      environment_id: ENV_ID,
      data: {
        first_name:  'InterviewTest',
        last_name:   'Candidate',
        email:       `interview-test+${Date.now()}@vercentic.com`,
        person_type: 'Candidate',
        _test_suite: true,
      },
    });
    if (r.status !== 201) {
      console.error(`❌ Create person failed: ${r.status} ${JSON.stringify(r.body)}`);
      process.exit(1);
    }
    personId = r.body.id;
    console.log(`   ✅ Test candidate ID: ${personId}\n`);
  }

  // ── Step 6: Create agent with ai_interview action ────────────────────────────
  console.log('6️⃣  Creating ai_interview agent…');
  {
    const r = await client.post('/api/agents', {
      name:           'Live Interview Test Agent',
      description:    'Auto-created by ai-interview-live-test.js',
      environment_id: ENV_ID,
      trigger_type:   'manual',
      is_active:      true,
      persona_name:   'Alex',
      actions: [{
        type:                'ai_interview',
        question_source:     'manual',
        question_ids:        questionIds,
        persona_name:        'Alex',
        persona_description: "Hi! I'm Alex, and I'll be conducting your interview today. This is a conversational AI interview — just speak naturally. Ready to get started?",
        avatar_color:        '#6366f1',
        voice:               'en-US',
      }],
      conditions: [],
    });
    if (r.status !== 201) {
      console.error(`❌ Create agent failed: ${r.status} ${JSON.stringify(r.body)}`);
      process.exit(1);
    }
    agentId = r.body.id;
    console.log(`   ✅ Agent created: ${agentId}\n`);
  }

  // ── Step 7: Run the agent ────────────────────────────────────────────────────
  console.log('7️⃣  Running agent…');
  let runId;
  {
    const r = await client.post(`/api/agents/${agentId}/run`, {
      record_id:      personId,
      environment_id: ENV_ID,
    });
    if (r.status !== 200) {
      console.error(`❌ Agent run failed: ${r.status} ${JSON.stringify(r.body)}`);
      process.exit(1);
    }
    runId = r.body.run_id;
    console.log(`   ✅ Run started: ${runId}\n`);
  }

  // ── Step 8: Poll until run completes ─────────────────────────────────────────
  console.log(`8️⃣  Polling for run completion (up to ${AGENT_TIMEOUT/1000}s)…`);
  const run = await waitForRun(client, agentId, runId);
  if (!run) {
    console.error('❌ Run timed out — still in "running" state after timeout');
    process.exit(1);
  }
  console.log(`   ✅ Run finished with status: ${run.status}`);
  console.log(`   Steps:`);
  (run.steps || []).forEach((s, i) => console.log(`      ${i+1}. ${s.step || s}`));
  console.log();

  if (run.status === 'failed') {
    console.error('❌ Agent run ended in FAILED status');
    console.error('   Output summary:', run.output_summary || '(none)');
    process.exit(1);
  }

  // ── Step 9: Extract interview token from step output ─────────────────────────
  console.log('9️⃣  Extracting interview token…');
  let interviewToken = null;
  for (const step of (run.steps || [])) {
    const stepText = typeof step === 'string' ? step : (step.step || '');
    // Step output: "✓ AI Interview link generated — N questions from …. Link: /interview/TOKEN"
    const match = stepText.match(/\/interview\/([a-f0-9]{40,})/);
    if (match) { interviewToken = match[1]; break; }
  }

  // Also try run.ai_output or run.output_summary as fallback
  if (!interviewToken) {
    const haystack = (run.ai_output || '') + (run.output_summary || '');
    const match = haystack.match(/\/interview\/([a-f0-9]{40,})/);
    if (match) interviewToken = match[1];
  }

  if (!interviewToken) {
    console.error('❌ Could not extract interview token from run steps.');
    console.error('   Full run object:');
    console.error(JSON.stringify(run, null, 2));
    process.exit(1);
  }

  console.log(`   ✅ Token: ${interviewToken.slice(0, 16)}…\n`);

  // ── Final: Print the interview URL ───────────────────────────────────────────
  const interviewUrl = `${INTERVIEW_APP}/interview/${interviewToken}`;

  console.log('══════════════════════════════════════════════════════════');
  console.log('  ✅ AI INTERVIEW READY');
  console.log('══════════════════════════════════════════════════════════');
  console.log();
  console.log(`  Interview URL: ${interviewUrl}`);
  console.log();
  console.log(`  Token      : ${interviewToken}`);
  console.log(`  Candidate  : InterviewTest Candidate (${personId})`);
  console.log(`  Agent      : ${agentId}`);
  console.log(`  Run        : ${runId}`);
  console.log(`  Questions  : ${questionIds.length} configured`);
  console.log();
  console.log('  Open the URL on your phone to test the live interview.');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  if (!process.argv.includes('--keep')) {
    try {
      await client.delete(`/api/agents/${agentId}`);
      await client.delete(`/api/records/${personId}`);
      console.log('🧹 Cleaned up test agent and person record.\n');
    } catch (_) {}
  } else {
    console.log('📌 Keeping test data (--keep flag set).\n');
  }
}

main().catch(err => {
  console.error('\n❌ Unhandled error:', err.message || err);
  process.exit(1);
});
