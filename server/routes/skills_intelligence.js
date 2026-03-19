// server/routes/skills_intelligence.js
const express = require('express');
const router = express.Router();
const { query, insert, update, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; normA += a[i]*a[i]; normB += b[i]*b[i]; }
  const d = Math.sqrt(normA) * Math.sqrt(normB);
  return d === 0 ? 0 : dot / d;
}

function migrateSkillsIntel() {
  const store = getStore();
  if (!store.skill_relationships) { store.skill_relationships = []; saveStore(); }
}

// GET /api/skills-intel/similar?skill_id=&limit=&environment_id=
router.get('/similar', async (req, res) => {
  const { skill_id, q, limit = 10, environment_id } = req.query;
  if (!skill_id && !q) return res.status(400).json({ error: 'skill_id or q required' });
  try {
    const skills = query('skills', s => (!environment_id || s.environment_id === environment_id) && s.is_active !== false);
    let targetVec;
    if (skill_id) {
      const target = skills.find(s => s.id === skill_id);
      if (!target) return res.status(404).json({ error: 'Skill not found' });
      if (!target.embedding) return res.status(422).json({ error: 'No embedding. Run /generate-embeddings first.' });
      targetVec = target.embedding;
    } else {
      const vecs = await generateEmbeddingsViaClaude([`Skill: ${q}`]);
      targetVec = vecs[0];
    }
    const scored = skills.filter(s => s.id !== skill_id && s.embedding)
      .map(s => ({ ...s, similarity: cosineSim(targetVec, s.embedding) }))
      .sort((a, b) => b.similarity - a.similarity).slice(0, Number(limit))
      .map(s => ({ id: s.id, name: s.name, category: s.category, subcategory: s.subcategory, similarity: Math.round(s.similarity * 100), aliases: s.aliases || [] }));
    res.json(scored);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/skills-intel/relationships/:skill_id
router.get('/relationships/:skill_id', (req, res) => {
  try {
    const rels = query('skill_relationships', r => r.from_skill_id === req.params.skill_id || r.to_skill_id === req.params.skill_id);
    const skills = query('skills', () => true);
    const byId = Object.fromEntries(skills.map(s => [s.id, s]));
    res.json(rels.map(r => ({ ...r, from_skill: byId[r.from_skill_id] ? { id: r.from_skill_id, name: byId[r.from_skill_id].name } : null, to_skill: byId[r.to_skill_id] ? { id: r.to_skill_id, name: byId[r.to_skill_id].name } : null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-intel/gap
router.post('/gap', (req, res) => {
  const { candidate_skill_ids = [], required_skill_ids = [], environment_id } = req.body;
  try {
    const skills = query('skills', s => !environment_id || s.environment_id === environment_id);
    const byId = Object.fromEntries(skills.map(s => [s.id, s]));
    const results = required_skill_ids.map(reqId => {
      const required = byId[reqId]; if (!required) return null;
      if (candidate_skill_ids.includes(reqId)) return { skill: required, status: 'match', similarity: 100, matched_via: null };
      let bestMatch = null, bestSim = 0;
      for (const candId of candidate_skill_ids) {
        const cand = byId[candId];
        if (!cand?.embedding || !required.embedding) continue;
        const sim = cosineSim(cand.embedding, required.embedding);
        if (sim > bestSim) { bestSim = sim; bestMatch = cand; }
      }
      if (bestSim >= 0.75) return { skill: required, status: 'partial', similarity: Math.round(bestSim * 100), matched_via: bestMatch ? { id: bestMatch.id, name: bestMatch.name } : null };
      return { skill: required, status: 'gap', similarity: Math.round(bestSim * 100), matched_via: null };
    }).filter(Boolean);
    const summary = { total: results.length, matched: results.filter(r => r.status==='match').length, partial: results.filter(r => r.status==='partial').length, gaps: results.filter(r => r.status==='gap').length, score: results.length ? Math.round(results.reduce((acc, r) => acc + (r.status==='match' ? 100 : r.status==='partial' ? r.similarity : 0), 0) / results.length) : 0 };
    res.json({ summary, details: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-intel/generate-embeddings
router.post('/generate-embeddings', async (req, res) => {
  const { environment_id, force = false } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const skills = query('skills', s => s.environment_id === environment_id && (force || !s.embedding));
    if (skills.length === 0) return res.json({ message: 'All skills already have embeddings', count: 0 });
    const BATCH = 20; let done = 0; const errors = [];
    for (let i = 0; i < skills.length; i += BATCH) {
      const batch = skills.slice(i, i + BATCH);
      const texts = batch.map(s => `Skill: ${s.name}. Category: ${s.category}. Subcategory: ${s.subcategory || 'general'}. Aliases: ${(s.aliases||[]).join(', ')||'none'}.`);
      try {
        const embeddings = await generateEmbeddingsViaClaude(texts);
        batch.forEach((skill, idx) => { if (embeddings[idx]) { update('skills', skill.id, { embedding: embeddings[idx], updated_at: new Date().toISOString() }); done++; } });
      } catch (e) { errors.push({ skills: batch.map(s => s.name), error: e.message }); }
    }
    res.json({ done, errors, total: skills.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/skills-intel/seed-relationships
router.post('/seed-relationships', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    const skills = query('skills', s => s.environment_id === environment_id);
    if (skills.length === 0) return res.status(422).json({ error: 'No skills found. Seed taxonomy first.' });
    const byName = {};
    skills.forEach(s => { byName[s.name.toLowerCase()] = s.id; (s.aliases||[]).forEach(a => { byName[a.toLowerCase()] = s.id; }); });
    const existing = query('skill_relationships', () => true);
    const existingKeys = new Set(existing.map(r => `${r.from_skill_id}:${r.to_skill_id}:${r.relationship_type}`));
    let inserted = 0;
    buildRelDefs().forEach(([fromName, relType, toName, weight=0.8]) => {
      const fromId = byName[fromName.toLowerCase()]; const toId = byName[toName.toLowerCase()];
      if (!fromId || !toId) return;
      const key = `${fromId}:${toId}:${relType}`;
      if (existingKeys.has(key)) return;
      insert('skill_relationships', { id: `${fromId}_${toId}_${relType}`, from_skill_id: fromId, to_skill_id: toId, relationship_type: relType, weight, environment_id, created_at: new Date().toISOString() });
      inserted++;
    });
    res.json({ inserted, total: buildRelDefs().length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function generateEmbeddingsViaClaude(texts) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const DIMS = ['programming/coding','web development','data/databases','AI/machine learning','cloud/infrastructure','mobile development','security/cybersecurity','devops/deployment','frontend/UI','backend/server','data engineering','networking/systems','open source','agile/engineering','architecture patterns','testing/QA','finance/accounting','sales/revenue','marketing/growth','HR/people management','strategy/planning','operations/process','legal/compliance','consulting/advisory','leadership/management','project management','customer facing','product management','entrepreneurship','international/global','procurement','change management','quantitative/numerical','analytical thinking','research/investigation','data interpretation','statistical methods','modelling/forecasting','problem solving','critical thinking','written communication','verbal/presentation','negotiation','stakeholder management','cross-cultural','training/teaching','persuasion/influence','active listening','visual design','creative thinking','content creation','UX/user research','innovation','storytelling','brand/identity','multimedia','financial services','technology industry','healthcare','retail/ecommerce','manufacturing','consulting','government/public','real estate'];
  const prompt = `For each skill below, output a ${DIMS.length}-dimensional embedding vector rating relevance (0.0–1.0) to each concept. Output ONLY a JSON array of arrays.\n\nConcepts (0-${DIMS.length-1}): ${DIMS.map((d,i)=>`${i}:${d}`).join(', ')}\n\nSkills:\n${texts.map((t,i)=>`${i}: ${t}`).join('\n')}\n\nRules: most values near 0, only relevant ones high. Format: [[...],[...]] only.`;
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }) });
  if (!response.ok) throw new Error(`Claude API ${response.status}`);
  const data = await response.json();
  const raw = data.content[0]?.text || '[]';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function buildRelDefs() {
  return [
    ['JavaScript','prerequisite_of','React',1.0],['JavaScript','prerequisite_of','Vue.js',1.0],['JavaScript','prerequisite_of','Angular',1.0],['JavaScript','prerequisite_of','Next.js',0.9],['JavaScript','prerequisite_of','TypeScript',0.8],['TypeScript','related_to','React',0.9],['TypeScript','related_to','Angular',0.95],['React','related_to','Next.js',0.95],['React','related_to','Vue.js',0.8],['React','complements','TypeScript',0.9],['HTML / CSS','prerequisite_of','React',0.85],['Vue.js','related_to','Angular',0.75],
    ['JavaScript','prerequisite_of','Node.js',0.9],['Node.js','related_to','REST API Design',0.85],['Python','related_to','Machine Learning',0.95],['Python','related_to','Deep Learning',0.9],['Python','complements','SQL',0.85],['Python','related_to','LLM / Generative AI',0.85],['REST API Design','related_to','GraphQL',0.8],
    ['Machine Learning','prerequisite_of','Deep Learning',0.9],['Machine Learning','related_to','LLM / Generative AI',0.85],['Deep Learning','related_to','LLM / Generative AI',0.9],['Deep Learning','related_to','NLP',0.85],['Python for Data Science','related_to','Machine Learning',0.9],['SQL','related_to','Data Visualisation',0.75],['Big Data','related_to','Machine Learning',0.75],
    ['AWS','related_to','Azure',0.85],['AWS','related_to','Google Cloud',0.85],['Azure','related_to','Google Cloud',0.85],['Docker','prerequisite_of','Kubernetes',0.95],['Docker','related_to','CI/CD',0.85],['Kubernetes','related_to','Terraform',0.8],['Terraform','related_to','AWS',0.9],
    ['React','related_to','React Native',0.85],['Flutter','related_to','React Native',0.75],
    ['Financial Modelling','related_to','Corporate Finance',0.9],['Corporate Finance','related_to','M&A / Due Diligence',0.9],['Corporate Finance','related_to','Private Equity',0.85],['Budgeting & Forecasting','related_to','Financial Reporting',0.85],['Audit','related_to','Compliance & GRC',0.75],['Private Equity','related_to','M&A / Due Diligence',0.9],
    ['B2B Sales','related_to','SaaS Sales',0.85],['B2B Sales','related_to','Account Management',0.85],['SaaS Sales','complements','CRM',0.9],
    ['Digital Marketing','related_to','SEO / SEM',0.9],['Digital Marketing','related_to','Performance Marketing',0.9],['Product Marketing','related_to','Content Marketing',0.8],
    ['Talent Acquisition','related_to','HR Business Partnering',0.75],['HR Business Partnering','related_to','Organisational Design',0.8],
    ['People Management','related_to','Coaching & Mentoring',0.9],['Strategic Thinking','related_to','Decision Making',0.9],['Critical Thinking','related_to','Analytical Thinking',0.9],['Emotional Intelligence','complements','People Management',0.9],
    ['Product Design','related_to','User Research',0.9],['Product Design','related_to','Prototyping',0.9],['Figma','related_to','Design Systems',0.85],
    ['Python','leads_to','Machine Learning',0.85],['Machine Learning','leads_to','LLM / Generative AI',0.8],['React','leads_to','Next.js',0.9],['Docker','leads_to','Kubernetes',0.9],['B2B Sales','leads_to','Account Management',0.85],['Talent Acquisition','leads_to','HR Business Partnering',0.8],
  ];
}

module.exports = router;
module.exports.migrate = migrateSkillsIntel;
