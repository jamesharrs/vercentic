const path = require('path');
const fs   = require('fs');
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto  = require('crypto');
const { applyStarterConfig } = require('../data/starter_config');
const { getStore, saveStore, saveStoreNow, provisionTenant, tenantStorage, loadTenantStore } = require('../db/init');

const hashPassword = (pw) => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');

function ensureCollections() {
  const s = getStore();
  if (!s.clients)             { s.clients = [];             saveStore(); }
  if (!s.client_environments) { s.client_environments = []; saveStore(); }
  if (!s.provision_log)       { s.provision_log = [];       saveStore(); }
}

const TEMPLATES = {
  core_recruitment: {
    label: 'Core Recruitment',
    description: 'People, Jobs and Talent Pools with standard recruitment fields',
    icon: 'users',
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
          { name: 'Status',          api_key: 'status',          field_type: 'select',   is_required: false, show_in_list: true,
            options: ['New', 'Screening', 'Interviewing', 'Offer', 'Placed', 'Rejected', 'On Hold'] },
          { name: 'Source',          api_key: 'source',          field_type: 'select',   is_required: false, show_in_list: false,
            options: ['LinkedIn', 'Referral', 'Job Board', 'Direct', 'Agency', 'Other'] },
          { name: 'Rating',          api_key: 'rating',          field_type: 'rating',   is_required: false, show_in_list: false },
          { name: 'Notice Period',   api_key: 'notice_period',   field_type: 'text',     is_required: false, show_in_list: false },
          { name: 'Expected Salary', api_key: 'expected_salary', field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Notes',           api_key: 'notes_text',      field_type: 'textarea', is_required: false, show_in_list: false },
        ]
      },
      {
        slug: 'jobs', name: 'Job', plural_name: 'Jobs', icon: 'briefcase', color: '#F79009', is_system: true,
        fields: [
          { name: 'Job Title',       api_key: 'job_title',       field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Department',      api_key: 'department',      field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Location',        api_key: 'location',        field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Status',          api_key: 'status',          field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Draft', 'Open', 'On Hold', 'Filled', 'Cancelled'] },
          { name: 'Employment Type', api_key: 'employment_type', field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'] },
          { name: 'Salary Min',      api_key: 'salary_min',      field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Salary Max',      api_key: 'salary_max',      field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Openings',        api_key: 'openings',        field_type: 'number',   is_required: false, show_in_list: true  },
          { name: 'Date Posted',     api_key: 'date_posted',     field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Close Date',      api_key: 'close_date',      field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Description',     api_key: 'description',     field_type: 'textarea', is_required: false, show_in_list: false },
          { name: 'Hiring Manager',  api_key: 'hiring_manager',  field_type: 'people',   is_required: false, show_in_list: true,
            related_object_slug: 'people', people_multi: false },
        ]
      },
      {
        slug: 'talent_pools', name: 'Talent Pool', plural_name: 'Talent Pools', icon: 'layers', color: '#0CAF77', is_system: true,
        fields: [
          { name: 'Pool Name',   api_key: 'pool_name',   field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Description', api_key: 'description', field_type: 'textarea', is_required: false, show_in_list: false },
          { name: 'Focus Area',  api_key: 'focus_area',  field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Status',      api_key: 'status',      field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Active', 'Archived'] },
        ]
      }
    ],
    default_roles: [
      { name: 'Super Admin',    permissions: { create:true,  read:true,  edit:true,  delete:true,  admin:true  }, color: '#7C3AED' },
      { name: 'Recruiter',      permissions: { create:true,  read:true,  edit:true,  delete:false, admin:false }, color: '#4361EE' },
      { name: 'Hiring Manager', permissions: { create:false, read:true,  edit:false, delete:false, admin:false }, color: '#F79009' },
      { name: 'Viewer',         permissions: { create:false, read:true,  edit:false, delete:false, admin:false }, color: '#9DA8C7' },
    ]
  },
  agency: {
    label: 'Recruitment Agency',
    description: 'Adds Clients, Placements and Invoices on top of Core Recruitment',
    icon: 'briefcase',
    extends: 'core_recruitment',
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
        ]
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
        ]
      }
    ]
  },
  rpo_provider: {
    label: 'RPO Provider',
    description: 'Full RPO template with Client Companies, SLA tracking and Placements',
    icon: 'briefcase',
    extends: 'core_recruitment',
    extra_objects: [
      {
        slug: 'client_companies', name: 'Client Company', plural_name: 'Client Companies', icon: 'building', color: '#EF4444', is_system: false,
        fields: [
          { name: 'Company Name',    api_key: 'company_name',    field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Industry',        api_key: 'industry',        field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Technology','Finance','Healthcare','Retail','Manufacturing','Professional Services','Government','Other'] },
          { name: 'Account Status',  api_key: 'account_status',  field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Prospect','Active','On Hold','Former'] },
          { name: 'Account Manager', api_key: 'account_manager', field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Contract Start',  api_key: 'contract_start',  field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Contract End',    api_key: 'contract_end',    field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Default SLA Days',api_key: 'default_sla_days',field_type: 'number',   is_required: false, show_in_list: true  },
          { name: 'Fee Structure',   api_key: 'fee_structure',   field_type: 'select',   is_required: false, show_in_list: false,
            options: ['Retained','Contingency','Hybrid','Management Fee'] },
          { name: 'Website',         api_key: 'website',         field_type: 'url',      is_required: false, show_in_list: false },
          { name: 'Notes',           api_key: 'notes_text',      field_type: 'textarea', is_required: false, show_in_list: false },
        ]
      },
      {
        slug: 'placements', name: 'Placement', plural_name: 'Placements', icon: 'check-circle', color: '#0CAF77', is_system: false,
        fields: [
          { name: 'Candidate Name',  api_key: 'candidate_name',  field_type: 'text',     is_required: true,  show_in_list: true  },
          { name: 'Job Title',       api_key: 'job_title',       field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Client Company',  api_key: 'client_company',  field_type: 'text',     is_required: false, show_in_list: true  },
          { name: 'Start Date',      api_key: 'start_date',      field_type: 'date',     is_required: false, show_in_list: true  },
          { name: 'Salary',          api_key: 'salary',          field_type: 'currency', is_required: false, show_in_list: false },
          { name: 'Placement Fee',   api_key: 'placement_fee',   field_type: 'currency', is_required: false, show_in_list: true  },
          { name: 'Guarantee Period',api_key: 'guarantee_period',field_type: 'number',   is_required: false, show_in_list: false },
          { name: 'Guarantee Expiry',api_key: 'guarantee_expiry',field_type: 'date',     is_required: false, show_in_list: false },
          { name: 'Status',          api_key: 'status',          field_type: 'select',   is_required: false, show_in_list: true,
            options: ['Placed','In Guarantee','Guarantee Expired','Cancelled'] },
        ]
      },
    ],
    jobs_extra_fields: [
      { name: 'Client Company',   api_key: 'client_company',   field_type: 'text',   is_required: false, show_in_list: true  },
      { name: 'Hiring Manager',   api_key: 'hiring_manager',   field_type: 'text',   is_required: false, show_in_list: false },
      { name: 'Priority',         api_key: 'priority',         field_type: 'select', is_required: false, show_in_list: true,
        options: ['Low','Medium','High','Critical'] },
      { name: 'SLA Target Days',  api_key: 'sla_target_days',  field_type: 'number', is_required: false, show_in_list: true  },
      { name: 'Date Opened',      api_key: 'date_opened',      field_type: 'date',   is_required: false, show_in_list: true  },
      { name: 'Brief Status',     api_key: 'brief_status',     field_type: 'select', is_required: false, show_in_list: false,
        options: ['Brief Received','Approved','Sourcing','Shortlisted','Interviewing','Offer Stage','Filled','Cancelled'] },
    ],
    default_roles: [
      { name: 'Super Admin',    permissions: { create:true,  read:true,  edit:true,  delete:true,  admin:true  }, color: '#7C3AED' },
      { name: 'Account Manager',permissions: { create:true,  read:true,  edit:true,  delete:false, admin:false }, color: '#EF4444' },
      { name: 'Recruiter',      permissions: { create:true,  read:true,  edit:true,  delete:false, admin:false }, color: '#4361EE' },
      { name: 'Viewer',         permissions: { create:false, read:true,  edit:false, delete:false, admin:false }, color: '#9DA8C7' },
    ]
  },
  hr_platform: {
    label: 'HR Platform',
    description: 'Employees, Departments and Leave on top of Core Recruitment',
    icon: 'users',
    extends: 'core_recruitment',
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
        ]
      },
      {
        slug: 'leave_requests', name: 'Leave Request', plural_name: 'Leave Requests', icon: 'calendar', color: '#F59E0B', is_system: false,
        fields: [
          { name: 'Employee',   api_key: 'employee',   field_type: 'people',  is_required: true,  show_in_list: true, related_object_slug: 'employees', people_multi: false },
          { name: 'Leave Type', api_key: 'leave_type', field_type: 'select',  is_required: true,  show_in_list: true,
            options: ['Annual','Sick','Parental','Unpaid','Other'] },
          { name: 'Start Date', api_key: 'start_date', field_type: 'date',    is_required: true,  show_in_list: true  },
          { name: 'End Date',   api_key: 'end_date',   field_type: 'date',    is_required: true,  show_in_list: true  },
          { name: 'Days',       api_key: 'days',       field_type: 'number',  is_required: false, show_in_list: true  },
          { name: 'Status',     api_key: 'status',     field_type: 'select',  is_required: false, show_in_list: true,
            options: ['Pending','Approved','Rejected','Cancelled'] },
          { name: 'Notes',      api_key: 'notes_text', field_type: 'textarea',is_required: false, show_in_list: false },
        ]
      }
    ]
  }
};

