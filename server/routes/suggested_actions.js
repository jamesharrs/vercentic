'use strict';
const express = require('express');
const router  = express.Router();
const { findOne, query } = require('../db/init');

function daysSince(isoDate) {
  if (!isoDate) return Infinity;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

const ACTION_LIBRARY = {
  follow_up_email: { id:'follow_up_email', label:'Send follow-up email', icon:'mail', color:'#3b82f6', cta:'compose_email' },
  schedule_interview: { id:'schedule_interview', label:'Schedule interview', icon:'calendar', color:'#7c3aed', cta:'schedule_interview' },
  create_offer: { id:'create_offer', label:'Create offer', icon:'dollar', color:'#0ca678', cta:'create_offer' },
  add_to_pool: { id:'add_to_pool', label:'Add to talent pool', icon:'users', color:'#e67700', cta:'add_to_pool' },
  complete_profile: { id:'complete_profile', label:'Complete missing fields', icon:'edit', color:'#6b7280', cta:'focus_fields' },
  review_offer: { id:'review_offer', label:'Review pending offer', icon:'fileText', color:'#d97706', cta:'open_offers' },
  chase_offer: { id:'chase_offer', label:'Chase offer response', icon:'mail', color:'#ef4444', cta:'compose_email' },
  move_stage: { id:'move_stage', label:'Move to next stage', icon:'arrowRight', color:'#0891b2', cta:'move_stage' },
  post_job: { id:'post_job', label:'Publish to career site', icon:'globe', color:'#059669', cta:'open_portals' },
  add_interviewers: { id:'add_interviewers', label:'Assign interviewers', icon:'users', color:'#7c3aed', cta:'open_interviews' },
  write_jd: { id:'write_jd', label:'Write job description', icon:'fileText', color:'#1d4ed8', cta:'copilot_prompt', copilot_prompt:'Write a compelling job description for this role.' },
};

function pick(suggestions, max = 4) {
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, max).map(({ priority, ...rest }) => rest);
}

