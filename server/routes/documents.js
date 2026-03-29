// server/routes/documents.js — Document Builder (templates + generation)
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');

const now = () => new Date().toISOString();

const BUILT_IN_TEMPLATES = [
  { slug:'offer_letter', name:'Offer Letter', category:'Recruitment', icon:'📋',
    description:'Standard employment offer letter with compensation details',
    variables:[
      {key:'candidate_name',  label:'Candidate Full Name', type:'text',   required:true},
      {key:'job_title',       label:'Job Title',           type:'text',   required:true},
      {key:'department',      label:'Department',          type:'text',   required:false},
      {key:'salary',          label:'Annual Salary',       type:'number', required:true},
      {key:'currency',        label:'Currency',            type:'select', required:true,  options:['AED','USD','GBP','EUR','SAR']},
      {key:'start_date',      label:'Start Date',          type:'date',   required:true},
      {key:'manager_name',    label:'Hiring Manager Name', type:'text',   required:false},
      {key:'company_name',    label:'Company Name',        type:'text',   required:true},
      {key:'office_location', label:'Office Location',     type:'text',   required:false},
      {key:'probation_months',label:'Probation (months)',  type:'number', required:false},
      {key:'expiry_date',     label:'Offer Expiry Date',   type:'date',   required:false},
    ],
    body:`Dear {{candidate_name}},

We are delighted to offer you the position of **{{job_title}}** at **{{company_name}}**.

**Position Details:**
- Job Title: {{job_title}}{{#if department}}
- Department: {{department}}{{/if}}
- Start Date: {{start_date}}
- Location: {{office_location}}
- Annual Salary: {{currency}} {{salary}}
{{#if probation_months}}
This offer is subject to a {{probation_months}}-month probationary period.
{{/if}}
This offer is valid until {{expiry_date}}.

We look forward to welcoming you to the team.

Warm regards,

{{manager_name}}
{{company_name}}`},
  { slug:'interview_invite', name:'Interview Invitation', category:'Recruitment', icon:'📅',
    description:'Invite a candidate to an interview',
    variables:[
      {key:'candidate_name',   label:'Candidate Name',       type:'text',   required:true},
      {key:'job_title',        label:'Role',                 type:'text',   required:true},
      {key:'interview_date',   label:'Interview Date',       type:'date',   required:true},
      {key:'interview_time',   label:'Interview Time',       type:'text',   required:true},
      {key:'interview_format', label:'Format',               type:'select', required:true, options:['Video call','Phone','In-person']},
      {key:'location_or_link', label:'Location / Video Link',type:'text',   required:false},
      {key:'interviewer_name', label:'Interviewer Name',     type:'text',   required:false},
      {key:'duration_mins',    label:'Duration (minutes)',   type:'number', required:false},
      {key:'company_name',     label:'Company Name',         type:'text',   required:true},
    ],
    body:`Dear {{candidate_name}},

We are pleased to invite you for an interview for the **{{job_title}}** position at **{{company_name}}**.

**Interview Details:**
- Date: {{interview_date}}
- Time: {{interview_time}}
- Format: {{interview_format}}
- Location / Link: {{location_or_link}}
{{#if duration_mins}}- Duration: Approximately {{duration_mins}} minutes{{/if}}
{{#if interviewer_name}}- You will be meeting with: {{interviewer_name}}{{/if}}

Please confirm your availability by replying to this message.

Kind regards,
{{company_name}}`},
  { slug:'rejection_letter', name:'Rejection Letter', category:'Recruitment', icon:'📩',
    description:'Professional candidate rejection letter',
    variables:[
      {key:'candidate_name', label:'Candidate Name',    type:'text',    required:true},
      {key:'job_title',      label:'Role Applied For',  type:'text',    required:true},
      {key:'company_name',   label:'Company Name',      type:'text',    required:true},
      {key:'recruiter_name', label:'Recruiter Name',    type:'text',    required:false},
      {key:'talent_pool',    label:'Keep in Talent Pool',type:'boolean',required:false},
    ],
    body:`Dear {{candidate_name}},

Thank you for applying for the **{{job_title}}** position at **{{company_name}}** and for the opportunity to learn more about your background.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

{{#if talent_pool}}We were impressed by your profile and would like to keep your details on file for future opportunities. We will be in touch should a suitable role arise.{{/if}}

We wish you every success in your search.

Kind regards,

{{recruiter_name}}
{{company_name}}`},
  { slug:'nda', name:'Non-Disclosure Agreement', category:'Legal', icon:'🔒',
    description:'Standard NDA for candidates and employees',
    variables:[
      {key:'party_name',     label:'Party Name',         type:'text',   required:true},
      {key:'company_name',   label:'Company Name',       type:'text',   required:true},
      {key:'effective_date', label:'Effective Date',     type:'date',   required:true},
      {key:'duration_years', label:'Duration (years)',   type:'number', required:true},
      {key:'jurisdiction',   label:'Governing Jurisdiction',type:'text',required:false},
    ],
    body:`NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of **{{effective_date}}** between **{{company_name}}** ("Company") and **{{party_name}}** ("Recipient").

**1. Confidential Information**
Recipient agrees to keep strictly confidential all proprietary information, trade secrets, and non-public information disclosed by Company.

**2. Duration**
This obligation shall remain in effect for {{duration_years}} years from the Effective Date.

**3. Governing Law**
This Agreement shall be governed by the laws of {{jurisdiction}}.

---
Signature: _________________ Date: _________________
{{party_name}}

Signature: _________________ Date: _________________
{{company_name}}`},
  { slug:'reference_request', name:'Reference Request', category:'Recruitment', icon:'👥',
    description:'Request a professional reference for a candidate',
    variables:[
      {key:'referee_name',   label:'Referee Name',       type:'text', required:true},
      {key:'candidate_name', label:'Candidate Name',     type:'text', required:true},
      {key:'job_title',      label:'Role Being Offered', type:'text', required:true},
      {key:'company_name',   label:'Your Company',       type:'text', required:true},
      {key:'deadline_date',  label:'Response Deadline',  type:'date', required:false},
    ],
    body:`Dear {{referee_name}},

I am writing to request a professional reference for **{{candidate_name}}**, who has applied for the position of **{{job_title}}** at {{company_name}}.

{{candidate_name}} has provided your contact details as a professional referee and we would greatly value your perspective on their work and character.

{{#if deadline_date}}We would appreciate your response by **{{deadline_date}}**.{{/if}}

All information will be treated in confidence.

Many thanks,
{{company_name}}`},
];

