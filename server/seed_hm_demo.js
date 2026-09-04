// One-shot seed script for the Hiring Manager Portal demo.
// Writes directly to data/tenant-basic-demo.json. Run with the server STOPPED.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, '..', 'data', 'tenant-basic-demo.json');
const ENV_ID = 'eb70f1ce-026f-4e43-b895-889c13134873';
const PEOPLE_OBJ = '80488f47-ea18-4e70-9664-dcf285af686f';
const JOBS_OBJ = '300e25a0-a81c-4939-b2b9-3619f505ad29';
const HM_USER_ID = '1c4c837f-e899-4261-bd62-31900b47fe46';
const HM_EMAIL = 'manager@talentos.io';
const HM_PASSWORD = 'HireManager2026!';
const JOB_ENGINEER = '4f6d2d3a-1952-4e4e-a13a-4df335129ce1'; // Senior Product Engineer
const JOB_DESIGNER = 'cc176f89-7e90-405b-a732-675eff11f426'; // Product Designer
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const raw = fs.readFileSync(FILE, 'utf8');
const store = JSON.parse(raw);

function ensureArr(key) { if (!Array.isArray(store[key])) store[key] = []; return store[key]; }
const records = ensureArr('records');
const users = ensureArr('users');
const savedViews = ensureArr('saved_views');
const portals = ensureArr('portals');
const interviews = ensureArr('interviews');
const offers = ensureArr('offers');
const peopleLinks = ensureArr('people_links');

// ── 1. Reset the HM's password to a known value ────────────────────────────
const hmUser = users.find(u => u.id === HM_USER_ID);
if (!hmUser) throw new Error('HM user not found: ' + HM_USER_ID);
hmUser.password_hash = bcrypt.hashSync(HM_PASSWORD, 12);
hmUser.must_change_password = 0;
hmUser.updated_at = now();
console.log('✓ Password reset for', HM_EMAIL);

// ── 2. Create the HM's own Person record (so findPersonRecordForSession resolves) ──
let hmPerson = records.find(r => r.object_id === PEOPLE_OBJ && (r.data || {}).email === HM_EMAIL);
const HM_PERSON_ID = hmPerson ? hmPerson.id : uuid();
if (!hmPerson) {
  hmPerson = {
    id: HM_PERSON_ID,
    object_id: PEOPLE_OBJ,
    environment_id: ENV_ID,
    data: {
      first_name: 'Sarah',
      last_name: 'Chen',
      email: HM_EMAIL,
      phone: '+971 50 123 4567',
      current_title: 'VP of Product & Engineering',
      location: 'Dubai, UAE',
      linkedin_url: 'https://linkedin.com/in/sarahchen',
      person_type: 'Employee',
      skills: JSON.stringify(['Leadership', 'Product Strategy', 'Engineering Management']),
      languages: ['English'],
      years_experience: 14,
      status: 'Placed',
      source: 'Direct',
      job_title: 'VP of Product & Engineering',
      department: 'Engineering',
      entity: 'Vercentic',
      employment_type: 'Full-time',
      start_date: '2022-01-10',
    },
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
    created_by: HM_USER_ID,
  };
  records.push(hmPerson);
  console.log('✓ Created HM Person record:', HM_PERSON_ID);
} else {
  console.log('✓ HM Person record already exists:', HM_PERSON_ID);
}

// ── 3. Assign hiring_manager on 2 of the 4 jobs (people-type field: [{id,name}]) ──
const hmFieldVal = [{ id: HM_PERSON_ID, name: 'Sarah Chen' }];
[JOB_ENGINEER, JOB_DESIGNER].forEach(jobId => {
  const job = records.find(r => r.id === jobId);
  if (!job) { console.warn('! Job not found:', jobId); return; }
  job.data = job.data || {};
  job.data.hiring_manager = hmFieldVal;
  job.updated_at = now();
});
console.log('✓ Assigned hiring_manager to 2 jobs (Senior Product Engineer, Product Designer)');

// ── 4. Pick some existing People (candidates) to link at varied stages ─────
const candidatePool = records.filter(r =>
  r.object_id === PEOPLE_OBJ &&
  (r.data || {}).email !== HM_EMAIL &&
  (r.data || {}).person_type === 'Candidate'
).slice(0, 10);

