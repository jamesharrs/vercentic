require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB, getStore } = require('./db/init');
const tenantMiddleware = require('./middleware/tenant');
const { attachUser, seedDefaultPermissions } = require('./middleware/rbac');
const { auditResponseMiddleware } = require('./middleware/security-audit');

const app = express();

// CORS — allow localhost dev + Vercel deployments + custom domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  /\.vercel\.app$/,
  /\.talentos\.io$/,    // wildcard tenant subdomains
  /\.vercentic\.com$/,  // custom domain
  'https://vercentic.com',
  'https://www.vercentic.com',
];
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim()));
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / server-to-server
    const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    cb(ok ? null : new Error('CORS'), ok);
  },
  credentials: true,
}));
if (process.env.CLIENT_URL)  allowedOrigins.push(process.env.CLIENT_URL);
if (process.env.PORTAL_URL)  allowedOrigins.push(process.env.PORTAL_URL);
allowedOrigins.push('https://talentos-production-4045.up.railway.app');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / server-to-server
    const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    cb(ok ? null : new Error('CORS'), ok);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Tenant isolation middleware ────────────────────────────────────────────────
// Must come before all routes. Sets AsyncLocalStorage context so getStore()
// returns the correct tenant's isolated data store for each request.
// Tenant is resolved from: X-Tenant-Slug header → subdomain → master (default)
app.use(tenantMiddleware);
app.use(attachUser); // attach current user to every request (non-blocking)
app.use(auditResponseMiddleware); // log all 403 responses to security audit

