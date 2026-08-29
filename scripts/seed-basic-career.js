'use strict';
/* Re-applies the Essential career-site template to the Basic (basic-demo)
 * career portal, and seeds a few sample Open jobs so the roles section fills.
 * Run:  node scripts/seed-basic-career.js
 * Then restart the dev server so its in-memory cache reflects disk.
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../server/db/init');
const { buildCareerTemplate } = require('../server/data/careerSiteTemplates');

const SLUG = 'basic-demo';
const PORTAL_ID = 'a2b58e37-c08f-4e18-9181-f5c65885d80b';

function brandingToTheme(b, prev) {
  return {
    ...prev,
    primaryColor:   b.primary_color   || prev.primaryColor,
    secondaryColor: b.secondary_color || prev.secondaryColor,
    accentColor:    b.accent_color    || prev.accentColor,
    bgColor:        b.background_color || prev.bgColor,
    textColor:      b.text_color      || prev.textColor,
    fontFamily:     b.font_family     || prev.fontFamily,
    headingFont:    b.font_family     || prev.headingFont,
  };
}

const store = db.loadTenantStore(SLUG);

// ── 1. Apply the Essential template to the career portal ──────────────────────
const portal = (store.portals || []).find(p => p.id === PORTAL_ID);
if (!portal) { console.error('Portal not found:', PORTAL_ID); process.exit(1); }

const tpl = buildCareerTemplate('essential', uuidv4);
portal.pages = tpl.pages;
portal.theme = brandingToTheme(tpl.branding, portal.theme || {});
portal.primary_color    = tpl.branding.primary_color;
portal.secondary_color  = tpl.branding.secondary_color;
portal.accent_color     = tpl.branding.accent_color;
portal.background_color = tpl.branding.background_color;
portal.text_color       = tpl.branding.text_color;
portal.font_family      = tpl.branding.font_family;
portal.template_key     = 'essential';
portal.updated_at       = new Date().toISOString();
console.log('✅ Applied Essential template to portal', portal.name);

// ── 2. Seed sample Open jobs (only if none exist) ─────────────────────────────
const JOB_OBJECT_ID = '300e25a0-a81c-4939-b2b9-3619f505ad29';
const ENV_ID = portal.environment_id;
const creator = (store.users && store.users[0] && store.users[0].id) || null;

const existingJobs = (store.records || []).filter(
  r => r.object_id === JOB_OBJECT_ID && r.environment_id === ENV_ID && !r.deleted_at
);

const SAMPLE_JOBS = [
  { job_title: 'Senior Product Engineer', department: 'Engineering', location: 'Remote (UK/EU)', work_type: 'Remote',   employment_type: 'Full-time', salary_min: 75000, salary_max: 95000, salary_currency: 'GBP', experience_min_years: 5 },
  { job_title: 'Product Designer',         department: 'Design',      location: 'London, UK',     work_type: 'Hybrid',   employment_type: 'Full-time', salary_min: 60000, salary_max: 80000, salary_currency: 'GBP', experience_min_years: 4 },
  { job_title: 'Customer Success Lead',    department: 'Operations',  location: 'Remote (UK/EU)', work_type: 'Remote',   employment_type: 'Full-time', salary_min: 55000, salary_max: 70000, salary_currency: 'GBP', experience_min_years: 4 },
  { job_title: 'Growth Marketer',          department: 'Marketing',   location: 'London, UK',     work_type: 'Hybrid',   employment_type: 'Full-time', salary_min: 50000, salary_max: 65000, salary_currency: 'GBP', experience_min_years: 3 },
];

if (existingJobs.length === 0) {
  let n = Math.max(0, ...(store.records || []).map(r => r.record_number || 0));
  const now = Date.now();
  SAMPLE_JOBS.forEach((j, i) => {
    store.records.push({
      id: uuidv4(),
      record_number: ++n,
      object_id: JOB_OBJECT_ID,
      environment_id: ENV_ID,
      data: { ...j, status: 'Open', career_site_visible: true },
      org_unit_id: null,
      created_by: creator,
      created_at: new Date(now - i * 86400000).toISOString(),
      updated_at: new Date(now - i * 86400000).toISOString(),
      deleted_at: null,
    });
  });
  console.log(`✅ Seeded ${SAMPLE_JOBS.length} sample Open jobs`);
} else {
  console.log(`ℹ️  ${existingJobs.length} job(s) already exist — skipping job seed`);
}

db.saveStoreNow(SLUG);
console.log('💾 Saved tenant store:', SLUG);
process.exit(0);
