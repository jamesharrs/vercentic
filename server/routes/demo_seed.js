/**
 * TalentOS Demo Data Seeder
 * server/routes/demo_seed.js
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

const JOB_TEMPLATES = [
  { title:'Senior Software Engineer',        dept:'Engineering', salary_min:120000, salary_max:160000, location:'San Francisco, USA',  work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Staff Engineer',                  dept:'Engineering', salary_min:160000, salary_max:220000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Frontend Engineer',               dept:'Engineering', salary_min:100000, salary_max:140000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Backend Engineer',                dept:'Engineering', salary_min:110000, salary_max:150000, location:'Dubai, UAE',           work_type:'On-site', employment_type:'Full-time' },
  { title:'DevOps Engineer',                 dept:'Engineering', salary_min:115000, salary_max:155000, location:'Singapore',            work_type:'Remote',  employment_type:'Full-time' },
  { title:'Data Engineer',                   dept:'Data',        salary_min:105000, salary_max:145000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'ML Engineer',                     dept:'Data',        salary_min:130000, salary_max:175000, location:'San Francisco, USA',   work_type:'Remote',  employment_type:'Full-time' },
  { title:'Engineering Manager',             dept:'Engineering', salary_min:155000, salary_max:200000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'VP of Engineering',               dept:'Engineering', salary_min:220000, salary_max:300000, location:'San Francisco, USA',   work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Principal Engineer',              dept:'Engineering', salary_min:180000, salary_max:240000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Product Manager',                 dept:'Product',     salary_min:120000, salary_max:165000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Senior Product Manager',          dept:'Product',     salary_min:145000, salary_max:190000, location:'Dubai, UAE',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Mobile Engineer (iOS)',           dept:'Engineering', salary_min:110000, salary_max:150000, location:'Sydney, Australia',    work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Mobile Engineer (Android)',       dept:'Engineering', salary_min:110000, salary_max:150000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Security Engineer',               dept:'Engineering', salary_min:125000, salary_max:170000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Site Reliability Engineer',       dept:'Engineering', salary_min:130000, salary_max:175000, location:'San Francisco, USA',   work_type:'Remote',  employment_type:'Full-time' },
  { title:'Data Scientist',                  dept:'Data',        salary_min:115000, salary_max:160000, location:'Toronto, Canada',      work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'QA Engineer',                     dept:'Engineering', salary_min:85000,  salary_max:120000, location:'Dubai, UAE',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Solutions Architect',             dept:'Engineering', salary_min:150000, salary_max:200000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'CTO',                             dept:'Engineering', salary_min:280000, salary_max:400000, location:'San Francisco, USA',   work_type:'On-site', employment_type:'Full-time' },
  { title:'Investment Banking Analyst',      dept:'Finance',     salary_min:95000,  salary_max:130000, location:'London, UK',           work_type:'On-site', employment_type:'Full-time' },
  { title:'Investment Banking Associate',    dept:'Finance',     salary_min:140000, salary_max:200000, location:'New York, USA',        work_type:'On-site', employment_type:'Full-time' },
  { title:'Vice President – M&A',           dept:'Finance',     salary_min:200000, salary_max:280000, location:'London, UK',           work_type:'On-site', employment_type:'Full-time' },
  { title:'Managing Director – DCM',        dept:'Finance',     salary_min:320000, salary_max:500000, location:'Dubai, UAE',           work_type:'On-site', employment_type:'Full-time' },
  { title:'Quantitative Analyst',            dept:'Finance',     salary_min:130000, salary_max:180000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Risk Manager',                    dept:'Finance',     salary_min:110000, salary_max:160000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Chief Risk Officer',              dept:'Finance',     salary_min:250000, salary_max:380000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Financial Analyst',               dept:'Finance',     salary_min:70000,  salary_max:100000, location:'Toronto, Canada',      work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'FP&A Manager',                   dept:'Finance',     salary_min:115000, salary_max:155000, location:'Dubai, UAE',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Compliance Officer',              dept:'Finance',     salary_min:95000,  salary_max:140000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Head of Compliance',             dept:'Finance',     salary_min:165000, salary_max:230000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Portfolio Manager',              dept:'Finance',     salary_min:160000, salary_max:250000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Credit Risk Analyst',            dept:'Finance',     salary_min:85000,  salary_max:125000, location:'Dubai, UAE',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'CFO',                            dept:'Finance',     salary_min:300000, salary_max:450000, location:'New York, USA',        work_type:'On-site', employment_type:'Full-time' },
  { title:'Finance Business Partner',       dept:'Finance',     salary_min:90000,  salary_max:130000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Senior Accountant',              dept:'Finance',     salary_min:65000,  salary_max:95000,  location:'Toronto, Canada',      work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Tax Manager',                    dept:'Finance',     salary_min:110000, salary_max:155000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Internal Auditor',               dept:'Finance',     salary_min:75000,  salary_max:110000, location:'Sydney, Australia',    work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Talent Acquisition Partner',     dept:'HR',          salary_min:70000,  salary_max:100000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Senior Recruiter',               dept:'HR',          salary_min:80000,  salary_max:115000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Head of Talent Acquisition',     dept:'HR',          salary_min:130000, salary_max:180000, location:'San Francisco, USA',   work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'HR Business Partner',            dept:'HR',          salary_min:80000,  salary_max:120000, location:'Dubai, UAE',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Total Rewards Manager',          dept:'HR',          salary_min:105000, salary_max:150000, location:'Singapore',            work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'L&D Manager',                   dept:'HR',          salary_min:90000,  salary_max:130000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Chief People Officer',           dept:'HR',          salary_min:250000, salary_max:350000, location:'New York, USA',        work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'HR Operations Manager',          dept:'HR',          salary_min:85000,  salary_max:120000, location:'Sydney, Australia',    work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'Diversity & Inclusion Lead',     dept:'HR',          salary_min:95000,  salary_max:135000, location:'San Francisco, USA',   work_type:'Hybrid',  employment_type:'Full-time' },
  { title:'People Analytics Manager',       dept:'HR',          salary_min:110000, salary_max:155000, location:'London, UK',           work_type:'Hybrid',  employment_type:'Full-time' },
];

const WORKFLOW_TEMPLATES = [
  { name:'Standard Application Process', description:'Default hiring pipeline for most roles', steps:['Applied','CV Review','Phone Screen','Technical Interview','Final Interview','Offer','Hired','Rejected'] },
  { name:'Executive Track',              description:'Senior leadership hiring process',        steps:['Identified','Initial Briefing','Long List','Short List','1st Interview','2nd Interview','Board Interview','Offer','Placed','Withdrawn'] },
  { name:'Technical Engineering Process',description:'Engineering roles with tech assessment',  steps:['Applied','CV Screen','Recruiter Call','Technical Screen','Take-Home Task','Technical Interview','Culture Fit','Offer','Hired','Rejected'] },
  { name:'Graduate Scheme',              description:'Entry-level and graduate hiring',         steps:['Applied','Application Review','Online Assessment','Group Exercise','Video Interview','Assessment Centre','Offer','Accepted','Rejected'] },
];

const RECRUITER_NOTES = [
  'Excellent communicator, very structured answers in interview.',
  'Strong technical background, bit light on leadership experience.',
  'Culturally aligned, enthusiastic about the mission.',
  'Salary expectations slightly above band — flagged to hiring manager.',
  'Currently on notice period, available in 4 weeks.',
  'Referenced by a current employee — warm intro.',
  'Very impressive portfolio, recommend fast-tracking to technical round.',
  'Needs visa sponsorship — check with HR before progressing.',
  'Outstanding presentation skills. Panel unanimously positive.',
  'Counter-offered by current employer, considering options.',
  'Start date flexibility is a concern — needs to be negotiated.',
  'Excellent references from previous manager.',
  'Met at GITEX conference — proactively reached out.',
];

const EMAIL_SUBJECTS = [
  'Application Confirmation – {job_title}',
  'Interview Invitation – {job_title}',
  'Thank you for your application',
  'Next Steps: Technical Interview',
  'Offer Letter – {job_title}',
  'Following up on your application',
];

const EMAIL_BODIES = [
  'Thank you for applying. We have reviewed your application and would love to schedule an initial call.',
  'Following our conversation, I am delighted to invite you to the next stage of the process.',
  'We were impressed by your background and would like to move forward with a technical assessment.',
  'After careful consideration, we would like to progress you to the final stage.',
  'I am pleased to confirm that we would like to extend a formal offer.',
  'Thank you for taking the time to interview with us. We will be in touch shortly with feedback.',
];

const SKILLS_BY_DEPT = {
  Engineering: ['React','Node.js','TypeScript','Python','AWS','Kubernetes','GraphQL','PostgreSQL','Docker','CI/CD','Go','Java'],
  Data:        ['Python','SQL','Spark','dbt','Airflow','TensorFlow','Snowflake','BigQuery','Tableau','R'],
  Finance:     ['Financial Modelling','Excel','Bloomberg','DCM','M&A','Valuation','VBA','SQL','Risk Management','IFRS'],
  HR:          ['Talent Acquisition','LinkedIn Recruiter','Workday','SAP SuccessFactors','L&D','HRBP','Compensation'],
  Product:     ['Product Strategy','Roadmapping','JIRA','Figma','A/B Testing','SQL','User Research','OKRs'],
};

const SOURCES   = ['LinkedIn','Direct Application','Referral','Job Board','Agency','Proactive Outreach','Career Site','Event'];
const STATUSES  = ['Active','Active','Active','Active','Passive','Passive','Placed','Declined'];
const PTYPES    = ['Candidate','Candidate','Candidate','Candidate','Contact'];

const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isoNow  = () => new Date().toISOString();
const isoAgo  = days => new Date(Date.now() - days * 86400000).toISOString();
const fmt     = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');

async function runSeed({ environmentId, clearFirst, progressCb }) {
  const store = getStore();

  progressCb({ step:'init', message:'Resolving environment and objects…', pct:2 });

  const env = store.environments?.find(e => e.id === environmentId);
  if (!env) throw new Error(`Environment ${environmentId} not found`);

  const allObjects = store.objects || store.object_definitions || [];
  const objects    = allObjects.filter(o => o.environment_id === environmentId);
  const peopleObj  = objects.find(o =>
    ['people','persons','person','candidates'].includes(o.slug?.toLowerCase()) ||
    o.name?.toLowerCase().includes('people') || o.name?.toLowerCase().includes('person')
  );
  const jobsObj = objects.find(o =>
    ['jobs','job','positions','vacancies','roles'].includes(o.slug?.toLowerCase()) ||
    o.name?.toLowerCase().includes('job') || o.name?.toLowerCase().includes('position')
  );

  if (!peopleObj) throw new Error(`People object not found — available: ${objects.map(o=>o.slug).join(', ')}`);
  if (!jobsObj)   throw new Error(`Jobs object not found — available: ${objects.map(o=>o.slug).join(', ')}`);

  if (clearFirst) {
    progressCb({ step:'clear', message:'Clearing previous demo data…', pct:4 });
    ['records','workflows','workflow_steps','record_workflow_assignments',
     'people_links','notes','communications'].forEach(table => {
      if (store[table]) store[table] = store[table].filter(r => !(r._demo && r.environment_id === environmentId));
    });
    saveStore();
  }

  // ── Fetch 300 real profiles ──────────────────────────────────────────────
  progressCb({ step:'fetch', message:'Fetching 300 profiles from randomuser.me…', pct:8 });
  let randomUsers = [];
  try {
    const res  = await fetch('https://randomuser.me/api/?results=300&nat=us,gb,ae,au,ca,sg&inc=name,email,phone,location,picture,dob&noinfo');
    const data = await res.json();
    randomUsers = data.results || [];
  } catch {
    progressCb({ step:'fetch_warn', message:'randomuser.me unavailable — using generated names', pct:8 });
    const fn = ['James','Emma','Mohammed','Sarah','David','Priya','Lucas','Aisha','Tom','Sofia','Alex','Yuki','Marcus','Amara','Oliver'];
    const ln = ['Chen','Johnson','Al-Rashid','Williams','Kumar','Smith','Okonkwo','Mueller','Tanaka','Andersen','Moreau','Nakamura','Reyes'];
    for (let i = 0; i < 300; i++) {
      randomUsers.push({ name:{first:pick(fn),last:pick(ln)}, email:`candidate${i+1}@demo.talentos.io`,
        phone:`+1${randInt(2000000000,9999999999)}`,
        location:{city:pick(['New York','London','Dubai','Singapore','Sydney','Toronto'])},
        picture:{medium:null}, dob:{age:randInt(22,55)} });
    }
  }

  // ── Create 50 jobs ───────────────────────────────────────────────────────
  progressCb({ step:'jobs', message:'Creating 50 job records…', pct:15 });
  if (!store.records) store.records = [];
  const jobStatuses = ['Open','Open','Open','Open','Interviewing','Interviewing','On Hold','Filled'];
  const jobRecords  = [];
  for (const tmpl of JOB_TEMPLATES) {
    const id  = uuidv4();
    const rec = {
      id, object_id:jobsObj.id, environment_id:environmentId,
      data:{ job_title:tmpl.title, department:tmpl.dept, location:tmpl.location,
             work_type:tmpl.work_type, employment_type:tmpl.employment_type,
             salary_min:tmpl.salary_min, salary_max:tmpl.salary_max,
             salary_currency:'USD', status:pick(jobStatuses),
             requisition_id:`REQ-${randInt(1000,9999)}`,
             date_opened:isoAgo(randInt(5,180)) },
      created_at:isoAgo(randInt(5,180)), updated_at:isoNow(),
      created_by:'demo_seed', _demo:true,
    };
    store.records.push(rec);
    jobRecords.push(rec);
  }
  saveStore();

  // ── Create 4 workflows ───────────────────────────────────────────────────
  progressCb({ step:'workflows', message:'Creating workflows and stages…', pct:22 });
  if (!store.workflows)      store.workflows      = [];
  if (!store.workflow_steps) store.workflow_steps = [];
  const wfRecords = [];
  for (const wt of WORKFLOW_TEMPLATES) {
    const wfId = uuidv4();
    store.workflows.push({ id:wfId, name:wt.name, description:wt.description,
      workflow_type:'linked_person', object_id:jobsObj.id,
      environment_id:environmentId, is_active:1, created_at:isoAgo(30), updated_at:isoNow(), _demo:true });
    const steps = [];
    wt.steps.forEach((name,i) => {
      const st = { id:uuidv4(), workflow_id:wfId, name, step_order:i+1,
                   automation_type:null, created_at:isoAgo(30), _demo:true };
      store.workflow_steps.push(st);
      steps.push(st);
    });
    wfRecords.push({ wf:store.workflows[store.workflows.length-1], steps });
  }
  saveStore();

  // ── Assign workflows to jobs ─────────────────────────────────────────────
  progressCb({ step:'assign', message:'Assigning workflows to jobs…', pct:26 });
  if (!store.record_workflow_assignments) store.record_workflow_assignments = [];
  const execTitles = ['CTO','CFO','Chief People Officer','VP of Engineering','Managing Director – DCM','Chief Risk Officer'];
  const gradTitles = ['Financial Analyst','Talent Acquisition Partner','QA Engineer','Senior Accountant'];
  const execJobs   = jobRecords.filter(j => execTitles.includes(j.data.job_title));
  const techJobs   = jobRecords.filter(j => j.data.department === 'Engineering' || j.data.department === 'Data');
  const gradJobs   = jobRecords.filter(j => gradTitles.includes(j.data.job_title));
  const assigned   = new Set([...execJobs, ...techJobs.slice(0,10), ...gradJobs].map(j=>j.id));

  const assign = (jobs, wfIdx) => jobs.forEach(job => {
    store.record_workflow_assignments.push({ id:uuidv4(), record_id:job.id,
      workflow_id:wfRecords[wfIdx].wf.id, assignment_type:'linked_person',
      environment_id:environmentId, created_at:isoAgo(15), _demo:true });
  });
  assign(execJobs, 1);
  assign(techJobs.slice(0,10), 2);
  assign(gradJobs, 3);
  assign(jobRecords.filter(j => !assigned.has(j.id)), 0);
  saveStore();

  // ── Create 300 candidates ────────────────────────────────────────────────
  progressCb({ step:'candidates', message:'Creating 300 candidate profiles…', pct:30 });
  const candidateRecords = [];
  for (let i = 0; i < 300; i++) {
    const u      = randomUsers[i];
    const dept   = pick(['Engineering','Engineering','Data','Finance','Finance','HR','Product']);
    const skills = (SKILLS_BY_DEPT[dept] || SKILLS_BY_DEPT.Engineering)
      .sort(()=>Math.random()-0.5).slice(0, randInt(3,7));
    const age    = u.dob?.age || randInt(22,55);
    const id     = uuidv4();
    const rec = {
      id, object_id:peopleObj.id, environment_id:environmentId,
      data:{ first_name:u.name.first, last_name:u.name.last, email:u.email,
             phone:u.phone||'', location:u.location?.city||'London',
             person_type:pick(PTYPES), status:pick(STATUSES), source:pick(SOURCES),
             skills, years_experience:Math.max(1,age-22),
             current_title:`${pick(['Senior','Lead','Principal','Staff','Junior',''])} ${pick(['Engineer','Analyst','Manager','Consultant','Specialist'])}`.trim(),
             rating:randInt(2,5), profile_photo:u.picture?.medium||null, department:dept },
      created_at:isoAgo(randInt(1,365)), updated_at:isoNow(),
      created_by:'demo_seed', _demo:true,
    };
    store.records.push(rec);
    candidateRecords.push(rec);
    if (i % 50 === 0) progressCb({ step:'candidates', message:`Creating candidates… ${i}/300`, pct:30+Math.floor((i/300)*25) });
  }
  saveStore();

  // ── Link candidates to jobs ──────────────────────────────────────────────
  progressCb({ step:'links', message:'Linking candidates to jobs via pipelines…', pct:55 });
  if (!store.people_links) store.people_links = [];
  for (const job of jobRecords) {
    const asgn = store.record_workflow_assignments.find(a => a.record_id === job.id);
    if (!asgn) continue;
    const wfRec = wfRecords.find(w => w.wf.id === asgn.workflow_id);
    if (!wfRec) continue;
    const numC = randInt(2,12);
    const chosen = [...candidateRecords].sort(()=>Math.random()-0.5).slice(0,numC);
    chosen.forEach((c,ci) => {
      const stageIdx = Math.min(wfRec.steps.length-1, Math.floor(ci*wfRec.steps.length/chosen.length));
      const stage    = wfRec.steps[stageIdx];
      store.people_links.push({ id:uuidv4(), person_id:c.id, record_id:job.id,
        workflow_id:wfRec.wf.id, current_stage_id:stage.id, current_stage_name:stage.name,
        environment_id:environmentId, person_data:c.data,
        linked_at:isoAgo(randInt(1,120)), updated_at:isoNow(), _demo:true });
    });
  }
  saveStore();

  // ── Notes ────────────────────────────────────────────────────────────────
  progressCb({ step:'notes', message:'Adding recruiter notes…', pct:68 });
  if (!store.notes) store.notes = [];
  for (const c of candidateRecords) {
    for (let n = 0; n < randInt(1,3); n++) {
      store.notes.push({ id:uuidv4(), record_id:c.id, object_id:peopleObj.id,
        environment_id:environmentId, content:pick(RECRUITER_NOTES),
        author:'Admin User', created_at:isoAgo(randInt(1,90)), _demo:true });
    }
  }
  saveStore();

  // ── Communications ───────────────────────────────────────────────────────
  progressCb({ step:'comms', message:'Adding email communications…', pct:78 });
  if (!store.communications) store.communications = [];
  for (const c of candidateRecords) {
    const link = store.people_links.find(l => l.person_id === c.id);
    const job  = link ? jobRecords.find(j => j.id === link.record_id) : null;
    for (let n = 0; n < randInt(1,4); n++) {
      const dir = n === 0 ? 'inbound' : pick(['outbound','outbound','inbound']);
      store.communications.push({ id:uuidv4(), record_id:c.id, object_id:peopleObj.id,
        environment_id:environmentId, type:pick(['email','email','email','sms']), direction:dir,
        subject:fmt(pick(EMAIL_SUBJECTS),{job_title:job?.data.job_title||'the role'}),
        body:pick(EMAIL_BODIES), status:'delivered',
        from_address:dir==='inbound'?c.data.email:'recruiter@talentos.io',
        to_address:dir==='inbound'?'recruiter@talentos.io':c.data.email,
        sent_at:isoAgo(randInt(1,120)), created_at:isoAgo(randInt(1,120)), _demo:true });
    }
  }
  saveStore();

  progressCb({ step:'done', message:'Demo data ready!', pct:100 });
  return {
    jobs: jobRecords.length, candidates: candidateRecords.length,
    workflows: wfRecords.length,
    links: store.people_links.filter(l=>l._demo&&l.environment_id===environmentId).length,
    notes: store.notes.filter(n=>n._demo&&n.environment_id===environmentId).length,
    communications: store.communications.filter(c=>c._demo&&c.environment_id===environmentId).length,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get('/environments', (req, res) => {
  const { getStore: _getStore, tenantStorage, listTenants, loadTenantStore } = require('../db/init');

  // Master store first
  const masterStore = _getStore();
  const allClients  = masterStore.clients || [];
  const allClientEnvs = masterStore.client_environments || [];

  // Map: env_id → result entry (deduplicate — tenant store wins over master for same env_id)
  const envMap = new Map();

  const addEnvsFromStore = (store, tenantSlug) => {
    const envs = store.environments || [];
    for (const e of envs) {
      const clientEnv = allClientEnvs.find(ce => ce.id === e.id);
      const clientId  = clientEnv?.client_id || e.client_id || null;
      const client    = clientId ? allClients.find(c => c.id === clientId) : null;
      const entry = {
        id:           e.id,
        name:         e.name,
        client_name:  client?.name || null,
        tenant_slug:  tenantSlug,   // null = master store
        is_default:   e.is_default,
        record_count: (store.records || []).filter(r => r.environment_id === e.id).length,
        demo_count:   (store.records || []).filter(r => r.environment_id === e.id && r._demo).length,
      };
      // Tenant store entry always wins (it's the authoritative store for that client)
      if (!envMap.has(e.id) || tenantSlug !== null) {
        envMap.set(e.id, entry);
      }
    }
  };

  addEnvsFromStore(masterStore, null);

  // Scan each provisioned tenant store
  const tenants = listTenants ? listTenants() : [];
  for (const slug of tenants) {
    try {
      const tenantStore = loadTenantStore(slug);
      if (tenantStore) addEnvsFromStore(tenantStore, slug);
    } catch { /* skip broken tenant stores */ }
  }

  const result = Array.from(envMap.values());

  // Sort: master Production first, then by client name + env name
  result.sort((a, b) => {
    if (!a.tenant_slug && a.name === 'Production') return -1;
    if (!b.tenant_slug && b.name === 'Production') return 1;
    const aLabel = a.client_name || a.name;
    const bLabel = b.client_name || b.name;
    return aLabel.localeCompare(bLabel);
  });

  res.json(result);
});