if (candidatePool.length < 4) {
  console.warn('! Fewer than 4 Candidate-type people found — using any non-HM people instead');
}
const pool = candidatePool.length >= 4
  ? candidatePool
  : records.filter(r => r.object_id === PEOPLE_OBJ && (r.data || {}).email !== HM_EMAIL).slice(0, 10);

const STAGE_ORDER = ['Applied','CV Review','Phone Screen','Recruiter Call','Technical Screen','Take-Home Task','Technical Interview','Manager Review','Final Interview','Culture Fit','Assessment Centre','Offer','Hired','Placed','Accepted'];

// Distribute across both HM jobs with a mix of stages — some early, some
// squarely "needs manager attention" (Manager Review / Final Interview / Offer)
const linkPlan = [
  { jobId: JOB_ENGINEER, stage: 'Manager Review' },
  { jobId: JOB_ENGINEER, stage: 'Manager Review' },
  { jobId: JOB_ENGINEER, stage: 'Final Interview' },
  { jobId: JOB_ENGINEER, stage: 'Technical Interview' },
  { jobId: JOB_ENGINEER, stage: 'Offer' },
  { jobId: JOB_DESIGNER, stage: 'Manager Review' },
  { jobId: JOB_DESIGNER, stage: 'Culture Fit' },
  { jobId: JOB_DESIGNER, stage: 'Phone Screen' },
];

let created = 0;
linkPlan.forEach((plan, i) => {
  const person = pool[i % pool.length];
  if (!person) return;
  // avoid duplicate link for same person+job
  const dup = peopleLinks.find(l => l.person_id === person.id && l.job_id === plan.jobId);
  if (dup) { dup.stage_name = plan.stage; dup.updated_at = now(); return; }
  peopleLinks.push({
    id: uuid(),
    environment_id: ENV_ID,
    person_id: person.id,
    job_id: plan.jobId,
    stage_name: plan.stage,
    created_at: now(),
    updated_at: now(),
  });
  created++;
});
console.log(`✓ Seeded ${created} new people_links across the 2 HM jobs (varied stages)`);

// ── 5. Saved View — "Ready for Manager Review" ──────────────────────────────
const peopleObjDef = (store.objects || []).find(o => o.id === PEOPLE_OBJ);
const fieldsList = (store.fields || []).filter(f => f.object_id === PEOPLE_OBJ);
const statusField = fieldsList.find(f => f.api_key === 'status');
if (!statusField) throw new Error('People status field not found');

