const express = require('express');
const router = express.Router();
const { getStore, insert, update } = require('../db/init');

// ── Export CSV ────────────────────────────────────────────────────────────────
router.get('/export', (req, res) => {
  const { object_id, environment_id } = req.query;
  if (!object_id || !environment_id) return res.status(400).json({ error: 'object_id and environment_id required' });

  const store = getStore();
  const records = (store.records || []).filter(r => r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at);
  const fields  = (store.fields  || []).filter(f => f.object_id === object_id);
  const object  = (store.objects || []).find(o => o.id === object_id);

  if (!records.length) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${object?.slug||'export'}.csv"`);
    const header = fields.map(f => csvEscape(f.name)).join(',');
    return res.send(header + '\n');
  }

  const header = fields.map(f => csvEscape(f.name)).join(',');
  const rows = records.map(r =>
    fields.map(f => {
      const val = r.data?.[f.api_key];
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return csvEscape(val.join(';'));
      return csvEscape(String(val));
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${object?.slug||'export'}-${Date.now()}.csv"`);
  res.send(csv);
});

// ── Import CSV ────────────────────────────────────────────────────────────────
router.post('/import', express.text({ type: 'text/csv', limit: '5mb' }), (req, res) => {
  const { object_id, environment_id, mode = 'create' } = req.query; // mode: create | upsert
  if (!object_id || !environment_id) return res.status(400).json({ error: 'object_id and environment_id required' });

  const store = getStore();
  const fields = (store.fields || []).filter(f => f.object_id === object_id);

  const lines = req.body.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: 'CSV must have header + at least one data row' });

  const headers = parseCSVRow(lines[0]);
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVRow(lines[i]);
      if (values.length === 0) continue;

      const data = {};
      headers.forEach((h, idx) => {
        const field = fields.find(f => f.name.toLowerCase() === h.toLowerCase() || f.api_key.toLowerCase() === h.toLowerCase());
        if (!field) return;
        const raw = values[idx] || '';
        if (raw === '') return;
        if (field.field_type === 'multi_select') {
          data[field.api_key] = raw.split(';').map(v => v.trim()).filter(Boolean);
        } else if (field.field_type === 'number' || field.field_type === 'currency') {
          const n = parseFloat(raw.replace(/[^0-9.-]/g, ''));
          if (!isNaN(n)) data[field.api_key] = n;
        } else if (field.field_type === 'boolean') {
          data[field.api_key] = ['true','yes','1'].includes(raw.toLowerCase());
        } else {
          data[field.api_key] = raw;
        }
      });

      // Check for existing record by email or first+last name
      let existing = null;
      if (mode === 'upsert') {
        if (data.email) {
          existing = (store.records || []).find(r => r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at && r.data?.email === data.email);
        } else if (data.first_name && data.last_name) {
          existing = (store.records || []).find(r => r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at && r.data?.first_name === data.first_name && r.data?.last_name === data.last_name);
        } else if (data.job_title) {
          existing = (store.records || []).find(r => r.object_id === object_id && r.environment_id === environment_id && !r.deleted_at && r.data?.job_title === data.job_title);
        }
      }

      if (existing) {
        update('records', existing.id, { data: { ...existing.data, ...data }, updated_by: 'CSV Import', updated_at: new Date().toISOString() });
        results.updated++;
      } else {
        insert('records', {
          object_id, environment_id,
          data,
          created_by: 'CSV Import',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        results.created++;
      }
    } catch(e) {
      results.errors.push(`Row ${i+1}: ${e.message}`);
      results.skipped++;
    }
  }

  res.json({ success: true, ...results });
});

// ── Template download ─────────────────────────────────────────────────────────
router.get('/template', (req, res) => {
  const { object_id } = req.query;
  if (!object_id) return res.status(400).json({ error: 'object_id required' });

  const store = getStore();
  const fields = (store.fields || []).filter(f => f.object_id === object_id);
  const object = (store.objects || []).find(o => o.id === object_id);

  const header = fields.map(f => csvEscape(f.name)).join(',');
  const example = fields.map(f => {
    switch(f.field_type) {
      case 'email':        return csvEscape('example@email.com');
      case 'number':       return '5';
      case 'currency':     return '50000';
      case 'date':         return '2025-01-01';
      case 'boolean':      return 'true';
      case 'select':       return csvEscape(f.options?.[0] || '');
      case 'multi_select': return csvEscape((f.options||[]).slice(0,2).join(';'));
      case 'url':          return csvEscape('https://example.com');
      default:             return csvEscape(`Example ${f.name}`);
    }
  }).join(',');

  const csv = [header, example].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${object?.slug||'template'}-template.csv"`);
  res.send(csv);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

module.exports = router;
