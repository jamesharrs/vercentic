// server/routes/question_bank.js
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

// Seeding is handled in server/index.js initDB block

// ─── CATEGORIES (uses the same type taxonomy) ─────────────────────────────────
router.get('/categories', (req, res) => {
  res.json([
    { id:'c1', name:'Behavioural',   color:'#6366f1' }, { id:'c2', name:'Technical',   color:'#0891b2' },
    { id:'c3', name:'Situational',   color:'#059669' }, { id:'c4', name:'Motivational', color:'#d97706' },
    { id:'c5', name:'Culture Fit',   color:'#7c3aed' }, { id:'c6', name:'Role Specific',color:'#db2777' },
    { id:'c7', name:'Opening',       color:'#65a30d' }, { id:'c8', name:'Closing',      color:'#ea580c' },
    { id:'c9', name:'Eligibility',   color:'#dc2626' },
  ]);
});

// ─── BULK (get multiple by IDs) ───────────────────────────────────────────────
router.post('/bulk', (req, res) => {
  const { ids = [] } = req.body;
  const store = getStore();
  const qs = (store.question_bank_v2 || []).filter(q => ids.includes(q.id));
  res.json(qs);
});

// ─── QUESTIONS ───────────────────────────────────────────────────────────────
router.get('/questions', (req, res) => {
  const { type, search } = req.query;
  const store = getStore();
  let qs = store.question_bank_v2 || [];
  if (type)   qs = qs.filter(q=>q.type===type);
  if (search) { const s=search.toLowerCase(); qs=qs.filter(q=>q.text.toLowerCase().includes(s)||(q.competency||'').toLowerCase().includes(s)||(q.tags||[]).some(t=>t.includes(s))); }
  res.json(qs);
});

router.post('/questions', (req, res) => {
  const { text, type, competency, weight, options, pass_value, tags } = req.body;
  if (!text||!type) return res.status(400).json({error:'text and type required'});
  const store = getStore();
  const q = { id:uuidv4(), text, type, competency:competency||type, weight:weight||10, options:options||null, pass_value:pass_value||null, tags:tags||[], is_custom:true, is_system:false, created_at:new Date().toISOString() };
  if (!store.question_bank_v2) store.question_bank_v2=[];
  store.question_bank_v2.push(q);
  saveStore(store);
  res.json(q);
});

router.patch('/questions/:id', (req, res) => {
  const store = getStore();
  const idx = (store.question_bank_v2||[]).findIndex(q=>q.id===req.params.id);
  if (idx===-1) return res.status(404).json({error:'Not found'});
  ['text','type','competency','weight','options','pass_value','tags'].forEach(k=>{if(req.body[k]!==undefined)store.question_bank_v2[idx][k]=req.body[k];});
  store.question_bank_v2[idx].updated_at=new Date().toISOString();
  saveStore(store);
  res.json(store.question_bank_v2[idx]);
});

router.delete('/questions/:id', (req, res) => {
  const store = getStore();
  const idx = (store.question_bank_v2||[]).findIndex(q=>q.id===req.params.id&&!q.is_system);
  if (idx===-1) return res.status(404).json({error:'Custom question not found'});
  store.question_bank_v2.splice(idx,1);
  saveStore(store);
  res.json({deleted:true});
});

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  const store = getStore();
  const templates = (store.question_templates||[]).map(tpl=>({...tpl,question_count:(tpl.question_ids||[]).length}));
  res.json(templates);
});

router.get('/templates/:id', (req, res) => {
  const store = getStore();
  const tpl = (store.question_templates||[]).find(t=>t.id===req.params.id);
  if (!tpl) return res.status(404).json({error:'Not found'});
  const questions = (store.question_bank_v2||[]).filter(q=>(tpl.question_ids||[]).includes(q.id));
  res.json({...tpl,questions});
});

