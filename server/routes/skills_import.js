// server/routes/skills_import.js
const express = require('express');
const router = express.Router();
const { query, insert, getStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
function ts() { return new Date().toISOString(); }

// GET /api/skills-import/esco/search?q=&limit=
router.get('/esco/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const url = `https://esco.ec.europa.eu/api/search?language=en&type=skill&text=${encodeURIComponent(q)}&limit=${limit}&offset=0`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`ESCO API ${r.status}`);
    const data = await r.json();
    const hits = (data?._embedded?.results || []).map(s => ({ esco_uri: s.uri, name: s.title, description: s.description?.en?.literal || s.description?.literal || '', esco_type: s.skillType || 'skill', preferred_label: s.preferredLabel?.en || s.preferredLabel || s.title, alt_labels: s.altLabels?.en || [] }));
    res.json({ hits, total: data?.total || hits.length });
  } catch (e) { res.status(502).json({ error: `ESCO API unavailable: ${e.message}`, fallback: true }); }
});

// POST /api/skills-import/esco/import
router.post('/esco/import', (req, res) => {
  const { skills = [], environment_id, category_override, subcategory_override } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const existing = query('skills', s => s.environment_id === environment_id);
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));
    const existingUris = new Set(existing.map(s => s.esco_uri).filter(Boolean));
    let imported = 0, skipped = 0;
    skills.forEach(s => {
      if (existingUris.has(s.esco_uri) || existingNames.has((s.name||'').toLowerCase())) { skipped++; return; }
      insert('skills', { id: uuidv4(), name: s.name, category: category_override || mapEscoCat(s.esco_uri, s.name), subcategory: subcategory_override || mapEscoSub(s.esco_uri, s.name), description: s.description||null, aliases: s.alt_labels||[], proficiency_levels: ['Beginner','Intermediate','Advanced','Expert'], esco_uri: s.esco_uri||null, source: 'esco', environment_id, is_active: true, created_at: ts(), updated_at: ts() });
      imported++;
    });
    res.json({ imported, skipped, total: skills.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-import/bulk-csv
router.post('/bulk-csv', (req, res) => {
  const { rows = [], environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const existing = query('skills', s => s.environment_id === environment_id);
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));
    let imported = 0, skipped = 0, errors = [];
    rows.forEach(row => {
      if (!row.name?.trim()) { errors.push({ row, error: 'name required' }); return; }
      if (existingNames.has(row.name.trim().toLowerCase())) { skipped++; return; }
      insert('skills', { id: uuidv4(), name: row.name.trim(), category: row.category?.trim()||'Other', subcategory: row.subcategory?.trim()||null, description: row.description?.trim()||null, aliases: row.aliases ? row.aliases.split(',').map(a=>a.trim()).filter(Boolean) : [], proficiency_levels: ['Beginner','Intermediate','Advanced','Expert'], source: 'import', environment_id, is_active: true, created_at: ts(), updated_at: ts() });
      existingNames.add(row.name.trim().toLowerCase()); imported++;
    });
    res.json({ imported, skipped, errors, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-import/discover
router.post('/discover', async (req, res) => {
  const { environment_id, source = 'all' } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  try {
    const existing = query('skills', s => s.environment_id === environment_id);
    const existingNames = new Set([...existing.map(s=>s.name.toLowerCase()), ...existing.flatMap(s=>(s.aliases||[]).map(a=>a.toLowerCase()))]);
    const objects = query('object_definitions', o => o.environment_id === environment_id);
    const records = query('records', r => r.environment_id === environment_id && !r.deleted_at);
    const textSamples = [];
    records.forEach(r => {
      const d = r.data || {};
      const obj = objects.find(o => o.id === r.object_id);
      const slug = obj?.slug || '';
      if ((source === 'jobs' || source === 'all') && slug === 'jobs') {
        const text = [d.job_title, d.job_description, d.requirements, d.skills].filter(Boolean).join(' ');
        if (text.trim()) textSamples.push({ source: 'job', label: d.job_title||'Job', text: text.slice(0,600) });
      }
      if ((source === 'candidates' || source === 'all') && slug === 'people') {
        const text = [d.skills, d.bio, d.current_title, d.summary].filter(Boolean).join(' ');
        if (text.trim()) textSamples.push({ source: 'candidate', label: `${d.first_name||''} ${d.last_name||''}`.trim(), text: text.slice(0,400) });
      }
    });
    if (textSamples.length === 0) return res.json({ suggestions: [], message: 'No job or candidate records with skills data found.' });
    const sample = textSamples.sort(()=>Math.random()-0.5).slice(0,40);
    const prompt = `You are a skills taxonomy expert. Analyse these records and find skills NOT in the existing taxonomy.\n\nEXISTING TAXONOMY (${existing.length} skills — do NOT suggest these):\n${existing.slice(0,80).map(s=>s.name).join(', ')}${existing.length>80?` ...+${existing.length-80} more`:''}\n\nDATA (${sample.length} records):\n${sample.map((s,i)=>`[${i+1}] ${s.source.toUpperCase()} "${s.label}": ${s.text}`).join('\n\n')}\n\nReturn JSON array of 10-25 suggestions, each with: name, category (Technology|Business|Design|Soft Skills|Languages|Certifications|Other), subcategory, aliases (array), description (1 sentence), confidence (high|medium|low), seen_in (array of labels), reason.\n\nOutput ONLY the JSON array.`;
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) });
    if (!response.ok) throw new Error(`Claude API ${response.status}`);
    const aiData = await response.json();
    const raw = aiData.content[0]?.text || '[]';
    const suggestions = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const filtered = suggestions.filter(s => s.name && !existingNames.has(s.name.toLowerCase()));
    res.json({ suggestions: filtered, analysed: sample.length, total_records: textSamples.length, existing_skills: existing.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-import/discover/apply
router.post('/discover/apply', (req, res) => {
  const { skills = [], environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    let added = 0;
    skills.forEach(s => { insert('skills', { id: uuidv4(), name: s.name, category: s.category||'Other', subcategory: s.subcategory||null, description: s.description||null, aliases: s.aliases||[], proficiency_levels: ['Beginner','Intermediate','Advanced','Expert'], source: 'ai_discovery', environment_id, is_active: true, created_at: ts(), updated_at: ts() }); added++; });
    res.json({ added });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function mapEscoCat(uri='', name='') {
  const n = name.toLowerCase();
  if (n.match(/program|software|develop|code|web|mobile|cloud|data|ai|ml|cyber|network|devops/i)) return 'Technology';
  if (n.match(/financ|account|sales|market|hr|recruit|strateg|business|manag|operat/i)) return 'Business';
  if (n.match(/design|graphic|ux|ui|visual|creative/i)) return 'Design';
  if (n.match(/communicat|teamwork|collaborat|adapt|problem.solv|critical|emotion/i)) return 'Soft Skills';
  if (n.match(/language|speak|translat/i)) return 'Languages';
  if (n.match(/certif|qualif|licens/i)) return 'Certifications';
  return 'Other';
}
function mapEscoSub(uri='', name='') {
  const n = name.toLowerCase();
  if (n.match(/react|vue|angular|frontend|html|css|javascript/i)) return 'Frontend Development';
  if (n.match(/python|java|node|backend|api|server/i)) return 'Backend Development';
  if (n.match(/aws|azure|gcp|cloud|docker|kubernetes|devops/i)) return 'Cloud & DevOps';
  if (n.match(/machine.learn|deep.learn|ai|nlp|data.scienc/i)) return 'Data & AI';
  if (n.match(/financ|account|budget|invest|tax|audit/i)) return 'Finance';
  if (n.match(/sales|account.manag|business.develop/i)) return 'Sales';
  if (n.match(/market|seo|content|brand/i)) return 'Marketing';
  if (n.match(/hr|recruit|talent|people.manag/i)) return 'Human Resources';
  return null;
}

module.exports = router;
