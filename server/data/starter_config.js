// server/data/starter_config.js
// Seeds every new provisioned environment with working defaults:
// hiring workflow, email templates, career site portal, talent pool, scorecard form.
const { v4: uuidv4 } = require('uuid');

const HIRING_STAGES = [
  { name:'Applied',             color:'#6b7280', order:0 },
  { name:'Screening',           color:'#3b82f6', order:1 },
  { name:'Phone Interview',     color:'#8b5cf6', order:2 },
  { name:'Technical Interview', color:'#f59e0b', order:3 },
  { name:'Final Interview',     color:'#ec4899', order:4 },
  { name:'Offer Sent',          color:'#06b6d4', order:5 },
  { name:'Hired',               color:'#10b981', order:6 },
  { name:'Rejected',            color:'#ef4444', order:7 },
];

function buildEmailTemplates(envId) {
  const now = new Date().toISOString();
  return [
    { id:uuidv4(), environment_id:envId, name:'Application Acknowledgement', category:'candidate',
      subject:'We received your application – {{job_title}}',
      body:`Hi {{first_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}.\n\nWe've received your application and our team will review it carefully. We aim to get back to all candidates within 5–7 business days.\n\nWarm regards,\n{{recruiter_name}}`,
      tags:['acknowledgement'], created_at:now, updated_at:now },
    { id:uuidv4(), environment_id:envId, name:'Interview Invitation', category:'candidate',
      subject:'Interview invitation – {{job_title}} at {{company_name}}',
      body:`Hi {{first_name}},\n\nWe'd love to invite you for an interview for the {{job_title}} role.\n\nDate: {{interview_date}}\nTime: {{interview_time}}\nFormat: {{interview_format}}\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\n{{recruiter_name}}`,
      tags:['interview'], created_at:now, updated_at:now },
    { id:uuidv4(), environment_id:envId, name:'Offer Letter', category:'candidate',
      subject:'Congratulations! Offer of employment – {{job_title}}',
      body:`Hi {{first_name}},\n\nWe're delighted to extend an offer for the position of {{job_title}} at {{company_name}}.\n\nRole: {{job_title}}\nStart date: {{start_date}}\nSalary: {{salary}}\n\nPlease sign and return by {{offer_expiry_date}}.\n\nWarm regards,\n{{recruiter_name}}`,
      tags:['offer'], created_at:now, updated_at:now },
    { id:uuidv4(), environment_id:envId, name:'Application Unsuccessful', category:'candidate',
      subject:'Your application for {{job_title}} at {{company_name}}',
      body:`Hi {{first_name}},\n\nThank you for applying for the {{job_title}} position. After careful consideration, we won't be moving forward with your application at this time.\n\nWe'll keep your details on file and will be in touch if a suitable opportunity arises.\n\nKind regards,\n{{recruiter_name}}`,
      tags:['rejection'], created_at:now, updated_at:now },
    { id:uuidv4(), environment_id:envId, name:'Screening Call Confirmation', category:'candidate',
      subject:'Screening call confirmed – {{job_title}}',
      body:`Hi {{first_name}},\n\nGreat news — we'd like to schedule a brief screening call for the {{job_title}} opportunity.\n\nDate: {{interview_date}}\nTime: {{interview_time}}\nFormat: Phone/Video call\n\nSpeak soon,\n{{recruiter_name}}`,
      tags:['screening'], created_at:now, updated_at:now },
    { id:uuidv4(), environment_id:envId, name:'Hiring Manager Shortlist Brief', category:'internal',
      subject:'Candidate shortlist – {{job_title}}',
      body:`Hi {{hiring_manager_name}},\n\nPlease find below a summary of shortlisted candidates for the {{job_title}} role.\n\n{{candidate_summary}}\n\nPlease let me know your thoughts and preferred interview slots.\n\nBest,\n{{recruiter_name}}`,
      tags:['internal','shortlist'], created_at:now, updated_at:now },
  ];
}

function buildHiringWorkflow(envId, jobsObjId) {
  const now = new Date().toISOString();
  const wfId = uuidv4();
  const workflow = {
    id:wfId, environment_id:envId,
    name:'Candidate Hiring Process',
    description:'Standard end-to-end hiring workflow.',
    object_id:jobsObjId||null, workflow_type:'people_link', type:'people_link',
    status:'active', is_active:1, trigger_type:'manual',
    created_at:now, updated_at:now,
  };
  const steps = HIRING_STAGES.map(stage=>({
    id:uuidv4(), workflow_id:wfId, name:stage.name, color:stage.color,
    order:stage.order, automation_type:null, automation_config:null,
    created_at:now, updated_at:now,
  }));
  // Auto-acknowledge on first step
  if(steps[0]){
    steps[0].automation_type='send_email';
    steps[0].automation_config=JSON.stringify({ template:'Application Acknowledgement', recipient_mode:'record_field', recipient_field:'email' });
  }
  return { workflow, steps };
}

