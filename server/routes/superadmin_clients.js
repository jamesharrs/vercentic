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
    const totalRecords = (s.objects||[])
      .filter(o=>envs.some(e=>e.id===o.environment_id)&&!o.deleted_at)
      .reduce((acc,o) => acc+(s.records||[]).filter(r=>r.object_id===o.id&&!r.deleted_at).length, 0);
    return { ...c, env_count: envs.length, record_count: totalRecords, latest_provision: logs[logs.length-1]||null };
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
module.exports.buildTemplate = resolveTemplate; // backward compat alias
