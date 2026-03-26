const { v4: uuidv4 } = require('uuid');

const EVENT_TYPES = {
  'record.created':        { label: 'Record Created',         category: 'records',      description: 'A new record was created' },
  'record.updated':        { label: 'Record Updated',         category: 'records',      description: 'A record was modified' },
  'record.deleted':        { label: 'Record Deleted',         category: 'records',      description: 'A record was soft-deleted' },
  'record.field_changed':  { label: 'Field Value Changed',    category: 'records',      description: 'A specific field changed' },
  'pipeline.stage_changed':{ label: 'Pipeline Stage Changed', category: 'pipeline',     description: 'Person moved to new stage' },
  'pipeline.person_linked':{ label: 'Person Linked to Record',category: 'pipeline',     description: 'Person linked to a job/pool' },
  'pipeline.person_unlinked':{ label:'Person Unlinked',       category: 'pipeline',     description: 'Person removed from pipeline' },
  'workflow.step_completed':{ label: 'Workflow Step Done',    category: 'pipeline',     description: 'A workflow step completed' },
  'interview.scheduled':   { label: 'Interview Scheduled',    category: 'interviews',   description: 'Interview was booked' },
  'interview.completed':   { label: 'Interview Completed',    category: 'interviews',   description: 'Interview marked complete' },
  'interview.cancelled':   { label: 'Interview Cancelled',    category: 'interviews',   description: 'Interview was cancelled' },
  'offer.created':         { label: 'Offer Created',          category: 'offers',       description: 'New offer drafted' },
  'offer.sent':            { label: 'Offer Sent',             category: 'offers',       description: 'Offer sent to candidate' },
  'offer.accepted':        { label: 'Offer Accepted',         category: 'offers',       description: 'Candidate accepted' },
  'offer.declined':        { label: 'Offer Declined',         category: 'offers',       description: 'Candidate declined' },
  'offer.approved':        { label: 'Offer Approved',         category: 'offers',       description: 'Approver approved' },
  'offer.rejected':        { label: 'Offer Rejected',         category: 'offers',       description: 'Approver rejected' },
  'application.received':  { label: 'Application Received',   category: 'applications', description: 'Candidate applied' },
  'application.screened':  { label: 'Application Screened',   category: 'applications', description: 'Application screened' },
  'comms.email_sent':      { label: 'Email Sent',             category: 'comms',        description: 'Email sent' },
  'comms.email_received':  { label: 'Email Received',         category: 'comms',        description: 'Inbound email received' },
  'comms.sms_sent':        { label: 'SMS Sent',               category: 'comms',        description: 'SMS sent' },
  'comms.call_logged':     { label: 'Call Logged',            category: 'comms',        description: 'Phone call logged' },
  'form.submitted':        { label: 'Form Submitted',         category: 'forms',        description: 'Form response submitted' },
  'user.created':          { label: 'User Created',           category: 'system',       description: 'New user created' },
  'user.login':            { label: 'User Login',             category: 'system',       description: 'User logged in' },
  'user.role_changed':     { label: 'User Role Changed',      category: 'system',       description: 'User role updated' },
  'portal.application':    { label: 'Portal Application',     category: 'portal',       description: 'Applied through portal' },
  'portal.feedback':       { label: 'Portal Feedback',        category: 'portal',       description: 'Visitor left feedback' },
};

const EVENT_CATEGORIES = {
  records:      { label: 'Records',       color: '#3B82F6', icon: 'database' },
  pipeline:     { label: 'Pipeline',      color: '#8B5CF6', icon: 'git-branch' },
  interviews:   { label: 'Interviews',    color: '#F59E0B', icon: 'calendar' },
  offers:       { label: 'Offers',        color: '#10B981', icon: 'dollar-sign' },
  applications: { label: 'Applications',  color: '#EC4899', icon: 'inbox' },
  comms:        { label: 'Communications',color: '#06B6D4', icon: 'mail' },
  forms:        { label: 'Forms',         color: '#6366F1', icon: 'clipboard' },
  system:       { label: 'System',        color: '#6B7280', icon: 'settings' },
  portal:       { label: 'Portal',        color: '#14B8A6', icon: 'globe' },
};

const _subscribers = [];
const MAX_LOG = 2000;
const _eventLog = [];

function subscribe(name, eventTypes, handler, meta = {}) {
  const id = uuidv4();
  _subscribers.push({ id, name, eventTypes: Array.isArray(eventTypes) ? eventTypes : [eventTypes], handler, meta, created_at: new Date().toISOString() });
  return id;
}

function unsubscribe(id) {
  const idx = _subscribers.findIndex(s => s.id === id);
  if (idx >= 0) _subscribers.splice(idx, 1);
}

