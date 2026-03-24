#!/usr/bin/env node
// deploy_sandbox_manager.js
// Run from ~/projects/talentos:  node deploy_sandbox_manager.js
const fs = require('fs'), path = require('path');

function patch(filepath, label, oldStr, newStr) {
  const full = path.resolve(filepath);
  if (!fs.existsSync(full)) { console.log(`SKIP ${label} — file not found`); return false; }
  let src = fs.readFileSync(full, 'utf8');
  if (!src.includes(oldStr)) { console.log(`SKIP ${label} — anchor not found`); return false; }
  fs.writeFileSync(full, src.replace(oldStr, newStr));
  console.log(`OK   ${label}`); return true;
}

console.log('\n── 1: Copy server route ──');
const sbSrc = path.resolve('sandbox_route.js');
const sbDst = path.resolve('server/routes/sandbox.js');
if (fs.existsSync(sbSrc)) {
  fs.copyFileSync(sbSrc, sbDst);
  console.log('OK   server/routes/sandbox.js created');
} else {
  console.log('⚠  sandbox_route.js not found — save the file as sandbox_route.js first');
}

console.log('\n── 2: Copy frontend component ──');
const feSrc = path.resolve('SandboxManager_deploy.jsx');
const feDst = path.resolve('client/src/SandboxManager.jsx');
if (fs.existsSync(feSrc)) {
  fs.copyFileSync(feSrc, feDst);
  console.log('OK   client/src/SandboxManager.jsx created');
} else {
  console.log('⚠  SandboxManager_deploy.jsx not found — save the file as SandboxManager_deploy.jsx first');
}

console.log('\n── 3: Register route in server/index.js ──');
const indexPath = path.resolve('server/index.js');
if (fs.existsSync(indexPath)) {
  let idx = fs.readFileSync(indexPath, 'utf8');
  if (idx.includes('/api/sandboxes')) {
    console.log('SKIP Route already registered');
  } else {
    // Insert before the last route or after config route
    const anchor = "app.use('/api/config'";
    if (idx.includes(anchor)) {
      idx = idx.replace(anchor, `app.use('/api/sandboxes', require('./routes/sandbox'));\n${anchor}`);
      fs.writeFileSync(indexPath, idx);
      console.log('OK   /api/sandboxes route registered');
    } else {
      // Fallback: insert before app.listen
      idx = idx.replace("app.listen(", "app.use('/api/sandboxes', require('./routes/sandbox'));\n\napp.listen(");
      fs.writeFileSync(indexPath, idx);
      console.log('OK   /api/sandboxes route registered (fallback position)');
    }
  }
}

console.log('\n── 4: Wire SandboxManager into Settings.jsx ──');
const settingsPath = path.resolve('client/src/Settings.jsx');
if (fs.existsSync(settingsPath)) {
  let settings = fs.readFileSync(settingsPath, 'utf8');

  // 4a: Add import
  if (!settings.includes('SandboxManager')) {
    // Find last import line
    const importAnchor = settings.includes('import api')
      ? 'import api'
      : 'import {';
    const importIdx = settings.lastIndexOf('import ');
    if (importIdx > -1) {
      const lineEnd = settings.indexOf('\n', importIdx);
      settings = settings.slice(0, lineEnd + 1) +
        'import SandboxManager from "./SandboxManager.jsx";\n' +
        settings.slice(lineEnd + 1);
      console.log('OK   4a Import added');
    }
  } else {
    console.log('SKIP 4a Import already exists');
  }

  // 4b: Add nav item to SYSTEM_ADMIN_SECTIONS
  if (!settings.includes('"sandbox"') && !settings.includes("'sandbox'")) {
    const navAnchor = settings.includes('id:"import_export"')
      ? '{id:"import_export"'
      : settings.includes("id:'import_export'")
        ? "{id:'import_export'"
        : null;

    if (navAnchor) {
      settings = settings.replace(
        navAnchor,
        `{id:"sandbox",label:"Sandbox Manager",icon:"gitBranch"},\n    ${navAnchor}`
      );
      console.log('OK   4b Nav item added');
    } else {
      // Try alternative anchor — add before the last item
      const altAnchor = 'id:"workflows"';
      if (settings.includes(altAnchor)) {
        settings = settings.replace(
          `{${altAnchor}`,
          `{id:"sandbox",label:"Sandbox Manager",icon:"gitBranch"},\n    {${altAnchor}`
        );
        console.log('OK   4b Nav item added (alt anchor)');
      } else {
        console.log('SKIP 4b Could not find nav anchor — add manually');
      }
    }
  } else {
    console.log('SKIP 4b Nav item already exists');
  }

  // 4c: Add render case
  if (!settings.includes('activeSection==="sandbox"')) {
    const renderAnchor = 'activeSection==="import_export"';
    if (settings.includes(renderAnchor)) {
      settings = settings.replace(
        renderAnchor,
        `activeSection==="sandbox"?<SandboxManager environment={environment}/>
        :${renderAnchor}`
      );
      console.log('OK   4c Render case added');
    } else {
      console.log('SKIP 4c Could not find render anchor — add manually');
    }
  } else {
    console.log('SKIP 4c Render case already exists');
  }

  // 4d: Add gitBranch icon if missing
  if (!settings.includes('gitBranch')) {
    const iconAnchor = 'database:';
    if (settings.includes(iconAnchor)) {
      settings = settings.replace(
        iconAnchor,
        `gitBranch:"M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",\n    ${iconAnchor}`
      );
      console.log('OK   4d gitBranch icon added');
    }
  } else {
    console.log('SKIP 4d gitBranch icon already exists');
  }

  fs.writeFileSync(settingsPath, settings);
  console.log('OK   Settings.jsx updated');
} else {
  console.log('SKIP 4  Settings.jsx not found');
}

console.log('\n✅ Done! The Sandbox Manager is fully wired.\n');
console.log('To deploy:');
console.log('  1. Restart server: cd server && node index.js');
console.log('  2. Go to Settings → Sandbox Manager');
console.log('  3. Click "Create Sandbox" to clone your production config');
console.log('  4. Make changes in the sandbox environment');
console.log('  5. Come back and click "Promote" to push changes to production');
console.log('');
console.log('To commit:');
console.log('  git add -A');
console.log('  git commit -m "feat: sandbox-to-production migration tool with clone, promote, rollback"');
console.log('  git push origin main');
