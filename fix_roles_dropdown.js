/**
 * fix_roles_dropdown.js
 * Run from ~/projects/talentos:  node fix_roles_dropdown.js
 * 
 * Fixes the empty Role dropdown in Super Admin > Client Detail > Add User modal.
 */
const fs   = require('fs');
const path = require('path');

// ── 1. Fix the server — add /api/superadmin/clients/:id/roles endpoint ────────
const SA_FILE = path.join(__dirname, 'server/routes/superadmin_clients.js');
let sa = fs.readFileSync(SA_FILE, 'utf8');

if (!sa.includes("router.get('/:id/roles'") && !sa.includes('router.get("/:id/roles"')) {
  // Ensure fs and path are imported
  if (!sa.includes("require('fs')") && !sa.includes('require("fs")')) {
    sa = "const fs   = require('fs');\n" + sa;
  }
  if (!sa.includes("require('path')") && !sa.includes('require("path")')) {
    sa = "const path = require('path');\n" + sa;
  }

  const NEW_ROUTE = `
// GET /:id/roles — read roles from the client's isolated tenant file
router.get('/:id/roles', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients || []).find(c => c.id === req.params.id && !c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const slug = client.tenant_slug;
  if (!slug) return res.json([]);
  const tenantFile = path.join(process.env.DATA_PATH || path.join(__dirname, '../../data'), \`tenant-\${slug}.json\`);
  if (!fs.existsSync(tenantFile)) return res.json([]);
  try {
    const td = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    res.json((td.roles || []).filter(r => !r.deleted_at));
  } catch { res.json([]); }
});

// GET /:id/environments — read environments from the client's tenant file
router.get('/:id/environments', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients || []).find(c => c.id === req.params.id && !c.deleted_at);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const slug = client.tenant_slug;
  if (!slug) return res.json([]);
  const tenantFile = path.join(process.env.DATA_PATH || path.join(__dirname, '../../data'), \`tenant-\${slug}.json\`);
  if (!fs.existsSync(tenantFile)) return res.json([]);
  try {
    const td = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    res.json((td.environments || []).filter(e => !e.deleted_at));
  } catch { res.json([]); }
});
`;

  // Insert before module.exports
  sa = sa.replace('module.exports = router;', NEW_ROUTE + '\nmodule.exports = router;');
  fs.writeFileSync(SA_FILE, sa, 'utf8');
  console.log('✅ Server: added /:id/roles and /:id/environments endpoints');
} else {
  console.log('ℹ️  Server routes already present');
}

// ── 2. Fix the client — patch CreateClientUserModal ──────────────────────────
const CM_FILE = path.join(__dirname, 'client/src/superadmin/ClientManager.jsx');
let cm = fs.readFileSync(CM_FILE, 'utf8');
const ORIG = cm;

// Find the CreateClientUserModal function start
const startIdx = Math.max(
  cm.indexOf('function CreateClientUserModal'),
  cm.indexOf('const CreateClientUserModal')
);

if (startIdx === -1) {
  console.error('❌ CreateClientUserModal not found in ClientManager.jsx');
  console.log('Available component names:', cm.match(/(?:function|const) \w+Modal/g));
  process.exit(1);
}

// Extract the component (up to 4000 chars to capture it)
const slice = cm.substring(startIdx, startIdx + 4000);
console.log('\n── CreateClientUserModal (first 600 chars) ──');
console.log(slice.substring(0, 600));
console.log('...\n');

// Detect which API pattern it uses
const patterns = [
  { find: "fetch('/api/roles')",    name: "fetch('/api/roles')" },
  { find: 'fetch("/api/roles")',    name: 'fetch("/api/roles")' },
  { find: "sa.get('/roles')",       name: "sa.get('/roles')" },
  { find: 'sa.get("/roles")',       name: 'sa.get("/roles")' },
  { find: "api.get('/roles')",      name: "api.get('/roles')" },
  { find: 'api.get("/roles")',      name: 'api.get("/roles")' },
  { find: "/api/roles",             name: "raw /api/roles string" },
];

let rolesPatternFound = false;
patterns.forEach(p => {
  const pos = cm.indexOf(p.find, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    console.log(`✅ Found: ${p.name} at position ${pos}`);
    rolesPatternFound = true;
  }
});

