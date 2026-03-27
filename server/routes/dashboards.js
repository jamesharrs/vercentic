'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, remove, getStore, saveStore } = require('../db/init');
const { attachUser, hasPermission, hasGlobalAction, isSuperAdmin, applyFieldVisibilityBulk } = require('../middleware/rbac');

router.use(attachUser);

// ── Helpers ──────────────────────────────────────────────────────────────────
function canViewDashboard(user, dash) {
  if (!user) return dash.access?.type === 'everyone';
  if (isSuperAdmin(user)) return true;
  if (dash.created_by === user.id) return true;
  const a = dash.access || {};
  if (a.type === 'everyone') return true;
  if (a.type === 'roles' && Array.isArray(a.role_ids)) return a.role_ids.includes(user.role_id);
  if (a.type === 'users' && Array.isArray(a.user_ids)) return a.user_ids.includes(user.id);
  return false;
}

function canEditDashboard(user, dash) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (dash.created_by === user.id) return true;
  const a = dash.access || {};
  if (Array.isArray(a.editor_role_ids) && a.editor_role_ids.includes(user.role_id)) return true;
  if (Array.isArray(a.editor_user_ids) && a.editor_user_ids.includes(user.id)) return true;
  return false;
}

function getOrgSubtree(user) {
  if (!user?.org_unit_id) return null;
  const store = getStore();
  const units = store.org_units || [];
  const subtree = new Set();
  const walk = (id) => {
    subtree.add(id);
    units.filter(u => u.parent_id === id).forEach(u => walk(u.id));
  };
  walk(user.org_unit_id);
  return subtree;
}

// ── Panel data engine (RBAC + org-scoped) ───────────────────────────────────
function fetchPanelData(panel, user, environment_id) {
  const cfg = panel.config || {};
  const store = getStore();

  switch (panel.type) {
    case 'stat': {
      const obj = findOne('object_definitions', o => o.id === cfg.object_id);
      if (!obj) return { value: 0, label: cfg.label || 'Records', trend: 0 };
      if (!hasPermission(user, obj.slug, 'view')) return { error: 'Permission denied', value: '—' };
      const orgSubtree = getOrgSubtree(user);
      let recs = query('records', r =>
        r.object_id === cfg.object_id && r.environment_id === environment_id && !r.deleted_at &&
        (!orgSubtree || orgSubtree.has(r.org_unit_id) || !r.org_unit_id)
      );
      if (cfg.filter_field && cfg.filter_value) {
        recs = recs.filter(r => {
          const v = r.data?.[cfg.filter_field];
          if (Array.isArray(v)) return v.some(i => String(i).toLowerCase() === String(cfg.filter_value).toLowerCase());
          return String(v || '').toLowerCase() === String(cfg.filter_value).toLowerCase();
        });
      }
      const trendDays = cfg.trend_days || 30;
      const now = new Date();
      const cutoff = new Date(now - trendDays * 86400000).toISOString();
      const prevCutoff = new Date(now - trendDays * 2 * 86400000).toISOString();
      const current  = recs.filter(r => r.created_at >= cutoff).length;
      const previous = recs.filter(r => r.created_at >= prevCutoff && r.created_at < cutoff).length;
      const trend = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
      return { value: recs.length, current, previous, trend, label: cfg.label || obj.plural_name };
    }

    case 'chart': {
      const obj = findOne('object_definitions', o => o.id === cfg.object_id);
      if (!obj) return { error: 'Object not found' };
      if (!hasPermission(user, obj.slug, 'view')) return { error: 'Permission denied' };
      const orgSubtree = getOrgSubtree(user);
      let recs = query('records', r =>
        r.object_id === cfg.object_id && r.environment_id === environment_id && !r.deleted_at &&
        (!orgSubtree || orgSubtree.has(r.org_unit_id) || !r.org_unit_id)
      );
      if (cfg.filter_field && cfg.filter_value) {
        recs = recs.filter(r => String(r.data?.[cfg.filter_field] || '').toLowerCase() === String(cfg.filter_value).toLowerCase());
      }
      const groupBy = cfg.group_by_field;
      if (!groupBy) return { error: 'No group_by_field configured' };
      const groups = {};
      recs.forEach(r => {
        const v = r.data?.[groupBy];
        const vals = Array.isArray(v) ? v : [v || 'Unknown'];
        vals.forEach(val => { const key = String(val || 'Unknown'); groups[key] = (groups[key] || 0) + 1; });
      });
      const chartData = Object.entries(groups).sort(([,a],[,b]) => b-a).slice(0, cfg.max_items || 12).map(([name, value]) => ({ name, value }));
      return { chartData, chartType: cfg.chart_type || 'bar', total: recs.length };
    }

    case 'list': {
      const obj = findOne('object_definitions', o => o.id === cfg.object_id);
      if (!obj) return { error: 'Object not found' };
      if (!hasPermission(user, obj.slug, 'view')) return { error: 'Permission denied' };
      const fields = query('fields', f => f.object_id === cfg.object_id && !f.deleted_at);
      const orgSubtree = getOrgSubtree(user);
      let recs = query('records', r =>
        r.object_id === cfg.object_id && r.environment_id === environment_id && !r.deleted_at &&
        (!orgSubtree || orgSubtree.has(r.org_unit_id) || !r.org_unit_id)
      );
      if (Array.isArray(cfg.filters)) {
        cfg.filters.forEach(f => {
          if (!f.field || !f.value) return;
          recs = recs.filter(r => {
            const v = String(r.data?.[f.field] || '').toLowerCase();
            if (f.op === 'contains') return v.includes(String(f.value).toLowerCase());
            if (f.op === 'is_not') return v !== String(f.value).toLowerCase();
            return v === String(f.value).toLowerCase();
          });
        });
      }
      if (cfg.sort_field) {
        recs.sort((a, b) => { const cmp = String(a.data?.[cfg.sort_field]||'').localeCompare(String(b.data?.[cfg.sort_field]||'')); return cfg.sort_dir === 'desc' ? -cmp : cmp; });
      } else { recs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); }
      const limit = cfg.limit || 10;
      const total = recs.length;
      recs = recs.slice(0, limit);
      recs = applyFieldVisibilityBulk(user, recs, cfg.object_id);
      const colIds = Array.isArray(cfg.column_field_ids) && cfg.column_field_ids.length ? cfg.column_field_ids : fields.filter(f => f.show_in_list).slice(0, 5).map(f => f.id);
      const columns = fields.filter(f => colIds.includes(f.id));
      return { records: recs, columns, object: obj, total };
    }

    case 'activity': {
      const actLogs = (store.activity_log || []).filter(a => a.environment_id === environment_id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0, cfg.limit || 8);
      return { items: actLogs };
    }
    case 'text': return { content: cfg.content || '', bg_color: cfg.bg_color };
    case 'saved_report': { const report = findOne('saved_views', v => v.id === cfg.report_id); if (!report) return { error: 'Report not found' }; return { report }; }
    default: return { error: `Unknown panel type: ${panel.type}` };
  }
}

