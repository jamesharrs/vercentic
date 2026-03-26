#!/usr/bin/env node
// seed_dashboards.js — run from ~/projects/talentos/server
// node seed_dashboards.js

const { insert, getStore } = require('./db/init');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

const store = getStore();

const ENV_ID    = 'c0c64e3b-113d-48b8-bc3c-684769849742'; // Production
const PEOPLE_OBJ = 'ee66d95d-c20b-4c58-8b17-14151a944d01';
const JOBS_OBJ   = 'ea9c6169-4926-472d-a51d-873f41cf181f';

const now = Date.now();
const daysAgo = d => new Date(now - d * 86400000).toISOString();
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ── Guard: only run if data is thin ────────────────────────────────────────
const existingInterviews = (store.interviews || []).filter(i => i.environment_id === ENV_ID);
const existingOffers     = (store.offers     || []).filter(o => o.environment_id === ENV_ID);
if (existingInterviews.length > 10 && existingOffers.length > 5) {
  console.log(`Already have ${existingInterviews.length} interviews and ${existingOffers.length} offers. Skipping.`);
  process.exit(0);
}

// ── Reference data ─────────────────────────────────────────────────────────
const FIRST = ['James','Sarah','Priya','Ahmed','Emma','Marcus','Lila','Omar','Zoe','Raj','Fatima','Alex','Nina','Carlos','Aisha'];
const LAST  = ['Harrison','Chen','Patel','Al-Rashidi','Johnson','Williams','Santos','Hassan','Kim','Sharma','Okafor','Thompson','Weber','Martinez','Osei'];
const TITLES = ['Software Engineer','Product Manager','UX Designer','Data Analyst','DevOps Engineer','Marketing Manager','HR Business Partner','Sales Executive','Finance Analyst','Operations Lead'];
const DEPTS  = ['Engineering','Product','Design','Data','Operations','Marketing','HR','Sales','Finance','Customer Success'];
const SOURCES = ['LinkedIn','Indeed','Referral','Direct','Glassdoor','Agency','Campus'];
const LOCATIONS = ['Dubai, UAE','Abu Dhabi, UAE','London, UK','New York, USA','Singapore','Riyadh, KSA','Cairo, Egypt'];
const INTERVIEW_TYPES = ['Phone Screen','Video Interview','Technical Assessment','Panel Interview','Culture Fit','Final Interview'];
const FORMATS = ['video','phone','in_person','panel'];
const SCREENING_STATUSES = ['Applied','Screening','Pending Review','Reviewed','Shortlisted'];
const AI_RESULTS = ['approved','approved','approved','rejected','pending',null,null];

console.log('🌱 Seeding dashboard data for Production environment...\n');

// ── 1. Screening candidates (People records) ────────────────────────────────
const existingPeople = (store.records || []).filter(r => r.object_id === PEOPLE_OBJ);
const peopleToAdd = Math.max(0, 25 - existingPeople.length);
const newPeopleIds = [];

