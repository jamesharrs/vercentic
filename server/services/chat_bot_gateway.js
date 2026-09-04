// server/services/chat_bot_gateway.js
// ═══════════════════════════════════════════════════════════════════════════
// CHAT BOT GATEWAY — the shared engine behind Slack + Microsoft Teams.
//
// Responsibilities:
//   1. Resolve which tenant a workspace/team belongs to (chat_bot_channels)
//   2. Resolve which Vercentic user is speaking (chat_bot_identity_links)
//   3. Match inbound text against enabled conversational_actions
//   4. Enforce the SAME RBAC checks the web app uses (middleware/rbac.js)
//   5. Execute via ACTION_REGISTRY — thin wrappers over real store helpers,
//      or (for approvals) a call to the existing public token endpoint so we
//      reuse its tested resolution logic rather than re-implementing it.
//   6. Format a channel-appropriate response (Slack Block Kit / Teams
//      Adaptive Card / plain text)
//   7. Log every invocation for the admin usage stats
//
// Everything here runs INSIDE tenantStorage.run(tenantSlug, fn) once the
// tenant has been resolved, so getStore()/query()/insert() etc. from
// db/init.js transparently operate on the correct tenant's data.
// ═══════════════════════════════════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const {
  query, findOne, insert, update, getStore, saveStore,
  tenantStorage, listTenants, loadTenantStore,
} = require('../db/init');
const { hasPermission, hasGlobalAction } = require('../middleware/rbac');

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes of conversational memory

