const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

// ── TASKS ──────────────────────────────────────────────────────────────────

router.get('/tasks', (req, res) => {
  try {
    const { environment_id, assignee_id, record_id, object_id, status, due_before, due_after } = req.query;
    let tasks = query('calendar_tasks', t => {
      if (environment_id && t.environment_id !== environment_id) return false;
      if (assignee_id && t.assignee_id !== assignee_id) return false;
      if (record_id && t.record_id !== record_id) return false;
      if (object_id && t.object_id !== object_id) return false;
      if (status && t.status !== status) return false;
      if (due_before && t.due_date > due_before) return false;
      if (due_after && t.due_date < due_after) return false;
      return !t.deleted_at;
    });
    tasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tasks', (req, res) => {
  try {
    const { environment_id, title, description, due_date, due_time, priority, status, assignee_id,
      record_id, object_id, record_name, checklist, tags, estimated_minutes } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const task = insert('calendar_tasks', {
      id: uuidv4(),
      environment_id, title, description: description || '',
      due_date: due_date || null, due_time: due_time || null,
      priority: priority || 'medium',
      status: status || 'todo',
      assignee_id: assignee_id || null,
      record_id: record_id || null,
      object_id: object_id || null,
      record_name: record_name || null,
      checklist: JSON.stringify(checklist || []),
      tags: JSON.stringify(tags || []),
      estimated_minutes: estimated_minutes || null,
      completed_at: null,
    });
    res.json(task);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/tasks/:id', (req, res) => {
  try {
    const store = getStore();
    const task = (store.calendar_tasks || []).find(t => t.id === req.params.id && !t.deleted_at);
    if (!task) return res.status(404).json({ error: 'Not found' });
    const allowed = ['title','description','due_date','due_time','priority','status',
      'assignee_id','record_id','object_id','record_name','checklist','tags','estimated_minutes','completed_at'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'checklist' || k === 'tags') task[k] = JSON.stringify(req.body[k]);
        else task[k] = req.body[k];
      }
    });
    if (req.body.status === 'done' && !task.completed_at) task.completed_at = new Date().toISOString();
    if (req.body.status !== 'done') task.completed_at = null;
    task.updated_at = new Date().toISOString();
    saveStore(store);
    res.json(task);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/tasks/:id', (req, res) => {
  try {
    const store = getStore();
    const task = (store.calendar_tasks || []).find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    task.deleted_at = new Date().toISOString();
    saveStore(store);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EVENTS ─────────────────────────────────────────────────────────────────

router.get('/events', (req, res) => {
  try {
    const { environment_id, record_id, start_after, end_before, type } = req.query;
    let events = query('calendar_events', e => {
      if (environment_id && e.environment_id !== environment_id) return false;
      if (record_id && e.record_id !== record_id) return false;
      if (type && e.type !== type) return false;
      if (start_after && e.end_date < start_after) return false;
      if (end_before && e.start_date > end_before) return false;
      return !e.deleted_at;
    });
    events.sort((a, b) => a.start_date.localeCompare(b.start_date));
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/events', (req, res) => {
  try {
    const { environment_id, title, description, start_date, start_time, end_date, end_time,
      type, location, attendees, record_id, object_id, record_name, all_day, color } = req.body;
    if (!title || !start_date) return res.status(400).json({ error: 'title and start_date required' });
    const event = insert('calendar_events', {
      id: uuidv4(),
      environment_id, title, description: description || '',
      start_date, start_time: start_time || null,
      end_date: end_date || start_date, end_time: end_time || null,
      type: type || 'general',
      location: location || null,
      attendees: JSON.stringify(attendees || []),
      record_id: record_id || null,
      object_id: object_id || null,
      record_name: record_name || null,
      all_day: all_day ? 1 : 0,
      color: color || null,
    });
    res.json(event);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/events/:id', (req, res) => {
  try {
    const store = getStore();
    const event = (store.calendar_events || []).find(e => e.id === req.params.id && !e.deleted_at);
    if (!event) return res.status(404).json({ error: 'Not found' });
    const allowed = ['title','description','start_date','start_time','end_date','end_time',
      'type','location','attendees','record_id','object_id','record_name','all_day','color'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'attendees') event[k] = JSON.stringify(req.body[k]);
        else event[k] = req.body[k];
      }
    });
    event.updated_at = new Date().toISOString();
    saveStore(store);
    res.json(event);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/events/:id', (req, res) => {
  try {
    const store = getStore();
    const event = (store.calendar_events || []).find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    event.deleted_at = new Date().toISOString();
    saveStore(store);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── UNIFIED FEED ────────────────────────────────────────────────────────────

router.get('/feed', (req, res) => {
  try {
    const { environment_id, start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required' });
    const tasks = query('calendar_tasks', t =>
      t.environment_id === environment_id && !t.deleted_at &&
      t.due_date >= start && t.due_date <= end
    ).map(t => ({ ...t, _kind: 'task', checklist: safeJson(t.checklist, []), tags: safeJson(t.tags, []) }));
    const events = query('calendar_events', e =>
      e.environment_id === environment_id && !e.deleted_at &&
      e.start_date <= end && (e.end_date || e.start_date) >= start
    ).map(e => ({ ...e, _kind: 'event', attendees: safeJson(e.attendees, []) }));
    const interviews = query('interviews', i =>
      i.environment_id === environment_id && !i.deleted_at &&
      i.date >= start && i.date <= end
    ).map(i => ({ ...i, _kind: 'interview' }));
    res.json({ tasks, events, interviews });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function safeJson(v, fallback) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v || fallback); }
  catch { return fallback; }
}

const { getStore: gs, saveStore: ss } = require('../db/init');
(function initCalendarStore() {
  const store = gs();
  if (!store.calendar_tasks) { store.calendar_tasks = []; ss(store); }
  if (!store.calendar_events) { store.calendar_events = []; ss(store); }
})();

module.exports = router;
