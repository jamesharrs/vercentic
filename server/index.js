require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB, getStore } = require('./db/init');

const app = express();

// CORS — allow localhost dev + Vercel deployments
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  /\.vercel\.app$/,
];
if (process.env.CLIENT_URL)         allowedOrigins.push(process.env.CLIENT_URL);
if (process.env.PORTAL_URL)         allowedOrigins.push(process.env.PORTAL_URL);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / server-to-server
    const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    cb(ok ? null : new Error('CORS'), ok);
  },
  credentials: true,
}));

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
app.use('/api/ai',           require('./routes/ai-proxy'));
app.use('/api/csv',          require('./routes/csv'));
app.use('/api/workflows',    require('./routes/workflows'));
app.use('/api/portals',      require('./routes/portals'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.1.0' }));

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  const store = getStore();
  const fs = require('fs'), path = require('path');
  let dirty = false;
  if (!store.notes)       { store.notes = [];       dirty = true; }
  if (!store.attachments) { store.attachments = []; dirty = true; }
  if (!store.portals)     { store.portals = [];     dirty = true; }
  if (!store.workflows)   { store.workflows = [];   dirty = true; }
  if (dirty) fs.writeFileSync(path.join(__dirname, '../data/talentos.json'), JSON.stringify(store, null, 2));
  app.listen(PORT, () => console.log(`TalentOS API → http://localhost:${PORT}`));
}).catch(err => { console.error(err); process.exit(1); });
