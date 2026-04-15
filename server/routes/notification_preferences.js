const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');

// ── Default notification categories & types ──────────────────────────────────
const DEFAULT_NOTIFICATION_TYPES = [
  // Activity
  { key: 'message_replies',       category: 'activity',    label: 'Message replies',           description: 'When someone replies to your message',                   in_app: true, email: false },
  { key: 'mentions',              category: 'activity',    label: 'Mentions',                  description: 'When someone @mentions you',                             in_app: true, email: true },
  { key: 'record_assigned',       category: 'activity',    label: 'Record assigned to you',    description: 'When a candidate or job is assigned to you',             in_app: true, email: true },
  { key: 'note_added',            category: 'activity',    label: 'Notes on your records',     description: 'When someone adds a note to a record you own',           in_app: true, email: false },
  { key: 'field_updated',         category: 'activity',    label: 'Field changes',             description: 'When key fields change on records you follow',           in_app: true, email: false },

  // Recruiting
  { key: 'new_applications',      category: 'recruiting',  label: 'New applications',          description: 'New candidates from portals and career sites',           in_app: true, email: true },
  { key: 'stage_change',          category: 'recruiting',  label: 'Candidate stage change',    description: 'When a candidate moves through a pipeline stage',        in_app: true, email: false },
  { key: 'interview_today',       category: 'recruiting',  label: 'Interview today',           description: 'Interviews scheduled for today (morning alert)',         in_app: true, email: true },
  { key: 'interview_reminder',    category: 'recruiting',  label: 'Interview reminder',        description: '30 minutes before each scheduled interview',             in_app: true, email: false },
  { key: 'offer_actions',         category: 'recruiting',  label: 'Offer actions',             description: 'Offers requiring attention — accept, decline, expiring', in_app: true, email: true },
  { key: 'offer_expiry_warning',  category: 'recruiting',  label: 'Offer expiry warning',      description: '48 hours before an offer expires',                       in_app: true, email: true },
  { key: 'pool_additions',        category: 'recruiting',  label: 'Talent pool additions',     description: 'New candidates added to pools you manage',               in_app: true, email: false },

  // AI & Agents
  { key: 'agent_review_needed',   category: 'ai',          label: 'Agent review needed',       description: 'When an AI agent needs your approval',                   in_app: true, email: true },
  { key: 'agent_completed',       category: 'ai',          label: 'Agent completed',           description: 'When an AI agent finishes processing',                   in_app: true, email: false },
  { key: 'ai_match_found',        category: 'ai',          label: 'AI match found',            description: 'High-confidence candidate-job matches above your threshold', in_app: true, email: false },

  // Workflows & System
  { key: 'workflow_blocked',      category: 'system',      label: 'Workflow blocked',          description: 'Automated workflows that need help',                     in_app: true, email: true },
  { key: 'task_reminders',        category: 'system',      label: 'Task reminders',            description: 'Upcoming and overdue task alerts',                        in_app: true, email: true },
  { key: 'data_import_complete',  category: 'system',      label: 'Data import complete',      description: 'When a CSV or config import finishes',                    in_app: true, email: false },
  { key: 'new_user_signup',       category: 'system',      label: 'New user signup',           description: 'When a new user is added to your environment (admins)',    in_app: true, email: false },

  // Digests
  { key: 'daily_task_digest',     category: 'digests',     label: 'Daily task digest',         description: 'Morning email: interviews, pending approvals, expiring offers, overdue tasks', in_app: false, email: true },
  { key: 'daily_tasks_today',     category: 'digests',     label: 'My tasks today (in-app)',    description: 'In-app banner at login showing tasks due today and overdue tasks',             in_app: true,  email: false },
  { key: 'weekly_pipeline_summary', category: 'digests',   label: 'Weekly pipeline summary',   description: 'Friday overview: stage movement, new vs closed jobs, hiring velocity',         in_app: false, email: true },
  { key: 'monthly_hiring_report', category: 'digests',     label: 'Monthly hiring report',     description: 'Month-end: placements, time-to-fill, source breakdown, team performance',     in_app: false, email: true },
];

const CATEGORIES = [
  { key: 'activity',    label: 'Activity',              icon: 'activity',  color: '#3B5BDB', description: 'Replies, mentions, and record changes' },
  { key: 'recruiting',  label: 'Recruiting',            icon: 'users',     color: '#0CA678', description: 'Applications, interviews, offers, and pipelines' },
  { key: 'ai',          label: 'AI & Agents',           icon: 'zap',       color: '#7C3AED', description: 'Agent approvals, completions, and AI matches' },
  { key: 'system',      label: 'Workflows & System',    icon: 'settings',  color: '#F59F00', description: 'Workflow alerts, tasks, imports, and admin notifications' },
  { key: 'digests',     label: 'Scheduled Digests',     icon: 'mail',      color: '#E03131', description: 'Periodic summary emails — daily, weekly, monthly' },
];

