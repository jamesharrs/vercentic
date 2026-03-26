// Run from talentos root: node server/seed-demo.js
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { getStore, insert, initDB } = require('./db/init');

initDB();
const store = getStore();

const env = store.environments?.find(e => e.is_default) || store.environments?.[0];
if (!env) { console.error('No environment found. Start the server first to seed the DB.'); process.exit(1); }

const peopleObj = store.objects?.find(o => o.slug === 'people' && o.environment_id === env.id);
const jobsObj   = store.objects?.find(o => o.slug === 'jobs'   && o.environment_id === env.id);
const poolsObj  = store.objects?.find(o => o.slug === 'talent-pools' && o.environment_id === env.id);

if (!peopleObj || !jobsObj) { console.error('Objects not found. Ensure the app has been started at least once.'); process.exit(1); }

const now = () => new Date().toISOString();

// ── People ────────────────────────────────────────────────────────────────────
const people = [
  { first_name:"Sarah",   last_name:"Mitchell",  email:"sarah.mitchell@gmail.com",  phone:"+971 50 123 4567", location:"Dubai, UAE",        current_title:"Senior Software Engineer",    current_company:"Noon",          status:"Active",      source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/sarahmitchell", skills:["React","Node.js","TypeScript","AWS"],    years_experience:7, rating:5, summary:"Full-stack engineer with strong fintech background" },
  { first_name:"James",   last_name:"Al-Farsi",  email:"james.alfarsi@hotmail.com", phone:"+971 55 234 5678", location:"Abu Dhabi, UAE",     current_title:"Product Manager",             current_company:"Careem",        status:"Passive",     source:"Referral",   linkedin_url:"https://linkedin.com/in/jamesalfarsi",  skills:["Product Strategy","Agile","Analytics"],  years_experience:5, rating:4, summary:"PM with ride-hailing and marketplace experience" },
  { first_name:"Priya",   last_name:"Sharma",    email:"priya.sharma@outlook.com",  phone:"+971 52 345 6789", location:"Dubai, UAE",        current_title:"Data Scientist",              current_company:"Talabat",       status:"Active",      source:"Job Board",  linkedin_url:"https://linkedin.com/in/priyasharma",   skills:["Python","ML","SQL","Tableau"],           years_experience:4, rating:4, summary:"Data scientist specialising in recommendation engines" },
  { first_name:"Omar",    last_name:"Hassan",    email:"omar.hassan@gmail.com",     phone:"+971 56 456 7890", location:"Sharjah, UAE",      current_title:"DevOps Engineer",             current_company:"du Telecom",    status:"Active",      source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/omarhassan",    skills:["Kubernetes","Docker","CI/CD","Terraform"], years_experience:6, rating:4, summary:"DevOps specialist with telco and cloud expertise" },
  { first_name:"Emma",    last_name:"Thompson",  email:"emma.thompson@gmail.com",   phone:"+44 7700 900123",  location:"London, UK",        current_title:"UX Designer",                 current_company:"Revolut",       status:"Active",      source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/emmathompson",  skills:["Figma","User Research","Prototyping"],   years_experience:5, rating:5, summary:"Senior UX designer with fintech product design experience" },
  { first_name:"Ahmed",   last_name:"Al-Rashid", email:"ahmed.alrashid@gmail.com",  phone:"+971 50 567 8901", location:"Dubai, UAE",        current_title:"Backend Engineer",            current_company:"Fetchr",        status:"Passive",     source:"Referral",   linkedin_url:"https://linkedin.com/in/ahmedalrashid", skills:["Java","Spring Boot","PostgreSQL","Redis"], years_experience:8, rating:4, summary:"Senior backend engineer with logistics and payments experience" },
  { first_name:"Fatima",  last_name:"Al-Zahra",  email:"fatima.alzahra@gmail.com",  phone:"+971 54 678 9012", location:"Dubai, UAE",        current_title:"HR Business Partner",         current_company:"Emirates NBD", status:"Not Looking", source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/fatimaalzahra", skills:["HR Strategy","Talent Management","HRIS"], years_experience:9, rating:3, summary:"Experienced HRBP with banking sector background" },
  { first_name:"Lucas",   last_name:"Santos",    email:"lucas.santos@gmail.com",    phone:"+971 58 789 0123", location:"Dubai, UAE",        current_title:"Mobile Developer",            current_company:"Property Finder",status:"Active",     source:"Job Board",  linkedin_url:"https://linkedin.com/in/lucassantos",   skills:["React Native","Swift","Kotlin","Firebase"],years_experience:4, rating:4, summary:"Mobile developer with iOS and Android cross-platform expertise" },
  { first_name:"Nadia",   last_name:"Okonkwo",   email:"nadia.okonkwo@gmail.com",   phone:"+971 50 890 1234", location:"Dubai, UAE",        current_title:"Marketing Manager",           current_company:"Namshi",        status:"Active",      source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/nadiaokonkwo",  skills:["Growth Marketing","SEO","Analytics","CRM"],years_experience:6, rating:4, summary:"Growth-focused marketer with e-commerce expertise" },
  { first_name:"Chen",    last_name:"Wei",        email:"chen.wei@gmail.com",        phone:"+971 55 901 2345", location:"Singapore",         current_title:"Engineering Manager",         current_company:"Grab",          status:"Passive",     source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/chenwei",       skills:["Engineering Leadership","Go","Microservices"], years_experience:11, rating:5, summary:"Engineering leader who has scaled teams from 5 to 50" },
  { first_name:"Yasmin",  last_name:"Khalil",    email:"yasmin.khalil@gmail.com",   phone:"+971 52 012 3456", location:"Dubai, UAE",        current_title:"Finance Analyst",             current_company:"ADCB",          status:"Active",      source:"University", linkedin_url:"https://linkedin.com/in/yasminkhalil",  skills:["Financial Modelling","Excel","Power BI"],years_experience:3, rating:3, summary:"Analyst with strong modelling and reporting background" },
  { first_name:"Ryan",    last_name:"O'Brien",   email:"ryan.obrien@gmail.com",     phone:"+353 87 123 4567", location:"Dublin, Ireland",   current_title:"Cloud Architect",             current_company:"AWS",           status:"Active",      source:"LinkedIn",   linkedin_url:"https://linkedin.com/in/ryanobrien",    skills:["AWS","Azure","GCP","Architecture"],      years_experience:10, rating:5, summary:"Multi-cloud architect with enterprise solutions expertise" },
  { first_name:"Amira",   last_name:"Benali",    email:"amira.benali@gmail.com",    phone:"+971 56 234 5678", location:"Dubai, UAE",        current_title:"Cybersecurity Analyst",       current_company:"G42",           status:"Passive",     source:"Referral",   skills:["SIEM","Penetration Testing","ISO 27001"],years_experience:5, rating:4, summary:"Security analyst focused on threat detection and compliance" },
  { first_name:"David",   last_name:"Park",      email:"david.park@gmail.com",      phone:"+82 10 1234 5678", location:"Seoul, South Korea",current_title:"AI/ML Engineer",              current_company:"Samsung",       status:"Active",      source:"LinkedIn",   skills:["PyTorch","TensorFlow","LLMs","MLOps"],    years_experience:6, rating:5, summary:"ML engineer specialising in LLM fine-tuning and deployment" },
  { first_name:"Isabella",last_name:"Romano",    email:"isabella.romano@gmail.com", phone:"+971 50 345 6789", location:"Dubai, UAE",        current_title:"Operations Manager",          current_company:"DHL",           status:"Not Looking", source:"LinkedIn",   skills:["Supply Chain","Operations","Six Sigma"],  years_experience:8, rating:3, summary:"Ops leader with logistics and process improvement background" },
];

// ── Jobs ──────────────────────────────────────────────────────────────────────
const jobs = [
  { job_title:"Senior Software Engineer",   department:"Engineering",        location:"Dubai, UAE",   work_type:"Hybrid",   employment_type:"Full-time", status:"Open",    priority:"High",   salary_min:25000, salary_max:35000, required_skills:["React","Node.js","TypeScript"],        hiring_manager:"James Harper",   open_date:"2025-01-15", description:"We're looking for a senior full-stack engineer to join our growing product team. You'll architect and build scalable features across the stack, mentor junior engineers, and collaborate closely with product and design." },
  { job_title:"Product Manager",            department:"Product",            location:"Dubai, UAE",   work_type:"On-site",  employment_type:"Full-time", status:"Open",    priority:"High",   salary_min:22000, salary_max:30000, required_skills:["Product Strategy","Agile","Analytics"],  hiring_manager:"Sarah Mitchell", open_date:"2025-01-20", description:"Lead product discovery and delivery for our core platform. Own the roadmap, work with engineering and design, and drive growth through data-informed decisions." },
  { job_title:"Data Scientist",             department:"Data",               location:"Dubai, UAE",   work_type:"Hybrid",   employment_type:"Full-time", status:"Open",    priority:"Medium", salary_min:20000, salary_max:28000, required_skills:["Python","ML","SQL"],                      hiring_manager:"Omar Hassan",    open_date:"2025-02-01", description:"Build and deploy ML models to improve our recommendation engine and personalisation capabilities. Work with large datasets and cross-functional teams." },
  { job_title:"UX Designer",               department:"Design",             location:"Remote",       work_type:"Remote",   employment_type:"Full-time", status:"Open",    priority:"Medium", salary_min:15000, salary_max:22000, required_skills:["Figma","User Research","Prototyping"],    hiring_manager:"Emma Thompson",  open_date:"2025-02-10", description:"Design intuitive product experiences for our B2B platform. Lead user research, create wireframes and prototypes, and collaborate with engineers on implementation." },
  { job_title:"DevOps Engineer",            department:"Infrastructure",     location:"Dubai, UAE",   work_type:"Hybrid",   employment_type:"Full-time", status:"Open",    priority:"High",   salary_min:22000, salary_max:32000, required_skills:["Kubernetes","Docker","CI/CD","AWS"],      hiring_manager:"James Harper",   open_date:"2025-02-15", description:"Own our cloud infrastructure, build CI/CD pipelines, and ensure 99.9% uptime. Experience with Kubernetes and infrastructure-as-code required." },
  { job_title:"Engineering Manager",       department:"Engineering",        location:"Dubai, UAE",   work_type:"On-site",  employment_type:"Full-time", status:"Open",    priority:"Critical",salary_min:35000, salary_max:50000, required_skills:["Engineering Leadership","Microservices"],  hiring_manager:"David Park",     open_date:"2025-02-20", description:"Lead a team of 8 engineers building our core platform. Set technical direction, grow engineers, and partner with product to deliver impactful features." },
  { job_title:"Mobile Developer (iOS/Android)", department:"Engineering",   location:"Dubai, UAE",   work_type:"Hybrid",   employment_type:"Full-time", status:"Open",    priority:"Medium", salary_min:18000, salary_max:26000, required_skills:["React Native","Swift","Kotlin"],          hiring_manager:"Lucas Santos",   open_date:"2025-03-01", description:"Build exceptional mobile experiences for iOS and Android. Own features end-to-end from design collaboration through to App Store release." },
  { job_title:"Marketing Manager",         department:"Marketing",          location:"Dubai, UAE",   work_type:"Hybrid",   employment_type:"Full-time", status:"On Hold", priority:"Low",    salary_min:15000, salary_max:22000, required_skills:["Growth Marketing","SEO","Analytics"],     hiring_manager:"Nadia Okonkwo",  open_date:"2025-01-10", description:"Drive growth through performance marketing, SEO, and content strategy. Own our acquisition funnel and collaborate with sales on pipeline generation." },
  { job_title:"Cloud Architect",           department:"Infrastructure",     location:"Remote",       work_type:"Remote",   employment_type:"Full-time", status:"Filled",  priority:"High",   salary_min:35000, salary_max:48000, required_skills:["AWS","Azure","Architecture"],             hiring_manager:"Ryan O'Brien",   open_date:"2024-11-01", description:"Design and implement our multi-cloud strategy. Ensure security, scalability, and cost optimisation across AWS and Azure." },
  { job_title:"Finance Analyst",           department:"Finance",            location:"Dubai, UAE",   work_type:"On-site",  employment_type:"Full-time", status:"Draft",   priority:"Low",    salary_min:12000, salary_max:18000, required_skills:["Financial Modelling","Excel","Power BI"], hiring_manager:"Yasmin Khalil",  open_date:"2025-03-05", description:"Support the finance team with financial modelling, reporting, and business case development. Partner with department heads on budgeting." },
];

// ── Talent Pools ──────────────────────────────────────────────────────────────
const pools = [
  { pool_name:"Dubai Tech Pipeline",      description:"Pre-screened engineers based in Dubai and Northern Emirates ready for immediate consideration", category:"Engineering", status:"Active", owner:"Recruiter Team", tags:["Dubai","Tech","Active Pipeline"] },
  { pool_name:"Senior Engineering Leaders",description:"VP, Director, and EM-level engineering talent for leadership roles",                           category:"Leadership",  status:"Active", owner:"James Harper",   tags:["Leadership","Engineering","Senior"] },
  { pool_name:"Remote-First Candidates",   description:"Candidates who prefer or require fully remote positions globally",                               category:"Remote",      status:"Active", owner:"Recruiter Team", tags:["Remote","Global","Flexible"] },
  { pool_name:"UAE Nationals (Emiratisation)", description:"UAE national candidates supporting Emiratisation targets",                                  category:"Diversity",   status:"Active", owner:"HR Team",        tags:["UAE National","Emiratisation","Diversity"] },
  { pool_name:"AI/ML Specialists",         description:"Machine learning engineers and data scientists with LLM and MLOps experience",                  category:"Data & AI",   status:"Active", owner:"CTO Office",     tags:["AI","ML","LLM","Data Science"] },
];

// ── Insert records ────────────────────────────────────────────────────────────
let inserted = 0;

// Check existing
const existingPeople = (store.records||[]).filter(r => r.object_id === peopleObj.id && !r.deleted_at);
if (existingPeople.length > 5) {
  console.log(`ℹ️  Already have ${existingPeople.length} people records. Skipping people.`);
} else {
  people.forEach(p => {
    insert('records', { id: uuidv4(), object_id: peopleObj.id, environment_id: env.id, data: p, created_by: 'Demo Seed', created_at: now(), updated_at: now() });
    inserted++;
  });
  console.log(`✅ Created ${people.length} people`);
}

const existingJobs = (store.records||[]).filter(r => r.object_id === jobsObj.id && !r.deleted_at);
if (existingJobs.length > 3) {
  console.log(`ℹ️  Already have ${existingJobs.length} job records. Skipping jobs.`);
} else {
  jobs.forEach(j => {
    insert('records', { id: uuidv4(), object_id: jobsObj.id, environment_id: env.id, data: j, created_by: 'Demo Seed', created_at: now(), updated_at: now() });
    inserted++;
  });
  console.log(`✅ Created ${jobs.length} jobs`);
}

if (poolsObj) {
  const existingPools = (store.records||[]).filter(r => r.object_id === poolsObj.id && !r.deleted_at);
  if (existingPools.length > 1) {
    console.log(`ℹ️  Already have ${existingPools.length} pool records. Skipping pools.`);
  } else {
    pools.forEach(p => {
      insert('records', { id: uuidv4(), object_id: poolsObj.id, environment_id: env.id, data: p, created_by: 'Demo Seed', created_at: now(), updated_at: now() });
      inserted++;
    });
    console.log(`✅ Created ${pools.length} talent pools`);
  }
}

console.log(`\n🎉 Done! Inserted ${inserted} records into environment: ${env.name}`);
console.log('Refresh the browser to see your demo data.');
