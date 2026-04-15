// server/routes/digest.js — daily digest email sender
// POST /api/digest/send  — send digest to a specific email (or all opted-in users)
// GET  /api/digest/preview — return the HTML for the digest (for testing)
const express = require('express');
const router  = express.Router();
const https   = require('https');
const { getStore, getCurrentTenant } = require('../db/init');

const PRIO = { urgent:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' };

const formatTime = t => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

function buildDigestData(environmentId, storeOverride) {
  const store = storeOverride || getStore();
  const today = new Date().toISOString().slice(0, 10);
  const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3);
  const threeStr  = threeDays.toISOString().slice(0, 10);

  const tasks = (store.calendar_tasks || []).filter(t =>
    !t.deleted_at && t.status !== 'done' &&
    (!environmentId || t.environment_id === environmentId) &&
    t.due_date && t.due_date <= today
  ).sort((a, b) => (a.due_date||'').localeCompare(b.due_date||''));

  const interviews = (store.interviews || []).filter(i =>
    !i.deleted_at && i.date === today &&
    (!environmentId || i.environment_id === environmentId)
  );

  const offers = (store.offers || []).filter(o =>
    !o.deleted_at && o.status === 'sent' &&
    (!environmentId || o.environment_id === environmentId) &&
    o.expiry_date && o.expiry_date >= today && o.expiry_date <= threeStr
  );

  return {
    date: today,
    tasks_overdue: tasks.filter(t => t.due_date < today),
    tasks_today:   tasks.filter(t => t.due_date === today),
    interviews_today: interviews,
    offers_expiring: offers,
  };
}

function buildHtml(digest, recipientName) {
  const dayName = new Date(digest.date + 'T12:00:00').toLocaleDateString('en-GB',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const taskRow = t => `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PRIO[t.priority]||'#9ca3af'};margin-right:10px;vertical-align:middle;"></span>
      <strong style="color:#111827;font-size:13px;">${t.title}</strong>
      ${t.record_name ? `<span style="color:#9ca3af;font-size:12px;margin-left:8px;">· ${t.record_name}</span>` : ''}
    </td>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#6b7280;font-size:12px;white-space:nowrap;">${t.due_date}</td>
  </tr>`;

  const interviewRow = i => `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
      <strong style="color:#111827;font-size:13px;">${i.candidate_name}</strong>
      <span style="color:#9ca3af;font-size:12px;margin-left:6px;">for ${i.job_title||i.job_name||''}</span><br>
      <span style="color:#6b7280;font-size:12px;">${i.type_name||''} · ${i.format||''} · ${i.duration_minutes||45} min</span>
    </td>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#4361EE;font-size:13px;font-weight:700;white-space:nowrap;">${formatTime(i.time)}</td>
  </tr>`;

  const offerRow = o => `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
      <strong style="color:#111827;font-size:13px;">${o.candidate_name||'Candidate'}</strong>
      ${o.job_title ? `<span style="color:#9ca3af;font-size:12px;margin-left:8px;">· ${o.job_title}</span>` : ''}
    </td>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#ef4444;font-size:12px;white-space:nowrap;">Expires ${o.expiry_date}</td>
  </tr>`;

  const section = (title, color, icon, rows, emptyMsg) =>
    `<div style="margin-bottom:24px;">
      <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:${color};">${icon} ${title}</h3>
      ${rows.length
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">${rows.join('')}</table>`
        : `<p style="color:#9ca3af;font-size:13px;margin:0;padding:12px 16px;background:#f9fafb;border-radius:8px;">${emptyMsg}</p>`}
    </div>`;

  const stats = [
    { label:'Overdue', val: digest.tasks_overdue.length, col: digest.tasks_overdue.length ? '#f87171' : '#6b7280' },
    { label:'Due today', val: digest.tasks_today.length, col: digest.tasks_today.length ? '#fbbf24' : '#6b7280' },
    { label:'Interviews', val: digest.interviews_today.length, col: digest.interviews_today.length ? '#60a5fa' : '#6b7280' },
    { label:'Expiring offers', val: digest.offers_expiring.length, col: digest.offers_expiring.length ? '#f87171' : '#6b7280' },
  ];

  const totalActions = digest.tasks_overdue.length + digest.tasks_today.length +
    digest.interviews_today.length + digest.offers_expiring.length;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Daily Digest — ${dayName}</title></head>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#3b5bdb,#7c3aed);border-radius:16px 16px 0 0;padding:32px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><div style="font-size:22px;font-weight:800;color:#fff;">Vercentic</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);">Daily Digest${recipientName ? ` for ${recipientName}` : ''}</div></td>
    <td align="right"><div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 14px;">
      <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:.06em;">Today</div>
      <div style="font-size:15px;font-weight:700;color:#fff;">${dayName}</div>
    </div></td>
  </tr></table>
</td></tr>

<tr><td style="background:#1e1b4b;padding:16px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    ${stats.map(s => `<td align="center" style="padding:0 8px;border-right:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:22px;font-weight:800;color:${s.col};">${s.val}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${s.label}</div>
    </td>`).join('')}
  </tr></table>
</td></tr>

<tr><td style="background:#fff;padding:32px 36px;border-radius:0 0 16px 16px;">
  ${totalActions === 0 ? '<p style="text-align:center;color:#9ca3af;font-size:15px;padding:20px 0;">✅ All clear — nothing requires your attention today.</p>' : ''}
  ${section('Overdue Tasks', '#ef4444', '⚠️', digest.tasks_overdue.map(taskRow), 'No overdue tasks — great work!')}
  ${section('Due Today', '#f97316', '📋', digest.tasks_today.map(taskRow), 'No tasks due today.')}
  ${section('Interviews Today', '#4361EE', '🗓', digest.interviews_today.map(interviewRow), 'No interviews scheduled today.')}
  ${digest.offers_expiring.length ? section('Offers Expiring Soon', '#7c3aed', '💼', digest.offers_expiring.map(offerRow), '') : ''}
  <div style="text-align:center;margin-top:24px;">
    <a href="https://www.vercentic.com" style="display:inline-block;background:linear-gradient(135deg,#3b5bdb,#7c3aed);color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">Open Vercentic →</a>
  </div>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0f0f0;text-align:center;color:#9ca3af;font-size:11px;">
    Daily digest from Vercentic · <a href="https://www.vercentic.com/settings" style="color:#4361EE;">Manage preferences</a>
  </div>
</td></tr>

</table></td></tr></table></body></html>`;
}