router.post('/templates', (req, res) => {
  const { name, description, category, question_ids, template_type, rules } = req.body;
  if (!name) return res.status(400).json({error:'name required'});
  const store = getStore();
  const tpl = {
    id: uuidv4(), name, description: description||'',
    category: category||'Custom',
    template_type: template_type||'interview',  // 'interview' | 'screening'
    question_ids: question_ids||[],
    rules: rules||[],                           // used by screening templates
    is_system: false,
    created_at: new Date().toISOString(),
  };
  if (!store.question_templates) store.question_templates=[];
  store.question_templates.push(tpl);
  saveStore(store);
  res.json(tpl);
});

router.patch('/templates/:id', (req, res) => {
  const store = getStore();
  const idx = (store.question_templates||[]).findIndex(t=>t.id===req.params.id);
  if (idx===-1) return res.status(404).json({error:'Not found'});
  if (store.question_templates[idx].is_system) return res.status(403).json({error:'System templates cannot be edited'});
  ['name','description','category','question_ids','template_type','rules'].forEach(k=>{if(req.body[k]!==undefined)store.question_templates[idx][k]=req.body[k];});
  store.question_templates[idx].updated_at=new Date().toISOString();
  saveStore(store);
  res.json(store.question_templates[idx]);
});

router.delete('/templates/:id', (req, res) => {
  const store = getStore();
  const idx = (store.question_templates||[]).findIndex(t=>t.id===req.params.id&&!t.is_system);
  if (idx===-1) return res.status(404).json({error:'Not found or system template'});
  store.question_templates.splice(idx,1);
  saveStore(store);
  res.json({deleted:true});
});

// ─── JOB QUESTIONS ────────────────────────────────────────────────────────────
router.get('/jobs/:job_id', (req, res) => {
  const store = getStore();
  const jobId = req.params.job_id;
  const assignments = (store.job_questions||[]).filter(jq=>jq.job_id===jobId);
  const qIds = assignments.map(a=>a.question_id);
  // Library questions
  const libraryQs = (store.question_bank_v2||[]).filter(q=>qIds.includes(q.id));
  // Job-only (inline) questions stored directly on the assignment
  const ordered = assignments.map(a=>{
    if (a.question_data) {
      return { ...a.question_data, id: a.question_id, order: a.order, _job_only: true };
    }
    const q = libraryQs.find(q=>q.id===a.question_id);
    return q ? { ...q, order: a.order } : null;
  }).filter(Boolean).sort((a,b)=>(a.order||0)-(b.order||0));

  // Also pull questions from the Screening Rules panel (screening_job_rules)
  // These have question_text/question_type/question_options rather than text/type/options
  const screeningRules = (store.screening_job_rules||[]).filter(r => r.record_id === jobId && r.question_text);
  const screeningQs = screeningRules.map(r => ({
    id: r.id,
    type: r.question_type || 'competency',
    text: r.question_text,
    options: r.question_options || [],
    pass_value: r.pass_value || null,
    weight: r.weight || 5,
    _from_screening_rules: true,
  }));

  // Merge — avoid duplicates, knockout questions first
  const existingIds = new Set(ordered.map(q => q.id));
  const merged = [
    ...ordered,
    ...screeningQs.filter(q => !existingIds.has(q.id)),
  ];
  merged.sort((a,b) => {
    if ((a.type==='knockout') && (b.type!=='knockout')) return -1;
    if ((a.type!=='knockout') && (b.type==='knockout')) return 1;
    return 0;
  });
  res.json(merged);
});

