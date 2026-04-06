const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore } = require('../db/init');
const { sendEmail } = require('../services/messaging');

// ── Token helpers ─────────────────────────────────────────────────────────────
const SECRET = process.env.RESCHEDULE_SECRET || 'vercentic-resch-2026';
function makeToken(interviewId, role) {
  return crypto.createHmac('sha256', SECRET).update(`${interviewId}:${role}`).digest('hex').slice(0,32);
}
function verifyToken(interviewId, role, token) {
  return makeToken(interviewId, role) === token;
}

// ── GET /api/reschedule/:id/:token — load interview info (public, no auth) ───
router.get('/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { role } = req.query; // candidate | interviewer
  const iv = findOne('interviews', i => i.id === id);
  if (!iv) return res.status(404).json({ error: 'Interview not found' });

  const validRole = ['candidate','interviewer'].includes(role) ? role : 'candidate';
  if (!verifyToken(id, validRole, token)) return res.status(403).json({ error: 'Invalid or expired link' });

  // Return safe subset of interview data
  res.json({
    id: iv.id,
    date: iv.date,
    time: iv.time,
    duration: iv.duration || 45,
    format: iv.format || 'Video Call',
    candidate_name: iv.candidate_name,
    job_name: iv.job_name,
    interview_type_name: iv.interview_type_name,
    status: iv.status || 'pending',
    proposed_slots: iv.proposed_slots || [],
    proposed_by: iv.proposed_by || null,
    role: validRole,
  });
});