function buildTemplate(key) {
  const tpl = TEMPLATES[key];
  if (!tpl) throw new Error(`Unknown template: ${key}`);
  let objects = [...(tpl.objects || [])];
  if (tpl.extends) {
    const base = TEMPLATES[tpl.extends];
    // Deep-clone base objects so we don't mutate them
    objects = JSON.parse(JSON.stringify([...(base.objects || [])]));
    // Inject jobs_extra_fields into the jobs object
    if (tpl.jobs_extra_fields && tpl.jobs_extra_fields.length) {
      const jobsObj = objects.find(o => o.slug === 'jobs');
      if (jobsObj) jobsObj.fields = [...(jobsObj.fields || []), ...tpl.jobs_extra_fields];
    }
    objects = [...objects, ...(tpl.extra_objects || [])];
  }
  return { objects, roles: tpl.default_roles || TEMPLATES.core_recruitment.default_roles };
}

async function provisionClient(clientData, envData, adminUser, templateKey) {
  const s = getStore(); ensureCollections();
  const now = new Date().toISOString();

  // Generate a URL-safe tenant slug from the company name
  const tenantSlug = clientData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);

  const client = {
    id: uuidv4(), name: clientData.name, industry: clientData.industry||'',
    region: clientData.region||'', plan: clientData.plan||'starter', size: clientData.size||'',
    status: 'active', tenant_slug: tenantSlug,
    primary_contact_name: clientData.contact_name||'',
    primary_contact_email: clientData.contact_email||'', primary_contact_phone: clientData.contact_phone||'',
    website: clientData.website||'', notes: clientData.notes||'',
    trial_ends_at: clientData.plan==='trial' ? new Date(Date.now()+30*24*60*60*1000).toISOString() : null,
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.clients.push(client);

  const environment = {
    id: uuidv4(), client_id: client.id,
    name: envData.name || `${clientData.name} Production`,
    type: envData.type||'production', locale: envData.locale||'en',
    timezone: envData.timezone||'UTC', is_default: 0, status: 'active',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.client_environments.push(environment);
  // NOTE: Do NOT push into s.environments — client environments live in their
  // own tenant store only. Adding them here would expose client data to master users.

  // Build objects/fields/roles in memory only — do NOT push to master store (s).
  // Everything goes exclusively into the isolated tenant store below.
  const { objects, roles } = buildTemplate(templateKey || 'core_recruitment');
  const createdObjects = [];
  const createdFields  = [];

  for (const objDef of objects) {
    const obj = {
      id: uuidv4(), environment_id: environment.id, slug: objDef.slug,
      name: objDef.name, plural_name: objDef.plural_name, icon: objDef.icon||'database',
      color: objDef.color||'#4361EE', is_system: objDef.is_system!==false,
      sort_order: createdObjects.length, created_at: now, updated_at: now, deleted_at: null,
    };
    createdObjects.push(obj);
    (objDef.fields||[]).forEach((fDef, i) => {
      createdFields.push({
        id: uuidv4(), environment_id: environment.id, object_id: obj.id,
        name: fDef.name, api_key: fDef.api_key, field_type: fDef.field_type,
        is_required: fDef.is_required||false, show_in_list: fDef.show_in_list!==false,
        options: fDef.options||null, related_object_slug: fDef.related_object_slug||null,
        people_multi: fDef.people_multi!==undefined?fDef.people_multi:null,
        placeholder: '', help_text: '', is_system: true,
        sort_order: i, created_at: now, updated_at: now, deleted_at: null,
      });
    });
  }

  const createdRoles = [];
  for (const roleDef of roles) {
    const slug = roleDef.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    createdRoles.push({
      id: uuidv4(), environment_id: environment.id,
      name: roleDef.name, slug,
      permissions: roleDef.permissions, color: roleDef.color||'#4361EE',
      is_system: true, created_at: now, updated_at: now, deleted_at: null,
    });
  }

  if (!s.users) s.users = [];
  const superAdminRole = createdRoles.find(r=>r.name==='Super Admin')||createdRoles[0];
  const plainPassword = adminUser.password || 'Admin1234!';
  const user = {
    id: uuidv4(), environment_id: environment.id, client_id: client.id,
    first_name: adminUser.first_name||'Admin', last_name: adminUser.last_name||'User',
    email: adminUser.email,
    password_hash: hashPassword(plainPassword),
    role_id: superAdminRole?.id||null, role_name: superAdminRole?.name||'Super Admin',
    status: 'active', is_super_admin: true,
    must_change_password: 0, mfa_enabled: 0,
    last_login: null, login_count: 0,
    created_at: now, updated_at: now, deleted_at: null,
  };
  // Do NOT push user into master s.users — user belongs only in the tenant store

  s.provision_log.push({
    id: uuidv4(), client_id: client.id, environment_id: environment.id,
    template: templateKey||'core_recruitment', objects_seeded: createdObjects.length,
    fields_seeded: createdFields.length,
    roles_seeded: createdRoles.length, admin_email: adminUser.email,
    provisioned_at: now, status: 'success',
  });

  saveStore();

  // === Provision isolated tenant store ===
  // All client data lives in /data/tenant-{slug}.json, NOT in master store.
  // We run the seeding inside the tenant's AsyncLocalStorage context so
  // getStore() inside seedUsersAndRoles etc. writes to the tenant file.
  await tenantStorage.run(tenantSlug, async () => {
    const ts = provisionTenant(tenantSlug); // creates /data/tenant-{slug}.json

    // Seed environment
    if (!ts.environments) ts.environments = [];
    ts.environments.push({ ...environment });

    // Seed objects + fields
    if (!ts.objects) ts.objects = [];
    if (!ts.fields)  ts.fields  = [];
    for (const obj of createdObjects) ts.objects.push(obj);
    for (const field of createdFields) ts.fields.push(field);

    // Seed roles
    if (!ts.roles) ts.roles = [];
    for (const role of createdRoles) ts.roles.push(role);

    // Seed admin user into tenant store
    if (!ts.users) ts.users = [];
    ts.users.push(user);

    // Seed security defaults
    ts.security_settings = { password_min_length:8, password_require_uppercase:1, password_require_number:1, password_require_symbol:1, session_timeout_minutes:60, max_login_attempts:5, lockout_duration_minutes:30, mfa_enabled:0, sso_enabled:0, updated_at: now };

    // Seed company documents
    if (!ts.company_documents) ts.company_documents = [];
    const SAMPLE_DOCS = [
      { name:'Employee Benefits Guide 2026', category:'Benefits & Perks', visibility:'candidate', description:'Comprehensive overview of employee benefits, healthcare, retirement, and perks.', text:'Healthcare: comprehensive medical, dental, and vision from day one. 90% premiums covered for employees, 75% for dependents. Mental health support with 12 free therapy sessions. Retirement: 401(k) match up to 6%, fully vested after 2 years. PTO: 25 days annual leave plus public holidays, 5 mental health days, 16 weeks parental leave. Wellness: $1,500 annual stipend, free healthy snacks. Learning: $3,000 annual budget, LinkedIn Learning, Coursera access. Remote: flexible hybrid, $1,000 home office allowance.' },
      { name:'Company Culture Handbook', category:'Culture & Values', visibility:'candidate', description:'Our values, working style, DEI commitments.', text:'Mission: transform how organisations discover and develop talent. Values: People Over Process, Radical Transparency, Continuous Learning, Diverse Perspectives, Customer Obsession. Working style: small autonomous squads of 5-8, async-first, core hours 10am-3pm. DEI: 48% leadership women/non-binary, annual pay equity audits, 5 ERGs.' },
      { name:'Interview Process Guide', category:'Hiring Process', visibility:'candidate', description:'What candidates can expect during our interview process.', text:'Stage 1: Application Review (1-3 days). Stage 2: Recruiter Screen (30 min video). Stage 3: Hiring Manager Interview (45 min, behavioural). Stage 4: Technical Assessment (varies by role, topic shared in advance). Stage 5: Team Meet (45 min casual). Stage 6: Offer within 2 business days. Full process: 2-3 weeks. Single recruiter point of contact throughout.' },
      { name:'Salary & Compensation Bands', category:'Salary & Compensation', visibility:'internal', description:'Internal compensation framework — confidential.', text:'Targets 75th percentile. Engineering: IC1 $75-95k, IC2 $95-130k, IC3 $130-175k, IC4 $175-220k, IC5 $220-280k. Management: M1 $150-200k, M2 $200-250k, M3 $250-320k, VP $320-400k. Geographic adjustments: SF/NY 100%, London/Dubai 95%, Berlin 85%. Equity: 4-year vest, 1-year cliff.' },
      { name:'Brand Voice & Writing Guidelines', category:'Brand Guidelines', visibility:'internal', description:'How we write job descriptions and communications.', text:'Voice: confident not arrogant, warm but professional. JDs: lead with impact, be honest about challenges, always include salary range, avoid jargon, use inclusive language. Emails: clear subject lines, reference something specific, always include next step. Social: authentic over polished, employee stories, behind-the-scenes.' },
      { name:'Engineering Interview Scoring Rubric', category:'Interview Guides', visibility:'internal', description:'Structured scoring criteria for engineering interviews.', text:'Technical Problem Solving (1-5): 1=cannot break down problem, 3=working solution with guidance, 5=elegant solution. System Design (IC3+, 1-5): 1=cannot articulate components, 3=reasonable design, 5=exceptional production-level. Communication (1-5): 1=difficulty explaining, 3=communicates clearly, 5=outstanding. Recommendation: Strong Yes 4.0+, Yes 3.0-3.9, No 2.0-2.9, Strong No <2.0.' },
    ];
    const chunkText = (t,sz=500,ov=50) => { const w=t.split(/\s+/); const c=[]; for(let i=0;i<w.length;i+=sz-ov){c.push(w.slice(i,i+sz).join(' '));if(i+sz>=w.length)break;} return c; };
    SAMPLE_DOCS.forEach(d => {
      const words = d.text.split(/\s+/);
      const chunks = chunkText(d.text);
      ts.company_documents.push({ id: uuidv4(), environment_id: environment.id, name: d.name, category: d.category, visibility: d.visibility, description: d.description, original_filename: d.name.toLowerCase().replace(/\s+/g,'_')+'.txt', mime_type:'text/plain', file_size: d.text.length, text_content: d.text, word_count: words.length, chunks: chunks.map((c,i)=>({index:i,text:c})), chunk_count: chunks.length, created_at: now, updated_at: now, created_by:'system' });
    });

    saveStoreNow(tenantSlug); // synchronous — must complete before response
  });

  // Apply starter configuration (workflows, email templates, career site, scorecard)
  try {
    await applyStarterConfig(tenantSlug, environment, createdObjects, clientData);
  } catch(e) {
    console.error('[provision] Starter config failed (non-fatal):', e.message);
  }

  return {
    client, environment, tenant_slug: tenantSlug,
    admin_user: { ...user, password: '[hidden]' },
    objects: createdObjects.map(o=>({id:o.id,slug:o.slug,name:o.name})),
    roles: createdRoles.map(r=>({id:r.id,name:r.name})),
    credentials: {
      url: `/?tenant=${tenantSlug}`,
      email: adminUser.email,
      password: plainPassword,
      tenant_slug: tenantSlug,
    }
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  ensureCollections();
  const s = getStore();
  const clients = (s.clients||[]).filter(c=>!c.deleted_at);
  const enriched = clients.map(c => {
    const envs   = (s.client_environments||[]).filter(e=>e.client_id===c.id&&!e.deleted_at);
    const envIds = envs.map(e=>e.id);
    // Load from tenant store if provisioned
    const ts      = c.tenant_slug ? loadTenantStore(c.tenant_slug) : s;
    // Records — always use tenant store. Never fall back to master (would show wrong data).
    const records = (ts.records||[]).filter(r=>envIds.includes(r.environment_id)&&!r.deleted_at);
    // Users — check both stores
    const tsU = (ts.users||[]).filter(u=>(u.client_id===c.id||envIds.includes(u.environment_id))&&!u.deleted_at);
    const msU = (s.users||[]).filter(u=>(u.client_id===c.id||envIds.includes(u.environment_id))&&!u.deleted_at);
    const seenU = new Set(); const users = [...tsU,...msU].filter(u=>{ if(seenU.has(u.id)) return false; seenU.add(u.id); return true; });
    return { ...c, env_count: envs.length, record_count: records.length, user_count: users.length, tenant_slug: c.tenant_slug || null };
  });
  res.json(enriched);
});

router.get('/provision/templates', (req, res) => {
  res.json(Object.entries(TEMPLATES).map(([key, tpl]) => ({
    key, label: tpl.label, description: tpl.description, icon: tpl.icon,
    object_count: (tpl.objects||[]).length + ((tpl.extra_objects||[]).length),
  })));
});

router.get('/provision/log', (req, res) => {
  ensureCollections();
  res.json((getStore().provision_log||[]).slice().reverse());
});

router.get('/stats/platform', (req, res) => {
  ensureCollections();
  const s = getStore();
  const clients = (s.clients||[]).filter(c=>!c.deleted_at);
  const envs    = (s.client_environments||[]).filter(e=>!e.deleted_at);
  const records = (s.records||[]).filter(r=>!r.deleted_at);
  const users   = (s.users||[]).filter(u=>!u.deleted_at);
  const objects = (s.objects||[]).filter(o=>!o.deleted_at);
  const recordsByEnv = {};
  records.forEach(r=>{ recordsByEnv[r.environment_id]=(recordsByEnv[r.environment_id]||0)+1; });
  const topEnvs = envs.map(e=>({...e,record_count:recordsByEnv[e.id]||0}))
    .sort((a,b)=>b.record_count-a.record_count).slice(0,5);
  const statusBreakdown = clients.reduce((a,c)=>({...a,[c.status]:(a[c.status]||0)+1}),{});
  const planBreakdown   = clients.reduce((a,c)=>({...a,[c.plan]:(a[c.plan]||0)+1}),{});
  const storeSizeKB = Math.round(Buffer.byteLength(JSON.stringify(s),'utf8')/1024);
  res.json({
    totals: { clients:clients.length, environments:envs.length, records:records.length, users:users.length, objects:objects.length },
    status_breakdown: statusBreakdown, plan_breakdown: planBreakdown,
    top_environments: topEnvs, store_size_kb: storeSizeKB, generated_at: new Date().toISOString(),
  });
});

router.get('/:id/stats', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const envIds = new Set(envs.map(e=>e.id));

  // Load from tenant store if provisioned, otherwise master
  const ts = client.tenant_slug ? loadTenantStore(client.tenant_slug) : s;

  // Records — always use tenant store only. Never fall back to master.
  const records = (ts.records||[]).filter(r=>envIds.has(r.environment_id)&&!r.deleted_at);

  // Users — check both stores (user may be in master store with env_id pointing to tenant env)
  const tsUsers = (ts.users||[]).filter(u=>(u.client_id===client.id||envIds.has(u.environment_id))&&!u.deleted_at);
  const masterUsers = (s.users||[]).filter(u=>(u.client_id===client.id||envIds.has(u.environment_id))&&!u.deleted_at);
  const userIds = new Set();
  const users = [...tsUsers, ...masterUsers].filter(u => {
    if (userIds.has(u.id)) return false;
    userIds.add(u.id); return true;
  });

  // Objects — always use tenant store only
  const objects = (ts.objects||[]).filter(o=>envIds.has(o.environment_id)&&!o.deleted_at);
  const log     = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  const thirtyDaysAgo = new Date(Date.now()-30*24*60*60*1000);
  const byDay = {};
  records.filter(r=>new Date(r.created_at)>thirtyDaysAgo)
    .forEach(r=>{ const d=r.created_at.slice(0,10); byDay[d]=(byDay[d]||0)+1; });
  // Sandboxes for this client's environments
  const sandboxes = (ts.sandboxes||s.sandboxes||[])
    .filter(sb => !sb.deleted_at && envIds.has(sb.production_env_id))
    .map(sb => {
      const sbEnv = (ts.environments||s.environments||[]).find(e=>e.id===sb.sandbox_env_id);
      return {
        id: sb.id,
        name: sb.name,
        status: sb.status,
        production_env_id: sb.production_env_id,
        sandbox_env_id: sb.sandbox_env_id,
        sandbox_env_name: sbEnv?.name || sb.name,
        created_at: sb.created_at,
        promoted_at: sb.promoted_at,
      };
    });

  res.json({
    client_id: client.id, client_name: client.name,
    environment_count: envs.length, record_count: records.length,
    user_count: users.length, object_count: objects.length,
    environments: envs,
    sandboxes,
    records_last_30d: byDay, provision_log: log,
  });
});

