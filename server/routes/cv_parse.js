const express  = require('express');
const router   = express.Router();
const { trackAIUsage } = require('./admin_dashboard');
const path     = require('path');
const fs       = require('fs');
const { upload, verifyMime, handleMulterError, UPLOAD_DIR } = require('../middleware/upload');

// ── Extract text from file ────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  // MIME type (set by file-type magic-byte detection) is the ground truth.
  // Filename extensions are only used as a fallback when MIME is ambiguous.
  const basename = path.basename(filePath).toLowerCase();
  const allExts  = basename.split('.').slice(1).map(e => `.${e}`);

  const mimeIsPdf  = mimetype === 'application/pdf';
  const mimeIsDocx = mimetype?.includes('openxmlformats');
  const mimeIsZip  = mimetype === 'application/zip';  // file-type sees DOCX as zip
  const mimeIsDoc  = mimetype === 'application/msword';
  const mimeIsText = mimetype?.startsWith('text/');
  const mimeKnown  = mimeIsPdf || mimeIsDocx || mimeIsZip || mimeIsDoc || mimeIsText;

  // When MIME is zip or unknown, use magic bytes + extension to resolve DOCX
  let resolvedIsDocx = mimeIsDocx;
  if (!resolvedIsDocx && (mimeIsZip || !mimeKnown) && allExts.includes('.docx')) {
    try {
      const buf = fs.readFileSync(filePath);
      // ZIP magic PK\x03\x04 — confirms it's an Office Open XML file
      resolvedIsDocx = buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;
    } catch { /* ignore */ }
  }

  // Final type decision — MIME wins; extensions only fill gaps when MIME is unknown
  const isPdf  = mimeIsPdf  || (!mimeKnown && allExts.includes('.pdf') && !allExts.includes('.docx'));
  const isDocx = resolvedIsDocx;
  const isDoc  = mimeIsDoc  || (!mimeKnown && allExts.includes('.doc') && !allExts.includes('.docx'));

  try {
    if (isPdf) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || '';
    }
    if (isDocx) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    if (isDoc) {
      const mammoth = require('mammoth');
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value || '';
      } catch {
        return fs.readFileSync(filePath, 'latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    }
    if (mimeIsText || ['.txt', '.csv', '.md'].includes(path.extname(filePath).toLowerCase())) {
      return fs.readFileSync(filePath, 'utf8');
    }
    // Fallback
    return fs.readFileSync(filePath, 'utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
  } catch(e) {
    console.error('[cv-parse] Text extraction error:', e.message);
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
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    verifyMime(req, res, next);
  });
}, async (req, res) => {
  const attachment_id = req.body?.attachment_id;

  // Get text — either from uploaded file or from stored attachment
  let cvText;
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

  if (!cvText?.trim()) {
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

    // ── Map Claude's named-key arrays into table column-ID format ─────────────
    // The table field renderer uses column IDs (e.g. "lcc54yyb") not named keys.
    // Look up the actual column IDs from the store for work_history and education.
    try {
      const { getStore } = require('../db/init');
      const store = getStore();
      const envId = req.body?.environment_id;

      // Find fields by api_key across all matching environments
      const allFields = store.fields || [];
      const findCols = (apiKey) => {
        const f = allFields.find(f =>
          f.api_key === apiKey && (!envId || f.environment_id === envId)
        ) || allFields.find(f => f.api_key === apiKey);
        return f?.table_columns || [];
      };

      // work_history: Claude returns [{company, title, start, end, description, current}]
      if (Array.isArray(parsed.work_history) && parsed.work_history.length) {
        const cols = findCols('work_history');
        if (cols.length) {
          const colByName = (names) => cols.find(c => names.some(n => c.name.toLowerCase() === n.toLowerCase()));
          const companyCol  = colByName(['company','employer','organisation','organization']);
          const titleCol    = colByName(['job title','title','position','role']);
          const fromCol     = colByName(['from','start','start date']);
          const toCol       = colByName(['to','end','end date']);
          const currentCol  = colByName(['current','is current']);
          const descCol     = colByName(['description','summary','notes','details']);

          parsed.work_history = parsed.work_history.map(row => {
            const mapped = {};
            if (companyCol)  mapped[companyCol.id]  = row.company  || row.employer || '';
            if (titleCol)    mapped[titleCol.id]    = row.title    || row.position  || row.role || '';
            if (fromCol)     mapped[fromCol.id]     = row.start    || row.from      || '';
            if (toCol)       mapped[toCol.id]       = row.end      || row.to        || '';
            if (currentCol)  mapped[currentCol.id]  = !!(row.current || row.is_current);
            if (descCol)     mapped[descCol.id]     = row.description || row.summary || '';
            return mapped;
          });
          console.log(`[cv-parse] Mapped ${parsed.work_history.length} work history rows to column IDs`);
        }
      }

      // education: Claude returns [{institution, degree, field, year, grade}]
      if (Array.isArray(parsed.education) && parsed.education.length) {
        const cols = findCols('education');
        if (cols.length) {
          const colByName = (names) => cols.find(c => names.some(n => c.name.toLowerCase() === n.toLowerCase()));
          const instCol    = colByName(['institution','university','school','college']);
          const degreeCol  = colByName(['degree','qualification']);
          const subjectCol = colByName(['subject','field','course','major','area of study']);
          const fromCol    = colByName(['from','start','start date']);
          const toCol      = colByName(['to','end','end date','year']);
          const currentCol = colByName(['current','is current']);
          const gradeCol   = colByName(['grade','result','grade / result','classification','gpa']);

          parsed.education = parsed.education.map(row => {
            const mapped = {};
            if (instCol)    mapped[instCol.id]    = row.institution || row.school || row.university || '';
            if (degreeCol)  mapped[degreeCol.id]  = row.degree      || row.qualification || '';
            if (subjectCol) mapped[subjectCol.id] = row.field       || row.subject || row.major || row.course || '';
            if (fromCol)    mapped[fromCol.id]    = row.start       || row.from || '';
            if (toCol)      mapped[toCol.id]      = row.end         || row.to   || row.year || '';
            if (currentCol) mapped[currentCol.id] = !!(row.current  || row.is_current);
            if (gradeCol)   mapped[gradeCol.id]   = row.grade       || row.result || row.gpa || '';
            return mapped;
          });
          console.log(`[cv-parse] Mapped ${parsed.education.length} education rows to column IDs`);
        }
      }
    } catch(mappingErr) {
      console.warn('[cv-parse] Column mapping failed (non-fatal):', mappingErr.message);
    }

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

router.use(handleMulterError);
module.exports = router;
