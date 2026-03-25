#!/usr/bin/env node
// seed_railway.js — seeds dashboard data directly to Railway via API
// Run: node seed_railway.js (from anywhere)

const https = require('https');

const BASE = 'https://talentos-production-4045.up.railway.app';
const ENV_ID     = 'c0c64e3b-113d-48b8-bc3c-684769849742';
const PEOPLE_OBJ = 'ee66d95d-c20b-4c58-8b17-14151a944d01';
const JOBS_OBJ   = 'ea9c6169-4926-472d-a51d-873f41cf181f';

let TOKEN = '';

const req = (method, path, body) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const u = new URL(BASE + path);
  const opts = {
    hostname: u.hostname, port: 443, path: u.pathname + u.search,
    method, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  };
  if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
  const r = https.request(opts, res => {
    let buf = '';
    res.on('data', d => buf += d);
    res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = d => new Date(Date.now() - d * 86400000).toISOString();
const daysAhead = d => new Date(Date.now() + d * 86400000).toISOString();

const FIRST  = ['James','Sarah','Priya','Ahmed','Emma','Marcus','Lila','Omar','Zoe','Raj','Fatima','Alex','Nina','Carlos','Aisha','Tom','Yuki','Hassan'];
const LAST   = ['Harrison','Chen','Patel','Al-Rashidi','Johnson','Williams','Santos','Hassan','Kim','Sharma','Okafor','Thompson','Weber','Martinez','Osei','Davies','Nakamura'];
const TITLES = ['Software Engineer','Product Manager','UX Designer','Data Analyst','DevOps Engineer','Marketing Manager','HR Business Partner','Sales Executive','Finance Analyst','Operations Lead'];
const DEPTS  = ['Engineering','Product','Design','Data','Operations','Marketing','HR','Sales','Finance'];
const SOURCES= ['LinkedIn','Indeed','Referral','Direct','Glassdoor','Agency'];
const LOCS   = ['Dubai, UAE','Abu Dhabi, UAE','London, UK','New York, USA','Singapore','Riyadh, KSA'];
const SCREEN_STATUSES = ['Applied','Screening','Pending Review','Reviewed','Shortlisted'];
const AI_RESULTS = ['approved','approved','rejected','pending',null,null];
const INT_TYPES  = ['Phone Screen','Video Interview','Technical Assessment','Panel Interview','Final Interview'];
const FORMATS    = ['video','phone','in_person','panel'];
const OUTCOMES   = ['Strong Yes','Yes','Yes','No','Strong No'];
const OFFER_STATUSES = ['draft','pending_approval','sent','sent','sent','accepted','accepted','accepted','declined','expired'];

async function main() {
  // 1. Login
  console.log('🔑 Logging in...');
  const login = await req('POST', '/api/users/login', { email: 'admin@talentos.io', password: 'Admin1234!' });
  if (!login.token) {
    // Some versions return the user object directly with token at top level
    // Try extracting from the raw object
    const t = login.token || login.session_token || login.access_token;
    if (!t) {
      // Railway might use a different login endpoint
      const login2 = await req('POST', '/api/users/auth/login', { email: 'admin@talentos.io', password: 'Admin1234!' });
      if (login2.token) { TOKEN = login2.token; }
      else { console.error('Login failed - no token in response. Using unauthenticated mode.'); }
    } else { TOKEN = t; }
  } else { TOKEN = login.token; }
  console.log('✅ Logged in, token:', TOKEN ? TOKEN.slice(0,20)+'...' : 'NONE (will try without auth)');

  // 2. Check existing counts
  const [existingInt, existingOffers] = await Promise.all([
    req('GET', `/api/interviews?environment_id=${ENV_ID}`),
    req('GET', `/api/offers?environment_id=${ENV_ID}`),
  ]);
  const intCount  = Array.isArray(existingInt)  ? existingInt.length  : (existingInt?.interviews?.length  || 0);
  const offCount  = Array.isArray(existingOffers) ? existingOffers.length : (existingOffers?.offers?.length || 0);
  console.log(`📊 Current: ${intCount} interviews, ${offCount} offers`);

  if (intCount >= 15 && offCount >= 10) {
    console.log('✅ Already have enough data. Skipping.');
    return;
  }

  // 3. Get existing people for linking
  const recRes = await req('GET', `/api/records?object_id=${PEOPLE_OBJ}&environment_id=${ENV_ID}&limit=50`);
  let people = Array.isArray(recRes) ? recRes : (recRes?.records || recRes?.data || []);
  console.log(`👥 Found ${people.length} existing people`);

  // 4. Add people if needed (with screening statuses)
  const toAdd = Math.max(0, 20 - people.length);
  const newPeople = [];
  for (let i = 0; i < toAdd; i++) {
    const fn = pick(FIRST), ln = pick(LAST);
    const p = await req('POST', '/api/records', {
      object_id: PEOPLE_OBJ, environment_id: ENV_ID,
      data: {
        first_name: fn, last_name: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
        current_title: pick(TITLES), department: pick(DEPTS),
        location: pick(LOCS), source: pick(SOURCES),
        status: pick(SCREEN_STATUSES),
        ai_screening_result: pick(AI_RESULTS),
        years_experience: rnd(1,12), rating: rnd(2,5),
        person_type: 'Candidate',
      }
    });
    if (p?.id) newPeople.push(p);
    process.stdout.write('.');
  }
  if (toAdd > 0) { console.log(`\n✅ Added ${newPeople.length} candidates`); }
  people = [...people, ...newPeople];

  // 5. Get jobs for linking
  const jobRes = await req('GET', `/api/records?object_id=${JOBS_OBJ}&environment_id=${ENV_ID}&limit=20`);
  const jobs = Array.isArray(jobRes) ? jobRes : (jobRes?.records || []);
  console.log(`💼 Found ${jobs.length} jobs`);

  // 6. Seed Interviews
  const intNeeded = Math.max(0, 25 - intCount);
  let intAdded = 0;
  for (let i = 0; i < intNeeded; i++) {
    const person  = pick(people);
    const job     = jobs.length ? pick(jobs) : null;
    const dOff    = rnd(-21, 28);
    const isPast  = dOff < 0;
    const status  = isPast ? pick(['completed','completed','cancelled']) : 'scheduled';
    const intDate = new Date(Date.now() + dOff * 86400000).toISOString().slice(0,10);
    const result  = await req('POST', '/api/interviews', {
      environment_id: ENV_ID,
      candidate_id:   person?.id,
      candidate_name: `${person?.data?.first_name||''} ${person?.data?.last_name||''}`.trim()||'Candidate',
      job_id:   job?.id||null,
      job_title: job?.data?.job_title||job?.data?.title||pick(TITLES),
      type_name: pick(INT_TYPES),
      date:     intDate,
      time:     `${rnd(9,17).toString().padStart(2,'0')}:00`,
      duration_minutes: pick([30,45,60]),
      format:   pick(FORMATS),
      status,
      outcome:  status==='completed' ? pick(OUTCOMES) : null,
      notes:    status==='completed' ? 'Interview completed.' : null,
    });
    if (result?.id || result?.interview?.id) intAdded++;
    process.stdout.write('.');
  }
  if (intNeeded > 0) console.log(`\n✅ Added ${intAdded} interviews`);

  // 7. Seed Offers
  const offNeeded = Math.max(0, 18 - offCount);
  let offAdded = 0;
  for (let i = 0; i < offNeeded; i++) {
    const person = pick(people);
    const job    = jobs.length ? pick(jobs) : null;
    const status = pick(OFFER_STATUSES);
    const sal    = rnd(60,200) * 1000;
    const startDate = new Date(Date.now() + rnd(14,90)*86400000).toISOString().slice(0,10);
    const result = await req('POST', '/api/offers', {
      environment_id: ENV_ID,
      candidate_id:   person?.id,
      candidate_name: `${person?.data?.first_name||''} ${person?.data?.last_name||''}`.trim()||'Candidate',
      job_id:   job?.id||null,
      job_title: job?.data?.job_title||job?.data?.title||pick(TITLES),
      status, currency: 'USD',
      base_salary: sal, bonus: Math.round(sal*0.1),
      start_date:  startDate,
      expiry_date: new Date(Date.now() + rnd(7,21)*86400000).toISOString().slice(0,10),
      approvers: [], notes: 'Seeded offer.',
      data: { start_date: startDate, docs_status: status==='accepted'?pick(['complete','pending']):'pending', job_title: job?.data?.job_title||pick(TITLES) },
    });
    if (result?.id || result?.offer?.id) offAdded++;
    process.stdout.write('.');
  }
  if (offNeeded > 0) console.log(`\n✅ Added ${offAdded} offers`);

  // 8. Final counts
  const [fi, fo] = await Promise.all([
    req('GET', `/api/interviews?environment_id=${ENV_ID}`),
    req('GET', `/api/offers?environment_id=${ENV_ID}`),
  ]);
  const fi2 = Array.isArray(fi) ? fi.length : (fi?.interviews?.length||0);
  const fo2 = Array.isArray(fo) ? fo.length : (fo?.offers?.length||0);
  console.log(`\n📊 Railway now has: ${people.length} people, ${fi2} interviews, ${fo2} offers`);
  console.log('✅ Done — refresh vercentic.vercel.app to see data');
}

main().catch(console.error);
