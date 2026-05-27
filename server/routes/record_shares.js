// server/routes/record_shares.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, query, findOne, insert, update } = require('../db/init');
const { applyPrivacy, DEFAULT_PII_FIELDS } = require('../lib/pii');
const { hasGlobalAction: _hasGA } = require('../middleware/rbac');

function _checkGA(req, res, action) {
  const user = req.currentUser;
  if (!user) { res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }); return false; }
  if (!_hasGA(user, action)) {
    res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', required: { action } });
    return false;
  }
  return null;
}

function ensure() {
  const s = getStore();
  if (!s.record_shares) { s.record_shares = []; saveStore(); }
}

/**
 * Resolve recipient user IDs for a share based on config + record context.
 * Returns array of user IDs.
 */
function resolveRecipients(cfg, record) {
  const s = getStore();
  const mode = cfg.recipient_mode || 'specific_user';

  if (mode === 'specific_user') {
    return cfg.recipient_user_ids || (cfg.recipient_user_id ? [cfg.recipient_user_id] : []);
  }

  if (mode === 'role') {
    if (!cfg.recipient_role_id) return [];
    return (s.users || [])
      .filter(u => u.role_id === cfg.recipient_role_id && !u.deleted_at && u.status !== 'inactive')
      .map(u => u.id);
  }

  if (mode === 'field_variable') {
    // Reads a People-type field on a related record.
    // cfg.recipient_source: 'self' (the record itself) or 'linked_job' (the job a candidate is linked to)
    const source = cfg.recipient_source || 'self';
    let sourceRecord = record;

    if (source === 'linked_job') {
      const link = (s.people_links || []).find(l =>
        (l.person_record_id === record.id || l.person_id === record.id) &&
        l.target_record_id
      );
      if (link?.target_record_id) {
        sourceRecord = (s.records || []).find(r => r.id === link.target_record_id) || record;
      }
    }

    const fieldKey = cfg.recipient_field_key;
    if (!fieldKey) return [];
    const fieldValue = sourceRecord?.data?.[fieldKey];
    if (!fieldValue) return [];

    // People fields store an array of person record IDs, or a single ID
    const personIds = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

    // Map person records → users by email
    const userIds = [];
    for (const personId of personIds) {
      const personRec = (s.records || []).find(r => r.id === personId);
      const email = personRec?.data?.email;
      if (!email) continue;
      const user = (s.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user) userIds.push(user.id);
    }
    return userIds;
  }

  return [];
}

