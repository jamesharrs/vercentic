/**
 * File Text Index — server/services/fileIndex.js
 *
 * Extracts text from uploaded files and stores in file_text_index table.
 * Runs at upload time (background) and on-demand for backfill.
 * Supports: PDF, DOCX, DOC, TXT, CSV, plain text
 */
const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

const UPLOAD_DIR = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'uploads')
  : path.join(__dirname, '../../data/uploads');

// File types that are worth indexing for content search
const INDEXABLE_EXTS = new Set(['.pdf','.docx','.doc','.txt','.csv','.rtf']);

// Which file_type_names map to which semantic category
const FILE_CATEGORY_MAP = {
  'CV / Resume':      'cv',
  'Resume':           'cv',
  'CV':               'cv',
  'Cover Letter':     'cover_letter',
  'Portfolio':        'portfolio',
  'Right to Work':    'right_to_work',
  'ID Document':      'id_document',
  'Contract':         'contract',
  'Reference Letter': 'reference',
  'Other':            'other',
};

function categoryFromTypeName(name) {
  if (!name) return 'other';
  for (const [k,v] of Object.entries(FILE_CATEGORY_MAP)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'other';
}

async function extractText(filePath, ext) {
  try {
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
    if (ext === '.docx' || ext === '.doc') {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    if (['.txt','.csv','.rtf'].includes(ext)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch(e) {
    console.warn(`[fileIndex] extract failed for ${filePath}:`, e.message);
  }
  return '';
}

/**
 * Index a single attachment — called after upload.
 * Safe to call multiple times (upserts by attachment_id).
 */
async function indexAttachment(att) {
  if (!att?.filename) return;
  const ext = path.extname(att.name || att.filename).toLowerCase();
  if (!INDEXABLE_EXTS.has(ext)) return;

  const filePath = path.join(UPLOAD_DIR, att.filename);
  if (!fs.existsSync(filePath)) return;

  const s = getStore();
  if (!s.file_text_index) s.file_text_index = [];

  // Remove existing entry for this attachment (upsert)
  s.file_text_index = s.file_text_index.filter(x => x.attachment_id !== att.id);

  try {
    const rawText = await extractText(filePath, ext);
    if (!rawText.trim()) return;

    const category = categoryFromTypeName(att.file_type_name);
    const entry = {
      id:            uuidv4(),
      attachment_id: att.id,
      record_id:     att.record_id,
      environment_id:att.environment_id || null,
      file_type_name:att.file_type_name || 'Other',
      category,
      filename:      att.name || att.filename,
      raw_text:      rawText,
      word_count:    rawText.split(/\s+/).filter(Boolean).length,
      extracted_at:  new Date().toISOString(),
      status:        'done',
    };
    s.file_text_index.push(entry);
    saveStore();
    console.log(`[fileIndex] indexed ${att.name} (${entry.word_count} words, category: ${category})`);
    return entry;
  } catch(e) {
    console.error('[fileIndex] indexAttachment error:', e.message);
  }
}

/**
 * Backfill — index all existing attachments that haven't been indexed yet.
 * Called on server startup (async, non-blocking).
 */
async function backfillAll() {
  const s = getStore();
  if (!s.file_text_index) s.file_text_index = [];
  const indexed = new Set((s.file_text_index || []).map(x => x.attachment_id));
  const pending = (s.attachments || []).filter(a => !indexed.has(a.id) && a.filename);

  if (pending.length === 0) {
    console.log('[fileIndex] All attachments already indexed');
    return;
  }

  console.log(`[fileIndex] Backfilling ${pending.length} attachments...`);
  let done = 0;
  for (const att of pending) {
    await indexAttachment(att);
    done++;
    if (done % 10 === 0) console.log(`[fileIndex] Backfill progress: ${done}/${pending.length}`);
  }
  console.log(`[fileIndex] Backfill complete — ${done} files indexed`);
}

/**
 * Search the index for a term across a set of record IDs (or all records).
 * Returns array of { record_id, attachment_id, filename, category, snippet, score }
 */
function searchIndex({ term, recordIds, categories, environmentId, limit = 100 }) {
  const s = getStore();
  const idx = s.file_text_index || [];
  if (!idx.length || !term) return [];

  const termLower  = term.toLowerCase();
  const terms      = termLower.split(/\s+/).filter(t => t.length > 2);
  const recordSet  = recordIds ? new Set(recordIds) : null;
  const catSet     = categories?.length ? new Set(categories) : null;

  const results = [];

  for (const entry of idx) {
    if (entry.status !== 'done') continue;
    if (recordSet && !recordSet.has(entry.record_id)) continue;
    if (catSet && !catSet.has(entry.category)) continue;
    if (environmentId && entry.environment_id && entry.environment_id !== environmentId) continue;

    const text = (entry.raw_text || '').toLowerCase();

    // Score: count how many search terms appear
    let score = 0;
    for (const t of terms) {
      const count = (text.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g')) || []).length;
      score += count;
    }
    if (score === 0) continue;

    // Extract a snippet around the first match
    const firstIdx = text.indexOf(terms[0]);
    const start    = Math.max(0, firstIdx - 60);
    const end      = Math.min(text.length, firstIdx + 120);
    const snippet  = entry.raw_text.slice(start, end).replace(/\s+/g, ' ').trim();

    results.push({
      record_id:     entry.record_id,
      attachment_id: entry.attachment_id,
      filename:      entry.filename,
      category:      entry.category,
      file_type_name:entry.file_type_name,
      snippet:       (start > 0 ? '...' : '') + snippet + (end < entry.raw_text.length ? '...' : ''),
      score,
      word_count:    entry.word_count,
    });
  }

  // Sort by score descending, deduplicate by record_id (keep best file per person)
  results.sort((a,b) => b.score - a.score);
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.record_id)) return false;
    seen.add(r.record_id);
    return true;
  }).slice(0, limit);
}

/**
 * Get index stats — used by the Super Admin health page
 */
function getStats() {
  const s = getStore();
  const idx = s.file_text_index || [];
  const atts = s.attachments || [];
  return {
    total_attachments: atts.length,
    indexed:           idx.filter(x => x.status === 'done').length,
    pending:           atts.filter(a => {
      const ext = path.extname(a.name || a.filename || '').toLowerCase();
      return INDEXABLE_EXTS.has(ext) && !idx.find(x => x.attachment_id === a.id);
    }).length,
    categories: idx.reduce((acc,x) => { acc[x.category] = (acc[x.category]||0)+1; return acc; }, {}),
    total_words: idx.reduce((s,x) => s + (x.word_count||0), 0),
  };
}

module.exports = { indexAttachment, backfillAll, searchIndex, getStats, categoryFromTypeName };
