const { hasGlobalAction: _hasGA, hasPermission: _hasPerm, isSuperAdmin: _isSA } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createOfferSchema, patchOfferSchema, offerApprovalSchema, offerStatusSchema } = require('../validation/schemas');
function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" }); return false; }
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert, update, remove: _remove, getStore, saveStore } = require('../db/init');
const { getConnector, fireEvent } = require('../services/connectors');

let _agentEngine = null;
const getEngine = () => { if (!_agentEngine) _agentEngine = require('../agent-engine'); return _agentEngine; };

function ensure() {
  const s = getStore();
  if (!s.offers) { s.offers = []; saveStore(); }
}

function computeTotal({ base_salary, bonus, bonus_type, package_items }) {
  let total = parseFloat(base_salary) || 0;
  if (bonus) {
    total += bonus_type === 'percentage'
      ? total * (parseFloat(bonus) / 100)
      : parseFloat(bonus);
  }
  (package_items || []).forEach(item => {
    if (!item.exclude_from_total) total += parseFloat(item.value) || 0;
  });
  return total;
}

function _advanceApproval(offer) {
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
  const { environment_id, candidate_id, job_id, job_ids, status } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  let rows = query('offers', o => o.environment_id === environment_id && !o.deleted_at);
  if (candidate_id) rows = rows.filter(o => o.candidate_id === candidate_id);
  if (job_id)       rows = rows.filter(o => o.job_id === job_id);
  if (job_ids) {
    const idSet = new Set(String(job_ids).split(',').map(s => s.trim()).filter(Boolean));
    rows = rows.filter(o => idSet.has(o.job_id));
  }
  if (status) rows = rows.filter(o => o.status === status);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  // RBAC: filter offers — user must be able to view the people object
  const _user = req.currentUser;
  if (_user && !_isSA(_user)) {
    if (!_hasPerm(_user, 'people', 'view')) rows = [];
  }
  res.json(rows);
});

// ── Templates (must be before /:id routes) ────────────────────────────────
router.get('/templates', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  if (!store.offer_templates) return res.json([]);
  const userId = req.currentUser?.id;
  res.json(store.offer_templates
    .filter(t => t.environment_id === environment_id && !t.deleted_at && (t.shared || t.created_by === userId))
    .sort((a,b) => new Date(b.created_at)-new Date(a.created_at)));
});

router.post('/templates', (req, res) => {
  const { environment_id, name, description, shared, base_salary, currency,
          bonus, bonus_type, package_items, notes, terms, approval_chain } = req.body;
  const store = getStore();
  if (!store.offer_templates) store.offer_templates = [];
  const now = new Date().toISOString();
  const t = { id:uuidv4(), environment_id, name, description:description||'', shared:shared||false,
    base_salary:base_salary||null, currency:currency||'USD', bonus:bonus||null,
    bonus_type:bonus_type||'fixed', package_items:package_items||[], notes:notes||'',
    terms:terms||'', approval_chain:approval_chain||[],
    created_by:req.currentUser?.id||'system', created_at:now, updated_at:now, deleted_at:null };
  store.offer_templates.push(t);
  saveStore();
  res.status(201).json(t);
});

router.delete('/templates/:id', (req, res) => {
  const store = getStore();
  if (!store.offer_templates) return res.status(404).json({error:'Not found'});
  const idx = store.offer_templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({error:'Not found'});
  store.offer_templates[idx] = {...store.offer_templates[idx], deleted_at:new Date().toISOString()};
  saveStore();
  res.json({ok:true});
});

// ── Bulk Send (must be before /:id routes) ────────────────────────────────
router.post('/bulk-send', async (req, res) => {
  const { offer_ids } = req.body;
  if (!Array.isArray(offer_ids)||!offer_ids.length) return res.status(400).json({error:'offer_ids required'});
  const now = new Date().toISOString();
  const results = [];
  ensure();
  for (const id of offer_ids) {
    const offer = query('offers', o => o.id===id && !o.deleted_at)[0];
    if (!offer||offer.status!=='approved') { results.push({id,ok:false,error:`Offer is ${offer?.status||'not found'}`}); continue; }
    update('offers', o => o.id===id, {status:'sent',sent_at:now,updated_at:now,
      activity_log:[...(offer.activity_log||[]),{id:uuidv4(),type:'sent',message:'Offer sent (bulk)',user:req.currentUser?.id||'system',timestamp:now}]});
    results.push({id,ok:true});
  }
  saveStore();
  res.json({results});
});

// GET /:id — Single offer
router.get('/:id', (req, res) => {
  ensure();
  const offer = query('offers', o => o.id === req.params.id && !o.deleted_at)[0];
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  res.json(offer);
});