// ── Activity Report — per environment or global ──────────────────────────────
router.get('/:id/activity-report', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const days = parseInt(req.query.days) || 30;
  const envFilter = req.query.environment_id || null;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  // Get environments for this client
  const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const envIds = envFilter ? new Set([envFilter]) : new Set(envs.map(e=>e.id));
  const allEnvIds = envIds;

  // Load from tenant store if provisioned
  const ts = client.tenant_slug ? loadTenantStore(client.tenant_slug) : s;

  // Activity log entries
  const allActivity = (ts.activity||[]).filter(a => allEnvIds.has(a.environment_id));
  const recentActivity = allActivity.filter(a => a.created_at >= cutoff);

  // Records
  const allRecords = (ts.records||[]).filter(r => allEnvIds.has(r.environment_id) && !r.deleted_at);
  const recentRecords = allRecords.filter(r => r.created_at >= cutoff);

  // Users
  const allUsers = (ts.users||[]).filter(u => {
    if (u.client_id === client.id) return true;
    return u.environment_id && allEnvIds.has(u.environment_id);
  }).filter(u => !u.deleted_at);

  // Objects
  const objects = (ts.objects||[]).filter(o => allEnvIds.has(o.environment_id) && !o.deleted_at);

  // Communications
  const comms = (ts.communications||[]).filter(c => allEnvIds.has(c.environment_id) && c.created_at >= cutoff);

  // Workflows
  const workflows = (ts.workflows||[]).filter(w => allEnvIds.has(w.environment_id) && !w.deleted_at);

  // Interviews
  const interviews = (s.interviews||[]).filter(i => allEnvIds.has(i.environment_id) && i.created_at >= cutoff);

  // Offers
  const offers = (s.offers||[]).filter(o => allEnvIds.has(o.environment_id) && !o.deleted_at);

  // Portal feedback
  const feedback = (s.portal_feedback||[]).filter(f => allEnvIds.has(f.environment_id) && f.created_at >= cutoff);

  // ── Aggregations ──

  // Activity by action type
  const byAction = {};
  recentActivity.forEach(a => { byAction[a.action] = (byAction[a.action]||0) + 1; });

  // Activity by object
  const byObject = {};
  recentActivity.forEach(a => {
    const obj = objects.find(o => o.id === a.object_id);
    const name = obj?.plural_name || obj?.name || 'Unknown';
    if (!byObject[name]) byObject[name] = { name, created:0, updated:0, deleted:0, total:0 };
    byObject[name][a.action] = (byObject[name][a.action]||0) + 1;
    byObject[name].total++;
  });

  // Daily activity trend
  const dailyTrend = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayActivity = recentActivity.filter(a => a.created_at.startsWith(dateStr));
    const dayRecords = recentRecords.filter(r => r.created_at.startsWith(dateStr));
    const dayComms = comms.filter(c => c.created_at.startsWith(dateStr));
    dailyTrend.push({
      date: dateStr,
      activities: dayActivity.length,
      records_created: dayRecords.length,
      communications: dayComms.length,
    });
  }

  // Active users (logged in during period)
  const activeUsers = allUsers.filter(u => u.last_login && u.last_login >= cutoff)
    .map(u => ({
      id: u.id, email: u.email, name: [u.first_name, u.last_name].filter(Boolean).join(' '),
      role: u.role?.name || u.role_name || '—',
      last_login: u.last_login, login_count: u.login_count || 0,
    }))
    .sort((a,b) => (b.last_login||'').localeCompare(a.last_login||''));

  // Recent activity feed (last 50)
  const recentFeed = recentActivity.slice().sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,50).map(a => {
    const obj = objects.find(o => o.id === a.object_id);
    const record = allRecords.find(r => r.id === a.record_id);
    const recordName = record?.data?.first_name
      ? [record.data.first_name, record.data.last_name].filter(Boolean).join(' ')
      : record?.data?.job_title || record?.data?.name || record?.data?.pool_name || a.record_id?.slice(0,8);
    return {
      id: a.id, action: a.action, object_name: obj?.name || '—', record_name: recordName,
      actor: a.actor || 'system', created_at: a.created_at,
      changes_summary: a.changes ? Object.keys(a.changes).slice(0,5).join(', ') : null,
    };
  });

  // Per-environment breakdown (if viewing all envs)
  const envBreakdown = envs.map(env => {
    const envActivity = recentActivity.filter(a => a.environment_id === env.id);
    const envRecords = allRecords.filter(r => r.environment_id === env.id);
    const envUsers = allUsers.filter(u => u.environment_id === env.id || u.client_id === client.id);
    return {
      id: env.id, name: env.name, type: env.type || 'production',
      total_records: envRecords.length,
      recent_activity: envActivity.length,
      active_users: envUsers.filter(u => u.last_login && u.last_login >= cutoff).length,
      last_activity: envActivity.length ? envActivity.sort((a,b)=>b.created_at.localeCompare(a.created_at))[0].created_at : null,
    };
  });

  res.json({
    client_id: client.id,
    client_name: client.name,
    period_days: days,
    environment_filter: envFilter,
    summary: {
      total_records: allRecords.length,
      records_created: recentRecords.length,
      total_activity: recentActivity.length,
      active_users: activeUsers.length,
      total_users: allUsers.length,
      total_objects: objects.length,
      total_workflows: workflows.length,
      communications_sent: comms.length,
      interviews_scheduled: interviews.length,
      offers: offers.length,
      feedback_received: feedback.length,
    },
    by_action: byAction,
    by_object: Object.values(byObject).sort((a,b)=>b.total-a.total),
    daily_trend: dailyTrend,
    active_users: activeUsers,
    recent_feed: recentFeed,
    environments: envBreakdown,
  });
});

