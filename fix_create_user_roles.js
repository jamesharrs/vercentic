/**
 * fix_create_user_roles.js
 * Run from ~/projects/talentos:  node fix_create_user_roles.js
 *
 * Problem: "Add User" modal in Super Admin > Client Detail > Users
 *          shows empty Role dropdown.
 *
 * Root cause: The modal fetches /api/roles which hits the MASTER store.
 *             Client roles live in tenant-{slug}.json, not the master file.
 *
 * Fix: Use /api/superadmin/clients/:id/roles endpoint (added here)
 *      which reads from the correct tenant store.
 */
const fs   = require('fs');
const path = require('path');

// ── A. Add GET /clients/:id/roles to superadmin_clients.js ──────────────────
const SA_FILE = path.join(__dirname, 'server/routes/superadmin_clients.js');
let sa = fs.readFileSync(SA_FILE, 'utf8');

const ROLES_ENDPOINT = `
// GET /:id/roles — fetch roles from the client's tenant store
router.get('/:id/roles', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  
  const tenantSlug = client.tenant_slug;
  if (!tenantSlug) return res.json([]);
  
  // Read from the tenant store
  const tenantFile = path.join(__dirname, '../../data', \`tenant-\${tenantSlug}.json\`);
  if (!fs.existsSync(tenantFile)) return res.json([]);
  
  try {
    const tenantData = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    const roles = (tenantData.roles || []).filter(r => !r.deleted_at);
    res.json(roles);
  } catch (e) {
    res.json([]);
  }
});

// GET /:id/environments-with-roles — fetch environments from tenant store
router.get('/:id/environments-with-roles', (req, res) => {
  ensureCollections();
  const s = getStore();
  const client = (s.clients||[]).find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  
  const tenantSlug = client.tenant_slug;
  if (!tenantSlug) return res.json({ environments: [], roles: [] });
  
  const tenantFile = path.join(__dirname, '../../data', \`tenant-\${tenantSlug}.json\`);
  if (!fs.existsSync(tenantFile)) return res.json({ environments: [], roles: [] });
  
  try {
    const tenantData = JSON.parse(fs.readFileSync(tenantFile, 'utf8'));
    const environments = (tenantData.environments || []).filter(e => !e.deleted_at);
    const roles        = (tenantData.roles || []).filter(r => !r.deleted_at);
    res.json({ environments, roles });
  } catch (e) {
    res.json({ environments: [], roles: [] });
  }
});
`;

// Add the endpoints before module.exports
if (!sa.includes('/:id/roles')) {
  sa = sa.replace('module.exports = router;', ROLES_ENDPOINT + '\nmodule.exports = router;');
  
  // Make sure path and fs are imported at the top
  if (!sa.includes("require('path')") && !sa.includes('require("path")')) {
    sa = "const path = require('path');\nconst fs   = require('fs');\n" + sa;
  } else if (!sa.includes("require('fs')") && !sa.includes('require("fs")')) {
    sa = "const fs = require('fs');\n" + sa;
  }
  
  fs.writeFileSync(SA_FILE, sa, 'utf8');
  console.log('✅ Added GET /:id/roles and /:id/environments-with-roles to superadmin_clients.js');
} else {
  console.log('ℹ️  Routes already exist in superadmin_clients.js');
}

// ── B. Patch ClientManager.jsx: fix roles and environments fetch in modal ────
const CM_FILE = path.join(__dirname, 'client/src/superadmin/ClientManager.jsx');
let cm = fs.readFileSync(CM_FILE, 'utf8');

// Find the CreateClientUserModal and its roles loading
// Look for the component declaration
const compStart = cm.indexOf('function CreateClientUserModal');
const arrowStart = cm.indexOf('const CreateClientUserModal');
const startIdx = compStart > -1 ? compStart : arrowStart;

if (startIdx === -1) {
  console.error('❌ CreateClientUserModal not found. Looking for similar patterns...');
  // Look for the modal that has "Select role" in it
  const idx = cm.indexOf('Select role');
  if (idx > -1) {
    console.log('Found "Select role" at index', idx);
    console.log('Context:', cm.substring(idx-500, idx+100));
  }
  process.exit(1);
}

