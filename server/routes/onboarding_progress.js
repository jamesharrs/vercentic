// server/routes/onboarding_progress.js
// Onboarding progress tracker — checks real data to auto-detect task completion
// and stores manual task completions in the store.

const express = require('express');
const router  = express.Router();
const { getStore, saveStore, uuidv4 } = require('../db/init');

// ── Task definitions ──────────────────────────────────────────────────────────
const TASK_PHASES = [
  {
    id: 'foundation', label: 'Foundation', color: '#4361EE', icon: 'layers',
    tasks: [
      {
        id: 'company_branding', title: 'Set your company name and branding',
        desc: 'Add your logo, colours, and company name so the platform feels like yours.',
        type: 'auto', navTarget: 'settings', navSection: 'appearance', icon: 'palette',
        check: (store, envId) => {
          const app = (store.appearance || []).find(a => a.environment_id === envId);
          return !!(app && app.company_name && app.company_name.trim());
        },
      },
      {
        id: 'review_data_model', title: 'Review your data model',
        desc: 'Check the default People, Jobs, and Talent Pool fields — add or remove any to match your process.',
        type: 'manual', navTarget: 'settings', navSection: 'data_model', icon: 'database',
      },
      {
        id: 'person_types', title: 'Set up person types',
        desc: 'Define types like Employee, Contractor, and Candidate to unlock conditional fields.',
        type: 'auto', navTarget: 'settings', navSection: 'data_model', icon: 'users',
        check: (store, envId) => {
          const objs = (store.object_definitions || store.objects || [])
            .filter(o => o.environment_id === envId && (o.slug === 'people' || o.name === 'People'));
          return objs.some(o => Array.isArray(o.person_type_options) && o.person_type_options.length > 1);
        },
      },
    ],
  },
  {
    id: 'team', label: 'Team Setup', color: '#7c3aed', icon: 'users',
    tasks: [
      {
        id: 'review_roles', title: 'Review roles and permissions',
        desc: 'Customise what each role can see and do across the platform.',
        type: 'manual', navTarget: 'settings', navSection: 'roles', icon: 'shield',
      },
      {
        id: 'invite_users', title: 'Invite your team',
        desc: 'Add your first recruiters, hiring managers, and admins.',
        type: 'auto', navTarget: 'settings', navSection: 'users', icon: 'user-plus',
        check: (store) => (store.users || []).filter(u => !u.deleted_at).length > 1,
      },
      {
        id: 'org_structure', title: 'Build your org structure',
        desc: 'Create departments or regions and assign people to them.',
        type: 'auto', navTarget: 'org-chart', icon: 'git-branch',
        check: (store, envId) => (store.org_units || []).filter(u => u.environment_id === envId).length > 1,
      },
    ],
  },
  {
    id: 'process', label: 'Process Setup', color: '#0891b2', icon: 'workflow',
    tasks: [
      {
        id: 'create_workflow', title: 'Create a candidate workflow',
        desc: 'Define the stages candidates move through — Applied, Screening, Interview, Offer, Hired.',
        type: 'auto', navTarget: 'settings', navSection: 'workflows', icon: 'git-merge',
        check: (store, envId) => {
          const wfs = (store.workflows || []).filter(w => w.environment_id === envId);
          return wfs.some(w => (w.steps && w.steps.length > 0));
        },
      },
      {
        id: 'interview_types', title: 'Set up interview types',
        desc: 'Create Phone Screen, Video Interview, and Technical Assessment templates.',
        type: 'auto', navTarget: 'interviews', icon: 'calendar',
        check: (store, envId) => (store.interview_types || []).filter(t => t.environment_id === envId).length > 0,
      },
      {
        id: 'create_form', title: 'Build a screening form',
        desc: 'Create a questionnaire or scorecard to collect structured feedback.',
        type: 'auto', navTarget: 'settings', navSection: 'forms', icon: 'clipboard',
        check: (store, envId) => (store.forms || []).filter(f => f.environment_id === envId && !f.deleted_at).length > 0,
      },
    ],
  },
  {
    id: 'golive', label: 'Go Live', color: '#059669', icon: 'zap',
    tasks: [
      {
        id: 'add_job', title: 'Post your first job',
        desc: 'Create an open role and start building your pipeline.',
        type: 'auto', navTargetSlug: 'jobs', icon: 'briefcase',
        check: (store, envId) => {
          const jobObjs = (store.object_definitions || store.objects || [])
            .filter(o => o.environment_id === envId && (o.slug === 'jobs' || o.name === 'Jobs'));
          const ids = jobObjs.map(o => o.id);
          return (store.records || []).filter(r => ids.includes(r.object_id) && r.environment_id === envId && !r.deleted_at).length > 0;
        },
      },
      {
        id: 'add_candidate', title: 'Add your first candidate',
        desc: 'Create a person record manually, import from a CV, or add via the Copilot.',
        type: 'auto', navTargetSlug: 'people', icon: 'user',
        check: (store, envId) => {
          const peopleObjs = (store.object_definitions || store.objects || [])
            .filter(o => o.environment_id === envId && (o.slug === 'people' || o.name === 'People'));
          const ids = peopleObjs.map(o => o.id);
          return (store.records || []).filter(r => ids.includes(r.object_id) && r.environment_id === envId && !r.deleted_at).length > 0;
        },
      },
      {
        id: 'link_candidate', title: 'Link a candidate to a job',
        desc: 'Connect your first candidate to an open role and move them through a stage.',
        type: 'auto', navTargetSlug: 'people', icon: 'link',
        check: (store, envId) => (store.people_links || []).filter(l => l.environment_id === envId).length > 0,
      },
      {
        id: 'schedule_interview', title: 'Schedule your first interview',
        desc: 'Book a call or meeting with a candidate using the Interviews module.',
        type: 'auto', navTarget: 'interviews', icon: 'calendar',
        check: (store, envId) => (store.interviews || []).filter(i => i.environment_id === envId).length > 0,
      },
      {
        id: 'configure_messaging', title: 'Set up email or SMS credentials',
        desc: 'Connect Twilio and SendGrid to send real messages from the platform.',
        type: 'auto', navTarget: 'settings', navSection: 'integrations', icon: 'mail',
        check: () => {
          const sg = process.env.SENDGRID_API_KEY || '';
          const tw = process.env.TWILIO_ACCOUNT_SID || '';
          return (sg && !sg.startsWith('YOUR_')) || (tw && !tw.startsWith('YOUR_'));
        },
      },
    ],
  },
  {
    id: 'advanced', label: 'Advanced', color: '#d97706', icon: 'star',
    tasks: [
      {
        id: 'create_portal', title: 'Launch a career site or portal',
        desc: 'Publish a branded career site, hiring manager portal, or agency view.',
        type: 'auto', navTarget: 'settings', navSection: 'portals', icon: 'monitor',
        check: (store, envId) => (store.portals || []).filter(p => p.environment_id === envId && !p.deleted_at).some(p => p.status === 'live' || p.is_published),
      },
      {
        id: 'doc_extraction', title: 'Enable document extraction',
        desc: 'Configure AI extraction for ID documents, CVs, and Right to Work documents.',
        type: 'manual', navTarget: 'settings', navSection: 'file_types', icon: 'scan',
      },
      {
        id: 'org_relationships', title: 'Map your org chart',
        desc: 'Add reporting relationships so your org chart reflects real structure.',
        type: 'auto', navTarget: 'org-chart', icon: 'git-branch',
        check: (store, envId) => (store.relationships || []).filter(r => r.environment_id === envId).length > 2,
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeProgress(store, envId, manualDone = []) {
  const phases = TASK_PHASES.map(phase => {
    const tasks = phase.tasks.map(task => {
      let done = false;
      if (task.type === 'manual') {
        done = manualDone.includes(task.id);
      } else if (task.type === 'auto' && task.check) {
        try { done = !!task.check(store, envId); } catch (e) { done = false; }
      }
      return {
        id: task.id, title: task.title, desc: task.desc,
        type: task.type, icon: task.icon,
        navTarget: task.navTarget || null,
        navTargetSlug: task.navTargetSlug || null,
        navSection: task.navSection || null,
        done,
      };
    });
    const doneCount = tasks.filter(t => t.done).length;
    return { id: phase.id, label: phase.label, color: phase.color, icon: phase.icon, tasks, doneCount, total: tasks.length };
  });
  const totalDone  = phases.reduce((s, p) => s + p.doneCount, 0);
  const totalTasks = phases.reduce((s, p) => s + p.total, 0);
  return { phases, totalDone, totalTasks, percent: Math.round((totalDone / totalTasks) * 100) };
}

// ── GET /api/onboarding-progress ─────────────────────────────────────────────
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  const rec   = (store.onboarding_progress || []).find(p => p.environment_id === environment_id);
  const result = computeProgress(store, environment_id, rec?.manual_done || []);
  res.json({ ...result, dismissed: rec?.dismissed || false, welcome_shown: rec?.welcome_shown || false });
});

// ── POST /api/onboarding-progress/tick ───────────────────────────────────────
router.post('/tick', (req, res) => {
  const { environment_id, task_id, done } = req.body;
  if (!environment_id || !task_id) return res.status(400).json({ error: 'environment_id, task_id required' });
  const store = getStore();
  if (!store.onboarding_progress) store.onboarding_progress = [];
  let rec = store.onboarding_progress.find(p => p.environment_id === environment_id);
  if (!rec) { rec = { id: uuidv4(), environment_id, manual_done: [], dismissed: false, welcome_shown: false, created_at: new Date().toISOString() }; store.onboarding_progress.push(rec); }
  if (done) { if (!rec.manual_done.includes(task_id)) rec.manual_done.push(task_id); }
  else { rec.manual_done = rec.manual_done.filter(id => id !== task_id); }
  rec.updated_at = new Date().toISOString();
  saveStore();
  const result = computeProgress(store, environment_id, rec.manual_done);
  res.json({ ...result, dismissed: rec.dismissed, welcome_shown: rec.welcome_shown });
});

// ── POST /api/onboarding-progress/dismiss ────────────────────────────────────
router.post('/dismiss', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  if (!store.onboarding_progress) store.onboarding_progress = [];
  let rec = store.onboarding_progress.find(p => p.environment_id === environment_id);
  if (!rec) { rec = { id: uuidv4(), environment_id, manual_done: [], dismissed: true, welcome_shown: true, created_at: new Date().toISOString() }; store.onboarding_progress.push(rec); }
  else { rec.dismissed = true; rec.welcome_shown = true; }
  rec.updated_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// ── POST /api/onboarding-progress/welcome-seen ───────────────────────────────
router.post('/welcome-seen', (req, res) => {
  const { environment_id } = req.body;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  if (!store.onboarding_progress) store.onboarding_progress = [];
  let rec = store.onboarding_progress.find(p => p.environment_id === environment_id);
  if (!rec) { rec = { id: uuidv4(), environment_id, manual_done: [], dismissed: false, welcome_shown: true, created_at: new Date().toISOString() }; store.onboarding_progress.push(rec); }
  else { rec.welcome_shown = true; }
  rec.updated_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

module.exports = router;
