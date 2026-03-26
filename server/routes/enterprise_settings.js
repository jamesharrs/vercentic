// server/routes/enterprise_settings.js
const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
function ts() { return new Date().toISOString(); }

function migrateEnterpriseSettings() {
  const store = getStore();
  let changed = false;
  ['skills','competencies','job_levels','office_locations','comp_bands','skill_relationships'].forEach(t => {
    if (!store[t]) { store[t] = []; changed = true; }
  });
  if (changed) saveStore();
}

// ── SKILLS ────────────────────────────────────────────────────────────────────
router.get('/skills', (req, res) => {
  const { environment_id } = req.query;
  try {
    res.json(query('skills', s => !environment_id || s.environment_id === environment_id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/skills/categories', (req, res) => {
  const { environment_id } = req.query;
  try {
    const skills = query('skills', s => !environment_id || s.environment_id === environment_id);
    const cats = {};
    skills.forEach(s => {
      if (!cats[s.category]) cats[s.category] = new Set();
      if (s.subcategory) cats[s.category].add(s.subcategory);
    });
    res.json(Object.entries(cats).map(([category, subs]) => ({ category, subcategories: [...subs].sort() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/skills', (req, res) => {
  const { name, category, subcategory, description, aliases = [], proficiency_levels = ['Beginner','Intermediate','Advanced','Expert'], environment_id } = req.body;
  if (!name || !category || !environment_id) return res.status(400).json({ error: 'name, category, environment_id required' });
  try {
    res.json(insert('skills', { id: uuidv4(), name, category, subcategory: subcategory || null, description: description || null, aliases, proficiency_levels, environment_id, is_active: true, created_at: ts(), updated_at: ts() }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/skills/:id', (req, res) => {
  try {
    const s = update('skills', req.params.id, { ...req.body, updated_at: ts() });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/skills/:id', (req, res) => {
  try { remove('skills', s => s.id === req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/skills/seed', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const existing = query('skills', s => s.environment_id === environment_id);
    if (existing.length > 0) return res.status(409).json({ error: 'Already seeded', count: existing.length });
    const seed = buildSkillsSeed(environment_id);
    seed.forEach(s => insert('skills', s));
    res.json({ seeded: seed.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── COMPETENCIES ──────────────────────────────────────────────────────────────
router.get('/competencies', (req, res) => {
  const { environment_id } = req.query;
  try { res.json(query('competencies', c => !environment_id || c.environment_id === environment_id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/competencies', (req, res) => {
  const { name, description, category, levels = [], environment_id } = req.body;
  if (!name || !environment_id) return res.status(400).json({ error: 'name, environment_id required' });
  try {
    res.json(insert('competencies', { id: uuidv4(), name, description: description||null, category: category||'General', levels: levels.length ? levels : [{ level:1, label:'Developing', description:'' },{ level:2, label:'Capable', description:'' },{ level:3, label:'Proficient', description:'' },{ level:4, label:'Expert', description:'' },{ level:5, label:'Mastery', description:'' }], environment_id, created_at: ts(), updated_at: ts() }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/competencies/:id', (req, res) => {
  try { const c = update('competencies', req.params.id, { ...req.body, updated_at: ts() }); if (!c) return res.status(404).json({ error: 'Not found' }); res.json(c); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/competencies/:id', (req, res) => {
  try { remove('competencies', c => c.id === req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── JOB LEVELS ────────────────────────────────────────────────────────────────
router.get('/job-levels', (req, res) => {
  const { environment_id } = req.query;
  try { res.json(query('job_levels', l => !environment_id || l.environment_id === environment_id).sort((a,b) => a.rank - b.rank)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/job-levels', (req, res) => {
  const { code, name, description, rank, environment_id } = req.body;
  if (!code || !name || !environment_id) return res.status(400).json({ error: 'code, name, environment_id required' });
  try { res.json(insert('job_levels', { id: uuidv4(), code, name, description: description||null, rank: rank??0, environment_id, created_at: ts(), updated_at: ts() })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/job-levels/:id', (req, res) => {
  try { const l = update('job_levels', req.params.id, { ...req.body, updated_at: ts() }); if (!l) return res.status(404).json({ error: 'Not found' }); res.json(l); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/job-levels/:id', (req, res) => {
  try { remove('job_levels', l => l.id === req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/job-levels/seed', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const existing = query('job_levels', l => l.environment_id === environment_id);
  if (existing.length > 0) return res.status(409).json({ error: 'Already seeded' });
  [{ code:'IC1', name:'Associate', rank:1 },{ code:'IC2', name:'Junior', rank:2 },{ code:'IC3', name:'Mid-level', rank:3 },{ code:'IC4', name:'Senior', rank:4 },{ code:'IC5', name:'Staff / Lead', rank:5 },{ code:'IC6', name:'Principal', rank:6 },{ code:'M1', name:'Manager', rank:7 },{ code:'M2', name:'Senior Manager', rank:8 },{ code:'M3', name:'Director', rank:9 },{ code:'M4', name:'Senior Director', rank:10 },{ code:'E1', name:'VP', rank:11 },{ code:'E2', name:'SVP / EVP', rank:12 },{ code:'E3', name:'C-Level', rank:13 }].forEach(d => insert('job_levels', { id: uuidv4(), ...d, description: null, environment_id, created_at: ts(), updated_at: ts() }));
  res.json({ seeded: 13 });
});

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
router.get('/locations', (req, res) => {
  const { environment_id } = req.query;
  try { res.json(query('office_locations', l => !environment_id || l.environment_id === environment_id).sort((a,b) => a.name.localeCompare(b.name))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/locations', (req, res) => {
  const { name, city, country, region, timezone, is_remote = false, address, environment_id } = req.body;
  if (!name || !environment_id) return res.status(400).json({ error: 'name, environment_id required' });
  try { res.json(insert('office_locations', { id: uuidv4(), name, city: city||null, country: country||null, region: region||null, timezone: timezone||'UTC', is_remote, address: address||null, environment_id, created_at: ts(), updated_at: ts() })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/locations/:id', (req, res) => {
  try { const l = update('office_locations', req.params.id, { ...req.body, updated_at: ts() }); if (!l) return res.status(404).json({ error: 'Not found' }); res.json(l); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/locations/:id', (req, res) => {
  try { remove('office_locations', l => l.id === req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── COMP BANDS ────────────────────────────────────────────────────────────────
router.get('/comp-bands', (req, res) => {
  const { environment_id, job_level_id } = req.query;
  try {
    let bands = query('comp_bands', b => !environment_id || b.environment_id === environment_id);
    if (job_level_id) bands = bands.filter(b => b.job_level_id === job_level_id);
    res.json(bands);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/comp-bands', (req, res) => {
  const { job_level_id, location_id, currency = 'USD', min_salary, mid_salary, max_salary, bonus_target_pct = 0, effective_date, environment_id } = req.body;
  if (!job_level_id || !environment_id || min_salary == null || max_salary == null) return res.status(400).json({ error: 'job_level_id, min_salary, max_salary, environment_id required' });
  try { res.json(insert('comp_bands', { id: uuidv4(), job_level_id, location_id: location_id||null, currency, min_salary, mid_salary: mid_salary||Math.round((min_salary+max_salary)/2), max_salary, bonus_target_pct, effective_date: effective_date||ts().slice(0,10), environment_id, created_at: ts(), updated_at: ts() })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/comp-bands/:id', (req, res) => {
  try { const b = update('comp_bands', req.params.id, { ...req.body, updated_at: ts() }); if (!b) return res.status(404).json({ error: 'Not found' }); res.json(b); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/comp-bands/:id', (req, res) => {
  try { remove('comp_bands', b => b.id === req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SKILLS SEED ───────────────────────────────────────────────────────────────
function buildSkillsSeed(environment_id) {
  const skills = [];
  const add = (category, subcategory, name, aliases = []) => skills.push({ id: uuidv4(), name, category, subcategory, description: null, aliases, proficiency_levels: ['Beginner','Intermediate','Advanced','Expert'], environment_id, is_active: true, created_at: ts(), updated_at: ts() });
  // Technology
  add('Technology','Frontend Development','React',['ReactJS','React.js']); add('Technology','Frontend Development','Vue.js',['Vue','VueJS']); add('Technology','Frontend Development','Angular',['AngularJS']); add('Technology','Frontend Development','TypeScript',['TS']); add('Technology','Frontend Development','JavaScript',['JS','ES6']); add('Technology','Frontend Development','HTML / CSS',['HTML5','CSS3']); add('Technology','Frontend Development','Next.js',['NextJS']); add('Technology','Frontend Development','Tailwind CSS');
  add('Technology','Backend Development','Node.js',['NodeJS']); add('Technology','Backend Development','Python'); add('Technology','Backend Development','Java'); add('Technology','Backend Development','C#',['.NET']); add('Technology','Backend Development','Go',['Golang']); add('Technology','Backend Development','Rust'); add('Technology','Backend Development','Ruby',['Ruby on Rails']); add('Technology','Backend Development','PHP',['Laravel']); add('Technology','Backend Development','GraphQL'); add('Technology','Backend Development','REST API Design');
  add('Technology','Data & AI','Machine Learning',['ML']); add('Technology','Data & AI','Deep Learning',['Neural Networks']); add('Technology','Data & AI','LLM / Generative AI',['GPT','LLM','GenAI']); add('Technology','Data & AI','SQL',['PostgreSQL','MySQL']); add('Technology','Data & AI','Python for Data Science',['Pandas','NumPy']); add('Technology','Data & AI','Data Visualisation',['Tableau','Power BI']); add('Technology','Data & AI','Big Data',['Spark','Hadoop']); add('Technology','Data & AI','NLP',['Natural Language Processing']);
  add('Technology','Cloud & DevOps','AWS',['Amazon Web Services']); add('Technology','Cloud & DevOps','Azure',['Microsoft Azure']); add('Technology','Cloud & DevOps','Google Cloud',['GCP']); add('Technology','Cloud & DevOps','Docker',['Containerisation']); add('Technology','Cloud & DevOps','Kubernetes',['K8s']); add('Technology','Cloud & DevOps','CI/CD',['GitHub Actions','Jenkins']); add('Technology','Cloud & DevOps','Terraform',['IaC']); add('Technology','Cloud & DevOps','Linux / Unix');
  add('Technology','Mobile Development','iOS / Swift',['Swift']); add('Technology','Mobile Development','Android / Kotlin',['Kotlin']); add('Technology','Mobile Development','React Native'); add('Technology','Mobile Development','Flutter');
  add('Technology','Cybersecurity','Penetration Testing',['Pen Testing']); add('Technology','Cybersecurity','SIEM'); add('Technology','Cybersecurity','Zero Trust Security'); add('Technology','Cybersecurity','Compliance & GRC',['SOC 2','ISO 27001']);
  // Business
  add('Business','Finance','Financial Modelling'); add('Business','Finance','Corporate Finance',['M&A']); add('Business','Finance','Financial Reporting',['IFRS','GAAP']); add('Business','Finance','Budgeting & Forecasting',['FP&A']); add('Business','Finance','Treasury Management'); add('Business','Finance','Tax',['VAT']); add('Business','Finance','Audit',['Internal Audit']); add('Business','Finance','Private Equity',['PE','VC']);
  add('Business','Sales','B2B Sales',['Enterprise Sales']); add('Business','Sales','SaaS Sales'); add('Business','Sales','Account Management'); add('Business','Sales','Business Development',['BD']); add('Business','Sales','CRM',['Salesforce','HubSpot']); add('Business','Sales','Sales Operations',['RevOps']);
  add('Business','Marketing','Digital Marketing'); add('Business','Marketing','SEO / SEM'); add('Business','Marketing','Content Marketing'); add('Business','Marketing','Brand Management'); add('Business','Marketing','Performance Marketing',['Growth Marketing']); add('Business','Marketing','Product Marketing'); add('Business','Marketing','Social Media Marketing');
  add('Business','Human Resources','Talent Acquisition',['Recruiting']); add('Business','Human Resources','HR Business Partnering',['HRBP']); add('Business','Human Resources','Learning & Development',["L&D"]); add('Business','Human Resources','Compensation & Benefits',['Total Rewards']); add('Business','Human Resources','Employee Relations'); add('Business','Human Resources','HR Operations',['HRIS']); add('Business','Human Resources','Organisational Design',['OD']);
  add('Business','Strategy','Strategy Consulting'); add('Business','Strategy','Market Research & Analysis'); add('Business','Strategy','Product Strategy'); add('Business','Strategy','Corporate Strategy'); add('Business','Strategy','M&A / Due Diligence');
  add('Business','Operations','Project Management',['PMP','Agile PM']); add('Business','Operations','Agile / Scrum',['Scrum Master']); add('Business','Operations','Process Improvement',['Lean','Six Sigma']); add('Business','Operations','Supply Chain Management',['SCM']); add('Business','Operations','Procurement'); add('Business','Operations','Customer Success',['CX']);
  // Design
  add('Design','UX / UI Design','Product Design',['UI Design','UX Design']); add('Design','UX / UI Design','User Research',['UX Research']); add('Design','UX / UI Design','Figma',['Sketch']); add('Design','UX / UI Design','Design Systems'); add('Design','UX / UI Design','Prototyping',['Wireframing']);
  add('Design','Graphic Design','Brand Identity Design'); add('Design','Graphic Design','Illustration'); add('Design','Graphic Design','Adobe Creative Suite',['Photoshop','Illustrator']); add('Design','Graphic Design','Motion Graphics',['After Effects']);
  add('Design','Video Production','Video Editing',['Premiere Pro']); add('Design','Video Production','Cinematography');
  // Soft Skills
  add('Soft Skills','Leadership','People Management',['Team Management']); add('Soft Skills','Leadership','Executive Presence',['Stakeholder Management']); add('Soft Skills','Leadership','Coaching & Mentoring'); add('Soft Skills','Leadership','Strategic Thinking'); add('Soft Skills','Leadership','Decision Making');
  add('Soft Skills','Communication','Public Speaking',['Presentation Skills']); add('Soft Skills','Communication','Written Communication'); add('Soft Skills','Communication','Negotiation'); add('Soft Skills','Communication','Active Listening');
  add('Soft Skills','Problem Solving','Critical Thinking'); add('Soft Skills','Problem Solving','Analytical Thinking'); add('Soft Skills','Problem Solving','Creative Problem Solving');
  add('Soft Skills','Collaboration','Cross-functional Collaboration'); add('Soft Skills','Collaboration','Conflict Resolution'); add('Soft Skills','Collaboration','Adaptability'); add('Soft Skills','Collaboration','Emotional Intelligence',['EQ','EI']);
  // Languages
  add('Languages','Spoken Languages','English'); add('Languages','Spoken Languages','Arabic',['Arabic (Gulf)']); add('Languages','Spoken Languages','French'); add('Languages','Spoken Languages','German'); add('Languages','Spoken Languages','Spanish'); add('Languages','Spoken Languages','Mandarin Chinese',['Mandarin']); add('Languages','Spoken Languages','Hindi'); add('Languages','Spoken Languages','Urdu'); add('Languages','Spoken Languages','Portuguese'); add('Languages','Spoken Languages','Italian'); add('Languages','Spoken Languages','Japanese'); add('Languages','Spoken Languages','Korean');
  // Certifications
  add('Certifications','Technology','AWS Certified Solutions Architect'); add('Certifications','Technology','Google Cloud Professional'); add('Certifications','Technology','Certified Kubernetes Administrator',['CKA']); add('Certifications','Technology','CompTIA Security+'); add('Certifications','Technology','CISSP');
  add('Certifications','Project Management','PMP',['Project Management Professional']); add('Certifications','Project Management','PRINCE2'); add('Certifications','Project Management','Certified Scrum Master',['CSM']);
  add('Certifications','Finance','CFA',['Chartered Financial Analyst']); add('Certifications','Finance','CPA'); add('Certifications','Finance','ACCA');
  add('Certifications','HR','SHRM-CP'); add('Certifications','HR','CIPD Level 5',['CIPD Level 7']); add('Certifications','HR','PHR / SPHR');
  return skills;
}

module.exports = router;
module.exports.migrate = migrateEnterpriseSettings;