// ── List shares (HM widget calls this) ────────────────────────────────────────
// GET /api/record-shares?recipient_user_id=...&status=pending
// Also supports recipient_email=... which resolves to user_id internally (used by
// unauthenticated HM portal where identity comes from a URL param).
router.get('/', (req, res) => {
  ensure();
  const { recipient_user_id, recipient_email, status, record_id, workflow_id, environment_id } = req.query;
  let shares = (getStore().record_shares || []).filter(s => !s.deleted_at);

  // Resolve recipient_email → user_id if provided
  let effectiveUserId = recipient_user_id;
  if (!effectiveUserId && recipient_email) {
    const user = (getStore().users || []).find(u => u.email?.toLowerCase() === String(recipient_email).toLowerCase() && !u.deleted_at);
    if (!user) return res.json([]); // unknown email → empty inbox
    effectiveUserId = user.id;
  }

  if (environment_id)   shares = shares.filter(s => s.environment_id === environment_id);
  if (effectiveUserId)  shares = shares.filter(s => (s.recipient_user_ids || []).includes(effectiveUserId));
  if (status)           shares = shares.filter(s => s.status === status);
  if (record_id)        shares = shares.filter(s => s.record_id === record_id);
  if (workflow_id)      shares = shares.filter(s => s.workflow_id === workflow_id);

  // Auto-expire stale shares
  const now = Date.now();
  shares = shares.map(share => {
    if (share.status === 'pending' && share.expires_at && new Date(share.expires_at).getTime() < now) {
      update('record_shares', x => x.id === share.id, { status: 'expired' });
      return { ...share, status: 'expired' };
    }
    return share;
  });

  // Hydrate with record summary (privacy applied)
  const result = shares.map(share => {
    const record = (getStore().records || []).find(r => r.id === share.record_id);
    const safeData = record ? applyPrivacy(record.data, {
      privacy_mode: share.privacy_mode,
      visible_fields: share.visible_fields,
    }) : {};
    return {
      ...share,
      record_summary: {
        id: share.record_id,
        data: safeData,
        object_id: record?.object_id,
      },
    };
  });

  res.json(result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

// ── Get single share with full privacy-applied record ─────────────────────────
// GET /api/record-shares/:id
// Supports ?as_email=hm@co.com for unauthenticated portal access.
router.get('/:id', (req, res) => {
  ensure();
  const share = (getStore().record_shares || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!share) return res.status(404).json({ error: 'Not found' });

  // Resolve identity — either authenticated user, or as_email param (for HM portal)
  const user = req.currentUser;
  const asEmail = req.query.as_email;
  let portalUser = null;
  if (!user && asEmail) {
    portalUser = (getStore().users || []).find(u => u.email?.toLowerCase() === String(asEmail).toLowerCase() && !u.deleted_at);
  }
  const effectiveUserId = user?.id || portalUser?.id;

  const isRecipient = effectiveUserId && (share.recipient_user_ids || []).includes(effectiveUserId);
  const isAdmin = user && _hasGA(user, 'manage_workflows');
  if (!isRecipient && !isAdmin) {
    return res.status(403).json({ error: 'Not authorised to view this share' });
  }

  const record = (getStore().records || []).find(r => r.id === share.record_id);
  const safeData = record ? applyPrivacy(record.data, {
    privacy_mode: share.privacy_mode,
    visible_fields: share.visible_fields,
  }) : {};

  // Mark as viewed if recipient is opening it for the first time
  if (isRecipient && share.status === 'pending' && !share.viewed_at) {
    update('record_shares', x => x.id === share.id, {
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    });
    share.status = 'viewed';
    share.viewed_at = new Date().toISOString();
  }

  // Hydrate the form spec if cta_type is form
  let form = null;
  if (share.cta_type === 'form' && share.cta_form_id) {
    form = (getStore().forms || []).find(f => f.id === share.cta_form_id && !f.deleted_at);
  }

  res.json({
    ...share,
    record: {
      id: share.record_id,
      data: safeData,
      object_id: record?.object_id,
    },
    form,
  });
});

// ── Create share (called by workflow runner) ──────────────────────────────────
// POST /api/record-shares
router.post('/', (req, res) => {
  ensure();
  const {
    record_id, workflow_id, workflow_step_id, environment_id,
    recipient_mode, recipient_user_ids, recipient_role_id,
    privacy_mode = 'anonymised', visible_fields = [],
    cta_type = 'form', cta_form_id, cta_config = {},
    auto_advance = 'none', expires_at, message,
  } = req.body;

  if (!record_id) return res.status(400).json({ error: 'record_id required' });
  if (!recipient_user_ids || recipient_user_ids.length === 0) {
    return res.status(400).json({ error: 'At least one recipient_user_id required' });
  }

  const share = {
    id: uuidv4(),
    record_id,
    workflow_id: workflow_id || null,
    workflow_step_id: workflow_step_id || null,
    environment_id: environment_id || null,
    recipient_mode: recipient_mode || 'specific_user',
    recipient_user_ids,
    recipient_role_id: recipient_role_id || null,
    privacy_mode,
    visible_fields,
    cta_type,
    cta_form_id: cta_form_id || null,
    cta_config,
    auto_advance,
    expires_at: expires_at || null,
    message: message || null,
    status: 'pending',
    response_data: null,
    response_user_id: null,
    viewed_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    created_by: req.currentUser?.id || null,
  };

  insert('record_shares', share);
  res.json(share);
});

// ── Complete share (recipient submits response) ───────────────────────────────
// PATCH /api/record-shares/:id/complete
// Supports ?as_email=hm@co.com (or as_email in body) for unauthenticated portal access.
router.patch('/:id/complete', async (req, res) => {
  ensure();
  const share = (getStore().record_shares || []).find(s => s.id === req.params.id && !s.deleted_at);
  if (!share) return res.status(404).json({ error: 'Not found' });

  // Resolve identity — either authenticated user or as_email param (HM portal)
  const authUser = req.currentUser;
  const asEmail = req.query.as_email || req.body?.as_email;
  let portalUser = null;
  if (!authUser && asEmail) {
    portalUser = (getStore().users || []).find(u => u.email?.toLowerCase() === String(asEmail).toLowerCase() && !u.deleted_at);
  }
  const user = authUser || portalUser;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (!(share.recipient_user_ids || []).includes(user.id)) {
    return res.status(403).json({ error: 'Not authorised to complete this share' });
  }
  if (share.status === 'completed') {
    return res.status(409).json({ error: 'Share already completed', share });
  }

  const { response_data, decision } = req.body;
  // decision: 'approved' | 'rejected' (for approve_reject CTA)

  const completed = update('record_shares', x => x.id === share.id, {
    status: 'completed',
    response_data: response_data || null,
    response_decision: decision || null,
    response_user_id: user.id,
    completed_at: new Date().toISOString(),
  });

  // If CTA was a form, also create a form_response so it shows in the record's Forms tab
  if (share.cta_type === 'form' && share.cta_form_id && response_data) {
    insert('form_responses', {
      id: uuidv4(),
      form_id: share.cta_form_id,
      record_id: share.record_id,
      data: response_data,
      submitted_by: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
      submitted_by_user_id: user.id,
      submitted_at: new Date().toISOString(),
      via_share_id: share.id,
    });
  }

  // Auto-advance the people-link to next stage if configured
  if (share.workflow_id && share.auto_advance && share.auto_advance !== 'none') {
    const shouldAdvance =
      share.auto_advance === 'always' ||
      (share.auto_advance === 'on_approve' && decision === 'approved');

    if (shouldAdvance) {
      const link = (getStore().people_links || []).find(l =>
        (l.person_record_id === share.record_id || l.person_id === share.record_id)
      );
      if (link) {
        const wfSteps = (getStore().workflow_steps || [])
          .filter(s => s.workflow_id === share.workflow_id)
          .sort((a, b) => a.order - b.order);
        const currentIdx = wfSteps.findIndex(s => s.id === link.stage_id);
        const nextStep = wfSteps[currentIdx + 1];
        if (nextStep) {
          update('people_links', l => l.id === link.id, {
            stage_id: nextStep.id,
            stage_name: nextStep.name,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  res.json(completed);
});

// ── Withdraw share (creator cancels it before completion) ─────────────────────
router.patch('/:id/withdraw', (req, res) => {
  if (_checkGA(req, res, 'manage_workflows') === false) return;
  ensure();
  const updated = update('record_shares', s => s.id === req.params.id, {
    status: 'withdrawn',
    withdrawn_at: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// ── PII config endpoint (for admin/UI to know what's stripped) ────────────────
router.get('/config/pii-fields', (req, res) => {
  res.json({ default_pii_fields: DEFAULT_PII_FIELDS });
});

router.resolveRecipients = resolveRecipients;
module.exports = router;
module.exports.resolveRecipients = resolveRecipients;
