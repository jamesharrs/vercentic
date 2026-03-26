const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');

// ── Ensure collections exist ───────────────────────────────────────────────
const ensureTables = () => {
  const s = getStore();
  if (!s.availability_requests) { s.availability_requests = []; saveStore(); }
};

// ── GET /api/interview-coordinator/token/:token ────────────────────────────
// Public endpoint — returns the availability request context for the form page
router.get('/token/:token', (req, res) => {
  ensureTables();
  const s = getStore();
  const req_ = (s.availability_requests || []).find(r => r.token === req.params.token && !r.deleted_at);
  if (!req_) return res.status(404).json({ error: 'Request not found or expired' });
  if (req_.expires_at && new Date(req_.expires_at) < new Date()) return res.status(410).json({ error: 'This availability request has expired' });
  // Return safe public fields only
  res.json({
    id: req_.id, token: req_.token, type: req_.type,
    candidate_name: req_.candidate_name, job_title: req_.job_title,
    interviewer_name: req_.interviewer_name, message: req_.message,
    proposed_slots: req_.proposed_slots || [], duration_minutes: req_.duration_minutes || 45,
    status: req_.status, expires_at: req_.expires_at,
  });
});

// ── POST /api/interview-coordinator/token/:token/respond ──────────────────
// Public endpoint — submit availability selections
router.post('/token/:token/respond', (req, res) => {
  ensureTables();
  const s = getStore();
  const idx = (s.availability_requests || []).findIndex(r => r.token === req.params.token);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  const req_ = s.availability_requests[idx];
  if (req_.expires_at && new Date(req_.expires_at) < new Date()) return res.status(410).json({ error: 'Expired' });

  const { selected_slots, message } = req.body;
  s.availability_requests[idx] = {
    ...req_, status: 'responded',
    selected_slots: selected_slots || [],
    response_message: message || '',
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveStore();

  // Sync to Postgres
  try { const pg = require('../db/postgres'); const { getCurrentTenant } = require('../db/init'); if (pg.isEnabled()) pg.saveCollection(getCurrentTenant()||'master','availability_requests',s.availability_requests); } catch(e){}

  // Trigger coordination if both HM and candidate have responded
  const coordId = req_.coordinator_run_id;
  if (coordId) tryFinalizeCoordination(coordId, s);

  res.json({ ok: true, message: 'Thank you! Your availability has been recorded.' });
});

// ── POST /api/interview-coordinator/run ───────────────────────────────────
// Internal — triggered by workflow stage change or manual agent run
router.post('/run', async (req, res) => {
  ensureTables();
  try {
    const { candidate_id, job_id, environment_id, config = {}, agent_id } = req.body;
    if (!candidate_id) return res.status(400).json({ error: 'candidate_id required' });
    const result = await startCoordination({ candidate_id, job_id, environment_id, config, agent_id });
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/interview-coordinator/runs ───────────────────────────────────
router.get('/runs', (req, res) => {
  ensureTables();
  const { environment_id, candidate_id } = req.query;
  const s = getStore();
  let runs = (s.coordination_runs || []).filter(r => !r.deleted_at);
  if (environment_id) runs = runs.filter(r => r.environment_id === environment_id);
  if (candidate_id)   runs = runs.filter(r => r.candidate_id === candidate_id);
  runs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  // Enrich with availability request statuses
  const requests = s.availability_requests || [];
  runs = runs.map(r => ({
    ...r,
    hm_request:  requests.find(x => x.id === r.hm_request_id)  || null,
    cand_request: requests.find(x => x.id === r.cand_request_id) || null,
  }));
  res.json(runs);
});

// ── DELETE /api/interview-coordinator/runs/:id ────────────────────────────
router.delete('/runs/:id', (req, res) => {
  const s = getStore();
  if (!s.coordination_runs) return res.status(404).json({ error: 'Not found' });
  const idx = s.coordination_runs.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.coordination_runs[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Core coordination logic
// ─────────────────────────────────────────────────────────────────────────────
async function startCoordination({ candidate_id, job_id, environment_id, config = {}, agent_id }) {
  ensureTables();
  const s = getStore();
  if (!s.coordination_runs) s.coordination_runs = [];

  const candidate = (s.records || []).find(r => r.id === candidate_id);
  if (!candidate) throw new Error('Candidate record not found');

  const d = candidate.data || {};
  const candidateName = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Candidate';
  const candidateEmail = d.email || null;

  // Find linked job if not passed
  let jobRec = null;
  let jobTitle = config.job_title || 'the role';
  let hiringManagerName  = config.hiring_manager_name || 'Hiring Manager';
  let hiringManagerEmail = config.hiring_manager_email || null;

  if (!job_id) {
    const link = (s.people_links || []).find(l => l.person_record_id === candidate_id);
    job_id = link?.target_record_id || null;
  }
  if (job_id) {
    jobRec = (s.records || []).find(r => r.id === job_id);
    if (jobRec) {
      jobTitle = jobRec.data?.job_title || jobRec.data?.title || jobTitle;
      // Try to get HM from People field on job
      const hmId = jobRec.data?.hiring_manager_id || jobRec.data?.hiring_manager?.[0];
      if (hmId) {
        const hm = (s.records || []).find(r => r.id === hmId);
        if (hm) {
          hiringManagerName  = [hm.data?.first_name, hm.data?.last_name].filter(Boolean).join(' ') || hiringManagerName;
          hiringManagerEmail = hm.data?.email || hiringManagerEmail;
        }
      }
    }
  }

  // Generate proposed slots: next 5 working days, 3 slots per day (9am, 12pm, 3pm)
  const proposedSlots = generateProposedSlots(config.duration_minutes || 45);

  const appUrl = process.env.APP_URL || 'https://client-lovat-nu-33.vercel.app';
  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days

  // Create coordination run record
  const runId = uuidv4();
  const hmToken   = require('crypto').randomBytes(24).toString('hex');
  const candToken = require('crypto').randomBytes(24).toString('hex');

  // HM availability request
  const hmReqId = uuidv4();
  s.availability_requests.push({
    id: hmReqId, token: hmToken, coordinator_run_id: runId,
    type: 'hiring_manager', environment_id,
    candidate_name: candidateName, job_title: jobTitle,
    interviewer_name: hiringManagerName,
    message: config.hm_message || `Hi ${hiringManagerName}, please select your available slots to interview ${candidateName} for the ${jobTitle} position.`,
    proposed_slots: proposedSlots, duration_minutes: config.duration_minutes || 45,
    status: 'pending', expires_at: expiresAt, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  // Candidate availability request (pending until HM responds — or send in parallel)
  const sendInParallel = config.parallel_availability !== false; // default: parallel
  const candReqId = uuidv4();
  s.availability_requests.push({
    id: candReqId, token: candToken, coordinator_run_id: runId,
    type: 'candidate', environment_id,
    candidate_name: candidateName, job_title: jobTitle,
    interviewer_name: hiringManagerName,
    message: config.candidate_message || `Hi ${candidateName}, congratulations on progressing to the interview stage for ${jobTitle}! Please select your available times below.`,
    proposed_slots: proposedSlots, duration_minutes: config.duration_minutes || 45,
    status: sendInParallel ? 'pending' : 'waiting',
    expires_at: expiresAt, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  const run = {
    id: runId, agent_id, environment_id, candidate_id,
    job_id: job_id || null, status: 'collecting_availability',
    candidate_name: candidateName, candidate_email: candidateEmail,
    job_title: jobTitle, hiring_manager_name: hiringManagerName,
    hiring_manager_email: hiringManagerEmail,
    hm_request_id: hmReqId, cand_request_id: candReqId,
    parallel_availability: sendInParallel,
    duration_minutes: config.duration_minutes || 45,
    steps: [{ step: `✓ Coordination started — availability requests created`, timestamp: new Date().toISOString() }],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  s.coordination_runs.push(run);
  saveStore();

  // Send emails
  const logs = [];
  try {
    const msg = require('../services/messaging');
    const hmLink   = `${appUrl}/availability/${hmToken}`;
    const candLink = `${appUrl}/availability/${candToken}`;

    if (hiringManagerEmail) {
      await msg.sendEmail({
        to: hiringManagerEmail,
        subject: `Interview availability request — ${candidateName} for ${jobTitle}`,
        text: `Hi ${hiringManagerName},\n\nPlease select your available times to interview ${candidateName} for the ${jobTitle} role.\n\n👉 ${hmLink}\n\nThis link expires in 5 days.\n\nThanks`,
        html: buildEmailHtml({ name: hiringManagerName, candidateName, jobTitle, link: hmLink, role: 'hiring_manager', duration: config.duration_minutes || 45 }),
      });
      logs.push(`✓ HM availability email → ${hiringManagerEmail}`);
    } else {
      logs.push(`⚠ No HM email — skipped (link: ${hmLink})`);
    }

    if (sendInParallel && candidateEmail) {
      await msg.sendEmail({
        to: candidateEmail,
        subject: `Interview invitation — ${jobTitle}`,
        text: `Hi ${candidateName},\n\nCongratulations! Please select your available times for an interview.\n\n👉 ${candLink}\n\nThis link expires in 5 days.\n\nBest of luck!`,
        html: buildEmailHtml({ name: candidateName, candidateName, jobTitle, link: candLink, role: 'candidate', duration: config.duration_minutes || 45 }),
      });
      logs.push(`✓ Candidate availability email → ${candidateEmail}`);
    } else if (sendInParallel) {
      logs.push(`⚠ No candidate email — skipped (link: ${candLink})`);
    }
  } catch(e) {
    logs.push(`⚠ Email error: ${e.message}`);
  }

  // Update run steps
  const s2 = getStore();
  const ri = (s2.coordination_runs||[]).findIndex(r => r.id === runId);
  if (ri >= 0) { logs.forEach(l => s2.coordination_runs[ri].steps.push({ step: l, timestamp: new Date().toISOString() })); saveStore(); }

  // Postgres sync
  try { const pg = require('../db/postgres'); const { getCurrentTenant } = require('../db/init'); if (pg.isEnabled()) { const t = getCurrentTenant()||'master'; await pg.saveCollection(t,'availability_requests',s2.availability_requests); await pg.saveCollection(t,'coordination_runs',s2.coordination_runs||[]); } } catch(e){}

  return { ok: true, run_id: runId, hm_token: hmToken, cand_token: candToken, logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalize: find best mutual slot, confirm interview, send confirmations
// ─────────────────────────────────────────────────────────────────────────────
function tryFinalizeCoordination(runId, s) {
  const run = (s.coordination_runs||[]).find(r => r.id === runId);
  if (!run) return;
  const hmReq   = (s.availability_requests||[]).find(r => r.id === run.hm_request_id);
  const candReq = (s.availability_requests||[]).find(r => r.id === run.cand_request_id);
  if (!hmReq || hmReq.status !== 'responded') return; // wait for HM first
  if (!candReq || candReq.status !== 'responded') return; // wait for candidate

  // Find intersection
  const hmSlots   = hmReq.selected_slots   || [];
  const candSlots = candReq.selected_slots || [];
  const mutual = hmSlots.filter(s => candSlots.includes(s));

  const ri = (s.coordination_runs||[]).findIndex(r => r.id === runId);
  if (ri === -1) return;

  if (!mutual.length) {
    // No overlap — notify recruiter, re-request
    s.coordination_runs[ri].status = 'no_overlap';
    s.coordination_runs[ri].steps.push({ step: '⚠ No overlapping availability — notifying recruiter to expand slots', timestamp: new Date().toISOString() });
    notifyNoOverlap(run, s);
  } else {
    const chosen = mutual[0]; // pick earliest
    s.coordination_runs[ri].status = 'confirmed';
    s.coordination_runs[ri].confirmed_slot = chosen;
    s.coordination_runs[ri].steps.push({ step: `✓ Interview confirmed: ${chosen}`, timestamp: new Date().toISOString() });
    sendConfirmations(run, chosen, s);
    // Add note to candidate record
    if (!s.record_notes) s.record_notes = [];
    s.record_notes.push({ id: uuidv4(), record_id: run.candidate_id, content: `Interview scheduled: ${chosen} — ${run.duration_minutes || 45} minutes with ${run.hiring_manager_name}`, created_by: 'interview-coordinator', created_at: new Date().toISOString() });
  }
  s.coordination_runs[ri].updated_at = new Date().toISOString();
  saveStore();
  try { const pg = require('../db/postgres'); const { getCurrentTenant } = require('../db/init'); if (pg.isEnabled()) { const t = getCurrentTenant()||'master'; pg.saveCollection(t,'coordination_runs',s.coordination_runs||[]); pg.saveCollection(t,'record_notes',s.record_notes||[]); } } catch(e){}
}

async function sendConfirmations(run, slot, s) {
  try {
    const msg = require('../services/messaging');
    const appUrl = process.env.APP_URL || 'https://client-lovat-nu-33.vercel.app';
    const dt = new Date(slot);
    const formatted = dt.toLocaleString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const body = `Your interview has been confirmed:\n\n📅 ${formatted}\n⏱ ${run.duration_minutes || 45} minutes\n\nDetails will follow shortly.`;

    if (run.candidate_email) await msg.sendEmail({ to: run.candidate_email, subject: `Interview confirmed — ${run.job_title}`, text: `Hi ${run.candidate_name},\n\n${body}`, html: body.replace(/\n/g,'<br>') });
    if (run.hiring_manager_email) await msg.sendEmail({ to: run.hiring_manager_email, subject: `Interview confirmed — ${run.candidate_name}`, text: `Hi ${run.hiring_manager_name},\n\n${body}`, html: body.replace(/\n/g,'<br>') });
  } catch(e) { console.error('[coordinator] confirm email error:', e.message); }
}

async function notifyNoOverlap(run, s) {
  try {
    const msg = require('../services/messaging');
    if (run.hiring_manager_email) {
      await msg.sendEmail({ to: run.hiring_manager_email, subject: `Action needed — no mutual availability for ${run.candidate_name}`, text: `Hi ${run.hiring_manager_name},\n\nUnfortunately there are no overlapping slots between you and ${run.candidate_name} for the ${run.job_title} interview.\n\nPlease log in to provide additional availability.\n\nThanks` });
    }
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateProposedSlots(durationMins = 45) {
  const slots = [];
  const times = [9, 11, 14, 16]; // 9am, 11am, 2pm, 4pm
  const now = new Date();
  let day = new Date(now);
  day.setHours(0,0,0,0);
  day.setDate(day.getDate() + 1); // start tomorrow
  let count = 0;
  while (slots.length < 16) {
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) { // skip weekends
      for (const h of times) {
        const slot = new Date(day);
        slot.setHours(h, 0, 0, 0);
        slots.push(slot.toISOString());
      }
    }
    day.setDate(day.getDate() + 1);
    if (++count > 20) break;
  }
  return slots.slice(0, 12); // 12 proposed slots
}

function buildEmailHtml({ name, candidateName, jobTitle, link, role, duration }) {
  const isHM = role === 'hiring_manager';
  const intro = isHM
    ? `Please select your available times to interview <strong>${candidateName}</strong> for <strong>${jobTitle}</strong>.`
    : `Congratulations on progressing to the interview stage for <strong>${jobTitle}</strong>! Please select your available times below.`;
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
<h2 style="color:#1a1a2e;margin:0 0 12px">Interview Coordination</h2>
<p style="color:#374151;line-height:1.6">${intro}</p>
<p style="color:#6b7280;font-size:13px">Duration: ${duration} minutes</p>
<a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600">Select My Availability →</a>
<p style="color:#9ca3af;font-size:12px">This link expires in 5 days.</p>
</div>`;
}

module.exports = router;
module.exports.startCoordination = startCoordination;
module.exports.tryFinalizeCoordination = tryFinalizeCoordination;
