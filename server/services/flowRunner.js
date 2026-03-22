// server/services/flowRunner.js — Vercentic Flow Engine (queue-agnostic)
// BullMQ upgrade: wrap executeFlow() as worker handler, zero other changes.
const crypto = require('crypto');
const { getStore, saveStore } = require('../db/init');

// Try to import getLiveConfig from connectors (graceful if missing)
let getLiveConfig = () => null;
try { getLiveConfig = require('./connectors').getLiveConfig; } catch {}

function ensureStore() {
  const s = getStore();
  if (!s.flows)     { s.flows = [];     saveStore(); }
  if (!s.flow_runs) { s.flow_runs = []; saveStore(); }
  return s;
}

function getFlow(flowId) {
  return (ensureStore().flows || []).find(f => f.id === flowId && !f.deleted_at) || null;
}

function saveRun(run) {
  const s = ensureStore();
  const idx = (s.flow_runs || []).findIndex(r => r.id === run.id);
  if (idx >= 0) s.flow_runs[idx] = run; else s.flow_runs.push(run);
  if (s.flow_runs.length > 1000) s.flow_runs = s.flow_runs.slice(-1000);
  saveStore();
}

// ── Template engine ───────────────────────────────────────────────────────────
function resolve(template, ctx) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const parts = path.trim().split('.');
    let val = ctx;
    for (const part of parts) { if (val == null) return ''; val = val[part]; }
    return val == null ? '' : String(val);
  });
}
function resolveDeep(obj, ctx) {
  if (typeof obj === 'string') return resolve(obj, ctx);
  if (Array.isArray(obj)) return obj.map(v => resolveDeep(v, ctx));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveDeep(v, ctx);
    return out;
  }
  return obj;
}

function evalCondition(condition, ctx) {
  const { field, operator, value } = condition;
  const actual = resolve(`{{${field}}}`, ctx);
  const expected = resolve(String(value ?? ''), ctx);
  switch (operator) {
    case 'eq': return String(actual) === String(expected);
    case 'neq': return String(actual) !== String(expected);
    case 'contains': return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case 'not_contains': return !String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case 'gt': return Number(actual) > Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'is_empty': return !actual || actual === '';
    case 'is_not_empty': return !!(actual && actual !== '');
    default: return false;
  }
}

async function httpRequest(method, url, { headers = {}, body, timeout = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const opts = { method: method.toUpperCase(), headers, signal: controller.signal };
    if (body && method.toUpperCase() !== 'GET') {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    }
    const resp = await fetch(url, opts);
    const text = await resp.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: resp.status, ok: resp.ok, body: json || text, headers: Object.fromEntries(resp.headers) };
  } finally { clearTimeout(timer); }
}