function renderTemplate(body, variables) {
  let r = body;
  Object.entries(variables).forEach(([k, v]) => {
    if (v != null) r = r.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  });
  r = r.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
    const v = variables[key];
    return (v && v !== 'false' && v !== false) ? content : '';
  });
  return r.replace(/\{\{[^}]+\}\}/g, '').trim();
}

function seedTemplates(environmentId) {
  const s = getStore();
  if (!s.document_templates) s.document_templates = [];
  if (!s.generated_documents) s.generated_documents = [];
  const existing = s.document_templates.filter(t => t.environment_id === environmentId);
  if (existing.length) return;
  BUILT_IN_TEMPLATES.forEach(t => {
    insert('document_templates', {
      id: uuidv4(), environment_id: environmentId, ...t,
      is_system: true, active: true, created_at: now(), updated_at: now(),
    });
  });
  saveStore();
}

// ─── GET /documents/templates ─────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  const { environment_id, category } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  seedTemplates(environment_id);
  let t = query('document_templates', t => t.environment_id === environment_id && !t.deleted_at);
  if (category) t = t.filter(x => x.category === category);
  res.json(t);
});

router.get('/templates/:id', (req, res) => {
  const t = findOne('document_templates', t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

router.post('/templates', express.json(), (req, res) => {
  const { environment_id, name, description, icon, category, body, variables = [] } = req.body;
  if (!environment_id || !name || !body)
    return res.status(400).json({ error: 'environment_id, name, body required' });
  const t = insert('document_templates', {
    id: uuidv4(), environment_id, name, description: description || null,
    icon: icon || '📄', category: category || 'General', body, variables,
    is_system: false, active: true, slug: null, created_at: now(), updated_at: now(),
  });
  saveStore();
  res.status(201).json(t);
});

router.patch('/templates/:id', express.json(), (req, res) => {
  const allowed = ['name','description','icon','category','body','variables','active'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = update('document_templates', t => t.id === req.params.id, { ...patch, updated_at: now() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  saveStore();
  res.json(updated);
});

router.delete('/templates/:id', (req, res) => {
  update('document_templates', t => t.id === req.params.id, { deleted_at: now() });
  saveStore();
  res.json({ ok: true });
});

// ─── POST /documents/templates/:id/preview ────────────────────────────────────
router.post('/templates/:id/preview', express.json(), (req, res) => {
  const t = findOne('document_templates', t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ rendered: renderTemplate(t.body, req.body.variables || {}) });
});

// ─── POST /documents/templates/:id/auto-fill ─────────────────────────────────
router.post('/templates/:id/auto-fill', express.json(), (req, res) => {
  const t = findOne('document_templates', t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const record = req.body.record_id ? findOne('records', r => r.id === req.body.record_id) : null;
  const data = record?.data || {};
  const FIELD_MAP = {
    candidate_name:   d => [d.first_name, d.last_name].filter(Boolean).join(' '),
    job_title:        d => d.job_title || d.current_title || d.title,
    salary:           d => d.salary || d.base_salary,
    start_date:       d => d.start_date,
    department:       d => d.department,
    office_location:  d => d.location || d.office_location,
    company_name:     d => d.company || d.entity,
  };
  const autoFilled = {};
  (t.variables || []).forEach(v => {
    const fn = FIELD_MAP[v.key];
    const val = fn ? fn(data) : data[v.key];
    if (val) autoFilled[v.key] = val;
  });
  res.json({ variables: autoFilled, filled_count: Object.keys(autoFilled).length });
});

// ─── POST /documents/generate ─────────────────────────────────────────────────
router.post('/generate', express.json(), (req, res) => {
  const { template_id, record_id, variables = {}, format = 'html', title, created_by } = req.body;
  if (!template_id) return res.status(400).json({ error: 'template_id required' });
  const t = findOne('document_templates', t => t.id === template_id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const rendered = renderTemplate(t.body, variables);
  const doc = insert('generated_documents', {
    id: uuidv4(), template_id, template_name: t.name,
    record_id: record_id || null,
    title: title || `${t.name} — ${now().slice(0,10)}`,
    format, variables_used: variables, rendered_body: rendered,
    status: 'draft', created_by: created_by || null,
    created_at: now(), updated_at: now(),
  });
  saveStore();
  res.status(201).json(doc);
});

// ─── GET /documents/generated ─────────────────────────────────────────────────
router.get('/generated', (req, res) => {
  const { record_id, limit = 50 } = req.query;
  let docs = query('generated_documents', d => !d.deleted_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (record_id) docs = docs.filter(d => d.record_id === record_id);
  res.json(docs.slice(0, Number(limit)));
});

router.get('/generated/:id', (req, res) => {
  const doc = findOne('generated_documents', d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.patch('/generated/:id', express.json(), (req, res) => {
  const allowed = ['title','rendered_body','status'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = update('generated_documents', d => d.id === req.params.id, { ...patch, updated_at: now() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  saveStore();
  res.json(updated);
});

router.delete('/generated/:id', (req, res) => {
  update('generated_documents', d => d.id === req.params.id, { deleted_at: now() });
  saveStore();
  res.json({ ok: true });
});

// ─── POST /documents/ai-generate — AI-enhanced document body ──────────────────
router.post('/ai-generate', express.json(), async (req, res) => {
  const { template_id, record_id, variables = {}, instruction = '' } = req.body;
  const t = template_id ? findOne('document_templates', t => t.id === template_id) : null;
  const record = record_id ? findOne('records', r => r.id === record_id) : null;
  const prompt = `Generate a professional document.
${t ? `Document type: ${t.name}\nTemplate:\n${t.body}` : ''}
${record ? `Record data: ${JSON.stringify(record.data || {}, null, 2)}` : ''}
Variables provided: ${JSON.stringify(variables, null, 2)}
${instruction ? `Instruction: ${instruction}` : ''}
Generate the complete polished document. Use **bold** for emphasis, # for headers.`;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ body: r.content[0]?.text?.trim() || '',
               tokens_used: (r.usage?.input_tokens||0) + (r.usage?.output_tokens||0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
