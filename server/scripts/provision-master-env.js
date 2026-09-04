'use strict';
/**
 * scripts/provision-master-env.js
 *
 * Provisions a single named master environment in the live store via the API.
 * Run one at a time to test each template.
 *
 * Usage:
 *   node scripts/provision-master-env.js --template recruitment_starter --name "Starter Template"
 *   node scripts/provision-master-env.js --template recruitment_standard --name "Standard Template"
 */

const BASE_URL     = process.env.LIVE_API_URL   || 'https://talentos-production-4045.up.railway.app';
const ADMIN_EMAIL  = process.env.LIVE_ADMIN_EMAIL || 'admin@talentos.io';
const ADMIN_PW     = process.env.LIVE_ADMIN_PW    || 'Admin1234!';

// Parse CLI args
const args = {};
process.argv.slice(2).forEach((v, i, a) => {
  if (v.startsWith('--')) args[v.slice(2)] = a[i + 1];
});
const TEMPLATE_KEY = args.template || 'recruitment_starter';
const ENV_NAME     = args.name     || 'Starter Template';

// Derive a unique admin email per template so there are no conflicts
const EMAIL_MAP = {
  recruitment_starter:  'admin.starter@vercentic.com',
  recruitment_standard: 'admin.standard@vercentic.com',
  agency:               'admin.agency@vercentic.com',
  hr_platform:          'admin.hr@vercentic.com',
  rpo_provider:         'admin.rpo@vercentic.com',
};
const ADMIN_EMAIL_FOR_ENV = args.email || EMAIL_MAP[TEMPLATE_KEY] || `admin.${TEMPLATE_KEY}@vercentic.com`;

