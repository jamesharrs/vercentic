'use strict';
/**
 * seedCompanies.js — idempotent migration for the Company object.
 *
 * Call from db/init.js after seedPersonTypeFields():
 *     await seedCompanies(tenantKey);
 *
 * Creates:
 *  1. `companies` system object + fields (per environment)
 *  2. `company_id`, `previous_company_ids`, `employer_unresolved` fields on People
 *  3. store.company_aliases collection
 *  4. Provenance columns on existing relationships (source/confidence/confirmed_*)
 *  5. RBAC permissions for the companies object + new global actions
 */

const { v4: uuidv4 } = require('uuid');

const COMPANY_FIELDS = [
  { name:'Company Name',      ak:'company_name',      type:'text',         req:1, list:1, uniq:0, o:1 },
  { name:'Website',           ak:'website',           type:'url',                 list:1,        o:2 },
  // Drives email-domain resolution — a person on @emaar.ae works at Emaar,
  // which beats any name comparison. Accepts several, comma separated.
  { name:'Email domains',     ak:'domains',           type:'text',                list:0,        o:2.5,
    help:'Company email domains, comma separated. Used to match people to this company automatically.' },
  { name:'Industry',          ak:'industry',          type:'select',              list:1,        o:3,
    opts:['Technology','Financial Services','Banking','Real Estate','Construction','Oil & Gas','Energy','Healthcare','Pharmaceuticals','Retail','FMCG','Hospitality','Aviation','Logistics','Telecoms','Media','Education','Government','Professional Services','Legal','Manufacturing','Automotive','Mining','Agriculture','Other'] },
  { name:'Company Type',      ak:'company_type',      type:'select',              list:1,        o:4,
    opts:['Target','Client','Competitor','Partner','Vendor','Prospect','Other'] },
  { name:'Headcount',         ak:'headcount',         type:'number',              list:1,        o:5 },
  { name:'Headcount Band',    ak:'headcount_band',    type:'select',              list:1,        o:6,
    opts:['1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10000+'] },
  { name:'Headquarters',      ak:'headquarters',      type:'text',                list:1,        o:7 },
  { name:'Locations',         ak:'locations',         type:'multi_select',        list:0,        o:8, opts:[] },
  { name:'Founded',           ak:'founded_year',      type:'number',              list:0,        o:9 },
  { name:'Ownership',         ak:'ownership_type',    type:'select',              list:0,        o:10,
    opts:['Listed','Private','Family Office','Government','Sovereign Wealth Backed','PE / VC Backed','Subsidiary','Joint Venture','Non-Profit','Other'] },
  { name:'Entity Basis',      ak:'entity_basis',      type:'select',              list:0,        o:11,
    opts:['Mainland','Free Zone','Offshore','Branch','Representative Office','N/A'] },
  { name:'Nationalisation %', ak:'nationalisation_pct', type:'number',            list:0,        o:12 },
  { name:'Revenue',           ak:'revenue',           type:'text',                list:0,        o:13 },
  { name:'LinkedIn URL',      ak:'linkedin_url',      type:'url',                 list:0,        o:14 },
  { name:'Careers Page',      ak:'careers_url',       type:'url',                 list:0,        o:15 },
  { name:'Summary',           ak:'summary',           type:'rich_text',           list:0,        o:16 },
  { name:'Talent Notes',      ak:'talent_notes',      type:'rich_text',           list:0,        o:17 },
  { name:'Off Limits',        ak:'off_limits',        type:'boolean',             list:1,        o:18 },
  { name:'Off Limits Reason', ak:'off_limits_reason', type:'select',              list:0,        o:19,
    opts:['Active client','Recent placement','Contractual','Do not approach','Other'],
    cond_field:'off_limits', cond_val:'true' },
  { name:'Off Limits Until',  ak:'off_limits_until',  type:'date',                list:0,        o:20,
    cond_field:'off_limits', cond_val:'true' },
  { name:'Owner',             ak:'owner',             type:'text',                list:0,        o:21 },
  { name:'Status',            ak:'status',            type:'select',              list:1,        o:22,
    opts:['Active','Researching','Dormant','Archived'] },
  { name:'Last Researched',   ak:'last_researched_at',type:'date',                list:0,        o:23 },
  { name:'Research Source',   ak:'research_source',   type:'text',                list:0,        o:24 },
];

