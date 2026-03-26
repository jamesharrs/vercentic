#!/bin/bash
set -e
echo "🔧 Fixing SQLite compatibility for Node.js v25..."


# Remove better-sqlite3, install sql.js instead
npm uninstall better-sqlite3 2>/dev/null || true
npm install sql.js --save

# Rewrite db/init.js to use sql.js
cat > db/init.js << 'EOF'
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/talentos.json');
const { v4: uuidv4 } = require('uuid');

// We'll use a simple JSON-based store as a fallback since sql.js is async/WASM
// This gives us full functionality without any native compilation
let store = { environments: [], objects: [], fields: [], records: [], relationships: [], activity: [] };

function loadStore() {
  try {
    if (fs.existsSync(DB_PATH)) {
      store = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch(e) { console.log('Starting fresh store'); }
}

function saveStore() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

function getStore() { return store; }

function query(table, predicate) {
  return (store[table] || []).filter(predicate || (() => true));
}

function findOne(table, predicate) {
  return (store[table] || []).find(predicate);
}

function insert(table, record) {
  if (!store[table]) store[table] = [];
  store[table].push(record);
  saveStore();
  return record;
}

function update(table, predicate, updates) {
  const idx = store[table].findIndex(predicate);
  if (idx === -1) return null;
  store[table][idx] = { ...store[table][idx], ...updates, updated_at: new Date().toISOString() };
  saveStore();
  return store[table][idx];
}

function remove(table, predicate) {
  const before = store[table].length;
  store[table] = store[table].filter(r => !predicate(r));
  saveStore();
  return before - store[table].length;
}

async function initDB() {
  loadStore();
  
  if (store.environments && store.environments.length > 0) {
    console.log('✅ Store loaded with existing data');
    return;
  }

  const envId = uuidv4();
  insert('environments', { id: envId, name: 'Production', slug: 'production', description: 'Main production environment', color: '#3b5bdb', is_default: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  const systemObjects = [
    { name:'Person',      plural:'People',       slug:'people',       icon:'users',     color:'#3b5bdb', order:1 },
    { name:'Job',         plural:'Jobs',         slug:'jobs',         icon:'briefcase', color:'#f59f00', order:2 },
    { name:'Talent Pool', plural:'Talent Pools', slug:'talent-pools', icon:'layers',    color:'#0ca678', order:3 },
  ];

  const fieldSets = {
    people: [
      { name:'First Name',       ak:'first_name',       type:'text',         req:1, list:1, o:1 },
      { name:'Last Name',        ak:'last_name',        type:'text',         req:1, list:1, o:2 },
      { name:'Email',            ak:'email',            type:'email',        req:1, list:1, uniq:1, o:3 },
      { name:'Phone',            ak:'phone',            type:'phone',        list:0, o:4 },
      { name:'Location',         ak:'location',         type:'text',         list:1, o:5 },
      { name:'Current Title',    ak:'current_title',    type:'text',         list:1, o:6 },
      { name:'Current Company',  ak:'current_company',  type:'text',         list:1, o:7 },
      { name:'Status',           ak:'status',           type:'select',       list:1, o:8,  opts:['Active','Passive','Not Looking','Placed','Archived'] },
      { name:'Source',           ak:'source',           type:'select',       list:1, o:9,  opts:['LinkedIn','Referral','Job Board','Direct Apply','Agency','Event','Other'] },
      { name:'LinkedIn URL',     ak:'linkedin_url',     type:'url',          list:0, o:10 },
      { name:'Summary',          ak:'summary',          type:'textarea',     list:0, o:11 },
      { name:'Skills',           ak:'skills',           type:'multi_select', list:0, o:12, opts:[] },
      { name:'Years Experience', ak:'years_experience', type:'number',       list:1, o:13 },
      { name:'Rating',           ak:'rating',           type:'rating',       list:1, o:14 },
    ],
    jobs: [
      { name:'Job Title',         ak:'job_title',         type:'text',     req:1, list:1, o:1 },
      { name:'Department',        ak:'department',        type:'select',   list:1, o:2, opts:['Engineering','Product','Design','Sales','Marketing','HR','Finance','Operations','Legal','Other'] },
      { name:'Location',          ak:'location',          type:'text',     list:1, o:3 },
      { name:'Work Type',         ak:'work_type',         type:'select',   list:1, o:4, opts:['On-site','Remote','Hybrid'] },
      { name:'Employment Type',   ak:'employment_type',   type:'select',   list:1, o:5, opts:['Full-time','Part-time','Contract','Internship','Freelance'] },
      { name:'Status',            ak:'status',            type:'select',   list:1, o:6, opts:['Draft','Open','On Hold','Filled','Cancelled'] },
      { name:'Priority',          ak:'priority',          type:'select',   list:1, o:7, opts:['Low','Medium','High','Critical'] },
      { name:'Salary Min',        ak:'salary_min',        type:'currency', list:0, o:8 },
      { name:'Salary Max',        ak:'salary_max',        type:'currency', list:0, o:9 },
      { name:'Hiring Manager',    ak:'hiring_manager',    type:'text',     list:1, o:10 },
      { name:'Description',       ak:'description',       type:'rich_text',list:0, o:11 },
      { name:'Required Skills',   ak:'required_skills',   type:'multi_select', list:0, o:12, opts:[] },
      { name:'Open Date',         ak:'open_date',         type:'date',     list:1, o:13 },
      { name:'Target Close Date', ak:'target_close_date', type:'date',     list:1, o:14 },
    ],
    'talent-pools': [
      { name:'Pool Name',   ak:'pool_name',   type:'text',         req:1, list:1, o:1 },
      { name:'Description', ak:'description', type:'textarea',     list:1, o:2 },
      { name:'Category',    ak:'category',    type:'select',       list:1, o:3, opts:['Technical','Leadership','Sales','Operations','Creative','Graduates','Diversity','Other'] },
      { name:'Status',      ak:'status',      type:'select',       list:1, o:4, opts:['Active','Inactive','Archived'] },
      { name:'Owner',       ak:'owner',       type:'text',         list:1, o:5 },
      { name:'Tags',        ak:'tags',        type:'multi_select', list:1, o:6, opts:[] },
    ],
  };

  for (const obj of systemObjects) {
    const objId = uuidv4();
    insert('objects', { id:objId, environment_id:envId, name:obj.name, plural_name:obj.plural, slug:obj.slug, icon:obj.icon, color:obj.color, description:null, is_system:1, sort_order:obj.order, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    for (const f of (fieldSets[obj.slug]||[])) {
      insert('fields', { id:uuidv4(), object_id:objId, environment_id:envId, name:f.name, api_key:f.ak, field_type:f.type, is_required:f.req||0, is_unique:f.uniq||0, is_system:1, show_in_list:f.list!==undefined?f.list:1, show_in_form:1, sort_order:f.o, options:f.opts||null, lookup_object_id:null, default_value:null, placeholder:null, help_text:null, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    }
  }
  console.log('✅ Seeded default environment + 3 system objects');
}

module.exports = { getStore, query, findOne, insert, update, remove, initDB };
EOF

# Rewrite routes to use JSON store instead of SQLite
cat > routes/environments.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update } = require('../db/init');

router.get('/', (req, res) => res.json(query('environments').sort((a,b) => b.is_default - a.is_default)));
router.get('/:id', (req, res) => { const e = findOne('environments', x=>x.id===req.params.id); e ? res.json(e) : res.status(404).json({error:'Not found'}); });
router.post('/', (req, res) => {
  const { name, slug, description, color } = req.body;
  if (!name||!slug) return res.status(400).json({error:'name and slug required'});
  if (findOne('environments', x=>x.slug===slug)) return res.status(409).json({error:'Slug already exists'});
  res.status(201).json(insert('environments', {id:uuidv4(),name,slug,description:description||null,color:color||'#3b5bdb',is_default:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
});
router.patch('/:id', (req, res) => { const e = update('environments', x=>x.id===req.params.id, req.body); e ? res.json(e) : res.status(404).json({error:'Not found'}); });
module.exports = router;
EOF

cat > routes/objects.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({error:'environment_id required'});
  const objects = query('objects', o=>o.environment_id===environment_id).sort((a,b)=>a.sort_order-b.sort_order);
  const withCounts = objects.map(o => ({
    ...o,
    field_count: query('fields', f=>f.object_id===o.id).length,
    record_count: query('records', r=>r.object_id===o.id&&!r.deleted_at).length,
  }));
  res.json(withCounts);
});

router.get('/:id', (req, res) => {
  const obj = findOne('objects', o=>o.id===req.params.id);
  if (!obj) return res.status(404).json({error:'Not found'});
  const fields = query('fields', f=>f.object_id===req.params.id).sort((a,b)=>a.sort_order-b.sort_order);
  res.json({...obj, fields});
});

router.post('/', (req, res) => {
  const { environment_id, name, plural_name, slug, icon, color, description } = req.body;
  if (!environment_id||!name||!slug) return res.status(400).json({error:'environment_id, name, slug required'});
  if (findOne('objects', o=>o.environment_id===environment_id&&o.slug===slug)) return res.status(409).json({error:'Slug exists'});
  const maxOrder = Math.max(0, ...query('objects', o=>o.environment_id===environment_id).map(o=>o.sort_order));
  res.status(201).json(insert('objects', {id:uuidv4(),environment_id,name,plural_name:plural_name||name+'s',slug,icon:icon||'circle',color:color||'#3b5bdb',description:description||null,is_system:0,sort_order:maxOrder+1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
});

router.patch('/:id', (req, res) => { const o = update('objects', x=>x.id===req.params.id, req.body); o ? res.json(o) : res.status(404).json({error:'Not found'}); });

router.delete('/:id', (req, res) => {
  const obj = findOne('objects', o=>o.id===req.params.id);
  if (!obj) return res.status(404).json({error:'Not found'});
  if (obj.is_system) return res.status(403).json({error:'Cannot delete system objects'});
  remove('objects', o=>o.id===req.params.id);
  res.json({deleted:true});
});

module.exports = router;
EOF

cat > routes/fields.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

const VALID = ['text','textarea','number','email','phone','url','date','datetime','boolean','select','multi_select','lookup','multi_lookup','file','rich_text','currency','rating'];

router.get('/', (req, res) => {
  const { object_id } = req.query;
  if (!object_id) return res.status(400).json({error:'object_id required'});
  res.json(query('fields', f=>f.object_id===object_id).sort((a,b)=>a.sort_order-b.sort_order));
});

router.post('/', (req, res) => {
  const { object_id, environment_id, name, api_key, field_type, is_required, is_unique, show_in_list, show_in_form, options, lookup_object_id, default_value, placeholder, help_text, sort_order } = req.body;
  if (!object_id||!environment_id||!name||!api_key||!field_type) return res.status(400).json({error:'Missing required fields'});
  if (!VALID.includes(field_type)) return res.status(400).json({error:'Invalid field_type'});
  if (findOne('fields', f=>f.object_id===object_id&&f.api_key===api_key)) return res.status(409).json({error:'api_key already exists on this object'});
  const maxOrder = Math.max(0, ...query('fields', f=>f.object_id===object_id).map(f=>f.sort_order));
  res.status(201).json(insert('fields', {id:uuidv4(),object_id,environment_id,name,api_key,field_type,is_required:is_required?1:0,is_unique:is_unique?1:0,is_system:0,show_in_list:show_in_list!==undefined?(show_in_list?1:0):1,show_in_form:show_in_form!==undefined?(show_in_form?1:0):1,options:options||null,lookup_object_id:lookup_object_id||null,default_value:default_value||null,placeholder:placeholder||null,help_text:help_text||null,sort_order:sort_order!==undefined?sort_order:maxOrder+1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
});

router.patch('/:id', (req, res) => { const f = update('fields', x=>x.id===req.params.id, req.body); f ? res.json(f) : res.status(404).json({error:'Not found'}); });

router.delete('/:id', (req, res) => {
  const f = findOne('fields', x=>x.id===req.params.id);
  if (!f) return res.status(404).json({error:'Not found'});
  if (f.is_system) return res.status(403).json({error:'Cannot delete system fields'});
  remove('fields', x=>x.id===req.params.id);
  res.json({deleted:true});
});

router.post('/reorder', (req, res) => {
  const { field_orders } = req.body;
  if (!Array.isArray(field_orders)) return res.status(400).json({error:'field_orders array required'});
  for (const {id, sort_order} of field_orders) update('fields', x=>x.id===id, {sort_order});
  res.json({updated: field_orders.length});
});

module.exports = router;
EOF

cat > routes/records.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove } = require('../db/init');

router.get('/', (req, res) => {
  const { object_id, environment_id, page=1, limit=50, search, sort_dir='desc' } = req.query;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});
  let records = query('records', r=>r.object_id===object_id&&r.environment_id===environment_id&&!r.deleted_at);
  if (search) records = records.filter(r=>JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()));
  records.sort((a,b)=>sort_dir==='asc'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
  const total = records.length;
  const start = (parseInt(page)-1)*parseInt(limit);
  res.json({records:records.slice(start,start+parseInt(limit)),pagination:{total,page:parseInt(page),limit:parseInt(limit),pages:Math.ceil(total/parseInt(limit))}});
});

router.get('/:id', (req, res) => {
  const r = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  r ? res.json(r) : res.status(404).json({error:'Not found'});
});

router.post('/', (req, res) => {
  const { object_id, environment_id, data={}, created_by } = req.body;
  if (!object_id||!environment_id) return res.status(400).json({error:'object_id and environment_id required'});
  const required = query('fields', f=>f.object_id===object_id&&f.is_required);
  const missing = required.filter(f=>!data[f.api_key]&&data[f.api_key]!==0);
  if (missing.length) return res.status(400).json({error:'Missing required fields',missing:missing.map(f=>f.api_key)});
  const record = insert('records', {id:uuidv4(),object_id,environment_id,data,created_by:created_by||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),deleted_at:null});
  insert('activity', {id:uuidv4(),environment_id,record_id:record.id,object_id,action:'created',actor:created_by||null,changes:data,created_at:new Date().toISOString()});
  res.status(201).json(record);
});

router.patch('/:id', (req, res) => {
  const record = findOne('records', r=>r.id===req.params.id&&!r.deleted_at);
  if (!record) return res.status(404).json({error:'Not found'});
  const { data, updated_by } = req.body;
  const updated = update('records', r=>r.id===req.params.id, {data:{...record.data,...data}});
  insert('activity', {id:uuidv4(),environment_id:record.environment_id,record_id:record.id,object_id:record.object_id,action:'updated',actor:updated_by||null,changes:data,created_at:new Date().toISOString()});
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  update('records', r=>r.id===req.params.id, {deleted_at:new Date().toISOString()});
  res.json({deleted:true});
});

router.get('/:id/activity', (req, res) => {
  res.json(query('activity', a=>a.record_id===req.params.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,50));
});

module.exports = router;
EOF

# Remove better-sqlite3 from package.json and update
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
delete pkg.dependencies['better-sqlite3'];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Updated package.json');
"

echo ""
echo "✅ Fix applied! Now run: node index.js"
echo ""
