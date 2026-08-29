const express = require('express');
const router = express.Router();
const { query, getStore } = require('../db/init');
const { v4: uid } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MODEL_DEFAULT } = require('../config/ai_models');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function getPortal(portalId) {
  const store = getStore();
  return (store.portals || []).find(p => p.id === portalId && p.status === 'published' && !p.deleted_at);
}

function getOpenJobs(environmentId) {
  const store = getStore();
  const jobsObj = (store.objects || []).find(o => o.environment_id === environmentId && o.slug === 'jobs');
  if (!jobsObj) return [];
  return (store.records || [])
    .filter(r => r.object_id === jobsObj.id && !r.deleted_at)
    .filter(r => { const s = (r.data?.status || '').toLowerCase(); return s === 'open' || s === 'active' || !s; })
    .map(r => ({
      id: r.id,
      title: r.data?.job_title || r.data?.name || 'Untitled',
      department: r.data?.department || '',
      location: r.data?.location || '',
      work_type: r.data?.work_type || '',
      employment_type: r.data?.employment_type || '',
      salary_min: r.data?.salary_min,
      salary_max: r.data?.salary_max,
      summary: r.data?.summary || r.data?.description || '',
      skills: r.data?.skills || r.data?.required_skills || [],
    }));
}

function getCompanyInfo(portal) {
  const br = portal.theme || portal.branding || {};
  return {
    company_name: br.company_name || 'Our company',
    tagline: br.tagline || '',
    description: br.description || '',
  };
}

