require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDB, getStore } = require('./db/init');
const tenantMiddleware = require('./middleware/tenant');
const { attachUser, seedDefaultPermissions } = require('./middleware/rbac');
const { auditResponseMiddleware } = require('./middleware/security-audit');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  /\.vercel\.app$/,
  /\.talentos\.io$/,
  /\.vercentic\.com$/,
  'https://vercentic.com',
  'https://www.vercentic.com',
  'https://talentos-production-4045.up.railway.app',
];
if (process.env.CLIENT_URL)  allowedOrigins.push(process.env.CLIENT_URL);
if (process.env.PORTAL_URL)  allowedOrigins.push(process.env.PORTAL_URL);
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim()));
}
// Chrome extension routes need permissive CORS (any origin)
app.use('/api/chrome-import', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Slug, X-User-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    cb(ok ? null : new Error('CORS'), ok);
  },
  credentials: true,
});
// Skip the strict CORS check for chrome-import (handled by its own permissive middleware above)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chrome-import')) return next();
  corsMiddleware(req, res, next);
});
app.use(express.json({ limit: '10mb' }));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(tenantMiddleware);        // tenant isolation — must come before routes
app.use(attachUser);              // attach current user to req
app.use(auditResponseMiddleware); // log 403 responses to security audit log

// ── Portal session middleware — resolves x-portal-token to req.portalUser ────
app.use((req, res, next) => {
  const token = req.headers['x-portal-token'];
  if (token && global._portalSessions) {
    const sess = global._portalSessions[token];
    if (sess && new Date(sess.expires_at) > new Date()) {
      req.portalUser = { id: sess.user_id, first_name: sess.first_name, last_name: sess.last_name, email: sess.email, environment_id: sess.environment_id };
    }
  }
  next();
});