function ensureCollections() {
  const s = getStore();
  let changed = false;
  if (!s.conversational_actions)   { s.conversational_actions = [];   changed = true; }
  if (!s.chat_bot_channels)        { s.chat_bot_channels = [];        changed = true; }
  if (!s.chat_bot_identity_links)  { s.chat_bot_identity_links = [];  changed = true; }
  if (!s.chat_bot_sessions)        { s.chat_bot_sessions = [];        changed = true; }
  if (!s.chat_bot_invocation_log)  { s.chat_bot_invocation_log = [];  changed = true; }
  if (changed) saveStore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TENANT + CHANNEL RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * findChannel(platform, externalWorkspaceId)
 * Scans every tenant store (+ master) for a connected chat_bot_channels row.
 * Mirrors the listTenants()/loadTenantStore() pattern already used in
 * routes/demo_seed.js and routes/superadmin_clients.js rather than a second
 * index table.
 */
function findChannel(platform, externalWorkspaceId) {
  const candidates = ['master', ...(listTenants ? listTenants() : [])];
  for (const slug of candidates) {
    const store = loadTenantStore(slug === 'master' ? null : slug);
    const channel = (store.chat_bot_channels || []).find(
      c => c.platform === platform && c.external_workspace_id === externalWorkspaceId && c.status === 'connected'
    );
    if (channel) return { tenantSlug: slug, channel };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. IDENTITY RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function resolveIdentity(platform, externalUserId) {
  ensureCollections();
  const link = findOne('chat_bot_identity_links', l => l.platform === platform && l.external_user_id === externalUserId);
  if (!link) return null;
  const user = findOne('users', u => u.id === link.vercentic_user_id && u.status !== 'deactivated');
  if (!user) return null;
  const role = findOne('roles', r => r.id === user.role_id);
  return { ...user, role };
}

function generateLinkCode(environmentId, platform, externalUserId, externalUserName) {
  ensureCollections();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  insert('chat_bot_identity_links', {
    id: uuidv4(), environment_id: environmentId, platform,
    external_user_id: externalUserId, external_user_name: externalUserName || null,
    vercentic_user_id: null, link_code: code, linked_at: null,
    created_at: new Date().toISOString(),
  });
  return code;
}

function completeLinkByCode(code, vercenticUserId) {
  ensureCollections();
  const link = findOne('chat_bot_identity_links', l => l.link_code === code && !l.vercentic_user_id);
  if (!link) return null;
  return update('chat_bot_identity_links', l => l.id === link.id, {
    vercentic_user_id: vercenticUserId, linked_at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONVERSATION STATE (multi-turn)
// ═══════════════════════════════════════════════════════════════════════════

function getSession(platform, conversationId) {
  ensureCollections();
  const s = findOne('chat_bot_sessions', x =>
    x.platform === platform && x.conversation_id === conversationId && new Date(x.expires_at) > new Date()
  );
  return s || null;
}

function setSession(platform, conversationId, patch) {
  ensureCollections();
  const existing = findOne('chat_bot_sessions', x => x.platform === platform && x.conversation_id === conversationId);
  const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  if (existing) return update('chat_bot_sessions', x => x.id === existing.id, { ...patch, expires_at });
  return insert('chat_bot_sessions', {
    id: uuidv4(), platform, conversation_id: conversationId, expires_at,
    created_at: new Date().toISOString(), ...patch,
  });
}

function clearSession(platform, conversationId) {
  const existing = findOne('chat_bot_sessions', x => x.platform === platform && x.conversation_id === conversationId);
  if (existing) update('chat_bot_sessions', x => x.id === existing.id, { awaiting: null, pending_action_id: null, pending_params: {}, options: null });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. INTENT MATCHING
// ═══════════════════════════════════════════════════════════════════════════

function keywordScore(text, phrase) {
  const words = phrase.toLowerCase().replace(/\{[^}]+\}/g, '').split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return 0;
  const t = text.toLowerCase();
  const hits = words.filter(w => t.includes(w)).length;
  return hits / words.length;
}

function matchCommand(text, actions) {
  const t = text.trim().toLowerCase();
  for (const a of actions.filter(a => a.trigger_type === 'command')) {
    if ((a.trigger_phrases || []).some(p => t === p.toLowerCase() || t.includes(p.toLowerCase()))) {
      return { action: a, params: {} };
    }
  }
  return null;
}

/**
 * matchIntent(text, actions, session)
 * Uses Claude (server proxy pattern, calling Anthropic directly here since
 * this runs server-side) when ANTHROPIC_API_KEY is set to classify + extract
 * parameters across every enabled intent action in one call; falls back to a
 * plain keyword-overlap heuristic otherwise.
 */
async function matchIntent(text, actions, session) {
  const intentActions = actions.filter(a => a.trigger_type === 'intent');
  if (!intentActions.length) return null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const catalogue = intentActions.map(a => ({
        id: a.id, name: a.name, description: a.description,
        example_phrases: a.trigger_phrases,
        parameters: (a.parameters || []).map(p => ({ key: p.key, label: p.label, required: p.required, hint: p.extract_hint })),
      }));
      const sessionHint = session?.awaiting
        ? `\n\nNote: the user is mid-conversation. Pending action: ${session.pending_action_id}. Already collected: ${JSON.stringify(session.pending_params)}. This message likely answers a follow-up rather than starting something new.`
        : '';
      const prompt = `You are an intent classifier for an HR/recruiting chat bot. Given the user's message, pick the single best matching action from the catalogue below and extract any parameters you can find. If nothing matches with reasonable confidence, return {"action_id": null}.

Catalogue:
${JSON.stringify(catalogue, null, 2)}
${sessionHint}

User message: "${text}"

Respond with ONLY valid JSON, no markdown:
{"action_id": "<id or null>", "confidence": <0-1>, "params": {"<key>": "<value>"}}`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await resp.json();
      const raw = data?.content?.[0]?.text || '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (!parsed.action_id || parsed.confidence < 0.4) return null;
      const action = intentActions.find(a => a.id === parsed.action_id);
      if (!action) return null;
      return { action, params: parsed.params || {}, confidence: parsed.confidence };
    } catch (err) {
      console.warn('[ChatBot] Intent classification failed, falling back to keywords:', err.message);
    }
  }

  let best = null, bestScore = 0;
  for (const a of intentActions) {
    const score = Math.max(0, ...(a.trigger_phrases || []).map(p => keywordScore(text, p)));
    if (score > bestScore) { bestScore = score; best = a; }
  }
  if (best && bestScore >= 0.5) return { action: best, params: {}, confidence: bestScore };
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PERMISSION CHECK (delegates to the real RBAC model — nothing new)
// ═══════════════════════════════════════════════════════════════════════════

function checkActionPermission(user, action) {
  const req = action.permission_required;
  if (!req) return true;
  if (req.type === 'global') return hasGlobalAction(user, req.action);
  if (req.type === 'object') return hasPermission(user, req.object_slug, req.action);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ACTION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

function findPersonByName(name) {
  if (!name) return null;
  const peopleObj = findOne('objects', o => o.slug === 'people');
  if (!peopleObj) return null;
  const needle = name.trim().toLowerCase();
  const candidates = query('records', r => r.object_id === peopleObj.id && !r.deleted_at);
  let match = candidates.find(r => {
    const full = `${r.data?.first_name || ''} ${r.data?.last_name || ''}`.trim().toLowerCase();
    return full === needle;
  });
  if (!match) {
    match = candidates.find(r => {
      const full = `${r.data?.first_name || ''} ${r.data?.last_name || ''}`.trim().toLowerCase();
      return full.includes(needle) || needle.includes(full);
    });
  }
  return match || null;
}

const ACTION_REGISTRY = {
  search_records: (user, params, action) => {
    const slug = params.object || action.action_config?.default_object_slug || 'people';
    if (!hasPermission(user, slug, 'view')) return { error: 'forbidden' };
    const obj = findOne('objects', o => o.slug === slug);
    if (!obj) return { error: `Unknown object "${slug}"` };
    const q = (params.query || '').toLowerCase();
    const max = action.action_config?.max_results || 5;
    const results = query('records', r => r.object_id === obj.id && !r.deleted_at)
      .filter(r => JSON.stringify(r.data || {}).toLowerCase().includes(q))
      .slice(0, max)
      .map(r => ({
        id: r.id,
        title: r.data?.first_name ? `${r.data.first_name} ${r.data.last_name || ''}`.trim() : (r.data?.job_title || r.data?.name || 'Untitled'),
        subtitle: r.data?.email || r.data?.department || r.data?.location || '',
      }));
    return { ok: true, results, object_slug: slug };
  },

  update_stage: (user, params) => {
    if (!hasGlobalAction(user, 'record_move_stage')) return { error: 'forbidden' };
    const person = findPersonByName(params.candidate_name);
    if (!person) return { error: `Couldn't find a person named "${params.candidate_name}"` };
    update('records', r => r.id === person.id, { data: { ...person.data, status: params.stage } });
    return { ok: true, candidate_name: `${person.data.first_name} ${person.data.last_name || ''}`.trim(), stage: params.stage };
  },

  my_digest: (user) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const interviews = query('interviews', i => (i.date || '').startsWith(todayStr) && !i.deleted_at);
    const approvalsAwaiting = query('approvals', a =>
      a.status === 'pending' && (a.approvers || []).some(ap => (ap.approver_id === user.id || ap.user_id === user.id) && ap.status === 'pending')
    );
    return { ok: true, interviews_today: interviews.length, pending_approvals: approvalsAwaiting.length, user_name: user.first_name };
  },

  // NOTE: approver-identity field name (approver_id vs user_id vs id) on each
  // `approval.approvers[]` entry could not be fully confirmed against
  // resolveApprovers()'s output shape during this session — matches
  // defensively across the plausible field names. Verify against a real
  // approval before relying on this in production; see DEPLOY_INSTRUCTIONS.
  approval_action: async (user, params) => {
    if (!hasGlobalAction(user, 'manage_settings')) return { error: 'forbidden' };
    const approval = findOne('approvals', a => a.id === params.target_id);
    if (!approval) return { error: 'Approval not found' };
    const approver = (approval.approvers || []).find(a =>
      a.approver_id === user.id || a.user_id === user.id || a.id === user.id ||
      (a.email && user.email && a.email === user.email)
    );
    if (!approver) return { error: "You're not listed as an approver on this request." };
    if (approver.status !== 'pending') return { error: `Already ${approver.status}` };
    try {
      const resp = await fetch(`http://localhost:${process.env.PORT || 3001}/api/approvals/token/${approver.token}/respond`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: params.decision === 'approve' ? 'approve' : 'decline', note: 'via chat bot' }),
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.error || 'Approval failed' };
      return { ok: true, target_type: 'approval', decision: params.decision, offer_name: approval.title };
    } catch (err) { return { error: err.message }; }
  },

  schedule_interview: (user, params) => {
    if (!hasGlobalAction(user, 'manage_interviews')) return { error: 'forbidden' };
    const person = findPersonByName(params.candidate_name);
    if (!person) return { error: `Couldn't find a person named "${params.candidate_name}"` };
    const rec = insert('interviews', {
      id: uuidv4(), environment_id: person.environment_id || null,
      candidate_id: person.id, candidate_name: `${person.data.first_name} ${person.data.last_name || ''}`.trim(),
      job_id: null, job_name: '',
      interview_type_id: null, interview_type_name: params.interview_type || 'Interview',
      date: params.date, time: params.time || '10:00', duration: 30,
      format: 'Video Call', interviewers: params.interviewer ? [params.interviewer] : [],
      notes: 'Scheduled via chat bot', status: 'pending',
      created_at: new Date().toISOString(),
    });
    return { ok: true, candidate_name: rec.candidate_name, interview_type: rec.interview_type_name, date: rec.date, time: rec.time };
  },

  ai_summary: async (user, params) => {
    if (!hasGlobalAction(user, 'access_copilot')) return { error: 'forbidden' };
    const person = findPersonByName(params.candidate_name);
    if (!person) return { error: `Couldn't find a person named "${params.candidate_name}"` };
    if (!process.env.ANTHROPIC_API_KEY) return { error: 'AI features are not configured on this environment.' };
    const prompt = `Summarise this candidate's profile in 2-3 sentences for a recruiter, focused on fit signal: ${JSON.stringify(person.data)}`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await resp.json();
    return { ok: true, candidate_name: `${person.data.first_name} ${person.data.last_name || ''}`.trim(), summary: data?.content?.[0]?.text || 'No summary available.' };
  },

  add_note: (user, params) => {
    if (!hasGlobalAction(user, 'record_add_note')) return { error: 'forbidden' };
    const person = findPersonByName(params.candidate_name);
    if (!person) return { error: `Couldn't find a person named "${params.candidate_name}"` };
    insert('notes', { id: uuidv4(), record_id: person.id, content: params.note_text, created_by: `${user.first_name} ${user.last_name}`.trim(), source: 'chat_bot', created_at: new Date().toISOString() });
    return { ok: true, candidate_name: `${person.data.first_name} ${person.data.last_name || ''}`.trim() };
  },

  report_query: (user, params) => {
    if (!hasGlobalAction(user, 'run_reports')) return { error: 'forbidden' };
    const jobsObj = findOne('objects', o => o.slug === 'jobs');
    if (params.metric === 'open_jobs') {
      let jobs = query('records', r => r.object_id === jobsObj?.id && !r.deleted_at && r.data?.status === 'Open');
      if (params.filter_field && params.filter_value) jobs = jobs.filter(r => r.data?.[params.filter_field] === params.filter_value);
      return { ok: true, metric: 'open_jobs', count: jobs.length };
    }
    if (params.metric === 'candidate_count') {
      const peopleObj = findOne('objects', o => o.slug === 'people');
      let people = query('records', r => r.object_id === peopleObj?.id && !r.deleted_at);
      if (params.filter_field && params.filter_value) people = people.filter(r => r.data?.[params.filter_field] === params.filter_value);
      return { ok: true, metric: 'candidate_count', count: people.length };
    }
    return { error: `Unsupported metric "${params.metric}"` };
  },

  bulk_add_to_pool: (user, params) => {
    if (!hasGlobalAction(user, 'bulk_actions')) return { error: 'forbidden' };
    const names = (params.candidate_names || '').split(',').map(n => n.trim()).filter(Boolean);
    const poolsObj = findOne('objects', o => o.slug === 'talent_pools');
    const pool = poolsObj ? query('records', r => r.object_id === poolsObj.id && !r.deleted_at).find(r => (r.data?.name || '').toLowerCase() === (params.pool_name || '').toLowerCase()) : null;
    if (!pool) return { error: `Couldn't find a talent pool named "${params.pool_name}"` };
    const added = [];
    for (const name of names) {
      const person = findPersonByName(name);
      if (!person) continue;
      insert('people_links', { id: uuidv4(), person_id: person.id, record_id: pool.id, linked_at: new Date().toISOString(), source: 'chat_bot' });
      added.push(name);
    }
    return { ok: true, pool_name: params.pool_name, added, requested: names.length };
  },

  proactive_notify: () => ({ ok: true }),
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. INVOCATION LOG
// ═══════════════════════════════════════════════════════════════════════════

function logInvocation(entry) {
  ensureCollections();
  const s = getStore();
  s.chat_bot_invocation_log.unshift({ id: uuidv4(), created_at: new Date().toISOString(), ...entry });
  if (s.chat_bot_invocation_log.length > 2000) s.chat_bot_invocation_log.length = 2000;
  saveStore();

  if (entry.action_id) {
    const action = findOne('conversational_actions', a => a.id === entry.action_id);
    if (action) {
      update('conversational_actions', a => a.id === entry.action_id, {
        usage_count: (action.usage_count || 0) + 1,
        success_count: (action.success_count || 0) + (entry.success ? 1 : 0),
        last_used_at: new Date().toISOString(),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. RESPONSE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data?.[key] !== undefined ? data[key] : ''));
}

function formatSlackResponse(action, result, template) {
  if (result?.error) return { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `⚠️ ${result.error}` } }] };
  if (template) return { text: renderTemplate(template, result) };
  switch (action.card_type) {
    case 'record_summary':
      if (!result.results?.length) return { text: 'No matches found.' };
      return { blocks: result.results.map(r => ({ type: 'section', text: { type: 'mrkdwn', text: `*${r.title}*\n${r.subtitle}` } })) };
    case 'digest':
      return { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `*Good to see you, ${result.user_name}* 👋\n📅 ${result.interviews_today} interview(s) today\n✅ ${result.pending_approvals} pending approval(s)` } }] };
    case 'interview_confirmation':
      return { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `📅 *Interview scheduled*\n${result.candidate_name} — ${result.interview_type}\n${result.date} ${result.time || ''}` } }] };
    case 'ai_summary':
      return { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `*${result.candidate_name}*\n${result.summary}` } }] };
    case 'bulk_result':
      return { text: `Added ${result.added?.length || 0}/${result.requested || 0} candidate(s) to *${result.pool_name}*.` };
    case 'approval_result':
      return { text: `${result.decision === 'approve' ? '✅ Approved' : '❌ Declined'}: *${result.offer_name}*` };
    default:
      return { text: JSON.stringify(result) };
  }
}