// ── Global activity report (all clients) ─────────────────────────────────────
router.get('/reports/activity-summary', (req, res) => {
  ensureCollections();
  const s = getStore();
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const clients = (s.clients||[]).filter(c=>!c.deleted_at);
  const allActivity = (s.activity||[]).filter(a => a.created_at >= cutoff);
  const allRecords = (s.records||[]).filter(r => !r.deleted_at);
  const allUsers = (s.users||[]).filter(u => !u.deleted_at);

  const clientSummaries = clients.map(c => {
    const envs = (s.client_environments||[]).filter(e=>e.client_id===c.id&&!e.deleted_at);
    const envIds = new Set(envs.map(e=>e.id));
    const activity = allActivity.filter(a => envIds.has(a.environment_id));
    const records = allRecords.filter(r => envIds.has(r.environment_id));
    const users = allUsers.filter(u => u.client_id === c.id);
    const activeUsers = users.filter(u => u.last_login && u.last_login >= cutoff);
    return {
      id: c.id, name: c.name, plan: c.plan, status: c.status,
      total_records: records.length, recent_activity: activity.length,
      total_users: users.length, active_users: activeUsers.length,
      last_activity: activity.length ? activity.sort((a,b)=>b.created_at.localeCompare(a.created_at))[0].created_at : null,
    };
  }).sort((a,b) => b.recent_activity - a.recent_activity);

  res.json({
    period_days: days,
    total_clients: clients.length,
    total_activity: allActivity.length,
    total_records: allRecords.length,
    total_users: allUsers.length,
    clients: clientSummaries,
  });
});

