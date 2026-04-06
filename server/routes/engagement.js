// server/routes/engagement.js
// Candidate Engagement Score — computed from comms, interviews, offers, pipeline, profile

const express = require('express');
const router  = express.Router();
const { query, findOne } = require('../db/init');

const W = {
  comms:          0.35,
  process:        0.30,
  responsiveness: 0.20,
  profile:        0.15,
};

const daysSince = (dateStr) => {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
};

const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));

function scoreComms(comms) {
  if (!comms.length) return { score: 0, details: ['No communications recorded'] };
  const details = [];
  let raw = 0;

  const volScore = Math.min(30, comms.length * 5);
  raw += volScore;
  details.push(`${comms.length} communication${comms.length !== 1 ? 's' : ''} recorded`);

  const inbound = comms.filter(c => c.direction === 'inbound');
  if (inbound.length > 0) {
    raw += Math.min(30, inbound.length * 10);
    details.push(`${inbound.length} inbound message${inbound.length !== 1 ? 's' : ''} (candidate initiated)`);
  }

  const daysAgo = daysSince(comms[0]?.created_at);
  if      (daysAgo <= 3)  { raw += 25; details.push('Contacted within 3 days'); }
  else if (daysAgo <= 7)  { raw += 20; details.push('Contacted within a week'); }
  else if (daysAgo <= 14) { raw += 14; details.push('Contacted within 2 weeks'); }
  else if (daysAgo <= 30) { raw += 8;  details.push('Contacted within 30 days'); }
  else if (daysAgo <= 60) { raw += 3;  details.push(`Last contact ${daysAgo} days ago`); }
  else { details.push(`Last contact ${daysAgo} days ago — consider re-engaging`); }

  const connected = comms.filter(c => c.type === 'call' && ['Connected','connected'].includes(c.outcome));
  const calls     = comms.filter(c => c.type === 'call');
  if (connected.length > 0) { raw += Math.min(15, connected.length * 8); details.push(`${connected.length} call${connected.length !== 1 ? 's' : ''} connected`); }
  else if (calls.length > 0) { raw += 3; details.push(`${calls.length} call attempt${calls.length !== 1 ? 's' : ''} — no answer`); }

  return { score: clamp(raw), details };
}

function scoreProcess(interviews, formResponses, peopleLinks, offers) {
  if (!interviews.length && !formResponses.length && !peopleLinks.length && !offers.length) {
    return { score: 0, details: ['Not yet in any process'] };
  }
  const details = [];
  let raw = 0;

  if (peopleLinks.length > 0) { raw += Math.min(20, peopleLinks.length * 10); details.push(`Linked to ${peopleLinks.length} job / pool${peopleLinks.length !== 1 ? 's' : ''}`); }

  if (interviews.length > 0) {
    raw += 15; details.push(`${interviews.length} interview${interviews.length !== 1 ? 's' : ''} scheduled`);
    const completed = interviews.filter(i => ['completed','done'].includes((i.status||'').toLowerCase()));
    if (completed.length > 0) { raw += Math.min(25, completed.length * 12); details.push(`${completed.length} interview${completed.length !== 1 ? 's' : ''} completed`); }
    const noShows = interviews.filter(i => ['no_show','cancelled','no-show'].includes((i.status||'').toLowerCase()));
    if (noShows.length > 0) { raw -= noShows.length * 8; details.push(`${noShows.length} no-show / cancellation`); }
  }

  if (formResponses.length > 0) { raw += Math.min(20, formResponses.length * 10); details.push(`${formResponses.length} form${formResponses.length !== 1 ? 's' : ''} completed`); }

  if (offers.length > 0) {
    const accepted = offers.find(o => o.status === 'accepted');
    const pending  = offers.find(o => ['sent','pending_approval','approved'].includes(o.status));
    if (accepted)     { raw += 20; details.push('Offer accepted'); }
    else if (pending) { raw += 10; details.push('Offer in progress'); }
    else              { raw += 5;  details.push('Offer issued'); }
  }
  return { score: clamp(raw), details };
}

function scoreResponsiveness(comms) {
  if (!comms.length) return { score: 20, details: ['No data — using baseline'] };
  const details = [];
  let raw = 40;
  const outbound = comms.filter(c => c.direction === 'outbound');
  const inbound  = comms.filter(c => c.direction === 'inbound');

  if (outbound.length > 0 && inbound.length > 0) {
    const replyRate  = Math.min(1, inbound.length / outbound.length);
    raw = 20 + Math.round(replyRate * 40);
    details.push(`Reply rate: ${Math.round(replyRate * 100)}%`);
  } else if (inbound.length > 0) {
    raw = 80; details.push('Candidate proactively reached out');
  } else if (outbound.length > 3) {
    raw = 15; details.push('Multiple outreach attempts with no response');
  }

  if (inbound.length > outbound.length) { raw = Math.min(100, raw + 15); details.push('High inbound engagement'); }
  return { score: clamp(raw), details };
}

