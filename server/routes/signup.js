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
const { getDefaultTemplateKey, resolveTemplate, buildStandardConfig } = require('../data/templates');
const { runSeed, findTenantForEnv } = require('./demo_seed');

const PLAN_LIMITS = {
  starter: { max_users: 5,  max_records: 500,   label: 'Starter', price: 49  },
  growth:  { max_users: 20, max_records: 5000,  label: 'Growth',  price: 149 },
  pro:     { max_users: -1, max_records: -1,    label: 'Pro',     price: 399 },
};



function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'client';
}

const bcrypt = require('bcryptjs');

function hashPwd(pwd) {
  return bcrypt.hashSync(pwd, 12);
}

router.post('/', async (req, res) => {
  const { company, firstName, lastName, email, password, plan = 'growth', payment_token, load_demo = false } = req.body;

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
      s.environments.push({ id: envId, name: 'Production', slug: 'production', client_id: clientId, tenant_slug: tenantSlug, is_default: 1, color: '#6941C6', setup_complete: false, created_at: now, updated_at: now });
      saveStore('master');
    });

    // 2. Provision isolated tenant store
    await tenantStorage.run(tenantSlug, () => {
      const ts = provisionTenant(tenantSlug);

      ts.environments = [{ id: envId, name: 'Production', slug: 'production', is_default: 1, color: '#6941C6', setup_complete: false, created_at: now, updated_at: now }];

      // Seed objects + fields using the default template (recruitment_starter for web signups)
      const { objects: tplObjects, tier: tplTier } = resolveTemplate(getDefaultTemplateKey());
      ts.objects = []; ts.fields = [];
      for (let i = 0; i < tplObjects.length; i++) {
        const obj   = tplObjects[i];
        const objId = uuidv4();
        const OBJ_META = {
          people:       { name:'Person',      plural:'People',       icon:'users',     color:'#3b5bdb' },
          jobs:         { name:'Job',          plural:'Jobs',          icon:'briefcase', color:'#f59f00' },
          'talent-pools':{ name:'Talent Pool', plural:'Talent Pools',  icon:'layers',    color:'#0ca678' },
        };
        const meta = OBJ_META[obj.slug] || { name: obj.name, plural: obj.plural_name || obj.name+'s', icon:'database', color:'#6941C6' };
        ts.objects.push({
          id:objId, environment_id:envId,
          name:meta.name, plural_name:meta.plural,
          slug:obj.slug, icon:meta.icon, color:meta.color,
          is_system:1, sort_order:i+1, relationships_enabled:0,
          person_type_options: obj.slug==='people'?['Employee','Contractor','Consultant','Candidate','Contact']:null,
          created_at:now, updated_at:now,
        });
        let sortOrder = 0;
        for (const f of (obj.fields || [])) {
          sortOrder++;
          ts.fields.push({
            id:uuidv4(), object_id:objId, environment_id:envId,
            name:f.name, api_key:f.api_key, field_type:f.field_type,
            is_required:f.is_required?1:0, is_unique:0, is_system:1,
            show_in_list:f.show_in_list?1:0, show_in_form:1,
            sort_order:sortOrder,
            options:f.options||null,
            section_label:f.section_label||null,
            collapsible:f.collapsible?1:0,
            as_panel:f.as_panel?1:0,
            condition_field:f.condition_field||null,
            condition_value:f.condition_value||null,
            related_object_slug:f.related_object_slug||null,
            people_multi:f.people_multi?1:0,
            lookup_object_id:null, default_value:null, placeholder:null, help_text:null,
            created_at:now, updated_at:now,
          });
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
      // provision_log entry — milestone_engine uses this to resolve admin_email per client
      if (!ms.provision_log) ms.provision_log = [];
      ms.provision_log.push({
        id: uuidv4(), client_id: clientId, environment_id: envId,
        action: 'signup', admin_email: email.toLowerCase(),
        template: 'recruitment_starter', source: 'self_serve',
        provisioned_at: now, created_at: now,
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

    // Seed demo data if requested
    if (load_demo) {
      try {
        await tenantStorage.run(tenantSlug, async () => {
          await runSeed({ environmentId: envId, clearFirst: false, progressCb: () => {} });
        });
        console.log(`[Signup] ✅ Demo data seeded for ${tenantSlug}`);
      } catch (seedErr) {
        console.error(`[Signup] ⚠️ Demo seed failed for ${tenantSlug}:`, seedErr.message);
      }
    }

    // Mark environment setup as complete (both master + tenant store)
    try {
      await tenantStorage.run('master', () => {
        const ms = getStore();
        const masterEnv = ms.environments?.find(e => e.id === envId);
        if (masterEnv) { masterEnv.setup_complete = true; masterEnv.updated_at = new Date().toISOString(); }
        saveStoreNow('master');
      });
      await tenantStorage.run(tenantSlug, () => {
        const ts = getStore();
        const tEnv = ts.environments?.find(e => e.id === envId);
        if (tEnv) { tEnv.setup_complete = true; tEnv.updated_at = new Date().toISOString(); }
        saveStoreNow();
      });
      console.log(`[Signup] ✅ setup_complete=true for ${tenantSlug}`);
    } catch (e) {
      console.error('[Signup] ⚠️ Could not mark setup complete:', e.message);
    }

    // Invalidate tenant cache so the new slug is recognised immediately
    try { require('../middleware/tenant').invalidateTenantCache(); } catch {}

    console.log(`[Signup] ✅ ${tenantSlug} provisioned for ${email} (${plan})`);

    // Fire client_provisioned email sequences (non-blocking — runs after response)
    setImmediate(async () => {
      try {
        const { fireMilestone } = require('./email_sequencer');
        await fireMilestone('client_provisioned', {
          client_id:   clientId,
          email:       email.toLowerCase(),
          client_name: company,
          admin_name:  [firstName, lastName].filter(Boolean).join(' ') || email.toLowerCase(),
          env_name:    'Production',
          login_url:   `https://${tenantSlug}.vercentic.com`,
        });
        console.log(`[Signup] Sequencer fire complete for ${tenantSlug}`);
      } catch (e) {
        console.error('[Signup] Sequencer fire failed:', e.message, e.stack);
      }
    });

    // Generate a single-use impersonation token so the first load auto-logs the user in.
    // Without this the browser has no session and hits 401 on every API call.
    let loginUrl = `https://${tenantSlug}.vercentic.com`;
    try {
      const impToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
      await tenantStorage.run('master', () => {
        const ms = getStore();
        if (!ms.impersonation_tokens) ms.impersonation_tokens = [];
        ms.impersonation_tokens.push({
          token: impToken, client_id: clientId, tenant_slug: tenantSlug,
          user_id: userId, used: false, expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });
        saveStore('master');
      });
      loginUrl = `https://${tenantSlug}.vercentic.com/?impersonate=${impToken}`;
    } catch (e) {
      console.warn('[Signup] Could not generate impersonation token:', e.message);
    }

    res.json({
      ok: true, tenant_slug: tenantSlug, environment_id: envId, plan,
      trial_ends_at: trialEnd,
      login_url: loginUrl,
      credentials: { email: email.toLowerCase(), tenant_slug: tenantSlug, url: loginUrl },
    });
  } catch (err) {
    console.error('[Signup] Error:', err);
    res.status(500).json({ error: err.message || 'Signup failed — please try again.' });
  }
});

module.exports = router;
