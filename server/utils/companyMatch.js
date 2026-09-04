'use strict';
/**
 * companyMatch.js — employer string → Company record resolution.
 *
 * Two-tier normalisation:
 *   normTight  strips legal form only  ("Emaar Properties PJSC" → "emaar properties")
 *              used for exact-match auto-link. Safe: PJSC/LLC never distinguishes entities.
 *   normLoose  also strips Group/Holdings/International/etc and stopwords
 *              used to generate fuzzy candidates only. Never auto-links.
 *
 * Plus acronym indexing ("Abu Dhabi Commercial Bank" → "adcb") which is how
 * half of MENA actually refers to its own employers.
 *
 * Nothing here writes. Callers decide what to do with a match result.
 */

// ── Legal form suffixes ──────────────────────────────────────────────────────
// Stripped by normTight. These never distinguish one company from another.
const LEGAL_FORMS = [
  // Gulf / MENA
  'llc', 'l l c', 'fz llc', 'fz', 'fzllc', 'fze', 'fzc', 'fzco', 'fz co',
  'dmcc', 'difc', 'jafza', 'rakez', 'sharjah publishing city',
  'pjsc', 'pjs', 'psc', 'pssc', 'p j s c', 'qsc', 'qpsc', 'qfc',
  'wll', 'w l l', 'saog', 'saoc', 'sacc', 'kscp', 'kscc', 'ksc',
  'bsc', 'bsc c', 'spc', 'est', 'establishment', 'sole proprietorship',
  // International
  'ltd', 'ltd.', 'limited', 'plc', 'inc', 'inc.', 'incorporated',
  'corp', 'corp.', 'corporation', 'co', 'co.', 'company',
  'gmbh', 'mbh', 'ag', 'kg', 'ohg', 'ug',
  'sa', 'sas', 'sarl', 's a r l', 'sasu', 'sci',
  'srl', 'spa', 's p a', 'snc',
  'bv', 'b v', 'nv', 'n v', 'cv',
  'ab', 'as', 'a s', 'oy', 'oyj', 'aps', 'kk', 'k k',
  'pty', 'pty ltd', 'pte', 'pte ltd', 'sdn bhd', 'sdn', 'bhd',
  'pvt', 'pvt ltd', 'private limited', 'p ltd',
  'lp', 'llp', 'lc', 'pc', 'pllc', 'dba',
];

// ── Descriptor words ─────────────────────────────────────────────────────────
// Stripped by normLoose ONLY. These sometimes DO distinguish entities
// ("Al-Futtaim" vs "Al-Futtaim Group" can be different legal entities) so we
// never auto-link on a loose match — we surface it as a suggestion.
const DESCRIPTORS = [
  'group', 'holding', 'holdings', 'international', 'intl', 'worldwide',
  'global', 'enterprises', 'enterprise', 'ventures', 'partners', 'associates',
  'solutions', 'services', 'systems', 'technologies', 'technology',
  'consulting', 'consultancy', 'trading', 'general trading', 'contracting',
  'industries', 'investments', 'investment', 'capital', 'management',
  'the', 'and',
];

// Common word-level substitutions applied before tokenising.
const SUBSTITUTIONS = [
  [/&/g, ' and '],
  [/\+/g, ' and '],
  [/\bintl\b/g, 'international'],
  [/\btech\b/g, 'technology'],
  [/\bmgmt\b/g, 'management'],
  [/\bmfg\b/g, 'manufacturing'],
  [/\buniv\b/g, 'university'],
  [/\bnatl\b/g, 'national'],
  [/\bdept\b/g, 'department'],
  [/\bgovt\b/g, 'government'],
  [/\bst\b/g, 'saint'],
];

