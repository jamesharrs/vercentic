// server/routes/company_research.js
const express = require('express');
const router = express.Router();
const { getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function ensureCollection() {
  const store = getStore();
  if (!store.company_profiles) { store.company_profiles = []; saveStore(store); }
  if (!store.email_templates) { store.email_templates = []; saveStore(store); }
}

const INDUSTRY_FIELD_SUGGESTIONS = {
  technology: [
    { name: 'GitHub Profile', api_key: 'github_profile', field_type: 'url' },
    { name: 'Tech Stack', api_key: 'tech_stack', field_type: 'multi_select', options: ['React','Node','Python','Java','Go','Rust','TypeScript','AWS','Azure','GCP'] },
    { name: 'Years of Experience', api_key: 'years_experience', field_type: 'number' },
    { name: 'Open Source Contributions', api_key: 'open_source', field_type: 'url' },
    { name: 'Certifications', api_key: 'certifications', field_type: 'multi_select' },
  ],
  finance: [
    { name: 'CFA/CPA Status', api_key: 'qualification_status', field_type: 'select', options: ['CFA Level 1','CFA Level 2','CFA Charterholder','CPA','None'] },
    { name: 'Series Licenses', api_key: 'series_licenses', field_type: 'multi_select', options: ['Series 3','Series 7','Series 63','Series 65','Series 66'] },
    { name: 'Regulatory Clearance', api_key: 'regulatory_clearance', field_type: 'boolean' },
    { name: 'AUM Experience', api_key: 'aum_experience', field_type: 'select', options: ['<$100M','$100M-$1B','$1B-$10B','>$10B'] },
  ],
  healthcare: [
    { name: 'Medical License', api_key: 'medical_license', field_type: 'text' },
    { name: 'Specialisation', api_key: 'specialisation', field_type: 'select' },
    { name: 'DBS Check Status', api_key: 'dbs_check', field_type: 'select', options: ['Clear','Enhanced Clear','Pending','Not Checked'] },
    { name: 'GMC/NMC Number', api_key: 'registration_number', field_type: 'text' },
    { name: 'CPD Hours', api_key: 'cpd_hours', field_type: 'number' },
  ],
  legal: [
    { name: 'Bar Admission', api_key: 'bar_admission', field_type: 'text' },
    { name: 'Practice Areas', api_key: 'practice_areas', field_type: 'multi_select' },
    { name: 'PQE (Years)', api_key: 'pqe_years', field_type: 'number' },
    { name: 'Law Society Number', api_key: 'law_society_number', field_type: 'text' },
  ],
  consulting: [
    { name: 'Consulting Focus', api_key: 'consulting_focus', field_type: 'multi_select', options: ['Strategy','Operations','Technology','HR','Finance','Risk','Digital'] },
    { name: 'Industry Verticals', api_key: 'industry_verticals', field_type: 'multi_select' },
    { name: 'Project Scale', api_key: 'project_scale', field_type: 'select', options: ['SME','Mid-market','Enterprise','Government'] },
    { name: 'Travel Willingness', api_key: 'travel_willingness', field_type: 'select', options: ['None','25%','50%','75%','100%'] },
  ],
  default: [
    { name: 'LinkedIn Profile', api_key: 'linkedin_profile', field_type: 'url' },
    { name: 'Portfolio', api_key: 'portfolio_url', field_type: 'url' },
    { name: 'Languages', api_key: 'languages', field_type: 'multi_select', options: ['English','Arabic','French','Spanish','German','Mandarin','Hindi'] },
    { name: 'Visa Status', api_key: 'visa_status', field_type: 'select', options: ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship'] },
  ]
};

router.post('/research', async (req, res) => {
  const { company_name, environment_id } = req.body;
  if (!company_name || !environment_id) return res.status(400).json({ error: 'company_name and environment_id required' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  // Helper: call Anthropic with retry on rate limit
  const callAI = async (body, attempt = 0) => {
    const hasWebSearch = (body.tools||[]).some(t => t.type?.includes('web_search'));
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...(hasWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {})
    };
    // Remove undefined tools key before sending
    const cleanBody = { ...body };
    if (!cleanBody.tools) delete cleanBody.tools;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanBody)
    });
    if (r.status === 429 && attempt < 3) {
      const wait = (attempt + 1) * 20000;
      console.log(`Rate limited, waiting ${wait/1000}s before retry ${attempt+1}...`);
      await new Promise(res => setTimeout(res, wait));
      return callAI(body, attempt + 1);
    }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };

  try {
    // ── Step 1: Research company profile ──────────────────────────────────────
    const searchData = await callAI({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a company research specialist. Research the company and return ONLY valid compact JSON, no markdown, no extra text.',
      messages: [{ role: 'user', content: `Research "${company_name}" and return ONLY this JSON (no other text):
{"name":"","industry":"technology/finance/healthcare/legal/consulting/retail/manufacturing/media/energy/other","size":"startup/small/medium/large/enterprise","founded":"","description":"2 sentences max","website":"","logo_url":"","brand_color":"#hex","headquarters":"city,country","locations":[{"city":"","country":"","is_hq":true}],"evp":{"headline":"max 8 words","statement":"2 sentences","pillars":["","",""]},"tone":"formal/professional/conversational/startup","typical_roles":["","",""],"key_benefits":["","",""],"social":{"linkedin":""}}` }]
    });

    let profileText = '';
    for (const block of searchData.content || []) { if (block.type === 'text') profileText += block.text; }
    let profile;
    try { profile = JSON.parse(profileText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); }
    catch(e) { return res.status(500).json({ error: 'Failed to parse research results', raw: profileText.slice(0,500) }); }

    // ── Step 2: Wait 30s to clear rate limit window, then generate templates ──
    console.log('Research complete, waiting 30s before template generation...');
    await new Promise(res => setTimeout(res, 30000));

    const tData = await callAI({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      // No web search tool needed for templates — saves tokens
      tools: undefined,
      system: 'Write email templates for recruiters. Return ONLY valid JSON.',
      messages: [{ role: 'user', content: `5 recruiting email templates for ${profile.name} (${profile.industry}, ${profile.tone} tone).
Return ONLY: {"templates":[
{"name":"Initial Outreach","category":"outreach","subject":"...","body":"Use {{candidate_name}},{{job_title}},{{company_name}}"},
{"name":"Interview Invitation","category":"interview","subject":"...","body":"Use {{candidate_name}},{{interview_date}},{{interview_time}}"},
{"name":"Offer Letter","category":"offer","subject":"...","body":"Use {{candidate_name}},{{job_title}},{{salary}},{{start_date}}"},
{"name":"Rejection","category":"rejection","subject":"...","body":"Use {{candidate_name}},{{job_title}}"},
{"name":"Welcome Aboard","category":"onboarding","subject":"...","body":"Use {{candidate_name}},{{start_date}}"}]}` }]
    });

    let emailTemplates = [];
    let tText = ''; for (const b of tData.content||[]) { if (b.type==='text') tText += b.text; }
    try { emailTemplates = JSON.parse(tText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()).templates||[]; } catch(e) {
      console.log('Template parse failed, using empty templates');
    }

    const industryKey = (profile.industry||'default').toLowerCase();
    const suggestedFields = INDUSTRY_FIELD_SUGGESTIONS[industryKey] || INDUSTRY_FIELD_SUGGESTIONS.default;

    res.json({ profile, email_templates: emailTemplates, suggested_fields: suggestedFields, research_date: new Date().toISOString() });
  } catch(err) { console.error('Company research error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/save', async (req, res) => {
  ensureCollection();
  const { environment_id, profile, email_templates, apply_templates } = req.body;
  if (!environment_id || !profile) return res.status(400).json({ error: 'environment_id and profile required' });
  const store = getStore(); const now = new Date().toISOString();
  const existing = store.company_profiles.find(p => p.environment_id === environment_id);
  if (existing) { Object.assign(existing, { ...profile, environment_id, updated_at: now }); }
  else { store.company_profiles.push({ id: uuidv4(), environment_id, ...profile, created_at: now, updated_at: now }); }
  if (apply_templates && email_templates?.length) {
    for (const tpl of email_templates) {
      if (!(store.email_templates||[]).find(t => t.name===tpl.name && t.environment_id===environment_id)) {
        if (!store.email_templates) store.email_templates = [];
        store.email_templates.push({ id: uuidv4(), environment_id, ...tpl, created_at: now });
      }
    }
  }
  saveStore(store);
  res.json({ success: true, profile: store.company_profiles.find(p => p.environment_id === environment_id) });
});

router.get('/', (req, res) => {
  ensureCollection();
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  res.json((store.company_profiles||[]).find(p => p.environment_id === environment_id) || null);
});

router.patch('/', (req, res) => {
  ensureCollection();
  const { environment_id, ...updates } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const profile = (store.company_profiles||[]).find(p => p.environment_id === environment_id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  Object.assign(profile, updates, { updated_at: new Date().toISOString() });
  saveStore(store); res.json(profile);
});

module.exports = router;
