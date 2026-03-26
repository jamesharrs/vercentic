#!/bin/bash
set -e
echo "📦 Adding notes + attachments to records backend..."

# Add notes route
cat > routes/notes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('notes', n => n.record_id === record_id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/', (req, res) => {
  const { record_id, content, author } = req.body;
  if (!record_id || !content) return res.status(400).json({ error: 'record_id and content required' });
  res.status(201).json(insert('notes', { id: uuidv4(), record_id, content, author: author || 'Admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
});

router.patch('/:id', (req, res) => {
  const n = update('notes', x => x.id === req.params.id, { content: req.body.content });
  n ? res.json(n) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', (req, res) => {
  remove('notes', x => x.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
EOF

# Add attachments route (metadata only — no real file storage)
cat > routes/attachments.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, remove } = require('../db/init');

router.get('/', (req, res) => {
  const { record_id } = req.query;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  res.json(query('attachments', a => a.record_id === record_id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/', (req, res) => {
  const { record_id, name, size, type, url, uploaded_by } = req.body;
  if (!record_id || !name) return res.status(400).json({ error: 'record_id and name required' });
  res.status(201).json(insert('attachments', { id: uuidv4(), record_id, name, size: size || 0, type: type || 'application/octet-stream', url: url || '#', uploaded_by: uploaded_by || 'Admin', created_at: new Date().toISOString() }));
});

router.delete('/:id', (req, res) => {
  remove('attachments', x => x.id === req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
EOF

# Patch index.js to add new routes + ensure notes/attachments tables exist
cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { initDB, getStore } = require('./db/init');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/environments', require('./routes/environments'));
app.use('/api/objects',      require('./routes/objects'));
app.use('/api/fields',       require('./routes/fields'));
app.use('/api/records',      require('./routes/records'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/roles',        require('./routes/roles'));
app.use('/api/security',     require('./routes/security'));
app.use('/api/notes',        require('./routes/notes'));
app.use('/api/attachments',  require('./routes/attachments'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.1.0' }));

initDB().then(() => {
  // Ensure new tables exist
  const store = getStore();
  const fs = require('fs'), path = require('path');
  let dirty = false;
  if (!store.notes)       { store.notes = []; dirty = true; }
  if (!store.attachments) { store.attachments = []; dirty = true; }
  if (dirty) fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
  app.listen(3001, () => console.log('TalentOS API → http://localhost:3001'));
}).catch(err => { console.error(err); process.exit(1); });
EOF

echo "✅ Backend updated. Restart server: node index.js"