function buildCareerSitePortal(envId, companyName) {
  const now = new Date().toISOString();
  return {
    id:uuidv4(), environment_id:envId,
    name:`${companyName||'Company'} Career Site`, slug:'/careers',
    description:'Public-facing job board and application portal.',
    type:'career_site', status:'published',
    theme:{ company_name:companyName||'Our Company', tagline:'Find your next opportunity', primary:'#4361EE', secondary:'#0D0D0F', background:'#ffffff', font:'DM Sans, sans-serif' },
    pages:[{ id:'home', name:'Jobs', type:'job_board', config:{ show_search:true, show_department_filter:true } }],
    nav:{ links:[{label:'Jobs',href:'#jobs'}] },
    footer:{ text:`© ${new Date().getFullYear()} ${companyName||'Company'}. All rights reserved.` },
    gdpr:{ enabled:false }, deleted_at:null, created_at:now, updated_at:now,
  };
}

function buildDefaultPool(envId, poolsObjId) {
  if(!poolsObjId) return null;
  const now = new Date().toISOString();
  return { id:uuidv4(), object_id:poolsObjId, environment_id:envId,
    data:{ pool_name:'Active Candidates', description:'Candidates in active hiring processes.', category:'Hiring', status:'Active' },
    created_by:'system', created_at:now, updated_at:now, deleted_at:null };
}

function buildScorecardForm(envId) {
  const now = new Date().toISOString();
  return {
    id:uuidv4(), environment_id:envId,
    name:'Interview Scorecard', description:'Structured interview feedback form.',
    category:'interview', applies_to:['people'], is_confidential:true, status:'active',
    fields:[
      { id:uuidv4(), label:'Overall recommendation', field_type:'select', required:true, options:['Strong Yes','Yes','No','Strong No'], order:0 },
      { id:uuidv4(), label:'Communication skills',   field_type:'rating', required:true, order:1 },
      { id:uuidv4(), label:'Technical competency',   field_type:'rating', required:true, order:2 },
      { id:uuidv4(), label:'Cultural fit',           field_type:'rating', required:true, order:3 },
      { id:uuidv4(), label:'Key strengths',  field_type:'textarea', required:true,  order:4, placeholder:'What stood out positively?' },
      { id:uuidv4(), label:'Areas of concern',field_type:'textarea', required:false, order:5, placeholder:'Any gaps or concerns?' },
      { id:uuidv4(), label:'Additional notes',field_type:'textarea', required:false, order:6 },
    ],
    created_at:now, updated_at:now,
  };
}

async function applyStarterConfig(tenantSlug, environment, objects, clientData={}) {
  const { getStore, saveStoreNow, tenantStorage } = require('../db/init');
  const envId = environment.id;
  const companyName = clientData.name || environment.name?.replace(/(Production|Staging|Dev|UAT)$/i,'').trim() || 'Company';
  const peopleObj = objects.find(o=>o.slug==='people');
  const jobsObj   = objects.find(o=>o.slug==='jobs');
  const poolsObj  = objects.find(o=>o.slug==='talent-pools'||o.slug==='talent_pools');

  await tenantStorage.run(tenantSlug, async () => {
    const store = getStore();
    if(!store.email_templates) store.email_templates=[];
    const templates = buildEmailTemplates(envId);
    store.email_templates.push(...templates);

    if(!store.workflows) store.workflows=[];
    if(!store.workflow_steps) store.workflow_steps=[];
    const { workflow, steps } = buildHiringWorkflow(envId, jobsObj?.id);
    store.workflows.push(workflow);
    store.workflow_steps.push(...steps);

    if(!store.portals) store.portals=[];
    store.portals.push(buildCareerSitePortal(envId, companyName));

    if(poolsObj){
      if(!store.records) store.records=[];
      const pool=buildDefaultPool(envId, poolsObj.id);
      if(pool) store.records.push(pool);
    }

    if(!store.forms) store.forms=[];
    store.forms.push(buildScorecardForm(envId));

    const envIdx=(store.environments||[]).findIndex(e=>e.id===envId);
    if(envIdx!==-1){
      store.environments[envIdx].starter_config_applied=true;
      store.environments[envIdx].starter_config_applied_at=new Date().toISOString();
    }
    saveStoreNow(tenantSlug);
    console.log(`[starter] Applied to tenant "${tenantSlug}": ${templates.length} templates, ${steps.length} pipeline stages, career site, scorecard`);
  });
}

module.exports = { applyStarterConfig, HIRING_STAGES };
