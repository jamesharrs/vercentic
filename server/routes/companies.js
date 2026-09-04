'use strict';
/**
 * routes/companies.js
 *
 * The Company object itself is a normal system object — list views, saved lists,
 * reports, exports, data-model management and field-level RBAC all come from the
 * generic /api/records + /api/objects layer. This route only adds what's specific
 * to companies: employer resolution, the auto-matched employee roster, market
 * intelligence, aliases/merging, AI research and suggested reporting lines.
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');
const { hasGlobalAction, hasPermission, isSuperAdmin } = require('../middleware/rbac');
const M = require('../utils/companyMatch');
const { MODEL_DEFAULT } = require('../config/ai_models');

const now = () => new Date().toISOString();

// ── Guards ───────────────────────────────────────────────────────────────────
function needGlobal(req, res, action) {
  const u = req.currentUser;
  if (!u) { res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }); return false; }
  if (!hasGlobalAction(u, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return true;
}
function needObject(req, res, action) {
  const u = req.currentUser;
  if (!u) { res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }); return false; }
  if (!hasPermission(u, 'companies', action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { objectSlug: 'companies', action } });
    return false;
  }
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function objIds(envId) {
  const objs = query('objects', o => o.environment_id === envId);
  return {
    companies: objs.find(o => o.slug === 'companies')?.id || null,
    people:    objs.find(o => o.slug === 'people')?.id    || null,
    jobs:      objs.find(o => o.slug === 'jobs')?.id      || null,
  };
}

function loadIndex(envId) {
  const { companies: cObj } = objIds(envId);
  if (!cObj) return { index: M.buildIndex([], []), companies: [] };
  const companies = query('records', r => r.object_id === cObj && !r.deleted_at);
  const ids = new Set(companies.map(c => c.id));
  const aliases = (getStore().company_aliases || []).filter(a => ids.has(a.company_id) && !a.deleted_at);
  return { index: M.buildIndex(companies, aliases), companies, aliases };
}

function peopleIn(envId) {
  const { people } = objIds(envId);
  if (!people) return [];
  return query('records', r => r.object_id === people && !r.deleted_at);
}

const employerOf = (p) => p.data?.current_company || p.data?.employer || '';
const nameOf     = (p) => [p.data?.first_name, p.data?.last_name].filter(Boolean).join(' ')
                          || p.data?.email || 'Unnamed';
const titleOf    = (p) => p.data?.job_title || p.data?.current_title || '';

// ═════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS — companies we could create from employer strings already held
// ═════════════════════════════════════════════════════════════════════════════
router.get('/suggestions', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id, limit = 40, min_count = 1 } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const { index } = loadIndex(environment_id);
  const people = peopleIn(environment_id);

  // Tally raw employer strings that have no company_id yet
  const tally = new Map();
  for (const p of people) {
    if (p.data?.company_id) continue;
    const raw = String(employerOf(p) || '').trim();
    if (!raw) continue;
    const k = raw.toLowerCase();
    if (!tally.has(k)) tally.set(k, { raw, count: 0, person_ids: [] });
    const t = tally.get(k);
    t.count++;
    if (t.person_ids.length < 25) t.person_ids.push(p.id);
  }

  const clusters = M.clusterEmployerStrings([...tally.values()]);

  const out = clusters
    .filter(c => c.total >= Number(min_count))
    .slice(0, Number(limit))
    .map(c => {
      const match = M.resolveEmployer(c.canonical, index);
      return {
        canonical: c.canonical,
        normalised: c.key,
        total_people: c.total,
        variants: c.variants.map(v => ({ raw: v.raw, count: v.count })),
        person_ids: c.variants.flatMap(v => v.person_ids || []).slice(0, 25),
        existing_match: match.status === 'none' ? null : {
          status: match.status,
          company_id: match.company_id,
          confidence: Number(match.confidence.toFixed(2)),
          candidates: match.candidates,
        },
      };
    });

  res.json({ suggestions: out, total: clusters.length });
});

// Create a company from a suggestion cluster, register variants as aliases,
// and link the matching people in one shot.
router.post('/from-suggestion', (req, res) => {
  if (!needObject(req, res, 'create')) return;
  const { environment_id, canonical, variants = [], link_people = true, data = {} } = req.body;
  if (!environment_id || !canonical) return res.status(400).json({ error: 'environment_id and canonical required' });

  const { companies: cObj } = objIds(environment_id);
  if (!cObj) return res.status(400).json({ error: 'Companies object not found in this environment' });

  const company = insert('records', {
    id: uuidv4(), object_id: cObj, environment_id,
    data: { company_name: canonical, status: 'Active', company_type: 'Target', ...data },
    created_by: req.currentUser?.id || null,
    org_unit_id: req.currentUser?.org_unit_id || null,
    created_at: now(), updated_at: now(), deleted_at: null,
  });

  const store = getStore();
  if (!store.company_aliases) store.company_aliases = [];
  const canonTight = M.normTight(canonical);
  let aliasCount = 0;
  for (const v of variants) {
    const raw = typeof v === 'string' ? v : v.raw;
    if (!raw || M.normTight(raw) === canonTight) continue;
    store.company_aliases.push({
      id: uuidv4(), company_id: company.id, environment_id,
      alias: raw.trim(), kind: 'variant', source: 'derived',
      created_by: req.currentUser?.id || null, created_at: now(), deleted_at: null,
    });
    aliasCount++;
  }

  let linked = 0;
  if (link_people) {
    const { index } = loadIndex(environment_id);
    for (const p of peopleIn(environment_id)) {
      if (p.data?.company_id) continue;
      const r = M.resolveEmployer(employerOf(p), index);
      if (r.company_id === company.id && ['exact','alias','acronym','strong'].includes(r.status)) {
        update('records', x => x.id === p.id, {
          data: { ...p.data, company_id: company.id, employer_unresolved: null },
          updated_at: now(),
        });
        linked++;
      }
    }
  }

  saveStore();
  res.status(201).json({ company, aliases_created: aliasCount, people_linked: linked });
});

// ═════════════════════════════════════════════════════════════════════════════
// RESOLVE — used by the employer field as you type
// ═════════════════════════════════════════════════════════════════════════════
router.post('/resolve', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id, employer, limit = 5 } = req.body;
  if (!environment_id || !employer) return res.status(400).json({ error: 'environment_id and employer required' });

  const { index } = loadIndex(environment_id);
  const r = M.resolveEmployer(employer, index, { limit });
  res.json({
    input: employer,
    normalised: M.normTight(employer),
    status: r.status,
    auto_link: ['exact','alias','acronym','strong'].includes(r.status),
    company_id: r.company_id,
    confidence: Number((r.confidence || 0).toFixed(2)),
    candidates: r.candidates.map(c => ({ ...c, score: Number(c.score.toFixed(2)) })),
  });
});

// Batch reconciliation — sweep all unlinked people and link the safe ones.
router.post('/reconcile', (req, res) => {
  if (!needGlobal(req, res, 'company_manage_aliases')) return;
  const { environment_id, dry_run = false } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const { index } = loadIndex(environment_id);
  const results = { linked: 0, ambiguous: 0, unmatched: 0, samples: [] };

  for (const p of peopleIn(environment_id)) {
    if (p.data?.company_id) continue;
    const raw = employerOf(p);
    if (!raw) continue;
    const r = M.resolveEmployer(raw, index);

    if (['exact','alias','acronym','strong'].includes(r.status)) {
      results.linked++;
      if (!dry_run) {
        update('records', x => x.id === p.id, {
          data: { ...p.data, company_id: r.company_id, employer_unresolved: null },
          updated_at: now(),
        });
      }
      if (results.samples.length < 20)
        results.samples.push({ person: nameOf(p), raw, matched: r.candidates[0]?.name, status: r.status });
    } else if (r.status === 'ambiguous') {
      results.ambiguous++;
      if (!dry_run) {
        update('records', x => x.id === p.id, {
          data: { ...p.data, employer_unresolved: raw }, updated_at: now(),
        });
      }
    } else {
      results.unmatched++;
      if (!dry_run) {
        update('records', x => x.id === p.id, {
          data: { ...p.data, employer_unresolved: raw }, updated_at: now(),
        });
      }
    }
  }
  if (!dry_run) saveStore();
  res.json({ dry_run, ...results });
});

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEES / ALUMNI
// ═════════════════════════════════════════════════════════════════════════════
function rosterFor(companyId, envId) {
  const company = findOne('records', r => r.id === companyId && !r.deleted_at);
  if (!company) return null;
  const { index } = loadIndex(envId);
  const people = peopleIn(envId);

  const current = [], alumni = [], probable = [];

  for (const p of people) {
    const prev = Array.isArray(p.data?.previous_company_ids) ? p.data.previous_company_ids : [];
    if (p.data?.company_id === companyId) { current.push({ p, link: 'explicit' }); continue; }
    if (prev.includes(companyId)) { alumni.push({ p, link: 'explicit' }); continue; }
    if (p.data?.company_id) continue; // linked elsewhere — don't claim them
    const raw = employerOf(p);
    if (!raw) continue;
    const r = M.resolveEmployer(raw, index);
    if (r.company_id !== companyId) continue;
    if (['exact','alias','acronym','strong'].includes(r.status)) {
      current.push({ p, link: 'matched', confidence: r.confidence, raw });
    } else if (r.status === 'ambiguous') {
      probable.push({ p, link: 'probable', confidence: r.confidence, raw });
    }
  }

  return { company, current, alumni, probable };
}

function slim(entry) {
  const { p } = entry;
  return {
    id: p.id,
    name: nameOf(p),
    title: titleOf(p),
    department: p.data?.department || null,
    location: p.data?.location || null,
    email: p.data?.email || null,
    person_type: p.data?.person_type || null,
    status: p.data?.status || null,
    rating: p.data?.rating || null,
    link: entry.link,
    confidence: entry.confidence != null ? Number(entry.confidence.toFixed(2)) : null,
    raw_employer: entry.raw || null,
  };
}

router.get('/:id/employees', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const roster = rosterFor(req.params.id, environment_id);
  if (!roster) return res.status(404).json({ error: 'Company not found' });

  const employees = [...roster.current].map(slim);
  const byDept = {};
  for (const e of employees) {
    const d = e.department || 'Unassigned';
    byDept[d] = (byDept[d] || 0) + 1;
  }
  res.json({
    employees,
    probable: roster.probable.map(slim),
    total: employees.length,
    by_department: byDept,
  });
});

router.get('/:id/alumni', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const roster = rosterFor(req.params.id, environment_id);
  if (!roster) return res.status(404).json({ error: 'Company not found' });

  const alumni = roster.alumni.map(entry => {
    const s = slim(entry);
    const dest = entry.p.data?.company_id
      ? findOne('records', r => r.id === entry.p.data.company_id && !r.deleted_at)
      : null;
    return { ...s, now_at: dest?.data?.company_name || employerOf(entry.p) || null, now_at_id: dest?.id || null };
  });
  res.json({ alumni, total: alumni.length });
});

// Explicitly move a person to this company (records the move for talent flow).
router.post('/:id/link-person', (req, res) => {
  if (!needObject(req, res, 'edit')) return;
  const { person_id, environment_id } = req.body;
  if (!person_id) return res.status(400).json({ error: 'person_id required' });
  const person = findOne('records', r => r.id === person_id && !r.deleted_at);
  if (!person) return res.status(404).json({ error: 'Person not found' });
  const company = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const prev = Array.isArray(person.data?.previous_company_ids) ? person.data.previous_company_ids : [];
  const oldId = person.data?.company_id || null;
  const nextPrev = oldId && oldId !== req.params.id && !prev.includes(oldId) ? [...prev, oldId] : prev;

  const updated = update('records', r => r.id === person_id, {
    data: {
      ...person.data,
      company_id: req.params.id,
      previous_company_ids: nextPrev,
      current_company: company.data?.company_name || person.data?.current_company,
      employer_unresolved: null,
    },
    updated_at: now(),
  });
  saveStore();
  res.json({ person: updated, moved_from: oldId });
});

// ═════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE — talent flow, feeders, comp bands, coverage
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id/intel', (req, res) => {
  if (!needGlobal(req, res, 'company_view_intel')) return;
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const roster = rosterFor(req.params.id, environment_id);
  if (!roster) return res.status(404).json({ error: 'Company not found' });
  const all = peopleIn(environment_id);
  const companyNames = new Map(
    query('records', r => r.object_id === objIds(environment_id).companies && !r.deleted_at)
      .map(c => [c.id, c.data?.company_name || 'Unnamed'])
  );

  // ── Inflow: current employees who previously sat somewhere we know ─────────
  const inflow = {};
  for (const { p } of roster.current) {
    const prev = Array.isArray(p.data?.previous_company_ids) ? p.data.previous_company_ids : [];
    const last = prev[prev.length - 1];
    if (!last || last === req.params.id) continue;
    const key = companyNames.get(last) || 'Unknown';
    inflow[key] = (inflow[key] || 0) + 1;
  }

  // ── Outflow: alumni and where they went ───────────────────────────────────
  const outflow = {};
  for (const { p } of roster.alumni) {
    const dest = p.data?.company_id ? companyNames.get(p.data.company_id) : employerOf(p);
    if (!dest) continue;
    outflow[dest] = (outflow[dest] || 0) + 1;
  }

  // ── Compensation, thresholded so nothing identifies an individual ─────────
  const MIN_N = 5;
  const salaries = roster.current
    .map(({ p }) => Number(p.data?.current_salary ?? p.data?.salary ?? NaN))
    .filter(n => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const pct = (arr, q) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : null;
  const compensation = salaries.length >= MIN_N ? {
    n: salaries.length,
    p25: pct(salaries, 0.25), median: pct(salaries, 0.5), p75: pct(salaries, 0.75),
    currency: roster.current.find(({ p }) => p.data?.salary_currency)?.p?.data?.salary_currency || null,
  } : { n: salaries.length, suppressed: true, min_required: MIN_N };

  // ── Notice periods ────────────────────────────────────────────────────────
  const notices = {};
  for (const { p } of roster.current) {
    const np = p.data?.notice_period;
    if (np) notices[np] = (notices[np] || 0) + 1;
  }

  // ── Similar companies — derived from shared talent movement, not a guess ──
  const shared = {};
  for (const p of all) {
    const ids = new Set([
      p.data?.company_id,
      ...(Array.isArray(p.data?.previous_company_ids) ? p.data.previous_company_ids : []),
    ].filter(Boolean));
    if (!ids.has(req.params.id)) continue;
    for (const id of ids) {
      if (id === req.params.id) continue;
      shared[id] = (shared[id] || 0) + 1;
    }
  }
  const similar = Object.entries(shared)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id, n]) => ({ company_id: id, name: companyNames.get(id) || 'Unknown', shared_people: n }));

  // ── Seniority spread ──────────────────────────────────────────────────────
  const SENIORITY = [
    [/\b(chief|ceo|cfo|coo|cto|cio|chro|president|managing director|md)\b/i, 'C-suite'],
    [/\b(evp|svp|vp|vice president)\b/i, 'VP'],
    [/\b(director|head of|general manager|gm)\b/i, 'Director'],
    [/\b(manager|lead|principal|supervisor)\b/i, 'Manager'],
    [/\b(senior|snr|sr)\b/i, 'Senior IC'],
    [/\b(intern|graduate|trainee|junior|jnr)\b/i, 'Entry'],
  ];
  const seniority = {};
  for (const { p } of roster.current) {
    const t = titleOf(p);
    const band = SENIORITY.find(([re]) => re.test(t))?.[1] || (t ? 'IC' : 'Unknown');
    seniority[band] = (seniority[band] || 0) + 1;
  }

  const stated = Number(roster.company.data?.headcount || 0);
  const mapped = roster.current.length;

  res.json({
    mapped_headcount: mapped,
    stated_headcount: stated || null,
    coverage_pct: stated > 0 ? Math.min(100, Math.round((mapped / stated) * 100)) : null,
    alumni_count: roster.alumni.length,
    probable_count: roster.probable.length,
    inflow:  Object.entries(inflow).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count})),
    outflow: Object.entries(outflow).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count})),
    similar_companies: similar,
    compensation,
    notice_periods: Object.entries(notices).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count})),
    seniority: Object.entries(seniority).sort((a,b)=>b[1]-a[1]).map(([band,count])=>({band,count})),
    by_department: roster.current.reduce((acc, { p }) => {
      const d = p.data?.department || 'Unassigned';
      acc[d] = (acc[d] || 0) + 1; return acc;
    }, {}),
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ALIASES + MERGE
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id/aliases', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const list = (getStore().company_aliases || [])
    .filter(a => a.company_id === req.params.id && !a.deleted_at);
  res.json(list);
});

router.post('/:id/aliases', (req, res) => {
  if (!needGlobal(req, res, 'company_manage_aliases')) return;
  const { alias, kind = 'variant', environment_id } = req.body;
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const store = getStore();
  if (!store.company_aliases) store.company_aliases = [];
  const tight = M.normTight(alias);
  const clash = store.company_aliases.find(
    a => !a.deleted_at && a.company_id !== req.params.id && M.normTight(a.alias) === tight
  );
  if (clash) return res.status(409).json({ error: 'Alias already used by another company', company_id: clash.company_id });

  const rec = {
    id: uuidv4(), company_id: req.params.id, environment_id: environment_id || null,
    alias: alias.trim(), kind, source: 'user',
    created_by: req.currentUser?.id || null, created_at: now(), deleted_at: null,
  };
  store.company_aliases.push(rec);
  saveStore();
  res.status(201).json(rec);
});

router.delete('/aliases/:aliasId', (req, res) => {
  if (!needGlobal(req, res, 'company_manage_aliases')) return;
  const store = getStore();
  const a = (store.company_aliases || []).find(x => x.id === req.params.aliasId);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.deleted_at = now();
  saveStore();
  res.json({ deleted: true });
});

// Merge `source` into `:id`. Source name becomes an alias of the survivor.
router.post('/:id/merge', (req, res) => {
  if (!needGlobal(req, res, 'company_manage_aliases')) return;
  if (!needObject(req, res, 'delete')) return;
  const { source_company_id, environment_id } = req.body;
  if (!source_company_id) return res.status(400).json({ error: 'source_company_id required' });
  if (source_company_id === req.params.id) return res.status(400).json({ error: 'Cannot merge a company into itself' });

  const survivor = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  const source   = findOne('records', r => r.id === source_company_id && !r.deleted_at);
  if (!survivor || !source) return res.status(404).json({ error: 'Company not found' });

  const store = getStore();
  if (!store.company_aliases) store.company_aliases = [];

  // Source name → alias of survivor
  store.company_aliases.push({
    id: uuidv4(), company_id: survivor.id, environment_id: environment_id || survivor.environment_id,
    alias: source.data?.company_name || 'Merged company', kind: 'former_name', source: 'merge',
    created_by: req.currentUser?.id || null, created_at: now(), deleted_at: null,
  });
  // Re-point the source's own aliases
  for (const a of store.company_aliases) {
    if (a.company_id === source_company_id && !a.deleted_at) a.company_id = survivor.id;
  }

  // Re-point people
  let moved = 0;
  for (const p of peopleIn(environment_id || survivor.environment_id)) {
    let changed = false;
    const data = { ...p.data };
    if (data.company_id === source_company_id) { data.company_id = survivor.id; changed = true; }
    if (Array.isArray(data.previous_company_ids) && data.previous_company_ids.includes(source_company_id)) {
      data.previous_company_ids = [...new Set(data.previous_company_ids.map(x => x === source_company_id ? survivor.id : x))]
        .filter(x => x !== survivor.id || data.company_id !== survivor.id);
      changed = true;
    }
    if (changed) { update('records', r => r.id === p.id, { data, updated_at: now() }); moved++; }
  }

  // Re-point relationships tagged to the source company
  for (const r of (store.relationships || [])) {
    if (r.company_id === source_company_id) r.company_id = survivor.id;
  }

  // Fill blank survivor fields from the source rather than losing data
  const merged = { ...survivor.data };
  for (const [k, v] of Object.entries(source.data || {})) {
    if (merged[k] === undefined || merged[k] === null || merged[k] === '') merged[k] = v;
  }
  update('records', r => r.id === survivor.id, { data: merged, updated_at: now() });
  update('records', r => r.id === source_company_id, { deleted_at: now(), updated_at: now() });

  saveStore();
  res.json({ survivor_id: survivor.id, merged_from: source_company_id, people_moved: moved });
});

// ═════════════════════════════════════════════════════════════════════════════
// AI RESEARCH
// ═════════════════════════════════════════════════════════════════════════════
const RESEARCH_SCHEMA = `{
  "summary": "2-3 sentence description of what the company does",
  "industry": "one of the standard industry values, or best fit",
  "headquarters": "City, Country",
  "locations": ["City, Country"],
  "headcount": 0,
  "headcount_band": "one of 1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10000+",
  "founded_year": 0,
  "ownership_type": "Listed|Private|Family Office|Government|Sovereign Wealth Backed|PE / VC Backed|Subsidiary|Joint Venture|Non-Profit|Other",
  "revenue": "e.g. USD 1.2bn (FY2024)",
  "website": "https://...",
  "linkedin_url": "https://linkedin.com/company/...",
  "careers_url": "https://...",
  "talent_notes": "Recruitment-relevant observations: hiring posture, known comp positioning, notable recent leadership moves, employer brand, attrition signals",
  "aliases": ["Other names, former names or common abbreviations"],
  "confidence": "high|medium|low",
  "sources": ["url"]
}`;

router.post('/:id/research', async (req, res) => {
  if (!needGlobal(req, res, 'company_research')) return;
  const { environment_id } = req.body;
  const company = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Research is not configured on this environment' });

  const name = company.data?.company_name || '';
  const hint = [company.data?.website, company.data?.headquarters, company.data?.industry]
    .filter(Boolean).join(' · ');

  const prompt = `Research the organisation "${name}"${hint ? ` (${hint})` : ''} and return a structured profile for a recruitment intelligence system.

Use web search to find current, verifiable information. Prefer the company's own site, filings and reputable business press. If a field cannot be verified, use null rather than guessing.

Return ONLY valid JSON matching this shape — no markdown fences, no preamble:
${RESEARCH_SCHEMA}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message || 'Research failed' });

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const start = jsonStr.indexOf('{'), end = jsonStr.lastIndexOf('}');
    let parsed;
    try { parsed = JSON.parse(jsonStr.slice(start, end + 1)); }
    catch { return res.status(502).json({ error: 'Could not parse research result', raw: text.slice(0, 800) }); }

    // Store the run — never auto-apply. The user reviews and accepts.
    const store = getStore();
    if (!store.company_research) store.company_research = [];
    const run = {
      id: uuidv4(), company_id: company.id, environment_id: environment_id || company.environment_id,
      result: parsed, applied: false,
      requested_by: req.currentUser?.id || null, created_at: now(),
    };
    store.company_research.push(run);
    saveStore();

    res.json({ run_id: run.id, result: parsed });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Research failed' });
  }
});

// Apply selected fields from a research run onto the company record.
router.post('/:id/research/:runId/apply', (req, res) => {
  if (!needObject(req, res, 'edit')) return;
  const { fields = [] } = req.body; // array of api_keys the user ticked
  const store = getStore();
  const run = (store.company_research || []).find(r => r.id === req.params.runId);
  if (!run) return res.status(404).json({ error: 'Research run not found' });
  const company = findOne('records', r => r.id === req.params.id && !r.deleted_at);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const patch = {};
  for (const k of fields) {
    if (k === 'aliases') continue;
    if (run.result[k] !== undefined && run.result[k] !== null) patch[k] = run.result[k];
  }
  patch.last_researched_at = now().slice(0, 10);
  patch.research_source = Array.isArray(run.result.sources) ? run.result.sources.slice(0, 3).join(', ') : null;

  const updated = update('records', r => r.id === company.id, {
    data: { ...company.data, ...patch }, updated_at: now(),
  });

  // Aliases are opt-in too
  let aliasCount = 0;
  if (fields.includes('aliases') && Array.isArray(run.result.aliases)) {
    if (!store.company_aliases) store.company_aliases = [];
    const existing = new Set(store.company_aliases
      .filter(a => a.company_id === company.id && !a.deleted_at)
      .map(a => M.normTight(a.alias)));
    for (const alias of run.result.aliases) {
      const t = M.normTight(alias);
      if (!t || existing.has(t) || t === M.normTight(company.data?.company_name)) continue;
      store.company_aliases.push({
        id: uuidv4(), company_id: company.id, environment_id: company.environment_id,
        alias, kind: 'variant', source: 'ai',
        created_by: req.currentUser?.id || null, created_at: now(), deleted_at: null,
      });
      existing.add(t); aliasCount++;
    }
  }

  run.applied = true; run.applied_at = now();
  saveStore();
  res.json({ company: updated, aliases_created: aliasCount });
});

router.get('/:id/research', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const runs = (getStore().company_research || [])
    .filter(r => r.company_id === req.params.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(runs);
});

// ═════════════════════════════════════════════════════════════════════════════
// SUGGESTED REPORTING LINES
// ═════════════════════════════════════════════════════════════════════════════
router.post('/:id/infer-org', async (req, res) => {
  if (!needGlobal(req, res, 'company_infer_org')) return;
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const roster = rosterFor(req.params.id, environment_id);
  if (!roster) return res.status(404).json({ error: 'Company not found' });

  const staff = roster.current.map(({ p }) => ({
    id: p.id, name: nameOf(p), title: titleOf(p), department: p.data?.department || null,
  })).filter(s => s.title);

  if (staff.length < 2) return res.status(400).json({ error: 'Need at least 2 employees with job titles to infer structure' });
  if (staff.length > 150) staff.length = 150;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Inference is not configured on this environment' });

  const existing = query('relationships', r =>
    r.environment_id === environment_id && !r.deleted_at &&
    staff.some(s => s.id === r.from_record_id)
  );
  const alreadyLinked = new Set(existing.filter(r => r.type === 'reports_to').map(r => r.from_record_id));
  const todo = staff.filter(s => !alreadyLinked.has(s.id));
  if (!todo.length) return res.json({ created: 0, suggestions: [], message: 'Every employee already has a reporting line' });

  const prompt = `You are mapping the reporting structure of "${roster.company.data?.company_name}" from job titles alone.

Employees:
${staff.map(s => `${s.id} | ${s.name} | ${s.title}${s.department ? ` | ${s.department}` : ''}`).join('\n')}

Infer who reports to whom using seniority and function. Rules:
- Only propose a link when the title hierarchy makes it genuinely likely.
- Keep people within their own function unless the manager is C-suite or the org is small.
- One manager per person. Never create a cycle. The most senior person reports to no one.
- confidence: 0.9+ only when the hierarchy is unambiguous (e.g. "Marketing Executive" → "Head of Marketing"). Use 0.5–0.7 when it is a reasonable guess. Omit anything below 0.5.
- Only include people from this list: ${todo.map(t => t.id).join(', ')}

Return ONLY a JSON array, no markdown:
[{"from_id":"...","to_id":"...","confidence":0.85,"reason":"short justification"}]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL_DEFAULT,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message || 'Inference failed' });

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const clean = text.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('['), e = clean.lastIndexOf(']');
    let proposals;
    try { proposals = JSON.parse(clean.slice(s, e + 1)); }
    catch { return res.status(502).json({ error: 'Could not parse inference result', raw: text.slice(0, 800) }); }

    const validIds = new Set(staff.map(x => x.id));
    const created = [];

    for (const p of proposals) {
      if (!validIds.has(p.from_id) || !validIds.has(p.to_id)) continue;
      if (p.from_id === p.to_id) continue;
      if (Number(p.confidence) < 0.5) continue;
      const dupe = query('relationships', x =>
        x.from_record_id === p.from_id && x.to_record_id === p.to_id &&
        x.type === 'reports_to' && !x.deleted_at
      );
      if (dupe.length) continue;

      const rel = insert('relationships', {
        id: uuidv4(),
        from_record_id: p.from_id, to_record_id: p.to_id,
        type: 'reports_to', inverse_type: 'manages',
        environment_id, company_id: req.params.id,
        start_date: null, end_date: null,
        notes: p.reason || null,
        source: 'ai', confidence: Number(p.confidence),
        confirmed_by: null, confirmed_at: null,
        created_at: now(), updated_at: now(), deleted_at: null,
      });
      created.push({
        ...rel,
        from_name: staff.find(x => x.id === p.from_id)?.name,
        to_name:   staff.find(x => x.id === p.to_id)?.name,
      });
    }
    saveStore();
    res.json({ created: created.length, suggestions: created });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Inference failed' });
  }
});

// Bulk confirm / reject suggested relationships.
router.post('/relationships/confirm', (req, res) => {
  if (!needGlobal(req, res, 'company_infer_org')) return;
  const { relationship_ids = [], action = 'confirm' } = req.body;
  if (!Array.isArray(relationship_ids) || !relationship_ids.length)
    return res.status(400).json({ error: 'relationship_ids required' });

  const store = getStore();
  let n = 0;
  for (const rel of (store.relationships || [])) {
    if (!relationship_ids.includes(rel.id)) continue;
    if (action === 'reject') {
      rel.deleted_at = now();
    } else {
      rel.source = 'user';
      rel.confirmed_by = req.currentUser?.id || null;
      rel.confirmed_at = now();
      rel.confidence = 1;
    }
    rel.updated_at = now();
    n++;
  }
  saveStore();
  res.json({ [action === 'reject' ? 'rejected' : 'confirmed']: n });
});

// Suggested (unconfirmed) relationships for a company.
router.get('/:id/suggested-relationships', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id } = req.query;
  const rels = query('relationships', r =>
    r.company_id === req.params.id && r.source === 'ai' && !r.confirmed_at && !r.deleted_at &&
    (!environment_id || r.environment_id === environment_id)
  );
  const people = peopleIn(environment_id || rels[0]?.environment_id);
  const nm = (id) => { const p = people.find(x => x.id === id); return p ? nameOf(p) : 'Unknown'; };
  const tl = (id) => { const p = people.find(x => x.id === id); return p ? titleOf(p) : ''; };
  res.json(rels.map(r => ({
    ...r,
    from_name: nm(r.from_record_id), from_title: tl(r.from_record_id),
    to_name:   nm(r.to_record_id),   to_title:   tl(r.to_record_id),
  })).sort((a, b) => (b.confidence || 0) - (a.confidence || 0)));
});

// ═════════════════════════════════════════════════════════════════════════════
// OFF LIMITS — checked by outreach and sourcing
// ═════════════════════════════════════════════════════════════════════════════
router.get('/off-limits/check', (req, res) => {
  if (!needObject(req, res, 'view')) return;
  const { environment_id, person_id, company_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  let cid = company_id;
  if (!cid && person_id) {
    const p = findOne('records', r => r.id === person_id && !r.deleted_at);
    cid = p?.data?.company_id;
    if (!cid && p) {
      const { index } = loadIndex(environment_id);
      cid = M.resolveEmployer(employerOf(p), index).company_id;
    }
  }
  if (!cid) return res.json({ off_limits: false });

  const c = findOne('records', r => r.id === cid && !r.deleted_at);
  if (!c) return res.json({ off_limits: false });

  const until = c.data?.off_limits_until;
  const expired = until && new Date(until) < new Date();
  const active = Boolean(c.data?.off_limits) && !expired;

  res.json({
    off_limits: active,
    company_id: cid,
    company_name: c.data?.company_name || null,
    reason: active ? (c.data?.off_limits_reason || 'Restricted') : null,
    until: until || null,
    expired: Boolean(expired),
  });
});

module.exports = router;
