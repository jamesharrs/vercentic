const eventBus = require('./eventBus');

function eventEmitterMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method;
      const path = req.route?.path || req.path;
      const envId = req.query?.environment_id || req.body?.environment_id || body?.environment_id;
      try { emitForRoute(method, req.baseUrl + path, req, body, envId); } catch (e) { console.warn('[EventBus] Emit error:', e.message); }
    }
    return originalJson(body);
  };
  next();
}

function emitForRoute(method, fullPath, req, body, envId) {
  if (fullPath.match(/\/api\/records\/?$/) && method === 'POST') {
    const d = body?.data || {};
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.job_title || d.pool_name || d.name || '';
    eventBus.emit('record.created', { id: body.id, display_name: name, data: d }, { environment_id: envId, record_id: body.id, object_id: body.object_id });
  }
  if (fullPath.match(/\/api\/records\/:id/) && method === 'PATCH') {
    const d = body?.data || {};
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.job_title || d.name || '';
    eventBus.emit('record.updated', { id: body.id, display_name: name, changed_fields: req.body ? Object.keys(req.body.data || req.body) : [] }, { environment_id: envId, record_id: req.params?.id || body.id, object_id: body.object_id });
  }
  if (fullPath.match(/\/api\/records\/:id/) && method === 'DELETE') {
    eventBus.emit('record.deleted', { id: req.params?.id }, { environment_id: envId, record_id: req.params?.id });
  }
  if (fullPath.match(/\/api\/interviews\/?$/) && method === 'POST') {
    eventBus.emit('interview.scheduled', { id: body.id, candidate_name: body.candidate_name, candidate_id: body.candidate_id, date: body.date, time: body.time, format: body.format }, { environment_id: envId, record_id: body.candidate_id });
  }
  if (fullPath.match(/\/api\/offers\/?$/) && method === 'POST') {
    eventBus.emit('offer.created', { id: body.id, candidate_name: body.candidate_name, candidate_id: body.candidate_id, base_salary: body.base_salary, currency: body.currency, status: body.status }, { environment_id: envId, record_id: body.candidate_id });
  }
  if (fullPath.match(/\/api\/offers\/:id\/status/) && method === 'PATCH') {
    const status = req.body?.status;
    const eventMap = { sent: 'offer.sent', accepted: 'offer.accepted', declined: 'offer.declined' };
    if (eventMap[status]) eventBus.emit(eventMap[status], { id: req.params?.id, candidate_name: body.candidate_name, status }, { environment_id: envId, record_id: body.candidate_id });
  }
  if (fullPath.match(/\/api\/comms\/?$/) && method === 'POST') {
    const type = req.body?.type;
    const eventMap = { email: 'comms.email_sent', sms: 'comms.sms_sent', call: 'comms.call_logged' };
    if (eventMap[type]) eventBus.emit(eventMap[type], { to: req.body?.to, subject: req.body?.subject, type, record_id: req.body?.record_id }, { environment_id: envId, record_id: req.body?.record_id });
  }
  if (fullPath.match(/\/api\/forms\/:id\/responses/) && method === 'POST') {
    eventBus.emit('form.submitted', { form_id: req.params?.id, form_name: body?.form_name, record_id: body?.record_id, record_name: body?.record_name }, { environment_id: envId, record_id: body?.record_id });
  }
  if (fullPath.match(/\/api\/users\/?$/) && method === 'POST') {
    eventBus.emit('user.created', { email: body.email, first_name: body.first_name, last_name: body.last_name }, { environment_id: body.environment_id });
  }
}

function initEventBusIntegrations(app) {
  app.use(eventEmitterMiddleware);
  console.log('[EventBus] Event emitter middleware attached');
}

module.exports = { initEventBusIntegrations, eventEmitterMiddleware };