router.post('/chat', async (req, res) => {
  const { portal_id, messages, session_id } = req.body;
  if (!portal_id || !messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'portal_id and messages[] required' });

  const portal = getPortal(portal_id);
  if (!portal) return res.status(404).json({ error: 'Portal not found or not published' });

  const copilotConfig = portal.copilot || {};
  if (!copilotConfig.enabled) return res.status(403).json({ error: 'Copilot not enabled on this portal' });

  const company = getCompanyInfo(portal);
  const jobs = getOpenJobs(portal.environment_id);
  const copilotName = copilotConfig.name || (company.company_name ? `${company.company_name} Assistant` : 'Career Assistant');

  const jobsList = jobs.length > 0
    ? jobs.map((j, i) => {
        let line = `${i + 1}. ${j.title}`;
        if (j.department) line += ` | Dept: ${j.department}`;
        if (j.location) line += ` | Location: ${j.location}`;
        if (j.work_type) line += ` | ${j.work_type}`;
        if (j.employment_type) line += ` | ${j.employment_type}`;
        if (j.salary_min && j.salary_max) line += ` | Salary: ${j.salary_min}-${j.salary_max}`;
        if (j.summary) line += `\n   ${j.summary.slice(0, 200)}`;
        if (Array.isArray(j.skills) && j.skills.length) line += `\n   Skills: ${j.skills.join(', ')}`;
        return line;
      }).join('\n')
    : 'No open positions at this time.';

  const systemPrompt = `You are ${copilotName}, a friendly and professional recruitment assistant on ${company.company_name}'s career site.
Your name is "${copilotName}" — always introduce yourself by this name if asked.
${company.tagline ? `Company tagline: "${company.tagline}"` : ''}
${company.description ? `About the company: ${company.description}` : ''}
${copilotConfig.welcome_context || ''}

YOUR ROLE:
- Help candidates explore open positions and answer questions about roles
- Guide candidates through the application process
- Be warm, encouraging, and professional — you represent ${company.company_name}
- Never reveal internal information, salaries beyond what's listed, or details about other candidates

OPEN POSITIONS (${jobs.length} total):
${jobsList}

CAPABILITIES:
1. SEARCH/RECOMMEND JOBS: When a candidate asks about roles, recommend matching ones from the list above.
   Output job recommendations as:
   <JOB_CARDS>[{"id":"...","title":"...","department":"...","location":"...","work_type":"...","employment_type":"...","summary":"first 200 chars","skills":["skill1"],"salary_min":null,"salary_max":null}]</JOB_CARDS>
   Include ALL available fields. Show up to 5 relevant jobs. Always include JOB_CARDS when recommending jobs.
   The candidate will see two buttons: "View details" and "Apply now".

2. DESCRIBE A JOB: When asked for details about a role, give a rich description including responsibilities, requirements, team info.
   Highlight listed skills and salary. End with encouragement and remind them they can apply directly.

3. START APPLICATION: When a candidate wants to apply, collect: full name, email, phone (optional), brief message of interest.
   Ask if they want to upload a CV. Once you have name + email, output:
   <APPLICATION>{"job_id":"...","job_title":"...","first_name":"...","last_name":"...","email":"...","phone":"...","cover_note":"..."}</APPLICATION>

4. ANSWER QUESTIONS: Answer general questions about company, culture, benefits, application process. Be honest if unsure.

5. DOCUMENT UPLOAD: When a candidate mentions uploading a CV, tell them to use the attachment button next to the input.

6. NO STRONG MATCH → TALENT COMMUNITY: If there is no open role that's a genuinely good match for the candidate — even after considering adjacent or transferable roles — be honest about that rather than forcing a weak recommendation. Warmly invite them to join our Talent Community so we can reach out personally when a better-fit role opens up. Whenever you make this offer, include the tag <TALENT_CTA>true</TALENT_CTA> in your reply (you can still include JOB_CARDS alongside it if you're suggesting a few adjacent roles worth a look, but the community invite should always appear when nothing is a strong fit).

RULES:
- Never invent jobs not in the list above
- Never share other candidates' information
- Never discuss salary unless listed
- Keep responses concise — 2-3 short paragraphs max
- Use the candidate's first name once they share it`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  try {
    // Anthropic's Messages API rejects message objects with any extra fields
    // beyond {role, content} — frontend chat state often carries extra UI
    // metadata (e.g. `cards`, `parsed`) on message objects for rendering,
    // so strip everything down before forwarding.
    const cleanMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL_DEFAULT, max_tokens: 1024, system: systemPrompt, messages: cleanMessages }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[portal-copilot] API error:', response.status, errBody.slice(0, 500));
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
    const data = await response.json();
    const text = (data.content || []).map(c => c.text || '').join('');
    res.json({ reply: text, session_id: session_id || uid() });
  } catch (e) {
    console.error('[portal-copilot] Error:', e.message);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Submit application from copilot
router.post('/apply', upload.single('cv'), async (req, res) => {
  try {
    const { portal_id, job_id, job_title, first_name, last_name, email, phone, cover_note } = req.body;
    if (!portal_id || !email || !first_name)
      return res.status(400).json({ error: 'portal_id, first_name, and email required' });
    const portal = getPortal(portal_id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const store = getStore();
    const { saveStore } = require('../db/init');

    const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
    if (!peopleObj) return res.status(400).json({ error: 'People object not configured' });

    let personRecord = (store.records || []).find(r => r.object_id === peopleObj.id && r.data?.email === email && !r.deleted_at);
    if (!personRecord) {
      personRecord = {
        id: uid(), object_id: peopleObj.id, environment_id: portal.environment_id,
        data: { first_name, last_name: last_name || '', email, phone: phone || '', status: 'Active', source: 'Career Site Copilot', person_type: 'Candidate' },
        created_by: 'portal-copilot', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (!store.records) store.records = [];
      store.records.push(personRecord);
    }

    if (req.file) {
      if (!store.attachments) store.attachments = [];
      store.attachments.push({
        id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
        file_name: req.file.originalname, file_path: req.file.path, file_size: req.file.size,
        mime_type: req.file.mimetype, file_type_name: 'CV / Resume',
        uploaded_by: 'portal-copilot', created_at: new Date().toISOString(),
      });
    }

    if (!store.activity) store.activity = [];
    store.activity.push({
      id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
      action: 'applied_via_copilot', actor: 'portal-copilot',
      details: { job_id, job_title, portal_id, portal_name: portal.name, cover_note, has_cv: !!req.file },
      created_at: new Date().toISOString(),
    });

    if (job_id) {
      if (!store.people_links) store.people_links = [];
      const linked = store.people_links.some(l => l.person_id === personRecord.id && l.record_id === job_id && !l.deleted_at);
      if (!linked) {
        store.people_links.push({
          id: uid(), person_id: personRecord.id, record_id: job_id,
          environment_id: portal.environment_id,
          workflow_id: null, stage_id: null, stage_name: 'Applied',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
      }
    }

    if (cover_note) {
      if (!store.notes) store.notes = [];
      store.notes.push({
        id: uid(), record_id: personRecord.id,
        content: `Applied via ${portal.name || 'career site'} copilot${job_title ? ` for ${job_title}` : ''}: ${cover_note}`,
        created_by: 'portal-copilot', created_at: new Date().toISOString(),
      });
    }

    saveStore();
    res.json({ success: true, person_id: personRecord.id, message: 'Application submitted successfully' });
  } catch (e) {
    console.error('[portal-copilot] Apply error:', e.message);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Resolve which People fields the Talent Community sign-up form should
// collect for this portal (admin-configured in Portal Settings → Copilot),
// plus which Talent Pool it connects to — public, read-only, no auth needed
// since it only returns field labels/types, never candidate data.
router.get('/talent-community-fields', (req, res) => {
  const { portal_id } = req.query;
  if (!portal_id) return res.status(400).json({ error: 'portal_id required' });
  const portal = getPortal(portal_id);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  const store = getStore();

  const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
  if (!peopleObj) return res.json({ fields: [], talent_pool_id: null, talent_pool_name: null });

  const allFields = (store.fields || []).filter(f => f.object_id === peopleObj.id);
  const cop = portal.copilot || {};
  const selectedKeys = Array.isArray(cop.talent_community_fields) && cop.talent_community_fields.length
    ? cop.talent_community_fields
    : ['first_name', 'last_name', 'email', 'phone'];

  // first_name + email are always collected and required, even if an
  // admin's saved config predates this feature or omits them by mistake —
  // the backend won't create a record without them either way.
  const keySet = new Set([...selectedKeys, 'first_name', 'email']);
  const orderOf = k => { const i = selectedKeys.indexOf(k); return i === -1 ? 999 : i; };
  const fields = allFields
    .filter(f => keySet.has(f.api_key))
    .map(f => ({
      api_key: f.api_key,
      name: f.name,
      field_type: f.field_type,
      options: f.options || null,
      required: f.api_key === 'first_name' || f.api_key === 'email',
    }))
    .sort((a, b) => orderOf(a.api_key) - orderOf(b.api_key));

  let poolName = null;
  const poolId = cop.talent_pool_id || null;
  if (poolId) {
    const poolRec = (store.records || []).find(r => r.id === poolId && !r.deleted_at);
    poolName = poolRec?.data?.pool_name || poolRec?.data?.name || null;
  }

  res.json({ fields, talent_pool_id: poolId, talent_pool_name: poolName });
});

// Join the talent community — used when the copilot has no strong-fit open
// role for a candidate, so they can stay on file for future openings instead
// of hitting a dead end. Mirrors /apply closely but tags the person record
// rather than linking them to a specific job.
router.post('/join-community', upload.single('cv'), async (req, res) => {
  try {
    const { portal_id, note } = req.body;
    if (!portal_id) return res.status(400).json({ error: 'portal_id required' });
    const portal = getPortal(portal_id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const store = getStore();
    const { saveStore } = require('../db/init');

    const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
    if (!peopleObj) return res.status(400).json({ error: 'People object not configured' });

    // Only accept values for fields that are actually defined on the People
    // object — the admin-configured "fields collected" set (or the default
    // first/last/email/phone) drives what the widget sends, but this is the
    // real gate against arbitrary data landing on the record.
    const peopleFields = (store.fields || []).filter(f => f.object_id === peopleObj.id);
    const fieldMeta = new Map(peopleFields.map(f => [f.api_key, f]));
    const fieldValues = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (!fieldMeta.has(k) || v === undefined || v === '') continue;
      const type = fieldMeta.get(k).field_type;
      if (type === 'multi_select') {
        try { fieldValues[k] = JSON.parse(v); } catch { fieldValues[k] = [v]; }
      } else if (type === 'boolean') {
        fieldValues[k] = v === 'true' || v === true;
      } else {
        fieldValues[k] = v;
      }
    }

    const email = fieldValues.email;
    const firstName = fieldValues.first_name;
    if (!email || !firstName)
      return res.status(400).json({ error: 'first_name and email required' });

    let personRecord = (store.records || []).find(r => r.object_id === peopleObj.id && r.data?.email === email && !r.deleted_at);
    if (!personRecord) {
      personRecord = {
        id: uid(), object_id: peopleObj.id, environment_id: portal.environment_id,
        data: { status: 'Active', source: 'Career Site Copilot', person_type: 'Candidate', ...fieldValues, talent_community: true },
        created_by: 'portal-copilot', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (!store.records) store.records = [];
      store.records.push(personRecord);
    } else {
      personRecord.data = { ...personRecord.data, ...fieldValues, talent_community: true };
      personRecord.updated_at = new Date().toISOString();
    }

    if (req.file) {
      if (!store.attachments) store.attachments = [];
      store.attachments.push({
        id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
        file_name: req.file.originalname, file_path: req.file.path, file_size: req.file.size,
        mime_type: req.file.mimetype, file_type_name: 'CV / Resume',
        uploaded_by: 'portal-copilot', created_at: new Date().toISOString(),
      });
    }

    if (!store.activity) store.activity = [];
    store.activity.push({
      id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
      action: 'joined_talent_community', actor: 'portal-copilot',
      details: { portal_id, portal_name: portal.name, note, has_cv: !!req.file },
      created_at: new Date().toISOString(),
    });

    // Optionally link into a specific Talent Pool record, if the portal's
    // copilot config names one — falls back to just tagging the person
    // record above when it doesn't (no admin UI for this setting yet).
    const poolId = portal.copilot?.talent_pool_id;
    if (poolId) {
      if (!store.people_links) store.people_links = [];
      const linked = store.people_links.some(l => l.person_id === personRecord.id && l.record_id === poolId && !l.deleted_at);
      if (!linked) {
        store.people_links.push({
          id: uid(), person_id: personRecord.id, record_id: poolId,
          environment_id: portal.environment_id,
          workflow_id: null, stage_id: null, stage_name: 'Talent Community',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
      }
    }

    saveStore();
    res.json({ success: true, person_id: personRecord.id, message: 'Joined talent community' });
  } catch (e) {
    console.error('[portal-copilot] join-community error:', e.message);
    res.status(500).json({ error: 'Failed to join talent community' });
  }
});

// Upload a document during copilot conversation
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ file_id: uid(), file_name: req.file.originalname, file_size: req.file.size, file_path: req.file.path, mime_type: req.file.mimetype });
});

// Public job listing for copilot
router.get('/jobs', (req, res) => {
  const { portal_id } = req.query;
  if (!portal_id) return res.status(400).json({ error: 'portal_id required' });
  const portal = getPortal(portal_id);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  res.json(getOpenJobs(portal.environment_id));
});

module.exports = router;
