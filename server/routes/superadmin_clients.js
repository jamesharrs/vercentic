'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto  = require('crypto');
const { getStore, saveStore, saveStoreNow, tenantStorage, provisionTenant, loadTenantStore } = require('../db/init');

const bcrypt = require('bcryptjs');
const hashPassword = (pw) => bcrypt.hashSync(pw, 12);

function ensureCollections() {
  const s = getStore();
  if (!s.clients)             { s.clients = [];             saveStore(); }
  if (!s.client_environments) { s.client_environments = []; saveStore(); }
  if (!s.provision_log)       { s.provision_log = [];       saveStore(); }
}

// Read a tenant store — uses PG-backed loadTenantStore so it works on Railway
function getTenantStore(slug) {
  if (!slug) return {};
  try { return loadTenantStore(slug) || {}; }
  catch(e) { return {}; }
}

// ─── Templates (imported from data/templates.js) ──────────────────────────────
const {
  resolveTemplate, buildStandardConfig, listTemplates, getDefaultTemplateKey, DEFAULT_ROLES,
} = require('../data/templates');
const TEMPLATES = require('../data/templates').TEMPLATES;

// ─── Main provision function ──────────────────────────────────────────────────
async function provisionClient(clientData, envData, adminUser, templateKey) {
  const s   = getStore(); ensureCollections();
  const now = new Date().toISOString();

  const tenantSlug = clientData.name
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);

  // ── 1. Master store: client record + environment reference only ─────────────
  const client = {
    id: uuidv4(), name: clientData.name, industry: clientData.industry||'',
    region: clientData.region||'', plan: clientData.plan||'starter', size: clientData.size||'',
    status: 'active', tenant_slug: tenantSlug,
    primary_contact_name:  clientData.contact_name||'',
    primary_contact_email: clientData.contact_email||'',
    primary_contact_phone: clientData.contact_phone||'',
    website: clientData.website||'', notes: clientData.notes||'',
    trial_ends_at: clientData.plan==='trial'
      ? new Date(Date.now()+30*24*60*60*1000).toISOString() : null,
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.clients.push(client);

  const environment = {
    id: uuidv4(), client_id: client.id,
    name: envData.name||`${clientData.name} Production`,
    type: envData.type||'production', locale: envData.locale||'en',
    timezone: envData.timezone||'UTC', is_default: 1, status: 'active',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.client_environments.push(environment);
  saveStore(); // persist master changes before touching tenant store

  // ── 2. Tenant store: everything else lives here ─────────────────────────────
  const ts = provisionTenant(tenantSlug);

  // Environment also needs to be in the tenant store so /api/environments works
  ts.environments = [{ ...environment }];

  // Resolve template
  const { objects, roles, tier } = resolveTemplate(templateKey || getDefaultTemplateKey());
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

    (objDef.fields||[]).forEach((fDef, i) => {
      createdFields.push({
        id: uuidv4(), environment_id: environment.id, object_id: obj.id,
        name: fDef.name, api_key: fDef.api_key, field_type: fDef.field_type,
        is_required: fDef.is_required||false, show_in_list: fDef.show_in_list!==false,
        options: fDef.options||null, related_object_slug: fDef.related_object_slug||null,
        people_multi: fDef.people_multi !== undefined ? fDef.people_multi : null,
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

  const superAdminRole = createdRoles.find(r => r.name === 'Super Admin') || createdRoles[0];
  const plainPassword  = adminUser.password || 'Admin1234!';
  const adminUserRecord = {
    id: uuidv4(), environment_id: environment.id, client_id: client.id,
    email: adminUser.email || `admin@${tenantSlug}.com`,
    first_name: adminUser.first_name || 'Admin',
    last_name:  adminUser.last_name  || 'User',
    role_id: superAdminRole?.id || null, role_name: 'super_admin',
    password_hash: hashPassword(plainPassword),
    status: 'active', auth_provider: 'local', mfa_enabled: false,
    must_change_password: false, login_count: 0, last_login: null,
    created_at: now, updated_at: now, deleted_at: null,
  };

  const stdConfig = buildStandardConfig(tier, environment.id, objectMap, now, uuidv4);

  // Write everything into the isolated tenant store
  ['objects','fields','roles','users','workflows','portals','forms',
   'file_types','email_templates','interview_types']
    .forEach(col => { if (!ts[col]) ts[col] = []; });

  createdObjects          .forEach(o => ts.objects          .push(o));
  createdFields           .forEach(f => ts.fields           .push(f));
  createdRoles            .forEach(r => ts.roles            .push(r));
  ts.users                .push(adminUserRecord);
  stdConfig.workflows     .forEach(w => ts.workflows        .push(w));
  stdConfig.portals       .forEach(p => ts.portals          .push(p));
  stdConfig.forms         .forEach(f => ts.forms            .push(f));
  stdConfig.fileTypes     .forEach(f => ts.file_types       .push(f));
  stdConfig.emailTemplates.forEach(e => ts.email_templates  .push(e));
  stdConfig.interviewTypes.forEach(i => ts.interview_types  .push(i));

  // Seed RBAC permissions into the tenant store
  const { seedDefaultPermissions } = require('../middleware/rbac');
  seedDefaultPermissions(ts);

  // Seed system email templates (email_templates_v2) into the tenant store
  const masterStore = getStore();
  const systemTemplates = (masterStore.email_templates_v2 || []).filter(t => t.is_system && !t.deleted_at);
  if (!ts.email_templates_v2) ts.email_templates_v2 = [];
  systemTemplates.forEach(t => {
    if (!ts.email_templates_v2.find(e => e.slug === t.slug)) {
      ts.email_templates_v2.push({ ...t });
    }
  });

  // Persist the tenant store
  saveStoreNow(tenantSlug);

  // Provision log goes in master
  s.provision_log.push({
    id: uuidv4(), client_id: client.id, environment_id: environment.id,
    template: templateKey||'recruitment_starter', admin_email: adminUserRecord.email,
    objects_seeded:         createdObjects.length,
    fields_seeded:          createdFields.length,
    roles_seeded:           createdRoles.length,
    workflows_seeded:       stdConfig.workflows.length,
    portals_seeded:         stdConfig.portals.length,
    forms_seeded:           stdConfig.forms.length,
    file_types_seeded:      stdConfig.fileTypes.length,
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
    // Pull real counts from the isolated tenant store
    let record_count = 0, user_count = 0, object_count = 0;
    if (c.tenant_slug) {
      const ts = getTenantStore(c.tenant_slug);
      record_count = (ts.records||[]).filter(r=>!r.deleted_at).length;
      user_count   = (ts.users||[]).filter(u=>!u.deleted_at).length;
      object_count = (ts.objects||[]).filter(o=>!o.deleted_at).length;
    }
    return { ...c, env_count: envs.length, record_count, user_count, object_count, latest_provision: logs[logs.length-1]||null };
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  res.json(clients);
});

router.get('/provision/templates', (req, res) => {
  res.json(listTemplates());
});

router.get('/stats/overview', (req, res) => {
  const s = getStore(); ensureCollections();
  const clients    = (s.clients||[]).filter(c=>!c.deleted_at);
  const byStatus   = clients.reduce((a,c)=>{ a[c.status]=(a[c.status]||0)+1; return a; },{});
  const byPlan     = clients.reduce((a,c)=>{ a[c.plan]=(a[c.plan]||0)+1; return a; },{});
  const totalEnvs  = (s.client_environments||[]).filter(e=>!e.deleted_at).length;
  const fileSizeKB = Math.round(JSON.stringify(s).length/1024);
  // Aggregate records/users across all tenant stores for accurate counts
  const { listTenants } = require('../db/init');
  let totalRecs = 0, totalUsers = 0;
  try {
    const tenants = listTenants ? listTenants() : [];
    for (const slug of tenants) {
      try {
        const ts = getTenantStore(slug);
        totalRecs  += (ts.records||[]).filter(r=>!r.deleted_at).length;
        totalUsers += (ts.users||[]).filter(u=>!u.deleted_at).length;
      } catch(e) { /* skip */ }
    }
  } catch(e) {}
  // Also count master records (non-tenant)
  totalRecs  += (s.records||[]).filter(r=>!r.deleted_at).length;
  totalUsers += (s.users||[]).filter(u=>!u.deleted_at&&!u.client_id).length;
  const topEnvs = (s.client_environments||[]).filter(e=>!e.deleted_at).map(env => {
    const cl = clients.find(c=>c.id===env.client_id);
    let rc = 0;
    if (cl?.tenant_slug) {
      try { rc = (getTenantStore(cl.tenant_slug).records||[]).filter(r=>r.environment_id===env.id&&!r.deleted_at).length; } catch(e){}
    }
    return { env_name: env.name, client_name: cl?.name||'—', record_count: rc };
  }).sort((a,b)=>b.record_count-a.record_count).slice(0,5);
  res.json({ total_clients: clients.length, by_status: byStatus, by_plan: byPlan, total_environments: totalEnvs, total_client_users: totalUsers, total_records: totalRecs, data_store_kb: fileSizeKB, top_environments: topEnvs });
});

router.get('/:id/stats', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const logs = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  // Pull real counts from the tenant store
  let record_count = 0, user_count = 0, object_count = 0;
  const envsWithStats = envs.map(env => ({ ...env, object_count: 0, record_count: 0 }));
  if (client.tenant_slug) {
    const ts = getTenantStore(client.tenant_slug);
    const recs  = (ts.records||[]).filter(r=>!r.deleted_at);
    const objs  = (ts.objects||[]).filter(o=>!o.deleted_at);
    user_count   = (ts.users||[]).filter(u=>!u.deleted_at).length;
    object_count = objs.length;
    record_count = recs.length;
    envsWithStats.forEach(env => {
      env.object_count = objs.filter(o=>o.environment_id===env.id).length;
      env.record_count = recs.filter(r=>objs.find(o=>o.id===r.object_id)?.environment_id===env.id).length;
    });
  }
  res.json({
    environment_count: envs.length, record_count, user_count, object_count,
    environments: envsWithStats, provision_log: logs, sandboxes: [],
  });
});

router.get('/:id', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  const logs = (s.provision_log||[]).filter(l=>l.client_id===client.id);
  // Load users and env stats from the tenant store (not master)
  let users = [];
  const envsWithStats = envs.map(env => ({ ...env, object_count: 0, record_count: 0 }));
  if (client.tenant_slug) {
    const ts = getTenantStore(client.tenant_slug);
    users = (ts.users||[]).filter(u=>!u.deleted_at).map(u=>({
      id: u.id, first_name: u.first_name, last_name: u.last_name,
      email: u.email, role_name: u.role_name || u.role_id,
      status: u.status, last_login: u.last_login, login_count: u.login_count,
    }));
    const objs = (ts.objects||[]).filter(o=>!o.deleted_at);
    const recs = (ts.records||[]).filter(r=>!r.deleted_at);
    envsWithStats.forEach(env => {
      env.object_count = objs.filter(o=>o.environment_id===env.id).length;
      env.record_count = recs.filter(r=>objs.find(o=>o.id===r.object_id)?.environment_id===env.id).length;
    });
  }
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


// ── GET /:id/error-logs — was returning 404 ───────────────────────────────────
router.get('/:id/error-logs', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { page=1, limit=30, severity, search } = req.query;
  const pageNum = parseInt(page), limitNum = parseInt(limit);
  let logs = [];
  if (client.tenant_slug) {
    const ts = getTenantStore(client.tenant_slug);
    logs = (ts.error_logs||[]).filter(l=>!l.deleted_at);
  }
  const masterLogs = (s.error_logs||[]).filter(l=>l.client_id===client.id&&!l.deleted_at);
  logs = [...masterLogs, ...logs];
  if (severity && severity !== 'all') logs = logs.filter(l=>(l.sev||l.severity)===severity);
  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(l=>(l.message||'').toLowerCase().includes(q)||(l.url||'').toLowerCase().includes(q));
  }
  logs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const total = logs.length;
  res.json({ logs: logs.slice((pageNum-1)*limitNum, pageNum*limitNum), total, page: pageNum });
});

// ── GET /:id/activity — real activity from tenant store ───────────────────────
router.get('/:id/activity', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { page=1, limit=100, search } = req.query;
  const pageNum = parseInt(page), limitNum = parseInt(limit);
  let events = [];
  if (client.tenant_slug) {
    const ts = getTenantStore(client.tenant_slug);
    const actLogs = (ts.activity_log||[]).map(a=>({
      id: a.id, type: a.action_type||a.type||'activity',
      message: a.description||a.message||`${a.action_type||'Event'} on ${a.record_id||'record'}`,
      user_email: a.user_email||a.performed_by||'system',
      created_at: a.created_at, severity: 'info',
    }));
    events = [...actLogs];
  }
  const provLogs = (s.provision_log||[]).filter(l=>l.client_id===client.id).map(l=>({
    id: l.id, type: 'provision',
    message: l.details||l.action||`Provision: ${l.template||''}`,
    user_email: l.performed_by||'superadmin',
    created_at: l.provisioned_at||l.created_at, severity: 'info',
  }));
  events = [...events, ...provLogs];
  if (search) {
    const q = search.toLowerCase();
    events = events.filter(a=>(a.message||'').toLowerCase().includes(q)||(a.user_email||'').toLowerCase().includes(q));
  }
  events.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const total = events.length;
  const sliced = events.slice((pageNum-1)*limitNum, pageNum*limitNum);
  res.json({ events: sliced, items: sliced, total });
});

// ── POST /:id/add-environment — add env to existing client ────────────────────
router.post('/:id/add-environment', async (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { name, type='staging', locale='en', timezone='UTC', template } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const now = new Date().toISOString();
  const environment = {
    id: uuidv4(), client_id: client.id, name,
    type, locale, timezone, is_default: 0, status: 'active',
    created_at: now, updated_at: now, deleted_at: null,
  };
  s.client_environments.push(environment);
  if (client.tenant_slug) {
    try {
      await tenantStorage.run(client.tenant_slug, async () => {
        const ts = provisionTenant(client.tenant_slug);
        if (!ts.environments) ts.environments = [];
        ts.environments.push({ ...environment });
        if (template) {
          const { objects } = resolveTemplate(template);
          if (!ts.objects) ts.objects = [];
          if (!ts.fields)  ts.fields  = [];
          for (const objDef of (objects||[])) {
            const obj = { id:uuidv4(), environment_id:environment.id, slug:objDef.slug,
              name:objDef.name, plural_name:objDef.plural_name, icon:objDef.icon||'database',
              color:objDef.color||'#4361EE', is_system:objDef.is_system!==false,
              sort_order:ts.objects.length, created_at:now, updated_at:now, deleted_at:null };
            ts.objects.push(obj);
            (objDef.fields||[]).forEach((fDef,i)=>{
              ts.fields.push({ id:uuidv4(), environment_id:environment.id, object_id:obj.id,
                ...fDef, sort_order:i, created_at:now, updated_at:now, deleted_at:null });
            });
          }
        }
        saveStoreNow(client.tenant_slug);
      });
    } catch(e) { console.error('[add-environment] tenant seed error:', e.message); }
  }
  s.provision_log.push({
    id: uuidv4(), client_id: client.id, environment_id: environment.id,
    action: 'add_environment',
    details: `Added environment: ${name} (${type}) · ${locale} · ${timezone}`,
    performed_by: 'superadmin', provisioned_at: now,
  });
  saveStore();
  res.status(201).json({ environment, client, success: true });
});

// ── E2E cleanup: purge all E2ETest* tenants ───────────────────────────────────
// Called by the provisioning spec's afterAll to keep the data store clean.
router.post('/purge-test-clients', (req, res) => {
  try {
    const { getStore, saveStore } = require('../db/init');
    const { keep_slugs = [] } = req.body || {};
    const store = getStore();
    if (!store.clients) return res.json({ removed_count: 0 });

    const before = store.clients.length;
    store.clients = store.clients.filter(c => {
      const isTest = /^e2e/i.test(c.slug || '') || /^e2e/i.test(c.name || '');
      return !isTest || keep_slugs.includes(c.slug);
    });
    const removed = before - store.clients.length;
    if (removed > 0) saveStore();
    res.json({ ok: true, removed_count: removed });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ── POST /:id/users — add a user to a client's tenant store ──────────────────
// ── PATCH /:id/users/:userId — update a user in tenant store ──────────────────
router.patch('/:id/users/:userId', async (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (!client.tenant_slug) return res.status(400).json({ error: 'Client has no tenant store' });

  const allowed = ['first_name','last_name','email','role_id','role_name','environment_id','status','password'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.password) {
    updates.password_hash = hashPassword(updates.password);
    delete updates.password;
  }

  try {
    let updated = null;
    await tenantStorage.run(client.tenant_slug, async () => {
      const ts = loadTenantStore(client.tenant_slug);
      const user = (ts.users||[]).find(u=>u.id===req.params.userId&&!u.deleted_at);
      if (!user) return;
      Object.assign(user, updates, { updated_at: new Date().toISOString() });
      updated = user;
      saveStoreNow(client.tenant_slug);
    });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/users', async (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (!client.tenant_slug) return res.status(400).json({ error: 'Client has no tenant store — provision first' });

  const { first_name='', last_name='', email, password, role_id, role_name, environment_id, status='active' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const ts = getTenantStore(client.tenant_slug);

  // Duplicate email check
  if ((ts.users||[]).find(u=>u.email===email&&!u.deleted_at))
    return res.status(409).json({ error: 'Email already exists in this environment' });

  // Resolve role
  let resolvedRoleId = role_id, resolvedRoleName = role_name;
  if (!resolvedRoleId && resolvedRoleName) {
    const r = (ts.roles||[]).find(r=>r.name===resolvedRoleName||r.slug===resolvedRoleName);
    resolvedRoleId = r?.id || null;
  }
  if (!resolvedRoleName && resolvedRoleId) {
    const r = (ts.roles||[]).find(r=>r.id===resolvedRoleId);
    resolvedRoleName = r?.name || null;
  }

  const envId = environment_id || (ts.environments||[])[0]?.id || null;
  const now = new Date().toISOString();
  const plainPassword = password || _genTempPassword();
  const user = {
    id: uuidv4(), environment_id: envId, client_id: client.id,
    first_name, last_name, email,
    password_hash: hashPassword(plainPassword),
    role_id: resolvedRoleId, role_name: resolvedRoleName || 'Recruiter',
    status, is_super_admin: resolvedRoleName==='Super Admin',
    must_change_password: password ? 0 : 1,
    mfa_enabled: 0, last_login: null, login_count: 0,
    created_at: now, updated_at: now, deleted_at: null,
  };

  // Write into tenant store via AsyncLocalStorage context
  try {
    await tenantStorage.run(client.tenant_slug, async () => {
      const tenantStore = loadTenantStore(client.tenant_slug);
      if (!tenantStore.users) tenantStore.users = [];
      tenantStore.users.push(user);
      saveStore(client.tenant_slug);
    });
  } catch(e) {
    return res.status(500).json({ error: 'Failed to save user: ' + e.message });
  }

  // Log to master provision_log
  s.provision_log = s.provision_log || [];
  s.provision_log.push({ id: uuidv4(), client_id: client.id, action: 'add_user',
    details: `Added user: ${first_name} ${last_name} <${email}> (${resolvedRoleName||'Recruiter'})`,
    performed_by: 'superadmin', provisioned_at: now, created_at: now });
  saveStore();

  res.status(201).json({ ...user, password_hash: undefined, temp_password: password ? undefined : plainPassword });
});

function _genTempPassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
  return Array.from({length:12}, ()=>c[Math.floor(Math.random()*c.length)]).join('');
}

// ── GET /reports/activity-summary — cross-tenant activity aggregation ─────────
router.get('/reports/activity-summary', (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
  const s = getStore();
  const clients = (s.clients || []).filter(c => !c.deleted_at);
  let totalEvents = 0, byType = {}, byClient = [], dailyMap = {};
  // Build 30 empty days
  for (let i = parseInt(days) - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyMap[key] = 0;
  }
  for (const client of clients) {
    if (!client.tenant_slug) continue;
    try {
      const ts = getTenantStore(client.tenant_slug);
      const acts = (ts.activity || ts.activity_log || []).filter(a => (a.created_at || '') >= since);
      totalEvents += acts.length;
      byClient.push({ client_id: client.id, client_name: client.name, event_count: acts.length });
      acts.forEach(a => {
        const type = a.action || a.action_type || 'activity';
        byType[type] = (byType[type] || 0) + 1;
        const day = (a.created_at || '').slice(0, 10);
        if (dailyMap[day] !== undefined) dailyMap[day]++;
      });
    } catch(e) {}
  }
  byClient.sort((a, b) => b.event_count - a.event_count);
  res.json({
    total_events: totalEvents,
    days: parseInt(days),
    by_type: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count),
    by_client: byClient,
    daily_trend: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
  });
});

// ── GET /:id/activity-report — per-client activity detail ─────────────────────
router.get('/:id/activity-report', (req, res) => {
  const s = getStore(); ensureCollections();
  const client = (s.clients || []).find(c => c.id === req.params.id && !c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { days = 30, environment_id } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
  let events = [];
  if (client.tenant_slug) {
    const ts = getTenantStore(client.tenant_slug);
    let acts = (ts.activity || ts.activity_log || []).filter(a => (a.created_at || '') >= since);
    if (environment_id) acts = acts.filter(a => a.environment_id === environment_id);
    events = acts.map(a => ({
      id: a.id, type: a.action || a.action_type || 'activity',
      message: a.description || a.message || `${a.action || 'event'} on ${a.record_id || 'record'}`,
      user_email: a.user_email || a.performed_by || 'system',
      entity_type: a.entity_type || a.object_name || null,
      record_id: a.record_id || null,
      environment_id: a.environment_id || null,
      created_at: a.created_at,
    }));
  }
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ items: events, events, total: events.length });
});


// ── POST /:id/repair-tenant — re-seed empty tenant store ─────────────────────
router.post('/:id/repair-tenant', async (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c=>c.id===req.params.id&&!c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (!client.tenant_slug) return res.status(400).json({ error: 'Client has no tenant_slug' });

  const { template = 'core_recruitment', admin_email, admin_password } = req.body;
  const envs = (s.client_environments||[]).filter(e=>e.client_id===client.id&&!e.deleted_at);
  if (!envs.length) return res.status(400).json({ error: 'No environments found for client' });
  const primaryEnv = envs.find(e=>e.type==='production'||e.is_default) || envs[0];

  try {
    await tenantStorage.run(client.tenant_slug, async () => {
      const ts = loadTenantStore(client.tenant_slug);

      // 1. Seed all environments into tenant store — strip client_id so /api/environments returns them
      if (!ts.environments) ts.environments = [];
      for (const env of envs) {
        if (!ts.environments.find(e=>e.id===env.id)) {
          // eslint-disable-next-line no-unused-vars
          const { client_id: _cid, tenant_slug: _ts, ...envClean } = env;
          ts.environments.push({ ...envClean });
        }
      }

      // 2. Force-seed objects + fields for every environment that has none
      ts.objects = ts.objects || [];
      ts.fields  = ts.fields  || [];
      const now2 = new Date().toISOString();
      const { objects: objDefs } = resolveTemplate(template || getDefaultTemplateKey());
      for (const seedEnv of envs) {
        const envHasObjects = ts.objects.filter(o=>o.environment_id===seedEnv.id&&!o.deleted_at).length > 0;
        if (!envHasObjects) {
          for (const objDef of (objDefs||[])) {
            const obj = { id: uuidv4(), environment_id: seedEnv.id, slug: objDef.slug,
              name: objDef.name, plural_name: objDef.plural_name, icon: objDef.icon||'database',
              color: objDef.color||'#4361EE', is_system: objDef.is_system!==false,
              sort_order: ts.objects.filter(o=>o.environment_id===seedEnv.id).length,
              created_at: now2, updated_at: now2, deleted_at: null };
            ts.objects.push(obj);
            (objDef.fields||[]).forEach((fDef, i) => {
              ts.fields.push({ id: uuidv4(), environment_id: seedEnv.id, object_id: obj.id,
                name: fDef.name, api_key: fDef.api_key, field_type: fDef.field_type,
                is_required: fDef.is_required||false, show_in_list: fDef.show_in_list!==false,
                options: fDef.options||null, placeholder:'', help_text:'', is_system:true,
                sort_order: i, created_at: now2, updated_at: now2, deleted_at: null });
            });
          }
        }
      }

      // 3. Force-seed roles if none exist
      const hasRoles = (ts.roles||[]).filter(r=>!r.deleted_at).length > 0;
      if (!hasRoles) {
        if (!ts.roles) ts.roles = [];
        const now = new Date().toISOString();
        const defaultRoles = [
          { id: uuidv4(), name:'Super Admin', slug:'super_admin', description:'Full access', color:'#e03131', is_system:1, created_at:now, updated_at:now },
          { id: uuidv4(), name:'Admin',       slug:'admin',       description:'Manage users and settings', color:'#e67700', is_system:1, created_at:now, updated_at:now },
          { id: uuidv4(), name:'Recruiter',   slug:'recruiter',   description:'Manage candidates and jobs', color:'#0b7285', is_system:1, created_at:now, updated_at:now },
          { id: uuidv4(), name:'Hiring Manager', slug:'hiring_manager', description:'View and feedback on candidates', color:'#2b8a3e', is_system:1, created_at:now, updated_at:now },
          { id: uuidv4(), name:'Read Only',   slug:'read_only',   description:'View only', color:'#495057', is_system:1, created_at:now, updated_at:now },
        ];
        defaultRoles.forEach(r => ts.roles.push(r));
      }

      // 4. If an admin_email was provided (or found in master store), add that user
      const existingUsers = (s.users||[]).filter(u=>u.client_id===client.id&&!u.deleted_at);
      const masterOrphanUsers = (s.users||[]).filter(u=>{
        if (u.deleted_at) return false;
        // Orphaned users without client_id that were created around the same time as the client
        return !u.client_id && u.email && (
          (admin_email && u.email===admin_email) ||
          existingUsers.find(eu=>eu.email===u.email)
        );
      });
      const usersToAdd = [...existingUsers, ...masterOrphanUsers];
      if (!ts.users) ts.users = [];
      const superAdminRole = ts.roles.find(r=>r.slug==='super_admin');
      for (const u of usersToAdd) {
        const existingInTenant = ts.users.find(tu=>tu.email===u.email&&!tu.deleted_at);
        if (!existingInTenant) {
          ts.users.push({
            ...u,
            environment_id: primaryEnv.id,  // always point to production env
            client_id: client.id,
            role_id: u.role_id || superAdminRole?.id,
            role_name: u.role_name || 'Super Admin',
          });
        } else {
          // Update existing user to point to production env if they're on sandbox
          existingInTenant.environment_id = primaryEnv.id;
        }
      }
      // Also add the requested admin if provided and not already there
      if (admin_email && !ts.users.find(u=>u.email===admin_email&&!u.deleted_at)) {
        const plainPw = admin_password || 'Admin1234!';
        ts.users.push({
          id: uuidv4(), environment_id: primaryEnv.id, client_id: client.id,
          first_name: 'Admin', last_name: '', email: admin_email,
          password_hash: require('bcryptjs').hashSync(plainPw, 12),
          role_id: superAdminRole?.id, role_name: 'Super Admin',
          status: 'active', is_super_admin: 1, must_change_password: 0,
          mfa_enabled: 0, last_login: null, login_count: 0,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
        });
      }

      saveStoreNow(client.tenant_slug);
    });

    // Log the repair
    s.provision_log = s.provision_log || [];
    s.provision_log.push({ id: uuidv4(), client_id: client.id, action: 'repair_tenant',
      details: `Repaired tenant store: seeded ${envs.length} env(s), objects, roles, users`, 
      performed_by: 'superadmin', provisioned_at: new Date().toISOString(), created_at: new Date().toISOString() });
    saveStore();

    // Return the new state
    const ts = getTenantStore(client.tenant_slug);
    const objsPerEnv = {};
    (ts.objects||[]).filter(o=>!o.deleted_at).forEach(o=>{
      const env = envs.find(e=>e.id===o.environment_id);
      const label = env ? env.name : o.environment_id.slice(0,8);
      objsPerEnv[label] = (objsPerEnv[label]||0)+1;
    });
    res.json({
      ok: true,
      environments_seeded: (ts.environments||[]).length,
      objects_per_env: objsPerEnv,
      objects_seeded: (ts.objects||[]).filter(o=>!o.deleted_at).length,
      roles_seeded: (ts.roles||[]).filter(r=>!r.deleted_at).length,
      users_seeded: (ts.users||[]).filter(u=>!u.deleted_at).length,
      primary_environment_id: primaryEnv.id,
    });
  } catch(err) {
    console.error('[repair-tenant]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /platform-logs — aggregate system events across all tenants ────────────
router.get('/platform-logs', (req, res) => {
  const { limit = 300 } = req.query;
  const s = getStore(); ensureCollections();
  const clients = (s.clients || []).filter(c => !c.deleted_at);
  let events = [];
  (s.provision_log || []).forEach(l => {
    events.push({
      id: l.id || `pl-${Math.random().toString(36).slice(2)}`,
      type: l.action || 'provision',
      message: l.details || l.action || 'Provision event',
      client_id: l.client_id,
      client_name: clients.find(c => c.id === l.client_id)?.name || 'system',
      user_email: l.performed_by || 'superadmin',
      created_at: l.provisioned_at || l.created_at,
      severity: 'info',
    });
  });
  for (const client of clients) {
    if (!client.tenant_slug) continue;
    try {
      const ts = getTenantStore(client.tenant_slug);
      (ts.activity_log || []).forEach(a => {
        events.push({ id: a.id, type: a.action_type || a.type || 'activity',
          message: a.description || a.message || `${a.action_type || 'activity'} event`,
          client_id: client.id, client_name: client.name,
          user_email: a.user_email || a.performed_by || 'system',
          created_at: a.created_at, severity: 'info',
        });
      });
      (ts.error_logs || ts.error_log || []).filter(e => !e.deleted_at).slice(-30).forEach(e => {
        events.push({ id: e.id, type: 'error', message: e.message,
          client_id: client.id, client_name: client.name,
          user_email: e.user_email || 'system',
          created_at: e.created_at, severity: e.severity || 'error',
        });
      });
    } catch (err) { /* skip */ }
  }
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ events: events.slice(0, parseInt(limit)), total: events.length });
});

// ── GET /templates — alias for /provision/templates ───────────────────────────
router.get('/templates', (req, res) => {
  res.json(Object.entries(TEMPLATES).map(([key, tpl]) => ({
    key, label: tpl.label, description: tpl.description, icon: tpl.icon,
    object_count: (tpl.objects || []).length + ((tpl.extra_objects || []).length),
  })));
});


module.exports = router;
module.exports.buildTemplate = resolveTemplate; // backward compat alias