async function emit(eventType, payload = {}, context = {}) {
  const event = {
    id: uuidv4(), type: eventType, payload,
    context: { environment_id: context.environment_id || null, user_id: context.user_id || null,
      record_id: context.record_id || null, object_id: context.object_id || null,
      object_name: context.object_name || null, ...context },
    timestamp: new Date().toISOString(),
    _meta: EVENT_TYPES[eventType] || { label: eventType, category: 'system' },
  };
  _eventLog.push(event);
  if (_eventLog.length > MAX_LOG) _eventLog.shift();
  try {
    const { getStore, saveStore } = require('../db/init');
    const store = getStore();
    if (!store.event_log) store.event_log = [];
    store.event_log.push({
      id: event.id, type: event.type, category: event._meta.category, label: event._meta.label,
      environment_id: event.context.environment_id, user_id: event.context.user_id,
      record_id: event.context.record_id, object_id: event.context.object_id,
      summary: buildSummary(event), timestamp: event.timestamp,
    });
    if (store.event_log.length > 5000) store.event_log = store.event_log.slice(-5000);
    saveStore();
  } catch (e) { /* non-critical */ }
  const matching = _subscribers.filter(s => s.eventTypes.includes('*') || s.eventTypes.includes(eventType));
  const results = [];
  for (const sub of matching) {
    try { await sub.handler(event); results.push({ subscriber: sub.name, ok: true }); }
    catch (err) { console.warn(`[EventBus] "${sub.name}" failed on ${eventType}:`, err.message); results.push({ subscriber: sub.name, ok: false, error: err.message }); }
  }
  return { event, results };
}

function buildSummary(event) {
  const p = event.payload; const c = event.context;
  switch (event.type) {
    case 'record.created':        return `Created ${c.object_name||'record'}: ${p.display_name||p.name||c.record_id}`;
    case 'record.updated':        return `Updated ${c.object_name||'record'}: ${p.display_name||p.name||c.record_id}`;
    case 'record.deleted':        return `Deleted ${c.object_name||'record'}: ${p.display_name||c.record_id}`;
    case 'record.field_changed':  return `Changed ${p.field_name}: ${p.old_value} → ${p.new_value}`;
    case 'pipeline.stage_changed':return `${p.person_name} moved to "${p.new_stage}" on ${p.record_name}`;
    case 'pipeline.person_linked':return `${p.person_name} linked to ${p.record_name}`;
    case 'interview.scheduled':   return `Interview: ${p.candidate_name} on ${p.date} at ${p.time}`;
    case 'offer.created':         return `Offer for ${p.candidate_name}: ${p.currency||'AED'} ${p.base_salary?.toLocaleString?.()}`;
    case 'offer.sent':            return `Offer sent to ${p.candidate_name}`;
    case 'offer.accepted':        return `${p.candidate_name} accepted the offer`;
    case 'offer.declined':        return `${p.candidate_name} declined the offer`;
    case 'comms.email_sent':      return `Email to ${p.to||p.recipient}: ${p.subject||'(no subject)'}`;
    case 'form.submitted':        return `Form "${p.form_name}" submitted for ${p.record_name||c.record_id}`;
    case 'user.created':          return `User created: ${p.email}`;
    case 'portal.application':    return `Application from ${p.candidate_name} via ${p.portal_name}`;
    default:                      return `${event._meta.label}: ${JSON.stringify(p).slice(0, 80)}`;
  }
}

function getEventLog({ environment_id, category, eventType, limit = 100, offset = 0 } = {}) {
  try {
    const { getStore } = require('../db/init');
    let log = getStore().event_log || [];
    if (environment_id) log = log.filter(e => e.environment_id === environment_id);
    if (category) log = log.filter(e => e.category === category);
    if (eventType) log = log.filter(e => e.type === eventType);
    log = log.slice().reverse();
    return { total: log.length, events: log.slice(offset, offset + limit) };
  } catch { return { total: 0, events: [] }; }
}

function getEventStats(environment_id, hours = 24) {
  try {
    const { getStore } = require('../db/init');
    const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
    let log = (getStore().event_log || []).filter(e => e.timestamp >= cutoff && (!environment_id || e.environment_id === environment_id));
    const byCategory = {}, byType = {}, byHour = {};
    for (const e of log) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
      const h = e.timestamp.slice(0, 13);
      byHour[h] = (byHour[h] || 0) + 1;
    }
    return { total: log.length, byCategory, byType, byHour };
  } catch { return { total: 0, byCategory: {}, byType: {}, byHour: {} }; }
}

function getSubscribers() {
  return _subscribers.map(s => ({ id: s.id, name: s.name, eventTypes: s.eventTypes, meta: s.meta, created_at: s.created_at }));
}

module.exports = { EVENT_TYPES, EVENT_CATEGORIES, subscribe, unsubscribe, emit, getEventLog, getEventStats, getSubscribers };
