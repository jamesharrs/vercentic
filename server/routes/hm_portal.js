// Hiring Manager Portal — portal-token-gated wrapper endpoints.
//
// These routes are reachable by a visitor holding a valid portal session
// token (obtained via the existing POST /api/portals/:id/session login
// flow in portals.js) WITHOUT a main-app user session. They are exempted
// from the global req.currentUser auth guard in index.js via the regex
// `^\/portals\/[^/]+\/hm\/`, so every handler here independently verifies
// the token against global._portalSessions AND checks that the session's
// portal_id matches the :id in the URL before doing anything.
//
// Because interviews.js / offers.js / scorecards.js gate their own routes
// on req.currentUser (main-app session) internally, this file does NOT
// call into those routers — it reads/writes the same underlying store
// collections (store.interviews, store.offers, store.scorecard_*) directly,
// using the exact same record shapes those files use.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');
const { MODEL_DEFAULT } = require('../config/ai_models');
const { createInterviewMeeting, fireEvent } = require('../services/connectors');
/* global setImmediate */

let _savedViewsRoute = null;
function savedViewsHelpers() {
  if (!_savedViewsRoute) _savedViewsRoute = require('./saved_views');
  return _savedViewsRoute;
}

// ── Portal-token auth ───────────────────────────────────────────────────────

function getSession(req) {
  const token = req.headers['x-portal-token'] || req.query.token;
  if (!token) return null;
  const sess = global._portalSessions && global._portalSessions[token];
  if (!sess) return null;
  if (sess.expires_at && new Date(sess.expires_at) < new Date()) return null;
  return sess;
}

/** Verifies the token AND that it belongs to the portal in the URL. Sends
 *  401/403 and returns null on failure — caller should `if (!sess) return;` */
function requireHM(req, res) {
  const sess = getSession(req);
  if (!sess) { res.status(401).json({ error: 'Invalid or expired portal session', code: 'PORTAL_UNAUTHENTICATED' }); return null; }
  if (sess.portal_id !== req.params.id) { res.status(403).json({ error: 'Session does not belong to this portal', code: 'PORTAL_FORBIDDEN' }); return null; }
  return sess;
}

// ── Hiring-manager identity resolution ──────────────────────────────────────

/** Normalizes a `people`/`lookup`/`multi_lookup` field value into an array
 *  of person-record IDs. Handles every shape seen in the codebase:
 *   - [{id,name}, ...]   (current PeoplePicker save shape)
 *   - {id,name}          (defensive single-object)
 *   - ["id1","id2"]      (raw ID array)
 *   - "id" / "Some Name" (legacy pre-migration plain string — see the
 *                          "Convert hiring_manager from text to people if
 *                          still text" migration note in db/init.js) */
function personIdsFromFieldValue(val) {
  if (val == null || val === '') return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.map(p => (p && typeof p === 'object') ? (p.id || null) : p).filter(Boolean);
}

/** True if any raw string entries in the field value look like a plain
 *  name rather than a record id (the legacy un-migrated case). */
function rawNameStringsFromFieldValue(val) {
  if (val == null || val === '') return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.filter(p => typeof p === 'string');
}

function findPersonRecordForSession(sess, environmentId) {
  if (!sess.email) return null;
  const objects = query('objects', o => o.environment_id === environmentId && o.slug === 'people' && !o.deleted_at);
  const peopleObj = objects[0];
  if (!peopleObj) return null;
  const people = query('records', r => r.object_id === peopleObj.id && r.environment_id === environmentId && !r.deleted_at);
  return people.find(p => (p.data?.email || '').toLowerCase() === sess.email.toLowerCase()) || null;
}

/** Does this Job record belong to the hiring manager in `sess`? Checks the
 *  job's `hiring_manager` field against (a) the HM's linked Person record
 *  id, (b) the portal session's own user_id (defensive, in case the field
 *  was ever set to a User id rather than a Person id), and (c) a plain
 *  full-name string match for un-migrated legacy records. */
function jobBelongsToHM(jobRec, sess, hmPersonId) {
  const hmVal = jobRec.data?.hiring_manager;
  const ids = personIdsFromFieldValue(hmVal);
  if (hmPersonId && ids.includes(hmPersonId)) return true;
  if (sess.user_id && ids.includes(sess.user_id)) return true;
  const names = rawNameStringsFromFieldValue(hmVal);
  if (names.length) {
    const full = `${sess.first_name || ''} ${sess.last_name || ''}`.trim().toLowerCase();
    if (full && names.some(n => n.trim().toLowerCase() === full)) return true;
  }
  return false;
}

