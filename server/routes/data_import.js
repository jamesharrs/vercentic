'use strict';
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query, insert, getStore, saveStore } = require('../db/init');

// ── File upload config ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'imports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// ── Parse helpers ─────────────────────────────────────────────────────────────
function parseCSVRow(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
    else if ((line[i] === ',' || line[i] === '\t') && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += line[i];
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text, delimiter) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const cols = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
  return { headers, rows };
}

async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const raw = fs.readFileSync(filePath);

  if (ext === '.json') {
    const data = JSON.parse(raw.toString('utf8'));
    if (!Array.isArray(data) || !data.length) return { headers: [], rows: [] };
    return { headers: Object.keys(data[0]), rows: data };
  }

  if (ext === '.tsv') {
    return parseCSV(raw.toString('utf8'), '\t');
  }

  if (ext === '.csv') {
    return parseCSV(raw.toString('utf8'), ',');
  }

  if (ext === '.xls' || ext === '.xlsx') {
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.read(raw, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!jsonData.length) return { headers: [], rows: [] };
      return { headers: Object.keys(jsonData[0]), rows: jsonData };
    } catch (e) {
      throw new Error('Failed to parse Excel file. Install xlsx package: npm install xlsx');
    }
  }

  throw new Error(`Unsupported file format: ${ext}. Use CSV, TSV, JSON, XLS, or XLSX.`);
}

// ── Duplicate scoring (reuse from duplicates route) ───────────────────────────
function similarity(a, b) {
  if (!a || !b) return 0;
  a = String(a).toLowerCase().trim(); b = String(b).toLowerCase().trim();
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const longer = a.length > b.length ? a : b, shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let m = 0; for (let i = 0; i < shorter.length; i++) if (longer.includes(shorter[i])) m++;
  return m / longer.length;
}

function duplicateScore(incomingData, existingData) {
  let score = 0; const reasons = [];
  if (incomingData.email && existingData.email && incomingData.email.toLowerCase() === existingData.email.toLowerCase()) {
    score += 90; reasons.push('Same email');
  }
  const aP = (incomingData.phone || '').replace(/\D/g, ''), bP = (existingData.phone || '').replace(/\D/g, '');
  if (aP.length >= 7 && aP === bP) { score += 70; reasons.push('Same phone'); }
  const aN = `${incomingData.first_name || ''} ${incomingData.last_name || ''}`.trim().toLowerCase();
  const bN = `${existingData.first_name || ''} ${existingData.last_name || ''}`.trim().toLowerCase();
  if (aN && bN) {
    const s = similarity(aN, bN);
    if (s === 1) { score += 40; reasons.push('Identical name'); }
    else if (s > 0.8) { score += 20; reasons.push('Similar name'); }
  }
  const aL = (incomingData.linkedin_url || '').toLowerCase().replace(/\/$/, '');
  const bL = (existingData.linkedin_url || '').toLowerCase().replace(/\/$/, '');
  if (aL && bL && aL === bL) { score += 80; reasons.push('Same LinkedIn'); }
  return { score: Math.min(score, 100), reasons };
}

// ── Step 1: Upload + parse → return headers and preview rows ──────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { headers, rows } = await parseFile(req.file.path, req.file.originalname);
    if (!headers.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File contains no data or could not be parsed' });
    }
    // Store file reference for later commit
    const uploadId = uuidv4();
    const store = getStore();
    if (!store.import_uploads) store.import_uploads = [];
    store.import_uploads.push({
      id: uploadId,
      file_path: req.file.path,
      original_name: req.file.originalname,
      headers,
      row_count: rows.length,
      created_at: new Date().toISOString(),
    });
    saveStore(store);

    res.json({
      upload_id: uploadId,
      file_name: req.file.originalname,
      headers,
      row_count: rows.length,
      preview: rows.slice(0, 5), // first 5 rows for mapping preview
    });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch(_) {}
    res.status(400).json({ error: err.message });
  }
});

