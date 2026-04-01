const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, insert } = require('../db/init');

// Allow CORS from any origin for chrome extension content scripts
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Slug, X-User-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// POST /api/chrome-import/extract
router.post('/extract', async (req, res) => {
  const { page_text, page_url, page_title, environment_id } = req.body;
  if (!page_text) return res.status(400).json({ error: 'page_text required' });
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const objects = query('objects', o => o.environment_id === environment_id);
  const peopleObj = objects.find(o => o.slug === 'people');
  if (!peopleObj) return res.status(404).json({ error: 'People object not found' });

  const fields = query('fields', f => f.object_id === peopleObj.id);
  const fieldDescriptions = fields
    .filter(f => !['id','created_at','updated_at'].includes(f.api_key))
    .map(f => {
      let desc = `${f.api_key} (${f.field_type})`;
      if (f.options?.length) desc += ` — options: ${f.options.join(', ')}`;
      return desc;
    }).join('\n');

  const prompt = `You are an expert recruiter assistant. Extract structured candidate profile data from the following web page content.

PAGE URL: ${page_url || 'unknown'}
PAGE TITLE: ${page_title || 'unknown'}

PAGE CONTENT:
${page_text.slice(0, 8000)}

AVAILABLE FIELDS TO EXTRACT INTO:
${fieldDescriptions}

INSTRUCTIONS:
1. Extract as much relevant candidate data as possible
2. Map extracted data to the field api_keys listed above
3. For multi_select fields like "skills", return an array of strings
4. For select fields, pick the closest matching option
5. Extract the person's name and split into first_name and last_name
6. If you find a profile photo URL, include it as "photo_url"
7. If you find a LinkedIn URL, include it as "linkedin_url"
8. Include a confidence score (0-100)
9. Include a "source_type" field (linkedin_profile, github_profile, personal_website, job_board_profile, resume, other)

Return ONLY valid JSON:
{
  "extracted_data": { ...field api_key to value mappings... },
  "source_type": "linkedin_profile",
  "confidence": 85,
  "summary": "One sentence summary of the person"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    res.json({
      ...result,
      object_id: peopleObj.id,
      object_name: peopleObj.name,
      fields: fields.map(f => ({ id: f.id, name: f.name, api_key: f.api_key, field_type: f.field_type, options: f.options })),
      page_url,
    });
  } catch (err) {
    console.error('[chrome-import] extraction error:', err.message);
    res.status(500).json({ error: 'Failed to extract profile data', detail: err.message });
  }
});

// POST /api/chrome-import/create
router.post('/create', async (req, res) => {
  const { environment_id, object_id, data, source_url } = req.body;
  if (!environment_id || !object_id || !data) {
    return res.status(400).json({ error: 'environment_id, object_id, and data required' });
  }

  try {
    if (data.email) {
      const existing = query('records', r =>
        r.object_id === object_id &&
        r.environment_id === environment_id &&
        r.data?.email?.toLowerCase() === data.email.toLowerCase() &&
        !r.deleted_at
      );
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'duplicate',
          message: `A record with email ${data.email} already exists`,
          existing_id: existing[0].id,
        });
      }
    }

    const record = {
      id: uuidv4(),
      object_id,
      environment_id,
      data: {
        ...data,
        source: data.source || 'Chrome Extension',
        source_url: source_url || undefined,
        imported_at: new Date().toISOString(),
      },
      created_by: req.headers['x-user-id'] || 'chrome-extension',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    insert('records', record);

    insert('activity_log', {
      id: uuidv4(),
      record_id: record.id,
      object_id,
      environment_id,
      action: 'create',
      field_key: null,
      old_value: null,
      new_value: JSON.stringify({ source: 'chrome_extension', url: source_url }),
      user_id: req.headers['x-user-id'] || 'chrome-extension',
      created_at: new Date().toISOString(),
    });

    res.json({ id: record.id, created: true });
  } catch (err) {
    console.error('[chrome-import] create error:', err.message);
    res.status(500).json({ error: 'Failed to create record', detail: err.message });
  }
});

// GET /api/chrome-import/check?email=...&environment_id=...
router.get('/check', (req, res) => {
  const { email, environment_id } = req.query;
  if (!email || !environment_id) return res.json({ exists: false });

  const objects = query('objects', o => o.environment_id === environment_id && o.slug === 'people');
  if (!objects.length) return res.json({ exists: false });

  const existing = query('records', r =>
    r.object_id === objects[0].id &&
    r.environment_id === environment_id &&
    r.data?.email?.toLowerCase() === email.toLowerCase() &&
    !r.deleted_at
  );

  res.json({
    exists: existing.length > 0,
    record_id: existing[0]?.id || null,
  });
});

// GET /api/chrome-import/environments
router.get('/environments', (req, res) => {
  const envs = query('environments', () => true);
  res.json(envs.map(e => ({ id: e.id, name: e.name, is_default: e.is_default })));
});

module.exports = router;