// ── POST /api/reschedule/:id/:token/propose — propose new time slots ─────────
router.post('/:id/:token/propose', async (req, res) => {
  const { id, token } = req.params;
  const { role, slots, name } = req.body; // slots = [{date,time}]
  const validRole = ['candidate','interviewer'].includes(role) ? role : 'candidate';
  if (!verifyToken(id, validRole, token)) return res.status(403).json({ error: 'Invalid link' });

  const iv = findOne('interviews', i => i.id === id);
  if (!iv) return res.status(404).json({ error: 'Interview not found' });
  if (!slots?.length) return res.status(400).json({ error: 'At least one slot required' });

  // Save proposed slots
  update('interviews', i => i.id === id, {
    ...iv,
    proposed_slots: slots,
    proposed_by: validRole,
    status: 'rescheduling',
  });

  // Send email to OTHER party with the proposed slots
  const store    = getStore();
  // X-App-Origin set by Vite proxy preserves the real client origin (localhost in dev, prod domain in prod)
  const _origin = req.headers['x-app-origin'] || req.headers['origin'] || req.headers['referer'] || '';
  const baseUrl = _origin
    ? _origin.replace(/\/+$/, '').split('/').slice(0, 3).join('/')
    : (process.env.APP_URL || 'https://client-gamma-ruddy-63.vercel.app');
  const apiUrl   = process.env.RAILWAY_URL || 'https://talentos-production-4045.up.railway.app';
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@vercentic.com';

  // Determine recipient — if proposer is candidate, notify interviewers and vice-versa
  const otherRole = validRole === 'candidate' ? 'interviewer' : 'candidate';
  const otherToken = makeToken(id, otherRole);
  const confirmUrl  = `${baseUrl}/reschedule/${id}/${otherToken}?role=${otherRole}&phase=confirm`;

  let toEmails = [];
  if (validRole === 'candidate') {
    // Notify interviewers
    const ivList = Array.isArray(iv.interviewers) ? iv.interviewers : [];
    for (const interviewer of ivList) {
      const rec = interviewer.id ? (store.records||[]).find(r=>r.id===interviewer.id) : null;
      const email = interviewer.email || rec?.data?.email;
      if (email) toEmails.push({ email, name: interviewer.name || '' });
    }
  } else {
    // Notify candidate
    const candRec = iv.candidate_id ? (store.records||[]).find(r=>r.id===iv.candidate_id) : null;
    const email = candRec?.data?.email;
    if (email) toEmails.push({ email, name: iv.candidate_name || '' });
  }

  const proposerName = name || (validRole === 'candidate' ? iv.candidate_name : 'The interviewer');

  const slotsHtml = slots.map((s,i) => {
    const d = new Date(`${s.date}T${s.time}`);
    const label = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const timeLabel = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const slotToken = makeToken(`${id}:${i}`, 'slot');
    const chooseUrl = `${baseUrl}/reschedule/${id}/${otherToken}?role=${otherRole}&phase=confirm&pick=${i}`;
    return `<tr>
      <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600">${label} at ${timeLabel}</td>
      <td style="padding:12px 16px;text-align:right">
        <a href="${chooseUrl}" style="display:inline-block;background:#4361EE;color:white;text-decoration:none;padding:8px 16px;border-radius:7px;font-size:13px;font-weight:600">Choose this time →</a>
      </td>
    </tr>`;
  }).join('<tr><td colspan="2" style="padding:0 16px;border-bottom:1px solid #f3f4f6"></td></tr>');

  const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#f79009;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Reschedule Request</h2>
  </div>
  <div style="background:#f8f9fc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      <strong>${proposerName}</strong> has requested to reschedule your interview for <strong>${iv.job_name || 'the role'}</strong>.
    </p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 16px">They have suggested the following times. Please choose one:</p>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden">
      ${slotsHtml}
    </table>
    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">
      Or <a href="${confirmUrl}" style="color:#4361EE">view all options</a> to choose.
    </p>
  </div>
</div>`;

  for (const recipient of toEmails) {
    try {
      await sendEmail({
        to: recipient.email,
        toName: recipient.name,
        subject: `Reschedule request — ${iv.interview_type_name || 'Interview'} with ${proposerName}`,
        html: htmlBody,
        text: `${proposerName} has requested to reschedule. View options: ${confirmUrl}`,
      });
    } catch(e) { console.error('[Reschedule] email error:', e.message); }
  }

  res.json({ ok: true, message: 'Reschedule request sent', slots_count: slots.length });
});

// ── POST /api/reschedule/:id/:token/confirm — confirm a slot ─────────────────
router.post('/:id/:token/confirm', async (req, res) => {
  const { id, token } = req.params;
  const { role, pick_index } = req.body; // pick_index = which slot was chosen (0-based)
  const validRole = ['candidate','interviewer'].includes(role) ? role : 'candidate';
  if (!verifyToken(id, validRole, token)) return res.status(403).json({ error: 'Invalid link' });

  const iv = findOne('interviews', i => i.id === id);
  if (!iv) return res.status(404).json({ error: 'Interview not found' });

  const slots = iv.proposed_slots || [];
  const chosen = slots[pick_index];
  if (!chosen) return res.status(400).json({ error: 'Invalid slot selection' });

  // Cancel original interview
  update('interviews', i => i.id === id, { ...iv, status: 'cancelled', cancelled_reason: 'rescheduled' });

  // Create new interview
  const newInterview = {
    ...iv,
    id: uuidv4(),
    date: chosen.date,
    time: chosen.time,
    status: 'pending',
    proposed_slots: null,
    proposed_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insert('interviews', newInterview);

  // Send confirmation to all parties
  const store    = getStore();
  // X-App-Origin set by Vite proxy preserves the real client origin (localhost in dev, prod domain in prod)
  const _origin = req.headers['x-app-origin'] || req.headers['origin'] || req.headers['referer'] || '';
  const baseUrl = _origin
    ? _origin.replace(/\/+$/, '').split('/').slice(0, 3).join('/')
    : (process.env.APP_URL || 'https://client-gamma-ruddy-63.vercel.app');
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@vercentic.com';

  const d = new Date(`${chosen.date}T${chosen.time}`);
  const dateLabel = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeLabel = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0ca678;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Interview Rescheduled ✓</h2>
  </div>
  <div style="background:#f8f9fc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">Your interview has been rescheduled.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">New Date</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${dateLabel}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Time</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${timeLabel}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Format</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${iv.format || 'Video Call'}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Duration</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${iv.duration || 45} minutes</td></tr>
    </table>
  </div>
</div>`;

  // Collect all attendee emails
  const allEmails = [];
  const candRec = iv.candidate_id ? (store.records||[]).find(r=>r.id===iv.candidate_id) : null;
  if (candRec?.data?.email) allEmails.push(candRec.data.email);
  for (const interviewer of (Array.isArray(iv.interviewers) ? iv.interviewers : [])) {
    const rec = interviewer.id ? (store.records||[]).find(r=>r.id===interviewer.id) : null;
    const email = interviewer.email || rec?.data?.email;
    if (email && !allEmails.includes(email)) allEmails.push(email);
  }

  for (const email of allEmails) {
    try {
      await sendEmail({
        to: email,
        subject: `Interview rescheduled — ${dateLabel} at ${timeLabel}`,
        html: htmlBody,
        text: `Your interview has been rescheduled to ${dateLabel} at ${timeLabel}.`,
      });
    } catch(e) { console.error('[Reschedule confirm] email error:', e.message); }
  }

  res.json({ ok: true, new_interview_id: newInterview.id, date: chosen.date, time: chosen.time });
});

module.exports = router;
module.exports.makeToken = makeToken;
