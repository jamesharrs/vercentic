// server/routes/datasets.js
// Global Data Sets — reusable option lists for select/multi-select fields
// A Data Set is a named list of options that can be linked to any field.

const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function ts() { return new Date().toISOString(); }

// ── Ensure tables exist ──────────────────────────────────────────────────────
function migrateDatasets() {
  const store = getStore();
  let changed = false;
  if (!store.datasets)         { store.datasets = [];        changed = true; }
  if (!store.dataset_options)  { store.dataset_options = []; changed = true; }
  if (changed) saveStore();
}

// Seed built-in datasets on first boot
function seedBuiltinDatasets(environment_id) {
  const existing = query('datasets', d => d.environment_id === environment_id);
  if (existing.length > 0) return;

  const BUILTIN = [
    {
      name: 'Employment Type', slug: 'employment_type', description: 'Full-time, part-time, contract etc.',
      options: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Freelance', 'Internship', 'Volunteer'],
    },
    {
      name: 'Work Arrangement', slug: 'work_arrangement', description: 'On-site, remote or hybrid',
      options: ['On-site', 'Hybrid', 'Remote', 'Flexible'],
    },
    {
      name: 'Candidate Status', slug: 'candidate_status', description: 'Stage of the candidate in the process',
      options: ['New', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected', 'Withdrawn'],
    },
    {
      name: 'Job Status', slug: 'job_status', description: 'Current state of a job requisition',
      options: ['Draft', 'Open', 'On Hold', 'Interviewing', 'Offer Extended', 'Filled', 'Cancelled'],
    },
    {
      name: 'Source / Channel', slug: 'source_channel', description: 'How the candidate was sourced',
      options: ['LinkedIn', 'Job Board', 'Referral', 'Agency', 'Career Site', 'Event', 'Direct Application', 'Social Media', 'Other'],
    },
    {
      name: 'Priority', slug: 'priority', description: 'Urgency or priority level',
      options: ['Low', 'Medium', 'High', 'Critical'],
    },
    {
      name: 'Notice Period', slug: 'notice_period', description: 'Time before candidate can start',
      options: ['Immediate', '1 week', '2 weeks', '1 month', '2 months', '3 months', '3+ months'],
    },
    {
      name: 'Currency', slug: 'currency', description: 'Currency codes',
      options: ['AED', 'USD', 'GBP', 'EUR', 'SAR', 'QAR', 'KWD', 'BHD', 'INR', 'SGD', 'AUD', 'CAD'],
    },
    {
      name: 'Gender', slug: 'gender', description: 'Gender identity options',
      options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    },
    {
      name: 'Nationality (MENA)', slug: 'nationality_mena', description: 'Common nationalities in MENA region',
      options: ['Emirati', 'Saudi', 'Kuwaiti', 'Qatari', 'Bahraini', 'Omani', 'Egyptian', 'Lebanese', 'Jordanian', 'Syrian', 'Iraqi', 'Yemeni', 'Moroccan', 'Tunisian', 'Algerian', 'Libyan', 'Palestinian', 'Other Arab', 'Indian', 'Pakistani', 'Bangladeshi', 'Filipino', 'British', 'American', 'Other'],
    },
    {
      name: 'Industry', slug: 'industry', description: 'Business industry / sector',
      options: ['Technology', 'Financial Services', 'Healthcare', 'Retail & E-commerce', 'Real Estate', 'Energy', 'Government & Public Sector', 'Education', 'Media & Entertainment', 'Hospitality & Tourism', 'Construction', 'Manufacturing', 'Logistics & Supply Chain', 'Consulting', 'Legal', 'Non-profit', 'Other'],
    },
    {
      name: 'Company Size', slug: 'company_size', description: 'Headcount bands',
      options: ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,001–5,000', '5,000+'],
    },
    {
      name: 'Offer Status', slug: 'offer_status', description: 'State of an offer',
      options: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Accepted', 'Declined', 'Expired', 'Withdrawn'],
    },
    {
      name: 'Interview Format', slug: 'interview_format', description: 'Mode of interview',
      options: ['Phone', 'Video', 'On-site', 'Panel', 'Technical', 'Assessment Centre', 'Casual / Coffee'],
    },
    {
      name: 'Rating', slug: 'rating', description: 'General 1-5 rating scale',
      options: ['1 – Poor', '2 – Below Average', '3 – Average', '4 – Good', '5 – Excellent'],
    },
    {
      name: 'Visa / Right to Work', slug: 'visa_rtw', description: 'Work authorisation status',
      options: ['Citizen', 'Permanent Resident', 'Work Visa', 'Student Visa', 'Requires Sponsorship', 'Other'],
    },
  ];

  BUILTIN.forEach(ds => {
    const dsId = uuidv4();
    insert('datasets', {
      id: dsId, name: ds.name, slug: ds.slug, description: ds.description,
      is_system: true, environment_id, created_at: ts(), updated_at: ts(),
    });
    ds.options.forEach((label, i) => {
      insert('dataset_options', {
        id: uuidv4(), dataset_id: dsId, label, value: label,
        color: null, sort_order: i, is_active: true,
        environment_id, created_at: ts(), updated_at: ts(),
      });
    });
  });
}

// ── GET /api/datasets ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  try {
    seedBuiltinDatasets(environment_id);
    const datasets = query('datasets', d => d.environment_id === environment_id && !d.deleted_at);
    const options  = query('dataset_options', o => o.environment_id === environment_id && o.is_active !== false);
    const result = datasets
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => ({
        ...d,
        options: options.filter(o => o.dataset_id === d.id).sort((a, b) => a.sort_order - b.sort_order),
      }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/datasets/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const ds = query('datasets', d => d.id === req.params.id)[0];
    if (!ds) return res.status(404).json({ error: 'Not found' });
    const options = query('dataset_options', o => o.dataset_id === ds.id && o.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order);
    res.json({ ...ds, options });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/datasets ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, description, options = [], environment_id } = req.body;
  if (!name || !environment_id) return res.status(400).json({ error: 'name, environment_id required' });
  try {
    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const ds = insert('datasets', {
      id: uuidv4(), name, slug, description: description || null,
      is_system: false, environment_id, created_at: ts(), updated_at: ts(),
    });
    options.forEach((label, i) => {
      insert('dataset_options', {
        id: uuidv4(), dataset_id: ds.id, label, value: label,
        color: null, sort_order: i, is_active: true,
        environment_id, created_at: ts(), updated_at: ts(),
      });
    });
    res.json({ ...ds, options: query('dataset_options', o => o.dataset_id === ds.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/datasets/:id ──────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const ds = update('datasets', req.params.id, { ...req.body, updated_at: ts() });
    if (!ds) return res.status(404).json({ error: 'Not found' });
    res.json(ds);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/datasets/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const ds = query('datasets', d => d.id === req.params.id)[0];
    if (!ds) return res.status(404).json({ error: 'Not found' });
    if (ds.is_system) return res.status(403).json({ error: 'Cannot delete system datasets' });
    update('datasets', req.params.id, { deleted_at: ts() });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/datasets/:id/options — replace all options ──────────────────────
router.put('/:id/options', (req, res) => {
  const { options = [] } = req.body;
  try {
    // Soft-delete old options
    const old = query('dataset_options', o => o.dataset_id === req.params.id);
    old.forEach(o => update('dataset_options', o.id, { is_active: false, updated_at: ts() }));
    // Insert new
    const inserted = options.map((opt, i) => {
      const label = typeof opt === 'string' ? opt : opt.label;
      const color = typeof opt === 'object' ? opt.color : null;
      return insert('dataset_options', {
        id: uuidv4(), dataset_id: req.params.id,
        label, value: label, color: color || null,
        sort_order: i, is_active: true,
        environment_id: query('datasets', d => d.id === req.params.id)[0]?.environment_id,
        created_at: ts(), updated_at: ts(),
      });
    });
    update('datasets', req.params.id, { updated_at: ts() });
    res.json(inserted);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/datasets/:id/options/:optId ───────────────────────────────────
router.patch('/:id/options/:optId', (req, res) => {
  try {
    const opt = update('dataset_options', req.params.optId, { ...req.body, updated_at: ts() });
    if (!opt) return res.status(404).json({ error: 'Option not found' });
    res.json(opt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/datasets/:id/options ───────────────────────────────────────────
router.post('/:id/options', (req, res) => {
  const { label, color } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  try {
    const existing = query('dataset_options', o => o.dataset_id === req.params.id && o.is_active !== false);
    const ds = query('datasets', d => d.id === req.params.id)[0];
    const opt = insert('dataset_options', {
      id: uuidv4(), dataset_id: req.params.id,
      label, value: label, color: color || null,
      sort_order: existing.length, is_active: true,
      environment_id: ds?.environment_id,
      created_at: ts(), updated_at: ts(),
    });
    res.json(opt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/datasets/:id/options/:optId ───────────────────────────────────
router.delete('/:id/options/:optId', (req, res) => {
  try {
    update('dataset_options', req.params.optId, { is_active: false, updated_at: ts() });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.migrate = migrateDatasets;