function hmJobIds(environmentId, sess) {
  const hmPersonId = findPersonRecordForSession(sess, environmentId)?.id || null;
  const jobsObj = query('objects', o => o.environment_id === environmentId && o.slug === 'jobs' && !o.deleted_at)[0];
  if (!jobsObj) return { jobs: [], hmPersonId };
  const allJobs = query('records', r => r.object_id === jobsObj.id && r.environment_id === environmentId && !r.deleted_at);
  const jobs = allJobs.filter(j => jobBelongsToHM(j, sess, hmPersonId));
  return { jobs, hmPersonId, jobsObj };
}

function personDisplayName(rec) {
  const d = rec?.data || {};
  return `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.name || d.email || 'Unnamed';
}

// ── My Jobs ──────────────────────────────────────────────────────────────────

router.get('/:id/hm/my-jobs', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { jobs } = hmJobIds(environmentId, sess);
  const interviews = query('interviews', i => !i.deleted_at);
  const offers = query('offers', o => !o.deleted_at);
  // people_links target field varies by data origin — demo seed data uses
  // job_id, live-created links use target_record_id (see the /api/people-links
  // normalisation route just above the hm_portal mount in this file).
  const links = query('people_links', l => !l.deleted_at);
  const linkJobId = l => l.target_record_id || l.job_id;
  const rows = jobs
    .filter(j => (j.data?.status || '').toLowerCase() !== 'closed' || req.query.include_closed === '1')
    .map(j => {
      const pipelineCount = links.filter(l => linkJobId(l) === j.id).length;
      const upcomingInterviews = interviews.filter(i => i.job_id === j.id && new Date(i.date) >= new Date(new Date().toDateString())).length;
      const pendingOffers = offers.filter(o => o.job_id === j.id && !['accepted', 'declined', 'withdrawn', 'expired'].includes(o.status)).length;
      return {
        id: j.id,
        title: j.data?.job_title || j.data?.title || 'Untitled role',
        department: j.data?.department || '',
        location: j.data?.location || '',
        status: j.data?.status || 'Draft',
        employment_type: j.data?.employment_type || '',
        created_at: j.created_at,
        pipeline_count: pipelineCount,
        upcoming_interviews: upcomingInterviews,
        pending_offers: pendingOffers,
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ jobs: rows });
});

// ── Similar / template jobs (for the manual template picker AND the
//    internal job-creation chatbot's "reuse a past role" intelligence) ────────

router.get('/:id/hm/similar-jobs', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const q = (req.query.q || '').toLowerCase().trim();
  const jobsObj = query('objects', o => o.environment_id === environmentId && o.slug === 'jobs' && !o.deleted_at)[0];
  if (!jobsObj) return res.json({ jobs: [] });
  const allJobs = query('records', r => r.object_id === jobsObj.id && r.environment_id === environmentId && !r.deleted_at);

  const scored = allJobs.map(j => {
    const d = j.data || {};
    const hay = `${d.job_title || ''} ${d.title || ''} ${d.department || ''} ${d.description || ''} ${d.required_skills || ''} ${d.requirements || ''} ${d.skills || ''}`.toLowerCase();
    let score = 0;
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      terms.forEach(t => { if (hay.includes(t)) score += (d.job_title || d.title || '').toLowerCase().includes(t) ? 3 : 1; });
    } else {
      score = 1; // no query — just list recent roles as candidates
    }
    return { j, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.j.created_at) - new Date(a.j.created_at))
    .slice(0, 12)
    .map(({ j, score }) => ({
      id: j.id,
      title: j.data?.job_title || j.data?.title || 'Untitled role',
      department: j.data?.department || '',
      location: j.data?.location || '',
      employment_type: j.data?.employment_type || '',
      status: j.data?.status || 'Draft',
      job_description_snippet: (j.data?.description || '').slice(0, 220),
      created_at: j.created_at,
      match_score: score,
    }));
  res.json({ jobs: scored });
});

// ── Create a job (form / from-template / chatbot all funnel through here) ────

router.post('/:id/hm/jobs', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const jobsObj = query('objects', o => o.environment_id === environmentId && o.slug === 'jobs' && !o.deleted_at)[0];
  if (!jobsObj) return res.status(400).json({ error: 'No Jobs object configured for this environment' });

  const { source_job_id, data = {} } = req.body;
  let baseData = {};
  if (source_job_id) {
    const src = query('records', r => r.id === source_job_id && r.object_id === jobsObj.id && !r.deleted_at)[0];
    if (src) {
      // Clone everything except identity/lifecycle fields — the new role
      // starts fresh (Draft status, no pipeline/offer history).
      const { status, created_at, updated_at, ...rest } = src.data || {};
      baseData = { ...rest, status: 'Draft' };
    }
  }

  const hmPersonId = findPersonRecordForSession(sess, environmentId)?.id;
  const merged = {
    ...baseData,
    ...data,
    hiring_manager: hmPersonId ? [{ id: hmPersonId, name: `${sess.first_name || ''} ${sess.last_name || ''}`.trim() }] : (data.hiring_manager || baseData.hiring_manager),
    status: data.status || baseData.status || 'Draft',
  };

  const now = new Date().toISOString();
  const rec = insert('records', {
    id: uuidv4(),
    object_id: jobsObj.id,
    environment_id: environmentId,
    data: merged,
    created_at: now,
    updated_at: now,
    created_by: sess.user_id || null,
    deleted_at: null,
  });
  res.status(201).json({ job: rec });
});

// ── Internal job-creation chatbot ────────────────────────────────────────────
// Deliberately more capable than the external candidate-facing copilot
// (server/routes/portal_copilot.js): it can see draft/closed roles across the
// WHOLE environment (not just this HM's own open postings) so it can spot and
// offer to reuse a genuinely similar past role instead of drafting one from
// scratch every time. It never writes anything itself — it only ever emits a
// <JOB_DRAFT> tag for the frontend to show as a review card; confirming that
// card calls the existing POST /:id/hm/jobs above (which already accepts the
// same {data, source_job_id} shape this tag produces). Session-token gated
// exactly like every other /hm/ route; never reachable without a valid
// portal session.

router.post('/:id/hm/chat', async (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages required' });

  const jobsObj = query('objects', o => o.environment_id === environmentId && o.slug === 'jobs' && !o.deleted_at)[0];
  const allJobs = jobsObj
    ? query('records', r => r.object_id === jobsObj.id && r.environment_id === environmentId && !r.deleted_at)
    : [];

  // Score the environment's whole job history against the most recent thing
  // the HM actually said, so "similar past roles" surfaced in the system
  // prompt stay relevant to the conversation rather than a static top-N list.
  const lastUserMsg = [...messages].reverse().find(m => m && m.role === 'user' && typeof m.content === 'string');
  const q = (lastUserMsg?.content || '').toLowerCase().trim();
  const scoredJobs = allJobs.map(j => {
    const d = j.data || {};
    const hay = `${d.job_title || ''} ${d.title || ''} ${d.department || ''} ${d.description || ''} ${d.required_skills || ''} ${d.requirements || ''} ${d.skills || ''}`.toLowerCase();
    let score = 0;
    if (q) {
      const terms = q.split(/\s+/).filter(t => t.length > 2);
      terms.forEach(t => { if (hay.includes(t)) score += (d.job_title || d.title || '').toLowerCase().includes(t) ? 3 : 1; });
    }
    return { j, score };
  }).sort((a, b) => b.score - a.score || new Date(b.j.created_at) - new Date(a.j.created_at));
  // Always show *something* (most recent roles) even with no query match yet,
  // so the assistant can proactively ask "want to base it on one of these?"
  // as soon as the HM says anything at all about the kind of role they need.
  const candidateJobs = (q ? scoredJobs.filter(x => x.score > 0) : scoredJobs).slice(0, 8).map(({ j }) => {
    const d = j.data || {};
    let line = `${d.job_title || d.title || 'Untitled role'} | ID: ${j.id} | Status: ${d.status || 'Draft'}`;
    if (d.department) line += ` | Dept: ${d.department}`;
    if (d.location) line += ` | Location: ${d.location}`;
    if (d.employment_type) line += ` | ${d.employment_type}`;
    if (d.description) line += `\n   ${String(d.description).slice(0, 200)}`;
    if (d.required_skills) line += `\n   Skills: ${Array.isArray(d.required_skills) ? d.required_skills.join(', ') : d.required_skills}`;
    return line;
  }).join('\n') || '(no roles created in this environment yet)';

  const hmName = `${sess.first_name || ''} ${sess.last_name || ''}`.trim() || 'there';

  const systemPrompt = `You are the internal Hiring Manager Assistant on TalentOS. You are talking to ${hmName}, a hiring manager, NOT a candidate — you have full internal access to help them open a new requisition. You are more capable than the public candidate-facing chatbot: you can see draft and closed roles across the whole company (not just live postings) and you can create a new Job record directly once ${hmName} confirms.

YOUR JOB: help ${hmName} open a new role as quickly as possible, in one of three ways they might want:
1. Fill it in from scratch, gathering details conversationally.
2. Reuse/clone a genuinely similar past role — ALWAYS check the list below first and proactively suggest one if it's a good match, rather than starting from a blank page. Don't force a weak match; only suggest ones that are genuinely close.
3. They may already know exactly what they want and just dictate it — capture that directly, don't over-interrogate.

ROLES THAT MIGHT BE REUSABLE (scored against what ${hmName} has said so far — most relevant first):
${candidateJobs}

FIELDS TO COLLECT (skip anything ${hmName} doesn't provide, never invent a value they didn't give you):
- job_title (required)
- department
- location
- employment_type (e.g. Full-time, Part-time, Contract)
- description (a short JD — write a solid draft yourself from what they've told you if they want you to, don't just ask them to paste one)
- requirements
- required_skills (comma-separated)

WHEN SUGGESTING A REUSABLE ROLE: output
<SIMILAR_JOBS>[{"id":"...","title":"...","department":"...","location":"..."}]</SIMILAR_JOBS>
using the exact "ID:" value from the list above, copied character-for-character — never invent one. The HM will see clickable cards; if they pick one, the frontend will tell you which id was chosen and you should confirm cloning it (they can still edit anything on the draft it produces).

WHEN READY TO CREATE (you have at least a job_title, and either enough detail to draft the rest or an explicit "clone role X"): output
<JOB_DRAFT>{"job_title":"...","department":"...","location":"...","employment_type":"...","description":"...","requirements":"...","required_skills":"...","source_job_id":"..."}</JOB_DRAFT>
Only include a key if you actually have a real value for it (omit source_job_id unless cloning a specific role from the list above). This shows ${hmName} a review card with a "Create Role" button — you are NOT creating it yet by outputting this tag, they still confirm.

RULES:
- Never invent a job ID that isn't in the list above
- Keep responses concise and efficient — this person is busy
- Be direct and practical, not overly chatty
- If they ask something unrelated to opening a role, answer briefly and steer back`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  try {
    const cleanMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL_DEFAULT, max_tokens: 1200, system: systemPrompt, messages: cleanMessages }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[hm-portal-chat] API error:', response.status, errBody.slice(0, 500));
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
    const data = await response.json();
    const text = (data.content || []).map(c => c.text || '').join('');
    res.json({ reply: text });
  } catch (e) {
    console.error('[hm-portal-chat] Error:', e.message);
    res.status(500).json({ error: 'AI service error' });
  }
});

// ── Shortlist (configurable via a Saved View selected in the portal admin) ──

router.get('/:id/hm/shortlist', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const portal = query('portals', p => p.id === req.params.id)[0];
  if (!portal) return res.status(404).json({ error: 'Portal not found' });

  const { jobs } = hmJobIds(environmentId, sess);
  const jobIdSet = new Set(jobs.map(j => j.id));
  if (!jobIdSet.size) return res.json({ candidates: [], saved_view: null });

  const peopleObj = query('objects', o => o.environment_id === environmentId && o.slug === 'people' && !o.deleted_at)[0];
  if (!peopleObj) return res.json({ candidates: [], saved_view: null });
  let people = query('records', r => r.object_id === peopleObj.id && r.environment_id === environmentId && !r.deleted_at);

  const savedViewId = portal.hm_shortlist_saved_view_id;
  let savedView = null;
  if (savedViewId) {
    savedView = query('saved_views', v => v.id === savedViewId && !v.deleted_at)[0] || null;
    if (savedView && Array.isArray(savedView.filters) && savedView.filters.length) {
      const fields = query('fields', f => f.object_id === peopleObj.id);
      const meCtx = { email: sess.email, userId: sess.user_id, fullName: `${sess.first_name || ''} ${sess.last_name || ''}`.trim(), personRecordId: findPersonRecordForSession(sess, environmentId)?.id || null };
      try {
        people = savedViewsHelpers().applyFiltersServer(people, savedView.filters, fields, meCtx);
      } catch (e) { /* if the filter engine throws, fall back to the unfiltered set below */ }
    }
  }

  // Restrict to people linked to one of this HM's jobs via the pipeline
  // (people_links) so a Saved View that isn't itself job-scoped still only
  // surfaces this HM's own candidates. Field names vary by data origin —
  // demo seed data uses person_id/job_id, live-created links use
  // person_record_id/target_record_id.
  const linkPersonId = l => l.person_record_id || l.person_id;
  const linkJobId2 = l => l.target_record_id || l.job_id;
  const links = query('people_links', l => !l.deleted_at && jobIdSet.has(linkJobId2(l)));
  const linkedPersonIds = new Set(links.map(linkPersonId).filter(Boolean));
  const jobById = new Map(jobs.map(j => [j.id, j]));
  const linksByPerson = new Map();
  links.forEach(l => {
    const pid = linkPersonId(l);
    if (!pid) return;
    if (!linksByPerson.has(pid)) linksByPerson.set(pid, []);
    linksByPerson.get(pid).push(l);
  });

  const shortlisted = people
    .filter(p => linkedPersonIds.has(p.id))
    .map(p => {
      const personLinks = linksByPerson.get(p.id) || [];
      return {
        id: p.id,
        name: personDisplayName(p),
        current_title: p.data?.current_title || p.data?.job_title || '',
        email: p.data?.email || '',
        location: p.data?.location || '',
        status: p.data?.status || '',
        jobs: personLinks.map(l => ({ job_id: linkJobId2(l), job_title: jobById.get(linkJobId2(l))?.data?.job_title || jobById.get(linkJobId2(l))?.data?.title || 'Role', stage: l.current_stage_name || l.stage_name || l.stage || '' })),
      };
    });

  res.json({ candidates: shortlisted, saved_view: savedView ? { id: savedView.id, name: savedView.name } : null });
});

// ── Upcoming interviews ───────────────────────────────────────────────────────

router.get('/:id/hm/interviews', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { jobs } = hmJobIds(environmentId, sess);
  const jobIdSet = new Set(jobs.map(j => j.id));
  const todayStart = new Date(new Date().toDateString());
  const showPast = req.query.include_past === '1';
  const all = query('interviews', i => i.environment_id === environmentId && !i.deleted_at && jobIdSet.has(i.job_id));
  const rows = all
    .filter(i => showPast || new Date(i.date) >= todayStart)
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));
  res.json({ interviews: rows });
});

// ── Feedback / scorecard submission ───────────────────────────────────────────

function ensureScorecardTables() {
  const s = getStore();
  if (!s.scorecard_templates) s.scorecard_templates = [];
  if (!s.scorecard_competencies) s.scorecard_competencies = [];
  if (!s.scorecard_submissions) s.scorecard_submissions = [];
  if (!s.scorecard_responses) s.scorecard_responses = [];
  return s;
}

function findOrCreateDefaultTemplate(environmentId) {
  const store = ensureScorecardTables();
  let tmpl = store.scorecard_templates.find(t => t.environment_id === environmentId && t.is_hm_default && !t.deleted_at);
  if (tmpl) return tmpl;
  const now = new Date().toISOString();
  tmpl = { id: uuidv4(), name: 'Quick Feedback', description: 'Default hiring-manager interview feedback form', interview_type_id: null, environment_id: environmentId, rating_scale: 'five_point', is_hm_default: true, created_at: now, updated_at: now, deleted_at: null };
  store.scorecard_templates.push(tmpl);
  const comp = { id: uuidv4(), template_id: tmpl.id, name: 'Overall Fit', description: 'How well does this candidate fit the role?', weight: 1, order: 0, required: true, created_at: now };
  store.scorecard_competencies.push(comp);
  saveStore(store);
  return tmpl;
}

router.post('/:id/hm/scorecard', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { interview_id, candidate_record_id, job_record_id, template_id, recommendation, overall_comments, highlights, red_flags, responses = [], status = 'submitted' } = req.body;
  if (!candidate_record_id) return res.status(400).json({ error: 'candidate_record_id required' });

  const tmpl = template_id ? query('scorecard_templates', t => t.id === template_id)[0] : findOrCreateDefaultTemplate(environmentId);
  if (!tmpl) return res.status(400).json({ error: 'No scorecard template available' });

  const store = ensureScorecardTables();
  const interviewerId = findPersonRecordForSession(sess, environmentId)?.id || sess.user_id || sess.email;
  const interviewerName = `${sess.first_name || ''} ${sess.last_name || ''}`.trim() || sess.email;
  const now = new Date().toISOString();

  let sub = store.scorecard_submissions.find(s => s.interview_id === (interview_id || null) && s.interviewer_id === interviewerId && !s.deleted_at);
  if (sub) {
    Object.assign(sub, { recommendation, overall_comments, highlights, red_flags, status, updated_at: now, submitted_at: status === 'submitted' ? now : sub.submitted_at });
    store.scorecard_responses = store.scorecard_responses.filter(r => r.submission_id !== sub.id);
  } else {
    sub = { id: uuidv4(), interview_id: interview_id || null, candidate_record_id, job_record_id: job_record_id || null, template_id: tmpl.id, interviewer_id: interviewerId, interviewer_name: interviewerName, recommendation: recommendation || null, overall_comments: overall_comments || '', highlights: highlights || '', red_flags: red_flags || '', status, created_at: now, updated_at: now, submitted_at: status === 'submitted' ? now : null };
    store.scorecard_submissions.push(sub);
  }
  responses.forEach(r => {
    store.scorecard_responses.push({ id: uuidv4(), submission_id: sub.id, competency_id: r.competency_id, rating: r.rating != null ? r.rating : null, comment: r.comment || '', created_at: now });
  });
  saveStore(store);
  res.status(201).json({ submission: sub, template: tmpl });
});

// ── Onboarding (candidates with an Accepted offer on one of the HM's jobs) ───

router.get('/:id/hm/onboarding', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { jobs } = hmJobIds(environmentId, sess);
  const jobIdSet = new Set(jobs.map(j => j.id));
  const jobById = new Map(jobs.map(j => [j.id, j]));
  const accepted = query('offers', o => o.environment_id === environmentId && !o.deleted_at && o.status === 'accepted' && jobIdSet.has(o.job_id));

  const peopleObj = query('objects', o => o.environment_id === environmentId && o.slug === 'people' && !o.deleted_at)[0];
  const peopleById = new Map();
  if (peopleObj) {
    query('records', r => r.object_id === peopleObj.id && r.environment_id === environmentId && !r.deleted_at)
      .forEach(p => peopleById.set(p.id, p));
  }

  const rows = accepted.map(o => {
    const person = peopleById.get(o.candidate_id);
    const job = jobById.get(o.job_id);
    return {
      offer_id: o.id,
      candidate_id: o.candidate_id,
      candidate_name: person ? personDisplayName(person) : 'Unknown',
      job_id: o.job_id,
      job_title: job?.data?.job_title || job?.data?.title || 'Role',
      base_salary: o.base_salary != null ? o.base_salary : o.salary,
      currency: o.currency,
      accepted_at: o.declined_at ? null : (o.updated_at || o.created_at),
      start_date: o.start_date || person?.data?.start_date || null,
    };
  }).sort((a, b) => new Date(b.accepted_at || 0) - new Date(a.accepted_at || 0));

  res.json({ onboarding: rows });
});

// ── Candidate detail (drill-down) ─────────────────────────────────────────
// Powers the "Talent Profile" drill-down configured on an HM widget in the
// portal builder. Which fields/attachments are actually *displayed* is a
// frontend concern (driven by the widget's cfg.drilldown_fields /
// cfg.drilldown_show_files) — this endpoint always returns the full field
// metadata + raw data + attachments for the record, same as the internal
// app would see, but ONLY after confirming the candidate is genuinely in
// this hiring manager's own pipeline.

router.get('/:id/hm/candidate/:recordId', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { jobs } = hmJobIds(environmentId, sess);
  if (!jobs.length) return res.status(403).json({ error: 'No jobs owned by this hiring manager', code: 'PORTAL_FORBIDDEN' });
  const jobIdSet = new Set(jobs.map(j => j.id));
  const jobById = new Map(jobs.map(j => [j.id, j]));

  const peopleObj = query('objects', o => o.environment_id === environmentId && o.slug === 'people' && !o.deleted_at)[0];
  if (!peopleObj) return res.status(404).json({ error: 'Not found' });
  const record = query('records', r => r.id === req.params.recordId && r.object_id === peopleObj.id && r.environment_id === environmentId && !r.deleted_at)[0];
  if (!record) return res.status(404).json({ error: 'Not found' });

  // Ownership check: candidate must be linked to at least one job this HM owns.
  const linkPersonId = l => l.person_record_id || l.person_id;
  const linkJobId2 = l => l.target_record_id || l.job_id;
  const links = query('people_links', l => !l.deleted_at && linkPersonId(l) === record.id && jobIdSet.has(linkJobId2(l)));
  if (!links.length) return res.status(403).json({ error: 'This candidate is not in your pipeline', code: 'PORTAL_FORBIDDEN' });

  const fields = query('fields', f => f.object_id === peopleObj.id && (!f.environment_id || f.environment_id === environmentId));
  // Attachments have no deleted_at field in this codebase (hard delete only) —
  // do not add a !a.deleted_at filter here.
  const attachments = query('attachments', a => a.record_id === record.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Richer profile data — mirrors talent_profile.js's /person route, kept as
  // an independent read here (rather than requiring that router) so this
  // file's ownership/auth checks above remain the sole gate on this data.
  const store = getStore();
  const notes = (store.notes || []).filter(n => n.record_id === record.id && !n.deleted_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const activity = (store.activity_log || []).filter(a => a.record_id === record.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  const formResponses = (store.form_responses || []).filter(r => r.record_id === record.id).map(resp => {
    const formA = (store.forms || []).find(f => f.id === resp.form_id);
    const formB = (store.form_templates || []).find(f => f.id === resp.form_template_id || f.id === resp.form_id);
    const form = formA || formB;
    return { ...resp, form_name: form?.name || 'Unknown form', form_fields: form?.fields || [] };
  });
  const configs = store.talent_profile_configs || [];
  const profile_config = configs.find(c => c.environment_id === environmentId && (c.object_id || 'people') === peopleObj.id && c.is_default)
                       || configs.find(c => c.environment_id === environmentId && (c.object_id || 'people') === peopleObj.id)
                       || null;

  res.json({
    record: { id: record.id, data: record.data, created_at: record.created_at },
    fields,
    attachments,
    notes,
    activity,
    formResponses,
    profile_config,
    jobs: links.map(l => ({
      job_id: linkJobId2(l),
      job_title: jobById.get(linkJobId2(l))?.data?.job_title || jobById.get(linkJobId2(l))?.data?.title || 'Role',
      stage: l.current_stage_name || l.stage_name || l.stage || '',
    })),
  });
});

// ── Job detail (drill-down) ────────────────────────────────────────────────

router.get('/:id/hm/job/:recordId', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { jobs } = hmJobIds(environmentId, sess);
  const job = jobs.find(j => j.id === req.params.recordId);
  if (!job) return res.status(404).json({ error: 'Not found' });

  const jobsObj = query('objects', o => o.environment_id === environmentId && o.slug === 'jobs' && !o.deleted_at)[0];
  const fields = jobsObj ? query('fields', f => f.object_id === jobsObj.id && (!f.environment_id || f.environment_id === environmentId)) : [];
  const attachments = query('attachments', a => a.record_id === job.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const interviews = query('interviews', i => i.environment_id === environmentId && !i.deleted_at && i.job_id === job.id);
  const offers = query('offers', o => o.environment_id === environmentId && !o.deleted_at && o.job_id === job.id);
  const linkJobId2 = l => l.target_record_id || l.job_id;
  const pipelineCount = query('people_links', l => !l.deleted_at && linkJobId2(l) === job.id).length;

  const store = getStore();
  const notes = (store.notes || []).filter(n => n.record_id === job.id && !n.deleted_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const activity = (store.activity_log || []).filter(a => a.record_id === job.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  const configs = store.talent_profile_configs || [];
  const profile_config = (jobsObj && (
       configs.find(c => c.environment_id === environmentId && (c.object_id || 'people') === jobsObj.id && c.is_default)
    || configs.find(c => c.environment_id === environmentId && (c.object_id || 'people') === jobsObj.id)
  )) || null;

  res.json({
    record: { id: job.id, data: job.data, created_at: job.created_at },
    fields,
    attachments,
    notes,
    activity,
    profile_config,
    stats: {
      pipeline_count: pipelineCount,
      upcoming_interviews: interviews.filter(i => new Date(i.date) >= new Date(new Date().toDateString())).length,
      pending_offers: offers.filter(o => !['accepted', 'declined', 'withdrawn', 'expired'].includes(o.status)).length,
    },
  });
});

// ── Interview types (for the "Arrange Interview" picker) ─────────────────────
// interview_types.js is not on the AUTH_EXEMPT list in index.js and its GET
// route expects a main-app req.currentUser, so it's unreachable directly
// from a portal-token session — this thin wrapper reads the same collection.

router.get('/:id/hm/interview-types', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const types = query('interview_types', t => t.environment_id === environmentId && !t.deleted_at);
  res.json({ interview_types: types });
});

// ── Arrange Interview ──────────────────────────────────────────────────────
// Mirrors POST /api/interviews in interviews.js: same record shape, same
// fire-and-forget side effects (video meeting-link creation, candidate
// confirmation email with a .ics calendar attachment) — reused directly via
// the additive helper exports on interviews.js (buildICS, buildEmailHtml,
// makeRescheduleToken) rather than duplicated. Reachable via portal-token
// auth; independently verifies the candidate and (if given) job belong to
// this hiring manager before writing anything.

router.post('/:id/hm/interviews', (req, res) => {
  const sess = requireHM(req, res);
  if (!sess) return;
  const environmentId = sess.environment_id;
  const { candidate_id, job_id, interview_type_id, interview_type_name, date, time, duration, format, notes, interviewer_emails } = req.body;
  if (!candidate_id || !date) return res.status(400).json({ error: 'candidate_id and date required' });

  const { jobs } = hmJobIds(environmentId, sess);
  const jobIdSet = new Set(jobs.map(j => j.id));
  if (job_id && !jobIdSet.has(job_id)) return res.status(403).json({ error: 'This role is not yours to schedule against', code: 'PORTAL_FORBIDDEN' });

  const linkPersonId = l => l.person_record_id || l.person_id;
  const linkJobId2 = l => l.target_record_id || l.job_id;
  const links = query('people_links', l => !l.deleted_at && linkPersonId(l) === candidate_id && jobIdSet.has(linkJobId2(l)));
  if (!links.length) return res.status(403).json({ error: 'This candidate is not in your pipeline', code: 'PORTAL_FORBIDDEN' });

  const peopleObj = query('objects', o => o.environment_id === environmentId && o.slug === 'people' && !o.deleted_at)[0];
  const candidateRecord = peopleObj ? query('records', r => r.id === candidate_id && r.object_id === peopleObj.id && !r.deleted_at)[0] : null;
  if (!candidateRecord) return res.status(404).json({ error: 'Candidate not found' });
  const candidateName = personDisplayName(candidateRecord);

  const jobRec = job_id ? jobs.find(j => j.id === job_id) : null;
  const jobName = jobRec?.data?.job_title || jobRec?.data?.title || '';

  const rec = insert('interviews', {
    id: uuidv4(), environment_id: environmentId,
    interview_type_id: interview_type_id || null,
    interview_type_name: interview_type_name || 'Interview',
    candidate_id, candidate_name: candidateName,
    job_id: job_id || null, job_name: jobName,
    date, time: time || '09:00', duration: duration || 30,
    format: format || 'Video Call',
    interviewers: sess.email ? [{ id: sess.user_id || null, name: `${sess.first_name || ''} ${sess.last_name || ''}`.trim(), email: sess.email }] : [],
    notes: notes || '',
    status: 'pending',
    meeting_link: null, meeting_provider: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
  });

  setImmediate(async () => {
    try {
      const startTime = `${date}T${time || '09:00'}`;
      const endTime = new Date(new Date(startTime).getTime() + (duration || 30) * 60_000).toISOString();
      const topic = `${interview_type_name || 'Interview'}: ${candidateName}${jobName ? ` — ${jobName}` : ''}`;
      const interviewerEmails = (interviewer_emails || []).concat(sess.email ? [sess.email] : []);
      const meeting = await createInterviewMeeting(environmentId, { topic, startTime, endTime, attendees: interviewerEmails, agenda: notes || '' });
      if (meeting) {
        const link = meeting.join_url || meeting.teams_url || meeting.meet_link || null;
        update('interviews', i => i.id === rec.id, { meeting_link: link, meeting_provider: meeting.provider, updated_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('[HM Portal] Meeting creation failed:', e.message); }

    try {
      // Lazily pull the pure formatting helpers off interviews.js's exports —
      // this file never calls into that router's request handlers, only
      // these plain functions (see file header comment).
      const { buildICS, makeRescheduleToken, buildEmailHtml } = require('./interviews');
      const appUrl = process.env.APP_URL || 'https://app.vercentic.com';
      const candidateEmail = candidateRecord.data?.email;
      const rescheduleToken = makeRescheduleToken(rec.id, 'candidate');
      const rescheduleUrl = `${appUrl}/reschedule/${rec.id}/${rescheduleToken}?role=candidate`;
      const startDT = new Date(`${date}T${time || '09:00'}:00`);
      const endDT = new Date(startDT.getTime() + (duration || 30) * 60_000);
      const dateFormatted = (() => { try { return startDT.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return date; } })();
      const fmtTime = (d) => { try { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
      const timeRange = `${fmtTime(startDT)} – ${fmtTime(endDT)}`;
      const interviewerEmails2 = (interviewer_emails || []).concat(sess.email ? [sess.email] : []);
      const icsStr = buildICS({
        uid: rec.id,
        summary: `Interview: ${candidateName}${jobName ? ` — ${jobName}` : ''}`,
        description: [`Candidate: ${candidateName}`, jobName ? `Role: ${jobName}` : '', `Format: ${format || 'Video Call'}`, notes ? `Notes: ${notes}` : '', `Reschedule: ${rescheduleUrl}`].filter(Boolean).join('\n'),
        startISO: startDT.toISOString(), endISO: endDT.toISOString(), attendees: interviewerEmails2,
      });
      if (candidateEmail) {
        const msg = require('../services/messaging');
        await msg.sendEmail({
          to: candidateEmail, toName: candidateName,
          subject: `Interview: ${candidateName}${jobName ? ` — ${jobName}` : ''}`,
          text: `Interview confirmed.\n\nCandidate: ${candidateName}${jobName ? `\nRole: ${jobName}` : ''}\nDate: ${dateFormatted}\nTime: ${timeRange}\nFormat: ${format || 'Video Call'}${notes ? `\n\nNotes:\n${notes}` : ''}\n\nReschedule: ${rescheduleUrl}`,
          html: buildEmailHtml({ candidateName, jobName, dateFormatted, timeRange, fmt: format || 'Video Call', duration: duration || 30, notes: notes || '', rescheduleUrl }),
          attachments: [{ filename: 'interview.ics', content: Buffer.from(icsStr).toString('base64'), type: 'text/calendar' }],
        });
      }
      await fireEvent(environmentId, 'interview_scheduled', { candidateName, jobTitle: jobName, date, time: time || '09:00', format: format || 'Video Call', notes: notes || '', interviewers: rec.interviewers });
    } catch (e) { console.warn('[HM Portal] Interview notification failed:', e.message); }
  });

  res.status(201).json(rec);
});

module.exports = router;
