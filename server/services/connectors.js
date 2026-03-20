// server/services/connectors.js
// ═══════════════════════════════════════════════════════════════════════════
// CONNECTOR SERVICE LAYER — real API calls for every integration
// Usage: const { getConnector, fireEvent, createInterviewMeeting } = require('./connectors');
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const { getStore } = require('../db/init');

// ─── Encryption (must match integrations route) ───────────────────────────────
const ENC_KEY = process.env.INTEGRATION_SECRET
  ? Buffer.from(process.env.INTEGRATION_SECRET.padEnd(32).slice(0, 32))
  : crypto.scryptSync('talentos-integrations-default', 'salt', 32);

function decrypt(encoded) {
  if (!encoded || typeof encoded !== 'string' || !encoded.includes(':')) return encoded;
  try {
    const [ivHex, tagHex, encHex] = encoded.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch { return encoded; }
}

function getLiveConfig(environmentId, providerSlug) {
  const store = getStore();
  // Handle both array and object-keyed store formats
  const list = Array.isArray(store.integrations)
    ? store.integrations
    : Object.values(store.integrations || {});
  const integration = list.find(
    i => i.environment_id === environmentId
      && i.provider_slug === providerSlug
      && i.enabled !== false
      && i.status === 'active'
  );
  if (!integration) return null;
  const config = {};
  for (const [key, val] of Object.entries(integration.config || {})) {
    config[key] = decrypt(val);
  }
  return config;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function httpPost(url, body, headers = {}) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!resp.ok) throw new Error(`POST ${url} → ${resp.status}: ${text.slice(0,200)}`);
  return json;
}

async function httpGet(url, headers = {}) {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`GET ${url} → ${resp.status} ${resp.statusText}`);
  return resp.json();
}

async function httpPatch(url, body, headers = {}) {
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`PATCH ${url} → ${resp.status}: ${JSON.stringify(json)}`);
  return json;
}

// ─── Token cache ─────────────────────────────────────────────────────────────
const tokenCache = new Map();

// ── In-memory event log (ring buffer, max 500 entries per environment) ─────────
const _eventLog = new Map(); // envId → events[]
const EVENT_LOG_MAX = 500;

function logEvent(environmentId, { provider, action, ok, detail = '', durationMs = null }) {
  if (!environmentId) return;
  if (!_eventLog.has(environmentId)) _eventLog.set(environmentId, []);
  const log = _eventLog.get(environmentId);
  log.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2,7),
    timestamp: new Date().toISOString(),
    provider, action, ok, detail, duration_ms: durationMs,
  });
  if (log.length > EVENT_LOG_MAX) log.length = EVENT_LOG_MAX;
}