router.get('/:id', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const envs  = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const users = (s.users||[]).filter(u=>u.client_id===client.id&&!u.deleted_at);
  const log   = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  res.json({ ...client, environments: envs, users, provision_log: log });
});

// ── POST /:id/users — create a user for a client ─────────────────────────────
router.post('/:id/users', express.json(), async (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const { first_name, last_name, email, role_id, environment_id, password } = req.body;
  if (!first_name || !last_name || !email || !role_id || !environment_id) {
    return res.status(400).json({ error: 'first_name, last_name, email, role_id, environment_id required' });
  }
  if ((s.users||[]).find(u=>u.email===email&&!u.deleted_at)) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const bcrypt = require('bcryptjs');
  const rawPassword = password || `Welcome${Math.floor(Math.random()*9000+1000)}!`;
  const hash = await bcrypt.hash(rawPassword, 10);
  const uid = () => require('crypto').randomUUID();

  if (!s.users) s.users = [];
  const user = {
    id: uid(), client_id: client.id, environment_id,
    first_name, last_name, email,
    role_id, status: 'active',
    password_hash: hash,
    auth_provider: 'local',
    must_change_password: 1,
    login_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  s.users.push(user);
  saveStore();

  // Log provision event
  if (!s.provision_log) s.provision_log = [];
  s.provision_log.push({
    id: uid(), client_id: client.id, action: 'user_created',
    details: { email, first_name, last_name, role_id },
    created_at: new Date().toISOString(),
  });
  saveStore();

  res.status(201).json({ ...user, password_hash: undefined, temp_password: rawPassword });
});

// ── PATCH /:id/users/:userId — update a client user ──────────────────────────
router.patch('/:id/users/:userId', express.json(), (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = (s.users||[]).findIndex(u=>u.id===req.params.userId&&u.client_id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'User not found' });
  const allowed = ['first_name','last_name','role_id','status'];
  allowed.forEach(k => { if (req.body[k]!==undefined) s.users[idx][k]=req.body[k]; });
  s.users[idx].updated_at = new Date().toISOString();
  saveStore();
  res.json(s.users[idx]);
});

