// server/services/emailTemplate.js
// Wraps email content in the Vercentic branded HTML template.
'use strict';

const APP_URL = process.env.APP_URL || 'https://app.vercentic.com';

const ICON_BLACK = `<svg width="22" height="22" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none" opacity="0.26"/><path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none" opacity="0.26"/><path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none"/><path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="#000" stroke-width="3.5" stroke-linejoin="round" fill="none" opacity="0.26"/></svg>`;

const ICON_WHITE = ICON_BLACK.replace(/stroke="#000"/g, 'stroke="white"');

const CSS = `*{margin:0;padding:0;box-sizing:border-box}body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Geist:wght@300;400;500;600&display=swap');body{background-color:#f4f4f5;font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#000}.preview-text{display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all}.email-wrapper{width:100%;background-color:#f4f4f5;padding:40px 16px}.email-container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7}.email-header{background:radial-gradient(ellipse at 12% 48%,rgba(200,180,232,.75) 0%,transparent 52%),radial-gradient(ellipse at 78% 18%,rgba(232,180,200,.6) 0%,transparent 48%),radial-gradient(ellipse at 88% 84%,rgba(240,200,152,.6) 0%,transparent 48%),radial-gradient(ellipse at 28% 88%,rgba(180,200,232,.55) 0%,transparent 44%),radial-gradient(ellipse at 50% 50%,rgba(232,216,240,.65) 0%,transparent 60%),#f0eaf8;padding:40px 48px}.header-logo{display:flex;align-items:center;gap:10px;margin-bottom:40px}.header-logo-wordmark{font-family:'Space Grotesk',-apple-system,sans-serif;font-size:18px;font-weight:700;letter-spacing:-.4px;color:#000}.header-eyebrow{font-family:'Geist',sans-serif;font-size:11px;font-weight:600;letter-spacing:.10em;text-transform:uppercase;color:rgba(0,0,0,.4);margin-bottom:12px}.header-headline{font-family:'Space Grotesk',sans-serif;font-size:32px;font-weight:700;letter-spacing:-.8px;line-height:1.2;color:#000;margin-bottom:16px}.header-subline{font-family:'Geist',sans-serif;font-size:15px;font-weight:400;line-height:1.6;color:#3f3f46}.email-body{padding:40px 48px;border-bottom:1px solid #e4e4e7}.greeting{font-family:'Geist',sans-serif;font-size:15px;line-height:1.7;color:#000;margin-bottom:20px}.body-text{font-family:'Geist',sans-serif;font-size:15px;line-height:1.7;color:#3f3f46;margin-bottom:28px}.cta-wrapper{margin:32px 0}.cta-button{display:inline-block;padding:13px 28px;background-color:#000;color:#fff!important;text-decoration:none;border-radius:6px;font-family:'Geist',sans-serif;font-size:14px;font-weight:500}.cta-secondary{display:inline-block;padding:13px 28px;background-color:#fff;color:#000!important;text-decoration:none;border-radius:6px;border:1px solid #e4e4e7;font-family:'Geist',sans-serif;font-size:14px;font-weight:500;margin-left:12px}.divider{height:1px;background-color:#e4e4e7;margin:28px 0}.email-footer{padding:32px 48px;background-color:#000}.footer-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px}.footer-wordmark{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;letter-spacing:-.3px;color:#fff}.footer-tagline{font-family:'Geist',sans-serif;font-size:13px;color:rgba(255,255,255,.45);margin-bottom:24px;line-height:1.5}.footer-links{margin-bottom:20px}.footer-links a{font-family:'Geist',sans-serif;font-size:12px;color:rgba(255,255,255,.45);text-decoration:none;margin-right:20px}.footer-divider{height:1px;background-color:rgba(255,255,255,.07);margin:20px 0}.footer-legal{font-family:'Geist',sans-serif;font-size:11px;color:rgba(255,255,255,.25);line-height:1.6}@media only screen and (max-width:640px){.email-wrapper{padding:20px 12px}.email-header,.email-body,.email-footer{padding:28px 24px}.header-headline{font-size:26px}.cta-secondary{margin-left:0;margin-top:12px;display:block}}`;