// ── Dashboard CRUD ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  const user = req.currentUser;
  const store = getStore();
  const all = (store.dashboards || [])
    .filter(d => !d.deleted_at && (!environment_id || d.environment_id === environment_id))
    .filter(d => canViewDashboard(user, d))
    .map(d => ({ ...d, panel_count: (store.dashboard_panels || []).filter(p => p.dashboard_id === d.id && !p.deleted_at).length, can_edit: canEditDashboard(user, d) }));
  res.json(all);
});

router.get('/env/:environment_id/default', (req, res) => {
  const user = req.currentUser;
  const { environment_id } = req.params;
  const store = getStore();
  const all = (store.dashboards || []).filter(d => !d.deleted_at && d.environment_id === environment_id);
  let dash = all.find(d => d.is_default && canViewDashboard(user, d));
  if (!dash) dash = all.find(d => canViewDashboard(user, d));
  if (!dash) return res.status(404).json({ error: 'No accessible dashboard found' });
  const panels = query('dashboard_panels', p => p.dashboard_id === dash.id && !p.deleted_at).sort((a,b) => (a.position?.y||0)-(b.position?.y||0)||(a.position?.x||0)-(b.position?.x||0));
  res.json({ ...dash, panels, can_edit: canEditDashboard(user, dash) });
});

router.get('/:id', (req, res) => {
  const user = req.currentUser;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash) return res.status(404).json({ error: 'Not found' });
  if (!canViewDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const panels = query('dashboard_panels', p => p.dashboard_id === dash.id && !p.deleted_at).sort((a,b) => (a.position?.y||0)-(b.position?.y||0)||(a.position?.x||0)-(b.position?.x||0));
  res.json({ ...dash, panels, can_edit: canEditDashboard(user, dash) });
});

router.post('/', (req, res) => {
  const user = req.currentUser;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });
  const { name, description, icon, color, environment_id, access, is_default } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const store = getStore();
  if (!store.dashboards) store.dashboards = [];
  if (is_default) store.dashboards.forEach(d => { if (d.environment_id === environment_id) d.is_default = false; });
  const now = new Date().toISOString();
  const dash = { id: uuidv4(), name, description: description||'', icon: icon||'layout', color: color||'#4f46e5', environment_id: environment_id||'', is_default: Boolean(is_default), created_by: user.id, access: access || { type: 'everyone', role_ids: [], editor_role_ids: [] }, created_at: now, updated_at: now };
  store.dashboards.push(dash);
  saveStore();
  res.status(201).json(dash);
});

