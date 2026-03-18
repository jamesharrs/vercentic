/**
 * TalentOS Messaging Service
 * Handles SMS, WhatsApp, and Email dispatch via Twilio (SMS/WA) and SendGrid (Email).
 *
 * SETUP — add these to server/.env:
 *
 *   # Twilio (SMS + WhatsApp)
 *   TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
 *   TWILIO_SMS_NUMBER=+14155552671
 *   TWILIO_WA_NUMBER=whatsapp:+14155552671
 *
 *   # SendGrid (Email)
 *   SENDGRID_API_KEY=YOUR_SENDGRID_KEY
 *   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 *   SENDGRID_FROM_NAME=TalentOS
 *
 *   # Twilio Webhook (inbound messages)
 *   WEBHOOK_BASE_URL=https://your-railway-url.up.railway.app
 *
 * Until credentials are configured the service runs in SIMULATION mode —
 * messages are saved to the DB but not actually dispatched.
 */

const TWILIO_CONFIGURED = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_ACCOUNT_SID !== 'YOUR_ACCOUNT_SID'
);

const SENDGRID_CONFIGURED = !!(
  process.env.SENDGRID_API_KEY &&
  process.env.SENDGRID_API_KEY !== 'YOUR_SENDGRID_KEY'
);
const RESEND_CONFIGURED = !!(
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY !== 'YOUR_RESEND_KEY'
);

let twilioClient = null;
if (TWILIO_CONFIGURED) {
  try {
    twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('[messaging] Twilio: LIVE');
  } catch (e) {
    console.warn('[messaging] Twilio init failed:', e.message);
  }
} else {
  console.log('[messaging] Twilio: SIMULATION (no credentials)');
}

if (SENDGRID_CONFIGURED) {
  console.log('[messaging] SendGrid: LIVE');
} else {
  console.log('[messaging] SendGrid: SIMULATION (no credentials)');
}

// ─── SMS ─────────────────────────────────────────────────────────────────────
async function sendSMS({ to, body }) {
  if (!twilioClient) {
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  const msg = await twilioClient.messages.create({
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
  if (!twilioClient) {
    return { simulated: true, sid: `sim_${Date.now()}`, status: 'simulated' };
  }
  // Twilio WhatsApp requires whatsapp: prefix on both sides
  const from = process.env.TWILIO_WA_NUMBER || `whatsapp:${process.env.TWILIO_SMS_NUMBER}`;
  const toWA = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const msg = await twilioClient.messages.create({
    body,
    from,
    to: toWA,
    statusCallback: process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/comms/webhook/wa-status`
      : undefined,
  });
  return { sid: msg.sid, status: msg.status };
}

// ─── Email (SendGrid or Resend) ───────────────────────────────────────────────
async function sendEmail({ to, toName, subject, body, text, html }) {
  const textBody = text || body || '';
  const htmlBody = html || textBody.replace(/\n/g, '<br>');

  // Try Resend first (simpler setup, free tier)
  if (RESEND_CONFIGURED) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${process.env.SENDGRID_FROM_NAME || 'TalentOS'} <${process.env.SENDGRID_FROM_EMAIL || 'onboarding@resend.dev'}>`,
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

  // Fall back to SendGrid
  if (SENDGRID_CONFIGURED) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const [response] = await sgMail.send({
      to: toName ? { email: to, name: toName } : to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@talentos.io',
        name:  process.env.SENDGRID_FROM_NAME  || 'TalentOS',
      },
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { messageId: response.headers['x-message-id'], status: 'sent', provider: 'sendgrid' };
  }

  // Simulation mode
  console.log(`[email-sim] To: ${to} | Subject: ${subject}`);
  return { simulated: true, messageId: `sim_${Date.now()}`, status: 'simulated' };
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function getProviderStatus() {
  return {
    sms:       TWILIO_CONFIGURED                       ? 'live' : 'simulation',
    whatsapp:  TWILIO_CONFIGURED                       ? 'live' : 'simulation',
    email:     RESEND_CONFIGURED || SENDGRID_CONFIGURED ? 'live' : 'simulation',
    email_provider: RESEND_CONFIGURED ? 'resend' : SENDGRID_CONFIGURED ? 'sendgrid' : 'none',
  };
}

module.exports = { sendSMS, sendWhatsApp, sendEmail, getProviderStatus };
