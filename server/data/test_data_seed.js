const { v4: uuidv4 } = require('uuid');
const { query, insert, saveStore } = require('../db/init');

const TEST_PEOPLE = [
  { first_name:'Sarah', last_name:'Al-Mansouri', email:'sarah.almansouri@example.com', phone:'+971501234567', person_type:'Candidate', status:'Active', current_title:'Senior Product Manager', location:'Dubai, UAE', years_experience:'7', skills:['Product Strategy','Agile','Roadmapping','Stakeholder Management'], source:'LinkedIn', rating:'5', nationality:'Emirati' },
  { first_name:'James', last_name:'Keane', email:'james.keane@example.com', phone:'+971502345678', person_type:'Candidate', status:'Active', current_title:'Engineering Manager', location:'Dubai, UAE', years_experience:'10', skills:['React','Node.js','Team Leadership','System Design'], source:'Referral', rating:'5', nationality:'Irish' },
  { first_name:'Priya', last_name:'Nair', email:'priya.nair@example.com', phone:'+971503456789', person_type:'Candidate', status:'Active', current_title:'Data Scientist', location:'Abu Dhabi, UAE', years_experience:'5', skills:['Python','Machine Learning','SQL','TensorFlow'], source:'Job Board', rating:'4', nationality:'Indian' },
  { first_name:'Ahmed', last_name:'Al-Rashidi', email:'ahmed.alrashidi@example.com', phone:'+971504567890', person_type:'Candidate', status:'Active', current_title:'UX Designer', location:'Dubai, UAE', years_experience:'6', skills:['Figma','User Research','Prototyping','Design Systems'], source:'LinkedIn', rating:'4', nationality:'Emirati' },
  { first_name:'Maria', last_name:'Santos', email:'maria.santos@example.com', phone:'+971505678901', person_type:'Candidate', status:'In Process', current_title:'Financial Analyst', location:'Dubai, UAE', years_experience:'4', skills:['Financial Modelling','Excel','Power BI','IFRS'], source:'Agency', rating:'4', nationality:'Filipino' },
  { first_name:'Oliver', last_name:'Thompson', email:'oliver.thompson@example.com', phone:'+971506789012', person_type:'Candidate', status:'Active', current_title:'DevOps Engineer', location:'Sharjah, UAE', years_experience:'5', skills:['Kubernetes','Docker','AWS','CI/CD','Terraform'], source:'LinkedIn', rating:'3', nationality:'British' },
  { first_name:'Fatima', last_name:'Al-Zaabi', email:'fatima.alzaabi@example.com', phone:'+971507890123', person_type:'Candidate', status:'Active', current_title:'Marketing Manager', location:'Dubai, UAE', years_experience:'8', skills:['Digital Marketing','Brand Strategy','Content','SEO'], source:'LinkedIn', rating:'5', nationality:'Emirati' },
  { first_name:'David', last_name:'Kim', email:'david.kim@example.com', phone:'+971508901234', person_type:'Candidate', status:'Hired', current_title:'Backend Engineer', location:'Dubai, UAE', years_experience:'6', skills:['Java','Spring Boot','Microservices','PostgreSQL'], source:'Referral', rating:'4', nationality:'Korean' },
  { first_name:'Layla', last_name:'Hassan', email:'layla.hassan@example.com', phone:'+971509012345', person_type:'Employee', status:'Active', current_title:'HR Business Partner', location:'Dubai, UAE', years_experience:'9', skills:['Talent Acquisition','HR Strategy','Employee Relations'], source:'Direct', rating:'5', nationality:'Lebanese', job_title:'HR Business Partner', department:'Human Resources', employment_type:'Full-time', entity:'TalentOS MENA' },
  { first_name:'Carlos', last_name:'Mendez', email:'carlos.mendez@example.com', phone:'+971500123456', person_type:'Candidate', status:'Active', current_title:'Sales Director', location:'Dubai, UAE', years_experience:'12', skills:['B2B Sales','Pipeline Management','SaaS','Arabic'], source:'LinkedIn', rating:'4', nationality:'Spanish' },
  { first_name:'Amira', last_name:'Khalil', email:'amira.khalil@example.com', phone:'+971501234568', person_type:'Candidate', status:'In Process', current_title:'Legal Counsel', location:'Abu Dhabi, UAE', years_experience:'7', skills:['Corporate Law','Contracts','Compliance','DIFC'], source:'Agency', rating:'3', nationality:'Egyptian' },
  { first_name:'Raj', last_name:'Patel', email:'raj.patel@example.com', phone:'+971502345679', person_type:'Candidate', status:'Active', current_title:'Cloud Architect', location:'Dubai, UAE', years_experience:'11', skills:['AWS','Azure','GCP','Solution Architecture','Python'], source:'LinkedIn', rating:'5', nationality:'Indian' },
  { first_name:'Nora', last_name:'Andersen', email:'nora.andersen@example.com', phone:'+971503456790', person_type:'Candidate', status:'Declined', current_title:'Content Strategist', location:'Dubai, UAE', years_experience:'5', skills:['Content Strategy','SEO','Brand Voice','Analytics'], source:'Job Board', rating:'3', nationality:'Norwegian' },
  { first_name:'Hassan', last_name:'Al-Farsi', email:'hassan.alfarsi@example.com', phone:'+971504567891', person_type:'Candidate', status:'Active', current_title:'Supply Chain Manager', location:'Dubai, UAE', years_experience:'9', skills:['Logistics','SAP','Procurement','Lean Six Sigma'], source:'LinkedIn', rating:'4', nationality:'Omani' },
  { first_name:'Isabella', last_name:'Romano', email:'isabella.romano@example.com', phone:'+971505678902', person_type:'Candidate', status:'Active', current_title:'Head of Operations', location:'Dubai, UAE', years_experience:'14', skills:['Operations Management','Process Improvement','P&L','ERP'], source:'Executive Search', rating:'5', nationality:'Italian' },
];

