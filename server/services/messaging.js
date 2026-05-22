/**
 * Vercentic Messaging Service — updated to use MailerSend as primary email provider.
 *
 * Email provider priority:
 *   1. MailerSend (MAILERSEND_API_KEY) — primary, per-client domains + reply tracking
 *   2. Resend      (RESEND_API_KEY)    — simple fallback
 *   3. SendGrid    (SENDGRID_API_KEY)  — legacy fallback
 *   4. Simulation  — if none configured
 */

const TWILIO_CONFIGURED = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  !process.env.TWILIO_ACCOUNT_SID.startsWith('YOUR_')
);

const MAILERSEND_CONFIGURED = !!(
  process.env.MAILERSEND_API_KEY &&
  !process.env.MAILERSEND_API_KEY.startsWith('YOUR_')
);

const RESEND_CONFIGURED = !!(
  process.env.RESEND_API_KEY &&
  !process.env.RESEND_API_KEY.startsWith('YOUR_')
);

const SENDGRID_CONFIGURED = !!(
  process.env.SENDGRID_API_KEY &&
  !process.env.SENDGRID_API_KEY.startsWith('YOUR_')
);

// ─── Twilio ───────────────────────────────────────────────────────────────────
let twilioClient = null;
if (TWILIO_CONFIGURED) {
  try {
    twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[messaging] Twilio: LIVE');
  } catch (e) { console.warn('[messaging] Twilio init failed:', e.message); }
} else {
  console.log('[messaging] Twilio: SIMULATION (no credentials)');
}

const emailProvider = MAILERSEND_CONFIGURED ? 'mailersend'
  : RESEND_CONFIGURED    ? 'resend'
  : SENDGRID_CONFIGURED  ? 'sendgrid'
  : 'none';
console.log(`[messaging] Email: ${emailProvider === 'none' ? 'SIMULATION' : `LIVE via ${emailProvider}`}`);

// ─── SMS ──────────────────────────────────────────────────────────────────────
async function sendSMS({ to, body }) {
  if (!twilioClient) {
    console.log(`[sms-sim] To: ${to} | Body: ${body?.slice(0, 60)}`);
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  const msg = await twilioClient.messages.create({
    body, from: process.env.TWILIO_SMS_NUMBER, to,
    statusCallback: process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/comms/webhook/sms-status` : undefined,
  });
  return { sid: msg.sid, status: msg.status };
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
async function sendWhatsApp({ to, body }) {
  if (!twilioClient) {
    console.log(`[wa-sim] To: ${to} | Body: ${body?.slice(0, 60)}`);
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  const from = process.env.TWILIO_WA_NUMBER || `whatsapp:${process.env.TWILIO_SMS_NUMBER}`;
  const toWA = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const msg  = await twilioClient.messages.create({
    body, from, to: toWA,
    statusCallback: process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/comms/webhook/wa-status` : undefined,
  });
  return { sid: msg.sid, status: msg.status };
}

// ─── Email ────────────────────────────────────────────────────────────────────
async function sendEmail({ to, toName, from, fromName, replyTo, subject, body, text, html, tags }) {
  const textBody = text || body || '';
  const htmlBody = html || textBody.replace(/\n/g, '<br>');

  // ── MailerSend (primary) ──────────────────────────────────────────────────
  if (MAILERSEND_CONFIGURED) {
    const ms = require('./mailersend');
    return ms.sendEmail({ to, toName, from, fromName, replyTo, subject, text: textBody, html: htmlBody, tags });
  }

  // ── Resend (via mailer.js — handles per-environment custom domains) ──────────
  if (RESEND_CONFIGURED) {
    const mailer = require('./mailer');
    const result = await mailer.sendEmail({
      to, subject,
      html: htmlBody,
      text: textBody,
      from: from ? `${fromName || 'Vercentic'} <${from}>` : undefined,
      replyTo,
      environmentId: tags?.environment_id, // pass env so mailer picks the right domain
    });
    return { messageId: result.id, status: result.simulated ? 'simulated' : 'sent', provider: 'resend' };
  }

  // ── SendGrid (legacy) ─────────────────────────────────────────────────────
  if (SENDGRID_CONFIGURED) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const payload = {
      to: toName ? { email: to, name: toName } : to,
      from: { email: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@vercentic.com',
               name:  fromName || process.env.SENDGRID_FROM_NAME || 'Vercentic' },
      subject, text: textBody, html: htmlBody,
    };
    if (replyTo) payload.replyTo = replyTo;
    const [response] = await sgMail.send(payload);
    return { messageId: response.headers['x-message-id'], status: 'sent', provider: 'sendgrid' };
  }

  // ── Simulation ─────────────────────────────────────────────────────────────
  console.log(`[email-sim] To: ${to} | Subject: ${subject} | ReplyTo: ${replyTo || 'none'}`);
  return { simulated: true, messageId: `sim_${Date.now()}`, status: 'simulated' };
}

// ─── Status ───────────────────────────────────────────────────────────────────
function getProviderStatus() {
  return {
    sms:            TWILIO_CONFIGURED              ? 'live' : 'simulation',
    whatsapp:       TWILIO_CONFIGURED              ? 'live' : 'simulation',
    email:          emailProvider !== 'none'       ? 'live' : 'simulation',
    email_provider: emailProvider,
  };
}

module.exports = { sendSMS, sendWhatsApp, sendEmail, getProviderStatus };
