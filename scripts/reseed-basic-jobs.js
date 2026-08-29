'use strict';
/* Restore the 4 sample Open jobs into basic-demo (portal untouched). */
const { v4: uuidv4 } = require('uuid');
const db = require('../server/db/init');
const SLUG = 'basic-demo';
const JOB_OBJECT_ID = '300e25a0-a81c-4939-b2b9-3619f505ad29';

const store = db.loadTenantStore(SLUG);
const portal = store.portals.find(p => p.id === 'a2b58e37-c08f-4e18-9181-f5c65885d80b');
const ENV_ID = portal.environment_id;
const creator = (store.users && store.users[0] && store.users[0].id) || null;

const existing = (store.records || []).filter(r => r.object_id === JOB_OBJECT_ID && !r.deleted_at);
if (existing.length) { console.log(`already ${existing.length} job(s) — skipping`); process.exit(0); }

const SAMPLE_JOBS = [
  { job_title: 'Senior Product Engineer', department: 'Engineering', location: 'Remote (UK/EU)', work_type: 'Remote', employment_type: 'Full-time', salary_min: 75000, salary_max: 95000, salary_currency: 'GBP', experience_min_years: 5 },
  { job_title: 'Product Designer',         department: 'Design',      location: 'London, UK',     work_type: 'Hybrid', employment_type: 'Full-time', salary_min: 60000, salary_max: 80000, salary_currency: 'GBP', experience_min_years: 4 },
  { job_title: 'Customer Success Lead',    department: 'Operations',  location: 'Remote (UK/EU)', work_type: 'Remote', employment_type: 'Full-time', salary_min: 55000, salary_max: 70000, salary_currency: 'GBP', experience_min_years: 4 },
  { job_title: 'Growth Marketer',          department: 'Marketing',   location: 'London, UK',     work_type: 'Hybrid', employment_type: 'Full-time', salary_min: 50000, salary_max: 65000, salary_currency: 'GBP', experience_min_years: 3 },
];

let n = Math.max(0, ...(store.records || []).map(r => r.record_number || 0));
const now = Date.now();
SAMPLE_JOBS.forEach((j, i) => {
  store.records.push({
    id: uuidv4(), record_number: ++n, object_id: JOB_OBJECT_ID, environment_id: ENV_ID,
    data: { ...j, status: 'Open', career_site_visible: true }, org_unit_id: null,
    created_by: creator,
    created_at: new Date(now - i * 86400000).toISOString(),
    updated_at: new Date(now - i * 86400000).toISOString(), deleted_at: null,
  });
});
db.saveStoreNow(SLUG);
console.log(`restored ${SAMPLE_JOBS.length} sample jobs`);
process.exit(0);
