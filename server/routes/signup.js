/**
 * server/routes/signup.js — Public self-serve signup
 * POST /api/signup — creates client + tenant + admin user in one call.
 * Payment is faked (log & approve). Swap payment_token for Stripe later.
 */
const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, saveStoreNow, tenantStorage, storeCache, loadTenantStore, provisionTenant } = require('../db/init');
const { applyStarterConfig } = require('../data/starter_config');

const PLAN_LIMITS = {
  starter: { max_users: 5,  max_records: 500,   label: 'Starter', price: 49  },
  growth:  { max_users: 20, max_records: 5000,  label: 'Growth',  price: 149 },
  pro:     { max_users: -1, max_records: -1,    label: 'Pro',     price: 399 },
};

const OBJECTS = [
  { name:'Person',      plural:'People',       slug:'people',       icon:'users',     color:'#3b5bdb' },
  { name:'Job',         plural:'Jobs',          slug:'jobs',         icon:'briefcase', color:'#f59f00' },
  { name:'Talent Pool', plural:'Talent Pools',  slug:'talent-pools', icon:'layers',    color:'#0ca678' },
];

const FIELD_SETS = {
  people: [
    { name:'First Name', ak:'first_name', type:'text', req:1, list:1, o:1 },
    { name:'Last Name',  ak:'last_name',  type:'text', req:1, list:1, o:2 },
    { name:'Email',      ak:'email',      type:'email',req:1, list:1, o:3 },
    { name:'Phone',      ak:'phone',      type:'phone',list:0, o:4 },
    { name:'Location',   ak:'location',   type:'text', list:1, o:5 },
    { name:'Status',     ak:'status',     type:'select',list:1, o:6, opts:['Active','Passive','Not Looking','Placed','Archived'] },
    { name:'Source',     ak:'source',     type:'select',list:1, o:7, opts:['LinkedIn','Referral','Job Board','Direct Apply','Agency','Other'] },
    { name:'Current Title',ak:'current_title',type:'text',list:1,o:8 },
    { name:'Skills',     ak:'skills',     type:'skills',list:0, o:9, opts:[] },
    { name:'Rating',     ak:'rating',     type:'rating',list:1, o:10 },
  ],
  jobs: [
    { name:'Job Title',  ak:'job_title',  type:'text',  req:1, list:1, o:1 },
    { name:'Department', ak:'department', type:'select',list:1, o:2, opts:['Engineering','Product','Sales','Marketing','HR','Finance','Operations','Other'] },
    { name:'Location',   ak:'location',   type:'text',  list:1, o:3 },
    { name:'Status',     ak:'status',     type:'select',list:1, o:4, opts:['Draft','Open','On Hold','Filled','Cancelled'] },
  ],
  'talent-pools': [
    { name:'Pool Name',  ak:'pool_name',  type:'text',  req:1, list:1, o:1 },
    { name:'Category',   ak:'category',   type:'select',list:1, o:2, opts:['Technical','Leadership','Sales','Operations','Graduates','Other'] },
    { name:'Status',     ak:'status',     type:'select',list:1, o:3, opts:['Active','Inactive','Archived'] },
  ],
};

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'client';
}

function hashPwd(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(pwd + salt).digest('hex');
  return `${salt}:${hash}`;
}