async function withRetry(fn, { maxAttempts = 3, backoffMs = 1000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastError = err;
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

// ── Step handlers ─────────────────────────────────────────────────────────────
const STEP_HANDLERS = {
  async http_request(step, ctx, flow) {
    const cfg = resolveDeep(step.config, ctx);
    const { method = 'GET', url, headers = {}, body, auth_slug, timeout } = cfg;
    if (!url) throw new Error('http_request: url is required');
    const reqHeaders = { ...headers };
    if (auth_slug) {
      const creds = getLiveConfig(flow.environment_id, auth_slug);
      if (creds?.api_key) reqHeaders['Authorization'] = `Bearer ${creds.api_key}`;
      if (creds?.access_token) reqHeaders['Authorization'] = `Bearer ${creds.access_token}`;
    }
    const result = await withRetry(
      () => httpRequest(method, url, { headers: reqHeaders, body, timeout }),
      { maxAttempts: step.config.retry_count || 1 }
    );
    if (!result.ok && step.config.fail_on_error !== false)
      throw new Error(`HTTP ${result.status}: ${JSON.stringify(result.body).slice(0,200)}`);
    return { response: result.body, status: result.status, ok: result.ok };
  },

  async transform(step, ctx) {
    const { mappings = [] } = step.config;
    const output = {};
    for (const { from, to, transform: fn } of mappings) {
      let val = resolve(`{{${from}}}`, ctx);
      if (fn === 'uppercase') val = String(val).toUpperCase();
      if (fn === 'lowercase') val = String(val).toLowerCase();
      if (fn === 'trim') val = String(val).trim();
      if (fn === 'to_number') val = Number(val);
      if (fn === 'iso_date') val = new Date(val).toISOString();
      const parts = to.split('.');
      let obj = output;
      for (let i = 0; i < parts.length - 1; i++) { if (!obj[parts[i]]) obj[parts[i]] = {}; obj = obj[parts[i]]; }
      obj[parts[parts.length - 1]] = val;
    }
    return output;
  },

  async find_record(step, ctx, flow) {
    const { object_slug, field, operator = 'eq', value, multiple = false } = step.config;
    const s = getStore();
    const obj = (s.objects || []).find(o => o.slug === object_slug && o.environment_id === flow.environment_id);
    if (!obj) throw new Error(`find_record: object '${object_slug}' not found`);
    const resolvedValue = resolve(String(value ?? ''), ctx);
    const records = (s.records || []).filter(r => {
      if (r.object_id !== obj.id || r.deleted_at) return false;
      const fieldVal = r.data?.[field];
      return evalCondition({ field: '__v', operator, value: resolvedValue }, { __v: fieldVal });
    });
    if (multiple) return { records, count: records.length };
    return { record: records[0] || null, found: records.length > 0 };
  },

  async create_record(step, ctx, flow) {
    const { object_slug, data } = step.config;
    const s = getStore();
    const obj = (s.objects || []).find(o => o.slug === object_slug && o.environment_id === flow.environment_id);
    if (!obj) throw new Error(`create_record: object '${object_slug}' not found`);
    const record = { id: crypto.randomUUID(), object_id: obj.id, environment_id: flow.environment_id,
      data: resolveDeep(data, ctx), created_by: 'flow_engine',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!s.records) s.records = [];
    s.records.push(record); saveStore();
    return { record, id: record.id };
  },

  async update_record(step, ctx) {
    const { record_id_path, data } = step.config;
    const s = getStore();
    const recordId = resolve(`{{${record_id_path}}}`, ctx);
    const idx = (s.records || []).findIndex(r => r.id === recordId);
    if (idx < 0) throw new Error(`update_record: record '${recordId}' not found`);
    s.records[idx].data = { ...s.records[idx].data, ...resolveDeep(data, ctx) };
    s.records[idx].updated_at = new Date().toISOString();
    saveStore();
    return { record: s.records[idx], id: recordId };
  },

  async notify(step, ctx, flow) {
    const { provider, message, channel } = step.config;
    const resolvedMsg = resolve(message, ctx);
    const creds = getLiveConfig(flow.environment_id, provider);
    if (!creds) return { skipped: true, reason: `${provider} not connected` };
    const webhookUrl = creds.webhook_url;
    if (!webhookUrl) throw new Error(`${provider}: no webhook URL configured`);
    const body = provider === 'slack'
      ? { text: resolvedMsg, ...(channel ? { channel } : {}) }
      : { text: resolvedMsg };
    const result = await httpRequest('POST', webhookUrl, { body });
    return { sent: result.ok, status: result.status };
  },

  async ai_prompt(step, ctx) {
    const { prompt, system, max_tokens = 500, store_as } = step.config;
    const resp = await httpRequest('POST', `${process.env.INTERNAL_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
      body: { message: resolve(prompt, ctx), system: system ? resolve(system, ctx) : undefined, max_tokens }
    });
    if (!resp.ok) throw new Error(`AI prompt failed: ${resp.status}`);
    const result = resp.body?.response || resp.body?.content?.[0]?.text || '';
    return { result, [store_as || 'ai_output']: result };
  },

  async condition(step, ctx) {
    const { conditions = [], logic = 'and' } = step.config;
    const results = conditions.map(c => evalCondition(c, ctx));
    const passed = logic === 'or' ? results.some(Boolean) : results.every(Boolean);
    return { branch: passed ? 'true' : 'false', passed };
  },

  async delay(step) {
    const ms = (step.config.seconds || 1) * 1000;
    if (ms > 60000) throw new Error('delay: max 60 seconds');
    await new Promise(r => setTimeout(r, ms));
    return { waited_ms: ms };
  },

  async set_variable(step, ctx) {
    return resolveDeep(step.config.variables || {}, ctx);
  },
};

// ── Main execution ────────────────────────────────────────────────────────────
async function executeFlow(flowId, triggerPayload = {}, { triggerType = 'manual', dryRun = false } = {}) {
  const flow = getFlow(flowId);
  if (!flow) throw new Error(`Flow '${flowId}' not found`);
  if (!flow.enabled && triggerType !== 'manual') return { skipped: true, reason: 'flow_disabled' };

  const runId = crypto.randomUUID();
  const run = { id: runId, flow_id: flowId, flow_name: flow.name, trigger_type: triggerType,
    trigger_payload: triggerPayload, started_at: new Date().toISOString(),
    finished_at: null, ok: false, error: null, steps: [], dry_run: dryRun };

  const context = { trigger: triggerPayload,
    flow: { id: flowId, name: flow.name, environment_id: flow.environment_id },
    steps: {}, vars: {} };

  const steps = flow.steps || [];
  let idx = 0;
  try {
    while (idx < steps.length) {
      const step = steps[idx];
      if (step.enabled === false) { run.steps.push({ step_id: step.id, ok: true, skipped: true }); idx++; continue; }
      const start = Date.now();
      const stepLog = { step_id: step.id, step_type: step.type, step_name: step.name,
        started_at: new Date().toISOString(), ok: false, output: null, error: null };
      try {
        const handler = STEP_HANDLERS[step.type];
        if (!handler) throw new Error(`Unknown step type: '${step.type}'`);
        const output = dryRun ? { dry_run: true } : await handler(step, context, flow);
        stepLog.ok = true; stepLog.output = output; stepLog.duration_ms = Date.now() - start;
        if (output && !output.skipped) {
          context.steps[step.id] = output;
          if (step.type === 'condition' && output.branch) {
            const nextKey = output.branch === 'true' ? 'next_true' : 'next_false';
            const nextId = step.config[nextKey];
            if (nextId) { const ni = steps.findIndex(s => s.id === nextId); if (ni >= 0) { idx = ni; run.steps.push(stepLog); continue; } }
          }
          if (step.type === 'set_variable') Object.assign(context.vars, output);
        }
      } catch (err) {
        stepLog.ok = false; stepLog.error = err.message; stepLog.duration_ms = Date.now() - start;
        if (step.on_error !== 'continue') { run.steps.push(stepLog); throw err; }
      }
      run.steps.push(stepLog);
      idx++;
    }
    run.ok = true;
  } catch (err) {
    run.ok = false; run.error = err.message;
    console.error(`[FlowEngine] '${flow.name}' failed:`, err.message);
  }
  run.finished_at = new Date().toISOString();
  run.duration_ms = Date.now() - new Date(run.started_at).getTime();
  if (!dryRun) {
    saveRun(run);
    const s = getStore();
    const fi = (s.flows || []).findIndex(f => f.id === flowId);
    if (fi >= 0) {
      s.flows[fi].last_run_at = run.started_at; s.flows[fi].last_run_ok = run.ok;
      s.flows[fi].run_count = (s.flows[fi].run_count || 0) + 1;
      if (!run.ok) s.flows[fi].last_error = run.error;
      saveStore();
    }
  }
  return run;
}

function validateFlow(flow) {
  const errors = [];
  if (!flow.name?.trim()) errors.push('Flow name is required');
  if (!flow.trigger?.type) errors.push('Trigger type is required');
  if (flow.trigger?.type === 'schedule' && !flow.trigger?.cron) errors.push('Schedule trigger requires a cron expression');
  if (!Array.isArray(flow.steps) || flow.steps.length === 0) errors.push('Flow must have at least one step');
  const validTypes = Object.keys(STEP_HANDLERS);
  for (const step of (flow.steps || [])) {
    if (!step.type) errors.push(`Step '${step.id || '?'}': missing type`);
    if (step.type && !validTypes.includes(step.type)) errors.push(`Step '${step.id}': unknown type '${step.type}'`);
  }
  return errors.length ? { valid: false, errors } : { valid: true };
}

module.exports = { executeFlow, validateFlow, resolveDeep, evalCondition, STEP_HANDLERS };
