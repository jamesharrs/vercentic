const { Pool } = require('pg');
let pool = null;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[PG] pool error:', err.message));
    console.log('[PG] Pool created');
  }
  return pool;
}
function isEnabled() { return !!(process.env.DATABASE_URL); }
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenant_store (
  tenant_slug TEXT NOT NULL, table_name TEXT NOT NULL, record_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (tenant_slug, table_name, record_id)
);
CREATE INDEX IF NOT EXISTS idx_ts_tenant_table ON tenant_store (tenant_slug, table_name);
CREATE INDEX IF NOT EXISTS idx_ts_data_gin ON tenant_store USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_ts_environment_id ON tenant_store ((data->>'environment_id')) WHERE table_name IN ('records','objects','fields','relationships','workflows');
CREATE INDEX IF NOT EXISTS idx_ts_object_id ON tenant_store ((data->>'object_id')) WHERE table_name IN ('records','fields');
CREATE INDEX IF NOT EXISTS idx_ts_status ON tenant_store ((data->>'status')) WHERE table_name = 'records';
CREATE INDEX IF NOT EXISTS idx_ts_created_at ON tenant_store ((data->>'created_at')) WHERE table_name = 'records';
`;
async function initSchema() {
  const client = await getPool().connect();
  try { await client.query(SCHEMA_SQL); console.log('[PG] Schema ready'); } finally { client.release(); }
}
async function loadTenant(slug) {
  const p = getPool(); if (!p) return null;
  const { rows } = await p.query(`SELECT table_name, record_id, data FROM tenant_store WHERE tenant_slug = $1`, [slug]);
  const store = {};
  for (const row of rows) {
    if (!store[row.table_name]) store[row.table_name] = [];
    const record = { ...row.data }; if (!record.id) record.id = row.record_id;
    store[row.table_name].push(record);
  }
  return store;
}
async function saveTenant(slug, store) {
  const p = getPool(); if (!p) return;
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const rows = [];
    for (const [tableName, items] of Object.entries(store)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) { if (!item || !item.id) continue; rows.push({ tableName, id: String(item.id), data: item }); }
    }
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK); if (chunk.length === 0) continue;
      const values = chunk.map((r, idx) => { const base = idx * 4; return `($${base+1}, $${base+2}, $${base+3}, $${base+4}::jsonb)`; }).join(', ');
      const params = chunk.flatMap(r => [slug, r.tableName, r.id, JSON.stringify(r.data)]);
      await client.query(`INSERT INTO tenant_store (tenant_slug, table_name, record_id, data, updated_at) VALUES ${values} ON CONFLICT (tenant_slug, table_name, record_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, params);
    }
    for (const [tableName, items] of Object.entries(store)) {
      if (!Array.isArray(items) || items.length === 0) continue;
      const ids = items.filter(i => i?.id).map(i => String(i.id)); if (ids.length === 0) continue;
      await client.query(`DELETE FROM tenant_store WHERE tenant_slug = $1 AND table_name = $2 AND record_id NOT IN (${ids.map((_, k) => `$${k+3}`).join(',')})`, [slug, tableName, ...ids]);
    }
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}
async function upsertRecord(slug, tableName, record) {
  const p = getPool(); if (!p || !record?.id) return;
  await p.query(`INSERT INTO tenant_store (tenant_slug, table_name, record_id, data, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW()) ON CONFLICT (tenant_slug, table_name, record_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [slug, tableName, String(record.id), JSON.stringify(record)]);
}
async function deleteRecord(slug, tableName, recordId) {
  const p = getPool(); if (!p) return;
  await p.query(`DELETE FROM tenant_store WHERE tenant_slug = $1 AND table_name = $2 AND record_id = $3`, [slug, tableName, String(recordId)]);
}
async function queryRecordsDirect(slug, filters = {}) {
  const p = getPool(); if (!p) return null;
  const conditions = [`tenant_slug = $1`, `table_name = 'records'`]; const params = [slug]; let idx = 2;
  if (filters.object_id) { conditions.push(`data->>'object_id' = $${idx++}`); params.push(filters.object_id); }
  if (filters.environment_id) { conditions.push(`data->>'environment_id' = $${idx++}`); params.push(filters.environment_id); }
  if (filters.search) { conditions.push(`data::text ILIKE $${idx++}`); params.push(`%${filters.search}%`); }
  if (filters.status) { conditions.push(`data->>'status' = $${idx++}`); params.push(filters.status); }
  const where = conditions.join(' AND '); const limit = filters.limit || 50; const offset = filters.offset || 0;
  const [dataRes, countRes] = await Promise.all([
    p.query(`SELECT data FROM tenant_store WHERE ${where} ORDER BY (data->>'created_at') DESC NULLS LAST LIMIT $${idx} OFFSET $${idx+1}`, [...params, limit, offset]),
    p.query(`SELECT COUNT(*) FROM tenant_store WHERE ${where}`, params),
  ]);
  return { records: dataRes.rows.map(r => r.data), total: parseInt(countRes.rows[0].count, 10) };
}
module.exports = { getPool, isEnabled, initSchema, loadTenant, saveTenant, upsertRecord, deleteRecord, queryRecordsDirect };
