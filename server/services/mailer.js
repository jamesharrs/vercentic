/**
 * mailer.js — Vercentic central email service powered by Resend
 *
 * Sending priority:
 *   1. Client's verified custom domain (e.g. jobs@acme.com)            — per-environment setting
 *   2. Auto-provisioned subdomain     (noreply@slug.mail.vercentic.com) — auto-created per tenant
 *   3. Vercentic default              (noreply@mail.vercentic.com)      — platform fallback
 *   4. Simulation mode                (logs only, no real send)          — when RESEND_API_KEY not set
 */

const { getStore, saveStore } = require('../db/init');

let _resend = null;
function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const { Resend } = require('resend');
  _resend = new Resend(key);
  return _resend;
}

// Invalidate cached client when key changes at runtime (SuperAdmin env editor)
function resetResendClient() { _resend = null; }

// ── Default from address ──────────────────────────────────────────────────────
const DEFAULT_FROM_DOMAIN = process.env.RESEND_DEFAULT_DOMAIN || 'mail.vercentic.com';
const DEFAULT_FROM_NAME   = process.env.RESEND_DEFAULT_FROM_NAME || 'Vercentic';
const DEFAULT_FROM        = `${DEFAULT_FROM_NAME} <noreply@${DEFAULT_FROM_DOMAIN}>`;

// ── Get the verified sending domain for an environment ─────────────────────────
function getClientEmailDomain(environmentId) {
  if (!environmentId) return null;
  const store = getStore();
  const cfg = (store.email_domain_configs || []).find(
    c => c.environment_id === environmentId && c.status === 'verified'
  );
  return cfg || null;
}

// ── Core send function ─────────────────────────────────────────────────────────
// ── Auto-provision a subdomain for an environment (slug.mail.vercentic.com) ───
// Called lazily the first time an environment sends email without a custom domain.
async function getOrProvisionSubdomain(environmentId) {
  if (!environmentId) return null;
  const resend = getResend();
  if (!resend) return null;

  const store = getStore();
  if (!store.email_domain_configs) store.email_domain_configs = [];

  // Already provisioned (any status)?
  const existing = store.email_domain_configs.find(c => c.environment_id === environmentId);
  if (existing) return existing.status === 'verified' ? existing : null;

  // Derive slug from environment name or id
  const env = (store.environments || []).find(e => e.id === environmentId);
  const rawSlug = (env?.name || environmentId)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const subdomain = `${rawSlug}.${DEFAULT_FROM_DOMAIN}`; // e.g. acme-corp.mail.vercentic.com

  try {
    const cfg = await registerClientDomain({
      environmentId,
      domain:     subdomain,
      fromEmail:  'noreply',
      fromName:   env?.name || DEFAULT_FROM_NAME,
    });
    console.log(`[mailer] Auto-provisioned subdomain ${subdomain} for env ${environmentId}`);
    return cfg.status === 'verified' ? cfg : null;
  } catch (err) {
    console.warn(`[mailer] Subdomain auto-provision failed for ${subdomain}:`, err.message);
    return null;
  }
}

async function sendEmail({ to, subject, html, text, from, replyTo, environmentId, attachments }) {
  const resend = getResend();

  // Resolve from address — custom domain > auto-subdomain > platform default
  let fromAddr = from;
  if (!fromAddr) {
    const clientDomain = getClientEmailDomain(environmentId);
    if (clientDomain) {
      fromAddr = `${clientDomain.from_name || DEFAULT_FROM_NAME} <${clientDomain.from_email}@${clientDomain.domain}>`;
    } else {
      // Try auto-provisioned subdomain (non-blocking — if not verified yet, fall back)
      const subdomain = await getOrProvisionSubdomain(environmentId).catch(() => null);
      fromAddr = subdomain
        ? `${subdomain.from_name || DEFAULT_FROM_NAME} <${subdomain.from_email}@${subdomain.domain}>`
        : DEFAULT_FROM;
    }
  }

  if (!resend) {
    console.log(`[mailer] SIMULATION — to:${to} from:${fromAddr} subject:"${subject}"`);
    return { simulated: true, id: `sim_${Date.now()}`, to, from: fromAddr, subject };
  }

  try {
    const payload = { from: fromAddr, to: Array.isArray(to) ? to : [to], subject };
    if (html)        payload.html        = html;
    if (text)        payload.text        = text;
    if (replyTo)     payload.reply_to    = replyTo;
    if (attachments) payload.attachments = attachments;

    const { data, error } = await resend.emails.send(payload);
    if (error) throw new Error(error.message || JSON.stringify(error));

    console.log(`[mailer] Sent — id:${data.id} to:${to}`);
    return { ok: true, id: data.id, from: fromAddr };
  } catch (err) {
    console.error(`[mailer] Send failed:`, err.message);
    throw err;
  }
}

// ── Domain management (Resend Domains API) ─────────────────────────────────────
async function registerClientDomain({ environmentId, domain, fromEmail, fromName }) {
  const resend = getResend();
  if (!resend) throw new Error('Resend API key not configured — set RESEND_API_KEY in Super Admin → Global Integrations');

  // Create domain in Resend
  const { data, error } = await resend.domains.create({ name: domain });
  if (error) throw new Error(error.message || JSON.stringify(error));

  // Persist to store
  const store = getStore();
  if (!store.email_domain_configs) store.email_domain_configs = [];

  // Remove any existing config for this environment
  store.email_domain_configs = store.email_domain_configs.filter(c => c.environment_id !== environmentId);

  const cfg = {
    id:             data.id,
    environment_id: environmentId,
    domain,
    from_email:     fromEmail || 'noreply',
    from_name:      fromName  || DEFAULT_FROM_NAME,
    status:         data.status || 'pending',
    records:        data.records || [],
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };
  store.email_domain_configs.push(cfg);
  saveStore();
  return cfg;
}

async function checkDomainStatus(environmentId) {
  const store = getStore();
  const cfg = (store.email_domain_configs || []).find(c => c.environment_id === environmentId);
  if (!cfg) return null;

  const resend = getResend();
  if (!resend) return cfg;

  try {
    const { data, error } = await resend.domains.get(cfg.id);
    if (error) throw new Error(error.message);

    // Update stored status
    cfg.status     = data.status;
    cfg.records    = data.records || cfg.records;
    cfg.updated_at = new Date().toISOString();
    saveStore();
    return cfg;
  } catch (err) {
    console.error('[mailer] Domain status check failed:', err.message);
    return cfg;
  }
}

async function deleteClientDomain(environmentId) {
  const store = getStore();
  const cfg = (store.email_domain_configs || []).find(c => c.environment_id === environmentId);
  if (!cfg) return;

  const resend = getResend();
  if (resend) {
    try { await resend.domains.delete(cfg.id); } catch (e) { /* ignore if already gone */ }
  }

  store.email_domain_configs = (store.email_domain_configs || []).filter(c => c.environment_id !== environmentId);
  saveStore();
}

// ── Test connection ────────────────────────────────────────────────────────────
async function testConnection() {
  const resend = getResend();
  if (!resend) return { ok: false, error: 'RESEND_API_KEY not set' };
  try {
    // List domains as a lightweight connectivity test
    const { data, error } = await resend.domains.list();
    if (error) throw new Error(error.message);
    return { ok: true, domain_count: data?.data?.length ?? 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  registerClientDomain,
  checkDomainStatus,
  deleteClientDomain,
  testConnection,
  resetResendClient,
  getClientEmailDomain,
  getOrProvisionSubdomain,
  DEFAULT_FROM,
  DEFAULT_FROM_DOMAIN,
};
