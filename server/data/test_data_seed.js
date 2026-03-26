const { v4: uuidv4 } = require('uuid');
const { query, insert, saveStore } = require('../db/init');

const TEST_PEOPLE = [
  { first_name:'Sarah', last_name:'Al-Mansouri', email:'sarah.almansouri@example.com', phone:'+971501234567', person_type:'Candidate', status:'Active', current_title:'Senior Product Manager', location:'Dubai, UAE', years_experience:'7', skills:['Product Strategy','Agile','Roadmapping','Stakeholder Management'], source:'LinkedIn', rating:'5' },
  { first_name:'James', last_name:'Keane', email:'james.keane@example.com', phone:'+971502345678', person_type:'Candidate', status:'Active', current_title:'Engineering Manager', location:'Dubai, UAE', years_experience:'10', skills:['React','Node.js','Team Leadership','System Design'], source:'Referral', rating:'5' },
  { first_name:'Priya', last_name:'Nair', email:'priya.nair@example.com', phone:'+971503456789', person_type:'Candidate', status:'Active', current_title:'Data Scientist', location:'Abu Dhabi, UAE', years_experience:'5', skills:['Python','Machine Learning','SQL','TensorFlow'], source:'Job Board', rating:'4' },
  { first_name:'Ahmed', last_name:'Al-Rashidi', email:'ahmed.alrashidi@example.com', phone:'+971504567890', person_type:'Candidate', status:'Active', current_title:'UX Designer', location:'Dubai, UAE', years_experience:'6', skills:['Figma','User Research','Prototyping','Design Systems'], source:'LinkedIn', rating:'4' },
  { first_name:'Maria', last_name:'Santos', email:'maria.santos@example.com', phone:'+971505678901', person_type:'Candidate', status:'In Process', current_title:'Financial Analyst', location:'Dubai, UAE', years_experience:'4', skills:['Financial Modelling','Excel','Power BI','IFRS'], source:'Agency', rating:'4' },
  { first_name:'Oliver', last_name:'Thompson', email:'oliver.thompson@example.com', phone:'+971506789012', person_type:'Candidate', status:'Active', current_title:'DevOps Engineer', location:'Sharjah, UAE', years_experience:'5', skills:['Kubernetes','Docker','AWS','CI/CD','Terraform'], source:'LinkedIn', rating:'3' },
  { first_name:'Fatima', last_name:'Al-Zaabi', email:'fatima.alzaabi@example.com', phone:'+971507890123', person_type:'Candidate', status:'Active', current_title:'Marketing Manager', location:'Dubai, UAE', years_experience:'8', skills:['Digital Marketing','Brand Strategy','Content','SEO'], source:'LinkedIn', rating:'5' },
  { first_name:'David', last_name:'Kim', email:'david.kim@example.com', phone:'+971508901234', person_type:'Candidate', status:'Hired', current_title:'Backend Engineer', location:'Dubai, UAE', years_experience:'6', skills:['Java','Spring Boot','Microservices','PostgreSQL'], source:'Referral', rating:'4' },
  { first_name:'Layla', last_name:'Hassan', email:'layla.hassan@example.com', phone:'+971509012345', person_type:'Employee', status:'Active', current_title:'HR Business Partner', location:'Dubai, UAE', years_experience:'9', skills:['Talent Acquisition','HR Strategy','Employee Relations'], source:'Direct', rating:'5', job_title:'HR Business Partner', department:'Human Resources', employment_type:'Full-time', entity:'Vercentic MENA' },
  { first_name:'Carlos', last_name:'Mendez', email:'carlos.mendez@example.com', phone:'+971500123456', person_type:'Candidate', status:'Active', current_title:'Sales Director', location:'Dubai, UAE', years_experience:'12', skills:['B2B Sales','Pipeline Management','SaaS','Arabic'], source:'LinkedIn', rating:'4' },
  { first_name:'Amira', last_name:'Khalil', email:'amira.khalil@example.com', phone:'+971501234568', person_type:'Candidate', status:'In Process', current_title:'Legal Counsel', location:'Abu Dhabi, UAE', years_experience:'7', skills:['Corporate Law','Contracts','Compliance','DIFC'], source:'Agency', rating:'3' },
  { first_name:'Raj', last_name:'Patel', email:'raj.patel@example.com', phone:'+971502345679', person_type:'Candidate', status:'Active', current_title:'Cloud Architect', location:'Dubai, UAE', years_experience:'11', skills:['AWS','Azure','GCP','Solution Architecture','Python'], source:'LinkedIn', rating:'5' },
  { first_name:'Hassan', last_name:'Al-Farsi', email:'hassan.alfarsi@example.com', phone:'+971504567891', person_type:'Candidate', status:'Active', current_title:'Supply Chain Manager', location:'Dubai, UAE', years_experience:'9', skills:['Logistics','SAP','Procurement','Lean Six Sigma'], source:'LinkedIn', rating:'4' },
  { first_name:'Isabella', last_name:'Romano', email:'isabella.romano@example.com', phone:'+971505678902', person_type:'Employee', status:'Active', current_title:'Head of Operations', location:'Dubai, UAE', years_experience:'14', skills:['Operations Management','Process Improvement','P&L','ERP'], source:'Executive Search', rating:'5', job_title:'Head of Operations', department:'Operations', employment_type:'Full-time', entity:'Vercentic MENA' },
  { first_name:'Khalid', last_name:'Al-Nuaimi', email:'khalid.alnuaimi@example.com', phone:'+971503456799', person_type:'Employee', status:'Active', current_title:'CEO', location:'Dubai, UAE', years_experience:'20', skills:['Leadership','Strategy','P&L','Board Governance'], source:'Board', rating:'5', job_title:'Chief Executive Officer', department:'Executive', employment_type:'Full-time', entity:'Vercentic MENA' },
];

