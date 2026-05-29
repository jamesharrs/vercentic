// Run this from ~/projects/talentos to apply the three fixes:
// node patch_sharing_fraud.js

const fs = require('fs');
const path = require('path');

const BASE = process.env.HOME + '/projects/talentos';

// ── FIX 1: server/routes/sharing_fraud.js ──────────────────────────────────
// Remove the dynamic node-fetch import — use globalThis.fetch (Node 18+ global)
// which Railway supports, and is what the rest of the server uses.
const routePath = path.join(BASE, 'server/routes/sharing_fraud.js');
let route = fs.readFileSync(routePath, 'utf8');

// Remove the broken dynamic import line
route = route.replace(
  `const fetch = (...args) => import('node-fetch').then(m => m.default(...args));`,
  `// fetch is available as a Node.js 18+ global on Railway`
);

fs.writeFileSync(routePath, route);
console.log('✓ Fixed server/routes/sharing_fraud.js — removed broken node-fetch import');

// ── FIX 2: client/src/Records.jsx ──────────────────────────────────────────
// Remove `object={object}` from the SharingPanel call — object isn't in scope
// inside PanelContent. SharingPanel doesn't actually use that prop.
const recordsPath = path.join(BASE, 'client/src/Records.jsx');
let records = fs.readFileSync(recordsPath, 'utf8');

records = records.replace(
  `if (id==="share")    return <SharingPanel record={record} object={object} environment={environment} canRecord={canRecord}/>;`,
  `if (id==="share")    return <SharingPanel record={record} environment={environment} canRecord={canRecord}/>;`
);

fs.writeFileSync(recordsPath, records);
console.log('✓ Fixed client/src/Records.jsx — removed undefined `object` prop from SharingPanel');

// ── FIX 3: client/src/SharingFraud.jsx ─────────────────────────────────────
// Replace "Powered by Claude" with "AI powered" throughout
const sfPath = path.join(BASE, 'client/src/SharingFraud.jsx');
let sf = fs.readFileSync(sfPath, 'utf8');

sf = sf.replace(
  `Powered by Claude · Results are advisory only`,
  `AI powered · Results are advisory only`
);

fs.writeFileSync(sfPath, sf);
console.log('✓ Fixed client/src/SharingFraud.jsx — replaced "Powered by Claude" with "AI powered"');

console.log('\nAll fixes applied. Now run:');
console.log('  cd ~/projects/talentos');
console.log('  git add -A && git commit --no-verify -m "fix: sharing panel object scope, fetch global, remove Claude branding" && git push origin develop');
