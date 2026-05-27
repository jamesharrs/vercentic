const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!_hasGA(user, action)) { res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } }); return false; }
  return null;
}
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, getStore, saveStore } = require('../db/init');
const { createInterviewMeeting, fireEvent } = require('../services/connectors');
/* global setImmediate */
const crypto = require('crypto');
function makeRescheduleToken(interviewId, role) {
  const secret = process.env.RESCHEDULE_SECRET || 'vercentic-resch-2026';
  return crypto.createHmac('sha256', secret).update(`${interviewId}:${role}`).digest('hex').slice(0, 32);
}

function buildICS({ uid, summary, description, startISO, endISO, attendees = [] }) {
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => (s || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vercentic//Interview//EN',
    'CALSCALE:GREGORIAN','METHOD:REQUEST','BEGIN:VEVENT',
    `UID:${uid}@vercentic.com`,`DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(startISO)}`,`DTEND:${fmt(endISO)}`,
    `SUMMARY:${esc(summary)}`,`DESCRIPTION:${esc(description)}`,
    ...attendees.map(e => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${e}`),
    'STATUS:CONFIRMED','SEQUENCE:0','BEGIN:VALARM','TRIGGER:-PT30M',
    'ACTION:DISPLAY','DESCRIPTION:Interview reminder','END:VALARM','END:VEVENT','END:VCALENDAR',
  ].join('\r\n');
}

function buildEmailHtml({ candidateName, jobName, dateFormatted, timeRange, fmt, duration, notes, rescheduleUrl }) {
  return `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto">
  <div style="background:#4361EE;padding:28px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:700">Interview Scheduled</h1>
  </div>
  <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">Your interview has been confirmed. Please find the calendar invite attached.</p>
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:110px">Candidate</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:600">${candidateName}</td></tr>
      ${jobName ? `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Role</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:600">${jobName}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Date</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:600">${dateFormatted}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Time</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:600">${timeRange} · ${duration} min</td></tr>
      <tr><td style="padding:12px 16px;${notes?'border-bottom:1px solid #e5e7eb;':''}color:#6b7280;font-size:13px">Format</td><td style="padding:12px 16px;${notes?'border-bottom:1px solid #e5e7eb;':''}color:#111827;font-size:13px;font-weight:600">${fmt}</td></tr>
      ${notes ? `<tr><td style="padding:12px 16px;color:#6b7280;font-size:13px;vertical-align:top">Notes</td><td style="padding:12px 16px;color:#374151;font-size:13px;line-height:1.6">${notes.replace(/\n/g,'<br>')}</td></tr>` : ''}
    </table>
    ${rescheduleUrl ? `<div style="margin-top:24px;text-align:center"><a href="${rescheduleUrl}" style="display:inline-block;padding:12px 28px;background:#4361EE;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Need to reschedule? →</a></div>` : ''}
  </div>
</div>`;
}

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
  res.json(rows.sort((a,b) => new Date(`${a.date}T${a.time||'00:00'}`) - new Date(`${b.date}T${b.time||'00:00'}`)));
});

router.post('/', async (req, res) => { // eslint-disable-line require-await
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const { environment_id, interview_type_id, interview_type_name, candidate_id, candidate_name,
          job_id, job_name, date, time, duration, format, interviewers, notes, status, interviewer_emails } = req.body;
  const isAi = (req.body.interviewer_mode === 'ai_agent' || req.body.status === 'ai_pending');
  if (!environment_id) return res.status(400).json({ error: 'environment_id and date required' });
  if (!isAi && !date) return res.status(400).json({ error: 'environment_id and date required' });

  let resolvedCandidateId = candidate_id || null;
  const resolvedCandidateName = candidate_name || '';
  if (!resolvedCandidateId && candidate_name) {
    const store = getStore();
    const nameNorm = candidate_name.toLowerCase().trim();
    const match = (store.records || []).find(r => {
      const d = r.data || {};
      return `${d.first_name||''} ${d.last_name||''}`.trim().toLowerCase() === nameNorm || d.email?.toLowerCase() === nameNorm;
    });
    if (match) { resolvedCandidateId = match.id; }
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

  setImmediate(async () => {
    try {
      const startTime = `${date}T${time || '09:00'}`;
      const endTime = new Date(new Date(startTime).getTime() + (duration || 30) * 60_000).toISOString();
      const topic = `${interview_type_name || 'Interview'}: ${resolvedCandidateName || 'Candidate'}${job_name ? ` — ${job_name}` : ''}`;
      const meeting = await createInterviewMeeting(environment_id, { topic, startTime, endTime, attendees: interviewer_emails || [], agenda: notes || '' });
      if (meeting) {
        const link = meeting.join_url || meeting.teams_url || meeting.meet_link || null;
        update('interviews', i => i.id === rec.id, { meeting_link: link, meeting_provider: meeting.provider, updated_at: new Date().toISOString() });
      }
    } catch (e) { console.warn('[Connectors] Meeting creation failed:', e.message); }
  });

  setImmediate(async () => {
    try {
      const appUrl = process.env.APP_URL || 'https://www.vercentic.com';
      // Use HMAC token — matches the /api/reschedule route's token verification
      const rescheduleToken = makeRescheduleToken(rec.id, 'candidate');
      const rescheduleUrl = `${appUrl}/reschedule/${rec.id}/${rescheduleToken}?role=candidate`;
      const startDT = new Date(`${date}T${time || '09:00'}:00`);
      const endDT = new Date(startDT.getTime() + (duration || 30) * 60_000);
      const dateFormatted = (() => { try { return startDT.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); } catch { return date; } })();
      const fmtTime = (d) => { try { return d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }); } catch { return ''; } };
      const timeRange = `${fmtTime(startDT)} – ${fmtTime(endDT)}`;
      const icsStr = buildICS({
        uid: rec.id,
        summary: `Interview: ${resolvedCandidateName}${job_name ? ` — ${job_name}` : ''}`,
        description: [`Candidate: ${resolvedCandidateName}`, job_name ? `Role: ${job_name}` : '', `Format: ${format || 'Video Call'}`, notes ? `Notes: ${notes}` : '', `Reschedule: ${rescheduleUrl}`].filter(Boolean).join('\n'),
        startISO: startDT.toISOString(), endISO: endDT.toISOString(), attendees: interviewer_emails || [],
      });
      const store2 = getStore();
      const candidateRecord = (store2.records || []).find(r => r.id === rec.candidate_id);
      const candidateEmail = candidateRecord?.data?.email;
      if (candidateEmail) {
        const msg = require('../services/messaging');
        await msg.sendEmail({
          to: candidateEmail, toName: resolvedCandidateName,
          subject: `Interview: ${resolvedCandidateName}${job_name ? ` — ${job_name}` : ''}`,
          text: `Interview confirmed.\n\nCandidate: ${resolvedCandidateName}${job_name ? `\nRole: ${job_name}` : ''}\nDate: ${dateFormatted}\nTime: ${timeRange}\nFormat: ${format || 'Video Call'}${notes ? `\n\nNotes:\n${notes}` : ''}\n\nReschedule: ${rescheduleUrl}`,
          html: buildEmailHtml({ candidateName: resolvedCandidateName, jobName: job_name, dateFormatted, timeRange, fmt: format || 'Video Call', duration: duration || 30, notes: notes || '', rescheduleUrl }),
          attachments: [{ filename: 'interview.ics', content: Buffer.from(icsStr).toString('base64'), type: 'text/calendar' }],
        });
      }
      await fireEvent(environment_id, 'interview_scheduled', { candidateName: resolvedCandidateName, jobTitle: job_name, date, time: time || '09:00', format: format || 'Video Call', notes: notes || '', interviewers: interviewers || [] });
    } catch (e) { console.warn('[Interviews] Notification failed:', e.message); }
  });

  res.status(201).json(rec);
});

// ── /:id wildcards AFTER named routes ─────────────────────────────────────────
router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const fields = ['date','time','status','notes','interviewers','candidate_id','candidate_name','job_id','job_name','meeting_link','meeting_provider'];
  const updates = { updated_at: new Date().toISOString() };
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const rec = update('interviews', i => i.id === req.params.id, updates);
  rec ? res.json(rec) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', async (req, res) => { // eslint-disable-line require-await
  if (_checkGA(req, res, 'manage_interviews') === false) return;
  ensure();
  const interview = query('interviews', i => i.id === req.params.id)?.[0];
  update('interviews', i => i.id === req.params.id, { deleted_at: new Date().toISOString() });
  if (interview?.meeting_link && interview?.meeting_provider === 'zoom') {
    const { getConnector } = require('../services/connectors');
    setImmediate(async () => {
      try { const zoom = getConnector(interview.environment_id, 'zoom'); if (zoom && interview.meeting_id) await zoom.cancelMeeting(interview.meeting_id); } catch (e) {}
    });
  }
  res.json({ deleted: true });
});

module.exports = router;
