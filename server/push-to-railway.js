#!/usr/bin/env node
// Pushes local talentos.json to Railway by POSTing each collection directly
const fs = require('fs');
const path = require('path');
const https = require('https');

const RAILWAY = 'talentos-production-4045.up.railway.app';
const DATA_FILE = path.join(__dirname, '../data/talentos.json');

function post(pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: RAILWAY, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log('Local data loaded. Pushing to Railway...\n');

  const result = await post('/api/superadmin/restore', { data });
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
