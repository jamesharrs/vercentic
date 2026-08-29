// server/seed-demo.js
// Run from vercentic root: node server/seed-demo.js
// Seeds people, jobs, talent pools + generates a CV PDF for each candidate.

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getStore, insert, saveStore, initDB } = require('./db/init');

initDB();
const store = getStore();

const env = store.environments?.find(e => e.is_default) || store.environments?.[0];
if (!env) { console.error('No environment found. Start the server first.'); process.exit(1); }

const peopleObj = store.objects?.find(o => o.slug === 'people' && o.environment_id === env.id);
const jobsObj   = store.objects?.find(o => o.slug === 'jobs'   && o.environment_id === env.id);
const poolsObj  = store.objects?.find(o => o.slug === 'talent-pools' && o.environment_id === env.id);

if (!peopleObj || !jobsObj) {
  console.error('Objects not found. Start the server once first.');
  process.exit(1);
}

const now = () => new Date().toISOString();

// ── People ────────────────────────────────────────────────────────────────────
const people = [
  { first_name:"Sarah",    last_name:"Mitchell",    email:"sarah.mitchell@gmail.com",    phone:"+971 50 123 4567", location:"Dubai, UAE",       current_title:"Senior Software Engineer",   status:"Active",  source:"LinkedIn",  skills:["React","Node.js","TypeScript","AWS"],           years_experience:7,  rating:5 },
  { first_name:"James",    last_name:"Al-Farsi",    email:"james.alfarsi@hotmail.com",   phone:"+971 55 234 5678", location:"Abu Dhabi, UAE",   current_title:"Product Manager",            status:"Passive", source:"Referral",  skills:["Product Strategy","Agile","Analytics"],         years_experience:5,  rating:4 },
  { first_name:"Priya",    last_name:"Sharma",      email:"priya.sharma@outlook.com",    phone:"+971 52 345 6789", location:"Dubai, UAE",       current_title:"Data Scientist",             status:"Active",  source:"Job Board", skills:["Python","ML","SQL","Tableau"],                  years_experience:4,  rating:4 },
  { first_name:"Omar",     last_name:"Hassan",      email:"omar.hassan@gmail.com",       phone:"+971 56 456 7890", location:"Sharjah, UAE",     current_title:"DevOps Engineer",            status:"Active",  source:"LinkedIn",  skills:["Kubernetes","Docker","AWS","Terraform"],         years_experience:6,  rating:4 },
  { first_name:"Fatima",   last_name:"Al-Zaabi",    email:"fatima.alzaabi@yahoo.com",    phone:"+971 50 567 8901", location:"Dubai, UAE",       current_title:"HR Business Partner",        status:"Active",  source:"LinkedIn",  skills:["Talent Acquisition","HRIS","Employment Law"],   years_experience:8,  rating:5 },
  { first_name:"Ahmed",    last_name:"Al-Rashidi",  email:"ahmed.alrashidi@gmail.com",   phone:"+971 55 678 9012", location:"Dubai, UAE",       current_title:"Financial Analyst",          status:"Active",  source:"Referral",  skills:["Financial Modelling","Excel","Power BI"],        years_experience:4,  rating:3 },
  { first_name:"Isabella", last_name:"Romano",      email:"isabella.romano@email.com",   phone:"+44 79 123 4567",  location:"London, UK",       current_title:"UX Designer",                status:"Active",  source:"Dribbble",  skills:["Figma","User Research","Prototyping"],           years_experience:5,  rating:5 },
  { first_name:"Marcus",   last_name:"Williams",    email:"marcus.w@protonmail.com",     phone:"+971 52 789 0123", location:"Dubai, UAE",       current_title:"Sales Director",             status:"Passive", source:"LinkedIn",  skills:["B2B Sales","CRM","Negotiation","Enterprise"],   years_experience:10, rating:4 },
  { first_name:"Aisha",    last_name:"Khalid",      email:"aisha.khalid@gmail.com",      phone:"+971 56 890 1234", location:"Dubai, UAE",       current_title:"Marketing Manager",          status:"Active",  source:"Job Board", skills:["Digital Marketing","SEO","Google Ads","HubSpot"],years_experience:6,  rating:4 },
  { first_name:"David",    last_name:"Park",        email:"david.park@outlook.com",      phone:"+82 10 1234 5678", location:"Seoul, South Korea",current_title:"Backend Engineer",          status:"Active",  source:"GitHub",    skills:["Go","Python","PostgreSQL","Kafka"],              years_experience:7,  rating:4 },
  { first_name:"Nadia",    last_name:"Al-Marzouqi", email:"nadia.marzouqi@gmail.com",   phone:"+971 50 901 2345", location:"Abu Dhabi, UAE",   current_title:"Legal Counsel",              status:"Passive", source:"Referral",  skills:["Corporate Law","Contract Review","DIFC"],        years_experience:9,  rating:5 },
  { first_name:"Tom",      last_name:"Richardson",  email:"tom.r@gmail.com",             phone:"+44 77 234 5678",  location:"Manchester, UK",   current_title:"Cloud Architect",            status:"Active",  source:"LinkedIn",  skills:["AWS","Azure","Terraform","Architecture"],         years_experience:11, rating:5 },
  { first_name:"Zara",     last_name:"Ahmed",       email:"zara.ahmed@email.com",        phone:"+971 55 012 3456", location:"Dubai, UAE",       current_title:"Operations Manager",         status:"Active",  source:"Job Board", skills:["Supply Chain","Process Improvement","ERP"],      years_experience:7,  rating:3 },
  { first_name:"Lucas",    last_name:"Fernandez",   email:"lucas.f@gmail.com",           phone:"+34 61 234 5678",  location:"Madrid, Spain",    current_title:"Growth Hacker",              status:"Active",  source:"AngelList", skills:["Growth","A/B Testing","Analytics","SQL"],        years_experience:4,  rating:4 },
  { first_name:"Hana",     last_name:"Yamamoto",    email:"hana.yamamoto@email.com",     phone:"+81 90 1234 5678", location:"Tokyo, Japan",     current_title:"Product Designer",           status:"Active",  source:"Behance",   skills:["Figma","Design Systems","Accessibility"],        years_experience:6,  rating:4 },
  { first_name:"Khalid",   last_name:"Al-Sayed",    email:"khalid.sayed@gmail.com",      phone:"+971 56 123 4567", location:"Dubai, UAE",       current_title:"Investment Analyst",         status:"Passive", source:"LinkedIn",  skills:["Investment Analysis","Excel","Bloomberg","CFA"], years_experience:5,  rating:4 },
  { first_name:"Sophie",   last_name:"Martin",      email:"sophie.martin@gmail.com",     phone:"+33 61 234 5678",  location:"Paris, France",    current_title:"Digital Marketing Lead",     status:"Active",  source:"LinkedIn",  skills:["Content Strategy","Social Media","HubSpot"],     years_experience:6,  rating:3 },
  { first_name:"Arjun",    last_name:"Patel",       email:"arjun.patel@outlook.com",     phone:"+971 52 234 5678", location:"Dubai, UAE",       current_title:"Full Stack Developer",       status:"Active",  source:"Job Board", skills:["React","Django","PostgreSQL","Docker"],           years_experience:5,  rating:4 },
  { first_name:"Layla",    last_name:"Al-Mansouri", email:"layla.almansouri@gmail.com",  phone:"+971 55 345 6789", location:"Dubai, UAE",       current_title:"People & Culture Manager",   status:"Active",  source:"LinkedIn",  skills:["Employer Branding","L&D","HRIS","Coaching"],     years_experience:8,  rating:5 },
  { first_name:"Sadhil",   last_name:"Kulkarni",    email:"sadhil.kulkarni@email.com",   phone:"+971 56 456 7890", location:"Bangalore, India", current_title:"Solutions Architect",        status:"Active",  source:"Referral",  skills:["AWS","Microservices","System Design","Java"],    years_experience:9,  rating:4 },
];