// Alias — WizardRenderer calls /jobs/:job_id/questions (with /questions suffix)
router.get('/jobs/:job_id/questions', (req, res) => {
  req.params.job_id = req.params.job_id; // already set
  // Re-use same logic — just forward to the handler above by re-calling
  const store = require('../db/init').getStore();
  const jobId = req.params.job_id;
  const assignments = (store.job_questions||[]).filter(jq=>jq.job_id===jobId);
  const qIds = assignments.map(a=>a.question_id);
  const libraryQs = (store.question_bank_v2||[]).filter(q=>qIds.includes(q.id));
  const ordered = assignments.map(a=>{
    if (a.question_data) return { ...a.question_data, id: a.question_id, order: a.order, _job_only: true };
    const q = libraryQs.find(q=>q.id===a.question_id);
    return q ? { ...q, order: a.order } : null;
  }).filter(Boolean).sort((a,b)=>(a.order||0)-(b.order||0));
  const screeningRules = (store.screening_job_rules||[]).filter(r => r.record_id === jobId && r.question_text);
  const screeningQs = screeningRules.map(r => ({
    id: r.id, type: r.question_type||'competency', text: r.question_text,
    options: r.question_options||[], pass_value: r.pass_value||null, weight: r.weight||5,
    _from_screening_rules: true,
  }));
  const existingIds = new Set(ordered.map(q=>q.id));
  const merged = [...ordered, ...screeningQs.filter(q=>!existingIds.has(q.id))];
  merged.sort((a,b)=>(a.type==='knockout'&&b.type!=='knockout')?-1:(a.type!=='knockout'&&b.type==='knockout')?1:0);
  res.json(merged);
});

router.put('/jobs/:job_id', async (req, res) => {
  const { question_ids } = req.body;
  if (!Array.isArray(question_ids)) return res.status(400).json({error:'question_ids array required'});
  const store = getStore();
  if (!store.job_questions) store.job_questions=[];
  const jobOnlyExisting = store.job_questions.filter(jq=>jq.job_id===req.params.job_id && jq.question_data);
  store.job_questions = store.job_questions.filter(jq=>jq.job_id!==req.params.job_id);
  jobOnlyExisting.forEach(a=>store.job_questions.push(a));
  question_ids.forEach((qid,i)=>store.job_questions.push({id:uuidv4(),job_id:req.params.job_id,question_id:qid,order:jobOnlyExisting.length+i,created_at:new Date().toISOString()}));
  saveStore(store);
  // Force-sync both job_questions AND question_bank_v2 to Postgres immediately
  try {
    const pg = require('../db/postgres');
    const { getCurrentTenant } = require('../db/init');
    if (pg.isEnabled()) {
      const tenant = getCurrentTenant() || 'master';
      await pg.saveCollection(tenant, 'job_questions', store.job_questions);
      await pg.saveCollection(tenant, 'question_bank_v2', store.question_bank_v2 || []);
    }
  } catch(e) { console.error('PG sync job_questions:', e.message); }
  res.json({job_id:req.params.job_id,question_count:question_ids.length+jobOnlyExisting.length});
});

// Save job-only questions (not added to the library)
router.post('/jobs/:job_id/direct', (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions)||!questions.length) return res.status(400).json({error:'questions array required'});
  const store = getStore();
  if (!store.job_questions) store.job_questions=[];
  const existing = store.job_questions.filter(jq=>jq.job_id===req.params.job_id);
  const startOrder = existing.length;
  const added = [];
  questions.forEach((q,i) => {
    const qid = uuidv4();
    const record = {
      id: uuidv4(),
      job_id: req.params.job_id,
      question_id: qid,
      order: startOrder + i,
      question_data: { ...q, id: qid, created_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
    };
    store.job_questions.push(record);
    added.push({ ...q, id: qid });
  });
  saveStore(store);
  res.json({ added, count: added.length });
});

// Remove a single job-only question
router.delete('/jobs/:job_id/direct/:question_id', (req, res) => {
  const store = getStore();
  if (!store.job_questions) return res.json({ deleted: false });
  const before = store.job_questions.length;
  store.job_questions = store.job_questions.filter(jq =>
    !(jq.job_id === req.params.job_id && jq.question_id === req.params.question_id && jq.question_data)
  );
  saveStore(store);
  res.json({ deleted: store.job_questions.length < before });
});

