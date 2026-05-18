'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto  = require('crypto');
const { getStore, saveStore, tenantStorage, provisionTenant, loadTenantStore } = require('../db/init');

const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

function ensureCollections() {
  const s = getStore();
  if (!s.clients)             { s.clients = [];             saveStore(); }
  if (!s.client_environments) { s.client_environments = []; saveStore(); }
  if (!s.provision_log)       { s.provision_log = [];       saveStore(); }
}

// ─── Shared default roles ─────────────────────────────────────────────────────
// Slugs MUST match rbac.js roleDefaults keys so seedDefaultPermissions works.
const DEFAULT_ROLES = [
  { name: 'Super Admin',    slug: 'super_admin',    color: '#e03131', is_system: 1, description: 'Full access to everything' },
  { name: 'Admin',          slug: 'admin',          color: '#f59f00', is_system: 1, description: 'Manage users, settings and all data' },
  { name: 'Recruiter',      slug: 'recruiter',      color: '#4361EE', is_system: 1, description: 'Manage candidates, jobs and talent pools' },
  { name: 'Hiring Manager', slug: 'hiring_manager', color: '#0ca678', is_system: 1, description: 'View and provide feedback on candidates' },
  { name: 'Read Only',      slug: 'read_only',      color: '#868e96', is_system: 1, description: 'View data only, no edits' },
];

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = {
  core_recruitment: {
    label: 'Core Recruitment',
    description: 'People, Jobs and Talent Pools with standard recruitment fields, workflows, portals and forms',
    icon: 'users',
    default_roles: DEFAULT_ROLES,
    objects: [
      {
        slug: 'people', name: 'Person', plural_name: 'People', icon: 'user', color: '#4361EE', is_system: true,
        fields: [
          { name: 'First Name',      api_key: 'first_name',      field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Last Name',       api_key: 'last_name',       field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Email',           api_key: 'email',           field_type: 'email',    is_required: false, show_in_list: true  },
          { name: 'Phone',           api_key: 'phone',           field_type: 'phone',    is_required: false, show_in_list: false },
          { name: 'Current Title',   api_key: 'current_title',   field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Location',        api_key: 'location',        field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'LinkedIn',        api_key: 'linkedin_url',    field_type: 'url',      is_required: false, show_in_list: false },
          { name: 'Person Type',     api_key: 'person_type',     field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Candidate','Employee','Contractor','Consultant','Contact'] },
          { name: 'Status',          api_key: 'status',          field_type: 'select',   is_required: false, show_in_list: true,
            options: ['New','Screening','Interviewing','Offer','Placed','Rejected','On Hold','Withdrawn'] },
          { name: 'Source',          api_key: 'source',          field_type: 'select',   is_required: false, show_in_list: true,
            options: ['LinkedIn','Referral','Job Board','Direct Application','Agency','Career Site','Social Media','Other'] },
          { name: 'Rating',          api_key: 'rating',          field_type: 'rating',   is_required: false, show_in_list: true  },
          { name: 'Notice Period',   api_key: 'notice_period',   field_type: 'text',     is_required: false, show_in_list: false },
          { name: 'Salary Expectation', api_key: 'salary_expectation', field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Right to Work',   api_key: 'right_to_work',   field_type: 'select',   is_required: false, show_in_list: false,
            options: ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship','Not Verified'] },
          { name: 'Skills',          api_key: 'skills',          field_type: 'multi_select', is_required: false, show_in_list: false,
            options: ['JavaScript','Python','React','Node.js','SQL','AWS','Product Management','UX Design','Sales','Marketing','Finance','Operations','Leadership','Arabic','French'] },
          { name: 'Languages',       api_key: 'languages',       field_type: 'multi_select', is_required: false, show_in_list: false,
            options: ['English','Arabic','French','German','Spanish','Mandarin','Hindi','Urdu'] },
          { name: 'Notes',           api_key: 'notes_text',      field_type: 'textarea', is_required: false, show_in_list: false },
          { name: 'Job Title',       api_key: 'job_title',       field_type: 'text',     is_required: false, show_in_list: false,
            condition_field: 'person_type', condition_value: 'Employee' },
          { name: 'Department',      api_key: 'department',      field_type: 'text',     is_required: false, show_in_list: false,
            condition_field: 'person_type', condition_value: 'Employee' },
          { name: 'Entity',          api_key: 'entity',          field_type: 'text',     is_required: false, show_in_list: false,
            condition_field: 'person_type', condition_value: 'Employee' },
          { name: 'Employment Type', api_key: 'employment_type', field_type: 'select',   is_required: false, show_in_list: false,
            options: ['Full-time','Part-time','Contract','Internship'],
            condition_field: 'person_type', condition_value: 'Employee' },
          { name: 'Start Date',      api_key: 'start_date',      field_type: 'date',     is_required: false, show_in_list: false,
            condition_field: 'person_type', condition_value: 'Employee' },
          { name: 'End Date',        api_key: 'end_date',        field_type: 'date',     is_required: false, show_in_list: false,
            condition_field: 'person_type', condition_value: 'Employee' },
        ],
      },
      {
        slug: 'jobs', name: 'Job', plural_name: 'Jobs', icon: 'briefcase', color: '#0CAF77', is_system: true,
        fields: [
          { name: 'Job Title',        api_key: 'job_title',        field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Department',       api_key: 'department',       field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Engineering','Product','Design','Sales','Marketing','Finance','Operations','HR','Legal','Executive','Customer Success','Data'] },
          { name: 'Location',         api_key: 'location',         field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Work Type',        api_key: 'work_type',        field_type: 'select',   is_required: false, show_in_list: true,
            options: ['On-site','Hybrid','Remote'] },
          { name: 'Employment Type',  api_key: 'employment_type',  field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Full-time','Part-time','Contract','Internship','Freelance'] },
          { name: 'Status',           api_key: 'status',           field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Draft','Pending Approval','Open','On Hold','Filled','Cancelled'] },
          { name: 'Salary Min',       api_key: 'salary_min',       field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Salary Max',       api_key: 'salary_max',       field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Currency',         api_key: 'currency',         field_type: 'select',   is_required: false, show_in_list: false,
            options: ['USD','GBP','EUR','AED','SAR','QAR','SGD','INR'] },
          { name: 'Headcount',        api_key: 'headcount',        field_type: 'number',   is_required: false, show_in_list: false },
          { name: 'Target Start Date',api_key: 'target_start_date',field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Hiring Manager',   api_key: 'hiring_manager',   field_type: 'people',   is_required: false, show_in_list: true,
            related_object_slug: 'people', people_multi: false },
          { name: 'Recruiter',        api_key: 'recruiter',        field_type: 'people',   is_required: false, show_in_list: true,
            related_object_slug: 'people', people_multi: false },
          { name: 'Required Skills',  api_key: 'required_skills',  field_type: 'multi_select', is_required: false, show_in_list: false,
            options: ['JavaScript','Python','React','Node.js','SQL','AWS','Product Management','UX Design','Sales','Marketing','Finance','Operations','Leadership'] },
          { name: 'Job Description',  api_key: 'job_description',  field_type: 'textarea', is_required: false, show_in_list: false },
          { name: 'Priority',         api_key: 'priority',         field_type: 'select',   is_required: false, show_in_list: false,
            options: ['Low','Medium','High','Critical'] },
        ],
      },
      {
        slug: 'talent-pools', name: 'Talent Pool', plural_name: 'Talent Pools', icon: 'users', color: '#C87E8B', is_system: true,
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
    ],
  },
  agency: {
    label: 'Recruitment Agency',
    description: 'Adds Clients, Placements and Invoices on top of Core Recruitment',
    icon: 'briefcase',
    extends: 'core_recruitment',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'clients_co', name: 'Client Company', plural_name: 'Client Companies', icon: 'building', color: '#EF4444', is_system: false,
        fields: [
          { name: 'Company Name',  api_key: 'company_name',  field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Industry',      api_key: 'industry',      field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Technology','Finance','Healthcare','Retail','Manufacturing','Professional Services','Other'] },
          { name: 'Status',        api_key: 'status',        field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Prospect','Active','On Hold','Former'] },
          { name: 'Account Owner', api_key: 'account_owner', field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Website',       api_key: 'website',       field_type: 'url',      is_required: false, show_in_list: false },
          { name: 'Notes',         api_key: 'notes_text',    field_type: 'textarea', is_required: false, show_in_list: false },
        ],
      },
      {
        slug: 'placements', name: 'Placement', plural_name: 'Placements', icon: 'check-circle', color: '#0CAF77', is_system: false,
        fields: [
          { name: 'Candidate',  api_key: 'candidate',  field_type: 'people',   is_required: true,  show_in_list: true, related_object_slug: 'people', people_multi: false },
          { name: 'Job Title',  api_key: 'job_title',  field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Start Date', api_key: 'start_date', field_type: 'date',     is_required: false, show_in_list: true  },
          { name: 'Salary',     api_key: 'salary',     field_type: 'currency', is_required: false, show_in_list: true  },
          { name: 'Fee %',      api_key: 'fee_pct',    field_type: 'number',   is_required: false, show_in_list: true  },
          { name: 'Fee Amount', api_key: 'fee_amount', field_type: 'currency', is_required: false, show_in_list: true  },
          { name: 'Status',     api_key: 'status',     field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Pending','Confirmed','Invoiced','Paid','Cancelled'] },
        ],
      },
    ],
  },
  hr_platform: {
    label: 'HR Platform',
    description: 'Employees, Departments and Leave on top of Core Recruitment',
    icon: 'users',
    extends: 'core_recruitment',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'employees', name: 'Employee', plural_name: 'Employees', icon: 'user', color: '#0891B2', is_system: false,
        fields: [
          { name: 'First Name',  api_key: 'first_name',  field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Last Name',   api_key: 'last_name',   field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Employee ID', api_key: 'employee_id', field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Job Title',   api_key: 'job_title',   field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Department',  api_key: 'department',  field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Start Date',  api_key: 'start_date',  field_type: 'date',     is_required: false, show_in_list: true  },
          { name: 'Status',      api_key: 'status',      field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Active','On Leave','Terminated'] },
          { name: 'Salary',      api_key: 'salary',      field_type: 'currency', is_required: false, show_in_list: false },
        ],
      },
      {
        slug: 'leave_requests', name: 'Leave Request', plural_name: 'Leave Requests', icon: 'calendar', color: '#F59E0B', is_system: false,
        fields: [
          { name: 'Employee',   api_key: 'employee',   field_type: 'people',   is_required: true,  show_in_list: true, related_object_slug: 'employees', people_multi: false },
          { name: 'Leave Type', api_key: 'leave_type', field_type: 'select',   is_required: true,  show_in_list: true,
            options: ['Annual','Sick','Parental','Unpaid','Other'] },
          { name: 'Start Date', api_key: 'start_date', field_type: 'date',     is_required: true,  show_in_list: true  },
          { name: 'End Date',   api_key: 'end_date',   field_type: 'date',     is_required: true,  show_in_list: true  },
          { name: 'Days',       api_key: 'days',       field_type: 'number',   is_required: false, show_in_list: true  },
          { name: 'Status',     api_key: 'status',     field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Pending','Approved','Rejected','Cancelled'] },
          { name: 'Notes',      api_key: 'notes_text', field_type: 'textarea', is_required: false, show_in_list: false },
        ],
      },
    ],
  },
  rpo_provider: {
    label: 'RPO Provider',
    description: 'Full RPO template with Client Companies, SLA tracking and Placements',
    icon: 'briefcase',
    extends: 'core_recruitment',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'client_companies', name: 'Client Company', plural_name: 'Client Companies', icon: 'building', color: '#EF4444', is_system: false,
        fields: [
          { name: 'Company Name',     api_key: 'company_name',     field_type: 'text',   is_required: true,  show_in_list: true  },
          { name: 'Industry',         api_key: 'industry',         field_type: 'select', is_required: false, show_in_list: true,
            options: ['Technology','Finance','Healthcare','Retail','Manufacturing','Professional Services','Government','Other'] },
          { name: 'Account Status',   api_key: 'account_status',   field_type: 'select', is_required: false, show_in_list: true,
            options: ['Prospect','Active','On Hold','Former'] },
          { name: 'Account Manager',  api_key: 'account_manager',  field_type: 'text',   is_required: false, show_in_list: true  },
          { name: 'Contract Start',   api_key: 'contract_start',   field_type: 'date',   is_required: false, show_in_list: false },
          { name: 'Contract End',     api_key: 'contract_end',     field_type: 'date',   is_required: false, show_in_list: false },
          { name: 'Default SLA Days', api_key: 'default_sla_days', field_type: 'number', is_required: false, show_in_list: true  },
          { name: 'Fee Structure',    api_key: 'fee_structure',    field_type: 'select', is_required: false, show_in_list: false,
            options: ['Fixed Fee','Percentage','Retainer','Hybrid'] },
          { name: 'Brief Status',     api_key: 'brief_status',     field_type: 'select', is_required: false, show_in_list: false,
            options: ['Brief Received','Approved','Sourcing','Shortlisted','Interviewing','Offer Stage','Filled','Cancelled'] },
        ],
      },
    ],
  },
};

// ─── Build template — resolves extends chain ──────────────────────────────────
function buildTemplate(key) {
  const tpl = TEMPLATES[key] || TEMPLATES.core_recruitment;
  let objects = JSON.parse(JSON.stringify(tpl.objects || []));
  if (tpl.extends) {
    const base = TEMPLATES[tpl.extends];
    objects = JSON.parse(JSON.stringify(base.objects || []));
    if (tpl.jobs_extra_fields && tpl.jobs_extra_fields.length) {
      const jobsObj = objects.find(o => o.slug === 'jobs');
      if (jobsObj) jobsObj.fields = [...(jobsObj.fields || []), ...tpl.jobs_extra_fields];
    }
    objects = [...objects, ...(tpl.extra_objects || [])];
  }
  return { objects, roles: tpl.default_roles || DEFAULT_ROLES };
}

// ─── Standard config seeded for every new environment ────────────────────────
function buildStandardConfig(envId, objectMap, now) {
  const jobsObjId = objectMap['jobs'];

  // Workflows
  const workflows = [];
  if (jobsObjId) {
    workflows.push({
      id: uuidv4(), environment_id: envId,
      name: 'Application Pipeline',
      description: 'Standard candidate journey through the hiring process',
      object_id: jobsObjId, workflow_type: 'linked_person', is_active: true,
      sharing: { visibility: 'all' },
      steps: [
        { id: uuidv4(), name: 'Applied',          sort_order: 0, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'CV Review',         sort_order: 1, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Phone Screen',      sort_order: 2, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'First Interview',   sort_order: 3, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Second Interview',  sort_order: 4, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Final Interview',   sort_order: 5, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Offer',             sort_order: 6, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Hired',             sort_order: 7, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Rejected',          sort_order: 8, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Withdrawn',         sort_order: 9, automation_type: null, automation_config: {} },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    });
    workflows.push({
      id: uuidv4(), environment_id: envId,
      name: 'Job Status',
      description: 'Tracks the status of a job requisition from creation to close',
      object_id: jobsObjId, workflow_type: 'record_pipeline', is_active: true,
      sharing: { visibility: 'all' },
      steps: [
        { id: uuidv4(), name: 'Draft',            sort_order: 0, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Pending Approval', sort_order: 1, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Open',             sort_order: 2, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'On Hold',          sort_order: 3, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Filled',           sort_order: 4, automation_type: null, automation_config: {} },
        { id: uuidv4(), name: 'Cancelled',        sort_order: 5, automation_type: null, automation_config: {} },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    });
  }

  // Interview types
  const interviewTypes = [
    { id: uuidv4(), environment_id: envId, name: 'Phone Screen',      type: 'phone',     duration_minutes: 30, format: 'phone',  description: 'Initial screening call to assess basic fit and interest',          color: '#4361EE', icon_name: 'phone', buffer_before: 5,  buffer_after: 10, location: '', video_link: '', interviewers: [], availability: {}, created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Video Interview',    type: 'video',     duration_minutes: 45, format: 'video',  description: 'Structured video interview to explore experience and motivations', color: '#7048E8', icon_name: 'video', buffer_before: 5,  buffer_after: 15, location: '', video_link: '', interviewers: [], availability: {}, created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Technical Interview',type: 'technical', duration_minutes: 60, format: 'video',  description: 'In-depth technical assessment of skills and problem-solving',     color: '#0891B2', icon_name: 'code',  buffer_before: 10, buffer_after: 15, location: '', video_link: '', interviewers: [], availability: {}, created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Panel Interview',    type: 'panel',     duration_minutes: 60, format: 'onsite', description: 'Interview with multiple stakeholders from the hiring team',       color: '#F59E0B', icon_name: 'users', buffer_before: 10, buffer_after: 20, location: '', video_link: '', interviewers: [], availability: {}, created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Final Interview',    type: 'final',     duration_minutes: 45, format: 'onsite', description: 'Final stage interview with senior leadership',                   color: '#0CAF77', icon_name: 'star', buffer_before: 10, buffer_after: 20, location: '', video_link: '', interviewers: [], availability: {}, created_at: now, updated_at: now, deleted_at: null },
  ];

  // Forms
  const forms = [
    {
      id: uuidv4(), environment_id: envId,
      name: 'Phone Screen', description: 'Quick screening form to capture key information from initial candidate call',
      category: 'Interview', applies_to: ['people'], sharing: { visibility: 'all' },
      fields: [
        { id: uuidv4(), label: 'Overall Impression',       field_type: 'select',   required: true,  sort_order: 0, options: ['Strong Yes','Yes','Maybe','No','Strong No'] },
        { id: uuidv4(), label: 'Availability to Start',    field_type: 'select',   required: false, sort_order: 1, options: ['Immediately','2 Weeks','1 Month','2 Months','3+ Months','Unknown'] },
        { id: uuidv4(), label: 'Salary Expectation',       field_type: 'text',     required: false, sort_order: 2, placeholder: 'e.g. 80,000 AED' },
        { id: uuidv4(), label: 'Notice Period',            field_type: 'select',   required: false, sort_order: 3, options: ['Immediately','1 Week','2 Weeks','1 Month','2 Months','3 Months','3+ Months'] },
        { id: uuidv4(), label: 'Right to Work Confirmed',  field_type: 'select',   required: false, sort_order: 4, options: ['Yes','No','Requires Sponsorship','Not Discussed'] },
        { id: uuidv4(), label: 'Motivation for Move',      field_type: 'textarea', required: false, sort_order: 5, placeholder: 'Why are they looking to move?' },
        { id: uuidv4(), label: 'Key Strengths Noted',      field_type: 'textarea', required: false, sort_order: 6, placeholder: 'Key positives from the conversation' },
        { id: uuidv4(), label: 'Concerns or Gaps',         field_type: 'textarea', required: false, sort_order: 7, placeholder: 'Any concerns or areas to explore further' },
        { id: uuidv4(), label: 'Proceed to Next Stage',    field_type: 'select',   required: true,  sort_order: 8, options: ['Yes — advance to interview','Yes — but address concerns first','No — not suitable','Hold — assess other candidates first'] },
        { id: uuidv4(), label: 'Recruiter Notes',          field_type: 'textarea', required: false, sort_order: 9, placeholder: 'Any additional notes from the screen' },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId,
      name: 'Interview Scorecard', description: 'Structured feedback form for interviewers to complete after each interview',
      category: 'Interview', applies_to: ['people'], sharing: { visibility: 'all' },
      fields: [
        { id: uuidv4(), label: 'Overall Recommendation',    field_type: 'select',   required: true,  sort_order: 0,  options: ['Strong Hire','Hire','No Decision','No Hire','Strong No Hire'] },
        { id: uuidv4(), label: 'Overall Rating',            field_type: 'rating',   required: true,  sort_order: 1  },
        { id: uuidv4(), label: 'Communication Skills',      field_type: 'select',   required: true,  sort_order: 2,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uuidv4(), label: 'Technical / Role Knowledge',field_type: 'select',   required: true,  sort_order: 3,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uuidv4(), label: 'Problem Solving',           field_type: 'select',   required: false, sort_order: 4,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uuidv4(), label: 'Cultural Fit',              field_type: 'select',   required: true,  sort_order: 5,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uuidv4(), label: 'Leadership / Seniority',    field_type: 'select',   required: false, sort_order: 6,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor','N/A'] },
        { id: uuidv4(), label: 'Key Strengths',             field_type: 'textarea', required: true,  sort_order: 7,  placeholder: 'What were the standout positives from this interview?' },
        { id: uuidv4(), label: 'Areas of Concern',          field_type: 'textarea', required: false, sort_order: 8,  placeholder: 'Any reservations, gaps or concerns?' },
        { id: uuidv4(), label: 'Questions Answered Well',   field_type: 'textarea', required: false, sort_order: 9,  placeholder: 'Which topics did the candidate handle particularly well?' },
        { id: uuidv4(), label: 'Questions to Explore',      field_type: 'textarea', required: false, sort_order: 10, placeholder: 'Anything that should be probed in the next round?' },
        { id: uuidv4(), label: 'Additional Notes',          field_type: 'textarea', required: false, sort_order: 11, placeholder: 'Anything else the hiring team should know' },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId,
      name: 'Offer Acceptance', description: 'Candidate acknowledgement and acceptance of the job offer',
      category: 'Offer', applies_to: ['people'], sharing: { visibility: 'all' },
      fields: [
        { id: uuidv4(), label: 'Decision',              field_type: 'select',   required: true,  sort_order: 0, options: ['Accept','Decline','Negotiating'] },
        { id: uuidv4(), label: 'Confirmed Start Date',  field_type: 'date',     required: false, sort_order: 1 },
        { id: uuidv4(), label: 'Decline Reason',        field_type: 'select',   required: false, sort_order: 2, options: ['Accepted another offer','Salary not competitive','Role not right fit','Personal reasons','Counter offer accepted','Location / travel','Other'] },
        { id: uuidv4(), label: 'Candidate Comments',    field_type: 'textarea', required: false, sort_order: 3, placeholder: 'Any comments from the candidate' },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
  ];

  // File types
  const fileTypes = [
    { id: uuidv4(), environment_id: envId, name: 'CV / Resume',     slug: 'cv_resume',      color: '#4361EE', icon: 'file-text',    description: 'Candidate CV or resume',                      allowed_formats: ['pdf','doc','docx'], max_size_mb: 10, applies_to: ['people'], parse_enabled: true,  extract_enabled: false, mappings: [],                                                                                                                                                                                                                                                                    created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Cover Letter',    slug: 'cover_letter',   color: '#7048E8', icon: 'mail',         description: 'Candidate cover letter',                       allowed_formats: ['pdf','doc','docx'], max_size_mb: 5,  applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [],                                                                                                                                                                                                                                                                    created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Right to Work',   slug: 'right_to_work',  color: '#0CAF77', icon: 'shield',       description: 'Right to work documentation',                  allowed_formats: ['pdf','jpg','jpeg','png'], max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: true, mappings: [{ extracted_key:'full_name', target_field:'first_name', hint:'Full legal name' },{ extracted_key:'nationality', target_field:'nationality', hint:'Nationality or issuing country' },{ extracted_key:'document_type', target_field:'rtw_type', hint:'Type of document' },{ extracted_key:'expiry_date', target_field:'rtw_expiry', hint:'Document expiry date' }], created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'ID Document',     slug: 'id_document',    color: '#F59E0B', icon: 'credit-card',  description: 'Passport, national ID or Emirates ID',         allowed_formats: ['pdf','jpg','jpeg','png'], max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: true, mappings: [{ extracted_key:'full_name', target_field:'first_name', hint:'Full name on ID' },{ extracted_key:'nationality', target_field:'nationality', hint:'Nationality' },{ extracted_key:'date_of_birth', target_field:'date_of_birth', hint:'DOB DD/MM/YYYY' },{ extracted_key:'id_number', target_field:'id_number', hint:'Passport or ID number' },{ extracted_key:'expiry_date', target_field:'id_expiry', hint:'Expiry date' },{ extracted_key:'gender', target_field:'gender', hint:'Gender on document' }], created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Offer Letter',    slug: 'offer_letter',   color: '#EF4444', icon: 'file',         description: 'Signed or unsigned offer letter',              allowed_formats: ['pdf','doc','docx'], max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [],                                                                                                                                                                                                                                                                    created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Contract',        slug: 'contract',       color: '#334155', icon: 'file',         description: 'Employment contract or statement of work',      allowed_formats: ['pdf','doc','docx'], max_size_mb: 20, applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [],                                                                                                                                                                                                                                                                    created_at: now, updated_at: now, deleted_at: null },
    { id: uuidv4(), environment_id: envId, name: 'Reference Letter',slug: 'reference_letter',color: '#9DA8C7', icon: 'message-square',description: 'Professional reference or recommendation letter',allowed_formats: ['pdf','doc','docx'], max_size_mb: 5,  applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [],                                                                                                                                                                                                                                                                    created_at: now, updated_at: now, deleted_at: null },
  ];

  // Email templates
  const emailTemplates = [
    {
      id: uuidv4(), environment_id: envId, name: 'Application Received', category: 'Application',
      subject: 'We received your application — {{job_title}}',
      body: `Dear {{first_name}},\n\nThank you for applying for the {{job_title}} position. We're delighted you're interested in joining our team.\n\nWe've received your application and will review it carefully. If your experience matches what we're looking for, we'll be in touch to arrange the next steps.\n\nBest regards,\nThe Talent Team`,
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId, name: 'Interview Invitation', category: 'Interview',
      subject: 'Interview Invitation — {{job_title}} at {{company_name}}',
      body: `Dear {{first_name}},\n\nThank you for your interest in the {{job_title}} role. We'd love to invite you to the next stage.\n\nDate & Time: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nDuration: {{interview_duration}} minutes\nLocation / Link: {{interview_location}}\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\nThe Talent Team`,
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId, name: 'Offer Letter Template', category: 'Offer',
      subject: 'Job Offer — {{job_title}} at {{company_name}}',
      body: `Dear {{first_name}},\n\nWe are delighted to offer you the position of {{job_title}}.\n\nRole: {{job_title}}\nStart Date: {{start_date}}\nSalary: {{salary}}\nLocation: {{location}}\n\nPlease sign and return the attached offer letter by {{offer_expiry_date}}.\n\nWe're excited about you joining the team.\n\nBest regards,\nThe Talent Team`,
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId, name: 'Unsuccessful Application', category: 'Application',
      subject: 'Your application for {{job_title}}',
      body: `Dear {{first_name}},\n\nThank you for taking the time to apply for the {{job_title}} position and for your interest in {{company_name}}.\n\nAfter careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements.\n\nWe appreciate your interest and encourage you to apply for future positions.\n\nBest regards,\nThe Talent Team`,
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId, name: 'Interview Confirmation', category: 'Interview',
      subject: 'Interview Confirmed — {{job_title}}',
      body: `Dear {{first_name}},\n\nThis is a confirmation of your upcoming interview.\n\nRole: {{job_title}}\nDate & Time: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nDuration: {{interview_duration}} minutes\nLocation / Link: {{interview_location}}\nInterviewer(s): {{interviewer_names}}\n\nGood luck!\n\nBest regards,\nThe Talent Team`,
      created_at: now, updated_at: now, deleted_at: null,
    },
  ];

  // Portals
  const careerSiteToken = uuidv4();
  const hmPortalToken   = uuidv4();
  const portals = [
    {
      id: uuidv4(), environment_id: envId,
      name: 'Career Site', slug: 'careers', type: 'career_site', status: 'draft',
      company_name: 'Your Company', tagline: 'Find your next opportunity',
      description: 'Standard career site — configure branding before publishing',
      primary_color: '#4361EE', secondary_color: '#3451BE', accent_color: '#0CAF77',
      background_color: '#F8F9FF', text_color: '#0D0D0F', font_family: "'DM Sans', sans-serif",
      logo_url: '', show_apply_button: true, require_auth: false, show_salary: true,
      allow_cv_upload: true, exposed_objects: ['jobs','talent-pools'], access_token: careerSiteToken,
      pages: [
        { id: uuidv4(), name: 'Home', slug: '/', rows: [
          { id: uuidv4(), preset: '1', bgColor: '#4361EE', padding: 'xl', cells: [{ id: uuidv4(), widgetType: 'hero', widgetConfig: { headline: 'Join our team', subheading: "Explore opportunities across our growing organisation. We're looking for talented, passionate people to help us build something great.", ctaText: 'See Open Roles' } }] },
          { id: uuidv4(), preset: '1', bgColor: '#F8F9FF', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'stats', widgetConfig: { stats: [{ value: '50+', label: 'Team Members' },{ value: '5+', label: 'Locations' },{ value: '4.5★', label: 'Glassdoor Rating' },{ value: '25+', label: 'Nationalities' }] } }] },
          { id: uuidv4(), preset: '2', bgColor: '', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'text', widgetConfig: { heading: 'Why work with us?', content: 'We believe great work happens when talented people have the freedom to do their best work. We offer competitive compensation, flexible working, and a culture built on trust, inclusion and continuous learning.' } },{ id: uuidv4(), widgetType: 'image', widgetConfig: { url: '' } }] },
          { id: uuidv4(), preset: '1', bgColor: '', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'jobs', widgetConfig: {} }] },
          { id: uuidv4(), preset: '1', bgColor: '#0D0D0F', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'text', widgetConfig: { heading: 'Ready to apply?', content: "We review every application and aim to respond within 5 working days." } }] },
        ]},
        { id: uuidv4(), name: 'Apply', slug: '/apply', rows: [
          { id: uuidv4(), preset: '1', bgColor: '', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'form', widgetConfig: { title: 'Submit Your Application' } }] },
        ]},
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uuidv4(), environment_id: envId,
      name: 'Hiring Manager Portal', slug: 'hiring', type: 'hm_portal', status: 'draft',
      company_name: 'Talent Team', tagline: 'Your hiring dashboard',
      description: 'Internal portal for hiring managers to review candidates and provide feedback',
      primary_color: '#334155', secondary_color: '#475569', accent_color: '#4361EE',
      background_color: '#F8FAFC', text_color: '#0F172A', font_family: "'DM Sans', sans-serif",
      logo_url: '', show_apply_button: false, require_auth: true, show_salary: true,
      allow_cv_upload: false, exposed_objects: ['jobs','people'], access_token: hmPortalToken,
      pages: [
        { id: uuidv4(), name: 'Dashboard', slug: '/', rows: [
          { id: uuidv4(), preset: '1', bgColor: '#1E293B', padding: 'md', cells: [{ id: uuidv4(), widgetType: 'hero', widgetConfig: { headline: 'Hiring Manager Portal', subheading: 'Your candidates, interviews and open roles — all in one place.', ctaText: 'View Open Roles' } }] },
          { id: uuidv4(), preset: '3', bgColor: '', padding: 'md', cells: [{ id: uuidv4(), widgetType: 'stats', widgetConfig: { stats: [{ value: '—', label: 'Open Reqs' }] } },{ id: uuidv4(), widgetType: 'stats', widgetConfig: { stats: [{ value: '—', label: 'In Pipeline' }] } },{ id: uuidv4(), widgetType: 'stats', widgetConfig: { stats: [{ value: '—', label: 'Interviews This Week' }] } }] },
          { id: uuidv4(), preset: '1', bgColor: '', padding: 'md', cells: [{ id: uuidv4(), widgetType: 'jobs', widgetConfig: {} }] },
        ]},
        { id: uuidv4(), name: 'Scorecard', slug: '/feedback', rows: [
          { id: uuidv4(), preset: '1', bgColor: '', padding: 'lg', cells: [{ id: uuidv4(), widgetType: 'form', widgetConfig: { title: 'Interview Scorecard' } }] },
        ]},
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
  ];

  return { workflows, interviewTypes, forms, fileTypes, emailTemplates, portals };
}

// ─── Main provision function ──────────────────────────────────────────────────
async function provisionClient(clientData, envData, adminUser, templateKey) {
  const s = getStore(); ensureCollections();
  const now = new Date().toISOString();

  const tenantSlug = clientData.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').substring(0,30);

  const client = {
    id: uuidv4(), name: clientData.name, industry: clientData.industry||'',
    region: clientData.region||'', plan: clientData.plan||'starter', size: clientData.size||'',
    status: 'active', tenant_slug: tenantSlug,
    primary_contact_name:  clientData.contact_name||'',
    primary_contact_email: clientData.contact_email||'',
    primary_contact_phone: clientData.contact_phone||'',
    website: clientData.website||'', notes: clientData.notes||'',
    trial_ends_at: clientData.plan==='trial' ? new Date(Date.now()+30*24*60*60*1000).toISOString() : null,
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.clients.push(client);

  const environment = {
    id: uuidv4(), client_id: client.id,
    name: envData.name||`${clientData.name} Production`,
    type: envData.type||'production', locale: envData.locale||'en',
    timezone: envData.timezone||'UTC', is_default: 0, status: 'active',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.client_environments.push(environment);

  const { objects, roles } = buildTemplate(templateKey||'core_recruitment');
  const createdObjects = [];
  const createdFields  = [];
  const objectMap      = {};

  for (const objDef of objects) {
    const obj = {
      id: uuidv4(), environment_id: environment.id, slug: objDef.slug,
      name: objDef.name, plural_name: objDef.plural_name, icon: objDef.icon||'database',
      color: objDef.color||'#4361EE', is_system: objDef.is_system!==false,
      sort_order: createdObjects.length, created_at: now, updated_at: now, deleted_at: null,
    };
    createdObjects.push(obj);
    objectMap[obj.slug] = obj.id;
    (objDef.fields||[]).forEach((fDef,i) => {
      createdFields.push({
        id: uuidv4(), environment_id: environment.id, object_id: obj.id,
        name: fDef.name, api_key: fDef.api_key, field_type: fDef.field_type,
        is_required: fDef.is_required||false, show_in_list: fDef.show_in_list!==false,
        options: fDef.options||null, related_object_slug: fDef.related_object_slug||null,
        people_multi: fDef.people_multi!==undefined ? fDef.people_multi : null,
        condition_field: fDef.condition_field||null, condition_value: fDef.condition_value||null,
        placeholder: '', help_text: '', is_system: true,
        sort_order: i, created_at: now, updated_at: now, deleted_at: null,
      });
    });
  }

  const createdRoles = roles.map(roleDef => ({
    id: uuidv4(), environment_id: environment.id,
    name: roleDef.name,
    slug: roleDef.slug || roleDef.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''),
    description: roleDef.description || '',
    color: roleDef.color || '#4361EE',
    is_system: roleDef.is_system !== undefined ? roleDef.is_system : 1,
    created_at: now, updated_at: now, deleted_at: null,
  }));

  if (!s.users) s.users = [];
  const superAdminRole = createdRoles.find(r=>r.name==='Super Admin')||createdRoles[0];
  const plainPassword  = adminUser.password||'Admin1234!';
  const adminUserRecord = {
    id: uuidv4(), environment_id: environment.id, client_id: client.id,
    email: adminUser.email||`admin@${tenantSlug}.com`,
    first_name: adminUser.first_name||'Admin', last_name: adminUser.last_name||'User',
    role_id: superAdminRole?.id||null, role_name: 'super_admin',
    password_hash: hashPassword(plainPassword),
    status: 'active', auth_provider: 'local', mfa_enabled: false,
    must_change_password: false, login_count: 0, last_login: null,
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.users.push(adminUserRecord);

  const stdConfig = buildStandardConfig(environment.id, objectMap, now);

  ['objects','fields','roles','workflows','portals','forms','file_types','email_templates','interview_types']
    .forEach(col => { if (!s[col]) s[col] = []; });

  createdObjects          .forEach(o => s.objects          .push(o));
  createdFields           .forEach(f => s.fields           .push(f));
  createdRoles            .forEach(r => s.roles            .push(r));
  stdConfig.workflows     .forEach(w => s.workflows        .push(w));
  stdConfig.portals       .forEach(p => s.portals          .push(p));
  stdConfig.forms         .forEach(f => s.forms            .push(f));
  stdConfig.fileTypes     .forEach(f => s.file_types       .push(f));
  stdConfig.emailTemplates.forEach(e => s.email_templates  .push(e));
  stdConfig.interviewTypes.forEach(i => s.interview_types  .push(i));

  // Seed proper RBAC permission rows for all 5 standard roles using the
  // same logic as the master store — this is what canGlobal() reads at runtime.
  const { seedDefaultPermissions } = require('../middleware/rbac');
  seedDefaultPermissions(s);

  s.provision_log.push({
    id: uuidv4(), client_id: client.id, environment_id: environment.id,
    template: templateKey||'core_recruitment', admin_email: adminUserRecord.email,
    objects_seeded: createdObjects.length, fields_seeded: createdFields.length,
    roles_seeded: createdRoles.length, workflows_seeded: stdConfig.workflows.length,
    portals_seeded: stdConfig.portals.length, forms_seeded: stdConfig.forms.length,
    file_types_seeded: stdConfig.fileTypes.length,
    email_templates_seeded: stdConfig.emailTemplates.length,
    interview_types_seeded: stdConfig.interviewTypes.length,
    provisioned_at: now,
  });

  saveStore();

  return {
    client, environment,
    admin_email: adminUserRecord.email, admin_password: plainPassword,
    env_id: environment.id,
    objects_seeded:         createdObjects.length,
    fields_seeded:          createdFields.length,
    roles_seeded:           createdRoles.length,
    workflows_seeded:       stdConfig.workflows.length,
    portals_seeded:         stdConfig.portals.length,
    forms_seeded:           stdConfig.forms.length,
    file_types_seeded:      stdConfig.fileTypes.length,
    email_templates_seeded: stdConfig.emailTemplates.length,
    interview_types_seeded: stdConfig.interviewTypes.length,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const s = getStore(); ensureCollections();
  const clients = (s.clients||[]).filter(c=>!c.deleted_at).map(c => {
    const envs = (s.client_environments||[]).filter(e=>e.client_id===c.id&&!e.deleted_at);
    const logs = (s.provision_log||[]).filter(l=>l.client_id===c.id);
    const totalRecords = (s.objects||[])
      .filter(o=>envs.some(e=>e.id===o.environment_id)&&!o.deleted_at)
      .reduce((acc,o) => acc+(s.records||[]).filter(r=>r.object_id===o.id&&!r.deleted_at).length, 0);
    return { ...c, env_count: envs.length, record_count: totalRecords, latest_provision: logs[logs.length-1]||null };
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  res.json(clients);
});

router.get('/provision/templates', (req, res) => {
  res.json(Object.entries(TEMPLATES).map(([key,t]) => ({
    key, label: t.label, description: t.description, icon: t.icon,
    object_count: (t.objects||[]).length+(t.extra_objects||[]).length,
    includes: [
      '2 workflows (Application Pipeline + Job Status)',
      '2 portals (Career Site + Hiring Manager Portal)',
      '3 forms (Phone Screen, Interview Scorecard, Offer Acceptance)',
      '7 file types with CV parsing + AI document extraction',
      '5 interview types', '5 email templates',
    ],
  })));
});

router.get('/stats/overview', (req, res) => {
  const s = getStore(); ensureCollections();
  const clients    = (s.clients||[]).filter(c=>!c.deleted_at);
  const byStatus   = clients.reduce((a,c)=>{ a[c.status]=(a[c.status]||0)+1; return a; },{});
  const byPlan     = clients.reduce((a,c)=>{ a[c.plan]=(a[c.plan]||0)+1; return a; },{});
  const totalEnvs  = (s.client_environments||[]).filter(e=>!e.deleted_at).length;
  const totalUsers = (s.users||[]).filter(u=>!u.deleted_at&&u.client_id).length;
  const totalRecs  = (s.records||[]).filter(r=>!r.deleted_at).length;
  const fileSizeKB = Math.round(JSON.stringify(s).length/1024);
  const topEnvs = (s.client_environments||[]).filter(e=>!e.deleted_at).map(env => {
    const cl = clients.find(c=>c.id===env.client_id);
    const rc = (s.records||[]).filter(r=>{ const o=(s.objects||[]).find(x=>x.id===r.object_id); return o&&o.environment_id===env.id&&!r.deleted_at; }).length;
    return { env_name: env.name, client_name: cl?.name||'—', record_count: rc };
  }).sort((a,b)=>b.record_count-a.record_count).slice(0,5);
  res.json({ total_clients: clients.length, by_status: byStatus, by_plan: byPlan, total_environments: totalEnvs, total_client_users: totalUsers, total_records: totalRecs, data_store_kb: fileSizeKB, top_environments: topEnvs });
});

router.get('/:id/stats', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const envs    = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const users   = (s.users||[]).filter(u=>u.client_id===client.id&&!u.deleted_at);
  const objects = (s.objects||[]).filter(o=>!o.deleted_at&&envs.some(e=>e.id===o.environment_id));
  const records = (s.records||[]).filter(r=>!r.deleted_at&&objects.some(o=>o.id===r.object_id));
  const logs    = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  const envsWithStats = envs.map(env => {
    const objCount = objects.filter(o=>o.environment_id===env.id).length;
    const recCount = records.filter(r=>objects.find(o=>o.id===r.object_id)?.environment_id===env.id).length;
    return { ...env, object_count: objCount, record_count: recCount };
  });
  res.json({
    environment_count: envs.length,
    record_count:      records.length,
    user_count:        users.length,
    object_count:      objects.length,
    environments:      envsWithStats,
    provision_log:     logs,
    sandboxes:         [],
  });
});

router.get('/:id', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const envs  = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const logs  = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  const users = (s.users||[]).filter(u=>u.client_id===client.id&&!u.deleted_at);
  const envsWithStats = envs.map(env => {
    const objCount = (s.objects||[]).filter(o=>o.environment_id===env.id&&!o.deleted_at).length;
    const recCount = (s.records||[]).filter(r=>{ const o=(s.objects||[]).find(x=>x.id===r.object_id); return o&&o.environment_id===env.id&&!r.deleted_at; }).length;
    return { ...env, object_count: objCount, record_count: recCount };
  });
  res.json({ ...client, environments: envsWithStats, users, provision_log: logs });
});

router.post('/provision', async (req, res) => {
  try {
    const { client, environment, admin_user, template } = req.body;
    if (!client?.name)       return res.status(400).json({ error: 'client.name is required' });
    if (!admin_user?.email)  return res.status(400).json({ error: 'admin_user.email is required' });
    const result = await provisionClient(client, environment||{}, admin_user, template||'core_recruitment');
    res.json({ success: true, ...result });
  } catch(err) {
    console.error('[provision]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/test-data', async (req, res) => {
  try {
    const s = getStore(); ensureCollections();
    const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
    if (!envs.length) return res.status(400).json({ error: 'No environments found' });
    const env = envs[0];
    const objects = (s.objects||[]).filter(o=>o.environment_id===env.id&&!o.deleted_at);
    const peopleObj = objects.find(o=>o.slug==='people');
    const jobsObj   = objects.find(o=>o.slug==='jobs');
    const poolsObj  = objects.find(o=>o.slug==='talent-pools');
    const now = new Date().toISOString();
    let added = 0;
    if (!s.records) s.records = [];
    const add = (objectId, data) => { s.records.push({ id: uuidv4(), object_id: objectId, environment_id: env.id, data, created_by: null, created_at: now, updated_at: now, deleted_at: null }); added++; };
    if (peopleObj) [
      { first_name:'Sarah', last_name:'Mitchell', email:'sarah.mitchell@email.com', current_title:'Senior Product Manager', location:'Dubai, UAE', status:'Screening', source:'LinkedIn', rating:4, person_type:'Candidate', skills:['Product Management','Leadership'] },
      { first_name:'James', last_name:'Chen',     email:'james.chen@email.com',     current_title:'Software Engineer',     location:'London, UK', status:'Interviewing', source:'Referral', rating:5, person_type:'Candidate', skills:['JavaScript','React','Node.js'] },
      { first_name:'Fatima',last_name:'Al-Rashidi',email:'fatima.alrashidi@email.com',current_title:'Marketing Director', location:'Abu Dhabi, UAE',status:'New',  source:'Career Site', rating:3, person_type:'Candidate', skills:['Marketing'] },
      { first_name:'Marcus',last_name:'Thompson', email:'marcus.t@email.com',        current_title:'Data Analyst',         location:'Singapore',  status:'Offer', source:'Job Board', rating:4, person_type:'Candidate', skills:['SQL','Python'] },
      { first_name:'Priya', last_name:'Sharma',   email:'priya.sharma@email.com',    current_title:'UX Designer',          location:'Dubai, UAE', status:'Screening',    source:'LinkedIn', rating:5, person_type:'Candidate', skills:['UX Design'] },
      { first_name:'David', last_name:'Okonkwo',  email:'david.o@email.com',         current_title:'Finance Manager',      location:'Lagos, Nigeria',status:'Rejected', source:'Agency', rating:2, person_type:'Candidate', skills:['Finance'] },
      { first_name:'Emma',  last_name:'Bergström', email:'emma.b@email.com',         current_title:'Sales Executive',      location:'Stockholm, Sweden',status:'Placed', source:'Referral', rating:4, person_type:'Candidate', skills:['Sales'] },
      { first_name:'Ahmed', last_name:'Hassan',   email:'ahmed.hassan@email.com',    current_title:'Operations Lead',      location:'Riyadh, Saudi Arabia',status:'New', source:'Direct Application', rating:3, person_type:'Candidate', skills:['Operations'] },
    ].forEach(c=>add(peopleObj.id,c));
    if (jobsObj) [
      { job_title:'Senior Software Engineer', department:'Engineering', location:'Dubai, UAE',          work_type:'Hybrid',  employment_type:'Full-time', status:'Open',    salary_min:120000, salary_max:180000, currency:'AED', priority:'High'   },
      { job_title:'Product Manager',          department:'Product',     location:'Dubai, UAE',          work_type:'Hybrid',  employment_type:'Full-time', status:'Open',    salary_min:100000, salary_max:160000, currency:'AED', priority:'High'   },
      { job_title:'UX Designer',              department:'Design',      location:'Remote',              work_type:'Remote',  employment_type:'Full-time', status:'Open',    salary_min:80000,  salary_max:130000, currency:'AED', priority:'Medium' },
      { job_title:'Sales Manager',            department:'Sales',       location:'Riyadh, Saudi Arabia',work_type:'On-site', employment_type:'Full-time', status:'Open',    salary_min:90000,  salary_max:150000, currency:'SAR', priority:'High'   },
      { job_title:'Data Analyst',             department:'Data',        location:'Dubai, UAE',          work_type:'Hybrid',  employment_type:'Full-time', status:'Filled',  salary_min:70000,  salary_max:110000, currency:'AED', priority:'Medium' },
      { job_title:'Marketing Lead',           department:'Marketing',   location:'Dubai, UAE',          work_type:'Hybrid',  employment_type:'Full-time', status:'On Hold', salary_min:85000,  salary_max:130000, currency:'AED', priority:'Low'    },
    ].forEach(j=>add(jobsObj.id,j));
    if (poolsObj) [
      { pool_name:'Engineering Talent Pool', category:'Engineering', focus_area:'Software, Data, DevOps', status:'Active' },
      { pool_name:'Sales & Commercial',      category:'Sales',       focus_area:'B2B, SaaS, Enterprise',  status:'Active' },
      { pool_name:'Executive Candidates',    category:'Executive',   focus_area:'C-suite, VP, Director',  status:'Active' },
    ].forEach(p=>add(poolsObj.id,p));
    saveStore();
    res.json({ success: true, records_added: added });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', (req, res) => {
  const s = getStore(); ensureCollections();
  const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id&&!c.deleted_at);
  if (idx===-1) return res.status(404).json({ error: 'Client not found' });
  s.clients[idx].status = req.body.status;
  s.clients[idx].updated_at = new Date().toISOString();
  saveStore(); res.json(s.clients[idx]);
});

router.patch('/:id', (req, res) => {
  const s = getStore(); ensureCollections();
  const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id&&!c.deleted_at);
  if (idx===-1) return res.status(404).json({ error: 'Client not found' });
  s.clients[idx] = { ...s.clients[idx], ...req.body, id: req.params.id, updated_at: new Date().toISOString() };
  saveStore(); res.json(s.clients[idx]);
});

router.delete('/:id', (req, res) => {
  const s = getStore(); ensureCollections();
  const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'Client not found' });
  s.clients[idx].deleted_at = new Date().toISOString();
  saveStore(); res.json({ success: true });
});

// POST /:id/impersonate — generate a login URL for the client's admin user
router.post('/:id/impersonate', async (req, res) => {
  try {
    ensureCollections();
    const s = getStore();
    const client = (s.clients||[]).find(c => c.id === req.params.id && !c.deleted_at);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const slug = client.tenant_slug;
    if (!slug) return res.status(400).json({ error: 'Client has no tenant slug' });

    // Try tenant store first
    let adminUser = null;
    await tenantStorage.run(slug, async () => {
      const ts = getStore();
      adminUser = (ts.users||[]).find(u =>
        !u.deleted_at && (u.is_super_admin || u.role_name === 'Super Admin' || u.role_name === 'Admin')
      ) || (ts.users||[]).find(u => !u.deleted_at);
    });

    // Fall back to master store (self-serve signups live here)
    if (!adminUser) {
      adminUser = (s.users||[]).find(u =>
        !u.deleted_at && (u.client_id === client.id || u.email === client.primary_contact_email)
      );
    }

    const logs = (s.provision_log||[]).filter(l => l.client_id === client.id);
    const adminEmail = adminUser?.email || logs.slice(-1)[0]?.admin_email || client.primary_contact_email;
    const tenantUrl = 'https://' + slug + '.vercentic.com';

    if (adminUser) {
      const token = uuidv4() + '-' + uuidv4();
      // Write to master store impersonation_tokens — that's where exchange-impersonation reads from
      tenantStorage.run('master', () => {
        const ms = getStore();
        if (!ms.impersonation_tokens) ms.impersonation_tokens = [];
        ms.impersonation_tokens.push({
          id: uuidv4(), token,
          user_id: adminUser.id,
          tenant_slug: slug,
          impersonated_by: 'superadmin',
          used: false,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        });
        saveStore('master');
      });
      return res.json({ ok: true, token, tenant_slug: slug, user_id: adminUser.id, email: adminUser.email, login_url: tenantUrl + '?impersonate=' + token });
    }

    // No user found — send to tenant login page
    res.json({ ok: true, token: null, tenant_slug: slug, email: adminEmail, login_url: tenantUrl + '?tenant=' + slug });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


module.exports = router;
module.exports.buildTemplate = buildTemplate;