// Fields added to the People object so a person can point at a Company.
const PEOPLE_LINK_FIELDS = [
  { name:'Company',              ak:'company_id',            type:'lookup',       list:0, o:60 },
  { name:'Previous Companies',   ak:'previous_company_ids',  type:'multi_lookup', list:0, o:61 },
  { name:'Employer (unmatched)', ak:'employer_unresolved',   type:'text',         list:0, o:62 },
];

const now = () => new Date().toISOString();

async function seedCompanies(tenantKey, deps) {
  const {
    getStore, saveStore, insert, query, findOne,
  } = deps || require('../db/init');

  const store = getStore();
  if (!store) return;

  // ── 1. Collections ─────────────────────────────────────────────────────────
  let dirty = false;
  if (!store.company_aliases)  { store.company_aliases  = []; dirty = true; }
  if (!store.company_research) { store.company_research = []; dirty = true; }
  if (!store.employer_queue)   { store.employer_queue   = []; dirty = true; }

  // ── 2. Relationship provenance ─────────────────────────────────────────────
  for (const r of (store.relationships || [])) {
    if (r.source === undefined)       { r.source = 'user';   dirty = true; }
    if (r.confidence === undefined)   { r.confidence = null; dirty = true; }
    if (r.confirmed_by === undefined) { r.confirmed_by = null; dirty = true; }
    if (r.confirmed_at === undefined) { r.confirmed_at = null; dirty = true; }
    if (r.company_id === undefined)   { r.company_id = null; dirty = true; }
  }

  // ── 3. Companies object per environment ────────────────────────────────────
  const environments = store.environments || [];
  for (const env of environments) {
    let obj = (store.objects || []).find(
      o => o.environment_id === env.id && o.slug === 'companies'
    );

    if (!obj) {
      const objId = uuidv4();
      const maxOrder = Math.max(0, ...(store.objects || [])
        .filter(o => o.environment_id === env.id)
        .map(o => o.sort_order || 0));
      obj = insert('objects', {
        id: objId, environment_id: env.id,
        name: 'Company', plural_name: 'Companies', slug: 'companies',
        icon: 'building', color: '#7950F2',
        description: 'Organisations — competitive intelligence, talent mapping and target accounts',
        is_system: 1, sort_order: maxOrder + 1,
        relationships_enabled: 0, person_type_options: null,
        created_at: now(), updated_at: now(),
      });
      dirty = true;
      console.log(`  ↳ companies object created for env ${env.name || env.id}`);
    }

    // Fields — add any that are missing (safe to re-run after a version bump)
    const existing = (store.fields || []).filter(f => f.object_id === obj.id);
    for (const f of COMPANY_FIELDS) {
      if (existing.find(e => e.api_key === f.ak)) continue;
      insert('fields', {
        id: uuidv4(), object_id: obj.id, environment_id: env.id,
        name: f.name, api_key: f.ak, field_type: f.type,
        is_required: f.req || 0, is_unique: f.uniq || 0, is_system: 1,
        show_in_list: f.list !== undefined ? f.list : 1, show_in_form: 1,
        sort_order: f.o, options: f.opts || null,
        lookup_object_id: null, default_value: null,
        placeholder: null, help_text: null,
        condition_field: f.cond_field || null,
        condition_value: f.cond_val || null,
        created_at: now(), updated_at: now(),
      });
      dirty = true;
    }

    // ── 4. Link fields on People, pointed at this env's companies object ─────
    const peopleObj = (store.objects || []).find(
      o => o.environment_id === env.id && o.slug === 'people'
    );
    if (peopleObj) {
      const peopleFields = (store.fields || []).filter(f => f.object_id === peopleObj.id);
      for (const f of PEOPLE_LINK_FIELDS) {
        const found = peopleFields.find(e => e.api_key === f.ak);
        if (found) {
          // Repair the lookup target if it drifted
          if ((f.type === 'lookup' || f.type === 'multi_lookup') && found.lookup_object_id !== obj.id) {
            found.lookup_object_id = obj.id;
            dirty = true;
          }
          continue;
        }
        insert('fields', {
          id: uuidv4(), object_id: peopleObj.id, environment_id: env.id,
          name: f.name, api_key: f.ak, field_type: f.type,
          is_required: 0, is_unique: 0, is_system: 1,
          show_in_list: f.list, show_in_form: f.ak !== 'employer_unresolved' ? 1 : 0,
          sort_order: f.o, options: null,
          lookup_object_id: (f.type === 'lookup' || f.type === 'multi_lookup') ? obj.id : null,
          default_value: null, placeholder: null,
          help_text: f.ak === 'employer_unresolved'
            ? 'Raw employer text that could not be matched to a Company record'
            : null,
          condition_field: null, condition_value: null,
          created_at: now(), updated_at: now(),
        });
        dirty = true;
      }
    }
  }

  // ── 5. RBAC ────────────────────────────────────────────────────────────────
  if (seedCompanyPermissions(store)) dirty = true;

  if (dirty) saveStore();
}