let savedView = savedViews.find(v => v.environment_id === ENV_ID && v.name === 'Ready for Manager Review');
const SAVED_VIEW_ID = savedView ? savedView.id : uuid();
if (!savedView) {
  savedView = {
    id: SAVED_VIEW_ID,
    name: 'Ready for Manager Review',
    object_id: PEOPLE_OBJ,
    environment_id: ENV_ID,
    filters: [
      { fieldId: statusField.id, op: 'is', value: 'Interviewing', rowLogic: 'AND' },
      { fieldId: statusField.id, op: 'is', value: 'Offer', rowLogic: 'OR' },
    ],
    sort: null,
    columns: null,
    portal_visible: true,
    sharing: { visibility: 'everyone' },
    created_by: HM_USER_ID,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  savedViews.push(savedView);
  console.log('✓ Created Saved View "Ready for Manager Review":', SAVED_VIEW_ID);
} else {
  console.log('✓ Saved View already exists:', SAVED_VIEW_ID);
}

// ── 6. hm_portal-type Portal record ─────────────────────────────────────────
let hmPortal = portals.find(p => p.environment_id === ENV_ID && p.type === 'hm_portal' && !p.deleted_at);
if (!hmPortal) {
  const hmToken = crypto.randomBytes(24).toString('hex');
  hmPortal = {
    id: uuid(),
    environment_id: ENV_ID,
    type: 'hm_portal',
    name: 'Hiring Manager Portal',
    slug: 'hiring-managers',
    status: 'published',
    primary_color: '#1E293B',
    secondary_color: '#334155',
    accent_color: '#4361EE',
    background_color: '#F8FAFC',
    text_color: '#0F172A',
    logo_url: '',
    show_apply_button: false,
    require_auth: true,
    show_salary: true,
    allow_cv_upload: false,
    exposed_objects: ['jobs', 'people'],
    access_token: hmToken,
    hm_shortlist_saved_view_id: SAVED_VIEW_ID,
    pages: [],
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  portals.push(hmPortal);
  console.log('✓ Created Hiring Manager Portal:', hmPortal.id, '(slug: hiring-managers)');
} else {
  hmPortal.hm_shortlist_saved_view_id = SAVED_VIEW_ID;
  hmPortal.status = 'published';
  hmPortal.updated_at = now();
  console.log('✓ Existing Hiring Manager Portal updated:', hmPortal.id);
}

// ── 7. Interviews — 2 upcoming, for the Interviews/feedback tab ────────────
const interviewCandidates = pool.slice(0, 2);
const interviewPlan = [
  { job: JOB_ENGINEER, jobName: 'Senior Product Engineer', daysOut: 2, type: 'Technical Interview', time: '11:00' },
  { job: JOB_DESIGNER, jobName: 'Product Designer', daysOut: 4, type: 'Final Interview', time: '14:30' },
];
let interviewsCreated = 0;
interviewPlan.forEach((plan, i) => {
  const cand = interviewCandidates[i];
  if (!cand) return;
  const already = interviews.find(iv => iv.job_id === plan.job && iv.candidate_id === cand.id && !iv.deleted_at);
  if (already) return;
  const d = new Date(); d.setDate(d.getDate() + plan.daysOut);
  const dateStr = d.toISOString().slice(0, 10);
  const cd = cand.data || {};
  interviews.push({
    id: uuid(),
    environment_id: ENV_ID,
    interview_type_id: null,
    interview_type_name: plan.type,
    candidate_id: cand.id,
    candidate_name: `${cd.first_name || ''} ${cd.last_name || ''}`.trim(),
    job_id: plan.job,
    job_name: plan.jobName,
    date: dateStr,
    time: plan.time,
    duration: 45,
    format: 'Video Call',
    interviewers: [{ id: HM_PERSON_ID, name: 'Sarah Chen' }],
    notes: '',
    status: 'pending',
    meeting_link: null,
    meeting_provider: null,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  });
  interviewsCreated++;
});
console.log(`✓ Seeded ${interviewsCreated} interviews`);

// ── 8. Offer — one accepted offer for the Onboarding tab ───────────────────
const offerCandidate = pool[pool.length - 1] || pool[0];
let offerCreated = false;
if (offerCandidate) {
  const already = offers.find(o => o.job_id === JOB_ENGINEER && o.candidate_id === offerCandidate.id && !o.deleted_at);
  if (!already) {
    const cd = offerCandidate.data || {};
    const base = 82000;
    offers.push({
      id: uuid(),
      environment_id: ENV_ID,
      job_id: JOB_ENGINEER,
      job_name: 'Senior Product Engineer',
      candidate_id: offerCandidate.id,
      candidate_name: `${cd.first_name || ''} ${cd.last_name || ''}`.trim(),
      status: 'accepted',
      base_salary: base,
      currency: 'GBP',
      bonus: 10,
      bonus_type: 'percentage',
      package_items: [],
      start_date: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })(),
      expiry_date: null,
      notes: 'Candidate accepted verbally, awaiting signed contract.',
      terms: '',
      approval_chain: [],
      current_approver_index: null,
      activity_log: [
        { id: uuid(), type: 'created', message: 'Offer created', user: HM_USER_ID, timestamp: now() },
        { id: uuid(), type: 'sent', message: 'Offer sent to candidate', user: HM_USER_ID, timestamp: now() },
        { id: uuid(), type: 'accepted', message: 'Offer accepted by candidate', user: 'candidate', timestamp: now() },
      ],
      sent_at: now(),
      created_by: HM_USER_ID,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    });
    offerCreated = true;
  }
}
console.log(offerCreated ? '✓ Seeded 1 accepted offer' : '✓ Offer already exists, skipped');

fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
console.log('\n=== DONE ===');
console.log('HM login:', HM_EMAIL, '/', HM_PASSWORD);
console.log('HM person id:', HM_PERSON_ID);
console.log('Saved view id:', SAVED_VIEW_ID);
console.log('Portal id:', hmPortal.id, 'slug:', hmPortal.slug);
