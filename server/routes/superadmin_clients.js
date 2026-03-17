const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

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
    objects = [...(base.objects || []), ...(tpl.extra_objects || [])];
  }
  return { objects, roles: tpl.default_roles || TEMPLATES.core_recruitment.default_roles };
}

async function provisionClient(clientData, envData, adminUser, templateKey) {
  const s = getStore(); ensureCollections();
  const now = new Date().toISOString();

  const client = {
    id: uuidv4(), name: clientData.name, industry: clientData.industry||'',
    region: clientData.region||'', plan: clientData.plan||'starter', size: clientData.size||'',
    status: 'active', primary_contact_name: clientData.contact_name||'',
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
    timezone: envData.timezone||'UTC', is_default: true, status: 'active',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.client_environments.push(environment);
  if (!s.environments) s.environments = [];
  s.environments.push({ ...environment });

  if (!s.objects) s.objects = [];
  if (!s.fields)  s.fields  = [];
  if (!s.roles)   s.roles   = [];

  const { objects, roles } = buildTemplate(templateKey || 'core_recruitment');
  const createdObjects = [];

  for (const objDef of objects) {
    const obj = {
      id: uuidv4(), environment_id: environment.id, slug: objDef.slug,
      name: objDef.name, plural_name: objDef.plural_name, icon: objDef.icon||'database',
      color: objDef.color||'#4361EE', is_system: objDef.is_system!==false,
      sort_order: createdObjects.length, created_at: now, updated_at: now, deleted_at: null,
    };
    s.objects.push(obj); createdObjects.push(obj);
    (objDef.fields||[]).forEach((fDef, i) => {
      s.fields.push({
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
    const role = {
      id: uuidv4(), environment_id: environment.id, name: roleDef.name,
      permissions: roleDef.permissions, color: roleDef.color||'#4361EE',
      is_system: true, created_at: now, updated_at: now, deleted_at: null,
    };
    s.roles.push(role); createdRoles.push(role);
  }

  if (!s.users) s.users = [];
  const superAdminRole = createdRoles.find(r=>r.name==='Super Admin')||createdRoles[0];
  const user = {
    id: uuidv4(), environment_id: environment.id, client_id: client.id,
    first_name: adminUser.first_name||'Admin', last_name: adminUser.last_name||'User',
    email: adminUser.email, password: adminUser.password||'Admin1234!',
    role_id: superAdminRole?.id||null, role_name: superAdminRole?.name||'Super Admin',
    status: 'active', is_super_admin: true,
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.users.push(user);

  s.provision_log.push({
    id: uuidv4(), client_id: client.id, environment_id: environment.id,
    template: templateKey||'core_recruitment', objects_seeded: createdObjects.length,
    fields_seeded: s.fields.filter(f=>f.environment_id===environment.id).length,
    roles_seeded: createdRoles.length, admin_email: adminUser.email,
    provisioned_at: now, status: 'success',
  });

  saveStore();
  return {
    client, environment,
    admin_user: { ...user, password: '[hidden]' },
    objects: createdObjects.map(o=>({id:o.id,slug:o.slug,name:o.name})),
    roles: createdRoles.map(r=>({id:r.id,name:r.name})),
    credentials: { url:'/', email: adminUser.email, password: adminUser.password||'Admin1234!' }
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  ensureCollections();
  const s = getStore();
  const clients = (s.clients||[]).filter(c=>!c.deleted_at);
  const enriched = clients.map(c => {
    const envs    = (s.client_environments||[]).filter(e=>e.client_id===c.id&&!e.deleted_at);
    const envIds  = envs.map(e=>e.id);
    const records = (s.records||[]).filter(r=>envIds.includes(r.environment_id)&&!r.deleted_at);
    const users   = (s.users||[]).filter(u=>u.client_id===c.id&&!u.deleted_at);
    return { ...c, env_count: envs.length, record_count: records.length, user_count: users.length };
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
  const envs    = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const envIds  = new Set(envs.map(e=>e.id));
  const records = (s.records||[]).filter(r=>envIds.has(r.environment_id)&&!r.deleted_at);
  const users   = (s.users||[]).filter(u=>u.client_id===client.id&&!u.deleted_at);
  const objects = (s.objects||[]).filter(o=>envIds.has(o.environment_id)&&!o.deleted_at);
  const log     = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  const thirtyDaysAgo = new Date(Date.now()-30*24*60*60*1000);
  const byDay = {};
  records.filter(r=>new Date(r.created_at)>thirtyDaysAgo)
    .forEach(r=>{ const d=r.created_at.slice(0,10); byDay[d]=(byDay[d]||0)+1; });
  res.json({
    client_id: client.id, client_name: client.name,
    environment_count: envs.length, record_count: records.length,
    user_count: users.length, object_count: objects.length,
    records_last_30d: byDay, provision_log: log,
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

router.post('/provision', async (req, res) => {
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
  const s = getStore(); const idx = (s.clients||[]).findIndex(c=>c.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error: 'Not found' });
  s.clients[idx].deleted_at = new Date().toISOString();
  s.clients[idx].status = 'churned'; saveStore(); res.json({ deleted: true });
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
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
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

module.exports = router;