if (!rolesPatternFound) {
  console.log('⚠️  No /api/roles call found inside CreateClientUserModal.');
  console.log('The roles may be passed as a prop from the parent or loaded differently.');
  
  // Check if roles are passed as props
  const compSignature = slice.substring(0, 200);
  console.log('\nComponent signature:', compSignature);
  
  // Check what props the parent passes when calling this modal
  const callSite = cm.indexOf('CreateClientUserModal');
  if (callSite > -1) {
    console.log('\nCall site (100 chars):', cm.substring(callSite, callSite + 200));
  }
}

// ── Apply fixes ───────────────────────────────────────────────────────────────
let changed = false;

// Fix 1: fetch('/api/roles') or fetch("/api/roles")  
['fetch(\'/api/roles\')', 'fetch("/api/roles")'].forEach(old => {
  const pos = cm.indexOf(old, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    cm = cm.substring(0, pos) +
         "fetch(`/api/superadmin/clients/${client?.id}/roles`)" +
         cm.substring(pos + old.length);
    changed = true;
    console.log(`✅ Fixed: ${old}`);
  }
});

// Fix 2: fetch('/api/environments') inside the modal
["fetch('/api/environments')", 'fetch("/api/environments")'].forEach(old => {
  const pos = cm.indexOf(old, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    cm = cm.substring(0, pos) +
         "fetch(`/api/superadmin/clients/${client?.id}/environments`)" +
         cm.substring(pos + old.length);
    changed = true;
    console.log(`✅ Fixed: ${old} → tenant environments`);
  }
});

// Fix 3: sa.get('/roles') inside the modal
["sa.get('/roles')", 'sa.get("/roles")'].forEach(old => {
  const pos = cm.indexOf(old, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    // sa is the superadmin api helper (prefixes /api/superadmin/)
    // so sa.get('/clients/X/roles') → /api/superadmin/clients/X/roles
    cm = cm.substring(0, pos) +
         "sa.get(`/${client?.id}/roles`)" +
         cm.substring(pos + old.length);
    changed = true;
    console.log(`✅ Fixed: ${old} → sa.get(\`/\${client?.id}/roles\`)`);
  }
});

// Fix 4: sa.get('/environments') inside the modal  
["sa.get('/environments')", 'sa.get("/environments")'].forEach(old => {
  const pos = cm.indexOf(old, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    cm = cm.substring(0, pos) +
         "sa.get(`/${client?.id}/environments`)" +
         cm.substring(pos + old.length);
    changed = true;
    console.log(`✅ Fixed: ${old} → sa.get(\`/\${client?.id}/environments\`)`);
  }
});

// Fix 5: api.get('/roles') inside the modal
["api.get('/roles')", 'api.get("/roles")'].forEach(old => {
  const pos = cm.indexOf(old, startIdx);
  if (pos > startIdx && pos < startIdx + 4000) {
    cm = cm.substring(0, pos) +
         "fetch(`/api/superadmin/clients/${client?.id}/roles`).then(r=>r.json())" +
         cm.substring(pos + old.length);
    changed = true;
    console.log(`✅ Fixed: ${old}`);
  }
});

if (changed) {
  fs.writeFileSync(CM_FILE, cm, 'utf8');
  console.log('\n✅ ClientManager.jsx saved with fixes');
} else {
  console.log('\n⚠️  No automatic fixes applied — roles may come from a prop.');
  
  // Show full component so we can see the issue
  console.log('\n── Full CreateClientUserModal component ──');
  // Find the end of the component (next top-level function/export)
  const endPatterns = ['\nfunction ', '\nconst ', '\nexport '];
  let endIdx = startIdx + 300; // skip the declaration itself
  endPatterns.forEach(p => {
    const pos = cm.indexOf(p, startIdx + 200);
    if (pos > -1) endIdx = Math.min(endIdx === startIdx + 300 ? pos : endIdx, pos);
  });
  console.log(cm.substring(startIdx, endIdx));
}

// ── 3. Build check ────────────────────────────────────────────────────────────
const { execSync } = require('child_process');
try {
  console.log('\n🔨 Checking build...');
  const out = execSync('cd client && npx vite build 2>&1', { cwd: __dirname, timeout: 60000 }).toString();
  if (out.includes('✓ built')) console.log('✅ Build successful');
  else if (out.includes('error')) {
    console.log('❌ Build errors:');
    out.split('\n').filter(l => l.match(/error/i)).forEach(l => console.log(' ', l));
  }
} catch (e) {
  console.log('Build output:', e.stdout?.toString().substring(0, 500));
}
