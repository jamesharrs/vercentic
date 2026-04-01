const express  = require('express');
const router   = express.Router();
const { trackAIUsage } = require('./admin_dashboard');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Extract text from file ────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    // PDF
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || '';
    }
    // DOCX
    if (ext === '.docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    // DOC (legacy) — best effort
    if (ext === '.doc') {
      const mammoth = require('mammoth');
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value || '';
      } catch {
        return fs.readFileSync(filePath, 'latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    }
    // Plain text
    if (['.txt', '.csv', '.md'].includes(ext)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    // Fallback — strip non-printable chars
    return fs.readFileSync(filePath, 'utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
  } catch(e) {
    console.error('Text extraction error:', e.message);
    return '';
  }
}

// ── Parse route ───────────────────────────────────────────────────────────────
// Handles two cases:
//   1. JSON body with attachment_id → uses stored file
//   2. Multipart form with file → uses uploaded file directly
router.post('/', (req, res, next) => {
  // If Content-Type is JSON, skip multer and go straight to handler
  if (req.is('application/json')) return next();
  upload.single('file')(req, res, next);
}, async (req, res) => {
  const attachment_id = req.body?.attachment_id;

  // Get text — either from uploaded file or from stored attachment
  let cvText = '';
  let cleanupPath = null;

  if (req.file) {
    // Direct file upload via multipart
    cvText = await extractText(req.file.path, req.file.mimetype);
    cleanupPath = req.file.path;
  } else if (attachment_id) {
    const { getStore } = require('../db/init');
    const att = (getStore().attachments||[]).find(a => a.id === attachment_id);
    if (!att?.filename) return res.status(404).json({ error: 'Attachment not found' });
    const filePath = path.join(UPLOAD_DIR, att.filename);
    cvText = await extractText(filePath, att.mimetype);
  } else if (req.body?.raw_text) {
    // Plain text pasted by the user
    cvText = req.body.raw_text;
  } else if (req.body?.url) {
    // Fetch text from a URL (LinkedIn profile, personal site, etc.)
    try {
      const https = require('https');
      const http  = require('http');
      const fetchUrl = (u) => new Promise((resolve, reject) => {
        const mod = u.startsWith('https') ? https : http;
        mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => resolve(data));
        }).on('error', reject);
      });
      const html = await fetchUrl(req.body.url);
      // Strip HTML tags to get readable text
      cvText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 15000); // cap at 15k chars
    } catch (e) {
      return res.status(422).json({ error: `Could not fetch URL: ${e.message}` });
    }
  } else {
    return res.status(400).json({ error: 'Provide file, attachment_id, raw_text, or url' });
  }

  if (!cvText.trim()) {
    if (cleanupPath) fs.unlinkSync(cleanupPath);
    return res.status(422).json({ error: 'Could not extract text from file' });
  }

  console.log(`[cv-parse] Extracted ${cvText.length} chars from file`);
  console.log(`[cv-parse] Preview: ${cvText.slice(0, 200).replace(/\n/g,' ')}`);

  // ── Call Claude ─────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (cleanupPath) fs.unlinkSync(cleanupPath);
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const systemPrompt = `You are an expert CV/Resume parser for enterprise HR software.
Extract ALL available information from the CV text. Be aggressive — extract every piece of data you can find.
Names, emails, phone numbers, job titles, locations — these are almost always present in a CV.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation, just raw JSON.
Use null for fields you genuinely cannot find after carefully reading the full text.

JSON structure (return ALL fields, even if some are null):
{
  "first_name": "string or null",
  "last_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "current_title": "most recent job title, string or null",
  "location": "city/country, string or null",
  "linkedin_url": "string or null",
  "summary": "professional summary or objective, string or null",
  "years_experience": "number (integer) or null",
  "skills": ["array", "of", "skill", "strings"],
  "languages": ["array of spoken languages"],
  "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
  "work_history": [{"company": "", "title": "", "start": "", "end": "", "description": ""}],
  "certifications": ["array of certification strings"],
  "notice_period": "string or null",
  "nationality": "string or null"
}

IMPORTANT: The skills array and work_history array should be populated even if education is missing. Always try to extract the person's name — it's usually at the top of the CV.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-6',
        max_tokens: 2000,
        system:     systemPrompt,
        messages: [{ role: 'user', content: `Parse this CV:\n\n${cvText.slice(0, 12000)}` }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic error: ${err}`);
    }

    const data   = await response.json();
    const text   = data.content?.find(b => b.type === 'text')?.text || '';
    // Track AI usage
    try {
      trackAIUsage({
        user_id:        req.body?.user_id        || 'anonymous',
        user_name:      req.body?.user_name      || 'Unknown',
        user_email:     req.body?.user_email     || '',
        feature:        'cv_parse',
        tokens_in:      data.usage?.input_tokens  || 0,
        tokens_out:     data.usage?.output_tokens || 0,
        model:          'claude-opus-4-6',
        environment_id: req.body?.environment_id || '',
      });
    } catch(_e) {}
    console.log(`[cv-parse] Claude raw response: ${text.slice(0,300)}`);
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    console.log(`[cv-parse] Parsed fields: first_name=${parsed.first_name}, email=${parsed.email}, title=${parsed.current_title}`);

    if (cleanupPath) fs.unlinkSync(cleanupPath);

    res.json({
      parsed,
      text_length: cvText.length,
      model: 'claude-opus-4-6',
    });
  } catch(e) {
    console.error('CV parse error:', e);
    if (cleanupPath) try { fs.unlinkSync(cleanupPath); } catch {}
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