function ensureTable() {
  const s = getStore();
  if (!s.notification_preferences) { s.notification_preferences = []; saveStore(); }
}

// GET /api/notification-preferences — returns the current user's prefs (merged with defaults)
router.get('/', (req, res) => {
  ensureTable();
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const existing = findOne('notification_preferences', p => p.user_id === userId);
  const prefs = existing?.preferences || {};

  // Merge defaults with user overrides
  const merged = DEFAULT_NOTIFICATION_TYPES.map(nt => ({
    ...nt,
    in_app: prefs[nt.key]?.in_app !== undefined ? prefs[nt.key].in_app : nt.in_app,
    email:  prefs[nt.key]?.email  !== undefined ? prefs[nt.key].email  : nt.email,
  }));

  res.json({
    categories: CATEGORIES,
    types: merged,
    digest_config: existing?.digest_config || {
      daily_time: '08:00',
      weekly_day: 'friday',
      timezone: 'Asia/Dubai',
    },
    match_threshold: existing?.match_threshold || 75,
    quiet_hours: existing?.quiet_hours || { enabled: false, start: '22:00', end: '07:00' },
  });
});

// PUT /api/notification-preferences — save the current user's prefs
router.put('/', (req, res) => {
  ensureTable();
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { preferences, digest_config, match_threshold, quiet_hours } = req.body;

  const s = getStore();
  const idx = (s.notification_preferences || []).findIndex(p => p.user_id === userId);

  const record = {
    user_id: userId,
    preferences: preferences || {},
    digest_config: digest_config || {},
    match_threshold: match_threshold || 75,
    quiet_hours: quiet_hours || { enabled: false, start: '22:00', end: '07:00' },
    updated_at: new Date().toISOString(),
  };

  if (idx >= 0) {
    record.id = s.notification_preferences[idx].id;
    record.created_at = s.notification_preferences[idx].created_at;
    s.notification_preferences[idx] = record;
  } else {
    record.id = uuidv4();
    record.created_at = new Date().toISOString();
    s.notification_preferences.push(record);
  }

  saveStore();

  // Sync to Postgres if available
  try {
    const pg = require('../db/postgres');
    const { getCurrentTenant } = require('../db/init');
    if (pg.isEnabled()) pg.saveCollection(getCurrentTenant() || 'master', 'notification_preferences', s.notification_preferences);
  } catch (e) {}

  res.json(record);
});

// GET /api/notification-preferences/defaults — returns just the type definitions (for admin reference)
router.get('/defaults', (req, res) => {
  res.json({ categories: CATEGORIES, types: DEFAULT_NOTIFICATION_TYPES });
});

// GET /api/notification-preferences/digest/today — tasks + interviews for today
// Used by the copilot daily digest and the in-app banner
router.get('/digest/today', (req, res) => {
  try {
    const { environment_id } = req.query;
    const store = getStore();
    const today = new Date().toISOString().slice(0, 10);

    // Tasks due today + overdue
    const tasks = (store.calendar_tasks || []).filter(t => {
      if (t.deleted_at || t.status === 'done') return false;
      if (environment_id && t.environment_id !== environment_id) return false;
      return t.due_date && t.due_date <= today;
    }).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

    // Interviews today
    const interviews = (store.interviews || []).filter(i => {
      if (i.deleted_at) return false;
      if (environment_id && i.environment_id !== environment_id) return false;
      return i.date === today;
    });

    // Expiring offers (within 3 days)
    const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3);
    const threeStr  = threeDays.toISOString().slice(0, 10);
    const offers = (store.offers || []).filter(o => {
      if (o.deleted_at) return false;
      if (environment_id && o.environment_id !== environment_id) return false;
      return o.status === 'sent' && o.expiry_date && o.expiry_date >= today && o.expiry_date <= threeStr;
    });

    const overdue = tasks.filter(t => t.due_date < today);
    const dueToday = tasks.filter(t => t.due_date === today);

    res.json({
      date: today,
      summary: {
        tasks_overdue: overdue.length,
        tasks_today: dueToday.length,
        interviews_today: interviews.length,
        offers_expiring: offers.length,
      },
      tasks_overdue: overdue,
      tasks_today: dueToday,
      interviews_today: interviews,
      offers_expiring: offers,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