// ── Auth guard ────────────────────────────────────────────────────────────────
const AUTH_EXEMPT = [
  '/auth/login', '/auth/me',
  '/users/login', '/users/auth/login',
  '/health', '/environments',
  '/portals/public', '/portals/by-slug', '/portals/slug',
  '/portals/job-alerts', '/portals/application-status', '/portal-public', '/portal-auth/login', '/portal-auth/me', '/portal-auth/logout',
  '/portal-analytics', '/portal-feedback', '/portal-copilot',
  '/campaign-links',
    '/integrations',  
  '/superadmin', '/bot', '/analytics',
  '/attachments/file',
  '/comms/webhook',
  '/tenant-reset', '/cleanup-seeds', '/seed-dashboards',
  '/error-logs', '/ai', '/translate', '/linkedin-search',
  '/chrome-import',
  '/hub/request-link', '/hub/verify', '/hub/portal-branding',
];
app.use('/api', (req, res, next) => {
  if (AUTH_EXEMPT.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();
  if (req.path.match(/^\/portals\/[^/]+\/apply$/)) return next();
  if (req.path.match(/^\/portals\/[^/]+\/session$/)) return next();
  if (req.path.match(/^\/portals\/[^/]+\/jobs($|\/)/)) return next();
  if (req.method === 'GET' && (
    req.path.startsWith('/objects') || req.path.startsWith('/records') ||
    req.path.startsWith('/fields')  || req.path.startsWith('/saved-views') ||
    req.path.startsWith('/analytics') ||
    req.path.startsWith('/company-documents/search') ||
    req.path.startsWith('/company-documents/meta')
  )) return next();
  if (req.method === 'OPTIONS') return next();
  if (!req.currentUser) return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  next();
});

// ── Core data ─────────────────────────────────────────────────────────────────
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/environments',      require('./routes/environments'));
app.use('/api/objects',           require('./routes/objects'));
app.use('/api/fields',            require('./routes/fields'));
app.use('/api/records',           require('./routes/records'));
app.use('/api/records',           require('./routes/suggested_actions'));
app.use('/api/records',           require('./routes/bulk_actions'));
app.use('/api/users',             require('./routes/users'));
app.use('/api/roles',             require('./routes/roles'));
app.use('/api/org-units',         require('./routes/org_units'));
app.use('/api/relationships',     require('./routes/relationships'));
app.use('/api/notes',             require('./routes/notes'));
app.use('/api/attachments',       require('./routes/attachments'));
app.use('/api/file-types',        require('./routes/file_types'));
app.use('/api/saved-views',       require('./routes/saved_views'));
app.use('/api/scheduled-reports', require('./routes/scheduled_reports'));
app.use('/api/groups',            require('./routes/groups'));
app.use('/api/notification-preferences', require('./routes/notification_preferences'));

// ── AI & intelligence ─────────────────────────────────────────────────────────
app.use('/api/ai',                require('./routes/ai-proxy'));
app.use('/api/translate',         require('./routes/translate'));
app.use('/api/cv-parse',          require('./routes/cv_parse'));
app.use('/api/doc-extract',       require('./routes/doc_extract'));
app.use('/api/linkedin-search',   require('./routes/linkedin_search'));
app.use('/api/company-research',  require('./routes/company_research'));
app.use('/api/skills-intel',      require('./routes/skills_intelligence'));
app.use('/api/analytics',         require('./routes/analytics'));
app.use('/api/skills-import',     require('./routes/skills_import'));
app.use('/api/agents',            require('./routes/agents'));
app.use('/api/ai-interview',      require('./routes/ai_interview'));

// ── Communications ────────────────────────────────────────────────────────────
app.use('/api/comms',             require('./routes/communications'));
app.use('/api/inbox',             require('./routes/inbox'));
app.use('/api/email-templates',   require('./routes/email-templates'));
app.use('/api/email-builder',     require('./routes/email_builder'));
app.use('/api/notifications',     require('./routes/notifications'));

// ── Recruitment workflow ──────────────────────────────────────────────────────
app.use('/api/workflows',         require('./routes/workflows'));
app.use('/api/stage-categories',  require('./routes/stage_categories'));
app.use('/api/interviews',        require('./routes/interviews'));
app.use('/api/interview-types',   require('./routes/interview_types'));
app.use('/api/interview-plans',   require('./routes/interview_plans'));
app.use('/api/interview-coordinator', require('./routes/interview_coordinator'));
app.use('/api/offers',            require('./routes/offers'));
app.use('/api/sourcing',          require('./routes/sourcing'));
app.use('/api/calendar',          require('./routes/calendar'));
app.use('/api/scorecards',require('./routes/scorecards'));
app.use('/api/screening',         require('./routes/screening'));
app.use('/api/duplicates',        require('./routes/duplicates'));
app.use('/api/data-import',       require('./routes/data_import'));
app.use('/api/question-bank',     require('./routes/question_bank'));
app.use('/api/forms',             require('./routes/forms'));
app.use('/api/portal-auth',       require('./routes/portal_auth'));
app.use('/api/cases',             require('./routes/cases'));

// ── Portals ───────────────────────────────────────────────────────────────────
app.use('/api/portal-public', require('./routes/portal_public'));
app.use('/api/portals',           require('./routes/portals'));
app.use('/api/portal-copilot',    require('./routes/portal_copilot'));
app.use('/api/portal-feedback',   require('./routes/portal_feedback'));
app.use('/api/portal-analytics',  require('./routes/portal_analytics'));
app.use('/api/portal-ai',         require('./routes/portal_ai'));
app.use('/api/campaign-links',    require('./routes/campaign_links'));
app.use('/api/campaigns',         require('./routes/campaigns'));
app.use('/api/bot',               require('./routes/bot'));

// ── Platform config & reporting ───────────────────────────────────────────────
app.use('/api/reports',           require('./routes/reports'));
app.use('/api/dashboards',        require('./routes/dashboards'));
app.use('/api/csv',               require('./routes/csv'));
app.use('/api/config',            require('./routes/config'));
app.use('/api/sandboxes',         require('./routes/sandbox'));
app.use('/api/feature-flags',     require('./routes/feature-flags'));
app.use('/api/release-notes',     require('./routes/release_notes'));
app.use('/api/error-logs',        require('./routes/error_logs'));

// ── Security & settings ───────────────────────────────────────────────────────
app.use('/api/security',          require('./routes/security'));
app.use('/api/security-audit',    require('./routes/security_audit'));
app.use('/api/field-visibility',  require('./routes/field_visibility'));
app.use('/api/integrations',      require('./routes/integrations'));
app.use('/api/connector-actions', require('./routes/connector_actions'));
app.use('/api/brand-kits',        require('./routes/brand_kits'));
app.use('/api/talent-profile',    require('./routes/talent_profile'));
app.use('/api/webhooks',          require('./routes/webhooks'));

// ── Enterprise ────────────────────────────────────────────────────────────────
app.use('/api/enterprise',        require('./routes/enterprise_settings'));
app.use('/api/datasets',          require('./routes/datasets'));
app.use('/api/company-documents', require('./routes/company_documents'));
app.use('/api/chats',            require('./routes/candidate_chat'));
app.use('/api/documents',        require('./routes/documents'));
app.use('/api/rpo-clients',       require('./routes/rpo_clients'));
app.use('/api/hub',               require('./routes/hub'));

// ── Flows ─────────────────────────────────────────────────────────────────────
const { router: flowsRouter, initScheduler } = require('./routes/flows');
app.use('/api/flows', flowsRouter);

// ── Admin & super admin ───────────────────────────────────────────────────────
app.use('/api/admin',             require('./routes/admin_dashboard').router);
app.use('/api/superadmin',        require('./routes/superadmin'));
app.use('/api/superadmin/clients', require('./routes/superadmin_clients'));
app.use('/api/superadmin/demo',   require('./routes/demo_seed'));
app.use('/api/tenant-reset',      require('./routes/admin_reset'));
app.use('/api/chrome-import',     require('./routes/chrome_import'));

// Run post-load migrations
require('./routes/enterprise_settings').migrate();
require('./routes/skills_intelligence').migrate();
require('./routes/datasets').migrate();

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', version: '1.5.2', build: 'clean' })
);

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

