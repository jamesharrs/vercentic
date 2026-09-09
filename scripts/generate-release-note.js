#!/usr/bin/env node
'use strict';
// scripts/generate-release-note.js
//
// Runs after a successful production deploy (see the `release-note` job in
// .github/workflows/deploy-production.yml). Looks at the commits that just
// landed on `main`, pulls out any `feat:`/`feat(scope):` commits (features
// only — fixes, chores, docs etc. are deliberately excluded), and creates a
// single DRAFT release note summarising them via the release-notes API.
//
// Design choices, on purpose:
//   - One note per production deploy (matches this repo's promotion-PR
//     cadence — a deploy is usually a batch of several merged PRs).
//   - Draft by default (`published: false`). A human still reviews/edits the
//     wording and hits Publish in Settings → Release Notes before it's shown
//     to users. This script only saves someone the trouted-out copy-paste.
//   - Version continues the existing semver-minor-bump pattern already used
//     in this table (1.0.0 → 1.7.0 → …), completely independent of
//     package.json / git tags (neither is used for this repo's versioning).
//   - Fully non-fatal: any failure here (bad range, API down, missing
//     secret) just logs a warning and exits 0 — this must never fail a
//     deploy that otherwise succeeded. The workflow also sets
//     `continue-on-error: true` on this job as a second safety net.
//
// Usage (CI):
//   GITHUB_EVENT_BEFORE=<sha> GITHUB_EVENT_AFTER=<sha> \
//   INTERNAL_API_KEY=<secret> node scripts/generate-release-note.js
//
// Usage (manual/local dry run — prints what it would create, still posts
// unless RELEASE_NOTE_DRY_RUN=1):
//   node scripts/generate-release-note.js
//   RELEASE_NOTE_DRY_RUN=1 node scripts/generate-release-note.js

const { execSync } = require('child_process');

const API_BASE = process.env.RELEASE_NOTES_API_URL || 'https://talentos-production-4045.up.railway.app';
const ZERO_SHA = '0000000000000000000000000000000000000000';

function warn(msg) { console.warn(`[release-note] ${msg}`); }
function info(msg) { console.log(`[release-note] ${msg}`); }

function getCommitRange() {
  const before = process.env.GITHUB_EVENT_BEFORE;
  const after  = process.env.GITHUB_EVENT_AFTER || 'HEAD';
  if (before && before !== ZERO_SHA) return `${before}..${after}`;
  // First push to the branch (or before/after unavailable, e.g. manual run) —
  // fall back to a bounded window so we never scan the whole repo history.
  warn(`no usable 'before' SHA (${before || 'unset'}) — falling back to last 20 commits`);
  return `HEAD~20..${after}`;
}

function getFeatureCommitSubjects(range) {
  let raw;
  try {
    raw = execSync(`git log ${range} --no-merges --pretty=format:%s`, { encoding: 'utf8' });
  } catch (e) {
    warn(`git log failed for range "${range}": ${e.message}`);
    return [];
  }
  const subjects = raw.split('\n').map(s => s.trim()).filter(Boolean);
  const featRe = /^feat(\([^)]*\))?!?:\s*(.+)$/i;
  const seen = new Set();
  const features = [];
  for (const s of subjects) {
    const m = s.match(featRe);
    if (!m) continue;
    const text = m[2].trim();
    const label = text.charAt(0).toUpperCase() + text.slice(1);
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    features.push(label);
  }
  return features;
}

function parseSemver(v) {
  const m = String(v || '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function nextVersion(existingNotes) {
  let max = null;
  for (const n of existingNotes) {
    const v = parseSemver(n.version);
    if (!v) continue;
    if (!max || v.major > max.major || (v.major === max.major && v.minor > max.minor)) max = v;
  }
  if (!max) return '1.0.0'; // no notes at all yet — first one
  return `${max.major}.${max.minor + 1}.0`;
}

async function fetchExistingNotes() {
  const res = await fetch(`${API_BASE}/api/release-notes?published_only=false`);
  if (!res.ok) throw new Error(`GET /release-notes → ${res.status}`);
  return res.json();
}

function buildNote(features, version) {
  const title = features.length === 1
    ? features[0]
    : 'Platform Update';
  const summary = features.length === 1
    ? features[0]
    : `${features.length} new features shipped in this release.`;
  return {
    version,
    title,
    summary,
    category: 'feature',
    features,
    published: false,        // draft — a human reviews & publishes
    display_at_login: false, // set by the human when they publish, if wanted
  };
}

async function main() {
  const range = getCommitRange();
  info(`scanning commit range: ${range}`);

  const features = getFeatureCommitSubjects(range);
  if (features.length === 0) {
    info('no feat: commits in this range — nothing to draft, exiting cleanly');
    return;
  }
  info(`found ${features.length} feature commit(s):\n  - ${features.join('\n  - ')}`);

  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    warn('INTERNAL_API_KEY not set — cannot authenticate to the release-notes API. ' +
         'Add it as a Railway env var + a GitHub Actions secret to enable this. Skipping.');
    return;
  }

  let existing;
  try {
    existing = await fetchExistingNotes();
  } catch (e) {
    warn(`could not fetch existing release notes, aborting: ${e.message}`);
    return;
  }

  const version = nextVersion(existing);
  const note = buildNote(features, version);
  info(`drafting note ${version}: "${note.title}"`);

  if (process.env.RELEASE_NOTE_DRY_RUN === '1') {
    info('RELEASE_NOTE_DRY_RUN=1 — not posting. Payload:\n' + JSON.stringify(note, null, 2));
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/release-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify(note),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`POST /release-notes → ${res.status} ${body}`);
    }
    const created = await res.json();
    info(`✅ draft release note created: ${created.id} (v${created.version}) — ` +
         `review and publish it in Settings → Release Notes`);
  } catch (e) {
    warn(`failed to create release note: ${e.message}`);
  }
}

main().catch(e => warn(`unexpected error: ${e.message}`));
