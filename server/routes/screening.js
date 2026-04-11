'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, getStore, saveStore, findOne } = require('../db/init');

// ── CRUD for screening rules ──────────────────────────────────────────────────
// Rules can be attached to a specific job (record_id) or global (record_id = null)

router.get('/', (req, res) => {
  const { record_id, environment_id, include_global } = req.query;
  let rules = query('screening_rules', () => true);
  if (environment_id) rules = rules.filter(r => r.environment_id === environment_id);

  if (record_id) {
    // Return job-specific rules + global defaults if requested
    const jobRules = rules.filter(r => r.record_id === record_id);
    if (include_global === 'true') {
      const globalRules = rules.filter(r => !r.record_id && r.environment_id === (environment_id || ''));
      return res.json({ job_rules: jobRules, global_rules: globalRules });
    }
    return res.json(jobRules);
  }

  // Return all rules (for admin view)
  res.json(rules);
});

router.get('/global', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const rules = query('screening_rules', r => !r.record_id && r.environment_id === environment_id);
  res.json(rules);
});

router.post('/', (req, res) => {
  try {
    const {
      record_id,       // null for global, job record ID for per-job
      environment_id,
      field_api_key,   // the field to evaluate
      operator,        // >=, <=, =, !=, contains, is_one_of, is_not_one_of
      value,           // the threshold/expected value
      rule_type,       // knockout | required | preferred
      label,           // human-readable description
      weight = 10,     // scoring weight for preferred rules
    } = req.body;

    if (!environment_id || !field_api_key || !operator || !rule_type) {
      return res.status(400).json({ error: 'environment_id, field_api_key, operator, and rule_type required' });
    }

    const rule = {
      id: uuidv4(),
      record_id: record_id || null,
      environment_id,
      field_api_key,
      operator,
      value: value ?? '',
      rule_type,
      label: label || `${field_api_key} ${operator} ${value}`,
      weight: Number(weight) || 10,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    insert('screening_rules', rule);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const store = getStore();
    const idx = (store.screening_rules || []).findIndex(r => r.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Rule not found' });
    const allowed = ['field_api_key', 'operator', 'value', 'rule_type', 'label', 'weight', 'is_active'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) store.screening_rules[idx][k] = req.body[k];
    });
    store.screening_rules[idx].updated_at = new Date().toISOString();
    saveStore(store);
    res.json(store.screening_rules[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const store = getStore();
    const before = (store.screening_rules || []).length;
    store.screening_rules = (store.screening_rules || []).filter(r => r.id !== req.params.id);
    saveStore(store);
    res.json({ deleted: store.screening_rules.length < before });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk save rules for a job (replace all) ───────────────────────────────────

// -- Get all rules for a job (question-based format) --------------------------
router.get('/job/:record_id', (req, res) => {
  try {
    const store = getStore();
    const jobRules = (store.screening_job_rules || []).filter(r => r.record_id === req.params.record_id);
    const config = (store.screening_configs || []).find(c => c.record_id === req.params.record_id) || {};
    res.json({
      rules: jobRules,
      auto_actions: {
        auto_reject_knockout: config.auto_reject_knockouts !== false,
        flag_for_review: config.flag_for_review !== false,
        auto_advance_threshold: config.auto_advance_threshold || 70,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/job/:record_id', (req, res) => {
  try {
    const { rules, auto_actions, environment_id } = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules array required' });
    const store = getStore();
    if (!store.screening_job_rules) store.screening_job_rules = [];
    store.screening_job_rules = store.screening_job_rules.filter(r => r.record_id !== req.params.record_id);
    const now = new Date().toISOString();
    for (const rule of rules) {
      store.screening_job_rules.push({ id: uuidv4(), record_id: req.params.record_id, ...rule, created_at: now, updated_at: now });
    }
    if (auto_actions) {
      if (!store.screening_configs) store.screening_configs = [];
      const ci = store.screening_configs.findIndex(c => c.record_id === req.params.record_id);
      const cfg = { record_id: req.params.record_id, auto_reject_knockouts: !!auto_actions.auto_reject_knockout, flag_for_review: !!auto_actions.flag_for_review, auto_advance_threshold: Number(auto_actions.auto_advance_threshold)||70, updated_at: now };
      if (ci>=0) store.screening_configs[ci] = cfg; else store.screening_configs.push({ id: uuidv4(), ...cfg, created_at: now });
    }
    saveStore(store);
    return res.json({ saved: rules.length });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// -- Legacy bulk save (old field-based format) --------------------------------
router.put('/job-legacy/:record_id', (req, res) => {
  try {
    const { rules, environment_id } = req.body;
    if (!environment_id || !Array.isArray(rules)) return res.status(400).json({ error: 'environment_id and rules array required' });
    const store = getStore();
    // Remove existing job-specific rules
    store.screening_rules = (store.screening_rules || []).filter(r => r.record_id !== req.params.record_id);
    // Add new ones
    const now = new Date().toISOString();
    for (const rule of rules) {
      store.screening_rules.push({
        id: uuidv4(),
        record_id: req.params.record_id,
        environment_id,
        field_api_key: rule.field_api_key,
        operator: rule.operator,
        value: rule.value ?? '',
        rule_type: rule.rule_type || 'required',
        label: rule.label || '',
        weight: Number(rule.weight) || 10,
        is_active: rule.is_active !== false,
        created_at: now,
        updated_at: now,
      });
    }
    saveStore(store);
    res.json({ saved: rules.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Evaluate a candidate against a job's screening rules ──────────────────────
// Called when a candidate is linked to a job (manually or via portal apply)
router.post('/evaluate', (req, res) => {
  try {
    const { candidate_id, job_id, environment_id } = req.body;
    if (!candidate_id || !job_id || !environment_id) {
      return res.status(400).json({ error: 'candidate_id, job_id, and environment_id required' });
    }

    const candidate = findOne('records', r => r.id === candidate_id && !r.deleted_at);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    const candidateData = candidate.data || {};

    // Gather rules: job-specific + global
    const jobRules = query('screening_rules', r => r.record_id === job_id && r.is_active);
    const globalRules = query('screening_rules', r => !r.record_id && r.environment_id === environment_id && r.is_active);
    // Job rules override global if same field+operator combo exists
    const globalFiltered = globalRules.filter(gr =>
      !jobRules.some(jr => jr.field_api_key === gr.field_api_key && jr.operator === gr.operator)
    );
    const allRules = [...jobRules, ...globalFiltered];

    if (!allRules.length) {
      return res.json({
        candidate_id, job_id,
        screening_score: 100,
        screening_status: 'no_rules',
        knockout_passed: true,
        results: [],
        auto_action: 'none',
      });
    }

    const results = [];
    let knockoutFailed = false;
    let totalWeight = 0;
    let earnedWeight = 0;

    for (const rule of allRules) {
      const fieldValue = candidateData[rule.field_api_key];
      const passed = evaluateRule(fieldValue, rule.operator, rule.value);

      results.push({
        rule_id: rule.id,
        field_api_key: rule.field_api_key,
        label: rule.label,
        rule_type: rule.rule_type,
        operator: rule.operator,
        expected: rule.value,
        actual: fieldValue ?? null,
        passed,
        weight: rule.weight,
      });

      if (rule.rule_type === 'knockout' && !passed) knockoutFailed = true;

      // Scoring: knockout and required contribute to score
      if (rule.rule_type !== 'preferred') {
        totalWeight += rule.weight;
        if (passed) earnedWeight += rule.weight;
      } else {
        // Preferred rules add bonus points
        totalWeight += rule.weight;
        if (passed) earnedWeight += rule.weight;
      }
    }

    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

    // Determine auto action
    let autoAction = 'none';
    if (knockoutFailed) autoAction = 'reject_and_flag';
    else if (score >= 80) autoAction = 'advance'; // configurable threshold — future per-job setting

    // Store screening result on the people_link
    const store = getStore();
    const link = (store.people_links || []).find(l =>
      l.person_record_id === candidate_id && l.target_record_id === job_id && !l.deleted_at
    );
    if (link) {
      link.screening_score = score;
      link.screening_status = knockoutFailed ? 'knocked_out' : (score >= 80 ? 'passed' : 'review');
      link.knockout_passed = !knockoutFailed;
      link.screening_results = results;
      link.screened_at = new Date().toISOString();
      saveStore(store);
    }

    res.json({
      candidate_id, job_id,
      screening_score: score,
      screening_status: knockoutFailed ? 'knocked_out' : (score >= 80 ? 'passed' : 'review'),
      knockout_passed: !knockoutFailed,
      auto_action: autoAction,
      results,
      rules_evaluated: allRules.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get screening config for a job (for portal knockout display) ──────────────
router.get('/job/:record_id/knockout-questions', (req, res) => {
  const { environment_id } = req.query;
  const jobRules = query('screening_rules', r => r.record_id === req.params.record_id && r.is_active);
  const globalRules = environment_id
    ? query('screening_rules', r => !r.record_id && r.environment_id === environment_id && r.is_active)
    : [];
  const globalFiltered = globalRules.filter(gr =>
    !jobRules.some(jr => jr.field_api_key === gr.field_api_key)
  );

  // Only return knockout rules — these become questions on the portal form
  const knockouts = [...jobRules, ...globalFiltered]
    .filter(r => r.rule_type === 'knockout')
    .map(r => ({
      id: r.id,
      field_api_key: r.field_api_key,
      label: r.label,
      operator: r.operator,
      expected_value: r.value,
      // Generate a candidate-facing question from the rule
      question: generateQuestion(r),
      answer_type: getAnswerType(r),
      options: getOptions(r),
    }));

  res.json(knockouts);
});

// ── Auto-advance threshold config per job ─────────────────────────────────────
router.get('/job/:record_id/config', (req, res) => {
  const config = findOne('screening_configs', c => c.record_id === req.params.record_id);
  res.json(config || { auto_advance_threshold: 80, auto_reject_knockouts: true, flag_for_review: true });
});

router.put('/job/:record_id/config', (req, res) => {
  try {
    const { auto_advance_threshold = 80, auto_reject_knockouts = true, flag_for_review = true } = req.body;
    const store = getStore();
    if (!store.screening_configs) store.screening_configs = [];
    const idx = store.screening_configs.findIndex(c => c.record_id === req.params.record_id);
    const config = {
      record_id: req.params.record_id,
      auto_advance_threshold: Number(auto_advance_threshold),
      auto_reject_knockouts: !!auto_reject_knockouts,
      flag_for_review: !!flag_for_review,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) store.screening_configs[idx] = { ...store.screening_configs[idx], ...config };
    else store.screening_configs.push({ id: uuidv4(), ...config, created_at: new Date().toISOString() });
    saveStore(store);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: evaluate a single rule ────────────────────────────────────────────
function evaluateRule(fieldValue, operator, ruleValue) {
  // Normalise
  const fv = fieldValue;
  const rv = ruleValue;

  switch (operator) {
    case '=':
    case 'equals':
      if (typeof fv === 'boolean') return fv === (rv === 'true' || rv === true);
      return String(fv || '').toLowerCase() === String(rv).toLowerCase();

    case '!=':
    case 'not_equals':
      return String(fv || '').toLowerCase() !== String(rv).toLowerCase();

    case '>=':
    case 'gte':
      return Number(fv) >= Number(rv);

    case '<=':
    case 'lte':
      return Number(fv) <= Number(rv);

    case '>':
    case 'gt':
      return Number(fv) > Number(rv);

    case '<':
    case 'lt':
      return Number(fv) < Number(rv);

    case 'contains':
      if (Array.isArray(fv)) return fv.some(v => String(v).toLowerCase().includes(String(rv).toLowerCase()));
      return String(fv || '').toLowerCase().includes(String(rv).toLowerCase());

    case 'not_contains':
      if (Array.isArray(fv)) return !fv.some(v => String(v).toLowerCase().includes(String(rv).toLowerCase()));
      return !String(fv || '').toLowerCase().includes(String(rv).toLowerCase());

    case 'is_one_of': {
      const options = Array.isArray(rv) ? rv : String(rv).split(',').map(s => s.trim().toLowerCase());
      const actual = String(fv || '').toLowerCase();
      return options.includes(actual);
    }

    case 'is_not_one_of': {
      const options = Array.isArray(rv) ? rv : String(rv).split(',').map(s => s.trim().toLowerCase());
      const actual = String(fv || '').toLowerCase();
      return !options.includes(actual);
    }

    case 'contains_any_of': {
      const required = Array.isArray(rv) ? rv : String(rv).split(',').map(s => s.trim().toLowerCase());
      const actual = Array.isArray(fv) ? fv.map(v => String(v).toLowerCase()) : [String(fv || '').toLowerCase()];
      return required.some(r => actual.some(a => a.includes(r)));
    }

    case 'contains_all_of': {
      const required = Array.isArray(rv) ? rv : String(rv).split(',').map(s => s.trim().toLowerCase());
      const actual = Array.isArray(fv) ? fv.map(v => String(v).toLowerCase()) : [String(fv || '').toLowerCase()];
      return required.every(r => actual.some(a => a.includes(r)));
    }

    case 'is_not_empty':
      return fv !== null && fv !== undefined && fv !== '' && !(Array.isArray(fv) && fv.length === 0);

    case 'is_empty':
      return fv === null || fv === undefined || fv === '' || (Array.isArray(fv) && fv.length === 0);

    default:
      return true;
  }
}

// ── Helper: generate candidate-facing question from a rule ────────────────────
function generateQuestion(rule) {
  if (rule.label) return rule.label + '?';
  const field = rule.field_api_key.replace(/_/g, ' ');
  switch (rule.operator) {
    case '=':  return `Is your ${field} "${rule.value}"?`;
    case '>=': return `Do you have at least ${rule.value} ${field}?`;
    case '<=': return `Is your ${field} ${rule.value} or less?`;
    case 'contains': return `Does your experience include ${rule.value}?`;
    case 'is_one_of': return `Is your ${field} one of: ${Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}?`;
    case 'is_not_empty': return `Do you have a ${field}?`;
    default: return `${field}: ${rule.operator} ${rule.value}?`;
  }
}

function getAnswerType(rule) {
  if (rule.operator === '=' && ['true','false','yes','no'].includes(String(rule.value).toLowerCase())) return 'yes_no';
  if (rule.operator === '>=' || rule.operator === '<=' || rule.operator === '>' || rule.operator === '<') return 'number';
  if (rule.operator === 'is_one_of') return 'select';
  return 'yes_no'; // default for knockout
}

function getOptions(rule) {
  if (rule.operator === 'is_one_of') {
    return Array.isArray(rule.value) ? rule.value : String(rule.value).split(',').map(s => s.trim());
  }
  return ['Yes', 'No'];
}

// ── Screening responses (submitted by candidates via portal) ──────────────────
router.get('/responses/record/:record_id', (req, res) => {
  const store = getStore();
  const responses = (store.screening_responses||[])
    .filter(r => r.record_id === req.params.record_id)
    .sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  res.json(responses);
});

router.get('/responses/job/:job_id', (req, res) => {
  const store = getStore();
  const responses = (store.screening_responses||[])
    .filter(r => r.job_id === req.params.job_id)
    .sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  res.json(responses);
});

module.exports = router;