// ── Permissions ──────────────────────────────────────────────────────────────
const COMPANY_GLOBAL_ACTIONS = [
  'access_companies',
  'company_research',        // trigger AI research on a company
  'company_infer_org',       // generate suggested reporting lines
  'company_manage_aliases',  // add/remove aliases, merge companies
  'company_view_intel',      // talent flow, comp bands, alumni
  'company_manage_off_limits',
];

const ROLE_DEFAULTS = {
  super_admin:    { obj: ['view','create','edit','delete','export'], global: COMPANY_GLOBAL_ACTIONS },
  admin:          { obj: ['view','create','edit','delete','export'], global: COMPANY_GLOBAL_ACTIONS },
  recruiter:      { obj: ['view','create','edit','export'],
                    global: ['access_companies','company_research','company_infer_org','company_view_intel'] },
  hiring_manager: { obj: ['view'], global: ['access_companies'] },
  read_only:      { obj: ['view'], global: ['access_companies'] },
};

const OBJECT_ACTIONS = ['view','create','edit','delete','export'];

function seedCompanyPermissions(store) {
  if (!store.permissions) store.permissions = [];
  const roles = store.roles || [];
  let changed = false;

  for (const role of roles) {
    const defaults = ROLE_DEFAULTS[role.slug];
    if (!defaults) continue;

    // Object-level
    for (const action of OBJECT_ACTIONS) {
      const exists = store.permissions.find(
        p => p.role_id === role.id && p.object_slug === 'companies' && p.action === action
      );
      if (exists) continue;
      store.permissions.push({
        id: uuidv4(), role_id: role.id, object_slug: 'companies', action,
        allowed: defaults.obj.includes(action) ? 1 : 0, created_at: now(),
      });
      changed = true;
    }

    // Global actions
    for (const action of COMPANY_GLOBAL_ACTIONS) {
      const exists = store.permissions.find(
        p => p.role_id === role.id && p.object_slug === '__global__' && p.action === action
      );
      if (exists) continue;
      store.permissions.push({
        id: uuidv4(), role_id: role.id, object_slug: '__global__', action,
        allowed: defaults.global.includes(action) ? 1 : 0, created_at: now(),
      });
      changed = true;
    }
  }

  if (changed) console.log('  ↳ companies permissions seeded');
  return changed;
}

module.exports = { seedCompanies, COMPANY_GLOBAL_ACTIONS, COMPANY_FIELDS, PEOPLE_LINK_FIELDS };
