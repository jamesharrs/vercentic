const { hasGlobalAction: _hasGA, hasPermission: _hasPerm, isSuperAdmin: _isSA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
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
const { sendEmail } = require('../services/messaging');

// ── ICS builder ──────────────────────────────────────────────────────────────
function buildICS({ uid, summary, description, location, startISO, endISO, organiserEmail, organiserName, attendeeEmails, rescheduleUrl }) {
  const fmt = (iso) => iso.replace(/[-:]/g,'').replace(/\.\d{3}/,'') + 'Z';
  const start = fmt(startISO);
  const end   = fmt(endISO);
  const now   = fmt(new Date().toISOString());
  const escape = s => (s||'').replace(/[,;\\]/g, m=>'\\'+m).replace(/\n/g,'\\n');
  const attendees = attendeeEmails.map(e =>
    `ATTENDEE;CN=${e};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${e}`
  ).join('\r\n');
  const reschedLine = rescheduleUrl ? `\r\nX-RESCHEDULE-URL:${rescheduleUrl}` : '';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vercentic//Interview//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}@vercentic`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(description)}`,
    location ? `LOCATION:${escape(location)}` : '',
    `ORGANIZER;CN=${escape(organiserName)}:mailto:${organiserEmail}`,
    attendees,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    reschedLine,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
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
  const { person_id } = req.query; // returns interviews where person is candidate OR interviewer
  if (person_id) {
    rows = rows.filter(i => {
      if (i.candidate_id === person_id) return true;
      // Check if person appears in interviewers array (supports both string and object formats)
      const ivList = Array.isArray(i.interviewers) ? i.interviewers : [];
      return ivList.some(iv => (typeof iv === 'string' ? iv : iv?.id) === person_id);
    });
  } else {
    if (candidate_id) rows = rows.filter(i => i.candidate_id === candidate_id);
  }
  if (job_id) rows = rows.filter(i => i.job_id === job_id);
  // RBAC: filter interviews — user must be able to view people object
  const _user = req.currentUser;
  if (_user && !_isSA(_user) && !_hasPerm(_user, 'people', 'view')) rows = [];
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

  // ── FIRE NOTIFICATIONS + SEND ICS EMAILS ────────────────────────────────
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

    // ── Send ICS calendar invite to all attendees ─────────────────────────
    try {
      const { getStore } = require('../db/init');
      const store = getStore();
      const timeStr   = time || '09:00';
      const startISO  = `${date}T${timeStr}:00.000Z`;
      const endISO    = new Date(new Date(startISO).getTime() + (duration || 45) * 60_000).toISOString();
      const fmt       = format || 'Video Call';

      // Collect attendee emails — candidate + all interviewers
      const attendeeEmails = [];

      // Candidate email (look up from record if not passed)
      const candidateRec = resolvedCandidateId
        ? (store.records || []).find(r => r.id === resolvedCandidateId)
        : null;
      const candidateEmail = candidateRec?.data?.email || null;
      if (candidateEmail) attendeeEmails.push(candidateEmail);

      // Interviewer emails from their person records
      const ivList = Array.isArray(interviewers) ? interviewers : [];
      for (const iv of ivList) {
        // iv may be { name, id, email } or just a string name
        const ivEmail = iv.email || null;
        const ivRec   = iv.id ? (store.records || []).find(r => r.id === iv.id) : null;
        const resolvedEmail = ivEmail || ivRec?.data?.email || null;
        if (resolvedEmail && !attendeeEmails.includes(resolvedEmail)) attendeeEmails.push(resolvedEmail);
      }

      if (attendeeEmails.length === 0) {
        console.log('[Interview] No attendee emails found — skipping ICS send');
      } else {
        // Build reschedule URL pointing to the interview record
        const baseUrl = process.env.APP_URL || 'https://client-gamma-ruddy-63.vercel.app';
        const rescheduleUrl = `${baseUrl}/interviews`;

        // Company name for organiser
        const profile = (store.company_profiles || []).find(p => p.environment_id === environment_id);
        const companyName = profile?.name || process.env.SENDGRID_FROM_NAME || 'Vercentic';
        const fromEmail   = process.env.SENDGRID_FROM_EMAIL || 'noreply@vercentic.com';

        const summary = job_name
          ? `Interview: ${resolvedCandidateName} — ${job_name}`
          : `Interview: ${resolvedCandidateName}`;

        const descLines = [
          `Interview Type: ${interview_type_name || 'Interview'}`,
          `Format: ${fmt}`,
          `Duration: ${duration || 45} minutes`,
          notes ? `Notes: ${notes}` : '',
          `Reschedule: ${rescheduleUrl}`,
        ].filter(Boolean);

        const ics = buildICS({
          uid:           rec.id,
          summary,
          description:   descLines.join('\n'),
          location:      fmt === 'In Person' ? (notes || '') : fmt,
          startISO,
          endISO,
          organiserEmail: fromEmail,
          organiserName:  companyName,
          attendeeEmails,
          rescheduleUrl,
        });

        // Email body
        const dateLabel = new Date(`${date}T${timeStr}`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
        const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#4361EE;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Interview Scheduled</h2>
  </div>
  <div style="background:#f8f9fc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">Your interview has been confirmed. Please find the calendar invite attached.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px;width:120px">Candidate</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${resolvedCandidateName}</td></tr>
      ${job_name ? `<tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Role</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${job_name}</td></tr>` : ''}
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Date</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${dateLabel}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Time</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${timeStr}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Format</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${fmt}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Duration</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${duration || 45} minutes</td></tr>
      ${ivList.length ? `<tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Interviewer(s)</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600">${ivList.map(i=>i.name||i).join(', ')}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb">
      <a href="${rescheduleUrl}" style="display:inline-block;background:#4361EE;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">Need to reschedule? →</a>
    </div>
  </div>
</div>`;

        // Send to each attendee
        for (const email of attendeeEmails) {
          await sendEmail({
            to:      email,
            subject: summary,
            html:    htmlBody,
            text:    descLines.join('\n'),
            attachments: [{
              content:     Buffer.from(ics).toString('base64'),
              filename:    'interview.ics',
              type:        'text/calendar',
              disposition: 'attachment',
            }],
          }).catch(e => console.warn(`[Interview] Email to ${email} failed:`, e.message));
        }
        console.log(`[Interview] ICS sent to ${attendeeEmails.length} attendee(s):`, attendeeEmails.join(', '));
      }
    } catch (e) { console.warn('[Interview] ICS email failed:', e.message, e.stack); }
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
