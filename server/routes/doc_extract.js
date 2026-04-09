const express = require('express');
const router  = express.Router();
const { trackAIUsage } = require('./admin_dashboard');
const path    = require('path');
const fs      = require('fs');
const { upload, verifyMime, handleMulterError, UPLOAD_DIR } = require('../middleware/upload');

const IMAGE_EXTS  = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.tif']);
const IMAGE_MIMES = new Set(['image/jpeg','image/png','image/gif','image/webp','image/bmp','image/tiff']);

function isImageFile(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTS.has(ext) || IMAGE_MIMES.has(mimetype);
}

async function extractDocText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const data = await require('pdf-parse')(fs.readFileSync(filePath));
      return data.text || '';
    }
    if (ext === '.docx') {
      return (await require('mammoth').extractRawText({ path: filePath })).value || '';
    }
    if (ext === '.doc') {
      try { return (await require('mammoth').extractRawText({ path: filePath })).value || ''; }
      catch { return fs.readFileSync(filePath, 'latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' '); }
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch(e) { console.error('[doc-extract] text error:', e.message); return ''; }
}

function readImageBase64(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
    '.gif':'image/gif','.webp':'image/webp','.bmp':'image/bmp','.tiff':'image/tiff','.tif':'image/tiff' };
  return { data: fs.readFileSync(filePath).toString('base64'), mediaType: mimetype || mimeMap[ext] || 'image/jpeg' };
}

function buildPrompt(fileTypeName, mappings) {
  const fieldList = mappings.map(m =>
    `  "${m.extracted_key}": ${m.description ? `// ${m.description}` : `// ${m.field_label || m.extracted_key}`}`
  ).join('\n');
  return `You are an expert document analysis system for enterprise HR software.
Carefully examine this ${fileTypeName || 'document'} and extract ALL available information.
Be thorough — read every part of the document including headers, stamps, and small print.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation.
Use null for fields you cannot find after carefully examining the entire document.

Extract these specific fields:
{
${fieldList}
}

For dates use ISO format (YYYY-MM-DD) where possible. For ID numbers include the full number exactly. Always try to extract the person's name.`;
}

async function callClaudeVision(apiKey, imageData, mediaType, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-6', max_tokens: 1500,
      messages: [{ role:'user', content: [
        { type:'image', source: { type:'base64', media_type:mediaType, data:imageData } },
        { type:'text', text: prompt },
      ]}],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic: ${await r.text()}`);
  return r.json();
}

async function callClaudeText(apiKey, text, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-6', max_tokens: 1500, system: prompt,
      messages: [{ role:'user', content: `Extract data from this document:\n\n${text.slice(0, 12000)}` }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic: ${await r.text()}`);
  return r.json();
}

router.post('/', (req, res, next) => {
  if (req.is('application/json')) return next();
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    verifyMime(req, res, next);
  });
}, async (req, res) => {
  const { attachment_id, file_type_id } = req.body;
  const mappings = typeof req.body.mappings === 'string' ? JSON.parse(req.body.mappings) : (req.body.mappings || []);
  if (!mappings.length) return res.status(400).json({ error: 'No field mappings provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  let filePath, mimetype, originalName, cleanupPath = null;
  const { getStore } = require('../db/init');

  if (req.file) {
    filePath = req.file.path; mimetype = req.file.mimetype;
    originalName = req.file.originalname; cleanupPath = req.file.path;
  } else if (attachment_id) {
    const att = (getStore().attachments || []).find(a => a.id === attachment_id);
    if (!att?.filename) return res.status(404).json({ error: 'Attachment not found' });
    filePath = path.join(UPLOAD_DIR, att.filename);
    mimetype = att.mimetype || ''; originalName = att.name;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
  } else {
    return res.status(400).json({ error: 'Provide attachment_id or upload a file' });
  }

  const fileType = (getStore().file_types || []).find(t => t.id === file_type_id);
  const fileTypeName = fileType?.name || 'document';

  try {
    const prompt = buildPrompt(fileTypeName, mappings);
    const useVision = isImageFile(filePath, mimetype);
    console.log(`[doc-extract] ${originalName} vision=${useVision} mappings=${mappings.length}`);

    let claudeResponse;
    if (useVision) {
      const { data, mediaType } = readImageBase64(filePath, mimetype);
      claudeResponse = await callClaudeVision(apiKey, data, mediaType, prompt);
    } else {
      const text = await extractDocText(filePath, mimetype);
      if (!text.trim()) {
        if (cleanupPath) try { fs.unlinkSync(cleanupPath); } catch {}
        return res.status(422).json({ error: 'Could not extract text. Try uploading as JPG/PNG image instead.' });
      }
      claudeResponse = await callClaudeText(apiKey, text, prompt);
    }

    const rawText = claudeResponse.content?.find(b => b.type === 'text')?.text || '';
    console.log(`[doc-extract] response: ${rawText.slice(0, 200)}`);
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    if (cleanupPath) try { fs.unlinkSync(cleanupPath); } catch {}
    // Track AI usage
    try {
      trackAIUsage({
        user_id:        req.body?.user_id        || 'anonymous',
        user_name:      req.body?.user_name      || 'Unknown',
        user_email:     req.body?.user_email     || '',
        feature:        'doc_extract',
        tokens_in:      claudeResponse.usage?.input_tokens  || 0,
        tokens_out:     claudeResponse.usage?.output_tokens || 0,
        model:          'claude-opus-4-6',
        environment_id: req.body?.environment_id || '',
      });
    } catch(_e) {}
    res.json({ parsed, used_vision: useVision, file_type: fileTypeName, mappings_count: mappings.length });
  } catch(e) {
    console.error('[doc-extract] error:', e.message);
    if (cleanupPath) try { fs.unlinkSync(cleanupPath); } catch {}
    res.status(500).json({ error: e.message });
  }
});

router.use(handleMulterError);
module.exports = router;
