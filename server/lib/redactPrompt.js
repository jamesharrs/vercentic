// server/lib/redactPrompt.js
'use strict';
/**
 * Best-effort PII redaction for free-text AI prompts before they're persisted
 * to ai_usage_log for reporting/audit purposes (see routes/ai-proxy.js).
 *
 * Two passes, both pure string/Set operations — no AI call, no disk I/O beyond
 * what the tenant's records already have loaded into memory for the request:
 *
 *   1. Known-entity redaction — every first/last/full name found on this
 *      tenant's own records + users (same field-key vocabulary as
 *      lib/pii.js's DEFAULT_PII_FIELDS) is looked up token-by-token against
 *      the prompt. We tokenize the PROMPT (short) and do Set lookups against
 *      the roster (which can be large) — never a regex alternation built from
 *      every name in the tenant, which would scale the wrong way.
 *   2. Structured-PII regex pass — emails, phone numbers, and long digit runs
 *      (national ID / passport / salary-like numbers) as a fallback for
 *      anything not already caught by pass 1.
 *
 * The per-tenant name-token Set is cached for 60s (server/utils/cache.js) so a
 * back-and-forth copilot conversation doesn't rebuild the roster from scratch
 * on every message. Not scoped to any particular object type — any record
 * with a name-shaped field contributes, since the data model here is fully
 * admin-configurable and it's better to over-protect than to special-case a
 * "People" object slug that might not be what a given tenant actually calls it.
 *
 * Callers should invoke this AFTER the response has already been sent to the
 * user — it's a logging side-effect, never something a request should block on.
 */

const { query, getCurrentTenant } = require('../db/init');
const cache = require('../utils/cache');

const NAME_FIELDS = ['first_name', 'last_name', 'full_name', 'name'];
const CACHE_TTL_MS = 60_000;
const MAX_SNIPPET_LEN = 300;

// Tokens shorter than this are too likely to be ordinary short words ("Hi",
// "Ok", "Is") rather than a real name — skip them even if they happen to
// match a 2-letter name fragment. Under-redacting a rare 2-letter name is a
// much smaller risk than over-redacting common short words in every prompt.
const MIN_TOKEN_LEN = 3;

function _tokensFromName(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/\s+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= MIN_TOKEN_LEN && /^[a-z''-]+$/i.test(t));
}

/**
 * Build (or fetch cached) a Set of lowercase name tokens for the current
 * tenant, drawn from every record + user with a name-shaped field.
 */
function _getNameTokenSet() {
  const tenant = getCurrentTenant() || 'master';
  const cacheKey = `redact-names:${tenant}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tokens = new Set();
  const addFrom = (obj) => {
    if (!obj) return;
    for (const field of NAME_FIELDS) {
      const val = obj[field];
      if (typeof val === 'string') _tokensFromName(val).forEach(t => tokens.add(t));
    }
  };

  for (const r of query('records', () => true)) addFrom(r.data);
  for (const u of query('users', () => true)) addFrom(u);

  cache.set(cacheKey, tokens, CACHE_TTL_MS);
  return tokens;
}

// ── Structured PII (fallback pass) ──────────────────────────────────────────
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;   // +971 50 123 4567, (555) 123-4567, etc.
const LONG_DIGIT_RE = /\b\d{6,}\b/g;              // national ID / passport / salary-like runs

function _redactStructured(text) {
  return text
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(PHONE_RE, (m) => (m.replace(/\D/g, '').length >= 7 ? '[PHONE]' : m))
    .replace(LONG_DIGIT_RE, '[NUMBER]');
}

/**
 * Redact known names + structured PII from a free-text prompt.
 * Pure, synchronous, no I/O beyond the tenant store already resident in memory.
 * @param {string} text - raw prompt text
 * @returns {string} redacted, length-capped snippet safe to persist for reporting
 */
function redactPrompt(text) {
  if (!text || typeof text !== 'string') return '';

  // Structured PII FIRST, names second — deliberately in this order.
  // EMAIL_RE/PHONE_RE match multi-character spans like "marcus@corp.com" as
  // one unit. If the name pass ran first, it would tokenize *inside* that
  // span (an email's local-part is often literally someone's first name)
  // and rewrite it to "[PERSON]@corp.com" — which no longer matches EMAIL_RE
  // at all, so the domain would leak through completely unredacted afterward.
  // Running structured PII first consumes the whole email/phone as an atomic
  // [EMAIL]/[PHONE] tag before the tokenizer ever gets a chance to look inside it.
  let redacted = _redactStructured(text);

  const nameTokens = _getNameTokenSet();

  // Tokenize the PROMPT (cost scales with prompt length, not roster size).
  // The token capture (including apostrophes) is deliberately the same shape
  // as _tokensFromName's own vocabulary check, so an internal-apostrophe name
  // like "O'Brien" matches directly. But a *trailing* possessive — "Harrison's"
  // — is captured as one token here too, and the roster never stores the "'s"
  // suffix (raw names don't have one), so it wouldn't match without a second
  // check: strip a trailing possessive and retry. Without this, the single
  // most natural way to ask about someone ("tell me about James Harrison's
  // skills") would redact "James" but silently leak "Harrison's".
  // (Matches [A-Za-z] only for the letters, so it also passes harmlessly over
  // the [EMAIL]/[PHONE]/[NUMBER] tags already inserted above — "EMAIL" etc.
  // just won't be in the name-token set.)
  redacted = redacted.replace(/[A-Za-z''-]+/g, (word) => {
    const lower = word.toLowerCase();
    if (nameTokens.has(lower)) return '[PERSON]';
    const stripped = lower.replace(/['’]s$/, '');
    if (stripped !== lower && nameTokens.has(stripped)) return '[PERSON]';
    return word;
  });

  // Collapse "James Harrison" (two matched tokens) → one [PERSON] tag rather
  // than "[PERSON] [PERSON]".
  redacted = redacted.replace(/(\[PERSON\]\s*){2,}/g, '[PERSON] ');

  if (redacted.length > MAX_SNIPPET_LEN) redacted = redacted.slice(0, MAX_SNIPPET_LEN) + '…';
  return redacted;
}

module.exports = { redactPrompt, _getNameTokenSet, _tokensFromName };