function wrapEmail({ eyebrow='', headline='', subline='', greeting='', body='', cta=null, ctaSecondary=null, previewText='', sender='The Vercentic Team' }) {
  const ctaHtml = cta ? `<div class="cta-wrapper"><a href="${cta.url}" class="cta-button">${cta.text}</a>${ctaSecondary ? `<a href="${ctaSecondary.url}" class="cta-secondary">${ctaSecondary.text}</a>` : ''}</div>` : '';
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Vercentic</title><style>${CSS}</style></head>
<body>
<div class="preview-text">${previewText}&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;</div>
<div class="email-wrapper">
<table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td class="email-header">
  <div class="header-logo">${ICON_BLACK}<span class="header-logo-wordmark">Vercentic</span></div>
  ${eyebrow ? `<div class="header-eyebrow">${eyebrow}</div>` : ''}
  ${headline ? `<h1 class="header-headline">${headline}</h1>` : ''}
  ${subline ? `<p class="header-subline">${subline}</p>` : ''}
</td></tr>
<tr><td class="email-body">
  ${greeting ? `<p class="greeting">${greeting}</p>` : ''}
  ${body}
  ${ctaHtml}
  <div class="divider"></div>
  <p style="font-family:'Geist',sans-serif;font-size:15px;font-weight:500;color:#000;margin-bottom:4px;">${sender}</p>
  <p style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;">Vercentic Platform</p>
</td></tr>
<tr><td class="email-footer">
  <div class="footer-logo">${ICON_WHITE}<span class="footer-wordmark">Vercentic</span></div>
  <p class="footer-tagline">The Enterprise People Platform.<br>AI-powered talent operations, built for complexity.</p>
  <div class="footer-divider"></div>
  <div class="footer-links">
    <a href="${APP_URL}/privacy">Privacy Policy</a>
    <a href="${APP_URL}/terms">Terms of Service</a>
    <a href="{{unsubscribe_url}}">Unsubscribe</a>
    <a href="https://help.vercentic.com">Help Centre</a>
  </div>
  <p class="footer-legal">This email was sent by Vercentic.<br>Vercentic Ltd &middot; Dubai, UAE &nbsp;&middot;&nbsp; &copy; ${year} Vercentic. All rights reserved.</p>
</td></tr>
</table>
</div>
</body></html>`;
}

const LI = (t, d) => `<li style="font-family:'Geist',sans-serif;font-size:14px;color:#3f3f46;padding:8px 0 8px 20px;position:relative;border-bottom:1px solid #f4f4f5;"><span style="position:absolute;left:0;top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:#000;display:block;"></span><strong style="color:#000;">${t}</strong>${d ? ' — ' + d : ''}</li>`;

function buildSequencerTemplates() {
  return [
    { id:'vtpl_welcome', name:'Welcome to Vercentic', category:'onboarding', trigger:'account_created', tags:['onboarding'],
      subject:'Welcome to Vercentic, {{admin_first_name}}!',
      body_html: wrapEmail({ eyebrow:'Welcome aboard', headline:'Great to have you.', subline:'Your account is all set up and ready to go.', greeting:'Hi {{admin_first_name}},', previewText:'Your Vercentic account is ready. Log in to get started.',
        body:`<p class="body-text">We're thrilled to have <strong style="color:#000;">{{client_name}}</strong> on board. Your environment is provisioned and ready.</p><ul style="list-style:none;padding:0;margin:0 0 28px;">${LI('Invite your team','add colleagues from Settings → Users')}${LI('Import your data','use CSV import to bring in existing candidates')}${LI('Try the Copilot','ask it to create records, draft emails, or match candidates')}</ul>`,
        cta:{ text:'Log in to Vercentic', url:'{{login_url}}' } }),
      body_text:'Hi {{admin_first_name}}, Welcome to Vercentic! Your account for {{client_name}} is ready. Log in at: {{login_url}}. The Vercentic Team' },
    { id:'vtpl_day3', name:'Day 3 Check-in', category:'onboarding', trigger:'day_3', tags:['onboarding'],
      subject:"How's your first week with Vercentic, {{admin_first_name}}?",
      body_html: wrapEmail({ eyebrow:'Day 3 check-in', headline:"How's it going?", subline:'A few things worth exploring in your first week.', greeting:'Hi {{admin_first_name}},', previewText:"It's been a few days — here's what to try next.",
        body:`<p class="body-text">A few days in at <strong style="color:#000;">{{client_name}}</strong> — hope things are going well. Here's what our new customers find most useful in week one:</p><ul style="list-style:none;padding:0;margin:0 0 28px;">${LI('Set up your data model','add custom fields specific to your hiring process')}${LI('Create a workflow','define your hiring stages and automate routine steps')}${LI('Connect your email','link SMTP to send emails directly from the platform')}</ul>`,
        cta:{ text:'Book an onboarding call', url:'{{booking_link}}' }, ctaSecondary:{ text:'Log in', url:'{{login_url}}' } }),
      body_text:'Hi {{admin_first_name}}, How are things going at {{client_name}}? Book a call: {{booking_link}}. The Vercentic Team' },
    { id:'vtpl_trial_3d', name:'Trial Ending — 3 Days', category:'trial', trigger:'trial_ending_3d', tags:['trial'],
      subject:'Your Vercentic trial ends in 3 days',
      body_html: wrapEmail({ eyebrow:'Trial update', headline:'3 days left.', subline:"Don't lose your data — upgrade to continue.", greeting:'Hi {{admin_first_name}},', previewText:'Your Vercentic trial ends in 3 days.',
        body:`<p class="body-text">Your trial for <strong style="color:#000;">{{client_name}}</strong> ends in 3 days. Upgrade now to keep full access without interruption.</p><div style="background:#fafafa;border-left:3px solid #000;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;"><div style="font-family:'Geist',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:8px;">Your trial summary</div><div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#000;margin-bottom:4px;">{{client_name}}</div><div style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;">{{record_count}} records &middot; {{user_count}} users</div></div>`,
        cta:{ text:'Upgrade now', url:'{{upgrade_url}}' } }),
      body_text:'Hi {{admin_first_name}}, Your trial for {{client_name}} ends in 3 days. Upgrade at: {{upgrade_url}}. The Vercentic Team' },
    { id:'vtpl_trial_ended', name:'Trial Ended', category:'trial', trigger:'trial_ended', tags:['trial'],
      subject:'Your Vercentic trial has ended — your data is safe',
      body_html: wrapEmail({ eyebrow:'Trial ended', headline:'Your data is safe.', subline:'Reactivate at any time to restore full access.', greeting:'Hi {{admin_first_name}},', previewText:'Your trial has ended. Your data is held for 30 days.',
        body:`<p class="body-text">Your trial for <strong style="color:#000;">{{client_name}}</strong> has ended. Your data is safely stored for 30 days.</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin-bottom:28px;"><p style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;line-height:1.6;">If Vercentic isn't right for you right now, we'd love to hear why — just reply to this email.</p></div>`,
        cta:{ text:'Reactivate account', url:'{{upgrade_url}}' } }),
      body_text:'Hi {{admin_first_name}}, Your trial has ended. Reactivate at: {{upgrade_url}}. The Vercentic Team' },
    { id:'vtpl_30d', name:'30-Day Check-in', category:'engagement', trigger:'day_30', tags:['engagement'],
      subject:"One month with Vercentic — here's your summary",
      body_html: wrapEmail({ eyebrow:'30-day milestone', headline:'One month in.', subline:"Here's a look at what you've built.", greeting:'Hi {{admin_first_name}},', previewText:'A month with Vercentic — your activity summary.',
        body:`<p class="body-text">You've been using Vercentic for a month at <strong style="color:#000;">{{client_name}}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td style="padding:11px 0;border-bottom:1px solid #f4f4f5;"><span style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;">Records created</span><span style="float:right;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;color:#000;">{{record_count}}</span></td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #f4f4f5;"><span style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;">AI actions taken</span><span style="float:right;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;color:#000;">{{ai_call_count}}</span></td></tr><tr><td style="padding:11px 0;"><span style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;">Team members</span><span style="float:right;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;color:#000;">{{user_count}}</span></td></tr></table>`,
        cta:{ text:'Log in to Vercentic', url:'{{login_url}}' } }),
      body_text:'Hi {{admin_first_name}}, One month in at {{client_name}}! Records: {{record_count}}, AI: {{ai_call_count}}. The Vercentic Team' },
    { id:'vtpl_feature', name:'Feature Announcement', category:'product', trigger:'manual', tags:['product'],
      subject:'New in Vercentic: {{feature_name}}',
      body_html: wrapEmail({ eyebrow:'Product update', headline:"We've shipped something new.", subline:'Here is what is new and how to use it.', greeting:'Hi {{admin_first_name}},', previewText:'New in Vercentic: {{feature_name}}',
        body:`<p class="body-text">We just shipped: <strong style="color:#000;">{{feature_name}}</strong>.</p><p class="body-text">{{feature_description}}</p><div style="background:#fafafa;border-left:3px solid #000;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;"><div style="font-family:'Geist',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:8px;">How to access it</div><p style="font-family:'Geist',sans-serif;font-size:14px;color:#3f3f46;line-height:1.6;">{{feature_access_instructions}}</p></div>`,
        cta:{ text:'Try it now', url:'{{login_url}}' } }),
      body_text:'Hi {{admin_first_name}}, We shipped {{feature_name}}. {{feature_description}} Log in: {{login_url}}. The Vercentic Team' },
    { id:'vtpl_reengagement', name:'Re-engagement', category:'engagement', trigger:'inactive_30d', tags:['engagement'],
      subject:"We miss you, {{admin_first_name}} — what's new in Vercentic",
      body_html: wrapEmail({ eyebrow:'Checking in', headline:'Your account is here waiting.', subline:"We noticed you haven't been around lately.", greeting:'Hi {{admin_first_name}},', previewText:"It's been a while — here's what's new.",
        body:`<p class="body-text">We noticed you haven't logged in recently. Your account and data at <strong style="color:#000;">{{client_name}}</strong> are exactly as you left them.</p><p class="body-text">{{recent_updates}}</p><div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin-bottom:28px;"><p style="font-family:'Geist',sans-serif;font-size:13px;color:#71717a;line-height:1.6;">If you need help getting more value from Vercentic, just reply and we'll set up a call.</p></div>`,
        cta:{ text:'Log back in', url:'{{login_url}}' } }),
      body_text:'Hi {{admin_first_name}}, We noticed you have not been around. Log back in: {{login_url}}. The Vercentic Team' },
  ];
}

module.exports = { wrapEmail, buildSequencerTemplates };