// POST / — Create offer
router.post('/', validate(createOfferSchema), (req, res) => {
  if (_checkGA(req, res, 'manage_settings') === false) return;
  ensure();
  const {
    environment_id, candidate_id, candidate_name,
    job_id, job_name, job_department,
    base_salary, currency, bonus, bonus_type,
    start_date, expiry_date,
    approval_chain,
    notes, terms, custom_fields,
    package_items, conditions, parent_offer_id,
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
    package_items:    package_items   || [],
    conditions:       (conditions||[]).map(c=>({...c,cleared:false,cleared_at:null})),
    total_package:    computeTotal({base_salary,bonus,bonus_type,package_items}),
    parent_offer_id:  parent_offer_id || null,
    version:          1,
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
router.patch('/:id', validate(patchOfferSchema), (req, res) => {
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
router.patch('/:id/status', validate(offerStatusSchema), async (req, res) => {
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

  // ── AGENT TRIGGERS (non-blocking) ─────────────────────────────────────────
  process.nextTick(() => {
    try {
      const candidateRec = offer.candidate_id
        ? (getStore().records || []).find(r => r.id === offer.candidate_id)
        : null;
      if (candidateRec) {
        if (status === 'sent')     getEngine().fireEventTrigger('offer_sent',     candidateRec, ['status']).catch(() => {});
        if (status === 'declined') getEngine().fireEventTrigger('offer_declined', candidateRec, ['status']).catch(() => {});
        if (status === 'expired')  getEngine().fireEventTrigger('offer_expired',  candidateRec, ['status']).catch(() => {});
      }
    } catch (e) { console.warn('[Agents] offer status trigger error:', e.message); }
  });

  // ── CONNECTOR TRIGGERS (non-blocking) ──────────────────────────────────
  const envId = offer.environment_id;
  if (status === 'sent' && req.body.send_for_signature) {
    process.nextTick(async () => {
      try {
        const docusign = getConnector(envId, 'docusign');
        if (docusign) {
          const envelope = await docusign.sendOfferForSignature({
            candidateName: offer.candidate_name,
            candidateEmail: offer.candidate_email,
            jobTitle: offer.job_title,
            salary: offer.base_salary,
            startDate: offer.start_date,
          });
          update('offers', o => o.id === req.params.id, { docusign_envelope_id: envelope.envelope_id, signature_status: 'sent' });
          console.log('[Connectors] DocuSign envelope sent:', envelope.envelope_id);
        }
      } catch (e) { console.warn('[Connectors] DocuSign error:', e.message); }
    });
  }

  if (status === 'accepted') {
    process.nextTick(async () => {
      // Sync new hire to connected HRIS
      const employee = { firstName: offer.candidate_name?.split(' ')[0] || '', lastName: offer.candidate_name?.split(' ').slice(1).join(' ') || '',
        email: offer.candidate_email, jobTitle: offer.job_title, department: offer.department,
        startDate: offer.start_date, salary: offer.base_salary, employmentType: offer.employment_type };
      try {
        const bamboo = getConnector(envId, 'bamboohr');
        if (bamboo) { await bamboo.createEmployee(employee); console.log('[Connectors] BambooHR: new hire synced'); }
      } catch (e) { console.warn('[Connectors] BambooHR error:', e.message); }
      try {
        const workday = getConnector(envId, 'workday');
        if (workday) { await workday.createPreHire(employee); console.log('[Connectors] Workday: pre-hire created'); }
      } catch (e) { console.warn('[Connectors] Workday error:', e.message); }
      // Fire notification
      try {
        await fireEvent(envId, 'offer_accepted', {
          candidateName: offer.candidate_name, jobTitle: offer.job_title, startDate: offer.start_date });
      } catch (e) { console.warn('[Connectors] Notification error:', e.message); }

      // Fire agent trigger — offer_accepted
      try {
        const candidateRec = offer.candidate_id
          ? (getStore().records || []).find(r => r.id === offer.candidate_id)
          : null;
        if (candidateRec) {
          getEngine().fireEventTrigger('offer_accepted', candidateRec, ['status']).catch(() => {});
        }
      } catch (e) { console.warn('[Agents] offer_accepted trigger error:', e.message); }
    });
  }
});

// PATCH /:id/approve — Approver decision
router.patch('/:id/approve', validate(offerApprovalSchema), (req, res) => {
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

  const updates = {
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

// ── Revise (create new version) ────────────────────────────────────────────
router.post('/:id/revise', (req, res) => {
  ensure();
  const original = query('offers', o => o.id===req.params.id && !o.deleted_at)[0];
  if (!original) return res.status(404).json({error:'Offer not found'});
  const now = new Date().toISOString();
  const revised = insert('offers', {
    ...original, id:uuidv4(), parent_offer_id:original.id,
    version:(original.version||1)+1, status:'draft',
    sent_at:null,accepted_at:null,declined_at:null,
    approval_chain:(original.approval_chain||[]).map(a=>({...a,status:'pending',decided_at:null,comment:''})),
    current_approver_index:original.approval_chain?.length?0:null,
    activity_log:[{id:uuidv4(),type:'revised',message:`Revised from v${original.version||1}`,user:req.currentUser?.id||'system',timestamp:now}],
    created_at:now,updated_at:now,deleted_at:null,
  });
  res.status(201).json(revised);
});

// ── Conditions ─────────────────────────────────────────────────────────────
router.patch('/:id/conditions/:index', (req, res) => {
  ensure();
  const { cleared } = req.body;
  const offer = query('offers', o => o.id===req.params.id && !o.deleted_at)[0];
  if (!offer) return res.status(404).json({error:'Not found'});
  const conditions = [...(offer.conditions||[])];
  const idx = parseInt(req.params.index);
  if (!conditions[idx]) return res.status(400).json({error:'Condition index out of range'});
  conditions[idx] = {...conditions[idx], cleared:!!cleared, cleared_at:cleared?new Date().toISOString():null};
  const allCleared = conditions.every(c=>c.cleared);
  const updates = {conditions, updated_at:new Date().toISOString()};
  if (allCleared && offer.status==='sent') updates.status = 'accepted';
  update('offers', o => o.id===req.params.id, updates);
  res.json({ok:true, all_cleared:allCleared});
});

module.exports = router;
