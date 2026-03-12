import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = '/api';
const ACCENT = '#4361EE';
const LIGHT  = '#EEF2FF';
const DARK   = '#0F1729';
const MID    = '#4B5675';
const MUTED  = '#9DA8C7';
const BORDER = '#E8ECF8';

const FORMULA_HELP = [
  { fn: 'SUM(field)',     desc: 'Sum numeric values' },
  { fn: 'AVG(field)',     desc: 'Average of field' },
  { fn: 'COUNT()',        desc: 'Number of rows' },
  { fn: 'MAX(field)',     desc: 'Maximum value' },
  { fn: 'MIN(field)',     desc: 'Minimum value' },
  { fn: 'IF(field=val,a,b)', desc: 'Conditional value' },
  { fn: 'CONCAT(a,b)',    desc: 'Join text fields' },
  { fn: 'UPPER(field)',   desc: 'Uppercase string' },
  { fn: 'LOWER(field)',   desc: 'Lowercase string' },
  { fn: 'LEN(field)',     desc: 'Length of string' },
  { fn: 'ROUND(field,2)', desc: 'Round to N decimals' },
  { fn: 'DIFF(f1,f2)',    desc: 'f1 minus f2' },
];

const OPS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'empty', label: 'is empty' },
  { value: 'notempty', label: 'not empty' },
];

// Example templates — objectSlug resolved to real ID at runtime
const EXAMPLE_TEMPLATES = [
  {
    name: 'Candidates by Status',
    description: 'Count of people grouped by their current status',
    icon: '👥',
    objectSlug: 'people',
    columns: ['first_name', 'last_name', 'status', 'source'],
    filters: [],
    groupBy: 'status',
    sortBy: '_count',
    sortDir: 'desc',
    formulas: [{ label: 'Total', expr: 'COUNT()' }],
    view: 'bar',
    chartX: 'status',
    chartY: '_count',
  },
  {
    name: 'Candidates by Source',
    description: 'Where are candidates coming from?',
    icon: '📊',
    objectSlug: 'people',
    columns: ['first_name', 'last_name', 'source', 'status'],
    filters: [],
    groupBy: 'source',
    sortBy: '_count',
    sortDir: 'desc',
    formulas: [],
    view: 'pie',
    chartX: 'source',
    chartY: '_count',
  },
  {
    name: 'Active Candidates',
    description: 'All people with Active or Passive status',
    icon: '✅',
    objectSlug: 'people',
    columns: ['first_name', 'last_name', 'current_title', 'current_company', 'status', 'source', 'location'],
    filters: [{ field: 'status', op: 'neq', value: 'Archived' }],
    groupBy: '',
    sortBy: 'last_name',
    sortDir: 'asc',
    formulas: [],
    view: 'table',
    chartX: '',
    chartY: '',
  },
  {
    name: 'Jobs by Department',
    description: 'Headcount of open roles per department',
    icon: '💼',
    objectSlug: 'jobs',
    columns: ['job_title', 'department', 'status', 'priority', 'work_type'],
    filters: [{ field: 'status', op: 'eq', value: 'Open' }],
    groupBy: 'department',
    sortBy: '_count',
    sortDir: 'desc',
    formulas: [],
    view: 'bar',
    chartX: 'department',
    chartY: '_count',
  },
  {
    name: 'Jobs Pipeline Overview',
    description: 'All jobs with salary range and status',
    icon: '📋',
    objectSlug: 'jobs',
    columns: ['job_title', 'department', 'location', 'status', 'priority', 'salary_min', 'salary_max'],
    filters: [],
    groupBy: '',
    sortBy: 'department',
    sortDir: 'asc',
    formulas: [{ label: 'Salary Range', expr: 'DIFF(salary_max,salary_min)' }],
    view: 'table',
    chartX: '',
    chartY: '',
  },
  {
    name: 'High Priority Open Roles',
    description: 'Critical and High priority jobs that are open',
    icon: '🚨',
    objectSlug: 'jobs',
    columns: ['job_title', 'department', 'priority', 'hiring_manager', 'location', 'work_type'],
    filters: [
      { field: 'status', op: 'eq', value: 'Open' },
      { field: 'priority', op: 'contains', value: 'High' },
    ],
    groupBy: '',
    sortBy: 'priority',
    sortDir: 'asc',
    formulas: [],
    view: 'table',
    chartX: '',
    chartY: '',
  },
  {
    name: 'Remote vs On-site Jobs',
    description: 'Breakdown of jobs by work type',
    icon: '🏠',
    objectSlug: 'jobs',
    columns: ['job_title', 'work_type', 'department', 'status'],
    filters: [],
    groupBy: 'work_type',
    sortBy: '_count',
    sortDir: 'desc',
    formulas: [],
    view: 'pie',
    chartX: 'work_type',
    chartY: '_count',
  },
  {
    name: 'Talent Pool Summary',
    description: 'Overview of all talent pools by category and status',
    icon: '🌊',
    objectSlug: 'talent-pools',
    columns: ['pool_name', 'category', 'status', 'owner'],
    filters: [{ field: 'status', op: 'eq', value: 'Active' }],
    groupBy: 'category',
    sortBy: '_count',
    sortDir: 'desc',
    formulas: [],
    view: 'bar',
    chartX: 'category',
    chartY: '_count',
  },
];