// Start listening immediately so Railway health check passes during DB init
app.listen(PORT, () => {
  console.log(`Vercentic API → http://localhost:${PORT}`);
});

initDB().then(() => {
  const store = getStore();
  const fs   = require('fs');
  const path = require('path');
  let dirty  = false;

  // Ensure all store collections exist
  const COLLECTIONS = [
    'notes', 'attachments', 'portals', 'workflows', 'communications',
    'email_templates', 'error_logs', 'job_questions',
  ];
  for (const c of COLLECTIONS) {
    if (!store[c]) { store[c] = []; dirty = true; }
  }
  if (!store.integrations) { store.integrations = {}; dirty = true; }

  // Default question bank (first boot only)
  if (!store.question_bank_v2) {
    store.question_bank_v2 = [
      { id:'kq1', type:'knockout',   competency:'eligibility',     text:'Are you currently eligible to work in the country where this role is based?',                                                          options:['Yes','No'],              pass_value:'Yes', weight:10, tags:['right-to-work'], is_system:true, created_at:new Date().toISOString() },
      { id:'kq2', type:'knockout',   competency:'availability',    text:'Can you start within the timeframe required for this role?',                                                                            options:['Yes','No','Negotiable'], pass_value:null,  weight:5,  tags:['availability'],  is_system:true, created_at:new Date().toISOString() },
      { id:'bq1', type:'competency', competency:'leadership',      text:'Tell me about a time you led a team through a challenging project. What was your approach and what was the outcome?',                  weight:15, tags:['leadership','management'], is_system:true, created_at:new Date().toISOString() },
      { id:'bq2', type:'competency', competency:'problem_solving', text:'Describe a complex problem you encountered at work. How did you break it down and what steps did you take to resolve it?',             weight:15, tags:['problem-solving'],          is_system:true, created_at:new Date().toISOString() },
      { id:'bq3', type:'competency', competency:'communication',   text:'Give an example of a time you had to communicate difficult news to a stakeholder. How did you approach it?',                          weight:10, tags:['communication'],             is_system:true, created_at:new Date().toISOString() },
      { id:'bq4', type:'competency', competency:'adaptability',    text:'Tell me about a time when priorities changed unexpectedly. How did you respond and what was the result?',                              weight:10, tags:['adaptability'],              is_system:true, created_at:new Date().toISOString() },
      { id:'bq5', type:'competency', competency:'collaboration',   text:"Describe a situation where you had to work closely with someone whose working style differed significantly from yours.",               weight:10, tags:['teamwork'],                  is_system:true, created_at:new Date().toISOString() },
      { id:'tq1', type:'technical',  competency:'technical_depth', text:'Walk me through your approach to a recent technical challenge in your current or most recent role.',                                   weight:20, tags:['technical'],                 is_system:true, created_at:new Date().toISOString() },
      { id:'tq2', type:'technical',  competency:'technical_breadth', text:'What technologies or tools do you consider yourself most proficient in, and how have you applied them recently?',                   weight:15, tags:['technical','skills'],        is_system:true, created_at:new Date().toISOString() },
      { id:'cq1', type:'culture',    competency:'values',          text:'What type of working environment helps you do your best work?',                                                                         weight:10, tags:['culture','fit'],             is_system:true, created_at:new Date().toISOString() },
      { id:'cq2', type:'culture',    competency:'motivation',      text:'What excites you most about this opportunity, and where do you see yourself in three years?',                                          weight:10, tags:['motivation'],                is_system:true, created_at:new Date().toISOString() },
      { id:'cq3', type:'culture',    competency:'feedback',        text:'How do you prefer to give and receive feedback in a professional setting?',                                                             weight:10, tags:['feedback'],                  is_system:true, created_at:new Date().toISOString() },
    ];
    dirty = true;
  }
  if (!store.question_templates) {
    store.question_templates = [
      { id:'tpl_standard',   name:'Standard Interview', description:'Balanced set covering knockout, competency, and culture', category:'General',    question_ids:['kq1','kq2','bq1','bq2','cq1','cq2'],  is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_technical',  name:'Technical Role',     description:'Eligibility + deep technical + problem solving',          category:'Technology', question_ids:['kq1','kq2','tq1','tq2','bq2','bq5'],  is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_leadership', name:'Leadership Role',    description:'Leadership, communication and collaboration focus',        category:'Management', question_ids:['kq1','bq1','bq3','bq5','cq2','cq3'],  is_system:true, created_at:new Date().toISOString() },
      { id:'tpl_culture',    name:'Culture & Values',   description:'Values alignment and working style fit',                  category:'Culture',    question_ids:['bq4','bq5','cq1','cq2','cq3'],        is_system:true, created_at:new Date().toISOString() },
    ];
    dirty = true;
  }

  // Default notifications (first boot only)
  if (!store.notifications) {
    const ago = mins => new Date(Date.now() - mins * 60000).toISOString();
    store.notifications = [
      { id:'n1', type:'message_reply',   title:'Reply from Ahmed Al-Rashidi', body:'Thanks for reaching out – I am available for a call this week.',    record_id:null, object_slug:'people', user_id:null, environment_id:null, action_url:null, read_at:null,    created_at:ago(15)  },
      { id:'n2', type:'interview_today', title:'Interview in 2 hours',         body:'Technical Interview with Sara Khalil for Senior Engineer role.',    record_id:null, object_slug:'jobs',   user_id:null, environment_id:null, action_url:null, read_at:null,    created_at:ago(30)  },
      { id:'n3', type:'agent_review',    title:'Agent needs your review',      body:'Pre-screen summary for 3 candidates requires human verification.',  record_id:null, object_slug:'people', user_id:null, environment_id:null, action_url:null, read_at:null,    created_at:ago(60)  },
      { id:'n4', type:'task_reminder',   title:'Follow-up overdue',            body:'Call log reminder: follow up with Marcus Webb – 2 days overdue.',   record_id:null, object_slug:'people', user_id:null, environment_id:null, action_url:null, read_at:null,    created_at:ago(120) },
      { id:'n5', type:'offer_action',    title:'Offer awaiting approval',      body:'Offer for David Chen (Product Manager) is pending your approval.',  record_id:null, object_slug:'jobs',   user_id:null, environment_id:null, action_url:null, read_at:null,    created_at:ago(200) },
      { id:'n6', type:'application_new', title:'3 new applications',           body:'Senior React Developer role received 3 new applications overnight.', record_id:null, object_slug:'jobs',  user_id:null, environment_id:null, action_url:null, read_at:ago(5),  created_at:ago(360) },
    ];
    dirty = true;
  }

  if (dirty) {
    fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
  }

  // Apply saved integration credentials to process.env
  for (const fields of Object.values(store.integrations || {})) {
    for (const [k, v] of Object.entries(fields)) {
      if (v && !v.startsWith('YOUR_')) process.env[k] = v;
    }
  }

  seedDefaultPermissions(store);

  // ── Migrations ──────────────────────────────────────────────────────────────
  const crypto = require('crypto');
  const hashPw = pw => crypto.createHash('sha256').update(pw + 'talentos_salt').digest('hex');
  const DEFAULT_HASH = hashPw('Admin1234!');
  let pwFixed = 0;
  (store.users || []).forEach(u => {
    // Fix missing hash OR a hash that isn't 64 hex chars (wrong algorithm/salt from old builds)
    const hashLooksValid = u.password_hash && /^[0-9a-f]{64}$/.test(u.password_hash);
    if (!hashLooksValid) { u.password_hash = DEFAULT_HASH; pwFixed++; }
  });

  let rolesFixed = 0;
  (store.roles || []).forEach(r => {
    if (!r.slug && r.name) {
      r.slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      rolesFixed++;
    }
  });

  // Portal dedup — remove duplicate slugs per environment
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

  if (pwFixed > 0 || rolesFixed > 0 || portalsDuped > 0) {
    const { saveStore } = require('./db/init');
    saveStore();
    if (pwFixed > 0)      console.log(`[migration] Fixed password_hash on ${pwFixed} user(s)`);
    if (rolesFixed > 0)   console.log(`[migration] Added slug to ${rolesFixed} role(s)`);
    if (portalsDuped > 0) console.log(`[migration] Deduped ${portalsDuped} portal(s) with duplicate slugs`);
  }

  // ── Event Bus & Webhooks ────────────────────────────────────────────────────
  try {
    const whRouter = require('./routes/webhooks');
    if (whRouter._bootstrap) whRouter._bootstrap();
    const { initEventBusIntegrations } = require('./services/eventBusIntegrations');
    initEventBusIntegrations(app);
  } catch (e) { console.warn('[EventBus] Init:', e.message); }

  // Start schedulers after DB is ready
  try {
    const { startScheduler } = require('./agent-engine');
    startScheduler();
    initScheduler();
  } catch (e) { console.warn('[Scheduler] Init:', e.message); }

}).catch(err => { console.error('[Boot] DB init failed:', err.message); });