console.log('✅ Found CreateClientUserModal at index', startIdx);
const componentSnippet = cm.substring(startIdx, startIdx + 200);
console.log('Component start:', componentSnippet.substring(0, 150));

// Strategy: find and replace the roles fetch inside CreateClientUserModal
// The modal receives { client, onClose, onCreated } props — we'll use client.id

// Pattern 1: Fetch /api/roles without tenant
const OLD_ROLES_FETCH_1 = "fetch('/api/roles').then(r=>r.json())";
const OLD_ROLES_FETCH_2 = 'fetch("/api/roles").then(r=>r.json())';
const OLD_ROLES_FETCH_3 = "api.get('/roles')";
const OLD_ROLES_FETCH_4 = 'api.get("/roles")';

let fixed = false;

if (cm.includes(OLD_ROLES_FETCH_1)) {
  cm = cm.replace(OLD_ROLES_FETCH_1, "fetch(`/api/superadmin/clients/${client?.id}/roles`).then(r=>r.json())");
  fixed = true; console.log('✅ Fixed fetch(\'/api/roles\')');
}
if (cm.includes(OLD_ROLES_FETCH_2)) {
  cm = cm.replace(OLD_ROLES_FETCH_2, "fetch(`/api/superadmin/clients/${client?.id}/roles`).then(r=>r.json())");
  fixed = true; console.log('✅ Fixed fetch("/api/roles")');
}
if (cm.includes(OLD_ROLES_FETCH_3)) {
  // Only replace inside CreateClientUserModal scope — check proximity
  const idx3 = cm.indexOf(OLD_ROLES_FETCH_3, startIdx);
  if (idx3 > -1 && idx3 < startIdx + 3000) {
    cm = cm.substring(0, idx3) + 
         "fetch(`/api/superadmin/clients/${client?.id}/roles`).then(r=>r.json())" + 
         cm.substring(idx3 + OLD_ROLES_FETCH_3.length);
    fixed = true; console.log('✅ Fixed api.get(\'/roles\')');
  }
}

// Pattern 2: Promise.all that includes roles
// e.g. Promise.all([fetch('/api/environments'...), fetch('/api/roles'...)])
if (!fixed) {
  // Try replacing inline in Promise.all
  const pa = cm.indexOf("Promise.all", startIdx);
  if (pa > -1 && pa < startIdx + 3000) {
    const paEnd = cm.indexOf('])', pa) + 2;
    const paBlock = cm.substring(pa, paEnd);
    console.log('Promise.all block:', paBlock.substring(0, 200));
  }
  
  // Last resort: add a useEffect to the modal that loads roles from the new endpoint
  console.log('⚠️  Could not auto-fix roles fetch. Finding the modal body to inject...');
  
  // Find the first useState inside the component
  const firstState = cm.indexOf('useState(', startIdx);
  if (firstState > -1) {
    // Find what's being state-tracked for roles
    const stateContext = cm.substring(startIdx, firstState + 300);
    console.log('State context:', stateContext);
  }
}

// ── C. Fix environments fetch in the same modal ───────────────────────────────
// Environments also need to come from the tenant store
const OLD_ENV_FETCH_1 = "fetch('/api/environments').then(r=>r.json())";
const OLD_ENV_FETCH_2 = 'fetch("/api/environments").then(r=>r.json())';

// Only fix inside the modal component scope
[OLD_ENV_FETCH_1, OLD_ENV_FETCH_2].forEach(pattern => {
  let searchFrom = startIdx;
  let idx = cm.indexOf(pattern, searchFrom);
  if (idx > -1 && idx < startIdx + 3000) {
    cm = cm.substring(0, idx) +
         "fetch(`/api/superadmin/clients/${client?.id}/environments-with-roles`).then(r=>r.json()).then(d=>d.environments||[])" +
         cm.substring(idx + pattern.length);
    console.log('✅ Fixed environments fetch in modal');
  }
});

fs.writeFileSync(CM_FILE, cm, 'utf8');
console.log('\n✅ ClientManager.jsx patched');

// ── D. Show what the modal actually contains for manual verification ──────────
console.log('\n──── CreateClientUserModal content (first 2000 chars) ────');
console.log(cm.substring(startIdx, startIdx + 2000));
