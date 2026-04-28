// server/routes/task_groups.js — task group templates + assignments
const router     = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, insert, query, update, remove } = require('../db/init');

function ensure(s) {
  if (!s.task_group_templates)  s.task_group_templates  = [];
  if (!s.task_group_assignments) s.task_group_assignments = [];
}

// ── Templates (admin-managed group definitions) ───────────────────────────────

// List templates
router.get('/templates', (req, res) => {
  const s = getStore(); ensure(s);
  let tpls = s.task_group_templates.filter(t => !t.deleted_at);
  if (req.query.environment_id) tpls = tpls.filter(t => t.environment_id === req.query.environment_id);
  res.json(tpls);
});

// Get single template
router.get('/templates/:id', (req, res) => {
  const s = getStore(); ensure(s);
  const t = s.task_group_templates.find(t => t.id === req.params.id && !t.deleted_at);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// Create template
router.post('/templates', (req, res) => {
  const s = getStore(); ensure(s);
  const now = new Date().toISOString();
  const tpl = {
    id:             uuidv4(),
    environment_id: req.body.environment_id || null,
    name:           req.body.name           || 'Untitled Group',
    description:    req.body.description    || '',
    icon:           req.body.icon           || 'check-square',
    color:          req.body.color          || '#4361EE',
    category:       req.body.category       || 'general',  // general | pre-boarding | onboarding | compliance | offboarding
    applies_to:     req.body.applies_to     || 'people',   // object slug
    // task_definitions: array of task blueprints (same shape as a task, minus id/record_id)
    task_definitions: req.body.task_definitions || [],
    created_by:     req.body.created_by     || 'admin',
    created_at:     now,
    updated_at:     now,
    deleted_at:     null,
  };
  s.task_group_templates.push(tpl);
  saveStore();
  res.status(201).json(tpl);
});

// Update template
router.patch('/templates/:id', (req, res) => {
  const s = getStore(); ensure(s);
  const idx = s.task_group_templates.findIndex(t => t.id === req.params.id && !t.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const allowed = ['name','description','icon','color','category','applies_to','task_definitions'];
  allowed.forEach(k => { if (req.body[k] !== undefined) s.task_group_templates[idx][k] = req.body[k]; });
  s.task_group_templates[idx].updated_at = new Date().toISOString();
  saveStore();
  res.json(s.task_group_templates[idx]);
});

// Delete template
router.delete('/templates/:id', (req, res) => {
  const s = getStore(); ensure(s);
  const idx = s.task_group_templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.task_group_templates[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// ── Assignments (a template assigned to a specific record) ────────────────────

// List assignments for a record
router.get('/assignments', (req, res) => {
  const s = getStore(); ensure(s);
  let asgns = s.task_group_assignments.filter(a => !a.deleted_at);
  if (req.query.record_id)      asgns = asgns.filter(a => a.record_id      === req.query.record_id);
  if (req.query.environment_id) asgns = asgns.filter(a => a.environment_id === req.query.environment_id);
  // Enrich with template info
  const enriched = asgns.map(a => {
    const tpl = (s.task_group_templates || []).find(t => t.id === a.template_id);
    // Compute task progress from the actual spawned tasks
    const tasks = (s.calendar_tasks || []).filter(t => t.group_assignment_id === a.id && !t.deleted_at);
    const done  = tasks.filter(t => t.status === 'done').length;
    return { ...a, template_name: tpl?.name || a.template_name, template_color: tpl?.color || a.template_color,
      template_icon: tpl?.icon || a.template_icon, task_count: tasks.length, tasks_done: done, tasks };
  });
  res.json(enriched);
});

// Assign a template to a record — spawns the actual calendar_tasks
router.post('/assignments', async (req, res) => {
  const s = getStore(); ensure(s);
  const { template_id, record_id, record_name, environment_id, assigned_by, anchor_date, due_offset_anchor } = req.body;
  if (!template_id || !record_id) return res.status(400).json({ error: 'template_id and record_id required' });

  const tpl = s.task_group_templates.find(t => t.id === template_id && !t.deleted_at);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  const now = new Date().toISOString();
  const assignmentId = uuidv4();
  const anchorMs = anchor_date ? new Date(anchor_date).getTime() : Date.now();

  // Create the assignment record
  const assignment = {
    id:             assignmentId,
    template_id,
    template_name:  tpl.name,
    template_color: tpl.color,
    template_icon:  tpl.icon,
    record_id,
    record_name:    record_name || '',
    environment_id: environment_id || tpl.environment_id,
    assigned_by:    assigned_by || 'manual',
    anchor_date:    anchor_date || null,
    status:         'active',
    assigned_at:    now,
    created_at:     now,
    deleted_at:     null,
  };
  s.task_group_assignments.push(assignment);

  // Spawn individual calendar_tasks from the template definitions
  if (!s.calendar_tasks) s.calendar_tasks = [];
  const spawnedTasks = (tpl.task_definitions || []).map((def, idx) => {
    let dueDate = null;
    if (def.due_offset_days != null) {
      const offsetMs = def.due_offset_days * 24 * 60 * 60 * 1000;
      dueDate = new Date(anchorMs + offsetMs).toISOString().slice(0, 10);
    } else if (def.due_date) {
      dueDate = def.due_date;
    }
    const task = {
      id:                 uuidv4(),
      environment_id:     environment_id || tpl.environment_id,
      title:              def.title || `Task ${idx + 1}`,
      description:        def.description || '',
      task_type:          def.task_type || 'other',
      priority:           def.priority || 'medium',
      status:             'todo',
      due_date:           dueDate,
      due_time:           def.due_time || null,
      assignee_id:        def.assignee_id || null,
      record_id,
      record_name:        record_name || '',
      object_id:          def.object_id || null,
      object_name:        def.object_name || null,
      checklist:          JSON.stringify(def.checklist || []),
      tags:               JSON.stringify(def.tags || []),
      estimated_minutes:  def.estimated_minutes || null,
      completed_at:       null,
      completion_type:    def.completion_type || 'checkbox',
      completion_config:  typeof def.completion_config === 'string' ? def.completion_config : JSON.stringify(def.completion_config || {}),
      completion_data:    null,
      task_group_id:      template_id,
      group_assignment_id: assignmentId,
      created_by:         'group_assignment',
      created_at:         now,
      updated_at:         now,
      deleted_at:         null,
    };
    s.calendar_tasks.push(task);
    return task;
  });

  saveStore();
  res.status(201).json({ assignment, spawned_tasks: spawnedTasks.length });
});

// Cancel / delete an assignment
router.delete('/assignments/:id', (req, res) => {
  const s = getStore(); ensure(s);
  const idx = s.task_group_assignments.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.task_group_assignments[idx].deleted_at = new Date().toISOString();
  s.task_group_assignments[idx].status = 'cancelled';
  saveStore();
  res.json({ ok: true });
});

// ── Job-level task configuration ─────────────────────────────────────────────
// A job can have task group templates "attached" to it — meaning when a person is
// linked to that job, those templates should be offered/auto-assigned.
// Stored in job_task_groups: { id, job_id, template_id, auto_assign, environment_id }

function ensureJobTasks(s) {
  if (!s.job_task_groups)   s.job_task_groups   = [];
  if (!s.job_single_tasks)  s.job_single_tasks  = []; // standalone task definitions attached to a job
}

// GET /task-groups/by-job/:jobId — groups + single tasks attached to this job
router.get('/by-job/:jobId', (req, res) => {
  const s = getStore(); ensure(s); ensureJobTasks(s);
  const { jobId } = req.params;

  // Group attachments
  const attachments = (s.job_task_groups || []).filter(a => a.job_id === jobId && !a.deleted_at);
  const enriched = attachments.map(a => {
    const tpl = (s.task_group_templates || []).find(t => t.id === a.template_id);
    return { ...a, template: tpl || null };
  });

  // Single tasks defined on the job
  const singles = (s.job_single_tasks || []).filter(t => t.job_id === jobId && !t.deleted_at);

  res.json({ groups: enriched, singles });
});

// POST /task-groups/by-job/:jobId/groups — attach a template to a job
router.post('/by-job/:jobId/groups', (req, res) => {
  const s = getStore(); ensure(s); ensureJobTasks(s);
  const { jobId } = req.params;
  const { template_id, auto_assign = false, environment_id } = req.body;
  if (!template_id) return res.status(400).json({ error: 'template_id required' });

  // Prevent duplicate
  const exists = (s.job_task_groups || []).find(a => a.job_id === jobId && a.template_id === template_id && !a.deleted_at);
  if (exists) return res.status(409).json({ error: 'Already attached' });

  const tpl = (s.task_group_templates || []).find(t => t.id === template_id && !t.deleted_at);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  const now = new Date().toISOString();
  const entry = {
    id: uuidv4(), job_id: jobId, template_id,
    template_name: tpl.name, template_color: tpl.color, template_icon: tpl.icon,
    auto_assign, environment_id: environment_id || tpl.environment_id,
    created_at: now, deleted_at: null,
  };
  s.job_task_groups.push(entry);
  saveStore();
  res.status(201).json({ ...entry, template: tpl });
});

// DELETE /task-groups/by-job/:jobId/groups/:attachId — detach a template from a job
router.delete('/by-job/:jobId/groups/:attachId', (req, res) => {
  const s = getStore(); ensureJobTasks(s);
  const idx = (s.job_task_groups || []).findIndex(a => a.id === req.params.attachId && a.job_id === req.params.jobId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.job_task_groups[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// POST /task-groups/by-job/:jobId/singles — add a single task definition to a job
router.post('/by-job/:jobId/singles', (req, res) => {
  const s = getStore(); ensure(s); ensureJobTasks(s);
  const { jobId } = req.params;
  const { title, description, task_type, priority, completion_type, completion_config,
    due_offset_days, estimated_minutes, environment_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const now = new Date().toISOString();
  const task = {
    id: uuidv4(), job_id: jobId, title, description: description || '',
    task_type: task_type || 'other', priority: priority || 'medium',
    completion_type: completion_type || 'checkbox',
    completion_config: typeof completion_config === 'string' ? completion_config : JSON.stringify(completion_config || {}),
    due_offset_days: due_offset_days ?? null,
    estimated_minutes: estimated_minutes || null,
    environment_id: environment_id || null,
    created_at: now, deleted_at: null,
  };
  s.job_single_tasks.push(task);
  saveStore();
  res.status(201).json(task);
});

// PATCH /task-groups/by-job/:jobId/singles/:taskId
router.patch('/by-job/:jobId/singles/:taskId', (req, res) => {
  const s = getStore(); ensureJobTasks(s);
  const idx = (s.job_single_tasks || []).findIndex(t => t.id === req.params.taskId && t.job_id === req.params.jobId && !t.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const allowed = ['title','description','task_type','priority','completion_type','completion_config','due_offset_days','estimated_minutes'];
  allowed.forEach(k => { if (req.body[k] !== undefined) s.job_single_tasks[idx][k] = req.body[k]; });
  s.job_single_tasks[idx].updated_at = new Date().toISOString();
  saveStore();
  res.json(s.job_single_tasks[idx]);
});

// DELETE /task-groups/by-job/:jobId/singles/:taskId
router.delete('/by-job/:jobId/singles/:taskId', (req, res) => {
  const s = getStore(); ensureJobTasks(s);
  const idx = (s.job_single_tasks || []).findIndex(t => t.id === req.params.taskId && t.job_id === req.params.jobId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  s.job_single_tasks[idx].deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// POST /task-groups/by-job/:jobId/assign-to-person — assign all job-linked groups+tasks to a person
router.post('/by-job/:jobId/assign-to-person', (req, res) => {
  const s = getStore(); ensure(s); ensureJobTasks(s);
  const { jobId } = req.params;
  const { record_id, record_name, environment_id, anchor_date, assigned_by } = req.body;
  if (!record_id) return res.status(400).json({ error: 'record_id required' });

  const now = new Date().toISOString();
  const anchorMs = anchor_date ? new Date(anchor_date).getTime() : Date.now();
  let totalSpawned = 0;

  // Assign each attached group template
  const attachments = (s.job_task_groups || []).filter(a => a.job_id === jobId && !a.deleted_at);
  for (const att of attachments) {
    const tpl = (s.task_group_templates || []).find(t => t.id === att.template_id && !t.deleted_at);
    if (!tpl) continue;
    const assignmentId = uuidv4();
    s.task_group_assignments.push({
      id: assignmentId, template_id: att.template_id, template_name: tpl.name,
      template_color: tpl.color, template_icon: tpl.icon,
      record_id, record_name: record_name || '', environment_id: environment_id || tpl.environment_id,
      assigned_by: assigned_by || 'job_assignment', anchor_date: anchor_date || null,
      status: 'active', assigned_at: now, created_at: now, deleted_at: null,
    });
    for (const [idx, def] of (tpl.task_definitions || []).entries()) {
      let dueDate = null;
      if (def.due_offset_days != null) dueDate = new Date(anchorMs + def.due_offset_days * 86400000).toISOString().slice(0, 10);
      else if (def.due_date) dueDate = def.due_date;
      s.calendar_tasks.push({
        id: uuidv4(), environment_id: environment_id || tpl.environment_id,
        title: def.title || `Task ${idx + 1}`, description: def.description || '',
        task_type: def.task_type || 'other', priority: def.priority || 'medium',
        status: 'todo', due_date: dueDate, due_time: null,
        assignee_id: null, record_id, record_name: record_name || '',
        object_id: jobId,       // ← links task to the specific job for filtering
        object_name: att.template_name || tpl.name,
        checklist: JSON.stringify(def.checklist || []), tags: '[]',
        estimated_minutes: def.estimated_minutes || null, completed_at: null,
        completion_type: def.completion_type || 'checkbox',
        completion_config: JSON.stringify(def.completion_config || {}),
        completion_data: null, task_group_id: att.template_id,
        group_assignment_id: assignmentId, created_by: 'job_assignment',
        created_at: now, updated_at: now, deleted_at: null,
      });
      totalSpawned++;
    }
  }

  // Assign standalone single tasks
  const singles = (s.job_single_tasks || []).filter(t => t.job_id === jobId && !t.deleted_at);
  for (const def of singles) {
    let dueDate = null;
    if (def.due_offset_days != null) dueDate = new Date(anchorMs + def.due_offset_days * 86400000).toISOString().slice(0, 10);
    s.calendar_tasks.push({
      id: uuidv4(), environment_id: environment_id || def.environment_id,
      title: def.title, description: def.description || '',
      task_type: def.task_type || 'other', priority: def.priority || 'medium',
      status: 'todo', due_date: dueDate, due_time: null,
      assignee_id: null, record_id, record_name: record_name || '',
      object_id: jobId, object_name: def.title,
      checklist: '[]', tags: '[]',
      estimated_minutes: def.estimated_minutes || null, completed_at: null,
      completion_type: def.completion_type || 'checkbox',
      completion_config: def.completion_config || '{}',
      completion_data: null, task_group_id: null,
      group_assignment_id: null, created_by: 'job_assignment',
      created_at: now, updated_at: now, deleted_at: null,
    });
    totalSpawned++;
  }

  saveStore();
  res.status(201).json({ ok: true, spawned: totalSpawned });
});

module.exports = router;
