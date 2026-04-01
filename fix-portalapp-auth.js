/**
 * fix-portalapp-auth.js
 * Run from project root: node fix-portalapp-auth.js
 *
 * The real fix: PortalApp.jsx uses bare fetch() without session credentials
 * or X-Tenant-Slug header. Switch it to use tFetch from apiClient.js so:
 * - Session cookie is sent (logged-in users can preview draft portals)
 * - X-Tenant-Slug is set (correct tenant data is returned)
 */

const fs = require('fs');
const path = require('path');

const PORTAL_APP = path.join(__dirname, 'client/src/PortalApp.jsx');

if (!fs.existsSync(PORTAL_APP)) {
  console.error('ERROR: client/src/PortalApp.jsx not found');
  process.exit(1);
}

let src = fs.readFileSync(PORTAL_APP, 'utf8');
const orig = src;

// 1. Add tFetch import (if not already there)
if (!src.includes('tFetch') && !src.includes('apiClient')) {
  src = src.replace(
    `import { useState, useEffect } from 'react'`,
    `import { useState, useEffect } from 'react'\nimport { tFetch } from './apiClient.js'`
  );
  // fallback if different quote style
  if (!src.includes('tFetch')) {
    src = src.replace(
      `import { useState, useEffect } from "react"`,
      `import { useState, useEffect } from "react"\nimport { tFetch } from './apiClient.js'`
    );
  }
  console.log('✓ Added tFetch import');
} else {
  console.log('✓ tFetch already imported');
}

// 2. Replace the local bare-fetch api object with one that uses tFetch
// The local api object looks like:
// const api = {
//   get: p => fetch(`/api${p}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
//   post: (p, b) => fetch(`/api${p}`, { method:'POST', ...
// }

const oldApiPattern1 = `const api = {
  get: p => fetch(\`/api\${p}\`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  post: (p, b) => fetch(\`/api\${p}\`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json()),
}`;

const oldApiPattern2 = `const api = {
  get: p => fetch(\`/api\${p}\`).then(r => { if (!r.ok) throw new Error(r.status); return r.json() }),
  post: (p, b) => fetch(\`/api\${p}\`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json()),
}`;

const newApi = `const api = {
  get:  p    => tFetch(p).then(r => r.json ? r.json() : r),
  post: (p, b) => tFetch(p, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json ? r.json() : r),
}`;

// More flexible replacement: find and replace any bare fetch api block
// Look for the pattern and replace
let matched = false;
if (src.includes(oldApiPattern1)) {
  src = src.replace(oldApiPattern1, newApi);
  matched = true;
} else if (src.includes(oldApiPattern2)) {
  src = src.replace(oldApiPattern2, newApi);
  matched = true;
} else {
  // Try a regex approach for variations
  const apiBlockRe = /const api\s*=\s*\{[\s\S]*?get:\s*p\s*=>\s*fetch\(`\/api\${p}`\)[\s\S]*?\}/m;
  if (apiBlockRe.test(src)) {
    src = src.replace(apiBlockRe, newApi);
    matched = true;
  }
}

if (matched) {
  console.log('✓ Replaced bare fetch api with tFetch');
} else {
  console.log('⚠ Could not find bare fetch api block — checking what is there:');
  const lines = src.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('const api') || l.includes('fetch(') && l.includes('/api')) {
      console.log(`  Line ${i+1}: ${l.trim()}`);
    }
  });
}

// 3. Also simplify the catch handler — remove the second fetch that was
//    causing "Authentication required" to show as the error message
const badCatch = `.catch(async (err) => {
        // Try to get a friendlier error message from the response
        try {
          const resp = await fetch(\`/api/portals/slug/\${cleanSlug}\`);
          const body = await resp.json();
          if (body.code === 'DRAFT') {
            setError(\`"\${body.name}" exists but hasn't been published yet. Open the portal builder and click Publish.\`);
          } else {
            setError(body.error || 'This portal is not available.');
          }
        } catch {
          setError('This portal is not available. It may have been unpublished or the URL is incorrect.');
        }
        setLoading(false);
      })`;

const goodCatch = `.catch(err => {
        const status = err?.message || String(err);
        if (status === '403') {
          setError('This portal exists but has not been published yet. Open the portal builder and click Publish.');
        } else if (status === '404') {
          setError('No portal found at this URL. Check the link and try again.');
        } else {
          setError('This portal is not available. It may have been unpublished or the URL is incorrect.');
        }
        setLoading(false);
      })`;

if (src.includes(badCatch)) {
  src = src.replace(badCatch, goodCatch);
  console.log('✓ Simplified catch handler (removed second fetch)');
} else {
  // Also try to fix the simpler original catch
  src = src.replace(
    `.catch(() => { setError('This portal is not available.'); setLoading(false); })`,
    goodCatch
  );
  console.log('✓ Updated catch handler');
}

if (src !== orig) {
  fs.writeFileSync(PORTAL_APP, src);
  console.log('\n✅ client/src/PortalApp.jsx patched successfully');
  console.log('\nAlso check that apiClient.js exports tFetch:');
  const apiClient = path.join(__dirname, 'client/src/apiClient.js');
  if (fs.existsSync(apiClient)) {
    const ac = fs.readFileSync(apiClient, 'utf8');
    if (ac.includes('export') && ac.includes('tFetch')) {
      console.log('✓ tFetch is exported from apiClient.js');
    } else if (ac.includes('tFetch')) {
      console.log('⚠ tFetch exists in apiClient.js but may not be exported — check exports');
    } else {
      console.log('⚠ tFetch not found in apiClient.js — using fetch with credentials instead');
      // Fallback: just add credentials: include to the bare fetch
      let updated = fs.readFileSync(PORTAL_APP, 'utf8');
      updated = updated.replace(
        `import { tFetch } from './apiClient.js'`,
        ``
      );
      // Replace tFetch with a credentialed fetch wrapper  
      updated = updated.replace(newApi,
        `const api = {
  get:  p    => fetch(\`/api\${p}\`, { credentials:'include', headers:{ 'X-Tenant-Slug': (()=>{try{const s=localStorage.getItem('vercentic_session');return s?JSON.parse(s)?.tenantSlug||'master':'master'}catch{return'master'}})()} }).then(r => { if(!r.ok) throw new Error(r.status); return r.json(); }),
  post: (p, b) => fetch(\`/api\${p}\`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', 'X-Tenant-Slug': (()=>{try{const s=localStorage.getItem('vercentic_session');return s?JSON.parse(s)?.tenantSlug||'master':'master'}catch{return'master'}})()} , body:JSON.stringify(b) }).then(r => r.json()),
}`
      );
      fs.writeFileSync(PORTAL_APP, updated);
      console.log('✓ Applied credentials:include + X-Tenant-Slug fallback');
    }
  }
} else {
  console.log('\n⚠ No changes applied — the file may already be updated or patterns did not match');
  console.log('Check the file manually: client/src/PortalApp.jsx');
}

console.log('\nNext: restart server + hard refresh the portal URL');