// ── GET /:id/error-logs — error logs for this client's environments ───────────
router.get('/:id/error-logs', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const envIds = new Set((s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at).map(e=>e.id));
  const { page=1, limit=50, severity, resolved, search } = req.query;
  let logs = (s.error_logs||[]).filter(l=>envIds.has(l.environment_id));
  if (severity) logs = logs.filter(l=>l.severity===severity);
  if (resolved!==undefined) logs = logs.filter(l=>String(l.resolved)===resolved);
  if (search) { const q=search.toLowerCase(); logs=logs.filter(l=>l.message?.toLowerCase().includes(q)||l.code?.toLowerCase().includes(q)||l.user_email?.toLowerCase().includes(q)); }
  logs = [...logs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const total = logs.length;
  const offset = (Number(page)-1)*Number(limit);
  res.json({ logs: logs.slice(offset,offset+Number(limit)), total, page:Number(page) });
});

// ── GET /:id/activity — activity log for this client's environments ───────────
router.get('/:id/activity', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const envIds = new Set((s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at).map(e=>e.id));
  const ts = client.tenant_slug ? loadTenantStore(client.tenant_slug) : s;
  const { page=1, limit=50, search, action } = req.query;
  let logs = [
    ...(ts.activity_log||[]).filter(l=>envIds.has(l.environment_id)),
    ...(s.audit_log||[]).filter(l=>l.user_id&&(s.users||[]).find(u=>u.id===l.user_id&&u.client_id===client.id)),
  ];
  if (action) logs = logs.filter(l=>l.action===action||l.type===action);
  if (search) { const q=search.toLowerCase(); logs=logs.filter(l=>(l.action||l.type||'').toLowerCase().includes(q)||(l.record_name||l.entity_id||'').toLowerCase().includes(q)); }
  logs = [...logs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const total = logs.length;
  const offset = (Number(page)-1)*Number(limit);
  res.json({ items: logs.slice(offset,offset+Number(limit)), total, page:Number(page) });
});

