'use strict';
/**
 * repair-live-seed.js — syncs missing field defs + email templates to live Railway.
 * Safe to run multiple times — skips fields that already exist (by api_key).
 * Usage: node scripts/repair-live-seed.js
 */

const BASE_URL    = process.env.LIVE_API_URL    || 'https://talentos-production-4045.up.railway.app';
const ADMIN_EMAIL = process.env.LIVE_ADMIN_EMAIL || 'admin@talentos.io';
const ADMIN_PW    = process.env.LIVE_ADMIN_PW    || 'Admin1234!';
const MAIN_ENV_ID = 'c0c64e3b-113d-48b8-bc3c-684769849742';

const JOBS_FIELDS = [
  { name:'Overview',              ak:'section_overview',       type:'section_separator', order:0 },
  { name:'Job Title',             ak:'job_title',              type:'text',     order:1,  req:1, list:1 },
  { name:'Department',            ak:'department',             type:'select',   order:2,  list:1,
    opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'] },
  { name:'Sub-department',        ak:'sub_department',         type:'text',     order:3 },
  { name:'Location',              ak:'location',               type:'text',     order:4,  list:1 },
  { name:'Work Type',             ak:'work_type',              type:'select',   order:5,  list:1, opts:['On-site','Remote','Hybrid'] },
  { name:'Employment Type',       ak:'employment_type',        type:'select',   order:6,  list:1, opts:['Full-time','Part-time','Contract','Temporary','Internship','Freelance'] },
  { name:'Status',                ak:'status',                 type:'select',   order:7,  list:1, opts:['Draft','Open','On Hold','Closed','Filled','Cancelled'] },
  { name:'Priority',              ak:'priority',               type:'select',   order:8,  opts:['Low','Medium','High','Urgent'] },
  { name:'Job Code / Req No.',    ak:'job_code',               type:'text',     order:9 },
  { name:'Headcount',             ak:'headcount',              type:'number',   order:10 },
  { name:'Reason for Hire',       ak:'reason_for_hire',        type:'select',   order:11, opts:['New Headcount','Backfill','Replacement','Expansion'] },
  { name:'Compensation',          ak:'section_compensation',   type:'section_separator', order:12 },
  { name:'Salary Min',            ak:'salary_min',             type:'currency', order:13 },
  { name:'Salary Max',            ak:'salary_max',             type:'currency', order:14 },
  { name:'Currency',              ak:'salary_currency',        type:'select',   order:15, opts:['USD','GBP','EUR','AED','SAR','QAR','KWD','BHD','OMR','EGP'] },
  { name:'Pay Frequency',         ak:'pay_frequency',          type:'select',   order:16, opts:['Annual','Monthly','Daily','Hourly'] },
  { name:'Bonus (%)',             ak:'bonus_percent',          type:'number',   order:17 },
  { name:'Equity / Stock',        ak:'equity',                 type:'boolean',  order:18 },
  { name:'Visa Sponsorship',      ak:'visa_sponsorship',       type:'boolean',  order:19 },
  { name:'Benefits',              ak:'benefits',               type:'multi_select', order:20, opts:['Health Insurance','Dental','Vision','Pension/401k','Life Insurance','Remote Work','Flexible Hours','Gym','Learning Budget','Annual Bonus','Stock Options','Car Allowance','Housing Allowance'] },
  { name:'Requirements',          ak:'section_requirements',   type:'section_separator', order:21 },
  { name:'Min. Experience (yrs)', ak:'experience_min_years',   type:'number',   order:22 },
  { name:'Education Level',       ak:'education_level',        type:'select',   order:23, opts:["High School","Associate's","Bachelor's","Master's","MBA","PhD","Professional Certification","No Requirement"] },
  { name:'Required Skills',       ak:'required_skills',        type:'skills',   order:24 },
  { name:'Nice-to-have Skills',   ak:'nice_to_have_skills',    type:'multi_select', order:25, opts:[] },
  { name:'Languages Required',    ak:'languages_required',     type:'multi_select', order:26, opts:['English','Arabic','French','Spanish','German','Mandarin','Portuguese','Hindi','Japanese','Korean'] },
  { name:'Certifications',        ak:'certifications',         type:'text',     order:27 },
  { name:'Team',                  ak:'section_team',           type:'section_separator', order:28 },
  { name:'Hiring Manager',        ak:'hiring_manager',         type:'people',   order:29 },
  { name:'Recruiter',             ak:'recruiter',              type:'people',   order:30 },
  { name:'Coordinator',           ak:'coordinator',            type:'people',   order:31 },
  { name:'Sourcing Partner',      ak:'sourcing_partner',       type:'people',   order:32 },
  { name:'Posting',               ak:'section_posting',        type:'section_separator', order:33 },
  { name:'Posting Status',        ak:'posting_status',         type:'select',   order:34, opts:['Not Posted','Internal Only','External','Both'] },
  { name:'Career Site Visible',   ak:'career_site_visible',    type:'boolean',  order:35 },
  { name:'Internal Only',         ak:'internal_only',          type:'boolean',  order:36 },
  { name:'Job Boards',            ak:'job_boards',             type:'multi_select', order:37, opts:['LinkedIn','Indeed','Glassdoor','Naukri','Bayt','GulfTalent','Monster','Reed','Totaljobs'] },
  { name:'Posted Date',           ak:'posted_date',            type:'date',     order:38 },
  { name:'Application Deadline',  ak:'application_deadline',   type:'date',     order:39 },
  { name:'External Job URL',      ak:'external_job_url',       type:'url',      order:40 },
  { name:'Referral Bonus',        ak:'referral_bonus',         type:'currency', order:41 },
  { name:'Job Description',       ak:'description',            type:'rich_text',order:42 },
  { name:'Process & Timeline',    ak:'section_process',        type:'section_separator', order:43 },
  { name:'Open Date',             ak:'open_date',              type:'date',     order:44 },
  { name:'Target Close Date',     ak:'target_close_date',      type:'date',     order:45 },
  { name:'Actual Close Date',     ak:'actual_close_date',      type:'date',     order:46 },
  { name:'Target Start Date',     ak:'target_start_date',      type:'date',     order:47 },
  { name:'Time-to-Fill Target (days)', ak:'time_to_fill_target', type:'number', order:48 },
  { name:'Approval',              ak:'section_approval',       type:'section_separator', order:49 },
  { name:'Approval Status',       ak:'approval_status',        type:'select',   order:50, opts:['Not Started','Pending Approval','Approved','Rejected','On Hold'] },
  { name:'Approved By',           ak:'approved_by',            type:'people',   order:51 },
  { name:'Approval Date',         ak:'approval_date',          type:'date',     order:52 },
  { name:'Cost Centre',           ak:'cost_centre',            type:'text',     order:53 },
  { name:'Budget Code',           ak:'budget_code',            type:'text',     order:54 },
];

const TP_FIELDS = [
  { name:'Pool Name', ak:'pool_name', type:'text',   order:1, req:1, list:1 },
  { name:'Category',  ak:'category',  type:'select', order:2, list:1, opts:['Talent Community','Alumni','Silver Medalists','Internal Mobility','Graduates','Diversity','Referrals','Other'] },
  { name:'Status',    ak:'status',    type:'select', order:3, list:1, opts:['Active','Inactive','Archived'] },
];

const MISSING_TEMPLATES = [
  { slug:'sys_reschedule_request',   name:'Reschedule Request — Slot Options',        category:'interview', subject:'Reschedule request from {{proposer_name}}',         variables:['proposer_name','candidate_name','job_name','slots','confirm_url'] },
  { slug:'sys_reschedule_confirmed', name:'Interview Rescheduled — Confirmation',     category:'interview', subject:'Interview rescheduled — {{date_label}} at {{time}}', variables:['candidate_name','job_name','date_label','time','format','duration'] },
  { slug:'sys_offer_accepted',       name:'Offer Accepted — Recruiter Notification',  category:'offer',     subject:'Offer accepted — {{candidate_name}} ({{job_title}})', variables:['candidate_name','job_title','start_date','record_url'] },
  { slug:'sys_welcome_team',         name:'Welcome to the Team',                      category:'onboarding',subject:'Welcome to the team, {{first_name}}!',               variables:['first_name','company_name','start_date'] },
];

async function post(url, headers, body) {
  const r = await fetch(url, { method:'POST', headers, body:JSON.stringify(body) });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

async function run() {
  console.log('🔧 Vercentic Live Seed Repair\n');

  // 1. Login
  console.log('1. Logging in...');
  const lr = await fetch(`${BASE_URL}/api/users/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PW }),
  });
  const ld = await lr.json();
  if (!ld.id) { console.error('❌ Login failed:', JSON.stringify(ld)); process.exit(1); }
  const cookie = lr.headers.get('set-cookie') || '';
  const csrf = (cookie.match(/vercentic_csrf=([^;]+)/) || [])[1] || '';
  const sid  = (cookie.match(/vercentic_sid=([^;]+)/)  || [])[1] || '';
  console.log(`   ✅ Logged in: ${ld.email}`);

  const H = {
    'Content-Type':  'application/json',
    'X-User-Id':     ld.id,
    'X-CSRF-Token':  csrf,
    'Cookie':        `vercentic_csrf=${csrf}; vercentic_sid=${sid}`,
  };

  // 2. Fetch objects
  console.log('\n2. Fetching objects for env', MAIN_ENV_ID.slice(0,8), '...');
  const objs = await fetch(`${BASE_URL}/api/objects?environment_id=${MAIN_ENV_ID}`, { headers: H })
    .then(r => r.json()).then(d => Array.isArray(d) ? d : d.objects || []);
  const jobsObj   = objs.find(o => o.slug === 'jobs');
  const tpObj     = objs.find(o => o.slug === 'talent-pools');
  const peopleObj = objs.find(o => o.slug === 'people');
  console.log(`   people: ${peopleObj?.id?.slice(0,8) || 'NOT FOUND'}`);
  console.log(`   jobs:   ${jobsObj?.id?.slice(0,8)   || 'NOT FOUND'}`);
  console.log(`   pools:  ${tpObj?.id?.slice(0,8)     || 'NOT FOUND'}`);

  // 3. Jobs fields
  const repairFields = async (obj, fieldDefs, label) => {
    if (!obj) { console.log(`\n   ⚠️  ${label} object not found — skipping`); return; }
    console.log(`\n3. Repairing ${label} fields...`);
    // Cache-bust to avoid stale responses (fields route caches 60s)
    const existing = await fetch(`${BASE_URL}/api/fields?object_id=${obj.id}&_cb=${Date.now()}`, { headers: H })
      .then(r => r.json()).then(d => Array.isArray(d) ? d : d.fields || []);
    const existKeys = new Set(existing.map(f => f.api_key));
    console.log(`   Existing: ${existing.length}  |  To add: ${fieldDefs.filter(f => !existKeys.has(f.ak)).length}`);
    let added = 0, failed = 0;
    for (const f of fieldDefs) {
      if (existKeys.has(f.ak)) { process.stdout.write('-'); continue; }
      const isPeopleType = ['people','multi_lookup'].includes(f.type);
      const payload = {
        object_id: obj.id, environment_id: MAIN_ENV_ID,
        name: f.name, api_key: f.ak, field_type: f.type,
        is_system: 1, is_required: f.req || 0, is_unique: 0,
        show_in_list: f.list || 0,
        show_in_form: f.type === 'section_separator' ? 0 : 1,
        sort_order: f.order,
        options: f.opts !== undefined ? f.opts : null,
        lookup_object_id: isPeopleType ? peopleObj?.id : null,
        default_value: null, placeholder: null, help_text: null,
        condition_field: null, condition_value: null,
      };
      const { ok, status, data } = await post(`${BASE_URL}/api/fields`, H, payload);
      if (ok) { added++; process.stdout.write('+'); }
      else { failed++; process.stdout.write('!'); console.error(`\n     ❌ ${f.ak} (${status}): ${JSON.stringify(data).slice(0,80)}`); }
    }
    console.log(`\n   ✅ Added ${added}  |  Failed ${failed}  |  Skipped ${fieldDefs.length - added - failed}`);
  };

  await repairFields(jobsObj, JOBS_FIELDS, 'Jobs');
  await repairFields(tpObj, TP_FIELDS, 'Talent Pool');

  // 4. Email templates
  console.log('\n4. Repairing email templates...');
  const existTmpl = await fetch(`${BASE_URL}/api/email-templates`, { headers: H })
    .then(r => r.json()).then(d => Array.isArray(d) ? d : d.templates || d.items || []);
  const existSlugs = new Set(existTmpl.map(t => t.slug));
  console.log(`   Existing: ${existTmpl.length}`);
  let tmplAdded = 0;
  for (const t of MISSING_TEMPLATES) {
    if (existSlugs.has(t.slug)) { console.log(`   ⏭  ${t.slug}`); continue; }
    const { ok, status, data } = await post(`${BASE_URL}/api/email-templates`, H, { ...t, environment_id: MAIN_ENV_ID, is_system: true, blocks: [] });
    if (ok) { tmplAdded++; console.log(`   ✅ ${t.slug}`); }
    else { console.error(`   ❌ ${t.slug} (${status}): ${JSON.stringify(data).slice(0,80)}`); }
  }
  console.log(`   Done — added ${tmplAdded}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Repair complete.\n');
  console.log('ℹ️  Items NOT fixed (not corrupt — expected):');
  console.log('   • 25 "Production" environments = provisioned test tenants (normal)');
  console.log('   • Test user accounts — delete manually in Settings > Users if unneeded');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
