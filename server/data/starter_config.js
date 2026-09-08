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


function buildScreeningAgent(envId, peopleObjId) {
  const now = new Date().toISOString();
  const AGENT_TEMPLATES = require('./agent_templates');
  const tpl = AGENT_TEMPLATES.find(t => t.id === 'tpl_screening_interview');
  return {
    id: uuidv4(),
    name: tpl?.name || 'AI Screening Interview',
    description: tpl?.description || 'Sends the candidate an AI screening interview when they reach the Screening stage.',
    environment_id: envId,
    trigger_type: 'stage_changed',
    trigger_config: { stage_value: 'Screening' },
    conditions: [],
    actions: tpl?.actions || [],
    target_object_id: peopleObjId || null,
    schedule_time: '09:00',
    is_active: 1,
    avatar_icon: tpl?.category_icon || 'filter',
    avatar_color: tpl?.category_color || '#7c3aed',
    run_count: 0,
    sharing: { visibility: 'private', user_ids: [], group_ids: [] },
    agent_scope: 'object',
    scope_object_id: peopleObjId || null,
    created_by: null,
    created_at: now, updated_at: now,
  };
}

const ADDITIONAL_WORKFLOWS = [
  {
    name: 'Standard Application Process',
    description: 'Full-cycle recruiting workflow for most roles.',
    stages: [
      { name:'Applied',             color:'#6b7280' },
      { name:'CV Review',           color:'#3b82f6' },
      { name:'Phone Screen',        color:'#8b5cf6' },
      { name:'Technical Interview', color:'#f59e0b' },
      { name:'Final Interview',     color:'#ec4899' },
      { name:'Offer',               color:'#06b6d4' },
      { name:'Hired',               color:'#10b981' },
      { name:'Not Suitable',        color:'#ef4444' },
    ],
  },
  {
    name: 'Executive Track',
    description: 'Senior and executive search process.',
    stages: [
      { name:'Identified',         color:'#6b7280' },
      { name:'Initial Briefing',   color:'#3b82f6' },
      { name:'Long List',          color:'#8b5cf6' },
      { name:'Short List',         color:'#f59e0b' },
      { name:'1st Interview',      color:'#ec4899' },
      { name:'2nd Interview',      color:'#06b6d4' },
      { name:'Board Interview',    color:'#a855f7' },
      { name:'Assessment Centre',  color:'#f97316' },
      { name:'Offer',              color:'#0ea5e9' },
      { name:'Hired',              color:'#10b981' },
    ],
  },
  {
    name: 'Technical Engineering Process',
    description: 'Structured technical hiring with coding assessments.',
    stages: [
      { name:'Applied',            color:'#6b7280' },
      { name:'CV Screen',          color:'#3b82f6' },
      { name:'Recruiter Call',     color:'#8b5cf6' },
      { name:'Technical Screen',   color:'#f59e0b' },
      { name:'Take-Home Task',     color:'#ec4899' },
      { name:'Technical Interview',color:'#06b6d4' },
      { name:'Culture Fit',        color:'#a855f7' },
      { name:'Final Interview',    color:'#f97316' },
      { name:'Offer',              color:'#0ea5e9' },
      { name:'Hired',              color:'#10b981' },
    ],
  },
  {
    name: 'Graduate Scheme',
    description: 'Campus and early-careers recruitment pipeline.',
    stages: [
      { name:'Applied',            color:'#6b7280' },
      { name:'Application Review', color:'#3b82f6' },
      { name:'Online Assessment',  color:'#8b5cf6' },
      { name:'Group Exercise',     color:'#f59e0b' },
      { name:'Video Interview',    color:'#ec4899' },
      { name:'Assessment Centre',  color:'#06b6d4' },
      { name:'Final Interview',    color:'#a855f7' },
      { name:'Offer',              color:'#0ea5e9' },
      { name:'Hired',              color:'#10b981' },
    ],
  },
];