// ── Jobs ──────────────────────────────────────────────────────────────────────
const jobs = [
  { job_title:"Senior React Developer",    department:"Engineering", location:"Dubai, UAE",    work_type:"Hybrid",  employment_type:"Full-time",  status:"Open",    priority:"High",     salary_min:25000, salary_max:35000, required_skills:["React","TypeScript","Node.js"],   hiring_manager:"Sarah Al-Amin",    open_date:"2025-01-10" },
  { job_title:"Product Manager",           department:"Product",     location:"Dubai, UAE",    work_type:"On-site", employment_type:"Full-time",  status:"Open",    priority:"High",     salary_min:22000, salary_max:30000, required_skills:["Product Strategy","Agile"],       hiring_manager:"James Harrington", open_date:"2025-01-15" },
  { job_title:"Data Engineer",             department:"Data",        location:"Abu Dhabi, UAE", work_type:"On-site",employment_type:"Full-time",  status:"Open",    priority:"Medium",   salary_min:20000, salary_max:28000, required_skills:["Python","SQL","Spark"],            hiring_manager:"Priya Mehta",      open_date:"2025-01-20" },
  { job_title:"UX Designer",               department:"Design",      location:"Remote",         work_type:"Remote", employment_type:"Full-time",  status:"Open",    priority:"Medium",   salary_min:18000, salary_max:25000, required_skills:["Figma","User Research"],            hiring_manager:"Lisa Chen",        open_date:"2025-02-01" },
  { job_title:"DevOps Engineer",           department:"Engineering", location:"Dubai, UAE",    work_type:"Hybrid",  employment_type:"Full-time",  status:"Open",    priority:"High",     salary_min:22000, salary_max:32000, required_skills:["AWS","Kubernetes","Terraform"],    hiring_manager:"Mark Thompson",    open_date:"2025-02-05" },
  { job_title:"HR Business Partner",       department:"HR",          location:"Dubai, UAE",    work_type:"On-site", employment_type:"Full-time",  status:"Open",    priority:"Medium",   salary_min:18000, salary_max:25000, required_skills:["HR Strategy","Employee Relations"],hiring_manager:"Anna Williams",    open_date:"2025-02-10" },
  { job_title:"Financial Controller",      department:"Finance",     location:"Dubai, UAE",    work_type:"On-site", employment_type:"Full-time",  status:"On Hold", priority:"Low",      salary_min:30000, salary_max:40000, required_skills:["IFRS","Financial Reporting"],      hiring_manager:"Yasmin Khalil",    open_date:"2025-01-25" },
  { job_title:"Sales Director — MENA",     department:"Sales",       location:"Dubai, UAE",    work_type:"Hybrid",  employment_type:"Full-time",  status:"Open",    priority:"Critical", salary_min:35000, salary_max:50000, required_skills:["B2B Sales","Enterprise","CRM"],    hiring_manager:"James Harrington", open_date:"2025-02-15" },
  { job_title:"Cloud Solutions Architect", department:"Engineering", location:"Dubai, UAE",    work_type:"Hybrid",  employment_type:"Full-time",  status:"Open",    priority:"High",     salary_min:30000, salary_max:42000, required_skills:["AWS","Architecture","Security"],   hiring_manager:"Sarah Al-Amin",    open_date:"2025-02-20" },
  { job_title:"Finance Analyst",           department:"Finance",     location:"Dubai, UAE",    work_type:"On-site", employment_type:"Full-time",  status:"Draft",   priority:"Low",      salary_min:12000, salary_max:18000, required_skills:["Financial Modelling","Excel"],      hiring_manager:"Yasmin Khalil",    open_date:"2025-03-05" },
];