async function run() {
  console.log(`\n🚀 Provisioning master environment`);
  console.log(`   Template : ${TEMPLATE_KEY}`);
  console.log(`   Env name : ${ENV_NAME}`);
  console.log(`   Target   : ${BASE_URL}\n`);

  // 1. Login
  process.stdout.write('1. Logging in... ');
  const lr = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PW }),
  });
  const ld = await lr.json();
  if (!ld.id) { console.error('\n❌ Login failed:', JSON.stringify(ld)); process.exit(1); }
  const cookie = lr.headers.get('set-cookie') || '';
  const csrf = (cookie.match(/vercentic_csrf=([^;]+)/) || [])[1] || '';
  const sid  = (cookie.match(/vercentic_sid=([^;]+)/)  || [])[1] || '';
  console.log(`✅ ${ld.email}`);

  const H = {
    'Content-Type': 'application/json',
    'X-User-Id':    ld.id,
    'X-CSRF-Token': csrf,
    'Cookie':       `vercentic_csrf=${csrf}; vercentic_sid=${sid}`,
  };

  // 2. Check if an environment with this name already exists
  process.stdout.write('2. Checking for existing environment... ');
  const envListRes = await fetch(`${BASE_URL}/api/environments`, { headers: H });
  const envList = await envListRes.json().then(d => Array.isArray(d) ? d : []);
  const existing = envList.find(e => e.name === ENV_NAME);
  if (existing) {
    console.log(`\n⚠️  Environment "${ENV_NAME}" already exists (id=${existing.id.slice(0,8)})`);
    console.log('   Nothing to do. Use a different --name or delete the existing one first.');
    process.exit(0);
  }
  console.log('none found, proceeding.');

  // 3. Use the superadmin provision endpoint to create a master environment
  //    We reuse the provision route but pass master=true so it creates an
  //    environment in the master store, not a tenant store.
  process.stdout.write('3. Calling provision endpoint... ');
  const provRes = await fetch(`${BASE_URL}/api/superadmin/clients/provision`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      client: {
        name:          ENV_NAME,
        industry:      'Recruitment',
        region:        'Global',
        plan:          'enterprise',
        size:          '',
        contact_name:  'Vercentic',
        contact_email: 'admin@vercentic.com',
      },
      environment: {
        name:     ENV_NAME,
        type:     'master_template',
        locale:   'en',
        timezone: 'Asia/Dubai',
      },
      admin_user: {
        first_name: 'Admin',
        last_name:  'User',
        email:      ADMIN_EMAIL_FOR_ENV,
        password:   'Admin1234!',
      },
      template: TEMPLATE_KEY,
    }),
  });
  const provData = await provRes.json();
  if (!provRes.ok || provData.error) {
    console.error('\n❌ Provision failed:', JSON.stringify(provData, null, 2));
    process.exit(1);
  }
  console.log('✅');

  const envId = provData.env_id || provData.environment?.id;
  console.log(`\n   Environment ID : ${envId}`);
  console.log(`   Objects seeded : ${provData.objects_seeded}`);
  console.log(`   Fields seeded  : ${provData.fields_seeded}`);
  console.log(`   Roles seeded   : ${provData.roles_seeded}`);
  console.log(`   Workflows      : ${provData.workflows_seeded}`);
  console.log(`   Forms          : ${provData.forms_seeded}`);
  console.log(`   File types     : ${provData.file_types_seeded}`);
  console.log(`   Email templates: ${provData.email_templates_seeded}`);
  console.log(`   Portals        : ${provData.portals_seeded}`);

  // 4. Find the created user and explicitly set their password via reset endpoint
  process.stdout.write('\n4. Setting admin user password... ');
  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers: H });
  const allUsers = await usersRes.json().then(d => Array.isArray(d) ? d : []);
  const createdUser = allUsers.find(u =>
    u.email === ADMIN_EMAIL_FOR_ENV &&
    (u.environment_id || '').startsWith(envId.slice(0, 8))
  );
  if (createdUser) {
    const resetRes = await fetch(`${BASE_URL}/api/users/${createdUser.id}/reset-password`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ password: 'Admin1234!' }),
    });
    const resetData = await resetRes.json();
    console.log(resetData.success ? '✅' : `⚠️  ${JSON.stringify(resetData)}`);
  } else {
    console.log('⚠️  User not found in API response — password may need setting manually');
  }

  // 5. Verify login works
  process.stdout.write('5. Verifying login... ');
  const loginRes = await fetch(`${BASE_URL}/api/users/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL_FOR_ENV, password: 'Admin1234!' }),
  });
  const loginData = await loginRes.json();
  const loginUser = loginData.user || loginData;
  if (loginUser.id || loginUser.email) {
    console.log(`✅  (env=${String(loginUser.environment_id||'').slice(0,8)})`);
  } else {
    console.log(`⚠️  Login check inconclusive: ${JSON.stringify(loginData).slice(0,100)}`);
  }

  // 6. Verify objects + field counts
  process.stdout.write('\n6. Verifying objects... ');
  const objRes = await fetch(`${BASE_URL}/api/objects?environment_id=${envId}`, { headers: H });
  const objects = await objRes.json().then(d => Array.isArray(d) ? d : d.objects || []);
  console.log(`${objects.length} objects`);
  for (const o of objects) {
    const fRes = await fetch(`${BASE_URL}/api/fields?object_id=${o.id}&_cb=${Date.now()}`, { headers: H });
    const fields = await fRes.json().then(d => Array.isArray(d) ? d : d.fields || []);
    console.log(`   ${o.slug.padEnd(15)} ${fields.length} fields`);
  }

  console.log(`\n✅ Master environment "${ENV_NAME}" provisioned successfully.`);
  console.log(`   Template  : ${TEMPLATE_KEY}`);
  console.log(`   Env ID    : ${envId}`);
  console.log(`   Login     : ${ADMIN_EMAIL_FOR_ENV}`);
  console.log(`   Password  : Admin1234!`);
  console.log(`\n   Add to your notes — this ID is needed for future reference.`);
}

run().catch(e => { console.error('\n💥 Fatal:', e.message); process.exit(1); });
