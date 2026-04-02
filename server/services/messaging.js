/**
 * Vercentic Messaging Service
 * Handles SMS, WhatsApp, and Email dispatch via Twilio (SMS/WA) and SendGrid (Email).
 *
 * Credentials can be set via:
 *   1. Environment variables (.env file)
 *   2. Settings → Integrations (saved to store, applied to process.env at runtime)
 *
 * The service checks process.env DYNAMICALLY on every call, so credentials
 * saved via the Integrations UI take effect immediately without a server restart.
 */

// ─── Dynamic credential checks (evaluated on every call, not once at startup) ─
function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_ACCOUNT_SID !== 'YOUR_ACCOUNT_SID'
  );
}

function isSendGridConfigured() {
  return !!(
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY !== 'YOUR_SENDGRID_KEY'
  );
}

function isResendConfigured() {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== 'YOUR_RESEND_KEY'
  );
}

// ─── Lazy Twilio client (created on first use, recreated if credentials change)
let _twilioClient = null;
let _twilioSid = null;

function getTwilioClient() {
  if (!isTwilioConfigured()) return null;
  if (_twilioClient && _twilioSid === process.env.TWILIO_ACCOUNT_SID) return _twilioClient;
  try {
    _twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    _twilioSid = process.env.TWILIO_ACCOUNT_SID;
    console.log('[messaging] Twilio client initialised (LIVE)');
    return _twilioClient;
  } catch (e) {
    console.warn('[messaging] Twilio init failed:', e.message);
    return null;
  }
}

console.log(`[messaging] Twilio: ${isTwilioConfigured() ? 'LIVE' : 'SIMULATION (no credentials)'}`);
console.log(`[messaging] Email: ${isResendConfigured() ? 'Resend LIVE' : isSendGridConfigured() ? 'SendGrid LIVE' : 'SIMULATION (no credentials)'}`);

// ─── SMS ─────────────────────────────────────────────────────────────────────
async function sendSMS({ to, body }) {
  const client = getTwilioClient();
  if (!client) {
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  const msg = await client.messages.create({
    body,
    from: process.env.TWILIO_SMS_NUMBER,
    to,
    statusCallback: process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/comms/webhook/sms-status`
      : undefined,
  });
  return { sid: msg.sid, status: msg.status };
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
async function sendWhatsApp({ to, body }) {
  const client = getTwilioClient();
  if (!client) {
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  const from = process.env.TWILIO_WA_NUMBER || `whatsapp:${process.env.TWILIO_SMS_NUMBER}`;
  const toWA = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const msg = await client.messages.create({
    body,
    from,
    to: toWA,
    statusCallback: process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/comms/webhook/wa-status`
      : undefined,
  });
  return { sid: msg.sid, status: msg.status };
}

// ─── Email (Resend or SendGrid) ───────────────────────────────────────────────
async function sendEmail({ to, toName, subject, body, text, html }) {
  const textBody = text || body || '';
  const htmlBody = html || textBody.replace(/\n/g, '<br>');

  if (isResendConfigured()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${process.env.SENDGRID_FROM_NAME || 'Vercentic'} <${process.env.SENDGRID_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: toName ? [{ email: to, name: toName }] : [to],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend error');
    return { messageId: data.id, status: 'sent', provider: 'resend' };
  }

  if (isSendGridConfigured()) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const [response] = await sgMail.send({
      to: toName ? { email: to, name: toName } : to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@talentos.io',
        name:  process.env.SENDGRID_FROM_NAME  || 'Vercentic',
      },
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { messageId: response.headers['x-message-id'], status: 'sent', provider: 'sendgrid' };
  }

  console.log(`[email-sim] To: ${to} | Subject: ${subject}`);
  return { simulated: true, messageId: `sim_${Date.now()}`, status: 'simulated' };
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function getProviderStatus() {
  return {
    sms:       isTwilioConfigured()                            ? 'live' : 'simulation',
    whatsapp:  isTwilioConfigured()                            ? 'live' : 'simulation',
    email:     isResendConfigured() || isSendGridConfigured()   ? 'live' : 'simulation',
    email_provider: isResendConfigured() ? 'resend' : isSendGridConfigured() ? 'sendgrid' : 'none',
  };
}

module.exports = { sendSMS, sendWhatsApp, sendEmail, getProviderStatus };
