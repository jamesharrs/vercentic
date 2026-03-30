#!/usr/bin/env node
/**
 * Fix: Reports.jsx two issues combined
 *
 *   FIX 1 — bare fetch() has no session headers → all API calls silently fail
 *            Replace local api object with apiClient wrapper
 *
 *   FIX 2 — initialReport prop arrives before objects load → useEffect bails
 *            out with !objects.length check and never retries correctly.
 *            Use a pendingPreset ref so when objects DO load the preset fires.
 *
 * Run from: ~/projects/talentos
 *   node fix_reports_full.js
 */
const fs   = require('fs');
const path = require('path');

const REPORTS = path.join(__dirname, 'client/src/Reports.jsx');

if (!fs.existsSync(REPORTS)) {
  console.error('ERROR: client/src/Reports.jsx not found. Run from ~/projects/talentos');
  process.exit(1);
}

let src = fs.readFileSync(REPORTS, 'utf8');
let changed = 0;

function patch(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.log(`SKIP  ${label}`);
    return;
  }
  src = src.replace(oldStr, newStr);
  changed++;
  console.log(`✓     ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Replace bare fetch() api object with apiClient
// ─────────────────────────────────────────────────────────────────────────────

// Add apiClient import after recharts block
patch(
  'Add apiClient import',
  `} from "recharts";`,
  `} from "recharts";
import apiClient from "./apiClient.js";`
);

// Replace local api object
patch(
  'Replace bare fetch api with apiClient wrapper',
  `const api = {
  get:    p    => fetch(p).then(r=>r.json()).catch(()=>null),
  post:   (p,b)=> fetch(p,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null),
  patch:  (p,b)=> fetch(p,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null),
  delete: p    => fetch(p,{method:"DELETE"}).then(r=>r.json()).catch(()=>null),
};`,
  `// apiClient attaches X-Session-Id and other required headers automatically
const api = {
  get:    p    => apiClient.get(p).catch(()=>null),
  post:   (p,b)=> apiClient.post(p,b).catch(()=>null),
  patch:  (p,b)=> apiClient.patch(p,b).catch(()=>null),
  delete: p    => apiClient.delete(p).catch(()=>null),
};`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: Reliable initialReport → auto-populate and run
//
// Current code:
//   useEffect(() => {
//     if (!initialReport||!objects.length) return;   ← bails if objects not loaded
//     ...
//   }, [initialReport, objects]);
//
// Problem: initialReport arrives from the copilot BEFORE objects load (objects
// load in a separate useEffect triggered by environment?.id). The guard
// !objects.length returns early, and although objects IS in the dep array, by
// the time objects loads the initialReport reference hasn't changed so React
// may not re-fire reliably in all cases.
//
// Fix: store the preset in a ref (pendingPreset) on arrival. The objects
// useEffect checks the ref AFTER objects load and applies it then.
// ─────────────────────────────────────────────────────────────────────────────

// Add the pendingPreset ref alongside other refs
patch(
  'Add pendingPreset ref',
  `  const skipReset   = useRef(false);
  const debounceRef = useRef(null);`,
  `  const skipReset    = useRef(false);
  const debounceRef  = useRef(null);
  const pendingPreset = useRef(null); // holds initialReport until objects are ready`
);

// Replace the initialReport useEffect with one that stores to the ref
patch(
  'Store initialReport in ref immediately',
  `  useEffect(() => {
    if (!initialReport||!objects.length) return;
    const obj = objects.find(o=>o.slug===initialReport.object||o.name?.toLowerCase().includes(initialReport.object));
    if (obj) {
      skipReset.current = true;
      setSelObject(obj.id);
      if (initialReport.groupBy)   setGroupBy(initialReport.groupBy);
      if (initialReport.chartType) setChartType(initialReport.chartType);
      if (initialReport.formulas)  setFormulas(initialReport.formulas);
      if (initialReport.filters)   setFilters(initialReport.filters);
      setPanel(initialReport.formulas?.length?"formulas":"build");
      setTimeout(()=>runReport(obj.id,initialReport.groupBy),400);
    }
  }, [initialReport, objects]);`,
  `  // When initialReport arrives, store it immediately in a ref.
  // The applyPreset function (called after objects load) will consume it.
  useEffect(() => {
    if (!initialReport) return;
    pendingPreset.current = initialReport;
    // If objects are already loaded, apply now; otherwise the objects
    // useEffect will apply it when objects arrive.
    if (objects.length) applyPreset(initialReport, objects);
  }, [initialReport]);

  // Helper: apply a report preset once we have both the preset and objects
  function applyPreset(preset, objs) {
    if (!preset || !objs?.length) return;
    const obj = objs.find(o =>
      o.slug === preset.object ||
      o.slug === preset.objectSlug ||
      o.name?.toLowerCase() === (preset.object||"").toLowerCase() ||
      o.plural_name?.toLowerCase() === (preset.object||"").toLowerCase()
    );
    if (!obj) {
      console.warn("[Reports] applyPreset: object not found for slug:", preset.object);
      return;
    }
    pendingPreset.current = null; // consumed
    skipReset.current = true;
    setSelObject(obj.id);
    if (preset.groupBy   || preset.group_by)   setGroupBy(preset.groupBy   || preset.group_by);
    if (preset.chartType || preset.chart_type) setChartType(preset.chartType || preset.chart_type);
    if (preset.formulas?.length)               setFormulas(preset.formulas);
    if (preset.filters?.length)                setFilters(preset.filters);
    if (preset.sortBy    || preset.sort_by)    setSortBy(preset.sortBy     || preset.sort_by);
    if (preset.sortDir   || preset.sort_dir)   setSortDir(preset.sortDir   || preset.sort_dir);
    setPanel((preset.formulas?.length) ? "formulas" : "build");
    // Run after a tick so state updates flush
    setTimeout(() => runReport(obj.id, preset.groupBy || preset.group_by), 300);
  }`
);

// Patch the objects useEffect to call applyPreset when objects load
patch(
  'Apply pending preset when objects load',
  `    api.get(`+"`"+`/api/objects?environment_id=${environment.id}`+"`"+`).then(d=>setObjects(Array.isArray(d)?d:[]));`,
  `    api.get(`+"`"+`/api/objects?environment_id=${environment.id}`+"`"+`).then(d => {
      const objs = Array.isArray(d) ? d : [];
      setObjects(objs);
      // Apply any preset that arrived before objects loaded
      if (pendingPreset.current) applyPreset(pendingPreset.current, objs);
    });`
);

// ─────────────────────────────────────────────────────────────────────────────
// Write and report
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(REPORTS, src, 'utf8');
console.log(`\n${changed} patch${changed!==1?'es':''} applied.`);

// Verify
const out = fs.readFileSync(REPORTS, 'utf8');
console.log('\nVerification:');
console.log('  apiClient import:      ', out.includes(`import apiClient from "./apiClient.js"`));
console.log('  apiClient.get in use:  ', out.includes('apiClient.get'));
console.log('  pendingPreset ref:     ', out.includes('pendingPreset'));
console.log('  applyPreset function:  ', out.includes('function applyPreset'));
console.log('  preset on objects load:', out.includes('pendingPreset.current) applyPreset'));

console.log('\n✅  Done. Now build and deploy:');
console.log('   cd client && npx vite build 2>&1 | grep -E "error|Error|✓"');
console.log('   cd .. && git add -A && git commit -m "fix: reports apiClient + reliable copilot preset loading" && git push origin main\n');
