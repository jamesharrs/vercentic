const express = require('express');
const router = express.Router();
const { query, getStore, saveStore, tenantStorage } = require('../db/init');
const { sendEmail } = require('../services/messaging');
const { v4: uid } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MODEL_DEFAULT } = require('../config/ai_models');
const { hasLinkedPersonWorkflow, resolveFirstStage } = require('../utils/pipelineStage');

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

// multer's multipart parsing (busboy under the hood) resolves/calls its next()
// from outside the synchronous call stack that AsyncLocalStorage.run() tracks —
// in practice this silently drops the tenant context tenantMiddleware just set
// up, so every route below that takes a file upload re-enters the correct
// tenant context (captured on req.tenantSlug by tenantMiddleware, which is a
// plain property and so is immune to this) right after the upload.* middleware
// finishes, before touching getStore()/getPortal() at all.
function reenterTenant(req, res, next) {
  tenantStorage.run(req.tenantSlug || 'master', next);
}

function getPortal(portalId) {
  const store = getStore();
  return (store.portals || []).find(p => p.id === portalId && p.status === 'published' && !p.deleted_at);
}

// Coerces one submitted form-field value (always a string or undefined, since
// it's arriving through multipart/FormData) back into the shape the record
// store expects for that field's real type.
//
// The frontend (PortalPageRenderer.jsx submitApplication/submitTalentCommunity,
// and the CV-parser raw-fallback merge) JSON.stringifies EVERY array value
// before appending it to FormData — multi_select answers, pill-edited skills
// lists, and whatever array-shaped fields the CV parser found (skills,
// education, work_history, languages, certifications…) all arrive as JSON
// text like '["Node.js","React"]'.
//
// This used to only get JSON.parsed back out when the People object's field
// definition said `field_type === 'multi_select' || 'table'` — but fields
// like the dedicated 'skills' type (FieldModal.jsx's own first-class type,
// distinct from multi_select) fell through to the plain string branch, so
// the raw JSON text was stored and then rendered as one giant literal
// '["Node.js","React"]' pill in the main app instead of individual chips.
// Rather than hand-list every array-capable field_type here (and risk
// missing the next one), we lead with a value-shape check: any string that
// looks like a JSON array is parsed as one regardless of the field's
// declared type, then fall back to the old type-based check for anything
// that doesn't match that shape.
function coerceFieldValue(type, v) {
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('[') && t.endsWith(']')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not actually JSON — fall through */ }
    }
  }
  // Fallback for values that arrive as a bare, non-JSON string (e.g. a
  // single skill typed/confirmed in conversation, like "C++") on a field
  // whose type is inherently array-shaped — these never match the
  // bracket-detection heuristic above since there's nothing JSON-y about
  // them, so without this the value would be stored as a lone string
  // instead of a one-item array, then rendered as a single giant pill
  // rather than an editable/addable chip. 'skills' is FieldModal.jsx's own
  // first-class field type (distinct from multi_select) and was the
  // reported case; multi_select/table are kept from the original check.
  if (type === 'multi_select' || type === 'table' || type === 'skills') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [v];
    } catch { return [v]; }
  }
  if (type === 'boolean') return v === 'true' || v === true;
  return v;
}