router.post('/', async (req, res) => {
  const { company, firstName, lastName, email, password, plan = 'growth', payment_token } = req.body;

  if (!company || !email || !password) return res.status(400).json({ error: 'company, email, and password are required' });
  if (password.length < 8)             return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!PLAN_LIMITS[plan])              return res.status(400).json({ error: 'Invalid plan' });

  // Deduplicate email across master + all tenant stores
  const masterStore = storeCache['master'] || loadTenantStore(null);
  if ((masterStore.users || []).find(u => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  // Log fake payment — replace with Stripe logic later
  console.log(`[Signup] FAKE PAYMENT — ${email} — plan=${plan} — token=${payment_token}`);
  const stripeCustomerId    = `cus_fake_${uuidv4().slice(0,8)}`;
  const stripeSubscriptionId = `sub_fake_${Date.now()}`;

  // Generate unique tenant slug
  let baseSlug = slugify(company), tenantSlug = baseSlug, n = 1;
  const taken = new Set([
    ...(masterStore.clients || []).map(c => c.tenant_slug).filter(Boolean),
    'www','app','api','admin','master','vercentic','talentos','localhost',
  ]);
  while (taken.has(tenantSlug)) tenantSlug = `${baseSlug}${++n}`;

  const now       = new Date().toISOString();
  const trialEnd  = new Date(Date.now() + 14 * 86400000).toISOString();
  const envId     = uuidv4();
  const clientId  = uuidv4();
  const userId    = uuidv4();
  const saRoleId  = uuidv4();

  try {
    // 1. Write client record into master store
    await tenantStorage.run('master', () => {
      const s = getStore();
      if (!s.clients)             s.clients = [];
      if (!s.client_environments) s.client_environments = [];
      if (!s.environments)        s.environments = [];

      s.clients.push({
        id: clientId, name: company, slug: tenantSlug, tenant_slug: tenantSlug,
        status: 'active', plan, plan_label: PLAN_LIMITS[plan].label,
        source: 'self_serve',
        stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubscriptionId,
        primary_email: email.toLowerCase(),
        primary_contact: [firstName, lastName].filter(Boolean).join(' ') || email,
        trial_ends_at: trialEnd, created_at: now, updated_at: now, deleted_at: null,
      });
      s.client_environments.push({
        id: envId, client_id: clientId, name: 'Production', slug: 'production',
        type: 'production', status: 'active', tenant_slug: tenantSlug,
        created_at: now, updated_at: now, deleted_at: null,
      });
      // Cross-reference in master environments so demo seed picker finds it
      s.environments.push({ id: envId, name: 'Production', slug: 'production', client_id: clientId, tenant_slug: tenantSlug, is_default: 1, color: '#6941C6', created_at: now, updated_at: now });
      saveStore('master');
    });

    // 2. Provision isolated tenant store
    await tenantStorage.run(tenantSlug, () => {
      const ts = provisionTenant(tenantSlug);

      ts.environments = [{ id: envId, name: 'Production', slug: 'production', is_default: 1, color: '#6941C6', created_at: now, updated_at: now }];

      // Seed objects + fields
      ts.objects = []; ts.fields = [];
      for (const obj of OBJECTS) {
        const objId = uuidv4();
        ts.objects.push({ id:objId, environment_id:envId, name:obj.name, plural_name:obj.plural, slug:obj.slug, icon:obj.icon, color:obj.color, is_system:1, sort_order:OBJECTS.indexOf(obj)+1, relationships_enabled:0, person_type_options: obj.slug==='people'?['Employee','Contractor','Consultant','Candidate','Contact']:null, created_at:now, updated_at:now });
        for (const f of (FIELD_SETS[obj.slug] || [])) {
          ts.fields.push({ id:uuidv4(), object_id:objId, environment_id:envId, name:f.name, api_key:f.ak, field_type:f.type, is_required:f.req||0, is_unique:f.uniq||0, is_system:1, show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, condition_field:null, condition_value:null, created_at:now, updated_at:now });
        }
      }

      // Seed roles
      ts.roles = [
        { id:saRoleId,   name:'Super Admin',   slug:'super_admin',   color:'#6941C6', is_system:1, created_at:now, updated_at:now },
        { id:uuidv4(),   name:'Recruiter',      slug:'recruiter',     color:'#3B82F6', is_system:1, created_at:now, updated_at:now },
        { id:uuidv4(),   name:'Hiring Manager', slug:'hiring_manager',color:'#059669', is_system:1, created_at:now, updated_at:now },
        { id:uuidv4(),   name:'Read Only',      slug:'read_only',     color:'#9CA3AF', is_system:1, created_at:now, updated_at:now },
      ];

      // Seed admin user
      ts.users = [{
        id:userId, environment_id:envId, client_id:clientId,
        first_name:firstName||'', last_name:lastName||'',
        email:email.toLowerCase(), password_hash:hashPwd(password),
        role_id:saRoleId, role_name:'Super Admin',
        status:'active', is_super_admin:true,
        must_change_password:0, mfa_enabled:0,
        plan, plan_label:PLAN_LIMITS[plan].label, trial_ends_at:trialEnd,
        last_login:null, login_count:0,
        created_at:now, updated_at:now, deleted_at:null,
      }];

      // Create a Person record for the admin user so they appear in People
      const peopleObj = ts.objects.find(o => o.slug === 'people');
      if (peopleObj) {
        if (!ts.records) ts.records = [];
        ts.records.push({
          id: uuidv4(),
          object_id: peopleObj.id,
          environment_id: envId,
          record_number: 1,
          data: {
            first_name: firstName || '',
            last_name:  lastName  || '',
            email:      email.toLowerCase(),
            status:     'Active',
            person_type:'Employee',
            current_title: 'Administrator',
          },
          user_id:    userId,   // link back to the platform user
          created_by: userId,
          created_at: now, updated_at: now, deleted_at: null,
        });
      }

      ts.security_settings = { password_min_length:8, session_timeout_minutes:60, max_login_attempts:5, lockout_duration_minutes:30, mfa_enabled:0, updated_at:now };
      saveStoreNow(tenantSlug); // synchronous — ensures data is written before response
    });

    // Register user in master store so super admin client detail shows them
    await tenantStorage.run('master', () => {
      const ms = getStore();
      if (!ms.client_users) ms.client_users = [];
      ms.client_users.push({
        id:     userId,
        client_id:  clientId,
        tenant_slug: tenantSlug,
        environment_id: envId,
        first_name: firstName || '',
        last_name:  lastName  || '',
        email:      email.toLowerCase(),
        role_name:  'Super Admin',
        status:     'active',
        source:     'self_serve',
        created_at: now,
      });
      saveStore('master');
    });

    // Apply starter configuration — seeds workflows, email templates, career site, scorecard
    try {
      const envObj   = { id: envId, name: 'Production', slug: 'production' };
      await tenantStorage.run(tenantSlug, async () => {
        const ts = getStore();
        await applyStarterConfig(tenantSlug, envObj, ts.objects || [], { name: company });
      });
      console.log(`[Signup] ✅ Starter config applied for ${tenantSlug}`);
    } catch (cfgErr) {
      // Non-fatal — tenant is usable, config can be re-applied via admin
      console.error(`[Signup] ⚠️ Starter config failed for ${tenantSlug}:`, cfgErr.message);
    }

    // Invalidate tenant cache so the new slug is recognised immediately
    try { require('../middleware/tenant').invalidateTenantCache(); } catch {}

    console.log(`[Signup] ✅ ${tenantSlug} provisioned for ${email} (${plan})`);
    res.json({
      ok: true, tenant_slug: tenantSlug, environment_id: envId, plan,
      trial_ends_at: trialEnd,
      login_url: `https://${tenantSlug}.vercentic.com`,
      credentials: { email: email.toLowerCase(), tenant_slug: tenantSlug, url: `https://${tenantSlug}.vercentic.com` },
    });
  } catch (err) {
    console.error('[Signup] Error:', err);
    res.status(500).json({ error: err.message || 'Signup failed — please try again.' });
  }
});

module.exports = router;
