const fs = require('fs');

// 1. Fix notes route in server/index.js
const idxPath = 'server/index.js';
let idx = fs.readFileSync(idxPath, 'utf8');
if (!idx.includes("notes")) {
  idx = idx.replace(
    "app.get('/api/health'",
    "app.use('/api/notes',        require('./routes/notes'));\napp.use('/api/attachments',  require('./routes/attachments'));\n\napp.get('/api/health'"
  );
  fs.writeFileSync(idxPath, idx);
  console.log('✅ Fixed: notes + attachments routes added to server');
} else {
  console.log('ℹ️  Notes routes already in server/index.js');
}

// 2. Ensure notes.js exists
if (!fs.existsSync('server/routes/notes.js')) {
  fs.writeFileSync('server/routes/notes.js', `
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove } = require('../db/init');

router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('notes', n => n.record_id === record_id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});
router.post('/', (req, res) => {
  const { record_id, content, author } = req.body;
  if (!record_id || !content) return res.status(400).json({ error: 'record_id and content required' });
  const store = require('../db/init').getStore();
  if (!store.notes) store.notes = [];
  res.status(201).json(insert('notes', { id: uuidv4(), record_id, content, author: author||'Admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
});
router.patch('/:id', (req, res) => { const n = update('notes', x => x.id === req.params.id, { content: req.body.content }); n ? res.json(n) : res.status(404).json({ error: 'Not found' }); });
router.delete('/:id', (req, res) => { remove('notes', x => x.id === req.params.id); res.json({ deleted: true }); });
module.exports = router;
`);
  console.log('✅ Created: server/routes/notes.js');
}

// 3. Ensure attachments.js exists
if (!fs.existsSync('server/routes/attachments.js')) {
  fs.writeFileSync('server/routes/attachments.js', `
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, remove, getStore } = require('../db/init');

router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('attachments', a => a.record_id === record_id));
});
router.post('/', (req, res) => {
  const store = getStore();
  if (!store.attachments) store.attachments = [];
  const { record_id, name, size, type, uploaded_by } = req.body;
  res.status(201).json(insert('attachments', { id: uuidv4(), record_id, name, size: size||0, type: type||'file', uploaded_by: uploaded_by||'Admin', created_at: new Date().toISOString() }));
});
router.delete('/:id', (req, res) => { remove('attachments', x => x.id === req.params.id); res.json({ deleted: true }); });
module.exports = router;
`);
  console.log('✅ Created: server/routes/attachments.js');
}

// 4. Copy Search.jsx to client
fs.copyFileSync('server/Search.jsx', 'client/src/Search.jsx');
console.log('✅ Copied: Search.jsx to client/src/');

// 5. Patch App.jsx — add Search import + nav item + render
let app = fs.readFileSync('client/src/App.jsx', 'utf8');

if (!app.includes('import SearchPage')) {
  app = app.replace(
    'import RecordsView from "./Records.jsx";',
    'import RecordsView from "./Records.jsx";\nimport SearchPage from "./Search.jsx";'
  );
  console.log('✅ Added SearchPage import');
}

// Add search to nav
if (!app.includes('"search"')) {
  app = app.replace(
    `{ id: "schema", icon: "database", label: "Data Model" },`,
    `{ id: "search", icon: "search", label: "Search" },\n        { id: "schema", icon: "database", label: "Data Model" },`
  );
  console.log('✅ Added Search to nav');
}

// Add search render
if (!app.includes('activeNav === "search"')) {
  app = app.replace(
    `) : activeNav === "settings" ? (
          <SettingsPage />`,
    `) : activeNav === "search" ? (
          <SearchPage environment={selectedEnv} />
        ) : activeNav === "settings" ? (
          <SettingsPage />`
  );
  console.log('✅ Wired SearchPage into render');
}

fs.writeFileSync('client/src/App.jsx', app);
console.log('\n✅ All done! Restart the server (node server/index.js) and refresh the browser.');