function getOpenJobs(environmentId) {
  const store = getStore();
  const jobsObj = (store.objects || []).find(o => o.environment_id === environmentId && o.slug === 'jobs');
  if (!jobsObj) return [];
  return (store.records || [])
    .filter(r => r.object_id === jobsObj.id && !r.deleted_at)
    .filter(r => { const s = (r.data?.status || '').toLowerCase(); return s === 'open' || s === 'active' || !s; })
    // Jobs must have a Linked Person workflow attached before they can be
    // surfaced on the career site — otherwise applicants land in an
    // un-bucketed pipeline stage the admin Application Pipeline can't show.
    .filter(r => hasLinkedPersonWorkflow(store, r.id))
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

// Admin-configured "which People fields does the chatbot's application flow
// collect" (Portal Settings → Flows → Chatbot), plus whether it should ask
// about a CV upload before anything else. Falls back to the historical
// first/last/email/phone set + CV-first-on when nothing's been configured
// yet, so existing portals keep working unchanged.
const DEFAULT_APPLICATION_FIELD_KEYS = ['first_name', 'last_name', 'email', 'phone'];
function getApplicationFieldsConfig(portal) {
  const store = getStore();
  const cop = portal.copilot || {};
  const cvFirst = cop.cv_first !== false;
  const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
  if (!peopleObj) return { cvFirst, fields: [] };

  const selectedKeys = Array.isArray(cop.application_fields) && cop.application_fields.length
    ? cop.application_fields
    : DEFAULT_APPLICATION_FIELD_KEYS;
  const keySet = new Set([...selectedKeys, 'first_name', 'email']);
  const orderOf = k => { const i = selectedKeys.indexOf(k); return i === -1 ? 999 : i; };
  const allFields = (store.fields || []).filter(f => f.object_id === peopleObj.id);
  const fields = allFields
    .filter(f => keySet.has(f.api_key))
    .map(f => ({ api_key: f.api_key, name: f.name, field_type: f.field_type, options: f.options || null,
      required: f.api_key === 'first_name' || f.api_key === 'email' }))
    .sort((a, b) => orderOf(a.api_key) - orderOf(b.api_key));
  return { cvFirst, fields };
}

// ── Job Application form + edit-window verification helpers ──────────────────
//
// The chatbot's cover_note used to be dumped into an unscoped store.notes
// entry — invisible in reports, unsearchable, and mixed in with general
// person-level notes regardless of which job it was actually about. This
// finds-or-creates a real, per-environment "Job Application" form (via the
// existing Forms engine) so cover notes land as a proper form_response
// scoped to (person, job) — searchable, reportable, and shown in its own
// Forms tab rather than bleeding into the Notes panel.
const SECURITY_DEFAULT_EDIT_WINDOW_MIN = 30;

function ensureJobApplicationForm(store, environmentId) {
  if (!store.forms) store.forms = [];
  let form = store.forms.find(f => f.environment_id === environmentId && f.slug === 'job_application' && !f.deleted_at);
  if (form) return form;
  const now = new Date().toISOString();
  form = {
    id: uid(),
    environment_id: environmentId,
    name: 'Job Application',
    description: 'Captures job-specific application details submitted via the career site, such as the cover note.',
    slug: 'job_application',
    category: 'screening',
    applies_to: ['people'],
    fields: [
      { id: uid(), api_key: 'cover_note', name: 'Cover Note', field_type: 'long_text', required: false },
    ],
    sharing: 'internal',
    share_token: uid().slice(0, 16),
    confidential: false,
    allow_multiple: true,
    show_in_record: true,
    searchable: true,
    parseable: false,
    status: 'active',
    created_by: 'portal-copilot',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  store.forms.push(form);
  return form;
}

// Finds the existing Job Application form_response for this exact
// (person, job) pair, if one exists — used both to decide whether a
// submission is a first-time apply vs a returning edit, and to gate edits
// outside the configured edit window.
function findExistingApplicationResponse(store, environmentId, personId, jobId) {
  if (!personId || !jobId) return null;
  const form = (store.forms || []).find(f => f.environment_id === environmentId && f.slug === 'job_application' && !f.deleted_at);
  if (!form) return null;
  return (store.form_responses || []).find(r => !r.deleted_at && r.form_id === form.id && r.record_id === personId && r.context_record_id === jobId) || null;
}

// Finds this exact (person, job) application's people_links row — unlike
// findExistingApplicationResponse above (which only exists if the candidate
// happened to give a cover note, since that's the one optional field that
// triggers creating a Job Application form_response), a people_links row is
// created unconditionally on every successful /apply to a resolved job.
// This makes it the one signal guaranteed to exist for "has this person
// already applied to this job" and "when did they last touch it", which is
// what the edit-window re-verification gate actually needs — gating on the
// form_response instead silently let every cover-note-less (re-)application
// through with no re-verification at all, since findExistingApplicationResponse
// would return null even for a returning candidate.
function findExistingApplicationLink(store, personId, jobId) {
  if (!personId || !jobId) return null;
  return (store.people_links || []).find(l => !l.deleted_at && l.person_record_id === personId && l.target_record_id === jobId) || null;
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
        // ID is included so the model has a real, exact identifier to copy
        // into JOB_CARDS/APPLICATION output — without it here, the model
        // has no grounding for job_id and is forced to guess/invent one,
        // which silently breaks the job link on submission (see /apply).
        let line = `${i + 1}. ${j.title} | ID: ${j.id}`;
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

  // Admin-configured application-flow behaviour (Portal Settings → Flows →
  // Chatbot): whether to lead with the CV-upload prompt, and which extra
  // People fields (beyond the historical name/email/phone) to try to
  // collect conversationally. Both feed directly into capability #3 below.
  const appFieldsCfg = getApplicationFieldsConfig(portal);
  const baseAppKeys = new Set(['first_name', 'last_name', 'email', 'phone']);
  const extraAppFields = appFieldsCfg.fields.filter(f => !baseAppKeys.has(f.api_key));
  const extraFieldsBlock = extraAppFields.length
    ? `   Also try to naturally collect (never interrogate — it's completely fine to skip any the candidate doesn't want to share):\n${extraAppFields.map(f => `   - ${f.name} (key: "${f.api_key}")`).join('\n')}`
    : '';
  const cvFirstBlock = appFieldsCfg.cvFirst
    ? `   Your VERY FIRST step when a candidate wants to apply is to ask if they have a CV/resume to upload — explain that uploading it lets you pull their details automatically, making applying faster and easier for them. Wait for their reply (they upload one, or say they don't have one / would rather not) before asking for anything else.`
    : '';
  const applicationSchemaKeys = ['job_id', 'job_title', 'first_name', 'last_name', 'email', 'phone', 'cover_note', ...extraAppFields.map(f => f.api_key)];
  const applicationSchemaExample = applicationSchemaKeys.map(k => `"${k}":"..."`).join(',');

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
   The "id" MUST be copied EXACTLY from the "ID:" field of that job in the OPEN POSITIONS list above — never invent, shorten, guess, or reuse a title as an id. Include ALL available fields. Show up to 5 relevant jobs. Always include JOB_CARDS when recommending jobs.
   The candidate will see two buttons: "View details" and "Apply now".

2. DESCRIBE A JOB: When asked for details about a role, give a rich description including responsibilities, requirements, team info.
   Highlight listed skills and salary. End with encouragement and remind them they can apply directly.

3. START APPLICATION: When a candidate wants to apply:
${cvFirstBlock}
   Collect: full name, email, phone (optional), brief message of interest.
${extraFieldsBlock}
   Once you have at least name + email, output:
   <APPLICATION>{${applicationSchemaExample}}</APPLICATION>
   CRITICAL: "job_id" MUST be the exact "ID:" value from the OPEN POSITIONS list above for the specific role they're applying to — copy it character-for-character, never invent, guess, truncate, or leave it blank. If you are not 100% sure which open position they mean, ask them to confirm/pick one from the list before outputting the APPLICATION tag. Only include a key in the APPLICATION JSON if the candidate actually told you that value — never invent or guess extra field values, and omit any key you don't have a real answer for. The APPLICATION block must be valid, strict JSON — no trailing commas, no comments, no unescaped quotes inside string values.

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
router.post('/apply', upload.single('cv'), reenterTenant, async (req, res) => {
  try {
    const { portal_id, job_id, job_title, first_name, last_name, email, phone, cover_note } = req.body;
    if (!portal_id || !email || !first_name)
      return res.status(400).json({ error: 'portal_id, first_name, and email required' });
    const portal = getPortal(portal_id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const store = getStore();

    const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
    if (!peopleObj) return res.status(400).json({ error: 'People object not configured' });

    // Accept any value that matches a real People-object field, not just the
    // historical name/email/phone quartet — this is what lets (a) admin-
    // configured extra application fields (Portal Settings → Flows →
    // Chatbot) and (b) CV-parsed data the frontend forwards silently even
    // when it wasn't part of the visible conversation both land on the
    // record. Mirrors /join-community's acceptance pattern exactly.
    const nonFieldKeys = new Set(['portal_id', 'job_id', 'job_title', 'cover_note']);
    const peopleFields = (store.fields || []).filter(f => f.object_id === peopleObj.id);
    const fieldMeta = new Map(peopleFields.map(f => [f.api_key, f]));
    const fieldValues = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (nonFieldKeys.has(k) || !fieldMeta.has(k) || v === undefined || v === '') continue;
      fieldValues[k] = coerceFieldValue(fieldMeta.get(k).field_type, v);
    }
    // first_name/email always win from the validated top-level vars, even if
    // the People object's field list is somehow missing them — every seeded
    // People object has these, but this keeps /apply working regardless.
    fieldValues.first_name = first_name;
    fieldValues.email = email;
    if (last_name) fieldValues.last_name = last_name;
    if (phone) fieldValues.phone = phone;

    // Resolve the job to link against BEFORE any store mutation — the AI can
    // mishandle an opaque UUID far more easily than a plain title it read
    // straight off the OPEN POSITIONS list (this was the actual root cause
    // of applications silently landing with no job link at all — job_id
    // would come through missing, blank, or hallucinated). If job_id
    // doesn't match a real record, fall back to an exact case-insensitive
    // title match among this portal's open jobs before giving up. Moved
    // ahead of the person lookup/creation so the edit-window gate below can
    // check it without mutating anything first.
    let resolvedJobId = (job_id && (store.records || []).some(r => r.id === job_id && !r.deleted_at)) ? job_id : null;
    if (!resolvedJobId && job_title) {
      const candidateJobs = getOpenJobs(portal.environment_id);
      const match = candidateJobs.find(j => j.title.trim().toLowerCase() === String(job_title).trim().toLowerCase());
      if (match) resolvedJobId = match.id;
    }

    // Read-only lookup — do NOT create/mutate the person record yet. A
    // returning candidate editing an existing job application is gated
    // below by the security-configured edit window before anything changes.
    // Normalised (trim + lowercase) so "Amy@Co.com" and "amy@co.com" (or a
    // stray trailing space from a mobile keyboard) are recognised as the
    // same candidate instead of silently creating a second person record.
    const emailNorm = String(email).trim().toLowerCase();
    const existingPersonRecord = (store.records || []).find(r => r.object_id === peopleObj.id && (r.data?.email || '').trim().toLowerCase() === emailNorm && !r.deleted_at);

    if (existingPersonRecord && resolvedJobId) {
      // See findExistingApplicationLink's comment: gate on the people_links
      // row (always created), not the Job Application form_response (only
      // created when a cover note was given), or the edit window silently
      // never triggers for the common case of an application with no note.
      const existingLink = findExistingApplicationLink(store, existingPersonRecord.id, resolvedJobId);
      if (existingLink) {
        const windowMin = store.security_settings?.application_edit_window_minutes ?? SECURITY_DEFAULT_EDIT_WINDOW_MIN;
        const lastTouched = new Date(existingLink.last_applied_at || existingLink.updated_at || existingLink.created_at).getTime();
        const withinWindow = (Date.now() - lastTouched) <= windowMin * 60 * 1000;
        if (!withinWindow) {
          // Outside the edit window and not (yet) re-verified — refuse with
          // zero mutations. The frontend's job is to call
          // /request-edit-code then /verify-edit-code, which re-anchors
          // this link's last_applied_at to now on success, then retries
          // this same /apply call — at which point it will read as
          // withinWindow above and proceed normally.
          return res.status(403).json({
            error: 'verification_required',
            message: "It's been a while since you applied — we've sent a verification code to your email so you can confirm it's really you before we update your application.",
            job_id: resolvedJobId, job_title,
          });
        }
      }
    }

    let personRecord = existingPersonRecord;
    if (!personRecord) {
      personRecord = {
        id: uid(), object_id: peopleObj.id, environment_id: portal.environment_id,
        data: { status: 'Active', source: 'Career Site Copilot', person_type: 'Candidate', ...fieldValues },
        created_by: 'portal-copilot', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      if (!store.records) store.records = [];
      store.records.push(personRecord);
    } else {
      // Merge rather than overwrite — a returning candidate, or one who
      // uploads a fuller CV on a second application, should only ever gain
      // data here, never lose previously-captured values.
      personRecord.data = { ...personRecord.data, ...fieldValues };
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
      action: 'applied_via_copilot', actor: 'portal-copilot',
      details: { job_id, job_title, portal_id, portal_name: portal.name, cover_note, has_cv: !!req.file },
      created_at: new Date().toISOString(),
    });

    // resolvedJobId was already resolved above (before the edit-window
    // gate) — reused here unchanged.
    if (resolvedJobId) {
      if (!store.people_links) store.people_links = [];
      // person_record_id/target_record_id (not person_id/record_id) is the
      // field-name convention every other write path uses — the admin
      // Application Pipeline widget (Workflows.jsx), stage-move actions,
      // AI screening, and the stage_stale task trigger all match strictly
      // on these two names with no fallback, so a row created under the
      // old person_id/record_id names was invisible to all of them (only
      // GET /api/people-links and GET /records/:id/people-links happen to
      // normalise/fall back to either shape for reads).
      const existingLink = store.people_links.find(l => l.person_record_id === personRecord.id && l.target_record_id === resolvedJobId && !l.deleted_at);
      if (!existingLink) {
        // Resolve the job's Linked Person workflow so the applicant lands on
        // a real stage — the Application Pipeline widget counts candidates
        // by matching people_links.stage_id against the assigned workflow's
        // step ids, so a null stage_id is never shown in any column.
        if (hasLinkedPersonWorkflow(store, resolvedJobId)) {
          const { stage_id, stage_name } = resolveFirstStage(store, resolvedJobId);
          const nowIso = new Date().toISOString();
          store.people_links.push({
            id: uid(), person_record_id: personRecord.id, target_record_id: resolvedJobId,
            environment_id: portal.environment_id,
            workflow_id: null, stage_id, stage_name,
            last_applied_at: nowIso,
            created_at: nowIso, updated_at: nowIso,
          });
        } else {
          // Job has no pipeline workflow attached (shouldn't normally happen —
          // getOpenJobs() excludes these — but guard direct/stale job_id
          // submissions too). Don't create an un-bucketed link; flag it on
          // the activity log instead so the application isn't silently lost.
          store.activity.push({
            id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
            action: 'application_unlinked_no_workflow', actor: 'portal-copilot',
            details: { job_id: resolvedJobId, original_job_id: job_id, job_title, reason: 'Job has no Linked Person workflow attached' },
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // Returning candidate re-applying/editing within the window (or
        // retrying right after successful edit-code verification) — re-anchor
        // last_applied_at so the edit-window gate above measures from this
        // submission, not a stale original one. updated_at is deliberately
        // left untouched — task_triggers.js's stage_stale trigger reads it as
        // "time since last stage change", which a same-stage resubmission
        // must not reset.
        existingLink.last_applied_at = new Date().toISOString();
      }
    } else if (job_id || job_title) {
      // Neither the submitted job_id nor a title fallback could be resolved
      // to a real job — previously this left zero trace anywhere (no
      // activity entry at all), making it indistinguishable from the
      // candidate never having mentioned a job. Log it so it's discoverable.
      store.activity.push({
        id: uid(), record_id: personRecord.id, object_id: peopleObj.id, environment_id: portal.environment_id,
        action: 'application_unlinked_no_job_match', actor: 'portal-copilot',
        details: { job_id, job_title, reason: 'Could not resolve job_id and no open-job title match was found' },
        created_at: new Date().toISOString(),
      });
    }

    if (cover_note) {
      if (resolvedJobId) {
        // Job-scoped: store the cover note as a real Job Application
        // form_response (searchable, reportable, shown in its own Forms
        // tab) rather than an unscoped person-level Note — this is what
        // keeps application-specific data separate from the person's
        // general profile data, mirroring how job-scoped Notes already
        // work on the record panel.
        const appForm = ensureJobApplicationForm(store, portal.environment_id);
        const now = new Date().toISOString();
        const existingResponse = findExistingApplicationResponse(store, portal.environment_id, personRecord.id, resolvedJobId);
        if (existingResponse) {
          existingResponse.data = { ...existingResponse.data, cover_note };
          existingResponse.submitted_at = now; // re-anchors the edit window
          existingResponse.updated_at = now;
        } else {
          if (!store.form_responses) store.form_responses = [];
          store.form_responses.push({
            id: uid(), form_id: appForm.id, form_name: appForm.name,
            environment_id: portal.environment_id,
            record_id: personRecord.id, record_type: 'people',
            context_record_id: resolvedJobId, context_record_title: job_title || null,
            data: { cover_note },
            submitted_by: 'portal-copilot',
            submitted_at: now, created_at: now, deleted_at: null,
          });
        }
        if (!store.form_links) store.form_links = [];
        const hasLink = store.form_links.some(l => !l.deleted_at && l.record_id === personRecord.id && l.form_id === appForm.id && l.context_record_id === resolvedJobId);
        if (!hasLink) {
          store.form_links.push({
            id: uid(), record_id: personRecord.id, form_id: appForm.id,
            environment_id: portal.environment_id,
            context_record_id: resolvedJobId, context_record_title: job_title || null,
            linked_by: 'portal-copilot',
            created_at: now, updated_at: now,
          });
        }
      } else {
        // No job could be resolved at all — fall back to the original
        // unscoped Note so the cover note is never silently lost.
        if (!store.notes) store.notes = [];
        store.notes.push({
          id: uid(), record_id: personRecord.id,
          content: `Applied via ${portal.name || 'career site'} copilot${job_title ? ` for ${job_title}` : ''}: ${cover_note}`,
          created_by: 'portal-copilot', created_at: new Date().toISOString(),
        });
      }
    }

    saveStore();
    res.json({ success: true, person_id: personRecord.id, message: 'Application submitted successfully' });
  } catch (e) {
    console.error('[portal-copilot] Apply error:', e.message);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Generate & email a one-time verification code so a returning candidate
// can edit an application outside the configured edit window. Tied to
// (portal, email, job) so a code can't be reused across jobs or portals.
router.post('/request-edit-code', async (req, res) => {
  try {
    const { portal_id, email, job_id } = req.body;
    if (!portal_id || !email || !job_id)
      return res.status(400).json({ error: 'portal_id, email, and job_id required' });
    const portal = getPortal(portal_id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const store = getStore();

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    if (!store.portal_verifications) store.portal_verifications = [];
    // Invalidate any prior unverified codes for this exact (portal,email,job)
    store.portal_verifications.forEach(v => {
      if (v.portal_id === portal_id && v.email === email && v.job_id === job_id && !v.verified_at) v.expires_at = now.toISOString();
    });
    store.portal_verifications.push({
      id: uid(), portal_id, email, job_id, code,
      expires_at: expiresAt, verified_at: null,
      created_at: now.toISOString(),
    });
    saveStore();

    const company = getCompanyInfo(portal);
    try {
      await sendEmail({
        to: email,
        subject: `Your verification code for ${company.company_name}`,
        html: `<p>Hi,</p><p>Your verification code to update your application is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p><p>— ${company.company_name}</p>`,
        text: `Your verification code is ${code}. It expires in 15 minutes.`,
        tags: { environment_id: portal.environment_id },
      });
    } catch (mailErr) {
      console.error('[portal-copilot] request-edit-code send failed:', mailErr.message);
      // Don't fail the request over a mail-provider hiccup — the code is
      // still valid and stored; simulation mode logs it to the console.
    }

    res.json({ success: true, message: 'Verification code sent' });
  } catch (e) {
    console.error('[portal-copilot] request-edit-code error:', e.message);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify the code, and on success re-anchor the matching Job Application
// form_response's submitted_at to now — this is what lets a subsequent
// /apply call for the same (person, job) proceed as "within window"
// without /apply needing any separate verified-flag concept of its own.
router.post('/verify-edit-code', async (req, res) => {
  try {
    const { portal_id, email, job_id, code } = req.body;
    if (!portal_id || !email || !job_id || !code)
      return res.status(400).json({ error: 'portal_id, email, job_id, and code required' });
    const portal = getPortal(portal_id);
    if (!portal) return res.status(404).json({ error: 'Portal not found' });
    const store = getStore();

    const verification = (store.portal_verifications || [])
      .filter(v => v.portal_id === portal_id && v.email === email && v.job_id === job_id && v.code === String(code) && !v.verified_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!verification) return res.status(400).json({ error: 'invalid_code', message: 'That code is incorrect.' });
    if (new Date(verification.expires_at) < new Date()) return res.status(400).json({ error: 'expired_code', message: 'That code has expired — please request a new one.' });

    verification.verified_at = new Date().toISOString();

    const peopleObj = (store.objects || []).find(o => o.environment_id === portal.environment_id && o.slug === 'people');
    // Normalised lookup — matches /apply and /join-community.
    const emailNorm = String(email).trim().toLowerCase();
    const personRecord = peopleObj ? (store.records || []).find(r => r.object_id === peopleObj.id && (r.data?.email || '').trim().toLowerCase() === emailNorm && !r.deleted_at) : null;
    if (personRecord) {
      // Re-anchor the people_links row's last_applied_at — this is what
      // /apply's edit-window gate actually reads now (see
      // findExistingApplicationLink), so this is what makes the caller's
      // immediate retry of /apply read as withinWindow. job_id here is the
      // resolvedJobId the 403 response echoed back, so it matches the
      // target_record_id the link was created/found with.
      const existingLink = findExistingApplicationLink(store, personRecord.id, job_id);
      if (existingLink) existingLink.last_applied_at = new Date().toISOString();
      // Also re-anchor the legacy Job Application form_response's
      // submitted_at, in case anything else still reads it.
      const existingResponse = findExistingApplicationResponse(store, portal.environment_id, personRecord.id, job_id);
      if (existingResponse) existingResponse.submitted_at = new Date().toISOString();
    }

    saveStore();
    res.json({ success: true, verified: true });
  } catch (e) {
    console.error('[portal-copilot] verify-edit-code error:', e.message);
    res.status(500).json({ error: 'Failed to verify code' });
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

// Resolve which People fields the chatbot's application flow should collect
// (admin-configured in Portal Settings → Flows → Chatbot), plus whether it
// should lead with the CV-upload prompt — public, read-only, same shape as
// /talent-community-fields so the frontend can reuse its fetch/render logic.
router.get('/application-fields', (req, res) => {
  const { portal_id } = req.query;
  if (!portal_id) return res.status(400).json({ error: 'portal_id required' });
  const portal = getPortal(portal_id);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });
  const cfg = getApplicationFieldsConfig(portal);
  res.json({ fields: cfg.fields, cv_first: cfg.cvFirst });
});

// Join the talent community — used when the copilot has no strong-fit open
// role for a candidate, so they can stay on file for future openings instead
// of hitting a dead end. Mirrors /apply closely but tags the person record
// rather than linking them to a specific job.
router.post('/join-community', upload.single('cv'), reenterTenant, async (req, res) => {
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
      fieldValues[k] = coerceFieldValue(fieldMeta.get(k).field_type, v);
    }

    const email = fieldValues.email;
    const firstName = fieldValues.first_name;
    if (!email || !firstName)
      return res.status(400).json({ error: 'first_name and email required' });

    // Normalised (trim + lowercase) so a differently-cased or whitespace-
    // padded email is still recognised as the same person — matches the
    // normalization applied to /apply's equivalent lookup.
    const emailNorm = String(email).trim().toLowerCase();
    let personRecord = (store.records || []).find(r => r.object_id === peopleObj.id && (r.data?.email || '').trim().toLowerCase() === emailNorm && !r.deleted_at);
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
      // person_record_id/target_record_id — see the matching comment in
      // /apply above; the old person_id/record_id shape used here made
      // talent-community links invisible to the same set of consumers
      // (Application Pipeline widget, screening, task triggers, etc.).
      const existingPoolLink = store.people_links.find(l => l.person_record_id === personRecord.id && l.target_record_id === poolId && !l.deleted_at);
      if (!existingPoolLink) {
        const nowIso = new Date().toISOString();
        store.people_links.push({
          id: uid(), person_record_id: personRecord.id, target_record_id: poolId,
          environment_id: portal.environment_id,
          workflow_id: null, stage_id: null, stage_name: 'Talent Community',
          last_applied_at: nowIso,
          created_at: nowIso, updated_at: nowIso,
        });
      } else {
        // Re-joining/re-submitting — re-anchor the touch timestamp only,
        // same reasoning as /apply's equivalent branch (updated_at is left
        // alone for stage_stale's benefit).
        existingPoolLink.last_applied_at = new Date().toISOString();
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
router.post('/upload', upload.single('file'), reenterTenant, (req, res) => {
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
