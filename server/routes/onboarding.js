// server/routes/onboarding.js
// Activation checklist — tracks setup progress per environment.
const express = require('express');
const router  = express.Router();
const { getStore, saveStore } = require('../db/init');

const STEPS = [
  { id:'company_profile',  title:'Set up your company profile',  description:'Add your company name, logo, and branding.',           icon:'building',      cta:'Open Setup Wizard', cta_action:'open_setup_wizard', points:10 },
  { id:'career_site_live', title:'Publish your career site',     description:'Your job board is ready — go live so candidates can find you.', icon:'globe',   cta:'Go to Portals',    cta_action:'navigate:portals',          points:15 },
  { id:'first_job',        title:'Post your first job',          description:'Create an open role so candidates can apply.',         icon:'briefcase',     cta:'Post a Job',       cta_action:'create_job',                points:15 },
  { id:'first_candidate',  title:'Add your first candidate',     description:'Import a CV, add manually, or wait for applications.', icon:'users',         cta:'Add Candidate',    cta_action:'create_person',             points:10 },
  { id:'invite_team',      title:'Invite a team member',         description:'Bring in a colleague — a recruiter or hiring manager.',icon:'user-plus',     cta:'Invite Someone',   cta_action:'navigate:settings_users',   points:15 },
  { id:'email_configured', title:'Connect your email',           description:'Set up SendGrid so you can send emails directly.',    icon:'mail',          cta:'Configure Email',  cta_action:'navigate:settings_integrations', points:20 },
  { id:'first_hire',       title:'Make your first hire',         description:'Move a candidate to the Hired stage.',                icon:'check-circle',  cta:'View Candidates',  cta_action:'navigate:people',           points:15 },
];

function evaluate(store, envId) {
  const records  = (store.records||[]).filter(r=>r.environment_id===envId&&!r.deleted_at);
  const objects  = (store.objects||[]).filter(o=>o.environment_id===envId&&!o.deleted_at);
  const portals  = (store.portals||[]).filter(p=>p.environment_id===envId&&!p.deleted_at);
  const users    = (store.users||[]).filter(u=>u.environment_id===envId&&!u.deleted_at);
  const links    = (store.people_links||[]).filter(l=>l.environment_id===envId);
  const integ    = store.integration_credentials||{};
  const env      = (store.environments||[]).find(e=>e.id===envId)||{};
  const peopleObj= objects.find(o=>o.slug==='people');
  const jobsObj  = objects.find(o=>o.slug==='jobs');
  const people   = records.filter(r=>r.object_id===peopleObj?.id);
  const jobs     = records.filter(r=>r.object_id===jobsObj?.id);
  const hired    = links.filter(l=>(l.stage_name||'').toLowerCase()==='hired');
  const admins   = users.filter(u=>u.is_super_admin||u.role_name==='Super Admin');
  return {
    company_profile:  !!(env.starter_config_applied||env.setup_wizard_completed||env.company_name),
    career_site_live: portals.some(p=>p.status==='published'),
    first_job:        jobs.length>0,
    first_candidate:  people.length>0,
    invite_team:      users.length>admins.length,
    email_configured: !!(integ.SENDGRID_API_KEY&&!String(integ.SENDGRID_API_KEY).startsWith('YOUR_')),
    first_hire:       hired.length>0,
  };
}

router.get('/:envId', (req,res)=>{
  try {
    const { envId } = req.params;
    const store = getStore();
    const completed = evaluate(store, envId);
    const steps = STEPS.map(s=>({...s, completed:!!completed[s.id]}));
    const earned = steps.reduce((t,s)=>t+(s.completed?s.points:0),0);
    const total  = steps.reduce((t,s)=>t+s.points,0);
    res.json({ environment_id:envId, steps, progress:{
      completed_count:steps.filter(s=>s.completed).length, total_count:steps.length,
      points_earned:earned, points_total:total,
      percentage:Math.round((earned/total)*100), all_done:steps.every(s=>s.completed),
    }});
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/:envId/complete', (req,res)=>{
  try {
    const { envId } = req.params; const { step_id } = req.body;
    if(!step_id) return res.status(400).json({error:'step_id required'});
    const store=getStore();
    const idx=(store.environments||[]).findIndex(e=>e.id===envId);
    if(idx!==-1){
      if(!store.environments[idx].onboarding_completed) store.environments[idx].onboarding_completed={};
      store.environments[idx].onboarding_completed[step_id]=new Date().toISOString();
      if(step_id==='company_profile') store.environments[idx].setup_wizard_completed=true;
      saveStore();
    }
    res.json({ok:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/:envId/dismiss', (req,res)=>{
  try {
    const store=getStore();
    const idx=(store.environments||[]).findIndex(e=>e.id===req.params.envId);
    if(idx!==-1){ store.environments[idx].onboarding_dismissed=true; saveStore(); }
    res.json({ok:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = router;