for (let i = 0; i < peopleToAdd; i++) {
  const fn = pick(FIRST), ln = pick(LAST);
  const daysBack = rnd(1, 45);
  const id = uuid();
  newPeopleIds.push(id);
  insert('records', {
    id,
    object_id:      PEOPLE_OBJ,
    environment_id: ENV_ID,
    created_by:     'seed',
    created_at:     daysAgo(daysBack),
    updated_at:     daysAgo(rnd(0, daysBack)),
    data: {
      first_name:           fn,
      last_name:            ln,
      email:                `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      current_title:        pick(TITLES),
      department:           pick(DEPTS),
      location:             pick(LOCATIONS),
      source:               pick(SOURCES),
      status:               pick(SCREENING_STATUSES),
      ai_screening_result:  pick(AI_RESULTS),
      years_experience:     rnd(1, 15),
      rating:               rnd(2, 5),
      person_type:          'Candidate',
    }
  });
}
console.log(`✅ Added ${peopleToAdd} candidate records`);

// Gather all people IDs for use in interviews/offers
const allPeople = (store.records || []).filter(r => r.object_id === PEOPLE_OBJ);
const allJobs   = (store.records || []).filter(r => r.object_id === JOBS_OBJ);

// ── 2. Interview Types (if none exist) ─────────────────────────────────────
const existingTypes = (store.interview_types || []).filter(i => i.environment_id === ENV_ID);
const typeIds = [];

if (existingTypes.length < 3) {
  INTERVIEW_TYPES.forEach((name, idx) => {
    const id = uuid();
    typeIds.push(id);
    insert('interview_types', {
      id, environment_id: ENV_ID,
      name, duration_minutes: [30,45,60,90][idx % 4],
      format: FORMATS[idx % FORMATS.length],
      description: `Standard ${name} for all candidates`,
      created_at: daysAgo(90),
    });
  });
  console.log(`✅ Added ${INTERVIEW_TYPES.length} interview types`);
} else {
  existingTypes.forEach(t => typeIds.push(t.id));
}

// ── 3. Interviews ──────────────────────────────────────────────────────────
const STATUSES_INT = ['scheduled','scheduled','scheduled','completed','completed','completed','cancelled'];
const OUTCOMES     = ['Strong Yes','Yes','Yes','No','Strong No',null,null];

let intCount = 0;
for (let i = 0; i < 30; i++) {
  const person = pick(allPeople);
  const job    = allJobs.length ? pick(allJobs) : null;
  const daysOff = rnd(-14, 30); // neg = past, pos = future
  const intDate = new Date(now + daysOff * 86400000);
  const status  = daysOff < 0 ? pick(['completed','completed','cancelled']) : 'scheduled';

  insert('interviews', {
    id:             uuid(),
    environment_id: ENV_ID,
    candidate_id:   person?.id,
    candidate_name: person ? `${person.data?.first_name} ${person.data?.last_name}` : 'Unknown',
    job_id:         job?.id || null,
    job_title:      job?.data?.job_title || job?.data?.title || pick(TITLES),
    type_id:        pick(typeIds),
    type_name:      pick(INTERVIEW_TYPES),
    date:           intDate.toISOString().slice(0,10),
    time:           `${rnd(9,17).toString().padStart(2,'0')}:${pick(['00','15','30','45'])}`,
    duration_minutes: pick([30,45,60]),
    format:         pick(FORMATS),
    status,
    outcome:        status === 'completed' ? pick(OUTCOMES) : null,
    interviewers:   [],
    notes:          status === 'completed' ? 'Interview completed.' : null,
    created_at:     daysAgo(rnd(daysOff < 0 ? Math.abs(daysOff)+1 : 1, 60)),
    updated_at:     new Date().toISOString(),
  });
  intCount++;
}
console.log(`✅ Added ${intCount} interviews (mix of past/upcoming)`);

// ── 4. Offers ──────────────────────────────────────────────────────────────
const OFFER_STATUSES = ['draft','pending_approval','sent','sent','accepted','accepted','accepted','declined','expired'];
const CURRENCIES = ['USD','GBP','AED','SAR'];

let offCount = 0;
for (let i = 0; i < 18; i++) {
  const person   = pick(allPeople);
  const job      = allJobs.length ? pick(allJobs) : null;
  const daysBack = rnd(1, 60);
  const status   = pick(OFFER_STATUSES);
  const baseSal  = rnd(60, 200) * 1000;
  const currency = pick(CURRENCIES);
  const startDate = new Date(now + rnd(14, 90) * 86400000).toISOString().slice(0,10);

  insert('offers', {
    id:             uuid(),
    environment_id: ENV_ID,
    candidate_id:   person?.id,
    candidate_name: person ? `${person.data?.first_name} ${person.data?.last_name}` : 'Unknown',
    job_id:         job?.id || null,
    job_title:      job?.data?.job_title || job?.data?.title || pick(TITLES),
    status,
    currency,
    base_salary:    baseSal,
    bonus:          Math.round(baseSal * rnd(5,20) / 100),
    start_date:     startDate,
    expiry_date:    new Date(now + rnd(5,14) * 86400000).toISOString().slice(0,10),
    approvers:      [],
    approval_index: 0,
    notes:          'Generated by seed script.',
    data: {
      start_date:   startDate,
      docs_status:  status === 'accepted' ? pick(['complete','pending']) : 'pending',
      job_title:    job?.data?.job_title || pick(TITLES),
    },
    created_at:     daysAgo(daysBack),
    updated_at:     daysAgo(rnd(0, daysBack)),
  });
  offCount++;
}
console.log(`✅ Added ${offCount} offers (draft/pending/sent/accepted/declined)`);

// ── 5. Communications (for screening activity) ─────────────────────────────
const COMM_TYPES = ['email','phone','email','email','sms'];
const COMM_SUBJECTS = ['Application received','Interview invitation','Screening call follow-up','Next steps','Application update'];

let commCount = 0;
for (let i = 0; i < 20; i++) {
  const person = pick(allPeople);
  insert('communications', {
    id:             uuid(),
    environment_id: ENV_ID,
    record_id:      person?.id,
    object_id:      PEOPLE_OBJ,
    type:           pick(COMM_TYPES),
    direction:      'outbound',
    subject:        pick(COMM_SUBJECTS),
    body:           'Communication logged by seed script.',
    status:         'sent',
    created_by:     'seed',
    created_at:     daysAgo(rnd(1, 30)),
    updated_at:     new Date().toISOString(),
  });
  commCount++;
}
console.log(`✅ Added ${commCount} communications`);

// ── 6. Summary ─────────────────────────────────────────────────────────────
const finalStore = getStore();
console.log('\n📊 Dashboard data summary:');
console.log(`   People (candidates):  ${(finalStore.records||[]).filter(r=>r.object_id===PEOPLE_OBJ).length}`);
console.log(`   Interviews:           ${(finalStore.interviews||[]).filter(i=>i.environment_id===ENV_ID).length}`);
console.log(`   Offers:               ${(finalStore.offers||[]).filter(o=>o.environment_id===ENV_ID).length}`);
console.log(`   Communications:       ${(finalStore.communications||[]).filter(c=>c.environment_id===ENV_ID).length}`);
console.log('\n✅ Seed complete — refresh the dashboards to see data.');