async function sendEmail(to, toName, subject, html) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from   = process.env.SENDGRID_FROM_EMAIL;
  const fromN  = process.env.SENDGRID_FROM_NAME || 'Vercentic';
  if (!apiKey || !from) throw new Error('SendGrid not configured');

  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to, name: toName||'' }] }],
    from: { email: from, name: fromN },
    subject,
    content: [{ type: 'text/html', value: html }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com', path: '/v3/mail/send', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => res.statusCode === 202 ? resolve({ ok: true }) : reject(new Error(`SendGrid ${res.statusCode}: ${body}`)));
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

// GET /api/digest/preview — return rendered HTML (view in browser)
router.get('/preview', (req, res) => {
  try {
    const { environment_id } = req.query;
    const digest = buildDigestData(environment_id);
    const html = buildHtml(digest, null);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/digest/send — send to a single email address
// body: { to_email, to_name?, environment_id? }
router.post('/send', async (req, res) => {
  try {
    const { to_email, to_name, environment_id } = req.body;
    if (!to_email) return res.status(400).json({ error: 'to_email required' });

    const digest  = buildDigestData(environment_id);
    const subject = `📋 Your Daily Digest — ${new Date(digest.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}`;
    const html    = buildHtml(digest, to_name);

    await sendEmail(to_email, to_name, subject, html);
    res.json({
      ok: true, sent_to: to_email,
      summary: {
        tasks_overdue: digest.tasks_overdue.length,
        tasks_today: digest.tasks_today.length,
        interviews_today: digest.interviews_today.length,
        offers_expiring: digest.offers_expiring.length,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.buildDigestData = buildDigestData;
module.exports.buildHtml = buildHtml;
module.exports.sendEmail = sendEmail;
