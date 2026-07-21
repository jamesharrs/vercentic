/**
 * server/routes/approvals.js
 *
 * Approval Requests — full lifecycle:
 *   GET    /api/approvals                   list (filter by env, record, status)
 *   POST   /api/approvals                   create new approval request
 *   GET    /api/approvals/:id               single request + full chain state
 *   PATCH  /api/approvals/:id               update (title, notes, metadata)
 *   DELETE /api/approvals/:id               cancel/delete
 *
 *   POST   /api/approvals/:id/send          send approval emails to next pending approver(s)
 *   POST   /api/approvals/:id/remind        resend reminder to pending approver(s)
 *   POST   /api/approvals/:id/withdraw      withdraw the request
 *
 * Public (no auth):
 *   GET    /api/approvals/token/:token       load approval page data
 *   POST   /api/approvals/token/:token/respond  approve or decline
 */

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');

// DB helpers
let _db;
function db() {
  if (!_db) _db = require('../db/init');
  return _db;
}
function getStore()  { return db().getStore(); }
function saveStore() { return db().saveStore(); }

function query(table, pred) {
  const s = getStore();
  if (!s[table]) s[table] = [];
  return pred ? s[table].filter(pred) : [...s[table]];
}
function findOne(table, pred) { return query(table, pred)[0] || null; }
function insert(table, rec) {
  const s = getStore();
  if (!s[table]) s[table] = [];
  s[table].push(rec);
  saveStore();
  return rec;
}
function updateOne(table, pred, patch) {
  const s = getStore();
  if (!s[table]) s[table] = [];
  const idx = s[table].findIndex(pred);
  if (idx < 0) return null;
  s[table][idx] = { ...s[table][idx], ...patch, updated_at: new Date().toISOString() };
  saveStore();
  return s[table][idx];
}
function removeOne(table, pred) {
  const s = getStore();
  if (!s[table]) s[table] = [];
  const idx = s[table].findIndex(pred);
  if (idx < 0) return false;
  s[table].splice(idx, 1);
  saveStore();
  return true;
}

function ensureTables() {
  const s = getStore();
  ['approvals', 'approval_responses', 'approval_templates'].forEach(t => {
    if (!s[t]) { s[t] = []; saveStore(); }
  });
}

// Resolve approvers from config
function resolveApprovers(approverConfigs, record, store) {
  const resolved = [];
  let order = 0;

  for (const cfg of (approverConfigs || [])) {
    if (cfg.type === 'named') {
      resolved.push({
        id: uuidv4(), name: cfg.name || cfg.email, email: cfg.email,
        source_label: 'Named approver', order: order++, status: 'pending',
        token: uuidv4(), responded_at: null, note: null,
      });
    } else if (cfg.type === 'user') {
      const user = (store.users || []).find(u => u.id === cfg.user_id);
      if (user) {
        resolved.push({
          id: uuidv4(),
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
          email: user.email, source_label: 'Platform user', order: order++,
          status: 'pending', token: uuidv4(), responded_at: null, note: null,
        });
      }
    } else if (cfg.type === 'group') {
      // Expand a saved user group into one approver per member.
      const group = (store.groups || []).find(g => g.id === cfg.group_id && !g.deleted_at);
      if (!group) continue;
      const label = cfg.label || group.name || 'Group';
      for (const uid of (group.member_ids || [])) {
        const user = (store.users || []).find(u => u.id === uid && !u.deleted_at);
        if (!user?.email) continue;
        resolved.push({
          id: uuidv4(),
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
          email: user.email, source_label: label, order: order++,
          status: 'pending', token: uuidv4(), responded_at: null, note: null,
        });
      }
    } else if (cfg.type === 'field') {
      const fieldValue = record?.data?.[cfg.field_key];
      if (!fieldValue) continue;
      const ids = Array.isArray(fieldValue)
        ? fieldValue.map(v => (typeof v === 'object' ? v.id : v))
        : [typeof fieldValue === 'object' ? fieldValue.id : fieldValue];
      for (const id of ids) {
        const user = (store.users || []).find(u => u.id === id);
        if (user?.email) {
          resolved.push({
            id: uuidv4(),
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
            email: user.email, source_label: cfg.label || cfg.field_key, order: order++,
            status: 'pending', token: uuidv4(), responded_at: null, note: null,
          });
          continue;
        }
        const personRec = (store.records || []).find(r => r.id === id);
        if (personRec?.data?.email) {
          const pName = [personRec.data.first_name, personRec.data.last_name].filter(Boolean).join(' ') || personRec.data.email;
          resolved.push({
            id: uuidv4(), name: pName, email: personRec.data.email,
            source_label: cfg.label || cfg.field_key, order: order++,
            status: 'pending', token: uuidv4(), responded_at: null, note: null,
          });
        }
      }
    }
  }
  return resolved;
}