// ── Talent Pools ──────────────────────────────────────────────────────────────
const pools = [
  { pool_name:"Dubai Tech Pipeline",        description:"Pre-screened engineers in Dubai ready for immediate consideration", category:"Engineering", status:"Active" },
  { pool_name:"Senior Engineering Leaders", description:"VP, Director and EM-level engineering talent for leadership roles",  category:"Leadership",  status:"Active" },
  { pool_name:"Remote-First Candidates",    description:"Candidates who prefer or require fully remote positions globally",    category:"Remote",      status:"Active" },
  { pool_name:"UAE Nationals",              description:"UAE national candidates supporting Emiratisation targets",             category:"Diversity",   status:"Active" },
  { pool_name:"AI/ML Specialists",          description:"ML engineers and data scientists with LLM and MLOps experience",      category:"Data & AI",   status:"Active" },
];

// ── Insert records ────────────────────────────────────────────────────────────
let inserted = 0;
const seededPeopleRecords = [];

const existingPeople = (store.records||[]).filter(r => r.object_id === peopleObj.id && !r.deleted_at);
if (existingPeople.length > 5) {
  console.log(`ℹ️  Already have ${existingPeople.length} people. Skipping — will still generate missing CVs.`);
  seededPeopleRecords.push(...existingPeople);
} else {
  people.forEach(p => {
    const rec = { id:uuidv4(), object_id:peopleObj.id, environment_id:env.id, data:p, created_by:'Demo Seed', created_at:now(), updated_at:now() };
    insert('records', rec);
    seededPeopleRecords.push(rec);
    inserted++;
  });
  console.log(`✅  Created ${people.length} people`);
}

const existingJobs = (store.records||[]).filter(r => r.object_id === jobsObj.id && !r.deleted_at);
if (existingJobs.length > 3) {
  console.log(`ℹ️  Already have ${existingJobs.length} jobs. Skipping jobs.`);
} else {
  jobs.forEach(j => {
    insert('records', { id:uuidv4(), object_id:jobsObj.id, environment_id:env.id, data:j, created_by:'Demo Seed', created_at:now(), updated_at:now() });
    inserted++;
  });
  console.log(`✅  Created ${jobs.length} jobs`);
}