function buildAdditionalWorkflows(envId, jobsObjId) {
  const now = new Date().toISOString();
  const workflows = [];
  const steps = [];
  ADDITIONAL_WORKFLOWS.forEach(wf => {
    const wfId = uuidv4();
    workflows.push({
      id:wfId, environment_id:envId,
      name:wf.name, description:wf.description,
      object_id:jobsObjId||null, workflow_type:'people_link', type:'people_link',
      status:'active', is_active:1, trigger_type:'manual',
      created_at:now, updated_at:now,
    });
    wf.stages.forEach((stage, i) => {
      steps.push({
        id:uuidv4(), workflow_id:wfId, name:stage.name, color:stage.color,
        order:i, automation_type:null, automation_config:null,
        created_at:now, updated_at:now,
      });
    });
  });
  return { workflows, steps };
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

    const { workflows: extraWfs, steps: extraSteps } = buildAdditionalWorkflows(envId, jobsObj?.id);
    store.workflows.push(...extraWfs);
    store.workflow_steps.push(...extraSteps);

    if(!store.portals) store.portals=[];
    store.portals.push(buildCareerSitePortal(envId, companyName));

    if(poolsObj){
      if(!store.records) store.records=[];
      const pool=buildDefaultPool(envId, poolsObj.id);
      if(pool) store.records.push(pool);
    }

    if(!store.forms) store.forms=[];
    store.forms.push(buildScorecardForm(envId));

    // Seed the AI Screening Interview agent, active by default, scoped to People
    if(!store.agents) store.agents=[];
    const existingScreeningAgent = store.agents.find(a => a.environment_id===envId && a.trigger_type==='stage_changed' && a.trigger_config?.stage_value==='Screening');
    if(!existingScreeningAgent){
      store.agents.push(buildScreeningAgent(envId, peopleObj?.id));
    }

    // Seed stage categories so dashboards (Screening, Interviews, Offers, Onboarding) work
    const DEFAULT_STAGE_CATEGORIES = [
      { name:'New',            color:'#3B82F6', icon:'inbox',        sort_order:0,  is_system:true, is_terminal:false },
      { name:'Screening',      color:'#F59E0B', icon:'filter',       sort_order:1,  is_system:true, is_terminal:false },
      { name:'Assessment',     color:'#8B5CF6', icon:'clipboard',    sort_order:2,  is_system:true, is_terminal:false },
      { name:'Interviewing',   color:'#6366F1', icon:'users',        sort_order:3,  is_system:true, is_terminal:false },
      { name:'Reference Check',color:'#0891B2', icon:'search',       sort_order:4,  is_system:true, is_terminal:false },
      { name:'Offer',          color:'#06B6D4', icon:'file-text',    sort_order:5,  is_system:true, is_terminal:false },
      { name:'Pre-boarding',   color:'#14B8A6', icon:'calendar',     sort_order:6,  is_system:true, is_terminal:false },
      { name:'Placed',         color:'#10B981', icon:'check',        sort_order:7,  is_system:true, is_terminal:true  },
      { name:'Not Suitable',   color:'#EF4444', icon:'x-circle',     sort_order:8,  is_system:true, is_terminal:true  },
      { name:'Withdrawn',      color:'#6B7280', icon:'minus-circle', sort_order:9,  is_system:true, is_terminal:true  },
      { name:'Offer Declined', color:'#F97316', icon:'x-circle',     sort_order:10, is_system:true, is_terminal:true  },
      { name:'Talent Pool',    color:'#A855F7', icon:'users',        sort_order:11, is_system:true, is_terminal:false },
      { name:'On Hold',        color:'#94A3B8', icon:'pause',        sort_order:12, is_system:true, is_terminal:false },
    ];
    const { v4: scUuid } = require('uuid');
    const now2 = new Date().toISOString();
    if (!store.stage_categories) store.stage_categories = [];
    const existingCats = store.stage_categories.filter(c => c.environment_id === envId);
    if (existingCats.length === 0) {
      DEFAULT_STAGE_CATEGORIES.forEach(cat => {
        store.stage_categories.push({ id: scUuid(), environment_id: envId, ...cat, created_at: now2, updated_at: now2 });
      });
    }

    // Seed default panel layout config so record detail panels match the designed order
    if (!store.panel_layouts) store.panel_layouts = [];
    // These match getDefaultPanelOrder() in Records.jsx v18 — left col always ['fields']
    const PEOPLE_PANEL_ORDER = ['tasks','linked','coordination','comms','notes','attachments','forms','activity','agents','match','assessments','engagement'];
    const JOBS_PANEL_ORDER   = ['insights','match','interview_plan','coordination','questions','scorecard','job_tasks','tasks','notes','attachments','forms','agents','comms','bias_scan','activity'];
    if (!store.panel_layouts.find(p => p.environment_id === envId && p.object_slug === 'people')) {
      store.panel_layouts.push({ id: scUuid(), environment_id: envId, object_slug: 'people', panel_order: PEOPLE_PANEL_ORDER, created_at: now2, updated_at: now2 });
    }
    if (!store.panel_layouts.find(p => p.environment_id === envId && p.object_slug === 'jobs')) {
      store.panel_layouts.push({ id: scUuid(), environment_id: envId, object_slug: 'jobs', panel_order: JOBS_PANEL_ORDER, created_at: now2, updated_at: now2 });
    }

    const envIdx=(store.environments||[]).findIndex(e=>e.id===envId);
    if(envIdx!==-1){
      store.environments[envIdx].starter_config_applied=true;
      store.environments[envIdx].starter_config_applied_at=new Date().toISOString();
    }
    saveStoreNow(tenantSlug);
    console.log(`[starter] Applied to tenant "${tenantSlug}": ${templates.length} templates, ${steps.length} pipeline stages, career site, scorecard, AI Screening Interview agent (active)`);
  });
}

module.exports = { applyStarterConfig, HIRING_STAGES, buildScreeningAgent };
