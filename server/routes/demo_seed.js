/**
 * Vercentic Demo Data Seeder — v3
 * 300 candidates with real photos, 50 jobs with full data model,
 * 4 workflows, pipeline links, notes, and communications.
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, saveStoreNow, storeCache, tenantStorage, listTenants, loadTenantStore } = require('../db/init');

// ── helpers ────────────────────────────────────────────────────────────────
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const rand    = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const picks   = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const isoNow  = () => new Date().toISOString();
const isoAgo  = n  => new Date(Date.now() - n * 86400000).toISOString();
const dateAgo = n  => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const dateAhead = n => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

// ── People reference data ───────────────────────────────────────────────────
const FIRST_NAMES = ['Sarah','Ahmed','Priya','James','Fatima','Marcus','Aisha','Liam','Nour','David','Emma','Khalid','Sofia','Omar','Yuki','Isabella','Mohammed','Charlotte','Ravi','Amina','Lucas','Zara','Benjamin','Leila','Daniel','Hana','Samuel','Mia','Ali','Clara','Noah','Yasmin','Ethan','Sana','Jack','Layla','Oliver','Nadia','Hugo','Carmen','Mei','Tariq','Simone','Finn','Dina','Erik','Mariam','Callum','Zainab','Felix'];
const LAST_NAMES  = ['Al-Rashidi','Chen','Patel','Harrison','Al-Mansouri','Johnson','Ibrahim','Williams','Hassan','Thompson','Kowalski','Al-Farsi','Rodriguez','Kim','Nakamura','Mueller','Singh','Laurent','Okonkwo','Martinez','Andersen','Gupta','Fernandez','Ali','Johansson','Nakashima','Dubois','Svensson','Petrov','Costa','Reyes','Park','Lindqvist','Moreau','Tanaka','Al-Khalifa','Nwosu','Andrade','Eriksson','Chowdhury'];
const LOCATIONS   = ['Dubai, UAE','Abu Dhabi, UAE','Riyadh, Saudi Arabia','Doha, Qatar','London, UK','New York, USA','Singapore','Mumbai, India','Toronto, Canada','Sydney, Australia','Berlin, Germany','Amsterdam, Netherlands','Paris, France','Cairo, Egypt','Nairobi, Kenya','Kuala Lumpur, Malaysia','Hong Kong','Dublin, Ireland','Zurich, Switzerland','Melbourne, Australia'];
const TITLES      = ['Senior Software Engineer','Product Manager','Data Scientist','UX Designer','Financial Analyst','Marketing Manager','Sales Director','HR Business Partner','DevOps Engineer','Business Development Manager','Customer Success Manager','Legal Counsel','Operations Manager','Brand Manager','Talent Acquisition Specialist','Cloud Architect','AI/ML Engineer','Scrum Master','CFO','Chief of Staff','Frontend Engineer','Backend Engineer','Engineering Manager','VP of Engineering','Data Engineer','Compliance Officer','Risk Manager','Investment Analyst','Recruitment Manager','Digital Marketing Manager'];
const COMPANIES   = ['Google','Microsoft','Amazon','HSBC','McKinsey & Co','Emirates NBD','Accenture','Deloitte','PwC','KPMG','Salesforce','Meta','Apple','SAP','Oracle','Mastercard','Visa','Goldman Sachs','JP Morgan','Citibank','Noon','Careem','Property Finder','Fetchr','Talabat','Namshi','Revolut','Wise','Stripe','Adyen','G42','e&','Du','Etisalat','Mashreq','FAB','ENBD'];
const SKILLS_POOL = ['Python','JavaScript','TypeScript','React','Node.js','SQL','AWS','Azure','GCP','Docker','Kubernetes','Java','Go','C++','Machine Learning','Data Analysis','Project Management','Agile','Scrum','Product Strategy','UX Research','Figma','Adobe Suite','Financial Modelling','CRM','Salesforce','PowerBI','Tableau','Excel','Communication','Leadership','Negotiation','Stakeholder Management','Strategic Planning','Digital Marketing','SEO/SEM','Content Strategy','Risk Management','Compliance','M&A','Terraform','CI/CD','PostgreSQL','Redis','Spark','Airflow','dbt','Snowflake','React Native','Swift','Kotlin','GraphQL','REST APIs','Microservices','System Design'];
const LANGS       = ['English','Arabic','French','Spanish','German','Mandarin','Hindi','Urdu','Portuguese','Dutch','Japanese','Korean','Italian','Russian','Tagalog'];
const UNIVERSITIES = ['MIT','Stanford University','Harvard University','University of Oxford','University of Cambridge','INSEAD','London Business School','IE Business School','American University of Beirut','University of Dubai','IIT Delhi','National University of Singapore','University of Toronto','University of Sydney','TU Munich','HEC Paris','ESSEC','McGill University','University of Melbourne','Khalifa University'];
const SOURCES     = ['LinkedIn','Direct Application','Referral','Job Board','Agency','Proactive Outreach','Career Site','Event','University Recruitment','Internal Mobility'];
const STATUSES_P  = ['Active','Active','Active','Passive','Passive','Not Looking','Placed','Archived'];
const PTYPES      = ['Candidate','Candidate','Candidate','Candidate','Contact','Employee'];
const NOTICES     = ['Immediate','1 month','2 months','3 months','4 months','6 months'];
const WORK_AUTH   = ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship'];
const WORK_PREFS  = ['Hybrid','Remote','On-site','Flexible'];
const GENDERS     = ['Male','Female','Prefer not to say'];

const RECRUITER_NOTES = [
  'Excellent communicator, very structured answers. Strong cultural fit.',
  'Strong technical background but light on leadership experience.',
  'Salary expectations slightly above band — flagged to hiring manager.',
  'Currently on notice period, available in 4 weeks.',
  'Referenced by a current employee — warm intro.',
  'Very impressive portfolio, recommend fast-tracking to technical round.',
  'Needs visa sponsorship — check with HR before progressing.',
  'Outstanding presentation skills. Panel unanimously positive.',
  'Counter-offered by current employer, currently considering options.',
  'Start date flexibility is a concern — needs to be negotiated.',
  'Excellent references from previous manager at Google.',
  'Met at GITEX conference — proactively reached out afterwards.',
  'Second career change but highly motivated, worth progressing.',
  'Technical assessment score: 87/100. Top 10% of candidates.',
  'Hiring manager is very keen — push to accelerate timeline.',
  'On gardening leave, can start immediately.',
  'Overqualified for this role — worth discussing scope expansion.',
  'Candidate has competing offer from competitor — needs decision within 5 days.',
  'Strong LinkedIn presence, well regarded in the industry.',
  'Video interview recording shared in attachments — worth watching.',
];

const EMAIL_SUBJECTS = [
  'Application Confirmation – {title}',
  'Invitation to Interview – {title}',
  'Thank you for your application to {title}',
  'Next Steps: Technical Assessment',
  'Following up on your application',
  'We\'d love to learn more about you',
];

const EMAIL_BODIES = [
  'Thank you for your application. We have reviewed your profile and would love to schedule an initial call to learn more about you.',
  'Following our initial conversation, I am delighted to invite you to the next stage of our process for the {title} role.',
  'We were impressed by your background and experience. We would like to invite you to complete a technical assessment.',
  'After careful consideration, we would like to progress your application to the final interview stage.',
  'I wanted to follow up on your recent application. Could you let me know if you are still interested in exploring this opportunity?',
  'I came across your profile and thought you would be a great fit for a role we are hiring for. Would you be open to a conversation?',
];

// ── Jobs reference data ─────────────────────────────────────────────────────
const HIRING_MANAGERS = ['Sarah Mitchell','James Harper','David Park','Emma Thompson','Omar Hassan','Nadia Okonkwo','Chen Wei','Yasmin Khalil','Ryan O\'Brien','Lucas Santos','Fatima Al-Zahra','Ahmed Al-Rashid','Amira Benali','Marcus Johnson','Priya Patel'];

const JOB_DESCRIPTIONS = {
  Engineering: 'Lead the design, development, and delivery of scalable software solutions. Work closely with product and design teams to build features that delight our users. Champion engineering best practices across the team and contribute to technical architecture decisions.',
  Data:        'Build and maintain robust data pipelines, models, and analytical systems. Partner with business stakeholders to translate requirements into data solutions. Drive a data-informed culture and ensure high data quality across the organisation.',
  Finance:     'Support the finance function with analysis, modelling, and reporting. Partner with business leaders on budgeting, forecasting, and strategic planning. Ensure accuracy and compliance across all financial outputs.',
  HR:          'Act as a trusted advisor to business leaders on all people-related matters. Drive talent acquisition, development, and retention strategies. Champion a positive culture and ensure our people practices are best-in-class.',
  Product:     'Own the product roadmap for a key area of the platform. Work with engineering, design, and data to discover, define, and deliver impactful features. Drive OKRs and represent the voice of the customer internally.',
  Sales:       'Own and grow a portfolio of enterprise accounts. Build relationships with senior stakeholders and understand their business challenges. Drive revenue through new business development and expansion within existing accounts.',
  Marketing:   'Develop and execute marketing strategies that drive brand awareness and pipeline generation. Own digital channels and work closely with sales to align on go-to-market initiatives.',
  Design:      'Create intuitive, beautiful product experiences that solve real user problems. Lead user research, define interaction patterns, and work closely with engineers to deliver high-quality designs.',
  Operations:  'Drive operational excellence across the business. Own key processes, identify inefficiencies, and lead cross-functional initiatives to scale the organisation effectively.',
  Legal:       'Provide expert legal counsel across a range of commercial, regulatory, and employment matters. Draft and negotiate contracts, manage risk, and ensure the organisation operates within applicable laws and regulations.',
  'Customer Success': 'Build and maintain strong relationships with our enterprise customers. Drive adoption, identify expansion opportunities, and ensure customers achieve measurable value from our platform.',
};

const JOB_TEMPLATES = [
  // Engineering
  { title:'Senior Software Engineer',      dept:'Engineering', salary_min:120000, salary_max:180000, exp:5,  skills:['Python','JavaScript','AWS','Docker','SQL'],                         work_type:'Hybrid',   priority:'High',     reason:'Expansion'   },
  { title:'Staff Engineer',                dept:'Engineering', salary_min:160000, salary_max:240000, exp:8,  skills:['Go','Kubernetes','System Design','AWS','Python'],                   work_type:'Hybrid',   priority:'Critical', reason:'New Role'    },
  { title:'Frontend Engineer',             dept:'Engineering', salary_min:100000, salary_max:150000, exp:3,  skills:['React','TypeScript','CSS','Figma','JavaScript'],                    work_type:'Remote',   priority:'Medium',   reason:'Backfill'    },
  { title:'Backend Engineer',              dept:'Engineering', salary_min:110000, salary_max:165000, exp:4,  skills:['Python','Java','PostgreSQL','AWS','Docker'],                         work_type:'Hybrid',   priority:'High',     reason:'Expansion'   },
  { title:'DevOps Engineer',               dept:'Engineering', salary_min:115000, salary_max:170000, exp:4,  skills:['AWS','Kubernetes','Terraform','Docker','CI/CD'],                    work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Engineering Manager',           dept:'Engineering', salary_min:160000, salary_max:230000, exp:7,  skills:['Leadership','Python','Agile','System Design','Stakeholder Management'], work_type:'Hybrid', priority:'High',   reason:'New Role'    },
  { title:'VP of Engineering',             dept:'Engineering', salary_min:220000, salary_max:320000, exp:12, skills:['Leadership','Strategic Planning','System Design','Stakeholder Management'], work_type:'Hybrid', priority:'Critical', reason:'New Role' },
  { title:'Principal Engineer',            dept:'Engineering', salary_min:190000, salary_max:270000, exp:10, skills:['System Design','Go','Python','Leadership','AWS'],                   work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Cloud Architect',               dept:'Engineering', salary_min:170000, salary_max:250000, exp:8,  skills:['AWS','Azure','GCP','Terraform','Architecture'],                     work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Security Engineer',             dept:'Engineering', salary_min:130000, salary_max:190000, exp:5,  skills:['Security','AWS','Compliance','Python','Penetration Testing'],       work_type:'Hybrid',   priority:'Medium',   reason:'New Role'    },
  // Data
  { title:'AI/ML Engineer',                dept:'Data',        salary_min:140000, salary_max:210000, exp:5,  skills:['Python','Machine Learning','PyTorch','SQL','AWS'],                  work_type:'Hybrid',   priority:'Critical', reason:'New Role'    },
  { title:'Data Scientist',                dept:'Data',        salary_min:110000, salary_max:165000, exp:3,  skills:['Python','Machine Learning','SQL','Tableau','R'],                    work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Data Engineer',                 dept:'Data',        salary_min:105000, salary_max:155000, exp:3,  skills:['Python','SQL','Spark','AWS','Airflow'],                             work_type:'Hybrid',   priority:'Medium',   reason:'Expansion'   },
  { title:'Head of Data',                  dept:'Data',        salary_min:170000, salary_max:240000, exp:8,  skills:['Leadership','Python','Machine Learning','Strategic Planning'],      work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Analytics Engineer',            dept:'Data',        salary_min:100000, salary_max:145000, exp:3,  skills:['SQL','dbt','Snowflake','Python','Tableau'],                         work_type:'Remote',   priority:'Medium',   reason:'New Role'    },
  // Product
  { title:'Product Manager',               dept:'Product',     salary_min:120000, salary_max:175000, exp:4,  skills:['Product Strategy','Agile','Scrum','Data Analysis','Stakeholder Management'], work_type:'Hybrid', priority:'High', reason:'New Role' },
  { title:'Senior Product Manager',        dept:'Product',     salary_min:150000, salary_max:210000, exp:6,  skills:['Product Strategy','Leadership','Agile','UX Research','SQL'],        work_type:'Hybrid',   priority:'High',     reason:'Backfill'    },
  { title:'Director of Product',           dept:'Product',     salary_min:200000, salary_max:280000, exp:9,  skills:['Leadership','Product Strategy','Strategic Planning','Stakeholder Management'], work_type:'Hybrid', priority:'Critical', reason:'New Role' },
  // Design
  { title:'UX Designer',                   dept:'Design',      salary_min:90000,  salary_max:135000, exp:3,  skills:['Figma','UX Research','Adobe Suite','Prototyping'],                 work_type:'Hybrid',   priority:'Medium',   reason:'New Role'    },
  { title:'Product Designer',              dept:'Design',      salary_min:100000, salary_max:150000, exp:4,  skills:['Figma','UX Research','Design Systems','Adobe Suite'],               work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  // Finance
  { title:'Financial Analyst',             dept:'Finance',     salary_min:70000,  salary_max:110000, exp:2,  skills:['Financial Modelling','Excel','PowerBI','SQL'],                      work_type:'On-site',  priority:'Medium',   reason:'Backfill'    },
  { title:'FP&A Manager',                  dept:'Finance',     salary_min:120000, salary_max:175000, exp:6,  skills:['Financial Modelling','Excel','PowerBI','Leadership'],               work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'VP of Finance',                 dept:'Finance',     salary_min:200000, salary_max:300000, exp:10, skills:['M&A','Financial Modelling','Leadership','Strategic Planning'],      work_type:'Hybrid',   priority:'Critical', reason:'New Role'    },
  { title:'Investment Analyst',            dept:'Finance',     salary_min:85000,  salary_max:130000, exp:2,  skills:['Financial Modelling','M&A','Excel','Bloomberg'],                   work_type:'On-site',  priority:'Medium',   reason:'New Role'    },
  { title:'Risk Manager',                  dept:'Finance',     salary_min:115000, salary_max:165000, exp:5,  skills:['Risk Management','Compliance','Financial Modelling','SQL'],        work_type:'Hybrid',   priority:'Medium',   reason:'New Role'    },
  // Sales
  { title:'Sales Director',                dept:'Sales',       salary_min:150000, salary_max:230000, exp:8,  skills:['Salesforce','CRM','Negotiation','Leadership'],                      work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  { title:'Account Executive',             dept:'Sales',       salary_min:80000,  salary_max:130000, exp:3,  skills:['CRM','Salesforce','Negotiation','Communication'],                  work_type:'Hybrid',   priority:'Medium',   reason:'Expansion'   },
  { title:'Business Development Manager',  dept:'Sales',       salary_min:100000, salary_max:160000, exp:5,  skills:['Negotiation','Strategic Planning','CRM','Communication'],           work_type:'Hybrid',   priority:'High',     reason:'New Role'    },
  // Marketing
  { title:'Marketing Manager',             dept:'Marketing',   salary_min:90000,  salary_max:140000, exp:4,  skills:['Digital Marketing','SEO/SEM','Content Strategy','Salesforce'],    work_type:'Hybrid',   priority:'Medium',   reason:'Backfill'    },
  { title:'Head of Marketing',             dept:'Marketing',   salary_min:150000, salary_max:220000, exp:8,  skills:['Leadership','Digital Marketing','Strategic Planning','Content Strategy'], work_type:'Hybrid', priority:'High', reason:'New Role' },
  // HR
  { title:'Head of Talent Acquisition',    dept:'HR',          salary_min:120000, salary_max:180000, exp:6,  skills:['Talent Acquisition Specialist','Leadership','Stakeholder Management'], work_type:'Hybrid', priority:'High', reason:'New Role' },
  { title:'HR Business Partner',           dept:'HR',          salary_min:90000,  salary_max:135000, exp:4,  skills:['Communication','Stakeholder Management','Leadership'],               work_type:'Hybrid',  priority:'Medium',   reason:'Replacement' },
  { title:'Senior Recruiter',              dept:'HR',          salary_min:75000,  salary_max:115000, exp:3,  skills:['Talent Acquisition Specialist','LinkedIn Recruiter','Communication'], work_type:'Hybrid', priority:'Medium', reason:'Expansion'   },
  // Operations & Other
  { title:'Chief of Staff',                dept:'Operations',  salary_min:140000, salary_max:200000, exp:6,  skills:['Strategic Planning','Communication','Leadership','Project Management'], work_type:'Hybrid', priority:'High', reason:'New Role'   },
  { title:'Operations Manager',            dept:'Operations',  salary_min:90000,  salary_max:140000, exp:4,  skills:['Project Management','Agile','Stakeholder Management','Communication'], work_type:'Hybrid', priority:'Medium', reason:'New Role'  },
  { title:'Customer Success Manager',      dept:'Customer Success', salary_min:80000, salary_max:125000, exp:3, skills:['CRM','Communication','Salesforce'],                             work_type:'Hybrid',  priority:'Medium',   reason:'Expansion'   },
  { title:'Legal Counsel',                 dept:'Legal',       salary_min:130000, salary_max:200000, exp:5,  skills:['Compliance','Risk Management','Communication'],                     work_type:'On-site', priority:'High',     reason:'New Role'    },
  { title:'Head of Compliance',            dept:'Legal',       salary_min:160000, salary_max:230000, exp:8,  skills:['Compliance','Risk Management','Leadership','Stakeholder Management'], work_type:'Hybrid', priority:'High',   reason:'New Role'    },
  { title:'Talent Acquisition Partner',    dept:'HR',          salary_min:70000,  salary_max:105000, exp:2,  skills:['Talent Acquisition Specialist','Communication','LinkedIn Recruiter'], work_type:'Hybrid', priority:'Low',    reason:'Expansion'   },
  { title:'Scrum Master',                  dept:'Engineering', salary_min:90000,  salary_max:135000, exp:3,  skills:['Scrum','Agile','Project Management','Communication'],               work_type:'Hybrid',  priority:'Low',      reason:'New Role'    },
  { title:'Head of Customer Success',      dept:'Customer Success', salary_min:130000, salary_max:190000, exp:7, skills:['Leadership','CRM','Salesforce','Stakeholder Management'],       work_type:'Hybrid',  priority:'High',     reason:'New Role'    },
  { title:'Brand Manager',                 dept:'Marketing',   salary_min:85000,  salary_max:130000, exp:4,  skills:['Content Strategy','Digital Marketing','Communication','Adobe Suite'], work_type:'Hybrid', priority:'Medium', reason:'Backfill'    },
  { title:'People Analytics Manager',      dept:'HR',          salary_min:110000, salary_max:160000, exp:5,  skills:['Data Analysis','SQL','PowerBI','Stakeholder Management'],           work_type:'Hybrid',  priority:'Medium',   reason:'New Role'    },
  { title:'IT Manager',                    dept:'Engineering', salary_min:100000, salary_max:150000, exp:5,  skills:['AWS','Azure','IT Infrastructure','Leadership','Communication'],     work_type:'On-site', priority:'Medium',   reason:'New Role'    },
  { title:'Quantitative Analyst',          dept:'Finance',     salary_min:140000, salary_max:200000, exp:4,  skills:['Python','R','Financial Modelling','Machine Learning','SQL'],        work_type:'Hybrid',  priority:'High',     reason:'New Role'    },
  { title:'Digital Marketing Manager',     dept:'Marketing',   salary_min:80000,  salary_max:125000, exp:3,  skills:['SEO/SEM','Digital Marketing','Content Strategy','Analytics'],      work_type:'Remote',  priority:'Medium',   reason:'New Role'    },
  { title:'Solutions Architect',           dept:'Engineering', salary_min:155000, salary_max:220000, exp:7,  skills:['AWS','Azure','System Design','Stakeholder Management','Python'],   work_type:'Hybrid',  priority:'High',     reason:'New Role'    },
  { title:'Finance Business Partner',      dept:'Finance',     salary_min:100000, salary_max:150000, exp:5,  skills:['Financial Modelling','Stakeholder Management','Excel','PowerBI'],  work_type:'Hybrid',  priority:'Medium',   reason:'Backfill'    },
];

const BENEFITS = ['Health Insurance','Dental & Vision','Annual Bonus','Stock Options / RSUs','Remote Work','Flexible Hours','Learning & Development Budget','Gym Membership','Life Insurance','Pension / 401k','Travel Allowance','Parental Leave','Mental Health Support','Home Office Allowance','Company Car Allowance'];
const JOB_BOARDS = ['LinkedIn','Indeed','Glassdoor','Bayt','Naukrigulf','Monster','Reed','Seek','CWJobs'];

const WORKFLOW_TEMPLATES = [
  { name:'Standard Application Process', steps:['Applied','CV Review','Phone Screen','Technical Interview','Final Interview','Offer','Hired','Rejected'] },
  { name:'Executive Track',              steps:['Identified','Initial Briefing','Long List','Short List','1st Interview','2nd Interview','Board Interview','Offer','Placed','Withdrawn'] },
  { name:'Technical Engineering Process',steps:['Applied','CV Screen','Recruiter Call','Technical Screen','Take-Home Task','Technical Interview','Culture Fit','Offer','Hired','Rejected'] },
  { name:'Graduate Scheme',              steps:['Applied','Application Review','Online Assessment','Group Exercise','Video Interview','Assessment Centre','Offer','Accepted','Rejected'] },
];

// ── Core seed logic ─────────────────────────────────────────────────────────
async function runSeed({ environmentId, clearFirst = false, progressCb = () => {} }) {
  const s = getStore();

  // Resolve objects by slug
  const peopleObj = s.objects?.find(o => o.slug === 'people'       && o.environment_id === environmentId);
  const jobsObj   = s.objects?.find(o => o.slug === 'jobs'         && o.environment_id === environmentId);
  const poolObj   = s.objects?.find(o => (o.slug === 'talent-pools' || o.slug === 'talent_pools') && o.environment_id === environmentId);
  if (!peopleObj || !jobsObj) throw new Error(`Objects not found for environment ${environmentId}`);

  const PEOPLE_OBJ = peopleObj.id;
  const JOBS_OBJ   = jobsObj.id;

  // Helper: get field options from schema
  const fieldOptions = (objId, apiKey) => {
    const f = (s.fields || []).find(f => f.object_id === objId && f.api_key === apiKey);
    return f?.options || [];
  };

  // Clear existing demo data
  if (clearFirst) {
    const before = (s.records || []).length;
    s.records = (s.records || []).filter(r =>
      !(r._demo && r.environment_id === environmentId)
    );
    // Also clear demo workflows and links
    if (s.workflows)                  s.workflows                  = s.workflows.filter(w => !(w._demo && w.environment_id === environmentId));
    if (s.record_workflow_assignments) s.record_workflow_assignments = s.record_workflow_assignments.filter(a => !a._demo);
    if (s.people_links)               s.people_links               = s.people_links.filter(l => !l._demo);
    if (s.record_notes)               s.record_notes               = s.record_notes.filter(n => !n._demo);
    if (s.communications)             s.communications             = s.communications.filter(c => !c._demo);
    progressCb({ step:'clear', message:`Cleared existing demo data`, pct:5 });
  }

  s.records              = s.records              || [];
  s.workflows            = s.workflows            || [];
  s.workflow_steps       = s.workflow_steps       || [];
  s.record_workflow_assignments = s.record_workflow_assignments || [];
  s.people_links         = s.people_links         || [];
  s.record_notes         = s.record_notes         || [];
  s.communications       = s.communications       || [];

  const results = { candidates:0, jobs:0, workflows:0, links:0, notes:0, communications:0, pools:0 };

  // ── 1. Fetch 300 real profiles from randomuser.me ──────────────────────
  progressCb({ step:'fetch', message:'Fetching 300 real profile photos from randomuser.me…', pct:8 });
  let randomUsers = [];
  try {
    const res  = await fetch('https://randomuser.me/api/?results=300&nat=us,gb,ae,au,ca,sg,de,fr,in,nz&inc=name,email,phone,location,picture,dob&noinfo');
    const data = await res.json();
    randomUsers = data.results || [];
    progressCb({ step:'fetch_ok', message:`Got ${randomUsers.length} real profiles`, pct:12 });
  } catch {
    progressCb({ step:'fetch_warn', message:'randomuser.me unavailable — using generated names (no photos)', pct:12 });
    for (let i = 0; i < 300; i++) {
      const fn = pick(FIRST_NAMES), ln = pick(LAST_NAMES);
      randomUsers.push({
        name: { first: fn, last: ln },
        email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g,'')}${i}@example.com`,
        phone: `+1${rand(2000000000,9999999999)}`,
        location: { city: pick(['New York','London','Dubai','Singapore','Sydney','Toronto']) },
        picture: { medium: null },
        dob: { age: rand(22,55) },
      });
    }
  }

  // ── 2. Create 300 candidate records ────────────────────────────────────
  progressCb({ step:'candidates', message:'Creating 300 candidate profiles…', pct:15 });
  const SKILLS_BY_DEPT = {
    Engineering: ['Python','JavaScript','TypeScript','React','Node.js','AWS','Docker','Kubernetes','Go','Java','PostgreSQL','CI/CD','System Design','Terraform','GraphQL'],
    Data:        ['Python','SQL','Spark','dbt','Airflow','TensorFlow','PyTorch','Snowflake','BigQuery','Tableau','R','Machine Learning'],
    Finance:     ['Financial Modelling','Excel','Bloomberg','M&A','Valuation','PowerBI','SQL','Risk Management','Compliance','IFRS'],
    HR:          ['Talent Acquisition Specialist','LinkedIn Recruiter','Workday','SAP SuccessFactors','L&D','Stakeholder Management','Compensation'],
    Product:     ['Product Strategy','Agile','Scrum','Figma','A/B Testing','SQL','UX Research','OKRs','Stakeholder Management'],
    Sales:       ['CRM','Salesforce','Negotiation','Communication','Leadership','Strategic Planning'],
    Marketing:   ['Digital Marketing','SEO/SEM','Content Strategy','Adobe Suite','Salesforce','Analytics','CRM'],
    Design:      ['Figma','UX Research','Adobe Suite','Design Systems','Prototyping','User Testing'],
    Operations:  ['Project Management','Agile','Stakeholder Management','Strategic Planning','Communication','Leadership'],
  };

  const candidateRecords = [];
  for (let i = 0; i < 300; i++) {
    const u      = randomUsers[i] || randomUsers[i % randomUsers.length];
    const dept   = pick(['Engineering','Engineering','Data','Finance','Finance','HR','Product','Sales','Marketing','Design','Operations']);
    const skills = picks(SKILLS_BY_DEPT[dept] || SKILLS_BY_DEPT.Engineering, rand(3, 7));
    const age    = u.dob?.age || rand(22, 55);
    const yrs    = Math.max(1, age - 22);
    const loc    = u.location?.city ? `${u.location.city}${u.location?.country ? ', ' + u.location.country : ''}` : pick(LOCATIONS);
    const fn     = u.name?.first || pick(FIRST_NAMES);
    const ln     = u.name?.last  || pick(LAST_NAMES);
    const title  = pick(TITLES);
    const company = pick(COMPANIES);
    const id     = uuidv4();

    const rec = {
      id,
      object_id:      PEOPLE_OBJ,
      environment_id: environmentId,
      _demo:          true,
      created_at:     isoAgo(rand(1, 365)),
      updated_at:     isoNow(),
      created_by:     'demo_seed',
      data: {
        first_name:           fn,
        last_name:            ln,
        email:                u.email || `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g,'')}${i}@example.com`,
        phone:                u.phone || `+971 5${rand(0,9)} ${rand(100,999)} ${rand(1000,9999)}`,
        location:             pick(LOCATIONS),
        current_title:        title,
        current_company:      company,
        status:               pick(STATUSES_P),
        source:               pick(SOURCES),
        person_type:          pick(PTYPES),
        skills,
        years_experience:     yrs,
        rating:               rand(2, 5),
        profile_photo:        u.picture?.medium || null,
        department:           dept,
        gender:               pick(GENDERS),
        languages:            picks(LANGS, rand(1, 3)),
        notice_period:        pick(NOTICES),
        work_type_preference: pick(WORK_PREFS),
        work_authorisation:   pick(WORK_AUTH),
        salary_expectation:   rand(60, 350) * 1000,
        linkedin_url:         `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase().replace(/[^a-z]/g,'')}`,
        summary:              `${fn} is an experienced ${title} with ${yrs} years in the industry. Based in ${pick(LOCATIONS)}, they bring a strong track record at ${company} and are ${pick(['actively exploring new opportunities','open to the right opportunity','not actively looking but open to conversations'])}.`,
        gdpr_consent:         true,
        gdpr_consent_date:    dateAgo(rand(1, 60)),
        education: [],
        work_history: [],
      },
    };

    // Build work_history using actual table column IDs from schema
    const whField = (s.fields || []).find(f => f.object_id === PEOPLE_OBJ && f.api_key === 'work_history');
    const edField = (s.fields || []).find(f => f.object_id === PEOPLE_OBJ && f.api_key === 'education');
    const whCols  = whField?.table_columns || [];
    const edCols  = edField?.table_columns || [];

    // Helper: find column id by name
    const colId = (cols, name) => cols.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || name.toLowerCase().replace(/\s+/g,'_');

    // Work history rows — keyed by column ID
    const prevCompany  = pick(COMPANIES);
    const prevTitle    = pick(TITLES);
    const prevFrom     = dateAgo(rand(yrs * 365 + 400, yrs * 365 + 1500));
    const prevTo       = dateAgo(rand(365, yrs * 365 - 100));
    const currFrom     = dateAgo(rand(90, 730));

    rec.data.work_history = [
      {
        [colId(whCols,'Company')]:     company,
        [colId(whCols,'Job Title')]:   title,
        [colId(whCols,'From')]:        currFrom,
        [colId(whCols,'To')]:          '',
        [colId(whCols,'Current')]:     true,
        [colId(whCols,'Description')]: `Leading ${dept} initiatives and delivering results across cross-functional teams. Responsible for ${pick(['strategy and execution','stakeholder management','team leadership','technical delivery','business development'])}.`,
      },
      {
        [colId(whCols,'Company')]:     prevCompany,
        [colId(whCols,'Job Title')]:   prevTitle,
        [colId(whCols,'From')]:        prevFrom,
        [colId(whCols,'To')]:          prevTo,
        [colId(whCols,'Current')]:     false,
        [colId(whCols,'Description')]: `${pick(['Developed and implemented','Led key projects across','Managed stakeholder relationships and delivered','Drove strategic initiatives in'])} ${dept.toLowerCase()}, achieving ${pick(['significant business impact','measurable outcomes','strong team performance','key milestones'])}.`,
      },
    ];

    // Add a third older role for candidates with 8+ years experience
    if (yrs >= 8) {
      const olderFrom = dateAgo(rand(yrs * 365 + 1600, yrs * 365 + 2800));
      const olderTo   = dateAgo(rand(yrs * 365 + 200, yrs * 365 + 400));
      rec.data.work_history.push({
        [colId(whCols,'Company')]:     pick(COMPANIES),
        [colId(whCols,'Job Title')]:   pick(TITLES),
        [colId(whCols,'From')]:        olderFrom,
        [colId(whCols,'To')]:          olderTo,
        [colId(whCols,'Current')]:     false,
        [colId(whCols,'Description')]: `Early career role focused on ${pick(['building foundational skills','contributing to team goals','professional development and learning','supporting senior stakeholders'])}.`,
      });
    }

    // Education rows — keyed by column ID
    const gradYear  = rand(Math.max(2000, new Date().getFullYear() - yrs - 6), Math.max(2005, new Date().getFullYear() - yrs));
    const subjects  = {
      Engineering: ['Computer Science','Software Engineering','Electrical Engineering','Information Technology','Mathematics'],
      Data:        ['Data Science','Statistics','Mathematics','Computer Science','Economics'],
      Finance:     ['Finance','Accounting','Economics','Business Administration','Mathematics'],
      HR:          ['Human Resources','Psychology','Business Administration','Organisational Behaviour','Sociology'],
      Product:     ['Business Administration','Computer Science','Design','Marketing','Economics'],
      Sales:       ['Business Administration','Marketing','Communications','Economics','International Business'],
      Marketing:   ['Marketing','Communications','Business Administration','Design','Digital Media'],
      Design:      ['Graphic Design','Industrial Design','Computer Science','Fine Arts','UX Design'],
      Operations:  ['Operations Management','Business Administration','Logistics','Engineering','Economics'],
      Legal:       ['Law','LLB','International Law','Business Law','Political Science'],
    };
    const deptSubjects = subjects[dept] || subjects.Engineering;

    rec.data.education = [
      {
        [colId(edCols,'Institution')]:  pick(UNIVERSITIES),
        [colId(edCols,'Degree')]:       pick(['B.Sc','B.A.','BEng','LLB']),
        [colId(edCols,'Subject')]:      pick(deptSubjects),
        [colId(edCols,'From')]:         `${gradYear - 3}-09-01`,
        [colId(edCols,'To')]:           `${gradYear}-06-30`,
        [colId(edCols,'Current')]:      false,
        [colId(edCols,'Grade / Result')]: pick(['First Class','2:1','Distinction','Merit','Pass','GPA 3.8','GPA 3.5','GPA 3.2']),
      },
    ];

    // Add postgrad for candidates with MBA/Masters profile
    if (yrs >= 5 && Math.random() > 0.55) {
      const pgYear = gradYear + rand(2, 5);
      rec.data.education.push({
        [colId(edCols,'Institution')]:  pick(UNIVERSITIES),
        [colId(edCols,'Degree')]:       pick(['M.Sc','MBA','M.A.','MRes','MSc']),
        [colId(edCols,'Subject')]:      pick(['Business Administration','Data Science','Finance','Management','Computer Science','Leadership']),
        [colId(edCols,'From')]:         `${pgYear}-09-01`,
        [colId(edCols,'To')]:           `${pgYear + 1}-06-30`,
        [colId(edCols,'Current')]:      false,
        [colId(edCols,'Grade / Result')]: pick(['Distinction','Merit','Pass','GPA 3.9','GPA 3.7']),
      });
    }
    s.records.push(rec);
    candidateRecords.push(rec);
    results.candidates++;

    if (i % 60 === 0 && i > 0) {
      progressCb({ step:'candidates', message:`Creating candidates… ${i}/300`, pct: 15 + Math.round((i / 300) * 25) });
    }
  }
  progressCb({ step:'candidates_done', message:`Created ${results.candidates} candidates`, pct:40 });

  // ── 3. Create 50 Jobs ──────────────────────────────────────────────────
  progressCb({ step:'jobs', message:'Creating 50 job records…', pct:42 });
  const JOB_STATUSES   = ['Open','Open','Open','Open','Interviewing','Interviewing','On Hold','Filled','Draft'];
  const CURRENCIES     = ['USD','USD','GBP','AED','SGD'];
  const APPR_STATUSES  = ['Approved','Approved','Approved','Pending','Not Required'];
  const POST_STATUSES  = ['Live','Live','Not Posted','Draft'];
  const ED_LEVELS      = ['Degree','Masters','Any','Degree or equivalent'];

  const jobRecords = [];
  const jobSubset  = [...JOB_TEMPLATES].sort(() => 0.5 - Math.random()); // shuffle all 50

  for (const tmpl of jobSubset) {
    const currency    = pick(CURRENCIES);
    const fx          = currency === 'AED' ? 3.67 : currency === 'GBP' ? 0.79 : currency === 'SGD' ? 1.35 : 1;
    const openDays    = rand(5, 180);
    const status      = pick(JOB_STATUSES);
    const benefits    = picks(BENEFITS, rand(4, 9));
    const desc        = JOB_DESCRIPTIONS[tmpl.dept] || JOB_DESCRIPTIONS.Engineering;
    const hmName      = pick(HIRING_MANAGERS);
    const id          = uuidv4();

    const job = {
      id,
      object_id:      JOBS_OBJ,
      environment_id: environmentId,
      _demo:          true,
      created_at:     isoAgo(openDays),
      updated_at:     isoNow(),
      created_by:     'demo_seed',
      data: {
        job_title:            tmpl.title,
        department:           tmpl.dept,
        location:             pick(LOCATIONS),
        work_type:            tmpl.work_type,
        employment_type:      pick(['Full-time','Full-time','Full-time','Contract','Part-time']),
        status,
        priority:             tmpl.priority,
        reason_for_hire:      tmpl.reason,
        hiring_manager:       hmName,
        description:          desc,
        required_skills:      tmpl.skills,
        nice_to_have_skills:  picks(SKILLS_POOL, rand(2, 4)),
        salary_currency:      currency,
        salary_min:           Math.round(tmpl.salary_min * fx / 1000) * 1000,
        salary_max:           Math.round(tmpl.salary_max * fx / 1000) * 1000,
        pay_frequency:        'Annual',
        bonus_percent:        pick([0, 0, 5, 10, 15, 20]),
        equity:               Math.random() > 0.65,
        visa_sponsorship:     Math.random() > 0.5,
        benefits,
        headcount:            rand(1, 4),
        experience_min_years: tmpl.exp,
        education_level:      pick(ED_LEVELS),
        posting_status:       status === 'Draft' ? 'Not Posted' : pick(POST_STATUSES),
        career_site_visible:  status !== 'Draft' && Math.random() > 0.2,
        internal_only:        Math.random() > 0.85,
        job_boards:           picks(JOB_BOARDS, rand(2, 4)),
        approval_status:      pick(APPR_STATUSES),
        open_date:            dateAgo(openDays),
        target_close_date:    dateAhead(rand(14, 90)),
        posted_date:          dateAgo(Math.max(1, openDays - rand(1, 5))),
        time_to_fill_target:  rand(20, 60),
        cost_centre:          `CC-${rand(1000, 9999)}`,
      },
    };
    s.records.push(job);
    jobRecords.push(job);
    results.jobs++;
  }
  progressCb({ step:'jobs_done', message:`Created ${results.jobs} jobs`, pct:55 });

  // ── 4. Create 4 Workflows ──────────────────────────────────────────────
  progressCb({ step:'workflows', message:'Creating 4 hiring workflows…', pct:57 });
  const wfRecords = [];
  for (const tmpl of WORKFLOW_TEMPLATES) {
    const wfId = uuidv4();
    const wf = {
      id: wfId, environment_id: environmentId, _demo: true,
      name: tmpl.name, description: tmpl.name, object_id: jobsObj.id,
      workflow_type: 'linked_person', active: 1,
      created_at: isoAgo(30), updated_at: isoNow(),
      steps: tmpl.steps.map((name, i) => ({
        id: uuidv4(), workflow_id: wfId, name, order_index: i,
        automation_type: null, created_at: isoAgo(30),
      })),
    };
    s.workflows.push(wf);
    wfRecords.push(wf);
    results.workflows++;
  }
  progressCb({ step:'workflows_done', message:'Workflows created', pct:60 });

  // ── 5. Assign workflows to jobs & link candidates ──────────────────────
  progressCb({ step:'links', message:'Linking candidates to jobs in pipeline stages…', pct:62 });

  // Assign each job a workflow
  const openJobs = jobRecords.filter(j => ['Open','Interviewing'].includes(j.data.status));
  openJobs.forEach((job, i) => {
    const wf = wfRecords[i % wfRecords.length];
    s.record_workflow_assignments.push({
      id: uuidv4(), record_id: job.id, workflow_id: wf.id,
      assignment_type: 'linked_person', environment_id: environmentId,
      created_at: isoAgo(rand(5, 30)), _demo: true,
    });

    // Spread candidates across stages with weighted distribution
    const count   = rand(4, 14);
    const batch   = picks(candidateRecords, Math.min(count, candidateRecords.length));
    const stages  = wf.steps;

    // Weight: more in early stages, meaningful number in HM stages
    const stageWeights = stages.map((_, idx) => {
      const pct = idx / (stages.length - 1);
      if (pct < 0.25)  return 4; // Applied, CV Review
      if (pct < 0.55)  return 3; // Phone Screen, Technical
      if (pct < 0.82)  return 3; // Manager Review, Final Interview — HM sees these
      return 1;                   // Offer, Hired
    });
    const totalWeight = stageWeights.reduce((a, b) => a + b, 0);

    batch.forEach(c => {
      let rv = Math.random() * totalWeight;
      let stageIdx = 0;
      for (let w = 0; w < stageWeights.length; w++) { rv -= stageWeights[w]; if (rv <= 0) { stageIdx = w; break; } }
      stageIdx = Math.min(stageIdx, stages.length - 2);
      const stage = stages[stageIdx];
      s.people_links.push({
        id: uuidv4(),
        person_record_id: c.id, target_record_id: job.id,  // canonical field names
        job_id: job.id, person_id: c.id,                    // legacy aliases kept for compat
        workflow_id: wf.id, current_stage_id: stage.id,
        current_stage_name: stage.name, environment_id: environmentId,
        created_at: isoAgo(rand(1, 60)), _demo: true,
      });
      results.links++;
    });

    // Guarantee ≥ 2 candidates in HM-visible stages per job
    const HM_STAGE_NAMES = ['Manager Review', 'Final Interview', 'Culture Fit', 'Assessment Centre'];
    const hmStages = stages.filter(s => HM_STAGE_NAMES.includes(s.name));
    if (hmStages.length > 0) {
      const used = new Set(batch.map(c => c.id));
      const extras = picks(candidateRecords.filter(c => !used.has(c.id)), rand(2, 4));
      extras.forEach(c => {
        const stage = hmStages[Math.floor(Math.random() * hmStages.length)];
        s.people_links.push({
          id: uuidv4(),
          person_record_id: c.id, target_record_id: job.id,  // canonical
          job_id: job.id, person_id: c.id,                    // legacy aliases
          workflow_id: wf.id, current_stage_id: stage.id,
          current_stage_name: stage.name, environment_id: environmentId,
          created_at: isoAgo(rand(1, 30)), _demo: true,
        });
        results.links++;
      });
    }
  });
  progressCb({ step:'links_done', message:`Created ${results.links} pipeline links`, pct:75 });

  // ── 6. Add recruiter notes ─────────────────────────────────────────────
  progressCb({ step:'notes', message:'Adding recruiter notes…', pct:77 });
  const noteSample = picks(candidateRecords, Math.min(150, candidateRecords.length));
  for (const c of noteSample) {
    const count = rand(1, 3);
    for (let n = 0; n < count; n++) {
      s.record_notes.push({
        id: uuidv4(), record_id: c.id, environment_id: environmentId,
        content: pick(RECRUITER_NOTES),
        created_by: pick(['recruiter@demo.io','admin@demo.io','talent@demo.io']),
        created_at: isoAgo(rand(1, 60)), _demo: true,
      });
      results.notes++;
    }
  }
  progressCb({ step:'notes_done', message:`Added ${results.notes} notes`, pct:85 });

  // ── 7. Add email communications ────────────────────────────────────────
  progressCb({ step:'comms', message:'Adding email communications…', pct:87 });
  const commSample = picks(candidateRecords, Math.min(200, candidateRecords.length));
  for (const c of commSample) {
    const count = rand(1, 4);
    for (let e = 0; e < count; e++) {
      const jobTitle = pick(JOB_TEMPLATES).title;
      const subject  = pick(EMAIL_SUBJECTS).replace('{title}', jobTitle);
      const body     = pick(EMAIL_BODIES).replace(/{title}/g, jobTitle);
      s.communications.push({
        id: uuidv4(), record_id: c.id, environment_id: environmentId,
        type: 'email', direction: pick(['outbound','outbound','inbound']),
        subject, body,
        from_address: 'recruiter@vercentic.io',
        to_address: c.data.email,
        status: pick(['sent','delivered','opened','replied']),
        created_at: isoAgo(rand(1, 90)), _demo: true,
      });
      results.communications++;
    }
  }
  progressCb({ step:'comms_done', message:`Added ${results.communications} communications`, pct:93 });

  // ── 8. Seed Talent Pools ───────────────────────────────────────────────
  if (poolObj) {
    progressCb({ step:'pools', message:'Creating talent pools…', pct:95 });
    const POOLS = [
      { name:'Senior Engineers — MENA',   category:'Passive Talent', desc:'Senior engineers in the MENA region with 5+ years experience.' },
      { name:'Product Leaders',            category:'Executive',      desc:'Director-level and above product leaders across all geographies.' },
      { name:'Finance Talent — Global',    category:'Passive Talent', desc:'CFA and finance professionals across key markets.' },
      { name:'Design Talent',              category:'Pipeline',       desc:'UX and Product Designers with strong portfolios.' },
      { name:'Sales — Enterprise',         category:'Active Talent',  desc:'Enterprise sales professionals with SaaS backgrounds, pre-qualified.' },
    ];
    for (const p of POOLS) {
      s.records.push({
        id: uuidv4(), object_id: poolObj.id, environment_id: environmentId,
        _demo: true, created_at: isoAgo(rand(10,60)), updated_at: isoNow(), created_by: 'demo_seed',
        data: {
          pool_name: p.name, description: p.desc, category: p.category,
          status: 'Active',
          tags: picks(['Tech','Finance','Product','Sales','MENA','Global','Senior','Leadership','Remote'], 3),
        },
      });
      results.pools++;
    }
  }

  saveStoreNow();
  progressCb({ step:'complete', results, message:`Done! ${results.candidates} candidates, ${results.jobs} jobs, ${results.workflows} workflows`, pct:100 });
  return results;
}

// ── Helper: find tenant for an environment ──────────────────────────────────
function findTenantForEnv(environmentId) {
  try {
    const tenants = listTenants ? listTenants() : [];
    for (const slug of tenants) {
      try {
        const ts = loadTenantStore(slug);
        if (ts?.environments?.some(e => e.id === environmentId)) return slug;
      } catch {}
    }
  } catch {}
  return null;
}

// ── API routes ──────────────────────────────────────────────────────────────

// List all environments (for the dropdown in DemoDataManager)
router.get('/environments', (req, res) => {
  try {
    const s    = getStore();
    const envs = (s.environments || []).map(e => ({
      id: e.id, name: e.name, slug: e.slug, client_name: null,
      record_count: (s.records || []).filter(r => r.environment_id === e.id && !r.deleted_at).length,
      demo_count:   (s.records || []).filter(r => r.environment_id === e.id && r._demo && !r.deleted_at).length,
    }));
    // Also pull tenant environments
    try {
      const tenants = listTenants ? listTenants() : [];
      for (const slug of tenants) {
        try {
          const ts = loadTenantStore(slug);
          (ts.environments || []).forEach(e => {
            if (!envs.find(ev => ev.id === e.id)) {
              envs.push({
                id: e.id, name: e.name, slug: e.slug, client_name: slug,
                record_count: (ts.records || []).filter(r => r.environment_id === e.id && !r.deleted_at).length,
                demo_count:   (ts.records || []).filter(r => r.environment_id === e.id && r._demo && !r.deleted_at).length,
              });
            }
          });
        } catch {}
      }
    } catch {}
    res.json(envs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demo data status for an environment
router.get('/status', (req, res) => {
  try {
    const { environment_id } = req.query;
    const tenantSlug = environment_id ? findTenantForEnv(environment_id) : null;
    const s = tenantSlug ? loadTenantStore(tenantSlug) : getStore();
    const records = (s.records || []).filter(r => !r.deleted_at);
    const demo    = records.filter(r => r._demo && (!environment_id || r.environment_id === environment_id));
    const total   = records.filter(r => !environment_id || r.environment_id === environment_id);
    res.json({
      has_demo_data: demo.length > 0,
      counts: {
        records:        demo.length,
        links:          (s.people_links    || []).filter(l => l._demo && (!environment_id || l.environment_id === environment_id)).length,
        notes:          (s.record_notes   || []).filter(n => n._demo && (!environment_id || n.environment_id === environment_id)).length,
        communications: (s.communications || []).filter(c => c._demo && (!environment_id || c.environment_id === environment_id)).length,
        total_records:  total.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streaming seed endpoint
router.post('/seed', async (req, res) => {
  const { environment_id, clear_first = false } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = data => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  try {
    const tenantSlug = findTenantForEnv(environment_id);
    const contextKey = tenantSlug || 'master';

    // Seed the tenant store
    await tenantStorage.run(contextKey, async () => {
      const results = await runSeed({
        environmentId: environment_id,
        clearFirst:    clear_first,
        progressCb:    send,
      });
      send({ step:'complete', results, pct:100 });
    });

    // Also mirror demo data into master so login always works regardless of session/tenant
    if (contextKey !== 'master') {
      send({ step:'mirror', message:'Mirroring demo data into master store…', pct:100 });
      await tenantStorage.run('master', async () => {
        await runSeed({
          environmentId: environment_id,
          clearFirst:    clear_first,
          progressCb:    () => {},  // silent
        });
      });
      send({ step:'mirror_done', message:'Master store updated', pct:100 });
    }
  } catch (err) {
    send({ step:'error', message: err.message });
  }
  res.end();
});

// Clear all demo data from an environment
router.delete('/clear', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const tenantSlug = findTenantForEnv(environment_id);
  const s = tenantSlug ? loadTenantStore(tenantSlug) : getStore();

  const before = (s.records || []).length;
  s.records              = (s.records || []).filter(r => !(r._demo && r.environment_id === environment_id));
  s.workflows            = (s.workflows            || []).filter(w => !(w._demo && w.environment_id === environment_id));
  s.people_links         = (s.people_links         || []).filter(l => !(l._demo && l.environment_id === environment_id));
  s.record_notes         = (s.record_notes         || []).filter(n => !(n._demo && n.environment_id === environment_id));
  s.communications       = (s.communications       || []).filter(c => !(c._demo && c.environment_id === environment_id));
  s.record_workflow_assignments = (s.record_workflow_assignments || []).filter(a => !a._demo);

  const removed = before - (s.records || []).length;
  if (tenantSlug) saveStore(tenantSlug); else saveStoreNow();
  res.json({ removed });
});

// ── POST /seed-cvs — generate CV PDFs for all People in an environment ────────
router.post('/seed-cvs', async (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const tenantSlug = findTenantForEnv(environment_id);
  const s = tenantSlug ? loadTenantStore(tenantSlug) : getStore();

  const allObjects = s.objects || [];
  const peopleObj  = allObjects.find(o => o.slug === 'people' && o.environment_id === environment_id);
  if (!peopleObj) return res.status(404).json({ error: 'People object not found for this environment' });

  const people = (s.records || []).filter(r => r.object_id === peopleObj.id && !r.deleted_at);
  if (!people.length) return res.status(404).json({ error: 'No people records found' });

  // Find or create CV file type
  if (!s.file_types) s.file_types = [];
  let cvFT = s.file_types.find(t => t.name?.toLowerCase().includes('cv') || t.name?.toLowerCase().includes('resume'));
  if (!cvFT) {
    cvFT = { id: uuidv4(), name: 'CV / Resume', slug: 'cv_resume', color: '#5B5BD6',
      icon: 'file-text', allowed_formats: ['pdf','doc','docx'],
      parse_cv: true, extract_enabled: false, mappings: [], created_at: isoNow() };
    s.file_types.push(cvFT);
  }

  if (!s.attachments) s.attachments = [];

  const UPLOAD_DIR = path.join(__dirname, '../uploads');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  let created = 0, skipped = 0;
  for (const person of people) {
    const alreadyHasCV = s.attachments.some(a =>
      a.record_id === person.id &&
      (a.file_type_id === cvFT.id || a.file_type_name?.toLowerCase().includes('cv'))
    );
    if (alreadyHasCV) { skipped++; continue; }

    const d = person.data || {};
    const displayName = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Candidate';
    const safeName    = displayName.replace(/[^a-zA-Z0-9]/g, '_');

    try {
      const pdfBuffer = generateCVPdf(person);
      const filename  = `cv_${Date.now()}_${uuidv4().slice(0,8)}_${safeName}.pdf`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), pdfBuffer);
      s.attachments.push({
        id: uuidv4(), record_id: person.id, environment_id,
        name: `CV - ${displayName}.pdf`, filename, size: pdfBuffer.length,
        mimetype: 'application/pdf', ext: 'pdf',
        file_type_id: cvFT.id, file_type_name: 'CV / Resume',
        url: `/api/attachments/file/${filename}`,
        uploaded_by: 'Demo Seed',
        created_at: new Date(Date.now() - Math.random()*14*86400000).toISOString(),
        _demo: true,
      });
      created++;
    } catch(e) {
      console.warn(`[seed-cvs] Failed for ${displayName}: ${e.message}`);
    }
  }

  if (tenantSlug) saveStore(tenantSlug); else saveStoreNow();
  res.json({ ok: true, created, skipped, total: people.length });
});

// ── CV PDF helpers (pure Node, no deps) ───────────────────────────────────────
function generateCVPdf(person) {
  const d      = person.data || {};
  const name   = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Candidate';
  const email  = d.email    || `${(d.first_name||'candidate').toLowerCase()}@email.com`;
  const phone  = d.phone    || '+971 50 000 0000';
  const loc    = d.location || 'Dubai, UAE';
  const title  = d.current_title || d.job_title || 'Professional';
  const years  = d.years_experience || 5;
  const skills = Array.isArray(d.skills) ? d.skills.slice(0,8).join(', ') : (d.skills || 'Leadership, Communication');
  const summary = `Experienced ${title} with ${years} years of expertise. ${name} delivers results through a collaborative approach and a strong track record in their field.`;

  const COS = ['GlobalCorp','TechVentures','Accenture','Deloitte','PwC','IBM'];
  const companies = [
    [title, `${COS[Math.floor(Math.random()*COS.length)]} ${loc.split(',')[0]}`, '2022 – Present', `Lead key initiatives and manage cross-functional teams.`],
    ['Senior Manager', 'Advisory Group MENA', '2019 – 2022', 'Delivered strategic recommendations and managed client engagements across the region.'],
    ['Analyst', 'Consulting Partners', '2016 – 2019', 'Provided analysis and insights to support executive decision-making.'],
  ].slice(0, years > 6 ? 3 : 2);

  const DEGS = ['Bachelor of Business Administration','Master of Science','Bachelor of Engineering','MBA'];
  const UNIS = ['University of Dubai','American University of Sharjah','INSEAD','London Business School'];
  const degree = DEGS[Math.floor(Math.random()*DEGS.length)];
  const uni    = UNIS[Math.floor(Math.random()*UNIS.length)];
  const gradYr = 2024 - years - 2;

  const items = [
    { text:name,  x:50, y:760, size:22, bold:true },
    { text:title, x:50, y:737, size:13, color:'0.35 0.35 0.84' },
    { text:`${email}  |  ${phone}  |  ${loc}`, x:50, y:719, size:10 },
    { line:true, x1:50, y1:709, x2:545, y2:709 },
    { text:'PROFESSIONAL SUMMARY', x:50, y:697, size:10, bold:true },
    ...pdfWrap(summary,90).map((l,i)=>({ text:l, x:50, y:683-i*13, size:10 })),
    { line:true, x1:50, y1:648, x2:545, y2:648 },
    { text:'CORE SKILLS', x:50, y:636, size:10, bold:true },
    { text:skills, x:50, y:622, size:10 },
    { line:true, x1:50, y1:611, x2:545, y2:611 },
    { text:'PROFESSIONAL EXPERIENCE', x:50, y:599, size:10, bold:true },
    ...companies.flatMap(([r,co,dt,desc],i)=>{
      const y = 583 - i*72;
      return [
        { text:r,  x:50,  y:y,    size:11, bold:true },
        { text:co, x:50,  y:y-14, size:10, color:'0.35 0.35 0.84' },
        { text:dt, x:390, y:y,    size:9,  color:'0.5 0.5 0.5' },
        ...pdfWrap(desc,85).map((l,j)=>({ text:l, x:50, y:y-28-j*12, size:9.5 })),
      ];
    }),
    { line:true, x1:50, y1:358, x2:545, y2:358 },
    { text:'EDUCATION', x:50, y:346, size:10, bold:true },
    { text:degree, x:50, y:330, size:11, bold:true },
    { text:uni,    x:50, y:316, size:10, color:'0.35 0.35 0.84' },
    { text:`Graduated ${gradYr}`, x:390, y:330, size:9, color:'0.5 0.5 0.5' },
    { text:`References available on request  ·  ${years} years professional experience`, x:50, y:40, size:8, color:'0.6 0.6 0.6' },
  ];
  return pdfBuild(items);
}

function pdfWrap(text, max) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur+' '+w).trim().length > max) { if (cur) lines.push(cur.trim()); cur = w; }
    else cur = (cur+' '+w).trim();
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

function pdfEsc(s) { return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }

function pdfBuild(items) {
  // Build content stream
  let stream = 'q\n1 1 1 rg\n0 0 595 842 re\nf\nQ\n';
  for (const it of items) {
    if (it.line) { stream += `q\n0.75 0.75 0.75 RG\n0.5 w\n${it.x1} ${it.y1} m\n${it.x2} ${it.y2} l\nS\nQ\n`; continue; }
    const { text='', x=50, y=700, size=10, bold, color } = it;
    stream += `BT\n/${bold?'F2':'F1'} ${size} Tf\n${color||'0 0 0'} rg\n${x} ${y} Td\n(${pdfEsc(text)}) Tj\nET\n`;
  }

  // Sequential object IDs — no reserved slots
  const streamLen = Buffer.byteLength(stream, 'latin1');
  const defs = [
    `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
    `<< /Font << /F1 2 0 R /F2 3 0 R >> >>`,
    `<< /Type /Pages /Kids [6 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Contents 1 0 R /Resources 4 0 R >>`,
    `<< /Type /Catalog /Pages 5 0 R >>`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < defs.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i+1} 0 obj\n${defs[i]}\nendobj\n`;
  }
  const xrefPos = pdf.length;
  const total = defs.length + 1;
  pdf += `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${total} /Root 7 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

module.exports = router;
module.exports.runSeed          = runSeed;
module.exports.findTenantForEnv = findTenantForEnv;