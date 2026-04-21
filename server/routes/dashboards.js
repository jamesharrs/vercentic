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
      const obj = findOne('objects', o => o.id === cfg.object_id) || findOne('object_definitions', o => o.id === cfg.object_id);
      if (!obj) return { value: 0, label: cfg.label || 'Records', trend: 0 };
      if (!hasPermission(user, obj.slug, 'view')) return { error: 'Permission denied', value: '—' };
      const orgSubtree = getOrgSubtree(user);
      let recs = query('records', r =>
        r.object_id === cfg.object_id && r.environment_id === environment_id && !r.deleted_at &&
        (!orgSubtree || orgSubtree.has(r.org_unit_id) || !r.org_unit_id)
      );
      if (cfg.filter_field && cfg.filter_value !== undefined && cfg.filter_value !== '') {
        const fv = String(cfg.filter_value).toLowerCase();
        const op = cfg.filter_op || 'is';
        recs = recs.filter(r => {
          const rv = r.data?.[cfg.filter_field];
          const rvArr = Array.isArray(rv) ? rv.map(x=>String(x).toLowerCase()) : [String(rv||'').toLowerCase()];
          if (op === 'is')          return rvArr.some(v => v === fv);
          if (op === 'is_not')      return rvArr.every(v => v !== fv);
          if (op === 'contains')    return rvArr.some(v => v.includes(fv));
          if (op === 'is_empty')    return !rv || (Array.isArray(rv) && rv.length===0);
          if (op === 'is_not_empty')return !!(rv && (!Array.isArray(rv) || rv.length>0));
          return rvArr.some(v => v === fv);
        });
      }
      const trendDays = cfg.trend_days || 30;
      const now = new Date();
      const cutoff = new Date(now - trendDays * 86400000).toISOString();
      const prevCutoff = new Date(now - trendDays * 2 * 86400000).toISOString();
      const current  = recs.filter(r => r.created_at >= cutoff).length;
      const previous = recs.filter(r => r.created_at >= prevCutoff && r.created_at < cutoff).length;
      const trend = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
      return { value: recs.length, current, previous, trend, label: cfg.label || obj.plural_name,
               object_slug: obj.slug, filter_field: cfg.filter_field||null, filter_value: cfg.filter_value||null };
    }

    case 'chart': {
      const obj = findOne('objects', o => o.id === cfg.object_id) || findOne('object_definitions', o => o.id === cfg.object_id);
      if (!obj) return { error: 'Object not found' };
      if (!hasPermission(user, obj.slug, 'view')) return { error: 'Permission denied' };
      const orgSubtree = getOrgSubtree(user);
      let recs = query('records', r =>
        r.object_id === cfg.object_id && r.environment_id === environment_id && !r.deleted_at &&
        (!orgSubtree || orgSubtree.has(r.org_unit_id) || !r.org_unit_id)
      );
      if (cfg.filter_field && cfg.filter_value !== undefined && cfg.filter_value !== '') {
        const fv = String(cfg.filter_value).toLowerCase();
        const op = cfg.filter_op || 'is';
        recs = recs.filter(r => {
          const rv = r.data?.[cfg.filter_field];
          const rvArr = Array.isArray(rv) ? rv.map(x=>String(x).toLowerCase()) : [String(rv||'').toLowerCase()];
          if (op === 'is')          return rvArr.some(v => v === fv);
          if (op === 'is_not')      return rvArr.every(v => v !== fv);
          if (op === 'contains')    return rvArr.some(v => v.includes(fv));
          if (op === 'not_contains')return rvArr.every(v => !v.includes(fv));
          if (op === 'is_empty')    return !rv || (Array.isArray(rv) && rv.length===0);
          if (op === 'is_not_empty')return !!(rv && (!Array.isArray(rv) || rv.length>0));
          if (op === 'gt')          return parseFloat(rvArr[0]||0) > parseFloat(fv);
          if (op === 'lt')          return parseFloat(rvArr[0]||0) < parseFloat(fv);
          return rvArr.some(v => v === fv);
        });
      }
      const groupBy = cfg.group_by_field;
      if (!groupBy) return { error: 'No group_by_field configured' };
      const groups = {};
      recs.forEach(r => {
        const v = r.data?.[groupBy];
        const vals = Array.isArray(v) ? (v.length ? v : ['Unknown']) : [v || 'Unknown'];
        vals.forEach(val => { const key = String(val || 'Unknown'); groups[key] = (groups[key] || 0) + 1; });
      });
      let chartEntries = Object.entries(groups).sort(([,a],[,b]) => b-a);
      if (cfg.exclude_unknown) chartEntries = chartEntries.filter(([k]) => k.toLowerCase() !== 'unknown' && k !== '');
      const chartData = chartEntries.slice(0, cfg.max_items || 20).map(([name, value]) => ({ name, value }));
      return { chartData, chartType: cfg.chart_type || 'bar', showLegend: !!cfg.show_legend, total: recs.length };
    }

    case 'list': {
      const obj = findOne('objects', o => o.id === cfg.object_id) || findOne('object_definitions', o => o.id === cfg.object_id);
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
    case 'saved_report': {
      const report = findOne('saved_views', v => v.id === cfg.report_id);
      if (!report) return { error: 'Report not found' };
      // Execute the saved report and return live data
      const obj = findOne('objects', o => o.id === report.object_id);
      if (!obj) return { report, chartData: [], error: null }; // return report meta without data
      const fields = query('fields', f => f.object_id === report.object_id && !f.deleted_at);
      let recs = query('records', r =>
        r.object_id === report.object_id && r.environment_id === environment_id && !r.deleted_at
      );
      // Apply saved filters
      if (Array.isArray(report.filters)) {
        report.filters.forEach(f => {
          if (!f.field || !f.op) return;
          recs = recs.filter(r => {
            const v = String(r.data?.[f.field] || '').toLowerCase();
            const fv = String(f.value || '').toLowerCase();
            if (f.op === 'contains') return v.includes(fv);
            if (f.op === 'is_not' || f.op === '!=') return v !== fv;
            if (f.op === 'is_empty') return !v;
            return v === fv;
          });
        });
      }
      // Build chart data if group_by is set
      let chartData = [];
      const grp = report.group_by;
      const activeFormulas = (report.formulas || []).filter(f => f.name && f.expression);
      const chartYKey = report.chart_y || '_count';
      // Simple formula evaluator for server-side use
      const evalFormula = (expr, row) => {
        try {
          const e = (expr||'').trim();
          const nv = k => { const clean=k.replace(/^\{|\}$/g,'').toLowerCase(); const v=row[clean]; return typeof v==='number'?v:parseFloat(v)||0; };
          const m1 = fn => { const m=e.match(new RegExp(`^${fn}\\s*\\(([^)]+)\\)$`,'i')); if(m)return m[1]; const m2=e.match(new RegExp(`^${fn}\\s+(.+)$`,'i')); return m2?m2[1].trim():null; };
          if (/^COUNT\(\)$/i.test(e)) return 1;
          const avgF=m1('AVG'); if(avgF!==null)return nv(avgF);
          const sumF=m1('SUM'); if(sumF!==null)return nv(sumF);
          const maxF=m1('MAX'); if(maxF!==null)return nv(maxF);
          const minF=m1('MIN'); if(minF!==null)return nv(minF);
          return null;
        } catch { return null; }
      };
      if (grp) {
        // Group records and aggregate count + formula columns
        const groups = {};
        recs.forEach(r => {
          const v = r.data?.[grp];
          const vals = Array.isArray(v) ? v : [String(v || 'Unknown')];
          vals.forEach(val => {
            const key = String(val || 'Unknown');
            if (!groups[key]) groups[key] = { _count: 0, _sums: {}, _counts: {} };
            groups[key]._count++;
            // Accumulate formula values
            activeFormulas.forEach(f => {
              const fval = evalFormula(f.expression, r.data || {});
              if (fval !== null && fval !== 0 && !isNaN(fval)) {
                groups[key]._sums[f.name] = (groups[key]._sums[f.name] || 0) + fval;
                groups[key]._counts[f.name] = (groups[key]._counts[f.name] || 0) + 1;
              }
            });
          });
        });
        chartData = Object.entries(groups).sort(([,a],[,b])=>b._count-a._count).slice(0,20).map(([name, g]) => {
          const row = { name, _count: g._count, [report.chart_x||'name']: name };
          // Compute formula averages per group
          activeFormulas.forEach(f => {
            const expr = f.expression.trim().toUpperCase();
            if (expr.startsWith('SUM(') || expr.startsWith('SUM ') || expr.startsWith('COUNT(')) {
              row[f.name] = parseFloat((g._sums[f.name] || 0).toFixed(2));
            } else {
              row[f.name] = g._counts[f.name] ? parseFloat((g._sums[f.name] / g._counts[f.name]).toFixed(2)) : 0;
            }
          });
          // If chart_y is a formula name, that key is already set; otherwise fall back to count
          if (!activeFormulas.some(f => f.name === chartYKey)) row[chartYKey] = g._count;
          return row;
        });
      }
      // Return data based on display_mode
      const displayMode = cfg.display_mode || 'both';
      const columns = fields.filter(f => (report.columns||[]).includes(f.id) || f.show_in_list).slice(0,6);
      const records = displayMode !== 'chart'
        ? recs.slice(0, cfg.limit || 10).map(r => ({ id:r.id, object_id:r.object_id, data:r.data||{} }))
        : [];
      const retChartData = displayMode !== 'table' ? chartData : [];
      return {
        report,
        chartData: retChartData,
        chartType: report.chart_type || 'bar',
        chartX: report.chart_x || (grp || '_group'),
        chartY: report.chart_y || '_count',
        records,
        columns,
        total: recs.length,
        object: obj,
        displayMode,
      };
    }
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