router.post('/provision', express.json(), async (req, res) => {
  const { client, environment, admin_user, template } = req.body;
  if (!client?.name)      return res.status(400).json({ error: 'client.name required' });
  if (!admin_user?.email) return res.status(400).json({ error: 'admin_user.email required' });
  ensureCollections();
  const existing = (getStore().clients||[]).find(c=>!c.deleted_at&&c.name.toLowerCase()===client.name.toLowerCase());
  if (existing) return res.status(409).json({ error: `Client "${client.name}" already exists` });
  try {
    res.status(201).json(await provisionClient(client, environment||{}, admin_user, template||'core_recruitment'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  ensureCollections();
  const s = getStore(); const now = new Date().toISOString();
  const client = { id: uuidv4(), ...req.body, status: req.body.status||'active', created_at: now, updated_at: now, deleted_at: null };
  s.clients.push(client); saveStore(); res.status(201).json(client);
});

router.patch('/:id/status', (req, res) => {
  ensureCollections();
  const s = getStore(); const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'Not found' });
  s.clients[idx].status = req.body.status; s.clients[idx].updated_at = new Date().toISOString();
  saveStore(); res.json(s.clients[idx]);
});

router.patch('/:id', (req, res) => {
  ensureCollections();
  const s = getStore(); const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'Not found' });
  s.clients[idx] = { ...s.clients[idx], ...req.body, updated_at: new Date().toISOString() };
  saveStore(); res.json(s.clients[idx]);
});

