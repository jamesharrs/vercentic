// server/routes/integrations.js
// Integration Library — catalog, encrypted credential store, testing
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');
const { logEvent, getEventLog } = require('../services/connectors');

// ── Encryption ────────────────────────────────────────────────────────────────
const ENC_KEY = process.env.INTEGRATION_SECRET
  ? Buffer.from(process.env.INTEGRATION_SECRET.padEnd(32).slice(0, 32))
  : crypto.scryptSync('talentos-integrations-default', 'salt', 32);

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + cipher.getAuthTag().toString('hex') + ':' + enc.toString('hex');
}
function decrypt(encoded) {
  if (!encoded || !encoded.includes(':')) return encoded;
  try {
    const [ivH, tagH, encH] = encoded.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivH,'hex'));
    decipher.setAuthTag(Buffer.from(tagH,'hex'));
    return decipher.update(Buffer.from(encH,'hex')) + decipher.final('utf8');
  } catch { return encoded; }
}
function mask(val) {
  if (!val || val.length < 8) return '••••••••';
  // If it looks encrypted, try decrypt first for length check
  const plain = val.includes(':') ? (decrypt(val) || val) : val;
  return plain.slice(0,4) + '••••••••' + plain.slice(-4);
}

// ── Integration Catalog ───────────────────────────────────────────────────────
// Logo domains — served via Google's favicon service (reliable, no API key)
const LOGO_DOMAINS = {
  okta:'okta.com', azure_ad:'microsoft.com', google_workspace:'google.com',
  microsoft_365:'microsoft.com', google_calendar:'google.com', zoom:'zoom.us',
  slack:'slack.com', microsoft_teams:'microsoft.com',
  docusign:'docusign.com', adobe_sign:'adobe.com',
  linkedin_jobs:'linkedin.com', indeed:'indeed.com', bayt:'bayt.com', reed:'reed.co.uk',
  checkr:'checkr.com', sterling:'sterlingcheck.com',
  workday:'workday.com', bamboohr:'bamboohr.com', personio:'personio.de',
  sap_successfactors:'successfactors.com', rippling:'rippling.com',
  hirevue:'hirevue.com', codility:'codility.com',
  salesforce:'salesforce.com', hubspot:'hubspot.com',
  zapier:'zapier.com', make:'make.com', xref:'xref.com',
  twilio:'twilio.com', sendgrid:'sendgrid.com',
  power_bi:'microsoft.com', adobe_analytics:'adobe.com',
};
const logoUrl = (slug) => {
  const d = LOGO_DOMAINS[slug];
  return d ? `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${d}&size=128` : null;
};

