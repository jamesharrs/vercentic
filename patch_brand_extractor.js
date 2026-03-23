// patch_brand_extractor.js
// Run from the talentos root: node patch_brand_extractor.js
const fs = require('fs');
const path = require('path');

// ── 1. Replace brand_kits.js entirely ─────────────────────────────────────────
const brandKitsSrc = path.join(__dirname, 'brand_kits_new.js');
const brandKitsDst = path.join(__dirname, 'server/routes/brand_kits.js');
if (fs.existsSync(brandKitsSrc)) {
  fs.copyFileSync(brandKitsSrc, brandKitsDst);
  console.log('✅ server/routes/brand_kits.js replaced');
} else {
  console.log('⚠  brand_kits_new.js not found — skipping server update. Copy it manually.');
}

// ── 2. Patch Portals.jsx — replace all Claude references with Vercentic ──────
const portalsPath = path.join(__dirname, 'client/src/Portals.jsx');
if (!fs.existsSync(portalsPath)) {
  console.log('❌ client/src/Portals.jsx not found');
  process.exit(1);
}

let portals = fs.readFileSync(portalsPath, 'utf8');
let count = 0;

const replacements = [
  // Subtitle in Brand Extractor header
  ['Paste any URL — Claude extracts brand colours, fonts & logo',
   'Paste any URL — Vercentic extracts brand colours, fonts & logo'],

  // Loading spinner text
  ['Claude is generating your theme…',
   'Vercentic is generating your theme…'],

  // Blocked site warning
  ['Claude generated a theme from the brand name instead',
   'Vercentic generated a theme from the brand name instead'],

  // Empty state description
  ['Claude will analyse the site and extract brand colours,',
   'Vercentic will analyse the site and extract brand colours,'],

  // Empty state line 2
  ['fonts and logo — then generate a matching portal theme.',
   'fonts and logo — then generate a matching portal theme.'],

  // Any remaining "Claude" in brand extractor context
  // (catch-all for edge cases in comments or labels)
];

for (const [from, to] of replacements) {
  if (portals.includes(from)) {
    portals = portals.replace(from, to);
    count++;
    console.log(`  ✓ Replaced: "${from.slice(0,50)}..."`);
  }
}

// Also do a global sweep for any remaining "Claude" in UI-visible strings
// (not in comments or variable names — only in JSX string literals)
const claudeInJsx = /(?<=['"`])([^'"`]*?)Claude([^'"`]*?)(?=['"`])/g;
let match;
const remaining = [];
const tempPortals = portals;
while ((match = claudeInJsx.exec(tempPortals)) !== null) {
  remaining.push({ index: match.index, text: match[0] });
}
if (remaining.length > 0) {
  console.log(`\n  ℹ️  Found ${remaining.length} additional "Claude" references in strings:`);
  remaining.forEach(r => console.log(`    → "${r.text}"`));
  // Replace them
  portals = portals.replace(/(?<=['"`])([^'"`]*?)Claude([^'"`]*?)(?=['"`])/g, (match, before, after) => {
    count++;
    return before + 'Vercentic' + after;
  });
}

fs.writeFileSync(portalsPath, portals);
console.log(`\n✅ Portals.jsx patched — ${count} replacements made`);

// ── 3. Also check other files for Claude references in UI text ───────────────
const filesToCheck = [
  'client/src/AI.jsx',
  'client/src/Dashboard.jsx',
  'client/src/Settings.jsx',
  'client/src/Records.jsx',
  'client/src/OrgChart.jsx',
  'client/src/Interviews.jsx',
  'client/src/Offers.jsx',
];

console.log('\n── Scanning other files for Claude UI references ──');
for (const rel of filesToCheck) {
  const fp = path.join(__dirname, rel);
  if (!fs.existsSync(fp)) continue;
  const content = fs.readFileSync(fp, 'utf8');
  // Find Claude in string literals (not imports or comments about the API)
  const matches = content.match(/['"`][^'"`]*Claude[^'"`]*['"`]/g) || [];
  // Filter out legitimate API/code references (like model names, API headers)
  const uiMatches = matches.filter(m =>
    !m.includes('claude-sonnet') &&
    !m.includes('claude-haiku') &&
    !m.includes('claude-opus') &&
    !m.includes('anthropic') &&
    !m.includes('api.anthropic') &&
    !m.includes('x-api-key')
  );
  if (uiMatches.length > 0) {
    console.log(`  ${rel}: ${uiMatches.length} UI reference(s)`);
    uiMatches.forEach(m => console.log(`    → ${m.slice(0, 80)}`));
  }
}

console.log('\n✅ Done. Restart server and refresh browser.');