// ── Base normalisation ───────────────────────────────────────────────────────
function baseNormalise(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.toLowerCase().trim();

  // Strip diacritics (café → cafe, Émirates → emirates)
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Arabic definite-article variants: "Al-Futtaim" / "AlFuttaim" / "El Futtaim"
  s = s.replace(/\b(al|el)[\s\-']+/g, 'al ');
  s = s.replace(/\bal([a-z]{4,})\b/g, 'al $1');

  // Drop anything in brackets — usually a location or note
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\[[^\]]*\]/g, ' ');

  // Drop trailing location qualifiers: "Deloitte - Middle East", "PwC | UAE"
  s = s.replace(/\s*[|–—-]\s*(uae|ksa|qatar|middle east|mena|emea|gcc|dubai|abu dhabi|riyadh|doha|london|usa|uk)\s*$/g, ' ');

  for (const [re, to] of SUBSTITUTIONS) s = s.replace(re, to);

  // Punctuation → space, collapse whitespace
  s = s.replace(/[.,'’"`/\\_:;!?*#]/g, ' ');
  s = s.replace(/[-–—]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

function stripTrailing(tokens, wordSet) {
  // Remove matching words from the END only. "Group Limited" → "" but
  // "Group Four Securicor" keeps "Group" because it's not trailing.
  const out = tokens.slice();
  while (out.length > 1 && wordSet.has(out[out.length - 1])) out.pop();
  return out;
}

const LEGAL_SINGLE = new Set(LEGAL_FORMS.filter(f => !f.includes(' ')));
const DESCRIPTOR_SET = new Set(DESCRIPTORS.filter(d => !d.includes(' ')));

/**
 * Tight key — legal form removed. Safe for exact-match auto-linking.
 */
function normTight(raw) {
  let s = baseNormalise(raw);
  if (!s) return '';
  // Multi-word legal forms first ("sdn bhd", "pte ltd", "fz llc")
  for (const f of LEGAL_FORMS.filter(x => x.includes(' '))) {
    s = s.replace(new RegExp(`\\s+${f}\\s*$`), '');
  }
  let tokens = stripTrailing(s.split(' ').filter(Boolean), LEGAL_SINGLE);
  return tokens.join(' ');
}

/**
 * Loose key — descriptors also removed. Candidate generation ONLY.
 */
function normLoose(raw) {
  const tight = normTight(raw);
  if (!tight) return '';
  let tokens = tight.split(' ').filter(Boolean);
  tokens = stripTrailing(tokens, DESCRIPTOR_SET);
  tokens = tokens.filter(t => !DESCRIPTOR_SET.has(t) || tokens.length <= 1);
  return tokens.join(' ');
}

/**
 * Acronym — first letter of each meaningful word, 2+ words only.
 * "Abu Dhabi Commercial Bank" → "adcb"
 */
function acronym(raw) {
  const tokens = normLoose(raw).split(' ').filter(t => t.length > 1);
  if (tokens.length < 2 || tokens.length > 6) return '';
  return tokens.map(t => t[0]).join('');
}

/**
 * Every plausible acronym for a name, not just first-letters.
 *
 * "Emirates NBD" is universally called ENBD, never EN — because NBD is already
 * an initialism and stays whole. Same shape gives ADNOC from "Abu Dhabi
 * National Oil Company" and ADCB from "Abu Dhabi Commercial Bank". This is how
 * MENA actually refers to its own employers, so it has to be indexed.
 */
function acronymVariants(raw) {
  const out = new Set();
  if (!raw) return out;

  const looseTokens = normLoose(raw).split(' ').filter(Boolean);
  const tightTokens = normTight(raw).split(' ').filter(Boolean);
  // Before legal-form stripping: ADNOC and SABIC both end in the letter taken
  // from "Company" / "Corporation", so those words have to still be present.
  const baseTokens  = baseNormalise(raw).split(' ').filter(Boolean);

  const build = (tokens, keepShortWhole) => {
    const words = tokens.filter(t => t.length > 1);
    if (words.length < 2 || words.length > 6) return;
    const key = words
      .map(t => (keepShortWhole && t.length <= 4 ? t : t[0]))
      .join('');
    // Two letters is not an acronym, it is a collision. Every two-token
    // company produces one, so 'EP' would match Emaar Properties, Emirates
    // Post and Etihad Petroleum alike.
    if (key.length >= 3 && key.length <= 8) out.add(key);
  };

  build(looseTokens, false);   // emirates nbd  -> en
  build(looseTokens, true);    // emirates nbd  -> enbd
  build(tightTokens, false);
  build(tightTokens, true);
  build(baseTokens, false);    // abu dhabi national oil company -> adnoc
  build(baseTokens, true);

  return out;
}

// ── Similarity ───────────────────────────────────────────────────────────────
function bigrams(s) {
  const padded = ` ${s} `;
  const out = new Map();
  for (let i = 0; i < padded.length - 1; i++) {
    const g = padded.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

/** Sørensen–Dice on character bigrams. 0..1 */
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const A = bigrams(a), B = bigrams(b);
  let overlap = 0, totalA = 0, totalB = 0;
  for (const [g, n] of A) { totalA += n; if (B.has(g)) overlap += Math.min(n, B.get(g)); }
  for (const [, n] of B) totalB += n;
  return (2 * overlap) / (totalA + totalB);
}

/** Token containment — "emaar" inside "emaar properties" scores well. */
function containment(a, b) {
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / Math.min(ta.size, tb.size);
}

// ── Index ────────────────────────────────────────────────────────────────────
/**
 * Build a lookup index from company records + aliases.
 * companies: [{ id, data:{ company_name, ... } }]
 * aliases:   [{ id, company_id, alias, kind }]
 */
// ── Email domain ─────────────────────────────────────────────────────────────
// The strongest signal available and the cheapest to check. A person on
// @emaar.ae works at Emaar — no fuzzy matching required, near-zero false
// positives. Free providers are excluded because they say nothing.

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'outlook.com', 'live.com',
  'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'gmx.net', 'mail.com',
  'zoho.com', 'yandex.com', 'yandex.ru', 'qq.com', '163.com', '126.com',
  'naver.com', 'rediffmail.com', 'mailinator.com', 'tutanota.com',
]);

// Multi-part public suffixes, so 'co.uk' is never mistaken for a company domain
const COMPOUND_TLDS = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'co.nz', 'co.za', 'co.in', 'co.jp', 'co.kr',
  'com.sa', 'com.eg', 'com.qa', 'com.kw', 'com.bh', 'com.om', 'com.jo',
  'com.lb', 'com.tr', 'com.pk', 'com.sg', 'com.my', 'com.br', 'com.mx',
  'com.cn', 'com.hk', 'com.tw', 'com.ph', 'com.vn', 'org.ae', 'net.ae',
  'gov.ae', 'ac.ae', 'sch.ae',
]);

function cleanDomain(value) {
  if (!value || typeof value !== 'string') return null;
  let s = value.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
  s = s.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  if (!s || !s.includes('.') || s.endsWith('.')) return null;
  return s;
}

/** Company domain from an email address, or null for free providers. */
function emailDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const d = cleanDomain(email.slice(at + 1));
  if (!d || FREE_EMAIL_DOMAINS.has(d)) return null;
  return d;
}

