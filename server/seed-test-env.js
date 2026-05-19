/**
 * seed-test-env.js
 * 
 * Creates a fully provisioned "Core Recruitment" test environment directly
 * in the local JSON store — no superadmin wizard needed.
 * 
 * Run from the server directory:
 *   node seed-test-env.js
 */

'use strict';
const path = require('path');
// Load env vars so DATA_PATH is respected
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getStore, saveStore } = require('./db/init');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const hashPassword = (pw) => bcrypt.hashSync(pw, 12);
const now = new Date().toISOString();

async function main() {
  // Give the store a moment to initialise
  await new Promise(r => setTimeout(r, 500));

  const s = getStore();

  // ── Check if test env already exists ────────────────────────────────────────
  if (!s.environments) s.environments = [];
  const existing = s.environments.find(e => e.name === 'Demo Environment' && !e.deleted_at);
  if (existing) {
    console.log('✅ Demo Environment already exists — id:', existing.id);
    console.log('   Login: demo@vercentic.com / Demo1234!');
    return;
  }

  // ── Create environment ───────────────────────────────────────────────────────
  const envId = uuidv4();
  const env = {
    id: envId, name: 'Demo Environment', is_default: 0, status: 'active',
    locale: 'en', timezone: 'Asia/Dubai',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.environments.push(env);
  console.log('✓ Environment created:', envId);

  // ── Objects ──────────────────────────────────────────────────────────────────
  if (!s.objects) s.objects = [];
  if (!s.fields)  s.fields  = [];

  const objDefs = [
    {
      slug: 'people', name: 'Person', plural_name: 'People', icon: 'user', color: '#4361EE',
      fields: [
        { name: 'First Name',      api_key: 'first_name',         field_type: 'text',         is_required: true,  show_in_list: true  },
        { name: 'Last Name',       api_key: 'last_name',          field_type: 'text',         is_required: true,  show_in_list: true  },
        { name: 'Email',           api_key: 'email',              field_type: 'email',        is_required: false, show_in_list: true  },
        { name: 'Phone',           api_key: 'phone',              field_type: 'phone',        is_required: false, show_in_list: false },
        { name: 'Current Title',   api_key: 'current_title',      field_type: 'text',         is_required: false, show_in_list: true  },
        { name: 'Location',        api_key: 'location',           field_type: 'text',         is_required: false, show_in_list: true  },
        { name: 'LinkedIn',        api_key: 'linkedin_url',       field_type: 'url',          is_required: false, show_in_list: false },
        { name: 'Person Type',     api_key: 'person_type',        field_type: 'select',       is_required: false, show_in_list: true,
          options: ['Candidate','Employee','Contractor','Consultant','Contact'] },
        { name: 'Status',          api_key: 'status',             field_type: 'select',       is_required: false, show_in_list: true,
          options: ['New','Screening','Interviewing','Offer','Placed','Rejected','On Hold','Withdrawn'] },
        { name: 'Source',          api_key: 'source',             field_type: 'select',       is_required: false, show_in_list: true,
          options: ['LinkedIn','Referral','Job Board','Direct Application','Agency','Career Site','Social Media','Other'] },
        { name: 'Rating',          api_key: 'rating',             field_type: 'rating',       is_required: false, show_in_list: true  },
        { name: 'Notice Period',   api_key: 'notice_period',      field_type: 'text',         is_required: false, show_in_list: false },
        { name: 'Salary Expectation', api_key: 'salary_expectation', field_type: 'currency',  is_required: false, show_in_list: false },
        { name: 'Right to Work',   api_key: 'right_to_work',      field_type: 'select',       is_required: false, show_in_list: false,
          options: ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship','Not Verified'] },
        { name: 'Skills',          api_key: 'skills',             field_type: 'multi_select', is_required: false, show_in_list: false,
          options: ['JavaScript','Python','React','Node.js','SQL','AWS','Product Management','UX Design','Sales','Marketing','Finance','Operations','Leadership'] },
        { name: 'Languages',       api_key: 'languages',          field_type: 'multi_select', is_required: false, show_in_list: false,
          options: ['English','Arabic','French','German','Spanish','Mandarin','Hindi','Urdu'] },
        { name: 'Notes',           api_key: 'notes_text',         field_type: 'textarea',     is_required: false, show_in_list: false },
        { name: 'Job Title',       api_key: 'job_title',          field_type: 'text',         is_required: false, show_in_list: false, condition_field: 'person_type', condition_value: 'Employee' },
        { name: 'Department',      api_key: 'department',         field_type: 'text',         is_required: false, show_in_list: false, condition_field: 'person_type', condition_value: 'Employee' },
        { name: 'Entity',          api_key: 'entity',             field_type: 'text',         is_required: false, show_in_list: false, condition_field: 'person_type', condition_value: 'Employee' },
        { name: 'Employment Type', api_key: 'employment_type',    field_type: 'select',       is_required: false, show_in_list: false,
          options: ['Full-time','Part-time','Contract','Internship'], condition_field: 'person_type', condition_value: 'Employee' },
        { name: 'Start Date',      api_key: 'start_date',         field_type: 'date',         is_required: false, show_in_list: false, condition_field: 'person_type', condition_value: 'Employee' },
        { name: 'End Date',        api_key: 'end_date',           field_type: 'date',         is_required: false, show_in_list: false, condition_field: 'person_type', condition_value: 'Employee' },
      ],
    },
    {
      slug: 'jobs', name: 'Job', plural_name: 'Jobs', icon: 'briefcase', color: '#0CAF77',
      fields: [
        { name: 'Job Title',        api_key: 'job_title',        field_type: 'text',         is_required: true,  show_in_list: true  },
        { name: 'Department',       api_key: 'department',       field_type: 'select',       is_required: false, show_in_list: true,
          options: ['Engineering','Product','Design','Sales','Marketing','Finance','Operations','HR','Legal','Executive','Customer Success','Data'] },
        { name: 'Location',         api_key: 'location',         field_type: 'text',         is_required: false, show_in_list: true  },
        { name: 'Work Type',        api_key: 'work_type',        field_type: 'select',       is_required: false, show_in_list: true,
          options: ['On-site','Hybrid','Remote'] },
        { name: 'Employment Type',  api_key: 'employment_type',  field_type: 'select',       is_required: false, show_in_list: true,
          options: ['Full-time','Part-time','Contract','Internship','Freelance'] },
        { name: 'Status',           api_key: 'status',           field_type: 'select',       is_required: false, show_in_list: true,
          options: ['Draft','Pending Approval','Open','On Hold','Filled','Cancelled'] },
        { name: 'Salary Min',       api_key: 'salary_min',       field_type: 'currency',     is_required: false, show_in_list: false },
        { name: 'Salary Max',       api_key: 'salary_max',       field_type: 'currency',     is_required: false, show_in_list: false },
        { name: 'Currency',         api_key: 'currency',         field_type: 'select',       is_required: false, show_in_list: false,
          options: ['USD','GBP','EUR','AED','SAR','QAR','SGD','INR'] },
        { name: 'Headcount',        api_key: 'headcount',        field_type: 'number',       is_required: false, show_in_list: false },
        { name: 'Target Start Date',api_key: 'target_start_date',field_type: 'date',         is_required: false, show_in_list: false },
        { name: 'Hiring Manager',   api_key: 'hiring_manager',   field_type: 'people',       is_required: false, show_in_list: true, related_object_slug: 'people', people_multi: false },
        { name: 'Recruiter',        api_key: 'recruiter',        field_type: 'people',       is_required: false, show_in_list: true, related_object_slug: 'people', people_multi: false },
        { name: 'Required Skills',  api_key: 'required_skills',  field_type: 'multi_select', is_required: false, show_in_list: false,
          options: ['JavaScript','Python','React','Node.js','SQL','AWS','Product Management','UX Design','Sales','Marketing','Finance','Operations','Leadership'] },
        { name: 'Job Description',  api_key: 'job_description',  field_type: 'textarea',     is_required: false, show_in_list: false },
        { name: 'Priority',         api_key: 'priority',         field_type: 'select',       is_required: false, show_in_list: false,
          options: ['Low','Medium','High','Critical'] },
      ],
    },
    {
      slug: 'talent-pools', name: 'Talent Pool', plural_name: 'Talent Pools', icon: 'users', color: '#C87E8B',
      fields: [
        { name: 'Pool Name',   api_key: 'pool_name',   field_type: 'text',     is_required: true,  show_in_list: true  },
        { name: 'Description', api_key: 'description', field_type: 'textarea', is_required: false, show_in_list: false },
        { name: 'Category',    api_key: 'category',    field_type: 'select',   is_required: false, show_in_list: true,
          options: ['Engineering','Product','Design','Sales','Marketing','Finance','Operations','Executive','General'] },
        { name: 'Focus Area',  api_key: 'focus_area',  field_type: 'text',     is_required: false, show_in_list: true  },
        { name: 'Status',      api_key: 'status',      field_type: 'select',   is_required: false, show_in_list: true,
          options: ['Active','Archived'] },
      ],
    },
  ];

  const objectMap = {};
  objDefs.forEach((objDef, sortOrder) => {
    const objId = uuidv4();
    objectMap[objDef.slug] = objId;
    s.objects.push({
      id: objId, environment_id: envId, slug: objDef.slug,
      name: objDef.name, plural_name: objDef.plural_name,
      icon: objDef.icon, color: objDef.color, is_system: true,
      sort_order: sortOrder, created_at: now, updated_at: now, deleted_at: null,
    });
    objDef.fields.forEach((fDef, i) => {
      s.fields.push({
        id: uuidv4(), environment_id: envId, object_id: objId,
        name: fDef.name, api_key: fDef.api_key, field_type: fDef.field_type,
        is_required: fDef.is_required||false, show_in_list: fDef.show_in_list!==false,
        options: fDef.options||null, related_object_slug: fDef.related_object_slug||null,
        people_multi: fDef.people_multi!==undefined?fDef.people_multi:null,
        condition_field: fDef.condition_field||null, condition_value: fDef.condition_value||null,
        placeholder: '', help_text: '', is_system: true,
        sort_order: i, created_at: now, updated_at: now, deleted_at: null,
      });
    });
  });
  console.log('✓ Objects + fields seeded:', Object.keys(objectMap).join(', '));

  // ── Roles ────────────────────────────────────────────────────────────────────
  if (!s.roles) s.roles = [];
  const roleMap = {};
  [
    { name: 'Super Admin',    slug: 'super_admin',    permissions: { create:true, read:true, edit:true, delete:true, admin:true  }, color: '#7C3AED' },
    { name: 'Recruiter',      slug: 'recruiter',      permissions: { create:true, read:true, edit:true, delete:false,admin:false }, color: '#4361EE' },
    { name: 'Hiring Manager', slug: 'hiring_manager', permissions: { create:false,read:true, edit:false,delete:false,admin:false }, color: '#F79009' },
    { name: 'Viewer',         slug: 'viewer',         permissions: { create:false,read:true, edit:false,delete:false,admin:false }, color: '#9DA8C7' },
  ].forEach(r => {
    const id = uuidv4();
    roleMap[r.slug] = id;
    s.roles.push({ id, environment_id: envId, ...r, is_system: true, created_at: now, updated_at: now, deleted_at: null });
  });
  console.log('✓ Roles seeded');

  // ── Admin user ───────────────────────────────────────────────────────────────
  if (!s.users) s.users = [];
  s.users.push({
    id: uuidv4(), environment_id: envId,
    email: 'demo@vercentic.com', first_name: 'Demo', last_name: 'Admin',
    role_id: roleMap['super_admin'], role_name: 'super_admin',
    password_hash: hashPassword('Demo1234!'),
    status: 'active', auth_provider: 'local', mfa_enabled: false,
    must_change_password: false, login_count: 0, last_login: null,
    created_at: now, updated_at: now, deleted_at: null,
  });
  console.log('✓ Admin user: demo@vercentic.com / Demo1234!');

  // ── Workflows ────────────────────────────────────────────────────────────────
  if (!s.workflows) s.workflows = [];
  const jobsObjId = objectMap['jobs'];
  s.workflows.push({
    id: uuidv4(), environment_id: envId, name: 'Application Pipeline',
    description: 'Standard candidate journey through the hiring process',
    object_id: jobsObjId, workflow_type: 'linked_person', is_active: true,
    sharing: { visibility: 'all' },
    steps: ['Applied','CV Review','Phone Screen','First Interview','Second Interview','Final Interview','Offer','Hired','Rejected','Withdrawn']
      .map((name, i) => ({ id: uuidv4(), name, sort_order: i, automation_type: null, automation_config: {} })),
    created_at: now, updated_at: now, deleted_at: null,
  });
  s.workflows.push({
    id: uuidv4(), environment_id: envId, name: 'Job Status',
    description: 'Tracks job requisition status from creation to close',
    object_id: jobsObjId, workflow_type: 'record_pipeline', is_active: true,
    sharing: { visibility: 'all' },
    steps: ['Draft','Pending Approval','Open','On Hold','Filled','Cancelled']
      .map((name, i) => ({ id: uuidv4(), name, sort_order: i, automation_type: null, automation_config: {} })),
    created_at: now, updated_at: now, deleted_at: null,
  });
  console.log('✓ Workflows seeded: Application Pipeline, Job Status');

  // ── Interview types ──────────────────────────────────────────────────────────
  if (!s.interview_types) s.interview_types = [];
  [
    { name:'Phone Screen', type:'phone', duration_minutes:30, format:'phone', color:'#4361EE', icon_name:'phone' },
    { name:'Video Interview', type:'video', duration_minutes:45, format:'video', color:'#7048E8', icon_name:'video' },
    { name:'Technical Interview', type:'technical', duration_minutes:60, format:'video', color:'#0891B2', icon_name:'code' },
    { name:'Panel Interview', type:'panel', duration_minutes:60, format:'onsite', color:'#F59E0B', icon_name:'users' },
    { name:'Final Interview', type:'final', duration_minutes:45, format:'onsite', color:'#0CAF77', icon_name:'star' },
  ].forEach(t => s.interview_types.push({ id: uuidv4(), environment_id: envId, ...t, buffer_before:5, buffer_after:15, location:'', video_link:'', interviewers:[], availability:{}, created_at:now, updated_at:now, deleted_at:null }));
  console.log('✓ Interview types seeded: 5');

  // ── Forms ────────────────────────────────────────────────────────────────────
  if (!s.forms) s.forms = [];
  s.forms.push({
    id: uuidv4(), environment_id: envId,
    name: 'Phone Screen', description: 'Quick screening form for initial candidate calls',
    category: 'Interview', applies_to: ['people'], sharing: { visibility: 'all' },
    fields: [
      { id:uuidv4(), label:'Overall Impression',    field_type:'select',   required:true,  sort_order:0, options:['Strong Yes','Yes','Maybe','No','Strong No'] },
      { id:uuidv4(), label:'Availability to Start', field_type:'select',   required:false, sort_order:1, options:['Immediately','2 Weeks','1 Month','2 Months','3+ Months','Unknown'] },
      { id:uuidv4(), label:'Salary Expectation',    field_type:'text',     required:false, sort_order:2, placeholder:'e.g. 80,000 AED' },
      { id:uuidv4(), label:'Notice Period',         field_type:'select',   required:false, sort_order:3, options:['Immediately','1 Week','2 Weeks','1 Month','2 Months','3 Months','3+ Months'] },
      { id:uuidv4(), label:'Right to Work',         field_type:'select',   required:false, sort_order:4, options:['Yes','No','Requires Sponsorship','Not Discussed'] },
      { id:uuidv4(), label:'Motivation for Move',   field_type:'textarea', required:false, sort_order:5, placeholder:'Why are they looking to move?' },
      { id:uuidv4(), label:'Key Strengths',         field_type:'textarea', required:false, sort_order:6 },
      { id:uuidv4(), label:'Concerns or Gaps',      field_type:'textarea', required:false, sort_order:7 },
      { id:uuidv4(), label:'Proceed to Next Stage', field_type:'select',   required:true,  sort_order:8, options:['Yes — advance','Yes — address concerns first','No — not suitable','Hold'] },
      { id:uuidv4(), label:'Recruiter Notes',       field_type:'textarea', required:false, sort_order:9 },
    ],
    created_at:now, updated_at:now, deleted_at:null,
  });
  s.forms.push({
    id: uuidv4(), environment_id: envId,
    name: 'Interview Scorecard', description: 'Structured feedback form for interviewers',
    category: 'Interview', applies_to: ['people'], sharing: { visibility: 'all' },
    fields: [
      { id:uuidv4(), label:'Overall Recommendation',    field_type:'select',   required:true,  sort_order:0,  options:['Strong Hire','Hire','No Decision','No Hire','Strong No Hire'] },
      { id:uuidv4(), label:'Overall Rating',            field_type:'rating',   required:true,  sort_order:1  },
      { id:uuidv4(), label:'Communication Skills',      field_type:'select',   required:true,  sort_order:2,  options:['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
      { id:uuidv4(), label:'Technical / Role Knowledge',field_type:'select',   required:true,  sort_order:3,  options:['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
      { id:uuidv4(), label:'Problem Solving',           field_type:'select',   required:false, sort_order:4,  options:['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
      { id:uuidv4(), label:'Cultural Fit',              field_type:'select',   required:true,  sort_order:5,  options:['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
      { id:uuidv4(), label:'Key Strengths',             field_type:'textarea', required:true,  sort_order:6  },
      { id:uuidv4(), label:'Areas of Concern',          field_type:'textarea', required:false, sort_order:7  },
      { id:uuidv4(), label:'Additional Notes',          field_type:'textarea', required:false, sort_order:8  },
    ],
    created_at:now, updated_at:now, deleted_at:null,
  });
  s.forms.push({
    id: uuidv4(), environment_id: envId,
    name: 'Offer Acceptance', description: 'Candidate acknowledgement of job offer',
    category: 'Offer', applies_to: ['people'], sharing: { visibility: 'all' },
    fields: [
      { id:uuidv4(), label:'Decision',             field_type:'select',   required:true,  sort_order:0, options:['Accept','Decline','Negotiating'] },
      { id:uuidv4(), label:'Confirmed Start Date', field_type:'date',     required:false, sort_order:1 },
      { id:uuidv4(), label:'Decline Reason',       field_type:'select',   required:false, sort_order:2, options:['Accepted another offer','Salary not competitive','Role not right fit','Personal reasons','Counter offer accepted','Other'] },
      { id:uuidv4(), label:'Candidate Comments',   field_type:'textarea', required:false, sort_order:3 },
    ],
    created_at:now, updated_at:now, deleted_at:null,
  });
  console.log('✓ Forms seeded: 3');

  // ── File types ───────────────────────────────────────────────────────────────
  if (!s.file_types) s.file_types = [];
  [
    { name:'CV / Resume',    slug:'cv_resume',       color:'#4361EE', icon:'file-text',     allowed_formats:['pdf','doc','docx'], max_size_mb:10, parse_enabled:true,  extract_enabled:false, mappings:[] },
    { name:'Cover Letter',   slug:'cover_letter',    color:'#7048E8', icon:'mail',           allowed_formats:['pdf','doc','docx'], max_size_mb:5,  parse_enabled:false, extract_enabled:false, mappings:[] },
    { name:'Right to Work',  slug:'right_to_work',   color:'#0CAF77', icon:'shield',         allowed_formats:['pdf','jpg','jpeg','png'], max_size_mb:10, parse_enabled:false, extract_enabled:true, mappings:[{extracted_key:'full_name',target_field:'first_name',hint:'Full legal name'},{extracted_key:'nationality',target_field:'nationality',hint:'Nationality'},{extracted_key:'expiry_date',target_field:'rtw_expiry',hint:'Expiry date'}] },
    { name:'ID Document',    slug:'id_document',     color:'#F59E0B', icon:'credit-card',    allowed_formats:['pdf','jpg','jpeg','png'], max_size_mb:10, parse_enabled:false, extract_enabled:true, mappings:[{extracted_key:'full_name',target_field:'first_name',hint:'Full name on ID'},{extracted_key:'nationality',target_field:'nationality',hint:'Nationality'},{extracted_key:'date_of_birth',target_field:'date_of_birth',hint:'DOB'},{extracted_key:'id_number',target_field:'id_number',hint:'ID number'},{extracted_key:'expiry_date',target_field:'id_expiry',hint:'Expiry'}] },
    { name:'Offer Letter',   slug:'offer_letter',    color:'#EF4444', icon:'file',           allowed_formats:['pdf','doc','docx'], max_size_mb:10, parse_enabled:false, extract_enabled:false, mappings:[] },
    { name:'Contract',       slug:'contract',        color:'#334155', icon:'file',           allowed_formats:['pdf','doc','docx'], max_size_mb:20, parse_enabled:false, extract_enabled:false, mappings:[] },
    { name:'Reference Letter',slug:'reference_letter',color:'#9DA8C7',icon:'message-square', allowed_formats:['pdf','doc','docx'], max_size_mb:5,  parse_enabled:false, extract_enabled:false, mappings:[] },
  ].forEach(ft => s.file_types.push({ id:uuidv4(), environment_id:envId, applies_to:['people'], ...ft, description:'', created_at:now, updated_at:now, deleted_at:null }));
  console.log('✓ File types seeded: 7');

  // ── Email templates ──────────────────────────────────────────────────────────
  if (!s.email_templates) s.email_templates = [];
  [
    { name:'Application Received', category:'Application', subject:'We received your application — {{job_title}}',
      body:'Dear {{first_name}},\n\nThank you for applying for the {{job_title}} position. We\'ve received your application and will be in touch if your experience matches what we\'re looking for.\n\nBest regards,\nThe Talent Team' },
    { name:'Interview Invitation', category:'Interview', subject:'Interview Invitation — {{job_title}}',
      body:'Dear {{first_name}},\n\nWe\'d love to invite you to interview for the {{job_title}} role.\n\nDate: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nDuration: {{interview_duration}} minutes\nLocation: {{interview_location}}\n\nPlease confirm your availability.\n\nBest regards,\nThe Talent Team' },
    { name:'Offer Letter Template', category:'Offer', subject:'Job Offer — {{job_title}}',
      body:'Dear {{first_name}},\n\nWe are delighted to offer you the position of {{job_title}}.\n\nStart Date: {{start_date}}\nSalary: {{salary}}\n\nPlease sign and return by {{offer_expiry_date}}.\n\nBest regards,\nThe Talent Team' },
    { name:'Unsuccessful Application', category:'Application', subject:'Your application for {{job_title}}',
      body:'Dear {{first_name}},\n\nThank you for applying for {{job_title}}. After careful consideration, we have decided to move forward with other candidates.\n\nWe encourage you to apply for future positions.\n\nBest regards,\nThe Talent Team' },
    { name:'Interview Confirmation', category:'Interview', subject:'Interview Confirmed — {{job_title}}',
      body:'Dear {{first_name}},\n\nThis confirms your interview for {{job_title}}.\n\nDate: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nLocation: {{interview_location}}\n\nGood luck!\n\nBest regards,\nThe Talent Team' },
  ].forEach(t => s.email_templates.push({ id:uuidv4(), environment_id:envId, ...t, created_at:now, updated_at:now, deleted_at:null }));
  console.log('✓ Email templates seeded: 5');

  // ── Portals ──────────────────────────────────────────────────────────────────
  if (!s.portals) s.portals = [];
  s.portals.push({
    id: uuidv4(), environment_id: envId, name: 'Career Site', slug: 'careers',
    type: 'career_site', status: 'draft', company_name: 'Your Company',
    tagline: 'Find your next opportunity',
    primary_color: '#4361EE', secondary_color: '#3451BE', accent_color: '#0CAF77',
    background_color: '#F8F9FF', text_color: '#0D0D0F', font_family: "'DM Sans', sans-serif",
    logo_url: '', show_apply_button: true, require_auth: false, show_salary: true,
    allow_cv_upload: true, exposed_objects: ['jobs','talent-pools'], access_token: uuidv4(),
    pages: [
      { id:uuidv4(), name:'Home', slug:'/', rows:[
        { id:uuidv4(), preset:'1', bgColor:'#4361EE', padding:'xl', cells:[{ id:uuidv4(), widgetType:'hero', widgetConfig:{ headline:'Join our team', subheading:"Explore opportunities across our growing organisation.", ctaText:'See Open Roles' } }] },
        { id:uuidv4(), preset:'1', bgColor:'', padding:'lg', cells:[{ id:uuidv4(), widgetType:'jobs', widgetConfig:{} }] },
      ]},
      { id:uuidv4(), name:'Apply', slug:'/apply', rows:[
        { id:uuidv4(), preset:'1', bgColor:'', padding:'lg', cells:[{ id:uuidv4(), widgetType:'form', widgetConfig:{ title:'Submit Your Application' } }] },
      ]},
    ],
    created_at:now, updated_at:now, deleted_at:null,
  });
  s.portals.push({
    id: uuidv4(), environment_id: envId, name: 'Hiring Manager Portal', slug: 'hiring',
    type: 'hm_portal', status: 'draft', company_name: 'Talent Team',
    tagline: 'Your hiring dashboard',
    primary_color: '#334155', secondary_color: '#475569', accent_color: '#4361EE',
    background_color: '#F8FAFC', text_color: '#0F172A', font_family: "'DM Sans', sans-serif",
    logo_url: '', show_apply_button: false, require_auth: true, show_salary: true,
    allow_cv_upload: false, exposed_objects: ['jobs','people'], access_token: uuidv4(),
    pages: [
      { id:uuidv4(), name:'Dashboard', slug:'/', rows:[
        { id:uuidv4(), preset:'1', bgColor:'#1E293B', padding:'md', cells:[{ id:uuidv4(), widgetType:'hero', widgetConfig:{ headline:'Hiring Manager Portal', subheading:'Your candidates, interviews and open roles.', ctaText:'View Open Roles' } }] },
        { id:uuidv4(), preset:'1', bgColor:'', padding:'md', cells:[{ id:uuidv4(), widgetType:'jobs', widgetConfig:{} }] },
      ]},
      { id:uuidv4(), name:'Scorecard', slug:'/feedback', rows:[
        { id:uuidv4(), preset:'1', bgColor:'', padding:'lg', cells:[{ id:uuidv4(), widgetType:'form', widgetConfig:{ title:'Interview Scorecard' } }] },
      ]},
    ],
    created_at:now, updated_at:now, deleted_at:null,
  });
  console.log('✓ Portals seeded: Career Site, Hiring Manager Portal');

  // ── Sample records ───────────────────────────────────────────────────────────
  if (!s.records) s.records = [];
  const peopleObjId = objectMap['people'];
  const jobsObjId2  = objectMap['jobs'];
  const poolsObjId  = objectMap['talent-pools'];
  [
    { first_name:'Sarah', last_name:'Mitchell', email:'sarah.mitchell@email.com', current_title:'Senior Product Manager', location:'Dubai, UAE', status:'Screening', source:'LinkedIn', rating:4, person_type:'Candidate', skills:['Product Management','Leadership'] },
    { first_name:'James', last_name:'Chen',     email:'james.chen@email.com',     current_title:'Software Engineer',     location:'London, UK', status:'Interviewing', source:'Referral', rating:5, person_type:'Candidate', skills:['JavaScript','React','Node.js'] },
    { first_name:'Fatima',last_name:'Al-Rashidi',email:'fatima.alrashidi@email.com',current_title:'Marketing Director', location:'Abu Dhabi, UAE',status:'New',  source:'Career Site', rating:3, person_type:'Candidate', skills:['Marketing'] },
    { first_name:'Marcus',last_name:'Thompson', email:'marcus.t@email.com',        current_title:'Data Analyst',         location:'Singapore',  status:'Offer', source:'Job Board', rating:4, person_type:'Candidate', skills:['SQL','Python'] },
    { first_name:'Priya', last_name:'Sharma',   email:'priya.sharma@email.com',    current_title:'UX Designer',          location:'Dubai, UAE', status:'Screening',    source:'LinkedIn', rating:5, person_type:'Candidate', skills:['UX Design'] },
    { first_name:'Ahmed', last_name:'Hassan',   email:'ahmed.hassan@email.com',    current_title:'Operations Lead',      location:'Riyadh, Saudi Arabia',status:'New', source:'Direct Application', rating:3, person_type:'Candidate', skills:['Operations'] },
  ].forEach(d => s.records.push({ id:uuidv4(), object_id:peopleObjId, environment_id:envId, data:d, created_by:null, created_at:now, updated_at:now, deleted_at:null }));

  [
    { job_title:'Senior Software Engineer', department:'Engineering', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:120000, salary_max:180000, currency:'AED', priority:'High'   },
    { job_title:'Product Manager',          department:'Product',     location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:100000, salary_max:160000, currency:'AED', priority:'High'   },
    { job_title:'UX Designer',              department:'Design',      location:'Remote',     work_type:'Remote', employment_type:'Full-time', status:'Open', salary_min:80000,  salary_max:130000, currency:'AED', priority:'Medium' },
    { job_title:'Sales Manager',            department:'Sales',       location:'Riyadh, Saudi Arabia', work_type:'On-site', employment_type:'Full-time', status:'Open', salary_min:90000, salary_max:150000, currency:'SAR', priority:'High' },
    { job_title:'Data Analyst',             department:'Data',        location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Filled', salary_min:70000, salary_max:110000, currency:'AED', priority:'Medium' },
  ].forEach(d => s.records.push({ id:uuidv4(), object_id:jobsObjId2, environment_id:envId, data:d, created_by:null, created_at:now, updated_at:now, deleted_at:null }));

  [
    { pool_name:'Engineering Talent Pool', category:'Engineering', focus_area:'Software, Data, DevOps', status:'Active' },
    { pool_name:'Sales & Commercial',      category:'Sales',       focus_area:'B2B, SaaS, Enterprise',  status:'Active' },
    { pool_name:'Executive Candidates',    category:'Executive',   focus_area:'C-suite, VP, Director',  status:'Active' },
  ].forEach(d => s.records.push({ id:uuidv4(), object_id:poolsObjId, environment_id:envId, data:d, created_by:null, created_at:now, updated_at:now, deleted_at:null }));
  console.log('✓ Sample records: 6 candidates, 5 jobs, 3 talent pools');

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveStore();

  console.log('\n✅ Demo Environment ready!');
  console.log('   Environment ID:', envId);
  console.log('   Login at http://localhost:3000');
  console.log('   Email:    demo@vercentic.com');
  console.log('   Password: Demo1234!');
  console.log('\n   Switch to "Demo Environment" in the environment switcher in Settings.');
}

main().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