if (poolsObj) {
  const existingPools = (store.records||[]).filter(r => r.object_id === poolsObj.id && !r.deleted_at);
  if (existingPools.length > 1) {
    console.log(`ℹ️  Already have ${existingPools.length} pools. Skipping pools.`);
  } else {
    pools.forEach(p => {
      insert('records', { id:uuidv4(), object_id:poolsObj.id, environment_id:env.id, data:p, created_by:'Demo Seed', created_at:now(), updated_at:now() });
      inserted++;
    });
    console.log(`✅  Created ${pools.length} talent pools`);
  }
}

// ── CV PDF generation ─────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!store.attachments) store.attachments = [];
if (!store.file_types)  store.file_types  = [];

// Find or create CV file type
let cvFileType = store.file_types.find(t =>
  t.name?.toLowerCase().includes('cv') || t.name?.toLowerCase().includes('resume')
);
if (!cvFileType) {
  cvFileType = {
    id:uuidv4(), name:'CV / Resume', slug:'cv_resume', color:'#5B5BD6',
    icon:'file-text', allowed_formats:['pdf','doc','docx'],
    parse_cv:true, extract_enabled:false, mappings:[], created_at:now(),
  };
  store.file_types.push(cvFileType);
}

let cvCreated = 0, cvSkipped = 0;
for (const person of seededPeopleRecords) {
  const alreadyHasCV = store.attachments.some(a =>
    a.record_id === person.id &&
    (a.file_type_id === cvFileType.id || a.file_type_name?.toLowerCase().includes('cv'))
  );
  if (alreadyHasCV) { cvSkipped++; continue; }

  const d = person.data || {};
  const displayName = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Candidate';
  const safeName    = displayName.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    const pdfBuffer = generateCVPdf(person);
    const filename  = `cv_${Date.now()}_${uuidv4().slice(0,8)}_${safeName}.pdf`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), pdfBuffer);
    store.attachments.push({
      id:uuidv4(), record_id:person.id, environment_id:person.environment_id||env.id,
      name:`CV - ${displayName}.pdf`, filename, size:pdfBuffer.length,
      mimetype:'application/pdf', ext:'pdf',
      file_type_id:cvFileType.id, file_type_name:'CV / Resume',
      url:`/api/attachments/file/${filename}`,
      uploaded_by:'Demo Seed',
      created_at:new Date(Date.now() - Math.random()*14*86400000).toISOString(),
    });
    cvCreated++;
    process.stdout.write(`\r  Generating CVs: ${cvCreated} done...`);
  } catch(e) {
    console.warn(`\n  ⚠  CV failed for ${displayName}: ${e.message}`);
  }
}

saveStore();
if (cvCreated > 0) console.log(`\n✅  Generated ${cvCreated} CV PDFs`);
if (cvSkipped > 0) console.log(`ℹ️  Skipped ${cvSkipped} (already had CVs)`);
console.log(`\n🎉  Done! ${inserted} records + ${cvCreated} CVs → environment: ${env.name}`);
console.log('   Open any People record → Files tab to see the CV.');
console.log('   Use the "Parse CV" button to extract fields automatically.');