/**
 * Domains to try, most specific first, so a subdomain still resolves to the
 * parent company.
 *   'careers.sub.adnoc.ae' → ['careers.sub.adnoc.ae', 'sub.adnoc.ae', 'adnoc.ae']
 */
function domainLadder(domain) {
  const d = cleanDomain(domain);
  if (!d) return [];
  const parts = d.split('.');
  const out = [d];
  for (let i = 1; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join('.');
    if (candidate.split('.').length < 2) break;
    if (COMPOUND_TLDS.has(candidate)) break;
    out.push(candidate);
  }
  return out;
}

function buildIndex(companies, aliases = []) {
  const byTight = new Map();     // tight key  → Set(company_id)
  const byAcronym = new Map();   // acronym    → Set(company_id)
  const byDomain = new Map();    // domain     → Set(company_id)
  const entries = [];            // { company_id, tight, loose, display }

  const push = (map, key, id) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(id);
  };

  const add = (companyId, name) => {
    if (!name) return;
    const tight = normTight(name);
    const loose = normLoose(name);
    push(byTight, tight, companyId);
    for (const acr of acronymVariants(name)) push(byAcronym, acr, companyId);
    // A short all-caps name IS its own acronym ("ENBD", "STC", "SABIC")
    const flat = baseNormalise(name).replace(/\s+/g, '');
    if (flat.length >= 2 && flat.length <= 6) push(byAcronym, flat, companyId);
    entries.push({ company_id: companyId, tight, loose, display: name });
  };

  const addDomains = (companyId, source) => {
    const raw = Array.isArray(source) ? source : String(source || '').split(/[,;\s]+/);
    for (const item of raw) {
      const d = cleanDomain(item);
      if (d) push(byDomain, d, companyId);
    }
  };

  for (const c of companies) {
    add(c.id, c.data?.company_name || c.data?.name);
    addDomains(c.id, c.data?.domains);
    addDomains(c.id, c.data?.website);
  }
  for (const a of aliases) add(a.company_id, a.alias);

  return { byTight, byAcronym, byDomain, entries };
}

// ── Resolution ───────────────────────────────────────────────────────────────
const AUTO_LINK_MIN = 0.92;   // fuzzy score at/above which we auto-link
const SUGGEST_MIN   = 0.62;   // below this we don't even show it

/**
 * Resolve a raw employer string against the index.
 * Returns:
 *   { status: 'exact'|'alias'|'acronym'|'strong'|'ambiguous'|'none',
 *     company_id, confidence, candidates: [{ company_id, name, score, reason }] }
 *
 * Only 'exact' | 'alias' | 'acronym' | 'strong' should ever auto-link.
 */