function pendingApprovers(approval) {
  const chain  = approval.approvers || [];
  const mode   = approval.mode || 'sequential';
  const pending = chain.filter(a => a.status === 'pending');
  if (mode === 'sequential') {
    const firstPending = chain.find(a => a.status === 'pending');
    return firstPending ? [firstPending] : [];
  }
  return pending;
}

function computeOutcome(approval) {
  const chain     = approval.approvers || [];
  const mode      = approval.mode || 'sequential';
  const threshold = approval.majority_threshold || Math.ceil(chain.length / 2);
  const approvedCount = chain.filter(a => a.status === 'approved').length;
  const declinedCount = chain.filter(a => a.status === 'declined').length;
  const totalCount    = chain.length;

  if (mode === 'sequential') {
    if (declinedCount > 0)            return 'declined';
    if (approvedCount === totalCount) return 'approved';
    return 'pending';
  }
  if (mode === 'parallel') {
    if (declinedCount > 0)            return 'declined';
    if (approvedCount === totalCount) return 'approved';
    return 'pending';
  }
  if (mode === 'majority') {
    if (approvedCount >= threshold)               return 'approved';
    if (declinedCount > totalCount - threshold)   return 'declined';
    return 'pending';
  }
  return 'pending';
}

function portalUrl(baseUrl, token) {
  const base = (baseUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/approval/${token}`;
}

async function sendApprovalEmail({ approval, approver, baseUrl, isReminder = false }) {
  const url = portalUrl(baseUrl, approver.token);
  let messaging;
  try { messaging = require('../services/messaging'); } catch (_) { messaging = null; }

  const subject = isReminder
    ? `[Reminder] Action required: ${approval.title}`
    : `Action required: ${approval.title}`;

  const chainRows = (approval.approvers || []).map((a, i) => {
    const statusColor = a.status === 'approved' ? '#16a34a' : a.status === 'declined' ? '#dc2626' : '#6b7280';
    const statusLabel = a.status === 'approved' ? '✓ Approved' : a.status === 'declined' ? '✗ Declined' : 'Pending';
    const isThis = a.id === approver.id;
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;color:${isThis?'#0f1729':'#6b7280'};font-weight:${isThis?'700':'400'};">
        ${i+1}. ${a.name}${a.source_label?` <span style="color:#9ca3af;font-size:11px;">(${a.source_label})</span>`:''}
      </td>
      <td style="padding:8px 12px;font-size:12px;color:${statusColor};font-weight:600;">${statusLabel}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#0f1729;padding:28px 32px;">
      <div style="font-size:22px;font-weight:700;color:white;">Vercentic</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:2px;">Approval Required</div>
    </div>
    <div style="padding:32px;">
      ${isReminder?'<div style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#b45309;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:16px;">⏰ Reminder</div>':''}
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1729;">${approval.title}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        ${isReminder?'This is a reminder that your approval is still required.':`Hi ${approver.name}, your approval is required for the following.`}
      </p>
      ${approval.summary?`<div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:20px;border:1px solid #e8ecf8;"><p style="margin:0;font-size:14px;color:#0f1729;line-height:1.6;">${approval.summary}</p></div>`:''}
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:24px;border:1px solid #e8ecf8;">
        <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Approval Chain</div>
        <table style="width:100%;border-collapse:collapse;">${chainRows}</table>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <a href="${url}?action=approve" style="flex:1;display:block;padding:14px 20px;background:#16a34a;color:white;text-align:center;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">✓ Approve</a>
        <a href="${url}?action=decline" style="flex:1;display:block;padding:14px 20px;background:#dc2626;color:white;text-align:center;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">✗ Decline</a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Or view the full page: <a href="${url}" style="color:#4361ee;">${url}</a></p>
      ${approval.expires_at?`<p style="margin:12px 0 0;font-size:12px;color:#f59e0b;text-align:center;font-weight:600;">⏰ This approval expires ${new Date(approval.expires_at).toLocaleDateString()}</p>`:''}
    </div>
  </div></body></html>`;

  if (messaging?.sendEmail) {
    try {
      // Do NOT hardcode `from` — let the mailer resolve a Resend-verified sender
      // (custom domain → per-tenant subdomain → noreply@mail.vercentic.com).
      // Passing an unverified from (e.g. a gmail.com address) makes Resend reject
      // the send, which used to be swallowed and mis-reported as "sent".
      const r = await messaging.sendEmail({
        to: approver.email, subject, html,
        tags: { environment_id: approval.environment_id },
      });
      if (r && r.simulated) return { sent: false, simulated: true };
      return { sent: true, simulated: false, id: r?.messageId || r?.id };
    } catch (err) {
      console.warn('[approvals] Email send FAILED:', err.message);
      return { sent: false, simulated: false, error: err.message };
    }
  }
  console.log(`[approvals] SIMULATED EMAIL to ${approver.email}: ${subject}`);
  console.log(`  Portal URL: ${url}`);
  return { sent: false, simulated: true };
}

// PUBLIC: load approval page data
router.get('/token/:token', (req, res) => {
  ensureTables();
  const { token } = req.params;
  const s = getStore();
  const approval = (s.approvals || []).find(a => (a.approvers || []).some(ap => ap.token === token));
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  const approver = approval.approvers.find(ap => ap.token === token);
  if (!approver) return res.status(404).json({ error: 'Approver not found' });
  let record = null;
  if (approval.record_id) record = (s.records || []).find(r => r.id === approval.record_id) || null;
  const safeChain = (approval.approvers || []).map(a => ({
    id: a.id, name: a.name, source_label: a.source_label, order: a.order,
    status: a.status, responded_at: a.responded_at, note: a.note, is_this: a.id === approver.id,
  }));
  return res.json({
    approval: { id: approval.id, title: approval.title, summary: approval.summary,
      mode: approval.mode, status: approval.status, expires_at: approval.expires_at,
      created_at: approval.created_at, majority_threshold: approval.majority_threshold },
    approver: { id: approver.id, name: approver.name, status: approver.status },
    chain: safeChain,
    record: record ? { id: record.id, data: record.data } : null,
    already_responded: approver.status !== 'pending',
  });
});

// PUBLIC: respond
router.post('/token/:token/respond', async (req, res) => {
  ensureTables();
  const { token } = req.params;
  const { action, note } = req.body;
  if (!['approve', 'decline'].includes(action)) return res.status(400).json({ error: 'action must be approve or decline' });
  const s = getStore();
  const approvalIdx = (s.approvals || []).findIndex(a => (a.approvers || []).some(ap => ap.token === token));
  if (approvalIdx < 0) return res.status(404).json({ error: 'Approval not found' });
  const approval = s.approvals[approvalIdx];
  const approverIdx = approval.approvers.findIndex(ap => ap.token === token);
  if (approverIdx < 0) return res.status(404).json({ error: 'Approver not found' });
  const approver = approval.approvers[approverIdx];
  if (approver.status !== 'pending') return res.status(409).json({ error: 'Already responded', status: approver.status });
  if (approval.expires_at && new Date(approval.expires_at) < new Date()) return res.status(410).json({ error: 'This approval has expired' });
  approval.approvers[approverIdx] = {
    ...approver, status: action === 'approve' ? 'approved' : 'declined',
    responded_at: new Date().toISOString(), note: note || null,
  };
  if (!s.approval_responses) s.approval_responses = [];
  s.approval_responses.push({ id: uuidv4(), approval_id: approval.id, approver_id: approver.id,
    approver_name: approver.name, action, note: note || null, created_at: new Date().toISOString() });
  const outcome = computeOutcome(approval);
  approval.status = outcome === 'pending' ? 'pending' : outcome;
  approval.updated_at = new Date().toISOString();
  if (outcome !== 'pending' && !approval.resolved_at) approval.resolved_at = new Date().toISOString();
  if (approval.record_id && note) {
    const recIdx = (s.records || []).findIndex(r => r.id === approval.record_id);
    if (recIdx >= 0) {
      if (!s.records[recIdx].notes) s.records[recIdx].notes = [];
      s.records[recIdx].notes.push({ id: uuidv4(),
        text: `[Approval: ${approval.title}] ${approver.name} ${action}d: ${note}`,
        author: approver.name, created_at: new Date().toISOString() });
    }
  }
  saveStore();
  if (outcome === 'pending' && approval.mode === 'sequential') {
    const next = approval.approvers.find(a => a.status === 'pending');
    if (next) sendApprovalEmail({ approval, approver: next, baseUrl: req.headers.origin || process.env.APP_URL }).catch(console.warn);
  }
  return res.json({ ok: true, outcome, status: approval.status });
});

// LIST
router.get('/', (req, res) => {
  ensureTables();
  const { environment_id, record_id, status, object_id } = req.query;
  let list = query('approvals', a => {
    if (environment_id && a.environment_id !== environment_id) return false;
    if (record_id      && a.record_id      !== record_id)      return false;
    if (object_id      && a.object_id      !== object_id)      return false;
    if (status         && a.status         !== status)         return false;
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(list);
});

// GET single
router.get('/:id', (req, res) => {
  ensureTables();
  const approval = findOne('approvals', a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: 'Not found' });
  const responses = query('approval_responses', r => r.approval_id === req.params.id);
  return res.json({ ...approval, responses });
});

// CREATE
router.post('/', async (req, res) => {
  ensureTables();
  const { environment_id, record_id, object_id, title, summary, approver_configs,
    mode, majority_threshold, on_approved, on_declined, expires_hours,
    reminder_hours, email_template_id, send_immediately } = req.body;
  if (!title || !approver_configs?.length) return res.status(400).json({ error: 'title and approver_configs required' });
  const s = getStore();
  const record = record_id ? (s.records || []).find(r => r.id === record_id) : null;
  const resolvedApprovers = resolveApprovers(approver_configs, record, s);
  if (!resolvedApprovers.length) return res.status(400).json({ error: 'No approvers could be resolved' });
  const threshold = majority_threshold || (mode === 'majority' ? Math.ceil(resolvedApprovers.length / 2) : null);
  const now = new Date().toISOString();
  const approval = {
    id: uuidv4(), environment_id: environment_id || null, record_id: record_id || null,
    object_id: object_id || null, title, summary: summary || null,
    mode: mode || 'sequential', majority_threshold: threshold, approvers: resolvedApprovers,
    approver_configs, status: 'pending',
    on_approved: on_approved || { action: 'none' },
    on_declined: on_declined || { action: 'none' },
    expires_at: expires_hours ? new Date(Date.now() + expires_hours * 3600000).toISOString() : null,
    reminder_hours: reminder_hours || null, email_template_id: email_template_id || null,
    created_at: now, updated_at: now, resolved_at: null,
  };
  insert('approvals', approval);
  if (send_immediately !== false) {
    const toSend = pendingApprovers(approval);
    let anySent = false, anyFailed = false, lastErr = null;
    for (const approver of toSend) {
      const r = await sendApprovalEmail({ approval, approver, baseUrl: req.headers.origin || process.env.APP_URL })
        .catch(err => ({ sent: false, error: err.message }));
      if (r?.sent) anySent = true; else { anyFailed = true; lastErr = r?.error || (r?.simulated ? 'email not configured (simulated)' : 'unknown'); }
    }
    // Only stamp emails_sent_at when a real send actually succeeded; surface failures.
    updateOne('approvals', a => a.id === approval.id, {
      emails_sent_at: anySent ? now : null,
      last_email_error: anyFailed ? lastErr : null,
    });
    approval.emails_sent_at = anySent ? now : null;
    approval.last_email_error = anyFailed ? lastErr : null;
  }
  return res.status(201).json(approval);
});

// UPDATE
router.patch('/:id', (req, res) => {
  ensureTables();
  const { title, summary, on_approved, on_declined, expires_at, reminder_hours } = req.body;
  const updated = updateOne('approvals', a => a.id === req.params.id, {
    ...(title          !== undefined && { title }),
    ...(summary        !== undefined && { summary }),
    ...(on_approved    !== undefined && { on_approved }),
    ...(on_declined    !== undefined && { on_declined }),
    ...(expires_at     !== undefined && { expires_at }),
    ...(reminder_hours !== undefined && { reminder_hours }),
  });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  return res.json(updated);
});

// SEND emails
router.post('/:id/send', async (req, res) => {
  ensureTables();
  const approval = findOne('approvals', a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: 'Not found' });
  const toSend = pendingApprovers(approval);
  if (!toSend.length) return res.json({ ok: true, sent: 0, message: 'No pending approvers' });
  let sent = 0, simulated = 0, failed = 0, lastErr = null;
  for (const approver of toSend) {
    const r = await sendApprovalEmail({ approval, approver, baseUrl: req.headers.origin || process.env.APP_URL }).catch(err => ({ sent: false, error: err.message }));
    if (r.sent) sent++;
    else { failed++; if (r.simulated) simulated++; lastErr = r.error || (r.simulated ? 'email not configured (simulated)' : lastErr); }
  }
  updateOne('approvals', a => a.id === req.params.id, {
    emails_sent_at: sent > 0 ? new Date().toISOString() : approval.emails_sent_at || null,
    last_email_error: failed > 0 ? lastErr : null,
  });
  return res.json({ ok: sent > 0, sent, simulated, failed, error: failed > 0 ? lastErr : null });
});

// REMIND
router.post('/:id/remind', async (req, res) => {
  ensureTables();
  const approval = findOne('approvals', a => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: 'Not found' });
  const toSend = pendingApprovers(approval);
  let sent = 0, simulated = 0, failed = 0, lastErr = null;
  for (const approver of toSend) {
    const r = await sendApprovalEmail({ approval, approver, baseUrl: req.headers.origin || process.env.APP_URL, isReminder: true }).catch(err => ({ sent: false, error: err.message }));
    if (r.sent) sent++;
    else { failed++; if (r.simulated) simulated++; lastErr = r.error || (r.simulated ? 'email not configured (simulated)' : lastErr); }
  }
  updateOne('approvals', a => a.id === req.params.id, {
    last_reminder_at: new Date().toISOString(),
    last_email_error: failed > 0 ? lastErr : null,
  });
  return res.json({ ok: sent > 0, sent, simulated, failed, error: failed > 0 ? lastErr : null });
});

// WITHDRAW
router.post('/:id/withdraw', (req, res) => {
  ensureTables();
  const updated = updateOne('approvals', a => a.id === req.params.id, { status: 'withdrawn', resolved_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  return res.json(updated);
});

// DELETE
router.delete('/:id', (req, res) => {
  ensureTables();
  const removed = removeOne('approvals', a => a.id === req.params.id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  return res.json({ ok: true });
});

// TEMPLATES - list
router.get('/templates/list', (req, res) => {
  ensureTables();
  const { environment_id } = req.query;
  return res.json(query('approval_templates', t => !environment_id || t.environment_id === environment_id)
    .sort((a, b) => a.name.localeCompare(b.name)));
});

// TEMPLATES - create
router.post('/templates/list', (req, res) => {
  ensureTables();
  const { environment_id, name, description, mode, majority_threshold,
    approver_configs, on_approved, on_declined, expires_hours, reminder_hours } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const t = {
    id: uuidv4(), environment_id: environment_id || null, name, description: description || null,
    mode: mode || 'sequential', majority_threshold: majority_threshold || null,
    approver_configs: approver_configs || [], on_approved: on_approved || { action: 'none' },
    on_declined: on_declined || { action: 'none' }, expires_hours: expires_hours || null,
    reminder_hours: reminder_hours || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  insert('approval_templates', t);
  return res.status(201).json(t);
});

router.patch('/templates/list/:id', (req, res) => {
  ensureTables();
  const updated = updateOne('approval_templates', t => t.id === req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  return res.json(updated);
});

router.delete('/templates/list/:id', (req, res) => {
  ensureTables();
  removeOne('approval_templates', t => t.id === req.params.id);
  return res.json({ ok: true });
});

// Export helpers for use by workflow and agent runners
module.exports = router;
module.exports.sendApprovalEmailDirect = sendApprovalEmail;
module.exports.resolveApprovers = resolveApprovers;
module.exports.computeOutcome = computeOutcome;
module.exports.pendingApprovers = pendingApprovers;