// ── PDF helpers (pure Node, no deps) ─────────────────────────────────────────
function generateCVPdf(person) {
  const d       = person.data || {};
  const name    = [d.first_name,d.last_name].filter(Boolean).join(' ') || 'Candidate';
  const email   = d.email || `${(d.first_name||'candidate').toLowerCase()}@email.com`;
  const phone   = d.phone || '+971 50 000 0000';
  const loc     = d.location || 'Dubai, UAE';
  const title   = d.current_title || 'Professional';
  const years   = d.years_experience || 5;
  const skills  = Array.isArray(d.skills) ? d.skills.slice(0,8).join(', ') : (d.skills||'Leadership, Communication');
  const summary = `Experienced ${title} with ${years} years of expertise. `+
    `${name} delivers results through a collaborative, data-driven approach and a strong track record in their field.`;

  const COS = ['GlobalCorp','TechVentures','Accenture','Deloitte','PwC','IBM','Oracle'];
  const companies = [
    [title,        `${COS[Math.floor(Math.random()*COS.length)]} Dubai`, '2022 – Present', `Lead key initiatives and manage cross-functional teams in ${d.department||'the business'}.`],
    ['Senior Manager','Advisory Group MENA','2019 – 2022','Delivered strategic recommendations and managed client engagements across the region.'],
    ['Analyst','Consulting Partners','2016 – 2019','Provided analysis and insights to support executive decision-making.'],
  ].slice(0, years > 6 ? 3 : 2);

  const DEGS=['Bachelor of Business Administration','Master of Science','Bachelor of Engineering','MBA'];
  const UNIS=['University of Dubai','American University of Sharjah','INSEAD','London Business School','IE Business School'];
  const degree = DEGS[Math.floor(Math.random()*DEGS.length)];
  const uni    = UNIS[Math.floor(Math.random()*UNIS.length)];
  const gradYr = 2024 - years - 2;

  const items = [
    { text:name,  x:50, y:760, size:22, bold:true },
    { text:title, x:50, y:737, size:13, color:'0.35 0.35 0.84' },
    { text:`${email}  |  ${phone}  |  ${loc}`, x:50, y:719, size:10 },
    { line:true, x1:50, y1:709, x2:545, y2:709 },
    { text:'PROFESSIONAL SUMMARY', x:50, y:697, size:10, bold:true },
    ...wrap(summary,90).map((l,i)=>({ text:l, x:50, y:683-i*13, size:10 })),
    { line:true, x1:50, y1:648, x2:545, y2:648 },
    { text:'CORE SKILLS',              x:50, y:636, size:10, bold:true },
    { text:skills,                     x:50, y:622, size:10 },
    { line:true, x1:50, y1:611, x2:545, y2:611 },
    { text:'PROFESSIONAL EXPERIENCE',  x:50, y:599, size:10, bold:true },
    ...companies.flatMap(([r,co,dt,desc],i)=>{
      const y = 583 - i*72;
      return [
        { text:r,  x:50,  y,     size:11, bold:true },
        { text:co, x:50,  y:y-14,  size:10, color:'0.35 0.35 0.84' },
        { text:dt, x:390, y,     size:9,  color:'0.5 0.5 0.5' },
        ...wrap(desc,85).map((l,j)=>({ text:l, x:50, y:y-28-j*12, size:9.5 })),
      ];
    }),
    { line:true, x1:50, y1:358, x2:545, y2:358 },
    { text:'EDUCATION',    x:50,  y:346, size:10, bold:true },
    { text:degree,         x:50,  y:330, size:11, bold:true },
    { text:uni,            x:50,  y:316, size:10, color:'0.35 0.35 0.84' },
    { text:`Graduated ${gradYr}`, x:390, y:330, size:9, color:'0.5 0.5 0.5' },
    { text:`References available on request  ·  ${years} years professional experience`, x:50, y:40, size:8, color:'0.6 0.6 0.6' },
  ];
  return buildPdf(items);
}

function wrap(text, max) {
  const words=text.split(' '); const lines=[]; let cur='';
  for(const w of words){
    if((cur+' '+w).trim().length>max){if(cur)lines.push(cur.trim());cur=w;}
    else cur=(cur+' '+w).trim();
  }
  if(cur)lines.push(cur.trim());
  return lines;
}

function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}

function buildPdf(items) {
  // Build content stream
  let stream = 'q\n1 1 1 rg\n0 0 595 842 re\nf\nQ\n';
  for (const it of items) {
    if (it.line) { stream += `q\n0.75 0.75 0.75 RG\n0.5 w\n${it.x1} ${it.y1} m\n${it.x2} ${it.y2} l\nS\nQ\n`; continue; }
    const { text='', x=50, y=700, size=10, bold, color } = it;
    stream += `BT\n/${bold?'F2':'F1'} ${size} Tf\n${color||'0 0 0'} rg\n${x} ${y} Td\n(${esc(text)}) Tj\nET\n`;
  }

  // Build all objects with sequential IDs — no reserved slots
  const streamLen = Buffer.byteLength(stream, 'latin1');
  const defs = [
    `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,               // 1: content
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`, // 2: F1
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`, // 3: F2
    `<< /Font << /F1 2 0 R /F2 3 0 R >> >>`,                                 // 4: resources
    `<< /Type /Pages /Kids [6 0 R] /Count 1 >>`,                              // 5: pages
    `<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Contents 1 0 R /Resources 4 0 R >>`, // 6: page
    `<< /Type /Catalog /Pages 5 0 R >>`,                                       // 7: catalog
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0]; // 1-indexed
  for (let i = 0; i < defs.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i+1} 0 obj\n${defs[i]}\nendobj\n`;
  }

  const xrefPos = pdf.length;
  const total = defs.length + 1; // +1 for free entry
  pdf += `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) {
    pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${total} /Root 7 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