// ── Global auth guard ─────────────────────────────────────────────────────────
// All /api/* routes require authentication EXCEPT public endpoints.
// Note: req.path inside app.use('/api', ...) is stripped of the /api prefix
const AUTH_EXEMPT_PATHS = [
  '/auth/login', '/auth/me',          // auth routes in auth.js
  '/users/login', '/users/auth/login', // login in users.js
  '/health',                           // health check
  '/environments',                     // needed before login to resolve tenant
  '/portals/public',                   // public portal renderer + application status
  '/portals/slug',                     // public portal slug lookup (career sites etc.)
  '/portal-analytics',
  '/portal-feedback',                 // analytics tracking from public portals (unauthenticated)
  '/superadmin',                       // super admin console
  '/bot',                              // bot/interview routes (public)
  '/tenant-reset',                     // tenant data reset (password protected)
  '/cleanup-seeds',                    // one-shot seed data cleanup
  '/seed-dashboards',                  // one-shot dashboard seed
  '/error-logs',                       // allow error reporting without auth
  '/ai',                               // AI proxy — session user is optional, key is server-side
  '/translate',                        // translation proxy
];
app.use('/api', (req, res, next) => {
  // Skip for exempt prefixes
  if (AUTH_EXEMPT_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();
  // Skip portal apply + objects/records endpoints (public — unauthenticated portal visitors)
  if (req.path.match(/^\/portals\/[^/]+\/apply$/)) return next();
  // Objects + records + fields + saved-views are read-only and needed by portal job widgets
  if (req.method === 'GET' && (req.path.startsWith('/objects') || req.path.startsWith('/records') || req.path.startsWith('/fields') || req.path.startsWith('/saved-views') || req.path.startsWith('/company-documents/search') || req.path.startsWith('/company-documents/meta'))) return next();
  // Skip OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') return next();
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  }
  next();
});

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/security-audit', require('./routes/security_audit'));
app.use('/api/field-visibility', require('./routes/field_visibility'));
app.use('/api/environments', require('./routes/environments'));
app.use('/api/objects',      require('./routes/objects'));
app.use('/api/fields',       require('./routes/fields'));
app.use('/api/records',      require('./routes/records'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/roles',        require('./routes/roles'));
app.use('/api/org-units',      require('./routes/org_units'));
app.use('/api/relationships',  require('./routes/relationships'));
app.use('/api/security',     require('./routes/security'));
app.use('/api/notes',        require('./routes/notes'));
app.use('/api/attachments',  require('./routes/attachments'));
app.use('/api/ai',           require('./routes/ai-proxy'));
app.use('/api/csv',          require('./routes/csv'));
app.use('/api/workflows',    require('./routes/workflows'));
app.use('/api/portals',          require('./routes/portals'));
app.use('/api/portal-feedback', require('./routes/portal_feedback'));
app.use('/api/portal-analytics', require('./routes/portal_analytics'));
app.use('/api/email-builder',     require('./routes/email_builder'));
app.use('/api/brand-kits',       require('./routes/brand_kits'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/groups',       require('./routes/groups'));
app.use('/api/saved-views',      require('./routes/saved_views'));
app.use('/api/sandboxes', require('./routes/sandbox'));
app.use('/api/config',           require('./routes/config'));
app.use('/api/bot',              require('./routes/bot'));
app.use('/api/interview-types',  require('./routes/interview_types'));
app.use('/api/interview-coordinator', require('./routes/interview_coordinator'));
app.use('/api/interviews',       require('./routes/interviews'));
app.use('/api/calendar',         require('./routes/calendar'));
app.use('/api/translate',          require('./routes/translate'));
app.use('/api/admin',              require('./routes/admin_dashboard').router);
app.use('/api/superadmin',         require('./routes/superadmin'));
app.use('/api/superadmin/clients', require('./routes/superadmin_clients'));
app.use('/api/superadmin/demo',    require('./routes/demo_seed'));
app.use('/api/tenant-reset',       require('./routes/admin_reset'));

// One-shot seed data cleanup — password protected
app.post('/api/cleanup-seeds', (req, res) => {
  const pw = req.query.pw || req.body?.pw;
  if (pw !== 'talentos-internal-2026') return res.status(401).json({ error: 'bad password' });
  const store = getStore();
  const { saveStore } = require('./db/init');
  const results = {};
  const seedPatterns = ['seed', 'demo', 'test-data'];
  const isSeeded = (r) => { const c = (r.created_by||'').toLowerCase(); return seedPatterns.some(p => c.includes(p)); };
  (store.records || []).forEach(r => {
    if (!r.deleted_at && isSeeded(r)) {
      r.deleted_at = new Date().toISOString();
      const objName = r.object_id;
      results[objName] = (results[objName] || 0) + 1;
    }
  });
  saveStore();
  res.json({ deleted: results, total: Object.values(results).reduce((a,b)=>a+b, 0) });
});

// One-shot dashboard seed — password protected, idempotent
app.post('/api/seed-dashboards', (req, res) => {
  const pw = req.query.pw || req.body?.pw;
  if (pw !== 'talentos-internal-2026') return res.status(401).json({ error: 'bad password' });
  const { getStore, saveStore, insert } = require('./db/init');
  const { v4: uuidv4 } = require('uuid');
  const store = getStore();
  const ENV_ID    = 'c0c64e3b-113d-48b8-bc3c-684769849742';
  const PEOPLE_OBJ = store.objects?.find(o => o.slug === 'people' && o.environment_id === ENV_ID)?.id;
  const JOBS_OBJ   = store.objects?.find(o => o.slug === 'jobs'   && o.environment_id === ENV_ID)?.id;
  if (!PEOPLE_OBJ) return res.status(404).json({ error: 'People object not found for Production env' });
  const existing = { interviews: (store.interviews||[]).filter(i=>i.environment_id===ENV_ID).length, offers: (store.offers||[]).filter(o=>o.environment_id===ENV_ID).length };
  if (existing.interviews >= 15 && existing.offers >= 10) return res.json({ skipped: true, existing });
  const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const dOff=d=>new Date(Date.now()-d*86400000).toISOString(), dAhead=d=>new Date(Date.now()+d*86400000).toISOString();
  const FIRST=['James','Sarah','Priya','Ahmed','Emma','Marcus','Lila','Omar','Zoe','Raj','Fatima','Alex','Nina','Carlos','Aisha'];
  const LAST=['Harrison','Chen','Patel','Al-Rashidi','Johnson','Williams','Santos','Hassan','Kim','Sharma'];
  const TITLES=['Software Engineer','Product Manager','UX Designer','Data Analyst','DevOps Engineer','Marketing Manager','HR Business Partner','Sales Executive'];
  const DEPTS=['Engineering','Product','Design','Data','Operations','Marketing','HR','Sales'];
  const SOURCES=['LinkedIn','Indeed','Referral','Direct','Glassdoor','Agency'];
  const LOCS=['Dubai, UAE','Abu Dhabi, UAE','London, UK','New York, USA','Singapore'];
  const SCREEN=['Applied','Screening','Pending Review','Reviewed','Shortlisted'];
  const AI_RES=['approved','approved','rejected','pending',null,null];
  const INT_T=['Phone Screen','Video Interview','Technical Assessment','Panel Interview','Final Interview'];
  const FMTS=['video','phone','in_person','panel'];
  const OUT=['Strong Yes','Yes','Yes','No','Strong No'];
  const OFF_S=['draft','pending_approval','sent','sent','accepted','accepted','accepted','declined'];
  // Get existing people
  const people = (store.records||[]).filter(r=>r.object_id===PEOPLE_OBJ&&!r.deleted_at);
  const jobs   = JOBS_OBJ ? (store.records||[]).filter(r=>r.object_id===JOBS_OBJ&&!r.deleted_at) : [];
  const added = { people:0, interviews:0, offers:0 };
  // Add people if thin
  const newPeople = [];
  for (let i=0; i<Math.max(0, 20-people.length); i++) {
    const fn=pick(FIRST), ln=pick(LAST), id=uuidv4();
    insert('records',{ id, object_id:PEOPLE_OBJ, environment_id:ENV_ID, created_by:'seed', created_at:dOff(rnd(1,45)), updated_at:new Date().toISOString(), data:{ first_name:fn, last_name:ln, email:`${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`, current_title:pick(TITLES), department:pick(DEPTS), location:pick(LOCS), source:pick(SOURCES), status:pick(SCREEN), ai_screening_result:pick(AI_RES), years_experience:rnd(1,12), rating:rnd(2,5), person_type:'Candidate' } });
    newPeople.push({ id, data:{ first_name:fn, last_name:ln } }); added.people++;
  }
  const allPeople = [...people, ...newPeople];
  // Interviews
  for (let i=0; i<Math.max(0, 25-existing.interviews); i++) {
    const p=pick(allPeople), j=jobs.length?pick(jobs):null, daysOff=rnd(-21,28), isPast=daysOff<0;
    const status=isPast?pick(['completed','completed','cancelled']):'scheduled';
    const intDate=new Date(Date.now()+daysOff*86400000).toISOString().slice(0,10);
    insert('interviews',{ id:uuidv4(), environment_id:ENV_ID, candidate_id:p?.id, candidate_name:`${p?.data?.first_name||''} ${p?.data?.last_name||''}`.trim()||'Candidate', job_id:j?.id||null, job_title:j?.data?.job_title||j?.data?.title||pick(TITLES), type_name:pick(INT_T), date:intDate, time:`${rnd(9,17).toString().padStart(2,'0')}:00`, duration_minutes:pick([30,45,60]), format:pick(FMTS), status, outcome:status==='completed'?pick(OUT):null, notes:status==='completed'?'Completed.':null, created_at:dOff(rnd(1,30)), updated_at:new Date().toISOString() });
    added.interviews++;
  }
  // Offers
  for (let i=0; i<Math.max(0, 18-existing.offers); i++) {
    const p=pick(allPeople), j=jobs.length?pick(jobs):null, status=pick(OFF_S), sal=rnd(60,200)*1000;
    const startDate=dAhead(rnd(14,90));
    insert('offers',{ id:uuidv4(), environment_id:ENV_ID, candidate_id:p?.id, candidate_name:`${p?.data?.first_name||''} ${p?.data?.last_name||''}`.trim()||'Candidate', job_id:j?.id||null, job_title:j?.data?.job_title||j?.data?.title||pick(TITLES), status, currency:'USD', base_salary:sal, bonus:Math.round(sal*0.1), start_date:startDate, expiry_date:dAhead(rnd(7,21)), approvers:[], notes:'Seeded.', data:{ start_date:startDate, docs_status:status==='accepted'?pick(['complete','pending']):'pending', job_title:j?.data?.job_title||pick(TITLES) }, created_at:dOff(rnd(1,45)), updated_at:new Date().toISOString() });
    added.offers++;
  }
  saveStore();
  res.json({ ok:true, added, totals:{ interviews:(store.interviews||[]).filter(i=>i.environment_id===ENV_ID).length, offers:(store.offers||[]).filter(o=>o.environment_id===ENV_ID).length, people:allPeople.length } });
});

app.use('/api/cv-parse',           require('./routes/cv_parse'));
app.use('/api/doc-extract',        require('./routes/doc_extract'));
app.use('/api/forms',              require('./routes/forms'));
app.use('/api/agents',             require('./routes/agents'));
app.use('/api/ai-interview',       require('./routes/ai_interview'));
app.use('/api/ai-interview',       require('./routes/ai_interview'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/records', require('./routes/suggested_actions'));
app.use('/api/data-import',    require('./routes/data_import'));
app.use('/api/records',          require('./routes/bulk_actions'));
app.use('/api/screening',        require('./routes/screening'));
app.use('/api/duplicates',         require('./routes/duplicates'));
app.use('/api/records', require('./routes/suggested_actions'));
app.use('/api/duplicates',         require('./routes/duplicates'));
app.use('/api/offers',             require('./routes/offers'));
const { router: flowsRouter, initScheduler } = require('./routes/flows');
app.use('/api/flows', flowsRouter);
app.use('/api/cases',              require('./routes/cases'));
app.use('/api/release-notes',      require('./routes/release_notes'));
app.use('/api/error-logs',         require('./routes/error_logs'));
app.use('/api/company-research',   require('./routes/company_research'));
app.use('/api/company-documents',  require('./routes/company_documents'));
app.use('/api/rpo-clients',        require('./routes/rpo_clients'));
app.use('/api/question-bank',      require('./routes/question_bank'));
app.use('/api/ai-interview',       require('./routes/ai_interview'));
app.use('/api/comms',            require('./routes/communications'));
app.use('/api/inbox',            require('./routes/inbox'));
app.use('/api/email-templates',  require('./routes/email-templates'));
app.use('/api/integrations',     require('./routes/integrations'));
app.use('/api/connector-actions', require('./routes/connector_actions'));
app.use('/api/enterprise',       require('./routes/enterprise_settings'));
app.use('/api/skills-intel',     require('./routes/skills_intelligence'));
app.use('/api/skills-import',    require('./routes/skills_import'));
app.use('/api/datasets',         require('./routes/datasets'));
app.use('/api/webhooks',          require('./routes/webhooks'));
// Run migrations for new modules
require('./routes/enterprise_settings').migrate();
require('./routes/skills_intelligence').migrate();
require('./routes/datasets').migrate();

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.4.2', build: 'demo-seed-fix' }));

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  const store = getStore();
  const fs = require('fs'), path = require('path');
  let dirty = false;
  if (!store.notes)       { store.notes = [];       dirty = true; }
  if (!store.attachments) { store.attachments = []; dirty = true; }
  if (!store.portals)     { store.portals = [];     dirty = true; }
  if (!store.workflows)   { store.workflows = [];   dirty = true; }
  if (!store.communications)   { store.communications = [];   dirty = true; }
  if (!store.email_templates)  { store.email_templates = [];  dirty = true; }
  if (!store.integrations)     { store.integrations = {};     dirty = true; }
  // Question bank v2 (standalone, separate from bot.js question_bank)
  if (!store.question_bank_v2) {
    const DEFAULT_QUESTIONS = [
      { id:'kq1', type:'knockout', competency:'eligibility', text:'Are you currently eligible to work in the country where this role is based?', options:['Yes','No'], pass_value:'Yes', weight:10, tags:['right-to-work'], is_system:true, created_at:new Date().toISOString() },
      { id:'kq2', type:'knockout', competency:'availability', text:'Can you start within the timeframe required for this role?', options:['Yes','No','Negotiable'], pass_value:null, weight:5, tags:['availability'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq1', type:'competency', competency:'leadership', text:'Tell me about a time you led a team through a challenging project. What was your approach and what was the outcome?', weight:15, tags:['leadership','management'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq2', type:'competency', competency:'problem_solving', text:'Describe a complex problem you encountered at work. How did you break it down and what steps did you take to resolve it?', weight:15, tags:['problem-solving'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq3', type:'competency', competency:'communication', text:'Give an example of a time you had to communicate difficult news to a stakeholder. How did you approach it?', weight:10, tags:['communication'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq4', type:'competency', competency:'adaptability', text:'Tell me about a time when priorities changed unexpectedly. How did you respond and what was the result?', weight:10, tags:['adaptability'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq5', type:'competency', competency:'collaboration', text:'Describe a situation where you had to work closely with someone whose working style differed significantly from yours.', weight:10, tags:['teamwork'], is_system:true, created_at:new Date().toISOString() },
      { id:'tq1', type:'technical', competency:'technical_depth', text:'Walk me through your approach to a recent technical challenge in your current or most recent role.', weight:20, tags:['technical'], is_system:true, created_at:new Date().toISOString() },
      { id:'tq2', type:'technical', competency:'technical_breadth', text:'What technologies or tools do you consider yourself most proficient in, and how have you applied them recently?', weight:15, tags:['technical','skills'], is_system:true, created_at:new Date().toISOString() },
      { id:'cq1', type:'culture', competency:'values', text:'What type of working environment helps you do your best work?', weight:10, tags:['culture','fit'], is_system:true, created_at:new Date().toISOString() },
      { id:'cq2', type:'culture', competency:'motivation', text:'What excites you most about this opportunity, and where do you see yourself in three years?', weight:10, tags:['motivation'], is_system:true, created_at:new Date().toISOString() },
      { id:'cq3', type:'culture', competency:'feedback', text:'How do you prefer to give and receive feedback in a professional setting?', weight:10, tags:['feedback'], is_system:true, created_at:new Date().toISOString() },
    ];
    store.question_bank_v2 = DEFAULT_QUESTIONS;
    dirty = true;
  }
  if (!store.question_templates) {
    store.question_templates = [
      { id:'tpl_standard', name:'Standard Interview', description:'Balanced set covering knockout, competency, and culture', category:'General', question_ids:['kq1','kq2','bq1','bq2','cq1','cq2'], is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_technical', name:'Technical Role', description:'Eligibility + deep technical + problem solving', category:'Technology', question_ids:['kq1','kq2','tq1','tq2','bq2','bq5'], is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_leadership', name:'Leadership Role', description:'Leadership, communication and collaboration focus', category:'Management', question_ids:['kq1','bq1','bq3','bq5','cq2','cq3'], is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_culture', name:'Culture & Values', description:'Values alignment and working style fit', category:'Culture', question_ids:['bq4','bq5','cq1','cq2','cq3'], is_system:true, created_at:new Date().toISOString() },
    ];
    dirty = true;
  }
  if (!store.job_questions) { store.job_questions = []; dirty = true; }
  seedDefaultPermissions(store);
  if (!store.error_logs)  { store.error_logs = [];  dirty = true; }
  if (!store.notifications) {    const now = new Date();
    const ago = (mins) => new Date(now - mins*60000).toISOString();
    store.notifications = [
      { id:'n1', type:'message_reply',    title:'Reply from Ahmed Al-Rashidi', body:'Thanks for reaching out – I am available for a call this week.',         record_id:null, object_slug:'people',  user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(15)  },
      { id:'n2', type:'interview_today',  title:'Interview in 2 hours',         body:'Technical Interview with Sara Khalil for Senior Engineer role.',         record_id:null, object_slug:'jobs',    user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(30)  },
      { id:'n3', type:'agent_review',     title:'Agent needs your review',       body:'Pre-screen summary for 3 candidates requires human verification.',       record_id:null, object_slug:'people',  user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(60)  },
      { id:'n4', type:'task_reminder',    title:'Follow-up overdue',             body:'Call log reminder: follow up with Marcus Webb – 2 days overdue.',        record_id:null, object_slug:'people',  user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(120) },
      { id:'n5', type:'offer_action',     title:'Offer awaiting approval',       body:'Offer for David Chen (Product Manager) is pending your approval.',      record_id:null, object_slug:'jobs',    user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(200) },
      { id:'n6', type:'application_new',  title:'3 new applications',            body:'Senior React Developer role received 3 new applications overnight.',     record_id:null, object_slug:'jobs',    user_id:null, environment_id:null, action_url:null, read_at:null, created_at:ago(360), read_at: ago(5) },
    ];
    dirty = true;
  }
  if (dirty) fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
  // Apply saved integration credentials to process.env
  for (const fields of Object.values(store.integrations || {})) {
    for (const [k, v] of Object.entries(fields)) {
      if (v && !v.startsWith('YOUR_')) process.env[k] = v;
    }
  }
  // ── Migration: ensure all users have a password_hash ──────────────────────
  const crypto = require('crypto');
  const hashPw  = pw => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');
  const DEFAULT_HASH = hashPw('Admin1234!');
  let pwFixed = 0;
  (store.users || []).forEach(u => {
    if (!u.password_hash) { u.password_hash = DEFAULT_HASH; pwFixed++; }
  });
  if (pwFixed > 0) {
    fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
    console.log(`[migration] Fixed missing password_hash on ${pwFixed} user(s) → default: Admin1234!`);
  }
  // ───────────────────────────────────────────────────────────────────────────

  // ── Migration: ensure all roles have a slug ────────────────────────────────
  let rolesFixed = 0;
  (store.roles || []).forEach(r => {
    if (!r.slug && r.name) {
      r.slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      rolesFixed++;
    }
  });
  if (rolesFixed > 0) {
    fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
    console.log(`[migration] Added slug to ${rolesFixed} role(s)`);
  }
  // ───────────────────────────────────────────────────────────────────────────

  // ── Portal dedup migration — remove duplicate slugs per environment ────────
  const portalsBefore = (store.portals || []).filter(p => !p.deleted_at).length;
  const portalSeen = {};
  let portalsDuped = 0;
  (store.portals || []).filter(p => !p.deleted_at).forEach(p => {
    const key = `${p.environment_id}::${(p.slug || '').replace(/^\//, '').toLowerCase()}`;
    if (!portalSeen[key]) portalSeen[key] = [];
    portalSeen[key].push(p);
  });
  Object.values(portalSeen).forEach(group => {
    if (group.length <= 1) return;
    group.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    for (let i = 1; i < group.length; i++) {
      const idx = store.portals.findIndex(p => p.id === group[i].id);
      if (idx !== -1) { store.portals[idx].deleted_at = new Date().toISOString(); portalsDuped++; }
    }
  });
  if (portalsDuped > 0) {
    const { saveStore } = require('./db/init');
    saveStore();
    console.log(`[migration] Deduped ${portalsDuped} portal(s) with duplicate slugs (${portalsBefore} → ${portalsBefore - portalsDuped} active)`);
  }

  // ───────────────────────────────────────────────────────────────────────────

  // Event Bus + Webhook bootstrap
  try {
    const whRouter = require("./routes/webhooks");
    if (whRouter._bootstrap) whRouter._bootstrap();
    const { initEventBusIntegrations } = require("./services/eventBusIntegrations");
    initEventBusIntegrations(app);
  } catch(e) { console.warn("[EventBus] Init:", e.message); }

  app.listen(PORT, () => {
    console.log(`Vercentic API → http://localhost:${PORT}`);
    // Start agent scheduler
    const { startScheduler } = require('./agent-engine');
    startScheduler();
    // Start flow scheduler
    initScheduler();
  });
}).catch(err => { console.error(err); process.exit(1); });