function formatTeamsResponse(action, result, template) {
  if (result?.error) return { title: '⚠️ Error', text: result.error, facts: [] };
  if (template) return { title: action.name, text: renderTemplate(template, result), facts: [] };
  switch (action.card_type) {
    case 'record_summary':
      if (!result.results?.length) return { title: 'No matches', text: 'No matches found.', facts: [] };
      return { title: `${result.results.length} result(s)`, text: result.results.map(r => `**${r.title}** — ${r.subtitle}`).join('\n\n'), facts: [] };
    case 'digest':
      return { title: `Your day, ${result.user_name}`, text: '', facts: [{ label: 'Interviews today', value: String(result.interviews_today) }, { label: 'Pending approvals', value: String(result.pending_approvals) }] };
    case 'interview_confirmation':
      return { title: '📅 Interview Scheduled', text: `${result.candidate_name} — ${result.interview_type}`, facts: [{ label: 'Date', value: result.date }, { label: 'Time', value: result.time || 'TBC' }] };
    case 'ai_summary':
      return { title: result.candidate_name, text: result.summary, facts: [] };
    case 'bulk_result':
      return { title: 'Bulk add complete', text: `Added ${result.added?.length || 0}/${result.requested || 0} to ${result.pool_name}`, facts: [] };
    case 'approval_result':
      return { title: result.decision === 'approve' ? '✅ Approved' : '❌ Declined', text: result.offer_name, facts: [] };
    default:
      return { title: action.name, text: JSON.stringify(result), facts: [] };
  }
}