const CATALOG = [
  // SSO & Identity
  { slug:'okta',            name:'Okta',               category:'sso',            category_label:'SSO & Identity',        color:'#00297A', icon:'Okta',  description:'Single sign-on via Okta.',          tags:['enterprise','saml','oauth'],
    fields:[{key:'domain',label:'Okta Domain',type:'text',required:true,secret:false,hint:'yourorg.okta.com'},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'redirect_uri',label:'Redirect URI',type:'text',required:true,secret:false}]},
  { slug:'azure_ad',        name:'Microsoft Azure AD', category:'sso',            category_label:'SSO & Identity',        color:'#0078D4', icon:'MS',    description:'SSO via Azure Active Directory.',   tags:['enterprise','microsoft','oidc'],
    fields:[{key:'tenant_id',label:'Tenant ID',type:'text',required:true,secret:false},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'redirect_uri',label:'Redirect URI',type:'text',required:true,secret:false}]},
  { slug:'google_workspace',name:'Google Workspace',   category:'sso',            category_label:'SSO & Identity',        color:'#4285F4', icon:'G',     description:'Sign in with Google.',              tags:['google','oauth'],
    fields:[{key:'client_id',label:'OAuth Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'OAuth Client Secret',type:'password',required:true,secret:true},{key:'redirect_uri',label:'Redirect URI',type:'text',required:true,secret:false}]},
  // Calendar
  { slug:'microsoft_365',   name:'Microsoft 365',      category:'calendar',       category_label:'Calendar & Scheduling', color:'#0078D4', icon:'M365',  description:'Outlook Calendar + Teams meeting links.', tags:['microsoft','calendar','teams'],
    fields:[{key:'tenant_id',label:'Tenant ID',type:'text',required:true,secret:false},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'calendar_user',label:'Calendar User (UPN)',type:'text',required:false,secret:false,hint:'e.g. recruiting@company.com'},{key:'teams_enabled',label:'Auto-create Teams meetings',type:'boolean',required:false}]},
  { slug:'google_calendar',  name:'Google Calendar',    category:'calendar',       category_label:'Calendar & Scheduling', color:'#4285F4', icon:'GCal',  description:'Google Calendar + Meet links.',     tags:['google','calendar','meet'],
    fields:[{key:'client_id',label:'OAuth Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'service_account_key',label:'Service Account Key (JSON)',type:'textarea',required:false,secret:true,hint:'Paste full service account JSON'},{key:'calendar_id',label:'Calendar ID',type:'text',required:false,secret:false}]},
  { slug:'zoom',             name:'Zoom',               category:'calendar',       category_label:'Calendar & Scheduling', color:'#2D8CFF', icon:'Zoom',  description:'Auto-generate Zoom links for interviews.', tags:['video','meetings'],
    fields:[{key:'account_id',label:'Account ID',type:'text',required:true,secret:false},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'scheduler_email',label:'Host Email',type:'text',required:false,secret:false},{key:'auto_recording',label:'Enable auto-recording',type:'boolean',required:false}]},
  // Communication
  { slug:'slack',            name:'Slack',              category:'communication',  category_label:'Communication',         color:'#4A154B', icon:'Slack', description:'Post notifications to Slack channels.', tags:['notifications','messaging'],
    fields:[{key:'webhook_url',label:'Incoming Webhook URL',type:'password',required:true,secret:true,hint:'api.slack.com → Your App → Incoming Webhooks'},{key:'default_channel',label:'Default Channel',type:'text',required:false,secret:false,hint:'e.g. #recruiting'},{key:'notify_new_application',label:'Notify: New application',type:'boolean',required:false},{key:'notify_offer_accepted',label:'Notify: Offer accepted',type:'boolean',required:false},{key:'notify_interview_scheduled',label:'Notify: Interview scheduled',type:'boolean',required:false}]},
  { slug:'microsoft_teams',  name:'Microsoft Teams',    category:'communication',  category_label:'Communication',         color:'#6264A7', icon:'Teams', description:'Send notifications to Teams channels.', tags:['microsoft','notifications'],
    fields:[{key:'webhook_url',label:'Incoming Webhook URL',type:'password',required:true,secret:true},{key:'default_channel',label:'Channel Name',type:'text',required:false,secret:false},{key:'notify_new_application',label:'Notify: New application',type:'boolean',required:false},{key:'notify_offer_accepted',label:'Notify: Offer accepted',type:'boolean',required:false},{key:'notify_interview_scheduled',label:'Notify: Interview scheduled',type:'boolean',required:false}]},
  // E-Signature
  { slug:'docusign',         name:'DocuSign',           category:'esignature',     category_label:'E-Signature',           color:'#FFB600', icon:'DS',    description:'Send offer letters for e-signature.', tags:['offers','contracts'],
    fields:[{key:'account_id',label:'Account ID',type:'text',required:true,secret:false,hint:'DocuSign Admin → API and Keys'},{key:'integration_key',label:'Integration Key',type:'text',required:true,secret:false},{key:'secret_key',label:'Secret Key',type:'password',required:true,secret:true},{key:'user_id',label:'API User ID',type:'text',required:true,secret:false},{key:'base_uri',label:'Base URI',type:'text',placeholder:'https://demo.docusign.net/restapi',required:true,secret:false},{key:'template_id',label:'Offer Letter Template ID',type:'text',required:false,secret:false}]},
  { slug:'adobe_sign',       name:'Adobe Acrobat Sign', category:'esignature',     category_label:'E-Signature',           color:'#FF0000', icon:'AS',    description:'Send offers via Adobe Acrobat Sign.', tags:['offers','contracts'],
    fields:[{key:'client_id',label:'Application ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Application Secret',type:'password',required:true,secret:true},{key:'access_token',label:'Access Token',type:'password',required:true,secret:true},{key:'api_access_point',label:'API Access Point',type:'text',placeholder:'https://api.eu2.adobesign.com/',required:true,secret:false}]},
  // Job Boards
  { slug:'linkedin_jobs',    name:'LinkedIn Jobs',      category:'job_boards',     category_label:'Job Boards',            color:'#0A66C2', icon:'in',    description:'Post jobs directly to LinkedIn.',   tags:['sourcing','posting'],
    fields:[{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'organization_id',label:'Organisation ID',type:'text',required:true,secret:false}]},
  { slug:'indeed',           name:'Indeed',             category:'job_boards',     category_label:'Job Boards',            color:'#003A9B', icon:'Indeed',description:'Publish job listings to Indeed.',    tags:['sourcing','posting'],
    fields:[{key:'publisher_id',label:'Publisher ID',type:'text',required:true,secret:false},{key:'api_token',label:'API Token',type:'password',required:true,secret:true}]},
  { slug:'bayt',             name:'Bayt.com',           category:'job_boards',     category_label:'Job Boards',            color:'#E60026', icon:'Bayt',  description:'Post to Bayt — leading MENA job board.', tags:['mena','posting','regional'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true},{key:'account_id',label:'Account ID',type:'text',required:true,secret:false},{key:'default_country',label:'Default Country',type:'select',options:['AE','SA','KW','QA','BH','OM','EG','JO'],required:false}]},
  { slug:'reed',             name:'Reed',               category:'job_boards',     category_label:'Job Boards',            color:'#CC0000', icon:'Reed',  description:'Post to Reed.co.uk — UK\'s largest job site.', tags:['uk','posting','regional'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true},{key:'employer_id',label:'Employer ID',type:'text',required:true,secret:false}]},
  // Background Checks
  { slug:'checkr',           name:'Checkr',             category:'background_check',category_label:'Background Checks',   color:'#15803D', icon:'Chkr',  description:'Initiate background checks from candidate records.', tags:['screening','compliance'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true,hint:'Checkr Dashboard → Account Settings → Developer'},{key:'webhook_secret',label:'Webhook Secret',type:'password',required:false,secret:true},{key:'default_package',label:'Default Package',type:'text',placeholder:'tasker_standard',required:false,secret:false}]},
  { slug:'sterling',         name:'Sterling',           category:'background_check',category_label:'Background Checks',   color:'#004B87', icon:'Strlng',description:'Enterprise background screening.',   tags:['screening','compliance','enterprise'],
    fields:[{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'api_key',label:'API Key',type:'password',required:true,secret:true}]},
  // HRIS
  { slug:'workday',          name:'Workday',            category:'hris',           category_label:'HRIS & People Systems', color:'#0875E1', icon:'WD',    description:'Sync new hires to Workday HCM.',    tags:['hris','enterprise','sync'],
    fields:[{key:'tenant_id',label:'Tenant ID',type:'text',required:true,secret:false},{key:'username',label:'Integration Username',type:'text',required:true,secret:false},{key:'password',label:'Integration Password',type:'password',required:true,secret:true},{key:'base_url',label:'Base URL',type:'text',placeholder:'https://wd2-impl-services1.workday.com',required:true,secret:false}]},
  { slug:'bamboohr',         name:'BambooHR',           category:'hris',           category_label:'HRIS & People Systems', color:'#73C41D', icon:'BBoo',  description:'Sync accepted offers to BambooHR.', tags:['hris','sme'],
    fields:[{key:'subdomain',label:'Company Domain',type:'text',placeholder:'yourcompany',required:true,secret:false,hint:'From your BambooHR URL: yourcompany.bamboohr.com'},{key:'api_key',label:'API Key',type:'password',required:true,secret:true}]},
  { slug:'personio',         name:'Personio',           category:'hris',           category_label:'HRIS & People Systems', color:'#00A0DC', icon:'Pers',  description:'Sync with Personio HR platform.',   tags:['hris','europe'],
    fields:[{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true}]},
  { slug:'sap_successfactors',name:'SAP SuccessFactors',category:'hris',           category_label:'HRIS & People Systems', color:'#008FD3', icon:'SAP',   description:'Enterprise SAP HCM integration.',   tags:['hris','enterprise','sap'],
    fields:[{key:'api_server',label:'API Server URL',type:'text',placeholder:'https://api2.successfactors.eu',required:true,secret:false},{key:'company_id',label:'Company ID',type:'text',required:true,secret:false},{key:'username',label:'API Username',type:'text',required:true,secret:false},{key:'password',label:'API Password',type:'password',required:true,secret:true}]},
  { slug:'rippling',         name:'Rippling',           category:'hris',           category_label:'HRIS & People Systems', color:'#FF5B2D', icon:'Rip',   description:'Auto-onboard to Rippling.',         tags:['hris','payroll','onboarding'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true},{key:'company_id',label:'Company ID',type:'text',required:true,secret:false}]},
  // Assessments
  { slug:'hirevue',          name:'HireVue',            category:'assessment',     category_label:'Assessments',           color:'#1B1464', icon:'HV',    description:'Video interview assessments.',      tags:['video','assessment'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true},{key:'account_id',label:'Account ID',type:'text',required:true,secret:false}]},
  { slug:'codility',         name:'Codility',           category:'assessment',     category_label:'Assessments',           color:'#FF4B4B', icon:'Code',  description:'Technical coding assessments.',     tags:['technical','coding','engineering'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true,hint:'Codility Dashboard → Account → API Key'}]},
  // CRM
  { slug:'salesforce',       name:'Salesforce',         category:'crm',            category_label:'CRM & Sourcing',        color:'#00A1E0', icon:'SF',    description:'Sync contacts with Salesforce.',    tags:['crm','enterprise'],
    fields:[{key:'instance_url',label:'Instance URL',type:'text',placeholder:'https://yourorg.my.salesforce.com',required:true,secret:false},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true},{key:'username',label:'Username',type:'text',required:true,secret:false},{key:'password',label:'Password',type:'password',required:true,secret:true},{key:'security_token',label:'Security Token',type:'password',required:true,secret:true}]},
  { slug:'hubspot',          name:'HubSpot',            category:'crm',            category_label:'CRM & Sourcing',        color:'#FF7A59', icon:'HubS',  description:'Sync contacts with HubSpot CRM.',   tags:['crm','marketing'],
    fields:[{key:'access_token',label:'Private App Access Token',type:'password',required:true,secret:true,hint:'HubSpot Settings → Integrations → Private Apps'},{key:'portal_id',label:'Portal ID',type:'text',required:true,secret:false}]},
  // Automation
  { slug:'zapier',           name:'Zapier',             category:'automation',     category_label:'Automation',            color:'#FF4A00', icon:'Zap',   description:'Connect to 5,000+ apps via Zapier.', tags:['automation','no-code'],
    fields:[{key:'webhook_url',label:'Zapier Webhook URL',type:'text',placeholder:'https://hooks.zapier.com/hooks/catch/...',required:true,secret:false,hint:'Create a Zap → Webhooks by Zapier → Catch Hook'}]},
  { slug:'make',             name:'Make (Integromat)',  category:'automation',     category_label:'Automation',            color:'#6D00CC', icon:'Make',  description:'Visual automation with Make scenarios.', tags:['automation','no-code'],
    fields:[{key:'webhook_url',label:'Make Webhook URL',type:'text',placeholder:'https://hook.eu1.make.com/...',required:true,secret:false,hint:'Make → Scenario → Webhook module → Copy URL'}]},
  // Reference Checks
  { slug:'xref',             name:'Xref',               category:'reference_check',category_label:'Reference Checking',   color:'#0050C8', icon:'Xref',  description:'Automated reference checking.',     tags:['references','compliance'],
    fields:[{key:'api_key',label:'API Key',type:'password',required:true,secret:true},{key:'team_id',label:'Team ID',type:'text',required:true,secret:false}]},
  // Messaging
  { slug:'twilio',           name:'Twilio',             category:'messaging',      category_label:'Messaging',             color:'#F22F46', icon:'Twilio',description:'Send/receive SMS and WhatsApp messages.',tags:['sms','whatsapp','messaging'],
    fields:[{key:'TWILIO_ACCOUNT_SID',label:'Account SID',type:'text',required:true,secret:false,hint:'Starts with AC — found in Twilio Console'},{key:'TWILIO_AUTH_TOKEN',label:'Auth Token',type:'password',required:true,secret:true},{key:'TWILIO_SMS_NUMBER',label:'SMS Phone Number',type:'text',required:true,secret:false,placeholder:'+14155552671'},{key:'TWILIO_WA_NUMBER',label:'WhatsApp Number',type:'text',required:false,secret:false,placeholder:'whatsapp:+14155552671'}]},
  { slug:'sendgrid',         name:'SendGrid',           category:'messaging',      category_label:'Messaging',             color:'#1A82E2', icon:'SG',    description:'Send transactional and bulk emails.',  tags:['email','transactional'],
    fields:[{key:'SENDGRID_API_KEY',label:'API Key',type:'password',required:true,secret:true,hint:'SendGrid → Settings → API Keys'},{key:'SENDGRID_FROM_EMAIL',label:'From Email',type:'text',required:true,secret:false,placeholder:'noreply@company.com'},{key:'SENDGRID_FROM_NAME',label:'From Name',type:'text',required:false,secret:false,placeholder:'Vercentic'}]},
  { slug:'inbound_webhooks', name:'Inbound Webhooks',   category:'messaging',      category_label:'Messaging',             color:'#6366F1', icon:'WHK',   description:'Base URL for Twilio inbound callbacks.', tags:['webhooks','inbound'],
    fields:[{key:'WEBHOOK_BASE_URL',label:'Base URL',type:'text',required:true,secret:false,placeholder:'https://talentos-production-4045.up.railway.app',hint:'Twilio will POST inbound messages here'}]},
  // Analytics
  { slug:'power_bi',         name:'Microsoft Power BI', category:'analytics',      category_label:'Analytics & BI',        color:'#F2C811', icon:'PBI',   description:'Push data to Power BI dashboards.', tags:['analytics','microsoft'],
    fields:[{key:'tenant_id',label:'Tenant ID',type:'text',required:true,secret:false},{key:'client_id',label:'Client ID',type:'text',required:true,secret:false},{key:'client_secret',label:'Client Secret',type:'password',required:true,secret:true}]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getList() {
  const s = getStore();
  return Array.isArray(s.integrations) ? s.integrations : Object.values(s.integrations || {});
}
function sanitize(integration) {
  const cat = CATALOG.find(c => c.slug === integration.provider_slug);
  if (!cat || !integration.config) return { ...integration, config: {} };
  const safe = {};
  for (const field of (cat.fields || [])) {
    const raw = integration.config[field.key];
    if (!raw) continue;
    safe[field.key] = field.secret ? mask(raw) : (raw.includes(':') ? decrypt(raw) : raw);
  }
  return { ...integration, config: safe };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/integrations/catalog
router.get('/catalog', (req, res) => {
  const { environment_id } = req.query;
  const groups = {};
  for (const item of CATALOG) {
    if (!groups[item.category]) groups[item.category] = { slug: item.category, label: item.category_label, items: [] };
    const entry = { ...item, fields: item.fields, logo_url: logoUrl(item.slug) };
    if (environment_id) {
      const list = getList();
      const conn = list.find(c => c.environment_id === environment_id && c.provider_slug === item.slug);
      entry.connected = conn?.status === 'active';
      entry.has_connection = !!conn;
    }
    groups[item.category].items.push(entry);
  }
  res.json(Object.values(groups));
});

// GET /api/integrations/catalog/:slug
router.get('/catalog/:slug', (req, res) => {
  const item = CATALOG.find(c => c.slug === req.params.slug);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// GET /api/integrations?environment_id=
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const list = getList().filter(i => i.environment_id === environment_id);
  res.json(list.map(sanitize));
});

// POST /api/integrations — create or update
router.post('/', (req, res) => {
  const { environment_id, provider_slug, config, enabled = true, notes } = req.body;
  if (!environment_id || !provider_slug) return res.status(400).json({ error: 'environment_id and provider_slug required' });
  const cat = CATALOG.find(c => c.slug === provider_slug);
  if (!cat) return res.status(404).json({ error: 'Provider not found' });

  // Encrypt secret fields + apply raw values to process.env for live messaging
  const encConfig = {};
  for (const [key, val] of Object.entries(config || {})) {
    const field = (cat.fields || []).find(f => f.key === key);
    if (!val) continue;
    if (val.includes('••••')) continue; // skip masked values
    if (field?.secret) {
      encConfig[key] = encrypt(val);
    } else {
      encConfig[key] = val;
    }
    // Set raw value in process.env so messaging service picks it up immediately
    process.env[key] = val;
  }

  const store = getStore();
  if (!Array.isArray(store.integrations)) store.integrations = Object.values(store.integrations || {});
  const idx = store.integrations.findIndex(i => i.environment_id === environment_id && i.provider_slug === provider_slug);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const merged = { ...store.integrations[idx].config, ...encConfig };
    store.integrations[idx] = { ...store.integrations[idx], config: merged, enabled, notes, status: 'pending_test', updated_at: now };
    saveStore();
    return res.json(sanitize(store.integrations[idx]));
  }

  const integration = { id: uuidv4(), environment_id, provider_slug, provider_name: cat.name,
    provider_category: cat.category, config: encConfig, enabled, notes,
    status: 'pending_test', last_tested_at: null, test_result: null,
    created_at: now, updated_at: now };
  store.integrations.push(integration);
  saveStore();
  res.status(201).json(sanitize(integration));
});

// PATCH /api/integrations/:id
router.patch('/:id', (req, res) => {
  const store = getStore();
  const list = Array.isArray(store.integrations) ? store.integrations : Object.values(store.integrations || {});
  const idx = list.findIndex(i => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  const { enabled, notes } = req.body;
  const now = new Date().toISOString();
  if (enabled !== undefined) list[idx].enabled = enabled;
  if (notes !== undefined) list[idx].notes = notes;
  list[idx].updated_at = now;
  if (!Array.isArray(store.integrations)) store.integrations = list;
  saveStore();
  res.json(sanitize(list[idx]));
});

// DELETE /api/integrations/:id
router.delete('/:id', (req, res) => {
  const store = getStore();
  if (!Array.isArray(store.integrations)) store.integrations = Object.values(store.integrations || {});
  store.integrations = store.integrations.filter(i => i.id !== req.params.id);
  saveStore();
  res.json({ ok: true });
});

// POST /api/integrations/:id/test
router.post('/:id/test', async (req, res) => {
  const store = getStore();
  const list = Array.isArray(store.integrations) ? store.integrations : Object.values(store.integrations || {});
  const integration = list.find(i => i.id === req.params.id);
  if (!integration) return res.status(404).json({ error: 'Not found' });
  const cat = CATALOG.find(c => c.slug === integration.provider_slug);

  // Decrypt config for testing
  const cfg = {};
  for (const [k, v] of Object.entries(integration.config || {})) cfg[k] = decrypt(v) || v;

  let result = { ok: false, message: 'Live test not available — credentials look valid' };
  try {
    switch (integration.provider_slug) {
      case 'bamboohr': {
        const r = await fetch(`https://api.bamboohr.com/api/gateway.php/${cfg.subdomain}/v1/employees/directory`,
          { headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.api_key}:x`).toString('base64'), Accept: 'application/json' } });
        result = r.ok ? { ok:true, message:'Connected to BambooHR successfully' } : { ok:false, message:`BambooHR returned ${r.status}` };
        break;
      }
      case 'slack': {
        const r = await fetch(cfg.webhook_url, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ text:'✅ Vercentic integration test — Slack is connected!' }) });
        result = r.ok ? { ok:true, message:'Test message sent to Slack' } : { ok:false, message:`Slack returned ${r.status}` };
        break;
      }
      case 'microsoft_teams': {
        const r = await fetch(cfg.webhook_url, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ text:'✅ Vercentic integration test — Teams is connected!' }) });
        result = r.ok ? { ok:true, message:'Test message sent to Teams' } : { ok:false, message:`Teams returned ${r.status}` };
        break;
      }
      case 'checkr': {
        const r = await fetch('https://api.checkr.com/v1/account',
          { headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.api_key}:`).toString('base64') } });
        result = r.ok ? { ok:true, message:'Connected to Checkr successfully' } : { ok:false, message:`Checkr returned ${r.status}` };
        break;
      }
      case 'twilio': {
        const auth = Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64');
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.TWILIO_ACCOUNT_SID}.json`,
          { headers: { Authorization: `Basic ${auth}` } });
        if (r.ok) {
          const acct = await r.json();
          result = { ok:true, message:`Connected to Twilio — account "${acct.friendly_name}" (${acct.status})` };
        } else {
          result = { ok:false, message:`Twilio returned ${r.status} — check Account SID and Auth Token` };
        }
        break;
      }
      case 'sendgrid': {
        const r = await fetch('https://api.sendgrid.com/v3/user/profile',
          { headers: { Authorization: `Bearer ${cfg.SENDGRID_API_KEY}` } });
        result = r.ok ? { ok:true, message:'Connected to SendGrid successfully' } : { ok:false, message:`SendGrid returned ${r.status} — check API key` };
        break;
      }
      default: {
        const requiredFields = (cat?.fields || []).filter(f => f.required);
        const allSet = requiredFields.every(f => cfg[f.key]);
        result = allSet ? { ok:true, message:'All required credentials are configured' } : { ok:false, message:'Missing required credentials' };
      }
    }
  } catch (e) { result = { ok:false, message:`Connection error: ${e.message}` }; }

  // Save result
  const now = new Date().toISOString();
  if (Array.isArray(store.integrations)) {
    const idx = store.integrations.findIndex(i => i.id === req.params.id);
    if (idx >= 0) { store.integrations[idx].last_tested_at = now; store.integrations[idx].test_result = result; store.integrations[idx].status = result.ok ? 'active' : 'error'; }
  }
  saveStore();
  res.json(result);
});

// ── Monitor endpoints ───────────────────────────────────────────────────────

// GET /api/integrations/monitor?environment_id=
// Returns connected providers with health stats + recent events
router.get('/monitor', (req, res) => {
  const { environment_id, limit = 200 } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const list = Array.isArray(getStore().integrations)
    ? getStore().integrations : Object.values(getStore().integrations || {});
  const connected = list.filter(i => i.environment_id === environment_id);
  const events = getEventLog(environment_id, Number(limit));

  // Build per-provider stats from event log
  const providerStats = {};
  for (const ev of events) {
    if (!providerStats[ev.provider]) providerStats[ev.provider] = { total: 0, success: 0, errors: 0, last_event: null };
    providerStats[ev.provider].total++;
    if (ev.ok) providerStats[ev.provider].success++;
    else       providerStats[ev.provider].errors++;
    if (!providerStats[ev.provider].last_event) providerStats[ev.provider].last_event = ev.timestamp;
  }

  // Enrich connected providers with stats
  const providers = connected.map(i => {
    const stats = providerStats[i.provider_slug] || { total: 0, success: 0, errors: 0, last_event: null };
    const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : null;
    return {
      id: i.id, provider_slug: i.provider_slug, provider_name: i.provider_name,
      provider_category: i.provider_category, status: i.status, enabled: i.enabled,
      last_tested_at: i.last_tested_at, test_result: i.test_result,
      events_total: stats.total, events_success: stats.success, events_errors: stats.errors,
      success_rate: successRate, last_event_at: stats.last_event,
    };
  });

  // Summary counts
  const summary = {
    total_connected: connected.length,
    active: connected.filter(i => i.status === 'active' && i.enabled !== false).length,
    errors: connected.filter(i => i.status === 'error').length,
    pending_test: connected.filter(i => i.status === 'pending_test').length,
    events_today: events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 86400000)).length,
    events_success_today: events.filter(e => e.ok && new Date(e.timestamp) > new Date(Date.now() - 86400000)).length,
    events_errors_today: events.filter(e => !e.ok && new Date(e.timestamp) > new Date(Date.now() - 86400000)).length,
  };

  res.json({ summary, providers, events });
});

// GET /api/integrations/monitor/events — alias that returns just the event log
router.get('/monitor/events', (req, res) => {
  const { environment_id, limit = 100 } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const events = getEventLog(environment_id, Number(limit));
  res.json({ events });
});

// POST /api/integrations/monitor/log — manual event logging (for connector_actions)
router.post('/monitor/log', (req, res) => {
  const { environment_id, provider, action, ok, detail, duration_ms } = req.body;
  if (!environment_id || !provider || !action) return res.status(400).json({ error: 'environment_id, provider, action required' });
  logEvent(environment_id, { provider, action, ok: !!ok, detail: detail || '', durationMs: duration_ms });
  res.json({ ok: true });
});

// ── Backward-compat: keep old Twilio/SendGrid PUT endpoint ───────────────────
router.get('/status', (req, res) => {
  try { const { getProviderStatus } = require('../services/messaging'); res.json(getProviderStatus()); }
  catch { res.json({}); }
});
router.put('/:provider', (req, res) => {
  const ALLOWED = { twilio:['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_SMS_NUMBER','TWILIO_WA_NUMBER'],
    sendgrid:['SENDGRID_API_KEY','SENDGRID_FROM_EMAIL','SENDGRID_FROM_NAME'], webhook:['WEBHOOK_BASE_URL'] };
  const allowed = ALLOWED[req.params.provider];
  if (!allowed) return res.status(400).json({ error: `Unknown provider: ${req.params.provider}` });
  const store = getStore();
  if (!store.integrations || Array.isArray(store.integrations)) return res.status(400).json({ error: 'Use POST /api/integrations instead' });
  if (!store.integrations[req.params.provider]) store.integrations[req.params.provider] = {};
  for (const key of allowed) { if (req.body[key]) { store.integrations[req.params.provider][key] = req.body[key]; process.env[key] = req.body[key]; } }
  saveStore();
  res.json({ ok: true });
});

// ── Store init + load saved credentials into process.env ──────────────────────
try {
  const s = getStore();
  if (!s.integrations) { s.integrations = []; saveStore(); }
  // On startup, restore saved credentials to process.env so messaging service works immediately
  const ENV_KEYS = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_SMS_NUMBER','TWILIO_WA_NUMBER',
    'SENDGRID_API_KEY','SENDGRID_FROM_EMAIL','SENDGRID_FROM_NAME','RESEND_API_KEY','WEBHOOK_BASE_URL'];
  const list = Array.isArray(s.integrations) ? s.integrations : Object.values(s.integrations || {});
  for (const integration of list) {
    if (!integration.config || integration.enabled === false) continue;
    for (const [key, val] of Object.entries(integration.config)) {
      if (!ENV_KEYS.includes(key) || !val) continue;
      const decrypted = val.includes(':') ? decrypt(val) : val;
      if (decrypted && !decrypted.includes('••••')) {
        process.env[key] = decrypted;
      }
    }
  }
  const loaded = ENV_KEYS.filter(k => process.env[k] && process.env[k] !== 'YOUR_ACCOUNT_SID');
  if (loaded.length) console.log(`[integrations] Restored ${loaded.length} credentials from store:`, loaded.join(', '));
} catch(e) { console.error('Integrations store init:', e.message); }

module.exports = router;
