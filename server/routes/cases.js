const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ── SLA config (hours to first response / resolution) ─────────────────────
const SLA = {
  critical: { response: 1,  resolve: 8   },
  high:     { response: 4,  resolve: 24  },
  medium:   { response: 8,  resolve: 72  },
  low:      { response: 24, resolve: 168 },
};

const PLAN_MULT = { enterprise: 0.5, growth: 0.75, starter: 1, trial: 1.5 };

function computeSLA(priority, planTier) {
  const base = SLA[priority] || SLA.medium;
  const mult = PLAN_MULT[planTier] || 1;
  return {
    response_hours: Math.round(base.response * mult),
    resolve_hours:  Math.round(base.resolve  * mult),
  };
}

function slaStatus(case_) {
  if (!case_.created_at) return 'ok';
  const now     = Date.now();
  const created = new Date(case_.created_at).getTime();
  const elapsed = (now - created) / 3600000;
  const { resolve_hours } = computeSLA(case_.priority || 'medium', case_.plan_tier || 'starter');
  if (['resolved','closed'].includes(case_.status)) return 'met';
  if (elapsed > resolve_hours)       return 'breached';
  if (elapsed > resolve_hours * 0.8) return 'at_risk';
  return 'ok';
}

// ── GET /api/cases/stats ───────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const cases       = query('cases', () => true);
    const total       = cases.length;
    const open        = cases.filter(c => c.status === 'open').length;
    const in_progress = cases.filter(c => c.status === 'in_progress').length;
    const awaiting    = cases.filter(c => c.status === 'awaiting_client').length;
    const resolved    = cases.filter(c => ['resolved','closed'].includes(c.status)).length;
    const breached    = cases.filter(c => slaStatus(c) === 'breached').length;
    const at_risk     = cases.filter(c => slaStatus(c) === 'at_risk').length;
    const by_type = {};
    const by_priority = {};
    cases.forEach(c => {
      by_type[c.type||'other']         = (by_type[c.type||'other']||0) + 1;
      by_priority[c.priority||'medium'] = (by_priority[c.priority||'medium']||0) + 1;
    });
    res.json({ total, open, in_progress, awaiting, resolved, breached, at_risk, by_type, by_priority });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/cases ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { status, priority, type, assignee_id, client_id, client_domain, search, page = 1, limit = 50 } = req.query;
    let cases = query('cases', () => true);
    if (status)      cases = cases.filter(c => c.status === status);
    if (priority)    cases = cases.filter(c => c.priority === priority);
    if (type)        cases = cases.filter(c => c.type === type);
    if (assignee_id) cases = cases.filter(c => c.assignee_id === assignee_id);
    if (client_id)     cases = cases.filter(c => c.client_id === client_id);
    if (client_domain) cases = cases.filter(c =>
      c.client_domain === client_domain ||
      c.reporter_email?.endsWith('@' + client_domain)
    );
    if (search) {
      const q = search.toLowerCase();
      cases = cases.filter(c =>
        c.subject?.toLowerCase().includes(q) ||
        c.case_number?.toLowerCase().includes(q) ||
        c.client_name?.toLowerCase().includes(q)
      );
    }
    cases = cases.map(c => ({ ...c, sla_status: slaStatus(c) }));
    cases.sort((a, b) => {
      const pOrder = { critical:0, high:1, medium:2, low:3 };
      if (a.status !== 'closed' && b.status === 'closed') return -1;
      if (a.status === 'closed' && b.status !== 'closed') return  1;
      const pd = (pOrder[a.priority]||2) - (pOrder[b.priority]||2);
      if (pd !== 0) return pd;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    const total  = cases.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paged  = cases.slice(offset, offset + parseInt(limit));
    res.json({ cases: paged, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/cases/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const cases = query('cases', c => c.id === req.params.id);
    const c     = cases[0];
    if (!c) return res.status(404).json({ error: 'Not found' });
    const threads = query('case_threads', t => t.case_id === req.params.id);
    threads.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ ...c, sla_status: slaStatus(c), threads });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/cases ────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { subject, type, priority, description, client_id, client_name, client_domain, plan_tier,
            reporter_name, reporter_email, assignee_id, assignee_name, tags } = req.body;
    if (!subject || !type) return res.status(400).json({ error: 'subject and type required' });
    const existing   = query('cases', () => true);
    const lastNum    = existing.reduce((max, c) => {
      const n = parseInt((c.case_number||'').replace('CASE-','')) || 0;
      return Math.max(max, n);
    }, 0);
    const case_number = `CASE-${String(lastNum + 1).padStart(4,'0')}`;
    const sla = computeSLA(priority || 'medium', plan_tier || 'starter');
    const now = new Date().toISOString();
    const case_ = insert('cases', {
      case_number, subject, type, priority: priority||'medium',
      status: 'open', description, client_id, client_name,
      plan_tier: plan_tier||'starter', reporter_name, reporter_email,
      assignee_id, assignee_name, tags: tags||[],
      response_due: new Date(Date.now() + sla.response_hours * 3600000).toISOString(),
      resolve_due:  new Date(Date.now() + sla.resolve_hours  * 3600000).toISOString(),
      response_hours: sla.response_hours, resolve_hours: sla.resolve_hours,
      first_response_at: null, resolved_at: null, created_at: now, updated_at: now,
    });
    if (description) {
      insert('case_threads', {
        case_id: case_.id, type: 'note', visibility: 'internal',
        body: description, author_name: reporter_name || 'System',
        author_email: reporter_email, created_at: now,
      });
    }
    res.status(201).json({ ...case_, sla_status: 'ok', threads: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/cases/:id ───────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const store = getStore();
    const cases = store.cases || [];
    const idx   = cases.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const prev    = cases[idx];
    const updated = { ...prev, ...req.body, id: prev.id, updated_at: new Date().toISOString() };
    if (!prev.first_response_at && req.body.status && req.body.status !== 'open') {
      updated.first_response_at = new Date().toISOString();
    }
    if (!prev.resolved_at && ['resolved','closed'].includes(req.body.status)) {
      updated.resolved_at = new Date().toISOString();
    }
    cases[idx]  = updated;
    store.cases = cases;
    saveStore(store);
    res.json({ ...updated, sla_status: slaStatus(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/cases/:id ──────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    remove('cases', c => c.id === req.params.id);
    remove('case_threads', t => t.case_id === req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/cases/:id/thread ─────────────────────────────────────────────
router.post('/:id/thread', (req, res) => {
  try {
    const { body, visibility = 'internal', author_name, author_email, type = 'comment' } = req.body;
    if (!body) return res.status(400).json({ error: 'body required' });
    const thread = insert('case_threads', {
      case_id: req.params.id, type, visibility, body,
      author_name, author_email, created_at: new Date().toISOString(),
    });
    const store = getStore();
    const cases = store.cases || [];
    const idx   = cases.findIndex(c => c.id === req.params.id);
    if (idx !== -1) {
      cases[idx].updated_at = new Date().toISOString();
      if (!cases[idx].first_response_at && visibility === 'client') {
        cases[idx].first_response_at = new Date().toISOString();
      }
      store.cases = cases;
      saveStore(store);
    }
    res.status(201).json(thread);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/cases/:id/status ────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  try {
    const { status, reason } = req.body;
    const valid = ['open','in_progress','awaiting_client','resolved','closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'invalid status' });
    const store = getStore();
    const cases = store.cases || [];
    const idx   = cases.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    cases[idx].status     = status;
    cases[idx].updated_at = new Date().toISOString();
    if (['resolved','closed'].includes(status) && !cases[idx].resolved_at) {
      cases[idx].resolved_at = new Date().toISOString();
    }
    store.cases = cases;
    saveStore(store);
    if (reason) {
      insert('case_threads', {
        case_id: req.params.id, type: 'status_change', visibility: 'internal',
        body: `Status changed to ${status}${reason ? ': ' + reason : ''}`,
        author_name: 'System', created_at: new Date().toISOString(),
      });
    }
    res.json({ ...cases[idx], sla_status: slaStatus(cases[idx]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/cases/:id/assign ─────────────────────────────────────────────
router.post('/:id/assign', (req, res) => {
  try {
    const { assignee_id, assignee_name } = req.body;
    const store = getStore();
    const cases = store.cases || [];
    const idx   = cases.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    cases[idx].assignee_id   = assignee_id;
    cases[idx].assignee_name = assignee_name;
    cases[idx].updated_at    = new Date().toISOString();
    if (cases[idx].status === 'open') cases[idx].status = 'in_progress';
    store.cases = cases;
    saveStore(store);
    res.json(cases[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