function resolveEmployer(raw, index, opts = {}) {
  const empty = { status: 'none', company_id: null, confidence: 0, candidates: [] };
  if (!raw || !String(raw).trim()) return empty;

  const tight = normTight(raw);
  const loose = normLoose(raw);
  if (!tight) return empty;

  const nameOf = (id) => index.entries.find(e => e.company_id === id)?.display || '';

  // 0. Email domain — checked before anything else. A person on a company
  //    address works there; no name comparison can beat that.
  const hint = emailDomain(opts.email) || cleanDomain(opts.domain);
  if (hint && index.byDomain) {
    for (const candidate of domainLadder(hint)) {
      const hit = index.byDomain.get(candidate);
      if (hit && hit.size === 1) {
        const id = [...hit][0];
        const exactDomain = candidate === hint;
        return {
          status: 'domain',
          company_id: id,
          confidence: exactDomain ? 0.98 : 0.93,
          candidates: [{
            company_id: id, name: nameOf(id),
            score: exactDomain ? 0.98 : 0.93,
            reason: exactDomain ? `Email domain (${candidate})`
                                : `Parent domain (${candidate})`,
          }],
        };
      }
    }
  }

  // 1. Exact on tight key
  const exact = index.byTight.get(tight);
  if (exact && exact.size === 1) {
    const id = [...exact][0];
    return { status: 'exact', company_id: id, confidence: 1,
             candidates: [{ company_id: id, name: nameOf(id), score: 1, reason: 'Exact name match' }] };
  }
  if (exact && exact.size > 1) {
    return { status: 'ambiguous', company_id: null, confidence: 0,
             candidates: [...exact].map(id => ({ company_id: id, name: nameOf(id), score: 1, reason: 'Exact name match (multiple)' })) };
  }

  // 2. Acronym
  const acrRaw = acronym(raw);
  const flatQ = tight.replace(/\s+/g, '');
  const acr = (acrRaw && acrRaw.length >= 3) ? acrRaw
            : (flatQ.length >= 3 && flatQ.length <= 6) ? flatQ : '';
  const byAcr = acr ? index.byAcronym.get(acr) : null;
  if (byAcr && byAcr.size === 1) {
    const id = [...byAcr][0];
    return { status: 'acronym', company_id: id, confidence: 0.9,
             candidates: [{ company_id: id, name: nameOf(id), score: 0.9, reason: `Acronym match (${acr.toUpperCase()})` }] };
  }

  // 3. Fuzzy
  const scored = [];
  const seen = new Set();
  for (const e of index.entries) {
    const sTight = similarity(tight, e.tight);
    const sLoose = loose && e.loose ? similarity(loose, e.loose) : 0;
    const cont   = containment(tight, e.tight);
    const score  = Math.max(sTight, sLoose * 0.95, cont * 0.88);
    if (score < SUGGEST_MIN) continue;
    const key = e.company_id;
    const prev = scored.find(x => x.company_id === key);
    if (prev) { if (score > prev.score) { prev.score = score; prev.name = e.display; } continue; }
    seen.add(key);
    scored.push({
      company_id: key, name: e.display, score,
      reason: sTight >= sLoose && sTight >= cont ? 'Similar name'
            : cont > sLoose ? 'Shares key words' : 'Similar after normalisation',
    });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, opts.limit || 5);

  if (!top.length) return empty;

  const best = top[0];
  const runnerUp = top[1];
  const clearWinner = !runnerUp || (best.score - runnerUp.score) > 0.08;

  if (best.score >= AUTO_LINK_MIN && clearWinner) {
    return { status: 'strong', company_id: best.company_id, confidence: best.score, candidates: top };
  }
  return { status: 'ambiguous', company_id: null, confidence: best.score, candidates: top };
}

/**
 * Group a list of raw employer strings into clusters that likely refer to the
 * same organisation. Used by the "suggest companies from existing data" flow.
 * Returns [{ canonical, variants:[{raw,count}], total }] sorted by total desc.
 */
function clusterEmployerStrings(rows) {
  // rows: [{ raw, count }]
  const clusters = [];
  const sorted = rows.slice().sort((a, b) => b.count - a.count);

  for (const row of sorted) {
    const tight = normTight(row.raw);
    if (!tight) continue;
    let target = null;
    for (const c of clusters) {
      if (c.key === tight) { target = c; break; }
      if (similarity(tight, c.key) >= 0.88 || containment(tight, c.key) >= 0.95) { target = c; break; }
    }
    if (target) {
      target.variants.push(row);
      target.total += row.count;
    } else {
      clusters.push({ key: tight, canonical: row.raw.trim(), variants: [row], total: row.count });
    }
  }
  return clusters.sort((a, b) => b.total - a.total);
}

module.exports = {
  normTight, normLoose, acronym, acronymVariants, similarity, containment,
  buildIndex, resolveEmployer, clusterEmployerStrings,
  emailDomain, domainLadder, cleanDomain,
  AUTO_LINK_MIN, SUGGEST_MIN,
  LEGAL_FORMS, DESCRIPTORS,
};