// AI-generate questions for a job
router.post('/jobs/:job_id/generate', async (req, res) => {
  const { job_id } = req.params;
  let { job_title, department, description, skills, count=8 } = req.body;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({error:'AI not configured'});

  // Auto-fetch job context from the record if not supplied by client
  if (!job_title) {
    const { findOne } = require('../db/init');
    const rec = findOne('records', r => r.id === job_id);
    if (rec?.data) {
      job_title   = rec.data.job_title   || rec.data.title       || rec.data.name   || '';
      department  = rec.data.department  || rec.data.dept        || department       || '';
      description = rec.data.description || rec.data.job_description || description || '';
      skills      = rec.data.skills      || rec.data.required_skills || skills      || '';
    }
  }

  // Fetch existing questions so Claude avoids duplicates
  const { query } = require('../db/init');
  const existing = query('question_bank_questions', () => true);
  const existingTexts = existing.map(q => q.text).join('\n- ');

  // Also fetch already-assigned questions for this job
  const assignments = query('question_bank_job_assignments', r => r.job_id === job_id);
  const assignedIds = new Set(assignments.map(a => a.question_id));
  // Include both library questions and job-only inline questions in dedup
  const jobOnlyTexts = assignments.filter(a => a.question_data).map(a => a.question_data.text);
  const assignedTexts = [
    ...existing.filter(q => assignedIds.has(q.id)).map(q => q.text),
    ...jobOnlyTexts,
  ].join('\n- ');

  const prompt = `You are an expert recruiter creating interview questions for a ${job_title||'role'} role${department?` in ${department}`:''}.\n${description?`Job description: ${description}\n`:''}${skills?`Required skills: ${Array.isArray(skills)?skills.join(', '):skills}\n`:''}\n\nGenerate exactly ${count} high-quality, ROLE-SPECIFIC interview questions. Aim for:\n- 1-2 knockout/eligibility checks (type: "knockout")\n- 2-3 competency/behavioural questions specific to this role (type: "competency")\n- 1-2 technical questions about the required skills (type: "technical")\n- 1-2 culture fit questions (type: "culture")\n\n${existingTexts ? `IMPORTANT - The following questions already exist in the library. Do NOT generate anything similar or overlapping:\n- ${existingTexts}\n\n` : ''}${assignedTexts ? `These questions are already assigned to this job - do not repeat them:\n- ${assignedTexts}\n\n` : ''}Make every question specific to the role, not generic. Avoid generic questions like "Tell me about yourself" or "What are your strengths".\n\nRespond with valid JSON array only:\n[{"text":"...","type":"knockout|competency|technical|culture","competency":"...","weight":10,"tags":["..."],"options":null,"pass_value":null}]\nFor knockout questions add options like ["Yes","No"] and pass_value.`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2000,messages:[{role:'user',content:prompt}]})});
    const data = await response.json();
    if (data.error) { console.error('Anthropic error:', data.error); return res.status(500).json({error: data.error.message||'AI error'}); }
    const raw = data.content?.[0]?.text||'[]';
    const cleaned = raw.replace(/```json\n?|\n?```/g,'').trim();
    const generated = JSON.parse(cleaned);

    // Dedup only against questions already assigned to THIS job (don't filter against full library)
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
    const assignedNorm = [
      ...existing.filter(q => assignedIds.has(q.id)).map(q => normalize(q.text)),
      ...jobOnlyTexts.map(normalize),
    ];
    const deduped = generated.filter(q => {
      const n = normalize(q.text);
      const words = new Set(n.split(' ').filter(w => w.length > 4));
      return !assignedNorm.some(en => {
        const enWords = en.split(' ').filter(w => w.length > 4);
        if (!enWords.length || !words.size) return false;
        const overlap = enWords.filter(w => words.has(w)).length;
        return overlap / Math.min(words.size, enWords.length) > 0.5;
      });
    });

    // Return as preview — don't save yet, let the client decide which to keep + whether to add to library
    res.json({ preview: deduped.map(q=>({...q, _addToLibrary:true})), filtered_count: generated.length - deduped.length });
  } catch(err) { console.error('AI gen error:',err); res.status(500).json({error:'Failed to generate questions'}); }
});

module.exports = router;