function scoreProfile(record, fields) {
  const data = record.data || {};
  const details = [];
  let filled = 0, total = 0;

  const KEY_FIELDS = [
    { key: 'first_name', label: 'First name' }, { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' }, { key: 'current_title', label: 'Current title' },
    { key: 'skills', label: 'Skills' }, { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'source', label: 'Source' },
  ];

  for (const f of KEY_FIELDS) {
    total++;
    const val = data[f.key];
    const hasVal = val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
    if (hasVal) filled++; else details.push(`Missing: ${f.label}`);
  }
  if (fields) {
    for (const f of fields) {
      if (f.is_required && !KEY_FIELDS.find(k => k.key === f.api_key)) {
        total++;
        const val = data[f.api_key];
        const hasVal = val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
        if (hasVal) filled++; else details.push(`Missing: ${f.name}`);
      }
    }
  }
  const score = Math.round((filled / Math.max(1, total)) * 100);
  if (score === 100) details.push('Profile fully complete'); else details.unshift(`${filled}/${total} key fields complete`);
  return { score, details };
}

function grade(score) {
  if (score >= 80) return { label: 'Highly Engaged', color: '#0ca678' };
  if (score >= 60) return { label: 'Engaged',        color: '#3b82f6' };
  if (score >= 40) return { label: 'Moderate',       color: '#f59f00' };
  if (score >= 20) return { label: 'Low Engagement', color: '#f97316' };
  return                  { label: 'Not Engaged',    color: '#e03131' };
}

function computeScore(record_id) {
  const record = findOne('records', r => r.id === record_id);
  if (!record) return null;

  const comms         = query('communications',  c => c.record_id === record_id && !c.deleted_at).sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
  const interviews    = query('interviews',      i => (i.candidate_id === record_id || i.record_id === record_id) && !i.deleted_at);
  const formResponses = query('form_responses',  r => r.record_id === record_id && !r.deleted_at);
  const peopleLinks   = query('people_links',    l => (l.person_record_id === record_id || l.record_id === record_id) && !l.deleted_at);
  const offers        = query('offers',          o => (o.candidate_id === record_id || o.candidate_record_id === record_id) && !o.deleted_at).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const fields        = query('field_definitions', f => f.object_id === record.object_id && !f.deleted_at);

  const commsR  = scoreComms(comms);
  const procR   = scoreProcess(interviews, formResponses, peopleLinks, offers);
  const respR   = scoreResponsiveness(comms);
  const profR   = scoreProfile(record, fields);

  const total = Math.round(commsR.score * W.comms + procR.score * W.process + respR.score * W.responsiveness + profR.score * W.profile);
  const g = grade(total);

  return {
    record_id, score: total, grade: g.label, color: g.color,
    buckets: {
      communications: { score: commsR.score, weight: W.comms,          label: 'Communications Activity', details: commsR.details },
      process:        { score: procR.score,  weight: W.process,        label: 'Process Participation',   details: procR.details },
      responsiveness: { score: respR.score,  weight: W.responsiveness, label: 'Responsiveness',          details: respR.details },
      profile:        { score: profR.score,  weight: W.profile,        label: 'Profile Completeness',    details: profR.details },
    },
    meta: { comms_count: comms.length, interviews_count: interviews.length, forms_count: formResponses.length, links_count: peopleLinks.length, offers_count: offers.length, last_contact: comms[0]?.created_at || null, computed_at: new Date().toISOString() },
  };
}

// GET /api/engagement/:record_id
router.get('/:record_id', (req, res) => {
  try {
    const result = computeScore(req.params.record_id);
    if (!result) return res.status(404).json({ error: 'Record not found' });
    res.json(result);
  } catch (err) { console.error('[engagement]', err.message); res.status(500).json({ error: err.message }); }
});

// GET /api/engagement/batch/scores?record_ids=id1,id2,...
router.get('/batch/scores', (req, res) => {
  try {
    const { record_ids } = req.query;
    if (!record_ids) return res.json({});
    const ids = record_ids.split(',').filter(Boolean);
    const result = {};
    for (const id of ids) {
      const d = computeScore(id);
      if (d) result[id] = { score: d.score, grade: d.grade, color: d.color };
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