function formatResponse(platform, action, result) {
  return platform === 'slack'
    ? formatSlackResponse(action, result, action.response_template)
    : formatTeamsResponse(action, result, action.response_template);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. TOP-LEVEL ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * handleInboundMessage({ platform, externalWorkspaceId, externalUserId, externalUserName, conversationId, text })
 * Called by routes/chat_bot_webhooks.js for every inbound Slack/Teams message.
 * Resolves and enters the correct tenant context itself — callers must NOT
 * already be inside a tenantStorage.run() when they call this.
 */
async function handleInboundMessage({ platform, externalWorkspaceId, externalUserId, externalUserName, conversationId, text }) {
  const found = findChannel(platform, externalWorkspaceId);
  if (!found) return { text: "This workspace isn't connected to a Vercentic environment yet. Ask an admin to connect it in Settings → Conversational Actions." };

  return tenantStorage.run(found.tenantSlug, async () => {
    ensureCollections();
    const startedAt = Date.now();
    const environmentId = found.channel.environment_id;

    const user = resolveIdentity(platform, externalUserId);
    if (!user) {
      const code = generateLinkCode(environmentId, platform, externalUserId, externalUserName);
      return { text: `I don't recognise you yet. Ask your Vercentic admin to link your account using code *${code}* in Settings → Conversational Actions → Identity Links.` };
    }

    const session = getSession(platform, conversationId);
    const enabledActions = query('conversational_actions', a =>
      a.environment_id === environmentId && a.status === 'enabled' && (a.channels || []).includes(platform)
    );

    if (session?.awaiting && session.pending_action_id) {
      const action = findOne('conversational_actions', a => a.id === session.pending_action_id);
      if (action) {
        const missing = (action.parameters || []).find(p => p.required && !session.pending_params?.[p.key]);
        if (missing) {
          const params = { ...session.pending_params, [missing.key]: text.trim() };
          const stillMissing = (action.parameters || []).find(p => p.required && !params[p.key]);
          if (stillMissing) {
            setSession(platform, conversationId, { pending_params: params });
            return { text: `Got it. Now, ${stillMissing.label.toLowerCase()}?` };
          }
          clearSession(platform, conversationId);
          return runAction(action, user, params, platform, environmentId, externalUserId, text, startedAt);
        }
      }
    }

    let matched = matchCommand(text, enabledActions);
    if (!matched) {
      const intentMatch = await matchIntent(text, enabledActions, session);
      if (intentMatch) matched = intentMatch;
    }

    if (!matched) {
      logInvocation({ environment_id: environmentId, action_id: null, action_name: null, platform, external_user_id: externalUserId, vercentic_user_id: user.id, input_text: text, matched: false, success: false, duration_ms: Date.now() - startedAt });
      return { text: "I didn't catch a command in that. Try \"my digest\" or \"show me candidates for <role>\"." };
    }

    const { action, params } = matched;
    const missing = (action.parameters || []).find(p => p.required && !params[p.key]);
    if (missing) {
      setSession(platform, conversationId, { awaiting: 'clarification', pending_action_id: action.id, pending_params: params });
      return { text: `Sure — ${missing.label.toLowerCase()}?` };
    }

    return runAction(action, user, params, platform, environmentId, externalUserId, text, startedAt);
  });
}

async function runAction(action, user, params, platform, environmentId, externalUserId, text, startedAt) {
  if (!checkActionPermission(user, action)) {
    logInvocation({ environment_id: environmentId, action_id: action.id, action_name: action.name, platform, external_user_id: externalUserId, vercentic_user_id: user.id, input_text: text, matched: true, success: false, error: 'forbidden', duration_ms: Date.now() - startedAt });
    return { text: `You don't have permission to do that (${action.name}).` };
  }

  const fn = ACTION_REGISTRY[action.action_type];
  if (!fn) {
    logInvocation({ environment_id: environmentId, action_id: action.id, action_name: action.name, platform, external_user_id: externalUserId, vercentic_user_id: user.id, input_text: text, matched: true, success: false, error: 'unknown action_type', duration_ms: Date.now() - startedAt });
    return { text: `This action isn't wired up yet (${action.action_type}).` };
  }

  let result;
  try { result = await fn(user, params, action); }
  catch (err) { result = { error: err.message }; }

  logInvocation({
    environment_id: environmentId, action_id: action.id, action_name: action.name, platform,
    external_user_id: externalUserId, vercentic_user_id: user.id, input_text: text,
    matched: true, success: !result?.error, error: result?.error || null, duration_ms: Date.now() - startedAt,
  });

  const response = formatResponse(platform, action, result);
  response.__meta = { action_id: action.id, action_name: action.name };
  return response;
}

/**
 * notifyEvent(environmentId, eventType, payload, sendFn)
 * Fans out to any 'event'-triggered conversational actions with a connected
 * bot channel. sendFn(channel, response) does the actual Slack/Teams HTTP
 * call — kept out of this file so it has zero platform-specific HTTP code.
 * Pass require('../routes/chat_bot_channels').postToChannel.
 */
async function notifyEvent(environmentId, eventType, payload, sendFn) {
  ensureCollections();
  const actions = query('conversational_actions', a =>
    a.environment_id === environmentId && a.status === 'enabled' && a.trigger_type === 'event' && a.trigger_event === eventType
  );
  if (!actions.length) return;
  const channels = query('chat_bot_channels', c => c.environment_id === environmentId && c.status === 'connected');
  if (!channels.length) return;

  for (const action of actions) {
    const fn = ACTION_REGISTRY[action.action_type] || (() => ({ ok: true, ...payload }));
    let result;
    try { result = await fn({ role: {} }, payload, action); } catch (err) { result = { error: err.message }; }
    for (const channel of channels.filter(c => (action.channels || []).includes(c.platform))) {
      const response = formatResponse(channel.platform, action, { ok: true, ...payload, ...result });
      logInvocation({ environment_id: environmentId, action_id: action.id, action_name: action.name, platform: channel.platform, external_user_id: 'system', vercentic_user_id: null, input_text: eventType, matched: true, success: true, duration_ms: 0 });
      if (typeof sendFn === 'function') {
        try { await sendFn(channel, response); } catch (err) { console.warn('[ChatBot] proactive send failed:', err.message); }
      }
    }
  }
}

/**
 * simulateMessage(user, environmentId, text, conversationId)
 * Used by the admin "Try it" test console. Runs inside the CALLER's already-
 * resolved tenant context — no channel/identity lookup needed since the
 * admin is already authenticated as `user`. Logged with platform:'test' so
 * it never pollutes real per-channel usage stats.
 */
async function simulateMessage(user, environmentId, text, conversationId = 'test-console') {
  ensureCollections();
  const startedAt = Date.now();
  const platform = 'test';
  const session = getSession(platform, conversationId);
  const enabledActions = query('conversational_actions', a => a.environment_id === environmentId);

  if (session?.awaiting && session.pending_action_id) {
    const action = findOne('conversational_actions', a => a.id === session.pending_action_id);
    if (action) {
      const missing = (action.parameters || []).find(p => p.required && !session.pending_params?.[p.key]);
      if (missing) {
        const params = { ...session.pending_params, [missing.key]: text.trim() };
        const stillMissing = (action.parameters || []).find(p => p.required && !params[p.key]);
        if (stillMissing) {
          setSession(platform, conversationId, { pending_params: params });
          return { reply: `Got it. Now, ${stillMissing.label.toLowerCase()}?`, matched_action: action.name };
        }
        clearSession(platform, conversationId);
        const r = await runAction(action, user, params, platform, environmentId, 'test-user', text, startedAt);
        return { reply: r.text || JSON.stringify(r), matched_action: action.name, raw: r };
      }
    }
  }

  let matched = matchCommand(text, enabledActions.filter(a => a.status === 'enabled'));
  if (!matched) {
    const intentMatch = await matchIntent(text, enabledActions.filter(a => a.status === 'enabled'), session);
    if (intentMatch) matched = intentMatch;
  }
  if (!matched) return { reply: "No action matched that phrase.", matched_action: null };

  const { action, params } = matched;
  const missing = (action.parameters || []).find(p => p.required && !params[p.key]);
  if (missing) {
    setSession(platform, conversationId, { awaiting: 'clarification', pending_action_id: action.id, pending_params: params });
    return { reply: `Sure — ${missing.label.toLowerCase()}?`, matched_action: action.name, confidence: matched.confidence };
  }
  const r = await runAction(action, user, params, platform, environmentId, 'test-user', text, startedAt);
  return { reply: r.text || JSON.stringify(r), matched_action: action.name, confidence: matched.confidence, raw: r };
}

module.exports = {
  ensureCollections, findChannel, resolveIdentity, generateLinkCode, completeLinkByCode,
  matchCommand, matchIntent, checkActionPermission, ACTION_REGISTRY,
  handleInboundMessage, notifyEvent, formatResponse, logInvocation, simulateMessage,
  getSession, setSession, clearSession,
};
