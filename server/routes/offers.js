const { hasGlobalAction: _hasGA } = require('../middleware/rbac');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) return null;
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');

function ensure() {
  const s = getStore();
  if (!s.offers) { s.offers = []; saveStore(); }
}

function advanceApproval(offer) {
  const chain = offer.approval_chain || [];
  const nextIdx = chain.findIndex(a => a.status === 'pending');
  if (nextIdx === -1) {
    return { ...offer, status: 'approved', current_approver_index: null, updated_at: new Date().toISOString() };
  }
  return { ...offer, current_approver_index: nextIdx, updated_at: new Date().toISOString() };
}

// GET / — List offers
router.get('/', (req, res) => {
  ensure();
  const { environment_id, candidate_id, job_id, status } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rows = query('offers', o => o.environment_id === environment_id && !o.deleted_at);
  if (candidate_id) rows = rows.filter(o => o.candidate_id === candidate_id);
  if (job_id)       rows = rows.filter(o => o.job_id === job_id);
  if (status) rows = rows.filter(o => o.status === status);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

// GET /:id — Single offer
router.get('/:id', (req, res) => {
  ensure();
  const offer = query('offers', o => o.id === req.params.id && !o.deleted_at)[0];
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  res.json(offer);
});

// POST / — Create offer
router.post('/', (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  const {
    environment_id, candidate_id, candidate_name,
    job_id, job_name, job_department,
    base_salary, currency, bonus, bonus_type,
    start_date, expiry_date,
    approval_chain,
    notes, terms, custom_fields,
    created_by,
  } = req.body;

  if (!environment_id || !candidate_id)
    return res.status(400).json({ error: 'environment_id and candidate_id required' });

  const now = new Date().toISOString();

  const chain = (approval_chain || []).map((a, i) => ({
    index:  i,
    name:   a.name  || '',
    email:  a.email || '',
    role:   a.role  || '',
    status: 'pending',
    decided_at: null,
    comment: '',
  }));

  const rec = insert('offers', {
    id:               uuidv4(),
    environment_id,
    candidate_id,
    candidate_name:   candidate_name || '',
    job_id:           job_id         || null,
    job_name:         job_name        || '',
    job_department:   job_department  || '',
    base_salary:      base_salary     || null,
    currency:         currency        || 'USD',
    bonus:            bonus           || null,
    bonus_type:       bonus_type      || 'fixed',
    start_date:       start_date      || null,
    expiry_date:      expiry_date     || null,
    status:           chain.length ? 'pending_approval' : 'draft',
    approval_chain:   chain,
    current_approver_index: chain.length ? 0 : null,
    notes:            notes           || '',
    terms:            terms           || '',
    custom_fields:    custom_fields   || {},
    created_by:       created_by      || 'system',
    sent_at:          null,
    accepted_at:      null,
    declined_at:      null,
    withdrawn_at:     null,
    decline_reason:   '',
    activity_log: [{
      id:        uuidv4(),
      type:      'created',
      message:   `Offer created by ${created_by || 'system'}`,
      user:      created_by || 'system',
      timestamp: now,
    }],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  res.status(201).json(rec);
});

// PATCH /:id — Update offer fields
router.patch('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  const allowed = [
    'candidate_name','job_id','job_name','job_department',
    'base_salary','currency','bonus','bonus_type',
    'start_date','expiry_date','notes','terms','custom_fields','approval_chain',
  ];
  const updates = { updated_at: new Date().toISOString() };
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const rec = update('offers', o => o.id === req.params.id, updates);
  if (!rec) return res.status(404).json({ error: 'Offer not found' });
  res.json(rec);
});

// PATCH /:id/status — Status transitions
router.patch('/:id/status', (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  const { status, reason, user } = req.body;
  const now = new Date().toISOString();
  const offer = query('offers', o => o.id === req.params.id && !o.deleted_at)[0];
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  const VALID_TRANSITIONS = {
    draft:            ['pending_approval', 'withdrawn'],
    pending_approval: ['draft', 'withdrawn'],
    approved:         ['sent', 'withdrawn'],
    sent:             ['accepted', 'declined', 'expired', 'withdrawn'],
    accepted:         [],
    declined:         ['draft'],
    expired:          ['draft'],
    withdrawn:        [],
  };

  if (!VALID_TRANSITIONS[offer.status]?.includes(status))
    return res.status(400).json({ error: `Cannot transition from '${offer.status}' to '${status}'` });

  const logEntry = {
    id: uuidv4(), type: 'status_change',
    message: `Status changed to '${status}'${reason ? `: ${reason}` : ''}`,
    user: user || 'system', timestamp: now,
  };

  const updates = {
    status, updated_at: now,
    activity_log: [...(offer.activity_log || []), logEntry],
  };

  if (status === 'sent')      updates.sent_at      = now;
  if (status === 'accepted')  updates.accepted_at  = now;
  if (status === 'declined')  { updates.declined_at = now; updates.decline_reason = reason || ''; }
  if (status === 'withdrawn') updates.withdrawn_at  = now;
  if (status === 'draft') {
    updates.approval_chain = (offer.approval_chain || []).map(a => ({ ...a, status: 'pending', decided_at: null, comment: '' }));
    updates.current_approver_index = (updates.approval_chain.length) ? 0 : null;
  }

  const rec = update('offers', o => o.id === req.params.id, updates);
  res.json(rec);
});

// PATCH /:id/approve — Approver decision
router.patch('/:id/approve', (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  const { decision, comment, approver_email, user } = req.body;
  if (!['approved', 'rejected'].includes(decision))
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });

  const offer = query('offers', o => o.id === req.params.id && !o.deleted_at)[0];
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.status !== 'pending_approval')
    return res.status(400).json({ error: 'Offer is not pending approval' });

  const now    = new Date().toISOString();
  const chain  = [...(offer.approval_chain || [])];
  const curIdx = offer.current_approver_index ?? 0;
  const approver = chain[curIdx];
  if (!approver) return res.status(400).json({ error: 'No current approver found' });

  chain[curIdx] = { ...approver, status: decision, decided_at: now, comment: comment || '' };

  const logEntry = {
    id: uuidv4(),
    type: decision === 'approved' ? 'approved' : 'rejected',
    message: `${approver.name || approver_email || 'Approver'} ${decision} the offer${comment ? `: "${comment}"` : ''}`,
    user: user || approver.name || 'approver',
    timestamp: now,
  };

  let updates = {
    approval_chain: chain,
    updated_at:     now,
    activity_log:   [...(offer.activity_log || []), logEntry],
  };

  if (decision === 'rejected') {
    updates.status = 'draft';
    updates.current_approver_index = null;
    updates.approval_chain = chain.map(a => ({ ...a, status: 'pending', decided_at: null, comment: '' }));
  } else {
    const nextPendingIdx = chain.findIndex((a, i) => i > curIdx && a.status === 'pending');
    if (nextPendingIdx === -1) {
      updates.status = 'approved';
      updates.current_approver_index = null;
    } else {
      updates.current_approver_index = nextPendingIdx;
    }
  }

  const rec = update('offers', o => o.id === req.params.id, updates);
  res.json(rec);
});

// DELETE /:id — Soft delete
router.delete('/:id', (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  update('offers', o => o.id === req.params.id, { deleted_at: new Date().toISOString() });
  res.json({ deleted: true });
});

module.exports = router;