router.patch('/:id', (req, res) => {
  const user = req.currentUser;
  const store = getStore();
  if (!store.dashboards) store.dashboards = [];
  const idx = store.dashboards.findIndex(d => d.id === req.params.id && !d.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (!canEditDashboard(user, store.dashboards[idx])) return res.status(403).json({ error: 'Access denied' });
  const { name, description, icon, color, access, is_default } = req.body;
  if (is_default !== undefined) store.dashboards.forEach(d => { if (d.environment_id === store.dashboards[idx].environment_id) d.is_default = false; });
  Object.assign(store.dashboards[idx], { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(icon !== undefined && { icon }), ...(color !== undefined && { color }), ...(access !== undefined && { access }), ...(is_default !== undefined && { is_default: Boolean(is_default) }), updated_at: new Date().toISOString() });
  saveStore();
  res.json(store.dashboards[idx]);
});

router.delete('/:id', (req, res) => {
  const user = req.currentUser;
  const store = getStore();
  const dash = (store.dashboards || []).find(d => d.id === req.params.id && !d.deleted_at);
  if (!dash) return res.status(404).json({ error: 'Not found' });
  if (!canEditDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  dash.deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

// ── Panel CRUD ────────────────────────────────────────────────────────────────
router.get('/:id/panels', (req, res) => {
  const user = req.currentUser;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canViewDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const panels = query('dashboard_panels', p => p.dashboard_id === req.params.id && !p.deleted_at).sort((a,b)=>(a.position?.y||0)-(b.position?.y||0)||(a.position?.x||0)-(b.position?.x||0));
  res.json(panels);
});

router.post('/:id/panels', (req, res) => {
  const user = req.currentUser;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canEditDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const { type, title, position, config } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  const store = getStore();
  if (!store.dashboard_panels) store.dashboard_panels = [];
  const now = new Date().toISOString();
  const panel = { id: uuidv4(), dashboard_id: req.params.id, type, title: title||'', position: position||{ x:0, y:0, w:6, h:4 }, config: config||{}, created_at: now, updated_at: now };
  store.dashboard_panels.push(panel);
  saveStore();
  res.status(201).json(panel);
});

router.patch('/:id/panels/:panelId', (req, res) => {
  const user = req.currentUser;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canEditDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const store = getStore();
  const idx = (store.dashboard_panels||[]).findIndex(p => p.id === req.params.panelId && !p.deleted_at);
  if (idx === -1) return res.status(404).json({ error: 'Panel not found' });
  Object.assign(store.dashboard_panels[idx], { ...req.body, updated_at: new Date().toISOString() });
  saveStore();
  res.json(store.dashboard_panels[idx]);
});

router.delete('/:id/panels/:panelId', (req, res) => {
  const user = req.currentUser;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canEditDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const store = getStore();
  const panel = (store.dashboard_panels||[]).find(p => p.id === req.params.panelId && !p.deleted_at);
  if (!panel) return res.status(404).json({ error: 'Not found' });
  panel.deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true });
});

router.post('/:id/duplicate', (req, res) => {
  const user = req.currentUser;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canViewDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const store = getStore();
  if (!store.dashboards) store.dashboards = [];
  if (!store.dashboard_panels) store.dashboard_panels = [];
  const now = new Date().toISOString();
  const newDash = { ...dash, id: uuidv4(), name: `${dash.name} (copy)`, is_default: false, created_by: user.id, created_at: now, updated_at: now };
  store.dashboards.push(newDash);
  const sourcePanels = store.dashboard_panels.filter(p => p.dashboard_id === dash.id && !p.deleted_at);
  sourcePanels.forEach(p => { store.dashboard_panels.push({ ...p, id: uuidv4(), dashboard_id: newDash.id, created_at: now, updated_at: now }); });
  saveStore();
  res.status(201).json({ ...newDash, panels: sourcePanels.length });
});

// ── Panel data (RBAC-aware) ───────────────────────────────────────────────────
router.get('/:id/panels/:panelId/data', (req, res) => {
  const user = req.currentUser;
  const { environment_id } = req.query;
  const dash = findOne('dashboards', d => d.id === req.params.id && !d.deleted_at);
  if (!dash || !canViewDashboard(user, dash)) return res.status(403).json({ error: 'Access denied' });
  const panel = findOne('dashboard_panels', p => p.id === req.params.panelId && p.dashboard_id === req.params.id && !p.deleted_at);
  if (!panel) return res.status(404).json({ error: 'Panel not found' });
  try {
    const data = fetchPanelData(panel, user, environment_id || dash.environment_id);
    res.json(data);
  } catch (e) {
    console.error('[dashboard panel data]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