function analyseRecord(record, objectSlug, comms, offers, interviews, links) {
  const suggestions = [];
  const d = record.data || {};

  if (objectSlug === 'people' || objectSlug === 'person') {
    const status = (d.status || '').toLowerCase();
    const lastComm = comms[0]?.sent_at || comms[0]?.created_at;
    const daysSinceComm = daysSince(lastComm);
    const pendingOffer = offers.find(o => o.status === 'sent');
    const pendingApproval = offers.find(o => o.status === 'pending_approval');
    const hasPipeline = links.length > 0;
    const activeLink = links.find(l => l.stage_name && l.workflow_id);

    if (pendingOffer) {
      const expiryDays = pendingOffer.expiry_date ? daysSince(pendingOffer.expiry_date) * -1 : Infinity;
      suggestions.push({ ...ACTION_LIBRARY.chase_offer, description: expiryDays < 3 && expiryDays > 0 ? `Offer expires in ${Math.ceil(expiryDays)} day(s)` : 'Offer sent — awaiting candidate response', priority: expiryDays < 3 ? 100 : 80 });
    }
    if (pendingApproval) suggestions.push({ ...ACTION_LIBRARY.review_offer, description:'Offer is waiting for approval', priority:90 });

    if (!pendingOffer && daysSinceComm > 14 && (status === 'active' || status === 'passive'))
      suggestions.push({ ...ACTION_LIBRARY.follow_up_email, description:`Last contacted ${daysSinceComm} days ago`, priority: daysSinceComm > 30 ? 85 : 60 });
    else if (!pendingOffer && comms.length === 0 && (status === 'active' || status === 'passive'))
      suggestions.push({ ...ACTION_LIBRARY.follow_up_email, description:'No previous communications recorded', priority:70 });

    if (activeLink && !pendingOffer) suggestions.push({ ...ACTION_LIBRARY.move_stage, description:`Currently at: ${activeLink.stage_name}`, priority:55, meta:{ link_id:activeLink.id } });
    if (!hasPipeline && (status === 'active' || status === 'in_process')) suggestions.push({ ...ACTION_LIBRARY.add_to_pool, description:'Not linked to any job or talent pool', priority:50 });

    const inInterviewStage = activeLink?.stage_name?.toLowerCase().includes('interview');
    if (!interviews.length && inInterviewStage) suggestions.push({ ...ACTION_LIBRARY.schedule_interview, description:'Candidate is at interview stage but no interview is scheduled', priority:88 });
    else if (!interviews.length && (status === 'active' || status === 'shortlisted')) suggestions.push({ ...ACTION_LIBRARY.schedule_interview, description:'No interview scheduled yet', priority:45 });

    const missingCore = ['email','phone','location','current_title','skills'].filter(f => !d[f] || (Array.isArray(d[f]) && !d[f].length));
    if (missingCore.length >= 3) suggestions.push({ ...ACTION_LIBRARY.complete_profile, description:`${missingCore.length} important fields are empty`, priority:30 });
    if (!pendingOffer && !pendingApproval && (status === 'finalist' || status === 'offer_ready' || status === 'approved'))
      suggestions.push({ ...ACTION_LIBRARY.create_offer, description:'Candidate is marked as finalist — ready for offer', priority:92 });

  } else if (objectSlug === 'jobs' || objectSlug === 'job') {
    const status = (d.status || '').toLowerCase();
    const daysSinceOpen = daysSince(d.open_date || record.created_at);
    if (status === 'open' && links.length === 0) suggestions.push({ ...ACTION_LIBRARY.follow_up_email, label:'Source candidates', description:'No candidates in the pipeline yet', priority:85, cta:'copilot_prompt', copilot_prompt:'Help me find and source candidates for this role.' });
    if (status === 'draft' && !d.description) suggestions.push({ ...ACTION_LIBRARY.write_jd, description:'Job has no description yet', priority:80 });
    if (status === 'draft' && d.description) suggestions.push({ ...ACTION_LIBRARY.post_job, description:'Job is drafted — publish to your career site', priority:75 });
    if (status === 'open' && daysSinceOpen > 30 && links.length < 3) suggestions.push({ ...ACTION_LIBRARY.follow_up_email, label:'Boost sourcing', description:`Open for ${daysSinceOpen} days with only ${links.length} candidate(s)`, priority:70, cta:'copilot_prompt', copilot_prompt:'Help me boost candidate sourcing for this role.' });
    if (!d.hiring_manager) suggestions.push({ ...ACTION_LIBRARY.complete_profile, label:'Assign hiring manager', description:'No hiring manager set', priority:60 });
    if (status === 'open' && !d.interviewers?.length) suggestions.push({ ...ACTION_LIBRARY.add_interviewers, description:'No interviewers assigned', priority:40 });
  } else {
    if (links.length === 0) suggestions.push({ ...ACTION_LIBRARY.add_to_pool, label:'Add first member', description:'Talent pool has no members yet', priority:80 });
    else if (daysSince(record.updated_at) > 21) suggestions.push({ ...ACTION_LIBRARY.follow_up_email, label:'Nurture pool', description:`${links.length} members — last activity ${daysSince(record.updated_at)} days ago`, priority:65, cta:'copilot_prompt', copilot_prompt:'Help me draft a nurture email for this talent pool.' });
  }
  return pick(suggestions, 4);
}

router.get('/:id/suggested-actions', (req, res) => {
  try {
    const { id } = req.params;
    const { environment_id } = req.query;
    const record = findOne('records', r => r.id === id);
    if (!record) return res.status(404).json({ error:'Not found' });
    const objectDef = findOne('objects', o => o.id === record.object_id);
    const objectSlug = (objectDef?.slug || objectDef?.name || '').toLowerCase();
    const comms = query('communications', c => c.record_id === id && !c.deleted_at).sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
    const offers = query('offers', o => (o.candidate_id === id || o.candidate_record_id === id) && !o.deleted_at).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const interviews = query('interviews', i => (i.candidate_id === id || i.record_id === id) && !i.deleted_at && new Date(i.date) >= new Date(Date.now()-7*86400000));
    const links = query('people_links', l => l.person_record_id === id || l.target_record_id === id);
    res.json(analyseRecord(record, objectSlug, comms, offers, interviews, links));
  } catch (err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