const TEST_JOBS = [
  { job_title:'Senior Product Manager', department:'Product', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'25000', salary_max:'35000', priority:'High', required_skills:['Product Strategy','Agile','Roadmapping'], description:'Lead our core platform roadmap.' },
  { job_title:'Engineering Manager', department:'Engineering', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Open', salary_min:'30000', salary_max:'45000', priority:'High', required_skills:['Team Leadership','React','Node.js','System Design'], description:'Lead a team of 8 engineers.' },
  { job_title:'Data Scientist', department:'Data & Analytics', location:'Abu Dhabi, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'18000', salary_max:'28000', priority:'Medium', required_skills:['Python','Machine Learning','SQL','TensorFlow'], description:'Build predictive models and analytics.' },
  { job_title:'Senior UX Designer', department:'Design', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'15000', salary_max:'22000', priority:'Medium', required_skills:['Figma','User Research','Prototyping'], description:'Shape the user experience of our platform.' },
  { job_title:'Sales Director MENA', department:'Sales', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Open', salary_min:'35000', salary_max:'55000', priority:'High', required_skills:['B2B Sales','SaaS','Arabic','Pipeline Management'], description:'Drive enterprise revenue across MENA.' },
  { job_title:'DevOps Engineer', department:'Engineering', location:'Dubai, UAE', work_type:'Remote', employment_type:'Full-time', status:'Open', salary_min:'16000', salary_max:'24000', priority:'Medium', required_skills:['Kubernetes','Docker','AWS','Terraform'], description:'Own cloud infrastructure and pipelines.' },
  { job_title:'Financial Controller', department:'Finance', location:'Dubai, UAE', work_type:'On-site', employment_type:'Full-time', status:'Filled', salary_min:'22000', salary_max:'32000', priority:'Low', required_skills:['Financial Reporting','IFRS','ERP'], description:'Oversee all financial reporting.' },
  { job_title:'Cloud Architect', department:'Engineering', location:'Dubai, UAE', work_type:'Hybrid', employment_type:'Full-time', status:'Open', salary_min:'28000', salary_max:'42000', priority:'High', required_skills:['AWS','Azure','Solution Architecture','Python'], description:'Define our cloud architecture strategy.' },
];

// NOTE: pool_name is the correct field key for Talent Pool records
const TEST_POOLS = [
  { pool_name:'MENA Tech Leaders', category:'Engineering & Product', status:'Active', description:'Senior technical candidates across MENA with 8+ years experience.' },
  { pool_name:'Dubai Finance Talent', category:'Finance & Accounting', status:'Active', description:'Qualified finance professionals in the UAE with Big 4 backgrounds.' },
  { pool_name:'Emirati Nationals Pipeline', category:'Emiratisation', status:'Active', description:'Emirati national candidates for nationalisation programmes.' },
];

const TEST_ORG_UNITS = [
  { name:'Vercentic MENA', type:'company', color:'#3B5BDB', parent_key:null, key:'company' },
  { name:'Executive', type:'division', color:'#6741d9', parent_key:'company', key:'exec' },
  { name:'Technology', type:'division', color:'#0c8599', parent_key:'company', key:'tech' },
  { name:'Commercial', type:'division', color:'#2f9e44', parent_key:'company', key:'comm' },
  { name:'Operations', type:'division', color:'#e67700', parent_key:'company', key:'ops' },
  { name:'Engineering', type:'team', color:'#0c8599', parent_key:'tech', key:'eng' },
  { name:'Product & Design', type:'team', color:'#0c8599', parent_key:'tech', key:'prod' },
  { name:'Data & Analytics', type:'team', color:'#0c8599', parent_key:'tech', key:'data' },
  { name:'Sales', type:'team', color:'#2f9e44', parent_key:'comm', key:'sales' },
  { name:'Human Resources', type:'team', color:'#e67700', parent_key:'ops', key:'hr' },
  { name:'Finance', type:'team', color:'#e67700', parent_key:'ops', key:'finance' },
];

function randomDateInRange(maxDaysAgo, minDaysAgo = 0) {
  const now = Date.now();
  const min = minDaysAgo * 86400000;
  const max = maxDaysAgo * 86400000;
  return new Date(now - Math.floor(Math.random() * (max - min)) - min).toISOString();
}

async function loadTestData(environmentId) {
  const results = { people:0, jobs:0, pools:0, org_units:0, workflows:0, interview_types:0, errors:[] };

  const allObjects = query('objects', o => o.environment_id === environmentId);
  const peopleObj = allObjects.find(o => ['people','person'].includes((o.slug||o.name||'').toLowerCase()));
  const jobsObj   = allObjects.find(o => ['jobs','job'].includes((o.slug||o.name||'').toLowerCase()));
  const poolsObj  = allObjects.find(o => (o.slug||o.name||'').toLowerCase().includes('pool'));

  if (!peopleObj) results.errors.push('People object not found');
  if (!jobsObj)   results.errors.push('Jobs object not found');
  if (!poolsObj)  results.errors.push('Talent Pools object not found');

  if (peopleObj) {
    for (const p of TEST_PEOPLE) {
      try { const ts = randomDateInRange(60,0); insert('records',{id:uuidv4(),object_id:peopleObj.id,environment_id:environmentId,data:p,created_by:'test-data-seed',created_at:ts,updated_at:ts,is_deleted:0}); results.people++; }
      catch(e) { results.errors.push(`Person ${p.first_name}: ${e.message}`); }
    }
  }
  if (jobsObj) {
    for (const j of TEST_JOBS) {
      try { const ts = randomDateInRange(90,7); insert('records',{id:uuidv4(),object_id:jobsObj.id,environment_id:environmentId,data:j,created_by:'test-data-seed',created_at:ts,updated_at:ts,is_deleted:0}); results.jobs++; }
      catch(e) { results.errors.push(`Job ${j.job_title}: ${e.message}`); }
    }
  }
  if (poolsObj) {
    for (const pool of TEST_POOLS) {
      try { const ts = randomDateInRange(120,30); insert('records',{id:uuidv4(),object_id:poolsObj.id,environment_id:environmentId,data:pool,created_by:'test-data-seed',created_at:ts,updated_at:ts,is_deleted:0}); results.pools++; }
      catch(e) { results.errors.push(`Pool ${pool.pool_name}: ${e.message}`); }
    }
  }

  // Org units
  const orgMap = {};
  for (const unit of TEST_ORG_UNITS) {
    try { const id=uuidv4(); const parent_id=unit.parent_key?orgMap[unit.parent_key]:null; insert('org_units',{id,name:unit.name,type:unit.type,color:unit.color,parent_id,environment_id:environmentId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}); orgMap[unit.key]=id; results.org_units++; }
    catch(e) { results.errors.push(`Org unit ${unit.name}: ${e.message}`); }
  }

  // Workflows
  const wfBase = {environment_id:environmentId,is_active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try {
    insert('workflows',{id:uuidv4(),name:'Standard Application Process',description:'End-to-end hiring workflow',object_id:jobsObj?.id||null,workflow_type:'people_link',...wfBase,
      steps:[{id:uuidv4(),name:'Applied',order:0},{id:uuidv4(),name:'CV Review',order:1},{id:uuidv4(),name:'Phone Screen',order:2},{id:uuidv4(),name:'Technical Interview',order:3},{id:uuidv4(),name:'Final Interview',order:4},{id:uuidv4(),name:'Offer',order:5},{id:uuidv4(),name:'Hired',order:6},{id:uuidv4(),name:'Rejected',order:7}].map(s=>({...s,automation_type:null}))});
    insert('workflows',{id:uuidv4(),name:'Job Opening Lifecycle',description:'Track a job from approval to filled',object_id:jobsObj?.id||null,workflow_type:'record_pipeline',...wfBase,
      steps:[{id:uuidv4(),name:'Draft',order:0},{id:uuidv4(),name:'Pending Approval',order:1},{id:uuidv4(),name:'Approved & Open',order:2},{id:uuidv4(),name:'In Interview',order:3},{id:uuidv4(),name:'Offer Stage',order:4},{id:uuidv4(),name:'Filled',order:5},{id:uuidv4(),name:'On Hold',order:6},{id:uuidv4(),name:'Cancelled',order:7}].map(s=>({...s,automation_type:null}))});
    results.workflows += 2;
  } catch(e) { results.errors.push(`Workflows: ${e.message}`); }

  // Interview types
  const avail = {monday:[{start:'09:00',end:'17:00'}],tuesday:[{start:'09:00',end:'17:00'}],wednesday:[{start:'09:00',end:'17:00'}],thursday:[{start:'09:00',end:'17:00'}],friday:[{start:'09:00',end:'13:00'}]};
  const ivBase = {environment_id:environmentId,is_active:true,availability:avail,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try {
    insert('interview_types',{id:uuidv4(),name:'Phone Screen',description:'20-minute initial screening call',duration_minutes:20,format:'phone',color:'#2f9e44',...ivBase});
    insert('interview_types',{id:uuidv4(),name:'Technical Interview',description:'45-minute technical assessment',duration_minutes:45,format:'video',color:'#0c8599',...ivBase});
    insert('interview_types',{id:uuidv4(),name:'Final Panel Interview',description:'60-minute panel with leadership',duration_minutes:60,format:'onsite',color:'#6741d9',...ivBase});
    results.interview_types += 3;
  } catch(e) { results.errors.push(`Interview types: ${e.message}`); }

  saveStore();
  return results;
}

module.exports = loadTestData;