router.get('/status', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  const demoRecs  = (store.records||[]).filter(r=>r._demo&&r.environment_id===environment_id);
  const demoLinks = (store.people_links||[]).filter(l=>l._demo&&l.environment_id===environment_id);
  res.json({
    has_demo_data: demoRecs.length > 0,
    counts:{
      records:demoRecs.length,
      links:demoLinks.length,
      notes:(store.notes||[]).filter(n=>n._demo&&n.environment_id===environment_id).length,
      communications:(store.communications||[]).filter(c=>c._demo&&c.environment_id===environment_id).length,
    },
  });
});

router.post('/seed', async (req, res) => {
  const { environment_id, clear_first=false } = req.body;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.setHeader('X-Accel-Buffering','no');

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const results = await runSeed({ environmentId:environment_id, clearFirst:clear_first, progressCb:send });
    send({ step:'complete', results });
  } catch (err) {
    send({ step:'error', message:err.message });
  }
  res.end();
});

router.delete('/clear', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error:'environment_id required' });
  const store = getStore();
  let removed = 0;
  ['records','workflows','workflow_steps','record_workflow_assignments',
   'people_links','notes','communications'].forEach(table => {
    if (store[table]) {
      const before = store[table].length;
      store[table] = store[table].filter(r => !(r._demo && r.environment_id === environment_id));
      removed += before - store[table].length;
    }
  });
  saveStore();
  res.json({ removed });
});

module.exports = router;