router.delete('/:id', (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'Not found' });

  const client = s.clients[idx];
  const tenantSlug = client.tenant_slug;

  // Soft-delete the client record
  s.clients[idx].deleted_at = new Date().toISOString();
  s.clients[idx].status = 'churned';
  saveStore();

  // Hard-delete the tenant JSON file from the Volume so the slug can be reused clean
  if (tenantSlug) {
    const { tenantDbPath } = require('../db/init');
    const fs = require('fs');
    const filePath = tenantDbPath(tenantSlug);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑  Deleted tenant file: ${filePath}`);
      }
      // Also evict from memory cache
      const { storeCache } = require('../db/init');
      delete storeCache[tenantSlug];
    } catch(e) {
      console.error(`⚠️  Could not delete tenant file for ${tenantSlug}:`, e.message);
    }
  }

  res.json({ deleted: true, tenant_file_removed: !!tenantSlug });
});

router.get('/:clientId/environments', (req, res) => {
  ensureCollections();
  const s = getStore();
  const envs = (s.client_environments||[]).filter(e=>e.client_id===req.params.clientId&&!e.deleted_at);
  res.json(envs.map(e => {
    const records = (s.records||[]).filter(r=>r.environment_id===e.id&&!r.deleted_at);
    const objects = (s.objects||[]).filter(o=>o.environment_id===e.id&&!o.deleted_at);
    const users   = (s.users||[]).filter(u=>u.environment_id===e.id&&!u.deleted_at);
    return { ...e, record_count: records.length, object_count: objects.length, user_count: users.length };
  }));
});

router.patch('/:clientId/environments/:envId/status', (req, res) => {
  ensureCollections();
  const s = getStore();
  const idx = (s.client_environments||[]).findIndex(e=>e.id===req.params.envId);
  if (idx===-1) return res.status(404).json({ error: 'Not found' });
  s.client_environments[idx].status = req.body.status;
  s.client_environments[idx].updated_at = new Date().toISOString();
  const mainIdx = (s.environments||[]).findIndex(e=>e.id===req.params.envId);
  if (mainIdx!==-1) s.environments[mainIdx].status = req.body.status;
  saveStore(); res.json(s.client_environments[idx]);
});

// ─── Load test data into an environment ──────────────────────────────────────
router.post('/load-test-data', async (req, res) => {
  const { environment_id, tenant_slug } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  // Run within the correct tenant context so getStore() returns the right store
  const slug = tenant_slug || 'master';
  if (slug !== 'master') loadTenantStore(slug);

  await tenantStorage.run(slug, async () => {
    const s = getStore();
    const env = (s.environments||[]).find(e => e.id === environment_id);
    if (!env) return res.status(404).json({ error: 'Environment not found' });
    try {
      const loadTestData = require('../data/test_data_seed');
      const results = await loadTestData(environment_id);
      s.provision_log = s.provision_log || [];
      s.provision_log.push({ id: uuidv4(), environment_id, action: 'load_test_data', details: `Loaded: ${results.people} people, ${results.jobs} jobs, ${results.pools} pools`, performed_by: 'superadmin', created_at: new Date().toISOString() });
      saveStore();
      res.json({ success: true, ...results });
    } catch (err) {
      console.error('Load test data error:', err);
      res.status(500).json({ error: err.message });
    }
  });
});


// ── Clear all records for an environment ─────────────────────────────────────
// DELETE /api/superadmin/clients/:id/environments/:envId/records
// Deletes ALL records (and related data) in the environment. Irreversible.
router.delete('/:clientId/environments/:envId/records', (req, res) => {
  ensureCollections();
  const { clientId, envId } = req.params;
  const { confirm } = req.query; // require ?confirm=yes as safety gate
  if (confirm !== 'yes') {
    return res.status(400).json({ error: 'Add ?confirm=yes to confirm this destructive action' });
  }
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===clientId&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Find which store to operate on
  const tenantSlug = client.tenant_slug;
  const store = tenantSlug ? loadTenantStore(tenantSlug) : s;

  // Tables to clear for this environment
  const CLEARABLE = [
    'records','notes','communications','interviews','offers',
    'attachments','people_links','record_workflow_assignments',
    'activity','activity_log','form_responses',
  ];

  const counts = {};
  CLEARABLE.forEach(table => {
    if (!store[table]) return;
    const before = store[table].length;
    store[table] = store[table].filter(r => r.environment_id !== envId);
    counts[table] = before - store[table].length;
  });

  const totalRemoved = Object.values(counts).reduce((a,b)=>a+b, 0);
  saveStore(tenantSlug);

  // Log it
  s.provision_log = s.provision_log || [];
  s.provision_log.push({
    id: uuidv4(), client_id: clientId, environment_id: envId,
    action: 'clear_all_records',
    details: `Deleted ${totalRemoved} records across ${Object.keys(counts).filter(k=>counts[k]>0).join(', ')}`,
    performed_by: 'superadmin', created_at: new Date().toISOString(),
  });
  saveStore();

  res.json({ success: true, total_removed: totalRemoved, breakdown: counts });
});

// ── Clear ALL records across ALL environments for a client ────────────────────
// DELETE /api/superadmin/clients/:id/records
router.delete('/:clientId/records', (req, res) => {
  ensureCollections();
  const { confirm } = req.query;
  if (confirm !== 'yes') {
    return res.status(400).json({ error: 'Add ?confirm=yes to confirm this destructive action' });
  }
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.clientId&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const tenantSlug = client.tenant_slug;
  const store = tenantSlug ? loadTenantStore(tenantSlug) : s;

  const CLEARABLE = [
    'records','notes','communications','interviews','offers',
    'attachments','people_links','record_workflow_assignments',
    'activity','activity_log','form_responses',
  ];

  let totalRemoved = 0;
  CLEARABLE.forEach(table => {
    if (!store[table]) return;
    totalRemoved += store[table].length;
    store[table] = [];
  });

  saveStore(tenantSlug);

  s.provision_log = s.provision_log || [];
  s.provision_log.push({
    id: uuidv4(), client_id: client.id,
    action: 'clear_all_records_all_environments',
    details: `Deleted all ${totalRemoved} records across all environments`,
    performed_by: 'superadmin', created_at: new Date().toISOString(),
  });
  saveStore();

  res.json({ success: true, total_removed: totalRemoved });
});

// ── Impersonation — generate a short-lived token to log in as a client admin ─
// Token lives in master store for 5 minutes, single-use.
router.post('/:id/impersonate', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c => c.id === req.params.id && !c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (!client.tenant_slug) return res.status(400).json({ error: 'Client has no tenant slug — re-provision to fix' });

  // Find the admin user in the tenant store
  const ts = loadTenantStore(client.tenant_slug);
  const adminUser = (ts.users||[]).find(u =>
    !u.deleted_at && u.status === 'active' &&
    (u.is_super_admin || (()=>{ const r=(ts.roles||[]).find(r=>r.id===u.role_id); return r?.slug==='super_admin'||r?.slug==='admin'; })())
  ) || (ts.users||[])[0];

  if (!adminUser) return res.status(400).json({ error: 'No admin user found in tenant — seed demo data first' });

  // Generate a single-use token
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  if (!s.impersonation_tokens) s.impersonation_tokens = [];
  // Purge expired tokens
  s.impersonation_tokens = s.impersonation_tokens.filter(t => t.expires_at > new Date().toISOString());
  s.impersonation_tokens.push({
    token, client_id: client.id, tenant_slug: client.tenant_slug,
    user_id: adminUser.id, expires_at: expiresAt, used: false,
  });
  saveStore();

  const appUrl = `https://${client.tenant_slug}.vercentic.com/?impersonate=${token}`;
  res.json({ token, app_url: appUrl, expires_at: expiresAt, user_email: adminUser.email });
});


// GET /:id/roles — fetch roles from the client's tenant store
router.get('/:id/roles', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  
  const tenantSlug = client.tenant_slug;
  if (!tenantSlug) return res.json([]);
  
  // Read from the tenant store
  const tenantFile = path.join(__dirname, '../../data', `tenant-${tenantSlug}.json`);
  if (!fs.existsSync(tenantFile)) return res.json([]);
  
  try {
    const tenantData = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    const roles = (tenantData.roles || []).filter(r => !r.deleted_at);
    res.json(roles);
  } catch (e) {
    res.json([]);
  }
});

// GET /:id/environments-with-roles — fetch environments from tenant store
router.get('/:id/environments-with-roles', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  
  const tenantSlug = client.tenant_slug;
  if (!tenantSlug) return res.json({ environments: [], roles: [] });
  
  const tenantFile = path.join(__dirname, '../../data', `tenant-${tenantSlug}.json`);
  if (!fs.existsSync(tenantFile)) return res.json({ environments: [], roles: [] });
  
  try {
    const tenantData = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    const environments = (tenantData.environments || []).filter(e => !e.deleted_at);
    const roles        = (tenantData.roles || []).filter(r => !r.deleted_at);
    res.json({ environments, roles });
  } catch (e) {
    res.json({ environments: [], roles: [] });
  }
});

module.exports = router;