function getEventLog(environmentId, limit = 100) {
  return (_eventLog.get(environmentId) || []).slice(0, limit);
}
async function getCachedToken(key, fetchFn) {
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const { token, expiresIn } = await fetchFn();
  tokenCache.set(key, { token, expiresAt: Date.now() + (expiresIn * 1000) });
  return token;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════════════════════════════
class ZoomConnector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    return getCachedToken(`zoom:${this.cfg.account_id}`, async () => {
      const creds = Buffer.from(`${this.cfg.client_id}:${this.cfg.client_secret}`).toString('base64');
      const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.cfg.account_id}`,
        { method: 'POST', headers: { Authorization: `Basic ${creds}` } });
      const d = await r.json();
      if (!d.access_token) throw new Error('Zoom token failed: ' + JSON.stringify(d));
      return { token: d.access_token, expiresIn: d.expires_in || 3600 };
    });
  }
  async createMeeting({ topic, startTime, durationMinutes = 60, attendees = [], agenda = '' }) {
    const token = await this._token();
    const userId = this.cfg.scheduler_email || 'me';
    const mtg = await httpPost(`https://api.zoom.us/v2/users/${userId}/meetings`, {
      topic, type: 2,
      start_time: new Date(startTime).toISOString(),
      duration: durationMinutes, agenda,
      settings: {
        host_video: true, participant_video: true, join_before_host: true,
        auto_recording: this.cfg.auto_recording === 'true' ? 'cloud' : 'none',
        waiting_room: false,
      },
    }, { Authorization: `Bearer ${token}` });
    return { meeting_id: mtg.id, join_url: mtg.join_url, start_url: mtg.start_url, password: mtg.password, provider: 'zoom' };
  }
  async cancelMeeting(meetingId) {
    const token = await this._token();
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SLACK
// ═══════════════════════════════════════════════════════════════════════════
class SlackConnector {
  constructor(cfg) { this.cfg = cfg; }
  async sendMessage({ channel, text, blocks }) {
    const url = this.cfg.webhook_url;
    if (!url) throw new Error('No Slack webhook URL configured');
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channel || this.cfg.default_channel, text, blocks }),
    });
    if (!resp.ok) throw new Error(`Slack → ${resp.status}`);
    return { ok: true };
  }
  async notifyNewApplication({ candidateName, jobTitle, source }) {
    if (this.cfg.notify_new_application === false || this.cfg.notify_new_application === 'false') return;
    return this.sendMessage({ blocks: [{ type: 'section', text: { type: 'mrkdwn',
      text: `*New Application* 📋\n*${candidateName}* applied for *${jobTitle}*${source ? ` via ${source}` : ''}` } }] });
  }
  async notifyInterviewScheduled({ candidateName, jobTitle, date, time, format, interviewers }) {
    if (this.cfg.notify_interview_scheduled === false || this.cfg.notify_interview_scheduled === 'false') return;
    const dt = new Date(`${date}T${time||'09:00'}`).toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    return this.sendMessage({ blocks: [{ type: 'section', text: { type: 'mrkdwn',
      text: `*Interview Scheduled* 📅\n*${candidateName}* — *${jobTitle}*\n${dt} · ${format}${interviewers?.length ? `\nInterviewers: ${interviewers.join(', ')}` : ''}` } }] });
  }
  async notifyOfferAccepted({ candidateName, jobTitle, startDate }) {
    if (this.cfg.notify_offer_accepted === false || this.cfg.notify_offer_accepted === 'false') return;
    return this.sendMessage({ blocks: [{ type: 'section', text: { type: 'mrkdwn',
      text: `*Offer Accepted* 🎉\n*${candidateName}* accepted *${jobTitle}*${startDate ? `\nStart: ${startDate}` : ''}` } }] });
  }
  async notifyStageChange({ candidateName, jobTitle, fromStage, toStage }) {
    return this.sendMessage({ text: `📌 ${candidateName} moved *${fromStage}* → *${toStage}* on *${jobTitle}*` });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT TEAMS
// ═══════════════════════════════════════════════════════════════════════════
class TeamsConnector {
  constructor(cfg) { this.cfg = cfg; }
  async sendMessage({ title, text, facts = [] }) {
    const url = this.cfg.webhook_url;
    if (!url) throw new Error('No Teams webhook URL configured');
    const card = { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive',
      content: { type: 'AdaptiveCard', version: '1.4', body: [
        { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', color: 'Accent' },
        { type: 'TextBlock', text, wrap: true },
        ...(facts.length ? [{ type: 'FactSet', facts: facts.map(f => ({ title: f.label, value: f.value })) }] : []),
      ] } }] };
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
    if (!resp.ok) throw new Error(`Teams → ${resp.status}`);
    return { ok: true };
  }
  async notifyNewApplication({ candidateName, jobTitle, source }) {
    if (this.cfg.notify_new_application === false || this.cfg.notify_new_application === 'false') return;
    return this.sendMessage({ title: '📋 New Application', text: `**${candidateName}** applied for **${jobTitle}**`,
      facts: source ? [{ label: 'Source', value: source }] : [] });
  }
  async notifyInterviewScheduled({ candidateName, jobTitle, date, time, format }) {
    if (this.cfg.notify_interview_scheduled === false || this.cfg.notify_interview_scheduled === 'false') return;
    return this.sendMessage({ title: '📅 Interview Scheduled', text: `**${candidateName}** — **${jobTitle}**`,
      facts: [{ label: 'Date', value: `${date} at ${time}` }, { label: 'Format', value: format || 'TBC' }] });
  }
  async notifyOfferAccepted({ candidateName, jobTitle, startDate }) {
    if (this.cfg.notify_offer_accepted === false || this.cfg.notify_offer_accepted === 'false') return;
    return this.sendMessage({ title: '🎉 Offer Accepted', text: `**${candidateName}** accepted **${jobTitle}**`,
      facts: startDate ? [{ label: 'Start Date', value: startDate }] : [] });
  }
  async notifyStageChange({ candidateName, jobTitle, fromStage, toStage }) {
    return this.sendMessage({ title: '📌 Stage Change', text: `**${candidateName}** moved on **${jobTitle}**`,
      facts: [{ label: 'From', value: fromStage }, { label: 'To', value: toStage }] });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUSIGN
// ═══════════════════════════════════════════════════════════════════════════
class DocuSignConnector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    return getCachedToken(`docusign:${this.cfg.account_id}`, async () => {
      const resp = await fetch(`${this.cfg.base_uri}/oauth/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials',
          client_id: this.cfg.integration_key, client_secret: this.cfg.secret_key }),
      });
      const d = await resp.json();
      if (!d.access_token) throw new Error('DocuSign token failed');
      return { token: d.access_token, expiresIn: d.expires_in || 3600 };
    });
  }
  async sendOfferForSignature({ candidateName, candidateEmail, jobTitle, salary, startDate, templateId }) {
    const token = await this._token();
    const tplId = templateId || this.cfg.template_id;
    if (!tplId) throw new Error('No DocuSign template ID configured');
    const envelope = await httpPost(`${this.cfg.base_uri}/v2.1/accounts/${this.cfg.account_id}/envelopes`, {
      templateId: tplId, status: 'sent',
      templateRoles: [{ email: candidateEmail, name: candidateName, roleName: 'Candidate',
        tabs: { textTabs: [
          { tabLabel: 'JobTitle', value: jobTitle || '' },
          { tabLabel: 'Salary',   value: salary ? String(salary) : '' },
          { tabLabel: 'StartDate', value: startDate || '' },
        ] } }],
      emailSubject: `Offer Letter — ${jobTitle}`,
      emailBlurb: `Dear ${candidateName}, please review and sign your offer letter.`,
    }, { Authorization: `Bearer ${token}` });
    return { envelope_id: envelope.envelopeId, status: envelope.status };
  }
  async getEnvelopeStatus(envelopeId) {
    const token = await this._token();
    return httpGet(`${this.cfg.base_uri}/v2.1/accounts/${this.cfg.account_id}/envelopes/${envelopeId}`,
      { Authorization: `Bearer ${token}` });
  }
  async voidEnvelope(envelopeId, reason = 'Offer withdrawn') {
    const token = await this._token();
    return httpPatch(`${this.cfg.base_uri}/v2.1/accounts/${this.cfg.account_id}/envelopes/${envelopeId}`,
      { status: 'voided', voidedReason: reason }, { Authorization: `Bearer ${token}` });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BAMBOOHR
// ═══════════════════════════════════════════════════════════════════════════
class BambooHRConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: 'Basic ' + Buffer.from(`${this.cfg.api_key}:x`).toString('base64'), Accept: 'application/json', 'Content-Type': 'application/json' }; }
  _url(p) { return `https://api.bamboohr.com/api/gateway.php/${this.cfg.subdomain}/v1${p}`; }
  async getDirectory() { return httpGet(this._url('/employees/directory'), this._h()); }
  async createEmployee({ firstName, lastName, email, jobTitle, department, startDate, salary, employmentType }) {
    const resp = await fetch(this._url('/employees'), { method: 'POST', headers: this._h(),
      body: JSON.stringify({ firstName, lastName, workEmail: email, jobTitle, department,
        hireDate: startDate, payRate: salary ? String(salary) : undefined,
        employmentHistoryStatus: employmentType || 'Full-Time' }) });
    if (!resp.ok) throw new Error(`BambooHR createEmployee → ${resp.status}: ${await resp.text()}`);
    const loc = resp.headers.get('Location') || '';
    return { employee_id: loc.split('/').pop(), ok: true };
  }
  async findByEmail(email) {
    const dir = await this.getDirectory();
    return (dir.employees || []).find(e => e.workEmail === email || e.homeEmail === email) || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKDAY
// ═══════════════════════════════════════════════════════════════════════════
class WorkdayConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: 'Basic ' + Buffer.from(`${this.cfg.username}:${this.cfg.password}`).toString('base64'), 'Content-Type': 'application/json', Accept: 'application/json' }; }
  _url(p) { return `${this.cfg.base_url}/api/v1/${p}`; }
  async createPreHire({ firstName, lastName, email, jobTitle, startDate, managerId }) {
    return httpPost(this._url(`${this.cfg.tenant_id}/workers`), {
      worker: { person: { legalName: { firstName, lastName }, primaryEmail: email },
        position: { jobTitle, startDate }, manager: managerId ? { id: managerId } : undefined } }, this._h());
  }
  async getOrgStructure() { return httpGet(this._url(`${this.cfg.tenant_id}/organizations`), this._h()); }
}

// ═══════════════════════════════════════════════════════════════════════════
// SAP SUCCESSFACTORS
// ═══════════════════════════════════════════════════════════════════════════
class SAPSuccessFactorsConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: 'Basic ' + Buffer.from(`${this.cfg.username}@${this.cfg.company_id}:${this.cfg.password}`).toString('base64'), Accept: 'application/json', 'Content-Type': 'application/json' }; }
  async createCandidate({ firstName, lastName, email, jobTitle }) {
    return httpPost(`${this.cfg.api_server}/odata/v2/Candidate`, { firstName, lastName, primaryEmail: email, currentTitle: jobTitle }, this._h());
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LINKEDIN JOBS
// ═══════════════════════════════════════════════════════════════════════════
class LinkedInJobsConnector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    return getCachedToken(`linkedin:${this.cfg.organization_id}`, async () => {
      const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.cfg.client_id, client_secret: this.cfg.client_secret }),
      });
      const d = await resp.json();
      if (!d.access_token) throw new Error('LinkedIn token failed');
      return { token: d.access_token, expiresIn: d.expires_in || 3600 };
    });
  }
  async postJob({ title, description, location, employmentType, remoteAllowed, externalJobId, applyUrl }) {
    const token = await this._token();
    const job = await httpPost('https://api.linkedin.com/v2/jobPostings', {
      companyApplyUrl: { applyStartFlowType: 'DIRECT', url: applyUrl },
      description: { text: description }, title,
      employmentStatus: employmentType === 'Full-time' ? 'FULL_TIME' : 'PART_TIME',
      externalJobPostingId: externalJobId, listedAt: Date.now(), location,
      workRemoteAllowed: remoteAllowed || false,
      integrationContext: `urn:li:organization:${this.cfg.organization_id}`,
    }, { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' });
    return { job_id: job.id, status: 'posted', provider: 'linkedin' };
  }
  async closeJob(jobId) {
    const token = await this._token();
    await httpPost(`https://api.linkedin.com/v2/jobPostings/${jobId}`,
      { integrationContext: `urn:li:organization:${this.cfg.organization_id}`, lifecycleState: 'CLOSED' },
      { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' });
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKR
// ═══════════════════════════════════════════════════════════════════════════
class CheckrConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: 'Basic ' + Buffer.from(`${this.cfg.api_key}:`).toString('base64'), 'Content-Type': 'application/json' }; }
  async createCandidate({ firstName, lastName, email, phone, dob, ssn, zipCode }) {
    return httpPost('https://api.checkr.com/v1/candidates',
      { first_name: firstName, last_name: lastName, email, phone, dob, ssn, zipcode: zipCode }, this._h());
  }
  async orderReport({ candidateId, packageSlug, workLocations }) {
    return httpPost('https://api.checkr.com/v1/invitations',
      { package: packageSlug || this.cfg.default_package || 'checkrdemo',
        candidate_id: candidateId, work_locations: workLocations || [{ country: 'US' }] }, this._h());
  }
  async getReport(reportId) { return httpGet(`https://api.checkr.com/v1/reports/${reportId}`, this._h()); }
  async findByEmail(email) {
    const d = await httpGet(`https://api.checkr.com/v1/candidates?email=${encodeURIComponent(email)}`, this._h());
    return d.data?.[0] || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// XREF (REFERENCE CHECKING)
// ═══════════════════════════════════════════════════════════════════════════
class XrefConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { 'X-API-Key': this.cfg.api_key, 'Content-Type': 'application/json' }; }
  async sendReferenceCheck({ candidateName, candidateEmail, jobTitle, refereeCount = 2 }) {
    return httpPost('https://app.xref.com/api/v1/requests', {
      team_id: this.cfg.team_id,
      candidate: { name: candidateName, email: candidateEmail },
      position: { title: jobTitle },
      referee_count: refereeCount,
    }, this._h());
  }
  async getRequestStatus(requestId) { return httpGet(`https://app.xref.com/api/v1/requests/${requestId}`, this._h()); }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALESFORCE
// ═══════════════════════════════════════════════════════════════════════════
class SalesforceConnector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    return getCachedToken(`salesforce:${this.cfg.instance_url}`, async () => {
      const resp = await fetch(`${this.cfg.instance_url}/services/oauth2/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'password', client_id: this.cfg.client_id,
          client_secret: this.cfg.client_secret, username: this.cfg.username,
          password: this.cfg.password + this.cfg.security_token }),
      });
      const d = await resp.json();
      if (!d.access_token) throw new Error('Salesforce login failed');
      return { token: d.access_token, expiresIn: 7200 };
    });
  }
  async _api(path, method = 'GET', body) {
    const token = await this._token();
    const opts = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(`${this.cfg.instance_url}/services/data/v57.0${path}`, opts);
    if (!resp.ok) throw new Error(`Salesforce ${method} ${path} → ${resp.status}`);
    if (resp.status === 204) return { ok: true };
    return resp.json();
  }
  async upsertContact({ firstName, lastName, email, phone, title }) {
    const q = `SELECT Id FROM Contact WHERE Email = '${email}' LIMIT 1`;
    const result = await this._api(`/query?q=${encodeURIComponent(q)}`);
    const fields = { FirstName: firstName, LastName: lastName, Email: email, Phone: phone, Title: title };
    if (result.records?.length > 0) {
      await this._api(`/sobjects/Contact/${result.records[0].Id}`, 'PATCH', fields);
      return { sf_id: result.records[0].Id, action: 'updated' };
    }
    const created = await this._api('/sobjects/Contact', 'POST', fields);
    return { sf_id: created.id, action: 'created' };
  }
  async logActivity({ contactId, subject, description }) {
    return this._api('/sobjects/Task', 'POST', {
      WhoId: contactId, Subject: subject, Description: description,
      ActivityDate: new Date().toISOString().split('T')[0], Status: 'Completed',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HUBSPOT
// ═══════════════════════════════════════════════════════════════════════════
class HubSpotConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: `Bearer ${this.cfg.access_token}`, 'Content-Type': 'application/json' }; }
  async upsertContact({ firstName, lastName, email, phone, jobTitle, company }) {
    const search = await httpPost('https://api.hubapi.com/crm/v3/objects/contacts/search',
      { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], limit: 1 }, this._h());
    const props = { firstname: firstName, lastname: lastName, email, phone, jobtitle: jobTitle, company };
    if (search.total > 0) {
      const id = search.results[0].id;
      await httpPatch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`, { properties: props }, this._h());
      return { hubspot_id: id, action: 'updated' };
    }
    const created = await httpPost('https://api.hubapi.com/crm/v3/objects/contacts', { properties: props }, this._h());
    return { hubspot_id: created.id, action: 'created' };
  }
  async logNote({ contactId, note }) {
    const eng = await httpPost('https://api.hubapi.com/crm/v3/objects/notes',
      { properties: { hs_note_body: note, hs_timestamp: Date.now() } }, this._h());
    await httpPost(`https://api.hubapi.com/crm/v3/objects/notes/${eng.id}/associations/contact/${contactId}/note_to_contact`, {}, this._h());
    return { note_id: eng.id };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT 365 (Calendar + Teams meetings + Email)
// ═══════════════════════════════════════════════════════════════════════════
class Microsoft365Connector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    return getCachedToken(`m365:${this.cfg.tenant_id}`, async () => {
      const resp = await fetch(`https://login.microsoftonline.com/${this.cfg.tenant_id}/oauth2/v2.0/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.cfg.client_id,
          client_secret: this.cfg.client_secret, scope: 'https://graph.microsoft.com/.default' }),
      });
      const d = await resp.json();
      if (!d.access_token) throw new Error('M365 token failed: ' + JSON.stringify(d));
      return { token: d.access_token, expiresIn: d.expires_in || 3600 };
    });
  }
  async createEvent({ subject, body, startTime, endTime, attendees = [], location, isTeamsMeeting }) {
    const token = await this._token();
    const user = this.cfg.calendar_user || 'me';
    const useTeams = isTeamsMeeting || this.cfg.teams_enabled === 'true' || this.cfg.teams_enabled === true;
    const event = await httpPost(`https://graph.microsoft.com/v1.0/users/${user}/events`, {
      subject, body: { contentType: 'HTML', content: body || subject },
      start: { dateTime: new Date(startTime).toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(endTime).toISOString(), timeZone: 'UTC' },
      location: location ? { displayName: location } : undefined,
      attendees: attendees.map(email => ({ emailAddress: { address: email }, type: 'required' })),
      isOnlineMeeting: useTeams, onlineMeetingProvider: useTeams ? 'teamsForBusiness' : undefined,
    }, { Authorization: `Bearer ${token}` });
    return { event_id: event.id, web_link: event.webLink, teams_url: event.onlineMeeting?.joinUrl, provider: 'microsoft_365' };
  }
  async cancelEvent(eventId, comment = 'Interview cancelled') {
    const token = await this._token();
    const user = this.cfg.calendar_user || 'me';
    await httpPost(`https://graph.microsoft.com/v1.0/users/${user}/events/${eventId}/cancel`, { comment }, { Authorization: `Bearer ${token}` });
    return { ok: true };
  }
  async sendEmail({ to, subject, htmlBody, from }) {
    const token = await this._token();
    const sender = from || this.cfg.calendar_user;
    await httpPost(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
      message: { subject, body: { contentType: 'HTML', content: htmlBody },
        toRecipients: (Array.isArray(to) ? to : [to]).map(t => ({ emailAddress: { address: t } })) },
    }, { Authorization: `Bearer ${token}` });
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR
// ═══════════════════════════════════════════════════════════════════════════
class GoogleCalendarConnector {
  constructor(cfg) { this.cfg = cfg; }
  async _token() {
    const key = this.cfg.service_account_key;
    if (!key) throw new Error('Google Calendar: service account key required');
    return getCachedToken('gcal:sa', async () => {
      const parsed = typeof key === 'string' ? JSON.parse(key) : key;
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ iss: parsed.client_email,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url');
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(`${header}.${payload}`);
      const sig = sign.sign(parsed.private_key, 'base64url');
      const jwt = `${header}.${payload}.${sig}`;
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
      });
      const d = await resp.json();
      return { token: d.access_token, expiresIn: d.expires_in || 3600 };
    });
  }
  async createEvent({ summary, description, startTime, endTime, attendees = [], location, meetLink = true }) {
    const token = await this._token();
    const calId = this.cfg.calendar_id || 'primary';
    const event = await httpPost(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events${meetLink ? '?conferenceDataVersion=1' : ''}`,
      { summary, description, location,
        start: { dateTime: new Date(startTime).toISOString(), timeZone: 'UTC' },
        end: { dateTime: new Date(endTime).toISOString(), timeZone: 'UTC' },
        attendees: attendees.map(email => ({ email })),
        conferenceData: meetLink ? { createRequest: { requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' } } } : undefined,
        sendUpdates: 'all' },
      { Authorization: `Bearer ${token}` });
    return { event_id: event.id, html_link: event.htmlLink, meet_link: event.conferenceData?.entryPoints?.[0]?.uri, provider: 'google_calendar' };
  }
  async deleteEvent(eventId) {
    const token = await this._token();
    const calId = this.cfg.calendar_id || 'primary';
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// XERO
// ═══════════════════════════════════════════════════════════════════════════
class XeroConnector {
  constructor(cfg) { this.cfg = cfg; }
  _h() { return { Authorization: `Bearer ${this.cfg.access_token}`, 'Xero-Tenant-Id': this.cfg.tenant_id, Accept: 'application/json', 'Content-Type': 'application/json' }; }
  async createEmployee({ firstName, lastName, email, startDate, title, payrollCalendarId }) {
    const resp = await fetch('https://api.xero.com/payroll.xro/1.0/Employees', { method: 'POST', headers: this._h(),
      body: JSON.stringify({ Employees: [{ FirstName: firstName, LastName: lastName, Email: email,
        Title: title || 'Mr', StartDate: `/Date(${new Date(startDate).getTime()})/`,
        PayrollCalendarID: payrollCalendarId || this.cfg.payroll_calendar_id }] }) });
    const d = await resp.json();
    if (!resp.ok) throw new Error(`Xero → ${resp.status}: ${JSON.stringify(d)}`);
    return { xero_id: d.Employees?.[0]?.EmployeeID, ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK (Zapier, Make, generic)
// ═══════════════════════════════════════════════════════════════════════════
class WebhookConnector {
  constructor(cfg, providerName = 'webhook') { this.cfg = cfg; this.providerName = providerName; }
  async fire(eventType, payload) {
    const url = this.cfg.webhook_url;
    if (!url) throw new Error(`${this.providerName}: no webhook URL`);
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), source: 'talentos', data: payload }) });
    if (!resp.ok) throw new Error(`${this.providerName} webhook → ${resp.status}`);
    return { ok: true, provider: this.providerName };
  }
  // Alias so webhook connectors work with the notification system
  async sendMessage({ text }) { return this.fire('message', { text }); }
  async notifyNewApplication(p) { return this.fire('new_application', p); }
  async notifyInterviewScheduled(p) { return this.fire('interview_scheduled', p); }
  async notifyOfferAccepted(p) { return this.fire('offer_accepted', p); }
  async notifyStageChange(p) { return this.fire('stage_change', p); }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTOR FACTORY
// ═══════════════════════════════════════════════════════════════════════════
const CONNECTOR_MAP = {
  zoom:               (c) => new ZoomConnector(c),
  slack:              (c) => new SlackConnector(c),
  microsoft_teams:    (c) => new TeamsConnector(c),
  docusign:           (c) => new DocuSignConnector(c),
  bamboohr:           (c) => new BambooHRConnector(c),
  workday:            (c) => new WorkdayConnector(c),
  sap_successfactors: (c) => new SAPSuccessFactorsConnector(c),
  linkedin_jobs:      (c) => new LinkedInJobsConnector(c),
  checkr:             (c) => new CheckrConnector(c),
  xref:               (c) => new XrefConnector(c),
  salesforce:         (c) => new SalesforceConnector(c),
  hubspot:            (c) => new HubSpotConnector(c),
  microsoft_365:      (c) => new Microsoft365Connector(c),
  google_calendar:    (c) => new GoogleCalendarConnector(c),
  xero:               (c) => new XeroConnector(c),
  zapier:             (c) => new WebhookConnector(c, 'zapier'),
  make:               (c) => new WebhookConnector(c, 'make'),
};

/**
 * getConnector(environmentId, providerSlug)
 * Returns a live connector with decrypted credentials, or null if not connected.
 */
function getConnector(environmentId, providerSlug) {
  const config = getLiveConfig(environmentId, providerSlug);
  if (!config) return null;
  const factory = CONNECTOR_MAP[providerSlug];
  if (!factory) return null;
  return factory(config);
}

/**
 * fireEvent(environmentId, eventType, payload)
 * Broadcasts to all connected notification providers (Slack, Teams, Zapier, Make).
 * Silent on failure — never blocks the main flow.
 */
async function fireEvent(environmentId, eventType, payload) {
  const notifiers = ['slack', 'microsoft_teams', 'zapier', 'make'];
  const results = [];
  for (const slug of notifiers) {
    try {
      const connector = getConnector(environmentId, slug);
      if (!connector) continue;
      let result;
      switch (eventType) {
        case 'new_application':      result = await connector.notifyNewApplication(payload); break;
        case 'interview_scheduled':  result = await connector.notifyInterviewScheduled(payload); break;
        case 'offer_accepted':       result = await connector.notifyOfferAccepted(payload); break;
        case 'stage_change':         result = await connector.notifyStageChange(payload); break;
        default:
          if (connector.fire)        result = await connector.fire(eventType, payload);
          else if (connector.sendMessage) result = await connector.sendMessage({ text: `TalentOS: ${eventType}` });
      }
      if (result) {
        results.push({ provider: slug, ...result });
        logEvent(environmentId, { provider: slug, action: eventType, ok: true, detail: JSON.stringify(payload).slice(0,120) });
      }
    } catch (err) {
      console.warn(`[Connectors] ${slug} ${eventType} error:`, err.message);
      results.push({ provider: slug, ok: false, error: err.message });
      logEvent(environmentId, { provider: slug, action: eventType, ok: false, detail: err.message });
    }
  }
  return results;
}

/**
 * createInterviewMeeting(environmentId, details)
 * Tries Zoom → Microsoft 365 → Google Calendar in order.
 * Returns meeting details or null if none connected.
 */
async function createInterviewMeeting(environmentId, { topic, startTime, endTime, attendees = [], agenda = '' }) {
  const durationMinutes = endTime ? Math.round((new Date(endTime) - new Date(startTime)) / 60_000) : 60;

  const zoom = getConnector(environmentId, 'zoom');
  if (zoom) {
    try { const r = await zoom.createMeeting({ topic, startTime, durationMinutes, attendees, agenda }); logEvent(environmentId, { provider:'zoom', action:'create_meeting', ok:true, detail:topic }); return r; }
    catch (e) { console.warn('[Connectors] Zoom failed:', e.message); logEvent(environmentId, { provider:'zoom', action:'create_meeting', ok:false, detail:e.message }); }
  }
  const m365 = getConnector(environmentId, 'microsoft_365');
  if (m365) {
    try { const r = await m365.createEvent({ subject: topic, startTime, endTime, attendees, isTeamsMeeting: true }); logEvent(environmentId, { provider:'microsoft_365', action:'create_meeting', ok:true, detail:topic }); return r; }
    catch (e) { console.warn('[Connectors] M365 failed:', e.message); logEvent(environmentId, { provider:'microsoft_365', action:'create_meeting', ok:false, detail:e.message }); }
  }
  const gcal = getConnector(environmentId, 'google_calendar');
  if (gcal) {
    try { const r = await gcal.createEvent({ summary: topic, startTime, endTime, attendees, meetLink: true }); logEvent(environmentId, { provider:'google_calendar', action:'create_meeting', ok:true, detail:topic }); return r; }
    catch (e) { console.warn('[Connectors] GCal failed:', e.message); logEvent(environmentId, { provider:'google_calendar', action:'create_meeting', ok:false, detail:e.message }); }
  }
  return null;
}

module.exports = { getConnector, fireEvent, createInterviewMeeting, getLiveConfig, logEvent, getEventLog,
  ZoomConnector, SlackConnector, TeamsConnector, DocuSignConnector,
  BambooHRConnector, WorkdayConnector, LinkedInJobsConnector, CheckrConnector,
  XrefConnector, SalesforceConnector, HubSpotConnector, Microsoft365Connector,
  GoogleCalendarConnector, XeroConnector, WebhookConnector };