function evalFormula(expr, row, rows) {
  try {
    const e = expr.trim();
    const m = (fn, re) => { const x = e.match(re); return x ? x : null; };

    if (e.startsWith('COUNT()')) return rows.length;

    let x;
    x = m('SUM', /^SUM\((\w+)\)$/i);
    if (x) return rows.reduce((a,r) => a + (Number(r[x[1]]) || 0), 0);

    x = m('AVG', /^AVG\((\w+)\)$/i);
    if (x) { const nums = rows.map(r => Number(r[x[1]])).filter(n => !isNaN(n)); return nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2) : 0; }

    x = m('MAX', /^MAX\((\w+)\)$/i);
    if (x) return Math.max(...rows.map(r => Number(r[x[1]])).filter(n=>!isNaN(n)));

    x = m('MIN', /^MIN\((\w+)\)$/i);
    if (x) return Math.min(...rows.map(r => Number(r[x[1]])).filter(n=>!isNaN(n)));

    x = m('LEN', /^LEN\((\w+)\)$/i);
    if (x) return String(row[x[1]] || '').length;

    x = m('UPPER', /^UPPER\((\w+)\)$/i);
    if (x) return String(row[x[1]] || '').toUpperCase();

    x = m('LOWER', /^LOWER\((\w+)\)$/i);
    if (x) return String(row[x[1]] || '').toLowerCase();

    x = m('ROUND', /^ROUND\((\w+),(\d+)\)$/i);
    if (x) return Number(Number(row[x[1]]).toFixed(Number(x[2])));

    x = m('DIFF', /^DIFF\((\w+),(\w+)\)$/i);
    if (x) return (Number(row[x[1]]) || 0) - (Number(row[x[2]]) || 0);

    x = m('CONCAT', /^CONCAT\((\w+),(\w+)\)$/i);
    if (x) return String(row[x[1]] || '') + String(row[x[2]] || '');

    x = m('IF', /^IF\((\w+)(=|!=|>|<)(.+?),(.+?),(.+?)\)$/i);
    if (x) {
      const [,field,op,cmp,ifTrue,ifFalse] = x;
      const v = String(row[field] || '');
      let cond = false;
      if (op === '=')  cond = v === cmp;
      if (op === '!=') cond = v !== cmp;
      if (op === '>')  cond = Number(v) > Number(cmp);
      if (op === '<')  cond = Number(v) < Number(cmp);
      return cond ? ifTrue : ifFalse;
    }
    // Field reference
    if (/^\w+$/.test(e)) return row[e] ?? '';
    return expr;
  } catch { return '#ERR'; }
}

const CHART_COLORS = ['#4361EE','#7B2FBE','#0CAF77','#F59E0B','#EF4444','#06B6D4','#EC4899','#84CC16'];