// ── Step 2: Preview with mapping applied + optional dedup check ───────────────
router.post('/preview', async (req, res) => {
  try {
    const { upload_id, object_id, environment_id, mappings, check_duplicates, duplicate_threshold = 50 } = req.body;
    if (!upload_id || !object_id || !environment_id || !mappings) {
      return res.status(400).json({ error: 'upload_id, object_id, environment_id, and mappings required' });
    }

    const store = getStore();
    const uploadRef = (store.import_uploads || []).find(u => u.id === upload_id);
    if (!uploadRef) return res.status(404).json({ error: 'Upload not found. Please re-upload the file.' });

    const { rows } = await parseFile(uploadRef.file_path, uploadRef.original_name);

    // Apply mappings to each row
    const mapped = rows.map((row, idx) => {
      const data = {};
      for (const m of mappings) {
        if (m.action === 'skip') continue;
        const rawValue = row[m.source_column] || '';
        if (!rawValue && m.action !== 'split') continue;

        if (m.action === 'split' && m.split_config) {
          // Split a single column into multiple target fields
          const { separator, targets } = m.split_config;
          const parts = rawValue.split(separator || ' ').map(p => p.trim()).filter(Boolean);
          targets.forEach((t, i) => {
            if (t.target_field && parts[i] !== undefined) {
              data[t.target_field] = parts[i];
            }
          });
        } else if (m.action === 'map' && m.target_field) {
          // Direct mapping — apply type coercion
          if (m.target_type === 'number' || m.target_type === 'currency') {
            data[m.target_field] = parseFloat(rawValue) || 0;
          } else if (m.target_type === 'boolean') {
            data[m.target_field] = ['true', 'yes', '1', 'y'].includes(rawValue.toLowerCase());
          } else if (m.target_type === 'multi_select') {
            data[m.target_field] = rawValue.split(/[;,|]/).map(v => v.trim()).filter(Boolean);
          } else {
            data[m.target_field] = rawValue;
          }
        }
      }
      return { _row_index: idx, _original: row, data };
    });

    // Dedup check if requested
    let duplicates = [];
    if (check_duplicates) {
      const existingRecords = query('records', r =>
        r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at
      );

      for (const incoming of mapped) {
        let bestMatch = null;
        let bestScore = 0;
        for (const existing of existingRecords) {
          const { score, reasons } = duplicateScore(incoming.data, existing.data || {});
          if (score >= duplicate_threshold && score > bestScore) {
            bestScore = score;
            bestMatch = { record_id: existing.id, score, reasons, existing_data: existing.data };
          }
        }
        if (bestMatch) {
          duplicates.push({
            row_index: incoming._row_index,
            incoming_data: incoming.data,
            match: bestMatch,
            action: 'review', // default — user decides
          });
        }
      }
    }

    res.json({
      total_rows: mapped.length,
      preview: mapped.slice(0, 10).map(m => m.data),
      duplicate_count: duplicates.length,
      duplicates: duplicates.slice(0, 100),
      clean_count: mapped.length - duplicates.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Step 3: Commit the import ─────────────────────────────────────────────────
router.post('/commit', async (req, res) => {
  try {
    const {
      upload_id, object_id, environment_id, mappings,
      mode = 'create', // create | upsert
      duplicate_decisions = {}, // { row_index: 'create' | 'skip' | 'merge' }
      imported_by = 'Admin',
    } = req.body;

    if (!upload_id || !object_id || !environment_id || !mappings) {
      return res.status(400).json({ error: 'upload_id, object_id, environment_id, and mappings required' });
    }

    const store = getStore();
    const uploadRef = (store.import_uploads || []).find(u => u.id === upload_id);
    if (!uploadRef) return res.status(404).json({ error: 'Upload not found' });

    const { rows } = await parseFile(uploadRef.file_path, uploadRef.original_name);
    const existingRecords = query('records', r =>
      r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at
    );

    const results = { created: 0, updated: 0, skipped: 0, merged: 0, errors: [] };
    const now = new Date().toISOString();

    for (let idx = 0; idx < rows.length; idx++) {
      try {
        const row = rows[idx];
        const data = {};

        // Apply mappings
        for (const m of mappings) {
          if (m.action === 'skip') continue;
          const rawValue = row[m.source_column] || '';

          if (m.action === 'split' && m.split_config) {
            const { separator, targets } = m.split_config;
            const parts = rawValue.split(separator || ' ').map(p => p.trim()).filter(Boolean);
            targets.forEach((t, i) => {
              if (t.target_field && parts[i] !== undefined) data[t.target_field] = parts[i];
            });
          } else if (m.action === 'map' && m.target_field) {
            if (m.target_type === 'number' || m.target_type === 'currency') data[m.target_field] = parseFloat(rawValue) || 0;
            else if (m.target_type === 'boolean') data[m.target_field] = ['true','yes','1','y'].includes(rawValue.toLowerCase());
            else if (m.target_type === 'multi_select') data[m.target_field] = rawValue.split(/[;,|]/).map(v=>v.trim()).filter(Boolean);
            else data[m.target_field] = rawValue;
          }
        }

        // Check duplicate decision
        const dupDecision = duplicate_decisions[String(idx)];
        if (dupDecision === 'skip') { results.skipped++; continue; }

        if (dupDecision === 'merge') {
          // Find the matching existing record and merge
          let bestMatch = null; let bestScore = 0;
          for (const existing of existingRecords) {
            const { score } = duplicateScore(data, existing.data || {});
            if (score > bestScore) { bestScore = score; bestMatch = existing; }
          }
          if (bestMatch) {
            // Fill missing fields from incoming data
            const mergedData = { ...data };
            Object.entries(bestMatch.data || {}).forEach(([k, v]) => {
              if (v !== null && v !== undefined && v !== '') mergedData[k] = v; // existing wins
            });
            // Actually: incoming fills gaps in existing
            const finalData = { ...bestMatch.data };
            Object.entries(data).forEach(([k, v]) => {
              if (v !== null && v !== undefined && v !== '' && (!finalData[k] || finalData[k] === '')) {
                finalData[k] = v;
              }
            });
            const si = store.records.findIndex(r => r.id === bestMatch.id);
            if (si >= 0) {
              store.records[si].data = finalData;
              store.records[si].updated_at = now;
              store.records[si].updated_by = imported_by;
            }
            results.merged++;
            continue;
          }
        }

        // Upsert mode: try to find by email match
        if (mode === 'upsert' && data.email) {
          const match = existingRecords.find(r => (r.data?.email || '').toLowerCase() === data.email.toLowerCase());
          if (match) {
            const si = store.records.findIndex(r => r.id === match.id);
            if (si >= 0) {
              store.records[si].data = { ...store.records[si].data, ...data };
              store.records[si].updated_at = now;
              store.records[si].updated_by = imported_by;
            }
            results.updated++;
            continue;
          }
        }

        // Create new record
        const newRecord = {
          id: uuidv4(), object_id, environment_id, data,
          created_by: imported_by, created_at: now, updated_at: now,
        };
        store.records.push(newRecord);
        results.created++;

      } catch (e) {
        results.errors.push({ row: idx + 1, error: e.message });
        results.skipped++;
      }
    }

    // Save import history
    if (!store.import_history) store.import_history = [];
    store.import_history.push({
      id: uuidv4(),
      upload_id,
      object_id,
      environment_id,
      file_name: uploadRef.original_name,
      row_count: rows.length,
      created: results.created,
      updated: results.updated,
      merged: results.merged,
      skipped: results.skipped,
      error_count: results.errors.length,
      mode,
      imported_by,
      imported_at: now,
      mappings_used: mappings.length,
    });

    saveStore(store);

    // Clean up the uploaded file
    try { fs.unlinkSync(uploadRef.file_path); } catch (_) {}

    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Import history ────────────────────────────────────────────────────────────
router.get('/history', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  let history = (store.import_history || []);
  if (environment_id) history = history.filter(h => h.environment_id === environment_id);
  history.sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at));
  res.json(history);
});

router.delete('/history/:id', (req, res) => {
  const store = getStore();
  const idx = (store.import_history || []).findIndex(h => h.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  store.import_history.splice(idx, 1);
  saveStore(store);
  res.json({ deleted: true });
});

module.exports = router;