const TEST_JOBS = [
  { job_title:'Senior Product Manager', department:'Product', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'25000', salary_max:'35000', currency:'AED', skills_required:['Product Strategy','Agile','Roadmapping','Stakeholder Management'], priority:'High', description:'We are looking for an experienced Senior Product Manager to lead our core platform roadmap.' },
  { job_title:'Engineering Manager', department:'Engineering', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Open', salary_min:'30000', salary_max:'45000', currency:'AED', skills_required:['Team Leadership','React','Node.js','System Design','Agile'], priority:'High', description:'Lead a team of 8 engineers building our SaaS platform.' },
  { job_title:'Data Scientist', department:'Data & Analytics', location:'Abu Dhabi, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'18000', salary_max:'28000', currency:'AED', skills_required:['Python','Machine Learning','SQL','TensorFlow','NLP'], priority:'Medium', description:'Join our data team to build predictive models and analytics products.' },
  { job_title:'Senior UX Designer', department:'Design', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'15000', salary_max:'22000', currency:'AED', skills_required:['Figma','User Research','Prototyping','Design Systems'], priority:'Medium', description:'Shape the user experience of a rapidly growing SaaS platform.' },
  { job_title:'Sales Director MENA', department:'Sales', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Open', salary_min:'35000', salary_max:'55000', currency:'AED', skills_required:['B2B Sales','SaaS','Arabic','Pipeline Management'], priority:'High', description:'Drive enterprise revenue across the MENA region.' },
  { job_title:'DevOps Engineer', department:'Engineering', location:'Dubai, UAE', work_type:'Remote', employment_type:'Full-time', status:'Open', salary_min:'16000', salary_max:'24000', currency:'AED', skills_required:['Kubernetes','Docker','AWS','Terraform','CI/CD'], priority:'Medium', description:'Own our cloud infrastructure and delivery pipelines.' },
  { job_title:'Financial Controller', department:'Finance', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Filled', salary_min:'22000', salary_max:'32000', currency:'AED', skills_required:['Financial Reporting','IFRS','ERP','Team Management'], priority:'Low', description:'Oversee all financial reporting and controls.' },
  { job_title:'Cloud Architect', department:'Engineering', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'28000', salary_max:'42000', currency:'AED', skills_required:['AWS','Azure','Solution Architecture','Python','Security'], priority:'High', description:'Define and own our cloud architecture strategy.' },
];

const TEST_POOLS = [
  { name:'MENA Tech Leaders', category:'Engineering & Product', status:'Active', size:'47', description:'Senior technical and product candidates across the MENA region with 8+ years experience.' },
  { name:'Dubai Finance Talent', category:'Finance & Accounting', status:'Active', size:'31', description:'Qualified finance professionals based in the UAE — ACCA, CPA, CFA and CA holders.' },
  { name:'Emirati Nationals Pipeline', category:'Emiratisation', status:'Active', size:'24', description:'Dedicated pool of Emirati national candidates across all functions for nationalisation programmes.' },
];

async function loadTestData(environmentId) {
  const results = { people: 0, jobs: 0, pools: 0, errors: [] };

  const allObjects = query('objects', o => o.environment_id === environmentId);
  const peopleObj = allObjects.find(o => ['people','person'].includes((o.slug||o.name||'').toLowerCase()));
  const jobsObj   = allObjects.find(o => ['jobs','job'].includes((o.slug||o.name||'').toLowerCase()));
  const poolsObj  = allObjects.find(o => (o.slug||o.name||'').toLowerCase().includes('pool') || (o.slug||o.name||'').toLowerCase().includes('talent'));

  if (!peopleObj) results.errors.push('People object not found');
  if (!jobsObj)   results.errors.push('Jobs object not found');
  if (!poolsObj)  results.errors.push('Talent Pools object not found');

  if (peopleObj) {
    for (const p of TEST_PEOPLE) {
      try {
        const ts = randomDateInRange(60, 0);
        insert('records', { id: uuidv4(), object_id: peopleObj.id, environment_id: environmentId, data: p, created_by: 'test-data-seed', created_at: ts, updated_at: ts, is_deleted: 0 });
        results.people++;
      } catch (e) { results.errors.push(`Person ${p.first_name}: ${e.message}`); }
    }
  }

  if (jobsObj) {
    for (const j of TEST_JOBS) {
      try {
        const ts = randomDateInRange(90, 7);
        insert('records', { id: uuidv4(), object_id: jobsObj.id, environment_id: environmentId, data: j, created_by: 'test-data-seed', created_at: ts, updated_at: ts, is_deleted: 0 });
        results.jobs++;
      } catch (e) { results.errors.push(`Job ${j.job_title}: ${e.message}`); }
    }
  }

  if (poolsObj) {
    for (const pool of TEST_POOLS) {
      try {
        const ts = randomDateInRange(120, 30);
        insert('records', { id: uuidv4(), object_id: poolsObj.id, environment_id: environmentId, data: pool, created_by: 'test-data-seed', created_at: ts, updated_at: ts, is_deleted: 0 });
        results.pools++;
      } catch (e) { results.errors.push(`Pool ${pool.name}: ${e.message}`); }
    }
  }

  saveStore();
  return results;
}

function randomDateInRange(maxDaysAgo, minDaysAgo = 0) {
  const now = Date.now();
  const min = minDaysAgo * 86400000;
  const max = maxDaysAgo * 86400000;
  return new Date(now - Math.floor(Math.random() * (max - min)) - min).toISOString();
}

module.exports = loadTestData;