export default function Reports({ envId, initialReport }) {
  const [objects, setObjects] = useState([]);
  const [fields, setFields]   = useState([]);
  const [saved, setSaved]     = useState([]);
  const skipReset = useRef(false); // true when loading template/report — suppresses field-change reset

  // Builder state
  const [selObject, setSelObject] = useState('');
  const [selCols, setSelCols]     = useState([]);
  const [filters, setFilters]     = useState([]);
  const [groupBy, setGroupBy]     = useState('');
  const [sortBy, setSortBy]       = useState('');
  const [sortDir, setSortDir]     = useState('asc');
  const [formulas, setFormulas]   = useState([]); // {label, expr}
  const [reportName, setReportName] = useState('New Report');

  // Results
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]         = useState(false);

  // View
  const [view, setView]       = useState('table'); // table | bar | line | pie
  const [chartX, setChartX]   = useState('');
  const [chartY, setChartY]   = useState('');
  const [panel, setPanel]     = useState('builder'); // builder | saved | formula | templates
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!envId) return;
    fetch(`${API}/objects?environment_id=${envId}`).then(r=>r.json()).then(d=>setObjects(Array.isArray(d)?d:[])).catch(()=>{});
    fetch(`${API}/reports/${envId}`).then(r=>r.json()).then(setSaved).catch(()=>{});
  }, [envId]);

  // Auto-load when a report preset arrives (e.g. from dashboard card)
  useEffect(() => {
    if (!initialReport || objects.length === 0) return;
    const obj = objects.find(o => o.id === initialReport.objectId || o.slug === initialReport.objectSlug);
    if (!obj) return;
    skipReset.current = true;
    setReportName(initialReport.name || "Dashboard Report");
    setSelObject(obj.id);
    setSelCols(initialReport.columns || []);
    setFilters(initialReport.filters || []);
    setGroupBy(initialReport.groupBy || "");
    setSortBy(initialReport.sortBy || "_count");
    setSortDir(initialReport.sortDir || "desc");
    setFormulas(initialReport.formulas || []);
    setView(initialReport.view || "bar");
    setChartX(initialReport.chartX || initialReport.groupBy || "");
    setChartY(initialReport.chartY || "_count");
    // If the preset ships with formulas, land on the formula panel so they're immediately visible
    setPanel(initialReport.formulas?.length ? "formula" : "builder");
    setRan(false);
    setRows([]);
  }, [initialReport, objects]);

  useEffect(() => {
    if (!selObject || !envId) { setFields([]); return; }
    fetch(`${API}/fields?object_id=${selObject}`).then(r=>r.json()).then(d=>{
      setFields(Array.isArray(d)?d:[]);
      // Auto-run if we were pre-loaded from a dashboard preset
      if (skipReset.current) { skipReset.current = false; setTimeout(()=>run(), 50); return; }
    }).catch(()=>{});
    if (skipReset.current) return; // run() called above after fields load
    setSelCols([]); setGroupBy(''); setSortBy(''); setFilters([]); setFormulas([]); setRan(false); setRows([]);
  }, [selObject, envId]);

  const run = useCallback(async () => {
    if (!selObject) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/${envId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId: selObject, columns: selCols, filters, groupBy, sortBy, sortDir }),
      });
      const data = await res.json();
      // Apply client-side formula columns
      const enriched = data.rows.map(row => {
        const r = { ...row };
        formulas.forEach(f => { r['__' + f.label] = evalFormula(f.expr, row, data.rows); });
        return r;
      });
      setRows(enriched); setTotal(data.total); setRan(true);
      if (!chartX && enriched.length > 0) {
        const keys = Object.keys(enriched[0]).filter(k => !k.startsWith('_'));
        setChartX(keys[0] || '');
        setChartY(keys[1] || '');
      }
    } finally { setLoading(false); }
  }, [selObject, selCols, filters, groupBy, sortBy, sortDir, formulas, envId, chartX]);

  const saveReport = async () => {
    const body = { name: reportName, objectId: selObject, columns: selCols, filters, groupBy, sortBy, sortDir, formulas, view, chartX, chartY };
    const res = await fetch(`${API}/reports/${envId}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const saved2 = await res.json();
    setSaved(p => [...p, saved2]);
  };

  const loadReport = r => {
    skipReset.current = true;
    setReportName(r.name); setSelObject(r.objectId); setSelCols(r.columns || []);
    setFilters(r.filters || []); setGroupBy(r.groupBy || ''); setSortBy(r.sortBy || '');
    setSortDir(r.sortDir || 'asc'); setFormulas(r.formulas || []);
    setView(r.view || 'table'); setChartX(r.chartX || ''); setChartY(r.chartY || '');
    setPanel('builder'); setRan(false); setRows([]);
  };

  const loadTemplate = tmpl => {
    // Resolve objectSlug to real objectId
    const obj = objects.find(o => o.slug === tmpl.objectSlug);
    if (!obj) return;
    skipReset.current = true;
    setReportName(tmpl.name);
    setSelObject(obj.id);
    setSelCols(tmpl.columns || []);
    setFilters(tmpl.filters || []);
    setGroupBy(tmpl.groupBy || '');
    setSortBy(tmpl.sortBy || '');
    setSortDir(tmpl.sortDir || 'asc');
    setFormulas(tmpl.formulas || []);
    setView(tmpl.view || 'table');
    setChartX(tmpl.chartX || '');
    setChartY(tmpl.chartY || '');
    setPanel('builder');
    setRan(false);
    setRows([]);
  };

  const copyReport = async r => {
    const copy = { ...r, name: r.name + ' (copy)', id: undefined, createdAt: undefined };
    delete copy.id; delete copy.createdAt;
    const res = await fetch(`${API}/reports/${envId}`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(copy)
    });
    const saved2 = await res.json();
    setSaved(p => [...p, saved2]);
  };

  const deleteReport = async id => {
    await fetch(`${API}/reports/${envId}/${id}`, { method: 'DELETE' });
    setSaved(p => p.filter(r => r.id !== id));
  };

  const toggleCol = f => setSelCols(p => p.includes(f) ? p.filter(x=>x!==f) : [...p, f]);

  const addFilter = () => setFilters(p => [...p, { field: fields[0]?.name || '', op: 'eq', value: '' }]);
  const updateFilter = (i, k, v) => setFilters(p => p.map((f,j) => j===i ? {...f,[k]:v} : f));
  const removeFilter = i => setFilters(p => p.filter((_,j) => j!==i));

  const addFormula = () => setFormulas(p => [...p, { label: 'col' + (p.length+1), expr: 'COUNT()' }]);
  const updateFormula = (i,k,v) => setFormulas(p => p.map((f,j) => j===i ? {...f,[k]:v} : f));
  const removeFormula = i => setFormulas(p => p.filter((_,j) => j!==i));

  const displayCols = rows.length > 0 ? Object.keys(rows[0]).filter(k => !k.startsWith('_') || k.startsWith('__')).map(k => k.startsWith('__') ? k.slice(2) : k) : [];
  const rawCols     = rows.length > 0 ? Object.keys(rows[0]) : [];

  const card = '#FFFFFF';
  const S = {
    wrap:   { display:'flex', height:'100%', background:'var(--t-bg, #EEF2FF)', fontFamily:'var(--t-font, DM Sans, sans-serif)', overflow:'hidden' },
    side:   { width:280, background:card, borderRight:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' },
    main:   { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar: { padding:'12px 20px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:10, background:card, flexWrap:'wrap' },
    results:{ flex:1, overflow:'auto', padding:20 },
    btn:    { padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' },
    input:  { padding:'6px 10px', borderRadius:7, border:`1px solid ${BORDER}`, fontSize:13, fontFamily:'inherit', color:DARK, outline:'none', background:'#fff' },
    label:  { fontSize:11, fontWeight:700, color:MUTED, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4, display:'block' },
    section:{ padding:'14px 16px', borderBottom:`1px solid ${BORDER}` },
    tag:    { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, fontSize:12, fontWeight:600, background:LIGHT, color:ACCENT, border:`1px solid ${BORDER}` },
  };

  return (
    <div style={S.wrap}>
      {/* ── SIDEBAR ── */}
      <div style={S.side}>
        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${BORDER}`, flexWrap:'wrap' }}>
          {['builder','templates','saved','formula'].map(p => (
            <button key={p} onClick={() => setPanel(p)} style={{ flex:1, padding:'9px 4px', border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
              background: panel===p ? LIGHT : 'transparent', color: panel===p ? ACCENT : MID, letterSpacing:'0.04em', textTransform:'uppercase', fontFamily:'inherit', minWidth:50,
              position:'relative' }}>
              {p==='builder' ? 'Build' : p==='templates' ? 'Templates' : p==='saved' ? 'Saved' : '∑ Formulas'}
              {p==='formula' && formulas.length > 0 && (
                <span style={{ position:'absolute', top:4, right:4, width:6, height:6, borderRadius:'50%', background:ACCENT }}/>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflow:'auto' }}>
          {panel === 'builder' && (
            <>
              {/* Object selector */}
              <div style={S.section}>
                <label style={S.label}>Data Source</label>
                <select value={selObject} onChange={e => setSelObject(e.target.value)}
                  style={{ ...S.input, width:'100%' }}>
                  <option value=''>— select object —</option>
                  {objects.map(o => <option key={o.id} value={o.id}>{o.plural_name || o.name}</option>)}
                </select>
              </div>

              {/* Columns */}
              {fields.length > 0 && (
                <div style={S.section}>
                  <label style={S.label}>Columns</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {fields.map(f => {
                      const on = selCols.includes(f.name) || selCols.length === 0;
                      return (
                        <button key={f.id} onClick={() => toggleCol(f.name)}
                          style={{ ...S.tag, background: selCols.includes(f.name) || selCols.length===0 ? LIGHT : '#F4F6FD',
                            color: selCols.includes(f.name) || selCols.length===0 ? ACCENT : MUTED,
                            border: `1px solid ${selCols.includes(f.name) ? ACCENT : BORDER}`, cursor:'pointer' }}>
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:6, display:'flex', gap:6 }}>
                    <button onClick={() => setSelCols(fields.map(f=>f.name))} style={{ ...S.btn, background:LIGHT, color:ACCENT, padding:'4px 10px', fontSize:11 }}>All</button>
                    <button onClick={() => setSelCols([])} style={{ ...S.btn, background:'#F4F6FD', color:MID, padding:'4px 10px', fontSize:11 }}>Clear</button>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div style={S.section}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ ...S.label, marginBottom:0 }}>Filters</label>
                  <button onClick={addFilter} style={{ ...S.btn, background:LIGHT, color:ACCENT, padding:'3px 8px', fontSize:11 }}>+ Add</button>
                </div>
                {filters.map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:4, marginBottom:4, alignItems:'center' }}>
                    <select value={f.field} onChange={e => updateFilter(i,'field',e.target.value)} style={{ ...S.input, flex:1, padding:'4px 6px', fontSize:12 }}>
                      {fields.map(fl => <option key={fl.id} value={fl.name}>{fl.name}</option>)}
                    </select>
                    <select value={f.op} onChange={e => updateFilter(i,'op',e.target.value)} style={{ ...S.input, width:70, padding:'4px 4px', fontSize:12 }}>
                      {OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {!['empty','notempty'].includes(f.op) && (
                      <input value={f.value} onChange={e => updateFilter(i,'value',e.target.value)} placeholder='value' style={{ ...S.input, width:60, padding:'4px 6px', fontSize:12 }} />
                    )}
                    <button onClick={() => removeFilter(i)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:14, padding:'0 2px' }}>×</button>
                  </div>
                ))}
              </div>

              {/* Group & Sort */}
              <div style={S.section}>
                <label style={S.label}>Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ ...S.input, width:'100%', marginBottom:10 }}>
                  <option value=''>— none —</option>
                  {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <label style={S.label}>Sort By</label>
                <div style={{ display:'flex', gap:6 }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...S.input, flex:1 }}>
                    <option value=''>— none —</option>
                    {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                  <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ ...S.input, width:60 }}>
                    <option value='asc'>↑ ASC</option>
                    <option value='desc'>↓ DESC</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {panel === 'templates' && (
            <div style={S.section}>
              <p style={{ fontSize:12, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
                Click a template to load it into the builder, then customise and save.
              </p>
              {EXAMPLE_TEMPLATES.map((tmpl, i) => {
                const objExists = objects.some(o => o.slug === tmpl.objectSlug);
                return (
                  <div key={i} style={{ background: objExists ? '#F8F9FF' : '#FAFAFA', borderRadius:10, padding:'10px 12px', marginBottom:8,
                    border:`1px solid ${objExists ? BORDER : '#E0E0E0'}`, opacity: objExists ? 1 : 0.5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:18 }}>{tmpl.icon}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:DARK }}>{tmpl.name}</span>
                    </div>
                    <div style={{ fontSize:11, color:MUTED, marginBottom:8, lineHeight:1.4 }}>{tmpl.description}</div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:10, background:'#EEF2FF', color:ACCENT, fontWeight:600 }}>
                        {tmpl.objectSlug}
                      </span>
                      {tmpl.groupBy && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:10, background:'#F0FDF4', color:'#0CAF77', fontWeight:600 }}>grouped</span>}
                      {tmpl.formulas.length > 0 && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:10, background:'#FFF7ED', color:'#D97706', fontWeight:600 }}>formula</span>}
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:10, background:'#F4F6FD', color:MID, fontWeight:600 }}>
                        {tmpl.view} view
                      </span>
                    </div>
                    {objExists ? (
                      <button onClick={() => loadTemplate(tmpl)}
                        style={{ ...S.btn, background:LIGHT, color:ACCENT, padding:'4px 10px', fontSize:11, width:'100%' }}>
                        Use Template →
                      </button>
                    ) : (
                      <div style={{ fontSize:11, color:'#EF4444' }}>Object "{tmpl.objectSlug}" not found</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {panel === 'saved' && (            <div style={S.section}>
              {saved.length === 0 && <p style={{ color:MUTED, fontSize:13 }}>No saved reports yet.</p>}
              {saved.map(r => (
                <div key={r.id} style={{ background:'#F8F9FF', borderRadius:10, padding:'10px 12px', marginBottom:8, border:`1px solid ${BORDER}` }}>
                  <div style={{ fontWeight:700, fontSize:13, color:DARK, marginBottom:4 }}>{r.name}</div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:8 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => loadReport(r)} style={{ ...S.btn, background:LIGHT, color:ACCENT, padding:'4px 10px', fontSize:11 }}>Load</button>
                    <button onClick={() => copyReport(r)} style={{ ...S.btn, background:'#F0FDF4', color:'#0CAF77', padding:'4px 10px', fontSize:11 }}>Copy</button>
                    <button onClick={() => deleteReport(r.id)} style={{ ...S.btn, background:'#FEE2E2', color:'#EF4444', padding:'4px 10px', fontSize:11 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {panel === 'formula' && (
            <div style={S.section}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ ...S.label, marginBottom:0 }}>Calculated Columns</label>
                <button onClick={addFormula} style={{ ...S.btn, background:LIGHT, color:ACCENT, padding:'3px 8px', fontSize:11 }}>+ Add</button>
              </div>
              {formulas.map((f, i) => (
                <div key={i} style={{ background:'#F8F9FF', borderRadius:8, padding:10, marginBottom:8, border:`1px solid ${BORDER}` }}>
                  <input value={f.label} onChange={e => updateFormula(i,'label',e.target.value)}
                    placeholder='Column name' style={{ ...S.input, width:'100%', marginBottom:6, fontSize:12 }} />
                  <input value={f.expr} onChange={e => updateFormula(i,'expr',e.target.value)}
                    placeholder='e.g. SUM(salary)' style={{ ...S.input, width:'100%', fontSize:12, fontFamily:'monospace' }} />
                  <button onClick={() => removeFormula(i)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:11, marginTop:4 }}>Remove</button>
                </div>
              ))}
              <button onClick={() => setShowHelp(p=>!p)} style={{ ...S.btn, background:'#F4F6FD', color:MID, padding:'5px 10px', fontSize:11, marginTop:4 }}>
                {showHelp ? '▲ Hide' : '▼ Show'} formula help
              </button>
              {showHelp && (
                <div style={{ marginTop:10, background:'#F8F9FF', borderRadius:8, padding:10, fontSize:11 }}>
                  {FORMULA_HELP.map(h => (
                    <div key={h.fn} style={{ marginBottom:6 }}>
                      <code style={{ color:ACCENT, fontWeight:700 }}>{h.fn}</code>
                      <span style={{ color:MID, marginLeft:6 }}>{h.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={S.main}>
        {/* Top bar */}
        <div style={S.topbar}>
          {initialReport && (
            <button onClick={() => window.dispatchEvent(new CustomEvent("talentos:navigate", { detail: "dashboard" }))}
              style={{...S.btn, background:"transparent", color:MID, padding:"6px 10px", fontSize:12, display:"flex", alignItems:"center", gap:5, border:`1px solid ${BORDER}`}}>
              ← Dashboard
            </button>
          )}
          <input value={reportName} onChange={e => setReportName(e.target.value)}
            style={{ ...S.input, fontWeight:700, fontSize:15, color:DARK, border:'none', background:'transparent', width:200, padding:'4px 0' }} />
          <div style={{ flex:1 }} />

          {/* Chart type */}
          {ran && ['table','bar','line','pie'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ ...S.btn, background: view===v ? ACCENT : LIGHT, color: view===v ? '#fff' : ACCENT, padding:'6px 12px', fontSize:12 }}>
              {v==='table'?'⊞ Table':v==='bar'?'▮ Bar':v==='line'?'⟋ Line':'◉ Pie'}
            </button>
          ))}

          {ran && view !== 'table' && (
            <>
              <select value={chartX} onChange={e => setChartX(e.target.value)} style={{ ...S.input, fontSize:12 }}>
                {rawCols.map(c => <option key={c} value={c}>{c.startsWith('__') ? c.slice(2) : c}</option>)}
              </select>
              <span style={{ color:MUTED, fontSize:12 }}>vs</span>
              <select value={chartY} onChange={e => setChartY(e.target.value)} style={{ ...S.input, fontSize:12 }}>
                {rawCols.map(c => <option key={c} value={c}>{c.startsWith('__') ? c.slice(2) : c}</option>)}
              </select>
            </>
          )}

          <button onClick={run} disabled={!selObject || loading}
            style={{ ...S.btn, background: selObject ? ACCENT : '#C7D2FE', color:'#fff', padding:'7px 20px' }}>
            {loading ? '…' : '▶ Run'}
          </button>
          <button onClick={saveReport} disabled={!ran}
            style={{ ...S.btn, background: ran ? '#0CAF77' : '#D1FAE5', color: ran ? '#fff' : '#6EE7B7', padding:'7px 16px' }}>
            💾 Save
          </button>
        </div>

        {/* Results area */}
        <div style={S.results}>
          {!ran && !loading && (
            <div style={{ textAlign:'center', paddingTop:80, color:MUTED }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
              <div style={{ fontSize:16, fontWeight:700, color:MID, marginBottom:8 }}>Build your report</div>
              <div style={{ fontSize:13 }}>Select a data source and columns, then click Run</div>
            </div>
          )}
          {loading && (
            <div style={{ textAlign:'center', paddingTop:80, color:MUTED }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
              <div style={{ fontSize:14 }}>Running query…</div>
            </div>
          )}

          {ran && !loading && rows.length === 0 && (
            <div style={{ textAlign:'center', paddingTop:60, color:MUTED, fontSize:14 }}>No rows matched your filters.</div>
          )}

          {ran && !loading && rows.length > 0 && (
            <>
              {/* Meta */}
              <div style={{ display:'flex', gap:16, marginBottom:16, alignItems:'center' }}>
                <span style={{ ...S.tag }}>{total.toLocaleString()} rows</span>
                {total > rows.length && <span style={{ ...S.tag, background:'#FEF3C7', color:'#D97706', border:'1px solid #FDE68A' }}>Showing first {rows.length.toLocaleString()}</span>}
                {formulas.length > 0 && <span style={{ ...S.tag, background:'#F0FDF4', color:'#0CAF77', border:'1px solid #BBF7D0' }}>{formulas.length} formula col{formulas.length>1?'s':''}</span>}
              </div>

              {view === 'table' && <TableView rows={rows} rawCols={rawCols} displayCols={displayCols} />}
              {view === 'bar'   && <ChartView type='bar'  rows={rows} x={chartX} y={chartY} />}
              {view === 'line'  && <ChartView type='line' rows={rows} x={chartX} y={chartY} />}
              {view === 'pie'   && <ChartView type='pie'  rows={rows} x={chartX} y={chartY} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TableView({ rows, rawCols, displayCols }) {
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PAGE = 50;

  const toggle = col => { if (sortCol === col) setSortAsc(p=>!p); else { setSortCol(col); setSortAsc(true); } };

  let filtered = rows;
  if (search) filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())));
  if (sortCol) filtered = [...filtered].sort((a,b) => {
    const va = a[sortCol], vb = b[sortCol];
    const na = Number(va), nb = Number(vb);
    if (!isNaN(na)&&!isNaN(nb)) return sortAsc ? na-nb : nb-na;
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  const paged  = filtered.slice(page*PAGE, (page+1)*PAGE);
  const pages  = Math.ceil(filtered.length/PAGE);

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center' }}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder='Search results…'
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid #E8ECF8`, fontSize:13, fontFamily:'inherit', width:220 }} />
        <span style={{ fontSize:12, color:'#9DA8C7' }}>{filtered.length} rows</span>
      </div>
      <div style={{ overflowX:'auto', borderRadius:12, border:`1px solid #E8ECF8`, background:'#fff' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#F4F6FD' }}>
              {rawCols.map((col, i) => (
                <th key={col} onClick={() => toggle(col)}
                  style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:DARK, cursor:'pointer',
                    borderBottom:`1px solid #E8ECF8`, whiteSpace:'nowrap', userSelect:'none',
                    fontSize:11, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  {displayCols[i]}
                  {sortCol === col && <span style={{ marginLeft:4 }}>{sortAsc?'↑':'↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, ri) => (
              <tr key={ri} style={{ background: ri%2===0 ? '#fff' : '#FAFBFF' }}>
                {rawCols.map(col => (
                  <td key={col} style={{ padding:'9px 14px', borderBottom:`1px solid #F0F2FA`, color:MID, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display:'flex', gap:6, marginTop:12, alignItems:'center', justifyContent:'flex-end' }}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
            style={{ padding:'5px 12px', borderRadius:7, border:`1px solid #E8ECF8`, background:'#fff', cursor:'pointer', fontSize:12, color:MID }}>←</button>
          <span style={{ fontSize:12, color:MID }}>Page {page+1} / {pages}</span>
          <button onClick={()=>setPage(p=>Math.min(pages-1,p+1))} disabled={page>=pages-1}
            style={{ padding:'5px 12px', borderRadius:7, border:`1px solid #E8ECF8`, background:'#fff', cursor:'pointer', fontSize:12, color:MID }}>→</button>
        </div>
      )}
    </div>
  );
}

function ChartView({ type, rows, x, y }) {
  const data = rows.slice(0, 50).map(r => ({ name: String(r[x] ?? ''), value: Number(r[y]) || 0 }));
  return (
    <div style={{ background:'#fff', borderRadius:14, border:`1px solid #E8ECF8`, padding:'20px 10px' }}>
      <ResponsiveContainer width='100%' height={380}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top:10, right:20, bottom:40, left:10 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#F0F2FA' />
            <XAxis dataKey='name' tick={{ fill:MID, fontSize:11 }} angle={-30} textAnchor='end' />
            <YAxis tick={{ fill:MID, fontSize:11 }} />
            <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${BORDER}`, fontSize:12 }} />
            <Bar dataKey='value' radius={[6,6,0,0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top:10, right:20, bottom:40, left:10 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#F0F2FA' />
            <XAxis dataKey='name' tick={{ fill:MID, fontSize:11 }} angle={-30} textAnchor='end' />
            <YAxis tick={{ fill:MID, fontSize:11 }} />
            <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${BORDER}`, fontSize:12 }} />
            <Line type='monotone' dataKey='value' stroke={ACCENT} strokeWidth={2.5} dot={{ fill:ACCENT, r:4 }} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={150} label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${BORDER}`, fontSize:12 }} />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
