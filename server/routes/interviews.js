const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) return null;
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { createInterviewMeeting, fireEvent } = require('../services/connectors');

function ensure() {
  const s = getStore();
  if (!s.interviews) { s.interviews = []; saveStore(); }
}

router.get('/', (req, res) => {
  ensure();
  const { environment_id, candidate_id, job_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rows = query('interviews', i => i.environment_id === environment_id && !i.deleted_at);
  if (candidate_id) rows = rows.filter(i => i.candidate_id === candidate_id);
  if (job_id)       rows = rows.filter(i => i.job_id === job_id);
  res.json(rows.sort((a,b) => {
    const da = new Date(`${a.date}T${a.time||'00:00'}`);
    const db = new Date(`${b.date}T${b.time||'00:00'}`);
    return da - db;
  }));
});

router.post('/', async (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const { environment_id, interview_type_id, interview_type_name, candidate_id, candidate_name,
          job_id, job_name, date, time, duration, format, interviewers, notes, status,
          interviewer_emails } = req.body;
  if (!environment_id || !date) return res.status(400).json({ error: 'environment_id and date required' });

  // Resolve candidate name if only ID provided
  let resolvedCandidateId = candidate_id || null;
  let resolvedCandidateName = candidate_name || '';
  if (!resolvedCandidateId && candidate_name) {
    const store = getStore();
    const nameNorm = candidate_name.toLowerCase().trim();
    const match = (store.records || []).find(r => {
      const d = r.data || {};
      const full = `${d.first_name||''} ${d.last_name||''}`.trim().toLowerCase();
      return full === nameNorm || d.email?.toLowerCase() === nameNorm;
    });
    if (match) resolvedCandidateId = match.id;
  }

  const rec = insert('interviews', {
    id: uuidv4(), environment_id,
    interview_type_id: interview_type_id || null,
    interview_type_name: interview_type_name || 'Interview',
    candidate_id: resolvedCandidateId,
    candidate_name: resolvedCandidateName,
    job_id: job_id || null, job_name: job_name || '',
    date, time: time || '09:00', duration: duration || 30,
    format: format || 'Video Call',
    interviewers: interviewers || [], notes: notes || '',
    status: status || 'pending',
    meeting_link: null, meeting_provider: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
  });

  // ── AUTO-CREATE MEETING LINK ──────────────────────────────────────────────
  // Runs async — response returns immediately, meeting link is patched in
  setImmediate(async () => {
    try {
      const startTime = `${date}T${time || '09:00'}`;
      const endTime   = new Date(new Date(startTime).getTime() + (duration || 30) * 60_000).toISOString();
      const topic     = `${interview_type_name || 'Interview'}: ${resolvedCandidateName || 'Candidate'}${job_name ? ` — ${job_name}` : ''}`;
      const emails    = interviewer_emails || [];
      const meeting   = await createInterviewMeeting(environment_id, { topic, startTime, endTime, attendees: emails, agenda: notes || '' });
      if (meeting) {
        const link = meeting.join_url || meeting.teams_url || meeting.meet_link || null;
        update('interviews', i => i.id === rec.id, {
          meeting_link: link, meeting_provider: meeting.provider,
          updated_at: new Date().toISOString(),
        });
        console.log(`[Connectors] Meeting created via ${meeting.provider} for interview ${rec.id}`);
      }
    } catch (e) { console.warn('[Connectors] Meeting creation failed:', e.message); }
  });

  // ── FIRE NOTIFICATIONS ────────────────────────────────────────────────────
  setImmediate(async () => {
    try {
      await fireEvent(environment_id, 'interview_scheduled', {
        candidateName: resolvedCandidateName,
        jobTitle: job_name,
        date, time: time || '09:00',
        format: format || 'Video Call',
        interviewers: interviewers || [],
      });
    } catch (e) { console.warn('[Connectors] Notification failed:', e.message); }
  });

  res.status(201).json(rec);
});

router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const fields = ['date','time','status','notes','interviewers','candidate_id','candidate_name','job_id','job_name','meeting_link','meeting_provider'];
  const updates = { updated_at: new Date().toISOString() };
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const rec = update('interviews', i => i.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', async (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const interview = query('interviews', i => i.id === req.params.id)?.[0];
  update('interviews', i => i.id === req.params.id, { deleted_at: new Date().toISOString() });

  // Cancel the meeting if one was created
  if (interview?.meeting_link && interview?.meeting_provider === 'zoom') {
    const { getConnector } = require('../services/connectors');
    setImmediate(async () => {
      try {
        const zoom = getConnector(interview.environment_id, 'zoom');
        if (zoom && interview.meeting_id) await zoom.cancelMeeting(interview.meeting_id);
      } catch (e) { console.warn('[Connectors] Meeting cancel failed:', e.message); }
    });
  }
  res.json({ deleted: true });
});

module.exports = router;
